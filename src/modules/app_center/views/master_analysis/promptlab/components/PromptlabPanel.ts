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

import { appStore } from "@/stores/useAppStore";
import {
  APP_EVENTS,
  MODULE_EVENTS,
} from "../../../../../../common/constants/eventConstants";
import eventBus from "../../../../../../common/EventBus";
// ── 子模块导入 ────────────────────────────────────────────────────────────────
import type {
  ConsoleMode,
  DnaConfidence,
  PromptlabAlpineContext,
} from "./types";

import {
  computeHasReport,
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
} from "./computed";

import {
  generateLanguageOptions,
  renderReportAnalysis,
  autoSelectMarket,
  renderReportModules,
} from "./reportRenderer";

import {
  canExtractDNA,
  autoPopulateDNA,
  extractSingleField,
} from "./dnaActions";

import { generateListingPrompt, generateVisualPrompt } from "./promptActions";

import {
  initAutoHeightInputs,
  expandInput,
  restoreInput,
  toggleConsoleMode,
  copyPrompt,
  clearInputs,
  selectAllReportSections,
  clearReportSections,
  onReportSectionChange,
  onInputChange,
} from "./uiHelpers";

import type { UserProductProfile } from "@/types/state";

// ─────────────────────────────────────────────────────────────────────────────

/** 默认 profile 初始值 */
const DEFAULT_PROFILE: UserProductProfile = {
  targetMarket: "",
  keywordsTier1: "",
  keywordsTier2: "",
  audience: "",
  usps: "",
  specs: "",
  socialHook: "",
  negative: "",
  tone: "professional",
  customStrategy: "",
  useCosmo: true,
  useRufus: true,
  useEmoji: true,
  selectedReportSections: [] as string[],
  charLimit: 5000,
};

type StructuredSubItemSelection = {
  enabled: boolean;
  items?: Record<string, boolean>;
};

type SubItemSelection = boolean | StructuredSubItemSelection;

const getAnalysisReportRoot = (): Record<string, unknown> | null => {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === "string") return null;

  const reportObj = report as Record<string, unknown>;
  return reportObj.analysisReport && typeof reportObj.analysisReport === "object"
    ? (reportObj.analysisReport as Record<string, unknown>)
    : reportObj;
};

const getReportDimensionData = (
  dimensionId: string,
): Record<string, unknown> | null => {
  const report = getAnalysisReportRoot();
  const dimensionData = report?.[dimensionId];
  return dimensionData && typeof dimensionData === "object"
    ? (dimensionData as Record<string, unknown>)
    : null;
};

const getContentItemIndexes = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((_, index) => index.toString());
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).map((_, index) =>
      index.toString(),
    );
  }
  return ["0"];
};

const createDisabledItems = (indexes: string[]): Record<string, boolean> => {
  const items: Record<string, boolean> = {};
  indexes.forEach((index) => {
    items[index] = false;
  });
  return items;
};

/**
 * 创建 Promptlab Panel Alpine 组件
 *
 * 使用方式：x-data="createPromptlabPanel()"
 */
