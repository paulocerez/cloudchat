import { useLayoutEffect, useRef, useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Mic, Image as ImageIcon, Music, MapPin, Flame, Bookmark, CalendarRange, Plus, Film, Play } from 'lucide-react';
import { subDays, format as formatDate } from 'date-fns';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { tone, coversDate } from '~/lib/periods';
import { SpotifyChip } from '~/components/SpotifyChip';
import { PeriodDialog } from '~/components/PeriodDialog';
import { Button } from '~/components/ui/Button';
import { PageHeader } from '~/components/ui/PageHeader';
import { PullToRefresh } from '~/components/PullToRefresh';
import { ThemeToggle } from '~/components/ThemeToggle';
import { useTheme } from '~/lib/theme';
import { mediaUrl } from '~/components/entry/shared';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage, JournalVideo, TimePeriod } from '@cloudchat/shared';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Timeline,
});

function Timeline() {
  const qc = useQueryClient();
  const { data: entries, isLoading, isError } = useQuery({
    queryKey: ['entries'],
    queryFn: api.entries.list,
  });
  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: api.periods.list,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TimePeriod | null>(null);

  // The nav no longer names the page on a phone, so the heading stays put even
  // while there's nothing under it.
  if (isLoading || isError || !entries || entries.length === 0)
    return (
      <div className="animate-fade-up">
        {/* The toggle rides along even here — it's the only way to reach it on
            a phone, and a first run has no entries to hang a header off. */}
        <PageHeader title="Timeline" actions={<ThemeToggle className="lg:hidden" />} />
        {isLoading ? <LoadingState /> : isError ? <ErrorState /> : <EmptyState />}
      </div>
    );

  const activePeriods = periods ?? [];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Timeline"
        subtitle={<TimelineMeta entries={entries} periods={activePeriods} />}
        actions={
          <>
            <StreakBadge entries={entries} />
            <Link
              to="/entry/$date"
              params={{ date: formatDate(new Date(), 'yyyy-MM-dd') }}
              title="Go to today"
              className="h-9 px-3 inline-flex items-center rounded-full surface-solid text-[13px] font-semibold text-ink hover:bg-surface-hover active:scale-[0.96] transition-transform"
            >
              Today
            </Link>
            {/* An explicit button, not a second "…" — the nav already owns that
                glyph, and two of them in one corner reads as a mistake. */}
            <Button
              variant="bare"
              size="icon"
              onClick={() => setAddOpen(true)}
              title="Mark a period"
              aria-label="Mark a period"
            >
              <CalendarRange size={18} strokeWidth={2} />
            </Button>
            {/* Desktop reaches the theme from the top bar; below lg there is no
                top bar, so it lives here instead. */}
            <ThemeToggle className="lg:hidden" />
          </>
        }
      />

      <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ['entries'] })}>
        <PeriodTimeline entries={entries} periods={activePeriods} onEditPeriod={setEditing} />
      </PullToRefresh>

      {addOpen && <PeriodDialog open onClose={() => setAddOpen(false)} />}
      {editing && (
        <PeriodDialog open period={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

interface Band {
  period: TimePeriod;
  top: number;
  height: number;
  lane: number;
}

const LANE_WIDTH = 22; // horizontal spacing between overlapping period lines

// Renders the entry list with a measured left gutter of vertical period lines.
// Each line brackets the rows its date range covers.
function PeriodTimeline({
  entries,
  periods,
  onEditPeriod,
}: {
  entries: JournalEntry[];
  periods: TimePeriod[];
  onEditPeriod: (p: TimePeriod) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [bands, setBands] = useState<Band[]>([]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || periods.length === 0) {
      setBands([]);
      return;
    }

    const measure = () => {
      const contTop = el.getBoundingClientRect().top;
      const rects = new Map<string, { top: number; bottom: number }>();
      el.querySelectorAll<HTMLElement>('[data-entry-date]').forEach((row) => {
        const r = row.getBoundingClientRect();
        rects.set(row.dataset.entryDate!, { top: r.top - contTop, bottom: r.bottom - contTop });
      });

      // entries are rendered newest-first (desc by date)
      const raw = periods
        .map((period) => {
          const covered = entries
            .filter((e) => coversDate(period, e.date))
            .map((e) => rects.get(e.date))
            .filter((r): r is { top: number; bottom: number } => Boolean(r));

          let top: number;
          let bottom: number;
          if (covered.length > 0) {
            top = Math.min(...covered.map((c) => c.top));
            bottom = Math.max(...covered.map((c) => c.bottom));
          } else {
            // No entries in range — anchor the line at the gap between the
            // nearest older and newer neighbours so it still reads as a marker.
            const olderTop = entries
              .filter((e) => e.date < period.startDate)
              .map((e) => rects.get(e.date)?.top)
              .find((v): v is number => v !== undefined);
            const newerBottom = [...entries]
              .filter((e) => e.date > period.endDate)
              .reverse()
              .map((e) => rects.get(e.date)?.bottom)
              .find((v): v is number => v !== undefined);
            const anchor = newerBottom ?? olderTop ?? 0;
            top = anchor;
            bottom = anchor + 28;
          }
          return { period, top, height: Math.max(bottom - top, 20) };
        })
        .sort((a, b) => a.top - b.top);

      // Greedy lane assignment so overlapping lines sit side by side.
      const laneEnds: number[] = [];
      const placed: Band[] = raw.map((b) => {
        let lane = laneEnds.findIndex((end) => b.top >= end - 1);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(0);
        }
        laneEnds[lane] = b.top + b.height;
        return { ...b, lane };
      });
      setBands(placed);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [entries, periods]);

  const laneCount = bands.reduce((max, b) => Math.max(max, b.lane + 1), 0);
  const gutter = laneCount > 0 ? 20 + laneCount * LANE_WIDTH : 0;

  return (
    <div className="relative" style={{ paddingLeft: gutter }}>
      {/* Period lines live in the left gutter, absolutely positioned. */}
      <div className="pointer-events-none absolute inset-0">
        {bands.map((b) => {
          const t = tone(b.period.color);
          const left = 8 + b.lane * LANE_WIDTH;
          return (
            <button
              key={b.period.id}
              type="button"
              onClick={() => onEditPeriod(b.period)}
              title={`${b.period.name} · ${b.period.startDate} → ${b.period.endDate}`}
              className="pointer-events-auto absolute flex flex-col items-center group/period focus:outline-none"
              style={{ top: b.top, height: b.height, left }}
            >
              <Bookmark
                size={13}
                strokeWidth={2.25}
                className={`mb-1 shrink-0 fill-current ${t.text} transition-transform group-hover/period:scale-125`}
              />
              <span className={`w-1.5 flex-1 rounded-full ${t.line} transition-all group-hover/period:w-2`} />
              <span
                className={`absolute top-7 left-2.5 [writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-wide ${t.text} whitespace-nowrap overflow-hidden`}
                style={{ maxHeight: Math.max(b.height - 32, 0) }}
              >
                {b.period.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="stagger" ref={listRef}>
        {entries.map((entry, i) => {
          const month = formatDate(new Date(entry.date + 'T00:00:00'), 'MMMM yyyy');
          const prev =
            i > 0 ? formatDate(new Date(entries[i - 1].date + 'T00:00:00'), 'MMMM yyyy') : null;
          return (
            <div key={entry.id}>
              {/* A sticky marker per month, so scrolling a long archive never
                  leaves you wondering which year you're in. */}
              {month !== prev && (
                <p className="sticky top-0 lg:top-14 z-10 -mx-1 px-1 py-1.5 mt-5 first:mt-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted backdrop-blur-sm">
                  {month}
                </p>
              )}
              <EntryCard entry={entry} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Replaces the "Hey Paulo, what's on your mind?" line. A greeting says nothing
// you don't already know; the shape of the archive does.
function TimelineMeta({ entries, periods }: { entries: JournalEntry[]; periods: TimePeriod[] }) {
  const highlights = entries.filter((e) => e.highlight).length;
  const oldest = entries[entries.length - 1];
  const parts = [
    `${entries.length} day${entries.length === 1 ? '' : 's'}`,
    highlights > 0 ? `${highlights} highlighted` : null,
    periods.length > 0 ? `${periods.length} period${periods.length === 1 ? '' : 's'}` : null,
    oldest ? `since ${formatDate(new Date(oldest.date + 'T00:00:00'), 'MMM yyyy')}` : null,
  ].filter(Boolean);
  return <>{parts.join(' · ')}</>;
}

function StreakBadge({ entries }: { entries: JournalEntry[] }) {
  const hasContent = (e: JournalEntry) =>
    e.messages.length > 0 || e.voiceMemos.length > 0 || e.images.length > 0;
  const days = new Set(entries.filter(hasContent).map((e) => e.date));

  let streak = 0;
  let cursor = new Date();
  // If today has no entry yet, don't break the streak — start counting from yesterday.
  if (!days.has(formatDate(cursor, 'yyyy-MM-dd'))) cursor = subDays(cursor, 1);
  while (days.has(formatDate(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  if (streak === 0) return null;

  return (
    <span
      title={`${streak} day streak`}
      className="shrink-0 inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-orange-50 dark:bg-orange-400/12 text-orange-600 dark:text-orange-300 text-xs font-medium tabular-nums"
    >
      <Flame size={15} strokeWidth={2.5} className="fill-orange-400 text-orange-500" />
      {streak}
    </span>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const { resolved } = useTheme();
  const messageCount = entry.messages.filter((m: TextMessage) => m.fromUser).length;
  const memoCount = entry.voiceMemos.length;
  const imageCount = entry.images.length;
  const videos = entry.videos ?? [];
  const firstMessage = entry.messages.find((m: TextMessage) => m.fromUser)?.content;
  const preview = entry.title || (firstMessage ? stripSpotifyLinks(firstMessage) : undefined);
  const hasTranscript = entry.voiceMemos.some((v: VoiceMemo) => v.transcription);
  const spotifyLinks = entry.messages.flatMap((m: TextMessage) => extractSpotifyLinks(m.content));

  const mapUrl =
    entry.locations && entry.locations.length > 0
      ? staticMapUrl(entry.locations, 160, 90, resolved)
      : null;

  return (
    <div
      data-entry-date={entry.date}
      className="mb-2.5"
    >
    <Link
      to="/entry/$date"
      params={{ date: entry.date }}
      className={`squish flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 py-3.5 px-4 rounded-[22px] group cursor-pointer ${
        entry.highlight ? 'surface-warm' : 'surface hover:bg-surface-hover'
      }`}
    >
      {/* Left column: date, summary, songs, images */}
      <div className="contents sm:flex sm:flex-col sm:flex-1 sm:min-w-0 sm:gap-2">
        {/* Date */}
        <p className="order-1 sm:order-none text-xs text-faint font-medium tracking-wide uppercase">
          {formatEntryDate(entry.date)}
        </p>

        {/* Summary */}
        <div className="order-3 sm:order-none min-w-0">
          {preview ? (
            <p className="text-strong text-sm line-clamp-2 leading-relaxed">{preview}</p>
          ) : hasTranscript ? (
            <p className="text-muted text-sm italic line-clamp-2 leading-relaxed">
              {entry.voiceMemos.find((v: VoiceMemo) => v.transcription)?.transcription}
            </p>
          ) : spotifyLinks.length === 0 ? (
            <p className="text-faint text-sm italic">No content yet</p>
          ) : null}
        </div>

        {/* Songs */}
        {spotifyLinks.length > 0 && (
          <div className="order-4 sm:order-none relative flex flex-wrap items-center gap-1.5">
            <div className="pointer-events-none absolute -top-3 left-3 z-10 flex items-end gap-1">
              <Music className="music-note" size={11} strokeWidth={2.5} />
              <Music className="music-note" size={13} strokeWidth={2.5} />
              <Music className="music-note" size={10} strokeWidth={2.5} />
            </div>
            {spotifyLinks.map((link) => (
              <SpotifyChip key={`${link.kind}:${link.id}`} link={link} />
            ))}
          </div>
        )}

        {/* Images & videos */}
        {(entry.images.length > 0 || videos.length > 0) && (
          <div className="order-5 sm:order-none flex flex-wrap items-center gap-1.5">
            {entry.images.map((img: JournalImage) => (
              <img
                key={img.id}
                // Prefer the copy we stored at ingest. The proxy pulls the
                // original through WhatsApp, which wakes the linked device.
                src={img.url ?? mediaUrl(`/api/media/${img.messageId}/${img.mediaId}`)}
                alt=""
                loading="lazy"
                className="w-10 h-10 rounded-md object-cover bg-sunken"
              />
            ))}
            {videos.map((vid: JournalVideo) =>
              vid.url ? (
                <div
                  key={vid.id}
                  className="relative w-10 h-10 rounded-md overflow-hidden bg-black"
                >
                  <video
                    src={`${vid.url}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Play size={12} strokeWidth={2} className="text-white/90 fill-white/90 drop-shadow" />
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Right column: stickers, map */}
      <div className="contents sm:flex sm:flex-col sm:items-end sm:shrink-0 sm:gap-2 text-xs">
        {/* Stickers / counts */}
        <div className="order-2 sm:order-none flex items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {messageCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-blue-50 dark:bg-blue-400/12 text-blue-600 dark:text-blue-300 font-medium">
                <MessageCircle size={13} strokeWidth={2.5} />
                {messageCount}
              </span>
            )}
            {memoCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-violet-50 dark:bg-violet-400/12 text-violet-600 dark:text-violet-300 font-medium">
                <Mic size={13} strokeWidth={2.5} />
                {memoCount}
              </span>
            )}
            {imageCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-amber-50 dark:bg-amber-400/12 text-amber-600 dark:text-amber-300 font-medium">
                <ImageIcon size={13} strokeWidth={2.5} />
                {imageCount}
              </span>
            )}
            {videos.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-400/15 text-slate-600 dark:text-slate-300 font-medium">
                <Film size={13} strokeWidth={2.5} />
                {videos.length}
              </span>
            )}
            {spotifyLinks.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-green-50 dark:bg-green-400/12 text-green-600 dark:text-green-300 font-medium">
                <Music size={13} strokeWidth={2.5} />
                {spotifyLinks.length}
              </span>
            )}
            {entry.locations && entry.locations.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-rose-50 dark:bg-rose-400/12 text-rose-600 dark:text-rose-300 font-medium">
                <MapPin size={13} strokeWidth={2.5} />
                {entry.locations.length}
              </span>
            )}
          </div>
          {/* Arrow slides right on hover (desktop only) */}
          <span className="hidden sm:inline-block transition-transform duration-200 group-hover:translate-x-1 text-faintest group-hover:text-secondary">
            →
          </span>
        </div>

        {/* Map + location */}
        {entry.locations && entry.locations.length > 0 && (
          <div className="order-6 sm:order-none flex flex-col items-start sm:items-end gap-1.5">
            {mapUrl && (
              <img
                src={mapUrl}
                alt="Map preview"
                loading="lazy"
                className="w-40 h-[90px] object-cover rounded-lg border border-line bg-sunken"
              />
            )}
            <span className="flex items-center gap-1 text-danger font-medium sm:text-right max-w-full sm:max-w-[10rem] truncate">
              <MapPin size={12} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">
                {entry.locations.map((l) => l.name).join(', ')}
              </span>
            </span>
          </div>
        )}
      </div>
    </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-line">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 py-4 animate-pulse">
          <div className="w-0.5 h-12 bg-sunken rounded-full shrink-0 mt-1" />
          <div className="flex-1">
            <div className="h-2.5 bg-sunken rounded w-28 mb-2" />
            <div className="h-4 bg-sunken rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="text-center py-16 animate-fade-up">
      <p className="text-muted text-sm">Failed to load entries. Is the backend running?</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-up select-none">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-sunken flex items-center justify-center">
          <MessageCircle size={28} strokeWidth={1.5} className="text-faint" />
        </div>
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-page" />
      </div>
      <p className="text-ink font-semibold text-base mb-1.5">Nothing here yet</p>
      <p className="text-faint text-sm max-w-[220px] text-center leading-relaxed">
        Send yourself a WhatsApp message and it'll show up here
      </p>
    </div>
  );
}
