import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeSettings,
  fetchModels,
  initAlpineSettings,
  openPerformanceMonitor,
  openSettings,
  updateModelStatus,
} from '@/components/settings/systemSettings';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@common/EventBus';
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
  const env = { isProduction: false };

  return {
    values,
    secureValues,
    llmConfigs,
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
    clearPlaygroundThreadStore: vi.fn(),
    keywordHistoryClearAsync: vi.fn(),
    performanceMonitor: {
      isInitialized: vi.fn(),
      initialize: vi.fn(),
      show: vi.fn(),
    },
    configGet: vi.fn(),
  };
});

vi.mock('@/services/storageService', () => {
  const keys = {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
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
      get: vi.fn((key: string, fallback?: unknown) => (
        deps.values.has(key) ? deps.values.get(key) : fallback ?? null
      )),
      set: vi.fn((key: string, value: unknown) => {
        deps.values.set(key, value);
      }),
      getSecure: vi.fn(async (key: string, fallback = '') => (
        deps.secureValues.has(key) ? deps.secureValues.get(key) : fallback
      )),
      setSecure: vi.fn(async (key: string, value: string) => {
        deps.secureValues.set(key, value);
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

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: deps.errorHandle,
  },
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: deps.localData,
}));

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
  clearPlaygroundThreadStore: deps.clearPlaygroundThreadStore,
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
  },
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
  deps.clearPlaygroundThreadStore.mockReset().mockResolvedValue(undefined);
  deps.keywordHistoryClearAsync.mockReset().mockResolvedValue(undefined);
  deps.performanceMonitor.isInitialized.mockReset().mockReturnValue(false);
  deps.performanceMonitor.initialize.mockReset();
  deps.performanceMonitor.show.mockReset();
  deps.configGet.mockReset().mockReturnValue(15000);
  document.body.innerHTML = '';
  delete (window as unknown as { Alpine?: unknown }).Alpine;
});

