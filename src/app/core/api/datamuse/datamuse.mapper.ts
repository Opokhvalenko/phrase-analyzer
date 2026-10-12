import type { Synonym } from '../../../shared/models/synonym';
import { normalizePhrase } from '../../../shared/text/normalize-phrase';
import type { DatamuseWordDto } from './datamuse.dto';

/**
 * Datamuse marks the first "filler" result (nearest neighbours by vector, often unrelated:
 * "very happy" → "agony", "cosmetic") with this tag; everything from it on is filler.
 * Observed behaviour, not a documented contract — without the tag the list is kept as is.
 */
const BACKFILL_TAG_PREFIX = 'results_type:backfill';

export class InvalidDatamuseResponseError extends Error {
  constructor() {
    super('Datamuse response is not an array');
    this.name = 'InvalidDatamuseResponseError';
  }
}

/**
 * Validates the raw response and maps it to synonyms of `phrase`:
 * drops malformed items, the phrase itself, duplicates and the backfill tail; keeps Datamuse's order (best first).
 */
export function toSynonyms(response: unknown, phrase: string, limit: number): Synonym[] {
  if (!Array.isArray(response)) {
    throw new InvalidDatamuseResponseError();
  }

  const seen = new Set<string>([normalizePhrase(phrase)]);
  const synonyms: Synonym[] = [];

  for (const item of response) {
    if (!isDatamuseWord(item)) {
      continue;
    }
    if (isBackfill(item)) {
      break;
    }
    const text = item.word.trim();
    const key = normalizePhrase(text);
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    synonyms.push({ text });
    if (synonyms.length === limit) {
      break;
    }
  }

  return synonyms;
}

function isBackfill(item: DatamuseWordDto): boolean {
  return item.tags?.some((tag) => tag.startsWith(BACKFILL_TAG_PREFIX)) ?? false;
}

function isDatamuseWord(item: unknown): item is DatamuseWordDto {
  if (
    typeof item !== 'object' ||
    item === null ||
    !('word' in item) ||
    typeof item.word !== 'string'
  ) {
    return false;
  }
  return !('tags' in item) || item.tags === undefined || isStringArray(item.tags);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
