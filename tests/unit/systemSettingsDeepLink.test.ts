import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySettingsDeepLink,
  isSettingsSectionId,
  normalizeSettingsOpenOptions,
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
    details.dataset.settingsFocus = 'master-analysis';
    document.body.append(details);

    applySettingsDeepLink({ focus: 'master-analysis' }, { scrollToSection: vi.fn() });

    expect(details.open).toBe(true);
    expect(details.classList.contains('settings-deep-link-highlight')).toBe(true);
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
