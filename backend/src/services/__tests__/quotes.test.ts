import { afterEach, describe, expect, it } from 'vitest';
import { quotesPostUrl, sendToQuotes } from '../quotes';
import { post, Reply, startQuotesServer } from './quotesServer';

let server: Awaited<ReturnType<typeof startQuotesServer>> | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function send(replies: Reply[], opts: { timeoutMs?: number } = {}) {
  server = await startQuotesServer(replies);
  return sendToQuotes(
    {
      transcript: 'This is an article. Key message: Ship it.',
      keyMessage: 'Ship it.',
      externalId: 'rec-1',
    },
    { baseUrl: `${server.baseUrl}/`, token: 'secret-token', ...opts }
  );
}

describe('sendToQuotes', () => {
  it('201 → success, created, with the bearer token and body', async () => {
    const result = await send([{ status: 201, body: post('p1', 'rec-1') }]);
    expect(result).toEqual({ kind: 'success', id: 'p1', created: true });
    expect(server!.received).toHaveLength(1);
    expect(server!.received[0]).toEqual({
      authorization: 'Bearer secret-token',
      contentType: 'application/json',
      body: {
        transcript: 'This is an article. Key message: Ship it.',
        keyMessage: 'Ship it.',
        externalId: 'rec-1',
      },
    });
  });

  it('omits keyMessage when there is none', async () => {
    server = await startQuotesServer([{ status: 201, body: post('p1', 'rec-1') }]);
    await sendToQuotes(
      { transcript: 'This is an article.', externalId: 'rec-1' },
      { baseUrl: server.baseUrl, token: 't' }
    );
    expect(server.received[0].body).toEqual({
      transcript: 'This is an article.',
      externalId: 'rec-1',
    });
  });

  it('200 → success, already received', async () => {
    const result = await send([{ status: 200, body: post('p1', 'rec-1') }]);
    expect(result).toEqual({ kind: 'success', id: 'p1', created: false });
  });

  it('422 → permanent, keeps the error details', async () => {
    const error = {
      code: 'validation_error',
      message: 'transcript too long',
      details: { field: 'transcript' },
    };
    const result = await send([{ status: 422, body: { error } }]);
    expect(result).toMatchObject({
      kind: 'permanent',
      status: 422,
      details: error,
    });
    expect(result.kind === 'permanent' && result.error).toContain('validation_error');
  });

  it('401 → permanent configuration error', async () => {
    const result = await send([{ status: 401, body: { error: { code: 'unauthorized' } } }]);
    expect(result).toMatchObject({
      kind: 'permanent',
      status: 401,
      configError: true,
    });
  });

  it.each([429, 500, 503])('%i → retryable', async (status) => {
    const result = await send([{ status }]);
    expect(result).toMatchObject({ kind: 'retryable', status });
  });

  it('timeout → retryable', async () => {
    const result = await send([{ status: 201, body: post('p1', 'rec-1'), delayMs: 500 }], {
      timeoutMs: 50,
    });
    expect(result.kind).toBe('retryable');
  });

  it('network error → retryable', async () => {
    const result = await sendToQuotes(
      { transcript: 'x', externalId: 'rec-1' },
      { baseUrl: 'http://127.0.0.1:1', token: 't' }
    );
    expect(result.kind).toBe('retryable');
  });

  it('missing configuration → permanent, no request', async () => {
    const result = await sendToQuotes(
      { transcript: 'x', externalId: 'rec-1' },
      { baseUrl: '', token: '' }
    );
    expect(result).toMatchObject({ kind: 'permanent', configError: true });
  });
});

describe('quotesPostUrl', () => {
  it('builds the review link', () => {
    expect(quotesPostUrl('p1', { baseUrl: 'https://quotes.example.com/' })).toBe(
      'https://quotes.example.com/posts/p1'
    );
  });
});
