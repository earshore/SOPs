/**
 * Alpine 组件用户动作
 * 处理所有用户交互操作
 */

import { showToast } from '@common/ui/index';
import { analysisTargets } from '../config/analysisTargets';
import { generateAnalysisPrompt } from '../prompts/analysisPrompts';
import { runAnalysis, getSampleReport } from '../services/analysisService';
import { runAIAnalysis } from '../services/aiAnalysisService';
import { generateMarkdownReport, generateJsonReportData } from '../services/reportGenerator';
import { mergeProducts, getProductsByAsins } from '../utils/dataTransformers';
import { getMarketLanguage } from './helpers';
import { Product } from '../config/sampleData';
import state from '@common/state';

/**
 * 切换 ASIN 选择
 */
export function toggleAsin(context: any, moduleState: any, asin: string): void {
  const index = context.selectedAsins.indexOf(asin);
  if (index > -1) {
    context.selectedAsins.splice(index, 1);
  } else {
    context.selectedAsins.push(asin);
  }
  console.log('[toggleAsin] 当前选中的 ASINs:', context.selectedAsins);
  syncToModuleState(context, moduleState);
}

/**
 * 全选 ASIN
 */
export function selectAllAsins(context: any, moduleState: any, availableAsins: string[]): void {
  context.selectedAsins = [...availableAsins];
  syncToModuleState(context, moduleState);
}

/**
 * 清空 ASIN 选择
 */
export function clearAllAsins(context: any, moduleState: any): void {
  context.selectedAsins = [];
  syncToModuleState(context, moduleState);
}

/**
 * 切换分析目标
 */
export function toggleTarget(context: any, moduleState: any, targetId: string): void {
  const index = context.selectedTargets.indexOf(targetId);
  if (index > -1) {
    context.selectedTargets.splice(index, 1);
  } else {
    context.selectedTargets.push(targetId);
  }
  console.log('[toggleTarget] 当前选中的分析目标:', context.selectedTargets);
  syncToModuleState(context, moduleState);
}

/**
 * 全选分析目标
 */
export function selectAllTargets(context: any, moduleState: any): void {
  context.selectedTargets = analysisTargets.map(t => t.id);
  syncToModuleState(context, moduleState);
}

/**
 * 清空分析目标
 */
export function clearAllTargets(context: any, moduleState: any): void {
  context.selectedTargets = [];
  syncToModuleState(context, moduleState);
}

/**
 * 切换提示词面板
 */
export function togglePromptPanel(context: any, moduleState: any): void {
  context.showPromptPanel = !context.showPromptPanel;
  moduleState.showPromptPanel = context.showPromptPanel;
}

/**
 * 切换提示词项
 */
export function togglePromptItem(context: any, moduleState: any, index: number): void {
  context.expandedPromptIndex = context.expandedPromptIndex === index ? null : index;
  moduleState.expandedPromptIndex = context.expandedPromptIndex;
}

/**
 * 切换 JSON 查看器
 */
export function toggleJsonViewer(context: any, moduleState: any): void {
  context.showJsonViewer = !context.showJsonViewer;
  moduleState.showJsonViewer = context.showJsonViewer;
}

/**
 * 切换数据源
 */
export function toggleDataSource(context: any, moduleState: any): void {
  context.useRealData = !context.useRealData;
  moduleState.useRealData = context.useRealData;
  
  // 清空之前的结果
  context.results = [];
  context.analysisReport = null;
  moduleState.results = [];
  moduleState.analysisReport = null;
  
  showToast(
    context.useRealData ? '已切换到真实数据分析模式' : '已切换到示例数据模式',
    'info'
  );
}

/**
 * 复制提示词
 */
