import { copyTextToClipboard } from '@/common/utils/clipboard';
import { downloadJson as downloadJsonFile } from '@/common/utils/download';

/**
 * Alpine 组件用户动作
 * 处理所有用户交互操作
 */

import { showToast } from '@/common/ui/index';
import { showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { analysisTargets } from '../config/analysisTargets';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { parseAnalysisReport } from '../services/analysisService';
import {
  getCachedAnalysisResults,
  type ParallelAnalysisResultUpdate,
  runParallelAIAnalysis,
} from '../services/parallelAnalysisService';
import { resolveAnalysisSchedulePlan } from '../services/analysisScheduler';
import { generateMarkdownReport, generateJsonReportData } from '../services/reportGenerator';
import { mergeProducts, getProductsByAsins } from '../utils/dataTransformers';
import { getMarketLanguage } from './helpers';
import type { Product } from '../config/sampleData';
import type { AlpineContext, FullReportData } from '../types';
import { appStore } from '@/stores/useAppStore';
import type { FullAnalysisReport } from '../config/analysisReportData';
import type { AnalysisReport } from '@/types/modules-business';
import { BusinessError } from '@/common/errors/AppError';
import { getPerformanceSettings } from './PerformanceSettings';
import { emitHistoryUpdated } from '../../services/historyEvents';
import { getScrapedDataFingerprint } from '../../services/reportIdentity';

type AnalysisSchedulePlan = ReturnType<typeof resolveAnalysisSchedulePlan>;
type PerformanceSettings = ReturnType<typeof getPerformanceSettings>;

interface PreparedAnalysisRun {
  selectedTargets: string[];
  sourceBinding: AnalysisSourceBinding;
  mergedProduct: Product;
  language: string;
  perfSettings: PerformanceSettings;
  preloadedCachedResults: Record<string, unknown>;
  schedulePlan: AnalysisSchedulePlan;
  streamResults: boolean;
}

/**
 * 切换 ASIN 选择
 */
export function toggleAsin(context: AlpineContext, asin: string): void {
  const index = context.selectedAsins.indexOf(asin);
  if (index > -1) {
    context.selectedAsins.splice(index, 1);
  } else {
    context.selectedAsins.push(asin);
  }
  // 直接更新 Zustand store
  appStore.getState().setSelectedAsins([...context.selectedAsins]);
  clearReportForAnalysisInputChange(context);
}

/**
 * 全选 ASIN
 */
export function selectAllAsins(context: AlpineContext, availableAsins: string[]): void {
  context.selectedAsins = [...availableAsins];
  appStore.getState().setSelectedAsins(context.selectedAsins);
  clearReportForAnalysisInputChange(context);
}

/**
 * 清空 ASIN 选择
 */
export function clearAllAsins(context: AlpineContext): void {
  context.selectedAsins = [];
  appStore.getState().setSelectedAsins([]);
  clearReportForAnalysisInputChange(context);
}

/**
 * 切换分析目标
 */
export function toggleTarget(context: AlpineContext, targetId: string): void {
  const index = context.selectedTargets.indexOf(targetId);
  if (index > -1) {
    context.selectedTargets.splice(index, 1);
  } else {
    context.selectedTargets.push(targetId);
  }
}

/**
 * 全选分析目标
 */
export function selectAllTargets(context: AlpineContext): void {
  context.selectedTargets = analysisTargets.map(t => t.id);
}

/**
 * 清空分析目标
 */
export function clearAllTargets(context: AlpineContext): void {
  context.selectedTargets = [];
}

/**
 * 切换提示词面板
 */
export function togglePromptPanel(context: AlpineContext): void {
  context.showPromptPanel = !context.showPromptPanel;
}

/**
 * 切换提示词项
 */
export function togglePromptItem(context: AlpineContext, index: number): void {
  context.expandedPromptIndex = context.expandedPromptIndex === index ? null : index;
}

/**
 * 切换 JSON 查看器
 */
export function toggleJsonViewer(context: AlpineContext): void {
  context.showJsonViewer = !context.showJsonViewer;
}

/**
 * 复制提示词
 */
export function copyPrompt(
  context: AlpineContext,
  currentProducts: Product[],
  index: number
): void {
  if (currentProducts.length === 0) return;

  const targetId = context.selectedTargets[index];
  if (!targetId) return;

  // 如果有多个产品，合并后生成提示词
  const mergedProduct =
    currentProducts.length > 1 ? mergeProducts(currentProducts) : currentProducts[0];
  if (!mergedProduct) return;

  // 获取正确的语言代码
  const language = getMarketLanguage();
  const prompt = generateAnalysisPrompt(targetId, mergedProduct, language);

  void copyTextToClipboard(prompt)
    .then(ok => {
      if (!ok) {
        showToast('复制失败', { type: 'error' });
        return;
      }
      showToast('提示词已复制', { type: 'success' });
    })
    .catch(() => {
      showToast('复制失败', { type: 'error' });
    });
}

function createJsonReportData(
  context: AlpineContext,
  dataSourceMarketplace: string
): FullReportData {
  return generateJsonReportData(
    context.selectedAsins,
    context.selectedTargets,
    context.dataSource,
    dataSourceMarketplace,
    context.analysisReport
  );
}

/**
 * 复制 JSON 报告
 */
export function copyJson(context: AlpineContext, dataSourceMarketplace: string): void {
  if (!context.analysisReport) return;

  const reportData = createJsonReportData(context, dataSourceMarketplace);
  const json = JSON.stringify(reportData, null, 2);
  void copyTextToClipboard(json)
    .then(ok => {
      if (!ok) {
        showToast('复制失败', { type: 'error' });
        return;
      }
      showToast('完整 JSON 报告已复制', { type: 'success' });
    })
    .catch(() => {
      showToast('复制失败', { type: 'error' });
    });
}

/**
 * 复制 Markdown 报告
 */
export function copyMarkdown(
  context: AlpineContext,
  dataSourceMarketplace: string,
  dataSourceLabel: string
): void {
  if (!context.analysisReport) {
    showToast('没有可复制的报告', { type: 'warning' });
    return;
  }

  // 实时解析报告为展示格式
  const results = parseAnalysisReport(
    context.analysisReport as FullAnalysisReport,
    context.selectedTargets
  );

  const markdown = generateMarkdownReport(
    results,
    context.selectedAsins,
    dataSourceMarketplace,
    dataSourceLabel
  );

  void copyTextToClipboard(markdown)
    .then(ok => {
      if (!ok) {
        showToast('复制失败', { type: 'error' });
        return;
      }
      showToast('Markdown 报告已复制', { type: 'success' });
    })
    .catch(() => {
      showToast('复制失败', { type: 'error' });
    });
}

/**
 * 下载 JSON 报告
 */
export function downloadJson(context: AlpineContext, dataSourceMarketplace: string): void {
  if (!context.analysisReport) {
    showToast('没有可下载的报告', { type: 'warning' });
    return;
  }

  const reportData = createJsonReportData(context, dataSourceMarketplace);
  downloadJsonFile(
    `analysis-report-${context.selectedAsins.join('-')}-${Date.now()}.json`,
    reportData
  );

  showToast('JSON 报告已下载', { type: 'success' });
}

function syncAnalysisReport(context: AlpineContext, report: FullAnalysisReport | null): void {
  context.analysisReport = report;
  context.hasReport = !!report;
  appStore.getState().setAnalysisReport(report as AnalysisReport | null);
}

interface AnalysisSourceBinding {
  sourceHistoryId: string | number | null;
  sourceDataFingerprint: string | null;
  sourceAsins: string[];
  sourceTargets: string[];
}

function createAnalysisSourceBinding(context: AlpineContext): AnalysisSourceBinding {
  const state = appStore.getState();
  return {
    sourceHistoryId: state.scraper?.currentHistoryId ?? null,
    sourceDataFingerprint: getScrapedDataFingerprint(state.scraper?.scrapedData),
    sourceAsins: [...context.selectedAsins],
    sourceTargets: [...context.selectedTargets],
  };
}

function isCurrentAnalysisSource(binding: AnalysisSourceBinding): boolean {
  const state = appStore.getState();
  return (
    (state.scraper?.currentHistoryId ?? null) === binding.sourceHistoryId &&
    getScrapedDataFingerprint(state.scraper?.scrapedData) === binding.sourceDataFingerprint
  );
}

function withAnalysisSourceBinding(
  report: FullAnalysisReport,
  binding: AnalysisSourceBinding,
  language: string
): FullAnalysisReport {
  return {
    ...report,
    _metadata: {
      ...report._metadata,
      confidence: report._metadata?.confidence || {},
      overallConfidence: report._metadata?.overallConfidence || 0,
      analyzedAt: report._metadata?.analyzedAt || new Date().toISOString(),
      targetIds: report._metadata?.targetIds || binding.sourceTargets,
      language: report._metadata?.language || language,
      sourceHistoryId: binding.sourceHistoryId,
      sourceDataFingerprint: binding.sourceDataFingerprint || undefined,
      sourceAsins: [...binding.sourceAsins],
    },
  };
}

async function persistAnalysisReportToSource(
  binding: AnalysisSourceBinding,
  analysisReport: FullAnalysisReport
): Promise<void> {
  if (!binding.sourceHistoryId) {
    return;
  }

  const { HistoryService } = await import('../../services/historyService');
  const success = await HistoryService.updateAnalysisStatusAsync(
    binding.sourceHistoryId,
    analysisReport as AnalysisReport,
    binding
  );

  if (success) {
    emitHistoryUpdated();
  }
}

function resetAnalysisReport(context: AlpineContext): void {
  syncAnalysisReport(context, null);
}

function clearReportForAnalysisInputChange(context: AlpineContext): void {
  if (!context.analysisReport && !appStore.getState().analysis?.analysisReport) {
    return;
  }

  resetAnalysisReport(context);
  appStore.getState().setTranslatedReport(null);
}

function syncAnalysisProgress(context: AlpineContext, progress: number, currentStep: string): void {
  context.progress = progress;
  context.currentStep = currentStep;
  appStore.getState().updateAnalysis({ progress, currentStep });
}

function shouldSkipAnalysisAction(context: AlpineContext, currentProducts: Product[]): boolean {
  return (
    context.selectedTargets.length === 0 || currentProducts.length === 0 || context.isAnalyzing
  );
}

function startAnalysisAction(context: AlpineContext): void {
  context.isAnalyzing = true;
  syncAnalysisProgress(context, 0, '正在准备分析...');
  resetAnalysisReport(context);
  appStore.getState().updateAnalysis({ isAnalyzing: true });
}

function finishAnalysisAction(context: AlpineContext): void {
  context.isAnalyzing = false;
  appStore.getState().updateAnalysis({ isAnalyzing: false });
}

function getProductsForAnalysis(context: AlpineContext): Product[] {
  const products = getRealProducts(context.selectedAsins);
  if (products.length > 0) {
    return products;
  }

  throw new BusinessError(
    '无法获取产品数据,请确保已从数据采集或数据管理导入数据',
    'AI_ACTIONS_001',
    {
      module: 'AIAnalysisActions',
      action: 'runAnalysisAction',
      selectedAsins: context.selectedAsins,
    }
  );
}

async function prepareAnalysisRun(
  context: AlpineContext,
  selectedTargets: string[],
  sourceBinding: AnalysisSourceBinding
): Promise<PreparedAnalysisRun> {
  const products = getProductsForAnalysis(context);
  showToast(`正在调用 AI 分析 ${products.length} 个产品...`, { type: 'info' });

  const mergedProduct = mergeProducts(products);
  const language = getMarketLanguage();
  const perfSettings = getPerformanceSettings();
  const preloadedCachedResults = await getCachedAnalysisResults(
    selectedTargets,
    mergedProduct,
    language,
    perfSettings.enableCache
  );
  const schedulePlan = resolveAnalysisSchedulePlan({
    preference: perfSettings.schedulingPreference,
    targetIds: selectedTargets,
    product: mergedProduct,
    language,
    enableCache: perfSettings.enableCache,
    cachedTargetIds: Object.keys(preloadedCachedResults),
  });

  return {
    selectedTargets,
    sourceBinding,
    mergedProduct,
    language,
    perfSettings,
    preloadedCachedResults,
    schedulePlan,
    streamResults: schedulePlan.streamMode === 'progressive',
  };
}

function createStreamingReportHandler(
  context: AlpineContext,
  sourceBinding: AnalysisSourceBinding,
  language: string,
  streamResults: boolean
): ((update: ParallelAnalysisResultUpdate) => void) | undefined {
  if (!streamResults) {
    return undefined;
  }

  return ({ report }) => {
    if (isCurrentAnalysisSource(sourceBinding)) {
      syncAnalysisReport(context, withAnalysisSourceBinding(report, sourceBinding, language));
    }
  };
}

async function runPreparedParallelAnalysis(
  context: AlpineContext,
  preparedRun: PreparedAnalysisRun
): Promise<FullAnalysisReport | null> {
  const { schedulePlan, perfSettings, preloadedCachedResults, streamResults } = preparedRun;
  const analysisReport = await runParallelAIAnalysis(
    schedulePlan.taskOrder,
    preparedRun.mergedProduct,
    (progress: number, step: string) => {
      syncAnalysisProgress(context, progress, step);
    },
    preparedRun.language,
    {
      maxConcurrency: schedulePlan.maxConcurrency,
      enableCache: perfSettings.enableCache,
      streamResults,
      failureStrategy: schedulePlan.failureStrategy,
      preloadedCachedResults,
      retryBudget: schedulePlan.retryBudget,
      stopOnFailure: schedulePlan.failureMode === 'complete_required',
      onTaskComplete: createStreamingReportHandler(
        context,
        preparedRun.sourceBinding,
        preparedRun.language,
        streamResults
      ),
    }
  );

  if (!isCurrentAnalysisSource(preparedRun.sourceBinding)) {
    resetAnalysisReport(context);
    showToast('采集数据已变更，本次分析结果已丢弃，请重新分析', {
      type: 'warning',
    });
    return null;
  }

  return withAnalysisSourceBinding(analysisReport, preparedRun.sourceBinding, preparedRun.language);
}

async function completeAnalysisAction(
  context: AlpineContext,
  sourceBinding: AnalysisSourceBinding,
  analysisReport: FullAnalysisReport
): Promise<void> {
  syncAnalysisReport(context, analysisReport);
  syncAnalysisProgress(context, 100, '分析完成');
  await persistAnalysisReportToSource(sourceBinding, analysisReport);
  showToast('分析完成！', { type: 'success' });
}

function handleAnalysisActionError(context: AlpineContext, error: unknown): void {
  const ux = showLlmFailureToast(error, { titlePrefix: '分析失败: ' });
  syncAnalysisProgress(context, context.progress, `分析失败: ${ux.title}`);
  console.error('[用户动作] 分析失败:', error);
}

/**
 * 执行分析
 */
export async function runAnalysisAction(
  context: AlpineContext,
  currentProducts: Product[]
): Promise<void> {
  if (shouldSkipAnalysisAction(context, currentProducts)) {
    return;
  }

  const selectedTargets = [...context.selectedTargets];
  const sourceBinding = createAnalysisSourceBinding(context);

  startAnalysisAction(context);

  try {
    const preparedRun = await prepareAnalysisRun(context, selectedTargets, sourceBinding);
    const boundAnalysisReport = await runPreparedParallelAnalysis(context, preparedRun);
    if (!boundAnalysisReport) {
      return;
    }

    await completeAnalysisAction(context, sourceBinding, boundAnalysisReport);
  } catch (error) {
    handleAnalysisActionError(context, error);
  } finally {
    finishAnalysisAction(context);
  }
}

/**
 * 获取真实产品数据
 */
function getRealProducts(selectedAsins: string[]): Product[] {
  const scrapedData = appStore.getState().scraper?.scrapedData;
  return getProductsByAsins(scrapedData, selectedAsins);
}
