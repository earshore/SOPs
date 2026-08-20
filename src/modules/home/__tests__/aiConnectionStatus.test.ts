/**
 * aiConnectionStatus 单元测试
 * 验证首页 AI 状态徽标数据源（P0-1）的状态判定逻辑。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/storageService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/storageService')>();
  return {
    ...actual,
    StorageService: {
      ...actual.StorageService,
      get: vi.fn(),
      getSecure: vi.fn(),
    },
  };
});

vi.mock('@/components/settings/domain/settingsLlmModel', () => ({
  resolveProviderEndpoint: vi.fn(),
  loadProviderApiKey: vi.fn(),
}));

import { DEFAULT_LLM_PROVIDER_ID } from '@/common/config/llmProviders';
import { StorageService } from '@/services/storageService';
import {
  loadProviderApiKey,
  resolveProviderEndpoint,
} from '@/components/settings/domain/settingsLlmModel';
import { getAiConnectionStatus, isWelcomeShown, markWelcomeShown } from '../aiConnectionStatus';

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
  it('默认未展示', () => {
    expect(isWelcomeShown()).toBe(false);
  });

  it('标记后返回 true', () => {
    markWelcomeShown();
    expect(isWelcomeShown()).toBe(true);
  });
});
