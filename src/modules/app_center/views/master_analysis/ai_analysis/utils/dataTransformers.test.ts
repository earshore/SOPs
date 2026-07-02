import { describe, expect, it, vi } from 'vitest';
import {
  convertScraperDataToProduct,
  extractAsinsFromScraperData,
  getProductsByAsins,
  mergeProducts,
} from './dataTransformers';

describe('dataTransformers', () => {
  it('converts scraper product aliases into the analysis product shape', () => {
    const product = convertScraperDataToProduct({
      asin: 'B001',
      title: 'Fallback title',
      bulletPoints: ['Portable', 'Quiet'],
      reviews: [
        {
          rating: 4,
          review_title: 'Works well',
          review_text: 'Useful on trips',
          origin_country: 'US',
          review_date: '2026-07-01',
          _origin_site: 'amazon.com',
        },
      ],
    });

    expect(product).toMatchObject({
      asin: 'B001',
      productTitle: 'Fallback title',
      feature_bullets: ['Portable', 'Quiet'],
      scrape_status: 'success',
      customer_reviews: [
        {
          star_rating: 4,
          headline: 'Works well',
          body: 'Useful on trips',
          origin_country: 'US',
          review_date: '2026-07-01',
          _origin_site: 'amazon.com',
        },
      ],
    });
  });

  it('returns null and logs invalid product payloads', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(convertScraperDataToProduct(null)).toBeNull();

    expect(errorSpy).toHaveBeenCalledWith('[数据转换] 产品数据无效:', null);
  });

  it('merges products and rejects empty inputs', () => {
    const first = convertScraperDataToProduct({
      asin: 'B001',
      productTitle: 'Alpha',
      feature_bullets: ['A'],
      customer_reviews: [{ headline: 'Good' }],
    });
    const second = convertScraperDataToProduct({
      asin: 'B002',
      productTitle: 'Beta',
      feature_bullets: ['B'],
      customer_reviews: [{ headline: 'Better' }],
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) {
      throw new Error('Expected scraper data conversion to return products');
    }

    const merged = mergeProducts([first, second]);

    expect(merged).toMatchObject({
      asin: 'B001, B002',
      productTitle: 'Alpha | Beta',
      feature_bullets: ['A', 'B'],
      metadata: {
        merged: true,
        product_count: 2,
        asins: ['B001', 'B002'],
      },
    });
    expect(() => mergeProducts([])).toThrow('没有可合并的产品数据');
  });

  it('extracts and selects products by ASIN', () => {
    const scrapedData = {
      products: [
        { asin: 'B001', productTitle: 'Alpha' },
        { asin: '', productTitle: 'Missing asin' },
        { asin: 'B002', productTitle: 'Beta' },
      ],
    };

    expect(extractAsinsFromScraperData(scrapedData)).toEqual(['B001', 'B002']);
    expect(extractAsinsFromScraperData({ products: 'invalid' })).toEqual([]);
    expect(getProductsByAsins(scrapedData, ['B002', 'B003']).map(product => product.asin)).toEqual([
      'B002',
    ]);
    expect(getProductsByAsins(null, ['B001'])).toEqual([]);
  });
});
