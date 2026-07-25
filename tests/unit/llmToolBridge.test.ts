import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveToolLlmConfig,
  resolveToolLlmPublicConfig,
} from '@/services/llmToolBridge';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  getLLMConfig: vi.fn(),
  getLLMConfigWithKey: vi.fn(),
  applyToolTargetModel: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm.activeProvider',
  },
  StorageService: {
    get: mocks.storageGet,
    getLLMConfig: mocks.getLLMConfig,
    getLLMConfigWithKey: mocks.getLLMConfigWithKey,
  },
}));

vi.mock('@/services/toolStrategyService', () => ({
  applyToolTargetModel: mocks.applyToolTargetModel,
}));

describe('llmToolBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageGet.mockReturnValue('new_api');
    mocks.getLLMConfig.mockReturnValue({
      endpoint: 'https://llm.example/v1',
      model: 'base-model',
    });
    mocks.getLLMConfigWithKey.mockResolvedValue({
      endpoint: 'https://llm.example/v1',
      apiKey: 'secret',
      model: 'base-model',
    });
    mocks.applyToolTargetModel.mockImplementation((_target, config) => ({
      ...config,
      model: 'strategy-model',
      endpoint: config.endpoint || 'https://llm.example/v1',
    }));
  });

  it('resolves full tool LLM config with strategy model', async () => {
    await expect(
      resolveToolLlmConfig('master-analysis-ai-analysis', { module: 'TestModule' })
    ).resolves.toEqual({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      apiKey: 'secret',
      model: 'strategy-model',
      serviceTier: undefined,
    });
    expect(mocks.applyToolTargetModel).toHaveBeenCalledWith(
      'master-analysis-ai-analysis',
      expect.objectContaining({ provider: 'new_api', apiKey: 'secret' })
    );
  });

  it('resolves public tool LLM config without API key', () => {
    expect(
      resolveToolLlmPublicConfig('ppc-tools-ppc-search-terms', { module: 'TestModule' })
    ).toEqual({
      provider: 'new_api',
      endpoint: 'https://llm.example/v1',
      model: 'strategy-model',
      serviceTier: undefined,
    });
  });

  it('requires active provider, api key, and model', async () => {
    mocks.storageGet.mockReturnValueOnce(null);
    await expect(resolveToolLlmConfig('playground-deep-chat')).rejects.toMatchObject({
      code: 'ERR_LLM_PROVIDER_NOT_SELECTED',
    });

    mocks.getLLMConfigWithKey.mockResolvedValueOnce({
      endpoint: 'https://llm.example/v1',
      model: 'base-model',
    });
    await expect(resolveToolLlmConfig('playground-deep-chat')).rejects.toMatchObject({
      code: 'ERR_LLM_API_KEY_MISSING',
    });

    mocks.applyToolTargetModel.mockReturnValueOnce({
      endpoint: 'https://llm.example/v1',
      apiKey: 'secret',
      model: '',
    });
    await expect(resolveToolLlmConfig('playground-deep-chat')).rejects.toMatchObject({
      code: 'ERR_LLM_MODEL_NOT_SELECTED',
    });
  });

  it('requires stored public config and model', () => {
    mocks.getLLMConfig.mockReturnValueOnce(null);
    expect(() => resolveToolLlmPublicConfig('keyword-hunter-seo-process')).toThrowError(
      expect.objectContaining({ code: 'ERR_LLM_MODEL_NOT_SELECTED' })
    );

    mocks.applyToolTargetModel.mockReturnValueOnce({
      endpoint: 'https://llm.example/v1',
      model: undefined,
    });
    expect(() => resolveToolLlmPublicConfig('keyword-hunter-seo-process')).toThrowError(
      expect.objectContaining({ code: 'ERR_LLM_MODEL_NOT_SELECTED' })
    );
  });
});
