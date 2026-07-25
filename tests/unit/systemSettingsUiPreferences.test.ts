import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getSettingsUiPreferences,
  saveSettingsUiPreferences,
  SETTINGS_UI_PREFERENCES_KEY,
} from '@/components/settings/domain/settingsUiPreferences';
import {
  findFirstSettingsSearchMatch,
  SETTINGS_SEARCH_INDEX,
} from '@/components/settings/domain/settingsSearch';
import { applySettingsDeepLink } from '@/components/settings/domain/settingsDeepLink';

const storage = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  return {
    values,
    get: vi.fn((key: string, fallback?: unknown) =>
      values.has(key) ? values.get(key) : (fallback ?? null)
    ),
    set: vi.fn((key: string, value: unknown) => {
      values.set(key, value);
    }),
  };
});

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: storage.get,
    set: storage.set,
  },
  STORAGE_KEYS: {},
}));

beforeEach(() => {
  storage.values.clear();
  vi.clearAllMocks();
});

describe('settingsUiPreferences', () => {
  it('UT-P1-04 defaults density to simple', () => {
    expect(getSettingsUiPreferences()).toEqual({ density: 'simple' });
  });

  it('UT-P1-04 persists advanced density and reads it back', () => {
    saveSettingsUiPreferences({ density: 'advanced' });
    expect(storage.set).toHaveBeenCalledWith(SETTINGS_UI_PREFERENCES_KEY, {
      density: 'advanced',
    });
    storage.values.set(SETTINGS_UI_PREFERENCES_KEY, { density: 'advanced' });
    expect(getSettingsUiPreferences()).toEqual({ density: 'advanced' });
  });

  it('UT-P1-04 rejects invalid stored density', () => {
    storage.values.set(SETTINGS_UI_PREFERENCES_KEY, { density: 'turbo' });
    expect(getSettingsUiPreferences()).toEqual({ density: 'simple' });
  });
});

describe('settingsSearch', () => {
  it('UT-P1-05 query ACOS hits PPC thresholds focus id', () => {
    const hit = findFirstSettingsSearchMatch('ACOS');
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe('ppc-thresholds');
    expect(hit?.sectionId).toBe('settings-section-tool-strategy');
  });

  it('UT-P1-05 empty query returns null', () => {
    expect(findFirstSettingsSearchMatch('   ')).toBeNull();
  });

  it('UT-P1-05 index covers key sections', () => {
    expect(SETTINGS_SEARCH_INDEX.some(e => e.sectionId === 'settings-section-llm')).toBe(true);
    expect(SETTINGS_SEARCH_INDEX.some(e => e.sectionId === 'settings-section-tool-strategy')).toBe(
      true
    );
  });
});

describe('density deep link helper', () => {
  it('applySettingsDeepLink calls setDensity when provided', () => {
    const setDensity = vi.fn();
    applySettingsDeepLink({ density: 'advanced' }, { scrollToSection: vi.fn(), setDensity });
    expect(setDensity).toHaveBeenCalledWith('advanced');
  });
});

describe('CT-P1-02 / CT-P1-03 template contracts', () => {
  const html = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  const css = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.css'),
    'utf8'
  );

  it('CT-P1-02 has search toolbar without density mode', () => {
    expect(html).toContain('settings-search');
    expect(html).toContain('data-testid="settings-search"');
    expect(html).toContain('settings-toolbar--search-only');
    expect(html).not.toContain('settings-density-simple');
    expect(html).not.toContain('settings-density-advanced');
    expect(html).not.toContain('data-settings-density=');
    expect(html).not.toContain("settingsDensity === 'simple'");
    expect(css).toContain('.settings-search');
    // segmented still used for animation speed
    expect(css).toContain('.settings-segmented');
  });

  it('CT-P1-03 template includes impact scope badge copy', () => {
    expect(html).toContain('仅本浏览器');
    expect(html).toContain('影响 AI 成本');
    expect(html).toContain('影响采集');
    expect(html).toContain('破坏性');
    expect(html).toContain('settings-badge');
    expect(css).toContain('.settings-badge--ai-cost');
  });
});
