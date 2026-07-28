import { describe, expect, it } from 'vitest';
import {
  applyFairSliceBudget,
  buildReviewEvidenceKey,
  compactForReduce,
  dedupeBullets,
  dedupeReviews,
  mapWithConcurrency,
  mergeDedupeStats,
  normalizeEvidenceText,
} from './evidencePack';

describe('evidencePack', () => {
  it('normalizes whitespace and case for dedupe keys', () => {
    expect(normalizeEvidenceText('  Foo   BAR ')).toBe('foo bar');
    expect(
      buildReviewEvidenceKey({ star_rating: 1, headline: 'H', body: 'A  B', origin_country: 'DE' })
    ).toBe(
      buildReviewEvidenceKey({ star_rating: 1, headline: 'h', body: 'a b', origin_country: 'de' })
    );
  });

  it('dedupes reviews and drops empty bodies while preserving order', () => {
    const { reviews, stats } = dedupeReviews([
      { star_rating: 1, headline: 'a', body: 'broke', origin_country: 'DE' },
      { star_rating: 1, headline: 'a', body: 'broke', origin_country: 'DE' },
      { star_rating: 2, headline: 'b', body: '   ', origin_country: 'US' },
      { star_rating: 5, headline: 'c', body: 'love it', origin_country: 'FR' },
      { star_rating: 1, headline: 'A', body: 'Broke', origin_country: 'de' },
    ]);

    expect(reviews.map(r => r.body)).toEqual(['broke', 'love it']);
    expect(stats).toEqual({
      inputCount: 5,
      outputCount: 2,
      duplicatesRemoved: 2,
      emptyRemoved: 1,
    });
  });

  it('dedupes bullets after trim', () => {
    const { bullets, stats } = dedupeBullets(['  Keep scent  ', 'keep scent', '', 'Long lasting']);
    expect(bullets).toEqual(['Keep scent', 'Long lasting']);
    expect(stats.duplicatesRemoved).toBe(1);
    expect(stats.emptyRemoved).toBe(1);
  });

  it('merges dedupe stats across ASIN slices', () => {
    expect(
      mergeDedupeStats([
        { inputCount: 3, outputCount: 2, duplicatesRemoved: 1, emptyRemoved: 0 },
        { inputCount: 4, outputCount: 3, duplicatesRemoved: 0, emptyRemoved: 1 },
      ])
    ).toEqual({
      inputCount: 7,
      outputCount: 5,
      duplicatesRemoved: 1,
      emptyRemoved: 1,
    });
  });

  it('compacts long strings and caps arrays for reduce payloads', () => {
    const compacted = compactForReduce(
      {
        issues: Array.from({ length: 30 }, (_, i) => ({
          issue: `issue-${i}`,
          user_quotes: ['x'.repeat(400)],
        })),
        note: '  spaced   text  ',
      },
      { maxStringChars: 20, maxArrayItems: 5 }
    ) as { issues: unknown[]; note: string };

    expect(compacted.note).toBe('spaced text');
    expect(compacted.issues).toHaveLength(5);
    expect(JSON.stringify(compacted).length).toBeLessThan(
      JSON.stringify({
        issues: Array.from({ length: 30 }, (_, i) => ({
          issue: `issue-${i}`,
          user_quotes: ['x'.repeat(400)],
        })),
        note: '  spaced   text  ',
      }).length
    );
  });

  it('applies fair per-slice budget without dropping covered slices when budget allows', () => {
    const slices = [
      { asin: 'A', items: ['a1', 'a2', 'a3', 'a4'] },
      { asin: 'B', items: ['b1', 'b2'] },
      { asin: 'C', items: ['c1', 'c2', 'c3'] },
    ];
    const { slices: kept, stats } = applyFairSliceBudget<string, { asin: string; items: string[] }>(
      slices,
      5,
      (slice, items) => ({
        ...slice,
        items,
      })
    );

    expect(kept).toHaveLength(3);
    expect(kept.map(s => s.asin)).toEqual(['A', 'B', 'C']);
    expect(kept.every(s => s.items.length >= 1)).toBe(true);
    expect(stats.afterCount).toBe(5);
    expect(stats.applied).toBe(true);
    expect(stats.omittedByBudget).toBe(4);
  });

  it('fills fair slice quotas in stable round-robin order', () => {
    const slices = [
      { asin: 'A', items: ['a1', 'a2', 'a3'] },
      { asin: 'B', items: ['b1', 'b2'] },
      { asin: 'C', items: ['c1', 'c2'] },
    ];

    const { slices: kept } = applyFairSliceBudget<string, { asin: string; items: string[] }>(
      slices,
      5,
      (slice, items) => ({
        ...slice,
        items,
      })
    );

    expect(kept).toEqual([
      { asin: 'A', items: ['a1', 'a2'] },
      { asin: 'B', items: ['b1', 'b2'] },
      { asin: 'C', items: ['c1'] },
    ]);
  });

  it('keeps the first non-empty slices when the budget is smaller than their count', () => {
    const slices = [
      { asin: 'A', items: ['a1'] },
      { asin: 'B', items: ['b1'] },
      { asin: 'C', items: ['c1'] },
    ];

    const { slices: kept } = applyFairSliceBudget<string, { asin: string; items: string[] }>(
      slices,
      2,
      (slice, items) => ({
        ...slice,
        items,
      })
    );

    expect(kept).toEqual([
      { asin: 'A', items: ['a1'] },
      { asin: 'B', items: ['b1'] },
    ]);
  });

  it('maps with bounded concurrency and preserves order', async () => {
    let active = 0;
    let maxActive = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active -= 1;
      return value * 10 + index;
    });

    expect(results).toEqual([10, 21, 32, 43, 54]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
