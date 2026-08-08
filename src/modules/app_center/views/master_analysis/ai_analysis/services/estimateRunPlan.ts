/**
 * 分析估算统一入口：下拉「证据深度」选项与「开始分析」toast 共用同一套
 * 计划源（并发/缓存/token 来自 resolveAnalysisSchedulePlan），避免两处
 * 口径不一致（此前 UI 硬编码基础并发/0 token，导致「快速 1-3 分钟」vs
 * 实际 8-15 分钟的期望落差）。
 */

import type { Product } from '../config/sampleData';
import type { MasterAnalysisEvidenceDepth } from '@/services/runtimeStrategyService';
import {
  resolveAnalysisSchedulePlan,
  type AnalysisRuntimeSchedulePlan,
  type SchedulingPreference,
} from './analysisScheduler';
import { estimateAnalysisTime, type AnalysisTimeEstimate } from './analysisTimeEstimator';
import {
  getUserReasoningPrefs,
  resolveAnalysisReasoningPrefs,
  type AnalysisReasoningPrefs,
} from './reasoningPolicy';

export interface EstimateRunAtDepthInput {
  product: Product;
  targetIds: string[];
  /** 调度偏好（默认 recommended）；与真实执行同源 */
  schedulingPreference?: SchedulingPreference;
  enableCache?: boolean;
  cachedTargetIds?: string[];
  /** 缺省时读全局设置（系统设置推理等级） */
  userReasoning?: {
    enabled: boolean;
    effort: import('@/services/modelCapability/types').ReasoningEffortLevel | null;
  };
}

export interface EstimateRunAtDepthResult {
  depth: MasterAnalysisEvidenceDepth;
  reasoning: AnalysisReasoningPrefs;
  estimate: AnalysisTimeEstimate;
  plan: AnalysisRuntimeSchedulePlan;
}

/**
 * 按给定档位估算一次运行的完整成本。深度参数只影响「估算」：
 * 分片预算/阈值/推理档位均按该档位解析；执行路径仍读运行时设置。
 */
export function estimateRunAtDepth(
  input: EstimateRunAtDepthInput,
  depth: MasterAnalysisEvidenceDepth
): EstimateRunAtDepthResult {
  const plan = resolveAnalysisSchedulePlan({
    preference: input.schedulingPreference,
    targetIds: input.targetIds,
    product: input.product,
    enableCache: input.enableCache,
    cachedTargetIds: input.cachedTargetIds,
  });

  const reasoning = resolveAnalysisReasoningPrefs(
    input.userReasoning ?? getUserReasoningPrefs(),
    depth
  );

  return {
    depth,
    reasoning,
    plan,
    estimate: estimateAnalysisTime({
      targetIds: input.targetIds,
      product: input.product,
      maxConcurrency: plan.maxConcurrency,
      cachedTargetIds: plan.cachedTargetIds,
      estimatedInputTokens: plan.estimatedInputTokens,
      reasoning,
      evidenceDepth: depth,
    }),
  };
}
