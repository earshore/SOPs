/**
 * LLM 输出预算（含推理档位放大）测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMasterAnalysisReduceMaxTokens,
  getMasterAnalysisTargetMaxTokens,
} from './llmOutputBudget';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

function seedProvider(model: string, reasoningPrefs?: { enabled: boolean; effort: string }): void {
  localStorageMock.setItem('llm_active_provider', JSON.stringify('new_api'));
  localStorageMock.setItem(
    'llm_new_api',
    JSON.stringify({
      provider: 'new_api',
      endpoint: 'https://example.com/v1',
      model,
      apiKey: '',
      enabled: true,
      reasoningPrefs,
    })
  );
}

describe('getMasterAnalysisTargetMaxTokens', () => {
  it('returns base budget when reasoning is disabled', () => {
    seedProvider('deepseek-v4-flash', { enabled: false, effort: 'low' });
    expect(getMasterAnalysisTargetMaxTokens('title-keywords')).toBe(4096);
    expect(getMasterAnalysisTargetMaxTokens('fatal-flaws')).toBe(8192);
  });

  it('returns base budget when no provider config exists', () => {
    expect(getMasterAnalysisTargetMaxTokens('selling-points')).toBe(6144);
  });

  it('doubles budget for low/medium effort', () => {
    seedProvider('deepseek-v4-flash', { enabled: true, effort: 'low' });
    expect(getMasterAnalysisTargetMaxTokens('title-keywords')).toBe(8192);
  });

  it('scales x2.5 for high effort', () => {
    seedProvider('deepseek-v4-flash', { enabled: true, effort: 'high' });
    expect(getMasterAnalysisTargetMaxTokens('title-keywords')).toBe(10240);
  });

  it('scales x3 for max effort and caps at 32000', () => {
    seedProvider('deepseek-v4-flash', { enabled: true, effort: 'max' });
    expect(getMasterAnalysisTargetMaxTokens('title-keywords')).toBe(12288);
    expect(getMasterAnalysisTargetMaxTokens('fatal-flaws')).toBe(24576);
  });

  it('reduce budget follows the scaled target budget', () => {
    seedProvider('deepseek-v4-flash', { enabled: true, effort: 'max' });
    const target = getMasterAnalysisTargetMaxTokens('wow-moments');
    const reduce = getMasterAnalysisReduceMaxTokens('wow-moments');
    expect(reduce).toBeGreaterThan(3072);
    expect(reduce).toBeLessThanOrEqual(target);
  });
});
