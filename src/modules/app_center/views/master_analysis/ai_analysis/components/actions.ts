/**
 * Alpine 组件用户动作
 * 处理所有用户交互操作
 */

import { showToast } from '@common/ui/index';
import { analysisTargets } from '../config/analysisTargets';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { runAnalysis, getSampleReport, parseAnalysisReport } from '../services/analysisService';
import { runParallelAIAnalysis } from '../services/parallelAnalysisService';
import { generateMarkdownReport, generateJsonReportData } from '../services/reportGenerator';
import { mergeProducts, getProductsByAsins } from '../utils/dataTransformers';
import { getMarketLanguage } from './helpers';
import { Product } from '../config/sampleData';
import { AlpineContext } from '../types';
import { appStore } from '@/stores/useAppStore';
import type { FullAnalysisReport } from '../config/analysisReportData';
import { BusinessError } from '@common/errors/AppError';
import { Logger } from '../../../../../../services/loggerService';
import { getPerformanceSettings } from './PerformanceSettings';
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';
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
}

/**
 * 全选 ASIN
 */
export function selectAllAsins(context: AlpineContext, availableAsins: string[]): void {
  context.selectedAsins = [...availableAsins];
  appStore.getState().setSelectedAsins(context.selectedAsins);
}

/**
 * 清空 ASIN 选择
 */
export function clearAllAsins(context: AlpineContext): void {
  context.selectedAsins = [];
  appStore.getState().setSelectedAsins([]);
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
 * 切换数据源
 */
export function toggleDataSource(context: AlpineContext): void {
  context.useRealData = !context.useRealData;

  resetAnalysisReport(context);

  showToast(
    context.useRealData ? '已切换到真实数据分析模式' : '已切换到示例数据模式',
    { type: 'info' }
  );
}

/**
 * 复制提示词
 */
export function copyPrompt(context: AlpineContext, currentProducts: Product[], index: number): void {
  if (currentProducts.length === 0) return;

  const targetId = context.selectedTargets[index];
  if (!targetId) return;

  // 如果有多个产品，合并后生成提示词
  const mergedProduct = currentProducts.length > 1 ? mergeProducts(currentProducts) : currentProducts[0];
  if (!mergedProduct) return;

  // 获取正确的语言代码
  const language = getMarketLanguage();
  const prompt = generateAnalysisPrompt(targetId, mergedProduct, language);

  navigator.clipboard.writeText(prompt).then(() => {
    showToast('提示词已复制', { type: 'success' });
  }).catch(() => {
    showToast('复制失败', { type: 'error' });
  });
}

/**
 * 复制 JSON 报告
 */
export function copyJson(context: AlpineContext, dataSourceMarketplace: string): void {
  if (!context.analysisReport) return;

  const reportData = generateJsonReportData(
    context.selectedAsins,
    context.selectedTargets,
    context.dataSource,
    dataSourceMarketplace,
    context.analysisReport
  );

  const json = JSON.stringify(reportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast('完整 JSON 报告已复制', { type: 'success' });
  }).catch(() => {
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

  navigator.clipboard.writeText(markdown).then(() => {
    showToast('Markdown 报告已复制', { type: 'success' });
  }).catch(() => {
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

  const reportData = generateJsonReportData(
    context.selectedAsins,
    context.selectedTargets,
    context.dataSource,
    dataSourceMarketplace,
    context.analysisReport
  );

  const json = JSON.stringify(reportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-report-${context.selectedAsins.join('-')}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('JSON 报告已下载', { type: 'success' });
}

function syncAnalysisReport(context: AlpineContext, report: FullAnalysisReport | null): void {
  context.analysisReport = report;
  context.hasReport = !!report;
  appStore.getState().setAnalysisReport(report as any);
}

function resetAnalysisReport(context: AlpineContext): void {
  syncAnalysisReport(context, null);
}

/**
 * 执行分析
 */
export async function runAnalysisAction(context: AlpineContext, currentProducts: Product[]): Promise<void> {
  if (context.selectedTargets.length === 0 || currentProducts.length === 0 || context.isAnalyzing) {
    return;
  }

  const selectedTargets = [...context.selectedTargets];

  context.isAnalyzing = true;
  context.progress = 0;
  context.currentStep = '正在准备分析...';
  resetAnalysisReport(context);
  appStore.getState().updateAnalysis({ isAnalyzing: true });

  Logger.debug('[用户动作] 开始分析:', {
    selectedTargets: selectedTargets.length,
    selectedAsins: context.selectedAsins.length,
    currentProducts: currentProducts.length
  });

  try {
    let analysisReport: FullAnalysisReport;

    if (context.useRealData) {
      const products = getRealProducts(context.selectedAsins);

      if (products.length === 0) {
        throw new BusinessError(
          '无法获取产品数据,请确保已从数据采集或数据管理导入数据',
          'AI_ACTIONS_001',
          { module: 'AIAnalysisActions', action: 'runAnalysisAction', selectedAsins: context.selectedAsins }
        );
      }

      showToast(`正在调用 AI 分析 ${products.length} 个产品...`, { type: 'info' });

      const mergedProduct = mergeProducts(products);
      const language = getMarketLanguage();
      const perfSettings = getPerformanceSettings();

      analysisReport = await runParallelAIAnalysis(
        selectedTargets,
        mergedProduct,
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
        },
        language,
        {
          maxConcurrency: perfSettings.maxConcurrency,
          enableCache: perfSettings.enableCache,
          streamResults: true,
          failureStrategy: perfSettings.failureStrategy,
          onTaskComplete: ({ report, targetId, successCount, totalCount, fromCache }) => {
            syncAnalysisReport(context, report);
            Logger.debug('[用户动作] 收到实时分析结果:', {
              targetId,
              successCount,
              totalCount,
              fromCache: !!fromCache
            });
          }
        }
      );
    } else {
      await runAnalysis(
        selectedTargets,
        context.selectedAsins[0] || 'B0DNMZ2MLG',
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
        }
      );

      analysisReport = getSampleReport();
    }

    syncAnalysisReport(context, analysisReport);

    Logger.debug('[用户动作] 分析报告已设置，selectedTargets:', selectedTargets.length);
    Logger.debug('[用户动作] analysisReport 已保存:', !!context.analysisReport);
    Logger.debug('[用户动作] hasReport 标志已设置:', context.hasReport);

    const currentHistoryId = appStore.getState().scraper?.currentHistoryId;
    if (analysisReport && currentHistoryId) {
      const { HistoryService } = await import('../../services/historyService');
      const success = await HistoryService.updateAnalysisStatusAsync(
        currentHistoryId,
        analysisReport as any
      );

      if (success) {
        Logger.debug('[用户动作] 已自动标记历史快照为"已分析"');
        eventBus.emit(APP_EVENTS.HISTORY_UPDATED);
      }
    }

    showToast('分析完成！', { type: 'success' });
  } catch (error) {
    Logger.error('[用户动作] 分析失败:', error);
    showToast(`分析失败: ${(error as Error).message}`, { type: 'error' });
  } finally {
    context.isAnalyzing = false;
    appStore.getState().updateAnalysis({ isAnalyzing: false });
  }
}

/**
 * 获取真实产品数据
 */
function getRealProducts(selectedAsins: string[]): Product[] {
  const scrapedData = appStore.getState().scraper?.scrapedData;
  return getProductsByAsins(scrapedData, selectedAsins);
}
