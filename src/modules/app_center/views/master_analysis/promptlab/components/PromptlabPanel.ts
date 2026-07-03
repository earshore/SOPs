/**
 * Promptlab Panel Alpine.js 组件（薄壳）
 *
 * 本文件只负责：
 *  1. Alpine 响应式状态声明
 *  2. 生命周期（init / destroy）与 store 订阅
 *  3. 将每个 Alpine 方法/getter 委托给对应子模块的纯函数
 *
 * 业务逻辑分布：
 *  computed.ts        — 计算属性辅助函数
 *  reportRenderer.ts  — 报告区域渲染
 *  previewExtractor.ts — 预览文本提取（纯函数）
 *  dnaActions.ts      — DNA 提取动作
 *  promptActions.ts   — Prompt 生成动作
 *  uiHelpers.ts       — UI 交互辅助
 *  types.ts           — 共享类型定义
 */

import { appStore } from '@/stores/useAppStore';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';
import eventBus from '../../../../../../common/EventBus';
import { HistoryService } from '../../services/historyService';
import { getReportFingerprint } from '../../services/reportIdentity';
// ── 子模块导入 ────────────────────────────────────────────────────────────────
import type {
  ConsoleMode,
  DnaConfidence,
  DnaExtractionFieldName,
  DnaExtractionFieldSummary,
  PromptlabAlpineContext,
} from './types';

import {
  computeHasReport,
  computeIsListingReady,
  computeIsReady,
  computeCurrentPrompt,
  computeTokenCount,
  computeFormattedTokenCount,
  computeIsOverLimit,
  computeReportConfidence,
  computeOverallConfidence,
  getTargetConfidence,
  getConfidenceColorClass,
  getConfidenceLevel,
  getConfidenceAriaLabel,
} from './computed';

import {
  generateLanguageOptions,
  renderReportAnalysis,
  autoSelectMarket,
  renderReportModules,
} from './reportRenderer';

import {
  canExtractDNA,
  autoPopulateDNA,
  extractSingleField,
  refreshDnaExtractionSummary,
} from './dnaActions';

import { generateListingPrompt, generateVisualPrompt } from './promptActions';

import {
  initAutoHeightInputs,
  expandInput,
  restoreInput,
  toggleConsoleMode,
  copyPrompt,
  copySeoKeywords,
  clearInputs,
  selectAllReportSections,
  clearReportSections,
  onReportSectionChange,
  onInputChange,
} from './uiHelpers';

import type { UserProductProfile } from '@/types/state';

// ─────────────────────────────────────────────────────────────────────────────

/** 默认 profile 初始值 */
const DEFAULT_PROFILE: UserProductProfile = {
  targetMarket: '',
  keywordsTier1: '',
  keywordsTier2: '',
  audience: '',
  usps: '',
  specs: '',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: true,
  useRufus: true,
  useEmoji: true,
  selectedReportSections: [] as string[],
  charLimit: 5000,
};

function createDefaultDnaConfidence(): DnaConfidence {
  return {
    audience: 0,
    usps: 0,
    specs: 0,
    keywords: 0,
    keywordsTier1: 0,
    keywordsTier2: 0,
    negative: 0,
    overall: 0,
  };
}

function withoutReportDna(profile: UserProductProfile): UserProductProfile {
  const nextProfile: UserProductProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
    targetMarket: '',
    keywordsTier1: '',
    keywordsTier2: '',
    audience: '',
    usps: '',
    specs: '',
    socialHook: '',
    negative: '',
    selectedReportSections: [],
    selectedReportItems: undefined,
  };

  delete nextProfile.reportFingerprint;
  return nextProfile;
}

function withReportFingerprint(
  profile: UserProductProfile,
  reportFingerprint: string
): UserProductProfile {
  return {
    ...profile,
    reportFingerprint,
  };
}

function getCurrentReportFingerprint(): string | null {
  return computeHasReport()
    ? getReportFingerprint(appStore.getState().analysis.analysisReport)
    : null;
}

function getCurrentSnapshotProfile(): UserProductProfile | null {
  const currentHistoryId = appStore.getState().scraper.currentHistoryId;
  if (currentHistoryId === null || currentHistoryId === undefined) {
    return null;
  }

  return HistoryService.getUserProductProfileById(currentHistoryId);
}

function hasMatchingReportFingerprint(
  profile: UserProductProfile,
  reportFingerprint: string | null
): boolean {
  return !!reportFingerprint && profile.reportFingerprint === reportFingerprint;
}

