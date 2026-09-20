import { useMemo, useState, type ReactNode } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Mic, Image as ImageIcon, Music, MapPin, CalendarRange, Plus, Film, Play } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { fillDays, isEmptyDay } from '~/lib/days';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { tone } from '~/lib/periods';
import { orderPeriods, buildPeriodTree, type PeriodNode } from '~/lib/periodTree';
import { iconFor } from '~/lib/icons';
import { SpotifyChip } from '~/components/SpotifyChip';
import { PeriodDialog } from '~/components/PeriodDialog';
import { Button } from '~/components/ui/Button';
import { PageHeader } from '~/components/ui/PageHeader';
import { PullToRefresh } from '~/components/PullToRefresh';
import { HeaderActionsMenu } from '~/components/HeaderActionsMenu';
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

  // One row per calendar day, not per stored day — the gaps are part of the
  // story, and a quiet day is the one you most want to be able to tap into.
  const days = useMemo(() => fillDays(entries ?? []), [entries]);

  // Identical in every state: a first run still needs to reach the theme, and
  // still wants to be able to mark a period before there's an entry to show.
  const headerActions = (
    <>
      {/* Above lg this stays out in the open; below it, the "…" holds it. */}
      <Button
        variant="bare"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={() => setAddOpen(true)}
        title="Mark a period"
        aria-label="Mark a period"
      >
        <CalendarRange size={18} strokeWidth={2} />
      </Button>
      <HeaderActionsMenu
        items={[
          { icon: CalendarRange, label: 'Mark a period', onSelect: () => setAddOpen(true) },
        ]}
      />
    </>
  );

  const dialogs = (
    <>
      {addOpen && <PeriodDialog open onClose={() => setAddOpen(false)} />}
      {editing && <PeriodDialog open period={editing} onClose={() => setEditing(null)} />}
    </>
  );

  // The nav no longer names the page on a phone, so the heading stays put even
  // while there's nothing under it.
  if (isLoading || isError || !entries || entries.length === 0)
    return (
      <div className="animate-fade-up">
        <PageHeader title="Timeline" actions={headerActions} />
        {isLoading ? <LoadingState /> : isError ? <ErrorState /> : <EmptyState />}
        {dialogs}
      </div>
    );

  const activePeriods = periods ?? [];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Timeline"
        subtitle={<TimelineMeta entries={entries} periods={activePeriods} />}
        actions={headerActions}
      />

      <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ['entries'] })}>
        <PeriodTimeline entries={days} periods={activePeriods} onEditPeriod={setEditing} />
      </PullToRefresh>

      {dialogs}
    </div>
  );
}

// Entries arrive newest-first, so a single pass keeps them in order.
function groupByMonth(entries: JournalEntry[]): { month: string; rows: JournalEntry[] }[] {
  const groups: { month: string; rows: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const month = formatDate(new Date(entry.date + 'T00:00:00'), 'MMMM yyyy');
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.rows.push(entry);
    else groups.push({ month, rows: [entry] });
  }
  return groups;
}

function renderNodes(nodes: PeriodNode[], onEditPeriod: (p: TimePeriod) => void) {
  return nodes.map((node) =>
    node.kind === 'entry' ? (
      isEmptyDay(node.entry) ? (
        <QuietDay key={node.entry.id} date={node.entry.date} />
      ) : (
        <EntryCard key={node.entry.id} entry={node.entry} />
      )
    ) : (
      <PeriodBlock key={node.period.id} period={node.period} onEdit={onEditPeriod}>
        {renderNodes(node.children, onEditPeriod)}
      </PeriodBlock>
    )
  );
}

