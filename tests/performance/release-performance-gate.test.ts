import { expect, test } from '@playwright/test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { playAudit } from 'playwright-lighthouse';

import { setupConsoleErrorListener } from '../helpers/playwright-utils';
import {
  extractMetrics,
  extractRuntimeFailures,
  LIGHTHOUSE_CONFIG,
  type LighthouseMetrics,
  median,
  PAGES,
} from './lighthouse-gate';

const BASE_URL = 'http://127.0.0.1:4174';
const REPORTS_DIR = resolve(process.cwd(), 'tests/performance/lighthouse-reports');
const PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS = {
  performance: 0,
  accessibility: 0,
  'best-practices': 0,
  seo: 0,
};

test.describe('release performance gate', () => {
  test.beforeAll(async ({ browser }, testInfo) => {
    if (testInfo.workerIndex === 0) {
      rmSync(REPORTS_DIR, { recursive: true, force: true });
    }
    mkdirSync(REPORTS_DIR, { recursive: true });

    const context = await browser.newContext({ baseURL: BASE_URL });
    const warmupPage = await context.newPage();

    try {
      await warmupPage.goto('/#/home');
      await expect(warmupPage.locator('#main-content')).toHaveAttribute(
        'data-current-route',
        'home'
      );
      await expect(warmupPage.locator('#panel-home:not(.hidden)')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  for (const performancePage of PAGES) {
    test(`${performancePage.name} meets the release performance budgets`, async ({ page }) => {
      const consoleListener = setupConsoleErrorListener(page);
      const failedResponses: string[] = [];
      const failedRequests: string[] = [];
      const lighthouseRuntimeFailures: string[] = [];

      page.on('response', response => {
        if (response.status() >= 400) {
          failedResponses.push(
            `${response.status()} ${response.request().method()} ${response.url()}`
          );
        }
      });
      page.on('requestfailed', request => {
        failedRequests.push(
          `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown error'}`
        );
      });

      await page.goto(performancePage.path);
      await expect(page.locator('#main-content')).toHaveAttribute(
        'data-current-route',
        performancePage.routeId
      );
      await expect(page.locator(performancePage.readySelector)).toBeVisible();

      const runs: LighthouseMetrics[] = [];

      for (let run = 1; run <= 3; run += 1) {
        const result = await playAudit({
          page,
          config: LIGHTHOUSE_CONFIG,
          thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
          port: 9222,
        });
        const lhr = result.lhr;

        writeFileSync(
          resolve(REPORTS_DIR, `${performancePage.name}-run-${run}.json`),
          JSON.stringify(lhr, null, 2),
          'utf8'
        );
        runs.push(extractMetrics(lhr));
        lighthouseRuntimeFailures.push(
          ...extractRuntimeFailures(lhr).map(failure => `run ${run}: ${failure}`)
        );
      }

      const medians: LighthouseMetrics = {
        performance: median(runs.map(metrics => metrics.performance)),
        accessibility: median(runs.map(metrics => metrics.accessibility)),
        bestPractices: median(runs.map(metrics => metrics.bestPractices)),
        seo: median(runs.map(metrics => metrics.seo)),
        fcp: median(runs.map(metrics => metrics.fcp)),
        lcp: median(runs.map(metrics => metrics.lcp)),
        cls: median(runs.map(metrics => metrics.cls)),
        tbt: median(runs.map(metrics => metrics.tbt)),
      };

      console.log(`[lighthouse-gate] ${performancePage.name} runs=${JSON.stringify(runs)}`);
      console.log(
        `[lighthouse-gate] ${performancePage.name} median=${JSON.stringify(medians)} thresholds=${JSON.stringify(performancePage.thresholds)}`
      );

      expect
        .soft(medians.performance)
        .toBeGreaterThanOrEqual(performancePage.thresholds.performance);
      expect.soft(medians.accessibility).toBeGreaterThanOrEqual(90);
      expect.soft(medians.bestPractices).toBeGreaterThanOrEqual(90);
      expect.soft(medians.seo).toBeGreaterThanOrEqual(90);
      expect.soft(medians.fcp).toBeLessThan(performancePage.thresholds.fcp);
      expect.soft(medians.lcp).toBeLessThan(performancePage.thresholds.lcp);
      expect.soft(medians.cls).toBeLessThan(performancePage.thresholds.cls);
      expect.soft(medians.tbt).toBeLessThan(performancePage.thresholds.tbt);
      expect.soft(consoleListener.getErrors()).toEqual([]);
      expect.soft(failedResponses).toEqual([]);
      expect.soft(failedRequests).toEqual([]);
      expect.soft(lighthouseRuntimeFailures).toEqual([]);
    });
  }
});
