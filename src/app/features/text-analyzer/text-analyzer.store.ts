import { computed, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { catchError, EMPTY, map, of, Subject, startWith, switchMap } from 'rxjs';
import { DatamuseClient } from '../../core/api/datamuse/datamuse.client';
import { toAppError } from '../../core/errors/app-error';
import type { Synonym } from '../../shared/models/synonym';
import type { TextSelection } from '../../shared/text/selection';
import { applyReplacement, normalizeSelection } from '../../shared/text/selection';
import type { SynonymsState, UndoSnapshot } from './text-analyzer.models';

const IDLE: SynonymsState = { status: 'idle' };

/**
 * State of the analyzer page. Provided by the page component (not in root),
 * so it lives and dies with the page and every test gets a fresh instance.
 */
@Injectable()
export class TextAnalyzerStore {
  private readonly datamuse = inject(DatamuseClient);

  /** `null` cancels the request in flight (switchMap drops the previous inner observable). */
  private readonly lookups$ = new Subject<TextSelection | null>();

  private readonly textSignal = signal('');
  private readonly rawSelection = signal({ start: 0, end: 0 });
  private readonly synonymsSignal = signal<SynonymsState>(IDLE);
  private readonly undoSignal = signal<UndoSnapshot | null>(null);

  readonly text = this.textSignal.asReadonly();
  readonly synonyms = this.synonymsSignal.asReadonly();
  readonly selectionCheck = computed(() => {
    const { start, end } = this.rawSelection();
    return normalizeSelection(this.textSignal(), start, end);
  });
  readonly canUndo = computed(() => this.undoSignal() !== null);

  constructor() {
    this.lookups$
      .pipe(
        switchMap((target) => (target ? this.lookup(target) : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.synonymsSignal.set(state));
  }

  /** Any edit invalidates the synonyms (they belong to the old text) and the undo step. */
  setText(text: string): void {
    this.textSignal.set(text);
    this.undoSignal.set(null);
    this.resetSynonyms();
  }

  updateSelection(start: number, end: number): void {
    this.rawSelection.set({ start, end });
  }

  findSynonyms(): void {
    const check = this.selectionCheck();
    if (!check.valid || this.isLoading(check.selection)) {
      return;
    }
    this.lookups$.next(check.selection);
  }

  retry(): void {
    const state = this.synonymsSignal();
    if (state.status === 'error') {
      this.lookups$.next(state.target);
    }
  }

  /** Returns the new selection (the inserted word) for the view to apply, or `null` if nothing changed. */
  replaceWith(synonym: Synonym): TextSelection | null {
    const state = this.synonymsSignal();
    if (state.status !== 'success') {
      return null;
    }

    const previousText = this.textSignal();
    const result = applyReplacement(previousText, state.target, synonym.text);
    this.resetSynonyms();
    if (!result) {
      return null;
    }

    this.textSignal.set(result.text);
    this.undoSignal.set({ text: previousText, selection: state.target });
    this.updateSelection(result.selection.start, result.selection.end);
    return result.selection;
  }

  /** Restores the text before the last replacement; returns the restored selection. */
  undo(): TextSelection | null {
    const snapshot = this.undoSignal();
    if (!snapshot) {
      return null;
    }

    this.textSignal.set(snapshot.text);
    this.undoSignal.set(null);
    this.resetSynonyms();
    this.updateSelection(snapshot.selection.start, snapshot.selection.end);
    return snapshot.selection;
  }

  private lookup(target: TextSelection): Observable<SynonymsState> {
    return this.datamuse.getSynonyms(target.text).pipe(
      map((synonyms): SynonymsState => ({ status: 'success', target, synonyms })),
      catchError((error: unknown) =>
        of<SynonymsState>({ status: 'error', target, error: toAppError(error) }),
      ),
      startWith<SynonymsState>({ status: 'loading', target }),
    );
  }

  private isLoading(selection: TextSelection): boolean {
    const state = this.synonymsSignal();
    return (
      state.status === 'loading' &&
      state.target.start === selection.start &&
      state.target.end === selection.end
    );
  }

  private resetSynonyms(): void {
    this.lookups$.next(null);
    this.synonymsSignal.set(IDLE);
  }
}
