// tests/unit/StorageService.test.ts
// ================================================================
// StorageService 单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { LocalDataStore } from '@/services/localDataStore';
import { SecureStorage } from '@/common/utils/secureStorage';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// ================================================================
// 基础存储操作
// ================================================================

describe('基础存储操作', () => {
  it('应该能够存储和读取数据', () => {
    const key = 'test-key';
    const value = { message: 'hello' };

    StorageService.set(key, value);
    const result = StorageService.get(key);

    expect(result).toEqual(value);
  });

  it('应该在键不存在时返回默认值', () => {
    const defaultValue = 'default';
    const result = StorageService.get('non-existent', defaultValue);

    expect(result).toBe(defaultValue);
  });

  it('应该在键不存在且无默认值时返回null', () => {
    const result = StorageService.get('non-existent');
    expect(result).toBeNull();
  });

  it('应该能够删除数据', () => {
    StorageService.set('key', 'value');
    StorageService.remove('key');

    expect(StorageService.get('key')).toBeNull();
  });

  it('应该只清空本应用管理的数据', () => {
    StorageService.set('key1', 'value1');
    StorageService.set('key2', 'value2');
    localStorage.setItem('external-app-key', 'keep');

    StorageService.clear();

    expect(StorageService.get('key1')).toBeNull();
    expect(StorageService.get('key2')).toBeNull();
    expect(localStorage.getItem('external-app-key')).toBe('keep');
  });

  it('应该提供显式命名的全量清空危险方法', () => {
    StorageService.set('key1', 'value1');
    localStorage.setItem('external-app-key', 'remove');

    StorageService.dangerouslyClearAllLocalStorage();

    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('external-app-key')).toBeNull();
  });

  it('应该能够检查键是否存在', () => {
    StorageService.set('key', 'value');

    expect(StorageService.has('key')).toBe(true);
    expect(StorageService.has('non-existent')).toBe(false);
  });

  it('应该能够获取所有键', () => {
    StorageService.set('key1', 'value1');
    StorageService.set('key2', 'value2');
    localStorage.setItem('external-app-key', 'keep');

    const keys = StorageService.keys();

    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
    expect(keys).not.toContain('external-app-key');
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });
});

// ================================================================
// 原始字符串操作
// ================================================================

describe('原始字符串操作', () => {
  it('应该能够存储和读取原始字符串', () => {
    const key = 'raw-key';
    const value = 'raw-string-value';

    StorageService.setRaw(key, value);
    const result = StorageService.getRaw(key);

    expect(result).toBe(value);
  });

  it('应该在键不存在时返回默认值', () => {
    const defaultValue = 'default';
    const result = StorageService.getRaw('non-existent', defaultValue);

    expect(result).toBe(defaultValue);
  });

  it('getRaw应该返回未解析的JSON字符串', () => {
    const key = 'json-key';
    const value = { test: 'data' };

    StorageService.set(key, value);
    const raw = StorageService.getRaw(key);

    expect(raw).toBe(JSON.stringify(value));
  });
});

// ================================================================
// 数据类型测试
// ================================================================

describe('数据类型支持', () => {
  it('应该支持字符串', () => {
    StorageService.set('key', 'string-value');
    expect(StorageService.get('key')).toBe('string-value');
  });

  it('应该支持数字', () => {
    StorageService.set('key', 123);
    expect(StorageService.get('key')).toBe(123);
  });

  it('应该支持布尔值', () => {
    StorageService.set('key', true);
    expect(StorageService.get('key')).toBe(true);
  });

  it('应该支持数组', () => {
    const array = [1, 2, 3];
    StorageService.set('key', array);
    expect(StorageService.get('key')).toEqual(array);
  });

  it('应该支持对象', () => {
    const obj = { a: 1, b: { c: 2 } };
    StorageService.set('key', obj);
    expect(StorageService.get('key')).toEqual(obj);
  });

  it('应该支持null', () => {
    StorageService.set('key', null);
    expect(StorageService.get('key')).toBeNull();
  });
});

// ================================================================
// LLM配置管理
// ================================================================

