import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const listOnly = process.argv.includes('--list');

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/e2e'),
  testMatch: '*-performance.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalTimeout: 10 * 60 * 1000,
  reporter: listOnly
    ? [['list']]
    : [
        ['list'],
        [
          'json',
          {
            outputFile: resolve(
              process.cwd(),
              'tests/playwright-report/functional-performance.json'
            ),
          },
        ],
      ],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium-functional-performance', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
