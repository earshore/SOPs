import { describe, expect, it } from 'vitest';
import type { Product, Review } from '../../config/sampleData';
import {
  buildReviewSourcePack,
  countReviewsForTarget,
  estimateReviewMapCalls,
  getReviewSourceSlices,
  isGeneralReviewEvidenceTargetId,
  isReviewEvidenceTargetId,
  normalizeBuyerProfileResult,
  normalizeFatalFlawsResult,
  normalizeHesitationResult,
  normalizePromiseRealityResult,
  normalizeVocabGapResult,
  normalizeWowMomentsResult,
  shouldUseReviewMapReduce,
} from '../reviewEvidencePipeline';

function makeReview(star: number, body: string): Review {
  return {
    star_rating: star,
    headline: `h${star}`,
    body,
    origin_country: 'DE',
    review_date: '2026-01-01',
    _origin_site: 'amazon.de',
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    asin: 'B001',
    productTitle: 'Title',
    feature_bullets: ['bullet a'],
    customer_reviews: [],
    scrape_status: 'success',
    metadata: {},
    ...overrides,
  };
}

describe('reviewEvidencePipeline helpers', () => {
  it('recognizes all six review-evidence targets', () => {
    expect(isReviewEvidenceTargetId('fatal-flaws')).toBe(true);
    expect(isReviewEvidenceTargetId('wow-moments')).toBe(true);
    expect(isReviewEvidenceTargetId('hesitation-points')).toBe(true);
    expect(isReviewEvidenceTargetId('buyer-profile')).toBe(true);
    expect(isReviewEvidenceTargetId('vocab-gap')).toBe(true);
    expect(isReviewEvidenceTargetId('promise-reality')).toBe(true);
    expect(isReviewEvidenceTargetId('selling-points')).toBe(false);
    expect(isGeneralReviewEvidenceTargetId('hesitation-points')).toBe(true);
    expect(isGeneralReviewEvidenceTargetId('fatal-flaws')).toBe(false);
  });

  it('filters low/high star reviews; multi-ASIN alone no longer forces map-reduce', () => {
    const product = makeProduct({
      asin: 'B001, B002',
      metadata: {
        source_products: [
          {
            asin: 'B001',
            productTitle: 'A',
            customer_reviews: [
              makeReview(1, 'broke'),
              makeReview(5, 'love it'),
              makeReview(2, 'leaks'),
            ],
          },
          {
            asin: 'B002',
            productTitle: 'B',
            customer_reviews: [makeReview(5, 'wow'), makeReview(3, 'smell bad')],
          },
        ],
      },
    });

    expect(countReviewsForTarget(product, 'fatal-flaws')).toBe(3);
    // volume-gated: 3 low-star reviews stay oneshot for better TTFT
    expect(shouldUseReviewMapReduce(product, 'fatal-flaws')).toBe(false);
    expect(countReviewsForTarget(product, 'wow-moments')).toBe(2);
    // general targets use all stars
    expect(countReviewsForTarget(product, 'hesitation-points')).toBe(5);
    expect(shouldUseReviewMapReduce(product, 'buyer-profile')).toBe(false);
  });

  it('keeps oneshot for small single-ASIN review sets', () => {
    const product = makeProduct({
      customer_reviews: Array.from({ length: 10 }, (_, i) => makeReview(1, `issue ${i}`)),
    });
    expect(shouldUseReviewMapReduce(product, 'fatal-flaws')).toBe(false);
    expect(shouldUseReviewMapReduce(product, 'hesitation-points')).toBe(false);
  });

  it('uses map-reduce when general reviews exceed the old 40-sample cap', () => {
    const product = makeProduct({
      customer_reviews: Array.from({ length: 45 }, (_, i) => makeReview(4, `review ${i}`)),
    });
    expect(shouldUseReviewMapReduce(product, 'vocab-gap')).toBe(true);
    expect(getReviewSourceSlices(product, 'vocab-gap')[0]?.customer_reviews).toHaveLength(45);
  });

  it('dedupes exact reviews per ASIN without dropping ASIN coverage', () => {
    const product = makeProduct({
      asin: 'B001, B002',
      metadata: {
        source_products: [
          {
            asin: 'B001',
            productTitle: 'A',
            customer_reviews: [
              makeReview(1, 'broke after a week'),
              makeReview(1, 'broke after a week'),
              makeReview(2, '   '),
              makeReview(1, 'leaks from nozzle'),
            ],
          },
          {
            asin: 'B002',
            productTitle: 'B',
            customer_reviews: [makeReview(1, 'broke after a week'), makeReview(3, 'smell bad')],
          },
        ],
      },
    });

    const pack = buildReviewSourcePack(product, 'fatal-flaws');
    expect(pack.slices).toHaveLength(2);
    expect(pack.slices[0]?.customer_reviews).toHaveLength(2);
    expect(pack.slices[1]?.customer_reviews).toHaveLength(2);
    // Same text on different ASINs is kept so competitive coverage stays honest.
    expect(pack.rawReviewCount).toBe(6);
    expect(pack.reviewCount).toBe(4);
    expect(pack.dedupe.duplicatesRemoved).toBe(1);
    expect(pack.dedupe.emptyRemoved).toBe(1);
    expect(pack.budget.applied).toBe(false);
    expect(countReviewsForTarget(product, 'fatal-flaws')).toBe(4);
  });

  it('applies fair review budget on oversized multi-ASIN packs', () => {
    const product = makeProduct({
      asin: 'B001, B002, B003',
      metadata: {
        source_products: [
          {
            asin: 'B001',
            productTitle: 'A',
            customer_reviews: Array.from({ length: 50 }, (_, i) => makeReview(1, `a-${i}`)),
          },
          {
            asin: 'B002',
            productTitle: 'B',
            customer_reviews: Array.from({ length: 50 }, (_, i) => makeReview(2, `b-${i}`)),
          },
          {
            asin: 'B003',
            productTitle: 'C',
            customer_reviews: Array.from({ length: 50 }, (_, i) => makeReview(3, `c-${i}`)),
          },
        ],
      },
    });

    const pack = buildReviewSourcePack(product, 'fatal-flaws');
    expect(pack.budget.applied).toBe(true);
    // balanced default budget for star buckets = 96
    expect(pack.reviewCount).toBeLessThanOrEqual(160);
    expect(pack.reviewCount).toBeGreaterThan(0);
    expect(pack.slices).toHaveLength(3);
    expect(pack.slices.every(slice => slice.customer_reviews.length >= 1)).toBe(true);
    expect(estimateReviewMapCalls(product, 'fatal-flaws')).toBeGreaterThan(0);
  });

  it('normalizes partial map aggregates for each review target', () => {
    expect(
      normalizeFatalFlawsResult({ critical_issues: [{ issue: 'leak' }] }).return_triggers
    ).toEqual([]);
    expect(
      normalizeWowMomentsResult({ moments: [{ moment_description: 'scent' }] }).copywriting_angles
    ).toEqual([]);
    expect(
      normalizeHesitationResult({ hesitations: [{ pre_purchase_worry: 'size' }] }).common_doubts
    ).toEqual([]);
    expect(
      (
        normalizeBuyerProfileResult({ buyer_types: [{ type: 'gift' }] }).demographics as {
          likely_gender: string;
        }
      ).likely_gender
    ).toBe('mixed');
    expect(normalizeVocabGapResult({ buyer_terms: ['shiny'] }).seller_terms).toEqual([]);
    expect(
      (
        normalizePromiseRealityResult({ gaps: [{ listing_claim: 'waterproof' }] })
          .overall_credibility as { score: unknown }
      ).score
    ).toBe('');
  });
});
