import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initFirestore } from './services/firestore';
import { initGroq } from './services/groq';
import { startScheduler } from './services/scheduler';
import webhookRouter from './routes/webhook';
import entriesRouter from './routes/entries';
import summariesRouter from './routes/summaries';
import configRouter from './routes/config';
import mediaRouter from './routes/media';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
// Unipile mislabels webhook POSTs as application/x-www-form-urlencoded while
// sending JSON, so parse every content-type as JSON.
app.use(express.json({ type: () => true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/webhook', webhookRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/config', configRouter);
app.use('/api/media', mediaRouter);
app.use('/api/chat', chatRouter);

initFirestore();
initGroq();
startScheduler();

// Local dev only. On Vercel the exported app is invoked as a serverless
// handler — calling app.listen() there triggers legacy-proxy mode, which
// consumes the request body before express.json() can parse it.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
