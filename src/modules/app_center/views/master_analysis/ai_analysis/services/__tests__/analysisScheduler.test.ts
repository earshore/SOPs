import { describe, expect, it } from 'vitest';
import { resolveAnalysisSchedulePlan } from '../analysisScheduler';
import type { Product } from '../../config/sampleData';

const HIGH_RISK_TARGET_IDS = [
  'title-keywords',
  'selling-points',
  'fatal-flaws',
  'wow-moments',
  'hesitation-points',
  'buyer-profile',
  'vocab-gap',
  'promise-reality',
];

function createProduct(
  options: {
    reviewCount?: number;
    asinCount?: number;
    bodyLength?: number;
    bulletCount?: number;
  } = {}
): Product {
  const { reviewCount = 4, asinCount = 1, bodyLength = 80, bulletCount = 5 } = options;

  return {
    asin: Array.from({ length: asinCount }, (_, index) => `B00TEST${index}`).join(', '),
    productTitle: 'Test Product',
    feature_bullets: Array.from({ length: bulletCount }, (_, index) => `Feature ${index + 1}`),
    customer_reviews: Array.from({ length: reviewCount }, (_, index) => ({
      star_rating: (index % 5) + 1,
      headline: `Review ${index + 1}`,
      body: 'x'.repeat(bodyLength),
      origin_country: 'US',
      review_date: '2026-01-01',
      _origin_site: 'US',
    })),
    scrape_status: 'success',
    metadata: {
      product_count: asinCount,
    },
  };
}

describe('analysisScheduler', () => {
  it('keeps the default recommendation balanced and bounded by task count', () => {
    const plan = resolveAnalysisSchedulePlan({
      preference: 'recommended',
      targetIds: ['title-keywords', 'selling-points'],
      product: createProduct(),
      enableCache: false,
    });

    expect(plan).toMatchObject({
      tier: 'recommended',
      maxConcurrency: 2,
      failureStrategy: 'continue',
      failureMode: 'best_effort',
      streamMode: 'progressive',
      retryBudget: 1,
    });
  });

  it('uses a stable final-only plan for reliability on high-risk workloads', () => {
    const plan = resolveAnalysisSchedulePlan({
      preference: 'reliability',
      targetIds: HIGH_RISK_TARGET_IDS,
      product: createProduct({ reviewCount: 240, asinCount: 3, bodyLength: 240, bulletCount: 14 }),
      enableCache: true,
    });

    expect(plan).toMatchObject({
      tier: 'stable',
      maxConcurrency: 1,
      failureStrategy: 'abort',
      failureMode: 'complete_required',
      streamMode: 'final_only',
      retryBudget: 2,
    });
    expect(plan.complexityScore).toBeGreaterThanOrEqual(5);
  });

  it('keeps speed priority but downgrades from extreme when workload risk is high', () => {
    const plan = resolveAnalysisSchedulePlan({
      preference: 'speed',
      targetIds: HIGH_RISK_TARGET_IDS,
      product: createProduct({ reviewCount: 220, asinCount: 3, bodyLength: 220, bulletCount: 12 }),
      enableCache: false,
    });

    expect(plan).toMatchObject({
      tier: 'recommended',
      maxConcurrency: 4,
      failureMode: 'best_effort',
      streamMode: 'progressive',
      retryBudget: 1,
    });
  });

  it('prioritizes cached targets and limits concurrency to uncached work', () => {
    const plan = resolveAnalysisSchedulePlan({
      preference: 'speed',
      targetIds: ['title-keywords', 'selling-points', 'fatal-flaws', 'promise-reality'],
      cachedTargetIds: ['promise-reality', 'title-keywords'],
      product: createProduct({ reviewCount: 20 }),
      enableCache: true,
    });

    expect(plan.cachedTargetIds).toEqual(['promise-reality', 'title-keywords']);
    expect(plan.uncachedTaskCount).toBe(2);
    expect(plan.maxConcurrency).toBe(2);
    expect(new Set(plan.taskOrder.slice(0, 2))).toEqual(
      new Set(['promise-reality', 'title-keywords'])
    );
    expect(plan.cacheStrategy).toBe('prefer_cache');
  });
});
