import { getDb } from './firestore';

export interface AppConfig {
  whatsappToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappVerifyToken?: string;
  userPhoneNumber?: string;
  cronSchedule?: string;
  timezone?: string;
}

const DOC = 'config/main';

// In-memory cache, refreshed on each read so changes take effect quickly
let cache: AppConfig | null = null;
let cacheAt = 0;
const TTL_MS = 30_000; // 30 seconds

export async function getConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  try {
    const snap = await getDb().doc(DOC).get();
    cache = snap.exists ? (snap.data() as AppConfig) : {};
  } catch {
    cache = {};
  }
  cacheAt = Date.now();
  return cache;
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  // Strip out empty strings so they don't override env vars
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== '' && v !== undefined)
  );
  await getDb().doc(DOC).set(clean, { merge: true });
  cache = null; // bust cache
  return getConfig();
}

// Helpers — each falls back to the env var if Firestore value is absent
export async function getWhatsappToken(): Promise<string> {
  const cfg = await getConfig();
  return cfg.whatsappToken ?? process.env.WHATSAPP_TOKEN ?? '';
}

export async function getWhatsappPhoneNumberId(): Promise<string> {
  const cfg = await getConfig();
  return cfg.whatsappPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
}

export async function getWhatsappVerifyToken(): Promise<string> {
  const cfg = await getConfig();
  return cfg.whatsappVerifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN ?? '';
}

export async function getUserPhoneNumber(): Promise<string> {
  const cfg = await getConfig();
  return cfg.userPhoneNumber ?? process.env.USER_PHONE_NUMBER ?? '';
}

export async function getCronSchedule(): Promise<string> {
  const cfg = await getConfig();
  return cfg.cronSchedule ?? process.env.CRON_SCHEDULE ?? '0 20 * * *';
}

export async function getTimezone(): Promise<string> {
  const cfg = await getConfig();
  return cfg.timezone ?? process.env.TZ ?? 'UTC';
}
