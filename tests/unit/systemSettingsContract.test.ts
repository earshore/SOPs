import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readSettingsTemplate } from './settingsTemplateAssembly';
import {
  initAlpineSettings,
  openSettings,
  closeSettings,
} from '@/components/settings/systemSettings';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

const deps = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  const secureValues = new Map<string, string>();
  const llmConfigs = new Map<string, Record<string, unknown>>();
  const configValues = new Map<string, unknown>();
  const env = { isProduction: false };
  return {
    values,
    secureValues,
    llmConfigs,
    configValues,
    env,
    fetchModelsFromApi: vi.fn(),
    callLLM: vi.fn(),
    showToast: vi.fn(),
    errorHandle: vi.fn(),
    localData: {
      getUsage: vi.fn(),
      exportAll: vi.fn(),
      importAll: vi.fn(),
      clearBucket: vi.fn(),
      clearAll: vi.fn(),
    },
    appStoreState: {
      resetScraper: vi.fn(),
      resetAnalysis: vi.fn(),
      resetPromptLab: vi.fn(),
      resetKeywordTracker: vi.fn(),
    },
    historyClearAsync: vi.fn(),
    clearDeepChatThreadStore: vi.fn(),
    keywordHistoryClearAsync: vi.fn(),
    performanceMonitor: {
      isInitialized: vi.fn(),
      initialize: vi.fn(),
      show: vi.fn(),
    },
    configGet: vi.fn(),
    configSet: vi.fn(),
    initEventLogger: vi.fn(),
    confirmWithModal: vi.fn(),
    chooseWithModal: vi.fn(),
  };
});

vi.mock('@/services/storageService', () => {
  const keys = {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
    TOOL_STRATEGY_SETTINGS: 'tool_strategy_settings',
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
    PROXY_CONFIG: 'proxy_config',
    PROXY_KEY_MAP: 'proxy_key_map',
    SCRAPER_PROXY_CONFIG: 'scraper_proxy_config',
    SCRAPE_HISTORY: 'scrape_history',
    LAYOUT_CONFIG_PREFIX: 'layout_config_',
    FEATURE_FLAGS_PREFIX: 'feature_',
    AMZ_SEARCH_HISTORY: 'amzf_search_history',
  } as const;

  return {
    STORAGE_KEYS: keys,
    StorageService: {
      get: vi.fn((key: string, fallback?: unknown) =>
        deps.values.has(key) ? deps.values.get(key) : (fallback ?? null)
      ),
      set: vi.fn((key: string, value: unknown) => {
        deps.values.set(key, value);
      }),
      getSecure: vi.fn(async (key: string, fallback = '') =>
        deps.secureValues.has(key) ? deps.secureValues.get(key) : fallback
      ),
      setSecure: vi.fn(async (key: string, value: string) => {
        deps.secureValues.set(key, value);
      }),
      removeSecure: vi.fn((key: string) => {
        deps.secureValues.delete(key);
      }),
      getProxyConfig: vi.fn(
        () =>
          deps.values.get(keys.PROXY_CONFIG) ??
          deps.values.get(keys.SCRAPER_PROXY_CONFIG) ?? {
            type: 'scraperapi',
          }
      ),
      getProxyKeyMap: vi.fn(async () =>
        deps.secureValues.has(keys.PROXY_KEY_MAP)
          ? JSON.parse(deps.secureValues.get(keys.PROXY_KEY_MAP) || '{}')
          : (deps.values.get(keys.PROXY_KEY_MAP) ?? {})
      ),
      setProxyKeyMap: vi.fn(async (value: Record<string, string>) => {
        deps.secureValues.set(keys.PROXY_KEY_MAP, JSON.stringify(value));
      }),
      setProxyConfigWithCredential: vi.fn(async (config: Record<string, unknown>) => {
        const { customUrl: _customUrl, ...safeConfig } = config;
        deps.values.set(keys.PROXY_CONFIG, safeConfig);
        deps.values.set(keys.SCRAPER_PROXY_CONFIG, safeConfig);
      }),
      getLLMConfig: vi.fn((provider: string) => deps.llmConfigs.get(provider) ?? null),
      setLLMConfig: vi.fn((provider: string, config: Record<string, unknown>) => {
        deps.llmConfigs.set(provider, config);
        deps.values.set(keys.LLM_ACTIVE_PROVIDER, provider);
      }),
      getLLMConfigWithKey: vi.fn(async (provider: string) => {
        const config = deps.llmConfigs.get(provider);
        if (!config) return null;
        return {
          ...config,
          apiKey: deps.secureValues.get(`llm_key_${provider}`) ?? config.apiKey ?? '',
        };
      }),
    },
  };
});

