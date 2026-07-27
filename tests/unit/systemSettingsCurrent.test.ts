import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  closeSettings,
  fetchModels,
  initAlpineSettings,
  openPerformanceMonitor,
  openSettings,
  updateModelStatus,
} from '@/components/settings/systemSettings';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { fetchModelsFromApi, callLLM } from '@/services/llmService';
import { showToast } from '@/common/ui';
import { LocalDataStore } from '@/services/localDataStore';
import { ErrorService } from '@/services/errorService';
import { performanceMonitor } from '@/common/devtools/PerformanceMonitor';

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

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    clearAsync: deps.historyClearAsync,
  },
}));

vi.mock('@/modules/app_center/views/playground/deep-chat', () => ({
  clearDeepChatThreadStore: deps.clearDeepChatThreadStore,
}));

vi.mock('@/modules/app_center/views/keyword_hunter/services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    clearAsync: deps.keywordHistoryClearAsync,
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

const usage = {
  localStorage: { used: 1024, keys: 2 },
  indexedDB: { used: 2048, keys: 3 },
  total: 3072,
  buckets: [],
};

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
  deps.localData.getUsage.mockReset().mockResolvedValue(usage);
  deps.localData.exportAll.mockReset().mockResolvedValue({ version: 1 });
  deps.localData.importAll.mockReset().mockResolvedValue(undefined);
  deps.localData.clearBucket.mockReset().mockResolvedValue(2);
  deps.localData.clearAll.mockReset().mockResolvedValue(undefined);
  deps.appStoreState.resetScraper.mockReset();
  deps.appStoreState.resetAnalysis.mockReset();
  deps.appStoreState.resetPromptLab.mockReset();
  deps.appStoreState.resetKeywordTracker.mockReset();
  deps.historyClearAsync.mockReset().mockResolvedValue(undefined);
  deps.clearDeepChatThreadStore.mockReset().mockResolvedValue(undefined);
  deps.keywordHistoryClearAsync.mockReset().mockResolvedValue(undefined);
  deps.performanceMonitor.isInitialized.mockReset().mockReturnValue(false);
  deps.performanceMonitor.initialize.mockReset();
  deps.performanceMonitor.show.mockReset();
  deps.initEventLogger.mockReset();
  deps.confirmWithModal.mockReset().mockResolvedValue(true);
  deps.chooseWithModal.mockReset().mockResolvedValue('cancel');
  deps.configValues.set('llm.testConnectionTimeout', 15000);
  deps.configValues.set('performance.enableMonitoring', true);
  deps.configValues.set('errorTracker.enabled', true);
  deps.configValues.set('analytics.enabled', true);
  deps.configValues.set('features.enableExperimentalFeatures', false);
  deps.configValues.set('features.enableBetaFeatures', false);
  deps.configValues.set('features.enableDebugMode', false);
  deps.configValues.set('logger.minLevel', 'info');
  deps.configGet
    .mockReset()
    .mockImplementation((key: string, fallback?: unknown) =>
      deps.configValues.has(key) ? deps.configValues.get(key) : fallback
    );
  deps.configSet.mockReset().mockImplementation((key: string, value: unknown) => {
    deps.configValues.set(key, value);
  });
  document.body.innerHTML = '';
  delete (window as unknown as { Alpine?: unknown }).Alpine;
});

it('registers Alpine settings and initializes subscriptions', async () => {
  const panel = createPanel();
  panel.$watch = vi.fn();

  panel.init();
  await panel.refreshLocalDataUsage();

  expect(panel.$watch).toHaveBeenCalledWith('llm.provider', expect.any(Function));
  expect(panel.$watch).toHaveBeenCalledWith('proxy.type', expect.any(Function));
  expect(panel.localData.usage).toEqual(usage);

  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
  expect(panel.isOpen).toBe(true);

  eventBus.emit(APP_EVENTS.SETTINGS_CLOSE);
  expect(panel.isOpen).toBe(false);

  panel.destroy();
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
  expect(panel.isOpen).toBe(false);
});

it('does not stack EventBus or $watch subscriptions when init is called twice', async () => {
  const panel = createPanel();
  panel.$watch = vi.fn();

  eventBus.removeAllListeners(APP_EVENTS.SETTINGS_OPEN);
  eventBus.removeAllListeners(APP_EVENTS.SETTINGS_CLOSE);
  const openBefore = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_OPEN] ?? 0;
  const closeBefore = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_CLOSE] ?? 0;

  panel.init();
  const openAfterFirst = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_OPEN] ?? 0;
  const closeAfterFirst = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_CLOSE] ?? 0;
  panel.init();
  const openAfterSecond = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_OPEN] ?? 0;
  const closeAfterSecond = eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_CLOSE] ?? 0;

  expect(panel.$watch).toHaveBeenCalledTimes(2);
  expect(panel._subscriptionsInitialized).toBe(true);
  expect(panel._unsubscribers).toHaveLength(4);
  expect(openAfterFirst - openBefore).toBe(1);
  expect(closeAfterFirst - closeBefore).toBe(1);
  expect(openAfterSecond - openAfterFirst).toBe(0);
  expect(closeAfterSecond - closeAfterFirst).toBe(0);

  panel.isOpen = false;
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
  expect(panel.isOpen).toBe(true);

  panel.destroy();
  expect(panel._subscriptionsInitialized).toBe(false);
  expect(panel._unsubscribers).toEqual([]);
  expect(eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_OPEN] ?? 0).toBe(openBefore);
  expect(eventBus.getStats().eventCounts[APP_EVENTS.SETTINGS_CLOSE] ?? 0).toBe(closeBefore);

  panel.isOpen = false;
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
  expect(panel.isOpen).toBe(false);
});

it('computes field state, display labels, and local data text', () => {
  const panel = createPanel();
  deps.env.isProduction = true;
  panel.llm.endpoint = 'https://api.openai.com/v1';
  panel.llm.models = [];
  panel.localData.usage = usage;

  expect(panel.showDangerousEndpointWarning).toBe(true);
  expect(panel.proxyNeedsInput).toBe(true);
  expect(panel.proxyInputLabel).toBe('API Key (密钥)');
  expect(panel.proxyInputPlaceholder).toContain('ScraperAPI');
  expect(panel.llmApiKeyInputType).toBe('password');
  expect(panel.llmApiKeyIconClass).toBe('fa-eye');
  expect(panel.modelSelectDisabled).toBe(true);
  expect(panel.fetchModelsIconClass).toBe('fa-sync-alt');
  expect(panel.testConnectionIconClass).toContain('fa-plug');
  expect(panel.proxyHintText).toContain('商业 API Key');
  expect(panel.localSecretBoundaryText).toContain('浏览器本地加密保存');
  expect(panel.localSecretBoundaryText).toContain('不是服务端密钥托管');
  expect(panel.localStorageUsedText).toBe('1.0 KB');
  expect(panel.indexedDbKeysText).toBe('3 records');
  expect(panel.localDataCleanupToggleText).toBe('展开清理项');
  expect(panel.formatBytes(0)).toBe('0 B');
  expect(panel.formatBytes(1536)).toBe('1.5 KB');
  expect(panel.getProxyDisplayName('custom_proxy')).toBe('HTTP 代理');
  expect(panel.getProxyDisplayName('missing')).toBe('默认');
  expect(panel.developerDangerousEndpointText).toContain('危险端点需通过代理或企业网关访问');

  panel.toggleLlmKeyVisibility();
  panel.toggleProxyKeyVisibility();
  expect(panel.llmApiKeyInputType).toBe('text');
  expect(panel.proxyInputType).toBe('text');
  expect(panel.activeFeatureBadges).toEqual([
    { key: 'basic', label: '基础能力', icon: 'fa-message' },
  ]);
});

