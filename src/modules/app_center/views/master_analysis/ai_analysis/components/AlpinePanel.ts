/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import { analysisTargets } from '../config/analysisTargets';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { formatHistoryDate } from '../services/reportGenerator';
import { getTargetColorClass, getPromptText, getResultIcon, getResultColor } from './helpers';
import { getPromptTokenCount, getFormattedTokenCount } from './helpers';
import { highlightJson } from '../services/reportGenerator';
import * as actions from './actions';
import { AlpineContext } from '../types';
import { createComputedProperties, ComputedProperties } from './computedProperties';
import { createMultipleStateSyncs, cleanupSubscriptions } from '@common/utils/stateSync';

/**
 * 创建 Alpine 面板组件
 */
export function createAiAnalysisPanel(): AlpineContext & ComputedProperties & Record<string, unknown> {
  const panel = {
    // ========== State (从 Zustand 同步) ==========
    selectedAsins: [] as string[],
    selectedTargets: [] as string[],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    analysisReport: null as unknown,
    hasReport: false,
    expandedPromptIndex: null as number | null,
    showPromptPanel: false,
    showJsonViewer: false,
    useRealData: true,
    dataSource: 'scraper' as 'sample' | 'scraper',
    showDataSourceBanner: true,

    // ========== 订阅清理函数 ==========
    _unsubscribes: [] as Array<() => void>,

    // ========== Lifecycle ==========
    init(this: AlpineContext & Record<string, unknown>) {
      console.log('[Alpine 组件] 🚀 组件初始化');

      // 设置自动状态同步（Zustand → Alpine）
      this._unsubscribes = createMultipleStateSyncs([
        {
          selector: (state) => state.analysis.selectedAsins,
          onChange: (asins) => { this.selectedAsins = [...asins]; },
          immediate: true
        },
        {
          selector: (state) => state.analysis.isAnalyzing,
          onChange: (isAnalyzing) => { this.isAnalyzing = isAnalyzing; },
          immediate: true
        },
        {
          selector: (state) => state.analysis.analysisReport,
          onChange: (report) => {
            this.analysisReport = report;
            this.hasReport = !!report;
          },
          immediate: true
        }
      ]);

      // 初始化 selectedTargets（默认全选）
      const currentTargets = this.selectedTargets;
      if (currentTargets.length === 0) {
        this.selectedTargets = analysisTargets.map(t => t.id);
        console.log('[Alpine 组件] ✅ 已默认全选所有分析目标:', this.selectedTargets.length);
      }

      // 监听 analysisReport 变化，自动更新 hasReport 标志
      (this as any).$watch('analysisReport', (newValue: any) => {
        console.log('[Alpine 组件] 📊 analysisReport 变化检测:', !!newValue);
        (this as any).hasReport = !!newValue;
        if (newValue) {
          const resultsCount = (this as any).results?.length || 0;
          console.log('[Alpine 组件] 📊 results 重新计算:', resultsCount, '个结果');
        }
      });

      // 检查是否有新的 Scraper 数据
      checkAndLoadScraperData(this);

      // 检查是否有已加载的历史报告
      checkLoadedReport(this);
    },

    // ========== 清理 ==========
    destroy(this: AlpineContext & Record<string, unknown>) {
      console.log('[Alpine 组件] 🧹 组件销毁，清理订阅');
      if (Array.isArray(this._unsubscribes)) {
        cleanupSubscriptions(this._unsubscribes);
      }
    },

    // ========== Data Loading ==========
    loadHistoricalReport(detail: { report: any; timestamp: string }) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      loadHistoricalReport(ctx, detail);
    },

    formatHistoryDate(timestamp: string): string {
      return formatHistoryDate(timestamp);
    },

    // ========== Actions ==========
    toggleAsin(asin: string) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleAsin(ctx, asin);
    },

    selectAllAsins() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.selectAllAsins(ctx, ctx.availableAsins);
    },

    clearAllAsins() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.clearAllAsins(ctx);
    },

    toggleTarget(targetId: string) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleTarget(ctx, targetId);
    },

    selectAllTargets() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.selectAllTargets(ctx);
    },

    clearAllTargets() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.clearAllTargets(ctx);
    },

    togglePromptPanel() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.togglePromptPanel(ctx);
    },

    togglePromptItem(index: number) {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.togglePromptItem(ctx, index);
    },

    toggleJsonViewer() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleJsonViewer(ctx);
    },

    toggleDataSource() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      actions.toggleDataSource(ctx);
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
      await actions.runAnalysisAction(ctx, ctx.currentProducts);
    },

    // ========== Helpers ==========
    getTargetColor(color: string): string {
      return getTargetColorClass(color);
    },

    getResultIcon(targetId: string): string {
      return getResultIcon(targetId);
    },

    getResultColor(targetId: string): string {
      return getResultColor(targetId);
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
