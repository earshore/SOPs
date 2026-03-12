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

import { Logger } from '../../../../../../services/loggerService';
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
    _navigationHandler: null as EventListener | null,

    // ========== Lifecycle ==========
    init(this: AlpineContext & Record<string, unknown>) {
      Logger.debug('[Alpine 组件] 🚀 组件初始化');

      // 设置自动状态同步（Zustand → Alpine）
      this._unsubscribes = createMultipleStateSyncs([
        {
          selector: (state) => state.analysis.selectedAsins,
          onChange: (asins) => { this.selectedAsins = [...(asins as string[])]; },
          immediate: true
        },
        {
          selector: (state) => state.analysis.isAnalyzing,
          onChange: (isAnalyzing) => { this.isAnalyzing = isAnalyzing as boolean; },
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
        Logger.debug('[Alpine 组件] ✅ 已默认全选所有分析目标:', this.selectedTargets.length);
      }

      // 监听 analysisReport 变化，自动更新 hasReport 标志
      (this as any).$watch('analysisReport', (newValue: unknown) => {
        Logger.debug('[Alpine 组件] 📊 analysisReport 变化检测:', !!newValue);
        (this as any).hasReport = !!newValue;
        if (newValue) {
          const resultsCount = (this as any).results?.length || 0;
          Logger.debug('[Alpine 组件] 📊 results 重新计算:', resultsCount, '个结果');
        }
      });

      // 监听导航事件
      this._navigationHandler = (() => {
        (this as any).navigateToScraper();
      }) as EventListener;
      window.addEventListener('navigate-to-scraper' as any, this._navigationHandler as EventListener);

      // 检查是否有新的 Scraper 数据
      checkAndLoadScraperData(this);

      // 检查是否有已加载的历史报告
      checkLoadedReport(this);
    },

    // ========== 清理 ==========
    destroy(this: AlpineContext & Record<string, unknown>) {
      Logger.debug('[Alpine 组件] 🧹 组件销毁，清理订阅');
      if (Array.isArray(this._unsubscribes)) {
        cleanupSubscriptions(this._unsubscribes);
      }
      // 清理导航事件监听器
      if (this._navigationHandler) {
        window.removeEventListener('navigate-to-scraper' as any, this._navigationHandler as EventListener);
        this._navigationHandler = null;
      }
    },

    // ========== Data Loading ==========
    loadHistoricalReport(detail: { report: unknown; timestamp: string }) {
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

    navigateToScraper() {
      Logger.debug('[Alpine 组件] 🔄 导航到数据采集页面');
      // 使用路由系统导航到 scraper 页面
      if (window.location.hash !== '#scraper') {
        window.location.hash = '#scraper';
      }
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
    },

    // ========== 置信度相关 ==========
    get reportConfidence() {
      const report = this.analysisReport;
      if (!report || typeof report === 'string') {
        Logger.debug('[置信度] reportConfidence: 报告不存在或为字符串');
        return null;
      }
      const reportObj = report as any;
      if (!reportObj._metadata) {
        Logger.warn('[置信度] reportConfidence: 报告缺少 _metadata 字段');
        return null;
      }
      const confidence = reportObj._metadata.confidence || null;
      Logger.debug('[置信度] reportConfidence:', confidence);
      return confidence;
    },

    get overallConfidence() {
      const report = this.analysisReport;
      if (!report || typeof report === 'string') {
        Logger.debug('[置信度] overallConfidence: 报告不存在或为字符串');
        return 0;
      }
      const reportObj = report as any;
      if (!reportObj._metadata) {
        Logger.warn('[置信度] overallConfidence: 报告缺少 _metadata 字段');
        return 0;
      }
      const overall = reportObj._metadata.overallConfidence || 0;
      Logger.debug('[置信度] overallConfidence:', overall);
      return overall;
    },

    get overallConfidencePercent() {
      const percent = Math.round((this.overallConfidence as number) * 100);
      Logger.debug('[置信度] overallConfidencePercent:', percent + '%');
      return percent;
    },

    get hasConfidenceData() {
      const hasData = !!this.reportConfidence;
      Logger.debug('[置信度] hasConfidenceData:', hasData);
      return hasData;
    },

    getTargetConfidence(targetId: string): number {
      const confidence = this.reportConfidence as Record<string, number> | null;
      if (!confidence || !confidence[targetId]) return 0;
      return Math.round(confidence[targetId] * 100);
    },

    getConfidenceColorClass(targetId: string): string {
      const percent = this.getTargetConfidence(targetId);
      if (percent >= 70) return 'confidence-high-bg confidence-high-text confidence-high-border';
      if (percent >= 50) return 'confidence-medium-bg confidence-medium-text confidence-medium-border';
      return 'confidence-low-bg confidence-low-text confidence-low-border';
    },

    getConfidenceBgAlphaClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-bg-alpha';
      if (percent >= 50) return 'confidence-medium-bg-alpha';
      return 'confidence-low-bg-alpha';
    },

    getConfidenceTextLightClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-text-light';
      if (percent >= 50) return 'confidence-medium-text-light';
      return 'confidence-low-text-light';
    },

    getConfidenceTextBorderClass(percent: number): string {
      if (percent >= 70) return 'confidence-high-text confidence-high-border';
      if (percent >= 50) return 'confidence-medium-text confidence-medium-border';
      return 'confidence-low-text confidence-low-border';
    },

    getConfidenceLevel(percent: number): string {
      if (percent >= 70) return '高';
      if (percent >= 50) return '中';
      return '低';
    },

    getConfidenceAriaLabel(percent: number): string {
      const level = this.getConfidenceLevel(percent);
      return `置信度: ${percent}%, 等级: ${level}`;
    }
  };

  // 合并计算属性 - 使用 defineProperties 保留 getter 特性
  const computedProps = createComputedProperties(panel as unknown as AlpineContext);
  const descriptors = Object.getOwnPropertyDescriptors(computedProps);
  Object.defineProperties(panel, descriptors);

  return panel as unknown as AlpineContext & ComputedProperties & Record<string, unknown>;
}
