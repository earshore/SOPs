// src/common/infrastructure/StateManager.ts
// ================================================================
// ⚠️ DEPRECATED - 此文件已废弃
// 
// 状态管理已完全迁移到 Zustand
// 请使用: import { appStore } from '@/stores/useAppStore'
// 
// 迁移指南:
// - 读取状态: appStore.getState().ui.currentTab
// - 更新状态: appStore.getState().setCurrentTab('home')
// - 订阅变化: appStore.subscribe((state) => { ... })
// 
// 此文件仅保留用于向后兼容，将在未来版本中移除
// ================================================================

import { appStore } from '../../stores/useAppStore';
import type {
  UIState,
  PromptLabState,
  ScraperState
} from '../../types/state';
import type { AnalysisReport, ScrapedData } from '../../types/modules-business';

/**
 * 中间件函数类型
 * @deprecated 使用 Zustand 中间件代替
 * @param state - 当前状态
 * @param action - 操作名称
 * @param payload - 操作数据
 */
export type Middleware = (state: any, action: string, payload: any) => void;

/**
 * 状态快照
 */
export interface StateSnapshot {
  /** 快照 ID */
  id: string;
  /** 快照时间戳 */
  timestamp: number;
  /** 快照描述 */
  description?: string;
  /** 状态数据 */
  state: ReturnType<typeof appStore.getState>;
}

/**
 * StateManager 配置选项
 */
export interface StateManagerOptions {
  /** 是否持久化状态 */
  persist?: boolean;
  /** localStorage 存储键名 */
  persistKey?: string;
  /** 中间件列表 */
  middleware?: Middleware[];
  /** 最大快照历史数量 */
  maxSnapshots?: number;
  /** 是否启用时间旅行调试 */
  enableTimeTravel?: boolean;
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string;
  timestamp: number;
  data: any;
  [key: string]: any;
}

/**
 * 统一状态管理器
 * 
 * @deprecated 此类已废弃，请使用 Zustand store
 * 
 * 迁移示例:
 * ```typescript
 * // 旧方式
 * const stateManager = StateManager.getInstance();
 * const report = stateManager.getAnalysisReport();
 * 
 * // 新方式
 * import { appStore } from '@/stores/useAppStore';
 * const report = appStore.getState().analysis.analysisReport;
 * ```
 * 
 * 职责：
 * - 封装 Zustand store 访问
 * - 提供类型安全的 getter/setter
 * - 支持中间件（日志、持久化、验证）
 * - 支持状态订阅和变化监听
 * - 过渡期兼容旧的 state 对象
 * 
 * @example
 * ```typescript
 * const stateManager = StateManager.getInstance();
 * 
 * // 获取状态
 * const report = stateManager.getAnalysisReport();
 * 
 * // 设置状态
 * stateManager.setAnalysisReport(newReport);
 * 
 * // 订阅状态变化
 * const unsubscribe = stateManager.subscribe(
 *   (state) => state.analysis.analysisReport,
 *   (value) => console.log('Report changed:', value)
 * );
 * ```
 */
export class StateManager {
  private static instance: StateManager;
  private middleware: Middleware[] = [];
  private options: StateManagerOptions;
  
  // 快照历史管理
  private snapshotHistory: StateSnapshot[] = [];
  private currentSnapshotIndex: number = -1;
  private maxSnapshots: number;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor(options: StateManagerOptions = {}) {
    this.options = {
      persist: false,
      persistKey: 'state-manager-snapshot',
      middleware: [],
      maxSnapshots: 50,
      enableTimeTravel: false,
      ...options
    };

    this.maxSnapshots = this.options.maxSnapshots || 50;

    if (this.options.middleware) {
      this.middleware = [...this.options.middleware];
    }

    // 如果启用时间旅行，加载历史快照
    if (this.options.enableTimeTravel && this.options.persist) {
      this.loadSnapshotHistory();
    }
  }

