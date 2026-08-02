import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  getRuntimeMasterAnalysisOptions,
} from '@/services/runtimeStrategyService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { normalizeReasoningUserPrefs } from '@/services/modelCapability/prefs';
import type { ReasoningEffortLevel } from '@/services/modelCapability/types';

const TARGET_OUTPUT_TOKEN_BUDGETS: Record<string, number> = {
  'title-keywords': 4096,
  'selling-points': 6144,
  'fatal-flaws': 8192,
  'wow-moments': 8192,
  'hesitation-points': 8192,
  'buyer-profile': 6144,
  'vocab-gap': 8192,
  'promise-reality': 6144,
};

export const MASTER_ANALYSIS_FULL_REPORT_MAX_TOKENS = 24000;
export const MASTER_ANALYSIS_TRANSLATION_MAX_TOKENS = 24000;

const MAX_REASONING_OUTPUT_TOKENS = 32000;

function getActiveReasoningEffort(): ReasoningEffortLevel | null {
  try {
    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
    if (!provider) return null;
    const config = StorageService.getLLMConfig(provider);
    const prefs = normalizeReasoningUserPrefs(config?.reasoningPrefs);
    return prefs.enabled ? prefs.effort : null;
  } catch {
    return null;
  }
}

/**
 * Reasoning models spend a large share of the output budget on thinking tokens.
 * Without headroom, max-effort runs exhaust max_tokens before the JSON answer
 * starts and the gateway returns an empty body (or a truncated answer).
 */
export function getMasterAnalysisReasoningMultiplier(): number {
  const effort = getActiveReasoningEffort();
  if (!effort) return 1;
  return effort === 'max' ? 3 : effort === 'high' || effort === 'xhigh' ? 2.5 : 2;
}

function applyReasoningHeadroom(tokens: number): number {
  const multiplier = getMasterAnalysisReasoningMultiplier();
  if (multiplier === 1) return tokens;
  return Math.min(MAX_REASONING_OUTPUT_TOKENS, Math.round(tokens * multiplier));
}

export function getMasterAnalysisTargetMaxTokens(targetId: string): number {
  const strategy = getRuntimeMasterAnalysisOptions();
  const base =
    strategy.tokenBudgetsByTarget[targetId] ||
    DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.tokenBudgetsByTarget[targetId] ||
    TARGET_OUTPUT_TOKEN_BUDGETS[targetId] ||
    8192;
  return applyReasoningHeadroom(base);
}

/**
 * Reduce-phase output budget.
 * Previously hard-capped at 4096 which truncated multi-ASIN synthesis and left optional
 * arrays/strategy fields empty even when Map evidence was rich.
 */
export function getMasterAnalysisReduceMaxTokens(targetId: string): number {
  const targetBudget = getMasterAnalysisTargetMaxTokens(targetId);
  // Allow most of the target budget for reduce synthesis, but keep a usable floor.
  return Math.max(3072, Math.min(targetBudget, Math.round(targetBudget * 0.85)));
}

export function getMasterAnalysisFullReportMaxTokens(): number {
  return getRuntimeMasterAnalysisOptions().fullReportMaxTokens;
}

export function getMasterAnalysisTranslationMaxTokens(): number {
  return getRuntimeMasterAnalysisOptions().translationMaxTokens;
}
