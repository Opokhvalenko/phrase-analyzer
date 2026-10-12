import type { Synonym } from '../../../shared/models/synonym';
import { normalizePhrase } from '../../../shared/text/normalize-phrase';
import type { DatamuseWordDto } from './datamuse.dto';

export class InvalidDatamuseResponseError extends Error {
  constructor() {
    super('Datamuse response is not an array');
    this.name = 'InvalidDatamuseResponseError';
  }
}

/**
 * Validates the raw response and maps it to synonyms of `phrase`:
 * drops malformed items, the phrase itself and duplicates; keeps Datamuse's order (best first).
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

function isDatamuseWord(item: unknown): item is DatamuseWordDto {
  return (
    typeof item === 'object' && item !== null && 'word' in item && typeof item.word === 'string'
  );
}
