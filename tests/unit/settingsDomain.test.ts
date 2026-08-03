import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  diffSettingsDomain,
  loadSettingsDomainState,
  saveSettingsDomainPartition,
  snapshotSettingsDomain,
  validateSettingsDomainPartition,
} from '@/components/settings/domain/settingsDomain';
import { StorageService } from '@/services/storageService';
import {
  getToolStrategySettings,
  saveToolStrategySettings,
} from '@/services/toolStrategyService';
import {
  getRuntimeStrategySettings,
  saveRuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

const deps = vi.hoisted(() => {
  const values = new Map<string, unknown>();
  const secureValues = new Map<string, string>();
  const llmConfigs = new Map<string, Record<string, unknown>>();
  return {
    values,
    secureValues,
    llmConfigs,
    saveToolStrategy: vi.fn(),
    saveRuntime: vi.fn(),
  };
});

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    TOOL_STRATEGY_SETTINGS: 'tool_strategy_settings',
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
    PROXY_CONFIG: 'proxy_config',
    PROXY_KEY_MAP: 'proxy_key_map',
  },
  StorageService: {
    get: vi.fn((key: string, fallback?: unknown) =>
      deps.values.has(key) ? deps.values.get(key) : (fallback ?? null)
    ),
    getSecure: vi.fn(async () => ''),
    setSecure: vi.fn(async (key: string, value: string) => {
      deps.secureValues.set(key, value);
    }),
    removeSecure: vi.fn((key: string) => {
      deps.secureValues.delete(key);
    }),
    getLLMConfig: vi.fn((provider: string) => deps.llmConfigs.get(provider) ?? null),
    setLLMConfig: vi.fn((provider: string, config: Record<string, unknown>) => {
      deps.llmConfigs.set(provider, config);
      deps.values.set('llm_active_provider', provider);
    }),
    getProxyConfig: vi.fn(() => deps.values.get('proxy_config') ?? null),
    setProxyKeyMap: vi.fn(async (map: Record<string, string>) => {
      deps.values.set('proxy_key_map', map);
    }),
    setProxyConfigWithCredential: vi.fn(async (config: Record<string, unknown>) => {
      deps.values.set('proxy_config', config);
    }),
  },
}));

vi.mock('@/services/toolStrategyService', () => ({
  getToolStrategySettings: vi.fn(() => deps.values.get('tool_strategy_settings') ?? {}),
  saveToolStrategySettings: deps.saveToolStrategy,
}));

vi.mock('@/services/runtimeStrategyService', () => ({
  getRuntimeStrategySettings: vi.fn(() => deps.values.get('runtime_strategy_settings') ?? {}),
  saveRuntimeStrategySettings: deps.saveRuntime,
}));

const llmWrite = {
  provider: 'openai',
  config: { provider: 'openai', endpoint: 'https://api.example.com', model: 'gpt-4o' },
};

beforeEach(() => {
  deps.values.clear();
  deps.secureValues.clear();
  deps.llmConfigs.clear();
  vi.clearAllMocks();
});

describe('SettingsDomain facade (TD-SET-01 Phase 3)', () => {
  it('load() reads all partitions from storage', () => {
    deps.llmConfigs.set('openai', { endpoint: 'https://api.example.com' });
    deps.values.set('llm_active_provider', 'openai');
    deps.values.set('tool_strategy_settings', { targetModels: { x: 'm' } });
    deps.values.set('runtime_strategy_settings', {});
    deps.values.set('proxy_config', { type: 'scraperapi' });

    const state = loadSettingsDomainState();
    expect(state.llm.provider).toBe('openai');
    expect(state.llm.config).toEqual({ endpoint: 'https://api.example.com' });
    expect(state.toolStrategy).toEqual({ targetModels: { x: 'm' } });
    expect(state.runtimeStrategy).toEqual({});
    expect(state.proxy).toEqual({ type: 'scraperapi' });
  });

  it('savePartition(proxy) persists key map + config through the facade', async () => {
    await saveSettingsDomainPartition('proxy', {
      type: 'scraperapi',
      customUrl: '',
      keyMap: { scraperapi: '' },
    });
    expect(StorageService.setProxyConfigWithCredential).toHaveBeenCalledWith({
      type: 'scraperapi',
      customUrl: '',
    });
    expect(deps.values.get('proxy_config')).toEqual({ type: 'scraperapi', customUrl: '' });
  });

  it('savePartition(llm) writes secure key + config; empty key removes secure key', async () => {
    await saveSettingsDomainPartition('llm', { ...llmWrite, apiKey: 'sk-test' });
    expect(deps.secureValues.get('llm_key_openai')).toBe('sk-test');
    expect(deps.llmConfigs.get('openai')).toEqual(llmWrite.config);
    expect(deps.values.get('llm_active_provider')).toBe('openai');

    await saveSettingsDomainPartition('llm', { ...llmWrite, apiKey: '' });
    expect(deps.secureValues.has('llm_key_openai')).toBe(false);
  });

  it('savePartition(llm) without apiKey leaves secure key untouched', async () => {
    deps.secureValues.set('llm_key_openai', 'keep-me');
    await saveSettingsDomainPartition('llm', llmWrite);
    expect(deps.secureValues.get('llm_key_openai')).toBe('keep-me');
  });

  it('savePartition(toolStrategy/runtime) delegate to domain services', async () => {
    await saveSettingsDomainPartition('toolStrategy', { settings: { a: 1 } } as never);
    expect(deps.saveToolStrategy).toHaveBeenCalledWith({ a: 1 });
    await saveSettingsDomainPartition('runtime', { settings: { b: 2 } } as never);
    expect(deps.saveRuntime).toHaveBeenCalledWith({ b: 2 });
  });

  it('diff() reports only changed partitions', () => {
    const baseline = snapshotSettingsDomain({
      llm: { endpoint: 'a' },
      toolStrategy: { x: 1 },
      runtime: {},
      proxy: { type: 'direct' },
      appearance: {},
    });
    const current = snapshotSettingsDomain({
      llm: { endpoint: 'b' },
      toolStrategy: { x: 1 },
      runtime: {},
      proxy: { type: 'direct' },
      appearance: {},
    });
    expect(diffSettingsDomain(baseline, current)).toEqual(['llm']);
  });

  it('validate() rejects empty llm endpoint and empty proxy input requirement', () => {
    const badLlm = validateSettingsDomainPartition('llm', {
      provider: 'openai',
      config: { provider: 'openai', endpoint: '', model: '' },
    });
    expect(badLlm.valid).toBe(false);
    expect(badLlm.errors.length).toBeGreaterThan(0);

    const badProxy = validateSettingsDomainPartition('proxy', {
      type: 'scraperapi',
      customUrl: '',
      keyMap: {},
    });
    expect(badProxy.valid).toBe(false);

    const okLlm = validateSettingsDomainPartition('llm', llmWrite);
    expect(okLlm.valid).toBe(true);
  });
});
