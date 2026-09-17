import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getPocketApiKey } from './config';
import {
  PocketActionItem,
  PocketRecording,
  PocketSummarization,
  PocketSummarizations,
  PocketTranscript,
  PocketTranscriptSegment,
  VoiceMemo,
} from '../types';

const BASE_URL = 'https://public.heypocketai.com/api/v1';

async function client() {
  const apiKey = await getPocketApiKey();
  if (!apiKey) throw new Error('Pocket API key not configured');
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 20_000,
  });
}

export async function getRecording(id: string): Promise<PocketRecording> {
  const http = await client();
  const { data } = await http.get(`/public/recordings/${id}`);
  return data?.data as PocketRecording;
}

export interface ListRecordingsParams {
  start_date?: string; // YYYY-MM-DD, UTC midnight
  end_date?: string; // YYYY-MM-DD, UTC 23:59:59
  page?: number;
  limit?: number; // max 100
}

export async function listRecordings(
  params: ListRecordingsParams
): Promise<{ recordings: PocketRecording[]; hasMore: boolean }> {
  const http = await client();
  const { data } = await http.get('/public/recordings', { params });
  return {
    recordings: (data?.data ?? []) as PocketRecording[],
    hasMore: Boolean(data?.pagination?.has_more),
  };
}

// Pre-signed S3 URL — expires, so it is proxied per-request and never stored.
export async function getAudioUrl(id: string, expiresIn = 3600): Promise<string> {
  const http = await client();
  const { data } = await http.get(`/public/recordings/${id}/audio-url`, {
    params: { expires_in: expiresIn },
  });
  return data?.data?.url ?? data?.url ?? data?.data?.download_url ?? '';
}

// ── Webhook signature ───────────────────────────────────────
// HMAC-SHA256 of `{timestamp}.{rawBody}`, compared in constant time.
const MAX_SKEW_MS = 5 * 60 * 1000;

export function verifyPocketSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
  secret: string
): boolean {
  if (!timestamp || !signature) return false;

  // Reject stale deliveries so a captured payload can't be replayed later.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // timingSafeEqual throws on a length mismatch, so guard first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Normalization ───────────────────────────────────────────

function segments(transcript: PocketTranscript): string {
  if (!transcript) return '';
  if (typeof transcript === 'string') return transcript.trim();

  if (!Array.isArray(transcript)) {
    const nested = transcript.segments ?? transcript.utterances;
    if (!nested?.length) return (transcript.text ?? '').trim();
    return joinSegments(nested);
  }
  return joinSegments(transcript);
}

function joinSegments(list: PocketTranscriptSegment[]): string {
  return list
    .map((s) => {
      const text = (s?.text ?? '').trim();
      if (!text) return '';
      return s?.speaker ? `${s.speaker}: ${text}` : text;
    })
    .filter(Boolean)
    .join('\n');
}

function summarizationList(summarizations: PocketSummarizations): PocketSummarization[] {
  if (!summarizations) return [];
  return Array.isArray(summarizations) ? summarizations : Object.values(summarizations);
}

// Prefer a completed summarization; fall back to whatever arrived first.
function pickSummarization(summarizations: PocketSummarizations): PocketSummarization | undefined {
  const list = summarizationList(summarizations).filter((s) => s?.v2);
  return list.find((s) => s.processingStatus === 'completed') ?? list[0];
}

function actionItems(sum: PocketSummarization | undefined): PocketActionItem[] {
  const raw = sum?.v2?.actionItems?.actions ?? sum?.v2?.actionItems?.actionItems ?? [];
  return raw
    .map((a) => {
      const item: PocketActionItem = {
        // `id` is only unique within a recording ("1", "2"…), so prefer the global one.
        id: a.globalActionItemId ?? a.id ?? uuidv4(),
        title: (a.label ?? a.title ?? '').trim(),
        isCompleted: Boolean(a.isCompleted ?? a.is_completed ?? a.status === 'DONE'),
      };
      if (a.dueDate) item.dueDate = a.dueDate;
      if (a.context) item.context = a.context.trim();
      if (a.priority) item.priority = a.priority;
      return item;
    })
    .filter((a) => a.title);
}

export function recordedAt(recording: PocketRecording): string {
  return (
    recording.recording_at ??
    recording.createdAt ??
    recording.created_at ??
    new Date().toISOString()
  );
}

// Builds the VoiceMemo we persist. `transcript`/`summarizations` may come from
// the webhook envelope rather than the recording object, so they are passed in.
export function toVoiceMemo(
  recording: PocketRecording,
  transcript: PocketTranscript,
  summarizations: PocketSummarizations
): VoiceMemo {
  const sum = pickSummarization(summarizations);
  const v2 = sum?.v2;

  const memo: VoiceMemo = {
    id: uuidv4(),
    messageId: recording.id,
    mediaId: recording.id,
    timestamp: recordedAt(recording),
    source: 'pocket',
    pocketRecordingId: recording.id,
  };

  const transcription = segments(transcript);
  if (transcription) memo.transcription = transcription;

  const title = (v2?.summary?.title ?? recording.title ?? '').trim();
  if (title) memo.title = title;

  const markdown = (v2?.summary?.markdown ?? '').trim();
  if (markdown) memo.summaryMarkdown = markdown;

  const bullets = (v2?.summary?.bulletPoints ?? []).map((b) => String(b).trim()).filter(Boolean);
  if (bullets.length) memo.bulletPoints = bullets;

  const items = actionItems(sum);
  if (items.length) memo.actionItems = items;

  const tags = (recording.tags ?? []).map((t) => (t?.name ?? '').trim()).filter(Boolean);
  if (tags.length) memo.tags = tags;

  if (recording.duration !== undefined) memo.duration = recording.duration;
  if (recording.language) memo.language = recording.language;

  return memo;
}

// True when the payload lacks the parts we care about and a refetch is worth it.
export function needsRefetch(
  transcript: PocketTranscript,
  summarizations: PocketSummarizations
): boolean {
  return !segments(transcript) || !pickSummarization(summarizations);
}
