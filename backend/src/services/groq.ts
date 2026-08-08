import Groq from 'groq-sdk';
import { JournalEntry } from '../types';

let client: Groq;

export function initGroq() {
  client = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'mp3';
  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
  });
  return transcription.text;
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
