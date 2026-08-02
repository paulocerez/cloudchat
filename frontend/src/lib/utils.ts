import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, getISOWeek, getYear } from 'date-fns';

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
