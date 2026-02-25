/**
 * Alpine 组件用户动作
 * 处理所有用户交互操作
 */

import { showToast } from '@common/ui/index';
import { analysisTargets } from '../config/analysisTargets';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { runAnalysis, getSampleReport, parseAnalysisReport } from '../services/analysisService';
import { runAIAnalysis } from '../services/aiAnalysisService';
import { generateMarkdownReport, generateJsonReportData } from '../services/reportGenerator';
import { mergeProducts, getProductsByAsins } from '../utils/dataTransformers';
import { getMarketLanguage } from './helpers';
import { Product } from '../config/sampleData';
import { AlpineContext } from '../types';
import { ModuleState } from '../state/moduleState';
import state from '@common/state';
import type { FullAnalysisReport } from '../config/analysisReportData';

/**
 * 切换 ASIN 选择
 */
export function toggleAsin(context: AlpineContext, moduleState: ModuleState, asin: string): void {
  const index = context.selectedAsins.indexOf(asin);
  if (index > -1) {
    context.selectedAsins.splice(index, 1);
  } else {
    context.selectedAsins.push(asin);
  }
  syncToModuleState(context, moduleState);
}

/**
 * 全选 ASIN
 */
export function selectAllAsins(context: AlpineContext, moduleState: ModuleState, availableAsins: string[]): void {
  context.selectedAsins = [...availableAsins];
  syncToModuleState(context, moduleState);
}

/**
 * 清空 ASIN 选择
 */
export function clearAllAsins(context: AlpineContext, moduleState: ModuleState): void {
  context.selectedAsins = [];
  syncToModuleState(context, moduleState);
}

/**
 * 切换分析目标
 */
export function toggleTarget(context: AlpineContext, moduleState: ModuleState, targetId: string): void {
  const index = context.selectedTargets.indexOf(targetId);
  if (index > -1) {
    context.selectedTargets.splice(index, 1);
  } else {
    context.selectedTargets.push(targetId);
  }
  syncToModuleState(context, moduleState);
}

/**
 * 全选分析目标
 */
export function selectAllTargets(context: AlpineContext, moduleState: ModuleState): void {
  context.selectedTargets = analysisTargets.map(t => t.id);
  syncToModuleState(context, moduleState);
}

/**
 * 清空分析目标
 */
export function clearAllTargets(context: AlpineContext, moduleState: ModuleState): void {
  context.selectedTargets = [];
  syncToModuleState(context, moduleState);
}

/**
 * 切换提示词面板
 */
export function togglePromptPanel(context: AlpineContext, moduleState: ModuleState): void {
  context.showPromptPanel = !context.showPromptPanel;
  moduleState.showPromptPanel = context.showPromptPanel;
}

/**
 * 切换提示词项
 */
export function togglePromptItem(context: AlpineContext, moduleState: ModuleState, index: number): void {
  context.expandedPromptIndex = context.expandedPromptIndex === index ? null : index;
  moduleState.expandedPromptIndex = context.expandedPromptIndex;
}

/**
 * 切换 JSON 查看器
 */
export function toggleJsonViewer(context: AlpineContext, moduleState: ModuleState): void {
  context.showJsonViewer = !context.showJsonViewer;
  moduleState.showJsonViewer = context.showJsonViewer;
}

/**
 * 切换数据源
 */
export function toggleDataSource(context: AlpineContext, moduleState: ModuleState): void {
  context.useRealData = !context.useRealData;
  moduleState.useRealData = context.useRealData;
  
  // 清空之前的结果
  context.analysisReport = null;
  context.hasReport = false;
  moduleState.analysisReport = null;
  moduleState.hasReport = false;
  
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

/**
 * 执行分析
 */
export async function runAnalysisAction(context: AlpineContext, moduleState: ModuleState, currentProducts: Product[]): Promise<void> {
  if (context.selectedTargets.length === 0 || currentProducts.length === 0 || context.isAnalyzing) {
    return;
  }

  context.isAnalyzing = true;
  context.progress = 0;
  syncToModuleState(context, moduleState);
  
  console.log('[用户动作] 开始分析:', {
    selectedTargets: context.selectedTargets.length,
    selectedAsins: context.selectedAsins.length,
    currentProducts: currentProducts.length
  });

  try {
    let analysisReport: FullAnalysisReport;

    if (context.useRealData) {
      // 使用真实数据进行 AI 分析
      const products = getRealProducts(context.selectedAsins);
      
      if (products.length === 0) {
        throw new Error('无法获取产品数据,请确保已从数据采集或数据管理导入数据');
      }

      showToast(`正在调用 AI 分析 ${products.length} 个产品...`, { type: 'info' });

      // 合并多个产品的数据
      const mergedProduct = mergeProducts(products);

      // 获取正确的语言代码
      const language = getMarketLanguage();

      analysisReport = await runAIAnalysis(
        context.selectedTargets,
        mergedProduct,
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
          syncToModuleState(context, moduleState);
        },
        language
      );
    } else {
      // 使用示例数据进行模拟分析
      await runAnalysis(
        context.selectedTargets,
        context.selectedAsins[0] || 'B0DNMZ2MLG',
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
          syncToModuleState(context, moduleState);
        }
      );

      analysisReport = getSampleReport();
    }

    // 保存原始报告并设置显示标志
    context.analysisReport = analysisReport;
    context.hasReport = true;
    
    console.log('[用户动作] 分析报告已设置，selectedTargets:', context.selectedTargets.length);
    console.log('[用户动作] analysisReport 已保存:', !!context.analysisReport);
    console.log('[用户动作] hasReport 标志已设置:', context.hasReport);
    
    // 同步到模块状态
    syncToModuleState(context, moduleState);

    // 将分析报告加载到全局状态
    const scrapedData = state.scraper?.scrapedData;
    const marketplace = scrapedData?.metadata?.marketplace || 'US';
    
    // 使用类型断言，因为 state.analysis.analysisReport 接受多种格式
    state.analysis.analysisReport = analysisReport as any;
    console.log('[用户动作] 已将分析报告加载到全局状态，marketplace:', marketplace);

    // 分析成功后自动更新历史快照的分析状态
    if (analysisReport && state.scraper?.currentHistoryId) {
      const { HistoryService } = await import('../../services/historyService');
      const success = HistoryService.updateAnalysisStatus(
        state.scraper.currentHistoryId,
        analysisReport as any
      );
      
      if (success) {
        console.log('[用户动作] 已自动标记历史快照为"已分析"');
        // 触发历史记录更新事件
        window.dispatchEvent(new CustomEvent('history-updated'));
      }
    }

    showToast(`分析完成！`, { type: 'success' });
  } catch (error) {
    console.error('[用户动作] 分析失败:', error);
    showToast(`分析失败: ${(error as Error).message}`, { type: 'error' });
  } finally {
    context.isAnalyzing = false;
    syncToModuleState(context, moduleState);
  }
}

/**
 * 获取真实产品数据
 */
function getRealProducts(selectedAsins: string[]): Product[] {
  const scrapedData = state.scraper?.scrapedData;
  return getProductsByAsins(scrapedData, selectedAsins);
}

/**
 * 同步到模块状态
 */
function syncToModuleState(context: AlpineContext, moduleState: ModuleState): void {
  moduleState.selectedAsins = context.selectedAsins;
  moduleState.selectedTargets = context.selectedTargets;
  moduleState.isAnalyzing = context.isAnalyzing;
  moduleState.progress = context.progress;
  moduleState.currentStep = context.currentStep;
  moduleState.analysisReport = context.analysisReport;
  moduleState.hasReport = context.hasReport;
}