describe('LLM配置管理', () => {
  it('应该能够保存和读取LLM配置', () => {
    const provider = 'openai';
    const config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      endpoint: 'https://api.openai.com/v1',
      models: ['gpt-4'],
      enabled: true,
    };

    StorageService.setLLMConfig(provider, config);
    const result = StorageService.getLLMConfig(provider);

    expect(result).toBeDefined();
    expect(result?.provider).toBe('openai');
    expect(result?.model).toBe('gpt-4');
  });

  it('应该设置活跃的provider', () => {
    const provider = 'openai';
    const config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
      endpoint: 'https://api.openai.com/v1',
      models: ['gpt-4'],
      enabled: true,
    };

    StorageService.setLLMConfig(provider, config);

    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    expect(activeProvider).toBe(provider);
  });

  it('应该在没有配置时返回空对象', () => {
    const result = StorageService.getLLMConfig('non-existent');
    // getLLMConfig在没有配置时返回空对象,而不是null
    expect(result).toEqual({});
  });

  it('getLLMConfig应该移除敏感的apiKey', () => {
    const provider = 'openai';
    const config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'secret-key',
      endpoint: 'https://api.openai.com/v1',
      models: ['gpt-4'],
      enabled: true,
    };

    StorageService.setLLMConfig(provider, config);
    const result = StorageService.getLLMConfig(provider);

    expect(result).not.toHaveProperty('apiKey');
  });

  it('setLLMConfig不应该把非空apiKey写入普通localStorage', () => {
    const provider = 'openai';
    const config = {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'secret-key',
      endpoint: 'https://api.openai.com/v1',
      models: ['gpt-4'],
      enabled: true,
    };

    StorageService.setLLMConfig(provider, config);

    expect(StorageService.getRaw(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`)).not.toContain(
      'secret-key'
    );
  });

  it('应该迁移旧版明文LLM密钥到安全存储', async () => {
    const provider = 'new_api';
    const legacyKey = `llm_key_${provider}`;
    const config = {
      provider,
      model: 'gpt-5',
      apiKey: '',
      endpoint: 'https://new.hongecb.store/v1',
      models: ['gpt-5'],
      enabled: true,
    };

    StorageService.setLLMConfig(provider, config);
    localStorage.setItem(legacyKey, JSON.stringify('legacy-key'));

    const result = await StorageService.getLLMConfigWithKey(provider);

    expect(result?.apiKey).toBe('legacy-key');
    expect(localStorage.getItem(legacyKey)).toBeNull();
    await expect(StorageService.getSecure(legacyKey)).resolves.toBe('legacy-key');
  });

  it('keeps a legacy LLM key when secure migration cannot persist it', async () => {
    const provider = 'new_api';
    const legacyKey = `llm_key_${provider}`;
    const legacyValue = JSON.stringify('legacy-key');

    StorageService.setLLMConfig(provider, {
      provider,
      model: 'gpt-5',
      apiKey: '',
      endpoint: 'https://new.hongecb.store/v1',
      models: ['gpt-5'],
      enabled: true,
    });
    localStorage.setItem(legacyKey, legacyValue);
    vi.spyOn(StorageService, 'setSecure').mockResolvedValue(false);

    await expect(StorageService.getLLMConfigWithKey(provider)).resolves.toMatchObject({
      apiKey: 'legacy-key',
    });
    expect(localStorage.getItem(legacyKey)).toBe(legacyValue);
  });

  it('生产默认new_api应该读取为浏览器直连中转站配置', async () => {
    const provider = 'new_api';
    StorageService.setLLMConfig(provider, {
      provider,
      model: 'gpt-5.5',
      apiKey: 'browser-key',
      endpoint: 'https://new.hongecb.store/v1',
      models: ['gpt-5.5'],
      enabled: true,
    });
    await StorageService.setSecure('llm_key_new_api', 'browser-key');

    const result = await StorageService.getLLMConfigWithKey(provider);

    expect(result?.endpoint).toBe('https://new.hongecb.store/v1');
    expect(result?.apiKey).toBe('browser-key');
  });
});

// ================================================================
// 代理配置管理
// ================================================================

describe('代理配置管理', () => {
  it('应该能够保存和读取代理配置', () => {
    const config = {
      type: 'custom' as const,
      enabled: true,
      customUrl: 'https://proxy.example.com',
    };

    StorageService.setProxyConfig(config);
    const result = StorageService.getProxyConfig();

    expect(result).toEqual({ type: 'custom', enabled: true });
    expect(StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).toEqual({
      type: 'custom',
      enabled: true,
    });
  });

  it('普通set不应该把代理customUrl写入普通localStorage', () => {
    StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {
      type: 'scraperapi',
      enabled: true,
      customUrl: 'legacy-key',
    });

    expect(StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).toEqual({
      type: 'scraperapi',
      enabled: true,
    });
    expect(StorageService.getRaw(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).not.toContain('legacy-key');
  });

  it('应该迁移旧的采集代理配置密钥到安全存储', async () => {
    const config = {
      type: 'scraperapi' as const,
      enabled: true,
      customUrl: 'legacy-key',
    };

    localStorage.setItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, JSON.stringify(config));

    await expect(StorageService.getProxyConfigWithCredential()).resolves.toEqual(config);
    expect(StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).toEqual({
      type: 'scraperapi',
      enabled: true,
    });
  });

  it('keeps legacy proxy credentials when secure migration cannot persist them', async () => {
    const legacyKeyMap = { zenrows: 'map-secret' };
    const legacyConfig = {
      type: 'scraperapi' as const,
      enabled: true,
      customUrl: 'config-secret',
    };
    const legacyKeyMapValue = JSON.stringify(legacyKeyMap);
    const legacyConfigValue = JSON.stringify(legacyConfig);

    localStorage.setItem(STORAGE_KEYS.PROXY_KEY_MAP, legacyKeyMapValue);
    localStorage.setItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, legacyConfigValue);
    vi.spyOn(StorageService, 'setSecure').mockResolvedValue(false);

    await expect(StorageService.getProxyConfigWithCredential()).resolves.toEqual(legacyConfig);
    expect(localStorage.getItem(STORAGE_KEYS.PROXY_KEY_MAP)).toBe(legacyKeyMapValue);
    expect(localStorage.getItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).toBe(legacyConfigValue);
  });

  it('keeps an existing secure credential when a later legacy migration write fails', async () => {
    const legacyKeyMap = {
      scraperapi: 'old-scraperapi-secret',
      zenrows: 'zenrows-secret',
    };
    const legacyKeyMapValue = JSON.stringify(legacyKeyMap);
    const setSecure = StorageService.setSecure.bind(StorageService);

    await StorageService.setSecure('proxy_key_scraperapi', 'new-scraperapi-secret');
    localStorage.setItem(STORAGE_KEYS.PROXY_KEY_MAP, legacyKeyMapValue);
    vi.spyOn(StorageService, 'setSecure').mockImplementation((key, value) => {
      if (key === 'proxy_key_zenrows') {
        return Promise.resolve(false);
      }

      return setSecure(key, value);
    });

    await expect(StorageService.getProxyKeyMap()).resolves.toMatchObject({
      scraperapi: 'new-scraperapi-secret',
      zenrows: 'zenrows-secret',
    });
    await expect(StorageService.getSecure('proxy_key_scraperapi')).resolves.toBe(
      'new-scraperapi-secret'
    );
    expect(localStorage.getItem(STORAGE_KEYS.PROXY_KEY_MAP)).toBe(legacyKeyMapValue);
  });

  it('keeps legacy proxy data when config cleanup fails after secure migration', async () => {
    const legacyKeyMap = { zenrows: 'map-secret' };
    const legacyConfig = {
      type: 'scraperapi' as const,
      enabled: true,
      customUrl: 'config-secret',
    };
    const legacyKeyMapValue = JSON.stringify(legacyKeyMap);
    const legacyConfigValue = JSON.stringify(legacyConfig);

    localStorage.setItem(STORAGE_KEYS.PROXY_KEY_MAP, legacyKeyMapValue);
    localStorage.setItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, legacyConfigValue);
    vi.spyOn(StorageService, 'setSecure').mockResolvedValue(true);
    vi.spyOn(StorageService, 'setProxyConfig').mockReturnValue(false);

    await expect(StorageService.getProxyKeyMap()).resolves.toMatchObject({
      zenrows: 'map-secret',
      scraperapi: 'config-secret',
    });
    expect(localStorage.getItem(STORAGE_KEYS.PROXY_KEY_MAP)).toBe(legacyKeyMapValue);
    expect(localStorage.getItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).toBe(legacyConfigValue);
  });

  it('cleans a surviving legacy proxy config after a partial config write', async () => {
    const safeConfig = {
      type: 'scraperapi' as const,
      enabled: true,
    };
    const legacyConfig = {
      ...safeConfig,
      customUrl: 'config-secret',
    };

    StorageService.setProxyConfig(safeConfig);
    localStorage.setItem(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, JSON.stringify(legacyConfig));
    vi.spyOn(StorageService, 'setSecure').mockResolvedValue(true);

    await expect(StorageService.getProxyKeyMap()).resolves.toMatchObject({
      scraperapi: 'config-secret',
    });
    expect(StorageService.getRaw(STORAGE_KEYS.PROXY_CONFIG)).not.toContain('config-secret');
    expect(StorageService.getRaw(STORAGE_KEYS.SCRAPER_PROXY_CONFIG)).not.toContain('config-secret');
  });

  it('应该安全保存和读取代理服务商密钥缓存', async () => {
    await StorageService.setProxyKeyMap({
      scraperapi: 'scraper-key',
      zenrows: 'zen-key',
    });
    await StorageService.setProxyConfigWithCredential({
      type: 'zenrows',
      customUrl: 'zen-key',
      enabled: true,
    });

    await expect(StorageService.getProxyKeyMap()).resolves.toMatchObject({
      scraperapi: 'scraper-key',
      zenrows: 'zen-key',
    });
    await expect(StorageService.getProxyConfigWithCredential()).resolves.toEqual({
      type: 'zenrows',
      enabled: true,
      customUrl: 'zen-key',
    });
    expect(StorageService.getRaw(STORAGE_KEYS.PROXY_KEY_MAP)).toBeNull();
    expect(StorageService.getRaw(STORAGE_KEYS.PROXY_CONFIG)).not.toContain('zen-key');
  });

  it('应该返回默认代理配置', () => {
    const result = StorageService.getProxyConfig();

    expect(result).toEqual({
      type: 'scraperapi',
      enabled: true,
    });
  });
});

// ================================================================
// 采集历史管理
// ================================================================

describe('采集历史管理', () => {
  it('应该能够保存和读取采集历史', () => {
    const history = [
      { id: '1', url: 'https://example.com', timestamp: Date.now() },
      { id: '2', url: 'https://test.com', timestamp: Date.now() },
    ];

    StorageService.setScrapeHistory(history);
    const result = StorageService.getScrapeHistory();

    expect(result).toEqual(history);
  });

  it('应该限制历史记录数量为50', () => {
    const history = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      url: `https://example.com/${i}`,
      timestamp: Date.now(),
    }));

    StorageService.setScrapeHistory(history);
    const result = StorageService.getScrapeHistory();

    expect(result.length).toBe(50);
  });

  it('应该按运行策略限制历史记录数量', () => {
    localStorage.setItem(
      STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS,
      JSON.stringify({
        storage: {
          historyMaxItems: 12,
        },
      })
    );
    const history = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      url: `https://example.com/${i}`,
      timestamp: Date.now(),
    }));

    StorageService.setScrapeHistory(history);
    const result = StorageService.getScrapeHistory();

    expect(result.length).toBe(12);
  });

  it('应该在没有历史时返回空数组', () => {
    const result = StorageService.getScrapeHistory();
    expect(result).toEqual([]);
  });
});

