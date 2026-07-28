import { describe, expect, it } from 'vitest';
import type { Product } from '../../config/sampleData';
import {
  getSellingPointsSourceSlices,
  normalizeSellingPointsResult,
  shouldUseSellingPointsMapReduce,
} from '../sellingPointsPipeline';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    asin: 'B001',
    productTitle: 'Title',
    feature_bullets: ['b1', 'b2', 'b3'],
    customer_reviews: [],
    scrape_status: 'success',
    metadata: {},
    ...overrides,
  };
}

describe('sellingPointsPipeline helpers', () => {
  it('uses map-reduce for multi-ASIN source_products without dropping bullets', () => {
    const product = makeProduct({
      asin: 'B001, B002',
      feature_bullets: Array.from({ length: 10 }, (_, i) => `bullet-${i}`),
      metadata: {
        merged: true,
        source_products: [
          {
            asin: 'B001',
            productTitle: 'A',
            feature_bullets: ['a1', 'a2', 'a3', 'a4', 'a5'],
          },
          {
            asin: 'B002',
            productTitle: 'B',
            feature_bullets: ['b1', 'b2', 'b3', 'b4', 'b5'],
          },
        ],
      },
    });

    expect(shouldUseSellingPointsMapReduce(product)).toBe(true);
    const slices = getSellingPointsSourceSlices(product);
    expect(slices).toHaveLength(2);
    expect(slices[0]?.feature_bullets).toHaveLength(5);
    expect(slices[1]?.feature_bullets).toHaveLength(5);
  });

  it('keeps oneshot for small single-ASIN listings', () => {
    const product = makeProduct({
      feature_bullets: ['only', 'five', 'points', 'here', 'ok'],
    });
    expect(shouldUseSellingPointsMapReduce(product)).toBe(false);
  });

  it('normalizes missing strategy objects so partial map output is renderable', () => {
    const normalized = normalizeSellingPointsResult({
      bullet_analysis: [{ bullet_index: 1, original_text_summary: 'x' }],
    });
    expect(normalized.bullet_analysis).toHaveLength(1);
    expect(normalized.overall_strategy).toMatchObject({
      primary_differentiation: '',
      emotional_hooks: [],
    });
    expect(normalized.function_scene_matrix).toMatchObject({
      functions: [],
      scenes: [],
      pain_points: [],
    });
  });
});
