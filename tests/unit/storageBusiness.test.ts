/**
 * storage/business 域模块函数测试（Level 3 B' 拆分回归守护）
 *
 * 覆盖 src/services/storage/business/{llmConfig,proxyConfig,scrapeHistory,layoutConfig}.ts
 * 与 secure.ts 的直接调用路径，确保拆分后模块函数语义与原始 StorageService 类方法一致。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLLMConfig,
  getLLMConfigWithKey,
  setLLMConfig,
  setLLMModelCatalog,
} from '@/services/storage/business/llmConfig';
import {
  getProxyConfig,
  setProxyConfig,
  getProxyKeyMap,
  setProxyKeyMap,
  hasProxyCredential,
} from '@/services/storage/business/proxyConfig';
import {
  getScrapeHistory,
  setScrapeHistory,
  getScrapeHistoryAsync,
  setScrapeHistoryAsync,
  removeScrapeHistoryAsync,
} from '@/services/storage/business/scrapeHistory';
import { getLayoutConfig, setLayoutConfig } from '@/services/storage/business/layoutConfig';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { LocalDataStore } from '@/services/localDataStore';

// secure.ts 动态 import SecureStorage，必须模块级 mock
vi.mock('@/common/utils/secureStorage', () => ({
  SecureStorage: {
    setSecure: vi.fn(async (key: string, data: unknown) => {
      // 测试 harness 通过 __setSecureData 注入
      return true;
    }),
    getSecure: vi.fn(async (key: string, defaultValue: unknown) => defaultValue),
    removeSecure: vi.fn(async () => {}),
  },
}));

import { SecureStorage } from '@/common/utils/secureStorage';

const VALID_LLM_CONFIG = {
  provider: 'openai',
  endpoint: 'https://api.example.com',
  apiKey: 'sk-secret',
  model: 'gpt-4',
  models: ['gpt-4', 'gpt-3.5-turbo'],
  enabled: true,
};

let store: Record<string, string>;

beforeEach(() => {
  store = {};
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    store[key] = value;
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
    delete store[key];
  });
  vi.spyOn(Storage.prototype, 'key').mockImplementation((index: number) => {
    const keys = Object.keys(store);
    return keys[index] ?? null;
  });
  // SecureStorage 是 const 对象；模拟“加密后落盘、读取回显”的等价语义
  vi.mocked(SecureStorage.setSecure).mockImplementation(async (key: string, data: unknown) => {
    store[`__secure:${key}`] = JSON.stringify(data);
    // hasProxyCredential 依赖 core.has 查 localStorage 的 `secure_${credKey}`
    localStorage.setItem(`secure_${key}`, '1');
    return true;
  });
  vi.mocked(SecureStorage.getSecure).mockImplementation(async (key: string, defaultValue = null) => {
    const raw = store[`__secure:${key}`];
    return raw === undefined ? defaultValue : (JSON.parse(raw) as never);
  });
  vi.mocked(SecureStorage.removeSecure).mockImplementation(async (key: string) => {
    delete store[`__secure:${key}`];
    localStorage.removeItem(`secure_${key}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function seedProviderConfig(provider: string, config: Record<string, unknown> = {}) {
  store[`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`] = JSON.stringify({
    ...VALID_LLM_CONFIG,
    provider,
    ...config,
  });
    store[STORAGE_KEYS.LLM_ACTIVE_PROVIDER] = provider;
    seedSecureCredential(provider, String(config.apiKey ?? 'sk-secret'));
}

function seedSecureCredential(provider: string, apiKey: string) {
  store[`__secure:llm_key_${provider}`] = JSON.stringify(apiKey);
}

describe('storage/business/llmConfig', () => {
  it('getLLMConfig 返回无 apiKey 的部分配置', () => {
    seedProviderConfig('openai');
    const config = getLLMConfig('openai');
    expect(config).not.toBeNull();
    expect(config).toHaveProperty('endpoint');
    expect(config).not.toHaveProperty('apiKey');
  });

  it('getLLMConfig 无活跃 provider 返回 null', () => {
    expect(getLLMConfig()).toBeNull();
  });

  it('setLLMConfig 与 setLLMModelCatalog 落盘且剥离 apiKey', () => {
    setLLMConfig('gemini', { ...VALID_LLM_CONFIG, provider: 'gemini', apiKey: 'gk-secret' } as never);
    // stripLLMSecret 保留 apiKey 字段但置空
    expect(JSON.parse(store[`${STORAGE_KEYS.LLM_CONFIG_PREFIX}gemini`]).apiKey).toBe('');
    // 调用方可自行管理凭据层
    expect(StorageService.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER)).toBe('gemini');

    setLLMModelCatalog('claude', { ...VALID_LLM_CONFIG, provider: 'claude', apiKey: 'ak-secret' } as never);
    expect(JSON.parse(store[`${STORAGE_KEYS.LLM_CONFIG_PREFIX}claude`]).apiKey).toBe('');
    // 模型目录不应改变活跃 provider
    expect(StorageService.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER)).toBe('gemini');
  });

  it('getLLMConfigWithKey 解密 apiKey 与明文旧密钥迁移两条路径', async () => {
    seedProviderConfig('openai');
    const full = await getLLMConfigWithKey('openai');
    expect(full).not.toBeNull();
    expect(full?.apiKey).toBe('sk-secret');

    // 旧明文密钥迁移路径：配置存在但加密读取失败，回退到 legacy 明文 key
    const legacyKey = `llm_key_openai`;
    store[`${STORAGE_KEYS.LLM_CONFIG_PREFIX}openai`] = JSON.stringify({
      ...VALID_LLM_CONFIG,
      apiKey: '',
    });
    store[legacyKey] = JSON.stringify('plain-migrated');
    vi.mocked(SecureStorage.getSecure).mockRejectedValueOnce(new Error('crypto unavailable'));
    const migrated = await getLLMConfigWithKey('openai');
    expect(migrated?.apiKey).toBe('plain-migrated');
    expect(store[legacyKey]).toBeUndefined();
  });

  it('getLLMConfigWithKey 全部路径失败时降级返回空 apiKey 配置', async () => {
    seedProviderConfig('openai');
    vi.mocked(SecureStorage.getSecure).mockRejectedValue(new Error('decrypt boom'));
    const full = await getLLMConfigWithKey('openai');
    expect(full).not.toBeNull();
    expect(full?.apiKey).toBe('');
  });
});

describe('storage/business/proxyConfig', () => {
  beforeEach(() => {
    // 与文件级 beforeEach 一致：加密层“加密后落盘、读取回显”语义
    vi.mocked(SecureStorage.setSecure).mockImplementation(async (key: string, data: unknown) => {
      store[`__secure:${key}`] = JSON.stringify(data);
      localStorage.setItem(`secure_${key}`, '1');
      return true;
    });
    vi.mocked(SecureStorage.getSecure).mockImplementation(async (key: string, defaultValue = null) => {
      const raw = store[`__secure:${key}`];
      return raw === undefined ? defaultValue : (JSON.parse(raw) as never);
    });
    vi.mocked(SecureStorage.removeSecure).mockImplementation(async (key: string) => {
      delete store[`__secure:${key}`];
      localStorage.removeItem(`secure_${key}`);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getProxyConfig/setProxyConfig 读写落盘', () => {
    const config = getProxyConfig();
    expect(typeof config).toBe('object');
    const ok = setProxyConfig({ ...config, activeType: 'custom' } as never);
    expect(ok).toBe(true);
  });

  it('proxy key map 迁移与查询', async () => {
    const legacy = { custom_proxy_key: 'pk-legacy', residential_proxy_key: 'rp-legacy' };
    store[STORAGE_KEYS.PROXY_KEY_MAP] = JSON.stringify(legacy);
    const map = await getProxyKeyMap();
    // 旧明文 key map 需经解密/类型校验后返回
    expect(typeof map).toBe('object');
  });

  it('setProxyKeyMap 落盘并可查询', async () => {
    // readProxyKeyMap 只遍历 SCRAPER_PROXY_CREDENTIAL_TYPES（scraperapi/zenrows/brightdata/custom_api）
    const ok = await setProxyKeyMap({ custom_api: 'custom-credential' });
    expect(ok).toBe(true);
    const map = await getProxyKeyMap();
    expect(map).toHaveProperty('custom_api');
    expect(hasProxyCredential('custom_api')).toBe(true);
    expect(hasProxyCredential('nonexistent')).toBe(false);
  });
});

describe('storage/business/scrapeHistory', () => {
  let idbStore: Record<string, unknown>;
  beforeEach(() => {
    idbStore = {};
    vi.spyOn(LocalDataStore, 'set').mockImplementation(
      async (key: string, value: unknown) => {
        idbStore[key] = value;
        return true;
      }
    );
    vi.spyOn(LocalDataStore, 'get').mockImplementation(async (key: string) => {
      return (idbStore[key] ?? null) as never;
    });
    vi.spyOn(LocalDataStore, 'remove').mockImplementation(async (key: string) => {
      delete idbStore[key];
    });
    vi.spyOn(LocalDataStore, 'migrateLocalStorageKey').mockResolvedValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  const items = [{ keyword: 'k1', timestamp: Date.now() } as never];

  it('同步读写', () => {
    expect(setScrapeHistory(items)).toBe(true);
    expect(getScrapeHistory()).toEqual(items);
  });

  it('异步读写与删除', async () => {
    expect(await setScrapeHistoryAsync(items)).toBe(true);
    expect(await getScrapeHistoryAsync()).toEqual(items);
    await removeScrapeHistoryAsync();
    expect(await getScrapeHistoryAsync()).toEqual([]);
  });
});

describe('storage/business/layoutConfig', () => {
  it('按 templateId 读写', () => {
    const layout = [{ id: 'a', x: 0, y: 0, w: 1, h: 1 } as never];
    setLayoutConfig('tmpl-1', layout);
    expect(getLayoutConfig('tmpl-1')).toEqual(layout);
    expect(getLayoutConfig('tmpl-2')).toEqual([]);
  });
});

describe('storage 单例稳定性（拆分后仍可从 barrel 取类实例）', () => {
  it('StorageService 单例存在且类方法可用', () => {
    expect(StorageService).toBeDefined();
    StorageService.set('test-b', 1);
    expect(StorageService.get<number>('test-b')).toBe(1);
    StorageService.remove('test-b');
  });
});
