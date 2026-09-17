import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { format, isToday, isYesterday } from 'date-fns';
import { ChevronLeft, MoreHorizontal, Pencil } from 'lucide-react';
import type { JournalEntry } from '@cloudchat/shared';
import { formatEntryDate } from '~/lib/utils';
import { Button } from '~/components/ui/Button';

function eyebrowFor(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const short = format(d, 'EEE d MMM');
  if (isToday(d)) return `Today · ${short}`;
  if (isYesterday(d)) return `Yesterday · ${short}`;
  return short;
}

/**
 * Sticky chrome: back, edit, overflow. Icon-only, because four labelled text
 * buttons wrapped to two rows at 390px. The date fades into the centre once
 * the title below has scrolled away, so you always know which day you're in.
 */
export function EntryHeader({
  entry,
  onEdit,
  onActions,
}: {
  entry: JournalEntry;
  onEdit: () => void;
  onActions: () => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTitleHidden(!e.isIntersecting), {
      // The nav (56px) plus this bar (48px) sit above the scroll port.
      rootMargin: '-104px 0px 0px 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else router.navigate({ to: '/' });
  };

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 md:-mx-8 -mt-8 px-4 sm:px-6 md:px-8 pt-8 pb-2 bg-white/70 backdrop-blur-xl backdrop-saturate-150 glass-surface [mask-image:linear-gradient(to_bottom,black_calc(100%-14px),transparent)]">
        <div className="flex items-center gap-2 h-10">
          <Button variant="icon" size="icon" onClick={goBack} aria-label="Back">
            <ChevronLeft size={19} strokeWidth={2.25} />
          </Button>

          <span
            className={`flex-1 min-w-0 truncate text-center text-sm font-semibold text-gray-900 tracking-[-0.01em] transition-opacity duration-200 ${
              titleHidden ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!titleHidden}
          >
            {entry.title || format(new Date(entry.date + 'T00:00:00'), 'EEE d MMM')}
          </span>

          <Button variant="icon" size="icon" onClick={onEdit} aria-label="Edit day">
            <Pencil size={16} strokeWidth={2.25} />
          </Button>
          <Button variant="icon" size="icon" onClick={onActions} aria-label="More actions">
            <MoreHorizontal size={18} strokeWidth={2.25} />
          </Button>
        </div>
      </div>

      <div ref={titleRef} className="pt-4 animate-fade-up">
        <p className="text-xs font-medium tracking-wide uppercase text-gray-400 mb-1">
          {eyebrowFor(entry.date)}
        </p>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-[-0.03em] leading-[1.15] [font-optical-sizing:auto] text-balance">
          {entry.title || formatEntryDate(entry.date)}
        </h1>
      </div>
    </>
  );
}
