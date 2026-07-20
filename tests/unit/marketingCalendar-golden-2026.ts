/**
 * Golden start dates for critical 2026 marketing calendar nodes.
 * Used by resolveYear tests — correct rules/overrides when these fail, do not delete.
 */
export const GOLDEN_2026: Record<string, string> = {
  'prime-day': '2026-06-23',
  'spring-deal-days': '2026-03-10',
  easter: '2026-04-05',
  'mothers-day-gb-ie': '2026-03-15',
  /** Vatertag = Easter + 39 = 2026-05-14 (not the incorrect 05-21 in old content) */
  'fathers-day-de': '2026-05-14',
  'black-friday': '2026-11-27',
  'cyber-monday': '2026-11-30',
  'new-year': '2026-01-01',
  'valentines-day': '2026-02-14',
  christmas: '2026-12-25',
  'mothers-day-es': '2026-05-03',
  'mothers-day-de-it-nl-be': '2026-05-10',
  'mothers-day-fr-se': '2026-05-31',
  'fathers-day-fr-nl-gb-ie': '2026-06-21',
  'fathers-day-se': '2026-11-08',
};
