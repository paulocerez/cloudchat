import cron from 'node-cron';
import { sendTextMessage, getDailyPrompt } from './whatsapp';
import { getOrCreateEntry, addTextMessage, recordSentMessageId } from './firestore';
import { getCronSchedule, getUserPhoneNumber } from './config';
import { TextMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function startScheduler() {
  const schedule = await getCronSchedule();
  const timezone = 'Europe/Berlin';

  cron.schedule(
    schedule,
    async () => {
      try {
        const userPhone = await getUserPhoneNumber();
        if (!userPhone) {
          console.error('USER_PHONE_NUMBER not configured');
          return;
        }

        const date = new Date().toISOString().split('T')[0];
        await getOrCreateEntry(date);

        const prompt = getDailyPrompt();
        const sentId = await sendTextMessage(userPhone, prompt);
        if (sentId) await recordSentMessageId(sentId);

        const systemMsg: TextMessage = {
          id: uuidv4(),
          content: prompt,
          timestamp: new Date().toISOString(),
          fromUser: false,
        };
        await addTextMessage(date, systemMsg);

        console.log(`Daily prompt sent for ${date}`);
      } catch (err) {
        console.error('Failed to send daily prompt:', err);
      }
    },
    { timezone }
  );

  console.log(`Scheduler started: "${schedule}" (${timezone})`);
}
