import type {
  JournalEntry,
  JournalImage,
  JournalVideo,
  TextMessage,
  VoiceMemo,
} from '@cloudchat/shared';
import { ImageBubble, MessageBubble, VideoBubble, VoiceBubble } from './Bubbles';
import { PocketList } from './Pocket';
import { pocketMemos, sectionId, whatsappMemos } from './shared';
import { EmptyDay } from './EmptyDay';

type Item =
  | { kind: 'message'; data: TextMessage }
  | { kind: 'voice'; data: VoiceMemo }
  | { kind: 'pocket'; data: VoiceMemo }
  | { kind: 'image'; data: JournalImage }
  | { kind: 'video'; data: JournalVideo };

export function TimelineView({ entry }: { entry: JournalEntry }) {
  const items: Item[] = [
    ...entry.messages.map((m: TextMessage): Item => ({ kind: 'message', data: m })),
    ...whatsappMemos(entry).map((v: VoiceMemo): Item => ({ kind: 'voice', data: v })),
    ...pocketMemos(entry).map((v: VoiceMemo): Item => ({ kind: 'pocket', data: v })),
    ...entry.images.map((img: JournalImage): Item => ({ kind: 'image', data: img })),
    ...(entry.videos ?? []).map((v: JournalVideo): Item => ({ kind: 'video', data: v })),
  ].sort((a, b) => a.data.timestamp.localeCompare(b.data.timestamp));

  if (items.length === 0) return <EmptyDay />;

  // Back-to-back recordings render as one hairline-separated list rather than a
  // stack of boxes — at a recording an hour, that would swamp the day.
  type Row = Exclude<Item, { kind: 'pocket' }> | { kind: 'pocketRun'; memos: VoiceMemo[] };
  const runs: Row[] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (item.kind === 'pocket') {
      if (last?.kind === 'pocketRun') last.memos.push(item.data);
      else runs.push({ kind: 'pocketRun', memos: [item.data] });
    } else {
      runs.push(item);
    }
  }

  // The DayStats recordings chip scrolls here.
  let anchored = false;

  return (
    <div className="space-y-2 stagger">
      {runs.map((item) => {
        if (item.kind === 'pocketRun') {
          const id = anchored ? undefined : sectionId('pocket');
          anchored = true;
          return (
            <PocketList key={item.memos[0].id} memos={item.memos} date={entry.date} id={id} />
          );
        }
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
