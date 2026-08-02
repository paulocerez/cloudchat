import { Router, Request, Response } from 'express';
import {
  getSummary,
  getAllSummaries,
  saveSummary,
  getEntriesInRange,
} from '../services/firestore';
import { generateSummary } from '../services/groq';
import { AISummary } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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
