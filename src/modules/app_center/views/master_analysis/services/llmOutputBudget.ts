import {
  DEFAULT_RUNTIME_STRATEGY_SETTINGS,
  getRuntimeMasterAnalysisOptions,
} from '@/services/runtimeStrategyService';

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

export function getMasterAnalysisTargetMaxTokens(targetId: string): number {
  const strategy = getRuntimeMasterAnalysisOptions();
  return (
    strategy.tokenBudgetsByTarget[targetId] ||
    DEFAULT_RUNTIME_STRATEGY_SETTINGS.masterAnalysis.tokenBudgetsByTarget[targetId] ||
    TARGET_OUTPUT_TOKEN_BUDGETS[targetId] ||
    8192
  );
}

export function getMasterAnalysisFullReportMaxTokens(): number {
  return getRuntimeMasterAnalysisOptions().fullReportMaxTokens;
}

export function getMasterAnalysisTranslationMaxTokens(): number {
  return getRuntimeMasterAnalysisOptions().translationMaxTokens;
}