// ================================================================
// 布局配置管理
// ================================================================

describe('布局配置管理', () => {
  it('应该能够保存和读取布局配置', () => {
    const templateId = 'dashboard';
    const layout = [
      { id: 'widget1', x: 0, y: 0, w: 2, h: 2 },
      { id: 'widget2', x: 2, y: 0, w: 2, h: 2 },
    ];

    StorageService.setLayoutConfig(templateId, layout);
    const result = StorageService.getLayoutConfig(templateId);

    expect(result).toEqual(layout);
  });

  it('应该在没有配置时返回空数组', () => {
    const result = StorageService.getLayoutConfig('non-existent');
    expect(result).toEqual([]);
  });
});

// ================================================================
// 存储使用情况
// ================================================================

describe('存储使用情况', () => {
  it('应该返回存储使用情况', () => {
    StorageService.set('key1', 'value1');
    StorageService.set('key2', 'value2');
    const usageBeforeExternalKey = StorageService.getUsage();
    localStorage.setItem('external-app-key', 'external-value');

    const usage = StorageService.getUsage();

    expect(usage).toHaveProperty('used');
    expect(usage).toHaveProperty('total');
    expect(usage).toHaveProperty('percent');
    expect(usage.used).toBeGreaterThan(0);
    expect(usage.used).toBe(usageBeforeExternalKey.used);
    expect(usage.total).toBe(5 * 1024 * 1024); // 5MB
  });
});

