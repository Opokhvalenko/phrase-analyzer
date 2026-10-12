import { LETTER_PATTERN, WORD_PATTERN } from './word-pattern';

export const MAX_PHRASE_WORDS = 5;

/** Offsets are UTF-16 indices, the same units as `textarea.selectionStart/End`. */
export interface TextSelection {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export type InvalidSelectionReason = 'empty' | 'no-letters' | 'too-long';

export type SelectionCheck =
  | { readonly valid: true; readonly selection: TextSelection }
  | { readonly valid: false; readonly reason: InvalidSelectionReason };

export interface ReplacementResult {
  readonly text: string;
  readonly selection: TextSelection;
}

/**
 * Turns a raw textarea selection into the phrase to look up.
 * The result spans exactly the words the selection touches, so it both trims
 * surrounding spaces/punctuation (" happy, " → "happy") and expands partial
 * words to whole ones ("app" inside "happy" → "happy").
 */
export function normalizeSelection(text: string, start: number, end: number): SelectionCheck {
  const from = Math.min(start, end);
  const to = Math.max(start, end);

  if (from === to) {
    return { valid: false, reason: 'empty' };
  }

  const touchedWords = Array.from(text.matchAll(WORD_PATTERN)).filter((match) => {
    const wordStart = match.index;
    const wordEnd = wordStart + match[0].length;
    return wordStart < to && wordEnd > from;
  });

  const firstWord = touchedWords.at(0);
  const lastWord = touchedWords.at(-1);
  if (!firstWord || !lastWord) {
    return { valid: false, reason: 'no-letters' };
  }

  const selectionStart = firstWord.index;
  const selectionEnd = lastWord.index + lastWord[0].length;
  const phrase = text.slice(selectionStart, selectionEnd);

  if (!LETTER_PATTERN.test(phrase)) {
    return { valid: false, reason: 'no-letters' };
  }
  if (touchedWords.length > MAX_PHRASE_WORDS) {
    return { valid: false, reason: 'too-long' };
  }

  return { valid: true, selection: { start: selectionStart, end: selectionEnd, text: phrase } };
}

/**
 * Applies the case style of `source` to `replacement`, judged by its first word:
 * "HAPPY" → "PLEASED", "Happy" / "I" → "Pleased", anything else → as given.
 */
export function matchCase(source: string, replacement: string): string {
  const firstWord = source.match(WORD_PATTERN)?.[0] ?? '';
  const letters = Array.from(firstWord).filter((char) => LETTER_PATTERN.test(char));
  const firstLetter = letters.at(0);

  if (!firstLetter || !isUpperCase(firstLetter)) {
    return replacement;
  }
  if (letters.length > 1 && letters.every(isUpperCase)) {
    return replacement.toUpperCase();
  }

  const [head = '', ...tail] = Array.from(replacement);
  return head.toUpperCase() + tail.join('');
}

/**
 * Replaces `target` in `text` and returns the new text with the inserted word selected.
 * Returns `null` if `text` no longer contains `target` at the same place (stale target),
 * so a replacement can never land on the wrong words.
 */
export function applyReplacement(
  text: string,
  target: TextSelection,
  replacement: string,
): ReplacementResult | null {
  if (text.slice(target.start, target.end) !== target.text) {
    return null;
  }

  const inserted = matchCase(target.text, replacement);
  const end = target.start + inserted.length;

  return {
    text: text.slice(0, target.start) + inserted + text.slice(target.end),
    selection: { start: target.start, end, text: inserted },
  };
}

function isUpperCase(char: string): boolean {
  return char !== char.toLowerCase() && char === char.toUpperCase();
}
