import { countCharacters, countCharactersWithoutSpaces, countWords } from './text-stats';

describe('countCharacters', () => {
  it.each([
    ['', 0],
    ['   ', 3],
    ['\n\n', 2],
    ['Hello, world!', 13],
    ['Привіт', 6],
  ])('should count %j as %i characters', (text, expected) => {
    expect(countCharacters(text)).toBe(expected);
  });

  it('should count an emoji with a skin tone as one character', () => {
    expect(countCharacters('👍🏽')).toBe(1);
  });

  it('should count a letter with a combining accent as one character', () => {
    expect(countCharacters('é')).toBe(1);
  });
});

describe('countCharactersWithoutSpaces', () => {
  it('should ignore spaces, tabs and line breaks', () => {
    expect(countCharactersWithoutSpaces(' a b\tc\nd ')).toBe(4);
  });

  it('should return 0 when text is only whitespace', () => {
    expect(countCharactersWithoutSpaces(' \n\t ')).toBe(0);
  });
});

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['\n\n', 0],
    ['Hello, world!', 2],
    ["don't stop", 2],
    ['well-known', 1],
    ['Привіт, світе', 2],
    ['мʼята і м’ята', 3],
    ['2026 рік', 2],
    ['one\ttwo\nthree', 3],
    ['— !!! ...', 0],
    ['café', 1],
    ['café au lait', 3],
  ])('should count %j as %i words', (text, expected) => {
    expect(countWords(text)).toBe(expected);
  });

  it('should treat a leading or trailing hyphen as punctuation, not part of a word', () => {
    expect(countWords('-start end-')).toBe(2);
  });
});
