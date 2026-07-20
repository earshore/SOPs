import type { YearEventOverride } from '../types';

/**
 * 2027 annual thin override pack — shell only.
 *
 * No official Amazon promo dates (Prime Day, Spring Deal Days, etc.) are
 * registered yet. `annual_override_only` templates resolve as
 * `pending_official` until entries are added here.
 *
 * When calibrating 2027, add thin rows only (templateId + dates + sources);
 * do not copy full event bodies from templates.
 *
 * Pending candidates (add when official):
 * - spring-deal-days
 * - prime-day
 * - ramadan-start / eid-al-fitr (Islamic calendar; re-verify)
 * - tomorrowland-festival (if marketed that year)
 */
export const OVERRIDES_2027: YearEventOverride[] = [];
