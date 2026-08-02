import type { JournalEntry, AISummary } from '@cloudchat/shared';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  entries: {
    list: () => get<JournalEntry[]>('/entries'),
    get: (date: string) => get<JournalEntry>(`/entries/${date}`),
    range: (from: string, to: string) =>
      get<JournalEntry[]>(`/entries/range?from=${from}&to=${to}`),
  },
  summaries: {
    list: () => get<AISummary[]>('/summaries'),
    get: (period: 'week' | 'month', year: number, index: number) =>
      get<AISummary>(`/summaries/${period}/${year}/${index}`),
    generate: (period: 'week' | 'month', year: number, index: number) =>
      post<AISummary>('/summaries/generate', { period, year, index }),
  },
};
