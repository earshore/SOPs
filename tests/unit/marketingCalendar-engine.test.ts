import { describe, expect, it } from 'vitest';
import {
  eventIntersectsWindow,
  getOpenPhases,
  getPrimaryCtas,
  getSecondaryCtas,
} from '@/modules/amz_hub/views/practice/marketing_calendar/opsCalendarEngine';
import type { EventOccurrence } from '@/modules/amz_hub/data/marketingCalendar/types';

const primeLike: EventOccurrence = {
  occurrenceId: 'prime-day:2026',
  templateId: 'prime-day',
  year: 2026,
  name: 'Prime Day',
  nameEn: 'Prime Day',
  emoji: '📦',
  type: 'shopping',
  priority: 'S',
  countries: ['DE', 'FR', 'IT', 'ES', 'GB'],
  description: 'Amazon Prime Day',
  strategy: 'Prep inventory and enroll early',
  tags: ['prime', 'shopping'],
  startDate: '2026-06-23',
  endDate: '2026-06-26',
  dateLabel: '2026-06-23 – 2026-06-26',
  confidence: 'exact',
};

describe('opsCalendarEngine phase windows', () => {
  it('T-25 opens inventory and enroll', () => {
    expect(getOpenPhases(primeLike, '2026-05-29').sort()).toEqual(
      ['enroll', 'inventory'].sort()
    );
  });

  it('primary ctas max 2 at T-25 are inventory + enroll', () => {
    const ctas = getPrimaryCtas(primeLike, '2026-05-29');
    expect(ctas).toHaveLength(2);
    expect(ctas.map((c) => c.routeId).sort()).toEqual(
      ['sops_inventory_replenishment', 'sops_promotion_submission'].sort()
    );
  });

  it('d60 includes active event', () => {
    expect(
      eventIntersectsWindow(primeLike, { start: '2026-06-24', end: '2026-08-23' })
    ).toBe(true);
  });

  it('pending has no open phases', () => {
    const p: EventOccurrence = {
      ...primeLike,
      confidence: 'pending_official',
      startDate: '',
      endDate: '',
    };
    expect(getOpenPhases(p, '2026-05-01')).toEqual([]);
  });
});

/**
 * Prime 2026-06-23..26 (S shopping):
 * inventory end T-14 = 2026-06-09, enroll end T-7 = 2026-06-16,
 * ads T-21..T-1 = 2026-06-02..2026-06-22
 */
describe('opsCalendarEngine ads dual CTA overflow', () => {
  it('T-5 ads-only: both promoTools + ppc are primary; secondary has no ads overflow', () => {
    const today = '2026-06-18';
    expect(getOpenPhases(primeLike, today)).toEqual(['ads']);

    const primary = getPrimaryCtas(primeLike, today);
    expect(primary).toHaveLength(2);
    expect(primary.map((c) => c.key)).toEqual(['promoTools', 'ppc']);
    expect(primary.map((c) => c.routeId)).toEqual([
      'amz_promo_tools',
      'sops_ppc_advertising',
    ]);

    const secondary = getSecondaryCtas(primeLike, today, primary);
    expect(secondary.map((c) => c.key)).not.toContain('promoTools');
    expect(secondary.map((c) => c.key)).not.toContain('ppc');
  });

  it('T-11 enroll+ads: primary enroll then promoTools; secondary carries ppc overflow', () => {
    const today = '2026-06-12';
    expect(getOpenPhases(primeLike, today).sort()).toEqual(['ads', 'enroll'].sort());

    // enroll ends 06-16 (sooner) > promoTools/ppc end 06-22; tie: promoTools before ppc
    const primary = getPrimaryCtas(primeLike, today);
    expect(primary).toHaveLength(2);
    expect(primary.map((c) => c.key)).toEqual(['enroll', 'promoTools']);

    const secondary = getSecondaryCtas(primeLike, today, primary);
    expect(secondary.map((c) => c.key)).toContain('ppc');
    expect(secondary.map((c) => c.key)).not.toContain('promoTools');
  });
});