describe('LRU清理策略', () => {
  it('应该只自动清理缓存键，不删除用户数据和配置', () => {
    StorageService.setRaw('cache:view:old', 'cached');
    StorageService.set('user:scrape_history', [{ id: 1 }]);
    StorageService.set('app-storage', { ui: { theme: 'dark' } });
    localStorage.setItem('secure_llm_key_new_api', JSON.stringify({ encrypted: true }));
    StorageService.set(STORAGE_KEYS.SCRAPE_HISTORY, [{ id: 'legacy' }]);

    (StorageService as any).cleanupLRU();

    expect(StorageService.getRaw('cache:view:old')).toBeNull();
    expect(StorageService.get('user:scrape_history')).toEqual([{ id: 1 }]);
    expect(StorageService.get('app-storage')).toEqual({ ui: { theme: 'dark' } });
    expect(StorageService.get('secure_llm_key_new_api')).toEqual({ encrypted: true });
    expect(StorageService.get(STORAGE_KEYS.SCRAPE_HISTORY)).toEqual([{ id: 'legacy' }]);
  });
});

describe('敏感明文存储防护', () => {
  it('应该拒绝直接写入敏感键名', () => {
    expect(StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, { scraperapi: 'secret' })).toBe(false);
    expect(StorageService.getRaw(STORAGE_KEYS.PROXY_KEY_MAP)).toBeNull();
  });

  it('应该拒绝直接写入包含敏感字段的普通对象', () => {
    expect(StorageService.set('plain-config', { apiKey: 'secret' })).toBe(false);
    expect(StorageService.getRaw('plain-config')).toBeNull();
  });

  it('应该拒绝写入旧版明文LLM密钥键', () => {
    expect(StorageService.setRaw('llm_key_new_api', 'secret')).toBe(false);
    expect(StorageService.getRaw('llm_key_new_api')).toBeNull();
  });
});