type StructuredSubItemSelection = {
  enabled: boolean;
  items?: Record<string, boolean>;
};

type SubItemSelection = boolean | StructuredSubItemSelection;

const getAnalysisReportRoot = (): Record<string, unknown> | null => {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') return null;

  const reportObj = report as Record<string, unknown>;
  return reportObj.analysisReport && typeof reportObj.analysisReport === 'object'
    ? (reportObj.analysisReport as Record<string, unknown>)
    : reportObj;
};

const getReportDimensionData = (dimensionId: string): Record<string, unknown> | null => {
  const report = getAnalysisReportRoot();
  const dimensionData = report?.[dimensionId];
  return dimensionData && typeof dimensionData === 'object'
    ? (dimensionData as Record<string, unknown>)
    : null;
};

const getContentItemIndexes = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((_, index) => index.toString());
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>);
  }
  return ['0'];
};

const hasItemSelection = (items: Record<string, boolean>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(items, key);

const getItemSelectionValue = (
  items: Record<string, boolean> | undefined,
  itemKey: string,
  allItemKeys: string[]
): boolean | undefined => {
  if (!items) return undefined;
  if (hasItemSelection(items, itemKey)) return items[itemKey];

  const legacyIndex = allItemKeys.indexOf(itemKey);
  if (legacyIndex >= 0) {
    const legacyKey = legacyIndex.toString();
    if (hasItemSelection(items, legacyKey)) return items[legacyKey];
  }

  return undefined;
};

const createDisabledItems = (indexes: string[]): Record<string, boolean> => {
  const items: Record<string, boolean> = {};
  indexes.forEach(index => {
    items[index] = false;
  });
  return items;
};

const DNA_REPORT_TYPE_LABELS: Record<string, string> = {
  full_analysis: '完整 AI 分析报告',
  competitor: '竞品分析报告',
  product_overview: '产品概览报告',
  semantic_analysis: '语义分析报告',
  legacy: '基础分析报告',
};

function getDnaReportTypeLabel(reportType: string): string {
  return DNA_REPORT_TYPE_LABELS[reportType] ?? '分析报告';
}

type PromptlabPanelState = Pick<
  PromptlabAlpineContext,
  | 'currentConsoleMode'
  | 'listingPromptCache'
  | 'visualPromptCache'
  | 'lastMarketplace'
  | 'originalHeights'
  | 'profile'
  | 'dnaConfidence'
  | 'dnaExtractionSummary'
  | 'hasRenderedReportOnce'
  | 'expandedDimensions'
  | 'expandedSubItems'
  | '_unsubscribers'
  | '_appStoreUnsubscribe'
> & {
  reportRevision: number;
};

type PromptlabPanelThis = PromptlabAlpineContext & {
  $nextTick?: (callback: () => void) => void;
  currentPrompt: string;
  isReady: boolean;
  isListingReady: boolean;
  isVisualReady: boolean;
  isOverLimit: boolean;
  reportRevision: number;
  hasReport: boolean;
  canExtractDNA: boolean;
  reportActionDisabled: boolean;
  dnaActionDisabled: boolean;
  reportConfidence: Record<string, number> | null;
  overallConfidence: number;
  hasExpandedDimensions: boolean;
  restoreState(): void;
  restorePromptCachesFromCurrentSnapshot(): void;
  refreshDnaExtractionSummary(): void;
  onInputChange(): void;
  expandAllDimensions(): void;
  collapseAllDimensions(): void;
  getDnaFieldSummary(field: DnaExtractionFieldName): DnaExtractionFieldSummary | null;
  getSubItemData(dimensionId: string, subItemKey: string): unknown;
  getContentItemIndexes(dimensionId: string, subItemKey: string): string[];
  ensureStructuredSubItemSelection(
    dimensionId: string,
    subItemKey: string
  ): StructuredSubItemSelection | null;
  setSubItemAndContentState(dimensionId: string, subItemKey: string, enabled: boolean): void;
  getSelectedContentCount(dimensionId: string, subItemKey: string): number;
  getSelectedSubItemCount(dimensionId: string): number;
  syncDimensionEnabled(dimensionId: string): void;
  isSubItemSelected(dimensionId: string, subItemKey: string): boolean;
  isSubItemPartiallySelected(dimensionId: string, subItemKey: string): boolean;
  isContentItemSelected(dimensionId: string, subItemKey: string, itemIndex: string): boolean;
};

type PromptlabPanelBehavior = Record<string, unknown> & ThisType<PromptlabPanelThis>;

function createPromptlabPanelState(): PromptlabPanelState {
  return {
    currentConsoleMode: 'listing' as ConsoleMode,
    listingPromptCache: '',
    visualPromptCache: '',
    lastMarketplace: '',
    originalHeights: new Map<HTMLElement, number>(),
    profile: { ...DEFAULT_PROFILE } as UserProductProfile,
    dnaConfidence: createDefaultDnaConfidence(),
    dnaExtractionSummary: null,
    hasRenderedReportOnce: false,
    expandedDimensions: new Set<string>(),
    expandedSubItems: new Set<string>(),
    reportRevision: 0,
    _unsubscribers: [] as Array<() => void>,
    _appStoreUnsubscribe: null,
  };
}

function attachPromptlabPanelBehavior(
  panel: PromptlabPanelState
): PromptlabPanelState & Record<string, unknown> {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(promptlabPanelBehavior));
  return panel;
}

