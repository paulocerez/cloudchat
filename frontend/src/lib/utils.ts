import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  getISOWeek,
  getISOWeekYear,
  getYear,
  subWeeks,
  startOfISOWeek,
  endOfISOWeek,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEntryDate(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMMM d, yyyy');
}

export function formatShortDate(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'MMM d');
}

export function getCurrentWeek(): { year: number; index: number } {
  const now = new Date();
  return { year: getYear(now), index: getISOWeek(now) };
}

export function getCurrentMonth(): { year: number; index: number } {
  const now = new Date();
  return { year: now.getFullYear(), index: now.getMonth() + 1 };
}

export function getMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function getWeekLabel(year: number, week: number): string {
  return `Week ${week}, ${year}`;
}

export interface WeekOption {
  year: number;
  index: number;
  label: string;
}

// Most recent ISO weeks, newest first, starting from the current week.
// ISO week years can differ from the calendar year near year boundaries,
// so year/index come from the ISO helpers rather than the date's month.
export function getRecentWeeks(count: number): WeekOption[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = subWeeks(now, i);
    const start = startOfISOWeek(d);
    const end = endOfISOWeek(d);
    return {
      year: getISOWeekYear(d),
      index: getISOWeek(d),
      label: `Week ${getISOWeek(d)} · ${format(start, 'MMM d')}–${format(end, 'MMM d')}`,
    };
  });
}
