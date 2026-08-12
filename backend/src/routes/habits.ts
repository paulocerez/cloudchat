import { Router, Request, Response } from 'express';
import {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from '../services/firestore';
import { PeriodColor } from '../types';

const router = Router();

const COLORS: PeriodColor[] = ['amber', 'blue', 'violet', 'green', 'rose'];

function validate(body: Record<string, unknown>, partial: boolean) {
  const { name, color, weeklyTarget, emoji } = body;
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'name (string) required';
  }
  if (!partial || color !== undefined) {
    if (typeof color !== 'string' || !COLORS.includes(color as PeriodColor))
      return `color must be one of ${COLORS.join(', ')}`;
  }
  if (!partial || weeklyTarget !== undefined) {
    if (
      typeof weeklyTarget !== 'number' ||
      !Number.isInteger(weeklyTarget) ||
      weeklyTarget < 1 ||
      weeklyTarget > 7
    )
      return 'weeklyTarget must be an integer between 1 and 7';
  }
  if (emoji !== undefined && typeof emoji !== 'string') return 'emoji must be a string';
  return null;
}

router.get('/', async (_req: Request, res: Response) => {
  res.json(await getAllHabits());
});

router.post('/', async (req: Request, res: Response) => {
  const error = validate(req.body, false);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { name, color, weeklyTarget, emoji } = req.body;
  const habit = await createHabit({
    name: name.trim(),
    color,
    weeklyTarget,
    emoji: typeof emoji === 'string' && emoji.trim() ? emoji.trim() : undefined,
  });
  res.status(201).json(habit);
});

router.put('/:id', async (req: Request, res: Response) => {
  const error = validate(req.body, true);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { name, color, weeklyTarget, emoji } = req.body;
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name.trim();
  if (color !== undefined) patch.color = color;
  if (weeklyTarget !== undefined) patch.weeklyTarget = weeklyTarget;
  if (emoji !== undefined) patch.emoji = emoji.trim();
  const habit = await updateHabit(req.params.id, patch);
  if (!habit) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }
  res.json(habit);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const ok = await deleteHabit(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }
  res.status(204).end();
});

export default router;
