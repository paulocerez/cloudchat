import Groq from 'groq-sdk';
import { JournalEntry } from '../types';

let client: Groq;

export function initGroq() {
  client = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export interface DaySummary {
  title: string; // a few words
  summary: string; // one sentence
  locations: string[]; // place names mentioned (cities, venues, countries)
}

export async function generateDaySummary(entry: JournalEntry): Promise<DaySummary> {
  const texts = entry.messages
    .filter((m) => m.fromUser)
    .map((m) => m.content)
    .join('\n');
  const transcripts = entry.voiceMemos
    .filter((v) => v.transcription)
    .map((v) => v.transcription)
    .join('\n');
  const content = `${texts}\n${transcripts}`.trim();

  if (!content) return { title: '', summary: '', locations: [] };

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are a personal journaling assistant. Summarize the user\'s journal for a single day. Respond with a JSON object with three keys: "title" — a short headline of 2 to 5 words capturing the essence of the day; "summary" — a single warm, reflective sentence capturing the mood and key events; and "locations" — an array of real-world place names explicitly mentioned (cities, neighborhoods, venues, landmarks, countries), each as a geocodable string like "Berlin" or "Golden Gate Bridge, San Francisco". Use an empty array if no places are mentioned. Write title and summary in the same language the user wrote in. Return only the JSON object, no preamble.',
      },
      {
        role: 'user',
        content: `Here is my journal for ${entry.date}:\n\n${content}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  try {
    const parsed = JSON.parse(raw) as Partial<DaySummary>;
    const locations = Array.isArray(parsed.locations)
      ? parsed.locations.map((l) => String(l).trim()).filter(Boolean)
      : [];
    return {
      title: (parsed.title ?? '').trim(),
      summary: (parsed.summary ?? '').trim(),
      locations,
    };
  } catch {
    return { title: '', summary: raw, locations: [] };
  }
}

export async function generateSummary(
  entries: JournalEntry[],
  period: 'week' | 'month'
): Promise<string> {
  const label = period === 'week' ? 'week' : 'month';
  const content = entries
    .map((e) => {
      const texts = e.messages
        .filter((m) => m.fromUser)
        .map((m) => m.content)
        .join('\n');
      const transcripts = e.voiceMemos
        .filter((v) => v.transcription)
        .map((v) => v.transcription)
        .join('\n');
      return `## ${e.date}\n${texts}\n${transcripts}`.trim();
    })
    .filter(Boolean)
    .join('\n\n');

  if (!content) return 'No entries found for this period.';

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a personal journaling assistant. Summarize the user's journal entries for the ${label} in a warm, reflective, and insightful way. Highlight themes, emotions, key events, and personal growth. Keep it to 3-5 paragraphs.`,
      },
      {
        role: 'user',
        content: `Here are my journal entries for this ${label}:\n\n${content}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content ?? 'Unable to generate summary.';
}
