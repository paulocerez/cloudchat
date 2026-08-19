import Groq from 'groq-sdk';
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions';
import { JournalEntry } from '../types';

let client: Groq;

export function initGroq() {
  client = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// groq-sdk 0.5.0 predates the reasoning_effort field that gpt-oss models accept.
type ChatParams = ChatCompletionCreateParamsNonStreaming & {
  reasoning_effort?: 'low' | 'medium' | 'high';
};

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

  let raw = '{}';
  try {
    const completion = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      // gpt-oss is a reasoning model; without low effort it burns the token
      // budget on hidden reasoning and never emits valid JSON (json_validate_failed).
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content:
            'You are a personal journaling assistant. Summarize the user\'s journal for a single day. Respond with a JSON object with three keys: "title" — a specific, evocative headline of 2 to 5 words that names the standout moment, person, or place of the day (e.g. "Kino-Abend mit Anita" or "Cinema Night in Potsdam"), never a generic mood phrase like "Cooler Tag", "Great Day" or "Nice Time"; "summary" — a warm, reflective recap of 2 to 3 sentences that emphasizes the people involved (name them when mentioned), captures who the user was with, where they were, what they did together, and how they felt about it; and "locations" — an array of real-world place names explicitly mentioned (cities, neighborhoods, venues, landmarks, countries), each as a geocodable string like "Berlin" or "Golden Gate Bridge, San Francisco". Use an empty array if no places are mentioned. Write title and summary in the same language the user wrote in. Return only the JSON object, no preamble.',
        },
        {
          role: 'user',
          content: `Here is my journal for ${entry.date}:\n\n${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    } as ChatParams);
    raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  } catch (err) {
    console.error('generateDaySummary failed:', err);
    return { title: '', summary: '', locations: [] };
  }

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Answer a natural-language question grounded in the user's past journal.
// Entries are compacted to date + title + summary so a long history still fits.
export async function answerQuestion(
  question: string,
  entries: JournalEntry[],
  history: ChatMessage[] = []
): Promise<string> {
  const weekday = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

  const context = entries
    .filter((e) => e.summary || e.title)
    .map((e) => {
      const title = e.title ? ` — ${e.title}` : '';
      const places = e.locations?.length
        ? ` [places: ${e.locations.map((l) => l.name).join(', ')}]`
        : '';
      return `${weekday(e.date)} ${e.date}${title}: ${e.summary ?? ''}${places}`.trim();
    })
    .join('\n');

  if (!context) {
    return "There aren't any journal entries with summaries yet, so I don't have anything to look back on.";
  }

  const completion = await client.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    reasoning_effort: 'low',
    messages: [
      {
        role: 'system',
        content:
          "You are the user's personal journal assistant. Answer questions about their life strictly using the dated journal summaries provided below. Each entry is prefixed with its weekday and date. Cite the relevant day when answering (e.g. \"on Sunday, 2026-08-09\"). If the answer isn't in the entries, say you don't have a record of it rather than guessing. Be warm, concise, and specific about people and places. Reply in the same language as the question.\n\nJournal entries:\n" +
          context,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ],
    temperature: 0.4,
    max_tokens: 600,
  } as ChatParams);

  return completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not come up with an answer.';
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
    model: 'openai/gpt-oss-120b',
    reasoning_effort: 'low',
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
  } as ChatParams);

  return completion.choices[0]?.message?.content ?? 'Unable to generate summary.';
}
