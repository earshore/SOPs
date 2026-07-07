import { beforeEach, expect, it, vi } from 'vitest';
import { fetchImmersionTranslation, fetchListingAnalysis } from './keywordHunterService';

const mocks = vi.hoisted(() => ({
  callLLM: vi.fn(),
  storageGet: vi.fn(),
  getLLMConfig: vi.fn(),
  getLLMConfigWithKey: vi.fn(),
  localDataGet: vi.fn(),
  localDataSet: vi.fn(),
}));

vi.mock('../../../../../services/llmService', () => ({
  callLLM: mocks.callLLM,
}));

vi.mock('../../../../../services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    TOOL_STRATEGY_SETTINGS: 'tool_strategy_settings',
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
  },
  StorageService: {
    get: mocks.storageGet,
    getLLMConfig: mocks.getLLMConfig,
    getLLMConfigWithKey: mocks.getLLMConfigWithKey,
  },
}));

vi.mock('../../../../../services/localDataStore', () => ({
  LocalDataStore: {
    get: mocks.localDataGet,
    set: mocks.localDataSet,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storageGet.mockImplementation((key: string, fallback?: unknown) => {
    if (key === 'llm_active_provider') return 'new_api';
    if (key === 'tool_strategy_settings') {
      return {
        version: 2,
        targets: {
          'keyword-hunter-seo-process': {
            defaultModelsByProvider: {
              new_api: 'keyword-batch-model',
            },
          },
          'keyword-hunter-listing-review': {
            defaultModelsByProvider: {
              new_api: 'keyword-review-model',
            },
          },
        },
      };
    }
    return fallback ?? null;
  });
  mocks.getLLMConfig.mockReturnValue({
    provider: 'new_api',
    endpoint: 'https://llm.example/v1',
    model: 'global-fast-model',
    models: ['global-fast-model', 'keyword-batch-model', 'keyword-review-model'],
    enabled: true,
  });
  mocks.getLLMConfigWithKey.mockResolvedValue({
    provider: 'new_api',
    endpoint: 'https://llm.example/v1',
    apiKey: 'test-key',
    model: 'global-fast-model',
    models: ['global-fast-model', 'keyword-batch-model', 'keyword-review-model'],
    enabled: true,
  });
  mocks.localDataGet.mockResolvedValue(null);
  mocks.localDataSet.mockResolvedValue(undefined);
  mocks.callLLM.mockResolvedValue('【1】 第一段译文\n【2】 第二段译文');
});

it('uses the Keyword Hunter default model from tool strategy when translating', async () => {
  const result = await fetchImmersionTranslation('First paragraph\nSecond paragraph');

  expect(result).toEqual([
    { original: 'First paragraph', translation: '第一段译文' },
    { original: 'Second paragraph', translation: '第二段译文' },
  ]);
  expect(mocks.callLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'new_api',
    'https://llm.example/v1',
    'test-key',
    'keyword-batch-model',
    expect.objectContaining({
      jsonMode: false,
      stream: true,
    })
  );
});

it('uses the Keyword Hunter Listing review default model for review reports', async () => {
  mocks.callLLM.mockResolvedValueOnce('Listing review report');

  const result = await fetchListingAnalysis(
    'Title: Waterproof travel earbuds with compact charging case and long battery life.',
    ['waterproof earbuds'],
    [{ keyword: 'waterproof earbuds', count: 1 }],
    []
  );

  expect(result).toBe('Listing review report');
  expect(mocks.callLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'new_api',
    'https://llm.example/v1',
    'test-key',
    'keyword-review-model',
    expect.objectContaining({
      jsonMode: false,
      stream: true,
    })
  );
});

it('does not read or write Keyword Hunter LLM cache when runtime cache is disabled', async () => {
  mocks.storageGet.mockImplementation((key: string, fallback?: unknown) => {
    if (key === 'llm_active_provider') return 'new_api';
    if (key === 'runtime_strategy_settings') {
      return {
        version: 1,
        keywordHunter: {
          enableLlmCache: false,
        },
      };
    }
    if (key === 'tool_strategy_settings') {
      return {
        version: 2,
        targets: {
          'keyword-hunter-seo-process': {
            defaultModelsByProvider: {
              new_api: 'keyword-batch-model',
            },
          },
        },
      };
    }
    return fallback ?? null;
  });

  await fetchImmersionTranslation('First paragraph\nSecond paragraph');

  expect(mocks.localDataGet).not.toHaveBeenCalled();
  expect(mocks.localDataSet).not.toHaveBeenCalled();
  expect(mocks.callLLM).toHaveBeenCalledTimes(1);
});
