import type { YearEventOverride } from '../types';
import { OVERRIDES_2026 } from './2026';

const BY_YEAR: Record<number, YearEventOverride[]> = {
  2026: OVERRIDES_2026,
};

/** Return year-specific overrides (empty array if none registered). */
export function getOverridesForYear(year: number): YearEventOverride[] {
  return BY_YEAR[year] ?? [];
}
