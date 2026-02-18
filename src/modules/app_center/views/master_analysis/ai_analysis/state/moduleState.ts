/**
 * 模块状态管理
 * 定义和管理 AI 智能分析模块的状态
 */

import { AnalysisResult } from '../types';
import type { FullAnalysisReport } from '../config/analysisReportData';

/**
 * 模块状态接口
 */
export interface ModuleState {
  selectedAsins: string[]; // 选中的产品 ASIN 列表
  selectedTargets: string[]; // 选中的分析目标
  isAnalyzing: boolean; // 是否正在分析
  progress: number; // 分析进度 (0-100)
  currentStep: string; // 当前步骤描述
  results: AnalysisResult[]; // 分析结果
  analysisReport: FullAnalysisReport | null; // 完整分析报告
  expandedPromptIndex: number | null; // 展开的提示词索引
  showPromptPanel: boolean; // 是否显示提示词面板
  showJsonViewer: boolean; // 是否显示 JSON 查看器
  useRealData: boolean; // 是否使用真实数据
  dataSource: 'sample' | 'scraper'; // 数据来源
  showDataSourceBanner: boolean; // 是否显示数据源横幅
}

/**
 * 创建初始状态
 */
export function createInitialState(): ModuleState {
  return {
    selectedAsins: [],
    selectedTargets: [],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    results: [],
    analysisReport: null,
    expandedPromptIndex: null,
    showPromptPanel: false,
    showJsonViewer: false,
    useRealData: true, // 强制使用真实数据
    dataSource: 'scraper', // 默认数据源为 scraper
    showDataSourceBanner: true // 默认显示数据源横幅
  };
}

/**
 * 重置状态到初始值
 */
export function resetState(state: ModuleState): void {
  const initialState = createInitialState();
  Object.assign(state, initialState);
}

/**
 * 从 Scraper 数据初始化 ASIN 列表
 */
export function initializeAsinsFromScraperData(state: ModuleState, scrapedData: any): void {
  if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
    // 自动选中所有产品的 ASIN
    state.selectedAsins = scrapedData.products
      .map((p: any) => p.asin)
      .filter((asin: string) => asin);
    state.dataSource = 'scraper';
    console.log('[状态管理] 已从 Scraper 加载数据:', state.selectedAsins);
  } else {
    // 没有真实数据时保持空状态
    state.selectedAsins = [];
    state.dataSource = 'scraper';
    console.log('[状态管理] 无数据,等待用户从数据采集页面导入');
  }
}
