/**
 * AI 分析工作量与耗时估算工具。
 *
 * 工作量：按目标拆分 LLM 调用次数（oneshot=1；map-reduce=分片数 + 1 次 reduce）。
 * 耗时模型：总调用 ÷ 有效并发 × 每调用基准耗时（按实际推理档位）× 规模系数 × 缓冲。
 * 估算结果以区间（下限-上限）展示，避免把不确定值说死。
 */

import type { Product } from '../config/sampleData';
import type { MasterAnalysisEvidenceDepth } from '@/services/runtimeStrategyService';
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
 * evidenceDepth 缺省时按运行时当前档位（与执行一致），
 * 传入档位时用于「选项预览」——展示选择该档位后的真实分片成本。
 */
export function estimateAnalysisWorkload(
  product: Product,
  selectedTargets: string[],
  evidenceDepth?: MasterAnalysisEvidenceDepth
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
      const maps = estimateReviewMapCalls(product, targetId, evidenceDepth);
      const usesReduce = shouldUseReviewMapReduce(product, targetId, evidenceDepth);
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
  /** 选项档位：估算所用分片预算/阈值；缺省 = 运行时当前档位（与执行一致） */
  evidenceDepth?: MasterAnalysisEvidenceDepth;
}

export interface AnalysisTimeEstimate {
  secondsLow: number;
  secondsHigh: number;
  callCount: number;
  label: string;
}

/**
 * 每调用基准耗时（秒）：按实际推理档位，保守校准值。
 * 校准依据（2026-08 实测）：
 * - off 档：Deep Chat 单次回复实测约 20s（含中转），取 14s 保守下限；
 * - low 档：AI 分析快速档全链路实测 ~128s，按调用数/并发反推单调用 ~36s；
 * - 其余档位按 low 的偏移比例上修（高推理档位首 token 延迟占比更高，但分片可并行）。
 * 估算定位为「测算区间」而非承诺，展示仅用于 toast 提示。
 */
const PER_CALL_SECONDS: Record<ReasoningEffortLevel | 'off', number> = {
  off: 14,
  low: 36,
  medium: 55,
  high: 100,
  xhigh: 150,
  max: 200,
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
    return secondsLow === secondsHigh
      ? `约 ${secondsLow} 秒`
      : `约 ${secondsLow}-${secondsHigh} 秒`;
  }
  const lowMin = Math.max(1, Math.ceil(secondsLow / 60));
  const highMin = Math.max(lowMin, Math.ceil(secondsHigh / 60));
  return lowMin === highMin ? `约 ${lowMin} 分钟` : `约 ${lowMin}-${highMin} 分钟`;
}

/** 估算缓冲系数：与 estimateAnalysisTime 同源。 */
const ESTIMATE_BUFFER = 1.15;

/**
 * 大 prompt 工具场景（如 Keyword Hunter 单次评审）额外保守系数。
 * 校准依据：KH 实测单次评审 ~60s vs off 档基准 14s×1.15≈16s → 比值约 3.75，取 3。
 */
const TOOL_SCALE_FACTOR = 3;

/**
 * 估算分析总耗时。
 * wall = ceil(未缓存调用数 / 有效并发) × 每调用基准 × 规模系数 × ESTIMATE_BUFFER；
 * 输出区间：low = 0.8×wall，high = 1.3×wall。
 */
export function estimateAnalysisTime(input: AnalysisTimeEstimateInput): AnalysisTimeEstimate {
  const {
    targetIds,
    product,
    maxConcurrency,
    cachedTargetIds,
    estimatedInputTokens,
    reasoning,
    evidenceDepth,
  } = input;
  const workload = estimateAnalysisWorkload(product, targetIds, evidenceDepth);
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
    ESTIMATE_BUFFER;

  const secondsLow = Math.max(1, Math.round(wallSeconds * 0.8));
  const secondsHigh = Math.max(secondsLow, Math.round(wallSeconds * 1.3));
  return {
    secondsLow,
    secondsHigh,
    callCount,
    label: formatDurationLabel(secondsLow, secondsHigh),
  };
}

export interface SingleCallEstimateOptions {
  /** 大 prompt 工具场景（如 Keyword Hunter 评审）：额外保守系数，避免低估。 */
  toolScale?: boolean;
}

/**
 * 单次调用耗时估算（供工具场景 toast 同源使用，如 Keyword Hunter 评审）。
 * wall = 每调用基准 × 缓冲（× 工具系数）；区间与 estimateAnalysisTime 同口径（0.8~1.3）。
 */
export function estimateSingleCallTime(
  reasoning: AnalysisReasoningPrefs,
  options: SingleCallEstimateOptions = {}
): AnalysisTimeEstimate {
  const scale = options.toolScale ? TOOL_SCALE_FACTOR : 1;
  const wallSeconds = resolvePerCallSeconds(reasoning) * ESTIMATE_BUFFER * scale;
  const secondsLow = Math.max(1, Math.round(wallSeconds * 0.8));
  const secondsHigh = Math.max(secondsLow, Math.round(wallSeconds * 1.3));
  return {
    secondsLow,
    secondsHigh,
    callCount: 1,
    label: formatDurationLabel(secondsLow, secondsHigh),
  };
}
