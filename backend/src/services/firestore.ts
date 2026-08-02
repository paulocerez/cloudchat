import admin from 'firebase-admin';
import { JournalEntry, AISummary, TextMessage, VoiceMemo, JournalImage } from '../types';

let db: admin.firestore.Firestore;

export function initFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  db = admin.firestore();
}

export function getDb() {
  return db;
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
  await ref.set(entry);
  return entry;
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
