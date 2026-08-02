import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v19.0';

function headers() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  await axios.post(
    `${BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    { headers: headers() }
  );
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  // Get media URL
  const { data } = await axios.get(`${BASE_URL}/${mediaId}`, { headers: headers() });
  // Download the actual media
  const response = await axios.get(data.url, {
    headers: headers(),
    responseType: 'arraybuffer',
  });
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
