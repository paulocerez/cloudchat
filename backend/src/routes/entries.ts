import { Router, Request, Response } from 'express';
import {
  getAllEntries,
  getEntry,
  getEntriesInRange,
  setEntryHighlight,
  updateVoiceMemoTranscription,
  addEntryLocation,
  removeEntryLocation,
} from '../services/firestore';
import { geocodePlaces } from '../services/mapbox';

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

router.put('/:date/voice/:memoId', async (req: Request, res: Response) => {
  const { transcription } = req.body;
  if (typeof transcription !== 'string') {
    res.status(400).json({ error: 'transcription (string) required' });
    return;
  }
  const entry = await updateVoiceMemoTranscription(
    req.params.date,
    req.params.memoId,
    transcription
  );
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }
  res.json(entry);
});

// Manually add a location by place name; geocoded server-side.
router.post('/:date/locations', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name (string) required' });
    return;
  }
  const [geocoded] = await geocodePlaces([name.trim()]);
  if (!geocoded) {
    res.status(422).json({ error: `Could not geocode "${name.trim()}"` });
    return;
  }
  const entry = await addEntryLocation(req.params.date, geocoded);
  res.json(entry);
});

router.delete('/:date/locations/:name', async (req: Request, res: Response) => {
  const entry = await removeEntryLocation(req.params.date, req.params.name);
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' });
    return;
  }
  res.json(entry);
});

export default router;
