import { BookOpen, CalendarDays, WandSparkles } from 'lucide-react';

// One source for the top bar and the phone's bottom tab bar.
export const TABS = [
  { to: '/', label: 'Timeline', Icon: BookOpen },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/summaries', label: 'Summaries', Icon: WandSparkles },
] as const;

export function isTabActive(to: string, pathname: string): boolean {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}
