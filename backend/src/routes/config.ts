import { Router, Request, Response } from 'express';
import admin from 'firebase-admin';
import { getConfig, updateConfig } from '../services/config';

const router = Router();

// GET — return config, masking sensitive token values
router.get('/', async (_req: Request, res: Response) => {
  const cfg = await getConfig();
  res.json({
    whatsappToken: cfg.whatsappToken ? '••••••••' : '',
    whatsappPhoneNumberId: cfg.whatsappPhoneNumberId ?? '',
    whatsappVerifyToken: cfg.whatsappVerifyToken ? '••••••••' : '',
    userPhoneNumber: cfg.userPhoneNumber ?? '',
    cronSchedule: cfg.cronSchedule ?? '',
    timezone: cfg.timezone ?? '',
    // tell the frontend which fields are currently set (via env or Firestore)
    _sources: {
      whatsappToken: cfg.whatsappToken ? 'db' : process.env.WHATSAPP_TOKEN ? 'env' : 'unset',
      whatsappPhoneNumberId: cfg.whatsappPhoneNumberId ? 'db' : process.env.WHATSAPP_PHONE_NUMBER_ID ? 'env' : 'unset',
      whatsappVerifyToken: cfg.whatsappVerifyToken ? 'db' : process.env.WHATSAPP_VERIFY_TOKEN ? 'env' : 'unset',
      userPhoneNumber: cfg.userPhoneNumber ? 'db' : process.env.USER_PHONE_NUMBER ? 'env' : 'unset',
      cronSchedule: cfg.cronSchedule ? 'db' : process.env.CRON_SCHEDULE ? 'env' : 'unset',
      timezone: cfg.timezone ? 'db' : process.env.TZ ? 'env' : 'unset',
    },
  });
});

// PUT — save overrides to Firestore
router.put('/', async (req: Request, res: Response) => {
  const cfg = await updateConfig(req.body);
  res.json({ ok: true, saved: Object.keys(req.body).length });
});

// DELETE a single key — removes the Firestore override so env var takes over again
router.delete('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { getDb } = await import('../services/firestore');
  await getDb().doc('config/main').update({
    [key]: admin.firestore.FieldValue.delete(),
  });
  res.json({ ok: true, cleared: key });
});

export default router;
