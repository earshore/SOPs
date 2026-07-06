import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../../config/sampleData';

const mocks = vi.hoisted(() => ({
  callLLM: vi.fn(),
  storageGet: vi.fn(),
  getLLMConfigWithKey: vi.fn(),
  configGet: vi.fn((key: string) => {
    const values: Record<string, number> = {
      'llm.analysisTimeout': 1500,
      'llm.maxRetries': 1,
    };
    return values[key];
  }),
  generateAnalysisPrompt: vi.fn(() => 'generated prompt'),
  getReviewSamplingMetadata: vi.fn(() => ({
    totalReviews: 0,
  })),
  calculateFullReportConfidence: vi.fn(() => ({
    'title-keywords': 0.8,
    'selling-points': 0.7,
  })),
  calculateOverallConfidence: vi.fn(() => 0.75),
}));

vi.mock('@/services/llmService', () => ({
  callLLM: mocks.callLLM,
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm.activeProvider',
  },
  StorageService: {
    get: mocks.storageGet,
    getLLMConfigWithKey: mocks.getLLMConfigWithKey,
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: mocks.configGet,
  },
}));

vi.mock('../../prompts/analysisPrompts', () => ({
  generateAnalysisPrompt: mocks.generateAnalysisPrompt,
  getReviewSamplingMetadata: mocks.getReviewSamplingMetadata,
}));

vi.mock('../confidenceCalculator', () => ({
  calculateFullReportConfidence: mocks.calculateFullReportConfidence,
  calculateOverallConfidence: mocks.calculateOverallConfidence,
}));

import { runAIAnalysis, validateAnalysisResult } from '../aiAnalysisService';

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

const product = {
  asin: 'B001',
  productTitle: 'Desk organizer',
  feature_bullets: ['Compact'],
  customer_reviews: [],
  scrape_status: 'success',
  metadata: {},
} as Product;

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function resetAiAnalysisMocks(): void {
  vi.clearAllMocks();
  mocks.storageGet.mockReturnValue('new_api');
  mocks.getLLMConfigWithKey.mockResolvedValue({
    endpoint: 'https://llm.example/v1',
    apiKey: 'test-key',
    model: 'gpt-test',
  });
  mocks.callLLM.mockResolvedValue(
    JSON.stringify({
      primary_keywords: [],
      secondary_keywords: [],
    })
  );
}

beforeEach(resetAiAnalysisMocks);

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('validateAnalysisResult', () => {
  it('rejects non-object analysis results', () => {
    expect(validateAnalysisResult('title-keywords', null)).toBe(false);
    expect(validateAnalysisResult('title-keywords', 'invalid')).toBe(false);
  });

  it('validates required fields for known targets', () => {
    expect(
      validateAnalysisResult('title-keywords', {
        primary_keywords: [],
        secondary_keywords: [],
      })
    ).toBe(true);

    expect(
      validateAnalysisResult('title-keywords', {
        primary_keywords: [],
      })
    ).toBe(false);

    expect(
      validateAnalysisResult('selling-points', {
        bullet_analysis: [],
        overall_strategy: {},
        function_scene_matrix: {},
      })
    ).toBe(true);
  });

  it('keeps unknown targets permissive', () => {
    expect(validateAnalysisResult('custom-target', {})).toBe(true);
  });
});

describe('runAIAnalysis configuration', () => {
  it('requires an active provider with API key and model', async () => {
    mocks.storageGet.mockReturnValueOnce(null);

    await expect(runAIAnalysis(['title-keywords'], product, vi.fn())).rejects.toThrow(
      '请先在系统设置中选择 LLM 提供商'
    );

    mocks.storageGet.mockReturnValue('new_api');
    mocks.getLLMConfigWithKey.mockResolvedValueOnce({
      endpoint: 'https://llm.example/v1',
      model: 'gpt-test',
    });
    await expect(runAIAnalysis(['title-keywords'], product, vi.fn())).rejects.toThrow(
      '所选提供商未配置 API Key'
    );

    mocks.getLLMConfigWithKey.mockResolvedValueOnce({
      endpoint: 'https://llm.example/v1',
      apiKey: 'test-key',
      models: [],
    });
    await expect(runAIAnalysis(['title-keywords'], product, vi.fn())).rejects.toThrow('未选择模型');
  });
});

describe('runAIAnalysis results', () => {
  it('runs selected targets and attaches confidence metadata', async () => {
    const onProgress = vi.fn();

    const report = await runAIAnalysis(['title-keywords'], product, onProgress, 'zh');

    expect(mocks.generateAnalysisPrompt).toHaveBeenCalledWith('title-keywords', product, 'zh');
    expect(mocks.callLLM).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'generated prompt' }),
      ]),
      'new_api',
      'https://llm.example/v1',
      'test-key',
      'gpt-test',
      {
        temperature: 0.3,
        jsonMode: true,
        maxTokens: 4096,
        stream: true,
        timeout: 1500,
        retries: 1,
      }
    );
    expect(report['title-keywords']).toEqual({
      primary_keywords: [],
      secondary_keywords: [],
    });
    expect(report._metadata).toMatchObject({
      confidence: {
        'title-keywords': 0.8,
        'selling-points': 0.7,
      },
      overallConfidence: 0.75,
      targetIds: ['title-keywords'],
      language: 'zh',
      reviewSampling: {
        totalReviews: 0,
      },
    });
    expect(onProgress).toHaveBeenCalledWith(0, '正在分析: title-keywords...');
    expect(onProgress).toHaveBeenCalledWith(100, '分析完成!');
  });

  it('starts multiple selected targets without waiting for the first model response', async () => {
    const firstResponse = createDeferred<string>();
    const secondResponse = createDeferred<string>();
    mocks.callLLM
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);

    const reportPromise = runAIAnalysis(['title-keywords', 'selling-points'], product, vi.fn());

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalledTimes(2);
    });

    firstResponse.resolve(
      JSON.stringify({
        primary_keywords: [],
        secondary_keywords: [],
      })
    );
    secondResponse.resolve(
      JSON.stringify({
        bullet_analysis: [],
        overall_strategy: {},
        function_scene_matrix: {},
      })
    );

    const report = await reportPromise;
    expect(report['title-keywords']).toEqual({
      primary_keywords: [],
      secondary_keywords: [],
    });
    expect(report['selling-points']).toEqual({
      bullet_analysis: [],
      overall_strategy: {},
      function_scene_matrix: {},
    });
  });

  it('continues with later targets when one target fails', async () => {
    const onProgress = vi.fn();
    mocks.callLLM.mockRejectedValueOnce(new Error('llm down')).mockResolvedValueOnce(
      JSON.stringify({
        bullet_analysis: [],
        overall_strategy: {},
        function_scene_matrix: {},
      })
    );

    const report = await runAIAnalysis(['title-keywords', 'selling-points'], product, onProgress);

    expect(report['title-keywords']).toBeUndefined();
    expect(report['selling-points']).toEqual({
      bullet_analysis: [],
      overall_strategy: {},
      function_scene_matrix: {},
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AIAnalysisService] [AI分析] 失败:',
      expect.any(Error)
    );
    expect(onProgress).toHaveBeenCalledWith(50, '正在分析: selling-points...');
    expect(onProgress).toHaveBeenCalledWith(100, '分析完成!');
  });
});
