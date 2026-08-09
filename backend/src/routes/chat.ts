import { Router, Request, Response } from 'express';
import { getAllEntries } from '../services/firestore';
import { answerQuestion, ChatMessage } from '../services/groq';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { question, history } = req.body as {
    question?: string;
    history?: ChatMessage[];
  };
  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: 'question (string) required' });
    return;
  }

  const entries = await getAllEntries();
  const answer = await answerQuestion(
    question.trim(),
    entries,
    Array.isArray(history) ? history.slice(-10) : []
  );
  res.json({ answer });
});

export default router;
