import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format, isFuture, isToday, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, MoreHorizontal, Star } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { Button } from '~/components/ui/Button';

export function shiftDate(date: string, days: number): string {
  return format(addDays(new Date(date + 'T00:00:00'), days), 'yyyy-MM-dd');
}

export function canGoForward(date: string): boolean {
  return !isFuture(new Date(shiftDate(date, 1) + 'T00:00:00'));
}

function eyebrowFor(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const short = format(d, 'EEE d MMM');
  if (isToday(d)) return `Today · ${short}`;
  if (isYesterday(d)) return `Yesterday · ${short}`;
  return short;
}

/**
 * Sticky chrome: back, highlight, overflow — plus day-to-day arrows beside the
 * title. Highlight is the one action worth a permanent button; it's a mood, you
 * set it while reading. Everything else lives behind the "…".
 */
export function EntryHeader({
  entry,
  onActions,
}: {
  entry: JournalEntry;
  onActions: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);

  const highlight = useMutation({
    mutationFn: () => api.entries.setHighlight(entry.date, !entry.highlight),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entry', entry.date] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTitleHidden(!e.isIntersecting), {
      rootMargin: `-${window.matchMedia('(min-width: 1024px)').matches ? 96 : 40}px 0px 0px 0px`,
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else router.navigate({ to: '/' });
  };

  const forward = canGoForward(entry.date);

  return (
    <>
      <div className="sticky top-0 lg:top-14 z-20 -mx-4 sm:-mx-6 md:-mx-8 -mt-8 px-4 sm:px-6 md:px-8 pt-8 pb-2 bg-white/85 backdrop-blur-xl">
        <div className="flex items-center gap-2 h-10">
          <Button variant="icon" size="icon" onClick={goBack} aria-label="Back">
            <ChevronLeft size={19} strokeWidth={2.25} />
          </Button>

          <span
            className={`flex-1 min-w-0 truncate text-center text-sm font-semibold text-[#241F2E] tracking-[-0.01em] transition-opacity duration-200 ${
              titleHidden ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!titleHidden}
          >
            {entry.title || format(new Date(entry.date + 'T00:00:00'), 'EEE d MMM')}
          </span>

          <Button
            variant="icon"
            size="icon"
            onClick={() => highlight.mutate()}
            disabled={highlight.isPending}
            aria-pressed={entry.highlight}
            aria-label={entry.highlight ? 'Remove highlight' : 'Highlight this day'}
          >
            <Star
              size={17}
              strokeWidth={2.25}
              className={entry.highlight ? 'fill-[#F5A524] text-[#F5A524]' : ''}
            />
          </Button>
          <Button variant="icon" size="icon" onClick={onActions} aria-label="More actions">
            <MoreHorizontal size={18} strokeWidth={2.25} />
          </Button>
        </div>
      </div>

      <div ref={titleRef} className="pt-4 animate-fade-up">
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-semibold tracking-wide text-[#71717D]">
            {eyebrowFor(entry.date)}
          </p>
          {/* Arrows make the swipe discoverable, and give a pointer a way in. */}
          <span className="ml-auto flex items-center gap-0.5 -mr-1.5">
            <Link
              to="/entry/$date"
              params={{ date: shiftDate(entry.date, -1) }}
              aria-label="Previous day"
              className="h-8 w-8 flex items-center justify-center rounded-sm text-[#A6A6B0] hover:text-[#241F2E] hover:bg-gray-900/[0.05] active:scale-90 transition-all"
            >
              <ChevronLeft size={17} strokeWidth={2.25} />
            </Link>
            {forward ? (
              <Link
                to="/entry/$date"
                params={{ date: shiftDate(entry.date, 1) }}
                aria-label="Next day"
                className="h-8 w-8 flex items-center justify-center rounded-sm text-[#A6A6B0] hover:text-[#241F2E] hover:bg-gray-900/[0.05] active:scale-90 transition-all"
              >
                <ChevronRight size={17} strokeWidth={2.25} />
              </Link>
            ) : (
              <span className="h-8 w-8 flex items-center justify-center text-[#E6E6EC]">
                <ChevronRight size={17} strokeWidth={2.25} />
              </span>
            )}
          </span>
        </div>
        <h1 className="mt-1.5 text-[30px] font-semibold text-[#241F2E] leading-[1.12] tracking-[-0.025em] [font-optical-sizing:auto] text-balance">
          {entry.title || formatEntryDate(entry.date)}
        </h1>
      </div>
    </>
  );
}