it('gates developer diagnostics and saves debug settings', () => {
  const panel = createPanel();

  expect(panel.showDeveloperDiagnostics).toBe(true);
  deps.env.isProduction = true;
  expect(panel.showDeveloperDiagnostics).toBe(false);

  panel.setDeveloperDiagnosticBoolean('enableDebugMode', { target: { checked: true } } as any);
  expect(panel.showDeveloperDiagnostics).toBe(true);
  expect(deps.configSet).toHaveBeenCalledWith('features.enableDebugMode', true);
  expect(StorageService.set).toHaveBeenCalledWith(
    'developer_diagnostic_settings',
    expect.objectContaining({ enableDebugMode: true })
  );

  panel.setDeveloperDiagnosticBoolean('eventDebugEnabled', { target: { checked: true } } as any);
  expect(StorageService.set).toHaveBeenCalledWith('debug_events', 'true');
  expect(deps.initEventLogger).toHaveBeenCalledTimes(1);
  expect(panel.developerDiagnostics.eventDebugEnabled).toBe(true);

  panel.setDeveloperDiagnosticLogLevel({ target: { value: 'debug' } } as any);
  expect(deps.configSet).toHaveBeenCalledWith('logger.minLevel', 'debug');
  expect(panel.developerDiagnostics.loggerMinLevel).toBe('debug');
});

it('loads and saves LLM provider configuration', async () => {
  vi.useFakeTimers();
  deps.llmConfigs.set('new_api', {
    endpoint: '/v1',
    model: 'custom-model',
    serviceTier: 'priority',
    models: [
      { id: 'custom-model', name: 'Custom' },
      { id: 'custom-model', name: 'Duplicate' },
    ],
  });
  deps.secureValues.set('llm_key_new_api', 'secure-key');
  const panel = createPanel();

  await panel.loadProviderConfig('new_api');

  expect(panel.llm.endpoint).toBe('https://new.hongecb.store/v1');
  expect(panel.llm.apiKey).toBe('secure-key');
  expect(panel.llm.models).toEqual([{ id: 'custom-model', name: 'Custom' }]);
  expect(panel.llm.model).toBe('custom-model');
  expect(panel.getModelValue({ id: 'model-a' })).toBe('model-a');
  expect(panel.getModelLabel('model-b')).toBe('model-b');
  expect(panel.isModelSelected('custom-model')).toBe(true);
  expect(panel.isModelSelected({ id: 'model-a' })).toBe(false);

  panel.llm.apiKey = '';
  await panel.saveProviderConfig();
  expect(showToast).toHaveBeenCalledWith('请填写 API Key', { type: 'warning' });

  panel.llm.apiKey = 'new-key';
  panel.llm.model = 'custom-model';
  panel.isOpen = true;
  await panel.saveProviderConfig();
  await vi.advanceTimersByTimeAsync(500);

  expect(StorageService.setSecure).toHaveBeenCalledWith('llm_key_new_api', 'new-key');
  expect(StorageService.setLLMConfig).toHaveBeenCalledWith(
    'new_api',
    expect.objectContaining({
      endpoint: 'https://new.hongecb.store/v1',
      model: 'custom-model',
      serviceTier: 'priority',
      apiKey: '',
      enabled: true,
    })
  );
  // Unified save: panel stays open after save
  expect(panel.isOpen).toBe(true);
});

it('saves and reloads tool strategy target default models', async () => {
  const panel = createPanel();
  panel.llm.provider = 'new_api';
  panel.llm.model = 'fast-model';
  panel.llm.models = ['fast-model', 'quality-model'];
  panel.loadToolStrategyDefaults();

  expect(
    panel.toolStrategyTargetItems.find((item: any) => item.id === 'master-analysis-ai-analysis')
  ).toEqual(
    expect.objectContaining({
      label: 'Master Analysis - AI智能分析',
      model: '',
      resolvedModel: 'fast-model',
    })
  );
  expect(
    panel
      .toolStrategyTargetItemsByIds(['master-analysis-ai-analysis', 'playground-deep-chat'])
      .map((item: any) => item.label)
  ).toEqual(['Master Analysis - AI智能分析', 'Playground - Deep Chat']);

  panel.setToolTargetModel('master-analysis-ai-analysis', {
    target: { value: 'quality-model' },
  } as any);
  panel.setToolTargetModel('playground-deep-chat', { target: { value: 'fast-model' } } as any);
  await panel.saveToolStrategy();

  expect(StorageService.set).toHaveBeenCalledWith(
    'tool_strategy_settings',
    expect.objectContaining({
      version: 2,
      targets: expect.objectContaining({
        'master-analysis-ai-analysis': {
          defaultModelsByProvider: {
            new_api: 'quality-model',
          },
        },
        'playground-deep-chat': {
          defaultModelsByProvider: {
            new_api: 'fast-model',
          },
        },
      }),
    })
  );
  expect(showToast).toHaveBeenCalledWith('工具与运行策略已保存', { type: 'success' });

  panel.toolStrategy.targetModels['master-analysis-ai-analysis'] = '';
  panel.loadToolStrategyDefaults();
  expect(panel.toolStrategy.targetModels['master-analysis-ai-analysis']).toBe('quality-model');
});

