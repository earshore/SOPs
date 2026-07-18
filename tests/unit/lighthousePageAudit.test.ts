import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

const playAuditMock = vi.hoisted(() => vi.fn());

vi.mock('playwright-lighthouse', () => ({
  playAudit: playAuditMock,
}));

import {
  assertExpectedPageHeading,
  assertExpectedLighthouseRoute,
  assertUsableLighthouseResult,
  getConsoleErrorCount,
  getNumericAudit,
  getResourceTotals,
  runLighthousePageAudit,
} from '../performance/lighthousePageAudit';

describe('Lighthouse page audit evidence validation', () => {
  it('uses the explicit total resource row', () => {
    expect(
      getResourceTotals({
        'resource-summary': {
          details: {
            items: [
              { resourceType: 'script', requestCount: 3, transferSize: 300 },
              { resourceType: 'total', requestCount: 4, transferSize: 400 },
            ],
          },
        },
      })
    ).toMatchObject({ requestCount: 4, transferSize: 400 });
  });

  it('rejects missing total resource evidence instead of treating it as zero', () => {
    expect(() => getResourceTotals({})).toThrow(/resource-summary.*total/i);
  });

  it('rejects missing console evidence instead of treating it as zero errors', () => {
    expect(() => getConsoleErrorCount({})).toThrow(/errors-in-console/i);
  });

  it('counts an explicitly empty console error list as zero', () => {
    expect(
      getConsoleErrorCount({
        'errors-in-console': { details: { items: [] } },
      })
    ).toBe(0);
  });

  it('rejects Lighthouse results marked with a runtime error', () => {
    expect(() =>
      assertUsableLighthouseResult({
        runtimeError: { code: 'ERRORED_DOCUMENT_REQUEST', message: 'navigation failed' },
      })
    ).toThrow(/ERRORED_DOCUMENT_REQUEST.*navigation failed/);
  });

  it('rejects a report for a route other than the requested route', () => {
    expect(() =>
      assertExpectedLighthouseRoute(
        { finalDisplayedUrl: 'http://127.0.0.1:4173/#/home' },
        '/app-center/master-analysis/promptlab'
      )
    ).toThrow(/expected.*promptlab.*received.*home/i);
  });

  it('accepts the expected page heading after normalizing whitespace', () => {
    expect(() =>
      assertExpectedPageHeading('AI\n  智能分析', 'AI 智能分析', 'AI Analysis')
    ).not.toThrow();
  });

  it('rejects a page whose heading does not match its report identity', () => {
    expect(() =>
      assertExpectedPageHeading('首页', 'Listing 炼金术工场', 'PromptLab')
    ).toThrow(/PromptLab.*Listing 炼金术工场.*首页/);
  });

  it('accepts a finite numeric audit value', () => {
    expect(getNumericAudit({ metric: { numericValue: 123 } }, 'metric', 'Page')).toBe(123);
  });

  it('rejects a missing numeric audit value', () => {
    expect(() => getNumericAudit({}, 'metric', 'Page')).toThrow(/Page.*metric.*numeric/i);
  });
});

describe('Lighthouse page audit heading selection', () => {
  it('reads the first visible heading when a hidden Home heading appears first', async () => {
    const route = '/app-center/master-analysis/promptlab';
    const expectedHeading = 'Listing 炼金术工场';
    playAuditMock.mockResolvedValueOnce({
      lhr: {
        finalDisplayedUrl: `http://127.0.0.1:4173/#${route}`,
        categories: {
          performance: { score: 1 },
          accessibility: { score: 1 },
          'best-practices': { score: 1 },
          seo: { score: 1 },
        },
        audits: {
          'first-contentful-paint': { numericValue: 0 },
          'largest-contentful-paint': { numericValue: 0 },
          'cumulative-layout-shift': { numericValue: 0 },
          'total-blocking-time': { numericValue: 0 },
          interactive: { numericValue: 0 },
          'bootup-time': { numericValue: 0 },
          'mainthread-work-breakdown': { numericValue: 0 },
          'resource-summary': {
            details: {
              items: [{ resourceType: 'total', requestCount: 1, transferSize: 1 }],
            },
          },
          'errors-in-console': { details: { items: [] } },
        },
      },
    });

    const visibleHeading = {
      allInnerTexts: vi.fn().mockResolvedValue([expectedHeading]),
    };
    const locator = vi.fn((selector: string) => {
      if (selector === 'h1:visible') {
        return {
          allInnerTexts: vi.fn().mockResolvedValue([expectedHeading]),
          first: vi.fn(() => visibleHeading),
        };
      }

      return {
        allInnerTexts: vi.fn().mockResolvedValue(['首页', expectedHeading]),
      };
    });
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      locator,
    } as unknown as Page;

    await expect(
      runLighthousePageAudit({
        page,
        baseURL: 'http://127.0.0.1:4173',
        expectedHeading,
        label: 'PromptLab',
        reportName: 'promptlab',
        route,
      })
    ).resolves.toBeUndefined();
  });
});
