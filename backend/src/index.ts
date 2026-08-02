import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initFirestore } from './services/firestore';
import { initGroq } from './services/groq';
import { startScheduler } from './services/scheduler';
import webhookRouter from './routes/webhook';
import entriesRouter from './routes/entries';
import summariesRouter from './routes/summaries';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/webhook', webhookRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/summaries', summariesRouter);

async function bootstrap() {
  initFirestore();
  initGroq();
  startScheduler();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
