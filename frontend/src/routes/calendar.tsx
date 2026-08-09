import { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
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
import type { JournalEntry } from '@cloudchat/shared';
import { rootRoute } from './__root';

export const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: CalendarPage,
});

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { data: entries } = useQuery({
    queryKey: ['entries'],
    queryFn: api.entries.list,
  });

  const byDate = new Map<string, JournalEntry>();
  (entries ?? []).forEach((e) => byDate.set(e.date, e));

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">{format(month, 'MMMM yyyy')}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
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

          const base =
            'relative h-10 rounded-lg flex items-center justify-center text-sm transition-all duration-150';
          const tone = !inMonth
            ? 'text-gray-300'
            : highlighted
              ? 'bg-amber-50 text-amber-800 ring-2 ring-amber-300 ring-offset-1 ring-offset-white font-medium'
              : entry
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'text-gray-400 hover:bg-gray-50';

          const content = (
            <>
              {isToday(day) && !highlighted && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
              {highlighted && <Star size={11} className="absolute top-1 right-1 fill-amber-400 text-amber-400" />}
              <span>{format(day, 'd')}</span>
            </>
          );

          return entry ? (
            <Link key={key} to="/entry/$date" params={{ date: key }} className={`${base} ${tone}`}>
              {content}
            </Link>
          ) : (
            <div key={key} className={`${base} ${tone}`}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> has entry
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-50 ring-1 ring-amber-300" /> highlighted
        </span>
      </div>
    </div>
  );
}
