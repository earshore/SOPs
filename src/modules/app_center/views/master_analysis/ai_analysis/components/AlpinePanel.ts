/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import { analysisTargets } from '../config/analysisTargets';
import { createComputedProperties } from './computedProperties';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { formatHistoryDate } from '../services/reportGenerator';
import { getTargetColor, getPromptText } from './helpers';
import { highlightJson } from '../services/reportGenerator';
import * as actions from './actions';

/**
 * 创建 Alpine 面板组件
 */
export function createAiAnalysisPanel(moduleState: any) {
  return {
    // ========== State ==========
    selectedAsins: moduleState.selectedAsins,
    selectedTargets: moduleState.selectedTargets,
    isAnalyzing: moduleState.isAnalyzing,
    progress: moduleState.progress,
    currentStep: moduleState.currentStep,
    results: moduleState.results,
    analysisReport: moduleState.analysisReport,
    expandedPromptIndex: moduleState.expandedPromptIndex,
    showPromptPanel: moduleState.showPromptPanel,
    showJsonViewer: moduleState.showJsonViewer,
    useRealData: moduleState.useRealData,
    dataSource: moduleState.dataSource,
    showDataSourceBanner: moduleState.showDataSourceBanner,

    // ========== Computed Properties ==========
    ...createComputedProperties(this as any),

    // ========== Lifecycle ==========
    init() {
      console.log('[Alpine 组件] 🚀 组件初始化');
      this.syncFromModuleState();
      
      // 默认全选所有分析目标（如果当前没有选中任何目标）
      if (this.selectedTargets.length === 0) {
        this.selectedTargets = analysisTargets.map(t => t.id);
        this.syncToModuleState();
        console.log('[Alpine 组件] ✅ 已默认全选所有分析目标');
      }
      
      // 检查是否有新的 Scraper 数据
      checkAndLoadScraperData(this, moduleState);

      // 检查是否有已加载的历史报告
      checkLoadedReport(this, moduleState);

      // 3秒后自动隐藏数据源横幅
      setTimeout(() => {
        this.showDataSourceBanner = false;
        moduleState.showDataSourceBanner = false;
        console.log('[Alpine 组件] 🎯 数据源横幅已自动隐藏');
      }, 3000);
    },

    // ========== State Sync ==========
    syncFromModuleState() {
      this.selectedAsins = moduleState.selectedAsins;
      this.selectedTargets = moduleState.selectedTargets;
      this.isAnalyzing = moduleState.isAnalyzing;
      this.progress = moduleState.progress;
      this.currentStep = moduleState.currentStep;
      this.results = moduleState.results;
      this.analysisReport = moduleState.analysisReport;
    },

    syncToModuleState() {
      moduleState.selectedAsins = this.selectedAsins;
      moduleState.selectedTargets = this.selectedTargets;
      moduleState.isAnalyzing = this.isAnalyzing;
      moduleState.progress = this.progress;
      moduleState.currentStep = this.currentStep;
      moduleState.results = this.results;
      moduleState.analysisReport = this.analysisReport;
    },

    // ========== Data Loading ==========
    loadHistoricalReport(detail: { report: any; timestamp: string }) {
      loadHistoricalReport(this, moduleState, detail);
    },

    formatHistoryDate(timestamp: string): string {
      return formatHistoryDate(timestamp);
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      actions.toggleAsin(this, moduleState, asin);
    },

    selectAllAsins() {
      actions.selectAllAsins(this, moduleState, this.availableAsins);
    },

    clearAllAsins() {
      actions.clearAllAsins(this, moduleState);
    },

    toggleTarget(targetId: string) {
      actions.toggleTarget(this, moduleState, targetId);
    },

    selectAllTargets() {
      actions.selectAllTargets(this, moduleState);
    },

    clearAllTargets() {
      actions.clearAllTargets(this, moduleState);
    },

    togglePromptPanel() {
      actions.togglePromptPanel(this, moduleState);
    },

    togglePromptItem(index: number) {
      actions.togglePromptItem(this, moduleState, index);
    },

    toggleJsonViewer() {
      actions.toggleJsonViewer(this, moduleState);
    },

    toggleDataSource() {
      actions.toggleDataSource(this, moduleState);
    },

    copyPrompt(index: number) {
      actions.copyPrompt(this, this.currentProducts, index);
    },

    copyJson() {
      actions.copyJson(this, this.dataSourceMarketplace);
    },

    copyMarkdown() {
      actions.copyMarkdown(this, this.dataSourceMarketplace, this.dataSourceLabel);
    },

    downloadJson() {
      actions.downloadJson(this, this.dataSourceMarketplace);
    },

    async runAnalysis() {
      await actions.runAnalysisAction(this, moduleState, this.currentProducts);
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      return getTargetColor(color);
    },

    getPromptText(targetId: string): string {
      return getPromptText(targetId, this.currentProducts);
    },

    highlightJson(json: string): string {
      return highlightJson(json);
    }
  };
}