it('saves editable runtime strategy settings', async () => {
  const panel = createPanel();

  panel.setRuntimeNumber('llm.analysisTimeoutMs', { target: { value: '180' } } as any, 1000);
  panel.setRuntimeNumber('llm.maxRetries', { target: { value: '4' } } as any);
  panel.setRuntimeNumber('llm.testConnectionTimeoutMs', { target: { value: '20' } } as any, 1000);
  panel.setRuntimeNumber('deepChat.requestTimeoutMs', { target: { value: '75' } } as any, 1000);
  panel.setRuntimeBoolean('deepChat.enableBusinessTools', {
    target: { checked: false },
  } as any);
  panel.setRuntimeNumber('ppcSearchTerms.batchSize', { target: { value: '120' } } as any);
  panel.setRuntimeNumber('ppcSearchTerms.maxConcurrentBatches', { target: { value: '3' } } as any);
  panel.setRuntimeBoolean('keywordHunterSeoProcess.enableLlmCache', {
    target: { checked: false },
  } as any);
  panel.setRuntimeBoolean('keywordHunterListingReview.enableLlmCache', {
    target: { checked: false },
  } as any);
  await panel.saveRuntimeStrategy();

  expect(StorageService.set).toHaveBeenCalledWith(
    'runtime_strategy_settings',
    expect.objectContaining({
      version: 2,
      llm: expect.objectContaining({
        testConnectionTimeoutMs: 20000,
        analysisTimeoutMs: 180000,
        maxRetries: 4,
      }),
      deepChat: expect.objectContaining({
        requestTimeoutMs: 75000,
        enableBusinessTools: false,
      }),
      ppcSearchTerms: expect.objectContaining({
        batchSize: 120,
        maxConcurrentBatches: 3,
      }),
      keywordHunterSeoProcess: expect.objectContaining({
        enableLlmCache: false,
      }),
      keywordHunterListingReview: expect.objectContaining({
        enableLlmCache: false,
      }),
    })
  );
  expect(showToast).toHaveBeenCalledWith('数据策略已保存', { type: 'success' });
});

it('exposes deepChat business tools toggle binding in settings template', () => {
  const template = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  expect(template).toContain("setRuntimeBoolean('deepChat.enableBusinessTools'");
  expect(template).toContain('runtimeStrategy.settings.deepChat.enableBusinessTools');
  // Peer pref-row title (flattened; no nested "启用业务工具" section)
  expect(template).toContain('settings-pref-row__title">业务工具');
  expect(template).toContain('settings-save-tool-strategy');
  expect(template).toContain('是否调用由模型决定');
  expect(template).not.toContain('切换后立即生效');
});

it('setRuntimeBoolean instant-persists runtime strategy without footer save', async () => {
  const runtime = await import('@/services/runtimeStrategyService');
  const saveRuntime = vi.spyOn(runtime, 'saveRuntimeStrategySettings');
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  vi.mocked(StorageService.set).mockClear();
  saveRuntime.mockClear();

  panel.setRuntimeBoolean('deepChat.enableBusinessTools', {
    target: { checked: false },
  } as any);
  // setRuntimeBoolean fires persist without awaiting; drain microtasks
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(saveRuntime).toHaveBeenCalled();
  expect(StorageService.set).toHaveBeenCalledWith(
    'runtime_strategy_settings',
    expect.objectContaining({
      deepChat: expect.objectContaining({ enableBusinessTools: false }),
    })
  );
  // baseline refreshed so close does not treat the toggle as unsaved dirty
  expect(panel.dirtyPartitions).toEqual([]);
  expect(showToast).toHaveBeenCalledWith('已保存', { type: 'success' });
});

it('fetches models and handles validation or API failures', async () => {
  const panel = createPanel();
  panel.llm.endpoint = '';
  panel.llm.apiKey = '';

  await panel.fetchModels();
  expect(showToast).toHaveBeenCalledWith('请先输入API端点地址', { type: 'warning' });

  panel.llm.apiKey = 'key';
  await panel.fetchModels();
  expect(showToast).toHaveBeenCalledWith('请先输入API端点地址', { type: 'warning' });

  panel.llm.endpoint = 'https://gateway.example/v1';
  panel.llm.model = 'missing';
  deps.fetchModelsFromApi.mockResolvedValueOnce([
    { id: 'model-a', context: 1000, features: ['chat'] },
    { id: 'model-a', context: 1000, features: ['chat'] },
    { id: 'model-b', context: 2000, features: ['vision'] },
  ]);

  await panel.fetchModels();

  expect(fetchModelsFromApi).toHaveBeenCalledWith('new_api', panel.llm.endpoint, 'key');
  expect(panel.llm.models.map((model: { id: string }) => model.id)).toEqual(['model-a', 'model-b']);
  expect(panel.llm.model).toBe('model-a');
  expect(showToast).toHaveBeenCalledWith('成功同步 2 个模型', { type: 'success' });

  deps.fetchModelsFromApi.mockResolvedValueOnce([]);
  await panel.fetchModels();

  expect(showToast).toHaveBeenCalledWith(
    expect.stringContaining('获取模型失败: 未能获取到有效模型列表'),
    { type: 'error' }
  );
  expect(ErrorService.handle).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      action: 'fetchModels',
      module: 'settings',
    })
  );
  expect(panel.llm.isFetching).toBe(false);
});

it('uses production new_api direct gateway with a browser API key', async () => {
  deps.env.isProduction = true;
  deps.llmConfigs.set('new_api', {
    endpoint: 'https://new.hongecb.store/v1',
    model: 'gpt-5.5',
    models: ['gpt-5.5'],
  });
  deps.secureValues.set('llm_key_new_api', 'browser-key');
  const panel = createPanel();

  await panel.loadProviderConfig('new_api');

  expect(panel.llm.endpoint).toBe('https://new.hongecb.store/v1');
  expect(panel.llm.apiKey).toBe('browser-key');

  deps.fetchModelsFromApi.mockResolvedValueOnce([{ id: 'gpt-5.5', context: 1000, features: [] }]);
  await panel.fetchModels();

  expect(fetchModelsFromApi).toHaveBeenCalledWith(
    'new_api',
    'https://new.hongecb.store/v1',
    'browser-key'
  );
  expect(showToast).toHaveBeenCalledWith('成功同步 1 个模型', { type: 'success' });

  deps.callLLM.mockResolvedValueOnce('OK');
  await panel.testConnection();

  expect(callLLM).toHaveBeenCalledWith(
    [{ role: 'user', content: "Hello! Reply 'OK'." }],
    'new_api',
    'https://new.hongecb.store/v1',
    'browser-key',
    'gpt-5.5',
    expect.objectContaining({
      temperature: 0.1,
      jsonMode: false,
      maxTokens: 32,
      stream: true,
      timeout: 15000,
    })
  );

  vi.mocked(StorageService.setSecure).mockClear();
  vi.mocked(StorageService.removeSecure).mockClear();
  vi.mocked(StorageService.setLLMConfig).mockClear();
  await panel.saveProviderConfig();

  expect(StorageService.setSecure).toHaveBeenCalledWith('llm_key_new_api', 'browser-key');
  expect(StorageService.removeSecure).not.toHaveBeenCalledWith('llm_key_new_api');
  expect(StorageService.setLLMConfig).toHaveBeenCalledWith(
    'new_api',
    expect.objectContaining({
      endpoint: 'https://new.hongecb.store/v1',
      model: 'gpt-5.5',
      apiKey: '',
      enabled: true,
    })
  );
});

