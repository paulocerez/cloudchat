import axios from 'axios';

const ENDPOINT =
  'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true';

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY not configured');

  const { data } = await axios.post(ENDPOINT, audioBuffer, {
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/ogg',
    },
  });

  return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
}
