import { TestBed } from '@angular/core/testing';
import { Observable, type Subscriber } from 'rxjs';
import { DatamuseClient } from '../../core/api/datamuse/datamuse.client';
import type { AppError } from '../../core/errors/app-error';
import type { Synonym } from '../../shared/models/synonym';
import { UI_TEXT } from '../../shared/ui-text';
import { TextAnalyzerStore } from './text-analyzer.store';

interface PendingLookup {
  readonly phrase: string;
  readonly subscriber: Subscriber<Synonym[]>;
  settled: boolean;
  cancelled: boolean;
}

/** Fake client: every call stays pending until the test resolves it. */
class FakeDatamuseClient {
  readonly lookups: PendingLookup[] = [];

  getSynonyms(phrase: string): Observable<Synonym[]> {
    return new Observable<Synonym[]>((subscriber) => {
      const lookup: PendingLookup = { phrase, subscriber, settled: false, cancelled: false };
      this.lookups.push(lookup);
      // Teardown runs on complete/error too; only an unsubscribe before settling is a cancellation.
      return () => {
        lookup.cancelled = !lookup.settled;
      };
    });
  }

  last(): PendingLookup {
    const lookup = this.lookups.at(-1);
    if (!lookup) {
      throw new Error('No lookup was made');
    }
    return lookup;
  }

  resolveLast(words: string[]): void {
    const lookup = this.last();
    lookup.settled = true;
    lookup.subscriber.next(words.map((text) => ({ text })));
    lookup.subscriber.complete();
  }

  failLast(error: AppError): void {
    const lookup = this.last();
    lookup.settled = true;
    lookup.subscriber.error(error);
  }
}

const SERVER_ERROR: AppError = { kind: 'server', message: UI_TEXT.errors.server };

describe('TextAnalyzerStore', () => {
  let store: TextAnalyzerStore;
  let datamuse: FakeDatamuseClient;

  beforeEach(() => {
    datamuse = new FakeDatamuseClient();
    TestBed.configureTestingModule({
      providers: [TextAnalyzerStore, { provide: DatamuseClient, useValue: datamuse }],
    });
    store = TestBed.inject(TextAnalyzerStore);
  });

  function typeAndSelect(text: string, fragment: string): void {
    store.setText(text);
    const start = text.indexOf(fragment);
    store.updateSelection(start, start + fragment.length);
  }

  describe('selection', () => {
    it('should report an empty selection initially', () => {
      expect(store.selectionCheck()).toEqual({ valid: false, reason: 'empty' });
    });

    it('should normalize the raw selection', () => {
      typeAndSelect('I am happy, really', ' happy, ');
      expect(store.selectionCheck()).toEqual({
        valid: true,
        selection: { start: 5, end: 10, text: 'happy' },
      });
    });
  });

  describe('findSynonyms', () => {
    it('should not call the API when the selection is invalid', () => {
      typeAndSelect('a !!! b', '!!!');
      store.findSynonyms();
      expect(datamuse.lookups).toHaveLength(0);
      expect(store.synonyms()).toEqual({ status: 'idle' });
    });

    it('should go from loading to success with the captured target', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();

      const target = { start: 5, end: 10, text: 'happy' };
      expect(datamuse.last().phrase).toBe('happy');
      expect(store.synonyms()).toEqual({ status: 'loading', target });

      datamuse.resolveLast(['glad', 'pleased']);
      expect(store.synonyms()).toEqual({
        status: 'success',
        target,
        synonyms: [{ text: 'glad' }, { text: 'pleased' }],
      });
    });

    it('should show an empty success state when nothing is found', () => {
      typeAndSelect('xqzwv', 'xqzwv');
      store.findSynonyms();
      datamuse.resolveLast([]);
      expect(store.synonyms()).toMatchObject({ status: 'success', synonyms: [] });
    });

    it('should go to the error state when the lookup fails', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      datamuse.failLast(SERVER_ERROR);

      expect(store.synonyms()).toEqual({
        status: 'error',
        target: { start: 5, end: 10, text: 'happy' },
        error: SERVER_ERROR,
      });
    });

    it('should cancel the previous lookup when a new phrase is looked up', () => {
      typeAndSelect('happy and sad', 'happy');
      store.findSynonyms();
      const first = datamuse.last();

      store.updateSelection(10, 13);
      store.findSynonyms();

      expect(first.cancelled).toBe(true);
      expect(store.synonyms()).toMatchObject({ status: 'loading', target: { text: 'sad' } });
    });

    it('should ignore a repeated click while the same selection is loading', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      store.findSynonyms();

      expect(datamuse.lookups).toHaveLength(1);
      expect(datamuse.last().cancelled).toBe(false);
    });
  });

  describe('retry', () => {
    it('should repeat the lookup for the same target after an error', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      datamuse.failLast(SERVER_ERROR);

      store.updateSelection(0, 0);
      store.retry();

      expect(datamuse.lookups).toHaveLength(2);
      expect(store.synonyms()).toMatchObject({ status: 'loading', target: { text: 'happy' } });
    });

    it('should do nothing when there is no error', () => {
      store.retry();
      expect(datamuse.lookups).toHaveLength(0);
    });
  });

  describe('setText', () => {
    it('should reset synonyms and cancel the lookup in flight', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      const lookup = datamuse.last();

      store.setText('I am happy!');

      expect(lookup.cancelled).toBe(true);
      expect(store.synonyms()).toEqual({ status: 'idle' });
    });
  });

  describe('replaceWith', () => {
    function findAndResolve(text: string, word: string, synonyms: string[]): void {
      typeAndSelect(text, word);
      store.findSynonyms();
      datamuse.resolveLast(synonyms);
    }

    it('should replace the target, keep its case and select the inserted word', () => {
      findAndResolve('Happy days are here', 'Happy', ['joyful']);

      const selection = store.replaceWith({ text: 'joyful' });

      expect(store.text()).toBe('Joyful days are here');
      expect(selection).toEqual({ start: 0, end: 6, text: 'Joyful' });
      expect(store.selectionCheck()).toMatchObject({ valid: true, selection: { text: 'Joyful' } });
      expect(store.synonyms()).toEqual({ status: 'idle' });
      expect(store.canUndo()).toBe(true);
    });

    it('should replace the captured target even if the user selected another word since', () => {
      findAndResolve('happy and sad', 'happy', ['glad']);
      store.updateSelection(10, 13);

      store.replaceWith({ text: 'glad' });

      expect(store.text()).toBe('glad and sad');
    });

    it('should do nothing when there are no synonyms to pick from', () => {
      typeAndSelect('I am happy', 'happy');
      expect(store.replaceWith({ text: 'glad' })).toBeNull();
      expect(store.text()).toBe('I am happy');
    });
  });

  describe('undo', () => {
    it('should restore the text and the original selection', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      datamuse.resolveLast(['overjoyed']);
      store.replaceWith({ text: 'overjoyed' });

      const selection = store.undo();

      expect(store.text()).toBe('I am happy');
      expect(selection).toEqual({ start: 5, end: 10, text: 'happy' });
      expect(store.canUndo()).toBe(false);
    });

    it('should not be available after the user edits the text', () => {
      typeAndSelect('I am happy', 'happy');
      store.findSynonyms();
      datamuse.resolveLast(['glad']);
      store.replaceWith({ text: 'glad' });

      store.setText('I am glad!');

      expect(store.canUndo()).toBe(false);
      expect(store.undo()).toBeNull();
      expect(store.text()).toBe('I am glad!');
    });
  });
});
