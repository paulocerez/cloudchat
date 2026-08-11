export type PeriodColor = 'amber' | 'blue' | 'violet' | 'green' | 'rose';

// A named span of days (vacation, a trip, a rough week…) that brackets a range
// of entries on the timeline and paints a band across the calendar.
export interface TimePeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD, inclusive
  endDate: string; // YYYY-MM-DD, inclusive
  color: PeriodColor;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}
