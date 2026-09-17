import type { JournalEntry, VoiceMemo } from '@cloudchat/shared';

// ── Pocket AI ───────────────────────────────────────────────
// Recordings from the Pocket device land in voiceMemos with source: 'pocket'.
// They carry their own title, summary and action items, so they're shown in a
// dedicated block at the foot of the page rather than mixed into the timeline.
export function isPocket(memo: VoiceMemo): boolean {
  return memo.source === 'pocket';
}

export function whatsappMemos(entry: JournalEntry): VoiceMemo[] {
  return entry.voiceMemos.filter((m) => !isPocket(m));
}

export function pocketMemos(entry: JournalEntry): VoiceMemo[] {
  return entry.voiceMemos
    .filter(isPocket)
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Recordings run to the hour, so show h:mm rather than a bare minute count.
export function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return m > 0 ? `${m} min` : '<1 min';
}

export function mediaUrl(path: string): string {
  return `${import.meta.env.VITE_API_URL ?? ''}${path}`;
}

// Section anchors, so a count pill in the header can jump to its block.
export type EntrySection = 'messages' | 'images' | 'videos' | 'memos' | 'songs' | 'pocket';

export function sectionId(section: EntrySection): string {
  return `entry-${section}`;
}
