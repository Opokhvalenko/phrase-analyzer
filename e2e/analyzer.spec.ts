import type { Locator, Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** Every Datamuse request is answered by the test, so the suite never depends on the real API. */
const DATAMUSE_URL = 'https://api.datamuse.com/words**';

type DatamuseHandler = (route: Route, phrase: string) => Promise<void>;

async function mockDatamuse(page: Page, handler: DatamuseHandler): Promise<string[]> {
  const phrases: string[] = [];
  await page.route(DATAMUSE_URL, async (route) => {
    const phrase = new URL(route.request().url()).searchParams.get('ml') ?? '';
    phrases.push(phrase);
    await handler(route, phrase);
  });
  return phrases;
}

const respondWith = (words: string[]): DatamuseHandler => {
  return (route) => route.fulfill({ json: words.map((word) => ({ word, tags: ['syn'] })) });
};

/**
 * Selects text the way a keyboard user does: Shift+ArrowRight from the start of the fragment.
 * Only the caret is placed programmatically (Cmd/Ctrl+Home differs between platforms).
 */
async function selectByKeyboard(editor: Locator, fragment: string): Promise<void> {
  const text = await editor.inputValue();
  const start = text.indexOf(fragment);
  expect(start, `"${fragment}" should be in the text`).toBeGreaterThanOrEqual(0);

  await editor.focus();
  await editor.evaluate((element: HTMLTextAreaElement, caret) => {
    element.setSelectionRange(caret, caret);
  }, start);
  for (const _ of fragment) {
    await editor.press('Shift+ArrowRight');
  }
}

async function selectedText(editor: Locator): Promise<string> {
  return editor.evaluate((element: HTMLTextAreaElement) =>
    element.value.slice(element.selectionStart, element.selectionEnd),
  );
}

test.describe('Phrase Analyzer', () => {
  let editor: Locator;
  let findButton: Locator;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    editor = page.getByLabel('Your text');
    findButton = page.getByRole('button', { name: /Find synonyms/ });
  });

  test('has a meaningful title and a single h1', async ({ page }) => {
    await expect(page).toHaveTitle('Phrase Analyzer');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Phrase Analyzer');
  });

  test('counts characters and words while typing', async ({ page }) => {
    await editor.fill("Don't stop, well-known 👍");

    await expect(page.getByTestId('stat-characters')).toHaveText('24');
    await expect(page.getByTestId('stat-characters-without-spaces')).toHaveText('21');
    await expect(page.getByTestId('stat-words')).toHaveText('3');
  });

  test('finds synonyms for a selected word, replaces it and undoes the replacement', async ({
    page,
  }) => {
    const phrases = await mockDatamuse(page, respondWith(['glad', 'pleased']));
    await editor.fill('Happy days are here');
    await expect(findButton).toBeDisabled();

    await selectByKeyboard(editor, 'Happy');
    await findButton.click();

    expect(phrases).toEqual(['happy']);
    await expect(page.getByText('Replace “Happy” with:')).toBeVisible();

    await page.getByRole('button', { name: 'pleased' }).click();

    await expect(editor).toHaveValue('Pleased days are here');
    await expect(editor).toBeFocused();
    expect(await selectedText(editor)).toBe('Pleased');
    await expect(page.getByTestId('feedback')).toHaveText('Replaced “Happy” with “Pleased”.');

    await page.getByRole('button', { name: 'Undo replacement' }).click();

    await expect(editor).toHaveValue('Happy days are here');
    expect(await selectedText(editor)).toBe('Happy');
  });

  test('expands a partial selection to the whole word and keeps punctuation', async ({ page }) => {
    const phrases = await mockDatamuse(page, respondWith(['glad']));
    await editor.fill('Well, happy, really.');

    await selectByKeyboard(editor, 'appy, ');
    await findButton.click();
    await page.getByRole('button', { name: 'glad' }).click();

    expect(phrases).toEqual(['happy']);
    await expect(editor).toHaveValue('Well, glad, really.');
  });

  test('looks up a phrase with Ctrl+Enter without adding a line break', async ({ page }) => {
    const phrases = await mockDatamuse(page, respondWith(['elated']));
    await editor.fill('I am very happy');

    await selectByKeyboard(editor, 'very happy');
    await editor.press('Control+Enter');

    await expect(page.getByRole('button', { name: 'elated' })).toBeVisible();
    expect(phrases).toEqual(['very happy']);
    await expect(editor).toHaveValue('I am very happy');
  });

  test('disables "Find synonyms" again when the selection is cleared by keyboard or mouse', async ({
    page,
  }) => {
    await editor.fill('I am happy today');

    await selectByKeyboard(editor, 'happy');
    await expect(findButton).toBeEnabled();
    await editor.press('ArrowRight');
    await expect(findButton).toBeDisabled();
    await expect(page.getByTestId('selection-hint')).toHaveText(
      'Select a word or phrase in the text to find synonyms.',
    );

    await selectByKeyboard(editor, 'happy');
    await expect(findButton).toBeEnabled();
    await editor.click();
    await expect(findButton).toBeDisabled();
  });

  test('explains why a selection cannot be looked up', async ({ page }) => {
    await editor.fill('one two three four five six !!!');

    await selectByKeyboard(editor, 'one two three four five six');
    await expect(findButton).toBeDisabled();
    await expect(page.getByTestId('selection-hint')).toHaveText('Select up to 5 words.');

    await selectByKeyboard(editor, '!!!');
    await expect(page.getByTestId('selection-hint')).toHaveText(
      'The selection has no letters. Select a word or phrase.',
    );
  });

  test('shows an empty state when nothing is found', async ({ page }) => {
    await mockDatamuse(page, respondWith([]));
    await editor.fill('Привіт');

    await selectByKeyboard(editor, 'Привіт');
    await findButton.click();

    await expect(page.getByTestId('synonyms-status')).toHaveText(
      'No synonyms found for “Привіт”. The service supports English only.',
    );
  });

  test('shows an error and recovers with Retry', async ({ page }) => {
    let attempts = 0;
    await mockDatamuse(page, async (route) => {
      attempts++;
      if (attempts === 1) {
        await route.fulfill({ status: 503, body: 'Service Unavailable' });
        return;
      }
      await respondWith(['glad'])(route, '');
    });
    await editor.fill('I am happy');

    await selectByKeyboard(editor, 'happy');
    await findButton.click();
    await expect(page.getByTestId('synonyms-status')).toHaveText(
      'The synonym service is unavailable right now. Try again later.',
    );

    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(page.getByRole('button', { name: 'glad' })).toBeVisible();
    expect(attempts).toBe(2);
  });

  test('shows a network error when the service cannot be reached', async ({ page }) => {
    await mockDatamuse(page, (route) => route.abort('internetdisconnected'));
    await editor.fill('I am happy');

    await selectByKeyboard(editor, 'happy');
    await findButton.click();

    await expect(page.getByTestId('synonyms-status')).toHaveText(
      "Can't reach the synonym service. Check your connection and try again.",
    );
  });

  test('copies the whole text to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const copyButton = page.getByRole('button', { name: 'Copy text' });
    await expect(copyButton).toBeDisabled();

    await editor.fill('Copy me,\nplease!');
    await copyButton.click();

    await expect(page.getByTestId('feedback')).toHaveText('Text copied to the clipboard.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Copy me,\nplease!');
  });
});
