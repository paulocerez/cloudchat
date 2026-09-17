import { Router, Request, Response } from 'express';
import { upsertPocketMemo, removePocketMemo } from '../services/firestore';
import {
  getRecording,
  listRecordings,
  needsRefetch,
  recordedAt,
  toVoiceMemo,
  verifyPocketSignature,
} from '../services/pocket';
import { getPocketWebhookSecret } from '../services/config';
import { berlinDate } from '../utils/date';
import { PocketRecording, PocketWebhookBody } from '../types';

// Mounted at /webhook/pocket.
const router = Router();
// Mounted at /api/pocket — app-facing, not part of the webhook surface.
export const pocketApiRouter = Router();

// Events that mean "this recording's stored state changed" — all handled the
// same way, by re-deriving the memo from the latest data Pocket has.
const UPSERT_EVENTS = new Set([
  'recording.created',
  'recording.merged',
  'transcription.completed',
  'transcript.edited',
  'summary.completed',
  'summary.regenerated',
  'summary.updated',
  'action_items.regenerated',
  'action_items.updated',
  'speakers.labeled',
  'translation.completed',
]);

// Pocket has no verification handshake — respond OK to any GET health check.
router.get('/', (_req: Request, res: Response) => res.sendStatus(200));

// Process before responding: on Vercel the function can be frozen once the
// response is sent, so async Firestore writes after res.send() may never run.
router.post('/', async (req: Request, res: Response) => {
  const secret = await getPocketWebhookSecret();
  if (secret) {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
    const ok = verifyPocketSignature(
      rawBody,
      req.header('X-HeyPocket-Timestamp') ?? undefined,
      req.header('X-HeyPocket-Signature') ?? undefined,
      secret
    );
    if (!ok) {
      res.sendStatus(401);
      return;
    }
  } else {
    console.warn('Pocket webhook received without POCKET_WEBHOOK_SECRET configured — unverified');
  }

  try {
    const body = req.body as PocketWebhookBody;
    const recording = body?.recording;
    if (!recording?.id) {
      res.sendStatus(200);
      return;
    }

    const date = berlinDate(recordedAt(recording));

    if (body.event === 'recording.deleted') {
      await removePocketMemo(date, recording.id);
      res.sendStatus(200);
      return;
    }

    if (!UPSERT_EVENTS.has(body.event)) {
      res.sendStatus(200);
      return;
    }

    // Transcript and summaries sit on the envelope, not the recording object.
    let transcript = body.transcript ?? recording.transcript ?? null;
    let summarizations = body.summarizations ?? recording.summarizations ?? null;

    // Early events (recording.created) carry neither — ask the API for the
    // authoritative state so we never store a half-empty row.
    if (needsRefetch(transcript, summarizations)) {
      try {
        const fresh = await getRecording(recording.id);
        if (fresh) {
          Object.assign(recording, fresh);
          transcript = fresh.transcript ?? transcript;
          summarizations = fresh.summarizations ?? summarizations;
        }
      } catch (err) {
        console.error('Pocket refetch failed:', err);
      }
    }

    await upsertPocketMemo(date, toVoiceMemo(recording, transcript, summarizations));
  } catch (err) {
    console.error('Pocket webhook processing error:', err);
  }

  // Always 200 — Pocket retries 3× with backoff, and a bug on our side
  // shouldn't turn into a retry storm.
  res.sendStatus(200);
});

// Manual backfill: import recordings Pocket made before the webhook existed,
// or recover ones whose delivery was missed. Not on a cron.
pocketApiRouter.post('/sync', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.sendStatus(401);
    return;
  }

  const start = (req.query.start ?? req.body?.start) as string | undefined;
  const end = (req.query.end ?? req.body?.end) as string | undefined;

  try {
    let page = 1;
    let imported = 0;
    const dates = new Set<string>();

    for (;;) {
      const { recordings, hasMore } = await listRecordings({
        start_date: start,
        end_date: end,
        page,
        limit: 100,
      });
      if (recordings.length === 0) break;

      for (const summary of recordings) {
        // The list response omits transcript/summaries, so fetch each in full.
        let recording: PocketRecording = summary;
        try {
          recording = (await getRecording(summary.id)) ?? summary;
        } catch (err) {
          console.error(`Pocket sync: failed to fetch ${summary.id}`, err);
        }
        const date = berlinDate(recordedAt(recording));
        await upsertPocketMemo(
          date,
          toVoiceMemo(recording, recording.transcript ?? null, recording.summarizations ?? null)
        );
        dates.add(date);
        imported++;
      }

      if (!hasMore) break;
      page++;
    }

    res.json({ ok: true, imported, dates: [...dates].sort() });
  } catch (err) {
    console.error('Pocket sync error:', err);
    res.status(502).json({ error: 'Pocket sync failed' });
  }
});

export default router;
