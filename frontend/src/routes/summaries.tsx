import { createRoute, Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api';
import {
  getMonthLabel,
  getWeekLabel,
  getCurrentMonth,
  getCurrentWeek,
  getRecentWeeks,
} from '~/lib/utils';
import type { AISummary } from '@cloudchat/shared';
import { useMemo, useState } from 'react';
import { PageHeader } from '~/components/ui/PageHeader';
import { rootRoute } from './__root';

export const summariesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/summaries',
  component: SummariesPage,
});

function SummariesPage() {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ['summaries'],
    queryFn: api.summaries.list,
  });

  const currentMonth = getCurrentMonth();
  const currentWeek = getCurrentWeek();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Summaries"
        subtitle="AI-generated reflections on your journal"
        className="mb-8"
      />

      <section className="mb-10">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
          Generate new
        </p>
        <div className="grid grid-cols-2 gap-3 stagger">
          <GenerateCard
            label={getMonthLabel(currentMonth.year, currentMonth.index)}
            sublabel="This month"
            period="month"
            year={currentMonth.year}
            index={currentMonth.index}
          />
          <GenerateCard
            label={getWeekLabel(currentWeek.year, currentWeek.index)}
            sublabel="This week"
            period="week"
            year={currentWeek.year}
            index={currentWeek.index}
          />
        </div>
        <EarlierWeeks />
      </section>

      <section>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
          Past summaries
        </p>
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2].map((i) => (
              <div key={i} className="py-4 animate-pulse">
                <div className="h-2.5 bg-gray-100 rounded-sm w-20 mb-2" />
                <div className="h-4 bg-gray-100 rounded-sm w-2/3" />
              </div>
            ))}
          </div>
        ) : !summaries || summaries.length === 0 ? (
          <p className="text-gray-400 text-sm">No summaries yet. Generate your first one above.</p>
        ) : (
          <div className="divide-y divide-gray-100 stagger">
            {summaries.map((s) => (
              <SummaryCard key={s.id} summary={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EarlierWeeks() {
  // Skip the current week (index 0); it already has its own card above.
  const weeks = useMemo(() => getRecentWeeks(13).slice(1), []);
  const [sel, setSel] = useState(0);
  const week = weeks[sel];
  const qc = useQueryClient();
  const { mutate, isPending, isSuccess, isError, reset } = useMutation({
    mutationFn: () => api.summaries.generate('week', week.year, week.index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['summaries'] }),
  });

  return (
    <div className="mt-3 flex items-center gap-2 rounded-sm bg-white border border-gray-200 p-3">
      <span className="text-xs text-gray-400 shrink-0">Earlier week</span>
      <select
        value={sel}
        onChange={(e) => {
          setSel(Number(e.target.value));
          reset();
        }}
        className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent focus:outline-none cursor-pointer"
      >
        {weeks.map((w, i) => (
          <option key={`${w.year}-${w.index}`} value={i}>
            {w.label}, {w.year}
          </option>
        ))}
      </select>
      <button
        onClick={() => mutate()}
        disabled={isPending || isSuccess}
        className="shrink-0 text-xs font-medium rounded-sm px-3 py-1.5 bg-gray-900 text-white transition-all duration-150 hover:bg-gray-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border-2 border-white/40 border-t-white animate-spin-slow" />
            Generating…
          </span>
        ) : isSuccess ? (
          <span className="inline-flex items-center gap-1 animate-pop"><Check size={14} strokeWidth={3} /> Done</span>
        ) : isError ? (
          'Retry'
        ) : (
          'Generate'
        )}
      </button>
    </div>
  );
}

function GenerateCard({
  label,
  sublabel,
  period,
  year,
  index,
}: {
  label: string;
  sublabel: string;
  period: 'week' | 'month';
  year: number;
  index: number;
}) {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.summaries.generate(period, year, index),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['summaries'] });
      setDone(true);
    },
  });

  return (
    <button
      onClick={() => mutate()}
      disabled={isPending || done}
      className="group text-left rounded-sm bg-white border border-gray-200 p-4 transition-all duration-200 hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:border-gray-200"
    >
      <p className="text-xs text-gray-400 mb-0.5">{sublabel}</p>
      <p className="text-sm text-gray-900 font-medium leading-tight">{label}</p>
      <div className="mt-2 h-4 flex items-center">
        {isPending ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 rounded-sm border-2 border-gray-300 border-t-gray-600 animate-spin-slow" />
            Generating…
          </span>
        ) : done ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 animate-pop"><Check size={13} strokeWidth={3} /> Done</span>
        ) : (
          <span className="text-xs text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5 inline-block">
            Generate →
          </span>
        )}
      </div>
    </button>
  );
}

function SummaryCard({ summary }: { summary: AISummary }) {
  const label =
    summary.period === 'month'
      ? getMonthLabel(summary.year, summary.periodIndex)
      : getWeekLabel(summary.year, summary.periodIndex);

  return (
    <Link
      to="/summary/$period/$year/$index"
      params={{
        period: summary.period,
        year: String(summary.year),
        index: String(summary.periodIndex),
      }}
      className="flex items-start justify-between gap-4 py-4 -mx-3 px-3 rounded-sm transition-all duration-200 hover:bg-gray-50 group"
    >
      <span className="mt-1 w-0.5 h-12 rounded-sm bg-gray-200 shrink-0 transition-colors duration-200 group-hover:bg-gray-400" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 capitalize mb-0.5">{summary.period}</p>
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{summary.summary}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400 mt-1">
        {summary.imageUrls.length > 0 && <span>{summary.imageUrls.length} photos</span>}
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 text-gray-300 group-hover:text-gray-600">
          →
        </span>
      </div>
    </Link>
  );
}
