import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getOrCreateEntry,
  addTextMessage,
  addVoiceMemo,
  addImage,
  addVideo,
  updateVoiceMemoTranscription,
  isSentMessageId,
  uploadMedia,
} from '../services/firestore';
import { fetchMedia, isDailyPrompt } from '../services/whatsapp';
import { transcribeAudio } from '../services/deepgram';
import { TextMessage, VoiceMemo, JournalImage, JournalVideo, UnipileMessageWebhook, UnipileAttachment } from '../types';

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
  return a.attachment_type === 'audio' || (a.mimetype?.startsWith('audio/') ?? false);
}

function isImage(a: UnipileAttachment): boolean {
  return (
    a.attachment_type === 'img' ||
    a.attachment_type === 'image' ||
    (a.mimetype?.startsWith('image/') ?? false)
  );
}

function isVideo(a: UnipileAttachment): boolean {
  return a.attachment_type === 'video' || (a.mimetype?.startsWith('video/') ?? false);
}

// Process before responding: on Vercel the function can be frozen once the
// response is sent, so async Firestore writes after res.send() may never run.
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as UnipileMessageWebhook;

    if (body?.event !== 'message_received') return;
    if (!isSelfChat(body)) return;
    // Skip call notifications and other Unipile system events, which arrive as
    // message_received with the notification text sitting in body.message.
    if (body.is_event) return;
    // Skip our own daily prompt echoed back by Unipile.
    if (await isSentMessageId(body.message_id)) return;

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
        // Download once; reuse the bytes for both storage and transcription.
        const { buffer, contentType } = await fetchMedia(body.message_id, att.attachment_id);
        const audioUrl = await uploadMedia(
          `audio/${date}/${att.attachment_id}.ogg`,
          buffer,
          contentType || 'audio/ogg'
        );
        const memo: VoiceMemo = {
          id: uuidv4(),
          messageId: body.message_id,
          mediaId: att.attachment_id,
          audioUrl,
          timestamp,
        };
        await addVoiceMemo(date, memo);
        try {
          const text = await transcribeAudio(buffer, att.mimetype ?? contentType ?? 'audio/ogg');
          await updateVoiceMemoTranscription(date, memo.id, text);
        } catch (err) {
          console.error('Transcription error:', err);
        }
      } else if (isImage(att)) {
        const { buffer, contentType } = await fetchMedia(body.message_id, att.attachment_id);
        const ext = (contentType?.split('/')[1] ?? 'jpg').split(';')[0];
        const url = await uploadMedia(
          `images/${date}/${att.attachment_id}.${ext}`,
          buffer,
          contentType || 'image/jpeg'
        );
        const image: JournalImage = {
          id: uuidv4(),
          messageId: body.message_id,
          mediaId: att.attachment_id,
          url,
          timestamp,
        };
        await addImage(date, image);
      } else if (isVideo(att)) {
        const { buffer, contentType } = await fetchMedia(body.message_id, att.attachment_id);
        const ext = (contentType?.split('/')[1] ?? 'mp4').split(';')[0];
        const path = `videos/${date}/${att.attachment_id}.${ext}`;
        const url = await uploadMedia(path, buffer, contentType || 'video/mp4');
        const video: JournalVideo = {
          id: uuidv4(),
          path,
          url,
          contentType: contentType || 'video/mp4',
          size: att.attachment_size ?? buffer.length,
          timestamp,
        };
        await addVideo(date, video);
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.sendStatus(200);
});

export default router;