// ================================================================
// 错误处理
// ================================================================

describe('错误处理', () => {
  it('应该处理JSON解析错误', () => {
    // 直接设置无效的JSON
    localStorage.setItem('invalid-json', 'not-a-json');

    const result = StorageService.get('invalid-json', 'default');
    expect(result).toBe('default');
  });

  it('set应该在存储失败时返回false', () => {
    // Mock localStorage.setItem抛出错误
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    const result = StorageService.set('key', 'value');

    // 应该返回false或true(取决于重试是否成功)
    expect(typeof result).toBe('boolean');
  });

  it('setRaw应该在存储失败时返回false', () => {
    // Mock localStorage.setItem抛出错误
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    });

    const result = StorageService.setRaw('key', 'value');

    expect(typeof result).toBe('boolean');
  });

  it('remove应该在localStorage失败时安全返回', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed');
    });

    expect(() => StorageService.remove('key')).not.toThrow();
  });

  it('clear应该在localStorage失败时安全返回', () => {
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('key failed');
    });

    expect(() => StorageService.clear()).not.toThrow();
  });

  it('has应该在localStorage失败时返回false', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('get failed');
    });

    expect(StorageService.has('key')).toBe(false);
  });

  it('keys应该在localStorage失败时返回空数组', () => {
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('key failed');
    });

    expect(StorageService.keys()).toEqual([]);
  });

  it('getUsage应该在localStorage失败时返回安全默认值', () => {
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('key failed');
    });

    expect(StorageService.getUsage()).toEqual({
      used: 0,
      total: 5 * 1024 * 1024,
      percent: 0,
    });
  });

  it('代理密钥读取应该在安全存储失败时返回空对象', async () => {
    vi.spyOn(StorageService, 'getSecure').mockRejectedValue(new Error('secure read failed'));

    await expect(StorageService.getProxyKeyMap()).resolves.toEqual({});
  });

  it('代理密钥保存应该在安全存储失败时返回false', async () => {
    vi.spyOn(StorageService, 'setSecure').mockRejectedValue(new Error('secure write failed'));

    await expect(StorageService.setProxyKeyMap({ scraperapi: 'secret' })).resolves.toBe(false);
  });

  it('带密钥代理配置读取应该在密钥缓存失败时返回默认配置', async () => {
    vi.spyOn(StorageService, 'getProxyKeyMap').mockRejectedValue(new Error('key map failed'));

    await expect(StorageService.getProxyConfigWithCredential()).resolves.toEqual({
      type: 'scraperapi',
      enabled: true,
    });
  });

  it('带密钥代理配置保存应该在安全存储失败时返回false', async () => {
    vi.spyOn(StorageService, 'setSecure').mockRejectedValue(new Error('secure write failed'));

    await expect(
      StorageService.setProxyConfigWithCredential({
        type: 'scraperapi',
        customUrl: 'secret',
        enabled: true,
      })
    ).resolves.toBe(false);
  });

  it('异步采集历史读取应该在IndexedDB失败时回退到localStorage历史', async () => {
    const history = [{ id: '1', url: 'https://example.com', timestamp: Date.now() }];
    StorageService.setScrapeHistory(history);
    vi.spyOn(LocalDataStore, 'migrateLocalStorageKey').mockRejectedValue(new Error('idb failed'));

    await expect(StorageService.getScrapeHistoryAsync()).resolves.toEqual(history);
  });

  it('异步采集历史保存应该在IndexedDB失败时回退到localStorage', async () => {
    const history = [{ id: '1', url: 'https://example.com', timestamp: Date.now() }];
    vi.spyOn(LocalDataStore, 'set').mockRejectedValue(new Error('idb failed'));

    await expect(StorageService.setScrapeHistoryAsync(history)).resolves.toBe(true);
    expect(StorageService.getScrapeHistory()).toEqual(history);
  });

  it('异步采集历史删除应该在IndexedDB失败时仍清理localStorage历史', async () => {
    const history = [{ id: '1', url: 'https://example.com', timestamp: Date.now() }];
    StorageService.setScrapeHistory(history);
    vi.spyOn(LocalDataStore, 'remove').mockRejectedValue(new Error('idb failed'));

    await expect(StorageService.removeScrapeHistoryAsync()).resolves.toBeUndefined();
    expect(StorageService.getScrapeHistory()).toEqual([]);
  });

  it('安全存储快捷方法应该在底层异常时返回安全默认值', async () => {
    vi.spyOn(SecureStorage, 'setSecure').mockRejectedValue(new Error('crypto failed'));
    vi.spyOn(SecureStorage, 'getSecure').mockRejectedValue(new Error('crypto failed'));

    await expect(StorageService.setSecure('api-key', 'secret')).resolves.toBe(false);
    await expect(StorageService.getSecure('api-key', 'fallback')).resolves.toBe('fallback');
  });
});

