import { describe, expect, it } from 'vitest';
import {
  eventIntersectsWindow,
  getOpenPhases,
  getPrimaryCtas,
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
