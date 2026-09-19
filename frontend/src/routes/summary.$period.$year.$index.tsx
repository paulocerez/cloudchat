import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { getMonthLabel, getWeekLabel } from '~/lib/utils';
import { PageHeader } from '~/components/ui/PageHeader';
import { rootRoute } from './__root';

export const summaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/summary/$period/$year/$index',
  component: SummaryPage,
});

function SummaryPage() {
  const { period, year, index } = summaryRoute.useParams();
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['summary', period, year, index],
    queryFn: () =>
      api.summaries.get(period as 'week' | 'month', parseInt(year), parseInt(index)),
  });

  const label =
    period === 'month'
      ? getMonthLabel(parseInt(year), parseInt(index))
      : getWeekLabel(parseInt(year), parseInt(index));

  return (
    <div className="animate-fade-up">
      <Link
        to="/summaries"
        className="inline-flex items-center gap-1 text-faint hover:text-ink text-sm mb-6 transition-all duration-150 hover:-translate-x-0.5"
      >
        ← Summaries
      </Link>

      <PageHeader eyebrow={`${period} summary`} title={label} />

      {isLoading && (
        <div className="space-y-3">
          {[100, 75, 90, 60].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-sunken rounded animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      )}

      {isError && <p className="text-faint text-sm">Failed to load summary.</p>}

      {summary && (
        <div className="space-y-8 stagger">
          {summary.imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {summary.imageUrls.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="rounded-xl aspect-square object-cover w-full transition-transform duration-300 hover:scale-[1.03] hover:shadow-md"
                  style={{ animationDelay: `${i * 0.06}s` }}
                />
              ))}
            </div>
          )}

          <div className="space-y-4">
            {summary.summary.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="text-strong leading-relaxed text-sm">
                {para}
              </p>
            ))}
          </div>

          {summary.entryDates.length > 0 && (
            <div>
              <p className="text-xs text-faint font-medium uppercase tracking-wide mb-3">
                Entries
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.entryDates.map((date: string) => (
                  <Link
                    key={date}
                    to="/entry/$date"
                    params={{ date }}
                    className="text-xs border border-line hover:border-ink hover:text-ink rounded-lg px-3 py-1.5 text-muted transition-all duration-150 hover:-translate-y-0.5"
                  >
                    {date}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-faintest">
            Generated {new Date(summary.generatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
