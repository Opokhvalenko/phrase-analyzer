import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  Injector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ClipboardService } from '../../core/clipboard/clipboard.service';
import type { Synonym } from '../../shared/models/synonym';
import type { TextSelection } from '../../shared/text/selection';
import { MAX_PHRASE_LENGTH, MAX_PHRASE_WORDS } from '../../shared/text/selection';
import { UI_TEXT } from '../../shared/ui-text';
import { SynonymPanel } from './components/synonym-panel/synonym-panel';
import { TextStats } from './components/text-stats/text-stats';
import { TextAnalyzerStore } from './text-analyzer.store';

export const FEEDBACK_DURATION_MS = 2000;

@Component({
  selector: 'app-text-analyzer-page',
  imports: [TextStats, SynonymPanel],
  providers: [TextAnalyzerStore],
  templateUrl: './text-analyzer.page.html',
  styleUrl: './text-analyzer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Ctrl/⌘+Enter works wherever focus is (also on a synonym or the Copy button), matching aria-keyshortcuts.
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class TextAnalyzerPage {
  protected readonly store = inject(TextAnalyzerStore);
  private readonly clipboard = inject(ClipboardService);
  private readonly injector = inject(Injector);
  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('editor');

  protected readonly labels = UI_TEXT.editor;
  protected readonly feedback = signal('');
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly canFind = computed(() => this.store.selectionCheck().valid);
  protected readonly canCopy = computed(() => this.store.text().length > 0);

  protected readonly selectionHint = computed(() => {
    const check = this.store.selectionCheck();
    if (check.valid) {
      return UI_TEXT.selectionHint.ready(check.selection.text);
    }
    switch (check.reason) {
      case 'empty':
        return UI_TEXT.selectionHint.empty;
      case 'no-letters':
        return UI_TEXT.selectionHint.noLetters;
      case 'too-many-words':
        return UI_TEXT.selectionHint.tooManyWords(MAX_PHRASE_WORDS);
      case 'too-many-characters':
        return UI_TEXT.selectionHint.tooManyCharacters(MAX_PHRASE_LENGTH);
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.feedbackTimer));
  }

  protected onInput(): void {
    this.store.setText(this.textarea().nativeElement.value);
    this.syncSelection();
  }

  protected syncSelection(): void {
    const { selectionStart, selectionEnd } = this.textarea().nativeElement;
    this.store.updateSelection(selectionStart, selectionEnd);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.repeat) {
      event.preventDefault();
      this.store.findSynonyms();
    }
  }

  protected findSynonyms(): void {
    this.store.findSynonyms();
  }

  protected retry(): void {
    this.store.retry();
  }

  protected replaceWith(synonym: Synonym): void {
    const state = this.store.synonyms();
    const selection = this.store.replaceWith(synonym);
    if (selection && state.status === 'success') {
      this.showFeedback(UI_TEXT.feedback.replaced(state.target.text, selection.text));
      this.selectInEditor(selection);
    }
  }

  protected undo(): void {
    const selection = this.store.undo();
    if (selection) {
      this.showFeedback(UI_TEXT.feedback.undone);
      this.selectInEditor(selection);
    }
  }

  protected async copy(): Promise<void> {
    try {
      await this.clipboard.copy(this.store.text());
      this.showFeedback(UI_TEXT.feedback.copied);
    } catch {
      this.showFeedback(UI_TEXT.feedback.copyFailed);
    }
  }

  /** Runs after Angular has written the new text into the textarea, otherwise the range would be lost. */
  private selectInEditor(selection: TextSelection): void {
    afterNextRender(
      () => {
        const element = this.textarea().nativeElement;
        element.focus();
        element.setSelectionRange(selection.start, selection.end);
      },
      { injector: this.injector },
    );
  }

  private showFeedback(message: string): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set(message);
    this.feedbackTimer = setTimeout(() => this.feedback.set(''), FEEDBACK_DURATION_MS);
  }
}
