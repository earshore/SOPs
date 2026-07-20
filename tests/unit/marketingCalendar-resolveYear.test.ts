import { describe, expect, it } from 'vitest';
import { MARKETING_EVENT_TEMPLATES } from '@/modules/amz_hub/data/marketingCalendar/templates';
import { resolveYear } from '@/modules/amz_hub/data/marketingCalendar/resolveYear';
import { GOLDEN_2026 } from './marketingCalendar-golden-2026';

describe('resolveYear', () => {
  it('resolves 2026 prime day from override', () => {
    const prime = resolveYear(2026).find((e) => e.templateId === 'prime-day');
    expect(prime?.startDate).toBe('2026-06-23');
    expect(prime?.endDate).toBe('2026-06-26');
    expect(prime?.confidence).toBe('exact');
  });

  it('2027 prime day is pending without override', () => {
    const prime = resolveYear(2027).find((e) => e.templateId === 'prime-day');
    expect(prime?.confidence).toBe('pending_official');
    expect(prime?.startDate).toBe('');
    expect(prime?.endDate).toBe('');
  });

  it('2026 golden critical dates', () => {
    const map = Object.fromEntries(resolveYear(2026).map((e) => [e.templateId, e.startDate]));
    for (const [id, start] of Object.entries(GOLDEN_2026)) {
      expect(map[id], id).toBe(start);
    }
  });

  it('includes one occurrence per template for 2026', () => {
    const occ = resolveYear(2026);
    expect(occ.length).toBe(MARKETING_EVENT_TEMPLATES.length);
    expect(occ.length).toBeGreaterThanOrEqual(45);
  });

  it('occurrenceId is templateId:year', () => {
    const easter = resolveYear(2026).find((e) => e.templateId === 'easter');
    expect(easter?.occurrenceId).toBe('easter:2026');
  });

  it('spring deal days 2026 has exact confidence and sources', () => {
    const spring = resolveYear(2026).find((e) => e.templateId === 'spring-deal-days');
    expect(spring?.startDate).toBe('2026-03-10');
    expect(spring?.endDate).toBe('2026-03-16');
    expect(spring?.confidence).toBe('exact');
    expect(spring?.sources?.length).toBeGreaterThan(0);
  });

  it('computed rules get confidence computed (not exact)', () => {
    const easter = resolveYear(2026).find((e) => e.templateId === 'easter');
    expect(easter?.confidence).toBe('computed');
  });

  it('approximate_window templates get approximate confidence', () => {
    const winter = resolveYear(2026).find((e) => e.templateId === 'winter-sales');
    expect(winter?.confidence).toBe('approximate');
    expect(winter?.startDate).toBeTruthy();
  });

  it('2027 still resolves fixed and computed templates', () => {
    const map = Object.fromEntries(resolveYear(2027).map((e) => [e.templateId, e.startDate]));
    expect(map['new-year']).toBe('2027-01-01');
    expect(map.easter).toBe('2027-03-28');
    expect(map['black-friday']).toBe('2027-11-26');
    expect(map['mothers-day-gb-ie']).toBe('2027-03-07');
    expect(map['fathers-day-de']).toBe('2027-05-06'); // Easter 2027-03-28 + 39
  });
});
