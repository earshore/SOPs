import { describe, expect, it, vi } from 'vitest';
import { getOpsHorizonYears } from '@/modules/amz_hub/views/practice/marketing_calendar/activeYear';
import {
  OPS_STATE_KEY,
  defaultUserState,
  eventChecklistKey,
  loadUserState,
  pageChecklistKey,
  saveUserState,
  type UserCalendarState,
} from '@/modules/amz_hub/views/practice/marketing_calendar/userState';

function createMemoryStorage(initial?: unknown) {
  const store = new Map<string, unknown>();
  if (initial !== undefined) {
    store.set(OPS_STATE_KEY, initial);
  }
  return {
    get: vi.fn(<T = unknown>(key: string, defaultValue: T | null = null): T | null => {
      if (!store.has(key)) return defaultValue;
      return store.get(key) as T;
    }),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return true;
    }),
    _store: store,
  };
}

describe('defaultUserState', () => {
  it('defaults follow system year when not pinned', () => {
    const s = defaultUserState(2026);
    expect(s.version).toBe(2);
    expect(s.activeYear).toBe(2026);
    expect(s.yearPinned).toBe(false);
    expect(s.timeWindow).toBe('d60');
    expect(s.mainTab).toBe('ops');
    expect(s.selectedCountry).toBe('ALL');
    expect(s.selectedTypes).toEqual([]);
    expect(s.watchedTemplateIds).toEqual([]);
    expect(s.checklist).toEqual({});
    expect(s.showEnded).toBe(false);
    expect(typeof s.updatedAt).toBe('string');
  });
});

describe('getOpsHorizonYears', () => {
  it('horizon only when viewing system year unpinned in Oct–Dec', () => {
    expect(getOpsHorizonYears(new Date(2026, 11, 1), 2026, false)).toEqual([2026, 2027]);
    expect(getOpsHorizonYears(new Date(2026, 11, 1), 2025, true)).toEqual([2025]);
  });

  it('returns only system year before October when unpinned', () => {
    expect(getOpsHorizonYears(new Date(2026, 5, 15), 2026, false)).toEqual([2026]);
  });

  it('returns only activeYear when yearPinned even in December', () => {
    expect(getOpsHorizonYears(new Date(2026, 11, 1), 2026, true)).toEqual([2026]);
  });

  it('returns only activeYear when viewing non-system year unpinned', () => {
    expect(getOpsHorizonYears(new Date(2026, 11, 1), 2025, false)).toEqual([2025]);
  });
});

describe('checklist year keys', () => {
  it('page and event keys embed the year so years do not collide', () => {
    expect(pageChecklistKey(2026, 'scan_month')).toBe('page:2026:scan_month');
    expect(pageChecklistKey(2027, 'scan_month')).toBe('page:2027:scan_month');
    expect(eventChecklistKey('prime-day', 2026, 'enroll')).toBe('event:prime-day:2026:enroll');
    expect(eventChecklistKey('prime-day', 2027, 'enroll')).toBe('event:prime-day:2027:enroll');
  });

  it('persisted checklist keeps year-scoped keys across year switch', () => {
    const storage = createMemoryStorage({
      version: 2,
      activeYear: 2026,
      yearPinned: false,
      selectedCountry: 'ALL',
      selectedTypes: [],
      timeWindow: 'd60',
      mainTab: 'ops',
      watchedTemplateIds: ['prime-day'],
      checklist: {
        [pageChecklistKey(2026, 'scan_month')]: true,
        [eventChecklistKey('prime-day', 2026, 'inventory')]: true,
      },
      showEnded: false,
      updatedAt: '2026-06-01T00:00:00.000Z',
    });

    const loaded = loadUserState(storage, 2027);
    expect(loaded.activeYear).toBe(2027);
    expect(loaded.yearPinned).toBe(false);
    expect(loaded.checklist['page:2026:scan_month']).toBe(true);
    expect(loaded.checklist['event:prime-day:2026:inventory']).toBe(true);
    expect(loaded.checklist['page:2027:scan_month']).toBeUndefined();
  });
});

describe('loadUserState / saveUserState', () => {
  it('falls back to defaults on missing storage', () => {
    const storage = createMemoryStorage();
    const s = loadUserState(storage, 2026);
    expect(s.activeYear).toBe(2026);
    expect(s.yearPinned).toBe(false);
    expect(s.timeWindow).toBe('d60');
  });

  it('falls back to defaults on corrupt / invalid payload', () => {
    const cases = [
      'not-json-object',
      null,
      42,
      { version: 1, activeYear: 2025 },
      { version: 2 }, // missing fields / invalid shape
    ];
    for (const payload of cases) {
      const storage = createMemoryStorage(payload);
      const s = loadUserState(storage, 2026);
      expect(s.version).toBe(2);
      expect(s.activeYear).toBe(2026);
      expect(s.yearPinned).toBe(false);
      expect(s.timeWindow).toBe('d60');
      expect(s.mainTab).toBe('ops');
    }
  });

  it('respects yearPinned and keeps stored activeYear', () => {
    const storage = createMemoryStorage({
      version: 2,
      activeYear: 2025,
      yearPinned: true,
      selectedCountry: 'DE',
      selectedTypes: ['shopping'],
      timeWindow: 'month',
      mainTab: 'encyclopedia',
      watchedTemplateIds: ['easter'],
      checklist: { 'page:2025:scan_month': true },
      showEnded: true,
      updatedAt: '2025-12-01T00:00:00.000Z',
      lastFocusedTemplateId: 'easter',
    } satisfies UserCalendarState);

    const s = loadUserState(storage, 2026);
    expect(s.activeYear).toBe(2025);
    expect(s.yearPinned).toBe(true);
    expect(s.selectedCountry).toBe('DE');
    expect(s.selectedTypes).toEqual(['shopping']);
    expect(s.timeWindow).toBe('month');
    expect(s.mainTab).toBe('encyclopedia');
    expect(s.watchedTemplateIds).toEqual(['easter']);
    expect(s.showEnded).toBe(true);
    expect(s.lastFocusedTemplateId).toBe('easter');
  });

  it('follows system year when not pinned even if stored year differs', () => {
    const storage = createMemoryStorage({
      version: 2,
      activeYear: 2025,
      yearPinned: false,
      selectedCountry: 'FR',
      selectedTypes: [],
      timeWindow: 'd30',
      mainTab: 'ops',
      watchedTemplateIds: [],
      checklist: {},
      showEnded: false,
      updatedAt: '2025-11-01T00:00:00.000Z',
    });

    const s = loadUserState(storage, 2026);
    expect(s.activeYear).toBe(2026);
    expect(s.yearPinned).toBe(false);
    expect(s.selectedCountry).toBe('FR');
    expect(s.timeWindow).toBe('d30');
  });

  it('saveUserState writes OPS_STATE_KEY v2 payload', () => {
    const storage = createMemoryStorage();
    const state = defaultUserState(2026);
    state.yearPinned = true;
    state.activeYear = 2027;
    state.checklist[pageChecklistKey(2027, 'scan_month')] = true;

    saveUserState(storage, state);

    expect(storage.set).toHaveBeenCalledWith(
      OPS_STATE_KEY,
      expect.objectContaining({
        version: 2,
        activeYear: 2027,
        yearPinned: true,
        checklist: { 'page:2027:scan_month': true },
      })
    );
    expect(OPS_STATE_KEY).toBe('amzf_ops_state_v2');
  });
});
