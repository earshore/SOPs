import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySettingsDeepLink,
  clearSettingsDeepLinkHighlight,
  expandSettingsFocusTarget,
  findSettingsNavTarget,
  isSettingsSectionId,
  normalizeSettingsOpenOptions,
  resolveSettingsHighlightTarget,
} from '@/components/settings/domain/settingsDeepLink';
import { closeSettings, openSettings } from '@/components/settings/systemSettings';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
    TOOL_STRATEGY_SETTINGS: 'tool_strategy_settings',
    PROXY_CONFIG: 'proxy_config',
    PROXY_KEY_MAP: 'proxy_key_map',
    SCRAPER_PROXY_CONFIG: 'scraper_proxy_config',
    SCRAPE_HISTORY: 'scrape_history',
  },
  StorageService: {
    get: vi.fn(() => null),
    set: vi.fn(),
    getSecure: vi.fn(async () => ''),
    setSecure: vi.fn(async () => undefined),
    removeSecure: vi.fn(),
    getProxyConfig: vi.fn(() => ({ type: 'scraperapi' })),
    getProxyKeyMap: vi.fn(async () => ({})),
    setProxyKeyMap: vi.fn(async () => undefined),
    setProxyConfigWithCredential: vi.fn(async () => undefined),
    getLLMConfig: vi.fn(() => null),
    setLLMConfig: vi.fn(),
    getLLMConfigWithKey: vi.fn(async () => null),
  },
}));

vi.mock('@/services/llmService', () => ({
  fetchModelsFromApi: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/modal/confirmModal', () => ({
  confirmWithModal: vi.fn(),
  chooseWithModal: vi.fn(),
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: { handle: vi.fn() },
}));

vi.mock('@/services/localDataStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/localDataStore')>();
  return {
    ...actual,
    LocalDataStore: {
      getUsage: vi.fn(),
      exportAll: vi.fn(),
      importAll: vi.fn(),
      clearBucket: vi.fn(),
      clearAll: vi.fn(),
    },
  };
});

vi.mock('@/stores/useAppStore', () => ({
  appStore: { getState: () => ({}) },
}));

beforeEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('settingsDeepLink helpers', () => {
  it('validates section ids and normalizes options', () => {
    expect(isSettingsSectionId('settings-section-tool-strategy')).toBe(true);
    expect(isSettingsSectionId('nope')).toBe(false);
    expect(
      normalizeSettingsOpenOptions({
        sectionId: 'settings-section-tool-strategy',
        focus: 'ppc-thresholds',
        density: 'advanced',
        extra: 1,
      } as never)
    ).toEqual({
      sectionId: 'settings-section-tool-strategy',
      focus: 'ppc-thresholds',
    });
    expect(normalizeSettingsOpenOptions({ sectionId: 'bad' as never })).toEqual({});
  });

  it('applies sectionId after open via scroll helper', () => {
    const scroll = vi.fn();
    applySettingsDeepLink(
      { sectionId: 'settings-section-tool-strategy', focus: 'ppc-thresholds' },
      { scrollToSection: scroll }
    );
    expect(scroll).toHaveBeenCalledWith('settings-section-tool-strategy');
  });

  it('expands details matching data-settings-focus', () => {
    const details = document.createElement('details');
    details.className = 'settings-pref-fold';
    details.dataset.settingsFocus = 'master-analysis';
    document.body.append(details);

    applySettingsDeepLink({ focus: 'master-analysis' }, { scrollToSection: vi.fn() });

    expect(details.open).toBe(true);
    expect(details.classList.contains('settings-deep-link-highlight')).toBe(true);
  });

  it('prefers data-settings-focus fold over title id for highlight', () => {
    const fold = document.createElement('details');
    fold.className = 'settings-pref-fold';
    fold.dataset.settingsFocus = 'llm-step-1-title';
    const title = document.createElement('h4');
    title.id = 'llm-step-1-title';
    title.className = 'settings-pref-row__title';
    title.dataset.settingsNavId = 'llm-step-1-title';
    fold.append(title);
    document.body.append(fold);

    const target = findSettingsNavTarget('llm-step-1-title');
    expect(target).toBe(fold);

    const surface = expandSettingsFocusTarget('llm-step-1-title');
    expect(surface).toBe(fold);
    expect(fold.open).toBe(true);
    expect(fold.classList.contains('settings-deep-link-highlight')).toBe(true);
    expect(title.classList.contains('settings-deep-link-highlight')).toBe(false);
  });

  it('promotes bare title hits to nearest card surface', () => {
    const row = document.createElement('div');
    row.className = 'settings-pref-row';
    const title = document.createElement('h4');
    title.id = 'orphan-title';
    row.append(title);
    document.body.append(row);

    expect(resolveSettingsHighlightTarget(title)).toBe(row);
  });

  it('highlights whole L3 module (title + body), not body alone', () => {
    const l3 = document.createElement('div');
    l3.className = 'settings-tool-l3 settings-tool-l3--static';
    l3.dataset.settingsFocus = 'master-analysis-scrape';
    l3.dataset.settingsNavId = 'master-analysis-scrape';

    const summary = document.createElement('div');
    summary.className = 'settings-tool-l3__summary';
    const title = document.createElement('h5');
    title.className = 'settings-card__title';
    title.textContent = '数据采集';
    summary.append(title);

    const body = document.createElement('div');
    body.className = 'settings-tool-page settings-tool-l3__body';
    body.textContent = 'content';

    l3.append(summary, body);
    document.body.append(l3);

    expect(resolveSettingsHighlightTarget(l3)).toBe(l3);
    expect(resolveSettingsHighlightTarget(title)).toBe(l3);
    expect(resolveSettingsHighlightTarget(body)).toBe(l3);

    const surface = expandSettingsFocusTarget('master-analysis-scrape');
    expect(surface).toBe(l3);
    expect(l3.classList.contains('settings-deep-link-highlight')).toBe(true);
    expect(body.classList.contains('settings-deep-link-highlight')).toBe(false);
  });

  it('clears previous highlight when focusing a new target', () => {
    const a = document.createElement('div');
    a.className = 'settings-pref-row';
    a.dataset.settingsFocus = 'target-a';
    const b = document.createElement('div');
    b.className = 'settings-pref-row';
    b.dataset.settingsFocus = 'target-b';
    document.body.append(a, b);

    expandSettingsFocusTarget('target-a');
    expect(a.classList.contains('settings-deep-link-highlight')).toBe(true);

    expandSettingsFocusTarget('target-b');
    expect(a.classList.contains('settings-deep-link-highlight')).toBe(false);
    expect(b.classList.contains('settings-deep-link-highlight')).toBe(true);

    clearSettingsDeepLinkHighlight();
    expect(b.classList.contains('settings-deep-link-highlight')).toBe(false);
  });
});

describe('openSettings SETTINGS_OPEN payload', () => {
  it('emits SETTINGS_OPEN with deep-link options', () => {
    const handler = vi.fn();
    const unsub = eventBus.on(APP_EVENTS.SETTINGS_OPEN, handler);

    openSettings({
      sectionId: 'settings-section-tool-strategy',
      focus: 'ppc-thresholds',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      sectionId: 'settings-section-tool-strategy',
      focus: 'ppc-thresholds',
      timestamp: expect.any(Number),
    });
    expect(handler.mock.calls[0][0]).not.toHaveProperty('density');

    closeSettings();
    unsub();
  });
});
