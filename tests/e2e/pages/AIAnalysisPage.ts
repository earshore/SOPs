// tests/e2e/pages/AIAnalysisPage.ts
// ================================================================
// 📄 AI Analysis Page Object
// 封装 AI 智能分析模块的页面操作
// ================================================================

import { Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

/**
 * AI 智能分析页面对象
 */
export class AIAnalysisPage extends BasePage {
  // ========== Selectors ==========
  
  // 导航
  private readonly aiAnalysisLink = '#nav-ai-analysis, a[href*="ai_analysis"]';
  
  // ASIN 选择区域
  private readonly asinCheckbox = 'input[type="checkbox"]';
  private readonly selectAllAsinsButton = 'button:has-text("全选")';
  private readonly clearAllAsinsButton = 'button:has-text("清空")';
  private readonly selectedAsinsCount = 'span:has-text("已选择")';
  
  // 分析目标选择区域
  private readonly targetCheckbox = 'button[class*="border-2"]';
  private readonly selectAllTargetsButton = 'button:has-text("全选")';
  private readonly clearAllTargetsButton = 'button:has-text("清空")';
  private readonly selectedTargetsCount = 'span:has-text("已选择")';
  
  // 分析按钮
  private readonly startAnalysisButton = 'button:has-text("开始分析")';
  private readonly progressBar = '.h-3.bg-white\\/20';
  private readonly progressText = 'span[x-text*="progress"]';
  private readonly currentStepText = 'span[x-text="currentStep"]';
  
  // 结果展示
  private readonly resultsContainer = '.space-y-10';
  private readonly listingsResults = 'div:has-text("Listings 分析结果")';
  private readonly reviewsResults = 'div:has-text("Reviews 分析结果")';
  private readonly resultCard = '.bg-white.rounded-2xl.shadow-sm';
  
  // JSON 查看器
  private readonly jsonViewerToggle = 'button:has-text("AI 分析报告 JSON")';
  private readonly jsonViewerContent = 'pre code';
  private readonly copyJsonButton = 'button:has-text("JSON")';
  private readonly copyMarkdownButton = 'button:has-text("MD")';
  private readonly downloadJsonButton = 'button:has-text("下载")';
  
  // 提示词预览
  private readonly promptPanelToggle = 'button:has-text("AI 提示词模板")';
  private readonly promptPanel = '.space-y-3';
  private readonly copyPromptButton = 'button:has-text("复制")';
  
  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  // ========== Navigation ==========
  
  /**
   * 导航到 AI 分析页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/app_center/ai_analysis');
    await this.waitForPageLoad();
    await this.waitForAIAnalysisReady();
  }
  
  /**
   * 通过导航链接进入 AI 分析
   */
  async navigateViaLink(): Promise<void> {
    await this.click(this.aiAnalysisLink);
    await this.waitForPageLoad();
    await this.waitForAIAnalysisReady();
  }
  
  /**
   * 等待 AI 分析模块就绪
   */
  async waitForAIAnalysisReady(): Promise<void> {
    // 等待主要元素加载
    await this.waitForElement(this.startAnalysisButton, 10000);
    
    // 等待 Alpine 组件初始化
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]');
      return element && (element as any).__x;
    }, { timeout: 5000 });
  }

  // ========== ASIN 选择 ==========
  
  /**
   * 获取可用的 ASIN 数量
   */
  async getAvailableAsinsCount(): Promise<number> {
    return await this.count(this.asinCheckbox);
  }
  
  /**
   * 选择指定的 ASIN
   */
  async selectAsin(asin: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"]`).filter({ hasText: asin });
    await checkbox.check();
    await this.wait(300);
  }
  
  /**
   * 取消选择指定的 ASIN
   */
  async unselectAsin(asin: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"]`).filter({ hasText: asin });
    await checkbox.uncheck();
    await this.wait(300);
  }
  
  /**
   * 全选所有 ASIN
   */
  async selectAllAsins(): Promise<void> {
    const buttons = this.page.locator(this.selectAllAsinsButton);
    await buttons.first().click();
    await this.wait(300);
  }
  
  /**
   * 清空所有 ASIN 选择
   */
  async clearAllAsins(): Promise<void> {
    const buttons = this.page.locator(this.clearAllAsinsButton);
    await buttons.first().click();
    await this.wait(300);
  }
  
  /**
   * 获取已选择的 ASIN 数量
   */
  async getSelectedAsinsCount(): Promise<number> {
    const text = await this.page.locator(this.selectedAsinsCount).first().textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }
  
  /**
   * 检查是否有可用数据
   */
  async hasAvailableData(): Promise<boolean> {
    const count = await this.getAvailableAsinsCount();
    return count > 0;
  }

  // ========== 分析目标选择 ==========
  
  /**
   * 获取可用的分析目标数量
   */
  async getAvailableTargetsCount(): Promise<number> {
    // 计算所有分析目标按钮
    return await this.page.locator('button[class*="border-2"][class*="rounded-xl"]').count();
  }
  
  /**
   * 选择指定的分析目标
   */
  async selectTarget(targetName: string): Promise<void> {
    const button = this.page.locator(`button:has-text("${targetName}")`).first();
    await button.click();
    await this.wait(300);
  }
  
  /**
   * 全选所有分析目标
   */
  async selectAllTargets(): Promise<void> {
    const buttons = this.page.locator(this.selectAllTargetsButton);
    // 找到分析目标区域的全选按钮（第二个）
    await buttons.nth(1).click();
    await this.wait(300);
  }
  
  /**
   * 清空所有分析目标选择
   */
  async clearAllTargets(): Promise<void> {
    const buttons = this.page.locator(this.clearAllTargetsButton);
    // 找到分析目标区域的清空按钮（第二个）
    await buttons.nth(1).click();
    await this.wait(300);
  }
  
  /**
   * 获取已选择的分析目标数量
   */
  async getSelectedTargetsCount(): Promise<number> {
    const text = await this.page.locator('span:has-text("已选择")').nth(1).textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  // ========== 分析执行 ==========
  
  /**
   * 检查开始分析按钮是否可用
   */
  async isStartAnalysisButtonEnabled(): Promise<boolean> {
    return await this.page.isEnabled(this.startAnalysisButton);
  }
  
  /**
   * 开始分析
   */
  async startAnalysis(): Promise<void> {
    await this.click(this.startAnalysisButton);
    await this.wait(500);
  }
  
  /**
   * 检查是否正在分析
   */
  async isAnalyzing(): Promise<boolean> {
    const button = this.page.locator(this.startAnalysisButton);
    const text = await button.textContent();
    return text?.includes('分析中') || false;
  }
  
  /**
   * 等待分析完成
   */
  async waitForAnalysisComplete(timeout: number = 30000): Promise<void> {
    // 等待进度达到 100%
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="aiAnalysisPanel"]') as any;
      if (!element || !element.__x) return false;
      return element.__x.$data.progress >= 100;
    }, { timeout });
    
    await this.wait(1000); // 等待结果渲染
  }
  
  /**
   * 获取当前分析进度
   */
  async getAnalysisProgress(): Promise<number> {
    const progressText = await this.page.locator('span[class*="font-mono"][x-text*="progress"]').textContent();
    const match = progressText?.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }
  
  /**
   * 获取当前分析步骤
   */
  async getCurrentStep(): Promise<string> {
    return await this.page.locator('span[x-text="currentStep"]').textContent() || '';
  }

  // ========== 结果查看 ==========
  
  /**
   * 检查是否有分析结果
   */
  async hasResults(): Promise<boolean> {
    return await this.isVisible(this.resultsContainer);
  }
  
  /**
   * 获取结果卡片数量
   */
  async getResultCardsCount(): Promise<number> {
    return await this.count(this.resultCard);
  }
  
  /**
   * 检查是否有 Listings 结果
   */
  async hasListingsResults(): Promise<boolean> {
    return await this.isVisible(this.listingsResults);
  }
  
  /**
   * 检查是否有 Reviews 结果
   */
  async hasReviewsResults(): Promise<boolean> {
    return await this.isVisible(this.reviewsResults);
  }
  
  /**
   * 获取 Listings 结果数量
   */
  async getListingsResultsCount(): Promise<number> {
    if (!await this.hasListingsResults()) return 0;
    
    const container = this.page.locator('div:has-text("Listings 分析结果")').first();
    return await container.locator(this.resultCard).count();
  }
  
  /**
   * 获取 Reviews 结果数量
   */
  async getReviewsResultsCount(): Promise<number> {
    if (!await this.hasReviewsResults()) return 0;
    
    const container = this.page.locator('div:has-text("Reviews 分析结果")').first();
    return await container.locator(this.resultCard).count();
  }
  
  /**
   * 获取指定结果卡片的标题
   */
  async getResultCardTitle(index: number): Promise<string> {
    const card = this.page.locator(this.resultCard).nth(index);
    return await card.locator('h3').textContent() || '';
  }

  // ========== JSON 查看器 ==========
  
  /**
   * 切换 JSON 查看器
   */
  async toggleJsonViewer(): Promise<void> {
    await this.click(this.jsonViewerToggle);
    await this.wait(500);
  }
  
  /**
   * 检查 JSON 查看器是否展开
   */
  async isJsonViewerExpanded(): Promise<boolean> {
    return await this.isVisible(this.jsonViewerContent);
  }
  
  /**
   * 获取 JSON 内容
   */
  async getJsonContent(): Promise<string> {
    if (!await this.isJsonViewerExpanded()) {
      await this.toggleJsonViewer();
    }
    return await this.getText(this.jsonViewerContent);
  }
  
  /**
   * 复制 JSON
   */
  async copyJson(): Promise<void> {
    await this.click(this.copyJsonButton);
    await this.wait(300);
  }
  
  /**
   * 复制 Markdown
   */
  async copyMarkdown(): Promise<void> {
    await this.click(this.copyMarkdownButton);
    await this.wait(300);
  }
  
  /**
   * 下载 JSON
   */
  async downloadJson(): Promise<void> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.click(this.downloadJsonButton)
    ]);
    return download;
  }

  // ========== 提示词预览 ==========
  
  /**
   * 切换提示词预览面板
   */
  async togglePromptPanel(): Promise<void> {
    await this.click(this.promptPanelToggle);
    await this.wait(500);
  }
  
  /**
   * 检查提示词面板是否展开
   */
  async isPromptPanelExpanded(): Promise<boolean> {
    return await this.isVisible(this.promptPanel);
  }
  
  /**
   * 获取提示词数量
   */
  async getPromptCount(): Promise<number> {
    if (!await this.isPromptPanelExpanded()) {
      await this.togglePromptPanel();
    }
    return await this.page.locator('.bg-slate-900.rounded-xl').count();
  }

  // ========== 验证方法 ==========
  
  /**
   * 检查是否准备就绪（可以开始分析）
   */
  async isReady(): Promise<boolean> {
    const hasData = await this.hasAvailableData();
    const selectedAsins = await this.getSelectedAsinsCount();
    const selectedTargets = await this.getSelectedTargetsCount();
    
    return hasData && selectedAsins > 0 && selectedTargets > 0;
  }
  
  /**
   * 获取数据源信息
   */
  async getDataSourceInfo(): Promise<{
    hasData: boolean;
    productCount: number;
    reviewCount: number;
  }> {
    const hasData = await this.hasAvailableData();
    
    if (!hasData) {
      return { hasData: false, productCount: 0, reviewCount: 0 };
    }
    
    // 从数据源横幅获取信息
    const banner = this.page.locator('div[class*="bg-gradient-to-r from-indigo-50"]').first();
    const text = await banner.textContent() || '';
    
    const productMatch = text.match(/(\d+)\s*个产品/);
    const reviewMatch = text.match(/(\d+)\s*条评论/);
    
    return {
      hasData: true,
      productCount: productMatch ? parseInt(productMatch[1]) : 0,
      reviewCount: reviewMatch ? parseInt(reviewMatch[1]) : 0
    };
  }
}
