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
import {
  estimateAnalysisTime,
  estimateAnalysisWorkload,
} from '../services/analysisTimeEstimator';
import {
  getAnalysisReasoningEffortLabel,
  getAnalysisReasoningPrefs,
} from '../services/reasoningPolicy';
import type { AlpineContext, FullReportData } from '../types';
import { appStore } from '@/stores/useAppStore';
import type { AnalysisReportMetadata, FullAnalysisReport } from '../config/analysisReportData';
import type { AnalysisReport } from '@/types/modules-business';
import { BusinessError } from '@/common/errors/AppError';
import { getPerformanceSettings } from './PerformanceSettings';
import { emitHistoryUpdated } from '../../services/historyEvents';
import { getScrapedDataFingerprint } from '../../services/reportIdentity';
import {
  clearAnalysisSession,
  loadAnalysisSession,
  saveAnalysisSession,
  type AnalysisSessionSnapshot,
} from '../utils/analysisSession';

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

let lastSessionSaveAt = 0;
function persistAnalysisSession(
  report: Partial<FullAnalysisReport>,
  targetIds: string[],
  binding: AnalysisSourceBinding
): void {
  const now = Date.now();
  if (now - lastSessionSaveAt < 1000) return;
  lastSessionSaveAt = now;
  const snapshot: AnalysisSessionSnapshot = {
    version: 1,
    sourceHistoryId: binding.sourceHistoryId != null ? String(binding.sourceHistoryId) : undefined,
    sourceAsins: [...binding.sourceAsins],
    sourceDataFingerprint: binding.sourceDataFingerprint || undefined,
    targetIds: [...targetIds],
    completedTargetIds: targetIds.filter(
      targetId => (report as Record<string, unknown>)[targetId] !== undefined
    ),
    report: report as Partial<FullAnalysisReport>,
    startedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  saveAnalysisSession(snapshot);
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

function startAnalysisAction(
  context: AlpineContext,
  options?: { preserveExistingReport?: boolean; progressLabel?: string }
): void {
  context.isAnalyzing = true;
  syncAnalysisProgress(context, 0, options?.progressLabel || '正在准备分析...');
  if (!options?.preserveExistingReport) {
    resetAnalysisReport(context);
  }
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
  const mergedProduct = mergeProducts(products);
  const workload = estimateAnalysisWorkload(mergedProduct, selectedTargets);
  const language = getMarketLanguage();
  const perfSettings = getPerformanceSettings();
  const depthLabel =
    perfSettings.evidenceDepth === 'fast'
      ? '快速'
      : perfSettings.evidenceDepth === 'deep'
        ? '深入'
        : '均衡';
  const preloadedCachedResults = await getCachedAnalysisResults(
    selectedTargets,
    mergedProduct,
    language,
    perfSettings.enableCache
  );
  const cachedCount = Object.keys(preloadedCachedResults).length;
  const schedulePlan = resolveAnalysisSchedulePlan({
    preference: perfSettings.schedulingPreference,
    targetIds: selectedTargets,
    product: mergedProduct,
    language,
    enableCache: perfSettings.enableCache,
    cachedTargetIds: Object.keys(preloadedCachedResults),
  });
  // 动态耗时估算：按真联动后的实际推理档位 + 真实并发/缓存命中
  const reasoningPrefs = getAnalysisReasoningPrefs();
  const timeEstimate = estimateAnalysisTime({
    targetIds: selectedTargets,
    product: mergedProduct,
    maxConcurrency: schedulePlan.maxConcurrency,
    cachedTargetIds: schedulePlan.cachedTargetIds,
    estimatedInputTokens: schedulePlan.estimatedInputTokens,
    reasoning: reasoningPrefs,
  });
  const hygienePart = workload.hygieneHits > 0 ? `，证据清洗约 ${workload.hygieneHits} 条` : '';
  const cachePart =
    cachedCount > 0 ? `，缓存命中 ${cachedCount}/${selectedTargets.length} 维` : '';
  showToast(
    `正在分析 ${products.length} 个 ASIN · ${depthLabel}档 · ${getAnalysisReasoningEffortLabel(reasoningPrefs)}推理 · 预计 ${timeEstimate.label} · 约 ${workload.mapCalls} 次分片调用${hygienePart}${cachePart}`,
    { type: 'info' }
  );

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
      onTaskSettledSnapshot: (report, targetIds) => {
        persistAnalysisSession(report, targetIds, preparedRun.sourceBinding);
      },
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

/**
 * 恢复上次未完成的分析会话（断点续跑）。
 * 数据源（ASIN 集合/指纹）匹配时恢复已完成报告与选择状态，返回是否恢复。
 */
function sessionSourceMatches(
  session: AnalysisSessionSnapshot,
  scrapedData: { products?: Array<{ asin?: string }> } | null | undefined
): boolean {
  const currentAsins = (scrapedData?.products || [])
    .map(product => product.asin)
    .filter((asin): asin is string => Boolean(asin));
  if (
    session.sourceAsins.length === 0 ||
    session.sourceAsins.some(asin => !currentAsins.includes(asin))
  ) {
    return false;
  }

  const currentFingerprint = getScrapedDataFingerprint(scrapedData);
  if (
    session.sourceDataFingerprint &&
    currentFingerprint &&
    session.sourceDataFingerprint !== currentFingerprint
  ) {
    return false;
  }

  return true;
}

async function restoreScrapedDataFromHistory(
  state: ReturnType<typeof appStore.getState>,
  session: AnalysisSessionSnapshot
): Promise<void> {
  const { HistoryService } = await import('../../services/historyService');
  const history = await HistoryService.getAllAsync();
  const matched = history.find(
    item => getScrapedDataFingerprint(item.data) === session.sourceDataFingerprint
  );
  if (matched?.data) {
    state.setScrapedData(matched.data);
    state.setCurrentHistoryId(matched.id);
  }
}

async function restoreScopedData(
  context: AlpineContext,
  session: AnalysisSessionSnapshot
): Promise<boolean> {
  const state = appStore.getState();

  // 刷新/重进后 store 可能没有产品数据：按数据指纹从历史快照恢复
  if (!state.scraper?.scrapedData?.products?.length) {
    await restoreScrapedDataFromHistory(state, session);
  }

  const refreshedState = appStore.getState();
  if (!sessionSourceMatches(session, refreshedState.scraper?.scrapedData)) {
    return false;
  }

  context.selectedAsins = [...session.sourceAsins];
  context.selectedTargets = [...session.targetIds];
  refreshedState.setSelectedAsins([...session.sourceAsins]);
  if (session.report && Object.keys(session.report).length > 0) {
    context.analysisReport = session.report as FullAnalysisReport;
    context.hasReport = true;
    refreshedState.setAnalysisReport(session.report as AnalysisReport);
  }
  return true;
}
export async function restoreInterruptedAnalysis(context: AlpineContext): Promise<boolean> {
  const session = loadAnalysisSession();
  if (!session) return false;

  const restored = await restoreScopedData(context, session);
  if (!restored) return false;

  showToast(
    `已恢复上次未完成的分析（已完成 ${session.completedTargetIds.length}/${session.targetIds.length}），点击“开始分析”将继续剩余目标`,
    { type: 'info' }
  );
  return true;
}

function getAnalysisTargetLabel(targetId: string): string {
  return analysisTargets.find(target => target.id === targetId)?.name || targetId;
}

function humanizeElapsedMs(elapsedMs: number | undefined): string | null {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return null;
  }
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`;
}

type AnalysisRunSummary = NonNullable<AnalysisReportMetadata['runSummary']>;
type AnalysisHygieneBucket = NonNullable<
  NonNullable<AnalysisReportMetadata['reviewSampling']>['mapReduceHygiene']
>['lowStar'];

function getAnalysisRunSuccessCount(
  total: number,
  summary: AnalysisRunSummary | undefined
): number {
  return typeof summary?.successCount === 'number'
    ? summary.successCount
    : Math.max(0, total - (summary?.failedCount || 0));
}

function getAnalysisRunFailedCount(
  total: number,
  successCount: number,
  summary: AnalysisRunSummary | undefined
): number {
  return typeof summary?.failedCount === 'number'
    ? summary.failedCount
    : Math.max(0, total - successCount);
}

function getHygieneBucketCount(bucket: Partial<AnalysisHygieneBucket>): number {
  return (
    (bucket.duplicatesRemoved || 0) + (bucket.emptyRemoved || 0) + (bucket.omittedByBudget || 0)
  );
}

function getAnalysisHygieneCount(analysisReport: FullAnalysisReport): number {
  const hygiene = analysisReport._metadata?.reviewSampling?.mapReduceHygiene;
  if (!hygiene) return 0;
  return [hygiene.lowStar, hygiene.highStar, hygiene.general].reduce(
    (sum, bucket) => sum + getHygieneBucketCount(bucket),
    0
  );
}

function formatAnalysisCompletionExtras(
  summary: AnalysisRunSummary | undefined,
  hygieneCount: number
): string {
  const extras: string[] = [];
  const cachedCount =
    typeof summary?.cachedCount === 'number' ? Math.max(0, summary.cachedCount) : 0;
  if (cachedCount > 0) extras.push(`缓存 ${cachedCount}`);
  if (hygieneCount > 0) extras.push(`清洗 ${hygieneCount}`);
  const elapsedLabel = humanizeElapsedMs(summary?.elapsedMs);
  if (elapsedLabel) extras.push(`耗时 ${elapsedLabel}`);
  return extras.length > 0 ? ` · ${extras.join(' · ')}` : '';
}

function formatAnalysisCompletionSummary(analysisReport: FullAnalysisReport): {
  step: string;
  toastMessage: string;
  toastType: 'success' | 'warning';
} {
  const targetIds = analysisReport._metadata?.targetIds || [];
  const total = targetIds.length;
  const runSummary = analysisReport._metadata?.runSummary;
  const successCount = getAnalysisRunSuccessCount(total, runSummary);
  const failedCount = getAnalysisRunFailedCount(total, successCount, runSummary);
  const failedTargetIds = Array.isArray(runSummary?.failedTargetIds)
    ? runSummary.failedTargetIds
    : [];
  const extraText = formatAnalysisCompletionExtras(
    runSummary,
    getAnalysisHygieneCount(analysisReport)
  );

  if (failedCount <= 0) {
    const step =
      total > 0 ? `分析完成：成功 ${successCount}/${total}${extraText}` : `分析完成${extraText}`;
    return {
      step,
      toastMessage: total > 0 ? step : '分析完成！',
      toastType: 'success',
    };
  }

  const failedLabels = failedTargetIds.map(getAnalysisTargetLabel).join('、');
  const step = failedLabels
    ? `分析完成：成功 ${successCount} · 失败 ${failedCount}（${failedLabels}）${extraText}`
    : `分析完成：成功 ${successCount} · 失败 ${failedCount}${extraText}`;

  return {
    step,
    toastMessage: step,
    toastType: 'warning',
  };
}

async function completeAnalysisAction(
  context: AlpineContext,
  sourceBinding: AnalysisSourceBinding,
  analysisReport: FullAnalysisReport
): Promise<void> {
  const completion = formatAnalysisCompletionSummary(analysisReport);
  syncAnalysisReport(context, analysisReport);
  // Preserve meaningful summary; do not clobber with bare "分析完成".
  syncAnalysisProgress(context, 100, completion.step);
  await persistAnalysisReportToSource(sourceBinding, analysisReport);
  showToast(completion.toastMessage, { type: completion.toastType });
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

  // 新分析开始：清掉旧断点，避免误恢复
  clearAnalysisSession();
  startAnalysisAction(context);

  try {
    const preparedRun = await prepareAnalysisRun(context, selectedTargets, sourceBinding);
    const boundAnalysisReport = await runPreparedParallelAnalysis(context, preparedRun);
    if (!boundAnalysisReport) {
      return;
    }

    await completeAnalysisAction(context, sourceBinding, boundAnalysisReport);
    clearAnalysisSession();
  } catch (error) {
    handleAnalysisActionError(context, error);
  } finally {
    finishAnalysisAction(context);
  }
}

function getExistingAnalysisReport(context: AlpineContext): FullAnalysisReport | null {
  return context.analysisReport && typeof context.analysisReport === 'object'
    ? ({ ...(context.analysisReport as FullAnalysisReport) } as FullAnalysisReport)
    : null;
}

async function rerunWithoutExistingReport(
  context: AlpineContext,
  currentProducts: Product[],
  targetIds: string[]
): Promise<void> {
  const previousTargets = [...context.selectedTargets];
  context.selectedTargets = targetIds;
  try {
    await runAnalysisAction(context, currentProducts);
  } finally {
    context.selectedTargets = previousTargets;
  }
}

function mergeRerunConfidence(
  existingReport: FullAnalysisReport,
  partialReport: FullAnalysisReport
): Record<string, number> {
  return {
    ...(existingReport._metadata?.confidence || {}),
    ...(partialReport._metadata?.confidence || {}),
  };
}

function getMergedOverallConfidence(
  confidence: Record<string, number>,
  existingReport: FullAnalysisReport,
  partialReport: FullAnalysisReport
): number {
  const values = Object.values(confidence).filter(
    value => typeof value === 'number' && Number.isFinite(value)
  );
  if (values.length > 0) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  return (
    partialReport._metadata?.overallConfidence || existingReport._metadata?.overallConfidence || 0
  );
}

function mergeRerunQualityWarnings(
  existingReport: FullAnalysisReport,
  partialReport: FullAnalysisReport,
  rerunTargetIds: string[]
): NonNullable<AnalysisReportMetadata['qualityWarnings']> {
  const retained = (existingReport._metadata?.qualityWarnings || []).filter(
    item => !rerunTargetIds.includes(item.targetId)
  );
  return [...retained, ...(partialReport._metadata?.qualityWarnings || [])];
}

function buildRerunOptionalMetadata(
  existingMetadata: AnalysisReportMetadata | undefined,
  partialMetadata: AnalysisReportMetadata | undefined,
  qualityWarnings: NonNullable<AnalysisReportMetadata['qualityWarnings']>
): Partial<AnalysisReportMetadata> {
  const optionalMetadata: Partial<AnalysisReportMetadata> = {};
  const model = partialMetadata?.model || existingMetadata?.model;
  if (model) optionalMetadata.model = model;
  const runSummary = partialMetadata?.runSummary || existingMetadata?.runSummary;
  if (runSummary) optionalMetadata.runSummary = runSummary;
  const reviewSampling = partialMetadata?.reviewSampling || existingMetadata?.reviewSampling;
  if (reviewSampling) optionalMetadata.reviewSampling = reviewSampling;
  if (qualityWarnings.length > 0) optionalMetadata.qualityWarnings = qualityWarnings;
  return optionalMetadata;
}

function buildRerunMetadata(
  existingReport: FullAnalysisReport,
  partialReport: FullAnalysisReport,
  rerunTargetIds: string[]
): AnalysisReportMetadata {
  const existingMetadata = existingReport._metadata;
  const partialMetadata = partialReport._metadata;
  const confidence = mergeRerunConfidence(existingReport, partialReport);
  const qualityWarnings = mergeRerunQualityWarnings(existingReport, partialReport, rerunTargetIds);
  return {
    confidence,
    overallConfidence: getMergedOverallConfidence(confidence, existingReport, partialReport),
    analyzedAt: new Date().toISOString(),
    targetIds: Array.from(
      new Set([
        ...(existingMetadata?.targetIds || []),
        ...(partialMetadata?.targetIds || rerunTargetIds),
      ])
    ),
    language: partialMetadata?.language || existingMetadata?.language || 'en',
    sourceHistoryId: partialMetadata?.sourceHistoryId ?? existingMetadata?.sourceHistoryId,
    sourceDataFingerprint:
      partialMetadata?.sourceDataFingerprint || existingMetadata?.sourceDataFingerprint,
    sourceAsins: partialMetadata?.sourceAsins || existingMetadata?.sourceAsins,
    ...buildRerunOptionalMetadata(existingMetadata, partialMetadata, qualityWarnings),
  };
}

function mergeRerunAnalysisReport(
  existingReport: FullAnalysisReport,
  partialReport: FullAnalysisReport,
  rerunTargetIds: string[]
): FullAnalysisReport {
  return {
    ...existingReport,
    ...partialReport,
    _metadata: buildRerunMetadata(existingReport, partialReport, rerunTargetIds),
  };
}

async function runRerunWithExistingReport(
  context: AlpineContext,
  existingReport: FullAnalysisReport,
  rerunTargetIds: string[]
): Promise<void> {
  const sourceBinding = createAnalysisSourceBinding(context);
  const labels = rerunTargetIds.map(getAnalysisTargetLabel).join('、');
  startAnalysisAction(context, {
    preserveExistingReport: true,
    progressLabel: `正在重跑：${labels}`,
  });

  try {
    const preparedRun = await prepareAnalysisRun(context, rerunTargetIds, sourceBinding);
    const partialReport = await runPreparedParallelAnalysis(context, preparedRun);
    if (partialReport) {
      await completeAnalysisAction(
        context,
        sourceBinding,
        mergeRerunAnalysisReport(existingReport, partialReport, rerunTargetIds)
      );
    }
  } catch (error) {
    handleAnalysisActionError(context, error);
  } finally {
    finishAnalysisAction(context);
  }
}

/**
 * Re-run only problematic dimensions and merge into the existing report.
 * Useful when quality warnings appear for a subset of targets.
 */
export async function rerunAnalysisTargetsAction(
  context: AlpineContext,
  currentProducts: Product[],
  targetIds: string[]
): Promise<void> {
  if (context.isAnalyzing || currentProducts.length === 0) {
    return;
  }

  const uniqueTargets = [...new Set(targetIds.filter(Boolean))];
  if (uniqueTargets.length === 0) {
    showToast('没有可重跑的维度', { type: 'warning' });
    return;
  }

  const existingReport = getExistingAnalysisReport(context);
  if (!existingReport) {
    await rerunWithoutExistingReport(context, currentProducts, uniqueTargets);
    return;
  }
  await runRerunWithExistingReport(context, existingReport, uniqueTargets);
}

/**
 * 获取真实产品数据
 */
function getRealProducts(selectedAsins: string[]): Product[] {
  const scrapedData = appStore.getState().scraper?.scrapedData;
  return getProductsByAsins(scrapedData, selectedAsins);
}
