import axios from 'axios';
import FormData from 'form-data';
import { getUnipileApiKey, getUnipileDsn, getUnipileAccountId } from './config';

function normalizeNumber(n: string): string {
  return n.replace(/[^0-9]/g, '');
}

async function client() {
  const dsn = await getUnipileDsn();
  const apiKey = await getUnipileApiKey();
  if (!dsn || !apiKey) throw new Error('Unipile DSN or API key not configured');
  return { dsn, apiKey };
}

// Starts (or reuses) a 1-to-1 WhatsApp chat and sends a text message.
// Returns the id of the message we just sent, when Unipile provides it.
export async function sendTextMessage(to: string, text: string): Promise<string | undefined> {
  const { dsn, apiKey } = await client();
  const accountId = await getUnipileAccountId();

  const form = new FormData();
  form.append('account_id', accountId);
  form.append('text', text);
  form.append('attendees_ids', `${normalizeNumber(to)}@s.whatsapp.net`);

  const { data } = await axios.post(`${dsn}/api/v1/chats`, form, {
    headers: { ...form.getHeaders(), 'X-API-KEY': apiKey, accept: 'application/json' },
  });

  return data?.message_id ?? data?.id;
}

// Downloads a message attachment (voice memo / image) as raw bytes.
export async function downloadMedia(messageId: string, attachmentId: string): Promise<Buffer> {
  const { dsn, apiKey } = await client();
  const { data } = await axios.get(
    `${dsn}/api/v1/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { 'X-API-KEY': apiKey }, responseType: 'arraybuffer' }
  );
  return Buffer.from(data);
}

export const DAILY_PROMPTS = [
  "Hey! How was your day? Tell me what happened, how you felt, or what's on your mind. You can send text, voice, or images 📝",
  "Good evening! What's one thing that stood out today? 🌟",
  "Time to journal! What did you experience today? Any wins, challenges, or moments worth remembering? ✍️",
  "Hi there! How are you feeling tonight? What made today memorable? 💭",
  "Journal time! Walk me through your day — big or small, everything counts 🗓️",
] as const;

export function getDailyPrompt(): string {
  return DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length];
}

export function isDailyPrompt(text: string): boolean {
  const t = text.trim();
  return DAILY_PROMPTS.some((p) => p === t);
}
