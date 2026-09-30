import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getConfig, getHevyApiKey, getHevySyncFrom, updateConfig } from './config';
import { indexWorkouts, removeWorkout, upsertWorkout } from './firestore';
import { berlinDate } from '../utils/date';
import { HevyWorkout, HevyWorkoutEvent, Workout } from '../types';

const BASE_URL = 'https://api.hevyapp.com/v1';

async function client() {
  const apiKey = await getHevyApiKey();
  if (!apiKey) throw new Error('Hevy API key not configured');
  return axios.create({
    baseURL: BASE_URL,
    headers: { 'api-key': apiKey },
    timeout: 20_000,
  });
}

export async function getWorkout(id: string): Promise<HevyWorkout> {
  const http = await client();
  const { data } = await http.get(`/workouts/${id}`);
  // Documented as the bare workout; older responses wrapped it in { workout }.
  return (data?.workout ?? data) as HevyWorkout;
}

// Newest first, at most 10 per page. Updated events carry the full workout.
export async function listWorkoutEvents(
  since: string,
  page: number
): Promise<{ events: HevyWorkoutEvent[]; pageCount: number }> {
  const http = await client();
  const { data } = await http.get('/workouts/events', {
    params: { since, page, pageSize: 10 },
  });
  return {
    events: (data?.events ?? []) as HevyWorkoutEvent[],
    pageCount: Number(data?.page_count ?? 0),
  };
}

// ── Mapping ─────────────────────────────────────────────────
export function toWorkout(w: HevyWorkout): Workout {
  const byIndex = <T extends { index: number }>(a: T[] = []) =>
    [...a].sort((x, y) => x.index - y.index);

  return {
    id: uuidv4(),
    hevyWorkoutId: w.id,
    title: w.title || 'Workout',
    // Firestore rejects undefined, so optional fields are left off entirely.
    ...(w.description ? { description: w.description } : {}),
    startTime: w.start_time,
    endTime: w.end_time,
    exercises: byIndex(w.exercises).map((e) => ({
      title: e.title,
      ...(e.notes ? { notes: e.notes } : {}),
      supersetId: e.superset_id ?? null,
      sets: byIndex(e.sets).map((s) => ({
        type: s.type || 'normal',
        weightKg: s.weight_kg ?? null,
        reps: s.reps ?? null,
        distanceM: s.distance_meters ?? null,
        durationS: s.duration_seconds ?? null,
        rpe: s.rpe ?? null,
      })),
    })),
  };
}

// True when the workout's journal day is earlier than the sync cutoff.
export function isBeforeCutoff(w: HevyWorkout, from: string): boolean {
  return Boolean(from) && berlinDate(w.start_time) < from;
}

// ── Sync ────────────────────────────────────────────────────
// Catches up on everything since the stored cursor: the safety net for missed
// or never-sent webhooks, and the backfill when `since` is passed explicitly.
export async function syncWorkouts(
  since?: string
): Promise<{ imported: number; removed: number; dates: string[] }> {
  const cfg = await getConfig();
  const from = since ?? cfg.hevyLastSyncAt ?? '1970-01-01T00:00:00Z';
  // Taken before the first request, so anything saved mid-sync is seen next time.
  const startedAt = new Date().toISOString();

  const events: HevyWorkoutEvent[] = [];
  for (let page = 1; ; page++) {
    const { events: batch, pageCount } = await listWorkoutEvents(from, page);
    events.push(...batch);
    if (batch.length === 0 || page >= pageCount) break;
  }

  // Events arrive newest first; apply oldest first so the latest state wins.
  const index = await indexWorkouts();
  const cutoff = await getHevySyncFrom();
  const dates = new Set<string>();
  let imported = 0;
  let removed = 0;
  for (const event of events.reverse()) {
    if (event.type === 'deleted') {
      const date = await removeWorkout(event.id, index);
      if (date) {
        dates.add(date);
        removed++;
      }
    } else if (event.workout?.id && !isBeforeCutoff(event.workout, cutoff)) {
      const date = berlinDate(event.workout.start_time);
      await upsertWorkout(date, toWorkout(event.workout), index);
      dates.add(date);
      imported++;
    }
  }

  await updateConfig({ hevyLastSyncAt: startedAt });
  return { imported, removed, dates: [...dates].sort() };
}
