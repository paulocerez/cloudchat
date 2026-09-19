import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { JournalEntry, AISummary, TextMessage, VoiceMemo, JournalImage, JournalVideo, EntryLocation, TimePeriod, Habit } from '../types';

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

// Large videos can't stream through the (serverless) backend, so the browser
// uploads straight to Storage via a short-lived signed URL. We only hand out
// the target path + upload URL here; the object is registered once uploaded.
export async function createVideoUploadUrl(
  date: string,
  contentType: string,
  ext: string
): Promise<{ uploadUrl: string; path: string }> {
  const bucket = admin.storage().bucket();
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  const path = `videos/${date}/${uuidv4()}.${safeExt}`;
  const [uploadUrl] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });
  return { uploadUrl, path };
}

// After the browser finishes uploading, give the object a permanent download
// token (matching how images/audio are served) and attach it to the entry.
export async function registerVideo(
  date: string,
  input: { path: string; contentType: string; size?: number; caption?: string; timestamp?: string }
): Promise<JournalEntry | null> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(input.path);
  const [exists] = await file.exists();
  if (!exists) return null;

  const token = uuidv4();
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    input.path
  )}?alt=media&token=${token}`;

  await getOrCreateEntry(date);
  const video: JournalVideo = {
    id: uuidv4(),
    path: input.path,
    url,
    contentType: input.contentType,
    timestamp: input.timestamp ?? `${date}T${new Date().toTimeString().slice(0, 8)}`,
  };
  if (input.size !== undefined) video.size = input.size;
  if (input.caption) video.caption = input.caption;

  const ref = db.collection('entries').doc(date);
  await ref.update({
    videos: admin.firestore.FieldValue.arrayUnion(video),
    updatedAt: new Date().toISOString(),
  });
  return (await ref.get()).data() as JournalEntry;
}

// Photos taken on the phone go up the same way videos do — straight to
// Storage via a signed URL, then registered. They don't arrive through
// WhatsApp, so messageId/mediaId are synthesised.
export async function createImageUploadUrl(
  date: string,
  contentType: string,
  ext: string
): Promise<{ uploadUrl: string; path: string }> {
  const bucket = admin.storage().bucket();
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = `images/${date}/${uuidv4()}.${safeExt}`;
  const [uploadUrl] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });
  return { uploadUrl, path };
}

export async function registerImage(
  date: string,
  input: { path: string; contentType: string; caption?: string; timestamp?: string }
): Promise<JournalEntry | null> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(input.path);
  const [exists] = await file.exists();
  if (!exists) return null;

  const token = uuidv4();
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    input.path
  )}?alt=media&token=${token}`;

  await getOrCreateEntry(date);
  const id = uuidv4();
  const image: JournalImage = {
    id,
    messageId: `upload:${id}`,
    mediaId: id,
    url,
    timestamp: input.timestamp ?? `${date}T${new Date().toTimeString().slice(0, 8)}`,
  };
  if (input.caption) image.caption = input.caption;

  const ref = db.collection('entries').doc(date);
  await ref.update({
    images: admin.firestore.FieldValue.arrayUnion(image),
    updatedAt: new Date().toISOString(),
  });
  return (await ref.get()).data() as JournalEntry;
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
    videos: [],
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
): Promise<JournalEntry | null> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const entry = snap.data() as JournalEntry;
  const memos = entry.voiceMemos.map((m) =>
    m.id === memoId ? { ...m, transcription } : m
  );
  await ref.update({ voiceMemos: memos, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

// ── Pocket AI recordings ────────────────────────────────────
// Webhook delivery is at-least-once and several events fire per recording
// (transcription.completed, then summary.completed…), so this merges into the
// existing row keyed by pocketRecordingId instead of appending a duplicate.
// The whole array is rewritten because arrayUnion can't replace an element.
export async function upsertPocketMemo(date: string, memo: VoiceMemo): Promise<JournalEntry> {
  await getOrCreateEntry(date);
  const ref = db.collection('entries').doc(date);
  const entry = (await ref.get()).data() as JournalEntry;
  const memos = entry.voiceMemos ?? [];

  const i = memos.findIndex((m) => m.pocketRecordingId === memo.pocketRecordingId);
  // Keep the original id and any field the user edited but this event omits.
  const next =
    i >= 0 ? memos.map((m, j) => (j === i ? { ...m, ...memo, id: m.id } : m)) : [...memos, memo];

  await ref.update({ voiceMemos: next, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

export async function removePocketMemo(date: string, recordingId: string): Promise<void> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return;
  const entry = snap.data() as JournalEntry;
  const memos = (entry.voiceMemos ?? []).filter((m) => m.pocketRecordingId !== recordingId);
  if (memos.length === (entry.voiceMemos ?? []).length) return;
  await ref.update({ voiceMemos: memos, updatedAt: new Date().toISOString() });
}

export async function updateImageAnnotation(
  date: string,
  imageId: string,
  annotation: string
): Promise<JournalEntry | null> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const entry = snap.data() as JournalEntry;
  const images = entry.images.map((img) =>
    img.id === imageId ? { ...img, annotation } : img
  );
  await ref.update({ images, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

export async function addImage(date: string, image: JournalImage): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    images: admin.firestore.FieldValue.arrayUnion(image),
    updatedAt: new Date().toISOString(),
  });
}

// Images ingested before we kept our own copy have no `url`, so every view of
// them goes back through WhatsApp and wakes the phone. The media proxy looks one
// up, stores the bytes, then writes the url back — after that it reads Storage.
// Only the `images` field is read, and the scan runs once per legacy image.
export async function findImageWithoutUrl(
  messageId: string,
  mediaId: string
): Promise<{ date: string; imageId: string } | null> {
  const snap = await db.collection('entries').select('images').get();
  for (const doc of snap.docs) {
    const images = (doc.data().images ?? []) as JournalImage[];
    const match = images.find(
      (img) => img.messageId === messageId && img.mediaId === mediaId && !img.url
    );
    if (match) return { date: doc.id, imageId: match.id };
  }
  return null;
}

export async function setImageUrl(date: string, imageId: string, url: string): Promise<void> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return;
  const entry = snap.data() as JournalEntry;
  await ref.update({
    images: entry.images.map((img) => (img.id === imageId ? { ...img, url } : img)),
    updatedAt: new Date().toISOString(),
  });
}

export async function addVideo(date: string, video: JournalVideo): Promise<void> {
  const ref = db.collection('entries').doc(date);
  await ref.update({
    videos: admin.firestore.FieldValue.arrayUnion(video),
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
): Promise<JournalEntry> {
  const ref = db.collection('entries').doc(date);
  const now = new Date().toISOString();
  // Preserve manually-added locations: append only newly-detected places,
  // de-duplicating by name (case-insensitive) so a re-run never wipes them.
  const existing = ((await ref.get()).data() as JournalEntry | undefined)?.locations ?? [];
  const seen = new Set(existing.map((l) => l.name.trim().toLowerCase()));
  const locations = [...existing];
  for (const loc of data.locations) {
    const key = loc.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      locations.push(loc);
    }
  }
  await ref.update({
    title: data.title,
    summary: data.summary,
    locations,
    summaryGeneratedAt: now,
    locationsScannedAt: now,
    updatedAt: now,
  });
  return (await ref.get()).data() as JournalEntry;
}

// Manually edit the day's title and/or summary text.
export async function updateEntryText(
  date: string,
  data: { title?: string; summary?: string }
): Promise<JournalEntry> {
  await getOrCreateEntry(date);
  const ref = db.collection('entries').doc(date);
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.title !== undefined) patch.title = data.title;
  if (data.summary !== undefined) patch.summary = data.summary;
  await ref.update(patch);
  return (await ref.get()).data() as JournalEntry;
}

// Append a manually-entered location, de-duplicating by name.
export async function addEntryLocation(
  date: string,
  location: EntryLocation
): Promise<JournalEntry> {
  await getOrCreateEntry(date);
  const ref = db.collection('entries').doc(date);
  const entry = (await ref.get()).data() as JournalEntry;
  const existing = entry.locations ?? [];
  const locations = existing.some((l) => l.name === location.name)
    ? existing
    : [...existing, location];
  await ref.update({ locations, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

export async function removeEntryLocation(
  date: string,
  name: string
): Promise<JournalEntry | null> {
  const ref = db.collection('entries').doc(date);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const entry = snap.data() as JournalEntry;
  const locations = (entry.locations ?? []).filter((l) => l.name !== name);
  await ref.update({ locations, updatedAt: new Date().toISOString() });
  return (await ref.get()).data() as JournalEntry;
}

// Swap the date portion of a timestamp, keeping the time-of-day.
function shiftTimestampDate(timestamp: string, newDate: string): string {
  const tIdx = timestamp.indexOf('T');
  return tIdx === -1 ? newDate : `${newDate}${timestamp.slice(tIdx)}`;
}

// Move an entry to a different day. Nested message/memo/image timestamps are
// re-dated (time-of-day preserved). If the target day already has an entry the
// two are merged; otherwise the doc is recreated under the new date. Runs in a
// transaction so the old doc is only removed once the new one is written.
export async function moveEntry(
  fromDate: string,
  toDate: string
): Promise<JournalEntry | null> {
  const fromRef = db.collection('entries').doc(fromDate);
  const toRef = db.collection('entries').doc(toDate);

  return db.runTransaction(async (tx) => {
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists) return null;
    const source = fromSnap.data() as JournalEntry;
    const toSnap = await tx.get(toRef);
    const now = new Date().toISOString();

    const messages = source.messages.map((m) => ({
      ...m,
      timestamp: shiftTimestampDate(m.timestamp, toDate),
    }));
    const voiceMemos = source.voiceMemos.map((v) => ({
      ...v,
      timestamp: shiftTimestampDate(v.timestamp, toDate),
    }));
    const images = source.images.map((i) => ({
      ...i,
      timestamp: shiftTimestampDate(i.timestamp, toDate),
    }));
    const videos = (source.videos ?? []).map((v) => ({
      ...v,
      timestamp: shiftTimestampDate(v.timestamp, toDate),
    }));

    if (!toSnap.exists) {
      const moved: JournalEntry = {
        ...source,
        id: toDate,
        date: toDate,
        messages,
        voiceMemos,
        images,
        videos,
        updatedAt: now,
      };
      tx.set(toRef, moved);
      tx.delete(fromRef);
      return moved;
    }

    // Merge into the existing target entry.
    const target = toSnap.data() as JournalEntry;
    const locations = [...(target.locations ?? [])];
    const seen = new Set(locations.map((l) => l.name.trim().toLowerCase()));
    for (const l of source.locations ?? []) {
      const key = l.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        locations.push(l);
      }
    }
    const habitsDone = Array.from(
      new Set([...(target.habitsDone ?? []), ...(source.habitsDone ?? [])])
    );

    const merged: JournalEntry = {
      id: toDate,
      date: toDate,
      messages: [...target.messages, ...messages],
      voiceMemos: [...target.voiceMemos, ...voiceMemos],
      images: [...target.images, ...images],
      createdAt: target.createdAt,
      updatedAt: now,
    };
    const mergedVideos = [...(target.videos ?? []), ...videos];
    if (mergedVideos.length) merged.videos = mergedVideos;
    const title = target.title ?? source.title;
    if (title !== undefined) merged.title = title;
    const summary = target.summary ?? source.summary;
    if (summary !== undefined) merged.summary = summary;
    if (target.highlight || source.highlight) merged.highlight = true;
    if (habitsDone.length) merged.habitsDone = habitsDone;
    if (locations.length) merged.locations = locations;
    const summaryGeneratedAt = target.summaryGeneratedAt ?? source.summaryGeneratedAt;
    if (summaryGeneratedAt !== undefined) merged.summaryGeneratedAt = summaryGeneratedAt;
    const locationsScannedAt = target.locationsScannedAt ?? source.locationsScannedAt;
    if (locationsScannedAt !== undefined) merged.locationsScannedAt = locationsScannedAt;

    tx.set(toRef, merged);
    tx.delete(fromRef);
    return merged;
  });
}

// Move a single voice memo to another day (e.g. one recorded late and logged
// on the wrong date). The memo's timestamp is re-dated (time-of-day kept), it's
// removed from the source entry and appended to the target (created if needed).
// Returns the updated source entry. Runs in a transaction.
export async function moveVoiceMemo(
  fromDate: string,
  memoId: string,
  toDate: string
): Promise<JournalEntry | null> {
  const fromRef = db.collection('entries').doc(fromDate);
  const toRef = db.collection('entries').doc(toDate);

  return db.runTransaction(async (tx) => {
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists) return null;
    const source = fromSnap.data() as JournalEntry;
    const memo = source.voiceMemos.find((m) => m.id === memoId);
    if (!memo) return null;

    const toSnap = await tx.get(toRef);
    const now = new Date().toISOString();
    const shifted: VoiceMemo = {
      ...memo,
      timestamp: shiftTimestampDate(memo.timestamp, toDate),
    };
    const remaining = source.voiceMemos.filter((m) => m.id !== memoId);

    tx.update(fromRef, { voiceMemos: remaining, updatedAt: now });

    if (toSnap.exists) {
      const target = toSnap.data() as JournalEntry;
      tx.update(toRef, {
        voiceMemos: [...target.voiceMemos, shifted],
        updatedAt: now,
      });
    } else {
      const created: JournalEntry = {
        id: toDate,
        date: toDate,
        messages: [],
        voiceMemos: [shifted],
        images: [],
        videos: [],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(toRef, created);
    }

    return { ...source, voiceMemos: remaining, updatedAt: now };
  });
}

export async function moveImage(
  fromDate: string,
  imageId: string,
  toDate: string
): Promise<JournalEntry | null> {
  const fromRef = db.collection('entries').doc(fromDate);
  const toRef = db.collection('entries').doc(toDate);

  return db.runTransaction(async (tx) => {
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists) return null;
    const source = fromSnap.data() as JournalEntry;
    const image = source.images.find((i) => i.id === imageId);
    if (!image) return null;

    const toSnap = await tx.get(toRef);
    const now = new Date().toISOString();
    const shifted: JournalImage = {
      ...image,
      timestamp: shiftTimestampDate(image.timestamp, toDate),
    };
    const remaining = source.images.filter((i) => i.id !== imageId);

    tx.update(fromRef, { images: remaining, updatedAt: now });

    if (toSnap.exists) {
      const target = toSnap.data() as JournalEntry;
      tx.update(toRef, {
        images: [...target.images, shifted],
        updatedAt: now,
      });
    } else {
      const created: JournalEntry = {
        id: toDate,
        date: toDate,
        messages: [],
        voiceMemos: [],
        images: [shifted],
        videos: [],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(toRef, created);
    }

    return { ...source, images: remaining, updatedAt: now };
  });
}

export async function moveTextMessage(
  fromDate: string,
  messageId: string,
  toDate: string
): Promise<JournalEntry | null> {
  const fromRef = db.collection('entries').doc(fromDate);
  const toRef = db.collection('entries').doc(toDate);

  return db.runTransaction(async (tx) => {
    const fromSnap = await tx.get(fromRef);
    if (!fromSnap.exists) return null;
    const source = fromSnap.data() as JournalEntry;
    const message = source.messages.find((m) => m.id === messageId);
    if (!message) return null;

    const toSnap = await tx.get(toRef);
    const now = new Date().toISOString();
    const shifted: TextMessage = {
      ...message,
      timestamp: shiftTimestampDate(message.timestamp, toDate),
    };
    const remaining = source.messages.filter((m) => m.id !== messageId);

    tx.update(fromRef, { messages: remaining, updatedAt: now });

    if (toSnap.exists) {
      const target = toSnap.data() as JournalEntry;
      tx.update(toRef, {
        messages: [...target.messages, shifted],
        updatedAt: now,
      });
    } else {
      const created: JournalEntry = {
        id: toDate,
        date: toDate,
        messages: [shifted],
        voiceMemos: [],
        images: [],
        videos: [],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(toRef, created);
    }

    return { ...source, messages: remaining, updatedAt: now };
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

// ── Time periods (vacations, trips…) ────────────────────────
export async function getAllPeriods(): Promise<TimePeriod[]> {
  const snap = await db.collection('periods').orderBy('startDate', 'desc').get();
  return snap.docs.map((d) => d.data() as TimePeriod);
}

export async function createPeriod(
  data: Pick<TimePeriod, 'name' | 'startDate' | 'endDate' | 'color' | 'emoji'>
): Promise<TimePeriod> {
  const now = new Date().toISOString();
  const period: TimePeriod = {
    id: uuidv4(),
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    color: data.color,
    ...(data.emoji ? { emoji: data.emoji } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('periods').doc(period.id).set(period);
  return period;
}

export async function updatePeriod(
  id: string,
  data: Partial<Pick<TimePeriod, 'name' | 'startDate' | 'endDate' | 'color' | 'emoji'>>
): Promise<TimePeriod | null> {
  const ref = db.collection('periods').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.startDate !== undefined) patch.startDate = data.startDate;
  if (data.endDate !== undefined) patch.endDate = data.endDate;
  if (data.color !== undefined) patch.color = data.color;
  if (data.emoji !== undefined) patch.emoji = data.emoji;
  await ref.update(patch);
  return (await ref.get()).data() as TimePeriod;
}

export async function deletePeriod(id: string): Promise<boolean> {
  const ref = db.collection('periods').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

// ── Habits ──────────────────────────────────────────────────
export async function getAllHabits(): Promise<Habit[]> {
  const snap = await db.collection('habits').orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => d.data() as Habit);
}

export async function createHabit(
  data: Pick<Habit, 'name' | 'color' | 'weeklyTarget' | 'emoji'>
): Promise<Habit> {
  const now = new Date().toISOString();
  const habit: Habit = {
    id: uuidv4(),
    name: data.name,
    color: data.color,
    weeklyTarget: data.weeklyTarget,
    ...(data.emoji ? { emoji: data.emoji } : {}),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('habits').doc(habit.id).set(habit);
  return habit;
}

export async function updateHabit(
  id: string,
  data: Partial<Pick<Habit, 'name' | 'color' | 'weeklyTarget' | 'emoji'>>
): Promise<Habit | null> {
  const ref = db.collection('habits').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.color !== undefined) patch.color = data.color;
  if (data.weeklyTarget !== undefined) patch.weeklyTarget = data.weeklyTarget;
  if (data.emoji !== undefined) patch.emoji = data.emoji;
  await ref.update(patch);
  return (await ref.get()).data() as Habit;
}

export async function deleteHabit(id: string): Promise<boolean> {
  const ref = db.collection('habits').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

// Check or uncheck a habit for a given day, stored on the day's entry.
export async function setEntryHabit(
  date: string,
  habitId: string,
  done: boolean
): Promise<JournalEntry> {
  await getOrCreateEntry(date);
  const ref = db.collection('entries').doc(date);
  await ref.update({
    habitsDone: done
      ? admin.firestore.FieldValue.arrayUnion(habitId)
      : admin.firestore.FieldValue.arrayRemove(habitId),
    updatedAt: new Date().toISOString(),
  });
  return (await ref.get()).data() as JournalEntry;
}