it('tests LLM connectivity with configured timeout', async () => {
  const panel = createPanel();

  await panel.testConnection();
  expect(showToast).toHaveBeenCalledWith('请先完善配置 (端点 + 模型)', { type: 'warning' });

  panel.llm.endpoint = 'https://gateway.example/v1';
  panel.llm.model = 'model-a';
  await panel.testConnection();
  expect(showToast).toHaveBeenCalledWith('请先完善配置 (Key + 模型)', { type: 'warning' });

  panel.llm.apiKey = 'key';
  panel.llm.model = 'model-a';
  panel.llm.endpoint = 'https://gateway.example/v1';
  deps.values.set(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS, {
    version: 1,
    llm: {
      testConnectionTimeoutMs: 22000,
      analysisTimeoutMs: 120000,
      maxRetries: 2,
    },
  });
  panel.loadRuntimeStrategy();
  deps.callLLM.mockResolvedValueOnce('OK');

  await panel.testConnection();

  expect(callLLM).toHaveBeenCalledWith(
    [{ role: 'user', content: "Hello! Reply 'OK'." }],
    'new_api',
    'https://gateway.example/v1',
    'key',
    'model-a',
    expect.objectContaining({
      temperature: 0.1,
      jsonMode: false,
      maxTokens: 32,
      stream: true,
      timeout: 22000,
    })
  );
  expect(showToast).toHaveBeenCalledWith('连接成功！', { type: 'success' });

  deps.callLLM.mockRejectedValueOnce(new Error('offline'));
  await panel.testConnection();

  expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
    action: 'testConnection',
    module: 'settings',
  });
  expect(panel.llm.isTesting).toBe(false);
});

it('loads and saves proxy configuration with per-provider key cache', async () => {
  deps.values.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
    type: 'zenrows',
    customUrl: 'zen-key',
  });
  deps.values.set(STORAGE_KEYS.PROXY_KEY_MAP, {
    scraperapi: 'scraper-key',
    zenrows: 'zen-key',
  });
  const panel = createPanel();

  await panel.loadProxyConfig();
  expect(panel.proxy).toMatchObject({
    type: 'zenrows',
    customUrl: 'zen-key',
  });

  panel.setProxyType({ target: { value: 'scraperapi' } });
  panel.setProxyCustomUrl({ target: { value: 'new-scraper-key' } });
  await panel.saveProxyConfig();

  expect(StorageService.setProxyKeyMap).toHaveBeenCalledWith(
    expect.objectContaining({
      scraperapi: 'new-scraper-key',
    })
  );
  expect(StorageService.setProxyConfigWithCredential).toHaveBeenCalledWith({
    type: 'scraperapi',
    customUrl: 'new-scraper-key',
  });
  expect(showToast).toHaveBeenCalledWith('网络配置已更新', { type: 'success' });
});

it('prefers the scraper runtime proxy key when legacy scraper settings are stale', async () => {
  deps.values.set(STORAGE_KEYS.PROXY_CONFIG, {
    type: 'scraperapi',
    customUrl: 'current-scraper-key',
  });
  deps.values.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
    type: 'zenrows',
    customUrl: 'stale-zen-key',
  });
  const panel = createPanel();

  await panel.loadProxyConfig();

  expect(panel.proxy).toMatchObject({
    type: 'scraperapi',
    customUrl: 'current-scraper-key',
  });
});

it('updates form state through DOM event setters', () => {
  const panel = createPanel();

  panel.setLlmProvider({ target: { value: 'new_api' } });
  panel.setLlmEndpoint({ target: { value: 'https://gateway.example/v1' } });
  panel.setLlmApiKey({ target: { value: 'key' } });
  panel.setLlmModel({ target: { value: 'model-a' } });
  panel.setLlmServiceTier({ target: { value: 'priority' } });

  expect(panel.llm).toMatchObject({
    provider: 'new_api',
    endpoint: 'https://gateway.example/v1',
    apiKey: 'key',
    model: 'model-a',
    serviceTier: 'priority',
  });

  panel.setLlmServiceTier({ target: { value: '' } });
  expect(panel.llm.serviceTier).toBeUndefined();
});

it('opens the dev performance monitor from panel and bridge exports', async () => {
  const panel = createPanel();

  await panel.openPerformanceMonitor();
  expect(performanceMonitor.initialize).toHaveBeenCalledTimes(1);
  expect(performanceMonitor.show).toHaveBeenCalledTimes(1);
  expect(showToast).toHaveBeenCalledWith(expect.stringContaining('监控面板已打开'), {
    type: 'success',
    duration: 5000,
  });

  deps.performanceMonitor.isInitialized.mockReturnValue(true);
  await openPerformanceMonitor();
  expect(performanceMonitor.show).toHaveBeenCalledTimes(2);
  expect(showToast).toHaveBeenCalledWith('监控面板已打开', { type: 'success' });
});

it('handles local data clear all confirmation flow', async () => {
  const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  deps.confirmWithModal.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  const panel = createPanel();

  await panel.clearAllLocalData();

  expect(deps.confirmWithModal).toHaveBeenCalledTimes(2);
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(LocalDataStore.clearAll).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetScraper).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetAnalysis).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetPromptLab).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetKeywordTracker).toHaveBeenCalledTimes(1);
  expect(deps.historyClearAsync).toHaveBeenCalledTimes(1);
  expect(deps.clearDeepChatThreadStore).toHaveBeenCalledTimes(1);
  expect(deps.keywordHistoryClearAsync).toHaveBeenCalledTimes(1);
  expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('workspace-state');
  expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetScraper.mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(LocalDataStore.clearAll).mock.invocationCallOrder[0]
  );
  expect(vi.mocked(LocalDataStore.clearBucket).mock.invocationCallOrder[0]).toBeGreaterThan(
    deps.keywordHistoryClearAsync.mock.invocationCallOrder[0]
  );
  expect(vi.mocked(LocalDataStore.getUsage).mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(LocalDataStore.clearBucket).mock.invocationCallOrder[0]
  );
  expect(showToast).toHaveBeenCalledWith('全部本地数据已清空，页面即将刷新以应用清理结果', {
    type: 'success',
  });
  expect(panel.localData.isBusy).toBe(false);
});

it('reloads the page after clearing all local data', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  const setTimeoutSpy = vi
    .spyOn(window, 'setTimeout')
    .mockImplementation(() => 1 as unknown as number);
  const panel = createPanel();

  await panel.clearAllLocalData();

  expect(showToast).toHaveBeenCalledWith('全部本地数据已清空，页面即将刷新以应用清理结果', {
    type: 'success',
  });
  expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 800);
});

it('clears persisted local data even when runtime cleanup fails', async () => {
  const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  deps.confirmWithModal.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  deps.historyClearAsync.mockRejectedValueOnce(new Error('history cleanup failed'));
  const setTimeoutSpy = vi
    .spyOn(window, 'setTimeout')
    .mockImplementation(() => 1 as unknown as number);
  const panel = createPanel();

  await panel.clearAllLocalData();

  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(LocalDataStore.clearAll).toHaveBeenCalledTimes(1);
  expect(deps.appStoreState.resetScraper.mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(LocalDataStore.clearAll).mock.invocationCallOrder[0]
  );
  expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
    action: 'syncRuntimeAfterClearAllLocalData',
    module: 'settings',
    notify: false,
  });
  expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('workspace-state');
  expect(showToast).toHaveBeenCalledWith('全部本地数据已清空，页面即将刷新以应用清理结果', {
    type: 'success',
  });
  expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 800);
});

