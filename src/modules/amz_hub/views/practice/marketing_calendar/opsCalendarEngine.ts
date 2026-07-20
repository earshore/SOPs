/**
 * Ops calendar engine — pure functions for phase windows, CTAs, filters.
 * Prefer importing from this module in UI / tests for a stable public surface.
 */
export {
  getPhaseWindows,
  getOpenPhases,
  isDateInWindow,
} from '@/modules/amz_hub/data/marketingCalendar/prepRules';
export type { PhaseWindow } from '@/modules/amz_hub/data/marketingCalendar/prepRules';
export {
  getPrimaryCtas,
  getSecondaryCtas,
  resolveLifecycle,
  collectOpenCandidates,
} from '@/modules/amz_hub/data/marketingCalendar/primaryCtas';
export type { PrimaryCta } from '@/modules/amz_hub/data/marketingCalendar/primaryCtas';

import {
  addDaysIso,
  parseIsoDateLocal,
  toIsoDate,
} from '@/modules/amz_hub/data/marketingCalendar/dateRules';
import { getOpenPhases } from '@/modules/amz_hub/data/marketingCalendar/prepRules';
import {
  getPrimaryCtas,
  getSecondaryCtas,
  resolveLifecycle,
} from '@/modules/amz_hub/data/marketingCalendar/primaryCtas';
import type {
  EventLifecycle,
  EventOccurrence,
  EventType,
  IsoDate,
  OpsEventView,
  OpsFilters,
  OpsTimeWindow,
} from '@/modules/amz_hub/data/marketingCalendar/types';

export type { EventLifecycle, OpsEventView, OpsFilters, OpsTimeWindow };

/** Lifecycle from dates / confidence (orthogonal to confidence badge). */
export function getLifecycle(occ: EventOccurrence, today: IsoDate): EventLifecycle {
  return resolveLifecycle(occ, today);
}

/**
 * Event interval intersects filter window.
 * `window === null` means unrestricted (timeWindow `all`).
 * Missing dates (pending) never match a bounded window.
 */
export function eventIntersectsWindow(
  occ: EventOccurrence,
  window: { start: IsoDate; end: IsoDate } | null
): boolean {
  if (!occ.startDate || !occ.endDate) return false;
  if (window === null) return true;
  return occ.endDate >= window.start && occ.startDate <= window.end;
}

function lastDayOfMonth(year: number, month1to12: number): IsoDate {
  // day 0 of next month = last day of this month (local civil)
  const d = new Date(year, month1to12, 0);
  return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Resolve ops time-window filter bounds for `today`. */
export function resolveTimeWindowBounds(
  timeWindow: OpsTimeWindow,
  today: IsoDate
): { start: IsoDate; end: IsoDate } | null {
  if (timeWindow === 'all') return null;

  const { y, m } = parseIsoDateLocal(today);
  if (timeWindow === 'month') {
    return { start: toIsoDate(y, m, 1), end: lastDayOfMonth(y, m) };
  }

  const days = timeWindow === 'd30' ? 30 : 60;
  return { start: today, end: addDaysIso(today, days) };
}

function matchesCountry(occ: EventOccurrence, country: string | undefined): boolean {
  return !country || country === 'ALL' || occ.countries.includes(country);
}

function matchesTypes(occ: EventOccurrence, types: EventType[] | undefined): boolean {
  return !types || types.length === 0 || types.includes(occ.type);
}

function matchesSearchTerm(occ: EventOccurrence, term: string | undefined): boolean {
  const q = term?.trim().toLowerCase();
  if (!q) return true;
  const hay = [occ.name, occ.nameEn, occ.description, occ.strategy, ...occ.tags, ...occ.countries]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function matchesFilters(occ: EventOccurrence, filters: OpsFilters, today: IsoDate): boolean {
  if (!matchesCountry(occ, filters.selectedCountry)) return false;
  if (!matchesTypes(occ, filters.selectedTypes)) return false;

  const lifecycle = getLifecycle(occ, today);
  if (lifecycle === 'pending') return false;
  if (filters.showEnded === false && lifecycle === 'ended') return false;

  const bounds = resolveTimeWindowBounds(filters.timeWindow ?? 'd60', today);
  if (!eventIntersectsWindow(occ, bounds)) return false;
  return matchesSearchTerm(occ, filters.searchTerm);
}

/**
 * Build filtered, sorted ops views with open phases and dual primary CTAs.
 */
export function buildOpsViews(
  occurrences: EventOccurrence[],
  filters: OpsFilters,
  today: IsoDate,
  watched: Set<string>
): OpsEventView[] {
  const views: OpsEventView[] = [];

  for (const occ of occurrences) {
    if (!matchesFilters(occ, filters, today)) continue;

    const openPhases = getOpenPhases(occ, today);
    const lifecycle = getLifecycle(occ, today);
    const primaryCtas = getPrimaryCtas(occ, today);
    const secondaryCtas = getSecondaryCtas(occ, today, primaryCtas);

    views.push({
      occurrence: occ,
      openPhases,
      lifecycle,
      primaryCtas,
      secondaryCtas,
      watched: watched.has(occ.templateId),
    });
  }

  views.sort((a, b) => {
    const aW = a.watched ? 0 : 1;
    const bW = b.watched ? 0 : 1;
    if (aW !== bW) return aW - bW;
    return a.occurrence.startDate.localeCompare(b.occurrence.startDate);
  });

  return views;
}
