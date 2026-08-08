/**
 * estimateRunAtDepth 测试：
 * - 三档（fast/balanced/deep）估算单调：分片成本随档位递增
 * - 与真实调度计划同源：maxConcurrency 来自 resolveAnalysisSchedulePlan
 * - reasoning 与档位联动（fast→low cap），不读全局存储（显式传 userReasoning）
 */

import { describe, expect, it } from 'vitest';
import { estimateRunAtDepth } from '../estimateRunPlan';
import { resolveAnalysisSchedulePlan } from '../analysisScheduler';
import type { Product } from '../../config/sampleData';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    asin: 'B0TEST',
    productTitle: 'Test Product',
    feature_bullets: ['b1', 'b2', 'b3', 'b4', 'b5'],
    customer_reviews: [],
    ...overrides,
  } as Product;
}

function makeReview(star: number, body: string) {
  return {
    body,
    headline: 'h',
    origin_country: 'DE',
    review_date: '2026-01-01',
    star_rating: star,
    _origin_site: 'amazon.de',
  };
}

describe('estimateRunAtDepth', () => {
  const reviews = Array.from({ length: 200 }, (_, i) => makeReview(1, `issue ${i}`));
  const product = makeProduct({ customer_reviews: reviews });
  const targetIds = ['fatal-flaws'];
  const userReasoning = { enabled: true, effort: 'max' as const };

  it('三档估算单调：deep 成本高于 balanced 高于 fast', () => {
    const fast = estimateRunAtDepth({ product, targetIds, userReasoning }, 'fast');
    const balanced = estimateRunAtDepth({ product, targetIds, userReasoning }, 'balanced');
    const deep = estimateRunAtDepth({ product, targetIds, userReasoning }, 'deep');

    expect(fast.estimate.callCount).toBeLessThan(balanced.estimate.callCount);
    expect(balanced.estimate.callCount).toBeLessThan(deep.estimate.callCount);
  });

  it('推理档位与全局推理联动：fast→low、deep→max（cap 生效）', () => {
    const fast = estimateRunAtDepth({ product, targetIds, userReasoning }, 'fast');
    const deep = estimateRunAtDepth({ product, targetIds, userReasoning }, 'deep');
    expect(fast.reasoning).toEqual({ enabled: true, effort: 'low' });
    expect(deep.reasoning).toEqual({ enabled: true, effort: 'max' });
  });

  it('并发与真实调度同源（resolveAnalysisSchedulePlan）', () => {
    const fast = estimateRunAtDepth(
      { product, targetIds, schedulingPreference: 'recommended', userReasoning },
      'fast'
    );
    const plan = resolveAnalysisSchedulePlan({
      preference: 'recommended',
      targetIds,
      product,
    });
    expect(fast.plan.maxConcurrency).toBe(plan.maxConcurrency);
    expect(fast.estimate.callCount).toBeGreaterThan(0);
  });

  it('不传偏好时回退 recommended', () => {
    const run = estimateRunAtDepth({ product, targetIds, userReasoning }, 'balanced');
    expect(run.plan.preference).toBe('recommended');
  });
});
