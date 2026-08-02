import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getOrCreateEntry,
  addTextMessage,
  addVoiceMemo,
  addImage,
  updateVoiceMemoTranscription,
} from '../services/firestore';
import { downloadMedia } from '../services/whatsapp';
import { transcribeAudio } from '../services/groq';
import { TextMessage, VoiceMemo, JournalImage, WhatsAppMessage } from '../types';

const router = Router();

// WhatsApp webhook verification
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive WhatsApp messages
router.post('/', async (req: Request, res: Response) => {
  // Respond immediately to acknowledge receipt
  res.sendStatus(200);

  try {
    const body = req.body;
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages: WhatsAppMessage[] = value?.messages ?? [];

    for (const msg of messages) {
      const date = new Date().toISOString().split('T')[0];
      await getOrCreateEntry(date);

      if (msg.type === 'text' && msg.text) {
        const textMsg: TextMessage = {
          id: uuidv4(),
          content: msg.text.body,
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          fromUser: true,
        };
        await addTextMessage(date, textMsg);
      } else if (msg.type === 'audio' && msg.audio) {
        const memo: VoiceMemo = {
          id: uuidv4(),
          mediaId: msg.audio.id,
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
        };
        await addVoiceMemo(date, memo);

        // Transcribe asynchronously
        transcribeMedia(date, memo.id, msg.audio.id, msg.audio.mime_type).catch(console.error);
      } else if (msg.type === 'image' && msg.image) {
        const image: JournalImage = {
          id: uuidv4(),
          mediaId: msg.image.id,
          caption: msg.image.caption,
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
        };
        await addImage(date, image);
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

async function transcribeMedia(
  date: string,
  memoId: string,
  mediaId: string,
  mimeType: string
): Promise<void> {
  const buffer = await downloadMedia(mediaId);
  const transcription = await transcribeAudio(buffer, mimeType);
  await updateVoiceMemoTranscription(date, memoId, transcription);
}

export default router;
