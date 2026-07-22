import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  extractMetrics,
  extractRuntimeFailures,
  LIGHTHOUSE_CONFIG,
  median,
  PAGES,
} from '../performance/lighthouse-gate';

const duplicatePerformanceFiles = [
  'ai-analysis-performance.test.ts',
  'promptlab-performance.test.ts',
  'scraper-performance.test.ts',
  'home-performance.test.ts',
  'lighthouse.test.ts',
  'verify-cls-all-pages.test.ts',
  'verify-performance-score-90.test.ts',
] as const;

const completeResult = {
  categories: {
    performance: { score: 0.91 },
    accessibility: { score: 0.92 },
    'best-practices': { score: 0.93 },
    seo: { score: 0.94 },
  },
  audits: {
    'first-contentful-paint': { numericValue: 1_100 },
    'largest-contentful-paint': { numericValue: 2_200 },
    'cumulative-layout-shift': { numericValue: 0.05 },
    'total-blocking-time': { numericValue: 250 },
  },
};

const cleanRuntimeResult = {
  audits: {
    'errors-in-console': {
      score: 1,
      details: { items: [] },
    },
    'network-requests': {
      details: {
        items: [{ url: 'https://example.test/ok', statusCode: 200, finished: true }],
      },
    },
  },
};

describe('median', () => {
  it('returns the middle value for an unsorted odd-length sample', () => {
    expect(median([300, 100, 200])).toBe(200);
  });

  it('rejects an empty sample', () => {
    expect(() => median([])).toThrow(/empty/i);
  });
});

describe('extractMetrics', () => {
  it('extracts category percentages and numeric audit values', () => {
    expect(extractMetrics(completeResult)).toEqual({
      performance: 91,
      accessibility: 92,
      bestPractices: 93,
      seo: 94,
      fcp: 1_100,
      lcp: 2_200,
      cls: 0.05,
      tbt: 250,
    });
  });

  it('fails closed when the performance category is missing', () => {
    const { performance: _performance, ...categories } = completeResult.categories;

    expect(() => extractMetrics({ ...completeResult, categories })).toThrow(/performance/i);
  });

  it('fails closed when a required audit is missing', () => {
    const { 'largest-contentful-paint': _lcp, ...audits } = completeResult.audits;

    expect(() => extractMetrics({ ...completeResult, audits })).toThrow(
      /largest-contentful-paint/i
    );
  });
});

describe('extractRuntimeFailures', () => {
  it('returns no failures for clean console and network audits', () => {
    expect(extractRuntimeFailures(cleanRuntimeResult)).toEqual([]);
  });

  it('reports console errors and failed network requests with URL and status evidence', () => {
    const result = {
      audits: {
        'errors-in-console': {
          score: 0,
          details: {
            items: [{ description: 'Unhandled console failure', source: 'console.error' }],
          },
        },
        'network-requests': {
          details: {
            items: [
              { url: 'https://example.test/missing', statusCode: 404, finished: true },
              { url: 'https://example.test/pending', statusCode: 200, finished: false },
            ],
          },
        },
      },
    };

    expect(extractRuntimeFailures(result)).toEqual([
      'Console error: Unhandled console failure',
      'HTTP 404: https://example.test/missing',
      'Unfinished request (status 200): https://example.test/pending',
    ]);
  });

  it('reports a finished request whose negative status records a loading failure', () => {
    const result = {
      audits: {
        'errors-in-console': cleanRuntimeResult.audits['errors-in-console'],
        'network-requests': {
          details: {
            items: [
              {
                url: 'https://example.test/connection-failed',
                statusCode: -1,
                finished: true,
              },
            ],
          },
        },
      },
    };

    expect(extractRuntimeFailures(result)).toEqual([
      'Network failure (status -1): https://example.test/connection-failed',
    ]);
  });

  it('fails closed when the errors-in-console audit is missing', () => {
    expect(() =>
      extractRuntimeFailures({
        audits: {
          'network-requests': cleanRuntimeResult.audits['network-requests'],
        },
      })
    ).toThrow(/errors-in-console/i);
  });

  it('fails closed when the network-requests audit items are missing', () => {
    expect(() =>
      extractRuntimeFailures({
        audits: {
          'errors-in-console': cleanRuntimeResult.audits['errors-in-console'],
          'network-requests': { details: {} },
        },
      })
    ).toThrow(/network-requests.*items/i);
  });
});

describe('Lighthouse gate contract', () => {
  it('defines the four canonical routes and budgets', () => {
    expect(PAGES).toEqual([
      {
        name: 'home',
        path: '/#/home',
        routeId: 'home',
        readySelector: '#panel-home:not(.hidden)',
        thresholds: { performance: 90, fcp: 1_500, lcp: 2_500, cls: 0.1, tbt: 300 },
      },
      {
        name: 'scraper',
        path: '/#/app-center/master-analysis/scraper',
        routeId: 'scraper',
        readySelector: '[x-data=scraperPanel]',
        thresholds: { performance: 85, fcp: 1_800, lcp: 2_800, cls: 0.1, tbt: 500 },
      },
      {
        name: 'ai-analysis',
        path: '/#/app-center/master-analysis/ai-analysis',
        routeId: 'ai_analysis',
        readySelector: '.ai-analysis-wrapper',
        thresholds: { performance: 85, fcp: 1_800, lcp: 2_800, cls: 0.1, tbt: 500 },
      },
      {
        name: 'promptlab',
        path: '/#/app-center/master-analysis/promptlab',
        routeId: 'promptlab',
        readySelector: '[x-data=promptlabPanel]',
        thresholds: { performance: 85, fcp: 1_800, lcp: 2_800, cls: 0.1, tbt: 500 },
      },
    ]);
  });

  it('reuses the desktop Lighthouse configuration', () => {
    expect(LIGHTHOUSE_CONFIG).toEqual({
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10_240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        screenEmulation: {
          mobile: false,
          width: 1_920,
          height: 1_080,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    });
  });

  it('routes package scripts through the dedicated performance gate', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:performance']).toBe('npm run test:performance:gate');
    expect(packageJson.scripts?.lighthouse).toBe('npm run test:performance:gate');
    expect(packageJson.scripts?.['lighthouse:local']).toBe('npm run test:performance:gate');
    expect(packageJson.scripts).not.toHaveProperty('test:performance:home');
    expect(packageJson.scripts).not.toHaveProperty('test:performance:lighthouse');
  });

  it('reuses the build artifact and invokes the dedicated gate in the performance workflow', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/test.yml'), 'utf8');
    const performanceJob = workflow.slice(
      workflow.indexOf('\n  performance:'),
      workflow.indexOf('\n  npm-audit:')
    );

    expect(performanceJob).toContain('uses: actions/download-artifact@');
    expect(performanceJob).toContain('name: build-artifact');
    expect(performanceJob).toContain('path: dist');
    expect(performanceJob).not.toContain('run: npm run build:app');
    expect(performanceJob).toContain('run: npm run test:performance:gate');
  });

  it('does not reference or retain the duplicate performance tests', () => {
    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/test.yml'), 'utf8');

    for (const filename of duplicatePerformanceFiles) {
      expect(packageJson).not.toContain(filename);
      expect(workflow).not.toContain(filename);
      expect(existsSync(resolve(process.cwd(), 'tests/performance', filename))).toBe(false);
    }
  });
});
