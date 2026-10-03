import { Router, Request, Response } from 'express';
import { processDueForwards } from '../services/quotesForward';

// Mounted at /api/quotes.
const router = Router();

// Sends article forwards whose retry is due. The Pocket webhook and the nightly
// cron already do this; this is for kicking it by hand.
router.post('/retry', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.sendStatus(401);
    return;
  }

  try {
    res.json({ ok: true, ...(await processDueForwards()) });
  } catch (err) {
    console.error('Quotes retry error:', err);
    res.status(500).json({ error: 'Quotes retry failed' });
  }
});

export default router;
