import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: resolve(process.cwd(), 'tests/performance'),
  testMatch: 'release-performance-gate.test.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 210_000,
  globalTimeout: 10 * 60 * 1000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: resolve(process.cwd(), 'tests/playwright-report/performance-gate.json'),
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--remote-debugging-port=9222'] },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
