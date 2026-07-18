import { expect, type Page } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PERFORMANCE_THRESHOLDS = {
  performance: 85,
  accessibility: 90,
  bestPractices: 90,
  seo: 90,
  fcp: 1800,
  lcp: 2800,
  cls: 0.1,
  tbt: 500,
  tti: 4000,
  bootup: 4000,
  mainThread: 5000,
  requests: 100,
  transferBytes: 5 * 1024 * 1024,
} as const;

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop' as const,
    emulatedUserAgent: true,
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

const LIGHTHOUSE_REPORTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'lighthouse-reports'
);

interface LighthousePageAuditOptions {
  page: Page;
  baseURL: string | undefined;
  expectedHeading: string;
  label: string;
  reportName: string;
  route: string;
}

interface ResourceSummaryItem {
  requestCount: number;
  resourceType: string;
  transferSize: number;
}

interface LighthouseResultMetadata {
  finalDisplayedUrl?: string;
  runtimeError?: {
    code?: string;
    message?: string;
  };
}

export function getNumericAudit(
  audits: Record<string, { numericValue?: number }>,
  auditId: string,
  label: string
): number {
  const value = audits[auditId]?.numericValue;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} Lighthouse audit ${auditId} should provide a finite numeric value`);
  }
  return value;
}

function expectMinimumScore(
  label: string,
  category: string,
  score: number | null | undefined,
  threshold: number
): void {
  const percentage = (score ?? 0) * 100;
  expect(
    percentage,
    `${label} ${category} score should be >= ${threshold}; received ${percentage.toFixed(1)}`
  ).toBeGreaterThanOrEqual(threshold);
}

function isResourceSummaryItem(value: unknown): value is ResourceSummaryItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Partial<ResourceSummaryItem>;
  return (
    typeof item.resourceType === 'string' &&
    typeof item.requestCount === 'number' &&
    Number.isFinite(item.requestCount) &&
    typeof item.transferSize === 'number' &&
    Number.isFinite(item.transferSize)
  );
}

export function getResourceTotals(audits: Record<string, { details?: unknown }>): {
  requestCount: number;
  transferSize: number;
} {
  const details = audits['resource-summary']?.details as { items?: unknown } | undefined;
  const items = details?.items;
  const total = Array.isArray(items)
    ? items.find(
        (item): item is ResourceSummaryItem =>
          isResourceSummaryItem(item) && item.resourceType === 'total'
      )
    : undefined;

  if (!total) {
    throw new Error('Lighthouse resource-summary must provide a valid total row');
  }

  return { requestCount: total.requestCount, transferSize: total.transferSize };
}

export function getConsoleErrorCount(audits: Record<string, { details?: unknown }>): number {
  const details = audits['errors-in-console']?.details as { items?: unknown } | undefined;
  if (!Array.isArray(details?.items)) {
    throw new Error('Lighthouse errors-in-console audit must provide an items array');
  }
  return details.items.length;
}

export function assertUsableLighthouseResult(lhr: LighthouseResultMetadata): void {
  if (lhr.runtimeError) {
    const code = lhr.runtimeError.code ?? 'UNKNOWN_RUNTIME_ERROR';
    const message = lhr.runtimeError.message ?? 'No error message provided';
    throw new Error(`Lighthouse runtime error ${code}: ${message}`);
  }
}

export function assertExpectedLighthouseRoute(
  lhr: Pick<LighthouseResultMetadata, 'finalDisplayedUrl'>,
  expectedRoute: string
): void {
  const finalUrl = lhr.finalDisplayedUrl;
  const expectedHash = `#${expectedRoute}`;
  const actualHash = typeof finalUrl === 'string' ? new URL(finalUrl).hash : '';

  if (actualHash !== expectedHash) {
    throw new Error(
      `Expected Lighthouse route ${expectedHash}, but received ${actualHash || '<missing>'}`
    );
  }
}

export function assertExpectedPageHeading(
  actualHeading: string,
  expectedHeading: string,
  label: string
): void {
  const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();
  const actual = normalize(actualHeading);
  const expected = normalize(expectedHeading);

  if (actual !== expected) {
    throw new Error(
      `${label} expected heading "${expected}", but received "${actual || '<missing>'}"`
    );
  }
}

export async function runLighthousePageAudit({
  page,
  baseURL,
  expectedHeading,
  label,
  reportName,
  route,
}: LighthousePageAuditOptions): Promise<void> {
  expect(baseURL, `${label} performance test requires a Playwright baseURL`).toBeTruthy();
  const fullUrl = `${baseURL}/#${route}`;

  await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(2_000);

  const result = await playAudit({
    page,
    config: LIGHTHOUSE_CONFIG,
    thresholds: {
      performance: PERFORMANCE_THRESHOLDS.performance,
      accessibility: PERFORMANCE_THRESHOLDS.accessibility,
      'best-practices': PERFORMANCE_THRESHOLDS.bestPractices,
      seo: PERFORMANCE_THRESHOLDS.seo,
    },
    port: 9222,
    ignoreError: true,
    reports: {
      formats: { html: true, json: true },
      directory: LIGHTHOUSE_REPORTS_DIR,
      name: reportName,
    },
  });
  assertUsableLighthouseResult(result.lhr);
  assertExpectedLighthouseRoute(result.lhr, route);
  const [actualHeading = ''] = await page.locator('h1:visible').first().allInnerTexts();
  assertExpectedPageHeading(actualHeading, expectedHeading, label);
  const { audits, categories } = result.lhr;

  expectMinimumScore(
    label,
    'performance',
    categories.performance?.score,
    PERFORMANCE_THRESHOLDS.performance
  );
  expectMinimumScore(
    label,
    'accessibility',
    categories.accessibility?.score,
    PERFORMANCE_THRESHOLDS.accessibility
  );
  expectMinimumScore(
    label,
    'best-practices',
    categories['best-practices']?.score,
    PERFORMANCE_THRESHOLDS.bestPractices
  );
  expectMinimumScore(label, 'seo', categories.seo?.score, PERFORMANCE_THRESHOLDS.seo);

  expect(getNumericAudit(audits, 'first-contentful-paint', label)).toBeLessThan(
    PERFORMANCE_THRESHOLDS.fcp
  );
  expect(getNumericAudit(audits, 'largest-contentful-paint', label)).toBeLessThan(
    PERFORMANCE_THRESHOLDS.lcp
  );
  expect(getNumericAudit(audits, 'cumulative-layout-shift', label)).toBeLessThan(
    PERFORMANCE_THRESHOLDS.cls
  );
  expect(getNumericAudit(audits, 'total-blocking-time', label)).toBeLessThan(
    PERFORMANCE_THRESHOLDS.tbt
  );
  expect(getNumericAudit(audits, 'interactive', label)).toBeLessThan(PERFORMANCE_THRESHOLDS.tti);
  expect(getNumericAudit(audits, 'bootup-time', label)).toBeLessThan(PERFORMANCE_THRESHOLDS.bootup);
  expect(getNumericAudit(audits, 'mainthread-work-breakdown', label)).toBeLessThan(
    PERFORMANCE_THRESHOLDS.mainThread
  );

  const resources = getResourceTotals(audits);
  expect(
    resources.requestCount,
    `${label} request count should stay below the release budget`
  ).toBeLessThan(PERFORMANCE_THRESHOLDS.requests);
  expect(
    resources.transferSize,
    `${label} transfer size should stay below the release budget`
  ).toBeLessThan(PERFORMANCE_THRESHOLDS.transferBytes);
  expect(getConsoleErrorCount(audits), `${label} should not emit browser console errors`).toBe(0);
}
