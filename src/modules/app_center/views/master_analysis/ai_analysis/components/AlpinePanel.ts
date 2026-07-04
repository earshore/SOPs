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
import * as actions from './actions';
import { AlpineContext, FullReportData } from '../types';
import { createComputedProperties, ComputedProperties } from './computedProperties';
import type { FullAnalysisReport } from '../config/analysisReportData';
import { createMultipleStateSyncs, cleanupSubscriptions } from '@common/utils/stateSync';
import { createPerformanceSettingsPanel } from './PerformanceSettings';
import { navigateToRouteId } from '@/common/router/initRouter';

type AlpineWatchContext = {
  $watch: (property: string, callback: (newValue: unknown) => void) => void;
};

type AiAnalysisPanelContext = AlpineContext &
  ComputedProperties &
  AlpineWatchContext & {
    _navigationHandler: EventListener | null;
    navigateToScraper: () => void;
    refreshReportView: () => void;
  };

type AiAnalysisPanelState = Pick<
  AlpineContext,
  | 'selectedAsins'
  | 'selectedTargets'
  | 'isAnalyzing'
  | 'progress'
  | 'currentStep'
  | 'analysisReport'
  | 'hasReport'
  | 'reportResults'
  | 'reportListingsResults'
  | 'reportReviewsResults'
  | 'reportTotalHighlights'
  | 'reportTotalDetails'
  | 'reportFullData'
  | 'reportRenderVersion'
  | 'expandedPromptIndex'
  | 'showPromptPanel'
  | 'showJsonViewer'
  | 'dataSource'
  | '_unsubscribes'
> & {
  productSummaryTooltipVisible: boolean;
  showSelectionPanel: boolean;
  Math: AlpineSafeMath;
  _navigationHandler: EventListener | null;
  perfSettings: ReturnType<typeof createPerformanceSettingsPanel>;
};

type AiAnalysisPanelThis = AiAnalysisPanelContext &
  AiAnalysisPanelState & {
    currentProducts: unknown[];
    totalTokenCount: number;
    hasScraperData: boolean;
    canRunAnalysis: boolean;
    hasNoAnalysisData: boolean;
    hasReportWithResults: boolean;
    analysisHeroIsComplete: boolean;
    analysisHeroIsStrong: boolean;
    analysisHeroIsCompact: boolean;
    hasAnalysisSelection: boolean;
    progressAriaValue: number;
    reportConfidence: Record<string, number> | null;
    overallConfidence: number;
    overallConfidencePercent: number;
    hasConfidenceData: boolean;
    getPromptText(targetId: string): string;
    getPromptTokenCount(targetId: string): number;
    getResultColor(targetId: string): string;
    getResultColorEnd(targetId: string): string;
    getResultIcon(targetId: string): string;
    getTargetById(targetId: string): (typeof analysisTargets)[number] | undefined;
    getTargetConfidence(targetId: string): number;
    getConfidenceLevel(percent: number): string;
    isTargetSelected(targetId: string): boolean;
  };

type AiAnalysisPanelBehavior = Record<string, unknown> & ThisType<AiAnalysisPanelThis>;

const RESULT_HEADER_CLASS_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-b border-blue-100',
  cyan: 'bg-cyan-50 border-b border-cyan-100',
  red: 'bg-red-50 border-b border-red-100',
  amber: 'bg-amber-50 border-b border-amber-100',
  orange: 'bg-orange-50 border-b border-orange-100',
  purple: 'bg-purple-50 border-b border-purple-100',
  teal: 'bg-teal-50 border-b border-teal-100',
  rose: 'bg-rose-50 border-b border-rose-100',
};

const RESULT_ICON_WRAP_CLASS_MAP: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
};

const RESULT_CATEGORY_CLASS_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-100',
  cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  orange: 'bg-orange-50 text-orange-700 border border-orange-100',
  purple: 'bg-purple-50 text-purple-700 border border-purple-100',
  teal: 'bg-teal-50 text-teal-700 border border-teal-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const DEFAULT_LISTING_RESULT_HEADER_CLASS = 'bg-blue-50 border-b border-blue-100';
