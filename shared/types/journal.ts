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
  summaryGeneratedAt?: string;
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
  timestamp: string;
}

export interface AppConfig {
  unipileApiKey: string;
  unipileDsn: string;
  unipileAccountId: string;
  userPhoneNumber: string;
  cronSchedule: string;
  _sources: Record<string, 'db' | 'env' | 'unset'>;
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
