export const UI_TEXT = {
  appTitle: 'Phrase Analyzer',
  appTagline: 'Count words, find synonyms and replace them right in your text.',
  footer: {
    dataSource: 'Synonyms by',
    datamuse: 'Datamuse API',
    sourceCode: 'Source code on GitHub',
  },
  editor: {
    label: 'Your text',
    placeholder: 'Type or paste English text, then select a word or phrase…',
    findSynonyms: 'Find synonyms',
    shortcut: 'Ctrl / ⌘ + Enter',
    copy: 'Copy text',
    undo: 'Undo replacement',
  },
  selectionHint: {
    empty: 'Select a word or phrase in the text to find synonyms.',
    noLetters: 'The selection has no letters. Select a word or phrase.',
    tooLong: (maxWords: number): string => `Select up to ${maxWords} words.`,
    ready: (phrase: string): string => `Ready to find synonyms for “${phrase}”.`,
  },
  stats: {
    characters: 'Characters',
    charactersWithoutSpaces: 'Without spaces',
    words: 'Words',
  },
  synonyms: {
    title: 'Synonyms and similar words',
    idle: 'Select a word or phrase and press “Find synonyms”.',
    loading: (phrase: string): string => `Looking up “${phrase}”…`,
    replaceWith: (phrase: string): string => `Replace “${phrase}” with:`,
    found: (count: number, phrase: string): string =>
      `${count} ${count === 1 ? 'word' : 'words'} found for “${phrase}”.`,
    empty: (phrase: string): string =>
      `No synonyms found for “${phrase}”. The service supports English only.`,
    retry: 'Try again',
  },
  feedback: {
    copied: 'Text copied to the clipboard.',
    copyFailed: "Couldn't copy the text. Select it and press Ctrl / ⌘ + C instead.",
    replaced: (from: string, to: string): string => `Replaced “${from}” with “${to}”.`,
    undone: 'Replacement undone.',
  },
  errors: {
    network: "Can't reach the synonym service. Check your connection and try again.",
    timeout: 'The synonym service is taking too long. Try again.',
    server: 'The synonym service is unavailable right now. Try again later.',
    unknown: 'Something went wrong. Try again.',
  },
} as const;
