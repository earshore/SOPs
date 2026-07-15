import { defineConfig, devices } from '@playwright/test';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const functionalSuite = process.env.PLAYWRIGHT_RELEASE_SUITE === 'functional';
const functionalGroup = process.env.PLAYWRIGHT_FUNCTIONAL_GROUP ?? 'unknown';
const reportDirectory = resolve(process.cwd(), 'tests/playwright-report');
const listOnly = process.argv.includes('--list');

if (!/^[a-z0-9-]{1,64}$/.test(functionalGroup)) {
  throw new Error(
    `Invalid PLAYWRIGHT_FUNCTIONAL_GROUP "${functionalGroup}": expected 1-64 lowercase letters, numbers, or hyphens`
  );
}

const functionalReport = resolve(reportDirectory, `functional-${functionalGroup}.json`);
const relativeFunctionalReport = relative(reportDirectory, functionalReport);

if (
  dirname(functionalReport) !== reportDirectory ||
  relativeFunctionalReport.startsWith('..') ||
  isAbsolute(relativeFunctionalReport)
) {
  throw new Error(
    `Invalid PLAYWRIGHT_FUNCTIONAL_GROUP "${functionalGroup}": report path must stay inside ${reportDirectory}`
  );
}

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/e2e'),
  testMatch: functionalSuite ? '*.spec.ts' : 'release-smoke.spec.ts',
  testIgnore: functionalSuite ? ['release-smoke.spec.ts', '*-performance.spec.ts'] : [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  globalTimeout: functionalSuite ? 10 * 60 * 1000 : 5 * 60 * 1000,
  reporter: listOnly
    ? [['list']]
    : [
        ['list'],
        [
          'json',
          {
            outputFile: functionalSuite
              ? functionalReport
              : resolve(reportDirectory, 'release-smoke.json'),
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