it('clears selected local data buckets through runtime-aware cleanup', async () => {
  const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const panel = createPanel();

  await panel.clearLocalDataBucket('keyword-history');

  expect(deps.confirmWithModal).toHaveBeenCalledTimes(1);
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('keyword-history');
  expect(deps.keywordHistoryClearAsync).toHaveBeenCalledTimes(1);
  expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
  expect(panel.localData.isBusy).toBe(false);
  expect(panel.localData.clearingBucketId).toBeNull();
});

it('warns before exporting sensitive local data backups', async () => {
  const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const confirm = vi.fn();
  deps.confirmWithModal.mockImplementationOnce((_title: string, content: string) => {
    confirm(content);
    return Promise.resolve(false);
  });
  const panel = createPanel();

  await panel.exportLocalData();

  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('敏感本地数据'));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('不是服务端密钥托管'));
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(LocalDataStore.exportAll).not.toHaveBeenCalled();
  expect(panel.localData.isBusy).toBe(false);
});

async function runImportFilePicker(panel: TestPanel, backup: unknown): Promise<void> {
  const file = { text: vi.fn(async () => JSON.stringify(backup)) };
  const input = document.createElement('input');
  const createElement = document.createElement.bind(document);
  let changeHandler: ((event: Event) => void | Promise<void>) | null = null;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  vi.spyOn(input, 'click').mockImplementation(() => undefined);
  vi.spyOn(input, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'change' && typeof listener === 'function') {
        changeHandler = listener as (event: Event) => void | Promise<void>;
      }
    }
  );
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
    tagName === 'input' ? input : createElement(tagName)
  );

  await panel.importLocalData();
  expect(changeHandler).toBeTypeOf('function');
  await changeHandler?.(new Event('change'));
  await Promise.resolve();
}

it('imports local data in replace mode via explicit full-restore choice', async () => {
  const panel = createPanel();
  const backup = {
    version: 1,
    exportedAt: '2026-07-20T00:00:00.000Z',
    localStorage: {
      secure_llm_key_new_api: JSON.stringify({ encrypted: true }),
    },
    indexedDB: [],
    metadata: { app: 'sops', storageVersion: 'local-data-v1' },
  };
  const nativeConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  deps.chooseWithModal.mockResolvedValueOnce('primary');
  const setTimeoutSpy = vi
    .spyOn(window, 'setTimeout')
    .mockImplementation(() => 1 as unknown as number);

  await runImportFilePicker(panel, backup);

  expect(deps.chooseWithModal).toHaveBeenCalledWith(
    expect.objectContaining({
      title: '导入本地数据',
      primaryLabel: '完整恢复',
      secondaryLabel: '合并导入',
      cancelLabel: '取消',
      primaryIsDestructive: true,
      content: expect.stringContaining('包含密钥/凭据：是'),
    })
  );
  expect(deps.confirmWithModal).not.toHaveBeenCalled();
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(LocalDataStore.importAll).toHaveBeenCalledWith(backup, { mode: 'replace' });
  expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
  expect(showToast).toHaveBeenCalledWith('本地数据已导入，页面即将刷新以应用恢复结果', {
    type: 'success',
  });
  expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 800);
  expect(panel.localData.isBusy).toBe(false);
});

it('imports local data in merge mode via explicit merge choice', async () => {
  const panel = createPanel();
  const backup = {
    version: 1,
    exportedAt: '2026-07-20T00:00:00.000Z',
    localStorage: {
      app_theme: JSON.stringify('dark'),
    },
    indexedDB: [],
    metadata: { app: 'sops', storageVersion: 'local-data-v1' },
  };
  deps.chooseWithModal.mockResolvedValueOnce('secondary');
  vi.spyOn(window, 'setTimeout').mockImplementation(() => 1 as unknown as number);

  await runImportFilePicker(panel, backup);

  expect(LocalDataStore.importAll).toHaveBeenCalledWith(backup, { mode: 'merge' });
  expect(showToast).toHaveBeenCalledWith('本地数据已导入，页面即将刷新以应用恢复结果', {
    type: 'success',
  });
});

it('does not import when the user cancels the import choice dialog', async () => {
  const panel = createPanel();
  const backup = {
    version: 1,
    exportedAt: '2026-07-20T00:00:00.000Z',
    localStorage: {},
    indexedDB: [],
    metadata: { app: 'sops', storageVersion: 'local-data-v1' },
  };
  deps.chooseWithModal.mockResolvedValueOnce('cancel');

  await runImportFilePicker(panel, backup);

  expect(LocalDataStore.importAll).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalledWith(expect.stringContaining('已导入'), expect.anything());
  expect(panel.localData.isBusy).toBe(false);
});

async function runImportRawFilePicker(panel: TestPanel, text: string): Promise<void> {
  const file = { text: vi.fn(async () => text) };
  const input = document.createElement('input');
  const createElement = document.createElement.bind(document);
  let changeHandler: ((event: Event) => void | Promise<void>) | null = null;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  vi.spyOn(input, 'click').mockImplementation(() => undefined);
  vi.spyOn(input, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'change' && typeof listener === 'function') {
        changeHandler = listener as (event: Event) => void | Promise<void>;
      }
    }
  );
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
    tagName === 'input' ? input : createElement(tagName)
  );

  await panel.importLocalData();
  expect(changeHandler).toBeTypeOf('function');
  await changeHandler?.(new Event('change'));
  await Promise.resolve();
}

it('UT-P2-02 does not call importAll for invalid JSON or missing version', async () => {
  const panel = createPanel();

  await runImportRawFilePicker(panel, '{not-valid-json');
  expect(LocalDataStore.importAll).not.toHaveBeenCalled();
  expect(deps.errorHandle).toHaveBeenCalled();
  expect(deps.chooseWithModal).not.toHaveBeenCalled();

  deps.errorHandle.mockClear();
  deps.chooseWithModal.mockClear();
  deps.localData.importAll.mockClear();

  await runImportRawFilePicker(
    panel,
    JSON.stringify({
      exportedAt: '2026-07-20T00:00:00.000Z',
      localStorage: {},
      indexedDB: [],
      metadata: { app: 'sops', storageVersion: 'local-data-v1' },
    })
  );
  expect(LocalDataStore.importAll).not.toHaveBeenCalled();
  expect(deps.errorHandle).toHaveBeenCalled();
  expect(deps.chooseWithModal).not.toHaveBeenCalled();
  expect(panel.localData.isBusy).toBe(false);
});

