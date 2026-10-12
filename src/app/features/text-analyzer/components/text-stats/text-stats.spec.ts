import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TextStats } from './text-stats';

describe('TextStats', () => {
  let fixture: ComponentFixture<TextStats>;

  function stat(name: string): string {
    const element = (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="stat-${name}"]`,
    );
    return element?.textContent?.trim() ?? '';
  }

  async function render(text: string): Promise<void> {
    fixture.componentRef.setInput('text', text);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TextStats);
  });

  it('should show zeros for empty text', async () => {
    await render('');
    expect([stat('characters'), stat('characters-without-spaces'), stat('words')]).toEqual([
      '0',
      '0',
      '0',
    ]);
  });

  it('should show characters, characters without spaces and words', async () => {
    await render('Hello, world! 👍');
    expect([stat('characters'), stat('characters-without-spaces'), stat('words')]).toEqual([
      '15',
      '13',
      '2',
    ]);
  });

  it('should update when the text changes', async () => {
    await render('one');
    await render('one two three');
    expect(stat('words')).toBe('3');
  });
});
