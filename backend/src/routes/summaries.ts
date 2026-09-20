import { Router, Request, Response } from 'express';
import {
  getSummary,
  getAllSummaries,
  saveSummary,
  getEntriesInRange,
  getEntry,
} from '../services/firestore';
import { ensureDaySummary } from '../services/daySummary';
import { generateSummary } from '../services/groq';
import { geocodePlaces } from '../services/mapbox';
import { AISummary } from '../types';
import { berlinToday } from '../utils/date';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Generate + store the daily summary on the entry. Invoked by the Vercel cron
// each night; also callable manually with ?date=YYYY-MM-DD to (re)generate.
router.get('/daily', async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.sendStatus(401);
    return;
  }

  const date = (req.query.date as string) || berlinToday();
  if (!(await getEntry(date))) {
    res.status(404).json({ error: 'No entry for that date' });
    return;
  }

  const updated = await ensureDaySummary(date);
  if (!updated) {
    res.json({ ok: true, date, summary: null, note: 'No content to summarize' });
    return;
  }

  res.json({
    ok: true,
    date,
    title: updated.title,
    summary: updated.summary,
    locations: updated.locations ?? [],
  });
});

// Manual (re)generation triggered from the app UI for a specific date.
router.post('/daily/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!(await getEntry(date))) {
    res.status(404).json({ error: 'No entry for that date' });
    return;
  }

  const updated = await ensureDaySummary(date);
  if (!updated) {
    res.status(422).json({ error: 'No content to summarize' });
    return;
  }

  res.json(updated);
});

router.get('/', async (_req: Request, res: Response) => {
  const summaries = await getAllSummaries();
  res.json(summaries);
});

router.get('/:period/:year/:index', async (req: Request, res: Response) => {
  const { period, year, index } = req.params;
  if (period !== 'week' && period !== 'month') {
    res.status(400).json({ error: 'period must be week or month' });
    return;
  }
  const summary = await getSummary(period as 'week' | 'month', parseInt(year), parseInt(index));
  if (!summary) {
    res.status(404).json({ error: 'Summary not found' });
    return;
  }
  res.json(summary);
});

// Generate (or regenerate) a summary for a given period
router.post('/generate', async (req: Request, res: Response) => {
  const { period, year, index } = req.body;
  if (!period || !year || index === undefined) {
    res.status(400).json({ error: 'period, year, index required' });
    return;
  }

  const { from, to } = getPeriodRange(period, year, index);
  const entries = await getEntriesInRange(from, to);

  if (entries.length === 0) {
    res.status(404).json({ error: 'No entries found for this period' });
    return;
  }

  const summaryText = await generateSummary(entries, period);
  const imageUrls = entries.flatMap((e) => e.images.map((i) => i.url).filter(Boolean) as string[]);

  const summary: AISummary = {
    id: uuidv4(),
    period,
    year,
    periodIndex: index,
    summary: summaryText,
    imageUrls,
    entryDates: entries.map((e) => e.date),
    generatedAt: new Date().toISOString(),
  };

  await saveSummary(summary);
  res.json(summary);
});

function getPeriodRange(
  period: 'week' | 'month',
  year: number,
  index: number
): { from: string; to: string } {
  if (period === 'month') {
    const from = `${year}-${String(index).padStart(2, '0')}-01`;
    const lastDay = new Date(year, index, 0).getDate();
    const to = `${year}-${String(index).padStart(2, '0')}-${lastDay}`;
    return { from, to };
  } else {
    // ISO week: find Mon-Sun of week `index`
    const jan4 = new Date(year, 0, 4);
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (index - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      from: weekStart.toISOString().split('T')[0],
      to: weekEnd.toISOString().split('T')[0],
    };
  }
}

export default router;
