import { describe, expect, it } from 'vitest';
import type { Product } from '../../config/sampleData';
import {
  buildSellingPointsSourcePack,
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
  it('keeps multi-ASIN slices without forcing map-reduce for moderate bullet counts', () => {
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

    // 10 bullets slightly above default threshold => map-reduce; slices preserved.
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

  it('dedupes identical bullets per ASIN while keeping multi-ASIN slices', () => {
    const product = makeProduct({
      asin: 'B001, B002',
      feature_bullets: ['a', 'a', 'b'],
      metadata: {
        merged: true,
        source_products: [
          {
            asin: 'B001',
            productTitle: 'A',
            feature_bullets: ['Long lasting scent', 'long lasting scent', '  ', 'Gift ready'],
          },
          {
            asin: 'B002',
            productTitle: 'B',
            feature_bullets: ['Long lasting scent', 'Travel size'],
          },
        ],
      },
    });

    const pack = buildSellingPointsSourcePack(product);
    expect(pack.slices).toHaveLength(2);
    expect(pack.slices[0]?.feature_bullets).toEqual(['Long lasting scent', 'Gift ready']);
    expect(pack.slices[1]?.feature_bullets).toEqual(['Long lasting scent', 'Travel size']);
    expect(pack.rawBulletCount).toBe(6);
    expect(pack.bulletCount).toBe(4);
    expect(pack.dedupe.duplicatesRemoved).toBe(1);
    expect(pack.dedupe.emptyRemoved).toBe(1);
    expect(getSellingPointsSourceSlices(product)).toHaveLength(2);
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

  it('normalizes non-record strategy fields to their safe defaults', () => {
    const normalized = normalizeSellingPointsResult({
      overall_strategy: [],
      function_scene_matrix: null,
    });

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
