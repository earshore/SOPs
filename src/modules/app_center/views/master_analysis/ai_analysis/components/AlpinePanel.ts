/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import { analysisTargets } from '../config/analysisTargets';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { formatHistoryDate } from '../services/reportGenerator';
import { getTargetColor, getPromptText } from './helpers';
import { getPromptTokenCount, getFormattedTokenCount } from './helpers';
import { highlightJson } from '../services/reportGenerator';
import * as actions from './actions';
import { ModuleState } from '../state/moduleState';
import { AlpineContext } from '../types';
import { createComputedProperties, ComputedProperties } from './computedProperties';

/**
 * 创建 Alpine 面板组件
 */
export function createAiAnalysisPanel(moduleState: ModuleState): AlpineContext & ComputedProperties & Record<string, unknown> {
  const panel = {
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

    // ========== Lifecycle ==========
    init(this: AlpineContext & Record<string, unknown>) {
      console.log('[Alpine 组件] 🚀 组件初始化');
      
      // 默认全选所有分析目标（如果当前没有选中任何目标）
      // 必须在 syncFromModuleState 之前设置，确保初始状态正确
      if (moduleState.selectedTargets.length === 0) {
        moduleState.selectedTargets = analysisTargets.map(t => t.id);
        console.log('[Alpine 组件] ✅ 已默认全选所有分析目标:', moduleState.selectedTargets.length);
      }
      
      this.syncFromModuleState();
      
      // 强制触发响应式更新
      // 使用 $nextTick 确保在 DOM 更新后执行
      this.$nextTick(() => {
        // 通过重新赋值触发响应式
        const targets = [...this.selectedTargets];
        this.selectedTargets = targets;
        console.log('[Alpine 组件] 🔄 响应式更新完成, selectedTargets:', this.selectedTargets.length);
        console.log('[Alpine 组件] 🔍 this.selectedTargets 数组:', this.selectedTargets);
        console.log('[Alpine 组件] 🔍 canAnalyze 状态:', this.canAnalyze);
      });
      
      // 检查是否有新的 Scraper 数据
      checkAndLoadScraperData(this, moduleState);

      // 检查是否有已加载的历史报告
      checkLoadedReport(this, moduleState);
    },

    // ========== State Sync ==========
    syncFromModuleState() {
      // 直接赋值新数组，触发 Alpine.js 响应式
      this.selectedAsins = [...moduleState.selectedAsins];
      this.selectedTargets = [...moduleState.selectedTargets];
      this.isAnalyzing = moduleState.isAnalyzing;
      this.progress = moduleState.progress;
      this.currentStep = moduleState.currentStep;
      this.results = [...moduleState.results];
      this.analysisReport = moduleState.analysisReport;
      
      console.log('[Alpine 组件] 📊 状态同步完成:', {
        selectedAsins: this.selectedAsins.length,
        selectedTargets: this.selectedTargets.length
      });
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
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      loadHistoricalReport(ctx, moduleState, detail);
    },

    formatHistoryDate(timestamp: string): string {
      return formatHistoryDate(timestamp);
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleAsin(ctx, moduleState, asin);
    },

    selectAllAsins() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.selectAllAsins(ctx, moduleState, ctx.availableAsins);
    },

    clearAllAsins() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.clearAllAsins(ctx, moduleState);
    },

    toggleTarget(targetId: string) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleTarget(ctx, moduleState, targetId);
    },

    selectAllTargets() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.selectAllTargets(ctx, moduleState);
    },

    clearAllTargets() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.clearAllTargets(ctx, moduleState);
    },

    togglePromptPanel() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.togglePromptPanel(ctx, moduleState);
    },

    togglePromptItem(index: number) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.togglePromptItem(ctx, moduleState, index);
    },

    toggleJsonViewer() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleJsonViewer(ctx, moduleState);
    },

    toggleDataSource() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleDataSource(ctx, moduleState);
    },

    copyPrompt(index: number) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.copyPrompt(ctx, ctx.currentProducts, index);
    },

    copyJson() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.copyJson(ctx, ctx.dataSourceMarketplace);
    },

    copyMarkdown() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.copyMarkdown(ctx, ctx.dataSourceMarketplace, ctx.dataSourceLabel);
    },

    downloadJson() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.downloadJson(ctx, ctx.dataSourceMarketplace);
    },

    async runAnalysis() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      await actions.runAnalysisAction(ctx, moduleState, ctx.currentProducts);
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      return getTargetColor(color);
    },

    getPromptText(targetId: string): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return getPromptText(targetId, ctx.currentProducts);
    },

    getPromptTokenCount(targetId: string): number {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return getPromptTokenCount(targetId, ctx.currentProducts);
    },

    getFormattedTokenCount(targetId: string): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return getFormattedTokenCount(targetId, ctx.currentProducts);
    },

    highlightJson(json: string): string {
      return highlightJson(json);
    }
  };
  
  // 合并计算属性 - 使用 defineProperties 保留 getter 特性
  const computedProps = createComputedProperties(panel as unknown as AlpineContext);
  const descriptors = Object.getOwnPropertyDescriptors(computedProps);
  Object.defineProperties(panel, descriptors);
  
  return panel as unknown as AlpineContext & ComputedProperties & Record<string, unknown>;
}
