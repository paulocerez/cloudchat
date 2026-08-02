import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import type { JournalEntry, TextMessage, VoiceMemo } from '@cloudchat/shared';
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
  const preview = entry.messages.find((m: TextMessage) => m.fromUser)?.content;
  const hasTranscript = entry.voiceMemos.some((v: VoiceMemo) => v.transcription);

  return (
    <Link
      to="/entry/$date"
      params={{ date: entry.date }}
      className="flex items-start justify-between gap-4 py-4 -mx-3 px-3 rounded-lg transition-all duration-200 hover:bg-gray-50 group cursor-pointer"
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
        ) : (
          <p className="text-gray-400 text-sm italic">No content yet</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400 mt-1">
        {messageCount > 0 && <span>{messageCount} msg</span>}
        {memoCount > 0 && <span>{memoCount} memo</span>}
        {imageCount > 0 && <span>{imageCount} photo</span>}
        {/* Arrow slides right on hover */}
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 text-gray-300 group-hover:text-gray-600">
          →
        </span>
      </div>
    </Link>
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
    <div className="text-center py-20 animate-fade-up">
      <p className="text-gray-900 font-medium mb-1">No entries yet</p>
      <p className="text-gray-400 text-sm">Your daily WhatsApp prompts will appear here</p>
    </div>
  );
}