function isVisualReadyForUi(ctx: PromptlabPanelThis): boolean {
  void ctx.reportRevision;
  return (
    computeHasReport() &&
    ctx.profile.targetMarket !== '' &&
    ctx.profile.keywordsTier1.trim().length > 0 &&
    ctx.profile.keywordsTier2.trim().length > 0
  );
}

/**
 * Promptlab Alpine 组件行为。
 * 通过 descriptor 挂载，保留 getter 语义。
 */
const promptlabPanelBehavior: PromptlabPanelBehavior = {
  // ========== Computed Getters ==========

  get hasReport(): boolean {
    void this.reportRevision;
    return computeHasReport();
  },

  get isReady(): boolean {
    return computeIsReady(this as unknown as PromptlabAlpineContext);
  },

  get isListingReady(): boolean {
    return computeIsListingReady(this as unknown as PromptlabAlpineContext);
  },

  get isVisualReady(): boolean {
    return isVisualReadyForUi(this);
  },

  get currentPrompt(): string {
    return computeCurrentPrompt(this as unknown as PromptlabAlpineContext);
  },

  get tokenCount(): number {
    return computeTokenCount(this.currentPrompt);
  },

  get formattedTokenCount(): string {
    return computeFormattedTokenCount(this.currentPrompt);
  },

  get isOverLimit(): boolean {
    return computeIsOverLimit(this.currentPrompt, this.profile.charLimit);
  },

  get reportConfidence(): Record<string, number> | null {
    return computeReportConfidence();
  },

  get overallConfidence(): number {
    return computeOverallConfidence();
  },

  get overallConfidencePercent(): number {
    return Math.round((this.overallConfidence as number) * 100);
  },

  get hasConfidenceData(): boolean {
    return !!this.reportConfidence;
  },

  get canExtractDNA(): boolean {
    void this.reportRevision;
    return canExtractDNA();
  },

  get reportActionDisabled(): boolean {
    return !this.hasReport;
  },

  get dnaActionDisabled(): boolean {
    return !this.canExtractDNA;
  },

  get generateButtonDisabled(): boolean {
    return !this.isListingReady;
  },

  get visualGenerateButtonDisabled(): boolean {
    return !isVisualReadyForUi(this);
  },

  get autoPopulateButtonClass(): string {
    return !this.dnaActionDisabled
      ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-sm shadow-blue-200 cursor-pointer'
      : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed';
  },

  get extractButtonClass(): string {
    return !this.dnaActionDisabled
      ? 'text-blue-600 bg-blue-50/70 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 cursor-pointer'
      : 'text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed';
  },

  get hasExpandedDimensions(): boolean {
    return this.expandedDimensions.size > 0;
  },

  get toggleAllDimensionsTitle(): string {
    return this.hasExpandedDimensions ? '折叠所有维度' : '展开所有维度';
  },

  get toggleAllDimensionsIconClass(): string {
    return this.hasExpandedDimensions ? 'fa-compress' : 'fa-expand';
  },

  get listingGenerateButtonClass(): string {
    return this.isListingReady
      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 cursor-pointer'
      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none';
  },

  get visualGenerateButtonClass(): string {
    return isVisualReadyForUi(this)
      ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-lg shadow-pink-700/40 hover:shadow-xl hover:shadow-pink-600/50 cursor-pointer'
      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-50';
  },

  get promptTokenCountClass(): string {
    return this.isOverLimit ? 'font-medium text-red-600 animate-pulse' : 'font-bold text-slate-600';
  },

  showDnaConfidence(field: keyof DnaConfidence): boolean {
    return this.dnaConfidence[field] > 0;
  },

  getDnaConfidenceBadgeClass(field: keyof DnaConfidence): string {
    const value = this.dnaConfidence[field];
    if (value >= 70) return 'bg-green-100 text-green-700';
    if (value >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  },

  getDnaConfidenceText(field: keyof DnaConfidence): string {
    return `${this.dnaConfidence[field]}%`;
  },

  showDnaExtractionSummary(): boolean {
    return !!this.dnaExtractionSummary && !this.dnaActionDisabled;
  },

  getDnaExtractionSummaryHeadline(): string {
    const summary = this.dnaExtractionSummary;
    if (!summary) return '';
    return `可提取 ${summary.extractableFields}/${summary.totalFields}，高置信 ${summary.highConfidenceFields} 个`;
  },

  getDnaLowConfidenceText(): string {
    const summary = this.dnaExtractionSummary;
    if (!summary) return '';
    const lowFields = summary.fields
      .filter(field => field.status === 'low')
      .map(field => field.label)
      .join('、');
    return lowFields ? `低置信待复核：${lowFields}` : '';
  },

  getDnaReportTypeText(): string {
    const summary = this.dnaExtractionSummary;
    return summary ? `来源格式：${getDnaReportTypeLabel(summary.reportType)}` : '';
  },

  getDnaFieldSummary(field: DnaExtractionFieldName): DnaExtractionFieldSummary | null {
    return this.dnaExtractionSummary?.fields.find(item => item.field === field) ?? null;
  },

  showDnaSource(field: DnaExtractionFieldName): boolean {
    return !!this.getDnaFieldSummary(field)?.hasValue;
  },

  getDnaFieldSourceText(field: DnaExtractionFieldName): string {
    const summary = this.getDnaFieldSummary(field);
    if (!summary) return '';
    return `来源：${summary.source} · 置信度：${summary.confidence}%`;
  },

  toggleAllDimensions(): void {
    if (this.hasExpandedDimensions) {
      this.collapseAllDimensions();
    } else {
      this.expandAllDimensions();
    }
  },

  // ========== Confidence Helpers (called from Alpine template) ==========

  getTargetConfidence(targetId: string): number {
    return getTargetConfidence(targetId);
  },

  getConfidenceColorClass(percent: number): string {
    return getConfidenceColorClass(percent);
  },

  getConfidenceLevel(percent: number): string {
    return getConfidenceLevel(percent);
  },

  getConfidenceAriaLabel(percent: number): string {
    return getConfidenceAriaLabel(percent);
  },

  // ========== Lifecycle ==========

  init() {
    // 从 store 恢复 profile
    this.restoreState();

    // 填充语言 select 选项
    generateLanguageOptions();

    // 渲染报告分析区域
    this.renderReportAnalysis();
    this.refreshDnaExtractionSummary();

    // 初始化 textarea 高度自适应
    initAutoHeightInputs(this.originalHeights);

    // 监听 EventBus 事件
    const unsubScrape = eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
      this.restoreState();
      this.renderReportAnalysis();
    });

    const unsubHistory = eventBus.on(APP_EVENTS.HISTORY_UPDATED, () => {
      this.restoreState();
      this.renderReportAnalysis();
    });

    this._unsubscribers = [unsubScrape, unsubHistory];

    // 订阅 appStore，分析报告变化时刷新渲染
    if (appStore && typeof appStore.subscribe === 'function') {
      this._appStoreUnsubscribe = appStore.subscribe((state, previousState) => {
        const currentReportFingerprint = getReportFingerprint(state.analysis?.analysisReport);
        const previousReportFingerprint = getReportFingerprint(
          previousState?.analysis?.analysisReport
        );
        if (currentReportFingerprint === previousReportFingerprint) {
          return;
        }

        this.reportRevision += 1;

        const hasUsableReport = computeHasReport();
        if (!hasUsableReport) {
          this.profile = withoutReportDna(this.profile);
          this.dnaConfidence = createDefaultDnaConfidence();
          this.dnaExtractionSummary = null;
          this.hasRenderedReportOnce = false;
          this.expandedDimensions.clear();
          this.expandedSubItems.clear();
          this.saveState();
        } else {
          if (!hasMatchingReportFingerprint(this.profile, currentReportFingerprint)) {
            this.profile = currentReportFingerprint
              ? withReportFingerprint(withoutReportDna(this.profile), currentReportFingerprint)
              : withoutReportDna(this.profile);
            this.dnaConfidence = createDefaultDnaConfidence();
            this.hasRenderedReportOnce = false;
            this.expandedDimensions.clear();
            this.expandedSubItems.clear();
            this.saveState();
          }
          this.refreshDnaExtractionSummary();
        }

        const nextTick = (this as { $nextTick?: (callback: () => void) => void }).$nextTick;
        if (typeof nextTick === 'function') {
          nextTick(() => this.renderReportAnalysis());
        } else {
          setTimeout(() => this.renderReportAnalysis(), 0);
        }
      });
    }
  },

  destroy() {
    this._unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch {
        return;
      }
    });
    this._unsubscribers = [];

    if (this._appStoreUnsubscribe) {
      this._appStoreUnsubscribe();
      this._appStoreUnsubscribe = null;
    }

    this.originalHeights.clear();
  },

  // ========== State Management ==========

  restoreState() {
    const promptlabState = appStore.getState().promptlab;
    const saved = getCurrentSnapshotProfile() ?? promptlabState?.userProductProfile;
    const hasUsableReport = computeHasReport();
    const currentReportFingerprint = getCurrentReportFingerprint();
    if (saved) {
      if (hasUsableReport && hasMatchingReportFingerprint(saved, currentReportFingerprint)) {
        this.profile = { ...DEFAULT_PROFILE, ...saved };
      } else if (hasUsableReport && currentReportFingerprint) {
        this.profile = withReportFingerprint(withoutReportDna(saved), currentReportFingerprint);
        this.saveState();
      } else {
        this.profile = { ...DEFAULT_PROFILE, ...saved };
      }
    } else if (!hasUsableReport) {
      this.profile = { ...DEFAULT_PROFILE };
    }

    if (!hasUsableReport) {
      this.dnaConfidence = createDefaultDnaConfidence();
      this.dnaExtractionSummary = null;
      this.hasRenderedReportOnce = false;
      this.expandedDimensions.clear();
      this.expandedSubItems.clear();
    }

    this.restorePromptCachesFromCurrentSnapshot();
  },

  restorePromptCachesFromCurrentSnapshot() {
    const currentHistoryId = appStore.getState().scraper.currentHistoryId;
    if (currentHistoryId === null || currentHistoryId === undefined) {
      this.listingPromptCache = '';
      this.visualPromptCache = '';
      return;
    }

    const currentReportFingerprint = getCurrentReportFingerprint();
    if (!currentReportFingerprint) {
      this.listingPromptCache = '';
      this.visualPromptCache = '';
      return;
    }

    const promptResults = HistoryService.getPromptResultsById(
      currentHistoryId,
      currentReportFingerprint
    );
    this.listingPromptCache = promptResults?.listing?.prompt || '';
    this.visualPromptCache = promptResults?.visual?.prompt || '';
  },

  saveState() {
    const currentReportFingerprint = getCurrentReportFingerprint();
    const profileToSave = currentReportFingerprint
      ? withReportFingerprint(this.profile, currentReportFingerprint)
      : { ...this.profile };

    if (!currentReportFingerprint) {
      delete profileToSave.reportFingerprint;
    }

    this.profile = profileToSave;
    appStore.getState().setUserProductProfile(profileToSave);

    const currentHistoryId = appStore.getState().scraper.currentHistoryId;
    if (currentHistoryId !== null && currentHistoryId !== undefined) {
      void HistoryService.updateUserProductProfileAsync(currentHistoryId, profileToSave).catch(
        error => {
          console.error('[Promptlab] 保存产品 DNA 快照失败:', error);
        }
      );
    }
  },

  // ========== Report Rendering ==========

  renderReportAnalysis() {
    this.restorePromptCachesFromCurrentSnapshot();
    renderReportAnalysis(this as unknown as PromptlabAlpineContext);
  },

  refreshDnaExtractionSummary() {
    refreshDnaExtractionSummary(this as unknown as PromptlabAlpineContext);
  },

  autoSelectMarket(marketSelect: HTMLSelectElement | null) {
    autoSelectMarket(this as unknown as PromptlabAlpineContext, marketSelect);
  },

  renderReportModules(container: HTMLElement) {
    renderReportModules(this as unknown as PromptlabAlpineContext, container);
  },

  // ========== Auto Height ==========

  expandInput(event: FocusEvent) {
    expandInput(this.originalHeights, event);
  },

  restoreInput(event: FocusEvent) {
    restoreInput(this.originalHeights, event);
  },

  // ========== Prompt Actions ==========

  generateListingPrompt() {
    generateListingPrompt(this as unknown as PromptlabAlpineContext);
  },

  generateVisualPrompt() {
    generateVisualPrompt(this as unknown as PromptlabAlpineContext);
  },

  // ========== DNA Actions ==========

  async autoPopulateDNA() {
    await autoPopulateDNA(this as unknown as PromptlabAlpineContext);
  },

  async extractSingleField(
    fieldName: 'keywordsTier1' | 'keywordsTier2' | 'negative' | 'audience' | 'usps' | 'specs'
  ) {
    await extractSingleField(this as unknown as PromptlabAlpineContext, fieldName);
  },

  // ========== UI Helpers ==========

  toggleConsoleMode(mode: ConsoleMode) {
    toggleConsoleMode(this as unknown as PromptlabAlpineContext, mode);
  },

  copyPrompt() {
    copyPrompt();
  },

  async copySeoKeywords() {
    await copySeoKeywords(this as unknown as PromptlabAlpineContext);
  },

  async clearInputs() {
    await clearInputs(this as unknown as PromptlabAlpineContext);
  },

  selectAllReportSections() {
    selectAllReportSections(this as unknown as PromptlabAlpineContext);
  },

  clearReportSections() {
    clearReportSections(this as unknown as PromptlabAlpineContext);
  },

  onReportSectionChange() {
    onReportSectionChange(this as unknown as PromptlabAlpineContext);
  },

  onInputChange() {
    onInputChange(this as unknown as PromptlabAlpineContext);
  },

  setProfileField(field: keyof UserProductProfile, event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.profile = {
      ...this.profile,
      [field]: target.value,
    };
    this.onInputChange();
    if (field === 'targetMarket') {
      this.refreshDnaExtractionSummary();
    }
  },

  setProfileBoolean(field: keyof UserProductProfile, event: Event) {
    const target = event.target as HTMLInputElement;
    this.profile = {
      ...this.profile,
      [field]: target.checked,
    };
    this.onInputChange();
  },

  setProfileNumber(field: keyof UserProductProfile, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.profile = {
      ...this.profile,
      [field]: Number.isFinite(value) ? value : 0,
    };
    this.onInputChange();
  },

  // ========== Granular Selection Methods ==========

  /**
   * 初始化维度的细粒度选择
   * 默认所有子项都选中
   */
  initializeGranularSelections(dimensionId: string): void {
    const dimensionData = getReportDimensionData(dimensionId);

    // 处理报告可能是字符串的情况
    if (!dimensionData) return;

    if (!this.profile.selectedReportItems) {
      this.profile.selectedReportItems = {};
    }

    const subItems: Record<string, SubItemSelection> = {};
    Object.keys(dimensionData).forEach(key => {
      const value = (dimensionData as Record<string, unknown>)[key];
      // 如果是数组，初始化为对象结构以支持具体项选择
      if (getContentItemIndexes(value).length > 0) {
        subItems[key] = {
          enabled: true,
          items: {}, // 空对象表示全选
        };
      } else {
        subItems[key] = true; // 非数组类型保持简单布尔值
      }
    });

    this.profile.selectedReportItems[dimensionId] = {
      enabled: true,
      subItems,
    };
  },

  getSubItemData(dimensionId: string, subItemKey: string): unknown {
    return getReportDimensionData(dimensionId)?.[subItemKey];
  },

  getContentItemIndexes(dimensionId: string, subItemKey: string): string[] {
    return getContentItemIndexes(this.getSubItemData(dimensionId, subItemKey));
  },

  ensureStructuredSubItemSelection(
    dimensionId: string,
    subItemKey: string
  ): StructuredSubItemSelection | null {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension) return null;

    const current = dimension.subItems[subItemKey];
    if (typeof current === 'object') return current;

    const enabled = current !== false;
    const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
    const structured: StructuredSubItemSelection = {
      enabled,
      items: enabled ? {} : createDisabledItems(indexes),
    };
    dimension.subItems[subItemKey] = structured;
    return structured;
  },

  setSubItemAndContentState(dimensionId: string, subItemKey: string, selected: boolean): void {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension) return;

    const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
    if (indexes.length === 0) {
      dimension.subItems[subItemKey] = selected;
      this.syncDimensionEnabled(dimensionId);
      return;
    }

    const subItem = this.ensureStructuredSubItemSelection(dimensionId, subItemKey);
    if (!subItem) return;

    subItem.enabled = selected;
    subItem.items = selected ? {} : createDisabledItems(indexes);
    this.syncDimensionEnabled(dimensionId);
  },

  getSelectedContentCount(dimensionId: string, subItemKey: string): number {
    const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
    const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
    if (indexes.length === 0) return 0;
    if (typeof subItem === 'boolean') return subItem ? indexes.length : 0;
    if (!subItem?.enabled) return 0;
    return indexes.filter(index => getItemSelectionValue(subItem.items, index, indexes) !== false)
      .length;
  },

  getSelectedSubItemCount(dimensionId: string): number {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension) return 0;

    return Object.keys(dimension.subItems).filter(key => {
      const subItem = dimension.subItems[key];
      if (typeof subItem === 'boolean') return subItem;
      if (typeof subItem === 'object') {
        return subItem.enabled && this.getSelectedContentCount(dimensionId, key) > 0;
      }
      return false;
    }).length;
  },

  syncDimensionEnabled(dimensionId: string): void {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension) return;
    dimension.enabled = this.getSelectedSubItemCount(dimensionId) > 0;
  },

  /**
   * 检查维度是否启用
   */
  isDimensionEnabled(dimensionId: string): boolean {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension?.enabled) return false;
    return this.getSelectedSubItemCount(dimensionId) > 0;
  },

  /**
   * 检查维度是否部分选中（用于 indeterminate 状态）
   */
  isPartiallySelected(dimensionId: string): boolean {
    const item = this.profile.selectedReportItems?.[dimensionId];
    if (!item || !item.enabled) return false;

    const subItemKeys = Object.keys(item.subItems);
    const selectedCount = this.getSelectedSubItemCount(dimensionId);
    const hasPartialSubItem = subItemKeys.some(key =>
      this.isSubItemPartiallySelected(dimensionId, key)
    );
    return hasPartialSubItem || (selectedCount > 0 && selectedCount < subItemKeys.length);
  },

  /**
   * 检查维度是否展开
   */
  isExpanded(dimensionId: string): boolean {
    return this.expandedDimensions.has(dimensionId);
  },

  /**
   * 切换维度展开/折叠
   */
  toggleExpansion(dimensionId: string): void {
    if (this.expandedDimensions.has(dimensionId)) {
      this.expandedDimensions.delete(dimensionId);
    } else {
      this.expandedDimensions.add(dimensionId);
    }
  },

  /**
   * 处理维度复选框切换
   */
  onDimensionToggle(dimensionId: string): void {
    if (!this.profile.selectedReportItems) {
      this.profile.selectedReportItems = {};
    }

    if (!this.profile.selectedReportItems[dimensionId]) {
      this.initializeGranularSelections(dimensionId);
    } else {
      const current = this.profile.selectedReportItems[dimensionId].enabled;
      const newState = !current;
      this.profile.selectedReportItems[dimensionId].enabled = newState;

      const subItems = this.profile.selectedReportItems[dimensionId].subItems;
      Object.keys(subItems).forEach(subItemKey => {
        this.setSubItemAndContentState(dimensionId, subItemKey, newState);
      });
    }

    this.saveState();
  },

  /**
   * 处理子项复选框切换
   */
  onSubItemToggle(dimensionId: string, subItemKey: string): void {
    if (!this.profile.selectedReportItems?.[dimensionId]) return;

    const newState = !this.isSubItemSelected(dimensionId, subItemKey);
    this.setSubItemAndContentState(dimensionId, subItemKey, newState);
    this.saveState();
  },

  /**
   * 检查子项是否选中
   */
  isSubItemSelected(dimensionId: string, subItemKey: string): boolean {
    const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
    if (typeof subItem === 'boolean') return subItem;
    if (typeof subItem === 'object') {
      return subItem.enabled && this.getSelectedContentCount(dimensionId, subItemKey) > 0;
    }
    return true;
  },

  /**
   * 检查子项是否展开
   */
  isSubItemExpanded(dimensionId: string, subItemKey: string): boolean {
    return this.expandedSubItems.has(`${dimensionId}:${subItemKey}`);
  },

  /**
   * 切换子项展开/折叠
   */
  toggleSubItemExpansion(dimensionId: string, subItemKey: string): void {
    const key = `${dimensionId}:${subItemKey}`;
    if (this.expandedSubItems.has(key)) {
      this.expandedSubItems.delete(key);
    } else {
      this.expandedSubItems.add(key);
    }
  },

  /**
   * 检查具体内容项是否选中
   */
  isContentItemSelected(dimensionId: string, subItemKey: string, itemIndex: string): boolean {
    const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
    if (typeof subItem === 'boolean') return subItem;
    if (typeof subItem === 'object') {
      if (!subItem.enabled) return false;
      const itemKeys = this.getContentItemIndexes(dimensionId, subItemKey);
      return getItemSelectionValue(subItem.items, itemIndex, itemKeys) !== false;
    }
    return true;
  },

  /**
   * 切换具体内容项选中状态
   */
  onContentItemToggle(dimensionId: string, subItemKey: string, itemIndex: string): void {
    const dimension = this.profile.selectedReportItems?.[dimensionId];
    if (!dimension) return;

    const wasSelected = this.isContentItemSelected(dimensionId, subItemKey, itemIndex);
    const subItem = this.ensureStructuredSubItemSelection(dimensionId, subItemKey);
    if (!subItem) return;

    if (!subItem.items) {
      subItem.items = {};
    }

    if (!subItem.enabled && !wasSelected) {
      subItem.items = createDisabledItems(this.getContentItemIndexes(dimensionId, subItemKey));
    }

    subItem.items[itemIndex] = !wasSelected;
    subItem.enabled = true;
    subItem.enabled = this.getSelectedContentCount(dimensionId, subItemKey) > 0;
    this.syncDimensionEnabled(dimensionId);

    this.saveState();
  },

  /**
   * 检查子项是否部分选中（用于 indeterminate 状态）
   */
  isSubItemPartiallySelected(dimensionId: string, subItemKey: string): boolean {
    const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
    if (typeof subItem !== 'object' || !subItem.enabled || !subItem.items) return false;

    const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
    const totalCount = indexes.length;
    const selectedCount = this.getSelectedContentCount(dimensionId, subItemKey);

    return selectedCount > 0 && selectedCount < totalCount;
  },

  /**
   * 展开所有维度
   */
  expandAllDimensions(): void {
    const report = getAnalysisReportRoot();
    if (!report) return;

    Object.keys(report).forEach(dimensionId => {
      this.expandedDimensions.add(dimensionId);
    });
  },

  /**
   * 折叠所有维度
   */
  collapseAllDimensions(): void {
    this.expandedDimensions.clear();
  },

  /**
   * 选中维度内所有子项
   */
  selectAllSubItems(dimensionId: string): void {
    if (!this.profile.selectedReportItems?.[dimensionId]) return;

    const subItems = this.profile.selectedReportItems[dimensionId].subItems;
    Object.keys(subItems).forEach(key => {
      this.setSubItemAndContentState(dimensionId, key, true);
    });

    this.saveState();
  },

  /**
   * 取消选中维度内所有子项
   */
  deselectAllSubItems(dimensionId: string): void {
    if (!this.profile.selectedReportItems?.[dimensionId]) return;

    const subItems = this.profile.selectedReportItems[dimensionId].subItems;
    Object.keys(subItems).forEach(key => {
      this.setSubItemAndContentState(dimensionId, key, false);
    });

    this.saveState();
  },

  /**
   * 选中子项内所有具体内容项
   */
  selectAllContentItems(dimensionId: string, subItemKey: string): void {
    if (!this.profile.selectedReportItems?.[dimensionId]) return;

    this.setSubItemAndContentState(dimensionId, subItemKey, true);
    this.saveState();
  },

  /**
   * 取消选中子项内所有具体内容项
   */
  deselectAllContentItems(dimensionId: string, subItemKey: string): void {
    if (!this.profile.selectedReportItems?.[dimensionId]) return;

    this.setSubItemAndContentState(dimensionId, subItemKey, false);
    this.saveState();
  },
};

/**
 * 创建 Promptlab Panel Alpine 组件
 *
 * 使用方式：x-data="createPromptlabPanel()"
 */
export function createPromptlabPanel() {
  return attachPromptlabPanelBehavior(createPromptlabPanelState());
}
