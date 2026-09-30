import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { indexWorkouts, upsertWorkout } from '../services/firestore';
import {
  getWebhookSubscription,
  getWorkout,
  subscribeWebhook,
  syncWorkouts,
  toWorkout,
} from '../services/hevy';
import { ensureDaySummary } from '../services/daySummary';
import { getHevyWebhookToken } from '../services/config';
import { berlinDate } from '../utils/date';

// Mounted at /webhook/hevy.
const router = Router();
// Mounted at /api/hevy — app-facing, not part of the webhook surface.
export const hevyApiRouter = Router();

function sameToken(header: string | undefined, token: string): boolean {
  const got = Buffer.from((header ?? '').replace(/^Bearer\s+/i, ''));
  const want = Buffer.from(token);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.authorization === `Bearer ${secret}`;
}

router.get('/', (_req: Request, res: Response) => res.sendStatus(200));

// Hevy sends { workoutId } once a workout is saved. The payload has nothing
// else, so the workout is always fetched in full before storing.
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
    const workoutId = (req.body?.workoutId ?? req.body?.workout_id ?? req.body?.id) as
      | string
      | undefined;
    if (workoutId) {
      const workout = await getWorkout(workoutId);
      const date = berlinDate(workout.start_time);
      await upsertWorkout(date, toWorkout(workout), await indexWorkouts());

      // skipIfPresent keeps this to one Groq call per day and never
      // overwrites a summary the day already has.
      try {
        await ensureDaySummary(date, { skipIfPresent: true });
      } catch (err) {
        console.error('Hevy day-summary generation failed:', err);
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

// One-off: point Hevy's webhook at this deployment. GET shows the current one.
hevyApiRouter.get('/subscribe', async (req: Request, res: Response) => {
  if (!isCron(req)) {
    res.sendStatus(401);
    return;
  }
  try {
    res.json(await getWebhookSubscription());
  } catch (err) {
    console.error('Hevy subscription lookup failed:', err);
    res.status(502).json({ error: 'Hevy subscription lookup failed' });
  }
});

hevyApiRouter.post('/subscribe', async (req: Request, res: Response) => {
  if (!isCron(req)) {
    res.sendStatus(401);
    return;
  }
  const token = await getHevyWebhookToken();
  if (!token) {
    res.status(400).json({ error: 'Set HEVY_WEBHOOK_TOKEN first' });
    return;
  }
  // Vercel terminates TLS upstream, so req.protocol reads http there.
  const url = (req.query.url as string) || `https://${req.get('host')}/webhook/hevy`;
  try {
    res.json({ ok: true, url, subscription: await subscribeWebhook(url, token) });
  } catch (err) {
    const detail = (err as { response?: { status?: number; data?: unknown } }).response;
    console.error('Hevy subscribe failed:', detail?.status, detail?.data ?? err);
    res.status(502).json({ error: 'Hevy subscribe failed', status: detail?.status, detail: detail?.data });
  }
});

export default router;
