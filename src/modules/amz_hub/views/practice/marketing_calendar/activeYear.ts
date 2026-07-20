/**
 * Ops calendar active-year helpers.
 * Horizon merges next year only when viewing the unpinned system year in Oct–Dec.
 */

/**
 * Years to resolve for the ops list given today and the user's active year.
 * - Pinned year or non-system year → only that year
 * - Unpinned system year in Oct–Dec (month >= 10) → [systemYear, systemYear+1]
 * - Otherwise → [systemYear]
 */
export function getOpsHorizonYears(
  today: Date,
  activeYear: number,
  yearPinned: boolean
): number[] {
  const systemYear = today.getFullYear();
  if (yearPinned || activeYear !== systemYear) {
    return [activeYear];
  }
  if (today.getMonth() >= 10) {
    return [systemYear, systemYear + 1];
  }
  return [systemYear];
}
