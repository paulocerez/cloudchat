export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  messages: TextMessage[];
  voiceMemos: VoiceMemo[];
  images: JournalImage[];
  summary?: string;
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
}
