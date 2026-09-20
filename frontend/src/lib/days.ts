import { eachDayOfInterval, format } from 'date-fns';
import type { JournalEntry } from '@cloudchat/shared';

// Every YYYY-MM-DD in the frontend is parsed at local midnight, so a day never
// slides into its neighbour the way `new Date('2026-04-03')` (UTC) would.
function parseDay(date: string): Date {
  return new Date(date + 'T00:00:00');
}

/**
 * A day that has no document behind it yet. The backend creates the real one on
 * the first write (every write route calls getOrCreateEntry), so this is purely
 * what the UI reads until then — and `id` matches the backend's (the date), so
 * React keys survive the day materialising.
 */
export function emptyEntry(date: string): JournalEntry {
  return {
    id: date,
    date,
    messages: [],
    voiceMemos: [],
    images: [],
    videos: [],
    createdAt: '',
    updatedAt: '',
  };
}

// True for stored-but-empty days too: a day with nothing in it should look the
// same whether or not a document happens to exist for it.
export function isEmptyDay(entry: JournalEntry): boolean {
  return (
    entry.messages.length === 0 &&
    entry.voiceMemos.length === 0 &&
    entry.images.length === 0 &&
    (entry.videos?.length ?? 0) === 0 &&
    (entry.locations?.length ?? 0) === 0 &&
    !entry.title &&
    !entry.summary
  );
}

/**
 * The archive reads as a calendar, not as a list of the days that happened to
 * produce something: one row per day from the oldest entry to today, gaps
 * filled in. Takes and returns newest-first, the order the API hands back.
 */
export function fillDays(entries: JournalEntry[]): JournalEntry[] {
  if (entries.length === 0) return [];

  const stored = new Map(entries.map((e) => [e.date, e]));
  const oldest = entries[entries.length - 1].date;
  // Max of the two, so an entry dated ahead of today is never dropped.
  const newest = entries[0].date > format(new Date(), 'yyyy-MM-dd')
    ? entries[0].date
    : format(new Date(), 'yyyy-MM-dd');

  return eachDayOfInterval({ start: parseDay(oldest), end: parseDay(newest) })
    .map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return stored.get(key) ?? emptyEntry(key);
    })
    .reverse();
}
