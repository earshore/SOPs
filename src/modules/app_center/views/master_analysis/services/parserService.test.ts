import { describe, expect, it } from 'vitest';
import { parseReviews } from './parserService';

describe('parserService', () => {
  it('parses review content, metadata, and dedupes by content', () => {
    const reviewBody = 'This verified review body is long enough to be selected as the main content.';
    const html = `
      <div id="cm_cr-review_list">
        <div data-hook="review">
          <i data-hook="review-star-rating" aria-label="5.0 out of 5 stars"></i>
          <a data-hook="review-title"><span>5.0 out of 5 stars Great Product</span></a>
          <span data-hook="review-body">
            <span>short</span>
            <span>${reviewBody}</span>
          </span>
          <span>Verified Purchase</span>
        </div>
        <div data-hook="review">
          <i data-hook="review-star-rating" aria-label="4.0 out of 5 stars"></i>
          <a data-hook="review-title"><span>Duplicate Review</span></a>
          <span data-hook="review-body"><span>${reviewBody}</span></span>
        </div>
      </div>
    `;

    const reviews = parseReviews(html);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual({
      title: 'Great Product',
      content: reviewBody,
      rating: 5,
      isVerified: true,
    });
  });
});
