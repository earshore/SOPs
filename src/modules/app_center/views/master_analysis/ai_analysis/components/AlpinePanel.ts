/**
 * Alpine.js 组件主入口
 * 整合所有子模块，创建完整的 AI 分析面板组件
 */

import { getWorkbenchIconContainerClasses } from '@/common/constants/colorSchemes';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui';
import { createMultipleStateSyncs, cleanupSubscriptions } from '@/common/utils/stateSync';
import { confirmWithModal } from '@/components/modal/confirmModal';

import * as actions from './actions';
import { createComputedProperties, ComputedProperties } from './computedProperties';
import { checkAndLoadScraperData, checkLoadedReport, loadHistoricalReport } from './dataLoaders';
import { getTargetColorClass, getPromptText, getResultIcon, getResultColor } from './helpers';
import { getPromptTokenCount, getFormattedTokenCount } from './helpers';
import { createPerformanceSettingsPanel } from './PerformanceSettings';
import { analysisTargets } from '../config/analysisTargets';
import { parseAnalysisReport } from '../services/analysisService';
import {
  getAnalysisReasoningEffortLabel,
  getUserReasoningPrefs,
  resolveAnalysisReasoningPrefs,
} from '../services/reasoningPolicy';
import { formatHistoryDate } from '../services/reportGenerator';
import { AlpineContext, FullReportData } from '../types';

import type { AnalysisReportMetadata, FullAnalysisReport } from '../config/analysisReportData';

type AlpineWatchContext = {
  $watch: (property: string, callback: (newValue: unknown) => void) => void;
};

type AiAnalysisPanelContext = AlpineContext &
  ComputedProperties &
  AlpineWatchContext & {
    _navigationHandler: EventListener | null;
    _baseTabTitle: string | null;
    navigateToScraper: () => void;
    refreshReportView: () => void;
    syncAnalysisTabTitle: () => void;
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
  productSummaryTooltipStyle: string;
  showSelectionPanel: boolean;
  isCollapsed: boolean;
  Math: AlpineSafeMath;
  _navigationHandler: EventListener | null;
  _baseTabTitle: string | null;
  perfSettings: ReturnType<typeof createPerformanceSettingsPanel>;
  _destroyed: boolean;
};

type AnalysisRunSummary = NonNullable<AnalysisReportMetadata['runSummary']>;

type EvidenceHygieneSummary = {
  duplicatesRemoved: number;
  emptyRemoved: number;
  omittedByBudget: number;
  budgetApplied: boolean;
  includedAfterPack: number;
  titleCount: number;
  bulletCount: number;
  reviewCount: number;
  budgetLimit: number;
};

type EvidenceHygieneBucket = Pick<
  EvidenceHygieneSummary,
  'duplicatesRemoved' | 'emptyRemoved' | 'omittedByBudget' | 'budgetApplied' | 'includedAfterPack'
>;

type AnalysisProgressStageId = 'prep' | 'fast' | 'evidence' | 'done';
type AnalysisProgressStage = {
  id: AnalysisProgressStageId;
  label: string;
  state: 'pending' | 'active' | 'done';
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
    analysisRunSummary: AnalysisRunSummary | null;
    hasPartialAnalysisFailures: boolean;
    analysisHeroStatusText: string;
    showAnalysisHeroStatus: boolean;
    progressAriaValue: number;
    analysisProgressStages: AnalysisProgressStage[];
    getProgressStageClass(state: 'pending' | 'active' | 'done'): string;
    evidenceDepthValue: 'fast' | 'balanced' | 'deep';
    evidenceDepthLabel: string;
    evidenceDepthOptions: Array<{ value: 'fast' | 'balanced' | 'deep'; label: string }>;
    selectEvidenceDepth(depth: string): void;
    reportConfidence: Record<string, number> | null;
    overallConfidence: number;
    overallConfidencePercent: number;
    hasConfidenceData: boolean;
    evidenceHygieneSummary: EvidenceHygieneSummary | null;
    hasEvidenceHygieneSummary: boolean;
    evidenceHygieneShortText: string;
    evidenceHygieneDetailText: string;
    analysisQualityWarnings: Array<{ targetId: string; notes: string[] }>;
    hasAnalysisQualityWarnings: boolean;
    analysisQualityWarningText: string;
    canRerunWarnedTargets: boolean;
    rerunWarnedTargetsLabel: string;
    rerunWarnedTargets(): Promise<void>;
    cancelAnalysisRun(): Promise<void>;
    hasFailedAnalysis: boolean;
    failedTargetLabels: string;
    analysisFailureSummaryText: string;
    canRetryFailedTargets: boolean;
    retryFailedTargets(): Promise<void>;
    getPromptText(targetId: string): string;
    calculateEvidenceHygieneSummary(buckets: EvidenceHygieneBucket[]): EvidenceHygieneSummary;
    getPromptTokenCount(targetId: string): number;
    getResultColor(targetId: string): string;
    getResultColorEnd(targetId: string): string;
    getResultIcon(targetId: string): string;
    getTargetById(targetId: string): (typeof analysisTargets)[number] | undefined;
    getTargetName(targetId: string): string;
    getTargetConfidence(targetId: string): number;
    getConfidenceLevel(percent: number): string;
    isTargetSelected(targetId: string): boolean;
  };