it('UT-P2-01 panel partial export passes selected buckets to exportAll', async () => {
  const panel = createPanel();
  panel.settingsDensity = 'advanced';
  panel.localData.selectedExportBuckets = ['cache'];
  deps.confirmWithModal.mockResolvedValueOnce(true);
  deps.localData.exportAll.mockResolvedValueOnce({
    version: 1,
    schemaVersion: 1,
    buckets: ['cache'],
    exportedAt: '2026-07-20T00:00:00.000Z',
    localStorage: {},
    indexedDB: [],
    metadata: { app: 'sops', storageVersion: 'local-data-v1' },
  });

  const createElement = document.createElement.bind(document);
  const link = document.createElement('a');
  vi.spyOn(link, 'click').mockImplementation(() => undefined);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
    tagName === 'a' ? link : createElement(tagName)
  );
  const createObjectURL = vi.fn(() => 'blob:export');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

  await panel.exportLocalData();

  expect(LocalDataStore.exportAll).toHaveBeenCalledWith({ buckets: ['cache'] });
  expect(panel.exportLocalDataButtonText).toBe('导出选中分类');
  expect(panel.isPartialLocalDataExport).toBe(true);
});

it('updates model status safely for configured, pending, and missing DOM states', async () => {
  document.body.innerHTML = '<div id="model-status"></div>';
  deps.values.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, 'new_api');
  deps.llmConfigs.set('new_api', {
    model: '<model>',
    apiKey: '',
  });
  deps.secureValues.set('llm_key_new_api', 'key');

  await updateModelStatus();

  expect(document.getElementById('model-status')?.innerHTML).toContain('status-success');
  expect(document.getElementById('model-status')?.innerHTML).toContain('&lt;model&gt;');

  deps.values.clear();
  await updateModelStatus();
  expect(document.getElementById('model-status')?.innerHTML).toContain('status-pending');

  document.body.innerHTML = '';
  await expect(updateModelStatus()).resolves.toBeUndefined();
});

it('emits settings bridge events through EventBus', () => {
  const open = vi.fn();
  const close = vi.fn();
  const unsubscribeOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, open);
  const unsubscribeClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, close);

  openSettings();
  closeSettings();
  fetchModels();

  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0][0]).toMatchObject({ timestamp: expect.any(Number) });
  expect(close).toHaveBeenCalledTimes(1);
  expect(close.mock.calls[0][0]).toMatchObject({
    saved: false,
    timestamp: expect.any(Number),
  });

  unsubscribeOpen();
  unsubscribeClose();
});

it('openSettings forwards deep-link options on SETTINGS_OPEN', () => {
  const open = vi.fn();
  const unsub = eventBus.on(APP_EVENTS.SETTINGS_OPEN, open);

  openSettings({
    sectionId: 'settings-section-tool-strategy',
    focus: 'master-analysis',
  });

  expect(open).toHaveBeenCalledWith(
    expect.objectContaining({
      sectionId: 'settings-section-tool-strategy',
      focus: 'master-analysis',
    })
  );
  unsub();
});

it('panel open with options scrolls to sectionId', async () => {
  const panel = createPanel();
  const scroll = vi.spyOn(panel, 'scrollToSection');

  await panel.open({
    sectionId: 'settings-section-performance',
    focus: 'unused-focus-id',
  });
  await Promise.resolve();

  expect(panel.isOpen).toBe(true);
  expect(scroll).toHaveBeenCalledWith('settings-section-performance');
});

it('scrolls settings sections without changing the URL hash', () => {
  const panel = createPanel();
  const scroller = document.createElement('div');
  scroller.className = 'settings-panel-scroll';
  Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true });
  scroller.getBoundingClientRect = () =>
    ({ top: 0, bottom: 400, left: 0, right: 300, width: 300, height: 400 }) as DOMRect;
  const scrollTo = vi.fn();
  scroller.scrollTo = scrollTo as typeof scroller.scrollTo;

  const section = document.createElement('section');
  section.id = 'settings-section-network';
  section.getBoundingClientRect = () =>
    ({ top: 120, bottom: 200, left: 0, right: 300, width: 300, height: 80 }) as DOMRect;
  scroller.append(section);

  window.location.hash = '#/more';
  document.body.append(scroller);

  panel.scrollToSection('settings-section-network');

  expect(scrollTo).toHaveBeenCalledWith({ top: 112, behavior: 'smooth' });
  expect(window.location.hash).toBe('#/more');
  window.location.hash = '';
  scroller.remove();
});

it('CT-P1-00 settings css defines surface token mapping', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.css'),
    'utf8'
  );
  expect(css).toMatch(/--settings-surface/);
  expect(css).toMatch(/--settings-accent/);
});

