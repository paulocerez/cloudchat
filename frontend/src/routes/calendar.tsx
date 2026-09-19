import { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight, Star, CalendarRange, X } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { api } from '~/lib/api';
import { tone, coversDate } from '~/lib/periods';
import { PeriodDialog } from '~/components/PeriodDialog';
import { Button } from '~/components/ui/Button';
import { PageHeader } from '~/components/ui/PageHeader';
import type { JournalEntry, TimePeriod } from '@cloudchat/shared';
import { rootRoute } from './__root';

export const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: CalendarPage,
});

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_BARS = 3; // period bars stacked under a single day cell

function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selecting, setSelecting] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [editing, setEditing] = useState<TimePeriod | null>(null);

  const { data: entries } = useQuery({
    queryKey: ['entries'],
    queryFn: api.entries.list,
  });
  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: api.periods.list,
  });

  const byDate = new Map<string, JournalEntry>();
  (entries ?? []).forEach((e) => byDate.set(e.date, e));
  const activePeriods = periods ?? [];

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function cancelSelect() {
    setSelecting(false);
    setRangeStart(null);
  }

  function handleDayPick(key: string) {
    if (!rangeStart) {
      setRangeStart(key);
      return;
    }
    const [startDate, endDate] = key < rangeStart ? [key, rangeStart] : [rangeStart, key];
    setDraftRange({ startDate, endDate });
    cancelSelect();
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Calendar"
        title={format(month, 'MMMM yyyy')}
        actions={
          <>
            <Button
              variant="bare"
              size="icon"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={19} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="bare"
              size="icon"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={19} />
            </Button>
            <Button
              variant="bare"
              size="icon"
              onClick={() => setSelecting(true)}
              title="Mark a period"
              aria-label="Mark a period"
            >
              <CalendarRange size={18} strokeWidth={2} />
            </Button>
          </>
        }
      />

      {/* Range picking is a mode, so it gets a banner you can't miss — and an
          exit that isn't hidden among the month controls. */}
      {selecting && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-ink text-on-ink animate-fade-up">
          <CalendarRange size={15} strokeWidth={2.5} className="shrink-0" />
          <p className="text-xs flex-1 min-w-0">
            {rangeStart
              ? `Start ${format(new Date(rangeStart), 'MMM d')} — now pick the end day`
              : 'Pick the first day of the period'}
          </p>
          <button
            type="button"
            onClick={cancelSelect}
            className="shrink-0 h-8 px-2.5 -mr-1.5 rounded-lg text-xs font-medium text-on-ink/70 hover:text-on-ink hover:bg-on-ink/10 active:scale-[0.97] transition-all"
          >
            <X size={14} strokeWidth={2.5} className="inline mr-1" />
            Cancel
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-faint uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const entry = byDate.get(key);
          const inMonth = isSameMonth(day, month);
          const highlighted = Boolean(entry?.highlight);
          const dayPeriods = activePeriods.filter((p) => coversDate(p, key));
          const isRangeStart = rangeStart === key;

          const base =
            'relative h-11 rounded-lg flex items-center justify-center text-sm transition-all duration-150';
          const tint = !inMonth
            ? 'text-faintest'
            : isRangeStart
              ? 'bg-ink text-on-ink font-medium'
              : highlighted
                ? 'bg-amber-50 dark:bg-amber-400/15 text-amber-800 dark:text-amber-200 ring-2 ring-amber-300 dark:ring-amber-400/50 ring-offset-1 ring-offset-page font-medium'
                : entry
                  ? 'bg-sunken text-strong hover:bg-sunken-hover'
                  : 'text-faint hover:bg-hover';
          const selectHover = selecting ? 'cursor-pointer hover:ring-2 hover:ring-line-strong' : '';

          const content = (
            <>
              {isToday(day) && !highlighted && !isRangeStart && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
              {highlighted && !isRangeStart && (
                <Star size={11} className="absolute top-1 right-1 fill-amber-400 text-amber-400" />
              )}
              {/* A bookmark marks the period's first day */}
              {dayPeriods.some((p) => p.startDate === key) && (
                <Bookmark
                  size={9}
                  strokeWidth={2.5}
                  className={`absolute top-1 left-1 fill-current ${
                    tone(dayPeriods.find((p) => p.startDate === key)!.color).text
                  }`}
                />
              )}
              <span>{format(day, 'd')}</span>
              {/* Period bands stacked at the bottom of the cell */}
              {dayPeriods.length > 0 && (
                <span className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
                  {dayPeriods.slice(0, MAX_BARS).map((p) => (
                    <span key={p.id} className={`h-1 rounded-full ${tone(p.color).line}`} />
                  ))}
                </span>
              )}
            </>
          );

          if (selecting) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDayPick(key)}
                className={`${base} ${tint} ${selectHover}`}
              >
                {content}
              </button>
            );
          }

          return entry ? (
            <Link key={key} to="/entry/$date" params={{ date: key }} className={`${base} ${tint}`}>
              {content}
            </Link>
          ) : (
            <div key={key} className={`${base} ${tint}`}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sunken border border-line" /> has entry
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-400/15 ring-1 ring-amber-300 dark:ring-amber-400/50" /> highlighted
        </span>
      </div>

      {activePeriods.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium text-faint uppercase tracking-wide mb-2">Periods</h2>
          <div className="flex flex-col gap-1">
            {activePeriods.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setEditing(p)}
                className="flex items-center gap-2.5 px-2 py-1.5 -mx-2 rounded-lg text-sm text-left hover:bg-hover transition-colors"
              >
                <span className={`w-1 self-stretch min-h-4 rounded-full ${tone(p.color).line}`} />
                <Bookmark size={14} strokeWidth={2.25} className={`shrink-0 fill-current ${tone(p.color).text}`} />
                <span className="font-medium text-ink truncate">{p.name}</span>
                <span className="ml-auto shrink-0 text-xs text-faint">
                  {format(new Date(p.startDate), 'MMM d')} – {format(new Date(p.endDate), 'MMM d')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {draftRange && (
        <PeriodDialog open defaultRange={draftRange} onClose={() => setDraftRange(null)} />
      )}
      {editing && <PeriodDialog open period={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
