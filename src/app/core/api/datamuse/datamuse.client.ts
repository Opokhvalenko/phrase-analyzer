import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of, tap, throwError, timeout } from 'rxjs';
import type { Synonym } from '../../../shared/models/synonym';
import { normalizePhrase } from '../../../shared/text/normalize-phrase';
import { toAppError } from '../../errors/app-error';
import { toSynonyms } from './datamuse.mapper';

export const DATAMUSE_WORDS_URL = 'https://api.datamuse.com/words';
export const MAX_SYNONYMS = 20;
export const REQUEST_TIMEOUT_MS = 8000;
/**
 * Datamuse answers 403 when the URL-encoded `ml` value is longer than this (measured: 190 → 200, 191 → 403).
 * Non-Latin letters take 6 encoded characters each, so a 5-word Ukrainian phrase can already exceed it.
 * Datamuse has no results for such text anyway, so the request is skipped instead of failing.
 */
export const MAX_ENCODED_QUERY_LENGTH = 190;

/**
 * Looks up words with a similar meaning (`ml=`), which works for single words and phrases.
 * Successful results are cached per normalized phrase; errors are never cached, so Retry hits the network.
 * Queries Datamuse would reject as too long are not sent and give an empty list.
 * Errors are emitted as `AppError`.
 */
@Injectable({ providedIn: 'root' })
export class DatamuseClient {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Synonym[]>();

  getSynonyms(phrase: string): Observable<Synonym[]> {
    const key = normalizePhrase(phrase);
    const cached = this.cache.get(key);
    if (cached) {
      return of(cached);
    }
    if (encodeURIComponent(key).length > MAX_ENCODED_QUERY_LENGTH) {
      return of([]);
    }

    const params = new HttpParams().set('ml', key).set('max', MAX_SYNONYMS);

    return this.http.get<unknown>(DATAMUSE_WORDS_URL, { params }).pipe(
      timeout({ first: REQUEST_TIMEOUT_MS }),
      map((response) => toSynonyms(response, key, MAX_SYNONYMS)),
      tap((synonyms) => this.cache.set(key, synonyms)),
      catchError((error: unknown) => throwError(() => toAppError(error))),
    );
  }
}
