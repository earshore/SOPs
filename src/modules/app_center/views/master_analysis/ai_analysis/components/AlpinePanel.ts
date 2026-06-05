/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import { analysisTargets } from '../config/analysisTargets';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { formatHistoryDate } from '../services/reportGenerator';
import { parseAnalysisReport } from '../services/analysisService';
import { getTargetColorClass, getPromptText, getResultIcon, getResultColor } from './helpers';
import { getPromptTokenCount, getFormattedTokenCount } from './helpers';
import { highlightJson } from '../services/reportGenerator';
import * as actions from './actions';
import { AlpineContext, FullReportData } from '../types';
import { createComputedProperties, ComputedProperties } from './computedProperties';
import type { FullAnalysisReport } from '../config/analysisReportData';
import { createMultipleStateSyncs, cleanupSubscriptions } from '@common/utils/stateSync';
import { createPerformanceSettingsPanel } from './PerformanceSettings';

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
    reportResults: [],
    reportListingsResults: [],
    reportReviewsResults: [],
    reportTotalHighlights: 0,
    reportTotalDetails: 0,
    reportFullData: null as FullReportData | null,
    reportRenderVersion: 0,
    expandedPromptIndex: null as number | null,
    showPromptPanel: false,
    showJsonViewer: false,
    useRealData: true,
    dataSource: 'scraper' as 'sample' | 'scraper',
    showDataSourceBanner: true,
    productSummaryTooltipVisible: false,
    // ========== Collapsible UI State ==========
    // 默认收起选择区：收起只展示一个大标题，展开同时展示 ASIN 与分析目标模块
    showSelectionPanel: false,

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
        (this as any).refreshReportView();
      });

      (this as any).$watch('selectedTargets', () => {
        if ((this as any).hasReport) {
          (this as any).refreshReportView();
        }
      });

      (this as any).$watch('selectedAsins', () => {
        if ((this as any).hasReport) {
          (this as any).refreshReportView();
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
      (this as any).refreshReportView();
    },

    // ========== 清理 ==========
    destroy(this: AlpineContext & Record<string, unknown>) {
      Logger.debug('[Alpine 组件] 🔄 Alpine 组件销毁，清理资源');

      // 清理状态同步订阅
      if (Array.isArray(this._unsubscribes)) {
        cleanupSubscriptions(this._unsubscribes);
      }

      // 清理导航事件监听器
      if (this._navigationHandler) {
        window.removeEventListener('navigate-to-scraper' as any, this._navigationHandler as EventListener);
        this._navigationHandler = null;
      }

      Logger.debug('[Alpine 组件] ✅ 资源清理完成');
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

    toggleSelectionPanel() {
      this.showSelectionPanel = !this.showSelectionPanel;
    },

    get selectionPanelButtonClass(): string {
      return this.showSelectionPanel ? 'bg-slate-50/70 border-b border-slate-200/70' : '';
    },

    get showSelectionSummary(): boolean {
      return !this.showSelectionPanel;
    },

    showProductSummaryTooltip(): void {
      this.productSummaryTooltipVisible = true;
    },

    hideProductSummaryTooltip(): void {
      this.productSummaryTooltipVisible = false;
    },

    get selectionPanelChevronClass(): string {
      return `fa-solid fa-chevron-${this.showSelectionPanel ? 'up' : 'down'} text-slate-400 text-base`;
    },

    get promptPanelChevronClass(): string {
      return `fa-solid fa-chevron-${this.showPromptPanel ? 'up' : 'down'}`;
    },

    getPromptItemChevronClass(index: number): string {
      return `fa-solid fa-chevron-${this.expandedPromptIndex === index ? 'up' : 'down'} text-slate-400`;
    },

    getTargetById(targetId: string) {
      return analysisTargets.find(target => target.id === targetId);
    },

    getTargetName(targetId: string): string {
      return this.getTargetById(targetId)?.name || targetId;
    },

    getTargetDescription(targetId: string): string {
      return this.getTargetById(targetId)?.description || '';
    },

    getPromptNumber(index: number): number {
      return index + 1;
    },

    getPromptTokenCountText(targetId: string): string {
      return this.getPromptTokenCount(targetId).toLocaleString();
    },

    getPromptCharCountText(targetId: string): string {
      return this.getPromptText(targetId).length.toLocaleString();
    },

    isTargetSelected(targetId: string): boolean {
      return this.selectedTargets.includes(targetId);
    },

    getAsinOptionClass(asin: string): string {
      return this.selectedAsins.includes(asin) ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-200';
    },

    getAsinTextClass(asin: string): string {
      return this.selectedAsins.includes(asin) ? 'text-indigo-700' : 'text-slate-700';
    },

    getListingTargetCardClass(targetId: string): string {
      return this.isTargetSelected(targetId) ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white';
    },

    getReviewTargetCardClass(targetId: string): string {
      return this.isTargetSelected(targetId) ? 'border-amber-300 bg-amber-50 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white';
    },

    getListingTargetIconWrapClass(targetId: string): string {
      return this.isTargetSelected(targetId) ? 'bg-blue-50' : 'bg-slate-100 group-hover:bg-slate-200';
    },

    getListingTargetIconClass(targetId: string): string {
      return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-blue-600`;
    },

    getReviewTargetIconWrapClass(targetId: string): string {
      return this.isTargetSelected(targetId) ? 'bg-amber-50' : 'bg-slate-100 group-hover:bg-slate-200';
    },

    getReviewTargetIconClass(targetId: string): string {
      return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-amber-600`;
    },

    getTargetCheckClass(targetId: string): string {
      return this.isTargetSelected(targetId) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 group-hover:border-slate-400';
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

    get hasAvailableAsins(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return ctx.availableAsins.length > 0;
    },

    get hasCurrentProducts(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return ctx.currentProducts.length > 0;
    },

    get hasMoreCurrentProducts(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return ctx.currentProducts.length > 2;
    },

    get hasTotalTokenCount(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return ctx.totalTokenCount > 0;
    },

    get isUsingSampleData(): boolean {
      return !this.useRealData;
    },

    get dataSourceToggleLabelClass(): string {
      return this.useRealData ? '' : 'font-semibold text-slate-700';
    },

    get realDataToggleLabelClass(): string {
      return this.useRealData ? 'font-semibold text-slate-700' : '';
    },

    get dataSourceToggleTrackClass(): string {
      return this.useRealData ? 'bg-indigo-600' : 'bg-slate-300';
    },

    get dataSourceToggleThumbClass(): string {
      return this.useRealData ? 'translate-x-6' : 'translate-x-1';
    },

    get showMissingRealDataNotice(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return this.useRealData && !ctx.hasScraperData;
    },

    get dataSourceLabelText(): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return `数据源: ${ctx.dataSourceLabel}`;
    },

    get analysisHeroIconWrapClass(): string {
      return this.isAnalyzing ? 'bg-white/20' : 'bg-white/10';
    },

    get analysisHeroIconClass(): string {
      if (this.progress >= 100) return 'fa-solid fa-circle-check';
      return this.isAnalyzing ? 'fa-solid fa-robot animate-pulse' : 'fa-solid fa-bolt';
    },

    get isAnalysisComplete(): boolean {
      return this.progress >= 100;
    },

    get isAnalysisRunning(): boolean {
      return this.isAnalyzing && this.progress < 100;
    },

    get isAnalysisIdle(): boolean {
      return !this.isAnalyzing && this.progress < 100;
    },

    get hasAnalysisSelection(): boolean {
      return this.selectedTargets.length > 0 && this.selectedAsins.length > 0;
    },

    get needsAnalysisSelection(): boolean {
      return !this.isAnalyzing && !this.hasAnalysisSelection;
    },

    get canRunAnalysis(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return this.selectedTargets.length > 0 && ctx.hasData && !this.isAnalyzing;
    },

    get runAnalysisDisabled(): boolean {
      return !this.canRunAnalysis;
    },

    get analysisNotRunning(): boolean {
      return !this.isAnalyzing;
    },

    get jsonViewerCollapsed(): boolean {
      return !this.showJsonViewer;
    },

    get runAnalysisButtonClass(): string {
      if (this.isAnalyzing) return 'bg-white/20 text-white cursor-wait backdrop-blur-sm border border-white/30';
      return this.canRunAnalysis
        ? 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 border border-white/50'
        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10';
    },

    get showRunDisabledHint(): boolean {
      return !this.canRunAnalysis && !this.isAnalyzing;
    },

    get isMissingAsinAndTarget(): boolean {
      return this.selectedTargets.length === 0 && this.selectedAsins.length === 0;
    },

    get isMissingTargetOnly(): boolean {
      return this.selectedTargets.length === 0 && this.selectedAsins.length > 0;
    },

    get isMissingAsinOnly(): boolean {
      return this.selectedTargets.length > 0 && this.selectedAsins.length === 0;
    },

    get isMissingLoadedData(): boolean {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return this.selectedTargets.length > 0 && this.selectedAsins.length > 0 && !ctx.hasData;
    },

    get progressText(): string {
      return `${Math.round(this.progress)}%`;
    },

    get progressStyle(): string {
      return `width: ${this.progress}%`;
    },

    get progressDataStepClass(): string {
      return this.progress >= 0 ? 'text-white/80' : '';
    },

    get progressNlpStepClass(): string {
      return this.progress >= 33 ? 'text-white/80' : '';
    },

    get progressInsightStepClass(): string {
      return this.progress >= 66 ? 'text-white/80' : '';
    },

    get progressDoneStepClass(): string {
      return this.progress >= 100 ? 'text-white/80' : '';
    },

    get reportStatusText(): string {
      return this.isAnalyzing ? '分析进行中，结果实时更新' : '分析结果';
    },

    get reportCompletedAtText(): string {
      const report = this.analysisReport as { _metadata?: { analyzedAt?: string } } | null;
      const analyzedAt = report && typeof report === 'object' ? report._metadata?.analyzedAt : undefined;
      return new Date(analyzedAt || Date.now()).toLocaleTimeString('zh-CN');
    },

    get reportStatusBadgeClass(): string {
      return this.isAnalyzing ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    },

    get reportStatusIconClass(): string {
      return this.isAnalyzing ? 'fa-solid fa-bolt animate-pulse' : 'fa-solid fa-circle-check';
    },

    get reportStatusBadgeText(): string {
      return this.isAnalyzing ? '实时生成' : '已完成';
    },

    get jsonViewerChevronClass(): string {
      return `fa-solid fa-chevron-${this.showJsonViewer ? 'up' : 'down'}`;
    },

    get selectedAsinsJsonText(): string {
      return `"${this.selectedAsins.join('", "')}"`;
    },

    get hasReportWithResults(): boolean {
      return this.hasReport && this.reportResults.length > 0;
    },

    get hasReportListingsResults(): boolean {
      return this.reportListingsResults.length > 0;
    },

    get hasReportReviewsResults(): boolean {
      return this.reportReviewsResults.length > 0;
    },

    get hasNoReportIdle(): boolean {
      return !this.hasReport && !this.isAnalyzing;
    },

    get overallConfidenceAriaLabel(): string {
      return `整体置信度 ${this.overallConfidencePercent}%`;
    },

    get overallConfidenceLevelText(): string {
      return `置信度等级: ${this.getConfidenceLevel(this.overallConfidencePercent)}`;
    },

    getListingsResultCountText(): string {
      return `${this.reportListingsResults.length} 项`;
    },

    getReviewsResultCountText(): string {
      return `${this.reportReviewsResults.length} 项`;
    },

    showTargetConfidence(targetId: string): boolean {
      return this.hasConfidenceData && this.getTargetConfidence(targetId) > 0;
    },

    getTargetConfidenceText(targetId: string): string {
      return `${this.getTargetConfidence(targetId)}%`;
    },

    getResultColorEnd(targetId: string): string {
      const color = this.getResultColor(targetId);
      const colorMap: Record<string, string> = {
        amber: 'orange',
        orange: 'red',
        purple: 'indigo',
        teal: 'cyan',
        rose: 'pink'
      };
      return colorMap[color] || 'indigo';
    },

    getListingResultHeaderClass(targetId: string): string {
      const color = this.getResultColor(targetId);
      return `bg-gradient-to-r from-${color}-500 via-${color}-600 to-indigo-600`;
    },

    getReviewResultHeaderClass(targetId: string): string {
      const color = this.getResultColor(targetId);
      const end = this.getResultColorEnd(targetId);
      return `bg-gradient-to-r from-${color}-500 via-${color}-600 to-${end}-600`;
    },

    getResultIconWrapClass(targetId: string): string {
      return `bg-${this.getResultColor(targetId)}-500/20`;
    },

    getResultIconDisplayClass(targetId: string): string {
      return `${this.getResultIcon(targetId)} text-xl`;
    },

    getResultCategoryClass(targetId: string): string {
      const color = this.getResultColor(targetId);
      return `bg-${color}-50 text-${color}-700`;
    },

    getHighlightClass(type: string): Record<string, boolean> {
      return {
        'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200': type === 'danger',
        'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200': type === 'success',
        'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200': type === 'warning',
        'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200': type === 'info'
      };
    },

    getHighlightIconClass(type: string): Record<string, boolean> {
      return {
        'fa-circle-exclamation text-red-500': type === 'danger',
        'fa-circle-check text-emerald-500': type === 'success',
        'fa-triangle-exclamation text-amber-500': type === 'warning',
        'fa-circle-info text-blue-500': type === 'info'
      };
    },

    getReportJsonKbText(): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return (JSON.stringify(ctx.reportFullData).length / 1024).toFixed(1);
    },

    getReportJsonTokenText(): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return Math.ceil(JSON.stringify(ctx.reportFullData).length / 4).toLocaleString();
    },

    getReportJsonCharText(): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return JSON.stringify(ctx.reportFullData).length.toLocaleString();
    },

    getHighlightedReportJson(): string {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      return this.highlightJson(JSON.stringify(ctx.reportFullData, null, 2));
    },

    isPromptExpanded(index: number): boolean {
      return this.expandedPromptIndex === index;
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
      // 使用正确的路由路径
      if (window.location.hash !== '#/app-center/scraper') {
        window.location.hash = '#/app-center/scraper';
      }
    },

    refreshReportView() {
      const ctx = this as unknown as AlpineContext & ComputedProperties;

      if (!ctx.analysisReport || ctx.selectedTargets.length === 0) {
        ctx.reportResults = [];
        ctx.reportListingsResults = [];
        ctx.reportReviewsResults = [];
        ctx.reportTotalHighlights = 0;
        ctx.reportTotalDetails = 0;
        ctx.reportFullData = null;
        ctx.reportRenderVersion += 1;
        return;
      }

      try {
        const reportResults = parseAnalysisReport(
          ctx.analysisReport as FullAnalysisReport,
          ctx.selectedTargets
        );

        ctx.reportResults = reportResults;
        ctx.reportListingsResults = reportResults.filter(result => result.source === 'Listings');
        ctx.reportReviewsResults = reportResults.filter(result => result.source === 'Reviews');
        ctx.reportTotalHighlights = reportResults.reduce((acc, result) => acc + result.highlights.length, 0);
        ctx.reportTotalDetails = reportResults.reduce((acc, result) => acc + result.details.length, 0);

        const productTitle = ctx.currentProducts.length > 0
          ? ctx.currentProducts.map(product => product.productTitle).join(' | ')
          : undefined;

        ctx.reportFullData = {
          metadata: {
            asins: [...ctx.selectedAsins],
            targets: [...ctx.selectedTargets],
            timestamp: new Date().toISOString(),
            dataSource: ctx.dataSource,
            marketplace: ctx.dataSourceMarketplace,
            productTitle
          },
          analysisReport: ctx.analysisReport
        };
        ctx.reportRenderVersion += 1;

        Logger.debug('[Alpine 组件] 📊 report view 已刷新:', {
          results: ctx.reportResults.length,
          listings: ctx.reportListingsResults.length,
          reviews: ctx.reportReviewsResults.length,
          renderVersion: ctx.reportRenderVersion
        });
      } catch (error) {
        ctx.reportResults = [];
        ctx.reportListingsResults = [];
        ctx.reportReviewsResults = [];
        ctx.reportTotalHighlights = 0;
        ctx.reportTotalDetails = 0;
        ctx.reportFullData = null;
        ctx.reportRenderVersion += 1;
        Logger.error('[Alpine 组件] 刷新报告视图失败:', error);
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
    },

    // ========== 性能设置 ==========
    perfSettings: createPerformanceSettingsPanel()
  };

  // 合并计算属性 - 使用 defineProperties 保留 getter 特性
  const computedProps = createComputedProperties(panel as unknown as AlpineContext);
  const descriptors = Object.getOwnPropertyDescriptors(computedProps);
  Object.defineProperties(panel, descriptors);

  return panel as unknown as AlpineContext & ComputedProperties & Record<string, unknown>;
}
