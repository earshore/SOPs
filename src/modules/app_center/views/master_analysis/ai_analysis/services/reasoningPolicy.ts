/**
 * 分析调用推理等级策略：与「用户全局推理等级」真联动，并受证据深度预算上限约束。
 *
 * 联动语义：
 * - 用户全局推理等级（系统设置）＝真实意图，分析链路必须尊重；
 * - 证据深度＝推理预算上限（cap）：fast→low、balanced→medium、deep→不封顶；
 * - 实际请求等级 ＝ min(全局等级, 深度上限)；全局 off/未配置 → 分析一律 off
 *   （与 llmService 注入语义一致：normalizeReasoningUserPrefs(undefined) → enabled:false）。
 *
 * 背景：llmService 会把全局推理偏好注入未显式传 reasoningPrefs 的分析调用；
 * 若不设上限，全局 max + 快速档会产出 30-60s+ 的无效推理流（实测单响应 817KB），
 * 且纯推理流经常挤占正文触发 PARSE_LLM_002。「真联动」兑现点是 deep 档透传全局（含 max），
 * 同时 UI 明示当前档位实际使用的推理等级。
 */

import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { normalizeReasoningUserPrefs } from '@/services/modelCapability/prefs';
import type { ReasoningEffortLevel, ReasoningUserPrefs } from '@/services/modelCapability/types';
import { getRuntimeMasterAnalysisOptions } from '@/services/runtimeStrategyService';
import type { MasterAnalysisEvidenceDepth } from '@/services/runtimeStrategyService';

/** 分析链路实际推理档位（与 LLMOptions.reasoningPrefs 同构）。off 时 effort 为占位值。 */
export type AnalysisReasoningPrefs = ReasoningUserPrefs;

/** 推理等级排序（越大推理越重）。 */
const EFFORT_RANK: Record<ReasoningEffortLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
  max: 5,
};

/** 证据深度 → 推理预算上限；undefined 表示不封顶（deep 透传全局）。 */
const DEPTH_EFFORT_CAP: Record<MasterAnalysisEvidenceDepth, ReasoningEffortLevel | undefined> = {
  fast: 'low',
  balanced: 'medium',
  deep: undefined,
};

const EFFORT_LABELS: Record<ReasoningEffortLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最高',
};

/** 读取用户全局推理偏好（系统设置）。off/未配置 → effort 为 null。 */
export function getUserReasoningPrefs(): { enabled: boolean; effort: ReasoningEffortLevel | null } {
  try {
    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
    if (!provider) return { enabled: false, effort: null };
    const config = StorageService.getLLMConfig(provider);
    const prefs = normalizeReasoningUserPrefs(config?.reasoningPrefs);
    return prefs.enabled ? { enabled: true, effort: prefs.effort } : { enabled: false, effort: null };
  } catch {
    return { enabled: false, effort: null };
  }
}

/**
 * 真联动解析：全局等级受证据深度预算上限约束。
 * 纯函数，便于单测。
 */
export function resolveAnalysisReasoningPrefs(
  user: { enabled: boolean; effort: ReasoningEffortLevel | null },
  depth: MasterAnalysisEvidenceDepth
): AnalysisReasoningPrefs {
  if (!user.enabled || !user.effort) {
    return { enabled: false, effort: 'low' };
  }
  const cap = DEPTH_EFFORT_CAP[depth];
  if (!cap) {
    return { enabled: true, effort: user.effort };
  }
  return {
    enabled: true,
    effort: EFFORT_RANK[user.effort] <= EFFORT_RANK[cap] ? user.effort : cap,
  };
}

/** 分析链路实际使用的推理等级（默认 evidenceDepth 未配置时按 balanced 兜底）。 */
export function getAnalysisReasoningPrefs(): AnalysisReasoningPrefs {
  const depth = getRuntimeMasterAnalysisOptions().evidenceDepth || 'balanced';
  return resolveAnalysisReasoningPrefs(getUserReasoningPrefs(), depth);
}

/** 实际档位的推理等级标签（供 UI 展示，如「推理低」；off 显示「推理关闭」）。 */
export function getAnalysisReasoningEffortLabel(prefs?: AnalysisReasoningPrefs): string {
  const resolved = prefs ?? getAnalysisReasoningPrefs();
  if (!resolved.enabled) return '关闭';
  return EFFORT_LABELS[resolved.effort];
}