describe('system settings current behavior', () => {
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

    panel.toggleLlmKeyVisibility();
    panel.toggleProxyKeyVisibility();
    expect(panel.llmApiKeyInputType).toBe('text');
    expect(panel.proxyInputType).toBe('text');
    expect(panel.activeFeatureBadges).toEqual([
      { key: 'basic', label: '基础能力', icon: 'fa-message' },
    ]);
  });

  it('loads and saves LLM provider configuration', async () => {
    vi.useFakeTimers();
    deps.llmConfigs.set('new_api', {
      endpoint: '/v1',
      model: 'custom-model',
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

    panel.llm.apiKey = '';
    await panel.saveProviderConfig();
    expect(showToast).toHaveBeenCalledWith('请填写 API Key', { type: 'warning' });

    panel.llm.apiKey = 'new-key';
    panel.llm.model = 'custom-model';
    panel.isOpen = true;
    await panel.saveProviderConfig();
    await vi.advanceTimersByTimeAsync(500);

    expect(StorageService.setSecure).toHaveBeenCalledWith('llm_key_new_api', 'new-key');
    expect(StorageService.setLLMConfig).toHaveBeenCalledWith('new_api', expect.objectContaining({
      endpoint: 'https://new.hongecb.store/v1',
      model: 'custom-model',
      apiKey: '',
      enabled: true,
    }));
    expect(panel.isOpen).toBe(false);
  });

  it('fetches models and handles validation or API failures', async () => {
    const panel = createPanel();
    panel.llm.endpoint = '';
    panel.llm.apiKey = '';

    await panel.fetchModels();
    expect(showToast).toHaveBeenCalledWith('请先输入 API Key', { type: 'warning' });

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
    expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
      action: 'fetchModels',
      module: 'settings',
    });
    expect(panel.llm.isFetching).toBe(false);
  });

  it('tests LLM connectivity with configured timeout', async () => {
    const panel = createPanel();

    await panel.testConnection();
    expect(showToast).toHaveBeenCalledWith('请先完善配置 (Key + 模型)', { type: 'warning' });

    panel.llm.apiKey = 'key';
    panel.llm.model = 'model-a';
    panel.llm.endpoint = 'https://gateway.example/v1';
    deps.callLLM.mockResolvedValueOnce('OK');

    await panel.testConnection();

    expect(callLLM).toHaveBeenCalledWith(
      [{ role: 'user', content: "Hello! Reply 'OK'." }],
      'new_api',
      'https://gateway.example/v1',
      'key',
      'model-a',
      { temperature: 0.1, jsonMode: false, timeout: 15000 }
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

  it('loads and saves proxy configuration with per-provider key cache', () => {
    deps.values.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
      type: 'zenrows',
      customUrl: 'zen-key',
    });
    deps.values.set(STORAGE_KEYS.PROXY_KEY_MAP, {
      scraperapi: 'scraper-key',
      zenrows: 'zen-key',
    });
    const panel = createPanel();

    panel.loadProxyConfig();
    expect(panel.proxy).toMatchObject({
      type: 'zenrows',
      customUrl: 'zen-key',
    });

    panel.setProxyType({ target: { value: 'scraperapi' } });
    panel.setProxyCustomUrl({ target: { value: 'new-scraper-key' } });
    panel.saveProxyConfig();

    expect(StorageService.set).toHaveBeenCalledWith(STORAGE_KEYS.PROXY_KEY_MAP, expect.objectContaining({
      scraperapi: 'new-scraper-key',
    }));
    expect(StorageService.set).toHaveBeenCalledWith(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
      type: 'scraperapi',
      customUrl: 'new-scraper-key',
    });
    expect(StorageService.set).toHaveBeenCalledWith(STORAGE_KEYS.PROXY_CONFIG, {
      type: 'scraperapi',
      customUrl: 'new-scraper-key',
    });
    expect(showToast).toHaveBeenCalledWith('网络配置已更新', { type: 'success' });
  });

  it('prefers the scraper runtime proxy key when legacy scraper settings are stale', () => {
    deps.values.set(STORAGE_KEYS.PROXY_CONFIG, {
      type: 'scraperapi',
      customUrl: 'current-scraper-key',
    });
    deps.values.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
      type: 'zenrows',
      customUrl: 'stale-zen-key',
    });
    const panel = createPanel();

    panel.loadProxyConfig();

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

    expect(panel.llm).toMatchObject({
      provider: 'new_api',
      endpoint: 'https://gateway.example/v1',
      apiKey: 'key',
      model: 'model-a',
    });
  });

  it('opens the dev performance monitor from panel and bridge exports', async () => {
    const panel = createPanel();

    await panel.openPerformanceMonitor();
    expect(performanceMonitor.initialize).toHaveBeenCalledTimes(1);
    expect(performanceMonitor.show).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('监控面板已打开'),
      { type: 'success', duration: 5000 }
    );

    deps.performanceMonitor.isInitialized.mockReturnValue(true);
    await openPerformanceMonitor();
    expect(performanceMonitor.show).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledWith('监控面板已打开', { type: 'success' });
  });

  it('handles local data clear all confirmation flow', async () => {
    const confirm = vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    const panel = createPanel();

    await panel.clearAllLocalData();

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(LocalDataStore.clearAll).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetScraper).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetAnalysis).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetPromptLab).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetKeywordTracker).toHaveBeenCalledTimes(1);
    expect(deps.historyClearAsync).toHaveBeenCalledTimes(1);
    expect(deps.clearPlaygroundThreadStore).toHaveBeenCalledTimes(1);
    expect(deps.keywordHistoryClearAsync).toHaveBeenCalledTimes(1);
    expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('workspace-state');
    expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetScraper.mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(LocalDataStore.clearAll).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(LocalDataStore.clearBucket).mock.invocationCallOrder[0]).toBeGreaterThan(
      deps.keywordHistoryClearAsync.mock.invocationCallOrder[0],
    );
    expect(vi.mocked(LocalDataStore.getUsage).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(LocalDataStore.clearBucket).mock.invocationCallOrder[0],
    );
    expect(showToast).toHaveBeenCalledWith(
      '全部本地数据已清空，请刷新页面重新初始化',
      { type: 'success' }
    );
    expect(panel.localData.isBusy).toBe(false);
  });

  it('clears persisted local data even when runtime cleanup fails', async () => {
    vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    deps.historyClearAsync.mockRejectedValueOnce(new Error('history cleanup failed'));
    const panel = createPanel();

    await panel.clearAllLocalData();

    expect(LocalDataStore.clearAll).toHaveBeenCalledTimes(1);
    expect(deps.appStoreState.resetScraper.mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(LocalDataStore.clearAll).mock.invocationCallOrder[0],
    );
    expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
      action: 'syncRuntimeAfterClearAllLocalData',
      module: 'settings',
      notify: false,
    });
    expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('workspace-state');
    expect(showToast).toHaveBeenCalledWith(
      '全部本地数据已清空，请刷新页面重新初始化',
      { type: 'success' }
    );
  });

  it('clears selected local data buckets through runtime-aware cleanup', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const panel = createPanel();

    await panel.clearLocalDataBucket('keyword-history');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(LocalDataStore.clearBucket).toHaveBeenCalledWith('keyword-history');
    expect(deps.keywordHistoryClearAsync).toHaveBeenCalledTimes(1);
    expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
    expect(panel.localData.isBusy).toBe(false);
    expect(panel.localData.clearingBucketId).toBeNull();
  });

  it('warns before exporting sensitive local data backups', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const panel = createPanel();

    await panel.exportLocalData();

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('敏感本地数据'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('不是服务端密钥托管'));
    expect(LocalDataStore.exportAll).not.toHaveBeenCalled();
    expect(panel.localData.isBusy).toBe(false);
  });

  it('imports local data in replace mode and schedules a reload', async () => {
    const panel = createPanel();
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      localStorage: {},
      indexedDB: [],
      metadata: { app: 'sops', storageVersion: 'local-data-v1' },
    };
    const file = { text: vi.fn(async () => JSON.stringify(backup)) };
    const input = document.createElement('input');
    const createElement = document.createElement.bind(document);
    let changeHandler: ((event: Event) => void | Promise<void>) | null = null;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    vi.spyOn(input, 'click').mockImplementation(() => undefined);
    vi.spyOn(input, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'change' && typeof listener === 'function') {
        changeHandler = listener as (event: Event) => void | Promise<void>;
      }
    });
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => (
      tagName === 'input' ? input : createElement(tagName)
    ));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(() => 1);

    await panel.importLocalData();
    expect(changeHandler).toBeTypeOf('function');
    await changeHandler?.(new Event('change'));
    await Promise.resolve();

    expect(LocalDataStore.importAll).toHaveBeenCalledWith(backup, { mode: 'replace' });
    expect(LocalDataStore.getUsage).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      '本地数据已导入，页面即将刷新以应用恢复结果',
      { type: 'success' }
    );
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 800);
    expect(panel.localData.isBusy).toBe(false);
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
    expect(close).toHaveBeenCalledTimes(1);

    unsubscribeOpen();
    unsubscribeClose();
  });
});
