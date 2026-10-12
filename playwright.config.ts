import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// biome-ignore lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access
const isCi = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // Text selection behaves differently across engines (Firefox collapses a selection only after mouseup),
  // so every test runs in all three.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
