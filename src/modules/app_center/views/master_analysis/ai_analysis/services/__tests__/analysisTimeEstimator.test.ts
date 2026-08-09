/**
 * analysisTimeEstimator 测试：
 * - estimateAnalysisWorkload：oneshot / map-reduce / selling / review 调用数口径
 * - estimateAnalysisTime：缓存命中归零、并发分桶、推理档位基准、规模系数、label 格式化
 */

import { describe, expect, it } from 'vitest';
import {
  estimateAnalysisTime,
  estimateAnalysisWorkload,
  estimateSingleCallTime,
} from '../analysisTimeEstimator';
import type { Product } from '../../config/sampleData';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    asin: 'B0TEST',
    productTitle: 'Test Product',
    feature_bullets: ['bullet 1', 'bullet 2', 'bullet 3', 'bullet 4', 'bullet 5'],
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

const EIGHT_TARGETS = [
  'title-keywords',
  'selling-points',
  'fatal-flaws',
  'wow-moments',
  'hesitation-points',
  'buyer-profile',
  'vocab-gap',
  'promise-reality',
];

describe('estimateAnalysisWorkload', () => {
  it('小数据量：8 目标全 oneshot（1 调用/目标，无 reduce）', () => {
    const product = makeProduct({
      // 混合星级，保证 fatal-flaws(1-3★)/wow-moments(5★) 等 starFilter 目标都有匹配评论
      customer_reviews: [1, 2, 3, 4, 5].map((star, i) => makeReview(star, `ok ${i}`)),
    });
    const w = estimateAnalysisWorkload(product, EIGHT_TARGETS);
    expect(w.mapCalls).toBe(8);
    expect(w.reduceCalls).toBe(0);
    expect(Object.values(w.callsByTarget).every(c => c === 1)).toBe(true);
  });

  it('评论超阈值 → review 目标 map-reduce（分片 + 1 reduce）', () => {
    const reviews = Array.from({ length: 60 }, (_, i) => makeReview(1, `issue ${i}`));
    const product = makeProduct({ customer_reviews: reviews });
    const w = estimateAnalysisWorkload(product, ['fatal-flaws']);
    // fatal-flaws 低星评论 60 条 > 24 阈值 → map 分片 = ceil(60/16)=4 + reduce 1
    expect(w.reduceCalls).toBe(1);
    expect(w.callsByTarget['fatal-flaws']).toBe(5);
  });

  it('多 bullet → selling-points map-reduce（ceil(bullets/8) map + 1 reduce）', () => {
    const product = makeProduct({ feature_bullets: Array.from({ length: 10 }, (_, i) => `b${i}`) });
    const w = estimateAnalysisWorkload(product, ['selling-points']);
    expect(w.reduceCalls).toBe(1);
    expect(w.callsByTarget['selling-points']).toBe(3); // ceil(10/8)=2 map + 1 reduce
  });

  it('显式档位：三档分片预算单调（fast < balanced < deep）', () => {
    const reviews = Array.from({ length: 200 }, (_, i) => makeReview(1, `issue ${i}`));
    const product = makeProduct({ customer_reviews: reviews });
    // fatal-flaws 属 star bucket：预算 36 / 96 / 160 → 分片 3 / 6 / 10
    const fast = estimateAnalysisWorkload(product, ['fatal-flaws'], 'fast');
    const balanced = estimateAnalysisWorkload(product, ['fatal-flaws'], 'balanced');
    const deep = estimateAnalysisWorkload(product, ['fatal-flaws'], 'deep');
    expect(fast.callsByTarget['fatal-flaws']).toBe(4);
    expect(balanced.callsByTarget['fatal-flaws']).toBe(7);
    expect(deep.callsByTarget['fatal-flaws']).toBe(11);
  });

  it('显式档位：预算封顶生效（400 条仍按预算分片）', () => {
    const reviews = Array.from({ length: 400 }, (_, i) => makeReview(1, `issue ${i}`));
    const product = makeProduct({ customer_reviews: reviews });
    const fast = estimateAnalysisWorkload(product, ['fatal-flaws'], 'fast');
    const deep = estimateAnalysisWorkload(product, ['fatal-flaws'], 'deep');
    expect(fast.callsByTarget['fatal-flaws']).toBe(4); // ceil(36/16)=3 map + 1 reduce
    expect(deep.callsByTarget['fatal-flaws']).toBe(11); // ceil(160/16)=10 map + 1 reduce
  });

  it('不传档位时回退运行时（与既有行为一致）', () => {
    const reviews = Array.from({ length: 60 }, (_, i) => makeReview(1, `issue ${i}`));
    const product = makeProduct({ customer_reviews: reviews });
    // 默认（运行时档位）60 条 > 24 阈值 → map-reduce
    const w = estimateAnalysisWorkload(product, ['fatal-flaws']);
    expect(w.callsByTarget['fatal-flaws']).toBeGreaterThan(1);
  });
});

