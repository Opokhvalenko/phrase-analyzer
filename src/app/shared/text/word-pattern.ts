const WORD_CHAR = String.raw`[\p{L}\p{N}\p{M}]`;
const WORD_JOINER = "['’ʼ-]";

/**
 * A word is a run of letters, digits or combining marks in any script.
 * Apostrophes and hyphens join parts of one word: "don't", "well-known", "мʼята".
 * Global flag: use only with `String.prototype.match` / `matchAll`, never with `exec`/`test`.
 */
export const WORD_PATTERN = new RegExp(`${WORD_CHAR}+(?:${WORD_JOINER}${WORD_CHAR}+)*`, 'gu');

export const LETTER_PATTERN = /\p{L}/u;