export function createPromptlabPanel() {
  return {
    // ========== State ==========

    currentConsoleMode: "listing" as ConsoleMode,

    listingPromptCache: "",
    visualPromptCache: "",

    /** 用于检测数据源变化 */
    lastMarketplace: "",

    /** textarea 原始高度缓存，供高度自适应使用 */
    originalHeights: new Map<HTMLElement, number>(),

    profile: { ...DEFAULT_PROFILE } as UserProductProfile,

    dnaConfidence: {
      audience: 0,
      usps: 0,
      specs: 0,
      keywords: 0,
      negative: 0,
      overall: 0,
    } as DnaConfidence,

    /** 是否已渲染过报告（用于区分首次加载和用户主动清空） */
    hasRenderedReportOnce: false,

    /** 展开的维度集合（UI状态，不持久化） */
    expandedDimensions: new Set<string>(),

    /** 展开的子项集合（UI状态，不持久化） */
    expandedSubItems: new Set<string>(),

    _unsubscribers: [] as Array<() => void>,
    _appStoreUnsubscribe: null as (() => void) | null,

    // ========== Computed Getters ==========

    get hasReport(): boolean {
      return computeHasReport();
    },

    get isReady(): boolean {
      return computeIsReady(this as unknown as PromptlabAlpineContext);
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
      return canExtractDNA();
    },

    get reportActionDisabled(): boolean {
      return !this.hasReport;
    },

    get generateButtonDisabled(): boolean {
      return !this.isReady;
    },

    get autoPopulateButtonClass(): string {
      return this.hasReport
        ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
        : 'bg-slate-200 text-slate-400 cursor-not-allowed';
    },

    get extractButtonClass(): string {
      return this.hasReport ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-not-allowed';
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
      return this.isReady
        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 cursor-pointer'
        : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none';
    },

    get visualGenerateButtonClass(): string {
      return this.isReady
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
      console.log("[Promptlab] 🚀 Alpine 组件初始化");

      // 从 store 恢复 profile
      this.restoreState();

      // 填充语言 select 选项
      generateLanguageOptions();

      // 渲染报告分析区域
      this.renderReportAnalysis();

      // 初始化 textarea 高度自适应
      initAutoHeightInputs(this.originalHeights);

      // 监听 EventBus 事件
      const unsubScrape = eventBus.on(
        MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS,
        () => {
          console.log("[Promptlab] 检测到数据更新，重新渲染报告分析");
          this.renderReportAnalysis();
        },
      );

      const unsubHistory = eventBus.on(APP_EVENTS.HISTORY_UPDATED, () => {
        console.log("[Promptlab] 检测到历史更新，重新渲染报告分析");
        this.renderReportAnalysis();
      });

      this._unsubscribers = [unsubScrape, unsubHistory];

      // 订阅 appStore，分析报告变化时刷新渲染
      if (appStore && typeof appStore.subscribe === "function") {
        this._appStoreUnsubscribe = appStore.subscribe((state) => {
          if (state.analysis?.analysisReport) {
            const nextTick = (
              this as { $nextTick?: (callback: () => void) => void }
            ).$nextTick;
            if (typeof nextTick === "function") {
              nextTick(() => this.renderReportAnalysis());
            } else {
              setTimeout(() => this.renderReportAnalysis(), 0);
            }
          }
        });
        console.log("[Promptlab] ✅ 已订阅 appStore 变化");
      }

      console.log("[Promptlab] ✅ Alpine 组件初始化完成");
    },

    destroy() {
      console.log("[Promptlab] 🔄 清理所有订阅");

      this._unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          console.warn("[Promptlab] 清理订阅时出错:", e);
        }
      });
      this._unsubscribers = [];

      if (this._appStoreUnsubscribe) {
        this._appStoreUnsubscribe();
        this._appStoreUnsubscribe = null;
      }

      this.originalHeights.clear();

      console.log("[Promptlab] ✅ 资源清理完成");
    },

    // ========== State Management ==========

    restoreState() {
      const saved = appStore.getState().promptlab?.userProductProfile;
      if (saved) {
        this.profile = { ...saved };
        console.log("[Promptlab] ✅ 状态已从 store 恢复");
      }
    },

    saveState() {
      appStore.getState().setUserProductProfile(this.profile);
      console.log("[Promptlab] ✅ 状态已保存到 store");
    },

    // ========== Report Rendering ==========

    renderReportAnalysis() {
      renderReportAnalysis(this as unknown as PromptlabAlpineContext);
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

    autoPopulateDNA() {
      autoPopulateDNA(this as unknown as PromptlabAlpineContext);
    },

    extractSingleField(fieldName: "keywordsTier1" | "keywordsTier2" | "negative" | "audience" | "usps" | "specs") {
      extractSingleField(this as unknown as PromptlabAlpineContext, fieldName);
    },

    // ========== UI Helpers ==========

    toggleConsoleMode(mode: ConsoleMode) {
      toggleConsoleMode(this as unknown as PromptlabAlpineContext, mode);
    },

    copyPrompt() {
      copyPrompt();
    },

    clearInputs() {
      clearInputs(this as unknown as PromptlabAlpineContext);
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
            items: {} // 空对象表示全选
          };
        } else {
          subItems[key] = true; // 非数组类型保持简单布尔值
        }
      });

      this.profile.selectedReportItems[dimensionId] = {
        enabled: true,
        subItems
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
      subItemKey: string,
    ): StructuredSubItemSelection | null {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return null;

      const current = dimension.subItems[subItemKey];
      if (typeof current === "object") return current;

      const enabled = current !== false;
      const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
      const structured: StructuredSubItemSelection = {
        enabled,
        items: enabled ? {} : createDisabledItems(indexes),
      };
      dimension.subItems[subItemKey] = structured;
      return structured;
    },

    setSubItemAndContentState(
      dimensionId: string,
      subItemKey: string,
      selected: boolean,
    ): void {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return;

      const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
      if (indexes.length === 0) {
        dimension.subItems[subItemKey] = selected;
        this.syncDimensionEnabled(dimensionId);
        return;
      }

      const subItem = this.ensureStructuredSubItemSelection(
        dimensionId,
        subItemKey,
      );
      if (!subItem) return;

      subItem.enabled = selected;
      subItem.items = selected ? {} : createDisabledItems(indexes);
      this.syncDimensionEnabled(dimensionId);
    },

    getSelectedContentCount(dimensionId: string, subItemKey: string): number {
      const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
      const indexes = this.getContentItemIndexes(dimensionId, subItemKey);
      if (indexes.length === 0) return 0;
      if (typeof subItem === "boolean") return subItem ? indexes.length : 0;
      if (!subItem?.enabled) return 0;
      return indexes.filter((index) => subItem.items?.[index] !== false).length;
    },

    getSelectedSubItemCount(dimensionId: string): number {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return 0;

      return Object.keys(dimension.subItems).filter((key) => {
        const subItem = dimension.subItems[key];
        if (typeof subItem === "boolean") return subItem;
        if (typeof subItem === "object") {
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
      const hasPartialSubItem = subItemKeys.some((key) =>
        this.isSubItemPartiallySelected(dimensionId, key),
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
        // 如果 items 中有该索引，返回其值；否则默认选中
        return subItem.items?.[itemIndex] !== false;
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
}
