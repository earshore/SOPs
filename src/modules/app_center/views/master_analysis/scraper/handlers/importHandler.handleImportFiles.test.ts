import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_EVENTS, MODULE_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';
import { showToast } from '@/common/ui';
import { HistoryService } from '../../services/historyService';
import { handleImportFiles, mergeProducts } from './importHandler';
import type { ScrapedData, ScraperSite } from '../types';
import type { CustomerReview, ScrapedProduct } from '@/types/modules-business';

vi.mock('../../services/historyService', () => ({
  HistoryService: {
    saveAsync: vi.fn(),
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/common/EventBus', () => ({
  default: {
    emit: vi.fn(),
  },
}));

function createImportData(marketplace: string): ScrapedData {
  return {
    metadata: {
      scrape_timestamp: '2026-01-01T00:00:00.000Z',
      marketplace,
      domain: 'amazon.fr',
      language: 'French',
      total_asins: 1,
    },
    products: [
      {
        asin: 'B0TEST0001',
        url: 'https://example.test/dp/B0TEST0001',
        language: 'French',
        productTitle: 'Imported product',
        feature_bullets: ['Feature'],
        customer_reviews: [],
        scrape_status: 'success',
        error: '',
      },
    ],
  };
}

function createImportFile(data: ScrapedData): File {
  return new File([JSON.stringify(data)], 'import.json', { type: 'application/json' });
}

function createReview(id: string, headline: string): CustomerReview {
  return {
    id,
    author: 'Tester',
    headline,
    body: headline,
    star_rating: 5,
    is_verified: true,
    review_date: '2026-01-01',
  };
}

function createProduct(
  site: string,
  title: string,
  reviews: CustomerReview[]
): ScrapedProduct & { _source_site?: string } {
  return {
    asin: 'B0TEST0001',
    url: `https://example.test/${site}/B0TEST0001`,
    language: site,
    productTitle: title,
    feature_bullets: [`${site} bullet`],
    customer_reviews: reviews,
    scrape_status: 'success',
    error: '',
    _source_site: site,
  };
}

describe('handleImportFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(HistoryService.saveAsync).mockResolvedValue([]);
  });

  it('uses the imported marketplace for a single-site file', async () => {
    const selectedSite: ScraperSite = 'DE';
    const result = await handleImportFiles(
      [createImportFile(createImportData('FR'))],
      null,
      selectedSite
    );

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.marketplace).toBe('FR');
    expect(result.data?.metadata?.domain).toBe('amazon.fr');
    expect(result.data?.products).toHaveLength(1);
    expect(HistoryService.saveAsync).toHaveBeenCalledWith(result.data);
    expect(eventBus.emit).toHaveBeenCalledWith(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, result.data);
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.DATA_UPDATED);
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.HISTORY_UPDATED);
    expect(showToast).toHaveBeenCalledWith('成功导入并合并 1 个ASIN (基准站点: FR)', {
      type: 'success',
    });
  });

  it('drops unsupported marketplace values before rendering a site selection modal', async () => {
    document.body.innerHTML = '';

    const result = await handleImportFiles(
      [
        createImportFile(createImportData('<img x-init=notify()>')),
        createImportFile(createImportData('<img x-init=notifyAgain()>')),
      ],
      null,
      'DE'
    );

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.marketplace).toBe('DE');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[x-init]')).toBeNull();
  });

  it('keeps the selected marketplace product as the merge master when current data already has the same ASIN', () => {
    const currentProduct = createProduct('DE', 'Existing DE title', [
      createReview('R-SAME', 'Existing duplicate review'),
      createReview('R-DE', 'Existing DE review'),
    ]);
    const frProduct = createProduct('FR', 'Selected FR title', [
      createReview('R-SAME', 'Selected FR duplicate review'),
      createReview('R-FR', 'Selected FR review'),
    ]);
    const itProduct = createProduct('IT', 'Imported IT title', [
      createReview('R-IT', 'Imported IT review'),
    ]);

    const result = mergeProducts(
      new Map([['B0TEST0001', [frProduct, itProduct]]]),
      'FR',
      new Map([['B0TEST0001', currentProduct]])
    );

    expect(result).toHaveLength(1);
    const mergedProduct = result[0];
    if (!mergedProduct) throw new Error('Expected merged product');

    expect(mergedProduct.productTitle).toBe('Selected FR title');
    expect(mergedProduct.feature_bullets).toEqual(['FR bullet']);
    expect(mergedProduct.customer_reviews.find(review => review.id === 'R-SAME')?.headline).toBe(
      'Selected FR duplicate review'
    );
    expect(mergedProduct.customer_reviews.map(review => review.id)).toEqual([
      'R-SAME',
      'R-FR',
      'R-IT',
      'R-DE',
    ]);
  });
});
