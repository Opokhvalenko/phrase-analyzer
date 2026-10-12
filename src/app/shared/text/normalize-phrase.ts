const WHITESPACE_RUN = /\s+/gu;

/** Canonical form for comparing phrases: "  Very\nHappy " → "very happy". */
export function normalizePhrase(phrase: string): string {
  return phrase.trim().replace(WHITESPACE_RUN, ' ').toLowerCase();
}
