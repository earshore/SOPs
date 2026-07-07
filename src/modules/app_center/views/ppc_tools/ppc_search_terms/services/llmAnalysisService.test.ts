import { beforeEach, expect, it, vi } from 'vitest';
import { analyzePpcSearchTermsWithLLM } from './llmAnalysisService';
import type { AnalyzedRow, Thresholds } from '../types';

const mocks = vi.hoisted(() => ({
  callLLM: vi.fn(),
  storageGet: vi.fn(),
  getLLMConfig: vi.fn(),
  getLLMConfigWithKey: vi.fn(),
  localDataGet: vi.fn(),
  localDataSet: vi.fn(),
  configGet: vi.fn(),
}));

vi.mock('@/services/llmService', () => ({
  callLLM: mocks.callLLM,
}));

vi.mock('@/services/storageService', () => ({
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

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    get: mocks.localDataGet,
    set: mocks.localDataSet,
    remove: vi.fn(async () => undefined),
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: mocks.configGet,
  },
}));

const thresholds: Thresholds = {
  targetAcos: 0.25,
  highAcos: 0.45,
  minClicksNoOrder: 12,
  minSpendNoOrder: 20,
  minOrdersHarvest: 2,
  minCtr: 0.003,
};

const row: AnalyzedRow = {
  id: 'row-1',
  reportType: 'search_term',
  campaign: 'Campaign A',
  adGroup: 'Ad Group A',
  searchTerm: 'desk organizer',
  keyword: 'desk organizer',
  matchType: 'broad',
  impressions: 1000,
  clicks: 20,
  spend: 30,
  sales: 80,
  orders: 3,
  ctr: 0.02,
  cvr: 0.15,
  cpc: 1.5,
  acos: 0.375,
  action: 'observe',
  actionLabel: '观察',
  reason: 'baseline',
  priority: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storageGet.mockImplementation((key: string, fallback?: unknown) => {
    if (key === 'llm_active_provider') return 'new_api';
    if (key === 'tool_strategy_settings') {
      return {
        version: 2,
        targets: {
          'ppc-tools-ppc-search-terms': {
            defaultModelsByProvider: {
              new_api: 'ppc-stable-model',
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
    models: ['global-fast-model', 'ppc-stable-model'],
    enabled: true,
  });
  mocks.getLLMConfigWithKey.mockResolvedValue({
    provider: 'new_api',
    endpoint: 'https://llm.example/v1',
    apiKey: 'test-key',
    model: 'global-fast-model',
    models: ['global-fast-model', 'ppc-stable-model'],
    enabled: true,
  });
  mocks.localDataGet.mockResolvedValue(null);
  mocks.localDataSet.mockResolvedValue(undefined);
  mocks.configGet.mockImplementation((key: string) => {
    const values: Record<string, number> = {
      'llm.analysisTimeout': 120000,
      'llm.maxRetries': 2,
    };
    return values[key];
  });
  mocks.callLLM.mockResolvedValue(
    JSON.stringify({
      decisions: [
        {
          id: 'row-1',
          action: 'observe',
          reason: 'keep watching',
          priority: 10,
        },
      ],
    })
  );
});

it('uses the PPC default model from tool strategy when calling the LLM', async () => {
  const decisions = await analyzePpcSearchTermsWithLLM({
    rows: [row],
    thresholds,
  });

  expect(decisions).toEqual([
    {
      id: 'row-1',
      action: 'observe',
      reason: 'keep watching',
      priority: 10,
    },
  ]);
  expect(mocks.callLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'new_api',
    'https://llm.example/v1',
    'test-key',
    'ppc-stable-model',
    expect.objectContaining({
      jsonMode: true,
      stream: true,
    })
  );
});
