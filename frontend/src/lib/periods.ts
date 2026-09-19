import type { PeriodColor, TimePeriod } from '@cloudchat/shared';

// Full class strings (not interpolated) so Tailwind's JIT scanner keeps them —
// which is why each dark pair is written out rather than derived.
// `line` and `swatch` need none: a solid 400 carries on either ground.
export interface PeriodTone {
  line: string; // solid vertical bar / calendar band
  soft: string; // tinted background
  softHover: string;
  text: string; // label text
  ring: string; // ring color for selection
  swatch: string; // small circle in the picker
}

export const PERIOD_TONES: Record<PeriodColor, PeriodTone> = {
  amber: {
    line: 'bg-amber-400',
    soft: 'bg-amber-100 dark:bg-amber-400/15',
    softHover: 'hover:bg-amber-100 dark:hover:bg-amber-400/20',
    text: 'text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-300 dark:ring-amber-400/50',
    swatch: 'bg-amber-400',
  },
  orange: {
    line: 'bg-orange-400',
    soft: 'bg-orange-100 dark:bg-orange-400/15',
    softHover: 'hover:bg-orange-100 dark:hover:bg-orange-400/20',
    text: 'text-orange-600 dark:text-orange-300',
    ring: 'ring-orange-300 dark:ring-orange-400/50',
    swatch: 'bg-orange-400',
  },
  rose: {
    line: 'bg-rose-400',
    soft: 'bg-rose-100 dark:bg-rose-400/15',
    softHover: 'hover:bg-rose-100 dark:hover:bg-rose-400/20',
    text: 'text-danger dark:text-rose-300',
    ring: 'ring-rose-300 dark:ring-rose-400/50',
    swatch: 'bg-rose-400',
  },
  pink: {
    line: 'bg-pink-400',
    soft: 'bg-pink-100 dark:bg-pink-400/15',
    softHover: 'hover:bg-pink-100 dark:hover:bg-pink-400/20',
    text: 'text-pink-600 dark:text-pink-300',
    ring: 'ring-pink-300 dark:ring-pink-400/50',
    swatch: 'bg-pink-400',
  },
  violet: {
    line: 'bg-violet-400',
    soft: 'bg-violet-100 dark:bg-violet-400/15',
    softHover: 'hover:bg-violet-100 dark:hover:bg-violet-400/20',
    text: 'text-violet-600 dark:text-violet-300',
    ring: 'ring-violet-300 dark:ring-violet-400/50',
    swatch: 'bg-violet-400',
  },
  indigo: {
    line: 'bg-indigo-400',
    soft: 'bg-indigo-100 dark:bg-indigo-400/15',
    softHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-400/20',
    text: 'text-indigo-600 dark:text-indigo-300',
    ring: 'ring-indigo-300 dark:ring-indigo-400/50',
    swatch: 'bg-indigo-400',
  },
  blue: {
    line: 'bg-blue-400',
    soft: 'bg-blue-100 dark:bg-blue-400/15',
    softHover: 'hover:bg-blue-100 dark:hover:bg-blue-400/20',
    text: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-300 dark:ring-blue-400/50',
    swatch: 'bg-blue-400',
  },
  sky: {
    line: 'bg-sky-400',
    soft: 'bg-sky-100 dark:bg-sky-400/15',
    softHover: 'hover:bg-sky-100 dark:hover:bg-sky-400/20',
    text: 'text-sky-600 dark:text-sky-300',
    ring: 'ring-sky-300 dark:ring-sky-400/50',
    swatch: 'bg-sky-400',
  },
  cyan: {
    line: 'bg-cyan-400',
    soft: 'bg-cyan-100 dark:bg-cyan-400/15',
    softHover: 'hover:bg-cyan-100 dark:hover:bg-cyan-400/20',
    text: 'text-cyan-600 dark:text-cyan-300',
    ring: 'ring-cyan-300 dark:ring-cyan-400/50',
    swatch: 'bg-cyan-400',
  },
  teal: {
    line: 'bg-teal-400',
    soft: 'bg-teal-100 dark:bg-teal-400/15',
    softHover: 'hover:bg-teal-100 dark:hover:bg-teal-400/20',
    text: 'text-teal-600 dark:text-teal-300',
    ring: 'ring-teal-300 dark:ring-teal-400/50',
    swatch: 'bg-teal-400',
  },
  green: {
    line: 'bg-green-400',
    soft: 'bg-green-100 dark:bg-green-400/15',
    softHover: 'hover:bg-green-100 dark:hover:bg-green-400/20',
    text: 'text-green-600 dark:text-green-300',
    ring: 'ring-green-300 dark:ring-green-400/50',
    swatch: 'bg-green-400',
  },
  lime: {
    line: 'bg-lime-400',
    soft: 'bg-lime-100 dark:bg-lime-400/15',
    softHover: 'hover:bg-lime-100 dark:hover:bg-lime-400/20',
    text: 'text-lime-600 dark:text-lime-300',
    ring: 'ring-lime-300 dark:ring-lime-400/50',
    swatch: 'bg-lime-400',
  },
};

export const PERIOD_COLORS: PeriodColor[] = [
  'amber',
  'orange',
  'rose',
  'pink',
  'violet',
  'indigo',
  'blue',
  'sky',
  'cyan',
  'teal',
  'green',
  'lime',
];

export function tone(color: PeriodColor): PeriodTone {
  return PERIOD_TONES[color] ?? PERIOD_TONES.amber;
}

// Inclusive check: is `date` (YYYY-MM-DD) inside the period's span?
export function coversDate(period: TimePeriod, date: string): boolean {
  return date >= period.startDate && date <= period.endDate;
}
