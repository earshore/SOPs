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
import { Logger } from "../../../../../../services/loggerService";

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
      Logger.debug("[Promptlab] 🚀 Alpine 组件初始化");

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
          Logger.debug("[Promptlab] 检测到数据更新，重新渲染报告分析");
          this.renderReportAnalysis();
        },
      );

      const unsubHistory = eventBus.on(APP_EVENTS.HISTORY_UPDATED, () => {
        Logger.debug("[Promptlab] 检测到历史更新，重新渲染报告分析");
        this.renderReportAnalysis();
      });

      this._unsubscribers = [unsubScrape, unsubHistory];

      // 订阅 appStore，分析报告变化时刷新渲染
      if (appStore && typeof appStore.subscribe === "function") {
        this._appStoreUnsubscribe = appStore.subscribe((state) => {
          if (state.analysis?.analysisReport) {
            const self = this;
            if (typeof (self as any).$nextTick === "function") {
              (self as any).$nextTick(() => self.renderReportAnalysis());
            } else {
              setTimeout(() => self.renderReportAnalysis(), 0);
            }
          }
        });
        Logger.debug("[Promptlab] ✅ 已订阅 appStore 变化");
      }

      Logger.debug("[Promptlab] ✅ Alpine 组件初始化完成");
    },

    destroy() {
      Logger.debug("[Promptlab] 🔄 清理所有订阅");

      this._unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          Logger.warn("[Promptlab] 清理订阅时出错:", e);
        }
      });
      this._unsubscribers = [];

      if (this._appStoreUnsubscribe) {
        this._appStoreUnsubscribe();
        this._appStoreUnsubscribe = null;
      }

      this.originalHeights.clear();

      Logger.debug("[Promptlab] ✅ 资源清理完成");
    },

    // ========== State Management ==========

    restoreState() {
      const saved = appStore.getState().promptlab?.userProductProfile;
      if (saved) {
        this.profile = { ...saved };
        Logger.debug("[Promptlab] ✅ 状态已从 store 恢复");
      }
    },

    saveState() {
      appStore.getState().setUserProductProfile(this.profile);
      Logger.debug("[Promptlab] ✅ 状态已保存到 store");
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

    // ========== Granular Selection Methods ==========

    /**
     * 初始化维度的细粒度选择
     * 默认所有子项都选中
     */
    initializeGranularSelections(dimensionId: string): void {
      const report = appStore.getState().analysis.analysisReport;

      // 处理报告可能是字符串的情况
      if (!report || typeof report === 'string') return;

      const dimensionData = report[dimensionId];

      if (!dimensionData || typeof dimensionData !== 'object') return;

      if (!this.profile.selectedReportItems) {
        this.profile.selectedReportItems = {};
      }

      const subItems: Record<string, boolean | { enabled: boolean; items?: Record<string, boolean> }> = {};
      Object.keys(dimensionData).forEach(key => {
        const value = (dimensionData as Record<string, unknown>)[key];
        // 如果是数组，初始化为对象结构以支持具体项选择
        if (Array.isArray(value) && value.length > 0) {
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

    /**
     * 检查维度是否启用
     */
    isDimensionEnabled(dimensionId: string): boolean {
      return this.profile.selectedReportItems?.[dimensionId]?.enabled ?? false;
    },

    /**
     * 检查维度是否部分选中（用于 indeterminate 状态）
     */
    isPartiallySelected(dimensionId: string): boolean {
      const item = this.profile.selectedReportItems?.[dimensionId];
      if (!item || !item.enabled) return false;

      const subItems = Object.values(item.subItems);
      const selectedCount = subItems.filter(Boolean).length;
      return selectedCount > 0 && selectedCount < subItems.length;
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

        // 级联更新：当维度被选中/取消时，更新所有子项和具体内容项
        const subItems = this.profile.selectedReportItems[dimensionId].subItems;
        Object.keys(subItems).forEach(subItemKey => {
          const subItem = subItems[subItemKey];
          if (typeof subItem === 'boolean') {
            subItems[subItemKey] = newState;
          } else if (typeof subItem === 'object') {
            subItem.enabled = newState;
            // 如果有具体内容项，也一并更新
            if (newState) {
              // 选中时清空 items（表示全选）
              subItem.items = {};
            } else {
              // 取消选中时，将所有具体项设为 false
              if (subItem.items) {
                const report = appStore.getState().analysis.analysisReport;
                if (report && typeof report !== 'string') {
                  const dimensionData = report[dimensionId];
                  if (dimensionData && typeof dimensionData === 'object') {
                    const dataArray = (dimensionData as Record<string, unknown>)[subItemKey];
                    if (Array.isArray(dataArray)) {
                      subItem.items = {};
                      dataArray.forEach((_, idx) => {
                        subItem.items![idx.toString()] = false;
                      });
                    }
                  }
                }
              }
            }
          }
        });
      }

      this.saveState();
    },

    /**
     * 处理子项复选框切换
     */
    onSubItemToggle(dimensionId: string, subItemKey: string): void {
      if (!this.profile.selectedReportItems?.[dimensionId]) return;

      const subItem = this.profile.selectedReportItems[dimensionId].subItems[subItemKey];

      if (typeof subItem === 'boolean') {
        const newState = !subItem;
        this.profile.selectedReportItems[dimensionId].subItems[subItemKey] = newState;
      } else if (typeof subItem === 'object') {
        const newState = !subItem.enabled;
        subItem.enabled = newState;

        // 级联更新：当子项被选中/取消时，更新所有具体内容项
        if (newState) {
          // 选中时清空 items（表示全选）
          subItem.items = {};
        } else {
          // 取消选中时，将所有具体项设为 false
          const report = appStore.getState().analysis.analysisReport;
          if (report && typeof report !== 'string') {
            const dimensionData = report[dimensionId];
            if (dimensionData && typeof dimensionData === 'object') {
              const dataArray = (dimensionData as Record<string, unknown>)[subItemKey];
              if (Array.isArray(dataArray)) {
                subItem.items = {};
                dataArray.forEach((_, idx) => {
                  subItem.items![idx.toString()] = false;
                });
              }
            }
          }
        }
      }

      this.saveState();
    },

    /**
     * 检查子项是否选中
     */
    isSubItemSelected(dimensionId: string, subItemKey: string): boolean {
      const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
      if (typeof subItem === 'boolean') return subItem;
      if (typeof subItem === 'object') return subItem.enabled;
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
      if (typeof subItem === 'object' && subItem.items) {
        // 如果 items 中有该索引，返回其值；否则默认选中
        return subItem.items[itemIndex] !== false;
      }
      return true;
    },

    /**
     * 切换具体内容项选中状态
     */
    onContentItemToggle(dimensionId: string, subItemKey: string, itemIndex: string): void {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return;

      const subItem = dimension.subItems[subItemKey];
      if (typeof subItem !== 'object') return;

      if (!subItem.items) {
        subItem.items = {};
      }

      const current = subItem.items[itemIndex] !== false;
      subItem.items[itemIndex] = !current;

      this.saveState();
    },

    /**
     * 检查子项是否部分选中（用于 indeterminate 状态）
     */
    isSubItemPartiallySelected(dimensionId: string, subItemKey: string): boolean {
      const subItem = this.profile.selectedReportItems?.[dimensionId]?.subItems[subItemKey];
      if (typeof subItem !== 'object' || !subItem.enabled || !subItem.items) return false;

      const report = appStore.getState().analysis.analysisReport;
      if (!report || typeof report === 'string') return false;

      const dimensionData = report[dimensionId];
      if (!dimensionData || typeof dimensionData !== 'object') return false;

      const dataArray = (dimensionData as Record<string, unknown>)[subItemKey];
      if (!Array.isArray(dataArray)) return false;

      const totalCount = dataArray.length;
      const selectedCount = dataArray.filter((_, idx) =>
        subItem.items![idx.toString()] !== false
      ).length;

      return selectedCount > 0 && selectedCount < totalCount;
    },

    /**
     * 展开所有维度
     */
    expandAllDimensions(): void {
      const report = appStore.getState().analysis.analysisReport;
      if (!report || typeof report === 'string') return;

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
        const subItem = subItems[key];
        if (typeof subItem === 'boolean') {
          subItems[key] = true;
        } else if (typeof subItem === 'object') {
          subItem.enabled = true;
          // 级联更新：同时选中所有具体内容项（清空 items 表示全选）
          subItem.items = {};
        }
      });

      this.saveState();
    },

    /**
     * 取消选中维度内所有子项
     */
    deselectAllSubItems(dimensionId: string): void {
      if (!this.profile.selectedReportItems?.[dimensionId]) return;

      const subItems = this.profile.selectedReportItems[dimensionId].subItems;
      const report = appStore.getState().analysis.analysisReport;

      Object.keys(subItems).forEach(key => {
        const subItem = subItems[key];
        if (typeof subItem === 'boolean') {
          subItems[key] = false;
        } else if (typeof subItem === 'object') {
          subItem.enabled = false;
          // 级联更新：同时取消选中所有具体内容项
          if (report && typeof report !== 'string') {
            const dimensionData = report[dimensionId];
            if (dimensionData && typeof dimensionData === 'object') {
              const dataArray = (dimensionData as Record<string, unknown>)[key];
              if (Array.isArray(dataArray)) {
                subItem.items = {};
                dataArray.forEach((_, idx) => {
                  subItem.items![idx.toString()] = false;
                });
              }
            }
          }
        }
      });

      this.saveState();
    },

    /**
     * 选中子项内所有具体内容项
     */
    selectAllContentItems(dimensionId: string, subItemKey: string): void {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return;

      const subItem = dimension.subItems[subItemKey];
      if (typeof subItem === 'object') {
        subItem.items = {}; // 空对象表示全选
        this.saveState();
      }
    },

    /**
     * 取消选中子项内所有具体内容项
     */
    deselectAllContentItems(dimensionId: string, subItemKey: string): void {
      const dimension = this.profile.selectedReportItems?.[dimensionId];
      if (!dimension) return;

      const subItem = dimension.subItems[subItemKey];
      if (typeof subItem === 'object') {
        const report = appStore.getState().analysis.analysisReport;
        if (!report || typeof report === 'string') return;

        const dimensionData = report[dimensionId];
        if (!dimensionData || typeof dimensionData !== 'object') return;

        const dataArray = (dimensionData as Record<string, unknown>)[subItemKey];
        if (!Array.isArray(dataArray)) return;

        // 将所有项设置为 false
        subItem.items = {};
        dataArray.forEach((_, idx) => {
          subItem.items![idx.toString()] = false;
        });

        this.saveState();
      }
    },
  };
}
