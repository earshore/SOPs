import { describe, expect, it } from 'vitest';

import { extractListingTitle } from './titleCompliance';

describe('extractListingTitle', () => {
  it.each([
    ['1. Title: Wireless Earbuds', 'Wireless Earbuds'],
    ['1) Titel: Kabellose Ohrhörer', 'Kabellose Ohrhörer'],
    ['Title: Portable Blender', 'Portable Blender'],
    ['Titel：Kabellose Ohrhörer', 'Kabellose Ohrhörer'],
    ['**Title**: USB Blender', 'USB Blender'],
    ['**Titel**\nKabellose Ohrhörer', 'Kabellose Ohrhörer'],
    ['# Title\nPortable Blender', 'Portable Blender'],
  ])('extracts the title from %s', (text, expected) => {
    expect(extractListingTitle(text)).toMatchObject({
      status: 'found',
      title: expected,
    });
  });

  it('returns not_found instead of treating prose as a title', () => {
    expect(extractListingTitle('This document has no listing heading.')).toEqual({
      status: 'not_found',
      title: '',
    });
  });

  it('preserves Unicode title characters for code-point counting', () => {
    const result = extractListingTitle('Title: Café 🧃 Blender');

    expect(result.status).toBe('found');
    expect([...result.title].length).toBe(14);
  });
});
