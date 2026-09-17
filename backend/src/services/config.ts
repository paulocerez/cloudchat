import { getDb } from './firestore';

export interface AppConfig {
  unipileApiKey?: string;
  unipileDsn?: string;
  unipileAccountId?: string;
  userPhoneNumber?: string;
  cronSchedule?: string;
  pocketApiKey?: string;
  pocketWebhookSecret?: string;
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
export async function getUnipileApiKey(): Promise<string> {
  const cfg = await getConfig();
  return cfg.unipileApiKey ?? process.env.UNIPILE_API_KEY ?? '';
}

// Base URL of your Unipile instance, e.g. https://api8.unipile.com:13445 (no trailing slash)
export async function getUnipileDsn(): Promise<string> {
  const cfg = await getConfig();
  const dsn = cfg.unipileDsn ?? process.env.UNIPILE_DSN ?? '';
  return dsn.replace(/\/+$/, '');
}

export async function getUnipileAccountId(): Promise<string> {
  const cfg = await getConfig();
  return cfg.unipileAccountId ?? process.env.UNIPILE_ACCOUNT_ID ?? '';
}

export async function getUserPhoneNumber(): Promise<string> {
  const cfg = await getConfig();
  return cfg.userPhoneNumber ?? process.env.USER_PHONE_NUMBER ?? '';
}

export async function getCronSchedule(): Promise<string> {
  const cfg = await getConfig();
  return cfg.cronSchedule ?? process.env.CRON_SCHEDULE ?? '0 20 * * *';
}

// Pocket AI public API key (pk_xxx), used to read recordings and audio URLs.
export async function getPocketApiKey(): Promise<string> {
  const cfg = await getConfig();
  return cfg.pocketApiKey ?? process.env.POCKET_API_KEY ?? '';
}

// Signing secret Pocket shows once when the webhook is created.
export async function getPocketWebhookSecret(): Promise<string> {
  const cfg = await getConfig();
  return cfg.pocketWebhookSecret ?? process.env.POCKET_WEBHOOK_SECRET ?? '';
}
