import { WORD_PATTERN } from './word-pattern';

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const WHITESPACE_PATTERN = /\s/gu;

/** User-perceived characters (graphemes): "👍🏽" and "é" (e + accent) count as 1. */
export function countCharacters(text: string): number {
  return Array.from(graphemeSegmenter.segment(text)).length;
}

export function countCharactersWithoutSpaces(text: string): number {
  return countCharacters(text.replace(WHITESPACE_PATTERN, ''));
}

export function countWords(text: string): number {
  return text.match(WORD_PATTERN)?.length ?? 0;
}
