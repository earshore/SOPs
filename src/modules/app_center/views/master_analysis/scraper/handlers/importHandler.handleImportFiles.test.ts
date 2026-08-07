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
    expect(result.data?.metadata?.data_source).toBe('json_import');
    expect(result.data?.products).toHaveLength(1);
    expect(HistoryService.saveAsync).toHaveBeenCalledWith(result.data);
    expect(eventBus.emit).toHaveBeenCalledWith(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, result.data);
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.DATA_UPDATED);
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.HISTORY_UPDATED);
    expect(showToast).toHaveBeenCalledWith('成功合并导入 1 个ASIN (基准站点: FR)', {
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

  it('keeps existing fields and appends only reviews for ASINs already in current data', () => {
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

    // 同 ASIN 已存在：保留现有字段（标题/五点），导入仅追加评论
    expect(mergedProduct.productTitle).toBe('Existing DE title');
    expect(mergedProduct.feature_bullets).toEqual(['DE bullet']);
    expect(mergedProduct.customer_reviews.find(review => review.id === 'R-SAME')?.headline).toBe(
      'Existing duplicate review'
    );
    expect(mergedProduct.customer_reviews.map(review => review.id)).toEqual([
      'R-SAME',
      'R-DE',
      'R-FR',
      'R-IT',
    ]);
  });
  it('keeps existing ASINs that are not re-imported when merging in batches', () => {
    const currentA = createProduct('DE', 'Existing A title', [
      createReview('R-A1', 'Existing A review 1'),
    ]);
    const importedB = {
      ...createProduct('DE', 'Imported B title', [createReview('R-B1', 'Imported B review 1')]),
      asin: 'B0TEST0002',
    };

    const result = mergeProducts(
      new Map([['B0TEST0002', [importedB]]]),
      'DE',
      new Map([['B0TEST0001', currentA]])
    );

    expect(result.map(product => product.asin)).toEqual(['B0TEST0001', 'B0TEST0002']);
    expect(result[0]?.customer_reviews.map(review => review.id)).toEqual(['R-A1']);
    expect(result[1]?.customer_reviews.map(review => review.id)).toEqual(['R-B1']);
  });

  it('overwrite mode replaces existing products with imported ones', async () => {
    const currentProduct = {
      asin: 'B0TEST0001',
      url: 'https://example.test/dp/B0TEST0001',
      language: 'French',
      productTitle: 'Existing A title',
      feature_bullets: ['Existing bullet'],
      customer_reviews: [createReview('R-X', 'Existing review')],
      scrape_status: 'success',
      error: '',
    };
    const importedProductX = {
      ...currentProduct,
      productTitle: 'Imported B title',
      feature_bullets: ['Imported bullet'],
      customer_reviews: [createReview('R-X2', 'Imported review')],
    };
    const importedProductY = {
      ...currentProduct,
      asin: 'B0TEST0002',
      url: 'https://example.test/dp/B0TEST0002',
      productTitle: 'New Y title',
      feature_bullets: ['Y bullet'],
      customer_reviews: [createReview('R-Y', 'Y review')],
    };
    const currentData: ScrapedData = {
      ...createImportData('FR'),
      products: [currentProduct],
    };
    const importedData: ScrapedData = {
      ...createImportData('FR'),
      products: [importedProductX, importedProductY],
    };

    const result = await handleImportFiles(
      [createImportFile(importedData)],
      currentData,
      'FR',
      'overwrite'
    );

    expect(result.success).toBe(true);
    expect(result.data?.products).toHaveLength(2);

    // 已存在的 ASIN X 被导入版本整体覆盖：标题/五点/评论全部替换为导入数据，旧数据清空
    const productX = result.data?.products.find(product => product.asin === 'B0TEST0001');
    expect(productX?.productTitle).toBe('Imported B title');
    expect(productX?.feature_bullets).toEqual(['Imported bullet']);
    expect(productX?.customer_reviews.map(review => review.id)).toEqual(['R-X2']);

    // 新 ASIN Y 被加入
    const productY = result.data?.products.find(product => product.asin === 'B0TEST0002');
    expect(productY?.productTitle).toBe('New Y title');
    expect(productY?.customer_reviews.map(review => review.id)).toEqual(['R-Y']);
  });

  it('overwrite mode shows the overwrite toast message', async () => {
    const currentData = createImportData('FR');
    const importedData: ScrapedData = {
      ...createImportData('FR'),
      products: [
        {
          ...createImportData('FR').products[0],
          asin: 'B0TEST0002',
          url: 'https://example.test/dp/B0TEST0002',
          productTitle: 'New Y title',
        },
      ],
    };

    const result = await handleImportFiles(
      [createImportFile(importedData)],
      currentData,
      'FR',
      'overwrite'
    );

    expect(result.success).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('成功覆盖导入'), {
      type: 'success',
    });
  });

  it('overwrite mode drops existing ASINs entirely', () => {
    const existing = createProduct('DE', 'Existing title', [createReview('R-1', 'Existing review')]);
    const importedB = {
      ...createProduct('FR', 'Imported B title', [createReview('R-B', 'Imported B review')]),
      asin: 'B0TEST0002',
    };

    // overwrite 模式：清空替换，现有 ASIN X 被丢弃，结果只含导入的 Y
    const overwriteResult = mergeProducts(
      new Map([['B0TEST0002', [importedB]]]),
      'FR',
      new Map([['B0TEST0001', existing]]),
      'overwrite'
    );
    expect(overwriteResult.map(product => product.asin)).toEqual(['B0TEST0002']);

    // merge 模式：未被导入覆盖的现有 ASIN X 保留
    const mergeResult = mergeProducts(
      new Map([['B0TEST0002', [importedB]]]),
      'FR',
      new Map([['B0TEST0001', existing]]),
      'merge'
    );
    expect(mergeResult.map(product => product.asin)).toEqual(['B0TEST0001', 'B0TEST0002']);
  });
});
