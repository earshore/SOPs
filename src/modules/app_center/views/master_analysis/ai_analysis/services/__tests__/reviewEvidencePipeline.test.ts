import { describe, expect, it } from 'vitest';
import type { Product, Review } from '../../config/sampleData';
import {
  countReviewsForTarget,
  getReviewSourceSlices,
  normalizeFatalFlawsResult,
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
    feature_bullets: [],
    customer_reviews: [],
    scrape_status: 'success',
    metadata: {},
    ...overrides,
  };
}

describe('reviewEvidencePipeline helpers', () => {
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

    const fatalSlices = getReviewSourceSlices(product, 'fatal-flaws');
    expect(fatalSlices).toHaveLength(2);
    expect(countReviewsForTarget(product, 'fatal-flaws')).toBe(3);
    expect(shouldUseReviewMapReduce(product, 'fatal-flaws')).toBe(true);

    const wowSlices = getReviewSourceSlices(product, 'wow-moments');
    expect(countReviewsForTarget(product, 'wow-moments')).toBe(2);
    expect(wowSlices.every(s => s.customer_reviews.every(r => r.star_rating === 5))).toBe(true);
  });

  it('keeps oneshot for small single-ASIN review sets', () => {
    const product = makeProduct({
      customer_reviews: Array.from({ length: 10 }, (_, i) => makeReview(1, `issue ${i}`)),
    });
    expect(shouldUseReviewMapReduce(product, 'fatal-flaws')).toBe(false);
  });

  it('normalizes missing risk / phrase fields for partial map output', () => {
    const fatal = normalizeFatalFlawsResult({
      critical_issues: [{ issue: 'leak' }],
    });
    expect(fatal.critical_issues).toHaveLength(1);
    expect(fatal.return_triggers).toEqual([]);
    expect(fatal.risk_assessment).toMatchObject({ overall_risk_level: 'medium' });

    const wow = normalizeWowMomentsResult({
      moments: [{ moment_description: 'scent' }],
    });
    expect(wow.moments).toHaveLength(1);
    expect(wow.emotional_triggers).toEqual([]);
    expect(wow.copywriting_angles).toEqual([]);
  });
});
