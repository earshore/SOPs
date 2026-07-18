import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const workflow = read('.github/workflows/test.yml');
const playwrightConfig = read('config/playwright.config.ts');
const lighthouseRunner = read('tests/performance/lighthousePageAudit.ts');
const packageScripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
const performanceTsconfig = existsSync(resolve(process.cwd(), 'config/tsconfig.performance.json'))
  ? read('config/tsconfig.performance.json')
  : '';
const performanceSpecs = [
  read('tests/performance/ai-analysis-performance.test.ts'),
  read('tests/performance/promptlab-performance.test.ts'),
  read('tests/performance/scraper-performance.test.ts'),
];
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
  it('runs the canonical release smoke suite', () => {
    const job = workflow.match(/\n {2}smoke-e2e:[\s\S]*?\n {2}performance:/)?.[0];
    const command = packageScripts['test:e2e:smoke'] ?? '';
    const startupCommand = 'npm run test:startup -- --project=chromium';
    const buildCommand = 'npm run build:app';
    const releaseSmokeCommand =
      'playwright test tests/e2e/release-smoke.spec.ts --project=chromium';

    expect(job).toBeDefined();
    expect(job).toContain('npm run test:e2e:smoke');
    expect(job).not.toContain('run: npx playwright test');
    expect(command.startsWith(startupCommand)).toBe(true);
    expect(command.indexOf(startupCommand)).toBeLessThan(command.indexOf(buildCommand));
    expect(command.indexOf(buildCommand)).toBeLessThan(command.indexOf(releaseSmokeCommand));
    expect(command).not.toContain('playwright test tests/startup');
    expect(playwrightConfig).toContain("process.env.npm_lifecycle_event === 'test:e2e:smoke'");
  });

  it('locks release smoke to its own production preview server', async () => {
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
  it('builds and audits the production preview serially', () => {
    const job = workflow.match(/\n {2}performance:[\s\S]*?\n {2}npm-audit:/)?.[0];

    expect(job).toBeDefined();
    expect(job).toContain('npm run build:app');
    expect(job).toContain("PLAYWRIGHT_USE_PREVIEW: 'true'");
    expect(job).toContain('--workers=1');
    expect(job).toContain('--retries=0');
    expect(playwrightConfig).toContain("process.env.PLAYWRIGHT_USE_PREVIEW === 'true'");
    expect(playwrightConfig).toContain('npm run preview -- --host 127.0.0.1 --port 4173');
  });

  it('keeps the local performance command aligned with the required gate', () => {
    const command = packageScripts['test:performance'] ?? '';

    expect(command).toContain('npm run build:app');
    expect(command).toContain('npm run type-check:performance');
    expect(command).toContain('npm run lint:performance');
    expect(command).toContain('npm run format:check:performance');
    expect(command.indexOf('npm run type-check:performance')).toBeLessThan(
      command.indexOf('npm run build:app')
    );
    expect(command).toContain('tests/performance/ai-analysis-performance.test.ts');
    expect(command).toContain('tests/performance/promptlab-performance.test.ts');
    expect(command).toContain('tests/performance/scraper-performance.test.ts');
    expect(command).toContain('--project=chromium');
    expect(command).toContain('--workers=1');
    expect(command).toContain('--retries=0');
    expect(packageScripts['test:performance:lighthouse']).toBe('npm run test:performance');
    expect(playwrightConfig).toContain("process.env.npm_lifecycle_event === 'test:performance'");
  });

  it('type-checks, lints, and formats the required performance sources in CI', () => {
    const job = workflow.match(/\n {2}performance:[\s\S]*?\n {2}npm-audit:/)?.[0];

    expect(job).toContain('npm run type-check:performance');
    expect(job).toContain('npm run lint:performance');
    expect(job).toContain('npm run format:check:performance');
    expect(packageScripts['type-check:performance']).toBe(
      'tsc --noEmit -p config/tsconfig.performance.json'
    );
    expect(packageScripts['lint:performance']).toContain('lighthousePageAudit.ts');
    expect(packageScripts['lint:performance']).toContain('tests/unit/performance-workflow.test.ts');
    expect(packageScripts['lint:performance']).toContain('tests/unit/lighthousePageAudit.test.ts');
    expect(packageScripts['format:check:performance']).toContain('lighthousePageAudit.ts');
    expect(packageScripts['format:check:performance']).toContain('package.json');
    expect(packageScripts['format:check:performance']).not.toContain('tests/unit');
    expect(performanceTsconfig).toContain('../tests/performance/lighthousePageAudit.ts');
    expect(performanceTsconfig).toContain('../tests/unit/performance-workflow.test.ts');
    expect(performanceTsconfig).toContain('../tests/unit/lighthousePageAudit.test.ts');
    expect(performanceTsconfig).toContain('../config/playwright.config.ts');
  });

  it('runs one Lighthouse audit per canonical page route', () => {
    const canonicalRoutes = [
      '/app-center/master-analysis/ai-analysis',
      '/app-center/master-analysis/promptlab',
      '/app-center/master-analysis/scraper',
    ];
    const expectedHeadings = ['AI 智能分析', 'Listing 炼金术工场', '产品数据采集与管理'];

    performanceSpecs.forEach((spec, index) => {
      expect(spec).toContain(canonicalRoutes[index]);
      expect(spec).toContain(expectedHeadings[index]);
      expect(spec.match(/runLighthousePageAudit\(/g)).toHaveLength(1);
      expect(spec).not.toContain('playAudit(');
    });
  });

  it('uses a coherent desktop Lighthouse profile', () => {
    expect(lighthouseRunner).toContain("formFactor: 'desktop'");
    expect(lighthouseRunner).toContain('mobile: false');
    expect(lighthouseRunner).toContain('emulatedUserAgent: true');
  });

  it('does not apply page-content assertions before the report-producing audit', () => {
    const runnerStart = lighthouseRunner.indexOf('export async function runLighthousePageAudit');
    const auditStart = lighthouseRunner.indexOf('const result = await playAudit', runnerStart);
    const beforeAudit = lighthouseRunner.slice(runnerStart, auditStart);

    expect(runnerStart).toBeGreaterThanOrEqual(0);
    expect(auditStart).toBeGreaterThan(runnerStart);
    expect(beforeAudit).not.toContain('await expect');
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
  ])('keeps the startup lifecycle on the development server despite $label', async ({ env }) => {
    const config = await loadPlaywrightConfig(env);

    expect(config.use?.baseURL).toBe('http://localhost:5173');
    expect(config.webServer).toMatchObject({
      command: 'node scripts/dev/playwright-web-server.js',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    });
  });

  it('still allows ordinary development runs to skip the managed server', async () => {
    const config = await loadPlaywrightConfig({ SKIP_WEBSERVER: '1' });

    expect(config.use?.baseURL).toBe('http://localhost:5173');
    expect(config.webServer).toBeUndefined();
  });

  it('preserves ordinary development URL overrides and managed server reuse', async () => {
    const config = await loadPlaywrightConfig({ BASE_URL: 'http://127.0.0.1:4999' });

    expect(config.use?.baseURL).toBe('http://127.0.0.1:4999');
    expect(config.webServer).toMatchObject({
      command: 'node scripts/dev/playwright-web-server.js',
      url: 'http://127.0.0.1:4999',
      reuseExistingServer: true,
    });
  });
});
