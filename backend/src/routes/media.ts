import { Router, Request, Response } from 'express';
import { fetchMedia } from '../services/whatsapp';
import { getAudioUrl } from '../services/pocket';
import { findImageWithoutUrl, setImageUrl, uploadMedia } from '../services/firestore';

const router = Router();

// Every fetchMedia call makes the hosted WhatsApp session pull the original off
// the user's phone, which the phone announces as a device sync. One page can ask
// for the same attachment more than once, so in-flight requests share a fetch.
const inFlight = new Map<string, Promise<{ buffer: Buffer; contentType: string }>>();

function fetchMediaOnce(messageId: string, attachmentId: string) {
  const key = `${messageId}/${attachmentId}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const pending = fetchMedia(messageId, attachmentId).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

// Keeps our own copy of a legacy image so the next view reads Storage instead of
// reaching back through WhatsApp. Best-effort: serving the request comes first.
async function backfillImage(
  messageId: string,
  attachmentId: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const found = await findImageWithoutUrl(messageId, attachmentId);
  if (!found) return;
  const ext = (contentType.split('/')[1] ?? 'jpg').split(';')[0];
  const url = await uploadMedia(
    `images/${found.date}/${attachmentId}.${ext}`,
    buffer,
    contentType || 'image/jpeg'
  );
  await setImageUrl(found.date, found.imageId, url);
}

// Pocket audio lives behind a short-lived pre-signed S3 URL, so we mint one per
// request and redirect rather than storing a link that would go stale.
// Declared before the catch-all :messageId/:attachmentId route below.
router.get('/pocket/:recordingId', async (req: Request, res: Response) => {
  try {
    const url = await getAudioUrl(req.params.recordingId);
    if (!url) {
      res.sendStatus(404);
      return;
    }
    res.redirect(302, url);
  } catch (err) {
    console.error('Pocket audio proxy error:', err);
    res.sendStatus(502);
  }
});

// Streams a WhatsApp attachment through the backend so the frontend can
// display it — Unipile only exposes media behind the authenticated API.
router.get('/:messageId/:attachmentId', async (req: Request, res: Response) => {
  try {
    const { messageId, attachmentId } = req.params;
    const { buffer, contentType } = await fetchMediaOnce(messageId, attachmentId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);

    if (contentType.startsWith('image/')) {
      backfillImage(messageId, attachmentId, buffer, contentType).catch((err) =>
        console.error('Media backfill error:', err)
      );
    }
  } catch (err) {
    console.error('Media proxy error:', err);
    res.sendStatus(502);
  }
});

export default router;
