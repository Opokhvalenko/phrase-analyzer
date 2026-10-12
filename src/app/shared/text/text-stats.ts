import { WORD_PATTERN } from './word-pattern';

export interface CharacterCount {
  readonly total: number;
  readonly withoutSpaces: number;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const WHITESPACE = /\s/gu;
const ONLY_WHITESPACE = /^\s+$/u;
/** Printable ASCII plus tab and line feed: here every UTF-16 unit is exactly one character. */
const PLAIN_ASCII = /^[\t\n -~]*$/;

/**
 * Counts user-perceived characters (graphemes): "👍🏽" and "é" (e + accent) count as 1.
 * Runs on every keystroke, so it makes a single pass and skips the (slow) segmenter for plain ASCII.
 */
export function countCharacters(text: string): CharacterCount {
  if (PLAIN_ASCII.test(text)) {
    const spaces = text.match(WHITESPACE)?.length ?? 0;
    return { total: text.length, withoutSpaces: text.length - spaces };
  }

  let total = 0;
  let withoutSpaces = 0;
  for (const { segment } of graphemeSegmenter.segment(text)) {
    total++;
    if (!ONLY_WHITESPACE.test(segment)) {
      withoutSpaces++;
    }
  }
  return { total, withoutSpaces };
}

export function countWords(text: string): number {
  return text.match(WORD_PATTERN)?.length ?? 0;
}
