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
 * Looks up words with a similar meaning (`ml=`), which works for single words and phrases.
 * Successful results are cached per normalized phrase; errors are never cached, so Retry hits the network.
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

    const params = new HttpParams().set('ml', key).set('max', MAX_SYNONYMS);

    return this.http.get<unknown>(DATAMUSE_WORDS_URL, { params }).pipe(
      timeout({ first: REQUEST_TIMEOUT_MS }),
      map((response) => toSynonyms(response, key, MAX_SYNONYMS)),
      tap((synonyms) => this.cache.set(key, synonyms)),
      catchError((error: unknown) => throwError(() => toAppError(error))),
    );
  }
}
