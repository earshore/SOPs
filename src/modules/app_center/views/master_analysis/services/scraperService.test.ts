import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapedProduct, ScraperSite } from '@/types/modules-business';

const mocks = vi.hoisted(() => ({
  parseProductPage: vi.fn(),
  parseReviews: vi.fn(),
  getProxyConfig: vi.fn(),
  getByAsinAsync: vi.fn(),
  sleep: vi.fn(async (_ms: number) => undefined),
  getErrorSummary: vi.fn((message: string) => `summary:${message}`),
  configGet: vi.fn((key: string) => {
    const values: Record<string, number> = {
      'scraper.cacheDuration': 24 * 60 * 60 * 1000,
      'scraper.requestTimeout': 100,
      'scraper.maxConcurrent': 2,
      'scraper.maxRetries': 2,
      'scraper.retryDelay': 1,
      'scraper.batchSize': 2,
      'scraper.batchDelay': 1,
    };
    return values[key];
  }),
}));

vi.mock('./parserService', () => ({
  parseProductPage: mocks.parseProductPage,
  parseReviews: mocks.parseReviews,
}));

vi.mock('./historyService', () => ({
  HistoryService: {
    getByAsinAsync: mocks.getByAsinAsync,
  },
}));

vi.mock('../../../../../services/storageService', () => ({
  StorageService: {
    getProxyConfig: mocks.getProxyConfig,
  },
}));

vi.mock('../../../../../common/ui', () => ({
  sleep: mocks.sleep,
  getErrorSummary: mocks.getErrorSummary,
}));

vi.mock('../../../../../common/config/ConfigCenter', () => ({
  configCenter: {
    get: mocks.configGet,
  },
}));

import { scrapeAsin, scrapeMultipleAsins } from './scraperService';

function createResponse(body = '<html>product</html>', status = 200): Response {
  return new Response(body, { status });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getProxyConfig.mockReturnValue({
    type: 'custom_api',
    customUrl: 'https://proxy.example/?url=',
  });
  mocks.getByAsinAsync.mockResolvedValue(null);
  mocks.parseProductPage.mockReturnValue({
    title: 'Travel Organizer',
    bullets: ['Compact', 'Water resistant'],
  });
  mocks.parseReviews.mockReturnValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('scrapeAsin validation and cache', () => {
  it('returns a failed product for unsupported sites without reading storage or network', async () => {
    const status = vi.fn();

    const result = await scrapeAsin('B001', 'INVALID' as ScraperSite, false, status);

    expect(result).toMatchObject({
      asin: 'B001',
      scrape_status: 'failed',
      error: '无效的站点参数: INVALID',
    });
    expect(status).toHaveBeenCalledWith('B001', 'failed', '无效的站点参数: INVALID');
    expect(mocks.getProxyConfig).not.toHaveBeenCalled();
  });

  it('returns fresh cached products before making proxy requests', async () => {
    const status = vi.fn();
    const cachedProduct: ScrapedProduct = {
      asin: 'B001',
      url: 'https://cached.example',
      language: 'English (US)',
      productTitle: 'Cached title',
      feature_bullets: ['Cached bullet'],
      customer_reviews: [],
      scrape_status: 'success',
      error: '',
    };
    mocks.getByAsinAsync.mockResolvedValue({
      product: cachedProduct,
      timestamp: new Date().toISOString(),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await scrapeAsin('B001', 'US', false, status);

    expect(result).toBe(cachedProduct);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith('B001', 'success', expect.stringContaining('命中缓存'));
  });
});

describe('scrapeAsin network scraping', () => {
  it('scrapes product content through the configured proxy', async () => {
    const status = vi.fn();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      createResponse('<html>listing</html>')
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await scrapeAsin('B001', 'US', false, status);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      encodeURIComponent('https://www.amazon.com/dp/B001?language=en_US')
    );
    expect(mocks.parseProductPage).toHaveBeenCalledWith('<html>listing</html>', 'B001', 'US');
    expect(result).toMatchObject({
      asin: 'B001',
      url: 'https://www.amazon.com/dp/B001?language=en_US',
      language: 'English (US)',
      productTitle: 'Travel Organizer',
      feature_bullets: ['Compact', 'Water resistant'],
      customer_reviews: [],
      scrape_status: 'success',
    });
    expect(status).toHaveBeenLastCalledWith('B001', 'success', '标题:已采集, 描述:2, 评论:0');
  });

  it('falls back to product-page reviews when review pages have no parsed reviews', async () => {
    const status = vi.fn();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      createResponse('<html>content</html>')
    );
    vi.stubGlobal('fetch', fetchMock);
    mocks.parseReviews
      .mockReturnValueOnce([])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { title: 'Helpful', content: 'Worked well', rating: 5, isVerified: true },
      ]);

    const result = await scrapeAsin('B002', 'US', true, status);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.customer_reviews).toEqual([
      {
        headline: 'Helpful',
        body: 'Worked well',
        star_rating: 5,
        is_verified: true,
        review_date: '',
      },
    ]);
    expect(status).toHaveBeenCalledWith('B002', 'scraping', '正在分析评论...');
  });

  it('marks the scrape as failed when proxy configuration is incomplete', async () => {
    const status = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getProxyConfig.mockReturnValue({ type: 'custom_api' });
    vi.stubGlobal('fetch', vi.fn());

    const result = await scrapeAsin('B003', 'US', false, status);

    expect(result.scrape_status).toBe('failed');
    expect(result.error).toContain('未配置 API Key 或 URL');
    expect(status).toHaveBeenLastCalledWith('B003', 'failed', expect.stringContaining('summary:'));
    expect(errorSpy).toHaveBeenCalledWith('Task Error B003:', expect.any(Error));
    expect(mocks.sleep).toHaveBeenCalledWith(1000);
  });
});

describe('scrapeMultipleAsins', () => {
  it('processes ASINs in batches and waits between batches', async () => {
    const status = vi.fn();

    const results = await scrapeMultipleAsins(
      ['B001', 'B002', 'B003'],
      'INVALID' as ScraperSite,
      false,
      status
    );

    expect(results.map(result => result.scrape_status)).toEqual(['failed', 'failed', 'failed']);
    expect(status).toHaveBeenCalledTimes(3);
    expect(mocks.sleep).toHaveBeenCalledTimes(1);
    const sleepCalls = mocks.sleep.mock.calls as unknown as Array<[number]>;
    expect(sleepCalls[0]?.[0]).toBeGreaterThanOrEqual(1);
  });
});