type AiAnalysisPanelBehavior = Record<string, unknown> & ThisType<AiAnalysisPanelThis>;

const RESULT_HEADER_CLASS_MAP: Record<string, string> = {
  blue: 'bg-[#eff6ff] border-b border-[var(--module-accent-border)]',
  cyan: 'bg-cyan-50 border-b border-cyan-100',
  red: 'bg-red-50 border-b border-red-100',
  amber: 'bg-amber-50 border-b border-amber-100',
  orange: 'bg-orange-50 border-b border-orange-100',
  purple: 'bg-purple-50 border-b border-purple-100',
  teal: 'bg-teal-50 border-b border-teal-100',
  rose: 'bg-rose-50 border-b border-rose-100',
};

const RESULT_ICON_WRAP_CLASS_MAP: Record<string, string> = {
  blue: 'bg-[#eff6ff] text-[var(--module-accent-text)] border-[var(--module-accent-border)]',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
};

const RESULT_CATEGORY_CLASS_MAP: Record<string, string> = {
  blue: 'bg-[#eff6ff] text-[var(--module-accent-text)] border border-[var(--module-accent-border)]',
  cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  amber: 'bg-amber-50 text-amber-700 border border-amber-100',
  orange: 'bg-orange-50 text-orange-700 border border-orange-100',
  purple: 'bg-purple-50 text-purple-700 border border-purple-100',
  teal: 'bg-teal-50 text-teal-700 border border-teal-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const DEFAULT_LISTING_RESULT_HEADER_CLASS =
  'bg-[#eff6ff] border-b border-[var(--module-accent-border)]';
const DEFAULT_REVIEW_RESULT_HEADER_CLASS = 'bg-amber-50 border-b border-amber-100';
const DEFAULT_RESULT_ICON_WRAP_CLASS =
  'bg-[#eff6ff] text-[var(--module-accent-text)] border-[var(--module-accent-border)]';
const DEFAULT_RESULT_CATEGORY_CLASS =
  'bg-[#eff6ff] text-[var(--module-accent-text)] border border-[var(--module-accent-border)]';

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

const ANALYSIS_PROGRESS_STAGE_DEFINITIONS: Array<Pick<AnalysisProgressStage, 'id' | 'label'>> = [
  { id: 'prep', label: '准备数据' },
  { id: 'fast', label: '快速洞察' },
  { id: 'evidence', label: '评论证据' },
  { id: 'done', label: '汇总完成' },
];

function hasEvidenceHygieneSignal(summary: EvidenceHygieneSummary): boolean {
  return [
    summary.duplicatesRemoved > 0,
    summary.emptyRemoved > 0,
    summary.omittedByBudget > 0,
    summary.budgetApplied,
    summary.includedAfterPack > 0,
    summary.titleCount > 0,
    summary.bulletCount > 0,
    summary.reviewCount > 0,
  ].some(Boolean);
}

function formatAnalysisElapsed(elapsedMs: number | undefined): string | null {
  if (typeof elapsedMs !== 'number' || elapsedMs < 0) return null;
  const totalSeconds = Math.round(elapsedMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const seconds = totalSeconds % 60;
  return `${Math.floor(totalSeconds / 60)}m${seconds > 0 ? `${seconds}s` : ''}`;
}

function formatAnalysisCompletionExtras(summary: AnalysisRunSummary): string {
  const extras: string[] = [];
  if ((summary.cachedCount || 0) > 0) extras.push(`缓存 ${summary.cachedCount}`);
  const elapsed = formatAnalysisElapsed(summary.elapsedMs);
  if (elapsed) extras.push(`耗时 ${elapsed}`);
  return extras.length > 0 ? ` · ${extras.join(' · ')}` : '';
}

function formatAnalysisCompletionStatus(
  summary: AnalysisRunSummary,
  getTargetName: (targetId: string) => string
): string {
  const extraText = formatAnalysisCompletionExtras(summary);
  if ((summary.failedCount || 0) <= 0) {
    return `成功 ${summary.successCount || 0} 个维度${extraText}`;
  }
  const labels = (summary.failedTargetIds || []).map(getTargetName).join('、');
  return labels
    ? `成功 ${summary.successCount || 0} · 失败 ${summary.failedCount}（${labels}）${extraText}`
    : `成功 ${summary.successCount || 0} · 失败 ${summary.failedCount}${extraText}`;
}

function normalizeAnalysisProgress(value: number): number {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function stepMentions(step: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(step));
}

function resolveAnalysisProgressStage(
  progress: number,
  currentStep: string,
  resultCount: number
): AnalysisProgressStageId {
  const step = currentStep.toLowerCase();
  const isDone = [progress >= 100, stepMentions(step, [/分析完成/, /完成：成功/])].some(Boolean);
  if (isDone) return 'done';
  const inEvidence = [
    stepMentions(step, [
      /评论证据/,
      /证据抽取/,
      /致命/,
      /惊喜/,
      /犹豫/,
      /画像/,
      /词汇/,
      /承诺/,
      /合并洞察/,
      /shared-general/,
      /map/,
      /reduce/,
    ]),
    progress >= 35,
  ].some(Boolean);
  if (inEvidence) return 'evidence';
  const inFastInsight = [
    resultCount > 0,
    stepMentions(step, [
      /标题/,
      /卖点/,
      /快速洞察/,
      /title-keywords/,
      /selling-points/,
      /已开始返回/,
    ]),
  ].some(Boolean);
  if (inFastInsight || progress >= 20) return 'fast';
  return 'prep';
}

function getAnalysisProgressStageState(
  index: number,
  activeIndex: number
): AnalysisProgressStage['state'] {
  if (index < activeIndex) return 'done';
  return index === activeIndex ? 'active' : 'pending';
}

function getResultToneClass(map: Record<string, string>, color: string, fallback: string): string {
  return map[color] || fallback;
}

function createAiAnalysisPanelState(): AiAnalysisPanelState {
  return {
    selectedAsins: [] as string[],
    selectedTargets: [] as string[],
    isAnalyzing: false,
    isCollapsed: false,
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
    showPromptPanel: true,
    showJsonViewer: false,
    dataSource: 'scraper' as const,
    productSummaryTooltipVisible: false,
    productSummaryTooltipStyle: '',
    showSelectionPanel: false,
    Math: ALPINE_SAFE_MATH,
    _unsubscribes: [] as Array<() => void>,
    _navigationHandler: null,
    _baseTabTitle: null,
    perfSettings: createPerformanceSettingsPanel(),
    _destroyed: false,
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
    window.addEventListener(APP_EVENTS.NAVIGATE_TO_SCRAPER, this._navigationHandler);

    // 检查是否有新的 Scraper 数据
    checkAndLoadScraperData(this);

    // 检查是否有已加载的历史报告
    checkLoadedReport(this);

    // 恢复上次未完成的分析（断点续跑）
    void actions.restoreInterruptedAnalysis(this);
    this.refreshReportView();

    // 运行中页签标题标识：分析期间 document.title 前缀「分析中 a/b」，结束/取消/失败/离开时还原
    this.$watch('isAnalyzing', () => this.syncAnalysisTabTitle());
    this.$watch('reportResults', () => this.syncAnalysisTabTitle());
    this.syncAnalysisTabTitle();
  },

  syncAnalysisTabTitle(this: AiAnalysisPanelContext) {
    if (this.isAnalyzing) {
      if (this._baseTabTitle === null) {
        this._baseTabTitle = document.title;
      }
      const done = this.reportResults?.length ?? 0;
      const total = this.selectedTargets.length || analysisTargets.length;
      document.title = `分析中 ${done}/${total} · ${this._baseTabTitle}`;
      return;
    }
    if (this._baseTabTitle !== null) {
      document.title = this._baseTabTitle;
      this._baseTabTitle = null;
    }
  },

  // ========== 清理 ==========
  destroy(this: AiAnalysisPanelContext & { _destroyed?: boolean }) {
    // 幂等保护：Alpine x-data 清理与模块卸载可能重复触发 destroy()，避免重复弹 toast
    if (this._destroyed) return;
    this._destroyed = true;

    // 清理状态同步订阅
    if (Array.isArray(this._unsubscribes)) {
      cleanupSubscriptions(this._unsubscribes);
    }

    // 清理导航事件监听器
    if (this._navigationHandler) {
      window.removeEventListener(APP_EVENTS.NAVIGATE_TO_SCRAPER, this._navigationHandler);
      this._navigationHandler = null;
    }

    // 离开页面时还原页签标题（若有分析中前缀）
    if (this._baseTabTitle !== null) {
      document.title = this._baseTabTitle;
      this._baseTabTitle = null;
    }

    // 分析运行中离开：告知（后台继续 + 断点自动保存），提供回看入口
    if (this.isAnalyzing && this.progress < 100) {
      showToast('分析仍在后台进行，已完成的维度会自动保存', {
        type: 'info',
        duration: 5000,
        action: {
          label: '查看进度',
          onClick: () => navigateToRouteId('ai_analysis'),
        },
      });
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

  /** Workbench chrome icon — no marketing scale-110 (D4). */
  get selectionConfigIconClasses(): string {
    return `${getWorkbenchIconContainerClasses('purple', 'lg')} text-white`;
  },

  /** Workbench JSON panel icon — no marketing scale-110 (D4). */
  get reportJsonIconClasses(): string {
    return `${getWorkbenchIconContainerClasses('emerald', 'lg')} text-white`;
  },

  get showSelectionSummary(): boolean {
    return !this.showSelectionPanel && (this.selectedAsins.length > 0 || this.hasReport);
  },

  showProductSummaryTooltip(): void {
    this.productSummaryTooltipVisible = true;
    const trigger = document.getElementById('ai-analysis-tooltip-trigger');
    const tooltip = document.getElementById('ai-analysis-product-tooltip');
    if (trigger && tooltip) {
      // 避开父容器 overflow-hidden 裁剪
      if (tooltip.parentNode !== document.body) {
        document.body.appendChild(tooltip);
      }
      const rect = trigger.getBoundingClientRect();
      // Tooltip 宽度为 72 (w-72 = 288px)，居中显示在图标上方
      const tooltipWidth = 288;
      const left = Math.round(rect.left + rect.width / 2 - tooltipWidth / 2);
      const top = Math.round(rect.top - 8);
      this.productSummaryTooltipStyle = `left:${left}px; top:${top}px; transform:translateY(-100%);`;
    }
  },

  hideProductSummaryTooltip(): void {
    this.productSummaryTooltipVisible = false;
    // 隐藏时移回原位，保持 DOM 结构逻辑一致（可选，但推荐）
    const tooltip = document.getElementById('ai-analysis-product-tooltip');
    const container = document.querySelector('.relative.ml-auto');
    if (tooltip && container && tooltip.parentNode !== container) {
      container.appendChild(tooltip);
    }
  },

  get selectionPanelChevronClass(): string {
    return `fa-solid fa-chevron-${this.showSelectionPanel ? 'up' : 'down'} text-[color:var(--color-slate-400)] text-base`;
  },

  get promptPanelChevronClass(): string {
    return `fa-solid fa-chevron-${this.showPromptPanel ? 'up' : 'down'}`;
  },

  getPromptItemChevronClass(index: number): string {
    return `fa-solid fa-chevron-${this.expandedPromptIndex === index ? 'up' : 'down'} text-[color:var(--color-slate-400)]`;
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
      ? 'bg-[var(--color-primary-light)] border-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]'
      : 'bg-slate-50 border-slate-200 hover:border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]';
  },

  getAsinTextClass(asin: string): string {
    return this.selectedAsins.includes(asin)
      ? 'text-[var(--color-primary-dark,var(--color-primary))]'
      : 'text-[color:var(--color-slate-400)]';
  },

  getListingTargetCardClass(targetId: string): string {
    // Surface tokens so dark mode doesn't rely on white/slate-50 light-only washes.
    return this.isTargetSelected(targetId)
      ? 'border-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_18%,var(--surface-card))] shadow-sm'
      : 'border-[color-mix(in_srgb,var(--color-border-default)_100%,transparent)] bg-[var(--surface-card)] hover:border-[color-mix(in_srgb,var(--color-primary)_42%,transparent)] hover:bg-surface-card-hover';
  },

  getReviewTargetCardClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'border-[color-mix(in_srgb,var(--color-amber-400,#fbbf24)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-amber-400,#fbbf24)_16%,var(--surface-card))] shadow-sm'
      : 'border-[color-mix(in_srgb,var(--color-border-default)_100%,transparent)] bg-[var(--surface-card)] hover:border-[color-mix(in_srgb,var(--color-amber-400,#fbbf24)_45%,transparent)] hover:bg-surface-card-hover';
  },

  getListingTargetIconWrapClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'bg-[color-mix(in_srgb,var(--color-primary)_22%,var(--surface-card))]'
      : 'bg-[color-mix(in_srgb,var(--surface-panel)_88%,#000)] group-hover:bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--surface-card-hover))]';
  },

  getListingTargetIconClass(targetId: string): string {
    return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-[var(--color-primary)]`;
  },

  getReviewTargetIconWrapClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'bg-[color-mix(in_srgb,var(--color-amber-400,#fbbf24)_20%,var(--surface-card))]'
      : 'bg-[color-mix(in_srgb,var(--surface-panel)_88%,#000)] group-hover:bg-[color-mix(in_srgb,var(--color-amber-400,#fbbf24)_14%,var(--surface-card-hover))]';
  },

  getReviewTargetIconClass(targetId: string): string {
    return `${this.getTargetById(targetId)?.icon || 'fa-solid fa-circle'} text-amber-500 dark:text-amber-300`;
  },

  getTargetCheckClass(targetId: string): string {
    return this.isTargetSelected(targetId)
      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
      : 'border-[color-mix(in_srgb,var(--color-border-strong)_100%,transparent)] group-hover:border-[color-mix(in_srgb,var(--color-primary)_45%,transparent)]';
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
      return 'bg-[var(--surface-panel)] border border-slate-200 shadow-sm shadow-slate-200/60';
    return this.analysisHeroIsStrong
      ? 'shadow-lg shadow-accent-100/30'
      : 'bg-[var(--surface-panel)] border border-slate-200 shadow-sm shadow-slate-200/60';
  },

  get analysisHeroBackdropClass(): string {
    return this.analysisHeroIsStrong
      ? 'bg-gradient-to-r from-accent-600 via-purple-600 to-pink-600'
      : 'bg-[var(--surface-panel)]';
  },

  get analysisHeroAmbientClass(): string {
    return this.analysisHeroIsStrong ? 'opacity-100' : 'opacity-0';
  },

  get analysisHeroPatternClass(): string {
    return this.analysisHeroIsStrong ? 'opacity-5' : 'opacity-0';
  },

  get analysisHeroTextClass(): string {
    return this.analysisHeroIsStrong ? 'text-white' : 'text-[color:var(--color-slate-900)]';
  },

  get analysisHeroSubtextClass(): string {
    return this.analysisHeroIsStrong ? 'text-white/70' : 'text-[color:var(--color-slate-500)]';
  },

  get analysisHeroMetricPillClass(): string {
    return this.analysisHeroIsStrong
      ? 'bg-white/20 text-white'
      : 'bg-slate-100 text-[color:var(--color-slate-400)] border border-slate-200';
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
      return 'w-14 h-14 rounded-xl bg-slate-100 text-[color:var(--color-slate-500)] border border-slate-200 shadow-sm';
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

  get analysisRunSummary(): AnalysisRunSummary | null {
    const report = this.analysisReport;
    if (!report || typeof report === 'string') {
      return null;
    }
    const runSummary = (report as FullAnalysisReport)._metadata?.runSummary;
    if (!runSummary || typeof runSummary !== 'object') {
      return null;
    }
    return runSummary;
  },

  get evidenceHygieneSummary(): EvidenceHygieneSummary | null {
    const report = this.analysisReport;
    if (!report || typeof report === 'string') {
      return null;
    }
    const hygiene = (report as FullAnalysisReport)._metadata?.reviewSampling?.mapReduceHygiene;
    if (!hygiene) {
      return null;
    }

    const buckets: EvidenceHygieneBucket[] = [
      hygiene.lowStar,
      hygiene.highStar,
      hygiene.general,
    ].filter(Boolean);
    if (buckets.length === 0) {
      return null;
    }

    const summary = this.calculateEvidenceHygieneSummary(buckets);

    const titleCount = this.currentProducts.reduce(
      (total, product) => total + (product.productTitle ? 1 : 0),
      0
    );
    const bulletCount = this.currentProducts.reduce(
      (total, product) => total + (product.feature_bullets?.length || 0),
      0
    );
    const reviewCount = summary.includedAfterPack;

    return hasEvidenceHygieneSignal(summary)
      ? {
          ...summary,
          titleCount,
          bulletCount,
          reviewCount,
        }
      : null;
  },

  calculateEvidenceHygieneSummary(buckets: EvidenceHygieneBucket[]): EvidenceHygieneSummary {
    return buckets.reduce(
      (acc, bucket) =>
        ({
          ...acc,
          duplicatesRemoved: acc.duplicatesRemoved + bucket.duplicatesRemoved,
          emptyRemoved: acc.emptyRemoved + bucket.emptyRemoved,
          omittedByBudget: acc.omittedByBudget + bucket.omittedByBudget,
          budgetApplied: acc.budgetApplied || bucket.budgetApplied,
          includedAfterPack: acc.includedAfterPack + bucket.includedAfterPack,
        }) as EvidenceHygieneSummary,
      {
        duplicatesRemoved: 0,
        emptyRemoved: 0,
        omittedByBudget: 0,
        budgetApplied: false,
        includedAfterPack: 0,
        titleCount: 0,
        bulletCount: 0,
        reviewCount: 0,
        budgetLimit: 0,
      } as EvidenceHygieneSummary
    ) as EvidenceHygieneSummary;
  },

  get hasEvidenceHygieneSummary(): boolean {
    return this.evidenceHygieneSummary !== null;
  },

  get evidenceHygieneShortText(): string {
    const summary = this.evidenceHygieneSummary;
    if (!summary) {
      return '';
    }
    const cleaned = summary.duplicatesRemoved + summary.emptyRemoved;
    const parts: string[] = [];
    if (cleaned > 0) {
      parts.push(`已去重 ${cleaned}`);
    }
    if (summary.omittedByBudget > 0 || summary.budgetApplied) {
      parts.push(`预算采样 ${summary.omittedByBudget}`);
    }
    const hasSourceContent = [summary.titleCount, summary.bulletCount, summary.reviewCount].some(
      count => count > 0
    );
    if (hasSourceContent) {
      parts.push(
        `保留 ${summary.titleCount} 个标题 · ${summary.bulletCount} 个卖点 · ${summary.reviewCount} 条评论`
      );
    }
    return parts.join(' · ');
  },

  get evidenceHygieneDetailText(): string {
    const summary = this.evidenceHygieneSummary;
    if (!summary) {
      return '';
    }
    return [
      `重复评论 ${summary.duplicatesRemoved}`,
      `空评论 ${summary.emptyRemoved}`,
      `预算省略 ${summary.omittedByBudget}`,
      `保留 ${summary.titleCount || 0} 个标题 · ${summary.bulletCount || 0} 个卖点 · ${summary.reviewCount || 0} 条评论`,
    ].join(' · ');
  },

  get analysisQualityWarnings(): Array<{ targetId: string; notes: string[] }> {
    const report = this.analysisReport;
    if (!report || typeof report === 'string') return [];
    const warnings = (report as FullAnalysisReport)._metadata?.qualityWarnings;
    if (!Array.isArray(warnings)) return [];
    // shared_general_map 是共享抽取的信息性标记，不是质量警告
    return warnings
      .map(item => ({
        ...item,
        notes: (item.notes || []).filter(note => note !== 'shared_general_map'),
      }))
      .filter(item => item.notes.length > 0);
  },

  get hasAnalysisQualityWarnings(): boolean {
    return this.analysisQualityWarnings.length > 0;
  },

  get analysisQualityWarningText(): string {
    const warnings = this.analysisQualityWarnings;
    if (warnings.length === 0) return '';
    const labels = warnings
      .map(item => this.getTargetName(item.targetId))
      .filter(Boolean)
      .slice(0, 3);
    const suffix = warnings.length > 3 ? ` 等${warnings.length}个维度` : '';
    return `部分字段可能不完整：${labels.join('、')}${suffix}`;
  },

  get hasPartialAnalysisFailures(): boolean {
    return (this.analysisRunSummary?.failedCount || 0) > 0;
  },

  get analysisCompleteTitle(): string {
    return this.hasPartialAnalysisFailures ? '分析部分完成' : '分析完成';
  },

  get analysisHeroStatusText(): string {
    if (this.isAnalyzing) {
      return this.currentStep || '正在分析…';
    }
    if (this.analysisHeroIsComplete && this.currentStep) {
      return this.currentStep;
    }
    const summary = this.analysisRunSummary;
    if (this.analysisHeroIsComplete && summary) {
      return formatAnalysisCompletionStatus(summary, id => this.getTargetName(id));
    }
    return '';
  },

  get showAnalysisHeroStatus(): boolean {
    return Boolean(this.analysisHeroStatusText);
  },

  get hasAnalysisSelection(): boolean {
    return this.selectedTargets.length > 0 && this.selectedAsins.length > 0;
  },

  get showAnalysisSelectionHint(): boolean {
    return !this.isAnalyzing && !this.showAnalysisHeroStatus && this.hasAnalysisSelection;
  },

  get needsAnalysisSelection(): boolean {
    return !this.isAnalyzing && !this.hasAnalysisSelection && !this.showAnalysisHeroStatus;
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
      return 'bg-white/15 text-white cursor-wait backdrop-blur-sm border border-white/30 shadow-2xl';
    if (this.canRunAnalysis && !this.analysisHeroIsStrong) {
      // Appearance primary (not ownership indigo) for default workbench CTA.
      return 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] border border-transparent shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,var(--color-primary))] focus-visible:ring-offset-2';
    }
    return this.canRunAnalysis
      ? 'bg-white/25 text-white hover:bg-white/35 border border-white/50 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,var(--color-primary))] focus-visible:ring-offset-2'
      : 'bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-slate-400)] cursor-not-allowed border border-[color:var(--border-subtle)] shadow-none';
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
    const depthText = this.evidenceDepthLabel;
    const reasoningLabel = getAnalysisReasoningEffortLabel();
    return `并发 ${settings.maxConcurrency} · ${depthText} · 推理${reasoningLabel} · ${cacheText} · ${failureText}`;
  },

  get evidenceDepthValue(): 'fast' | 'balanced' | 'deep' {
    const depth = this.perfSettings?.settings?.evidenceDepth;
    return depth === 'fast' || depth === 'deep' ? depth : 'balanced';
  },

  get evidenceDepthLabel(): string {
    if (this.evidenceDepthValue === 'fast') return '快速';
    if (this.evidenceDepthValue === 'deep') return '深入';
    return '均衡';
  },

  /**
   * 证据深度下拉的动态选项：按「全局推理等级 × 深度上限」真联动后的实际档位。
   * 文案仅展示档位与推理等级；耗时测算只出现在「开始分析」toast（同源估算）。
   */
  get evidenceDepthOptions(): Array<{ value: 'fast' | 'balanced' | 'deep'; label: string }> {
    const depthLabels: Record<string, string> = { fast: '快速', balanced: '均衡', deep: '深入' };
    const userPrefs = getUserReasoningPrefs();

    return (['fast', 'balanced', 'deep'] as const).map(depth => {
      const reasoningLabel = getAnalysisReasoningEffortLabel(
        resolveAnalysisReasoningPrefs(userPrefs, depth)
      );
      return {
        value: depth,
        label: `${depthLabels[depth]} · 推理${reasoningLabel}`,
      };
    });
  },

  selectEvidenceDepth(depth: string): void {
    if (depth !== 'fast' && depth !== 'balanced' && depth !== 'deep') return;
    this.perfSettings.setEvidenceDepth(depth);
  },

  get runAnalysisNotRunningLabel(): string {
    if (this.resumeProgress) {
      return `继续分析（已完成 ${this.resumeProgress.done}/${this.resumeProgress.total}）`;
    }
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
    return `${Math.round(normalizeAnalysisProgress(this.progress))}%`;
  },

  get progressAriaValue(): number {
    return Math.round(normalizeAnalysisProgress(this.progress));
  },

  /**
   * Real business stages instead of fake NLP labels.
   * Stage activation is driven by progress + currentStep semantics.
   */
  get analysisProgressStages(): AnalysisProgressStage[] {
    const progress = normalizeAnalysisProgress(this.progress);
    const resultCount = Array.isArray(this.reportResults) ? this.reportResults.length : 0;
    const activeId = resolveAnalysisProgressStage(progress, this.currentStep || '', resultCount);
    if (activeId === 'done') {
      return ANALYSIS_PROGRESS_STAGE_DEFINITIONS.map(stage => ({ ...stage, state: 'done' }));
    }
    const activeIndex = ANALYSIS_PROGRESS_STAGE_DEFINITIONS.findIndex(
      stage => stage.id === activeId
    );
    return ANALYSIS_PROGRESS_STAGE_DEFINITIONS.map((stage, index) => ({
      ...stage,
      state: getAnalysisProgressStageState(index, activeIndex),
    }));
  },

  getProgressStageClass(state: 'pending' | 'active' | 'done'): string {
    if (state === 'done') return 'text-white/85 font-medium';
    if (state === 'active') return 'text-white font-semibold';
    return 'text-white/40';
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
      ? 'bg-[#eff6ff] text-[var(--module-accent-text)] border-[var(--module-accent-border)]'
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

  get hasFailedAnalysis(): boolean {
    return this.hasReport && !this.isAnalyzing && (this.analysisRunSummary?.failedCount || 0) > 0;
  },

  get failedTargetLabels(): string {
    return (this.analysisRunSummary?.failedTargetIds || [])
      .map(id => this.getTargetName(id))
      .join('、');
  },

  get analysisFailureSummaryText(): string {
    const summary = this.analysisRunSummary;
    if (!summary) {
      return '';
    }
    const labels = this.failedTargetLabels;
    return labels
      ? `分析完成：成功 ${summary.successCount || 0} · 失败 ${summary.failedCount}（${labels}）`
      : `分析完成：成功 ${summary.successCount || 0} · 失败 ${summary.failedCount}`;
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
      'bg-gradient-to-r from-purple to-[var(--wash-indigo)] text-[var(--module-accent-text)] border-[var(--module-accent-border)]':
        type === 'info',
    };
  },

  getHighlightIconClass(type: string): Record<string, boolean> {
    return {
      'fa-circle-exclamation text-red-500': type === 'danger',
      'fa-circle-check text-emerald-500': type === 'success',
      'fa-triangle-exclamation text-amber-500': type === 'warning',
      'fa-circle-info text-[var(--module-accent-soft)]': type === 'info',
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

  get canRerunWarnedTargets(): boolean {
    return (
      !this.isAnalyzing &&
      this.hasReportWithResults &&
      this.analysisQualityWarnings.length > 0 &&
      this.selectedAsins.length > 0
    );
  },

  get rerunWarnedTargetsLabel(): string {
    const count = this.analysisQualityWarnings.length;
    return count > 0 ? `仅重跑问题维度 (${count})` : '仅重跑问题维度';
  },

  async rerunWarnedTargets() {
    if (!this.canRerunWarnedTargets) return;
    const ctx = this as unknown as AlpineContext & ComputedProperties;
    const targetIds = this.analysisQualityWarnings.map(item => item.targetId);
    await actions.rerunAnalysisTargetsAction(ctx, ctx.currentProducts, targetIds);
  },

  async cancelAnalysisRun() {
    const confirmed = await confirmWithModal(
      '取消本次分析？',
      '已完成的维度将保留在报告中，未完成的维度会停止分析且不会重跑。',
      'ai_analysis_cancel_confirm_v1',
      '确定取消'
    );
    if (!confirmed) return;
    const ctx = this as unknown as AlpineContext;
    actions.cancelAnalysisAction(ctx);
  },

  get canRetryFailedTargets(): boolean {
    return (
      !this.isAnalyzing &&
      this.hasFailedAnalysis &&
      (this.analysisRunSummary?.failedTargetIds?.length || 0) > 0 &&
      this.selectedAsins.length > 0
    );
  },

  async retryFailedTargets() {
    if (!this.canRetryFailedTargets) return;
    const ctx = this as unknown as AlpineContext & ComputedProperties;
    const failedTargetIds = this.analysisRunSummary?.failedTargetIds || [];
    await actions.rerunAnalysisTargetsAction(ctx, ctx.currentProducts, failedTargetIds);
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