it('keeps the real settings template optimized for PC category scanning', () => {
  const template = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  const styles = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.css'),
    'utf8'
  );

  expect(template).toContain('max-w-[min(860px,calc(100vw-48px))]');
  expect(template).toContain('aria-label="系统设置分类"');
  expect(template).not.toContain('href="#settings-section-');
  // Hierarchical side nav: primary toggles + secondary targets
  expect(template).toContain("toggleNavGroup('llm', 'settings-section-llm')");
  expect(template).toContain("toggleNavGroup('tool', 'settings-section-tool-strategy')");
  expect(template).toContain("toggleNavGroup('data', 'settings-section-data')");
  expect(template).toContain("navigateToNavTarget('llm-step-1-title', 'llm')");
  expect(template).toContain("navigateToNavTarget('master-analysis-scrape', 'tool')");
  expect(template).toContain('settings-panel-nav-link--secondary');
  expect(template).toContain('id="settings-section-llm"');
  expect(template).toContain('id="settings-section-tool-strategy"');
  // network id kept for deep-link, nested under Master Analysis 数据采集
  expect(template).toContain('id="settings-section-network"');
  expect(template).toContain('id="settings-section-data"');
  expect(template).toContain('id="settings-section-performance"');
  expect(template).not.toContain('aria-controls="settings-section-network"');
  expect(template).toContain('AI 模型与连接');
  expect(template).toContain('工具策略');
  expect(template).toContain('通用 AI 执行策略');
  expect(template).not.toContain('应用中心');
  expect(template).toContain('toolStrategyTargetItemsByIds');
  expect(template).not.toContain('<template x-for="item in toolStrategyTargetItems"');
  expect(template).toContain('setToolTargetModel(item.id, $event)');
  expect(template).toContain("toolStrategyTargetItemsByIds(['master-analysis-ai-analysis'])");
  expect(template).toContain("toolStrategyTargetItemsByIds(['playground-deep-chat'])");
  expect(template).toContain("toolStrategyTargetItemsByIds(['keyword-hunter-seo-process'])");
  expect(template).toContain("toolStrategyTargetItemsByIds(['keyword-hunter-listing-review'])");
  expect(template).toContain("toolStrategyTargetItemsByIds(['ppc-tools-ppc-search-terms'])");
  // Tool strategy titles are appearance-like pref folds
  expect(template).toContain('data-testid="settings-tool-pref-list"');
  expect((template.match(/class="settings-pref-fold"/g) || []).length).toBeGreaterThanOrEqual(5);
  expect(template).not.toContain('settings-tool-app');
  expect(template).toContain('settings-tool-l3');
  expect(template).toContain('settings-section-tip');
  expect(template).not.toContain('class="settings-coach"');
  // Content order (exclude side-nav secondary labels which may mention the same names)
  const sectionsChunk = template.slice(template.indexOf('settings-panel-sections'));
  expect(sectionsChunk.indexOf('通用 AI 执行策略')).toBeLessThan(sectionsChunk.indexOf('Master Analysis'));
  expect(sectionsChunk.indexOf('Master Analysis')).toBeLessThan(
    sectionsChunk.indexOf('Playground')
  );
  expect(sectionsChunk.indexOf('Playground')).toBeLessThan(sectionsChunk.indexOf('Keyword Hunter'));
  expect(sectionsChunk.indexOf('Keyword Hunter')).toBeLessThan(sectionsChunk.indexOf('PPC Tools'));
  // 采集代理并入 Master Analysis → 数据采集
  expect(template).toContain('数据采集');
  expect(template).toContain('采集运行策略');
  expect(template).toContain('id="settings-section-network"');
  // Tool strategy uses pref-fold rows; collapsible chrome may remain elsewhere
  expect(template).toContain('settings-pref-row--fold');
  expect(template).toContain('settings-pref-fold__chevron');
  // LLM connection section uses the same pref-fold language as tool strategy
  expect(template).toContain('data-testid="settings-llm-pref-list"');
  expect(template).toContain('id="llm-step-1-title"');
  expect(template).toContain('id="llm-step-2-title"');
  expect(template).toContain('id="llm-step-3-title"');
  expect(template).toContain('id="llm-step-4-title"');
  expect(template).toContain('>服务层级<');
  expect(template).toContain('settings-data-pref-list');
  expect(template).toContain('settings-pref-fold');
  expect(template).toContain('data-testid="settings-export-buckets"');
  expect(template).not.toContain('settings-data-panel');
  expect(template).not.toContain('settings-expand-bar');
  expect(template).toContain('data-settings-focus="general-ai-runtime"');
  expect(template).toContain('数据与备份');
  expect(template).toContain('数据保留策略');
  expect(template).toContain('开发者诊断');
  expect(template).toContain(':hidden="!showDeveloperDiagnostics"');
  expect(template).toContain("setDeveloperDiagnosticBoolean('eventDebugEnabled', $event)");
  expect(template).toContain('setDeveloperDiagnosticLogLevel($event)');
  expect(template).toContain('developerDangerousEndpointText');
  expect(template).toContain('这是当前环境的只读安全提示，不属于调试开关。');
  expect(template).not.toContain('diagnosticStatusItems');
  expect(template).toContain('危险操作');
  expect(template).toContain('清空全部本地数据');
  expect(template).toContain(':aria-label="fetchModelsText"');
  expect(template).toContain(':aria-label="testConnectionText"');
  expect(template).toContain('id="llm-service-tier"');
  expect(template).toContain('<option value="">不发送（默认）</option>');

  const buttonOpenings = template.match(/<button\b[^>]*>/g) ?? [];
  const implicitButtons = buttonOpenings.filter(
    button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
  );
  expect(implicitButtons).toEqual([]);

  expect(styles).toContain('@media (min-width: 1024px)');
  expect(styles).toContain('grid-template-columns: 172px minmax(0, 1fr)');
  expect(styles).toContain('flex-direction: column');
});

it('saveProviderConfig persists five-tier reasoningPrefs', async () => {
  const panel = createPanel();
  panel.llm.provider = 'new_api';
  panel.llm.endpoint = 'https://new.hongecb.store/v1';
  panel.llm.apiKey = 'key';
  panel.llm.model = 'model-a';
  panel.setReasoningEnabled({ target: { checked: true } } as unknown as Event);
  panel.setReasoningEffortLevel('xhigh');

  await panel.saveProviderConfig();

  expect(StorageService.setLLMConfig).toHaveBeenCalledWith(
    'new_api',
    expect.objectContaining({
      reasoningPrefs: { enabled: true, effort: 'xhigh' },
    })
  );
});

it('AC3: fetchModels auto-switch clamps effort to new model allowlist', async () => {
  const panel = createPanel();
  panel.llm.provider = 'new_api';
  panel.llm.endpoint = 'https://gateway.example/v1';
  panel.llm.apiKey = 'key';
  panel.llm.model = 'missing-model';
  panel.llm.reasoningPrefs = { enabled: true, effort: 'max' };
  vi.mocked(StorageService.setLLMConfig).mockClear();
  deps.showToast.mockClear();

  deps.fetchModelsFromApi.mockResolvedValueOnce([
    { id: 'grok-4.5', context: 256000, features: ['reasoning'] },
  ]);
  await panel.fetchModels();
  // silent autoSave is fire-and-forget; flush microtasks
  await Promise.resolve();
  await Promise.resolve();

  expect(panel.llm.model).toBe('grok-4.5');
  expect(panel.llm.reasoningPrefs.effort).toBe('high');
  expect(panel.reasoningEffortOptions).toEqual(['low', 'medium', 'high']);
  expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/推理等级已从 max 调整为 high/), {
    type: 'info',
  });
  // Demotion persisted so orphan max is not left for a later save
  expect(StorageService.setLLMConfig).toHaveBeenCalledWith(
    'new_api',
    expect.objectContaining({
      model: 'grok-4.5',
      reasoningPrefs: expect.objectContaining({ effort: 'high' }),
    })
  );
});

it('AC3: loadProviderConfig demotion toasts once and persists high', async () => {
  deps.llmConfigs.set('new_api', {
    endpoint: 'https://gateway.example/v1',
    model: 'grok-4.5',
    models: ['grok-4.5'],
    reasoningPrefs: { enabled: true, effort: 'max' },
  });
  deps.secureValues.set('llm_key_new_api', 'key');

  const panel = createPanel();
  vi.mocked(StorageService.setLLMConfig).mockClear();
  deps.showToast.mockClear();
  await panel.loadProviderConfig('new_api');
  await Promise.resolve();
  await Promise.resolve();

  expect(panel.llm.model).toBe('grok-4.5');
  expect(panel.llm.reasoningPrefs.effort).toBe('high');
  expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/推理等级已从 max 调整为 high/), {
    type: 'info',
  });
  expect(StorageService.setLLMConfig).toHaveBeenCalledWith(
    'new_api',
    expect.objectContaining({
      model: 'grok-4.5',
      reasoningPrefs: expect.objectContaining({ effort: 'high' }),
    })
  );

  // Second load: storage already high → no demotion toast again
  deps.showToast.mockClear();
  await panel.loadProviderConfig('new_api');
  expect(panel.llm.reasoningPrefs.effort).toBe('high');
  expect(showToast).not.toHaveBeenCalledWith(
    expect.stringMatching(/推理等级已从/),
    expect.anything()
  );
});

