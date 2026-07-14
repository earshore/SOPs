/**
 * Promptlab Prompt 生成动作模块
 *
 * 将 generateListingPrompt、generateVisualPrompt
 * 从 PromptlabPanel.ts 中提取出来，接收显式上下文参数。
 */

import { appStore } from '@/stores/useAppStore';
import { randomBase36 } from '@/common/utils/random';
import { promptlabService } from '../../services/promptlabService';
import { HistoryService } from '../../services/historyService';
import { emitHistoryUpdated } from '../../services/historyEvents';
import { getReportFingerprint, getScrapedDataFingerprint } from '../../services/reportIdentity';
import { showToast } from '@/common/ui';
import { computeIsListingReady, computeIsReady, computeHasReport } from './computed';
import type { PromptlabAlpineContext } from './types';
import type {
  AnalysisReport,
  GeneratedPromptProfileSnapshot,
  GeneratedPromptRecord,
  GeneratedPromptType,
} from '@/types/modules-business';
import type { PromptHistoryItem, PromptInputs } from '@/types/state';

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
  return computeHasReport() && analysisReport && typeof analysisReport !== 'string'
    ? analysisReport
    : null;
}

function createPromptInputs(ctx: PromptlabAlpineContext): PromptInputs {
  return { ...ctx.profile, useAnalysisData: true };
}

function cloneProfileSnapshot(ctx: PromptlabAlpineContext): GeneratedPromptProfileSnapshot {
  return JSON.parse(JSON.stringify(ctx.profile)) as GeneratedPromptProfileSnapshot;
}

function createPromptId(type: GeneratedPromptType): string {
  return `${type}-${Date.now()}-${randomBase36(6)}`;
}

function getReportMarketplace(report: AnalysisReport | null): string | undefined {
  if (!report) {
    return undefined;
  }

  const reportRecord = report as Record<string, unknown>;
  return (
    report.market ||
    report.meta?.marketplace ||
    (typeof reportRecord.marketplace === 'string' ? reportRecord.marketplace : undefined)
  );
}

function createPromptRecord(
  ctx: PromptlabAlpineContext,
  type: GeneratedPromptType,
  prompt: string,
  analysisReport: AnalysisReport | null
): GeneratedPromptRecord {
  const state = appStore.getState();
  const scrapedData = state.scraper.scrapedData;
  const sourceDataFingerprint = getScrapedDataFingerprint(scrapedData) || undefined;
  const reportFingerprint = getReportFingerprint(analysisReport) || undefined;
  const asins =
    state.analysis.selectedAsins.length > 0
      ? [...state.analysis.selectedAsins]
      : scrapedData?.products?.map(product => product.asin) || [];

  return {
    id: createPromptId(type),
    type,
    prompt,
    generatedAt: new Date().toISOString(),
    historyId: state.scraper.currentHistoryId,
    sourceHistoryId: state.scraper.currentHistoryId,
    sourceDataFingerprint,
    reportFingerprint,
    asins,
    marketplace:
      scrapedData?.metadata?.marketplace ||
      state.scraper.selectedSite ||
      getReportMarketplace(analysisReport),
    profile: cloneProfileSnapshot(ctx),
  };
}

function createPromptHistoryItem(record: GeneratedPromptRecord): PromptHistoryItem {
  return {
    id: record.id,
    prompt: record.prompt,
    response: '',
    timestamp: new Date(record.generatedAt).getTime(),
    promptType: record.type,
    generatedAt: record.generatedAt,
    historyId: record.historyId,
    sourceHistoryId: record.sourceHistoryId,
    sourceDataFingerprint: record.sourceDataFingerprint,
    reportFingerprint: record.reportFingerprint,
    asins: record.asins,
    marketplace: record.marketplace,
    profile: record.profile,
  };
}

function isSameHistoryBinding(
  left: PromptHistoryItem['historyId'] | GeneratedPromptRecord['historyId'],
  right: PromptHistoryItem['historyId'] | GeneratedPromptRecord['historyId']
): boolean {
  if (left === null || left === undefined) {
    return right === null || right === undefined;
  }
  if (right === null || right === undefined) {
    return false;
  }
  return String(left) === String(right);
}

/**
 * 同一快照下，内容完全相同的 Prompt 不再重复写入历史（避免 Deep Chat 清单刷屏）。
 */
function hasDuplicatePromptHistory(
  type: GeneratedPromptType,
  prompt: string,
  historyId: GeneratedPromptRecord['historyId']
): boolean {
  const history = appStore.getState().promptlab.history || [];
  return history.some(
    item =>
      item.promptType === type &&
      item.prompt === prompt &&
      isSameHistoryBinding(item.historyId, historyId)
  );
}

function persistPromptRecord(
  ctx: PromptlabAlpineContext,
  type: GeneratedPromptType,
  prompt: string,
  analysisReport: AnalysisReport | null
): void {
  const record = createPromptRecord(ctx, type, prompt, analysisReport);
  const state = appStore.getState();

  state.setCurrentPrompt(prompt);

  if (hasDuplicatePromptHistory(type, prompt, record.historyId)) {
    return;
  }

  state.addPromptHistory(createPromptHistoryItem(record));

  if (record.historyId === null || record.historyId === undefined) {
    return;
  }

  void HistoryService.updatePromptResultAsync(record.historyId, record)
    .then(success => {
      if (success) {
        emitHistoryUpdated();
      }
    })
    .catch(error => {
      console.error('[Promptlab] 保存 Prompt 结果失败:', error);
    });
}

// ==========================================
// Listing Prompt 生成
// ==========================================

/**
 * 生成 Listing Prompt 并写入 ctx.listingPromptCache
 */
export function generateListingPrompt(ctx: PromptlabAlpineContext): void {
  if (!computeIsListingReady(ctx)) {
    showToast(
      getPromptReadinessMessage(ctx, {
        defaultMessage: '未就绪',
        missingTargetMarketMessage: '请先在产品 DNA 补充区域选择目标语言/站点',
      }),
      { type: 'warning' }
    );
    return;
  }

  ctx.saveState();

  const analysisReport = getPromptAnalysisReport();
  ctx.listingPromptCache = promptlabService.generateMasterPrompt(
    createPromptInputs(ctx),
    analysisReport
  );
  persistPromptRecord(ctx, 'listing', ctx.listingPromptCache, analysisReport);
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
    showToast(
      getPromptReadinessMessage(ctx, {
        defaultMessage: '配置信息不完整',
        missingTargetMarketMessage: '请先选择目标语言/站点',
      }),
      { type: 'warning' }
    );
    return;
  }

  ctx.saveState();

  const analysisReport = getPromptAnalysisReport();
  ctx.visualPromptCache = promptlabService.generateVisualPrompt(
    createPromptInputs(ctx),
    analysisReport
  );
  persistPromptRecord(ctx, 'visual', ctx.visualPromptCache, analysisReport);
  showToast('Visual Prompt 已生成', { type: 'success' });
}
