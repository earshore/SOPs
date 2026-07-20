import type { YearEventOverride } from '../types';
import { OVERRIDES_2026 } from './2026';
import { OVERRIDES_2027 } from './2027';

const BY_YEAR: Record<number, YearEventOverride[]> = {
  2026: OVERRIDES_2026,
  2027: OVERRIDES_2027,
};

/** Return year-specific overrides (empty array if none registered). */
export function getOverridesForYear(year: number): YearEventOverride[] {
  return BY_YEAR[year] ?? [];
}
