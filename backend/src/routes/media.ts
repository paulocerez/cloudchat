import { Router, Request, Response } from 'express';
import { fetchMedia } from '../services/whatsapp';
import { getAudioUrl } from '../services/pocket';

const router = Router();

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
    const { buffer, contentType } = await fetchMedia(messageId, attachmentId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (err) {
    console.error('Media proxy error:', err);
    res.sendStatus(502);
  }
});

export default router;