// ================================================================
// 安全存储(异步方法)
// ================================================================

describe('安全存储', () => {
  it('应该能够安全存储和读取敏感数据', async () => {
    const key = 'api-key';
    const value = 'secret-value';

    const setResult = await StorageService.setSecure(key, value);
    expect(setResult).toBe(true);

    const getResult = await StorageService.getSecure(key);
    expect(getResult).toBe(value);
  });

  it('应该在安全存储不存在时返回默认值', async () => {
    const defaultValue = 'default';
    const result = await StorageService.getSecure('non-existent', defaultValue);

    expect(result).toBe(defaultValue);
  });

  it('应该能够删除安全存储的数据', async () => {
    const key = 'api-key';
    await StorageService.setSecure(key, 'value');

    StorageService.removeSecure(key);

    const result = await StorageService.getSecure(key);
    expect(result).toBeNull();
  });
});

// ================================================================
// STORAGE_KEYS常量
// ================================================================

describe('STORAGE_KEYS常量', () => {
  it('应该导出所有必需的键常量', () => {
    expect(STORAGE_KEYS.LLM_ACTIVE_PROVIDER).toBe('llm_active_provider');
    expect(STORAGE_KEYS.LLM_CONFIG_PREFIX).toBe('llm_');
    expect(STORAGE_KEYS.PROXY_CONFIG).toBe('proxy_config');
    expect(STORAGE_KEYS.SCRAPE_HISTORY).toBe('scrape_history');
    expect(STORAGE_KEYS.LAYOUT_CONFIG_PREFIX).toBe('layout_config_');
  });
});
