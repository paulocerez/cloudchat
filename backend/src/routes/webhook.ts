import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getOrCreateEntry,
  addTextMessage,
  addVoiceMemo,
  addImage,
  updateVoiceMemoTranscription,
  isSentMessageId,
} from '../services/firestore';
import { downloadMedia, isDailyPrompt } from '../services/whatsapp';
import { transcribeAudio } from '../services/groq';
import { TextMessage, VoiceMemo, JournalImage, UnipileMessageWebhook, UnipileAttachment } from '../types';

const router = Router();

// Unipile has no verification handshake — respond OK to any GET health check.
router.get('/', (_req: Request, res: Response) => res.sendStatus(200));

function digits(n?: string | null): string {
  return (n ?? '').replace(/[^0-9]/g, '');
}

// Only capture messages the user writes to themselves (self-chat journaling):
// a non-group chat where every attendee is the connected account's own number.
function isSelfChat(body: UnipileMessageWebhook): boolean {
  if (body.is_group) return false;
  const me = digits(body.account_info?.phone_number);
  if (!me) return false;
  const attendees = body.attendees ?? [];
  if (attendees.length === 0) return false;
  return attendees.every(
    (a) => digits(a.attendee_specifics?.phone_number ?? a.attendee_public_identifier) === me
  );
}

function isAudio(a: UnipileAttachment): boolean {
  return a.type === 'audio' || (a.mimetype?.startsWith('audio/') ?? false);
}

function isImage(a: UnipileAttachment): boolean {
  return a.type === 'img' || a.type === 'image' || (a.mimetype?.startsWith('image/') ?? false);
}

router.post('/', async (req: Request, res: Response) => {
  // Acknowledge immediately.
  res.sendStatus(200);

  try {
    const body = req.body as UnipileMessageWebhook;

    console.log('[webhook] content-type:', req.headers['content-type']);
    console.log('[webhook] raw:', (req as unknown as { rawBody?: string }).rawBody);
    console.log('[webhook] incoming:', JSON.stringify(req.body));

    if (body?.event !== 'message_received') {
      console.log('[webhook] skip: event is', body?.event);
      return;
    }
    if (!isSelfChat(body)) {
      console.log('[webhook] skip: not self-chat', {
        me: body.account_info?.phone_number,
        isGroup: body.is_group,
        attendees: (body.attendees ?? []).map(
          (a) => a.attendee_specifics?.phone_number ?? a.attendee_public_identifier
        ),
      });
      return;
    }
    // Skip our own daily prompt echoed back by Unipile.
    if (await isSentMessageId(body.message_id)) {
      console.log('[webhook] skip: sent-id dedupe', body.message_id);
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const timestamp = body.timestamp ?? new Date().toISOString();
    await getOrCreateEntry(date);

    const text = body.message?.trim();
    if (text && !isDailyPrompt(text)) {
      const textMsg: TextMessage = {
        id: uuidv4(),
        content: text,
        timestamp,
        fromUser: true,
      };
      await addTextMessage(date, textMsg);
    }

    for (const att of body.attachments ?? []) {
      if (att.unavailable) continue;

      if (isAudio(att)) {
        const memo: VoiceMemo = {
          id: uuidv4(),
          messageId: body.message_id,
          mediaId: att.id,
          timestamp,
        };
        await addVoiceMemo(date, memo);
        transcribeMedia(date, memo.id, body.message_id, att.id, att.mimetype).catch(console.error);
      } else if (isImage(att)) {
        const image: JournalImage = {
          id: uuidv4(),
          messageId: body.message_id,
          mediaId: att.id,
          timestamp,
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
  messageId: string,
  attachmentId: string,
  mimeType?: string
): Promise<void> {
  const buffer = await downloadMedia(messageId, attachmentId);
  const transcription = await transcribeAudio(buffer, mimeType ?? 'audio/ogg');
  await updateVoiceMemoTranscription(date, memoId, transcription);
}

export default router;
