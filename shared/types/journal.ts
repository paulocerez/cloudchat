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
  pocketRecordingId?: string;
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
  context?: string; // Pocket's one-line justification for the item
  priority?: string; // 'high' | 'medium' | 'low'
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

export interface AppConfig {
  unipileApiKey: string;
  unipileDsn: string;
  unipileAccountId: string;
  userPhoneNumber: string;
  cronSchedule: string;
  pocketApiKey: string;
  pocketWebhookSecret: string;
  _sources: Record<string, 'db' | 'env' | 'unset'>;
  _integrations?: Record<string, boolean>;
}

export interface AISummary {
  id: string;
  period: 'week' | 'month';
  year: number;
  periodIndex: number;
  summary: string;
  imageUrls: string[];
  entryDates: string[];
  generatedAt: string;
}
