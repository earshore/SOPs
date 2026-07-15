import { expect, type Page } from '@playwright/test';
import type { FullAnalysisReport } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';
import { SAMPLE_ANALYSIS_REPORT } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';
import type { ScrapedData } from '../../src/types/modules-business';

export const E2E_AI_ANALYSIS_TARGET_IDS = [
  'title-keywords',
  'selling-points',
  'fatal-flaws',
  'wow-moments',
  'hesitation-points',
  'buyer-profile',
  'vocab-gap',
  'promise-reality',
];

export const E2E_AI_ANALYSIS_ASINS = ['B0E2E00001', 'B0E2E00002'];

export const E2E_AI_ANALYSIS_SCRAPED_DATA: ScrapedData = {
  metadata: {
    scrape_timestamp: '2026-07-03T00:00:00.000Z',
    marketplace: 'DE',
    domain: 'amazon.de',
    language: 'German',
    total_asins: E2E_AI_ANALYSIS_ASINS.length,
    source: 'e2e-fixture',
  },
  products: [
    {
      asin: E2E_AI_ANALYSIS_ASINS[0],
      url: `https://www.amazon.de/dp/${E2E_AI_ANALYSIS_ASINS[0]}`,
      language: 'German',
      productTitle: 'E2E Fixture Men Cologne 50ml',
      feature_bullets: [
        'Long lasting woody fragrance for evening and daily use',
        'Compact 50ml bottle designed for travel and office bags',
        'Gift-ready package with dark glass bottle and secure cap',
      ],
      customer_reviews: [
        {
          id: 'E2E-R1',
          author: 'Fixture Buyer',
          headline: 'Smells great',
          body: 'The scent is clean and pleasant, but it fades faster than I expected.',
          star_rating: 4,
          is_verified: true,
          review_date: '2026-06-10',
        },
        {
          id: 'E2E-R2',
          author: 'Fixture Reviewer',
          headline: 'Good gift option',
          body: 'The bottle looks premium and worked well as a birthday gift.',
          star_rating: 5,
          is_verified: true,
          review_date: '2026-06-12',
        },
      ],
      scrape_status: 'success',
      error: '',
      metadata: {
        marketplace: 'DE',
        scrape_timestamp: '2026-07-03T00:00:00.000Z',
      },
      _source_site: 'DE',
    },
    {
      asin: E2E_AI_ANALYSIS_ASINS[1],
      url: `https://www.amazon.de/dp/${E2E_AI_ANALYSIS_ASINS[1]}`,
      language: 'German',
      productTitle: 'E2E Fixture Night Fragrance Gift Set',
      feature_bullets: [
        'Aromatic notes for date night, club events and social occasions',
        'Smooth spray formula with no sticky residue on clothes',
        'Brand support team responds to product questions quickly',
      ],
      customer_reviews: [
        {
          id: 'E2E-R3',
          author: 'Fixture Customer',
          headline: 'Nice but expensive',
          body: 'The amount feels expensive, but the smell itself is great.',
          star_rating: 3,
          is_verified: true,
          review_date: '2026-06-18',
        },
      ],
      scrape_status: 'success',
      error: '',
      metadata: {
        marketplace: 'DE',
        scrape_timestamp: '2026-07-03T00:00:00.000Z',
      },
      _source_site: 'DE',
    },
  ],
};

export const E2E_AI_ANALYSIS_REPORT: FullAnalysisReport = {
  ...SAMPLE_ANALYSIS_REPORT,
  _metadata: {
    confidence: {
      'title-keywords': 0.84,
      'selling-points': 0.81,
      'fatal-flaws': 0.77,
      'wow-moments': 0.86,
      'hesitation-points': 0.74,
      'buyer-profile': 0.79,
      'vocab-gap': 0.72,
      'promise-reality': 0.76,
    },
    overallConfidence: 0.79,
    analyzedAt: '2026-07-03T00:00:00.000Z',
    targetIds: E2E_AI_ANALYSIS_TARGET_IDS,
    language: 'de',
    reviewSampling: {
      totalReviews: 3,
      lowStar: {
        totalReviews: 1,
        includedReviews: 1,
        omittedReviews: 0,
        bodyCharLimit: 800,
      },
      highStar: {
        totalReviews: 2,
        includedReviews: 2,
        omittedReviews: 0,
        bodyCharLimit: 800,
      },
      general: {
        totalReviews: 3,
        includedReviews: 3,
        omittedReviews: 0,
        bodyCharLimit: 800,
        strategy: 'representative',
      },
    },
    sourceHistoryId: 'e2e-ai-analysis-history',
    sourceDataFingerprint: 'e2e-ai-analysis-fingerprint',
    sourceAsins: E2E_AI_ANALYSIS_ASINS,
  },
};

export async function loadAnalysisHistoryFixture(
  page: Page,
  report: unknown | null = E2E_AI_ANALYSIS_REPORT
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ asins, data, reportValue }) => {
      localStorage.setItem(
        'scrape_history',
        JSON.stringify([
          {
            id: 'e2e-ai-analysis-history',
            timestamp: data.metadata?.scrape_timestamp,
            site: data.metadata?.marketplace || 'DE',
            asins,
            data,
            ...(reportValue ? { report: reportValue } : {}),
          },
        ])
      );
    },
    {
      asins: E2E_AI_ANALYSIS_ASINS,
      data: E2E_AI_ANALYSIS_SCRAPED_DATA,
      reportValue: report,
    }
  );

  await page.goto('/#/app-center/master-analysis/scraper', { waitUntil: 'domcontentloaded' });
  await page
    .locator('#main-content[data-current-route="scraper"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  const loadSnapshotButton = page.locator('button[aria-label="加载快照"]').first();
  await loadSnapshotButton.waitFor({ state: 'visible', timeout: 15000 });
  await loadSnapshotButton.click();
  await page
    .locator('#toast-container .toast.toast-success .toast-content strong')
    .filter({ hasText: report ? '历史快照已加载（包含分析报告）' : '历史快照已加载' })
    .last()
    .waitFor({ state: 'visible', timeout: 5000 });
}

export async function clearAnalysisHistoryFixture(page: Page): Promise<void> {
  const returnUrl = page.url();

  await page.goto('/#/app-center/master-analysis/scraper', { waitUntil: 'domcontentloaded' });
  await page
    .locator('#main-content[data-current-route="scraper"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page
    .getByText('正在加载历史快照...', { exact: true })
    .waitFor({ state: 'hidden', timeout: 15000 });

  const clearHistoryButton = page.locator('.clear-btn').filter({ hasText: '清空' }).last();
  await clearHistoryButton.waitFor({ state: 'visible', timeout: 15000 });
  await clearHistoryButton.click();

  const dialog = page.getByRole('dialog', { name: '清空历史记录' });
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await dialog.getByRole('button', { name: '清空历史', exact: true }).click();
  await page
    .locator('#toast-container .toast.toast-success .toast-content strong')
    .filter({ hasText: '历史已清空' })
    .last()
    .waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText('还没有历史快照', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
  await expect(page.locator('button[aria-label="加载快照"]')).toHaveCount(0, {
    timeout: 15000,
  });

  await page.goto(returnUrl, { waitUntil: 'domcontentloaded' });
}
