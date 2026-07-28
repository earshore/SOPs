import { describe, expect, it } from 'vitest';
import type { Product, Review } from '../../config/sampleData';
import {
  countReviewsForTarget,
  getReviewSourceSlices,
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
  });

  it('filters low/high star reviews and uses map-reduce for multi-ASIN sources', () => {
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
    expect(shouldUseReviewMapReduce(product, 'fatal-flaws')).toBe(true);
    expect(countReviewsForTarget(product, 'wow-moments')).toBe(2);
    // general targets use all stars
    expect(countReviewsForTarget(product, 'hesitation-points')).toBe(5);
    expect(shouldUseReviewMapReduce(product, 'buyer-profile')).toBe(true);
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
