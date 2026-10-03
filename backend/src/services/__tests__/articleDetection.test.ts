import { describe, expect, it } from 'vitest';
import { extractKeyMessage, isArticle } from '../articleDetection';

describe('isArticle', () => {
  it.each([
    'This is an article. Discipline is a choice you make every morning.',
    'Das ist ein Artikel. Disziplin ist eine Entscheidung.',
    'Dies ist ein Artikel über Gewohnheiten.',
  ])('detects the English and German triggers: %s', (text) => {
    expect(isArticle(text)).toBe(true);
  });

  it.each([
    'THIS IS AN ARTICLE! about focus',
    'this, is an article… about focus',
    'This is an article: about focus',
    'das ist ein Artikel: über Fokus',
    '  "This is an article."  About focus',
  ])('ignores case and punctuation: %s', (text) => {
    expect(isArticle(text)).toBe(true);
  });

  it.each([
    'This is a article about focus',
    'This is an artikel about focus',
    'This is article about focus',
    'Das is ein Artikel über Fokus',
    'Das ist ein Artikle über Fokus',
  ])('tolerates small transcription errors: %s', (text) => {
    expect(isArticle(text)).toBe(true);
  });

  it.each([
    'Yesterday I read something and thought: this is an article.',
    'Ich habe gestern gedacht, das ist ein Artikel wert.',
    'Remind me to buy milk.',
    'This is an artichoke recipe',
    'This',
  ])('rejects text that does not start with a trigger: %s', (text) => {
    expect(isArticle(text)).toBe(false);
  });

  it.each(['', '   ', '\n\t', null, undefined])('rejects empty input: %j', (text) => {
    expect(isArticle(text)).toBe(false);
  });
});

describe('extractKeyMessage', () => {
  it('extracts the English key message sentence', () => {
    const text =
      'This is an article. Most people wait for motivation. Key message: Discipline beats motivation. Okay, that is it.';
    expect(extractKeyMessage(text)).toBe('Discipline beats motivation.');
  });

  it('extracts the German Kernaussage', () => {
    const text = 'Das ist ein Artikel. Viel Text. Kernaussage: Weniger ist mehr! Ende.';
    expect(extractKeyMessage(text)).toBe('Weniger ist mehr!');
  });

  it('accepts "key message is" and ends at a line break', () => {
    expect(extractKeyMessage('This is an article.\nThe key message is start small\nBye')).toBe(
      'start small'
    );
  });

  it('runs to the end of the transcript when the sentence has no terminator', () => {
    expect(extractKeyMessage('This is an article. Key message: start small')).toBe('start small');
  });

  it('uses the last occurrence', () => {
    const text = 'This is an article about my key message: none. Key message: Ship it.';
    expect(extractKeyMessage(text)).toBe('Ship it.');
  });

  it('does not stop at a decimal point', () => {
    expect(extractKeyMessage('Key message: Sleep 7.5 hours a night. Done.')).toBe(
      'Sleep 7.5 hours a night.'
    );
  });

  it.each([
    'This is an article. Discipline beats motivation.',
    'This is an article. Key message:',
    '',
    null,
  ])('returns undefined when missing: %j', (text) => {
    expect(extractKeyMessage(text)).toBeUndefined();
  });

  it('keeps a key message of exactly 320 characters', () => {
    const sentence = `${'a'.repeat(319)}.`;
    expect(extractKeyMessage(`This is an article. Key message: ${sentence} Bye.`)).toBe(sentence);
  });

  it('leaves out a key message sentence longer than 320 characters', () => {
    const long = `${'word '.repeat(80).trim()}.`; // 400 chars, one sentence
    expect(
      extractKeyMessage(`This is an article. Key message: ${long} Short tail.`)
    ).toBeUndefined();
  });
});
