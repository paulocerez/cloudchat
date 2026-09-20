import { Router, Request, Response } from 'express';
import { searchPlaces } from '../services/mapbox';

const router = Router();

// Minimum characters before we spend a Mapbox call: one or two letters match
// half the world and tell the user nothing.
const MIN_QUERY = 2;

// Autocomplete for the place picker. The Mapbox token stays server-side; the
// frontend's VITE_MAPBOX_TOKEN is only for static map images.
router.get('/search', async (req: Request, res: Response) => {
  if (!process.env.MAPBOX_TOKEN) {
    res.status(503).json({ error: 'Mapbox is not configured' });
    return;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < MIN_QUERY) {
    res.json({ results: [] });
    return;
  }

  res.json({ results: await searchPlaces(q) });
});

export default router;