const DEFAULT_REVIEW_RESULT_HEADER_CLASS = 'bg-amber-50 border-b border-amber-100';
const DEFAULT_RESULT_ICON_WRAP_CLASS = 'bg-blue-100 text-blue-700 border-blue-200';
const DEFAULT_RESULT_CATEGORY_CLASS = 'bg-blue-50 text-blue-700 border border-blue-100';

type AlpineSafeMath = {
  abs: (value: number) => number;
  ceil: (value: number) => number;
  floor: (value: number) => number;
  max: (...values: number[]) => number;
  min: (...values: number[]) => number;
  round: (value: number) => number;
};

const ALPINE_SAFE_MATH: AlpineSafeMath = Object.freeze({
  abs: (value: number) => Math.abs(value),
  ceil: (value: number) => Math.ceil(value),
  floor: (value: number) => Math.floor(value),
  max: (...values: number[]) => Math.max(...values),
  min: (...values: number[]) => Math.min(...values),
  round: (value: number) => Math.round(value),
});

function getResultToneClass(map: Record<string, string>, color: string, fallback: string): string {
  return map[color] || fallback;
}

function createAiAnalysisPanelState(): AiAnalysisPanelState {
  return {
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
    dataSource: 'scraper' as const,
    productSummaryTooltipVisible: false,
    showSelectionPanel: false,
    Math: ALPINE_SAFE_MATH,
    _unsubscribes: [] as Array<() => void>,
    _navigationHandler: null,
    perfSettings: createPerformanceSettingsPanel(),
  };
}

function attachAiAnalysisPanelBehavior(
  panel: AiAnalysisPanelState
): AiAnalysisPanelState & Record<string, unknown> {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(aiAnalysisPanelBehavior));
  return panel;
}

/**
 * AI 分析面板行为。
 * 通过 descriptor 挂载，保留 getter 语义。
 */
