import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { formatEntryDate } from '~/lib/utils';
import type { JournalEntry, TextMessage, VoiceMemo, JournalImage } from '@cloudchat/shared';
import { format } from 'date-fns';
import { rootRoute } from './__root';

export const entryDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entry/$date',
  component: EntryPage,
});

function EntryPage() {
  const { date } = entryDateRoute.useParams();
  const { data: entry, isLoading, isError } = useQuery({
    queryKey: ['entry', date],
    queryFn: () => api.entries.get(date),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400 animate-fade-up">
        <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin-slow" />
        <span className="text-sm">Loading…</span>
      </div>
    );

  if (isError || !entry)
    return (
      <div className="text-center py-8 animate-fade-up">
        <p className="text-gray-500 text-sm">Entry not found</p>
        <Link to="/" className="text-gray-900 underline text-sm mt-2 block">
          ← Back to timeline
        </Link>
      </div>
    );

  return (
    <div className="animate-fade-up">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 text-sm mb-6 transition-all duration-150 hover:-translate-x-0.5"
      >
        ← Timeline
      </Link>
      <h1 className="text-lg font-semibold text-gray-900 mb-6">
        {formatEntryDate(entry.date)}
      </h1>
      <EntryContent entry={entry} />
    </div>
  );
}

function EntryContent({ entry }: { entry: JournalEntry }) {
  type Item =
    | { kind: 'message'; data: TextMessage }
    | { kind: 'voice'; data: VoiceMemo }
    | { kind: 'image'; data: JournalImage };

  const items: Item[] = [
    ...entry.messages.map((m: TextMessage): Item => ({ kind: 'message', data: m })),
    ...entry.voiceMemos.map((v: VoiceMemo): Item => ({ kind: 'voice', data: v })),
    ...entry.images.map((img: JournalImage): Item => ({ kind: 'image', data: img })),
  ].sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm italic">No content for this day.</p>;
  }

  return (
    <div className="space-y-2 stagger">
      {items.map((item) => {
        if (item.kind === 'message') return <MessageBubble key={item.data.id} msg={item.data} />;
        if (item.kind === 'voice') return <VoiceBubble key={item.data.id} memo={item.data} />;
        if (item.kind === 'image') return <ImageBubble key={item.data.id} image={item.data} />;
      })}
    </div>
  );
}

function MessageBubble({ msg }: { msg: TextMessage }) {
  const time = format(new Date(msg.timestamp), 'HH:mm');
  return (
    <div
      className={`flex ${msg.fromUser ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`}
    >
      <div
        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 transition-transform duration-150 hover:scale-[1.01] ${
          msg.fromUser
            ? 'bg-gray-900 text-white rounded-br-sm shadow-sm'
            : 'bg-gray-100 text-gray-700 rounded-bl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed">{msg.content}</p>
        <p className="text-xs mt-1 text-gray-400">{time}</p>
      </div>
    </div>
  );
}

function VoiceBubble({ memo }: { memo: VoiceMemo }) {
  const time = format(new Date(memo.timestamp), 'HH:mm');
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="max-w-xs md:max-w-md rounded-2xl rounded-br-sm bg-gray-50 border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors duration-150">
        <div className="flex items-center gap-2 mb-2">
          {/* Animated waveform */}
          <div className="flex items-end gap-0.5 h-4">
            <span className="wave-bar h-2" />
            <span className="wave-bar h-4" />
            <span className="wave-bar h-3" />
            <span className="wave-bar h-4" />
          </div>
          <span className="text-xs text-gray-400 font-medium">Voice memo</span>
          <span className="text-xs text-gray-300 ml-auto">{time}</span>
        </div>
        {memo.transcription ? (
          <p className="text-sm text-gray-700 leading-relaxed italic">"{memo.transcription}"</p>
        ) : (
          <p className="text-xs text-gray-400 italic">Transcription pending…</p>
        )}
      </div>
    </div>
  );
}

function ImageBubble({ image }: { image: JournalImage }) {
  const time = format(new Date(image.timestamp), 'HH:mm');
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="max-w-xs md:max-w-md rounded-2xl rounded-br-sm bg-gray-50 border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-150 hover:shadow-sm">
        {image.url ? (
          <img
            src={image.url}
            alt={image.caption ?? 'Journal image'}
            className="w-full transition-transform duration-300 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-base">📷</span>
            <span className="text-xs text-gray-400">Image</span>
          </div>
        )}
        <div className="px-4 py-2">
          {image.caption && <p className="text-xs text-gray-600">{image.caption}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  );
}
