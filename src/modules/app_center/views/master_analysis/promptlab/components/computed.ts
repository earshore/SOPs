/**
 * Promptlab 计算属性辅助函数
 *
 * 将 Alpine 组件中所有 getter 的计算逻辑提取为纯函数，
 * Alpine 组件中的 getter 只是薄薄的调用层。
 */

import { appStore } from '@/stores/useAppStore';

import { estimateTokenCount, formatTokenCount } from '../../ai_analysis/utils/tokenCounter';

import type { PromptlabAlpineContext } from './types';

type ReportRecord = Record<string, unknown>;

type AnalysisReportMetadata = {
  confidence?: Record<string, number>;
  overallConfidence?: number;
};

type AnalysisReportWithMetadata = {
  _metadata?: AnalysisReportMetadata;
};

const SUPPORTED_TARGET_IDS = [
  'title-keywords',
  'title_keywords',
  'title_seo_roots',
  'selling-points',
  'selling_points',
  'selling_proposition_deconstruction',
  'fatal-flaws',
  'fatal_flaws',
  'neg_deal_breakers',
  'wow-moments',
  'wow_moments',
  'pos_aha_moments',
  'hesitation-points',
  'hesitation_points',
  'buying_hesitations',
  'buyer-profile',
  'buyer_profile',
  'user_avatar_context',
  'vocab-gap',
  'vocab_gap',
  'vocabulary_gap',
  'promise-reality',
  'promise_reality',
  'promise_reality_check',
];

const LEGACY_PROMPT_REPORT_KEYS = ['target_audience', 'key_features'];

const DOWNLOAD_REPORT_REQUIREMENTS = [
  [
    ['competitor_insights', 'competitorInsights'],
    ['feature_points', 'featurePoints'],
    ['keyword_clusters', 'keywordClusters'],
  ],
  [
    ['productOverview', 'product_overview'],
    ['user_profile', 'userProfile'],
    ['coreFeatures', 'core_features'],
  ],
  [['pain_point_gaps'], ['native_voice'], ['high_frequency_phrases']],
];

function toReportRecord(value: unknown): ReportRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ReportRecord)
    : null;
}

function unwrapAnalysisReport(report: unknown): ReportRecord | null {
  const root = toReportRecord(report);
  if (!root) return null;

  const nestedReport = toReportRecord(root.analysisReport);
  return nestedReport || root;
}

function hasReportContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasReportContent);
  if (typeof value === 'object') {
    return Object.values(value as ReportRecord).some(hasReportContent);
  }
  return true;
}

function hasSupportedTargetContent(report: ReportRecord): boolean {
  return SUPPORTED_TARGET_IDS.some(targetId => hasReportContent(report[targetId]));
}

function hasLegacyPromptReportContent(report: ReportRecord): boolean {
  return LEGACY_PROMPT_REPORT_KEYS.some(key => hasReportContent(report[key]));
}

function hasAnyReportField(report: ReportRecord, keys: string[]): boolean {
  return keys.some(key => hasReportContent(report[key]));
}

function hasDownloadReportContent(report: ReportRecord): boolean {
  return DOWNLOAD_REPORT_REQUIREMENTS.some(requirements => {
    return requirements.every(aliases => hasAnyReportField(report, aliases));
  });
}

export function getUsableAnalysisReport(
  report: unknown = appStore.getState().analysis.analysisReport
): ReportRecord | null {
  const unwrapped = unwrapAnalysisReport(report);
  if (!unwrapped) return null;

  return hasSupportedTargetContent(unwrapped) ||
    hasLegacyPromptReportContent(unwrapped) ||
    hasDownloadReportContent(unwrapped)
    ? unwrapped
    : null;
}

// ==========================================
// 报告状态
// ==========================================

/**
 * 当前 store 中是否有分析报告
 */
export function computeHasReport(): boolean {
  return !!getUsableAnalysisReport();
}

/**
 * Listing Prompt 是否满足生成所需的手动输入前置条件。
 */
export function computeIsListingReady(ctx: Pick<PromptlabAlpineContext, 'profile'>): boolean {
  return (
    ctx.profile.targetMarket !== '' &&
    ctx.profile.keywordsTier1.trim().length > 0 &&
    ctx.profile.keywordsTier2.trim().length > 0
  );
}

/**
 * Visual Prompt 依赖竞品报告来提取视觉洞察。
 */
export function computeIsVisualReady(ctx: Pick<PromptlabAlpineContext, 'profile'>): boolean {
  return computeHasReport() && computeIsListingReady(ctx);
}

/**
 * Promptlab 旧入口的通用就绪判断。
 * 保留报告依赖语义，供 Visual Prompt 和旧调用方使用。
 */
export function computeIsReady(ctx: Pick<PromptlabAlpineContext, 'profile'>): boolean {
  return computeIsVisualReady(ctx);
}

/**
 * 当前控制台模式对应的 Prompt 文本
 */
export function computeCurrentPrompt(
  ctx: Pick<
    PromptlabAlpineContext,
    'currentConsoleMode' | 'listingPromptCache' | 'visualPromptCache'
  >
): string {
  return ctx.currentConsoleMode === 'listing' ? ctx.listingPromptCache : ctx.visualPromptCache;
}

// ==========================================
// Token 计数
// ==========================================

export function computeTokenCount(prompt: string): number {
  return estimateTokenCount(prompt);
}

export function computeFormattedTokenCount(prompt: string): string {
  return formatTokenCount(computeTokenCount(prompt));
}

export function computeIsOverLimit(prompt: string, charLimit: number): boolean {
  return computeTokenCount(prompt) > charLimit;
}

// ==========================================
// 置信度
// ==========================================

/**
 * 从 store 中读取报告置信度对象（各分析目标的置信度 map）
 */
export function computeReportConfidence(): Record<string, number> | null {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') {
    return null;
  }
  const reportObj = report as AnalysisReportWithMetadata;
  if (!reportObj._metadata) {
    return null;
  }
  return reportObj._metadata.confidence ?? null;
}

/**
 * 从 store 中读取整体置信度（0 ~ 1 小数）
 */
export function computeOverallConfidence(): number {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') return 0;
  const reportObj = report as AnalysisReportWithMetadata;
  if (!reportObj._metadata) return 0;
  return reportObj._metadata.overallConfidence ?? 0;
}

/**
 * 指定分析目标的置信度百分比（0 ~ 100）
 */
export function getTargetConfidence(targetId: string): number {
  const confidence = computeReportConfidence();
  if (!confidence || !confidence[targetId]) return 0;
  return Math.round(confidence[targetId] * 100);
}

// ==========================================
// 置信度展示工具
// ==========================================

export function getConfidenceColorClass(percent: number): string {
  if (percent >= 70) return 'bg-green-100 text-green-700 border-green-300';
  if (percent >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-orange-100 text-orange-700 border-orange-300';
}

export function getConfidenceLevel(percent: number): string {
  if (percent >= 70) return '高';
  if (percent >= 50) return '中';
  return '低';
}

export function getConfidenceAriaLabel(percent: number): string {
  return `置信度: ${percent}%, 等级: ${getConfidenceLevel(percent)}`;
}
