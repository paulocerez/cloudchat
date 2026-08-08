import Groq from 'groq-sdk';
import { JournalEntry } from '../types';

let client: Groq;

export function initGroq() {
  client = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function generateDaySummary(entry: JournalEntry): Promise<string> {
  const texts = entry.messages
    .filter((m) => m.fromUser)
    .map((m) => m.content)
    .join('\n');
  const transcripts = entry.voiceMemos
    .filter((v) => v.transcription)
    .map((v) => v.transcription)
    .join('\n');
  const content = `${texts}\n${transcripts}`.trim();

  if (!content) return '';

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          "You are a personal journaling assistant. Summarize the user's journal for a single day in 2-3 warm, reflective sentences. Capture the mood, key events, and any notable feelings. Write in the same language the user wrote in. Do not add a title or preamble — just the reflection.",
      },
      {
        role: 'user',
        content: `Here is my journal for ${entry.date}:\n\n${content}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
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
