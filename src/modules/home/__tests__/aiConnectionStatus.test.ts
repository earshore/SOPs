/**
 * aiConnectionStatus 单元测试
 * 验证首页 AI 状态徽标数据源（P0-1）的状态判定逻辑。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/storageService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storageService')>();
  // StorageService 是 new 出的单例实例（export const StorageService），必须为
  // IStorageService 接口的全部方法提供 vi.fn，否则调用未被 mock 的方法会抛出
  // "xxx is not a function"（原 mock 只覆盖 get/getSecure，欢迎标记用例调用 set 报错）。
  const getMock = vi.fn(getMockImplementation());
  return {
    ...actual,
    StorageService: {
      ...actual.StorageService,
      get: getMock,
      getSecure: vi.fn(),
      set: vi.fn((key: string, value: unknown) => inMemory.set(key, value)),
      remove: vi.fn((key: string) => inMemory.delete(key)),
      clear: vi.fn(() => inMemory.clear()),
      has: vi.fn((key: string) => inMemory.has(key)),
      keys: vi.fn(() => Array.from(inMemory.keys())),
    },
  };
});

vi.mock('@/common/settings/settingsLlmModel', () => ({
  resolveProviderEndpoint: vi.fn(),
  loadProviderApiKey: vi.fn(),
}));

import { DEFAULT_LLM_PROVIDER_ID } from '@/common/config/llmProviders';
import { StorageService } from '@/services/storageService';
import { loadProviderApiKey, resolveProviderEndpoint } from '@/common/settings/settingsLlmModel';
import { getAiConnectionStatus, isWelcomeShown, markWelcomeShown } from '../aiConnectionStatus';

/** 测试级内存存储（mock get/set/remove/clear 共用），支持 set/get 链路验证。 */
const inMemory = new Map<string, unknown>();

// 函数声明（hoisted），避免 vi.mock factory（被提升到模块顶部）中的 TDZ。
function getMockImplementation(defaultValue: unknown = null) {
  return (key: string, fallback: unknown = defaultValue) =>
    inMemory.has(key) ? (inMemory.get(key) as never) : (fallback as never);
}

const mockedGet = vi.mocked(StorageService.get);
const mockedResolve = vi.mocked(resolveProviderEndpoint);
const mockedLoadKey = vi.mocked(loadProviderApiKey);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveProviderEndpoint).mockReturnValue('https://api.example.com');
  vi.mocked(loadProviderApiKey).mockResolvedValue('sk-xxxx');
});

describe('getAiConnectionStatus', () => {
  it('未激活任何提供商时返回 unconfigured', async () => {
    mockedGet.mockReturnValue(null as unknown as string);
    const status = await getAiConnectionStatus();
    expect(status.state).toBe('unconfigured');
    expect(status.label).toContain('未');
  });

  it('Endpoint 与 Key 齐全时返回 connected', async () => {
    mockedGet.mockReturnValue(DEFAULT_LLM_PROVIDER_ID);
    const status = await getAiConnectionStatus();
    expect(status.state).toBe('connected');
    expect(status.provider).toBe(DEFAULT_LLM_PROVIDER_ID);
    expect(status.label).toContain('已连接');
  });

  it('缺失 API Key 时返回 unconfigured 并指明原因', async () => {
    mockedGet.mockReturnValue(DEFAULT_LLM_PROVIDER_ID);
    mockedLoadKey.mockResolvedValue('');
    const status = await getAiConnectionStatus();
    expect(status.state).toBe('unconfigured');
    expect(status.label).toContain('API Key');
  });

  it('缺失 Endpoint 时返回 unconfigured 并指明原因', async () => {
    mockedGet.mockReturnValue(DEFAULT_LLM_PROVIDER_ID);
    mockedResolve.mockReturnValue('');
    const status = await getAiConnectionStatus();
    expect(status.state).toBe('unconfigured');
    expect(status.label).toContain('Endpoint');
  });

  it('两者均缺失时返回合并提示', async () => {
    mockedGet.mockReturnValue(DEFAULT_LLM_PROVIDER_ID);
    mockedResolve.mockReturnValue('');
    mockedLoadKey.mockResolvedValue('');
    const status = await getAiConnectionStatus();
    expect(status.state).toBe('unconfigured');
    expect(status.label).toContain('Endpoint');
    expect(status.label).toContain('Key');
  });
});

describe('welcome flag', () => {
  const inMemoryGet = (key: string, defaultValue: unknown = null) =>
    getMockImplementation(defaultValue)(key, defaultValue); // function 声明，无 TDZ

  beforeEach(() => {
    // get 可能被前面用例的 mockReturnValue 覆盖，恢复内存实现。
    vi.mocked(StorageService.get).mockImplementation(inMemoryGet);
  });

  it('默认未展示', () => {
    expect(isWelcomeShown()).toBe(false);
  });

  it('标记后返回 true', () => {
    markWelcomeShown();
    // set 已写入内存 mock，get 直接返回写入值：验证 set/get 链路而非硬编码 mock。
    expect(isWelcomeShown()).toBe(true);
  });

  it('set 与 remove 行为正确', () => {
    markWelcomeShown();
    StorageService.remove('home_ai_welcome_shown');
    expect(isWelcomeShown()).toBe(false);
  });
});
