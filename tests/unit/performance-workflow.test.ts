import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const workflow = read('.github/workflows/test.yml');
const playwrightConfig = read('config/playwright.config.ts');
const packageScripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
const performanceTsconfig = existsSync(resolve(process.cwd(), 'config/tsconfig.performance.json'))
  ? read('config/tsconfig.performance.json')
  : '';
const lighthouseGate = read('tests/performance/lighthouse-gate.ts');
const releasePerfSpec = read('tests/performance/release-performance-gate.test.ts');
const PLAYWRIGHT_ENV_KEYS = [
  'PLAYWRIGHT_USE_PREVIEW',
  'npm_lifecycle_event',
  'SKIP_WEBSERVER',
  'BASE_URL',
  'CI',
] as const;

async function loadPlaywrightConfig(
  env: Partial<Record<(typeof PLAYWRIGHT_ENV_KEYS)[number], string>>
) {
  vi.unstubAllEnvs();
  PLAYWRIGHT_ENV_KEYS.forEach(key => vi.stubEnv(key, undefined));
  Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));
  vi.resetModules();
  return (await import('../../config/playwright.config')).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('required quality gate contract', () => {
  it('runs the release smoke suite via package script', () => {
    const job = workflow.match(/\n {2}smoke-e2e:[\s\S]*?\n {2}performance:/)?.[0];
    const command = packageScripts['test:e2e:smoke'] ?? '';

    expect(job).toBeDefined();
    expect(job).toContain('npm run test:e2e:smoke');
    expect(command).toContain('release-smoke.spec.ts');
    expect(packageScripts['test:e2e:smoke:release']).toContain('playwright.release.config.ts');
  });

  it('locks release smoke lifecycle to production preview when configured', async () => {
    const config = await loadPlaywrightConfig({
      npm_lifecycle_event: 'test:e2e:smoke',
      SKIP_WEBSERVER: '1',
      BASE_URL: 'http://127.0.0.1:4999',
    });

    expect(config.use?.baseURL).toBe('http://127.0.0.1:4173');
    expect(config.webServer).toMatchObject({
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    });
  });
});

describe('required performance gate contract', () => {
  it('builds once and invokes the dedicated performance gate in CI', () => {
    const job = workflow.match(/\n {2}performance:[\s\S]*?\n {2}npm-audit:/)?.[0];

    expect(job).toBeDefined();
    expect(job).toContain('run: npm run build:app');
    expect(job).toContain('run: npm run test:performance:gate');
  });

  it('keeps local performance commands on the isolated gate', () => {
    expect(packageScripts['test:performance']).toBe('npm run test:performance:gate');
    expect(packageScripts['test:performance:gate']).toContain('playwright.performance.config.ts');
    expect(packageScripts.lighthouse).toBe('npm run test:performance:gate');
    expect(packageScripts['lighthouse:local']).toBe('npm run test:performance:gate');
    expect(packageScripts).not.toHaveProperty('test:performance:home');
    expect(packageScripts).not.toHaveProperty('test:performance:lighthouse');
  });

  it('type-checks performance sources against the gate modules', () => {
    expect(packageScripts['type-check:performance']).toBe(
      'tsc --noEmit -p config/tsconfig.performance.json'
    );
    expect(packageScripts['lint:performance']).toContain('lighthouse-gate.ts');
    expect(packageScripts['lint:performance']).toContain('tests/unit/lighthouse-gate.test.ts');
    expect(performanceTsconfig).toContain('../tests/performance/lighthouse-gate.ts');
    expect(performanceTsconfig).toContain('../tests/unit/lighthouse-gate.test.ts');
    expect(performanceTsconfig).not.toContain('ai-analysis-performance.test.ts');
  });

  it('defines canonical routes inside the isolated performance gate', () => {
    expect(lighthouseGate).toContain('/#/app-center/master-analysis/ai-analysis');
    expect(lighthouseGate).toContain('/#/app-center/master-analysis/promptlab');
    expect(lighthouseGate).toContain('/#/app-center/master-analysis/scraper');
    expect(lighthouseGate).toContain('extractMetrics');
    expect(lighthouseGate).toContain('median');
    expect(releasePerfSpec).toContain("from './lighthouse-gate'");
  });

  it('does not retain the old multi-file contended performance suite', () => {
    for (const filename of [
      'ai-analysis-performance.test.ts',
      'promptlab-performance.test.ts',
      'scraper-performance.test.ts',
    ]) {
      expect(existsSync(resolve(process.cwd(), 'tests/performance', filename))).toBe(false);
      expect(JSON.stringify(packageScripts)).not.toContain(filename);
      expect(workflow).not.toContain(filename);
    }
  });

  it('never reuses an existing server for a production-preview audit', () => {
    expect(playwrightConfig).toContain(
      'reuseExistingServer: !process.env.CI && !useStartupDevServer && !usePreviewServer'
    );
  });

  it('locks preview audits to their own production server', async () => {
    const config = await loadPlaywrightConfig({
      PLAYWRIGHT_USE_PREVIEW: 'true',
      SKIP_WEBSERVER: '1',
      BASE_URL: 'http://127.0.0.1:4999',
    });

    expect(config.use?.baseURL).toBe('http://127.0.0.1:4173');
    expect(config.webServer).toMatchObject({
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    });
  });
});

describe('ordinary development Playwright config', () => {
  it.each([
    {
      label: 'an inherited preview flag',
      env: { npm_lifecycle_event: 'test:startup', PLAYWRIGHT_USE_PREVIEW: 'true' },
    },
    {
      label: 'inherited preview, URL, and server-skip overrides',
      env: {
        npm_lifecycle_event: 'test:startup',
        PLAYWRIGHT_USE_PREVIEW: 'true',
        BASE_URL: 'http://127.0.0.1:4999',
        SKIP_WEBSERVER: '1',
      },
    },
  ])('does not force production preview for $label', async ({ env }) => {
    const config = await loadPlaywrightConfig(env);

    expect(config.use?.baseURL).toBe('http://localhost:5173');
  });
});