vi.mock('@/services/llmService', () => ({
  fetchModelsFromApi: deps.fetchModelsFromApi,
  callLLM: deps.callLLM,
}));

vi.mock('@/common/ui', () => ({
  showToast: deps.showToast,
}));

vi.mock('@/components/modal/confirmModal', () => ({
  confirmWithModal: deps.confirmWithModal,
  chooseWithModal: deps.chooseWithModal,
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: deps.errorHandle,
  },
}));

vi.mock('@/services/localDataStore', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/localDataStore')>();
  return {
    ...actual,
    LocalDataStore: deps.localData,
  };
});

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => deps.appStoreState,
  },
}));

vi.mock('@/common/config/envConfig', () => ({
  EnvConfig: {
    get isProduction() {
      return deps.env.isProduction;
    },
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: deps.configGet,
    set: deps.configSet,
    isProduction: vi.fn(() => deps.env.isProduction),
  },
}));

vi.mock('@/common/utils/eventLogger', () => ({
  initEventLogger: deps.initEventLogger,
}));

vi.mock('@/common/devtools/PerformanceMonitor', () => ({
  performanceMonitor: deps.performanceMonitor,
}));

type TestPanel = ReturnType<Extract<Parameters<typeof window.Alpine.data>[1], () => unknown>> & {
  [key: string]: any;
};

function createPanel(): TestPanel {
  const data = vi.fn();
  (window as unknown as { Alpine: { data: typeof data } }).Alpine = { data };

  initAlpineSettings();

  const factory = data.mock.calls.find(([name]) => name === 'settingsPanel')?.[1];
  expect(factory).toBeTypeOf('function');
  return factory() as TestPanel;
}

/**
 * TD-SET-01 Phase 0 契约清单。
 * 来自 2026-08-03 实测：systemSettings.ts 3248 行；`settingsPanel` 数据键集合见下。
 * 拆分前后该清单必须完全一致（仅允许新增并同步收紧本条测试）。
 */