const aiAnalysisPanelBehavior: AiAnalysisPanelBehavior = {
  // ========== Lifecycle ==========
  init(this: AiAnalysisPanelContext) {
    // 设置自动状态同步（Zustand → Alpine）
    this._unsubscribes = createMultipleStateSyncs([
      {
        selector: state => state.analysis.selectedAsins,
        onChange: asins => {
          this.selectedAsins = [...(asins as string[])];
        },
        immediate: true,
      },
      {
        selector: state => state.analysis.isAnalyzing,
        onChange: isAnalyzing => {
          this.isAnalyzing = isAnalyzing as boolean;
        },
        immediate: true,
      },
      {
        selector: state => state.analysis.progress,
        onChange: progress => {
          this.progress = typeof progress === 'number' ? progress : 0;
        },
        immediate: true,
      },
      {
        selector: state => state.analysis.currentStep,
        onChange: currentStep => {
          this.currentStep = typeof currentStep === 'string' ? currentStep : '';
        },
        immediate: true,
      },
      {
        selector: state => state.analysis.analysisReport,
        onChange: report => {
          this.analysisReport = report;
          this.hasReport = !!report;
        },
        immediate: true,
      },
    ]);

    // 初始化 selectedTargets（默认全选）
    const currentTargets = this.selectedTargets;
    if (currentTargets.length === 0) {
      this.selectedTargets = analysisTargets.map(t => t.id);
    }

    // 监听 analysisReport 变化，自动更新 hasReport 标志
    this.$watch('analysisReport', (newValue: unknown) => {
      this.hasReport = !!newValue;
      this.refreshReportView();
    });

    this.$watch('selectedTargets', () => {
      if (this.hasReport) {
        this.refreshReportView();
      }
    });

    this.$watch('selectedAsins', () => {
      if (this.hasReport) {
        this.refreshReportView();
      }
    });

    // 监听导航事件
    this._navigationHandler = (() => {
      this.navigateToScraper();
    }) as EventListener;
    window.addEventListener('navigate-to-scraper', this._navigationHandler);

    // 检查是否有新的 Scraper 数据
    checkAndLoadScraperData(this);

    // 检查是否有已加载的历史报告
    checkLoadedReport(this);
    this.refreshReportView();
  },

  // ========== 清理 ==========
  destroy(this: AiAnalysisPanelContext) {
    // 清理状态同步订阅
    if (Array.isArray(this._unsubscribes)) {
      cleanupSubscriptions(this._unsubscribes);
    }

    // 清理导航事件监听器
    if (this._navigationHandler) {
      window.removeEventListener('navigate-to-scraper', this._navigationHandler);
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

  toggleSelectionPanel() {
    this.showSelectionPanel = !this.showSelectionPanel;
  },

  get selectionPanelButtonClass(): string {
    return this.showSelectionPanel ? 'bg-slate-50/70 border-b border-slate-200/70' : '';
  },

  get showSelectionSummary(): boolean {
    return !this.showSelectionPanel && (this.selectedAsins.length > 0 || this.hasReport);
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
    return this.selectedAsins.includes(asin)
      ? 'bg-indigo-50 border-indigo-300'
      : 'bg-slate-50 border-slate-200 hover:border-indigo-200';
  },

  getAsinTextClass(asin: string): string {
    return this.selectedAsins.includes(asin) ? 'text-indigo-700' : 'text-slate-700';
  },

  getListingTargetCardClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'border-blue-300 bg-blue-50 shadow-sm'
      : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white';
  },

  getReviewTargetCardClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'border-amber-300 bg-amber-50 shadow-sm'
      : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white';
  },

  getListingTargetIconWrapClass(targetId: string): string {
    return this.isTargetSelected(targetId) ? 'bg-blue-50' : 'bg-slate-100 group-hover:bg-slate-200';
  },

  getListingTargetIconClass(targetId: string): string {
    return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-blue-600`;
  },

  getReviewTargetIconWrapClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'bg-amber-50'
      : 'bg-slate-100 group-hover:bg-slate-200';
  },

  getReviewTargetIconClass(targetId: string): string {
    return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-amber-600`;
  },

  getTargetCheckClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'border-indigo-500 bg-indigo-500'
      : 'border-slate-300 group-hover:border-slate-400';
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

  get showMissingRealDataNotice(): boolean {
    const ctx = this as unknown as AlpineContext & ComputedProperties;
    return !ctx.hasScraperData && !this.hasReport;
  },

  get hasNoAnalysisData(): boolean {
    const ctx = this as unknown as AlpineContext & ComputedProperties;
    return !ctx.hasScraperData && !this.hasReport && !this.isAnalyzing;
  },

  get analysisHeroIsComplete(): boolean {
    return this.hasReportWithResults && !this.isAnalyzing;
  },

  get analysisHeroIsStrong(): boolean {
    return this.isAnalyzing || (this.canRunAnalysis && !this.analysisHeroIsComplete);
  },

  get analysisHeroIsCompact(): boolean {
    return this.analysisHeroIsComplete;
  },

  get analysisHeroCardClass(): string {
    if (this.analysisHeroIsCompact)
      return 'bg-white border border-slate-200 shadow-sm shadow-slate-200/60';
    return this.analysisHeroIsStrong
      ? 'shadow-lg shadow-indigo-200/30'
      : 'bg-white border border-slate-200 shadow-sm shadow-slate-200/60';
  },

  get analysisHeroBackdropClass(): string {
    return this.analysisHeroIsStrong
      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
      : 'bg-white';
  },

  get analysisHeroAmbientClass(): string {
    return this.analysisHeroIsStrong ? 'opacity-100' : 'opacity-0';
  },

  get analysisHeroPatternClass(): string {
    return this.analysisHeroIsStrong ? 'opacity-5' : 'opacity-0';
  },

  get analysisHeroTextClass(): string {
    return this.analysisHeroIsStrong ? 'text-white' : 'text-slate-800';
  },

  get analysisHeroSubtextClass(): string {
    return this.analysisHeroIsStrong ? 'text-white/70' : 'text-slate-500';
  },

  get analysisHeroMetricPillClass(): string {
    return this.analysisHeroIsStrong
      ? 'bg-white/20 text-white'
      : 'bg-slate-100 text-slate-700 border border-slate-200';
  },

  get analysisPerfButtonClass(): string {
    return this.analysisHeroIsStrong
      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30'
      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300';
  },

  get analysisHeroIconWrapClass(): string {
    if (this.analysisHeroIsComplete)
      return 'w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm';
    if (!this.analysisHeroIsStrong)
      return 'w-14 h-14 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 shadow-sm';
    return this.isAnalyzing
      ? 'w-16 h-16 rounded-2xl bg-white/20 text-white border border-white/20 backdrop-blur-sm shadow-lg'
      : 'w-16 h-16 rounded-2xl bg-white/10 text-white border border-white/20 backdrop-blur-sm shadow-lg';
  },

  get analysisHeroIconClass(): string {
    if (this.analysisHeroIsComplete) return 'fa-solid fa-circle-check';
    return this.isAnalyzing ? 'fa-solid fa-robot animate-pulse' : 'fa-solid fa-bolt';
  },

  get isAnalysisComplete(): boolean {
    return this.analysisHeroIsComplete;
  },

  get isAnalysisRunning(): boolean {
    return this.isAnalyzing && this.progress < 100;
  },

  get isAnalysisIdle(): boolean {
    return !this.isAnalyzing && !this.analysisHeroIsComplete;
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
    if (this.isAnalyzing)
      return 'bg-white/20 text-white cursor-wait backdrop-blur-sm border border-white/30 shadow-2xl';
    if (this.canRunAnalysis && !this.analysisHeroIsStrong) {
      return 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 shadow-sm';
    }
    return this.canRunAnalysis
      ? 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 border border-white/50 shadow-2xl'
      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none';
  },

  get analysisHeroBodyClass(): string {
    return this.analysisHeroIsCompact ? 'p-5' : 'p-8';
  },

  get analysisHeroTitleClass(): string {
    return this.analysisHeroIsCompact ? 'text-xl' : 'text-2xl';
  },

  get performanceSummaryText(): string {
    const settings = this.perfSettings.settings;
    const cacheText = settings.enableCache ? '缓存开' : '缓存关';
    const failureText = settings.failureStrategy === 'continue' ? '失败继续' : '失败中止';
    return `并发 ${settings.maxConcurrency} · ${cacheText} · ${failureText}`;
  },

  get runAnalysisNotRunningLabel(): string {
    return this.analysisHeroIsComplete ? '重新分析' : '开始分析';
  },

  get runAnalysisNotRunningIconClass(): string {
    return this.analysisHeroIsComplete ? 'fa-solid fa-rotate-right' : 'fa-solid fa-play';
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

  get progressAriaValue(): number {
    return Math.round(this.progress);
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
    const analyzedAt =
      report && typeof report === 'object' ? report._metadata?.analyzedAt : undefined;
    return new Date(analyzedAt || Date.now()).toLocaleTimeString('zh-CN');
  },

  get reportStatusBadgeClass(): string {
    return this.isAnalyzing
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
      rose: 'pink',
    };
    return colorMap[color] || 'indigo';
  },

  getListingResultHeaderClass(targetId: string): string {
    const color = this.getResultColor(targetId);
    return getResultToneClass(RESULT_HEADER_CLASS_MAP, color, DEFAULT_LISTING_RESULT_HEADER_CLASS);
  },

  getReviewResultHeaderClass(targetId: string): string {
    const color = this.getResultColor(targetId);
    return getResultToneClass(RESULT_HEADER_CLASS_MAP, color, DEFAULT_REVIEW_RESULT_HEADER_CLASS);
  },

  getResultIconWrapClass(targetId: string): string {
    const color = this.getResultColor(targetId);
    return getResultToneClass(RESULT_ICON_WRAP_CLASS_MAP, color, DEFAULT_RESULT_ICON_WRAP_CLASS);
  },

  getResultIconDisplayClass(targetId: string): string {
    return `${this.getResultIcon(targetId)} text-xl`;
  },

  getResultCategoryClass(targetId: string): string {
    const color = this.getResultColor(targetId);
    return getResultToneClass(RESULT_CATEGORY_CLASS_MAP, color, DEFAULT_RESULT_CATEGORY_CLASS);
  },

  getHighlightClass(type: string): Record<string, boolean> {
    return {
      'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200': type === 'danger',
      'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200':
        type === 'success',
      'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200':
        type === 'warning',
      'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200': type === 'info',
    };
  },

  getHighlightIconClass(type: string): Record<string, boolean> {
    return {
      'fa-circle-exclamation text-red-500': type === 'danger',
      'fa-circle-check text-emerald-500': type === 'success',
      'fa-triangle-exclamation text-amber-500': type === 'warning',
      'fa-circle-info text-blue-500': type === 'info',
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

  getReportJsonText(): string {
    const ctx = this as unknown as AlpineContext & ComputedProperties;
    return JSON.stringify(ctx.reportFullData, null, 2);
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

  async navigateToScraper() {
    await navigateToRouteId('scraper');
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
      ctx.reportTotalHighlights = reportResults.reduce(
        (acc, result) => acc + result.highlights.length,
        0
      );
      ctx.reportTotalDetails = reportResults.reduce(
        (acc, result) => acc + result.details.length,
        0
      );

      const productTitle =
        ctx.currentProducts.length > 0
          ? ctx.currentProducts.map(product => product.productTitle).join(' | ')
          : undefined;

      ctx.reportFullData = {
        metadata: {
          asins: [...ctx.selectedAsins],
          targets: [...ctx.selectedTargets],
          timestamp: new Date().toISOString(),
          dataSource: ctx.dataSource,
          marketplace: ctx.dataSourceMarketplace,
          productTitle,
        },
        analysisReport: ctx.analysisReport,
      };
      ctx.reportRenderVersion += 1;
    } catch (error) {
      ctx.reportResults = [];
      ctx.reportListingsResults = [];
      ctx.reportReviewsResults = [];
      ctx.reportTotalHighlights = 0;
      ctx.reportTotalDetails = 0;
      ctx.reportFullData = null;
      ctx.reportRenderVersion += 1;
      console.error('[Alpine 组件] 刷新报告视图失败:', error);
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

  // ========== 置信度相关 ==========
  get reportConfidence() {
    const report = this.analysisReport;
    if (!report || typeof report === 'string') {
      return null;
    }
    const reportObj = report as FullAnalysisReport;
    if (!reportObj._metadata) {
      return null;
    }
    return reportObj._metadata.confidence || null;
  },

  get overallConfidence() {
    const report = this.analysisReport;
    if (!report || typeof report === 'string') {
      return 0;
    }
    const reportObj = report as FullAnalysisReport;
    if (!reportObj._metadata) {
      return 0;
    }
    return reportObj._metadata.overallConfidence || 0;
  },

  get overallConfidencePercent() {
    return Math.round((this.overallConfidence as number) * 100);
  },

  get hasConfidenceData() {
    return !!this.reportConfidence;
  },

  getTargetConfidence(targetId: string): number {
    const confidence = this.reportConfidence as Record<string, number> | null;
    if (!confidence || !confidence[targetId]) return 0;
    return Math.round(confidence[targetId] * 100);
  },

  getConfidenceColorClass(targetId: string): string {
    const percent = this.getTargetConfidence(targetId);
    if (percent >= 70) return 'confidence-high-bg confidence-high-text confidence-high-border';
    if (percent >= 50)
      return 'confidence-medium-bg confidence-medium-text confidence-medium-border';
    return 'confidence-low-bg confidence-low-text confidence-low-border';
  },

  getConfidenceBgAlphaClass(percent: number): string {
    if (percent >= 70) return 'confidence-high-bg-alpha';
    if (percent >= 50) return 'confidence-medium-bg-alpha';
    return 'confidence-low-bg-alpha';
  },

  getConfidenceTextLightClass(percent: number): string {
    if (percent >= 70) return 'confidence-high-text';
    if (percent >= 50) return 'confidence-medium-text';
    return 'confidence-low-text';
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
};

/**
 * 创建 Alpine 面板组件
 */
export function createAiAnalysisPanel(): AlpineContext &
  ComputedProperties &
  Record<string, unknown> {
  const panel = attachAiAnalysisPanelBehavior(createAiAnalysisPanelState());

  // 合并计算属性 - 使用 defineProperties 保留 getter 特性
  const computedProps = createComputedProperties(panel as unknown as AlpineContext);
  const descriptors = Object.getOwnPropertyDescriptors(computedProps);
  Object.defineProperties(panel, descriptors);

  return panel as unknown as AlpineContext & ComputedProperties & Record<string, unknown>;
}
