import cron from 'node-cron';
import { sendTextMessage, getDailyPrompt } from './whatsapp';
import { getOrCreateEntry } from './firestore';
import { TextMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function startScheduler() {
  // Send daily prompt at 8 PM in the configured timezone
  // CRON_SCHEDULE env var overrides the default (e.g. "0 20 * * *")
  const schedule = process.env.CRON_SCHEDULE ?? '0 20 * * *';
  const timezone = process.env.TZ ?? 'UTC';

  cron.schedule(
    schedule,
    async () => {
      try {
        const userPhone = process.env.USER_PHONE_NUMBER;
        if (!userPhone) {
          console.error('USER_PHONE_NUMBER not configured');
          return;
        }

        const date = new Date().toISOString().split('T')[0];
        await getOrCreateEntry(date);

        const prompt = getDailyPrompt();
        await sendTextMessage(userPhone, prompt);

        const systemMsg: TextMessage = {
          id: uuidv4(),
          content: prompt,
          timestamp: new Date().toISOString(),
          fromUser: false,
        };

        const { addTextMessage } = await import('./firestore');
        await addTextMessage(date, systemMsg);

        console.log(`Daily prompt sent for ${date}`);
      } catch (err) {
        console.error('Failed to send daily prompt:', err);
      }
    },
    { timezone }
  );

  console.log(`Scheduler started: daily prompt at schedule "${schedule}" (${timezone})`);
}
