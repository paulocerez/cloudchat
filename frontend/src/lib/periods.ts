import type { PeriodColor, TimePeriod } from '@cloudchat/shared';

// Full class strings (not interpolated) so Tailwind's JIT scanner keeps them.
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
    soft: 'bg-amber-100',
    softHover: 'hover:bg-amber-100',
    text: 'text-amber-600',
    ring: 'ring-amber-300',
    swatch: 'bg-amber-400',
  },
  orange: {
    line: 'bg-orange-400',
    soft: 'bg-orange-100',
    softHover: 'hover:bg-orange-100',
    text: 'text-orange-600',
    ring: 'ring-orange-300',
    swatch: 'bg-orange-400',
  },
  rose: {
    line: 'bg-rose-400',
    soft: 'bg-rose-100',
    softHover: 'hover:bg-rose-100',
    text: 'text-rose-600',
    ring: 'ring-rose-300',
    swatch: 'bg-rose-400',
  },
  pink: {
    line: 'bg-pink-400',
    soft: 'bg-pink-100',
    softHover: 'hover:bg-pink-100',
    text: 'text-pink-600',
    ring: 'ring-pink-300',
    swatch: 'bg-pink-400',
  },
  violet: {
    line: 'bg-violet-400',
    soft: 'bg-violet-100',
    softHover: 'hover:bg-violet-100',
    text: 'text-violet-600',
    ring: 'ring-violet-300',
    swatch: 'bg-violet-400',
  },
  indigo: {
    line: 'bg-indigo-400',
    soft: 'bg-indigo-100',
    softHover: 'hover:bg-indigo-100',
    text: 'text-indigo-600',
    ring: 'ring-indigo-300',
    swatch: 'bg-indigo-400',
  },
  blue: {
    line: 'bg-blue-400',
    soft: 'bg-blue-100',
    softHover: 'hover:bg-blue-100',
    text: 'text-blue-600',
    ring: 'ring-blue-300',
    swatch: 'bg-blue-400',
  },
  sky: {
    line: 'bg-sky-400',
    soft: 'bg-sky-100',
    softHover: 'hover:bg-sky-100',
    text: 'text-sky-600',
    ring: 'ring-sky-300',
    swatch: 'bg-sky-400',
  },
  cyan: {
    line: 'bg-cyan-400',
    soft: 'bg-cyan-100',
    softHover: 'hover:bg-cyan-100',
    text: 'text-cyan-600',
    ring: 'ring-cyan-300',
    swatch: 'bg-cyan-400',
  },
  teal: {
    line: 'bg-teal-400',
    soft: 'bg-teal-100',
    softHover: 'hover:bg-teal-100',
    text: 'text-teal-600',
    ring: 'ring-teal-300',
    swatch: 'bg-teal-400',
  },
  green: {
    line: 'bg-green-400',
    soft: 'bg-green-100',
    softHover: 'hover:bg-green-100',
    text: 'text-green-600',
    ring: 'ring-green-300',
    swatch: 'bg-green-400',
  },
  lime: {
    line: 'bg-lime-400',
    soft: 'bg-lime-100',
    softHover: 'hover:bg-lime-100',
    text: 'text-lime-600',
    ring: 'ring-lime-300',
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
