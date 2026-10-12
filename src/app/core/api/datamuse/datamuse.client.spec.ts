import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Synonym } from '../../../shared/models/synonym';
import type { AppError } from '../../errors/app-error';
import {
  DATAMUSE_WORDS_URL,
  DatamuseClient,
  MAX_ENCODED_QUERY_LENGTH,
  MAX_SYNONYMS,
  REQUEST_TIMEOUT_MS,
} from './datamuse.client';

describe('DatamuseClient', () => {
  let client: DatamuseClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(DatamuseClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Always clean up, so one failed verify() does not break every following test.
    try {
      http.verify();
    } finally {
      vi.useRealTimers();
      TestBed.resetTestingModule();
    }
  });

  function collect(phrase: string): { result: Synonym[] | null; error: AppError | null } {
    const outcome: { result: Synonym[] | null; error: AppError | null } = {
      result: null,
      error: null,
    };
    client.getSynonyms(phrase).subscribe({
      next: (synonyms) => {
        outcome.result = synonyms;
      },
      error: (error: AppError) => {
        outcome.error = error;
      },
    });
    return outcome;
  }

  function expectLookup(ml: string) {
    return http.expectOne(
      (request) =>
        request.url === DATAMUSE_WORDS_URL &&
        request.params.get('ml') === ml &&
        request.params.get('max') === String(MAX_SYNONYMS),
    );
  }

  it('should request "means like" words and map the response', () => {
    const outcome = collect('happy');
    const request = expectLookup('happy');
    expect(request.request.method).toBe('GET');
    request.flush([{ word: 'pleased', score: 1 }, { word: 'happy' }]);

    expect(outcome.result).toEqual([{ text: 'pleased' }]);
  });

  it('should encode a phrase with spaces and special characters', () => {
    collect('rock & roll #1');
    const request = expectLookup('rock & roll #1');
    expect(request.request.urlWithParams).toContain('ml=rock%20%26%20roll%20%231');
    request.flush([]);
  });

  it('should send a query whose encoded length is exactly at the Datamuse limit', () => {
    const phrase = 'a'.repeat(MAX_ENCODED_QUERY_LENGTH);
    collect(phrase);
    expectLookup(phrase).flush([]);
  });

  it('should not send a query Datamuse would reject as too long and return no synonyms', () => {
    const outcome = collect('a'.repeat(MAX_ENCODED_QUERY_LENGTH + 1));
    http.expectNone(() => true);
    expect(outcome).toEqual({ result: [], error: null });
  });

  it('should not send a five-word Ukrainian phrase whose encoded form is too long (measured: 403)', () => {
    const outcome = collect('дуже щасливий сьогодні вранці друже');
    http.expectNone(() => true);
    expect(outcome.result).toEqual([]);
  });

  it('should serve a repeated lookup from the cache, ignoring case and spacing', () => {
    collect('happy');
    expectLookup('happy').flush([{ word: 'glad' }]);

    const outcome = collect('  Happy ');
    http.expectNone(DATAMUSE_WORDS_URL);
    expect(outcome.result).toEqual([{ text: 'glad' }]);
  });

  it('should emit an AppError of kind "network" when the request fails without a status', () => {
    const outcome = collect('happy');
    expectLookup('happy').error(new ProgressEvent('error'));

    expect(outcome.error?.kind).toBe('network');
  });

  it('should emit an AppError of kind "server" on a 5xx response', () => {
    const outcome = collect('happy');
    expectLookup('happy').flush('Down', { status: 503, statusText: 'Service Unavailable' });

    expect(outcome.error?.kind).toBe('server');
  });

  it('should emit an AppError of kind "unknown" when the response is not an array', () => {
    const outcome = collect('happy');
    expectLookup('happy').flush({ unexpected: true });

    expect(outcome.error?.kind).toBe('unknown');
  });

  it('should emit an AppError of kind "timeout" when the service does not answer in time', () => {
    vi.useFakeTimers();
    const outcome = collect('happy');
    const request = expectLookup('happy');

    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS);

    expect(outcome.error?.kind).toBe('timeout');
    expect(request.cancelled).toBe(true);
  });

  it('should not cache errors, so a retry goes to the network', () => {
    collect('happy');
    expectLookup('happy').flush('Down', { status: 500, statusText: 'Server Error' });

    const outcome = collect('happy');
    expectLookup('happy').flush([{ word: 'glad' }]);
    expect(outcome.result).toEqual([{ text: 'glad' }]);
  });
});
