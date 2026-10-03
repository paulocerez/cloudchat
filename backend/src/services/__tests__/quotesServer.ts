import http from 'http';
import { AddressInfo } from 'net';

export interface Received {
  authorization?: string;
  contentType?: string;
  body: Record<string, unknown>;
}

export type Reply = { status: number; body?: unknown; delayMs?: number };

// A local stand-in for the Quotes API that answers with the queued replies in
// order (repeating the last one) and records every request it gets.
export async function startQuotesServer(replies: Reply[]) {
  const received: Received[] = [];
  const sockets = new Set<import('net').Socket>();

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      received.push({
        authorization: req.headers.authorization,
        contentType: req.headers['content-type'],
        body: JSON.parse(raw || '{}'),
      });
      if (req.url !== '/api/v1/posts/from-transcript' || req.method !== 'POST') {
        res.writeHead(404).end();
        return;
      }
      const reply = replies[Math.min(received.length - 1, replies.length - 1)];
      setTimeout(() => {
        res.writeHead(reply.status, { 'Content-Type': 'application/json' });
        res.end(reply.body === undefined ? '' : JSON.stringify(reply.body));
      }, reply.delayMs ?? 0);
    });
  });
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        sockets.forEach((s) => s.destroy());
        server.close(() => resolve());
      }),
  };
}

export const post = (id: string, externalId: string) => ({
  id,
  status: 'awaiting_approval',
  source: 'transcript',
  externalId,
});
