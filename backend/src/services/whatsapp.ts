import axios from 'axios';
import { getWhatsappToken, getWhatsappPhoneNumberId } from './config';

const BASE_URL = 'https://graph.facebook.com/v19.0';

async function headers() {
  return { Authorization: `Bearer ${await getWhatsappToken()}` };
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = await getWhatsappPhoneNumberId();
  await axios.post(
    `${BASE_URL}/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
    { headers: await headers() }
  );
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const h = await headers();
  const { data } = await axios.get(`${BASE_URL}/${mediaId}`, { headers: h });
  const response = await axios.get(data.url, { headers: h, responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export function getDailyPrompt(): string {
  const prompts = [
    "Hey! How was your day? Tell me what happened, how you felt, or what's on your mind. You can send text, voice, or images 📝",
    "Good evening! What's one thing that stood out today? 🌟",
    "Time to journal! What did you experience today? Any wins, challenges, or moments worth remembering? ✍️",
    "Hi there! How are you feeling tonight? What made today memorable? 💭",
    "Journal time! Walk me through your day — big or small, everything counts 🗓️",
  ];
  return prompts[new Date().getDay() % prompts.length];
}