export function copyPrompt(context: any, currentProducts: Product[], index: number): void {
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
    showToast('提示词已复制', 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

/**
 * 复制 JSON 报告
 */
export function copyJson(context: any, dataSourceMarketplace: string): void {
  if (!context.analysisReport) return;

  const reportData = generateJsonReportData(
    context.results,
    context.selectedAsins,
    context.selectedTargets,
    context.dataSource,
    dataSourceMarketplace,
    context.analysisReport
  );

  const json = JSON.stringify(reportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast('完整 JSON 报告已复制', 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

/**
 * 复制 Markdown 报告
 */
export function copyMarkdown(
  context: any,
  dataSourceMarketplace: string,
  dataSourceLabel: string
): void {
  if (context.results.length === 0) {
    showToast('没有可复制的报告', 'warning');
    return;
  }

  const markdown = generateMarkdownReport(
    context.results,
    context.selectedAsins,
    dataSourceMarketplace,
    dataSourceLabel
  );
  
  navigator.clipboard.writeText(markdown).then(() => {
    showToast('Markdown 报告已复制', 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

/**
 * 下载 JSON 报告
 */
export function downloadJson(context: any, dataSourceMarketplace: string): void {
  if (context.results.length === 0) {
    showToast('没有可下载的报告', 'warning');
    return;
  }

  const reportData = generateJsonReportData(
    context.results,
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
  
  showToast('JSON 报告已下载', 'success');
}

/**
 * 执行分析
 */
export async function runAnalysisAction(context: any, moduleState: any, currentProducts: Product[]): Promise<void> {
  if (context.selectedTargets.length === 0 || currentProducts.length === 0 || context.isAnalyzing) {
    return;
  }

  context.isAnalyzing = true;
  context.progress = 0;
  context.results = [];
  syncToModuleState(context, moduleState);

  try {
    let results: any[];

    if (context.useRealData) {
      // 使用真实数据进行 AI 分析
      const products = getRealProducts(context.selectedAsins);
      
      if (products.length === 0) {
        throw new Error('无法获取产品数据,请确保已从数据采集或数据管理导入数据');
      }

      showToast(`正在调用 AI 分析 ${products.length} 个产品...`, 'info');

      // 合并多个产品的数据
      const mergedProduct = mergeProducts(products);

      // 获取正确的语言代码
      const language = getMarketLanguage();

      const analysisResult = await runAIAnalysis(
        context.selectedTargets,
        mergedProduct,
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
          syncToModuleState(context, moduleState);
        },
        language
      );

      // 保存完整的分析报告和结果
      results = analysisResult.results;
      context.analysisReport = analysisResult.report;
    } else {
      // 使用示例数据进行模拟分析
      results = await runAnalysis(
        context.selectedTargets,
        context.selectedAsins[0] || 'B0DNMZ2MLG',
        (progress: number, step: string) => {
          context.progress = progress;
          context.currentStep = step;
          syncToModuleState(context, moduleState);
        }
      );

      context.analysisReport = getSampleReport();
    }

    context.results = results;
    syncToModuleState(context, moduleState);

    // 将分析报告加载到全局状态
    const scrapedData = state.scraper?.scrapedData;
    const marketplace = scrapedData?.metadata?.marketplace || 'US';
    
    const reportData = {
      results: results,
      targets: context.selectedTargets,
      timestamp: new Date().toISOString(),
      dataSource: context.dataSource,
      marketplace: marketplace
    };
    state.analysis.analysisReport = reportData;
    console.log('[用户动作] 已将分析报告加载到全局状态，marketplace:', marketplace);

    // 分析成功后自动更新历史快照的分析状态
    if (results.length > 0 && state.scraper?.currentHistoryId) {
      const { HistoryService } = await import('../../services/historyService');
      const success = HistoryService.updateAnalysisStatus(
        state.scraper.currentHistoryId,
        reportData
      );
      
      if (success) {
        console.log('[用户动作] 已自动标记历史快照为"已分析"');
        // 触发历史记录更新事件
        window.dispatchEvent(new CustomEvent('history-updated'));
      }
    }

    showToast(`分析完成！生成了 ${results.length} 个洞察报告`, 'success');
  } catch (error) {
    console.error('[用户动作] 分析失败:', error);
    showToast(`分析失败: ${(error as Error).message}`, 'error');
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
function syncToModuleState(context: any, moduleState: any): void {
  moduleState.selectedAsins = context.selectedAsins;
  moduleState.selectedTargets = context.selectedTargets;
  moduleState.isAnalyzing = context.isAnalyzing;
  moduleState.progress = context.progress;
  moduleState.currentStep = context.currentStep;
  moduleState.results = context.results;
  moduleState.analysisReport = context.analysisReport;
}
