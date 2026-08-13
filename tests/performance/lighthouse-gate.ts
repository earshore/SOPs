import type { Config } from 'lighthouse';

type CategoryId = 'performance' | 'accessibility' | 'best-practices' | 'seo';
type AuditId =
  | 'first-contentful-paint'
  | 'largest-contentful-paint'
  | 'cumulative-layout-shift'
  | 'total-blocking-time';

interface LighthouseResultLike {
  categories?: Partial<Record<CategoryId, { score?: number | null }>>;
  audits?: Partial<Record<AuditId, { numericValue?: number }>>;
}

export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
}

interface PerformanceThresholds {
  performance: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
}

interface PerformancePage {
  name: string;
  path: string;
  routeId: string;
  readySelector: string;
  thresholds: PerformanceThresholds;
}

export const PAGES = [
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
] as const satisfies readonly PerformancePage[];

export const LIGHTHOUSE_CONFIG = {
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
} satisfies Config;

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing or invalid Lighthouse metric: ${label}`);
  }

  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Missing or invalid Lighthouse data: ${label}`);
  }

  return value as Record<string, unknown>;
}

function requireItems(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Missing or invalid Lighthouse data: ${label} items`);
  }

  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing or invalid Lighthouse data: ${label}`);
  }

  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Missing or invalid Lighthouse data: ${label}`);
  }

  return value;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate the median of an empty sample');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  const middleValue = sorted[middle];
  if (middleValue === undefined) {
    throw new Error('Cannot calculate the median of an invalid sample');
  }

  if (sorted.length % 2 === 1) {
    return middleValue;
  }

  const lowerMiddleValue = sorted[middle - 1];
  if (lowerMiddleValue === undefined) {
    throw new Error('Cannot calculate the median of an invalid sample');
  }

  return (lowerMiddleValue + middleValue) / 2;
}

export function extractMetrics(result: LighthouseResultLike): LighthouseMetrics {
  return {
    performance: requireNumber(result.categories?.performance?.score, 'performance') * 100,
    accessibility: requireNumber(result.categories?.accessibility?.score, 'accessibility') * 100,
    bestPractices:
      requireNumber(result.categories?.['best-practices']?.score, 'best-practices') * 100,
    seo: requireNumber(result.categories?.seo?.score, 'seo') * 100,
    fcp: requireNumber(
      result.audits?.['first-contentful-paint']?.numericValue,
      'first-contentful-paint'
    ),
    lcp: requireNumber(
      result.audits?.['largest-contentful-paint']?.numericValue,
      'largest-contentful-paint'
    ),
    cls: requireNumber(
      result.audits?.['cumulative-layout-shift']?.numericValue,
      'cumulative-layout-shift'
    ),
    tbt: requireNumber(result.audits?.['total-blocking-time']?.numericValue, 'total-blocking-time'),
  };
}

export function extractRuntimeFailures(result: unknown): string[] {
  const lighthouseResult = requireObject(result, 'result');
  const audits = requireObject(lighthouseResult.audits, 'audits');
  const consoleAudit = requireObject(audits['errors-in-console'], 'errors-in-console audit');
  const consoleScore = requireNumber(consoleAudit.score, 'errors-in-console score');
  const consoleDetails = requireObject(consoleAudit.details, 'errors-in-console details');
  const consoleItems = requireItems(consoleDetails.items, 'errors-in-console');
  const networkAudit = requireObject(audits['network-requests'], 'network-requests audit');
  const networkDetails = requireObject(networkAudit.details, 'network-requests details');
  const networkItems = requireItems(networkDetails.items, 'network-requests');
  const failures: string[] = [];

  if (consoleScore !== 1 && consoleItems.length === 0) {
    failures.push(`Console audit score: ${consoleScore}`);
  }

  for (const item of consoleItems) {
    const consoleError = requireObject(item, 'errors-in-console item');
    failures.push(
      `Console error: ${requireString(consoleError.description, 'console error description')}`
    );
  }

  for (const item of networkItems) {
    const request = requireObject(item, 'network-requests item');
    const url = requireString(request.url, 'network request URL');
    const status = requireNumber(request.statusCode, `network request status for ${url}`);
    const finished = requireBoolean(request.finished, `network request finished for ${url}`);

    if (status < 0) {
      failures.push(`Network failure (status ${status}): ${url}`);
    } else if (status >= 400) {
      failures.push(`HTTP ${status}: ${url}`);
    }
    if (!finished) {
      failures.push(`Unfinished request (status ${status}): ${url}`);
    }
  }

  return failures;
}
