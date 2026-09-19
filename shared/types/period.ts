export type PeriodColor =
  | 'amber'
  | 'orange'
  | 'rose'
  | 'pink'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'lime';

// A named span of days (vacation, a trip, a rough week…) that brackets a range
// of entries on the timeline and paints a band across the calendar.
export interface TimePeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD, inclusive
  endDate: string; // YYYY-MM-DD, inclusive
  color: PeriodColor;
  // Name of a lucide icon from the curated set (see frontend/src/lib/icons.ts).
  icon?: string;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}
