// tests/e2e/pages/AIAnalysisPage.ts
// ================================================================
// 📄 AI 分析页面对象
// 提供 AI 智能分析模块的页面操作方法
// ================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

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
  // ========== 选择器定义 ==========
  
  private readonly selectors = {
    // 主容器
    mainContainer: '[x-data="aiAnalysisPanel"]',
    welcomeBanner: '[x-data="aiAnalysisPanel"] > .wb-container',
    
    // 数据源横幅
    dataSourceBanner: '[x-show="showDataSourceBanner"]',
    dataSourceInfo: '.from-indigo-50',
    
    // ASIN 选择区域
    asinCard: '.lg\\:col-span-4 .bg-white',
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
    targetCard: '.lg\\:col-span-8 .bg-white',
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
    startAnalysisButton: 'button:has-text("执行 AI 分析")',
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

  // ========== 导航方法 ==========

  /**
   * 导航到 AI 分析页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/#/app-center/ai-analysis');
    await this.waitForPageReady();
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
    await this.expandSelectionPanelIfNeeded();
    const checkboxes = this.page.locator(`${this.selectors.availableAsinsList} input[type="checkbox"]`);
    const count = await checkboxes.count();
    
    const asins: string[] = [];
    for (let i = 0; i < count; i++) {
      const value = await checkboxes.nth(i).getAttribute('value');
      if (value) {
        asins.push(value);
      }
    }
    
    return asins;
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
    await this.expandSelectionPanelIfNeeded();
    const checkbox = this.page.locator(`input[type="checkbox"][value="${asin}"]`);
    await checkbox.check();
  }

  /**
   * 取消选择单个 ASIN
   * 
   * @param asin - ASIN 标识符
   */
  async unselectAsin(asin: string): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    const checkbox = this.page.locator(`input[type="checkbox"][value="${asin}"]`);
    await checkbox.uncheck();
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
    await this.expandSelectionPanelIfNeeded();
    await this.click(this.selectors.asinSelectAll);
  }

  /**
   * 清空 ASIN 选择
   */
  async clearAllAsins(): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    await this.click(this.selectors.asinClearAll);
  }

  /**
   * 获取已选择的 ASIN 数量
   */
  async getSelectedAsinCount(): Promise<number> {
    const text = await this.getText(this.selectors.selectedAsinCount);
    const match = text.match(/已选择\s+(\d+)\s+个产品/);
    return match ? parseInt(match[1], 10) : 0;
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
    const checkboxes = this.page.locator(`${this.selectors.availableAsinsList} input[type="checkbox"]:checked`);
    const count = await checkboxes.count();
    
    const asins: string[] = [];
    for (let i = 0; i < count; i++) {
      const value = await checkboxes.nth(i).getAttribute('value');
      if (value) {
        asins.push(value);
      }
    }
    
    return asins;
  }

  /**
   * 检查是否有可用数据
   */
  async hasAvailableData(): Promise<boolean> {
    await this.expandSelectionPanelIfNeeded();
    return !(await this.isVisible(this.selectors.noDataWarning));
  }

  /**
   * 检查 ASIN 是否被选中
   * 
   * @param asin - ASIN 标识符
   */
  async isAsinSelected(asin: string): Promise<boolean> {
    await this.expandSelectionPanelIfNeeded();
    const checkbox = this.page.locator(`input[type="checkbox"][value="${asin}"]`);
    return await checkbox.isChecked();
  }

  // ========== 分析目标选择方法 ==========

  /**
   * 选择分析目标
   * 
   * @param targetId - 目标 ID
   */
  async selectTarget(targetId: string): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    // 通过文本内容查找按钮（因为模板中没有 data-target-id 属性）
    const buttons = this.page.locator(`${this.selectors.targetCard} button`);
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      if (text?.includes(targetId)) {
        await button.click();
        return;
      }
    }
    
    throw new Error(`Target ${targetId} not found`);
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
    await this.expandSelectionPanelIfNeeded();
    const button = this.page.locator(this.selectors.targetCard).locator('button:has-text("全选")');
    await button.click();
  }

  /**
   * 清空分析目标选择
   */
  async clearAllTargets(): Promise<void> {
    await this.expandSelectionPanelIfNeeded();
    const button = this.page.locator(this.selectors.targetCard).locator('button:has-text("清空")');
    await button.click();
  }

  /**
   * 获取已选择的目标数量
   */
  async getSelectedTargetCount(): Promise<number> {
    const text = await this.getText(this.selectors.selectedTargetCount);
    return parseInt(text, 10);
  }

  /**
   * 获取可用的分析目标数量（测试兼容别名）
   */
  async getAvailableTargetsCount(): Promise<number> {
    await this.expandSelectionPanelIfNeeded();

    const listingsButtons = this.page.locator(this.selectors.listingsSection).locator('button');
    const reviewsButtons = this.page.locator(this.selectors.reviewsSection).locator('button');

    const listingsCount = await listingsButtons.count();
    const reviewsCount = await reviewsButtons.count();

    return listingsCount + reviewsCount;
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
    await this.click(this.selectors.promptPanelToggle);
    await this.wait(300); // 等待动画
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
    await this.click(this.selectors.startAnalysisButton);
  }

  /**
   * 等待分析完成
   * 
   * @param timeout - 超时时间（毫秒），默认 5 分钟
   */
  async waitForAnalysisComplete(timeout: number = 300000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const progressElement = document.querySelector('[x-text="progress"]');
        if (!progressElement) return false;
        const progress = parseInt(progressElement.textContent || '0', 10);
        return progress >= 100;
      },
      { timeout }
    );
    
    // 等待结果渲染
    await this.wait(1000);
  }

  /**
   * 获取当前分析进度
   */
  async getAnalysisProgress(): Promise<number> {
    return await this.page.evaluate(() => {
      const progressElement = document.querySelector('[x-text="progress"]');
      return progressElement ? parseInt(progressElement.textContent || '0', 10) : 0;
    });
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
    return await this.page.evaluate(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as any;
      return element?.__x?.$data?.isAnalyzing || false;
    });
  }

  /**
   * 检查分析按钮是否可用
   */
  async isAnalysisButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.selectors.startAnalysisButton);
  }

  // ========== 结果查看方法 ==========

  /**
   * 检查是否有分析结果
   */
  async hasAnalysisResults(): Promise<boolean> {
    return await this.isVisible(this.selectors.resultsContainer);
  }

  /**
   * 获取结果卡片数量
   */
  async getResultCardCount(): Promise<number> {
    return await this.count(this.selectors.resultCard);
  }

  /**
   * 获取特定结果卡片的标题
   * 
   * @param index - 卡片索引
   */
  async getResultTitle(index: number): Promise<string> {
    const card = this.page.locator(this.selectors.resultCard).nth(index);
    return await card.locator(this.selectors.resultTitle).textContent() || '';
  }

  /**
   * 获取分析结果摘要
   */
  async getAnalysisResultsSummary(): Promise<string[]> {
    const cards = this.page.locator(this.selectors.resultCard);
    const count = await cards.count();
    
    const summaries: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await this.getResultTitle(i);
      summaries.push(title);
    }
    
    return summaries;
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
    const indicator = this.page.locator('.w-10.h-10.rounded-lg').first();
    const classes = await indicator.getAttribute('class');

    if (classes?.includes('bg-green-500/20')) return 'green';
    if (classes?.includes('bg-yellow-500/20')) return 'yellow';
    if (classes?.includes('bg-orange-500/20')) return 'orange';

    return 'unknown';
  }

  /**
   * 获取特定结果卡片的置信度百分比
   *
   * @param index - 结果卡片索引
   */
  async getResultConfidencePercent(index: number): Promise<number> {
    const card = this.page.locator('.analysis-result-card, [class*="bg-white"][class*="rounded-2xl"]').nth(index);
    const badge = card.locator('span:has-text("%")').first();

    if (await badge.isVisible()) {
      const text = await badge.textContent();
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
    const card = this.page.locator('.analysis-result-card, [class*="bg-white"][class*="rounded-2xl"]').nth(index);
    const badge = card.locator('span:has-text("%")').first();

    if (await badge.isVisible()) {
      const classes = await badge.getAttribute('class');

      if (classes?.includes('text-green-700')) return 'green';
      if (classes?.includes('text-yellow-700')) return 'yellow';
      if (classes?.includes('text-orange-700')) return 'orange';
    }

    return 'unknown';
  }

  /**
   * 检查置信度徽章是否显示
   *
   * @param index - 结果卡片索引
   */
  async hasConfidenceBadge(index: number): Promise<boolean> {
    const card = this.page.locator('.analysis-result-card, [class*="bg-white"][class*="rounded-2xl"]').nth(index);
    const badge = card.locator('span:has-text("%")').first();
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
