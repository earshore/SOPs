import { describe, expect, it } from 'vitest';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import type { ProductData } from '../types';
import { renderProductCard, syntaxHighlight } from './renderers';

describe('renderProductCard', () => {
  it('does not interpolate a non-numeric review rating into generated HTML', () => {
    const html = renderProductCard({
      rawProduct: {
        asin: 'B08N5WRWNW',
        productTitle: 'Safe product',
        customer_reviews: [{ star_rating: '1"><img x-bind:src="leak()">' }],
      } as unknown as ProductData,
      isExpanded: false,
      globalSiteCode: 'DE',
      onDelete: "deleteProduct('B08N5WRWNW')",
      onDeleteReview: "deleteReview('B08N5WRWNW', INDEX)",
    });

    expect(html).not.toContain('x-bind:');
    expect(html).not.toContain('leak()');
  });

  it('does not interpolate an unsupported site code into generated HTML', () => {
    const html = renderProductCard({
      rawProduct: {
        asin: 'B08N5WRWNW',
        productTitle: 'Safe product',
      } as ProductData,
      isExpanded: false,
      globalSiteCode: '<img x-init="leak()">',
      onDelete: "deleteProduct('B08N5WRWNW')",
      onDeleteReview: "deleteReview('B08N5WRWNW', INDEX)",
    });

    expect(html).not.toContain('x-init');
    expect(html).not.toContain('leak()');
  });
});

describe('syntaxHighlight', () => {
  it('does not create directive-bearing elements from JSON string values', () => {
    const container = document.createElement('pre');
    document.body.appendChild(container);

    try {
      const json = JSON.stringify({ payload: '<img x-init=notify()>' });
      SafeRenderer.getInstance().renderSanitizedHtml(container, syntaxHighlight(json));

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('[x-init]')).toBeNull();
      expect(container.textContent).toContain('<img x-init=notify()>');
    } finally {
      container.remove();
    }
  });
});
