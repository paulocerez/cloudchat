import { getDb, recordSentMessageId } from './firestore';
import { getUserPhoneNumber } from './config';
import { sendTextMessage } from './whatsapp';
import { QuotesPayload, QuotesResult, TRANSCRIPT_MAX, quotesPostUrl, sendToQuotes } from './quotes';
import { extractKeyMessage } from './articleDetection';

// Outbox for article transcripts on their way to the Quotes app. One doc per
// Pocket recording (quotesForwards/{recordingId}); externalId is fixed to the
// recording id at creation so every retry is deduplicated by Quotes.
//
// Hosting is Vercel Hobby (daily cron only), so attempts are driven by
// waitUntil after the webhook replies, plus sweeps of due retries on every
// Pocket delivery, the nightly cron and POST /api/quotes/retry. On a
// long-running host a setInterval(processDueForwards, 60_000) would do.

export type ForwardStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface QuotesForward {
  recordingId: string;
  externalId: string;
  status: ForwardStatus;
  transcript: string;
  keyMessage?: string;
  attempts: number;
  // When this doc is next due. While sending it's the lease expiry, so a
  // frozen or crashed attempt is picked up again; null once terminal.
  nextAttemptAt: string | null;
  quotesPostId?: string;
  lastError?: string;
  lastStatus?: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  notifiedAt?: string;
}

export interface ForwardStore {
  // Creates the doc unless one already exists; returns whether it did.
  create(record: QuotesForward): Promise<boolean>;
  get(id: string): Promise<QuotesForward | null>;
  // Atomically moves a due doc to 'sending' and counts the attempt.
  claim(id: string, now: Date): Promise<QuotesForward | null>;
  update(id: string, patch: Partial<QuotesForward>): Promise<void>;
  listDue(now: Date): Promise<string[]>;
}

export const MAX_ATTEMPTS = 4;
// Delay before the next attempt after the 1st, 2nd and 3rd failure.
export const BACKOFF_MINUTES = [1, 5, 30];
// Longer than one Quotes call (150 s timeout) with margin.
const LEASE_MS = 4 * 60_000;
// Hobby + Fluid compute caps a function at 300 s.
const FUNCTION_BUDGET_MS = 280_000;
const IN_RUN_RETRY_COST_MS = 60_000 + 150_000;

const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms).toISOString();

// Claims a doc if it is due: pending and past nextAttemptAt, or stuck in
// 'sending' past its lease. Shared by both store implementations.
export function claimPatch(rec: QuotesForward, now: Date): Partial<QuotesForward> | null {
  const due = rec.nextAttemptAt !== null && rec.nextAttemptAt <= now.toISOString();
  if (!due || (rec.status !== 'pending' && rec.status !== 'sending')) return null;
  if (rec.attempts >= MAX_ATTEMPTS) {
    return {
      status: 'failed',
      nextAttemptAt: null,
      updatedAt: now.toISOString(),
    };
  }
  return {
    status: 'sending',
    attempts: rec.attempts + 1,
    nextAttemptAt: addMs(now, LEASE_MS),
    updatedAt: now.toISOString(),
  };
}

// ── Firestore store ─────────────────────────────────────────
const COLLECTION = 'quotesForwards';

export const firestoreForwardStore: ForwardStore = {
  async create(record) {
    try {
      await getDb().collection(COLLECTION).doc(record.recordingId).create(record);
      return true;
    } catch (err) {
      if ((err as { code?: number })?.code === 6) return false; // ALREADY_EXISTS
      throw err;
    }
  },

  async get(id) {
    const snap = await getDb().collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as QuotesForward) : null;
  },

  async claim(id, now) {
    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const rec = snap.data() as QuotesForward;
      const patch = claimPatch(rec, now);
      if (!patch) return null;
      tx.update(ref, patch);
      return patch.status === 'sending' ? { ...rec, ...patch } : null;
    });
  },

  async update(id, patch) {
    await getDb().collection(COLLECTION).doc(id).update(patch);
  },

  async listDue(now) {
    // Single-field range query — terminal docs have nextAttemptAt null and drop out.
    const snap = await getDb()
      .collection(COLLECTION)
      .where('nextAttemptAt', '<=', now.toISOString())
      .get();
    return snap.docs.map((d) => d.id);
  },
};

// ── Runner ──────────────────────────────────────────────────
export interface ForwardDeps {
  store: ForwardStore;
  send: (payload: QuotesPayload) => Promise<QuotesResult>;
  notify: (postId: string) => Promise<void>;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}

async function notifyWhatsApp(postId: string): Promise<void> {
  const to = await getUserPhoneNumber();
  if (!to) return;
  const messageId = await sendTextMessage(
    to,
    `📝 New article ready for approval: ${quotesPostUrl(postId)}`
  );
  // The message comes back through the Unipile webhook; don't journal it.
  if (messageId) await recordSentMessageId(messageId);
}

