import { Router, Request, Response } from 'express';
import { fetchMedia } from '../services/whatsapp';

const router = Router();

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
