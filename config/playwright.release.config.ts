import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const functionalSuite = process.env.PLAYWRIGHT_RELEASE_SUITE === 'functional';
const functionalGroup = process.env.PLAYWRIGHT_FUNCTIONAL_GROUP ?? 'unknown';

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/e2e'),
  testMatch: functionalSuite ? '*.spec.ts' : 'release-smoke.spec.ts',
  testIgnore: functionalSuite ? 'release-smoke.spec.ts' : [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalTimeout: functionalSuite ? 10 * 60 * 1000 : 5 * 60 * 1000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: functionalSuite
          ? resolve(process.cwd(), 'tests/playwright-report', `functional-${functionalGroup}.json`)
          : resolve(process.cwd(), 'tests/playwright-report/release-smoke.json'),
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
