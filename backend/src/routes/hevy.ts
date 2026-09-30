import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { upsertWorkout } from '../services/firestore';
import { getWorkout, isBeforeCutoff, syncWorkouts, toWorkout } from '../services/hevy';
import { getHevySyncFrom, getHevyWebhookToken } from '../services/config';
import { berlinDate } from '../utils/date';

// Mounted at /webhook/hevy.
const router = Router();
// Mounted at /api/hevy — app-facing, not part of the webhook surface.
export const hevyApiRouter = Router();

function sameToken(header: string | undefined, token: string): boolean {
  const got = Buffer.from((header ?? '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(token.replace(/^Bearer\s+/i, ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.authorization === `Bearer ${secret}`;
}

router.get('/', (_req: Request, res: Response) => res.sendStatus(200));

// Hevy sends { id, payload: { workoutId } } when a new workout is saved and
// wants a 200 within 5 seconds, so this does only the fetch and one write — no
// entries scan, no Groq call. Edits and deletions don't fire the webhook; the nightly sync
// handles those and generates the day summary.
// Process before responding: on Vercel the function can be frozen once the
// response is sent, so async Firestore writes after res.send() may never run.
router.post('/', async (req: Request, res: Response) => {
  const token = await getHevyWebhookToken();
  if (token) {
    if (!sameToken(req.header('Authorization'), token)) {
      res.sendStatus(401);
      return;
    }
  } else {
    console.warn('Hevy webhook received without HEVY_WEBHOOK_TOKEN configured — unverified');
  }

  try {
    // Top-level workoutId is the shape we first assumed; keep accepting it.
    const workoutId = (req.body?.payload?.workoutId ?? req.body?.workoutId) as string | undefined;
    if (!workoutId) {
      console.warn('Hevy webhook without a workoutId; body keys:', Object.keys(req.body ?? {}));
    } else {
      const workout = await getWorkout(workoutId);
      // A brand-new workout can't be on another day yet, so an empty index
      // skips the lookup; a redelivery still merges by hevyWorkoutId.
      if (!isBeforeCutoff(workout, await getHevySyncFrom())) {
        await upsertWorkout(berlinDate(workout.start_time), toWorkout(workout), new Map());
      }
    }
  } catch (err) {
    console.error('Hevy webhook processing error:', err);
  }

  // Always 200 so a bug on our side doesn't turn into a retry storm; the
  // nightly sync picks up anything that failed here.
  res.sendStatus(200);
});

// Catch up from the stored cursor, or backfill with ?since=<ISO>.
hevyApiRouter.post('/sync', async (req: Request, res: Response) => {
  if (!isCron(req)) {
    res.sendStatus(401);
    return;
  }
  const since = (req.query.since ?? req.body?.since) as string | undefined;
  try {
    res.json({ ok: true, ...(await syncWorkouts(since)) });
  } catch (err) {
    console.error('Hevy sync error:', err);
    res.status(502).json({ error: 'Hevy sync failed' });
  }
});

export default router;
