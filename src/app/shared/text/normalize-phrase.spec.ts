import { normalizePhrase } from './normalize-phrase';

describe('normalizePhrase', () => {
  it.each([
    ['happy', 'happy'],
    ['Happy', 'happy'],
    ['  Very\n\tHappy  ', 'very happy'],
  ])('should normalize %j to %j', (phrase, expected) => {
    expect(normalizePhrase(phrase)).toBe(expected);
  });
});