describe('estimateAnalysisTime', () => {
  const base = {
    targetIds: EIGHT_TARGETS,
    product: makeProduct(),
    maxConcurrency: 6,
    cachedTargetIds: [] as string[],
    estimatedInputTokens: 4000,
    reasoning: { enabled: false, effort: 'low' as const },
  };

  it('显式档位驱动耗时：deep 调用数与时长均高于 fast（同并发同推理）', () => {
    const reviews = Array.from({ length: 200 }, (_, i) => makeReview(1, `issue ${i}`));
    const product = makeProduct({ customer_reviews: reviews });
    const fast = estimateAnalysisTime({
      ...base,
      targetIds: ['fatal-flaws'],
      product,
      maxConcurrency: 4,
      evidenceDepth: 'fast',
    });
    const deep = estimateAnalysisTime({
      ...base,
      targetIds: ['fatal-flaws'],
      product,
      maxConcurrency: 4,
      evidenceDepth: 'deep',
    });
    expect(deep.callCount).toBeGreaterThan(fast.callCount);
    expect(deep.secondsHigh).toBeGreaterThan(fast.secondsHigh);
  });

  it('off 档：8 目标并发 6 → 约 2-3 分钟级（区间格式正确）', () => {
    const est = estimateAnalysisTime(base);
    expect(est.callCount).toBe(8);
    // ceil(8/6)=2 × 6s × 1.15 ≈ 14s；0.8×~1.3× → 11-18s
    expect(est.secondsLow).toBeLessThanOrEqual(est.secondsHigh);
    expect(est.secondsHigh).toBeLessThan(60);
    expect(est.label).toMatch(/约 \d+-\d+ 秒/);
  });

  it('缓存命中目标不计调用：全命中 → callCount 0 且耗时最小', () => {
    const est = estimateAnalysisTime({ ...base, cachedTargetIds: EIGHT_TARGETS });
    expect(est.callCount).toBe(0);
    expect(est.secondsLow).toBe(1);
    // 同值区间收起为单值：约 1 秒（而非约 1-1 秒）
    expect(est.label).toBe('约 1 秒');
  });

  it('max 档比 off 档慢（基准表生效）', () => {
    const off = estimateAnalysisTime(base);
    const max = estimateAnalysisTime({ ...base, reasoning: { enabled: true, effort: 'max' } });
    expect(max.secondsHigh).toBeGreaterThan(off.secondsHigh * 5);
  });

  it('大输入规模放大估算（规模系数）', () => {
    const small = estimateAnalysisTime(base);
    const large = estimateAnalysisTime({ ...base, estimatedInputTokens: 20000 });
    expect(large.secondsHigh).toBeGreaterThan(small.secondsHigh);
  });

  it('超过 60 秒输出分钟区间', () => {
    const est = estimateAnalysisTime({
      ...base,
      reasoning: { enabled: true, effort: 'max' },
    });
    expect(est.secondsHigh).toBeGreaterThan(60);
    expect(est.label).toMatch(/约 \d+ 分钟|约 \d+-\d+ 分钟/);
  });

  it('并发为 1 时串行估算（慢于并发 6）', () => {
    const serial = estimateAnalysisTime({ ...base, maxConcurrency: 1 });
    const parallel = estimateAnalysisTime(base);
    expect(serial.secondsHigh).toBeGreaterThan(parallel.secondsHigh);
  });
});

describe('estimateSingleCallTime', () => {
  it('toolScale 缺省：off 档单调用秒级区间（无 3x 放大）', () => {
    const est = estimateSingleCallTime({ enabled: false, effort: 'low' });
    expect(est.callCount).toBe(1);
    expect(est.secondsHigh).toBeLessThan(60);
    expect(est.label).toMatch(/约 \d+-\d+ 秒/);
  });

  it('toolScale 生效：off 档放大后进入分钟级区间', () => {
    const est = estimateSingleCallTime({ enabled: false, effort: 'low' }, { toolScale: true });
    // 14 × 1.15 × 3 = 48.3 → 区间 39-63 秒 → 「约 1-2 分钟」
    expect(est.secondsLow).toBe(39);
    expect(est.secondsHigh).toBe(63);
    expect(est.label).toMatch(/约 \d+-\d+ 分钟/);
  });

  it('全局推理档位影响单调用估算（与真实调用继承推理等级同源）', () => {
    const off = estimateSingleCallTime({ enabled: false, effort: 'low' }, { toolScale: true });
    const max = estimateSingleCallTime({ enabled: true, effort: 'max' }, { toolScale: true });
    expect(max.secondsHigh).toBeGreaterThan(off.secondsHigh * 3);
  });
});
