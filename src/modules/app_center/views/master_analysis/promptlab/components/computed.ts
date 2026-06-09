/**
 * Promptlab 计算属性辅助函数
 *
 * 将 Alpine 组件中所有 getter 的计算逻辑提取为纯函数，
 * Alpine 组件中的 getter 只是薄薄的调用层。
 */

import { appStore } from '@/stores/useAppStore';
import { estimateTokenCount, formatTokenCount } from '../../ai_analysis/utils/tokenCounter';
import type { PromptlabAlpineContext } from './types';

type AnalysisReportMetadata = {
  confidence?: Record<string, number>;
  overallConfidence?: number;
};

type AnalysisReportWithMetadata = {
  _metadata?: AnalysisReportMetadata;
};

// ==========================================
// 报告状态
// ==========================================

/**
 * 当前 store 中是否有分析报告
 */
export function computeHasReport(): boolean {
  const report = appStore.getState().analysis.analysisReport;
  return !!report;
}

/**
 * Promptlab 是否满足生成 Prompt 的全部前置条件
 */
export function computeIsReady(
  ctx: Pick<PromptlabAlpineContext, 'profile'>,
): boolean {
  return (
    computeHasReport() &&
    ctx.profile.targetMarket !== '' &&
    ctx.profile.keywordsTier1.trim().length > 0 &&
    ctx.profile.keywordsTier2.trim().length > 0
  );
}

/**
 * 当前控制台模式对应的 Prompt 文本
 */
export function computeCurrentPrompt(
  ctx: Pick<
    PromptlabAlpineContext,
    'currentConsoleMode' | 'listingPromptCache' | 'visualPromptCache'
  >,
): string {
  return ctx.currentConsoleMode === 'listing'
    ? ctx.listingPromptCache
    : ctx.visualPromptCache;
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
