import type {
  JournalEntry,
  JournalImage,
  JournalVideo,
  TextMessage,
  VoiceMemo,
} from '@cloudchat/shared';
import { ImageBubble, MessageBubble, VideoBubble, VoiceBubble } from './Bubbles';
import { whatsappMemos } from './shared';
import { EmptyDay } from './EmptyDay';

type Item =
  | { kind: 'message'; data: TextMessage }
  | { kind: 'voice'; data: VoiceMemo }
  | { kind: 'image'; data: JournalImage }
  | { kind: 'video'; data: JournalVideo };

export function TimelineView({ entry }: { entry: JournalEntry }) {
  // Pocket recordings get their own block at the bottom of the page.
  const items: Item[] = [
    ...entry.messages.map((m: TextMessage): Item => ({ kind: 'message', data: m })),
    ...whatsappMemos(entry).map((v: VoiceMemo): Item => ({ kind: 'voice', data: v })),
    ...entry.images.map((img: JournalImage): Item => ({ kind: 'image', data: img })),
    ...(entry.videos ?? []).map((v: JournalVideo): Item => ({ kind: 'video', data: v })),
  ].sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));

  if (items.length === 0) return <EmptyDay />;

  return (
    <div className="space-y-2 stagger">
      {items.map((item) => {
        if (item.kind === 'message')
          return <MessageBubble key={item.data.id} msg={item.data} date={entry.date} />;
        if (item.kind === 'voice')
          return <VoiceBubble key={item.data.id} memo={item.data} date={entry.date} />;
        if (item.kind === 'image')
          return <ImageBubble key={item.data.id} image={item.data} date={entry.date} />;
        return <VideoBubble key={item.data.id} video={item.data} />;
      })}
    </div>
  );
}
