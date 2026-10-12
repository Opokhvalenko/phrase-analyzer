import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { DatamuseClient } from '../../core/api/datamuse/datamuse.client';
import { ClipboardService } from '../../core/clipboard/clipboard.service';
import type { AppError } from '../../core/errors/app-error';
import type { Synonym } from '../../shared/models/synonym';
import { MAX_PHRASE_LENGTH, MAX_PHRASE_WORDS } from '../../shared/text/selection';
import { UI_TEXT } from '../../shared/ui-text';
import { FEEDBACK_DURATION_MS, TextAnalyzerPage } from './text-analyzer.page';

const SERVER_ERROR: AppError = { kind: 'server', message: UI_TEXT.errors.server };

describe('TextAnalyzerPage', () => {
  let fixture: ComponentFixture<TextAnalyzerPage>;
  let page: HTMLElement;
  let lookup: (phrase: string) => Observable<Synonym[]>;
  let clipboardCopy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    lookup = () => of([{ text: 'glad' }, { text: 'pleased' }]);
    clipboardCopy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: DatamuseClient, useValue: { getSynonyms: (phrase: string) => lookup(phrase) } },
        { provide: ClipboardService, useValue: { copy: clipboardCopy } },
      ],
    });
    fixture = TestBed.createComponent(TextAnalyzerPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const byTestId = <T extends HTMLElement>(id: string): T | null =>
    page.querySelector<T>(`[data-testid="${id}"]`);
  const editor = (): HTMLTextAreaElement =>
    byTestId<HTMLTextAreaElement>('editor') as HTMLTextAreaElement;
  const findButton = (): HTMLButtonElement =>
    byTestId<HTMLButtonElement>('find-synonyms') as HTMLButtonElement;
  const textOf = (id: string): string => byTestId(id)?.textContent?.trim() ?? '';
  const synonymButtons = (): HTMLButtonElement[] => Array.from(page.querySelectorAll('.chip'));

  async function type(text: string): Promise<void> {
    editor().value = text;
    editor().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function select(fragment: string): Promise<void> {
    const start = editor().value.indexOf(fragment);
    editor().setSelectionRange(start, start + fragment.length);
    editor().dispatchEvent(new Event('select'));
    await fixture.whenStable();
  }

  async function click(button: HTMLButtonElement | null | undefined): Promise<void> {
    button?.click();
    await fixture.whenStable();
  }

  it('should have a labelled textarea described by the selection hint', () => {
    const label = page.querySelector(`label[for="${editor().id}"]`);
    expect(label?.textContent?.trim()).toBe(UI_TEXT.editor.label);
    expect(editor().getAttribute('aria-describedby')).toBe('selection-hint');
  });

  it('should disable "Find synonyms" and explain why when nothing is selected', async () => {
    await type('I am happy');
    expect(findButton().disabled).toBe(true);
    expect(textOf('selection-hint')).toBe(UI_TEXT.selectionHint.empty);
  });

  it('should explain why a too long selection cannot be looked up', async () => {
    await type('one two three four five six');
    await select('one two three four five six');
    expect(findButton().disabled).toBe(true);
    expect(textOf('selection-hint')).toBe(UI_TEXT.selectionHint.tooLong(MAX_PHRASE_WORDS));
  });

  it('should explain why a selection with too many characters cannot be looked up', async () => {
    const pasted = 'x'.repeat(MAX_PHRASE_LENGTH + 1);
    await type(`see ${pasted}`);
    await select(pasted);
    expect(findButton().disabled).toBe(true);
    expect(textOf('selection-hint')).toBe(
      UI_TEXT.selectionHint.tooManyCharacters(MAX_PHRASE_LENGTH),
    );
  });

  it('should update the counters while typing', async () => {
    await type('Hello brave new world');
    expect(textOf('stat-words')).toBe('4');
    expect(textOf('stat-characters')).toBe('21');
  });

  it('should look up the selected word and list the synonyms', async () => {
    const phrases: string[] = [];
    lookup = (phrase) => {
      phrases.push(phrase);
      return of([{ text: 'glad' }]);
    };
    await type('I am happy today');
    await select('app');

    expect(findButton().disabled).toBe(false);
    await click(findButton());

    expect(phrases).toEqual(['happy']);
    expect(synonymButtons().map((button) => button.textContent?.trim())).toEqual(['glad']);
  });

  it('should look up with Ctrl+Enter and not insert a line break', async () => {
    await type('I am happy');
    await select('happy');

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true });
    editor().dispatchEvent(event);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(synonymButtons()).toHaveLength(2);
  });

  it('should replace the selection, keep its case, select the new word and announce it', async () => {
    await type('Happy days are here');
    await select('Happy');
    await click(findButton());

    await click(synonymButtons()[1]);

    expect(editor().value).toBe('Pleased days are here');
    expect(editor().value.slice(editor().selectionStart, editor().selectionEnd)).toBe('Pleased');
    expect(document.activeElement).toBe(editor());
    expect(textOf('feedback')).toBe(UI_TEXT.feedback.replaced('Happy', 'Pleased'));
  });

  it('should undo the last replacement', async () => {
    await type('I am happy');
    await select('happy');
    await click(findButton());
    await click(synonymButtons()[0]);

    await click(byTestId<HTMLButtonElement>('undo'));

    expect(editor().value).toBe('I am happy');
    expect(editor().value.slice(editor().selectionStart, editor().selectionEnd)).toBe('happy');
    expect(byTestId('undo')).toBeNull();
    expect(textOf('feedback')).toBe(UI_TEXT.feedback.undone);
  });

  it('should hide the synonyms when the text is edited', async () => {
    await type('I am happy');
    await select('happy');
    await click(findButton());

    await type('I am happy!');

    expect(synonymButtons()).toHaveLength(0);
    expect(textOf('synonyms-status')).toBe(UI_TEXT.synonyms.idle);
  });

  it('should show the error and retry the lookup', async () => {
    let calls = 0;
    lookup = () => {
      calls++;
      return calls === 1 ? throwError(() => SERVER_ERROR) : of([{ text: 'glad' }]);
    };
    await type('I am happy');
    await select('happy');
    await click(findButton());
    expect(textOf('synonyms-status')).toBe(UI_TEXT.errors.server);

    await click(page.querySelector<HTMLButtonElement>('app-synonym-panel button'));

    expect(calls).toBe(2);
    expect(synonymButtons()).toHaveLength(1);
  });

  describe('copy', () => {
    it('should be disabled when the text is empty', () => {
      expect(byTestId<HTMLButtonElement>('copy')?.disabled).toBe(true);
    });

    it('should copy the whole text and confirm it for a short time', async () => {
      await type('Copy me, please');
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      byTestId<HTMLButtonElement>('copy')?.click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      expect(clipboardCopy).toHaveBeenCalledWith('Copy me, please');
      expect(textOf('feedback')).toBe(UI_TEXT.feedback.copied);

      await vi.advanceTimersByTimeAsync(FEEDBACK_DURATION_MS);
      fixture.detectChanges();
      expect(textOf('feedback')).toBe('');
    });

    it('should tell the user when copying fails', async () => {
      clipboardCopy.mockRejectedValue(new Error('denied'));
      await type('Copy me');
      await click(byTestId<HTMLButtonElement>('copy'));
      await vi.waitFor(() => expect(textOf('feedback')).toBe(UI_TEXT.feedback.copyFailed));
    });
  });
});
