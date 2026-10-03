import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendToQuotes, TRANSCRIPT_MAX } from '../quotes';
import {
  attemptForward,
  claimPatch,
  enqueueArticle,
  ForwardDeps,
  ForwardStore,
  processDueForwards,
  QuotesForward,
  runForwardInBackground,
} from '../quotesForward';
import { post, Reply, startQuotesServer } from './quotesServer';

class MemoryStore implements ForwardStore {
  docs = new Map<string, QuotesForward>();
  async create(record: QuotesForward) {
    if (this.docs.has(record.recordingId)) return false;
    this.docs.set(record.recordingId, { ...record });
    return true;
  }
  async get(id: string) {
    return this.docs.get(id) ?? null;
  }
  async claim(id: string, now: Date) {
    const rec = this.docs.get(id);
    const patch = rec && claimPatch(rec, now);
    if (!patch) return null;
    Object.assign(rec, patch);
    return patch.status === 'sending' ? { ...rec } : null;
  }
  async update(id: string, patch: Partial<QuotesForward>) {
    Object.assign(this.docs.get(id)!, patch);
  }
  async listDue(now: Date) {
    return [...this.docs.values()]
      .filter((d) => d.nextAttemptAt !== null && d.nextAttemptAt <= now.toISOString())
      .map((d) => d.recordingId);
  }
}

const TRANSCRIPT = 'This is an article. Small steps compound. Key message: Start small.';
const MIN = 60_000;

let server: Awaited<ReturnType<typeof startQuotesServer>> | undefined;
let store: MemoryStore;
let clock: number;
let notify: ReturnType<typeof vi.fn>;

async function setup(replies: Reply[], timeoutMs?: number): Promise<ForwardDeps> {
  server = await startQuotesServer(replies);
  const baseUrl = server.baseUrl;
  return {
    store,
    send: (payload) => sendToQuotes(payload, { baseUrl, token: 't', timeoutMs }),
    notify,
    now: () => new Date(clock),
    sleep: async (ms) => {
      clock += ms;
    },
  };
}

const advance = (ms: number) => (clock += ms);
const doc = () => store.docs.get('rec-1')!;
const externalIds = () => server!.received.map((r) => r.body.externalId);

beforeEach(() => {
  store = new MemoryStore();
  clock = Date.parse('2026-10-03T10:00:00Z');
  notify = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  await server?.close();
  server = undefined;
});

