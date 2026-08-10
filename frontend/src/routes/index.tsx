import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Mic, Image as ImageIcon, Music, MapPin, Flame } from 'lucide-react';
import { subDays, format as formatDate } from 'date-fns';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
import { staticMapUrl } from '~/lib/mapbox';
import { SpotifyChip } from '~/components/SpotifyChip';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage } from '@cloudchat/shared';
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

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!entries || entries.length === 0) return <EmptyState />;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>
        <StreakBadge entries={entries} />
      </div>
      <div className="divide-y divide-gray-100 stagger">
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
    <div className={entry.highlight ? 'my-2 p-1 rounded-xl ring-2 ring-amber-300 bg-amber-50/40' : undefined}>
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
          <div className="order-4 sm:order-none flex flex-wrap items-center gap-1.5">
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