  /**
   * 获取 StateManager 单例实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns StateManager 实例
   */
  public static getInstance(options?: StateManagerOptions): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager(options);
    }
    return StateManager.instance;
  }

  /**
   * 重置单例实例（仅用于测试）
   * @internal
   */
  public static resetInstance(): void {
    StateManager.instance = null as any;
  }

  // ==================== Analysis 状态管理 ====================

  /**
   * 获取分析报告
   * @returns 分析报告或 null
   */
  public getAnalysisReport(): AnalysisReport | string | null {
    const state = appStore.getState();
    return state.analysis.analysisReport ?? null;
  }

  /**
   * 设置分析报告
   * @param report - 分析报告数据
   */
  public setAnalysisReport(report: AnalysisReport | string): void {
    this.applyMiddleware('setAnalysisReport', report);
    appStore.getState().setAnalysisReport(report);
    this.syncToLegacyState();
  }

  /**
   * 获取选中的 ASINs
   * @returns ASIN 数组
   */
  public getSelectedAsins(): string[] {
    const state = appStore.getState();
    return state.analysis.selectedAsins || [];
  }

  /**
   * 设置选中的 ASINs
   * @param asins - ASIN 数组
   */
  public setSelectedAsins(asins: string[]): void {
    this.applyMiddleware('setSelectedAsins', asins);
    appStore.getState().setSelectedAsins(asins);
    this.syncToLegacyState();
  }

  /**
   * 获取翻译后的报告
   * @returns 翻译后的报告或 null
   */
  public getTranslatedReport(): AnalysisReport | null {
    const state = appStore.getState();
    return state.analysis.translatedReport ?? null;
  }

  /**
   * 设置翻译后的报告
   * @param report - 翻译后的报告
   */
  public setTranslatedReport(report: AnalysisReport): void {
    this.applyMiddleware('setTranslatedReport', report);
    appStore.getState().setTranslatedReport(report);
    this.syncToLegacyState();
  }

  /**
   * 获取是否正在分析
   * @returns 是否正在分析
   */
  public getIsAnalyzing(): boolean {
    const state = appStore.getState();
    return state.analysis.isAnalyzing ?? false;
  }

  /**
   * 设置是否正在分析
   * @param isAnalyzing - 是否正在分析
   */
  public setIsAnalyzing(isAnalyzing: boolean): void {
    this.applyMiddleware('setIsAnalyzing', isAnalyzing);
    appStore.getState().updateAnalysis({ isAnalyzing });
    this.syncToLegacyState();
  }

  /**
   * 获取报告数据
   * @returns 报告数据或 null
   */
  public getReportData(): any | null {
    const state = appStore.getState();
    return state.analysis.reportData ?? null;
  }

  /**
   * 设置报告数据
   * @param reportData - 报告数据
   */
  public setReportData(reportData: any): void {
    this.applyMiddleware('setReportData', reportData);
    appStore.getState().setReportData(reportData);
    this.syncToLegacyState();
  }

  /**
   * 获取展开的 ASIN
   * @returns 展开的 ASIN 或 null
   */
  public getExpandedAsin(): string | null {
    const state = appStore.getState();
    return state.analysis.expandedAsin ?? null;
  }

  /**
   * 设置展开的 ASIN
   * @param asin - ASIN 字符串
   */
  public setExpandedAsin(asin: string | null): void {
    this.applyMiddleware('setExpandedAsin', asin);
    appStore.getState().setExpandedAsin(asin);
    this.syncToLegacyState();
  }

  /**
   * 获取是否正在编辑
   * @returns 是否正在编辑
   */
  public getIsEditing(): boolean {
    const state = appStore.getState();
    return state.analysis.isEditing ?? false;
  }

  /**
   * 设置是否正在编辑
   * @param isEditing - 是否正在编辑
   */
  public setIsEditing(isEditing: boolean): void {
    this.applyMiddleware('setIsEditing', isEditing);
    appStore.getState().setIsEditing(isEditing);
    this.syncToLegacyState();
  }

  /**
   * 获取是否显示翻译
   * @returns 是否显示翻译
   */
  public getShowTranslation(): boolean {
    const state = appStore.getState();
    return state.analysis.showTranslation ?? false;
  }

  /**
   * 设置是否显示翻译
   * @param showTranslation - 是否显示翻译
   */
  public setShowTranslation(showTranslation: boolean): void {
    this.applyMiddleware('setShowTranslation', showTranslation);
    appStore.getState().setShowTranslation(showTranslation);
    this.syncToLegacyState();
  }

  /**
   * 获取编辑历史
   * @returns 编辑历史数组
   */
  public getEditHistory(): Array<AnalysisReport | string> {
    const state = appStore.getState();
    return state.analysis.editHistory ?? [];
  }

  /**
   * 添加编辑历史记录
   * @param report - 报告数据
   */
  public addEditHistory(report: AnalysisReport | string): void {
    this.applyMiddleware('addEditHistory', report);
    const state = appStore.getState();
    const currentHistory = state.analysis.editHistory ?? [];
    state.updateAnalysis({ 
      editHistory: [...currentHistory, report] 
    });
    this.syncToLegacyState();
  }

  /**
   * 清空编辑历史
   */
  public clearEditHistory(): void {
    this.applyMiddleware('clearEditHistory', null);
    appStore.getState().updateAnalysis({ editHistory: [] });
    this.syncToLegacyState();
  }

  /**
   * 获取最后使用的翻译模型
   * @returns 翻译模型名称或 null
   */
  public getLastTranslationModel(): string | null {
    const state = appStore.getState();
    return state.analysis.lastTranslationModel ?? null;
  }

  /**
   * 设置最后使用的翻译模型
   * @param model - 翻译模型名称
   */
  public setLastTranslationModel(model: string | null): void {
    this.applyMiddleware('setLastTranslationModel', model);
    appStore.getState().updateAnalysis({ lastTranslationModel: model });
    this.syncToLegacyState();
  }

  /**
   * 获取分析过滤器
   * @returns 过滤器配置或 undefined
   */
  public getAnalysisFilters(): any | undefined {
    const state = appStore.getState();
    return state.analysis.filters;
  }

  /**
   * 设置分析过滤器
   * @param filters - 过滤器配置
   */
  public setAnalysisFilters(filters: any): void {
    this.applyMiddleware('setAnalysisFilters', filters);
    appStore.getState().updateAnalysis({ filters });
    this.syncToLegacyState();
  }

  /**
   * 获取待处理的报告
   * @returns 待处理的报告或 undefined
   */
  public getPendingReport(): any | undefined {
    const state = appStore.getState();
    return state.analysis.pendingReport;
  }

  /**
   * 设置待处理的报告
   * @param pendingReport - 待处理的报告
   */
  public setPendingReport(pendingReport: any): void {
    this.applyMiddleware('setPendingReport', pendingReport);
    appStore.getState().updateAnalysis({ pendingReport });
    this.syncToLegacyState();
  }

  /**
   * 清除待处理的报告
   */
  public clearPendingReport(): void {
    this.applyMiddleware('clearPendingReport', null);
    appStore.getState().updateAnalysis({ pendingReport: undefined });
    this.syncToLegacyState();
  }

  // ==================== Scraper 状态管理 ====================

  /**
   * 获取抓取的数据
   * @returns 抓取的数据或 null
   */
  public getScrapedData(): ScrapedData | null {
    const state = appStore.getState();
    return state.scraper.scrapedData;
  }

  /**
   * 设置抓取的数据
   * @param data - 抓取的数据
   */
  public setScrapedData(data: ScrapedData | null): void {
    this.applyMiddleware('setScrapedData', data);
    appStore.getState().setScrapedData(data);
    this.syncToLegacyState();
  }

  /**
   * 获取 Scraper 历史记录
   * @returns 历史记录数组（注意：当前 store 中没有直接的 history 字段）
   */
  public getScraperHistory(): HistoryItem[] {
    // 注意：当前 ScraperState 中没有 history 字段
    // 这里返回空数组，实际实现需要根据业务需求调整
    return [];
  }

  /**
   * 添加到历史记录
   * @param item - 历史记录项
   */
  public addToHistory(item: HistoryItem): void {
    this.applyMiddleware('addToHistory', item);
    // 注意：当前 ScraperState 中没有 history 字段
    // 实际实现需要扩展 store 或使用其他存储方式
    this.syncToLegacyState();
  }

  /**
   * 获取是否正在抓取
   * @returns 是否正在抓取
   */
  public getIsScraping(): boolean {
    const state = appStore.getState();
    return state.scraper.isScraping;
  }

  /**
   * 设置是否正在抓取
   * @param isScraping - 是否正在抓取
   */
  public setIsScraping(isScraping: boolean): void {
    this.applyMiddleware('setIsScraping', isScraping);
    appStore.getState().setIsScraping(isScraping);
    this.syncToLegacyState();
  }

  /**
   * 获取 Scraper 状态
   * @returns Scraper 状态
   */
  public getScraperStatus(): ScraperState['status'] {
    const state = appStore.getState();
    return state.scraper.status;
  }

  /**
   * 设置 Scraper 状态
   * @param status - Scraper 状态
   */
  public setScraperStatus(status: ScraperState['status']): void {
    this.applyMiddleware('setScraperStatus', status);
    appStore.getState().setScraperStatus(status);
    this.syncToLegacyState();
  }

  /**
   * 获取选中的站点
   * @returns 选中的站点
   */
  public getSelectedSite(): ScraperState['selectedSite'] {
    const state = appStore.getState();
    return state.scraper.selectedSite;
  }

  /**
   * 设置选中的站点
   * @param site - 站点
   */
  public setSelectedSite(site: ScraperState['selectedSite']): void {
    this.applyMiddleware('setSelectedSite', site);
    appStore.getState().setSelectedSite(site);
    this.syncToLegacyState();
  }

  /**
   * 获取当前历史记录 ID
   * @returns 当前历史记录 ID
   */
  public getCurrentHistoryId(): ScraperState['currentHistoryId'] {
    const state = appStore.getState();
    return state.scraper.currentHistoryId;
  }

  /**
   * 设置当前历史记录 ID
   * @param id - 历史记录 ID
   */
  public setCurrentHistoryId(id: ScraperState['currentHistoryId']): void {
    this.applyMiddleware('setCurrentHistoryId', id);
    appStore.getState().setCurrentHistoryId(id);
    this.syncToLegacyState();
  }

  /**
   * 获取输入的 ASINs
   * @returns 输入的 ASINs 字符串
   */
  public getInputAsins(): string | undefined {
    const state = appStore.getState();
    return state.scraper.inputAsins;
  }

  /**
   * 设置输入的 ASINs
   * @param asins - ASINs 字符串
   */
  public setInputAsins(asins: string): void {
    this.applyMiddleware('setInputAsins', asins);
    appStore.getState().updateScraper({ inputAsins: asins });
    this.syncToLegacyState();
  }

  /**
   * 获取抓取进度
   * @returns 抓取进度（0-100）
   */
  public getScraperProgress(): number | undefined {
    const state = appStore.getState();
    return state.scraper.progress;
  }

  /**
   * 设置抓取进度
   * @param progress - 进度值（0-100）
   */
  public setScraperProgress(progress: number): void {
    this.applyMiddleware('setScraperProgress', progress);
    appStore.getState().updateScraper({ progress });
    this.syncToLegacyState();
  }

  /**
   * 获取 Scraper 错误信息
   * @returns 错误信息
   */
  public getScraperError(): string | undefined {
    const state = appStore.getState();
    return state.scraper.error;
  }

  /**
   * 设置 Scraper 错误信息
   * @param error - 错误信息
   */
  public setScraperError(error: string | undefined): void {
    this.applyMiddleware('setScraperError', error);
    appStore.getState().updateScraper({ error });
    this.syncToLegacyState();
  }

  /**
   * 获取展开的 ASIN（Scraper 模块）
   * @returns 展开的 ASIN
   */
  public getScraperExpandedAsin(): string | null | undefined {
    const state = appStore.getState();
    return state.scraper.expandedAsin;
  }

  /**
   * 设置展开的 ASIN（Scraper 模块）
   * @param asin - ASIN
   */
  public setScraperExpandedAsin(asin: string | null): void {
    this.applyMiddleware('setScraperExpandedAsin', asin);
    appStore.getState().updateScraper({ expandedAsin: asin });
    this.syncToLegacyState();
  }

  /**
   * 获取当前数据标签页
   * @returns 当前数据标签页
   */
  public getCurrentDataTab(): ScraperState['currentDataTab'] {
    const state = appStore.getState();
    return state.scraper.currentDataTab;
  }

  /**
   * 设置当前数据标签页
   * @param tab - 标签页类型
   */
  public setCurrentDataTab(tab: 'preview' | 'json'): void {
    this.applyMiddleware('setCurrentDataTab', tab);
    appStore.getState().updateScraper({ currentDataTab: tab });
    this.syncToLegacyState();
  }

  /**
   * 更新 Scraper 状态（批量更新）
   * @param updates - 要更新的状态字段
   */
  public updateScraper(updates: Partial<ScraperState>): void {
    this.applyMiddleware('updateScraper', updates);
    appStore.getState().updateScraper(updates);
    this.syncToLegacyState();
  }

  /**
   * 重置 Scraper 状态
   */
  public resetScraper(): void {
    this.applyMiddleware('resetScraper', null);
    appStore.getState().resetScraper();
    this.syncToLegacyState();
  }

  // ==================== Promptlab 状态管理 ====================

  /**
   * 获取用户产品配置
   * @returns 用户产品配置或 null
   */
  public getUserProductProfile(): PromptLabState['userProductProfile'] | null {
    const state = appStore.getState();
    return state.promptlab.userProductProfile ?? null;
  }

  /**
   * 设置用户产品配置
   * @param profile - 用户产品配置
   */
  public setUserProductProfile(profile: PromptLabState['userProductProfile']): void {
    this.applyMiddleware('setUserProductProfile', profile);
    appStore.getState().setUserProductProfile(profile);
    this.syncToLegacyState();
  }

  /**
   * 获取当前 Prompt
   * @returns 当前 Prompt
   */
  public getCurrentPrompt(): string {
    const state = appStore.getState();
    return state.promptlab.currentPrompt ?? '';
  }

  /**
   * 设置当前 Prompt
   * @param prompt - Prompt 内容
   */
  public setCurrentPrompt(prompt: string): void {
    this.applyMiddleware('setCurrentPrompt', prompt);
    appStore.getState().setCurrentPrompt(prompt);
    this.syncToLegacyState();
  }

  /**
   * 获取 Prompt 历史记录
   * @returns Prompt 历史记录数组
   */
  public getPromptHistory(): PromptLabState['history'] {
    const state = appStore.getState();
    return state.promptlab.history ?? [];
  }

  /**
   * 添加 Prompt 历史记录
   * @param item - 历史记录项
   */
  public addPromptHistory(item: NonNullable<PromptLabState['history']>[0]): void {
    this.applyMiddleware('addPromptHistory', item);
    appStore.getState().addPromptHistory(item);
    this.syncToLegacyState();
  }

  /**
   * 获取选中的模型
   * @returns 选中的模型名称
   */
  public getSelectedModel(): string {
    const state = appStore.getState();
    return state.promptlab.selectedModel ?? '';
  }

  /**
   * 设置选中的模型
   * @param model - 模型名称
   */
  public setSelectedModel(model: string): void {
    this.applyMiddleware('setSelectedModel', model);
    appStore.getState().setSelectedModel(model);
    this.syncToLegacyState();
  }

  /**
   * 获取温度参数
   * @returns 温度参数值
   */
  public getTemperature(): number {
    const state = appStore.getState();
    return state.promptlab.temperature ?? 0.7;
  }

  /**
   * 设置温度参数
   * @param temperature - 温度参数值（0-2）
   */
  public setTemperature(temperature: number): void {
    this.applyMiddleware('setTemperature', temperature);
    appStore.getState().updatePromptLab({ temperature });
    this.syncToLegacyState();
  }

  /**
   * 获取最大 Token 数
   * @returns 最大 Token 数
   */
  public getMaxTokens(): number {
    const state = appStore.getState();
    return state.promptlab.maxTokens ?? 2000;
  }

  /**
   * 设置最大 Token 数
   * @param maxTokens - 最大 Token 数
   */
  public setMaxTokens(maxTokens: number): void {
    this.applyMiddleware('setMaxTokens', maxTokens);
    appStore.getState().updatePromptLab({ maxTokens });
    this.syncToLegacyState();
  }

  /**
   * 更新 PromptLab 状态（批量更新）
   * @param updates - 要更新的状态字段
   */
  public updatePromptLab(updates: Partial<PromptLabState>): void {
    this.applyMiddleware('updatePromptLab', updates);
    appStore.getState().updatePromptLab(updates);
    this.syncToLegacyState();
  }

  /**
   * 重置 PromptLab 状态
   */
  public resetPromptLab(): void {
    this.applyMiddleware('resetPromptLab', null);
    appStore.getState().resetPromptLab();
    this.syncToLegacyState();
  }

  // ==================== KeywordTracker 状态管理 ====================

  /**
   * 获取关键词列表
   * @returns 关键词数组
   */
  public getKeywords(): string[] {
    const state = appStore.getState();
    return state.keywordTracker.keywords || [];
  }

  /**
   * 设置关键词列表
   * @param keywords - 关键词数组
   */
  public setKeywords(keywords: string[]): void {
    this.applyMiddleware('setKeywords', keywords);
    appStore.getState().setKeywords(keywords);
    this.syncToLegacyState();
  }

  /**
   * 获取处理后的文案
   * @returns 处理后的文案
   */
  public getProcessedCopy(): string {
    const state = appStore.getState();
    return state.keywordTracker.processedCopy || '';
  }

  /**
   * 设置处理后的文案
   * @param copy - 处理后的文案
   */
  public setProcessedCopy(copy: string): void {
    this.applyMiddleware('setProcessedCopy', copy);
    appStore.getState().setProcessedCopy(copy);
    this.syncToLegacyState();
  }

  // ==================== UI 状态管理 ====================

  /**
   * 获取当前标签页
   * @returns 当前标签页名称
   */
  public getCurrentTab(): string {
    const state = appStore.getState();
    return state.ui.currentTab;
  }

  /**
   * 设置当前标签页
   * @param tab - 标签页名称
   */
  public setCurrentTab(tab: string): void {
    this.applyMiddleware('setCurrentTab', tab);
    appStore.getState().setCurrentTab(tab);
    this.syncToLegacyState();
  }

  /**
   * 获取主题
   * @returns 主题设置
   */
  public getTheme(): UIState['theme'] {
    const state = appStore.getState();
    return state.ui.theme;
  }

  /**
   * 设置主题
   * @param theme - 主题设置
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.applyMiddleware('setTheme', theme);
    appStore.getState().setTheme(theme);
    this.syncToLegacyState();
  }

  /**
   * 获取加载状态
   * @returns 是否正在加载
   */
  public getLoading(): boolean {
    const state = appStore.getState();
    return state.ui.loading ?? false;
  }

  /**
   * 设置加载状态
   * @param loading - 是否正在加载
   */
  public setLoading(loading: boolean): void {
    this.applyMiddleware('setLoading', loading);
    appStore.getState().setLoading(loading);
    this.syncToLegacyState();
  }

  // ==================== 通用方法 ====================

  /**
   * 订阅状态变化
   * @param selector - 状态选择器函数
   * @param callback - 状态变化回调
   * @returns 取消订阅函数
   * 
   * @example
   * ```typescript
   * const unsubscribe = stateManager.subscribe(
   *   (state) => state.analysis.analysisReport,
   *   (value) => console.log('Report changed:', value)
   * );
   * 
   * // 取消订阅
   * unsubscribe();
   * ```
   */
  public subscribe<T>(
    selector: (state: ReturnType<typeof appStore.getState>) => T,
    callback: (value: T) => void
  ): () => void {
    let previousValue = selector(appStore.getState());

    const unsubscribe = appStore.subscribe((state) => {
      const currentValue = selector(state);
      if (currentValue !== previousValue) {
        previousValue = currentValue;
        callback(currentValue);
      }
    });

    return unsubscribe;
  }

  /**
   * 获取完整状态快照
   * @returns 当前完整状态
   */
  public getSnapshot(): ReturnType<typeof appStore.getState> {
    return appStore.getState();
  }

  /**
   * 恢复状态快照
   * @param snapshot - 状态快照
   */
  public restoreSnapshot(snapshot: Partial<ReturnType<typeof appStore.getState>>): void {
    this.applyMiddleware('restoreSnapshot', snapshot);

    const state = appStore.getState();

    // 恢复各个模块的状态
    if (snapshot.ui) {
      state.updateUI(snapshot.ui);
    }
    if (snapshot.scraper) {
      state.updateScraper(snapshot.scraper);
    }
    if (snapshot.analysis) {
      state.updateAnalysis(snapshot.analysis);
    }
    if (snapshot.promptlab) {
      state.updatePromptLab(snapshot.promptlab);
    }
    if (snapshot.keywordTracker) {
      state.updateKeywordTracker(snapshot.keywordTracker);
    }

    this.syncToLegacyState();
  }

  /**
   * 创建状态快照（支持时间旅行）
   * @param description - 快照描述
   * @returns 快照 ID
   * 
   * @example
   * ```typescript
   * const snapshotId = stateManager.createSnapshot('Before analysis');
   * // ... 执行操作 ...
   * stateManager.restoreSnapshotById(snapshotId); // 恢复到之前的状态
   * ```
   */
  public createSnapshot(description?: string): string {
    if (!this.options.enableTimeTravel) {
      console.warn('[StateManager] Time travel is not enabled. Set enableTimeTravel: true in options.');
      return '';
    }

    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      description,
      state: this.deepClone(appStore.getState())
    };

    // 如果当前不在历史末尾，删除后面的快照
    if (this.currentSnapshotIndex < this.snapshotHistory.length - 1) {
      this.snapshotHistory = this.snapshotHistory.slice(0, this.currentSnapshotIndex + 1);
    }

    // 添加新快照
    this.snapshotHistory.push(snapshot);
    this.currentSnapshotIndex = this.snapshotHistory.length - 1;

    // 限制快照数量
    if (this.snapshotHistory.length > this.maxSnapshots) {
      this.snapshotHistory.shift();
      this.currentSnapshotIndex--;
    }

    // 持久化快照历史
    if (this.options.persist) {
      this.saveSnapshotHistory();
    }

    this.applyMiddleware('createSnapshot', snapshot);

    return snapshot.id;
  }

  /**
   * 根据 ID 恢复快照
   * @param snapshotId - 快照 ID
   * @returns 是否成功恢复
   */
  public restoreSnapshotById(snapshotId: string): boolean {
    const snapshot = this.snapshotHistory.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      console.warn(`[StateManager] Snapshot with ID "${snapshotId}" not found.`);
      return false;
    }

    this.restoreSnapshot(snapshot.state);
    this.currentSnapshotIndex = this.snapshotHistory.indexOf(snapshot);

    this.applyMiddleware('restoreSnapshotById', { snapshotId, snapshot });

    return true;
  }

  /**
   * 后退到上一个快照（时间旅行）
   * @returns 是否成功后退
   */
  public undo(): boolean {
    if (!this.options.enableTimeTravel) {
      console.warn('[StateManager] Time travel is not enabled.');
      return false;
    }

    if (this.currentSnapshotIndex <= 0) {
      console.warn('[StateManager] No previous snapshot to undo.');
      return false;
    }

    this.currentSnapshotIndex--;
    const snapshot = this.snapshotHistory[this.currentSnapshotIndex];
    
    if (!snapshot) {
      throw new Error('[StateManager] Snapshot not found at index ' + this.currentSnapshotIndex);
    }
    
    this.restoreSnapshot(snapshot.state);
    this.applyMiddleware('undo', snapshot);

    return true;
  }

  /**
   * 前进到下一个快照（时间旅行）
   * @returns 是否成功前进
   */
  public redo(): boolean {
    if (!this.options.enableTimeTravel) {
      console.warn('[StateManager] Time travel is not enabled.');
      return false;
    }

    if (this.currentSnapshotIndex >= this.snapshotHistory.length - 1) {
      console.warn('[StateManager] No next snapshot to redo.');
      return false;
    }

    this.currentSnapshotIndex++;
    const snapshot = this.snapshotHistory[this.currentSnapshotIndex];
    
    if (!snapshot) {
      throw new Error('[StateManager] Snapshot not found at index ' + this.currentSnapshotIndex);
    }
    
    this.restoreSnapshot(snapshot.state);
    this.applyMiddleware('redo', snapshot);

    return true;
  }

  /**
   * 获取所有快照列表
   * @returns 快照元数据列表（不包含完整状态数据）
   */
  public getSnapshotList(): Array<Omit<StateSnapshot, 'state'>> {
    return this.snapshotHistory.map(({ id, timestamp, description }) => ({
      id,
      timestamp,
      description
    }));
  }

  /**
   * 获取当前快照索引
   * @returns 当前快照索引（-1 表示没有快照）
   */
  public getCurrentSnapshotIndex(): number {
    return this.currentSnapshotIndex;
  }

  /**
   * 检查是否可以后退
   * @returns 是否可以后退
   */
  public canUndo(): boolean {
    return this.options.enableTimeTravel === true && this.currentSnapshotIndex > 0;
  }

  /**
   * 检查是否可以前进
   * @returns 是否可以前进
   */
  public canRedo(): boolean {
    return this.options.enableTimeTravel === true && 
           this.currentSnapshotIndex < this.snapshotHistory.length - 1;
  }

  /**
   * 清空快照历史
   */
  public clearSnapshotHistory(): void {
    this.snapshotHistory = [];
    this.currentSnapshotIndex = -1;

    if (this.options.persist) {
      this.saveSnapshotHistory();
    }

    this.applyMiddleware('clearSnapshotHistory', null);
  }

  /**
   * 删除指定快照
   * @param snapshotId - 快照 ID
   * @returns 是否成功删除
   */
  public deleteSnapshot(snapshotId: string): boolean {
    const index = this.snapshotHistory.findIndex(s => s.id === snapshotId);
    
    if (index === -1) {
      console.warn(`[StateManager] Snapshot with ID "${snapshotId}" not found.`);
      return false;
    }

    this.snapshotHistory.splice(index, 1);

    // 调整当前索引
    if (this.currentSnapshotIndex >= index) {
      this.currentSnapshotIndex = Math.max(-1, this.currentSnapshotIndex - 1);
    }

    if (this.options.persist) {
      this.saveSnapshotHistory();
    }

    this.applyMiddleware('deleteSnapshot', snapshotId);

    return true;
  }

  /**
   * 导出快照到 JSON
   * @param snapshotId - 快照 ID（可选，默认导出当前状态）
   * @returns JSON 字符串
   */
  public exportSnapshot(snapshotId?: string): string {
    let snapshot: StateSnapshot;

    if (snapshotId) {
      const found = this.snapshotHistory.find(s => s.id === snapshotId);
      if (!found) {
        throw new Error(`Snapshot with ID "${snapshotId}" not found.`);
      }
      snapshot = found;
    } else {
      // 导出当前状态
      snapshot = {
        id: this.generateSnapshotId(),
        timestamp: Date.now(),
        description: 'Current state export',
        state: this.deepClone(appStore.getState())
      };
    }

    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * 从 JSON 导入快照
   * @param json - JSON 字符串
   * @param restore - 是否立即恢复该快照
   * @returns 导入的快照 ID
   */
  public importSnapshot(json: string, restore: boolean = false): string {
    try {
      const snapshot: StateSnapshot = JSON.parse(json);

      // 验证快照格式
      if (!snapshot.id || !snapshot.timestamp || !snapshot.state) {
        throw new Error('Invalid snapshot format');
      }

      // 添加到历史
      if (this.options.enableTimeTravel) {
        this.snapshotHistory.push(snapshot);
        
        // 限制快照数量
        if (this.snapshotHistory.length > this.maxSnapshots) {
          this.snapshotHistory.shift();
        }

        if (this.options.persist) {
          this.saveSnapshotHistory();
        }
      }

      // 立即恢复
      if (restore) {
        this.restoreSnapshot(snapshot.state);
        this.currentSnapshotIndex = this.snapshotHistory.length - 1;
      }

      this.applyMiddleware('importSnapshot', snapshot);

      return snapshot.id;
    } catch (error) {
      console.error('[StateManager] Failed to import snapshot:', error);
      throw new Error('Failed to import snapshot: ' + (error as Error).message);
    }
  }

  /**
   * 清空所有状态
   */
  public clear(): void {
    this.applyMiddleware('clear', null);

    const state = appStore.getState();
    state.resetScraper();
    state.resetAnalysis();
    state.resetPromptLab();
    state.resetKeywordTracker();

    this.syncToLegacyState();

    if (this.options.persist && this.options.persistKey) {
      localStorage.removeItem(this.options.persistKey);
    }
  }

  /**
   * 添加中间件
   * @param middleware - 中间件函数
   */
  public use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * 移除中间件
   * @param middleware - 要移除的中间件函数
   */
  public removeMiddleware(middleware: Middleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * 应用所有中间件
   * @param action - 操作名称
   * @param payload - 操作数据
   */
  private applyMiddleware(action: string, payload: any): void {
    const state = appStore.getState();
    
    for (const middleware of this.middleware) {
      try {
        middleware(state, action, payload);
      } catch (error) {
        console.error(`[StateManager] Middleware error in action "${action}":`, error);
      }
    }
  }

  /**
   * 同步到旧的 state 对象（兼容性）
   * 
   * 注意：这是过渡期的兼容方法
   * 在完全迁移到新架构后应该移除
   * 
   * 工作原理：
   * 1. 检查是否存在全局 state 对象（通过 StateMigration 创建的 Proxy）
   * 2. 设置同步标志，防止 Proxy setter 触发 Zustand action（避免循环）
   * 3. 将 Zustand store 的最新状态同步到 state 对象
   * 4. 清除同步标志
   */
  private syncToLegacyState(): void {
    // 检查是否存在全局 state 对象
    if (typeof window !== 'undefined' && (window as any).state) {
      const currentState = appStore.getState();
      const legacyState = (window as any).state;

      // 导入 stateMigration 以设置同步标志
      let stateMigration: any = null;
      try {
        // 动态导入以避免循环依赖
        const migrationModule = require('../state/StateMigration');
        stateMigration = migrationModule.stateMigration;
      } catch (error) {
        // 如果无法导入，继续执行但不设置标志
        if (import.meta.env.DEV) {
          console.debug('[StateManager] 无法导入 StateMigration:', error);
        }
      }

      try {
        // 设置同步标志，防止循环更新
        if (stateMigration) {
          stateMigration.setSyncInProgress(true);
        }
        // 同步 analysis 状态
        // 注意：由于 legacyState 是 Proxy，直接赋值会触发 setter
        // 这里我们需要确保不会造成循环更新
        if (legacyState.analysis) {
          // 使用 Object.defineProperty 绕过 Proxy 的 setter，直接更新值
          const analysisProxy = legacyState.analysis;
          
          // 批量更新所有 analysis 字段
          const analysisFields = {
            analysisReport: currentState.analysis.analysisReport,
            selectedAsins: currentState.analysis.selectedAsins,
            translatedReport: currentState.analysis.translatedReport,
            reportData: currentState.analysis.reportData,
            expandedAsin: currentState.analysis.expandedAsin,
            isEditing: currentState.analysis.isEditing,
            showTranslation: currentState.analysis.showTranslation,
            editHistory: currentState.analysis.editHistory,
            lastTranslationModel: currentState.analysis.lastTranslationModel,
            isAnalyzing: currentState.analysis.isAnalyzing,
            filters: currentState.analysis.filters,
            pendingReport: currentState.analysis.pendingReport
          };

          // 直接更新 Proxy 背后的实际对象
          Object.keys(analysisFields).forEach(key => {
            try {
              // 尝试直接赋值（会被 Proxy 拦截，但我们已经在 StateMigration 中处理了循环）
              (analysisProxy as any)[key] = (analysisFields as any)[key];
            } catch (error) {
              // 忽略赋值错误（可能是只读属性）
              if (import.meta.env.DEV) {
                console.debug(`[StateManager] 无法同步 analysis.${key}:`, error);
              }
            }
          });
        }

        // 同步 scraper 状态
        if (legacyState.scraper) {
          const scraperProxy = legacyState.scraper;
          
          const scraperFields = {
            scrapedData: currentState.scraper.scrapedData,
            isScraping: currentState.scraper.isScraping,
            status: currentState.scraper.status,
            selectedSite: currentState.scraper.selectedSite,
            currentHistoryId: currentState.scraper.currentHistoryId,
            inputAsins: currentState.scraper.inputAsins,
            progress: currentState.scraper.progress,
            error: currentState.scraper.error,
            expandedAsin: currentState.scraper.expandedAsin,
            currentDataTab: currentState.scraper.currentDataTab
          };

          Object.keys(scraperFields).forEach(key => {
            try {
              (scraperProxy as any)[key] = (scraperFields as any)[key];
            } catch (error) {
              if (import.meta.env.DEV) {
                console.debug(`[StateManager] 无法同步 scraper.${key}:`, error);
              }
            }
          });
        }

        // 同步 promptlab 状态
        if (legacyState.promptlab) {
          const promptlabProxy = legacyState.promptlab;
          
          const promptlabFields = {
            userProductProfile: currentState.promptlab.userProductProfile,
            currentPrompt: currentState.promptlab.currentPrompt,
            history: currentState.promptlab.history,
            selectedModel: currentState.promptlab.selectedModel,
            temperature: currentState.promptlab.temperature,
            maxTokens: currentState.promptlab.maxTokens
          };

          Object.keys(promptlabFields).forEach(key => {
            try {
              (promptlabProxy as any)[key] = (promptlabFields as any)[key];
            } catch (error) {
              if (import.meta.env.DEV) {
                console.debug(`[StateManager] 无法同步 promptlab.${key}:`, error);
              }
            }
          });
        }

        // 同步 keywordTracker 状态
        if (legacyState.keywordTracker) {
          const keywordTrackerProxy = legacyState.keywordTracker;
          
          const keywordTrackerFields = {
            keywords: currentState.keywordTracker.keywords,
            processedCopy: currentState.keywordTracker.processedCopy,
            formattedCopy: currentState.keywordTracker.formattedCopy,
            matchedKeywords: currentState.keywordTracker.matchedKeywords,
            unmatchedKeywords: currentState.keywordTracker.unmatchedKeywords,
            wordFrequency: currentState.keywordTracker.wordFrequency,
            paragraphs: currentState.keywordTracker.paragraphs,
            keywordLocationIndex: currentState.keywordTracker.keywordLocationIndex,
            isWindowMinimized: currentState.keywordTracker.isWindowMinimized,
            trackingData: currentState.keywordTracker.trackingData,
            isTracking: currentState.keywordTracker.isTracking,
            keywordsInputText: currentState.keywordTracker.keywordsInputText,
            copyInputText: currentState.keywordTracker.copyInputText,
            llmAnalysisResult: currentState.keywordTracker.llmAnalysisResult,
            showTranslation: currentState.keywordTracker.showTranslation,
            translationMode: currentState.keywordTracker.translationMode,
            settings: currentState.keywordTracker.settings
          };

          Object.keys(keywordTrackerFields).forEach(key => {
            try {
              (keywordTrackerProxy as any)[key] = (keywordTrackerFields as any)[key];
            } catch (error) {
              if (import.meta.env.DEV) {
                console.debug(`[StateManager] 无法同步 keywordTracker.${key}:`, error);
              }
            }
          });
        }

        // 同步 UI 状态
        if (legacyState.ui) {
          const uiProxy = legacyState.ui;
          
          const uiFields = {
            currentTab: currentState.ui.currentTab,
            theme: currentState.ui.theme,
            loading: currentState.ui.loading,
            sidebarCollapsed: currentState.ui.sidebarCollapsed,
            currentDataTab: currentState.ui.currentDataTab,
            currentReportTab: currentState.ui.currentReportTab
          };

          Object.keys(uiFields).forEach(key => {
            try {
              (uiProxy as any)[key] = (uiFields as any)[key];
            } catch (error) {
              if (import.meta.env.DEV) {
                console.debug(`[StateManager] 无法同步 ui.${key}:`, error);
              }
            }
          });
        }
      } catch (error) {
        // 捕获所有同步错误，避免影响主流程
        if (import.meta.env.DEV) {
          console.error('[StateManager] 同步到旧 state 对象时出错:', error);
        }
      } finally {
        // 清除同步标志
        if (stateMigration) {
          stateMigration.setSyncInProgress(false);
        }
      }
    }
  }

  /**
   * 生成快照 ID
   * @returns 唯一的快照 ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 深度克隆对象
   * @param obj - 要克隆的对象
   * @returns 克隆后的对象
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * 保存快照历史到 localStorage
   */
  private saveSnapshotHistory(): void {
    if (typeof window === 'undefined' || !this.options.persistKey) {
      return;
    }

    try {
      const historyKey = `${this.options.persistKey}_history`;
      const data = {
        snapshots: this.snapshotHistory,
        currentIndex: this.currentSnapshotIndex
      };
      localStorage.setItem(historyKey, JSON.stringify(data));
    } catch (error) {
      console.error('[StateManager] Failed to save snapshot history:', error);
    }
  }

  /**
   * 从 localStorage 加载快照历史
   */
  private loadSnapshotHistory(): void {
    if (typeof window === 'undefined' || !this.options.persistKey) {
      return;
    }

    try {
      const historyKey = `${this.options.persistKey}_history`;
      const stored = localStorage.getItem(historyKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        this.snapshotHistory = data.snapshots || [];
        this.currentSnapshotIndex = data.currentIndex ?? -1;
      }
    } catch (error) {
      console.error('[StateManager] Failed to load snapshot history:', error);
      this.snapshotHistory = [];
      this.currentSnapshotIndex = -1;
    }
  }
}

// ==================== 导出 ====================

/**
 * 导出单例实例（便于直接使用）
 */
export const stateManager = StateManager.getInstance();

/**
 * 导出中间件
 */
export * from './middleware';

/**
 * 默认导出
 */
export default StateManager;