describe('enqueueArticle', () => {
  it('stores the transcript as-is with the recording id as externalId and the key message', async () => {
    const deps = await setup([]);
    expect(await enqueueArticle('rec-1', TRANSCRIPT, deps)).toBe(true);
    expect(doc()).toMatchObject({
      externalId: 'rec-1',
      status: 'pending',
      transcript: TRANSCRIPT,
      keyMessage: 'Start small.',
      attempts: 0,
    });
  });

  it('leaves out keyMessage when the transcript has none', async () => {
    const deps = await setup([]);
    await enqueueArticle('rec-1', 'This is an article. Small steps compound.', deps);
    expect(doc()).not.toHaveProperty('keyMessage');
  });

  it('is a no-op for a recording that already has a forward', async () => {
    const deps = await setup([]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    expect(await enqueueArticle('rec-1', 'This is an article. Edited later.', deps)).toBe(false);
    expect(doc().transcript).toBe(TRANSCRIPT);
  });

  it('skips transcripts over 20,000 characters without sending', async () => {
    const deps = await setup([{ status: 201, body: post('p1', 'rec-1') }]);
    const long = `This is an article. ${'x'.repeat(TRANSCRIPT_MAX)}`;
    expect(await enqueueArticle('rec-1', long, deps)).toBe(false);
    expect(doc()).toMatchObject({ status: 'skipped', nextAttemptAt: null });
    expect(doc().lastError).toContain('20000');
    await processDueForwards(deps);
    expect(server!.received).toHaveLength(0);
  });
});

describe('attemptForward', () => {
  it('201 → sent, stores the post id, notifies once', async () => {
    const deps = await setup([{ status: 201, body: post('p1', 'rec-1') }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await attemptForward('rec-1', deps);
    expect(doc()).toMatchObject({
      status: 'sent',
      quotesPostId: 'p1',
      nextAttemptAt: null,
      attempts: 1,
    });
    expect(doc().notifiedAt).toBeDefined();
    expect(notify).toHaveBeenCalledExactlyOnceWith('p1');
    expect(server!.received[0].body).toEqual({
      transcript: TRANSCRIPT,
      keyMessage: 'Start small.',
      externalId: 'rec-1',
    });

    // Already sent: nothing more happens.
    expect(await attemptForward('rec-1', deps)).toBeNull();
    expect(server!.received).toHaveLength(1);
  });

  it('200 → sent with the existing post id', async () => {
    const deps = await setup([{ status: 200, body: post('p9', 'rec-1') }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await attemptForward('rec-1', deps);
    expect(doc()).toMatchObject({ status: 'sent', quotesPostId: 'p9' });
  });

  it('a failing notification does not undo the send', async () => {
    const deps = await setup([{ status: 201, body: post('p1', 'rec-1') }]);
    notify.mockRejectedValue(new Error('Unipile down'));
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await attemptForward('rec-1', deps);
    expect(doc()).toMatchObject({ status: 'sent', quotesPostId: 'p1' });
    expect(doc().notifiedAt).toBeUndefined();
  });

  it.each([
    [422, { error: { code: 'validation_error', message: 'bad', details: {} } }],
    [401, { error: { code: 'unauthorized', message: 'bad token' } }],
  ])('%i → failed after one request, never retried', async (status, body) => {
    const deps = await setup([
      { status, body },
      { status: 201, body: post('p1', 'rec-1') },
    ]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await attemptForward('rec-1', deps);
    expect(doc()).toMatchObject({
      status: 'failed',
      lastStatus: status,
      nextAttemptAt: null,
    });

    advance(24 * 60 * MIN);
    await processDueForwards(deps);
    expect(server!.received).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('500 then 201 → retried after the backoff with the same externalId', async () => {
    const deps = await setup([{ status: 500 }, { status: 201, body: post('p1', 'rec-1') }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);

    await attemptForward('rec-1', deps);
    expect(doc()).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastStatus: 500,
    });
    expect(doc().nextAttemptAt).toBe(new Date(clock + MIN).toISOString());

    // Not due yet.
    advance(30_000);
    expect(await processDueForwards(deps)).toEqual({ attempted: 0, sent: 0 });

    advance(30_000);
    expect(await processDueForwards(deps)).toEqual({ attempted: 1, sent: 1 });
    expect(doc()).toMatchObject({
      status: 'sent',
      quotesPostId: 'p1',
      attempts: 2,
    });
    expect(externalIds()).toEqual(['rec-1', 'rec-1']);
    expect(notify).toHaveBeenCalledExactlyOnceWith('p1');
  });

  it('timeout → retryable, retried with the same externalId', async () => {
    const deps = await setup([{ status: 201, body: post('p1', 'rec-1'), delayMs: 300 }], 50);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    const result = await attemptForward('rec-1', deps);
    expect(result?.kind).toBe('retryable');
    expect(doc()).toMatchObject({ status: 'pending', attempts: 1 });
    expect(doc().lastError).toMatch(/timeout|ECONNABORTED/i);
  });

  it('backs off 1, 5, 30 min and gives up after 4 attempts', async () => {
    const deps = await setup([{ status: 503 }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);

    const delays: number[] = [];
    for (let i = 0; i < 4; i++) {
      await processDueForwards(deps);
      if (doc().nextAttemptAt) {
        delays.push((Date.parse(doc().nextAttemptAt!) - clock) / MIN);
        clock = Date.parse(doc().nextAttemptAt!);
      }
    }
    expect(delays).toEqual([1, 5, 30]);
    expect(doc()).toMatchObject({
      status: 'failed',
      attempts: 4,
      nextAttemptAt: null,
    });
    expect(externalIds()).toEqual(['rec-1', 'rec-1', 'rec-1', 'rec-1']);

    advance(24 * 60 * MIN);
    await processDueForwards(deps);
    expect(server!.received).toHaveLength(4);
  });

  it('picks up a doc stuck in sending once its lease expires', async () => {
    const deps = await setup([{ status: 201, body: post('p1', 'rec-1') }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await store.claim('rec-1', new Date(clock)); // the invocation froze mid-send
    expect(await processDueForwards(deps)).toEqual({ attempted: 0, sent: 0 });

    advance(5 * MIN);
    await processDueForwards(deps);
    expect(doc()).toMatchObject({ status: 'sent', attempts: 2 });
  });
});

describe('runForwardInBackground', () => {
  it('retries once in the same run after a quick temporary failure', async () => {
    const deps = await setup([{ status: 502 }, { status: 201, body: post('p1', 'rec-1') }]);
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await runForwardInBackground('rec-1', deps);
    expect(doc()).toMatchObject({ status: 'sent', attempts: 2 });
    expect(externalIds()).toEqual(['rec-1', 'rec-1']);
  });

  it('leaves the retry to a later sweep when the function is out of time', async () => {
    const deps = await setup([{ status: 502 }, { status: 201, body: post('p1', 'rec-1') }]);
    const send = deps.send;
    deps.send = async (payload) => {
      advance(100_000); // a slow failure eats the budget
      return send(payload);
    };
    await enqueueArticle('rec-1', TRANSCRIPT, deps);
    await runForwardInBackground('rec-1', deps);
    expect(doc()).toMatchObject({ status: 'pending', attempts: 1 });
    expect(server!.received).toHaveLength(1);
  });
});
