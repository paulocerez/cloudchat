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

export interface AppConfig {
  unipileApiKey: string;
  unipileDsn: string;
  unipileAccountId: string;
  userPhoneNumber: string;
  cronSchedule: string;
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
