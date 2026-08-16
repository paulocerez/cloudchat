import type { JournalEntry, AISummary, AppConfig, TimePeriod, PeriodColor, Habit } from '@cloudchat/shared';

type PeriodInput = {
  name: string;
  startDate: string;
  endDate: string;
  color: PeriodColor;
  emoji?: string;
};

type HabitInput = {
  name: string;
  color: PeriodColor;
  weeklyTarget: number;
  emoji?: string;
};

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
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
    setHighlight: (date: string, highlight: boolean) =>
      put<JournalEntry>(`/entries/${date}/highlight`, { highlight }),
    updateTranscription: (date: string, memoId: string, transcription: string) =>
      put<JournalEntry>(`/entries/${date}/voice/${memoId}`, { transcription }),
    updateSummary: (date: string, body: { title?: string; summary?: string }) =>
      put<JournalEntry>(`/entries/${date}/summary`, body),
    updateImageAnnotation: (date: string, imageId: string, annotation: string) =>
      put<JournalEntry>(`/entries/${date}/image/${imageId}`, { annotation }),
    addMessage: (date: string, content: string) =>
      post<JournalEntry>(`/entries/${date}/messages`, { content }),
    addLocation: (date: string, name: string) =>
      post<JournalEntry>(`/entries/${date}/locations`, { name }),
    toggleHabit: (date: string, habitId: string, done: boolean) =>
      put<JournalEntry>(`/entries/${date}/habits`, { habitId, done }),
    move: (date: string, toDate: string) =>
      put<JournalEntry>(`/entries/${date}/move`, { toDate }),
    removeLocation: (date: string, name: string) =>
      del(`/entries/${date}/locations/${encodeURIComponent(name)}`).then(
        () => api.entries.get(date)
      ),
  },
  chat: {
    ask: (question: string, history: { role: 'user' | 'assistant'; content: string }[]) =>
      post<{ answer: string }>('/chat', { question, history }),
  },
  config: {
    get: () => get<AppConfig>('/config'),
    update: (body: Partial<Omit<AppConfig, '_sources'>>) => put<{ ok: boolean }>('/config', body),
    clearKey: (key: string) => del(`/config/${key}`),
  },
  periods: {
    list: () => get<TimePeriod[]>('/periods'),
    create: (body: PeriodInput) => post<TimePeriod>('/periods', body),
    update: (id: string, body: Partial<PeriodInput>) =>
      put<TimePeriod>(`/periods/${id}`, body),
    remove: (id: string) => del(`/periods/${id}`),
  },
  habits: {
    list: () => get<Habit[]>('/habits'),
    create: (body: HabitInput) => post<Habit>('/habits', body),
    update: (id: string, body: Partial<HabitInput>) => put<Habit>(`/habits/${id}`, body),
    remove: (id: string) => del(`/habits/${id}`),
  },
  summaries: {
    list: () => get<AISummary[]>('/summaries'),
    get: (period: 'week' | 'month', year: number, index: number) =>
      get<AISummary>(`/summaries/${period}/${year}/${index}`),
    generate: (period: 'week' | 'month', year: number, index: number) =>
      post<AISummary>('/summaries/generate', { period, year, index }),
    generateDaily: (date: string) => post<JournalEntry>(`/summaries/daily/${date}`, {}),
  },
};
