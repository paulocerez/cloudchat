import { useLayoutEffect, useRef, useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Mic, Image as ImageIcon, Music, MapPin, Flame, CalendarRange, Plus } from 'lucide-react';
import { subDays, format as formatDate } from 'date-fns';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { tone, coversDate } from '~/lib/periods';
import { SpotifyChip } from '~/components/SpotifyChip';
import { PeriodDialog } from '~/components/PeriodDialog';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage, TimePeriod } from '@cloudchat/shared';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Timeline,
});

function Timeline() {
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

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!entries || entries.length === 0) return <EmptyState />;

  const activePeriods = periods ?? [];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
        <div className="flex items-center gap-2">
          <StreakBadge entries={entries} />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            title="Mark a period"
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            <CalendarRange size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Period</span>
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-6">Hey Paulo, what's on your mind? Here's your timeline</p>

      <PeriodTimeline entries={entries} periods={activePeriods} onEditPeriod={setEditing} />

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
              <span className="text-sm leading-none mb-1 transition-transform group-hover/period:scale-125">
                {b.period.emoji ?? '📌'}
              </span>
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
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
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
    <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-orange-50 text-orange-600 text-xs font-medium">
      <Flame size={15} strokeWidth={2.5} className="fill-orange-400 text-orange-500" />
      {streak} day{streak === 1 ? '' : 's'}
    </span>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const messageCount = entry.messages.filter((m: TextMessage) => m.fromUser).length;
  const memoCount = entry.voiceMemos.length;
  const imageCount = entry.images.length;
  const firstMessage = entry.messages.find((m: TextMessage) => m.fromUser)?.content;
  const preview = entry.title || (firstMessage ? stripSpotifyLinks(firstMessage) : undefined);
  const hasTranscript = entry.voiceMemos.some((v: VoiceMemo) => v.transcription);
  const spotifyLinks = entry.messages.flatMap((m: TextMessage) => extractSpotifyLinks(m.content));

  const mapUrl =
    entry.locations && entry.locations.length > 0
      ? staticMapUrl(entry.locations, 160, 90)
      : null;

  return (
    <div
      data-entry-date={entry.date}
      className={entry.highlight ? 'my-2 p-1 rounded-xl ring-2 ring-amber-300 bg-amber-50/40' : undefined}
    >
    <Link
      to="/entry/$date"
      params={{ date: entry.date }}
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 py-4 px-3 rounded-lg transition-all duration-200 group cursor-pointer ${
        entry.highlight ? 'hover:bg-amber-100/60' : '-mx-3 hover:bg-gray-50'
      }`}
    >
      {/* Left column: date, summary, songs, images */}
      <div className="contents sm:flex sm:flex-col sm:flex-1 sm:min-w-0 sm:gap-2">
        {/* Date */}
        <p className="order-1 sm:order-none text-xs text-gray-400 font-medium tracking-wide uppercase">
          {formatEntryDate(entry.date)}
        </p>

        {/* Summary */}
        <div className="order-3 sm:order-none min-w-0">
          {preview ? (
            <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">{preview}</p>
          ) : hasTranscript ? (
            <p className="text-gray-500 text-sm italic line-clamp-2 leading-relaxed">
              {entry.voiceMemos.find((v: VoiceMemo) => v.transcription)?.transcription}
            </p>
          ) : spotifyLinks.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No content yet</p>
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

        {/* Images */}
        {entry.images.length > 0 && (
          <div className="order-5 sm:order-none flex flex-wrap items-center gap-1.5">
            {entry.images.map((img: JournalImage) => (
              <img
                key={img.id}
                src={`${import.meta.env.VITE_API_URL ?? ''}/api/media/${img.messageId}/${img.mediaId}`}
                alt=""
                loading="lazy"
                className="w-10 h-10 rounded-sm object-cover bg-gray-100"
              />
            ))}
          </div>
        )}
      </div>

      {/* Right column: stickers, map */}
      <div className="contents sm:flex sm:flex-col sm:items-end sm:shrink-0 sm:gap-2 text-xs">
        {/* Stickers / counts */}
        <div className="order-2 sm:order-none flex items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {messageCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-blue-50 text-blue-600 font-medium">
                <MessageCircle size={13} strokeWidth={2.5} />
                {messageCount}
              </span>
            )}
            {memoCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-violet-50 text-violet-600 font-medium">
                <Mic size={13} strokeWidth={2.5} />
                {memoCount}
              </span>
            )}
            {imageCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-amber-50 text-amber-600 font-medium">
                <ImageIcon size={13} strokeWidth={2.5} />
                {imageCount}
              </span>
            )}
            {spotifyLinks.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-green-50 text-green-600 font-medium">
                <Music size={13} strokeWidth={2.5} />
                {spotifyLinks.length}
              </span>
            )}
            {entry.locations && entry.locations.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-rose-50 text-rose-600 font-medium">
                <MapPin size={13} strokeWidth={2.5} />
                {entry.locations.length}
              </span>
            )}
          </div>
          {/* Arrow slides right on hover (desktop only) */}
          <span className="hidden sm:inline-block transition-transform duration-200 group-hover:translate-x-1 text-gray-300 group-hover:text-gray-600">
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
                className="w-40 h-[90px] object-cover rounded-lg border border-gray-200 bg-gray-100"
              />
            )}
            <span className="flex items-center gap-1 text-rose-500 font-medium sm:text-right max-w-full sm:max-w-[10rem] truncate">
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
    <div className="divide-y divide-gray-100">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 py-4 animate-pulse">
          <div className="w-0.5 h-12 bg-gray-100 rounded-full shrink-0 mt-1" />
          <div className="flex-1">
            <div className="h-2.5 bg-gray-100 rounded w-28 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="text-center py-16 animate-fade-up">
      <p className="text-gray-500 text-sm">Failed to load entries. Is the backend running?</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-up select-none">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <MessageCircle size={28} strokeWidth={1.5} className="text-gray-400" />
        </div>
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
      </div>
      <p className="text-gray-900 font-semibold text-base mb-1.5">Nothing here yet</p>
      <p className="text-gray-400 text-sm max-w-[220px] text-center leading-relaxed">
        Send yourself a WhatsApp message and it'll show up here
      </p>
    </div>
  );
}
