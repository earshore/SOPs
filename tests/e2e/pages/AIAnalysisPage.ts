// tests/e2e/pages/AIAnalysisPage.ts
// ================================================================
// 📄 AI 分析页面对象
// 提供 AI 智能分析模块的页面操作方法
// ================================================================

import { type Download, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  E2E_AI_ANALYSIS_ASINS,
  E2E_AI_ANALYSIS_REPORT,
  E2E_AI_ANALYSIS_SCRAPED_DATA,
} from '../ai-analysis-fixtures';

const TARGET_ID_ALIASES: Record<string, string> = {
  '关键词分析': 'title-keywords',
  '标题核心词根': 'title-keywords',
  '卖点分析': 'selling-points',
  '卖点结构拆解': 'selling-points',
};

function installDeterministicAnalysisMockInPage({
  report,
}: {
  report: typeof E2E_AI_ANALYSIS_REPORT;
}): void {
  const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element;
  const alpine = (window as Window & {
    Alpine?: { $data?: (element: Element) => Record<string, any> };
  }).Alpine;
  const component = alpine?.$data?.(element);
  const appStore = (window as Window & { appStore?: { getState: () => any } }).appStore;
  const state = appStore?.getState?.();

  if (!component || !state) {
    throw new Error('AI Analysis component and appStore are required for deterministic mock');
  }

  component.runAnalysis = async function runDeterministicAnalysis(this: Record<string, any>) {
    if (!hasSelection(this.selectedAsins) || !hasSelection(this.selectedTargets)) return;

    this.analysisReport = null;
    this.hasReport = false;
    state.setAnalysisReport(null);
    updateAnalysisProgress(this, state, true, 5, 'E2E fixture analysis started');
    refreshReportView(this);

    await new Promise(resolve => window.setTimeout(resolve, 250));

    const deterministicReport = buildDeterministicReport(this, report);
    this.analysisReport = deterministicReport;
    this.hasReport = true;
    state.setAnalysisReport(deterministicReport);
    updateAnalysisProgress(this, state, true, 100, '分析完成');
    refreshReportView(this);

    updateAnalysisProgress(this, state, false, 100, '分析完成');
    (window as Window & {
      showToast?: (message: string, options?: { type?: string }) => void;
    }).showToast?.('分析完成！', { type: 'success' });
  };

  function hasSelection(value: unknown): value is unknown[] {
    return Array.isArray(value) && value.length > 0;
  }

  function updateAnalysisProgress(
    target: Record<string, any>,
    storeState: Record<string, any>,
    isAnalyzing: boolean,
    progress: number,
    currentStep: string
  ): void {
    target.isAnalyzing = isAnalyzing;
    target.progress = progress;
    target.currentStep = currentStep;
    storeState.updateAnalysis({ isAnalyzing, progress, currentStep });
  }

  function refreshReportView(target: Record<string, any>): void {
    if (typeof target.refreshReportView === 'function') {
      target.refreshReportView();
    }
  }

  function buildDeterministicReport(target: Record<string, any>, baseReport: typeof report) {
    return {
      ...baseReport,
      _metadata: {
        ...baseReport._metadata,
        targetIds: [...target.selectedTargets],
        sourceAsins: [...target.selectedAsins],
        analyzedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * 分析目标类型
 */
export type AnalysisSource = 'Listings' | 'Reviews';

/**
 * 分析配置接口
 */
export interface AnalysisConfig {
  asins?: string[];
  targets?: string[];
  useRealData?: boolean;
}

/**
 * 分析结果统计接口
 */
export interface AnalysisStats {
  targetId: string;
  title: string;
  source: AnalysisSource;
  stats: Array<{ label: string; value: string }>;
  highlights: Array<{ text: string; type: string }>;
}

/**
 * AI 分析页面对象
 * 
 * 提供 AI 智能分析模块的所有交互方法，包括：
 * - ASIN 选择和管理
 * - 分析目标选择
 * - 分析执行和进度监控
 * - 结果查看和导出
 * 
 * @example
 * ```typescript
 * const aiAnalysis = new AIAnalysisPage(page);
 * await aiAnalysis.navigate();
 * await aiAnalysis.selectAsins(['B08N5WRWNW']);
 * await aiAnalysis.selectTargets(['keyword_analysis', 'sentiment_analysis']);
 * await aiAnalysis.startAnalysis();
 * await aiAnalysis.waitForAnalysisComplete();
 * const results = await aiAnalysis.getAnalysisResults();
 * ```
 */
export class AIAnalysisPage extends BasePage {
  private useDeterministicFixture = false;

  // ========== 选择器定义 ==========
  
  private readonly selectors = {
    // 主容器
    mainContainer: '.ai-analysis-wrapper',
    welcomeBanner: '.ai-analysis-wrapper .wb-container',
    
    // 数据源横幅
    dataSourceBanner: '[x-show="showDataSourceBanner"]',
    dataSourceInfo: '.from-indigo-50',
    
    // ASIN 选择区域
    asinCard: '.lg\\:col-span-4',
    asinSelectAll: 'button:has-text("全选")',
    asinClearAll: 'button:has-text("清空")',
    asinCheckbox: (asin: string) => `input[type="checkbox"][value="${asin}"]`,
    asinLabel: (asin: string) => `label:has(input[value="${asin}"])`,
    selectedAsinCount: '[data-asin-selected-count]',
    availableAsinsList: '.space-y-2.max-h-48',
    noDataWarning: '.bg-amber-50.border-amber-200',
    navigateToScraperButton: 'a:has-text("前往数据采集")',

    // 统一选择区（折叠/展开）
    selectionPanelToggle: '[data-selection-panel-toggle]',
    selectionPanelContent: '[data-selection-panel-content]',
    
    // 分析目标选择区域
    targetCard: '.lg\\:col-span-8',
    targetSelectAll: 'button:has-text("全选")',
    targetClearAll: 'button:has-text("清空")',
    listingsSection: '.grid.grid-cols-1.md\\:grid-cols-2',
    reviewsSection: '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3',
    targetButton: (targetId: string) => `button[data-target-id="${targetId}"]`,
    selectedTargetCount: '[data-targets-selected-count]',
    targetSummary: '.flex.-space-x-2',
    
    // 提示词预览面板
    promptPanelToggle: 'button:has-text("AI 提示词模板")',
    promptPanel: '.space-y-3.animate-fade-in-up',
    promptItem: (index: number) => `.space-y-3 > div:nth-child(${index + 1})`,
    promptCopyButton: 'button:has-text("复制")',
    totalTokenCount: '.text-emerald-700:has-text("tokens")',
    
    // 分析按钮和进度
    analysisSection: '.mb-10.animate-fade-in-up',
    startAnalysisButton: 'button:has-text("开始分析")',
    analysisProgress: '.relative.w-full.h-3',
    progressBar: '.absolute.inset-0.bg-white\\/30',
    progressText: '.text-white\\/70',
    currentStep: '[x-text="currentStep"]',
    
    // 结果区域
    resultsContainer: '#analysis-results-container',
    resultCard: '.analysis-result-card',
    resultTitle: '.result-title',
    resultStats: '.result-stats',
    resultHighlights: '.result-highlights',
    resultDetails: '.result-details',
    
    // 导出和操作
    exportButton: 'button:has-text("导出报告")',
    exportJsonButton: 'button:has-text("导出 JSON")',
    exportMarkdownButton: 'button:has-text("导出 Markdown")',
    clearResultsButton: 'button:has-text("清空结果")',
    
    // Toast 和通知
    toast: '.toast',
    errorMessage: '.text-red-600',
    successMessage: '.text-emerald-600'
  };

  constructor(page: Page) {
    super(page, { baseUrl: 'http://localhost:5173' });
  }

  useE2EFixture(): this {
    this.useDeterministicFixture = true;
    return this;
  }

  private async getAiAnalysisStateValue<T>(property: string, fallback: T): Promise<T> {
    return await this.page.evaluate(
      ({ property, fallbackValue }) => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        const value = data?.[property];
        return (value ?? fallbackValue) as T;
      },
      { property, fallbackValue: fallback }
    );
  }

  private async getAiAnalysisSummary(): Promise<{
    hasReportWithResults: boolean;
    reportResults: AnalysisStats[];
    listingsCount: number;
    reviewsCount: number;
  }> {
    return await this.page.evaluate(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const data = element && alpine?.$data ? alpine.$data(element) : null;
      const reportResults = Array.isArray(data?.reportResults) ? data.reportResults : [];
      const listings = Array.isArray(data?.reportListingsResults) ? data.reportListingsResults : [];
      const reviews = Array.isArray(data?.reportReviewsResults) ? data.reportReviewsResults : [];

      return {
        hasReportWithResults: Boolean(data?.hasReportWithResults),
        reportResults: reportResults as AnalysisStats[],
        listingsCount: listings.length,
        reviewsCount: reviews.length,
      };
    });
  }

  private async callAiAnalysisAction(action: string, args: unknown[] = []): Promise<void> {
    await this.page.evaluate(
      ({ action, args }) => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        const candidate = data?.[action];
        if (typeof candidate !== 'function') {
          throw new Error(`AI Analysis action not found: ${action}`);
        }
        candidate.apply(data, args);
      },
      { action, args }
    );
  }

  private async setSelectedAsins(asins: string[]): Promise<void> {
    await this.page.evaluate(selectedAsins => {
      const appStore = (window as Window & { appStore?: { getState: () => any } }).appStore;
      const state = appStore?.getState?.();
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const component = element && alpine?.$data ? alpine.$data(element) : null;

      state?.setSelectedAsins?.([...selectedAsins]);
      if (component) {
        component.selectedAsins = [...selectedAsins];
        if (typeof component.refreshReportView === 'function') {
          component.refreshReportView();
        }
      }
    }, asins);

    await this.page.waitForFunction(
      expected => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        return Array.isArray(data?.selectedAsins) && data.selectedAsins.length === expected;
      },
      asins.length
    );
  }

  private async setSelectedTargets(targetIds: string[]): Promise<void> {
    await this.page.evaluate(selectedTargets => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const component = element && alpine?.$data ? alpine.$data(element) : null;

      if (component) {
        component.selectedTargets = [...selectedTargets];
        if (typeof component.refreshReportView === 'function') {
          component.refreshReportView();
        }
      }
    }, targetIds);

    await this.page.waitForFunction(
      expected => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        return Array.isArray(data?.selectedTargets) && data.selectedTargets.length === expected;
      },
      targetIds.length
    );
  }

  async seedScraperFixture(): Promise<void> {
    await this.page.evaluate(
      ({ scrapedData, selectedAsins }) => {
        const appStore = (window as Window & { appStore?: { getState: () => any } }).appStore;
        const state = appStore?.getState?.();
        if (!state) {
          throw new Error('appStore is required for AI Analysis E2E fixture setup');
        }

        state.setScrapedData(scrapedData);
        state.setSelectedSite(scrapedData.metadata?.marketplace || 'DE');
        state.setCurrentHistoryId('e2e-ai-analysis-history');
        state.setSelectedAsins([...selectedAsins]);
        state.setAnalysisReport(null);

        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const component = element && alpine?.$data ? alpine.$data(element) : null;
        if (component) {
          component.selectedAsins = [...selectedAsins];
          component.analysisReport = null;
          component.hasReport = false;
          component.dataSource = 'scraper';
          component.showSelectionPanel = true;
          if (typeof component.refreshReportView === 'function') {
            component.refreshReportView();
          }
        }
      },
      {
        scrapedData: E2E_AI_ANALYSIS_SCRAPED_DATA,
        selectedAsins: E2E_AI_ANALYSIS_ASINS,
      }
    );

    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const data = element && alpine?.$data ? alpine.$data(element) : null;
      return Array.isArray(data?.availableAsins) && data.availableAsins.length > 0;
    });
  }

  async clearScraperFixture(): Promise<void> {
    await this.page.evaluate(() => {
      const appStore = (window as Window & { appStore?: { getState: () => any } }).appStore;
      const state = appStore?.getState?.();
      if (!state) {
        throw new Error('appStore is required for AI Analysis E2E fixture cleanup');
      }

      state.setScrapedData(null);
      state.setSelectedAsins([]);
      state.setAnalysisReport(null);
      state.setCurrentHistoryId(null);

      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const component = element && alpine?.$data ? alpine.$data(element) : null;
      if (component) {
        component.selectedAsins = [];
        component.analysisReport = null;
        component.hasReport = false;
        component.showSelectionPanel = true;
        if (typeof component.refreshReportView === 'function') {
          component.refreshReportView();
        }
      }
    });
  }

  async installDeterministicAnalysisMock(): Promise<void> {
    await this.page.evaluate(
      installDeterministicAnalysisMockInPage,
      { report: E2E_AI_ANALYSIS_REPORT }
    );
  }

  // ========== 导航方法 ==========

  /**
   * 导航到 AI 分析页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/#/app-center/master_analysis/ai-analysis');
    await this.waitForPageReady();
    if (this.useDeterministicFixture) {
      await this.seedScraperFixture();
      await this.installDeterministicAnalysisMock();
    }
  }

  /**
   * 等待页面就绪
   */
  async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.mainContainer);
    await this.waitForElement(this.selectors.selectionPanelToggle);
    await this.waitForLoadingToFinish();
  }

  // ========== 折叠区展开方法 ==========

  async expandSelectionPanelIfNeeded(): Promise<void> {
    const isExpanded = await this.isVisible(this.selectors.selectionPanelContent, { timeout: 200 });
    if (isExpanded) return;
    await this.click(this.selectors.selectionPanelToggle);
    await this.wait(200);
  }

  // ========== ASIN 选择方法 ==========

  /**
   * 获取可用的 ASIN 列表
   */
  async getAvailableAsins(): Promise<string[]> {
    return await this.getAiAnalysisStateValue<string[]>('availableAsins', []);
  }

  /**
   * 获取可用的 ASIN 数量（测试兼容别名）
   */
  async getAvailableAsinsCount(): Promise<number> {
    const asins = await this.getAvailableAsins();
    return asins.length;
  }

  /**
   * 选择单个 ASIN
   * 
   * @param asin - ASIN 标识符
   */
  async selectAsin(asin: string): Promise<void> {
    const selectedAsins = await this.getSelectedAsins();
    if (!selectedAsins.includes(asin)) {
      await this.setSelectedAsins([...selectedAsins, asin]);
    }
  }

  /**
   * 取消选择单个 ASIN
   * 
   * @param asin - ASIN 标识符
   */
  async unselectAsin(asin: string): Promise<void> {
    const selectedAsins = await this.getSelectedAsins();
    if (selectedAsins.includes(asin)) {
      await this.setSelectedAsins(selectedAsins.filter(selectedAsin => selectedAsin !== asin));
    }
  }

  /**
   * 选择多个 ASIN
   * 
   * @param asins - ASIN 列表
   */
  async selectAsins(asins: string[]): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    for (const asin of asins) {
      await this.selectAsin(asin);
    }
  }

  /**
   * 全选 ASIN
   */
  async selectAllAsins(): Promise<void> {
    await this.setSelectedAsins(await this.getAvailableAsins());
  }

  /**
   * 清空 ASIN 选择
   */
  async clearAllAsins(): Promise<void> {
    await this.setSelectedAsins([]);
  }

  /**
   * 获取已选择的 ASIN 数量
   */
  async getSelectedAsinCount(): Promise<number> {
    const selectedAsins = await this.getSelectedAsins();
    return selectedAsins.length;
  }

  /**
   * 获取已选择的 ASIN 数量（测试兼容别名）
   */
  async getSelectedAsinsCount(): Promise<number> {
    return this.getSelectedAsinCount();
  }

  /**
   * 获取已选择的 ASIN 列表
   */
  async getSelectedAsins(): Promise<string[]> {
    return await this.getAiAnalysisStateValue<string[]>('selectedAsins', []);
  }

  /**
   * 检查是否有可用数据
   */
  async hasAvailableData(): Promise<boolean> {
    const availableAsins = await this.getAiAnalysisStateValue<string[]>('availableAsins', []);
    return availableAsins.length > 0;
  }

  /**
   * 检查 ASIN 是否被选中
   * 
   * @param asin - ASIN 标识符
   */
  async isAsinSelected(asin: string): Promise<boolean> {
    const selectedAsins = await this.getSelectedAsins();
    return selectedAsins.includes(asin);
  }

  // ========== 分析目标选择方法 ==========

  /**
   * 选择分析目标
   * 
   * @param targetId - 目标 ID
   */
  async selectTarget(targetId: string): Promise<void> {
    const normalizedTargetId = TARGET_ID_ALIASES[targetId] || targetId;
    const selectedTargets = await this.getAiAnalysisStateValue<string[]>('selectedTargets', []);

    if (!selectedTargets.includes(normalizedTargetId)) {
      await this.setSelectedTargets([...selectedTargets, normalizedTargetId]);
      return;
    }
  }

  /**
   * 选择多个分析目标
   * 
   * @param targetIds - 目标 ID 列表
   */
  async selectTargets(targetIds: string[]): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    for (const targetId of targetIds) {
      await this.selectTarget(targetId);
    }
  }

  /**
   * 全选分析目标
   */
  async selectAllTargets(): Promise<void> {
    const targets = await this.getAiAnalysisStateValue<Array<{ id: string }>>('analysisTargets', []);
    await this.setSelectedTargets(targets.map(target => target.id));
  }

  /**
   * 清空分析目标选择
   */
  async clearAllTargets(): Promise<void> {
    await this.setSelectedTargets([]);
  }

  /**
   * 获取已选择的目标数量
   */
  async getSelectedTargetCount(): Promise<number> {
    const selectedTargets = await this.getAiAnalysisStateValue<string[]>('selectedTargets', []);
    return selectedTargets.length;
  }

  /**
   * 获取可用的分析目标数量（测试兼容别名）
   */
  async getAvailableTargetsCount(): Promise<number> {
    const analysisTargets = await this.getAiAnalysisStateValue<unknown[]>('analysisTargets', []);
    return analysisTargets.length;
  }

  /**
   * 获取已选择的分析目标数量（测试兼容别名）
   */
  async getSelectedTargetsCount(): Promise<number> {
    return this.getSelectedTargetCount();
  }

  /**
   * 选择所有 Listings 分析目标
   */
  async selectAllListingsTargets(): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    const buttons = this.page.locator(this.selectors.listingsSection).locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click();
    }
  }

  /**
   * 选择所有 Reviews 分析目标
   */
  async selectAllReviewsTargets(): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    const buttons = this.page.locator(this.selectors.reviewsSection).locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click();
    }
  }

  // ========== 提示词预览方法 ==========

  /**
   * 切换提示词面板显示
   */
  async togglePromptPanel(): Promise<void> {
    await this.callAiAnalysisAction('togglePromptPanel');
    await this.wait(100);
  }

  /**
   * 显示提示词面板
   */
  async showPromptPanel(): Promise<void> {
    const isVisible = await this.isVisible(this.selectors.promptPanel);
    if (!isVisible) {
      await this.togglePromptPanel();
    }
  }

  /**
   * 隐藏提示词面板
   */
  async hidePromptPanel(): Promise<void> {
    const isVisible = await this.isVisible(this.selectors.promptPanel);
    if (isVisible) {
      await this.togglePromptPanel();
    }
  }

  /**
   * 展开特定的提示词项
   * 
   * @param index - 提示词项索引
   */
  async expandPromptItem(index: number): Promise<void> {
    const item = this.page.locator(this.selectors.promptItem(index));
    const button = item.locator('button').first();
    await button.click();
    await this.wait(300); // 等待展开动画
  }

  /**
   * 复制提示词
   * 
   * @param index - 提示词项索引
   */
  async copyPrompt(index: number): Promise<void> {
    await this.expandPromptItem(index);
    const item = this.page.locator(this.selectors.promptItem(index));
    const copyButton = item.locator(this.selectors.promptCopyButton);
    await copyButton.click();
    await this.wait(500); // 等待复制完成
  }

  /**
   * 获取总 Token 数量
   */
  async getTotalTokenCount(): Promise<number> {
    const text = await this.getText(this.selectors.totalTokenCount);
    const match = text.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
  }

  // ========== 分析执行方法 ==========

  /**
   * 开始分析
   */
  async startAnalysis(): Promise<void> {
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
      const alpine = (window as Window & {
        Alpine?: { $data?: (element: Element) => Record<string, unknown> };
      }).Alpine;
      const data = element && alpine?.$data ? alpine.$data(element) : null;
      return Boolean(data?.canRunAnalysis);
    });

    const button = this.page.getByRole('button', { name: /开始分析|重新分析/ });
    if (this.useDeterministicFixture && !(await button.isEnabled())) {
      await this.callAiAnalysisAction('runAnalysis');
    } else {
      await button.click();
    }

    await this.page.waitForFunction(
      () => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        return data?.isAnalyzing === true || Number(data?.progress || 0) >= 100;
      },
      undefined,
      { timeout: 1000 }
    );
  }

  /**
   * 等待分析完成
   * 
   * @param timeout - 超时时间（毫秒），默认 5 分钟
   */
  async waitForAnalysisComplete(timeout: number = 300000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as Element | null;
        const alpine = (window as Window & {
          Alpine?: { $data?: (element: Element) => Record<string, unknown> };
        }).Alpine;
        const data = element && alpine?.$data ? alpine.$data(element) : null;
        return Number(data?.progress || 0) >= 100 && data?.isAnalyzing === false;
      },
      undefined,
      { timeout }
    );
    
    // 等待结果渲染
    await this.wait(1000);
  }

  /**
   * 获取当前分析进度
   */
  async getAnalysisProgress(): Promise<number> {
    return await this.getAiAnalysisStateValue('progress', 0);
  }

  /**
   * 获取当前分析步骤
   */
  async getCurrentStep(): Promise<string> {
    return await this.getText(this.selectors.currentStep);
  }

  /**
   * 检查是否正在分析
   */
  async isAnalyzing(): Promise<boolean> {
    return await this.getAiAnalysisStateValue('isAnalyzing', false);
  }

  /**
   * 检查分析按钮是否可用
   */
  async isAnalysisButtonEnabled(): Promise<boolean> {
    return await this.page.getByRole('button', { name: /开始分析|重新分析/ }).isEnabled();
  }

  async isStartAnalysisButtonEnabled(): Promise<boolean> {
    return await this.isAnalysisButtonEnabled();
  }

  async isPromptPanelExpanded(): Promise<boolean> {
    return await this.getAiAnalysisStateValue('showPromptPanel', false);
  }

  async getPromptCount(): Promise<number> {
    const selectedTargets = await this.getAiAnalysisStateValue<string[]>('selectedTargets', []);
    return selectedTargets.length;
  }

  async toggleJsonViewer(): Promise<void> {
    await this.page.getByRole('button', { name: /AI 分析报告 JSON/ }).click();
  }

  async isJsonViewerExpanded(): Promise<boolean> {
    return await this.page.locator('code').filter({ hasText: /analysisReport|metadata/ }).first().isVisible();
  }

  async getJsonContent(): Promise<string> {
    const code = this.page.locator('code').filter({ hasText: /analysisReport|metadata/ }).first();
    return (await code.textContent()) || '';
  }

  async copyJson(): Promise<void> {
    await this.page.evaluate(() => {
      document.querySelectorAll('.toast').forEach(toast => toast.remove());
    });
    await this.page.locator('button[title="复制 JSON 格式报告"]').click();
  }

  async downloadJson(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: /下载/ }).click();
    return await downloadPromise;
  }

  // ========== 结果查看方法 ==========

  /**
   * 检查是否有分析结果
   */
  async hasAnalysisResults(): Promise<boolean> {
    const summary = await this.getAiAnalysisSummary();
    return summary.hasReportWithResults;
  }

  async hasResults(): Promise<boolean> {
    return await this.hasAnalysisResults();
  }

  /**
   * 获取结果卡片数量
   */
  async getResultCardCount(): Promise<number> {
    const summary = await this.getAiAnalysisSummary();
    return summary.reportResults.length;
  }

  async getResultCardsCount(): Promise<number> {
    return await this.getResultCardCount();
  }

  /**
   * 获取特定结果卡片的标题
   * 
   * @param index - 卡片索引
   */
  async getResultTitle(index: number): Promise<string> {
    const summary = await this.getAiAnalysisSummary();
    return summary.reportResults[index]?.title || '';
  }

  async getResultCardTitle(index: number): Promise<string> {
    return await this.getResultTitle(index);
  }

  /**
   * 获取分析结果摘要
   */
  async getAnalysisResultsSummary(): Promise<string[]> {
    const summary = await this.getAiAnalysisSummary();
    return summary.reportResults.map(result => result.title);
  }

  async hasListingsResults(): Promise<boolean> {
    const summary = await this.getAiAnalysisSummary();
    return summary.listingsCount > 0;
  }

  async getListingsResultsCount(): Promise<number> {
    const summary = await this.getAiAnalysisSummary();
    return summary.listingsCount;
  }

  async hasReviewsResults(): Promise<boolean> {
    const summary = await this.getAiAnalysisSummary();
    return summary.reviewsCount > 0;
  }

  async getReviewsResultsCount(): Promise<number> {
    const summary = await this.getAiAnalysisSummary();
    return summary.reviewsCount;
  }

  /**
   * 展开结果详情
   * 
   * @param index - 结果卡片索引
   */
  async expandResultDetails(index: number): Promise<void> {
    const card = this.page.locator(this.selectors.resultCard).nth(index);
    const expandButton = card.locator('button').first();
    await expandButton.click();
    await this.wait(300); // 等待展开动画
  }

  // ========== 导出方法 ==========

  /**
   * 导出报告
   */
  async exportReport(): Promise<void> {
    await this.click(this.selectors.exportButton);
  }

  /**
   * 导出 JSON 格式报告
   */
  async exportJson(): Promise<void> {
    await this.click(this.selectors.exportJsonButton);
  }

  /**
   * 导出 Markdown 格式报告
   */
  async exportMarkdown(): Promise<void> {
    await this.click(this.selectors.exportMarkdownButton);
  }

  /**
   * 清空分析结果
   */
  async clearResults(): Promise<void> {
    await this.click(this.selectors.clearResultsButton);
  }

  // ========== 数据源方法 ==========

  /**
   * 检查是否显示数据源横幅
   */
  async hasDataSourceBanner(): Promise<boolean> {
    return await this.isVisible(this.selectors.dataSourceBanner);
  }

  /**
   * 获取数据源信息
   */
  async getDataSourceInfo(): Promise<string> {
    if (await this.hasDataSourceBanner()) {
      return await this.getText(this.selectors.dataSourceInfo);
    }
    return '';
  }

  // ========== 验证方法 ==========

  /**
   * 验证欢迎横幅是否可见
   */
  async isWelcomeBannerVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.welcomeBanner);
  }

  /**
   * 验证 ASIN 卡片是否可见
   */
  async isAsinCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.asinCard);
  }

  /**
   * 验证目标卡片是否可见
   */
  async isTargetCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.targetCard);
  }

  /**
   * 验证是否可以开始分析
   */
  async canStartAnalysis(): Promise<boolean> {
    const hasAsins = (await this.getSelectedAsinCount()) > 0;
    const hasTargets = (await this.getSelectedTargetCount()) > 0;
    const isEnabled = await this.isAnalysisButtonEnabled();
    
    return hasAsins && hasTargets && isEnabled;
  }

  // ========== 置信度相关方法 ==========

  /**
   * 检查总体置信度卡片是否显示
   */
  async isOverallConfidenceCardVisible(): Promise<boolean> {
    return await this.page.locator('text=总体置信度').isVisible();
  }

  /**
   * 获取总体置信度百分比
   */
  async getOverallConfidencePercent(): Promise<number> {
    const element = this.page.locator('[x-text="overallConfidencePercent"]');
    const text = await element.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * 获取总体置信度颜色类
   */
  async getOverallConfidenceColorClass(): Promise<string> {
    const indicator = this.page
      .getByText('总体置信度', { exact: true })
      .locator('xpath=ancestor::div[@role="status"][1]')
      .locator('.w-10.h-10.rounded-lg')
      .first();
    const classes = await indicator.getAttribute('class');

    if (classes?.includes('confidence-high-bg-alpha')) return 'green';
    if (classes?.includes('confidence-medium-bg-alpha')) return 'yellow';
    if (classes?.includes('confidence-low-bg-alpha')) return 'orange';

    return 'unknown';
  }

  /**
   * 获取特定结果卡片的置信度百分比
   *
   * @param index - 结果卡片索引
   */
  async getResultConfidencePercent(index: number): Promise<number> {
    const badge = this.page.locator('span[aria-label^="置信度:"]').nth(index);

    if (await badge.isVisible()) {
      const text = (await badge.getAttribute('aria-label')) || (await badge.textContent());
      const match = text?.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    }

    return 0;
  }

  /**
   * 获取特定结果卡片的置信度颜色
   *
   * @param index - 结果卡片索引
   */
  async getResultConfidenceColor(index: number): Promise<string> {
    const badge = this.page
      .locator('span[aria-label^="置信度:"]')
      .nth(index);

    if (await badge.isVisible()) {
      const classes = await badge.getAttribute('class');

      if (classes?.includes('confidence-high-text')) return 'green';
      if (classes?.includes('confidence-medium-text')) return 'yellow';
      if (classes?.includes('confidence-low-text')) return 'orange';
    }

    return 'unknown';
  }

  /**
   * 检查置信度徽章是否显示
   *
   * @param index - 结果卡片索引
   */
  async hasConfidenceBadge(index: number): Promise<boolean> {
    const badge = this.page.locator('span[aria-label^="置信度:"]').nth(index);
    return await badge.isVisible();
  }

  /**
   * 获取置信度卡片的可访问性属性
   */
  async getConfidenceAccessibilityAttributes(): Promise<{
    hasAriaLabel: boolean;
    ariaLabel: string | null;
    role: string | null;
  }> {
    const card = this.page.locator('text=总体置信度').locator('..').locator('..');

    return {
      hasAriaLabel: await card.getAttribute('aria-label') !== null,
      ariaLabel: await card.getAttribute('aria-label'),
      role: await card.getAttribute('role')
    };
  }

  // ========== 完整流程方法 ==========

  /**
   * 完整的分析流程
   *
   * @param config - 分析配置
   * @returns 分析结果摘要
   */
  async completeAnalysisFlow(config: AnalysisConfig): Promise<string[]> {
    // 1. 选择 ASIN
    if (config.asins && config.asins.length > 0) {
      await this.selectAsins(config.asins);
    } else {
      await this.selectAllAsins();
    }

    // 2. 选择分析目标
    if (config.targets && config.targets.length > 0) {
      await this.selectTargets(config.targets);
    } else {
      await this.selectAllTargets();
    }

    // 3. 开始分析
    await this.startAnalysis();

    // 4. 等待完成
    await this.waitForAnalysisComplete();

    // 5. 返回结果摘要
    return await this.getAnalysisResultsSummary();
  }

  /**
   * 快速分析（使用默认配置）
   * 
   * @returns 分析结果摘要
   */
  async quickAnalysis(): Promise<string[]> {
    return await this.completeAnalysisFlow({});
  }
}
