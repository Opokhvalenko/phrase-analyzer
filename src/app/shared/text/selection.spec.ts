import type { TextSelection } from './selection';
import {
  applyReplacement,
  MAX_PHRASE_LENGTH,
  MAX_PHRASE_WORDS,
  matchCase,
  normalizeSelection,
} from './selection';

/** Selects `fragment` (its first occurrence) inside `text`, like a user would. */
function select(text: string, fragment: string): [number, number] {
  const start = text.indexOf(fragment);
  if (start === -1) {
    throw new Error(`"${fragment}" not found in "${text}"`);
  }
  return [start, start + fragment.length];
}

function expectPhrase(text: string, fragment: string, phrase: string): void {
  const [start, end] = select(text, fragment);
  const check = normalizeSelection(text, start, end);
  expect(check).toEqual({
    valid: true,
    selection: {
      start: text.indexOf(phrase),
      end: text.indexOf(phrase) + phrase.length,
      text: phrase,
    },
  });
}

describe('normalizeSelection', () => {
  it('should be invalid with reason "empty" when nothing is selected', () => {
    expect(normalizeSelection('happy', 2, 2)).toEqual({ valid: false, reason: 'empty' });
  });

  it('should return the selected word as is when it is selected exactly', () => {
    expectPhrase('I am happy today', 'happy', 'happy');
  });

  it.each([
    ['  happy  ', 'leading and trailing spaces'],
    [' happy, ', 'spaces and a comma'],
    ['"happy"', 'quotes'],
  ])('should trim %j (%s) to the word itself', (fragment) => {
    expectPhrase(`I am${fragment}today`, fragment, 'happy');
  });

  it('should expand a partial word to the whole word when the selection starts inside it', () => {
    expectPhrase('I am happy today', 'ppy', 'happy');
  });

  it('should expand a partial word to the whole word when the selection ends inside it', () => {
    expectPhrase('I am happy today', 'hap', 'happy');
  });

  it('should expand both edges of a phrase to whole words', () => {
    expectPhrase('I am very happy today', 'ery hap', 'very happy');
  });

  it('should expand to a whole word at the very start and end of the text', () => {
    expectPhrase('happy', 'app', 'happy');
  });

  it("should keep apostrophes and hyphens inside words (don't, well-known)", () => {
    expectPhrase("I don't know", "don'", "don't");
    expectPhrase('a well-known fact', 'well', 'well-known');
  });

  it('should allow a selection across lines when it has few enough words', () => {
    expectPhrase('very\nhappy', 'very\nhappy', 'very\nhappy');
  });

  it('should compute correct UTF-16 offsets next to an emoji', () => {
    const text = '👍happy';
    expect(normalizeSelection(text, 0, text.length)).toEqual({
      valid: true,
      selection: { start: 2, end: 7, text: 'happy' },
    });
  });

  it('should work with Ukrainian text', () => {
    expectPhrase('Я дуже щасливий', 'щасл', 'щасливий');
  });

  it.each([
    '!!!',
    ' , ',
    '123',
    '2026 42',
  ])('should be invalid with reason "no-letters" when the selection is %j', (fragment) => {
    const text = `a ${fragment} b`;
    const [start, end] = select(text, fragment);
    expect(normalizeSelection(text, start, end)).toEqual({ valid: false, reason: 'no-letters' });
  });

  it(`should accept exactly ${MAX_PHRASE_WORDS} words`, () => {
    const text = 'one two three four five';
    expect(normalizeSelection(text, 0, text.length).valid).toBe(true);
  });

  it(`should be invalid with reason "too-long" when more than ${MAX_PHRASE_WORDS} words are selected`, () => {
    const text = 'one two three four five six';
    expect(normalizeSelection(text, 0, text.length)).toEqual({ valid: false, reason: 'too-long' });
  });

  it(`should accept a phrase of exactly ${MAX_PHRASE_LENGTH} characters`, () => {
    const text = 'a'.repeat(MAX_PHRASE_LENGTH);
    expect(normalizeSelection(text, 0, text.length).valid).toBe(true);
  });

  it('should accept five long words (a real phrase of 83 characters)', () => {
    const text =
      'extraordinarily overwhelming responsibilities internationalization misunderstanding';
    expect(normalizeSelection(text, 0, text.length).valid).toBe(true);
  });

  it('should measure the length after collapsing whitespace, as it is sent to the API', () => {
    const text = `very${' '.repeat(MAX_PHRASE_LENGTH)}happy`;
    expect(normalizeSelection(text, 0, text.length)).toMatchObject({
      valid: true,
      selection: { text },
    });
  });

  it(`should be invalid with reason "too-many-characters" when one word is longer than ${MAX_PHRASE_LENGTH} characters`, () => {
    const text = `see ${'a'.repeat(MAX_PHRASE_LENGTH + 1)} here`;
    const [start, end] = select(text, 'a'.repeat(MAX_PHRASE_LENGTH + 1));
    expect(normalizeSelection(text, start, end)).toEqual({
      valid: false,
      reason: 'too-many-characters',
    });
  });

  it('should handle a backwards selection (start > end)', () => {
    const text = 'I am happy';
    expect(normalizeSelection(text, text.length, 5)).toEqual({
      valid: true,
      selection: { start: 5, end: 10, text: 'happy' },
    });
  });
});

describe('matchCase', () => {
  it.each([
    ['happy', 'pleased', 'pleased'],
    ['Happy', 'pleased', 'Pleased'],
    ['HAPPY', 'pleased', 'PLEASED'],
    ['I', 'me', 'Me'],
    ['iPhone', 'smartphone', 'smartphone'],
    ['Very happy', 'elated', 'Elated'],
    ['VERY HAPPY', 'over the moon', 'OVER THE MOON'],
    ['Щасливий', 'радісний', 'Радісний'],
    ['happy', 'Pleased', 'Pleased'],
  ])('should turn %j + %j into %j', (source, replacement, expected) => {
    expect(matchCase(source, replacement)).toBe(expected);
  });
});

describe('applyReplacement', () => {
  const target = (text: string, word: string): TextSelection => {
    const start = text.indexOf(word);
    return { start, end: start + word.length, text: word };
  };

  it.each([
    ['happy days', 'happy', 'glad', 'glad days'],
    ['so happy today', 'happy', 'glad', 'so glad today'],
    ['I am happy', 'happy', 'glad', 'I am glad'],
    ['I am happy!', 'happy', 'overjoyed', 'I am overjoyed!'],
    ['Happy days', 'Happy', 'glad', 'Glad days'],
  ])('should replace in %j: %j → %j', (text, word, replacement, expected) => {
    expect(applyReplacement(text, target(text, word), replacement)?.text).toBe(expected);
  });

  it('should select the inserted word after replacement', () => {
    const text = 'I am happy today';
    const result = applyReplacement(text, target(text, 'happy'), 'overjoyed');
    expect(result?.selection).toEqual({ start: 5, end: 14, text: 'overjoyed' });
    expect(result?.text.slice(5, 14)).toBe('overjoyed');
  });

  it('should keep surrounding punctuation and line breaks untouched', () => {
    const text = 'Well,\nhappy, really.';
    expect(applyReplacement(text, target(text, 'happy'), 'glad')?.text).toBe(
      'Well,\nglad, really.',
    );
  });

  it('should return null when the text at the target has changed', () => {
    const stale: TextSelection = { start: 5, end: 10, text: 'happy' };
    expect(applyReplacement('I am sadly here', stale, 'glad')).toBeNull();
  });
});
