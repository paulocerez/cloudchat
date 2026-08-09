import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntry, AISummary, TextMessage, VoiceMemo, JournalImage, EntryLocation } from '../types';

let db: admin.firestore.Firestore;

export function initFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ??
        `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
    });
  }
  db = admin.firestore();
}

export function getDb() {
  return db;
}

// Uploads bytes to Firebase Storage and returns a stable, tokenized download
// URL so we keep our own permanent copy instead of relying on Unipile media.
export async function uploadMedia(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const bucket = admin.storage().bucket();
  const token = uuidv4();
  await bucket.file(path).save(buffer, {
    contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${token}`;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getOrCreateEntry(date: string): Promise<JournalEntry> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as JournalEntry;

  const entry: JournalEntry = {
    id: date,
    date,
    messages: [],
    voiceMemos: [],
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // create() fails if the doc already exists, so concurrent webhook
  // invocations can't overwrite each other's messages with an empty entry.
  try {
    await ref.create(entry);
    return entry;
  } catch {
    const existing = await ref.get();
    return existing.data() as JournalEntry;
  }
}

export async function addTextMessage(date: string, msg: TextMessage): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    messages: admin.firestore.FieldValue.arrayUnion(msg),
    updatedAt: new Date().toISOString(),
  });
}

export async function addVoiceMemo(date: string, memo: VoiceMemo): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    voiceMemos: admin.firestore.FieldValue.arrayUnion(memo),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateVoiceMemoTranscription(
  date: string,
  memoId: string,
  transcription: string
): Promise<void> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return;
  const entry = snap.data() as JournalEntry;
  const memos = entry.voiceMemos.map((m) =>
    m.id === memoId ? { ...m, transcription } : m
  );
  await ref.update({ voiceMemos: memos, updatedAt: new Date().toISOString() });
}

export async function addImage(date: string, image: JournalImage): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    images: admin.firestore.FieldValue.arrayUnion(image),
    updatedAt: new Date().toISOString(),
  });
}

// ── App-sent message dedupe ─────────────────────────────────
// The daily prompt is sent from the same WhatsApp account the user journals in,
// so Unipile may echo it back via the webhook. We record ids we send and skip
// them on the way in to avoid double-logging.
const RUNTIME_DOC = 'config/runtime';
const SENT_CAP = 50;

export async function recordSentMessageId(id: string): Promise<void> {
  if (!id) return;
  const ref = db.doc(RUNTIME_DOC);
  const snap = await ref.get();
  const existing: string[] = (snap.exists && snap.data()?.sentMessageIds) || [];
  const next = [...existing, id].slice(-SENT_CAP);
  await ref.set({ sentMessageIds: next }, { merge: true });
}

export async function isSentMessageId(id: string): Promise<boolean> {
  if (!id) return false;
  const snap = await db.doc(RUNTIME_DOC).get();
  const ids: string[] = (snap.exists && snap.data()?.sentMessageIds) || [];
  return ids.includes(id);
}

export async function updateEntrySummary(
  date: string,
  data: { title: string; summary: string; locations: EntryLocation[] }
): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    title: data.title,
    summary: data.summary,
    locations: data.locations,
    summaryGeneratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function setEntryHighlight(date: string, highlight: boolean): Promise<JournalEntry> {
  await getOrCreateEntry(date);
  const ref = db.collection('entries').doc(date);
  await ref.update({ highlight, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

export async function getEntry(date: string): Promise<JournalEntry | null> {
  const snap = await db.collection('entries').doc(date).get();
  return snap.exists ? (snap.data() as JournalEntry) : null;
}

export async function getEntriesInRange(from: string, to: string): Promise<JournalEntry[]> {
  const snap = await db
    .collection('entries')
    .where('date', '>=', from)
    .where('date', '<=', to)
    .orderBy('date', 'asc')
    .get();
  return snap.docs.map((d) => d.data() as JournalEntry);
}

export async function getAllEntries(): Promise<JournalEntry[]> {
  const snap = await db.collection('entries').orderBy('date', 'desc').get();
  return snap.docs.map((d) => d.data() as JournalEntry);
}

export async function saveSummary(summary: AISummary): Promise<void> {
  const id = `${summary.period}-${summary.year}-${summary.periodIndex}`;
  await db.collection('summaries').doc(id).set({ ...summary, id });
}

export async function getSummary(
  period: 'week' | 'month',
  year: number,
  periodIndex: number
): Promise<AISummary | null> {
  const id = `${period}-${year}-${periodIndex}`;
  const snap = await db.collection('summaries').doc(id).get();
  return snap.exists ? (snap.data() as AISummary) : null;
}

export async function getAllSummaries(): Promise<AISummary[]> {
  const snap = await db.collection('summaries').orderBy('year', 'desc').get();
  return snap.docs.map((d) => d.data() as AISummary);
}
