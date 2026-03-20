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
  };
}
