import { InvalidDatamuseResponseError, toSynonyms } from './datamuse.mapper';

const LIMIT = 20;

describe('toSynonyms', () => {
  it('should map words in the order Datamuse returns them', () => {
    const response = [
      { word: 'pleased', score: 3 },
      { word: 'glad', score: 2 },
    ];
    expect(toSynonyms(response, 'happy', LIMIT)).toEqual([{ text: 'pleased' }, { text: 'glad' }]);
  });

  it('should drop the looked-up phrase itself, ignoring case and spacing', () => {
    const response = [{ word: 'Very  happy' }, { word: 'elated' }];
    expect(toSynonyms(response, 'very happy', LIMIT)).toEqual([{ text: 'elated' }]);
  });

  it('should drop duplicates, ignoring case', () => {
    const response = [{ word: 'glad' }, { word: 'Glad' }, { word: 'glad' }];
    expect(toSynonyms(response, 'happy', LIMIT)).toEqual([{ text: 'glad' }]);
  });

  it('should skip malformed and empty items', () => {
    const response = [null, 42, { score: 1 }, { word: 7 }, { word: '  ' }, { word: 'glad' }];
    expect(toSynonyms(response, 'happy', LIMIT)).toEqual([{ text: 'glad' }]);
  });

  it('should return at most `limit` synonyms', () => {
    const response = Array.from({ length: 30 }, (_, index) => ({ word: `word${index}` }));
    expect(toSynonyms(response, 'happy', LIMIT)).toHaveLength(LIMIT);
  });

  it('should return an empty list when Datamuse finds nothing', () => {
    expect(toSynonyms([], 'xqzwv', LIMIT)).toEqual([]);
  });

  it('should throw when the response is not an array', () => {
    expect(() => toSynonyms({ error: 'nope' }, 'happy', LIMIT)).toThrow(
      InvalidDatamuseResponseError,
    );
  });
});
