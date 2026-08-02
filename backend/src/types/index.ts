export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  messages: TextMessage[];
  voiceMemos: VoiceMemo[];
  images: JournalImage[];
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
  mediaId: string;
  transcription?: string;
  duration?: number;
  timestamp: string;
}

export interface JournalImage {
  id: string;
  mediaId: string;
  url?: string;
  caption?: string;
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

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; caption?: string; mime_type: string };
}