export const defaultDeps: ForwardDeps = {
  store: firestoreForwardStore,
  send: (payload) => sendToQuotes(payload),
  notify: notifyWhatsApp,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Records an article transcript for sending. A recording that already has a
// doc is left alone, so later edits never re-send or change its externalId.
export async function enqueueArticle(
  recordingId: string,
  transcript: string,
  deps: Pick<ForwardDeps, 'store' | 'now'> = defaultDeps
): Promise<boolean> {
  const now = deps.now().toISOString();
  const base = {
    recordingId,
    externalId: recordingId,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (transcript.length > TRANSCRIPT_MAX) {
    const error = `Transcript is ${transcript.length} chars, over the ${TRANSCRIPT_MAX} limit`;
    const created = await deps.store.create({
      ...base,
      status: 'skipped',
      transcript: '',
      nextAttemptAt: null,
      lastError: error,
    });
    if (created) console.warn(`Quotes: skipping recording ${recordingId} — ${error}`);
    return false;
  }

  const record: QuotesForward = {
    ...base,
    status: 'pending',
    transcript,
    nextAttemptAt: now,
  };
  const keyMessage = extractKeyMessage(transcript);
  if (keyMessage) record.keyMessage = keyMessage;
  return deps.store.create(record);
}

// One attempt for one recording. Returns null when the doc wasn't due (sent
// already, waiting for its backoff, or being sent by another invocation).
export async function attemptForward(
  id: string,
  deps: ForwardDeps = defaultDeps
): Promise<QuotesResult | null> {
  const rec = await deps.store.claim(id, deps.now());
  if (!rec) return null;

  const payload: QuotesPayload = {
    transcript: rec.transcript,
    externalId: rec.externalId,
  };
  if (rec.keyMessage) payload.keyMessage = rec.keyMessage;

  let result: QuotesResult;
  try {
    result = await deps.send(payload);
  } catch (err) {
    result = {
      kind: 'retryable',
      error: (err as Error)?.message ?? String(err),
    };
  }
  const now = deps.now();
  const updatedAt = now.toISOString();

  if (result.kind === 'success') {
    await deps.store.update(id, {
      status: 'sent',
      quotesPostId: result.id,
      nextAttemptAt: null,
      sentAt: updatedAt,
      updatedAt,
    });
    // A 200 can follow an attempt that reached Quotes but timed out on our
    // side, so notify on any success that hasn't been announced yet.
    if (!rec.notifiedAt) {
      try {
        await deps.notify(result.id);
        await deps.store.update(id, { notifiedAt: deps.now().toISOString() });
      } catch (err) {
        console.error('Quotes approval notification failed:', err);
      }
    }
    return result;
  }

  const failure: Partial<QuotesForward> = {
    lastError: result.error,
    updatedAt,
  };
  if (result.status !== undefined) failure.lastStatus = result.status;

  if (result.kind === 'permanent') {
    if (result.configError) {
      console.error(`Quotes: configuration error for recording ${id} — ${result.error}`);
    } else {
      console.error(`Quotes: rejected recording ${id} — ${result.error}`, result.details ?? '');
    }
    await deps.store.update(id, {
      ...failure,
      status: 'failed',
      nextAttemptAt: null,
    });
    return result;
  }

  if (rec.attempts >= MAX_ATTEMPTS) {
    console.error(
      `Quotes: giving up on recording ${id} after ${rec.attempts} attempts — ${result.error}`
    );
    await deps.store.update(id, {
      ...failure,
      status: 'failed',
      nextAttemptAt: null,
    });
  } else {
    const delayMin = BACKOFF_MINUTES[rec.attempts - 1];
    console.warn(
      `Quotes: attempt ${rec.attempts} for ${id} failed (${result.error}), retrying in ${delayMin} min`
    );
    await deps.store.update(id, {
      ...failure,
      status: 'pending',
      nextAttemptAt: addMs(now, delayMin * 60_000),
    });
  }
  return result;
}

// The first attempt right after the webhook, plus the 1-minute retry when the
// function still has time for it. Later retries wait for the next sweep.
export async function runForwardInBackground(
  id: string,
  deps: ForwardDeps = defaultDeps
): Promise<void> {
  try {
    const startedAt = deps.now().getTime();
    const result = await attemptForward(id, deps);
    const elapsed = deps.now().getTime() - startedAt;
    if (result?.kind !== 'retryable' || elapsed + IN_RUN_RETRY_COST_MS > FUNCTION_BUDGET_MS) return;

    const rec = await deps.store.get(id);
    if (rec?.status !== 'pending' || !rec.nextAttemptAt) return;
    await deps.sleep(Math.max(0, new Date(rec.nextAttemptAt).getTime() - deps.now().getTime()));
    await attemptForward(id, deps);
  } catch (err) {
    console.error('Quotes forward failed:', err);
  }
}

// Sends every forward whose retry is due. Safe to run concurrently — claim()
// lets only one invocation send a given doc.
export async function processDueForwards(
  deps: ForwardDeps = defaultDeps
): Promise<{ attempted: number; sent: number }> {
  let attempted = 0;
  let sent = 0;
  for (const id of await deps.store.listDue(deps.now())) {
    try {
      const result = await attemptForward(id, deps);
      if (!result) continue;
      attempted++;
      if (result.kind === 'success') sent++;
    } catch (err) {
      console.error(`Quotes forward failed for ${id}:`, err);
    }
  }
  return { attempted, sent };
}
