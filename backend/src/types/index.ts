export interface EntryLocation {
  name: string;
  longitude: number;
  latitude: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  messages: TextMessage[];
  voiceMemos: VoiceMemo[];
  images: JournalImage[];
  videos?: JournalVideo[]; // manually uploaded video clips
  title?: string; // few-word headline for the day
  summary?: string; // one-sentence reflection
  locations?: EntryLocation[]; // geocoded places mentioned that day
  highlight?: boolean; // user-marked special day
  habitsDone?: string[]; // ids of habits checked off this day
  summaryGeneratedAt?: string;
  locationsScannedAt?: string; // when the automatic location scan last ran
  createdAt: string;
  updatedAt: string;
}

export interface TextMessage {
  id: string;
  content: string;
  timestamp: string;
  fromUser: boolean;
}

export interface VoiceMemo {
  id: string;
  messageId: string;
  mediaId: string;
  audioUrl?: string;
  transcription?: string;
  duration?: number;
  timestamp: string;
  // ── Pocket AI recordings ──
  // Absent source means the memo came in through WhatsApp (all legacy memos).
  source?: 'whatsapp' | 'pocket';
  pocketRecordingId?: string; // stable key used to upsert on repeat webhooks
  title?: string; // Pocket's AI-generated headline
  summaryMarkdown?: string;
  bulletPoints?: string[];
  actionItems?: PocketActionItem[];
  tags?: string[];
  language?: string;
}

export interface PocketActionItem {
  id: string;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
}

export interface JournalImage {
  id: string;
  messageId: string;
  mediaId: string;
  url?: string;
  caption?: string;
  annotation?: string; // user-added note shown over the image
  timestamp: string;
}

export interface JournalVideo {
  id: string;
  path: string; // object path within the Storage bucket
  url?: string; // permanent tokened download URL
  caption?: string;
  annotation?: string; // user-added note
  duration?: number;
  size?: number; // bytes
  contentType: string;
  timestamp: string;
}

export interface AISummary {
  id: string;
  period: 'week' | 'month';
  year: number;
  periodIndex: number; // week number or month (1-12)
  summary: string;
  imageUrls: string[];
  entryDates: string[];
  generatedAt: string;
}

export type PeriodColor =
  | 'amber'
  | 'orange'
  | 'rose'
  | 'pink'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'lime';

// A named span of days (vacation, a trip…) bracketing entries on the timeline.
export interface TimePeriod {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD, inclusive
  endDate: string; // YYYY-MM-DD, inclusive
  color: PeriodColor;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}

// A recurring habit checked off per day, with a weekly target.
export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  color: PeriodColor;
  weeklyTarget: number; // 1–7 days per week
  createdAt: string;
  updatedAt: string;
}

// ── Unipile webhook payload ─────────────────────────────────
export interface UnipileAttachment {
  attachment_id: string;
  attachment_type: string; // e.g. 'img', 'audio', 'video', 'file'
  attachment_url?: string | null;
  attachment_size?: number;
  mimetype?: string;
  unavailable?: boolean;
}

export interface UnipileAttendee {
  attendee_id: string;
  attendee_name?: string;
  attendee_provider_id: string; // e.g. '258969398427850@lid'
  attendee_profile_url?: string;
  attendee_public_identifier?: string; // e.g. '4917621446929@s.whatsapp.net'
  attendee_specifics?: { provider?: string; phone_number?: string; lid?: string };
}

export interface UnipileMessageWebhook {
  event: string; // 'message_received'
  account_id: string;
  account_type?: string;
  account_info?: { type?: string; phone_number?: string };
  chat_id: string;
  message_id: string;
  message?: string;
  timestamp: string; // ISO 8601
  sender?: UnipileAttendee;
  attendees?: UnipileAttendee[];
  attachments?: UnipileAttachment[];
  is_group?: boolean;
  is_sender?: boolean;
  // Set by Unipile for non-message events (calls, unsupported system messages).
  // Normal text messages leave this unset; event_type carries the specifics
  // (8-13 = call notifications, 0 = provider event Unipile can't render).
  is_event?: boolean;
  event_type?: number;
}

// ── Pocket AI ───────────────────────────────────────────────
// https://docs.heypocketai.com/docs/api — the webhook payload nests the
// recording under `recording` and uses camelCase, while the REST API returns
// it flat under `data` in snake_case. Both shapes are modelled loosely because
// the published schema types transcript/summarizations as `null`.

export interface PocketTranscriptSegment {
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
}

// Either an array of segments, a wrapper around one, or pre-joined text.
export type PocketTranscript =
  | PocketTranscriptSegment[]
  | { segments?: PocketTranscriptSegment[]; utterances?: PocketTranscriptSegment[]; text?: string }
  | string
  | null;

export interface PocketSummarization {
  id?: string;
  summarizationId?: string;
  processingStatus?: string;
  createdAt?: string;
  v2?: {
    summary?: {
      title?: string;
      emoji?: string;
      markdown?: string;
      bulletPoints?: string[];
    };
    actionItems?: {
      actionItems?: Array<{
        id?: string;
        globalActionItemId?: string;
        title?: string;
        dueDate?: string;
        status?: string;
        isCompleted?: boolean;
        is_completed?: boolean;
      }>;
    };
  };
}

// Keyed by summarization id in webhooks, a plain array in REST responses.
export type PocketSummarizations = Record<string, PocketSummarization> | PocketSummarization[] | null;

export interface PocketRecording {
  id: string;
  title?: string;
  description?: string;
  duration?: number; // seconds
  language?: string;
  createdAt?: string; // webhook casing
  created_at?: string; // REST casing
  recording_at?: string; // when it was actually recorded
  tags?: Array<{ id?: string; name?: string; color?: string }>;
  transcript?: PocketTranscript;
  summarizations?: PocketSummarizations;
}

export interface PocketWebhookBody {
  event: string; // 'summary.completed', 'recording.deleted', …
  timestamp?: string;
  user?: { id?: string; email?: string };
  organization?: { id?: string };
  recording?: PocketRecording;
  summarizations?: PocketSummarizations;
  transcript?: PocketTranscript;
}