const PANEL_DATA_KEYS: string[] = [
  '_navScrollPauseUntil',
  '_navScrollUnbind',
  '_runtimeHealthNormalized',
  '_settingsBaseline',
  '_subscriptionsInitialized',
  '_unsubscribers',
  'activeContextText',
  'activeFeatureBadges',
  'activeFeaturesText',
  'activeModelCapability',
  'activeModelInfo',
  'activeNavTargetId',
  'activeRuntimePresetId',
  'apiPathCapabilityHint',
  'apiPathOptions',
  'appearanceAnimationSpeed',
  'appearanceAnimationsEnabled',
  'appearanceColorMode',
  'appearanceColorModeIsSystem',
  'appearanceColorModeRev',
  'appearanceColorModeSystemHint',
  'appearanceRespectSystemPreference',
  'appearanceThemeId',
  'appearanceThemeOptions',
  'applyRuntimePresetById',
  'autoSaveProviderConfig',
  'bindSettingsNavScrollSpy',
  'canUndoRuntimeSave',
  'captureSettingsBaseline',
  'clampReasoningPrefsToActiveModel',
  'clearAllLocalData',
  'clearExportBucketSelection',
  'clearLocalCache',
  'clearLocalDataBucket',
  'close',
  'commercialProxyOptions',
  'currentProviderConfig',
  'defaultLlmEndpoint',
  'destroy',
  'developerDangerousEndpointText',
  'developerDiagnostics',
  'directProxyOptions',
  'dirtyPartitions',
  'dismissExternalChangeNotice',
  'exportLocalData',
  'exportLocalDataButtonText',
  'externalChangeConflict',
  'externalChangeNotice',
  'fetchModels',
  'fetchModelsIconClass',
  'fetchModelsText',
  'formatBytes',
  'fullApiUrlPreview',
  'getModelLabel',
  'getModelValue',
  'getProxyDisplayName',
  'getRuntimeBoolean',
  'getRuntimeNumber',
  'getToolStrategyModelOptionLabel',
  'handleStorageEvent',
  'healthMessages',
  'importLocalData',
  'indexedDbKeysText',
  'indexedDbUsedText',
  'init',
  'isDangerousEndpoint',
  'isExportBucketSelected',
  'isModelSelected',
  'isNavGroupOpen',
  'isNavTargetCurrent',
  'isOpen',
  'isPartialLocalDataExport',
  'isProduction',
  'llm',
  'llmApiFamily',
  'llmApiFamilyOptions',
  'llmApiKeyIconClass',
  'llmApiKeyInputType',
  'llmApiKeyVisibilityLabel',
  'llmApiPathMenuOpen',
  'llmProviderOptions',
  'llmSetupReadinessText',
  'loadAppearanceSettings',
  'loadProviderConfig',
  'loadProxyConfig',
  'loadRuntimeStrategy',
  'loadToolStrategyDefaults',
  'localData',
  'localDataBucketItems',
  'localDataCleanupSummaryText',
  'localDataCleanupToggleIconClass',
  'localDataCleanupToggleText',
  'localSecretBoundaryText',
  'localStorageKeysText',
  'localStorageUsedText',
  'masterAnalysisBudgetItems',
  'masterAnalysisEvidenceDepthOptions',
  'masterAnalysisEvidenceDepthSelectedHint',
  'masterAnalysisEvidenceDepthSelectedLabel',
  'masterAnalysisScheduleOptions',
  'masterAnalysisScheduleSelectedHint',
  'masterAnalysisScheduleSelectedLabel',
  'modelCapabilityBadges',
  'modelSelectDisabled',
  'navOpenGroup',
  'navigateToNavTarget',
  'onSettingsSearch',
  'open',
  'openPerformanceMonitor',
  'persistRuntimeStrategySettings',
  'ppcThresholdItems',
  'proxy',
  'proxyHintText',
  'proxyInputLabel',
  'proxyInputPlaceholder',
  'proxyInputType',
  'proxyKeyIconClass',
  'proxyKeyVisibilityLabel',
  'proxyNeedsInput',
  'quotaWarningVisible',
  'reasoningEffortButtonLabel',
  'reasoningEffortLabel',
  'reasoningEffortOptions',
  'refreshLocalDataUsage',
  'refreshRollbackUi',
  'refreshSettingsHealth',
  'reloadFromExternalChange',
  'resetRuntimeStrategy',
  'restoreLlmSettingsSnapshot',
  'runtimeAnalysisTimeoutSeconds',
  'runtimeDeepChatTimeoutSeconds',
  'runtimeStrategy',
  'runtimeStrategySaveIconClass',
  'runtimeStrategySaveText',
  'runtimeTestConnectionTimeoutSeconds',
  'saveProviderConfig',
  'saveProxyConfig',
  'saveRuntimeStrategy',
  'saveToolStrategy',
  'schedulePreferenceMenuOpen',
  'scrollToElementInPanel',
  'scrollToSearchHit',
  'scrollToSection',
  'searchHitId',
  'searchHits',
  'searchQuery',
  'selectAllExportBuckets',
  'selectSettingsSearchHit',
  'selectedApiPathDescription',
  'selectedApiPathNameLabel',
  'selectedApiPathOption',
  'selectedApiPathPathLabel',
  'setAppearanceAnimationSpeed',
  'setAppearanceAnimationsEnabled',
  'setAppearanceColorMode',
  'setAppearanceRespectSystemPreference',
  'setAppearanceTheme',
  'setAppearanceThemeFromEvent',
  'setDeveloperDiagnosticBoolean',
  'setDeveloperDiagnosticLogLevel',
  'setLlmApiFamily',
  'setLlmApiKey',
  'setLlmApiPath',
  'setLlmApiPathId',
  'setLlmEndpoint',
  'setLlmModel',
  'setLlmProvider',
  'setLlmServiceTier',
  'setMasterAnalysisEvidenceDepth',
  'setMasterAnalysisSchedulePreference',
  'setProxyCustomUrl',
  'setProxyType',
  'setReasoningEffort',
  'setReasoningEffortLevel',
  'setReasoningEnabled',
  'setRuntimeBoolean',
  'setRuntimeNumber',
  'setRuntimeString',
  'setToolTargetModel',
  'settingsAppVersionLabel',
  'settingsFooterStatusText',
  'showDangerousEndpointWarning',
  'showDeveloperDiagnostics',
  'showReasoningControls',
  'storageUsageRatio',
  'syncActiveRuntimePresetFromSettings',
  'testConnection',
  'testConnectionIconClass',
  'testConnectionText',
  'testProxyConnection',
  'toggleExportBucket',
  'toggleLlmKeyVisibility',
  'toggleLocalDataCleanupItems',
  'toggleNavGroup',
  'toggleProxyKeyVisibility',
  'toolStrategy',
  'toolStrategyModelSelectDisabled',
  'toolStrategyProviderLabel',
  'toolStrategySaveIconClass',
  'toolStrategySaveText',
  'toolStrategyTargetItems',
  'toolStrategyTargetItemsByIds',
  'unbindSettingsNavScrollSpy',
  'undoLastSettingsSave',
  'updateActiveNavFromScroll',
];

