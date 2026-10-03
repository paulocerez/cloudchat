import axios from 'axios';

// Client for the Quotes app (polishes the text, renders the image and queues an
// Instagram post for approval). QUOTES_ADMIN_TOKEN has full admin rights there,
// so both values are read from server env only — never from config/main, which
// the app UI can read back.

export const TRANSCRIPT_MAX = 20_000;
// Quotes does the AI call and image render before answering (1–2 min).
const DEFAULT_TIMEOUT_MS = 150_000;

export interface QuotesPayload {
  transcript: string;
  keyMessage?: string;
  externalId: string;
}

export interface QuotesOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

export interface QuotesApiError {
  code?: string;
  message?: string;
  details?: unknown;
}

export type QuotesResult =
  // 201 = created and awaiting approval, 200 = this externalId was already received.
  | { kind: 'success'; id: string; created: boolean }
  // Retrying won't help: validation error, bad token, missing config.
  | {
      kind: 'permanent';
      status?: number;
      error: string;
      details?: QuotesApiError;
      configError?: boolean;
    }
  // 429, 5xx, network error, timeout.
  | { kind: 'retryable'; status?: number; error: string };

function baseUrl(opts?: QuotesOptions): string {
  return (opts?.baseUrl ?? process.env.QUOTES_BASE_URL ?? '').replace(/\/+$/, '');
}

export function quotesPostUrl(id: string, opts?: QuotesOptions): string {
  return `${baseUrl(opts)}/posts/${encodeURIComponent(id)}`;
}

export async function sendToQuotes(
  payload: QuotesPayload,
  opts?: QuotesOptions
): Promise<QuotesResult> {
  const url = baseUrl(opts);
  const token = opts?.token ?? process.env.QUOTES_ADMIN_TOKEN ?? '';
  if (!url || !token) {
    return {
      kind: 'permanent',
      error: 'QUOTES_BASE_URL or QUOTES_ADMIN_TOKEN not configured',
      configError: true,
    };
  }

  const body: QuotesPayload = {
    transcript: payload.transcript,
    externalId: payload.externalId,
  };
  if (payload.keyMessage) body.keyMessage = payload.keyMessage;

  let res;
  try {
    res = await axios.post(`${url}/api/v1/posts/from-transcript`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      validateStatus: () => true,
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = (err as Error)?.message ?? String(err);
    return { kind: 'retryable', error: code ? `${code}: ${message}` : message };
  }

  const { status, data } = res;
  if (status === 200 || status === 201) {
    if (!data?.id)
      return {
        kind: 'retryable',
        status,
        error: 'Success response without an id',
      };
    return { kind: 'success', id: String(data.id), created: status === 201 };
  }
  if (status === 429 || status >= 500) {
    return { kind: 'retryable', status, error: `HTTP ${status}` };
  }

  const details: QuotesApiError | undefined = data?.error;
  if (status === 401) {
    return {
      kind: 'permanent',
      status,
      error: 'QUOTES_ADMIN_TOKEN rejected',
      details,
      configError: true,
    };
  }
  const message = [details?.code, details?.message].filter(Boolean).join(': ');
  return {
    kind: 'permanent',
    status,
    error: `HTTP ${status}${message ? ` ${message}` : ''}`,
    details,
  };
}
