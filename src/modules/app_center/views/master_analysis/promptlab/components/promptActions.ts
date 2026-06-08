/**
 * Promptlab Prompt 生成动作模块
 *
 * 将 generateListingPrompt、generateVisualPrompt
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import { promptlabService } from '../../services/promptlabService';
import { showToast } from '../../../../../../common/ui';
import { computeIsReady, computeHasReport } from './computed';
import type { PromptlabAlpineContext } from './types';
import type { AnalysisReport } from '../../../../../../types/modules-business';
import type { PromptInputs } from '../../../../../../types/state';

type PromptReadinessOptions = {
  defaultMessage: string;
  missingReportMessage?: string;
  missingTargetMarketMessage: string;
};

function getPromptReadinessMessage(
  ctx: PromptlabAlpineContext,
  options: PromptReadinessOptions
): string {
  if (options.missingReportMessage && !computeHasReport()) {
    return options.missingReportMessage;
  }

  if (!ctx.profile.targetMarket) {
    return options.missingTargetMarketMessage;
  }

  if (!ctx.profile.keywordsTier1.trim()) {
    return 'Tier 1 核心大词不能为空';
  }

  if (!ctx.profile.keywordsTier2.trim()) {
    return 'Tier 2 长尾词不能为空';
  }

  return options.defaultMessage;
}

function getPromptAnalysisReport(): AnalysisReport | null {
  const analysisReport = appStore.getState().analysis.analysisReport;
  return typeof analysisReport === 'string' || !analysisReport ? null : analysisReport;
}

function createPromptInputs(ctx: PromptlabAlpineContext): PromptInputs {
  return { ...ctx.profile, useAnalysisData: true };
}

// ==========================================
// Listing Prompt 生成
// ==========================================

/**
 * 生成 Listing Prompt 并写入 ctx.listingPromptCache
 */
export function generateListingPrompt(ctx: PromptlabAlpineContext): void {
  if (!computeIsReady(ctx)) {
    showToast(getPromptReadinessMessage(ctx, {
      defaultMessage: '未就绪',
      missingReportMessage: '请先前往 [AI 分析] 模块生成竞品报告',
      missingTargetMarketMessage: '请先选择目标语言/站点 (Card 1)'
    }), { type: 'warning' });
    return;
  }

  ctx.saveState();

  ctx.listingPromptCache = promptlabService.generateMasterPrompt(
    createPromptInputs(ctx),
    getPromptAnalysisReport()
  );
  showToast('Listing Prompt 已生成', { type: 'success' });
}

// ==========================================
// Visual Prompt 生成
// ==========================================

/**
 * 生成 Visual Prompt 并写入 ctx.visualPromptCache
 */
export function generateVisualPrompt(ctx: PromptlabAlpineContext): void {
  if (!computeHasReport()) {
    showToast('请先生成 AI 分析报告以获取视觉灵感', { type: 'warning' });
    return;
  }

  if (!computeIsReady(ctx)) {
    showToast(getPromptReadinessMessage(ctx, {
      defaultMessage: '配置信息不完整',
      missingTargetMarketMessage: '请先选择目标语言/站点'
    }), { type: 'warning' });
    return;
  }

  ctx.saveState();

  ctx.visualPromptCache = promptlabService.generateVisualPrompt(
    createPromptInputs(ctx),
    getPromptAnalysisReport()
  );
  showToast('Visual Prompt 已生成', { type: 'success' });
}