it('UT-P0-01 saveProviderConfig does not persist runtime strategy', async () => {
  const runtime = await import('@/services/runtimeStrategyService');
  const saveRuntime = vi.spyOn(runtime, 'saveRuntimeStrategySettings');
  const panel = createPanel();
  panel.llm.provider = 'new_api';
  panel.llm.apiKey = 'sk-test';
  panel.llm.endpoint = 'https://example.com/v1';
  panel.llm.model = 'model-a';
  vi.mocked(StorageService.set).mockClear();

  await panel.saveProviderConfig();

  expect(saveRuntime).not.toHaveBeenCalled();
  expect(
    vi.mocked(StorageService.set).mock.calls.some(([key]) => key === 'runtime_strategy_settings')
  ).toBe(false);
  expect(StorageService.setLLMConfig).toHaveBeenCalled();
});

it('UT-P0-02 saveToolStrategy persists tool strategy and runtime', async () => {
  const runtime = await import('@/services/runtimeStrategyService');
  const saveRuntime = vi.spyOn(runtime, 'saveRuntimeStrategySettings');
  const panel = createPanel();
  panel.llm.provider = 'new_api';
  panel.toolStrategy.targetModels['master-analysis-ai-analysis'] = 'quality-model';
  panel.runtimeStrategy.settings.llm.maxRetries = 4;
  vi.mocked(StorageService.set).mockClear();

  await panel.saveToolStrategy();

  // setToolTargetDefaultModel → saveToolStrategySettings (same-module; assert via storage key)
  expect(StorageService.set).toHaveBeenCalledWith(
    'tool_strategy_settings',
    expect.objectContaining({
      version: 2,
      targets: expect.objectContaining({
        'master-analysis-ai-analysis': {
          defaultModelsByProvider: {
            new_api: 'quality-model',
          },
        },
      }),
    })
  );
  expect(saveRuntime).toHaveBeenCalled();
  expect(StorageService.set).toHaveBeenCalledWith(
    'runtime_strategy_settings',
    expect.objectContaining({
      llm: expect.objectContaining({ maxRetries: 4 }),
    })
  );
});

it('UT-P0-03 saveProxyConfig only updates proxy (not tool strategy or LLM keys)', async () => {
  const panel = createPanel();
  panel.proxy.type = 'scraperapi';
  panel.proxy.customUrl = 'proxy-key';
  vi.mocked(StorageService.set).mockClear();
  vi.mocked(StorageService.setSecure).mockClear();
  vi.mocked(StorageService.setLLMConfig).mockClear();

  await panel.saveProxyConfig();

  expect(StorageService.setProxyConfigWithCredential).toHaveBeenCalledWith({
    type: 'scraperapi',
    customUrl: 'proxy-key',
  });
  expect(StorageService.setProxyKeyMap).toHaveBeenCalled();
  expect(
    vi.mocked(StorageService.set).mock.calls.some(([key]) => key === 'tool_strategy_settings')
  ).toBe(false);
  expect(
    vi.mocked(StorageService.set).mock.calls.some(([key]) => key === 'runtime_strategy_settings')
  ).toBe(false);
  expect(StorageService.setLLMConfig).not.toHaveBeenCalled();
  expect(
    vi
      .mocked(StorageService.setSecure)
      .mock.calls.some(([key]) => String(key).startsWith('llm_key_'))
  ).toBe(false);
});

it('UT-P0-10 proxy test failure sets error without closing panel', async () => {
  const panel = createPanel();
  panel.isOpen = true;
  panel.proxy.type = 'scraperapi';
  panel.proxy.customUrl = 'test-key';
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('proxy offline')));

  await panel.testProxyConnection();

  expect(panel.isOpen).toBe(true);
  expect(panel.proxy.testError || panel.proxy.status).toBeTruthy();
  expect(panel.proxy.testError).toBe('proxy offline');
  expect(panel.proxy.status).toBe('error');
  expect(panel.proxy.isTesting).toBe(false);
});

it('UT-P0-10b proxy test success clears error state without closing panel', async () => {
  const panel = createPanel();
  panel.isOpen = true;
  panel.proxy.type = 'scraperapi';
  panel.proxy.customUrl = 'test-key';
  panel.proxy.testError = 'stale';
  panel.proxy.status = 'error';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, status: 200 } as Response));

  await panel.testProxyConnection();

  expect(panel.isOpen).toBe(true);
  expect(panel.proxy.testError).toBe('');
  expect(panel.proxy.status).toBe('ok');
  expect(panel.proxy.testMessage).toContain('成功');
});

it('CT-P0-05 network section exposes proxy test entry', () => {
  const template = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  expect(template).toContain('data-testid="settings-test-proxy"');
  expect(template).toContain('testProxyConnection()');
});

it('CT-P0-01 tool strategy save copy mentions runtime strategy', () => {
  const template = readFileSync(
    resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
    'utf8'
  );
  expect(template).toMatch(/运行时策略|运行策略|采集运行策略/);
  expect(template).toContain('settings-save-tool-strategy');
  expect(template).toContain('含采集运行策略');
  expect(template).not.toContain('保存采集策略');
});

it('UT-P0-09 open with invalid runtime normalizes and sets healthMessages', async () => {
  deps.values.set(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS, 'not-an-object');
  const panel = createPanel();
  await expect(panel.open()).resolves.toBeUndefined();
  expect(panel.runtimeStrategy.settings.llm).toBeDefined();
  expect(panel.runtimeStrategy.settings.scraper.maxConcurrent).toBeTypeOf('number');
  expect(panel.healthMessages.length).toBeGreaterThan(0);
  expect(panel.healthMessages.some((m: string) => m.includes('安全默认'))).toBe(true);
});

it('UT-P0-06 close confirms when runtime dirty and stays open on cancel', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(false);
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.close();
  expect(deps.confirmWithModal).toHaveBeenCalled();
  expect(panel.isOpen).toBe(true);
});

it('UT-P0-06b close discards when confirmed', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(true);
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.close();
  expect(panel.isOpen).toBe(false);
});

it('UT-P0-06c close without dirty skips confirm', async () => {
  deps.confirmWithModal.mockClear();
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  await panel.close();
  expect(deps.confirmWithModal).not.toHaveBeenCalled();
  expect(panel.isOpen).toBe(false);
});

it('UT-P0-06d dirty then saveRuntimeStrategy then close does not confirm', async () => {
  deps.confirmWithModal.mockClear();
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.saveRuntimeStrategy();
  await panel.close();
  expect(deps.confirmWithModal).not.toHaveBeenCalled();
  expect(panel.isOpen).toBe(false);
});

it('UT-P0-06e second close after discard does not re-prompt', async () => {
  deps.confirmWithModal.mockResolvedValueOnce(true);
  const panel = createPanel();
  await panel.open();
  panel.captureSettingsBaseline();
  panel.runtimeStrategy.settings.llm.maxRetries = 9;
  await panel.close();
  expect(panel.isOpen).toBe(false);
  deps.confirmWithModal.mockClear();
  await panel.close();
  expect(deps.confirmWithModal).not.toHaveBeenCalled();
});
