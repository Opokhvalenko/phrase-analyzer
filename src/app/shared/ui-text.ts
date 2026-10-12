export const UI_TEXT = {
  appTitle: 'Phrase Analyzer',
  appTagline: 'Count words, find synonyms and replace them right in your text.',
  errors: {
    network: "Can't reach the synonym service. Check your connection and try again.",
    timeout: 'The synonym service is taking too long. Try again.',
    server: 'The synonym service is unavailable right now. Try again later.',
    unknown: 'Something went wrong. Try again.',
  },
} as const;
