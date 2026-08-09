import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Mic, Image as ImageIcon, Music, MapPin } from 'lucide-react';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import { extractSpotifyLinks, stripSpotifyLinks } from '~/lib/spotify';
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
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Timeline</h1>
      <div className="divide-y divide-gray-100 stagger">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
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

  return (
    <div className={entry.highlight ? 'my-2 rounded-xl ring-2 ring-amber-300 ring-offset-2 ring-offset-white bg-amber-50/40' : undefined}>
    <Link
      to="/entry/$date"
      params={{ date: entry.date }}
      className="flex items-start justify-between gap-3 sm:gap-4 py-4 -mx-3 px-3 rounded-lg transition-all duration-200 hover:bg-gray-50 group cursor-pointer"
    >
      {/* Left accent bar */}
      <span className="mt-1 w-0.5 h-12 rounded-full bg-gray-200 shrink-0 transition-colors duration-200 group-hover:bg-gray-400" />

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-1 font-medium tracking-wide uppercase">
          {formatEntryDate(entry.date)}
        </p>
        {preview ? (
          <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">{preview}</p>
        ) : hasTranscript ? (
          <p className="text-gray-500 text-sm italic line-clamp-2 leading-relaxed">
            {entry.voiceMemos.find((v: VoiceMemo) => v.transcription)?.transcription}
          </p>
        ) : spotifyLinks.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No content yet</p>
        ) : null}
        {spotifyLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {spotifyLinks.map((link) => (
              <SpotifyChip key={`${link.kind}:${link.id}`} link={link} />
            ))}
          </div>
        )}
        {entry.images.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
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

      <div className="flex items-center gap-3 shrink-0 text-xs mt-1">
        <div className="flex items-center gap-1.5">
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
        {/* Arrow slides right on hover */}
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 text-gray-300 group-hover:text-gray-600">
          →
        </span>
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
