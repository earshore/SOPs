/**
 * Alpine 组件数据加载器
 * 负责从各种数据源加载和检查数据
 */

import { appStore } from '@/stores/useAppStore';
import { showToast } from '@common/ui/index';
import { formatHistoryDate } from '../services/reportGenerator';
import { AlpineContext, HistoricalReportDetail } from '../types';
import type { AnalysisReport, ScrapedData } from '@/types/modules-business';

function isHistoricalAnalysisReport(report: unknown): report is AnalysisReport | string {
  return typeof report === 'string' || (typeof report === 'object' && report !== null);
}

/**
 * 检查并加载 Scraper 数据
 */
export function checkAndLoadScraperData(context: AlpineContext): void {
  const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;

  if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
    // 如果有 Scraper 数据，自动选中所有产品的 ASIN
    const asins = scrapedData.products
      .map(p => p.asin)
      .filter((asin): asin is string => !!asin);

    if (asins.length > 0 && JSON.stringify(asins) !== JSON.stringify(context.selectedAsins)) {
      context.selectedAsins = asins;
      context.dataSource = 'scraper';
      // 同步到 Zustand store
      appStore.getState().setSelectedAsins(asins);
      console.log('[数据加载] 自动加载 Scraper 数据:', context.selectedAsins);
      showToast(`已自动加载 ${asins.length} 个产品 ASIN`, { type: 'success' });
    }

    // 自动启用真实数据分析模式
    if (!context.useRealData) {
      context.useRealData = true;
      console.log('[数据加载] 已自动启用真实数据分析模式');
    }
  }
}

/**
 * 检查是否有已加载的历史报告（从全局状态）
 */
export function checkLoadedReport(context: AlpineContext): void {
  const report = appStore.getState().analysis?.analysisReport;

  // 类型守卫：确保 report 是对象类型
  if (!report || typeof report === 'string') {
    return;
  }

  // 检测报告格式：标准 FullAnalysisReport 格式
  // 检查是否包含任何分析目标字段
  const reportObj = report as Record<string, unknown>;
  const hasAnalysisData = [
    'title-keywords',
    'selling-points',
    'fatal-flaws',
    'wow-moments',
    'hesitation-points',
    'buyer-profile',
    'vocab-gap',
    'promise-reality'
  ].some(key => reportObj[key]);

  if (hasAnalysisData) {
    console.log('[数据加载] 检测到已加载的分析报告');

    // 加载报告数据到当前组件
    context.analysisReport = reportObj;
    context.hasReport = true;

    console.log('[数据加载] 已显示历史分析报告');
    showToast('已加载历史分析报告', { type: 'success' });
  }
}

/**
 * 加载历史分析报告
 */
export function loadHistoricalReport(
  context: AlpineContext,
  detail: HistoricalReportDetail
): void {
  try {
    if (!detail || !isHistoricalAnalysisReport(detail.report)) {
      showToast('历史报告数据无效', { type: 'error' });
      return;
    }

    // 加载历史报告数据（只保存原始报告）
    context.analysisReport = detail.report;
    context.hasReport = true;

    // 同步到 Zustand store
    appStore.getState().setAnalysisReport(detail.report);

    console.log('[数据加载] 已加载历史分析报告:', detail.timestamp);
    showToast(`已加载历史分析报告 (${formatHistoryDate(detail.timestamp)})`, { type: 'success' });
  } catch (error) {
    console.error('[数据加载] 加载历史报告失败:', error);
    showToast('加载历史报告失败', { type: 'error' });
  }
}
