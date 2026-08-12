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
  blue: {
    line: 'bg-blue-400',
    soft: 'bg-blue-100',
    softHover: 'hover:bg-blue-100',
    text: 'text-blue-600',
    ring: 'ring-blue-300',
    swatch: 'bg-blue-400',
  },
  violet: {
    line: 'bg-violet-400',
    soft: 'bg-violet-100',
    softHover: 'hover:bg-violet-100',
    text: 'text-violet-600',
    ring: 'ring-violet-300',
    swatch: 'bg-violet-400',
  },
  green: {
    line: 'bg-green-400',
    soft: 'bg-green-100',
    softHover: 'hover:bg-green-100',
    text: 'text-green-600',
    ring: 'ring-green-300',
    swatch: 'bg-green-400',
  },
  rose: {
    line: 'bg-rose-400',
    soft: 'bg-rose-100',
    softHover: 'hover:bg-rose-100',
    text: 'text-rose-600',
    ring: 'ring-rose-300',
    swatch: 'bg-rose-400',
  },
};

export const PERIOD_COLORS: PeriodColor[] = ['amber', 'blue', 'violet', 'green', 'rose'];

export const PERIOD_EMOJIS = ['🌴', '✈️', '🏖️', '🎄', '💼', '🏠', '❤️', '🎉', '🎓', '🤒'];

export const HABIT_EMOJIS = ['🏃', '💧', '📚', '🧘', '🏋️', '🥗', '😴', '✍️', '🎸', '🧹', '💊', '🚭'];

export function tone(color: PeriodColor): PeriodTone {
  return PERIOD_TONES[color] ?? PERIOD_TONES.amber;
}

// Inclusive check: is `date` (YYYY-MM-DD) inside the period's span?
export function coversDate(period: TimePeriod, date: string): boolean {
  return date >= period.startDate && date <= period.endDate;
}
