import type { PeriodColor } from './period';

// A recurring habit the user checks off per day, with a weekly target
// (e.g. "Run 3x per week"). Completions are stored per-day on JournalEntry.
export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  color: PeriodColor;
  weeklyTarget: number; // 1–7 days per week
  createdAt: string;
  updatedAt: string;
}
