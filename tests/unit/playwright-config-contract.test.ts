import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalArgv = [...process.argv];
const reportDirectory = resolve(process.cwd(), 'tests/playwright-report');

interface ReleaseImportOptions {
  suite?: string;
  group?: string;
  listOnly?: boolean;
}

async function importReleaseConfig({ suite, group, listOnly = false }: ReleaseImportOptions = {}) {
  const savedArgv = [...process.argv];

  try {
    vi.stubEnv('PLAYWRIGHT_RELEASE_SUITE', suite);
    vi.stubEnv('PLAYWRIGHT_FUNCTIONAL_GROUP', group);
    process.argv = listOnly
      ? [...savedArgv.filter(argument => argument !== '--list'), '--list']
      : savedArgv.filter(argument => argument !== '--list');
    vi.resetModules();
    return (await import('../../config/playwright.release.config')).default;
  } finally {
    process.argv = savedArgv;
    vi.unstubAllEnvs();
  }
}

async function importPerformanceConfig(listOnly = false) {
  const savedArgv = [...process.argv];

  try {
    process.argv = listOnly
      ? [...savedArgv.filter(argument => argument !== '--list'), '--list']
      : savedArgv.filter(argument => argument !== '--list');
    vi.resetModules();
    return (await import('../../config/playwright.performance.config')).default;
  } finally {
    process.argv = savedArgv;
  }
}

async function importFunctionalPerformanceConfig(listOnly = false) {
  const savedArgv = [...process.argv];

  try {
    process.argv = listOnly
      ? [...savedArgv.filter(argument => argument !== '--list'), '--list']
      : savedArgv.filter(argument => argument !== '--list');
    vi.resetModules();
    return (await import('../../config/playwright.functional-performance.config')).default;
  } finally {
    process.argv = savedArgv;
  }
}

afterEach(() => {
  process.argv = [...originalArgv];
  vi.unstubAllEnvs();
});

describe('Playwright configuration contract', () => {
  it('keeps the main Chromium project isolated without correctness retries', async () => {
    vi.resetModules();
    const config = (await import('../../config/playwright.config')).default;
    const chromium = config.projects?.find(project => project.name === 'chromium');
    const launchArgs = chromium?.use?.launchOptions?.args ?? [];

    expect(config.retries).toBe(0);
    expect(chromium).toBeDefined();
    expect(launchArgs).not.toContain('--disable-web-security');
    expect(launchArgs.some(argument => argument.includes('IsolateOrigins'))).toBe(false);
    expect(launchArgs.some(argument => argument.includes('site-per-process'))).toBe(false);
  });

  it('defines the smoke release runtime contract', async () => {
    const config = await importReleaseConfig();
    const chromium = config.projects?.find(project => project.name === 'chromium');

    expect(config).toMatchObject({
      testDir: resolve(process.cwd(), 'tests/e2e'),
      testMatch: 'release-smoke.spec.ts',
      testIgnore: [],
      fullyParallel: false,
      workers: 1,
      retries: 0,
      timeout: 30_000,
      globalTimeout: 5 * 60 * 1000,
      reporter: [
        ['list'],
        ['json', { outputFile: resolve(reportDirectory, 'release-smoke.json') }],
      ],
      use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
      },
      webServer: {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 120_000,
      },
    });
    expect(chromium?.use?.launchOptions?.args ?? []).toEqual([]);
  });

  it('defines the functional release runtime contract', async () => {
    const config = await importReleaseConfig({ suite: 'functional', group: 'analysis' });

    expect(config.testMatch).toBe('*.spec.ts');
    expect(config.testIgnore).toEqual(['release-smoke.spec.ts', '*-performance.spec.ts']);
    expect(config.globalTimeout).toBe(10 * 60 * 1000);
    expect(config.reporter).toEqual([
      ['list'],
      ['json', { outputFile: resolve(reportDirectory, 'functional-analysis.json') }],
    ]);
  });

  it.each(['../../../escaped', 'external\\ci'])(
    'rejects unsafe functional group %s',
    async group => {
      await expect(importReleaseConfig({ suite: 'functional', group })).rejects.toThrow(
        /Invalid PLAYWRIGHT_FUNCTIONAL_GROUP/
      );
    }
  );

  it.each(['analysis', 'deep-chat'])(
    'keeps valid functional group %s inside the report directory',
    async group => {
      const config = await importReleaseConfig({ suite: 'functional', group });

      expect(config.reporter).toContainEqual([
        'json',
        { outputFile: resolve(reportDirectory, `functional-${group}.json`) },
      ]);
    }
  );

  it('uses unknown for a missing functional group', async () => {
    const config = await importReleaseConfig({ suite: 'functional' });

    expect(config.reporter).toContainEqual([
      'json',
      { outputFile: resolve(reportDirectory, 'functional-unknown.json') },
    ]);
  });

  it('uses only the list reporter for release discovery', async () => {
    const config = await importReleaseConfig({ listOnly: true });

    expect(config.reporter).toEqual([['list']]);
  });

  it('defines the performance runtime contract', async () => {
    const config = await importPerformanceConfig();
    const chromium = config.projects?.find(project => project.name === 'chromium-performance');

    expect(config).toMatchObject({
      testDir: resolve(process.cwd(), 'tests/performance'),
      testMatch: 'release-performance-gate.test.ts',
      fullyParallel: false,
      workers: 1,
      retries: 0,
      timeout: 210_000,
      globalTimeout: 10 * 60 * 1000,
      reporter: [
        ['list'],
        ['json', { outputFile: resolve(reportDirectory, 'performance-gate.json') }],
      ],
      use: {
        baseURL: 'http://127.0.0.1:4174',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
      webServer: {
        command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174',
        reuseExistingServer: false,
        timeout: 120_000,
      },
    });
    expect(chromium?.use?.launchOptions?.args).toEqual(['--remote-debugging-port=9222']);
  });

  it('uses only the list reporter for performance discovery', async () => {
    const config = await importPerformanceConfig(true);

    expect(config.reporter).toEqual([['list']]);
  });

  it('defines the functional performance runtime contract', async () => {
    const config = await importFunctionalPerformanceConfig();

    expect(config).toMatchObject({
      testDir: resolve(process.cwd(), 'tests/e2e'),
      testMatch: '*-performance.spec.ts',
      fullyParallel: false,
      workers: 1,
      retries: 0,
      globalTimeout: 10 * 60 * 1000,
      reporter: [
        ['list'],
        ['json', { outputFile: resolve(reportDirectory, 'functional-performance.json') }],
      ],
      use: {
        baseURL: 'http://127.0.0.1:4175',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
      webServer: {
        command: 'npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        reuseExistingServer: false,
        timeout: 120_000,
      },
    });
  });

  it('uses only the list reporter for functional performance discovery', async () => {
    const config = await importFunctionalPerformanceConfig(true);

    expect(config.reporter).toEqual([['list']]);
  });

  it('keeps package scripts wired to the dedicated configs', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      preview: 'vite preview',
      'test:e2e:smoke:release': 'playwright test --config=config/playwright.release.config.ts',
      'test:performance:gate': 'playwright test --config=config/playwright.performance.config.ts',
      'test:performance:functional':
        'playwright test --config=config/playwright.functional-performance.config.ts',
    });
  });
});
