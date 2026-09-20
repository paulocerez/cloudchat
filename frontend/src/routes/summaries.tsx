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
        <p className="text-xs text-faint font-medium uppercase tracking-wide mb-3">
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
        <p className="text-xs text-faint font-medium uppercase tracking-wide mb-3">
          Past summaries
        </p>
        {isLoading ? (
          <div className="divide-y divide-line">
            {[1, 2].map((i) => (
              <div key={i} className="py-4 animate-pulse">
                <div className="h-2.5 bg-sunken rounded-md w-20 mb-2" />
                <div className="h-4 bg-sunken rounded-md w-2/3" />
              </div>
            ))}
          </div>
        ) : !summaries || summaries.length === 0 ? (
          <p className="text-faint text-sm">No summaries yet. Generate your first one above.</p>
        ) : (
          <div className="divide-y divide-line stagger">
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
    <div className="mt-3 flex items-center gap-2 rounded-md bg-surface border border-line p-3">
      <span className="text-xs text-faint shrink-0">Earlier week</span>
      <select
        value={sel}
        onChange={(e) => {
          setSel(Number(e.target.value));
          reset();
        }}
        className="flex-1 min-w-0 text-sm text-ink bg-transparent focus:outline-none cursor-pointer"
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
        className="shrink-0 text-xs font-medium rounded-md px-3 py-1.5 bg-ink text-on-ink transition-all duration-150 hover:bg-ink-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink"
      >
        {isPending ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md border-2 border-on-ink/40 border-t-on-ink animate-spin-slow" />
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
      className="group text-left rounded-md bg-surface border border-line p-4 transition-all duration-200 hover:border-line-strong hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:border-line"
    >
      <p className="text-xs text-faint mb-0.5">{sublabel}</p>
      <p className="text-sm text-ink font-medium leading-tight">{label}</p>
      <div className="mt-2 h-4 flex items-center">
        {isPending ? (
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <span className="w-3 h-3 rounded-md border-2 border-line-strong border-t-secondary animate-spin-slow" />
            Generating…
          </span>
        ) : done ? (
          <span className="inline-flex items-center gap-1 text-xs text-secondary animate-pop"><Check size={13} strokeWidth={3} /> Done</span>
        ) : (
          <span className="text-xs text-faint transition-transform duration-150 group-hover:translate-x-0.5 inline-block">
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
      className="flex items-start justify-between gap-4 py-4 -mx-3 px-3 rounded-md transition-all duration-200 hover:bg-hover group"
    >
      <span className="mt-1 w-0.5 h-12 rounded-md bg-line-strong shrink-0 transition-colors duration-200 group-hover:bg-muted" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-faint capitalize mb-0.5">{summary.period}</p>
        <p className="text-sm font-medium text-ink mb-1">{label}</p>
        <p className="text-sm text-muted line-clamp-2 leading-relaxed">{summary.summary}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs text-faint mt-1">
        {summary.imageUrls.length > 0 && <span>{summary.imageUrls.length} photos</span>}
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 text-faintest group-hover:text-secondary">
          →
        </span>
      </div>
    </Link>
  );
}
