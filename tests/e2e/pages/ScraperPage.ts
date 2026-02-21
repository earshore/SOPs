// tests/e2e/pages/ScraperPage.ts
// ================================================================
// 📄 Scraper 页面 Page Object
// 封装 Scraper 页面的所有交互操作
// ================================================================

import { Page, expect } from '@playwright/test';

export class ScraperPage {
  constructor(public readonly page: Page) {}

  // ========== 导航 ==========

  /**
   * 导航到 Scraper 页面
   */
  async navigate(): Promise<void> {
    await this.page.goto('/app_center/master_analysis/scraper');
    await this.page.waitForLoadState('networkidle');
    
    // 等待 Alpine 组件初始化
    await this.page.waitForSelector('[x-data="scraperPanel"]', { timeout: 10000 });
  }

  // ========== 站点选择 ==========

  /**
   * 选择目标站点
   */
  async selectSite(site: string): Promise<void> {
    await this.page.click(`button:has-text("${site}")`);
    await this.wait(300);
  }

  /**
   * 获取当前选中的站点
   */
  async getSelectedSite(): Promise<string> {
    const selectedButton = await this.page.locator('button.site-btn.selected').first();
    return await selectedButton.textContent() || '';
  }

  /**
   * 获取可用站点数量
   */
  async getAvailableSitesCount(): Promise<number> {
    return await this.page.locator('button.site-btn').count();
  }

  // ========== ASIN 输入 ==========

  /**
   * 输入 ASIN 列表
   */
  async fillAsins(asins: string | string[]): Promise<void> {
    const asinText = Array.isArray(asins) ? asins.join('\n') : asins;
    await this.page.fill('textarea[x-model="inputAsins"]', asinText);
    await this.wait(500); // 等待验证
  }

