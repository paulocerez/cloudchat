import type { JournalEntry, TimePeriod } from '@cloudchat/shared';
import { coversDate } from './periods';

export type PeriodNode =
  | { kind: 'entry'; entry: JournalEntry }
  | { kind: 'period'; period: TimePeriod; children: PeriodNode[] };

/**
 * One global order, not one per day: nesting is only stable if a given pair of
 * periods always falls the same way round. Longest span first, so the wider
 * period becomes the outer container.
 */
export function orderPeriods(periods: TimePeriod[]): TimePeriod[] {
  const span = (p: TimePeriod) =>
    new Date(p.endDate + 'T00:00:00').getTime() - new Date(p.startDate + 'T00:00:00').getTime();
  return [...periods].sort(
    (a, b) =>
      span(b) - span(a) ||
      a.startDate.localeCompare(b.startDate) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * Wraps each run of days a period covers in a node of its own, nesting where
 * periods overlap. Rows are consecutive calendar days and `coversDate` is a
 * contiguous range, so a period opens exactly once per run. Periods that
 * overlap without nesting cleanly (Apr 1–10 and Apr 5–15) degrade into two
 * containers for the shorter one rather than broken markup.
 *
 * `ordered` must come from `orderPeriods`. Row order is preserved.
 */
export function buildPeriodTree(rows: JournalEntry[], ordered: TimePeriod[]): PeriodNode[] {
  const root: PeriodNode[] = [];
  const stack: { period: TimePeriod; children: PeriodNode[] }[] = [];

  for (const row of rows) {
    const path = ordered.filter((p) => coversDate(p, row.date));

    let shared = 0;
    while (
      shared < stack.length &&
      shared < path.length &&
      stack[shared].period.id === path[shared].id
    )
      shared++;
    stack.length = shared;

    for (const period of path.slice(shared)) {
      const node = { kind: 'period' as const, period, children: [] as PeriodNode[] };
      (stack[stack.length - 1]?.children ?? root).push(node);
      stack.push(node);
    }

    (stack[stack.length - 1]?.children ?? root).push({ kind: 'entry', entry: row });
  }

  return root;
}
