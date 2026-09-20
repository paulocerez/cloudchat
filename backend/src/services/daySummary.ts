import { getEntry, updateEntrySummary } from './firestore';
import { generateDaySummary } from './groq';
import { geocodePlaces } from './mapbox';
import { JournalEntry } from '../types';

// Generate + store the day's title, summary and locations. Shared by the nightly
// cron, the manual "Generate summary" tap, and the Pocket webhook.
//
// Returns null when there is nothing to do: no entry for that date, nothing worth
// summarizing, or — with skipIfPresent — a summary the day already has.
export async function ensureDaySummary(
  date: string,
  opts: { skipIfPresent?: boolean } = {}
): Promise<JournalEntry | null> {
  const entry = await getEntry(date);
  if (!entry) return null;

  // Checked before the Groq call, so an automatic trigger on a day that already
  // reads well costs nothing and never overwrites a hand-edited summary.
  if (opts.skipIfPresent && (entry.title || entry.summary)) return null;

  const { title, summary, locations } = await generateDaySummary(entry);
  if (!summary && !title) return null;

  const geocoded = locations.length > 0 ? await geocodePlaces(locations) : [];
  return updateEntrySummary(date, { title, summary, locations: geocoded });
}
