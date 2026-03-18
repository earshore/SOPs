/**
 * Promptlab Prompt 生成动作模块
 *
 * 将 generateListingPrompt、generateVisualPrompt
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import { promptlabService } from '../../services/promptlabService';
import { showToast } from '../../../../../../common/ui';
import { Logger } from '../../../../../../services/loggerService';
import { computeIsReady, computeHasReport } from './computed';
import type { PromptlabAlpineContext } from './types';
import type { AnalysisReport } from '../../../../../../types/modules-business';
import type { PromptInputs } from '../../../../../../types/state';

// ==========================================
// Listing Prompt 生成
// ==========================================

/**
 * 生成 Listing Prompt 并写入 ctx.listingPromptCache
 */
export function generateListingPrompt(ctx: PromptlabAlpineContext): void {
  Logger.debug('[promptActions] 🎯 生成 Listing Prompt');

  if (!computeIsReady(ctx)) {
    let msg = '未就绪';
    if (!computeHasReport())                        msg = '请先前往 [AI 分析] 模块生成竞品报告';
    else if (!ctx.profile.targetMarket)             msg = '请先选择目标语言/站点 (Card 1)';
    else if (!ctx.profile.keywordsTier1.trim())     msg = 'Tier 1 核心大词不能为空';
    else if (!ctx.profile.keywordsTier2.trim())     msg = 'Tier 2 长尾词不能为空';
    showToast(msg, { type: 'warning' });
    return;
  }

  ctx.saveState();

  const inputs: Partial<PromptInputs> = { ...ctx.profile, useAnalysisData: true };
  const analysisReport = appStore.getState().analysis.analysisReport;
  const reportToUse: AnalysisReport | null =
    typeof analysisReport === 'string' || !analysisReport ? null : analysisReport;

  ctx.listingPromptCache = promptlabService.generateMasterPrompt(inputs as any, reportToUse);
  showToast('Listing Prompt 已生成', { type: 'success' });
}

// ==========================================
// Visual Prompt 生成
// ==========================================

/**
 * 生成 Visual Prompt 并写入 ctx.visualPromptCache
 */
export function generateVisualPrompt(ctx: PromptlabAlpineContext): void {
  Logger.debug('[promptActions] 🎯 生成 Visual Prompt');

  if (!computeHasReport()) {
    showToast('请先生成 AI 分析报告以获取视觉灵感', { type: 'warning' });
    return;
  }

  if (!computeIsReady(ctx)) {
    let msg = '配置信息不完整';
    if (!ctx.profile.targetMarket)             msg = '请先选择目标语言/站点';
    else if (!ctx.profile.keywordsTier1.trim()) msg = 'Tier 1 核心大词不能为空';
    else if (!ctx.profile.keywordsTier2.trim()) msg = 'Tier 2 长尾词不能为空';
    showToast(msg, { type: 'warning' });
    return;
  }

  ctx.saveState();

  const inputs: Partial<PromptInputs> = { ...ctx.profile, useAnalysisData: true };
  const analysisReport = appStore.getState().analysis.analysisReport;
  const reportToUse: AnalysisReport | null =
    typeof analysisReport === 'string' || !analysisReport ? null : analysisReport;

  ctx.visualPromptCache = promptlabService.generateVisualPrompt(inputs as any, reportToUse);
  showToast('Visual Prompt 已生成', { type: 'success' });
}
