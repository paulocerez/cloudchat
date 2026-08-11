import { Router, Request, Response } from 'express';
import {
  getAllPeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
} from '../services/firestore';
import { PeriodColor } from '../types';

const router = Router();

const COLORS: PeriodColor[] = ['amber', 'blue', 'violet', 'green', 'rose'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validate(body: Record<string, unknown>, partial: boolean) {
  const { name, startDate, endDate, color, emoji } = body;
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'name (string) required';
  }
  if (!partial || startDate !== undefined) {
    if (typeof startDate !== 'string' || !DATE_RE.test(startDate))
      return 'startDate (YYYY-MM-DD) required';
  }
  if (!partial || endDate !== undefined) {
    if (typeof endDate !== 'string' || !DATE_RE.test(endDate))
      return 'endDate (YYYY-MM-DD) required';
  }
  if (
    typeof startDate === 'string' &&
    typeof endDate === 'string' &&
    startDate > endDate
  ) {
    return 'startDate must be on or before endDate';
  }
  if (!partial || color !== undefined) {
    if (typeof color !== 'string' || !COLORS.includes(color as PeriodColor))
      return `color must be one of ${COLORS.join(', ')}`;
  }
  if (emoji !== undefined && typeof emoji !== 'string') return 'emoji must be a string';
  return null;
}

router.get('/', async (_req: Request, res: Response) => {
  res.json(await getAllPeriods());
});

router.post('/', async (req: Request, res: Response) => {
  const error = validate(req.body, false);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { name, startDate, endDate, color, emoji } = req.body;
  const period = await createPeriod({
    name: name.trim(),
    startDate,
    endDate,
    color,
    emoji: typeof emoji === 'string' && emoji.trim() ? emoji.trim() : undefined,
  });
  res.status(201).json(period);
});

router.put('/:id', async (req: Request, res: Response) => {
  const error = validate(req.body, true);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { name, startDate, endDate, color, emoji } = req.body;
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name.trim();
  if (startDate !== undefined) patch.startDate = startDate;
  if (endDate !== undefined) patch.endDate = endDate;
  if (color !== undefined) patch.color = color;
  if (emoji !== undefined) patch.emoji = emoji.trim();
  const period = await updatePeriod(req.params.id, patch);
  if (!period) {
    res.status(404).json({ error: 'Period not found' });
    return;
  }
  res.json(period);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const ok = await deletePeriod(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Period not found' });
    return;
  }
  res.status(204).end();
});

export default router;
