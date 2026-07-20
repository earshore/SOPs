/**
 * Marketing calendar user state (v2) — load/save under amzf_ops_state_v2.
 * Checklist keys are year-scoped; watchedTemplateIds are cross-year.
 */

import type { EventType } from '@/modules/amz_hub/data/marketingCalendar/types';

export const OPS_STATE_KEY = 'amzf_ops_state_v2';

export type OpsTimeWindow = 'month' | 'd30' | 'd60' | 'all';
export type OpsMainTab = 'ops' | 'encyclopedia';

export interface UserCalendarState {
  version: 2;
  activeYear: number;
  yearPinned: boolean;
  selectedCountry: string;
  selectedTypes: EventType[];
  timeWindow: OpsTimeWindow;
  mainTab: OpsMainTab;
  watchedTemplateIds: string[];
  checklist: Record<string, boolean>;
  showEnded: boolean;
  updatedAt: string;
  lastFocusedTemplateId?: string;
}

/** Minimal storage surface used by load/save (StorageService-compatible). */
export interface UserStateStorage {
  get<T = unknown>(key: string, defaultValue?: T | null): T | null;
  set(key: string, value: unknown): boolean | void;
}

const TIME_WINDOWS: readonly OpsTimeWindow[] = ['month', 'd30', 'd60', 'all'];
const MAIN_TABS: readonly OpsMainTab[] = ['ops', 'encyclopedia'];
const EVENT_TYPES: readonly EventType[] = [
  'holiday',
  'shopping',
  'cultural',
  'financial',
  'season',
];

/** Page-level checklist key: `page:{year}:{id}` */
export function pageChecklistKey(year: number, id: string): string {
  return `page:${year}:${id}`;
}

/** Event-level checklist key: `event:{templateId}:{year}:{phase}` */
export function eventChecklistKey(
  templateId: string,
  year: number,
  phase: string
): string {
  return `event:${templateId}:${year}:${phase}`;
}

export function defaultUserState(systemYear: number): UserCalendarState {
  return {
    version: 2,
    activeYear: systemYear,
    yearPinned: false,
    selectedCountry: 'ALL',
    selectedTypes: [],
    timeWindow: 'd60',
    mainTab: 'ops',
    watchedTemplateIds: [],
    checklist: {},
    showEnded: false,
    updatedAt: new Date().toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeSelectedTypes(value: unknown): EventType[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEventType);
}

function normalizeChecklist(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'boolean') out[k] = v;
  }
  return out;
}

function isValidV2Shape(raw: unknown): raw is Record<string, unknown> {
  if (!isRecord(raw)) return false;
  if (raw.version !== 2) return false;
  if (typeof raw.activeYear !== 'number' || !Number.isFinite(raw.activeYear)) return false;
  if (typeof raw.yearPinned !== 'boolean') return false;
  if (typeof raw.selectedCountry !== 'string') return false;
  if (!Array.isArray(raw.selectedTypes)) return false;
  if (typeof raw.timeWindow !== 'string' || !TIME_WINDOWS.includes(raw.timeWindow as OpsTimeWindow)) {
    return false;
  }
  if (typeof raw.mainTab !== 'string' || !MAIN_TABS.includes(raw.mainTab as OpsMainTab)) {
    return false;
  }
  if (!Array.isArray(raw.watchedTemplateIds)) return false;
  if (!isRecord(raw.checklist)) return false;
  if (typeof raw.showEnded !== 'boolean') return false;
  if (typeof raw.updatedAt !== 'string') return false;
  if (
    raw.lastFocusedTemplateId !== undefined &&
    typeof raw.lastFocusedTemplateId !== 'string'
  ) {
    return false;
  }
  return true;
}

/**
 * Load v2 user state. Missing/corrupt/invalid → defaults for systemYear.
 * When yearPinned is false, activeYear always tracks systemYear.
 */
export function loadUserState(
  storage: UserStateStorage,
  systemYear: number
): UserCalendarState {
  let raw: unknown;
  try {
    raw = storage.get(OPS_STATE_KEY, null);
  } catch {
    return defaultUserState(systemYear);
  }

  if (!isValidV2Shape(raw)) {
    return defaultUserState(systemYear);
  }

  const yearPinned = raw.yearPinned;
  const activeYear = yearPinned ? Math.trunc(raw.activeYear) : systemYear;

  const state: UserCalendarState = {
    version: 2,
    activeYear,
    yearPinned,
    selectedCountry: raw.selectedCountry || 'ALL',
    selectedTypes: normalizeSelectedTypes(raw.selectedTypes),
    timeWindow: raw.timeWindow as OpsTimeWindow,
    mainTab: raw.mainTab as OpsMainTab,
    watchedTemplateIds: normalizeStringArray(raw.watchedTemplateIds),
    checklist: normalizeChecklist(raw.checklist),
    showEnded: raw.showEnded,
    updatedAt: raw.updatedAt,
  };

  if (typeof raw.lastFocusedTemplateId === 'string') {
    state.lastFocusedTemplateId = raw.lastFocusedTemplateId;
  }

  return state;
}

export function saveUserState(storage: UserStateStorage, state: UserCalendarState): void {
  const payload: UserCalendarState = {
    ...state,
    version: 2,
    updatedAt: new Date().toISOString(),
  };
  storage.set(OPS_STATE_KEY, payload);
}
