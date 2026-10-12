import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { Synonym } from '../../../../shared/models/synonym';
import { UI_TEXT } from '../../../../shared/ui-text';
import type { SynonymsState } from '../../text-analyzer.models';
import { SynonymPanel } from './synonym-panel';

const TARGET = { start: 5, end: 10, text: 'happy' };

describe('SynonymPanel', () => {
  let fixture: ComponentFixture<SynonymPanel>;
  let element: HTMLElement;

  async function render(state: SynonymsState): Promise<void> {
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
  }

  function status(): string {
    return element.querySelector('[data-testid="synonyms-status"]')?.textContent?.trim() ?? '';
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll('button'));
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SynonymPanel);
    element = fixture.nativeElement as HTMLElement;
  });

  it('should explain what to do when idle', async () => {
    await render({ status: 'idle' });
    expect(status()).toBe(UI_TEXT.synonyms.idle);
    expect(buttons()).toHaveLength(0);
  });

  it('should show the phrase being looked up and mark the panel busy while loading', async () => {
    await render({ status: 'loading', target: TARGET });
    expect(status()).toBe(UI_TEXT.synonyms.loading('happy'));
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
  });

  it('should show a spinner and placeholder chips, hidden from screen readers, while loading', async () => {
    await render({ status: 'loading', target: TARGET });
    const skeleton = element.querySelector('[data-testid="synonyms-skeleton"]');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton?.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(element.querySelector('.spinner')?.getAttribute('aria-hidden')).toBe('true');
    expect(buttons()).toHaveLength(0);
  });

  it('should remove the loading placeholders once synonyms arrive', async () => {
    await render({ status: 'loading', target: TARGET });
    await render({ status: 'success', target: TARGET, synonyms: [{ text: 'glad' }] });
    expect(element.querySelector('[data-testid="synonyms-skeleton"]')).toBeNull();
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('false');
  });

  it('should list synonyms as buttons and say what will be replaced', async () => {
    await render({
      status: 'success',
      target: TARGET,
      synonyms: [{ text: 'glad' }, { text: 'pleased' }],
    });
    expect(status()).toBe(UI_TEXT.synonyms.found(2, 'happy'));
    expect(element.textContent).toContain(UI_TEXT.synonyms.replaceWith('happy'));
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['glad', 'pleased']);
  });

  it('should emit the picked synonym when its button is clicked', async () => {
    const picked: Synonym[] = [];
    fixture.componentInstance.pick.subscribe((synonym) => picked.push(synonym));
    await render({
      status: 'success',
      target: TARGET,
      synonyms: [{ text: 'glad' }, { text: 'pleased' }],
    });

    buttons()[1]?.click();

    expect(picked).toEqual([{ text: 'pleased' }]);
  });

  it('should show an empty state when nothing is found', async () => {
    await render({ status: 'success', target: TARGET, synonyms: [] });
    expect(status()).toBe(UI_TEXT.synonyms.empty('happy'));
    expect(element.querySelector('ul')).toBeNull();
  });

  it('should show the error message and a retry button that emits retry', async () => {
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => retries++);
    await render({
      status: 'error',
      target: TARGET,
      error: { kind: 'network', message: UI_TEXT.errors.network },
    });

    expect(status()).toBe(UI_TEXT.errors.network);
    buttons()[0]?.click();
    expect(retries).toBe(1);
  });

  it('should announce status changes politely', async () => {
    await render({ status: 'idle' });
    expect(element.querySelector('[data-testid="synonyms-status"]')?.getAttribute('role')).toBe(
      'status',
    );
  });
});
