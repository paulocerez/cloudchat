// Decides whether a Pocket transcript is a dictated article for the Quotes app,
// and pulls out the optional "Key message: …" sentence. Pure — no I/O.

// Spoken openers, already normalized. Matched loosely against the start of the
// transcript, so transcription slips ("this is a article") still count.
const TRIGGERS = ['this is an article', 'das ist ein artikel', 'dies ist ein artikel'];
// The phrase must end on (nearly) this word, so "this is an artichoke" isn't one.
const NOUNS = ['article', 'artikel'];

export const KEY_MESSAGE_MAX = 320;

// Lowercase, strip accents and punctuation, collapse whitespace.
export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// True when the transcript *starts with* a trigger phrase. The opening is
// compared with one word fewer/more than the trigger, so a dropped or extra
// word is tolerated, and up to ~20% of the characters may differ as long as
// the last word is still close to "article"/"Artikel".
export function isArticle(text: string | null | undefined): boolean {
  const words = normalize(text ?? '')
    .split(' ')
    .filter(Boolean);
  if (!words.length) return false;

  return TRIGGERS.some((trigger) => {
    const n = trigger.split(' ').length;
    const allowed = Math.max(2, Math.floor(trigger.length * 0.2));
    for (let k = n - 1; k <= n + 1; k++) {
      if (k > words.length) break;
      const opening = words.slice(0, k);
      const noun = opening[opening.length - 1];
      if (!NOUNS.some((w) => levenshtein(noun, w) <= 2)) continue;
      if (levenshtein(opening.join(' '), trigger) <= allowed) return true;
    }
    return false;
  });
}

const KEY_MESSAGE_RE = /\b(?:key[\s-]*message|kernaussage)\b\s*(?:is|ist)?\s*[:\-–—]?\s*/gi;

// The sentence after the last "Key message:" / "Kernaussage:", or undefined.
// A single sentence has no boundary to cut back to, so one longer than 320
// characters is dropped and Quotes picks the strongest line itself.
export function extractKeyMessage(text: string | null | undefined): string | undefined {
  if (!text) return undefined;

  let start = -1;
  for (const m of text.matchAll(KEY_MESSAGE_RE)) start = m.index + m[0].length;
  if (start < 0) return undefined;

  const rest = text.slice(start);
  const end = rest.search(/[.!?](?=\s|$)|\n/);
  const sentence = (end < 0 ? rest : rest.slice(0, rest[end] === '\n' ? end : end + 1)).trim();
  if (!sentence || sentence.length > KEY_MESSAGE_MAX) return undefined;
  return sentence;
}
