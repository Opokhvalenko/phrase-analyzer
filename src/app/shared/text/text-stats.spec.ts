import { countCharacters, countWords } from './text-stats';

describe('countCharacters', () => {
  it.each([
    ['', 0, 0],
    ['   ', 3, 0],
    ['\n\n', 2, 0],
    [' a b\tc\nd ', 9, 4],
    ['Hello, world!', 13, 12],
  ])('should count %j (plain ASCII) as %i total, %i without spaces', (text, total, withoutSpaces) => {
    expect(countCharacters(text)).toEqual({ total, withoutSpaces });
  });

  it.each([
    ['Привіт', 6, 6],
    ['Привіт, світе', 13, 12],
    ['👍🏽', 1, 1],
    ['é', 1, 1],
    ['café au lait', 12, 10],
    ['a b', 3, 2],
    ['line\r\nbreak', 10, 9],
  ])('should count %j (non-ASCII) as %i total, %i without spaces', (text, total, withoutSpaces) => {
    expect(countCharacters(text)).toEqual({ total, withoutSpaces });
  });

  it('should give the same result on the fast and the segmenter path for ASCII text', () => {
    const ascii = 'Same text, same\tcount!\n';
    const withEmoji = `${ascii}👍`;
    expect(countCharacters(withEmoji)).toEqual({
      total: countCharacters(ascii).total + 1,
      withoutSpaces: countCharacters(ascii).withoutSpaces + 1,
    });
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