const LLM_STATE_KEYS = [
  'apiKey',
  'apiPath',
  'endpoint',
  'isFetching',
  'isTesting',
  'model',
  'models',
  'provider',
  'reasoningPrefs',
  'serviceTier',
  'showKey',
];

const PROXY_STATE_KEYS = [
  'customUrl',
  'isTesting',
  'savedKeyMap',
  'showKey',
  'status',
  'testError',
  'testMessage',
  'type',
];

const TOOL_STRATEGY_STATE_KEYS = ['isSaving', 'targetModels'];

const RUNTIME_STATE_KEYS = ['isSaving', 'settings'];

const LOCAL_DATA_STATE_KEYS = [
  'cleanupItemsExpanded',
  'clearingBucketId',
  'isBusy',
  'selectedExportBuckets',
  'usage',
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  deps.values.clear();
  deps.secureValues.clear();
  deps.llmConfigs.clear();
  deps.configValues.clear();
  deps.env.isProduction = false;
  deps.fetchModelsFromApi.mockReset();
  deps.callLLM.mockReset();
  deps.showToast.mockReset();
  deps.errorHandle.mockReset();
  deps.localData.getUsage.mockReset().mockResolvedValue({
    localStorage: { used: 1024, keys: 2 },
    indexedDB: { used: 2048, keys: 3 },
    total: 3072,
    buckets: [],
  });
  deps.confirmWithModal.mockReset().mockResolvedValue(true);
  deps.chooseWithModal.mockReset().mockResolvedValue('cancel');
  deps.configValues.set('llm.testConnectionTimeout', 15000);
  deps.configValues.set('performance.enableMonitoring', true);
  deps.configValues.set('errorTracker.enabled', true);
});

describe('TD-SET-01 contract: Alpine panel data keys (AC-4)', () => {
  it('registers x-data="settingsPanel" via Alpine.data and the key set is frozen', () => {
    const panel = createPanel();

    expect(initAlpineSettings).toBeTypeOf('function');
    expect(Object.keys(panel).sort()).toEqual([...PANEL_DATA_KEYS].sort());
  });

  it('nested state shapes are frozen', () => {
    const panel = createPanel();

    expect(Object.keys(panel.llm).sort()).toEqual(LLM_STATE_KEYS);
    expect(Object.keys(panel.proxy).sort()).toEqual(PROXY_STATE_KEYS);
    expect(Object.keys(panel.toolStrategy).sort()).toEqual(TOOL_STRATEGY_STATE_KEYS);
    expect(Object.keys(panel.runtimeStrategy).sort()).toEqual(RUNTIME_STATE_KEYS);
    expect(Object.keys(panel.localData).sort()).toEqual(LOCAL_DATA_STATE_KEYS);
  });

  it('面板打开时对外 API openSettings/closeSettings 仅走 EventBus 桥', () => {
    const open = vi.fn();
    const close = vi.fn();
    const unsubscribeOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, open);
    const unsubscribeClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, close);

    openSettings({ sectionId: 'settings-section-llm', focus: 'llm-step-1-title' });
    closeSettings();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toMatchObject({
      sectionId: 'settings-section-llm',
      focus: 'llm-step-1-title',
      timestamp: expect.any(Number),
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(close.mock.calls[0][0]).toMatchObject({
      saved: false,
      timestamp: expect.any(Number),
    });

    unsubscribeOpen();
    unsubscribeClose();
  });

});

describe('TD-SYS-01 contract: HTML 外壳语义 (AC-4)', () => {
  it('面板模板保持单根 x-data="settingsPanel" 与关键事件绑定', () => {
    const template = readSettingsTemplate();

    expect(template).toContain('x-data="settingsPanel"');
    expect(template).toContain('data-testid="settings-panel"');
    expect(template).toContain('@open-settings.window="open()"');
    expect(template).toContain('@close-settings.window="close()"');
    expect(template).toContain('settings-panel-root');
    // 契约锚点：以下导航/分区元素必须保留
    expect(template).toContain('data-testid="settings-side-nav"');
    expect(template).toContain('id="settings-section-llm"');
    expect(template).toContain('id="settings-section-tool-strategy"');
    expect(template).toContain('id="settings-section-network"');
    expect(template).toContain('id="settings-section-data"');
    expect(template).toContain('id="settings-section-appearance"');
    expect(template).toContain('id="settings-section-performance"');
  });
});