// A named span of days, drawn as a tinted panel around the rows it covers.
// The header is the only way into the period's dialog from the timeline.
function PeriodBlock({
  period,
  onEdit,
  children,
}: {
  period: TimePeriod;
  onEdit: (p: TimePeriod) => void;
  children: ReactNode;
}) {
  const t = tone(period.color);
  const Icon = iconFor(period.icon);
  // The range is what tells you a panel is one half of a period that crosses a
  // month boundary — cheaper than a "continues below" affordance. A single day
  // reads as one date, not as an arrow pointing at itself.
  const day = (d: string) => formatDate(new Date(d + 'T00:00:00'), 'MMM d');
  const range =
    period.startDate === period.endDate
      ? day(period.startDate)
      : `${day(period.startDate)} → ${day(period.endDate)}`;

  return (
    <section className={`mb-2.5 rounded-xl p-1.5 ${t.soft}`}>
      <button
        type="button"
        onClick={() => onEdit(period)}
        title={`${period.name} · ${period.startDate} → ${period.endDate}`}
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg ${t.text} ${t.softHover} transition-colors`}
      >
        <Icon size={13} strokeWidth={2.25} className="shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide truncate">
          {period.name}
        </span>
        <span className="ml-auto shrink-0 text-[10px] font-medium opacity-70">{range}</span>
      </button>
      {/* The rows carry their own bottom margin; the last one would otherwise
          leave dead space inside the panel. */}
      <div className="mt-1 [&>:last-child]:mb-0">{children}</div>
    </section>
  );
}

// The entry list, with each period's days wrapped in a panel of their own.
// Months stay the outer grouping, so a period crossing a boundary renders as
// one panel per month — both named.
function PeriodTimeline({
  entries,
  periods,
  onEditPeriod,
}: {
  entries: JournalEntry[];
  periods: TimePeriod[];
  onEditPeriod: (p: TimePeriod) => void;
}) {
  const ordered = useMemo(() => orderPeriods(periods), [periods]);

  return (
    <div className="stagger">
      {groupByMonth(entries).map(({ month, rows }) => (
        <section key={month} className="mt-5 first:mt-0">
          {/* A sticky marker per month, so scrolling a long archive never
              leaves you wondering which year you're in. Sentence case and
              muted: it's a divider, not a heading competing with the rows. */}
          <div className="sticky top-0 lg:top-14 z-10 -mx-1 px-1 py-1.5 mb-1.5 flex items-center gap-2 backdrop-blur-sm">
            <h2 className="text-xs font-medium text-muted">{month}</h2>
            <Link
              to="/entry/$date"
              params={{ date: rows[0].date }}
              aria-label={`Open the most recent day in ${month}`}
              title={`Open the most recent day in ${month}`}
              className="ml-auto -mr-1 h-6 w-6 grid place-items-center rounded-md text-faint hover:text-ink hover:bg-hover active:scale-90 transition-all"
            >
              <Plus size={14} strokeWidth={2.5} />
            </Link>
          </div>
          {renderNodes(buildPeriodTree(rows, ordered), onEditPeriod)}
        </section>
      ))}
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

// A day where nothing happened still gets a row — small, quiet, and tappable,
// so the archive reads as a continuous calendar and every day has a way in.
function QuietDay({ date }: { date: string }) {
  return (
    <div className="mb-1">
      <Link
        to="/entry/$date"
        params={{ date }}
        className="squish flex items-center justify-between gap-3 py-2 px-4 rounded-xl group cursor-pointer hover:bg-surface-hover"
      >
        <p className="text-xs text-faintest font-medium">{formatEntryDate(date)}</p>
        <Plus
          size={13}
          strokeWidth={2.5}
          className="hidden sm:block text-transparent group-hover:text-faint transition-colors"
        />
      </Link>
    </div>
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
    <div className="mb-2.5">
    <Link
      to="/entry/$date"
      params={{ date: entry.date }}
      className={`squish flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 py-3.5 px-4 rounded-xl group cursor-pointer ${
        entry.highlight ? 'surface-warm' : 'surface hover:bg-surface-hover'
      }`}
    >
      {/* Left column: date, summary, songs, images */}
      <div className="contents sm:flex sm:flex-col sm:flex-1 sm:min-w-0 sm:gap-2">
        {/* Date */}
        <p className="order-1 sm:order-none text-xs text-faint font-medium">
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
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-sunken text-secondary font-medium">
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
              <span className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-rose-50 dark:bg-rose-400/12 text-danger dark:text-rose-300 font-medium">
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
                className="w-40 h-[90px] object-cover rounded-md border border-line bg-sunken"
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
          <div className="w-0.5 h-12 bg-sunken rounded-md shrink-0 mt-1" />
          <div className="flex-1">
            <div className="h-2.5 bg-sunken rounded-md w-28 mb-2" />
            <div className="h-4 bg-sunken rounded-md w-3/4" />
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
        <div className="w-16 h-16 rounded-md bg-sunken flex items-center justify-center">
          <MessageCircle size={28} strokeWidth={1.5} className="text-faint" />
        </div>
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-spotify border-2 border-page" />
      </div>
      <p className="text-ink font-semibold text-base mb-1.5">Nothing here yet</p>
      <p className="text-faint text-sm max-w-[220px] text-center leading-relaxed">
        Send yourself a WhatsApp message and it'll show up here
      </p>
    </div>
  );
}