  /**
   * 清空 ASIN 输入
   */
  async clearAsins(): Promise<void> {
    const clearButton = this.page.locator('button:has-text("清空")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  }

  /**
   * 获取已识别的 ASIN 数量
   */
  async getValidAsinsCount(): Promise<number> {
    const countText = await this.page.locator('text=/已识别.*个 ASIN/').textContent();
    if (!countText) return 0;
    
    const match = countText.match(/已识别\s*(\d+)\s*个/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 获取无效项数量
   */
  async getInvalidCount(): Promise<number> {
    const invalidBadge = this.page.locator('text=/过滤.*个无效项/');
    if (!await invalidBadge.isVisible()) return 0;
    
    const countText = await invalidBadge.textContent();
    const match = countText?.match(/过滤\s*(\d+)\s*个/);
    return match ? parseInt(match[1]) : 0;
  }

  // ========== 采集选项 ==========

  /**
   * 切换评论采集选项
   */
  async toggleReviewScraping(enabled: boolean): Promise<void> {
    const toggle = this.page.locator('label:has-text("采集评论")');
    const isEnabled = await this.isReviewScrapingEnabled();
    
    if (isEnabled !== enabled) {
      await toggle.click();
      await this.wait(300);
    }
  }

  /**
   * 检查评论采集是否启用
   */
  async isReviewScrapingEnabled(): Promise<boolean> {
    const track = this.page.locator('.toggle-track.active').first();
    return await track.isVisible();
  }

  // ========== 采集操作 ==========

  /**
   * 开始采集
   */
  async startScrape(): Promise<void> {
    await this.page.click('button:has-text("开始采集")');
    await this.wait(500);
  }

  /**
   * 检查是否可以开始采集
   */
  async canStartScrape(): Promise<boolean> {
    const button = this.page.locator('button:has-text("开始采集")');
    return !(await button.isDisabled());
  }

  /**
   * 检查是否正在采集
   */
  async isScraping(): Promise<boolean> {
    const spinner = this.page.locator('button:has-text("正在采集中")');
    return await spinner.isVisible();
  }

  /**
   * 等待采集完成
   */
  async waitForScrapeComplete(timeout: number = 30000): Promise<void> {
    await this.page.waitForSelector('button:has-text("正在采集中")', { 
      state: 'hidden', 
      timeout 
    });
  }

  // ========== 任务状态 ==========

  /**
   * 获取任务数量
   */
  async getTasksCount(): Promise<number> {
    return await this.page.locator('.task-item').count();
  }

  /**
   * 获取完成的任务数量
   */
  async getCompletedTasksCount(): Promise<number> {
    return await this.page.locator('.task-item:has(.fa-check-circle)').count();
  }

  /**
   * 获取失败的任务数量
   */
  async getFailedTasksCount(): Promise<number> {
    return await this.page.locator('.task-item:has(.fa-times-circle)').count();
  }

  /**
   * 获取采集进度百分比
   */
  async getScrapeProgress(): Promise<number> {
    const progressText = await this.page.locator('text=/\\d+%/').first().textContent();
    if (!progressText) return 0;
    
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  // ========== 数据导入 ==========

  /**
   * 触发文件导入
   */
  async triggerImport(): Promise<void> {
    await this.page.click('button:has-text("导入数据")');
    await this.wait(300);
  }

  /**
   * 上传 JSON 文件
   */
  async uploadJsonFile(filePath: string): Promise<void> {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.wait(1000); // 等待文件处理
  }

  // ========== 历史记录 ==========

  /**
   * 获取历史记录数量
   */
  async getHistoryCount(): Promise<number> {
    return await this.page.locator('.history-item').count();
  }

  /**
   * 加载历史记录
   */
  async loadHistory(index: number = 0): Promise<void> {
    const historyItems = this.page.locator('.history-item');
    const item = historyItems.nth(index);
    await item.click();
    await this.wait(500);
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(index: number): Promise<void> {
    const deleteButton = this.page.locator('.history-item').nth(index).locator('button:has(.fa-trash)');
    await deleteButton.click();
    await this.wait(300);
  }

  // ========== 数据预览 ==========

  /**
   * 检查是否有数据
   */
  async hasData(): Promise<boolean> {
    const dataCards = this.page.locator('.product-card');
    return await dataCards.count() > 0;
  }

  /**
   * 获取产品卡片数量
   */
  async getProductCardsCount(): Promise<number> {
    return await this.page.locator('.product-card').count();
  }

  /**
   * 切换数据标签页
   */
  async switchDataTab(tab: 'preview' | 'json'): Promise<void> {
    await this.page.click(`button:has-text("${tab === 'preview' ? '数据预览' : 'JSON'}")`);
    await this.wait(300);
  }

  /**
   * 展开/收起产品卡片
   */
  async toggleProductCard(index: number): Promise<void> {
    const card = this.page.locator('.product-card').nth(index);
    const expandButton = card.locator('button:has(.fa-chevron)');
    await expandButton.click();
    await this.wait(300);
  }

  /**
   * 检查产品卡片是否展开
   */
  async isProductCardExpanded(index: number): Promise<boolean> {
    const card = this.page.locator('.product-card').nth(index);
    const chevron = card.locator('.fa-chevron-up');
    return await chevron.isVisible();
  }

  /**
   * 获取产品标题
   */
  async getProductTitle(index: number): Promise<string> {
    const card = this.page.locator('.product-card').nth(index);
    const title = card.locator('.product-title');
    return await title.textContent() || '';
  }

  /**
   * 获取产品 ASIN
   */
  async getProductAsin(index: number): Promise<string> {
    const card = this.page.locator('.product-card').nth(index);
    const asin = card.locator('text=/ASIN:/');
    const text = await asin.textContent() || '';
    return text.replace('ASIN:', '').trim();
  }

  /**
   * 获取评论数量
   */
  async getReviewsCount(index: number): Promise<number> {
    const card = this.page.locator('.product-card').nth(index);
    const reviewsText = await card.locator('text=/\\d+ 条评论/').textContent();
    if (!reviewsText) return 0;
    
    const match = reviewsText.match(/(\d+)\s*条/);
    return match ? parseInt(match[1]) : 0;
  }

  // ========== 数据操作 ==========

  /**
   * 删除产品
   */
  async deleteProduct(index: number): Promise<void> {
    const card = this.page.locator('.product-card').nth(index);
    const deleteButton = card.locator('button:has(.fa-trash)');
    await deleteButton.click();
    
    // 确认删除
    await this.page.click('button:has-text("确认")');
    await this.wait(300);
  }

  /**
   * 导出数据
   */
  async exportData(): Promise<void> {
    await this.page.click('button:has-text("导出")');
    await this.wait(500);
  }

  /**
   * 清空所有数据
   */
  async clearAllData(): Promise<void> {
    await this.page.click('button:has-text("清空")');
    
    // 确认清空
    await this.page.click('button:has-text("确认")');
    await this.wait(300);
  }

  // ========== JSON 查看器 ==========

  /**
   * 获取 JSON 内容
   */
  async getJsonContent(): Promise<string> {
    await this.switchDataTab('json');
    const jsonViewer = this.page.locator('pre, code, .json-viewer');
    return await jsonViewer.textContent() || '';
  }

  /**
   * 复制 JSON
   */
  async copyJson(): Promise<void> {
    await this.switchDataTab('json');
    await this.page.click('button:has-text("复制")');
    await this.wait(300);
  }

  // ========== 配置面板 ==========

  /**
   * 展开/收起配置面板
   */
  async toggleConfigPanel(): Promise<void> {
    await this.page.click('.config-header');
    await this.wait(300);
  }

  /**
   * 检查配置面板是否展开
   */
  async isConfigPanelExpanded(): Promise<boolean> {
    const chevron = this.page.locator('.config-chevron-wrap .fa-chevron-down.rotate-180');
    return await chevron.isVisible();
  }

  // ========== 策略指南 ==========

  /**
   * 展开/收起策略指南
   */
  async toggleStrategyGuide(): Promise<void> {
    const guideHeader = this.page.locator('div:has-text("数据结构化提取策略")').first();
    await guideHeader.click();
    await this.wait(300);
  }

  /**
   * 检查策略指南是否展开
   */
  async isStrategyGuideExpanded(): Promise<boolean> {
    const container = this.page.locator('#amz_refining_container');
    return !(await container.evaluate(el => el.classList.contains('hidden')));
  }

  // ========== 工具方法 ==========

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 获取输入框的值
   */
  async getValue(selector: string): Promise<string> {
    return await this.page.inputValue(selector);
  }

  /**
   * 悬停在元素上
   */
  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  /**
   * 期望显示 Toast 提示
   */
  async expectToast(text: string): Promise<void> {
    await expect(this.page.locator(`.toast:has-text("${text}")`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * 获取数据源信息
   */
  async getDataSourceInfo(): Promise<{
    hasData: boolean;
    productCount: number;
    reviewCount: number;
  }> {
    const hasData = await this.hasData();
    
    if (!hasData) {
      return { hasData: false, productCount: 0, reviewCount: 0 };
    }

    const productCount = await this.getProductCardsCount();
    
    // 计算总评论数
    let reviewCount = 0;
    for (let i = 0; i < productCount; i++) {
      reviewCount += await this.getReviewsCount(i);
    }

    return { hasData: true, productCount, reviewCount };
  }
}
