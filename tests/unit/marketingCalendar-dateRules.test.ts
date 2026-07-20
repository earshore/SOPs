import { describe, expect, it } from 'vitest';
import {
  parseIsoDateLocal,
  resolveDateRule,
  toIsoDate,
} from '@/modules/amz_hub/data/marketingCalendar/dateRules';

describe('toIsoDate / parseIsoDateLocal', () => {
  it('round-trips local y/m/d without timezone shift', () => {
    expect(toIsoDate(2026, 1, 5)).toBe('2026-01-05');
    expect(parseIsoDateLocal('2026-11-27')).toEqual({ y: 2026, m: 11, d: 27 });
  });
});

describe('resolveDateRule', () => {
  it('fixed new year', () => {
    expect(resolveDateRule({ kind: 'fixed', month: 1, day: 1 }, 2026)).toEqual({
      start: '2026-01-01',
      end: '2026-01-01',
    });
  });

  it('fixed with durationDays spans inclusive range', () => {
    expect(resolveDateRule({ kind: 'fixed', month: 12, day: 24, durationDays: 2 }, 2026)).toEqual({
      start: '2026-12-24',
      end: '2026-12-25',
    });
  });

  it('range_fixed christmas window', () => {
    expect(
      resolveDateRule(
        { kind: 'range_fixed', startMonth: 12, startDay: 24, endMonth: 12, endDay: 26 },
        2026
      )
    ).toEqual({
      start: '2026-12-24',
      end: '2026-12-26',
    });
  });

  it('nth_weekday 4th Thursday of November 2026', () => {
    expect(
      resolveDateRule({ kind: 'nth_weekday', month: 11, weekday: 4, nth: 4 }, 2026)?.start
    ).toBe('2026-11-26');
  });

  it('black friday 2026 is 2026-11-27', () => {
    expect(resolveDateRule({ kind: 'black_friday' }, 2026)?.start).toBe('2026-11-27');
  });

  it('cyber monday is black friday + 3', () => {
    expect(resolveDateRule({ kind: 'cyber_monday' }, 2026)?.start).toBe('2026-11-30');
  });

  it('easter 2026 is 2026-04-05', () => {
    expect(resolveDateRule({ kind: 'easter_offset', offsetDays: 0 }, 2026)?.start).toBe(
      '2026-04-05'
    );
  });

  // Vatertag (Christi Himmelfahrt) = Easter + 39. Brief table had 2026-05-21;
  // Western Easter 2026-04-05 + 39 = 2026-05-14 (Ascension Thursday).
  it('vatertag 2026 easter+39 is 2026-05-14', () => {
    expect(resolveDateRule({ kind: 'easter_offset', offsetDays: 39 }, 2026)?.start).toBe(
      '2026-05-14'
    );
  });

  it('mothering sunday 2026 is 2026-03-15', () => {
    expect(resolveDateRule({ kind: 'mothering_sunday' }, 2026)?.start).toBe('2026-03-15');
  });

  it('annual_override_only returns null', () => {
    expect(resolveDateRule({ kind: 'annual_override_only' }, 2027)).toBeNull();
  });

  it('approximate_window returns start/end range', () => {
    expect(
      resolveDateRule(
        {
          kind: 'approximate_window',
          startMonth: 3,
          startDay: 1,
          endMonth: 3,
          endDay: 31,
        },
        2026
      )
    ).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });
});

describe('resolveDateRule multi-year fixtures (2025–2028)', () => {
  const easterByYear: Record<number, string> = {
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
  };

  const motheringSundayByYear: Record<number, string> = {
    2025: '2025-03-30',
    2026: '2026-03-15',
    2027: '2027-03-07',
    2028: '2028-03-26',
  };

  const blackFridayByYear: Record<number, string> = {
    2025: '2025-11-28',
    2026: '2026-11-27',
    2027: '2027-11-26',
    2028: '2028-11-24',
  };

  it.each([2025, 2026, 2027, 2028] as const)('easter %i', year => {
    expect(resolveDateRule({ kind: 'easter_offset', offsetDays: 0 }, year)?.start).toBe(
      easterByYear[year]
    );
  });

  it.each([2025, 2026, 2027, 2028] as const)('mothering sunday %i', year => {
    expect(resolveDateRule({ kind: 'mothering_sunday' }, year)?.start).toBe(
      motheringSundayByYear[year]
    );
  });

  it.each([2025, 2026, 2027, 2028] as const)('black friday %i', year => {
    expect(resolveDateRule({ kind: 'black_friday' }, year)?.start).toBe(blackFridayByYear[year]);
  });

  it('2025 and 2027 cyber monday = black friday + 3', () => {
    expect(resolveDateRule({ kind: 'cyber_monday' }, 2025)?.start).toBe('2025-12-01');
    expect(resolveDateRule({ kind: 'cyber_monday' }, 2027)?.start).toBe('2027-11-29');
  });
});
