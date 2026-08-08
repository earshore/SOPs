/**
 * reasoningPolicy 工具测试：
 * - resolveAnalysisReasoningPrefs：全局推理等级 × 证据深度 → 实际档位（真联动 + 预算封顶）
 * - getAnalysisReasoningPrefs / getUserReasoningPrefs：读取全局设置
 * - getAnalysisReasoningEffortLabel：UI 展示标签
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getAnalysisReasoningPrefs,
  getAnalysisReasoningEffortLabel,
  getUserReasoningPrefs,
  resolveAnalysisReasoningPrefs,
} from '../reasoningPolicy';

vi.mock('@/services/runtimeStrategyService', () => ({
  getRuntimeMasterAnalysisOptions: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: vi.fn(),
    getLLMConfig: vi.fn(),
  },
  STORAGE_KEYS: { LLM_ACTIVE_PROVIDER: 'llm_active_provider' },
}));

import {
  getRuntimeMasterAnalysisOptions,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import { StorageService } from '@/services/storageService';

const mockGetRuntimeMasterAnalysisOptions = vi.mocked(getRuntimeMasterAnalysisOptions);
const mockStorageGet = vi.mocked(StorageService.get);
const mockStorageGetLLMConfig = vi.mocked(StorageService.getLLMConfig);

function mockEvidence(
  depth: RuntimeStrategySettings['masterAnalysis']['evidenceDepth'] | undefined
): void {
  mockGetRuntimeMasterAnalysisOptions.mockReturnValue({
    evidenceDepth: depth,
  } as RuntimeStrategySettings['masterAnalysis']);
}

function mockGlobalReasoning(enabled: boolean, effort?: string): void {
  mockStorageGet.mockReturnValue('new_api');
  mockStorageGetLLMConfig.mockReturnValue({
    reasoningPrefs: enabled ? { enabled, effort } : { enabled: false },
  } as never);
}

describe('resolveAnalysisReasoningPrefs（真联动矩阵）', () => {
  const user = (enabled: boolean, effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max') => ({
    enabled,
    effort: enabled ? effort : null,
  });

  it('全局 off → 各深度一律 off（尊重用户）', () => {
    expect(resolveAnalysisReasoningPrefs(user(false, 'max'), 'fast')).toEqual({
      enabled: false,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(false, 'max'), 'balanced')).toEqual({
      enabled: false,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(false, 'max'), 'deep')).toEqual({
      enabled: false,
      effort: 'low',
    });
  });

  it('全局 max：fast 封顶 low、balanced 封顶 medium、deep 透传 max（真联动）', () => {
    expect(resolveAnalysisReasoningPrefs(user(true, 'max'), 'fast')).toEqual({
      enabled: true,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'max'), 'balanced')).toEqual({
      enabled: true,
      effort: 'medium',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'max'), 'deep')).toEqual({
      enabled: true,
      effort: 'max',
    });
  });

  it('低于上限的全局等级不被抬高', () => {
    expect(resolveAnalysisReasoningPrefs(user(true, 'low'), 'deep')).toEqual({
      enabled: true,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'medium'), 'fast')).toEqual({
      enabled: true,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'high'), 'balanced')).toEqual({
      enabled: true,
      effort: 'medium',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'xhigh'), 'deep')).toEqual({
      enabled: true,
      effort: 'xhigh',
    });
  });

  it('等于上限时原样透传', () => {
    expect(resolveAnalysisReasoningPrefs(user(true, 'low'), 'fast')).toEqual({
      enabled: true,
      effort: 'low',
    });
    expect(resolveAnalysisReasoningPrefs(user(true, 'medium'), 'balanced')).toEqual({
      enabled: true,
      effort: 'medium',
    });
  });
});

it('analysis reasoning resolution is read-only: never writes global settings', () => {
  mockEvidence('fast');
  mockGlobalReasoning(true, 'max');
  getAnalysisReasoningPrefs();
  // mock 未提供 StorageService.set：任何写全局推理/模型配置的行为都会直接抛错使测试失败
  expect(mockStorageGet).toHaveBeenCalled();
  expect(mockStorageGetLLMConfig).toHaveBeenCalled();
});

describe('getUserReasoningPrefs', () => {
  beforeEach(() => {
    mockStorageGet.mockReset();
    mockStorageGetLLMConfig.mockReset();
  });

  it('未配置 provider → 不推理', () => {
    mockStorageGet.mockReturnValue(null);
    expect(getUserReasoningPrefs()).toEqual({ enabled: false, effort: null });
  });

  it('全局启用 max → 返回对应等级', () => {
    mockGlobalReasoning(true, 'max');
    expect(getUserReasoningPrefs()).toEqual({ enabled: true, effort: 'max' });
  });

  it('全局关闭 → effort null', () => {
    mockGlobalReasoning(false);
    expect(getUserReasoningPrefs()).toEqual({ enabled: false, effort: null });
  });
});

describe('getAnalysisReasoningPrefs / label', () => {
  beforeEach(() => {
    mockGetRuntimeMasterAnalysisOptions.mockReset();
    mockStorageGet.mockReset();
    mockStorageGetLLMConfig.mockReset();
  });

  it('全局 off + balanced → 分析 off', () => {
    mockEvidence('balanced');
    mockGlobalReasoning(false);
    expect(getAnalysisReasoningPrefs()).toEqual({ enabled: false, effort: 'low' });
  });

  it('全局 max + fast → low；label 展示「推理低」', () => {
    mockEvidence('fast');
    mockGlobalReasoning(true, 'max');
    expect(getAnalysisReasoningPrefs()).toEqual({ enabled: true, effort: 'low' });
    expect(getAnalysisReasoningEffortLabel()).toBe('低');
  });

  it('evidenceDepth 未配置按 balanced 兜底；off 时 label 为「推理关闭」', () => {
    mockEvidence(undefined);
    mockGlobalReasoning(false);
    expect(getAnalysisReasoningPrefs()).toEqual({ enabled: false, effort: 'low' });
    expect(getAnalysisReasoningEffortLabel()).toBe('关闭');
  });
});
