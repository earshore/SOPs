/**
 * AI 分析工作量与耗时估算工具。
 *
 * 工作量：按目标拆分 LLM 调用次数（oneshot=1；map-reduce=分片数 + 1 次 reduce）。
 * 耗时模型：总调用 ÷ 有效并发 × 每调用基准耗时（按实际推理档位）× 规模系数 × 缓冲。
 * 估算结果以区间（下限-上限）展示，避免把不确定值说死。
 */

import type { Product } from '../config/sampleData';
import {
  buildReviewSourcePack,
  estimateReviewMapCalls,
  isReviewEvidenceTargetId,
  shouldUseReviewMapReduce,
} from './reviewEvidencePipeline';
import {
  buildSellingPointsSourcePack,
  shouldUseSellingPointsMapReduce,
} from './sellingPointsPipeline';
import type { AnalysisReasoningPrefs } from './reasoningPolicy';
import type { ReasoningEffortLevel } from '@/services/modelCapability/types';

export interface AnalysisWorkloadEstimate {
  /** 分片/单次调用数（oneshot=1，map-reduce=map 分片数）。 */
  mapCalls: number;
  /** map-reduce 目标的 reduce 调用数。 */
  reduceCalls: number;
  /** 证据清洗量（去重/空/预算裁剪），仅供提示。 */
  hygieneHits: number;
  /** 每个目标的 LLM 调用数（含 reduce）。 */
  callsByTarget: Record<string, number>;
}

/**
 * 估算各分析目标需要的模型调用次数。
 * 与 actions.ts 的 toast 口径一致（mapCalls 为分片数），并补充 reduce 与逐目标明细。
 */
export function estimateAnalysisWorkload(
  product: Product,
  selectedTargets: string[]
): AnalysisWorkloadEstimate {
  let mapCalls = 0;
  let reduceCalls = 0;
  let hygieneHits = 0;
  const callsByTarget: Record<string, number> = {};

  for (const targetId of selectedTargets) {
    if (targetId === 'selling-points') {
      const pack = buildSellingPointsSourcePack(product);
      hygieneHits +=
        pack.dedupe.duplicatesRemoved + pack.dedupe.emptyRemoved + pack.budget.omittedByBudget;
      if (shouldUseSellingPointsMapReduce(product)) {
        const maps = Math.max(1, Math.ceil(pack.bulletCount / 8));
        mapCalls += maps;
        reduceCalls += 1;
        callsByTarget[targetId] = maps + 1;
      } else {
        mapCalls += 1;
        callsByTarget[targetId] = 1;
      }
      continue;
    }
    if (isReviewEvidenceTargetId(targetId)) {
      const pack = buildReviewSourcePack(product, targetId);
      hygieneHits +=
        pack.dedupe.duplicatesRemoved + pack.dedupe.emptyRemoved + pack.budget.omittedByBudget;
      const maps = estimateReviewMapCalls(product, targetId);
      const usesReduce = shouldUseReviewMapReduce(product, targetId);
      mapCalls += maps;
      if (usesReduce) {
        reduceCalls += 1;
        callsByTarget[targetId] = maps + 1;
      } else {
        callsByTarget[targetId] = maps || 1;
      }
      continue;
    }
    mapCalls += 1;
    callsByTarget[targetId] = 1;
  }

  return { mapCalls, reduceCalls, hygieneHits, callsByTarget };
}

export interface AnalysisTimeEstimateInput {
  targetIds: string[];
  product: Product;
  /** 调度并发上限（schedulePlan.maxConcurrency）。 */
  maxConcurrency: number;
  /** 缓存命中的目标（不发起模型调用）。 */
  cachedTargetIds: string[];
  /** 预计输入 token 量（schedulePlan.estimatedInputTokens）。 */
  estimatedInputTokens: number;
  /** 映射后的实际推理档位（真联动结果）。 */
  reasoning: AnalysisReasoningPrefs;
}

export interface AnalysisTimeEstimate {
  secondsLow: number;
  secondsHigh: number;
  callCount: number;
  label: string;
}

/** 每调用基准耗时（秒）：按实际推理档位，基于本次实测校准（off 档并发下约 4-8s/调用）。 */
const PER_CALL_SECONDS: Record<ReasoningEffortLevel | 'off', number> = {
  off: 6,
  low: 12,
  medium: 25,
  high: 45,
  xhigh: 70,
  max: 100,
};

/** 输入规模系数：大 prompt（多 ASIN / 多评论）单调用更慢。 */
function resolveSizeFactor(estimatedInputTokens: number): number {
  if (estimatedInputTokens > 12000) return 1.3;
  if (estimatedInputTokens > 6000) return 1.15;
  return 1;
}

function resolvePerCallSeconds(reasoning: AnalysisReasoningPrefs): number {
  const key = reasoning.enabled ? reasoning.effort : 'off';
  return PER_CALL_SECONDS[key] ?? PER_CALL_SECONDS.off;
}

function formatDurationLabel(secondsLow: number, secondsHigh: number): string {
  if (secondsHigh < 60) {
    return `约 ${secondsLow}-${secondsHigh} 秒`;
  }
  const lowMin = Math.max(1, Math.ceil(secondsLow / 60));
  const highMin = Math.max(lowMin, Math.ceil(secondsHigh / 60));
  return lowMin === highMin ? `约 ${lowMin} 分钟` : `约 ${lowMin}-${highMin} 分钟`;
}

/**
 * 估算分析总耗时。
 * wall = ceil(未缓存调用数 / 有效并发) × 每调用基准 × 规模系数 × 1.15 缓冲；
 * 输出区间：low = 0.8×wall，high = 1.3×wall。
 */
export function estimateAnalysisTime(input: AnalysisTimeEstimateInput): AnalysisTimeEstimate {
  const { targetIds, product, maxConcurrency, cachedTargetIds, estimatedInputTokens, reasoning } =
    input;
  const workload = estimateAnalysisWorkload(product, targetIds);
  const cachedSet = new Set(cachedTargetIds);

  let callCount = 0;
  let uncachedTargetCount = 0;
  for (const targetId of targetIds) {
    if (cachedSet.has(targetId)) continue;
    callCount += workload.callsByTarget[targetId] ?? 1;
    uncachedTargetCount += 1;
  }

  const effectiveConcurrency = Math.max(1, Math.min(maxConcurrency, uncachedTargetCount));
  const perCallSeconds = resolvePerCallSeconds(reasoning);
  const wallSeconds =
    Math.ceil(callCount / effectiveConcurrency) *
    perCallSeconds *
    resolveSizeFactor(estimatedInputTokens) *
    1.15;

  const secondsLow = Math.max(1, Math.round(wallSeconds * 0.8));
  const secondsHigh = Math.max(secondsLow, Math.round(wallSeconds * 1.3));
  return {
    secondsLow,
    secondsHigh,
    callCount,
    label: formatDurationLabel(secondsLow, secondsHigh),
  };
}
