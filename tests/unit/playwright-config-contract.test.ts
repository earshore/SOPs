import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import performanceConfig from '../../config/playwright.performance.config';
import releaseConfig from '../../config/playwright.release.config';

const configDirectory = resolve(process.cwd(), 'config');
const mainConfigPath = resolve(configDirectory, 'playwright.config.ts');
const releaseConfigPath = resolve(configDirectory, 'playwright.release.config.ts');
const performanceConfigPath = resolve(configDirectory, 'playwright.performance.config.ts');
const packageJsonPath = resolve(process.cwd(), 'package.json');

describe('Playwright configuration contract', () => {
  it('keeps the main Chromium project isolated', () => {
    const mainConfig = readFileSync(mainConfigPath, 'utf8');

    expect(mainConfig).not.toContain('--disable-web-security');
    expect(mainConfig).not.toContain('IsolateOrigins');
    expect(mainConfig).not.toContain('site-per-process');
  });

  it('provides a release configuration for smoke and functional suites', () => {
    expect(existsSync(releaseConfigPath)).toBe(true);

    const releaseConfig = readFileSync(releaseConfigPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(releaseConfig).toContain('npm run preview -- --host 127.0.0.1 --port 4173 --strictPort');
    expect(packageJson.scripts?.preview).toContain('vite preview');
    expect(releaseConfig).toContain('PLAYWRIGHT_RELEASE_SUITE');
    expect(releaseConfig).toContain('5 * 60 * 1000');
  });

  it('provides a performance gate configuration', () => {
    expect(existsSync(performanceConfigPath)).toBe(true);

    const performanceConfig = readFileSync(performanceConfigPath, 'utf8');
    expect(performanceConfig).toContain('10 * 60 * 1000');
    expect(performanceConfig).toContain('--remote-debugging-port=9222');
  });

  it('writes release JSON reports outside the config directory', () => {
    expect(releaseConfig.reporter).toContainEqual([
      'json',
      {
        outputFile: resolve(process.cwd(), 'tests/playwright-report/release-smoke.json'),
      },
    ]);
  });

  it('writes performance JSON reports outside the config directory', () => {
    expect(performanceConfig.reporter).toContainEqual([
      'json',
      {
        outputFile: resolve(process.cwd(), 'tests/playwright-report/performance-gate.json'),
      },
    ]);
  });
});
