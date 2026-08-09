import { Router, Request, Response } from 'express';
import { getAllEntries, getEntry, getEntriesInRange, setEntryHighlight } from '../services/firestore';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const entries = await getAllEntries();
  res.json(entries);
});

router.get('/range', async (req: Request, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required' });
    return;
  }
  const entries = await getEntriesInRange(from as string, to as string);
  res.json(entries);
});

router.get('/:date', async (req: Request, res: Response) => {
  const entry = await getEntry(req.params.date);
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }
  res.json(entry);
});

router.put('/:date/highlight', async (req: Request, res: Response) => {
  const { highlight } = req.body;
  if (typeof highlight !== 'boolean') {
    res.status(400).json({ error: 'highlight (boolean) required' });
    return;
  }
  const entry = await setEntryHighlight(req.params.date, highlight);
  res.json(entry);
});

export default router;
