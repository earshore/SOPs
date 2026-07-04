// tests/e2e/pages/ScraperPage.ts
// ================================================================
// 📄 Scraper 页面对象
// 提供数据采集模块的页面操作方法
// ================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 站点类型
 */
export type AmazonSite = 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'SE' | 'PL' | 'BE' | 'IE' | 'UK';

/**
 * 任务状态类型
 */
export type TaskStatus = 'pending' | 'scraping' | 'success' | 'failed';

/**
 * 采集配置接口
 */
export interface ScrapeConfig {
  site?: AmazonSite;
  asins: string[];
  scrapeReviews?: boolean;
}

/**
 * 任务信息接口
 */
export interface TaskInfo {
  asin: string;
  status: TaskStatus;
  message: string;
}

/**
 * 数据标签页类型
 */
export type DataTab = 'preview' | 'json';

/**
 * Scraper 页面对象
 * 
 * 提供数据采集模块的所有交互方法，包括：
 * - 站点选择
 * - ASIN 输入和验证
 * - 采集配置
 * - 任务状态监控
 * - 数据预览和导入
 * 
 * @example
 * ```typescript
 * const scraper = new ScraperPage(page);
 * await scraper.navigate();
 * await scraper.selectSite('DE');
 * await scraper.fillAsins(['B08N5WRWNW', 'B09XBHXKKL']);
 * await scraper.toggleReviews(true);
 * await scraper.startScrape();
 * await scraper.waitForScrapeComplete();
 * const data = await scraper.getScrapedData();
 * ```
 */
export class ScraperPage extends BasePage {
  // ========== 选择器定义 ==========
  
  private readonly selectors = {
    // 主容器
    mainContainer: '[x-data="scraperPanel"]',
    welcomeBanner: '.mb-8 > div:first-child',
    
    // 策略指南
    strategyGuideContent: '#amz_refining_container',
    
    // 配置卡片
    configCard: '.config-header',
    configHeader: '.config-header',
    configChevron: '.chevron-animated',
    
    // 站点选择
    siteButton: (site: string) => `button.site-btn:has(span:text("${site}"))`,
    selectedSiteIndicator: '.site-check-badge',
    
    // ASIN 输入
    asinTextarea: '#scraper-asin-input',
    validAsinCount: '.text-emerald-600 span[x-text="validAsins.length"]',
    invalidCount: '.text-amber-600 span[x-text="invalidCount"]',
    clearAsinsButton: 'button:has-text("清空")',
    
    // 采集选项
    reviewsToggle: '.toggle-track',
    reviewsCheckbox: 'input[type="checkbox"]',
    
    // 开始按钮
    startButton: 'button.btn-start',
    startButtonIcon: 'button.btn-start i',
    startButtonText: 'button.btn-start span',
    
    // 任务状态面板
    taskStatusPanel: 'h3:has-text("采集状态")',
    taskProgressBar: '.progress-bar-fill',
    taskCard: '.task-card',
    taskIcon: '.task-icon',
    
    // 数据管理
    dataManagementPanel: 'h2:has-text("产品导入管理")',
    previewTab: 'button:has-text("数据预览")',
    jsonTab: 'button:has-text("JSON数据")',
    
    // 数据预览
    emptyState: '#no-data-msg',
    dataCardsWrapper: '#data-cards-wrapper',
    dataCards: '#data-cards',
    importTrigger: '.import-trigger',
    
    // JSON 显示
    jsonDisplay: '#json-display',
    jsonContainer: '.json-container'
  };

  constructor(page: Page) {
    super(page, { baseUrl: 'http://localhost:5173' });
  }

  private async getScraperStateValue<T>(property: string, fallback: T): Promise<T> {
    return await this.page.evaluate(
      ({ property, fallbackValue }) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        const value = data?.[property];
        return value ?? fallbackValue;
      },
      { property, fallbackValue: fallback }
    );
  }

  private async callScraperAction(action: string, args: unknown[] = []): Promise<void> {
    await this.page.evaluate(
      ({ action, args }) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        if (typeof data?.[action] !== 'function') {
          throw new Error(`Scraper action not found: ${action}`);
        }
        data[action](...args);
      },
      { action, args }
    );
  }

  private async waitForScraperReady(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return Boolean(
          data &&
          typeof data.selectedSite !== 'undefined' &&
          typeof data.inputAsins !== 'undefined' &&
          typeof data.startScrape === 'function'
        );
      },
      { timeout: this.defaultTimeout }
    );
  }

  // ========== 导航方法 ==========

  /**
   * 导航到 Scraper 页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/#/app-center/master-analysis/scraper');
    await this.waitForPageReady();
  }

  /**
   * 等待页面就绪
   */
  async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.mainContainer);
    await this.waitForScraperReady();
    await this.waitForElement(this.selectors.configCard);
    await this.waitForElement(this.selectors.dataManagementPanel);
    await this.waitForLoadingToFinish();
  }

  // ========== 策略指南方法 ==========

  /**
   * 验证策略指南内容是否可见
   */
  async isStrategyGuideVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.strategyGuideContent);
  }

  /**
   * 验证策略指南是否保留展开/收起入口
   */
  async hasStrategyGuideToggle(): Promise<boolean> {
    return await this.page.locator('#data-refine-chevron').count() > 0;
  }

  // ========== 配置卡片方法 ==========

  /**
   * 展开配置卡片
   */
  async expandConfig(): Promise<void> {
    const isExpanded = await this.isConfigPanelExpanded();
    
    if (!isExpanded) {
      await this.click(this.selectors.configHeader);
      await this.page.waitForFunction(() => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.configExpanded === true;
      });
    }
  }

  /**
   * 收起配置卡片
   */
  async collapseConfig(): Promise<void> {
    const isExpanded = await this.isConfigPanelExpanded();
    
    if (isExpanded) {
      await this.click(this.selectors.configHeader);
      await this.page.waitForFunction(() => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.configExpanded === false;
      });
    }
  }

  async isConfigPanelExpanded(): Promise<boolean> {
    return await this.getScraperStateValue('configExpanded', false);
  }

  async toggleConfigPanel(): Promise<void> {
    const before = await this.isConfigPanelExpanded();
    await this.click(this.selectors.configHeader);
    await this.page.waitForFunction(
      (expected) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.configExpanded === expected;
      },
      !before
    );
  }

  // ========== 站点选择方法 ==========

  /**
   * 选择亚马逊站点
   * 
   * @param site - 站点代码
   */
  async selectSite(site: AmazonSite): Promise<void> {
    await this.expandConfig();
    await this.callScraperAction('selectSite', [site]);
    await this.page.waitForFunction(
      (siteCode) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.selectedSite === siteCode;
      },
      site
    );
  }

  /**
   * 获取当前选中的站点
   */
  async getSelectedSite(): Promise<string> {
    return await this.getScraperStateValue('selectedSite', '');
  }

  async getAvailableSitesCount(): Promise<number> {
    await this.expandConfig();
    return await this.page.locator('button.site-btn').count();
  }

  /**
   * 检查站点是否被选中
   * 
   * @param site - 站点代码
   */
  async isSiteSelected(site: AmazonSite): Promise<boolean> {
    const selectedSite = await this.getSelectedSite();
    return selectedSite === site;
  }

  // ========== ASIN 输入方法 ==========

  /**
   * 填写 ASIN 列表
   * 
   * @param asins - ASIN 数组
   */
  async fillAsins(asins: string[] | string): Promise<void> {
    await this.expandConfig();
    const asinText = Array.isArray(asins) ? asins.join('\n') : asins;
    await this.fill(this.selectors.asinTextarea, asinText);
    await this.page.waitForFunction(
      (expected) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.inputAsins === expected;
      },
      asinText
    );
  }

  /**
   * 添加单个 ASIN
   * 
   * @param asin - ASIN 标识符
   */
  async addAsin(asin: string): Promise<void> {
    await this.expandConfig();
    const currentValue = await this.getValue(this.selectors.asinTextarea);
    const newValue = currentValue ? `${currentValue}\n${asin}` : asin;
    await this.fill(this.selectors.asinTextarea, newValue);
    await this.wait(300);
  }

  /**
   * 清空 ASIN 输入
   */
  async clearAsins(): Promise<void> {
    await this.expandConfig();
    await this.callScraperAction('clearAsins');
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="scraperPanel"]') as any;
      const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
      return data?.inputAsins === '';
    });
  }

  /**
   * 获取已识别的有效 ASIN 数量
   */
  async getValidAsinCount(): Promise<number> {
    const validAsins = await this.getScraperStateValue<string[]>('validAsins', []);
    return validAsins.length;
  }

  async getValidAsinsCount(): Promise<number> {
    return await this.getValidAsinCount();
  }

  /**
   * 获取无效项数量
   */
  async getInvalidCount(): Promise<number> {
    return await this.getScraperStateValue('invalidCount', 0);
  }

  /**
   * 获取有效的 ASIN 列表
   */
  async getValidAsins(): Promise<string[]> {
    return await this.getScraperStateValue<string[]>('validAsins', []);
  }

  // ========== 采集选项方法 ==========

  /**
   * 切换评论采集选项
   * 
   * @param enabled - 是否启用
   */
  async toggleReviews(enabled: boolean): Promise<void> {
    await this.expandConfig();
    
    const currentState = await this.isReviewsEnabled();
    
    if (currentState !== enabled) {
      await this.callScraperAction('toggleScrapeReviews');
      await this.page.waitForFunction(
        (expected) => {
          const element = document.querySelector('[x-data="scraperPanel"]') as any;
          const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
          return data?.scrapeReviews === expected;
        },
        enabled
      );
    }
  }

  /**
   * 检查是否启用评论采集
   */
  async isReviewsEnabled(): Promise<boolean> {
    return await this.getScraperStateValue('scrapeReviews', false);
  }

  async toggleReviewScraping(enabled: boolean): Promise<void> {
    await this.toggleReviews(enabled);
  }

  async isReviewScrapingEnabled(): Promise<boolean> {
    return await this.isReviewsEnabled();
  }

  // ========== 采集执行方法 ==========

  /**
   * 开始采集
   */
  async startScrape(): Promise<void> {
    await this.expandConfig();
    await this.click(this.selectors.startButton);
  }

  /**
   * 等待采集完成
   * 
   * @param timeout - 超时时间（毫秒），默认 5 分钟
   */
  async waitForScrapeComplete(timeout: number = 300000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        if (!data) return false;
        
        const tasks = data.tasks || [];
        if (tasks.length === 0) return false;
        
        return tasks.every((task: any) => 
          task.status === 'success' || task.status === 'failed'
        );
      },
      { timeout }
    );
    
    // 等待 UI 更新
    await this.wait(1000);
  }

  /**
   * 检查是否正在采集
   */
  async isScraping(): Promise<boolean> {
    return await this.getScraperStateValue('isScraping', false);
  }

  /**
   * 检查是否可以开始采集
   */
  async canStartScrape(): Promise<boolean> {
    return await this.getScraperStateValue('canStart', false);
  }

  /**
   * 检查开始按钮是否可用
   */
  async isStartButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.selectors.startButton);
  }

  // ========== 任务状态方法 ==========

  /**
   * 检查是否显示任务状态面板
   */
  async hasTaskStatusPanel(): Promise<boolean> {
    return await this.isVisible(this.selectors.taskStatusPanel);
  }

  /**
   * 获取任务列表
   */
  async getTasks(): Promise<TaskInfo[]> {
    return await this.getScraperStateValue<TaskInfo[]>('tasks', []);
  }

  /**
   * 获取任务数量
   */
  async getTaskCount(): Promise<number> {
    const tasks = await this.getTasks();
    return tasks.length;
  }

  async getTasksCount(): Promise<number> {
    return await this.getTaskCount();
  }

  /**
   * 获取成功的任务数量
   */
  async getSuccessTaskCount(): Promise<number> {
    const tasks = await this.getTasks();
    return tasks.filter(t => t.status === 'success').length;
  }

  async getCompletedTasksCount(): Promise<number> {
    const tasks = await this.getTasks();
    return tasks.filter(t => t.status === 'success' || t.status === 'failed').length;
  }

  /**
   * 获取失败的任务数量
   */
  async getFailedTaskCount(): Promise<number> {
    const tasks = await this.getTasks();
    return tasks.filter(t => t.status === 'failed').length;
  }

  /**
   * 获取特定 ASIN 的任务状态
   * 
   * @param asin - ASIN 标识符
   */
  async getTaskStatus(asin: string): Promise<TaskStatus | null> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.asin === asin);
    return task ? task.status : null;
  }

  /**
   * 获取任务进度百分比
   */
  async getTaskProgress(): Promise<number> {
    const tasks = await this.getTasks();
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(t => 
      t.status === 'success' || t.status === 'failed'
    ).length;
    
    return (completedTasks / tasks.length) * 100;
  }

  async getScrapeProgress(): Promise<number> {
    return await this.getTaskProgress();
  }

  // ========== 数据管理方法 ==========

  /**
   * 切换数据标签页
   * 
   * @param tab - 标签页类型
   */
  async switchDataTab(tab: DataTab): Promise<void> {
    const button = tab === 'preview' ? this.selectors.previewTab : this.selectors.jsonTab;
    await this.click(button);
    await this.page.waitForFunction(
      (expected) => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data?.currentDataTab === expected;
      },
      tab
    );
  }

  /**
   * 获取当前数据标签页
   */
  async getCurrentDataTab(): Promise<DataTab> {
    return await this.getScraperStateValue<DataTab>('currentDataTab', 'preview');
  }

  /**
   * 检查是否有数据
   */
  async hasData(): Promise<boolean> {
    await this.switchDataTab('preview');
    return await this.page.locator(`${this.selectors.dataCardsWrapper}:not(.hidden)`).count() > 0;
  }

  /**
   * 触发数据导入
   */
  async triggerImport(): Promise<void> {
    await this.switchDataTab('preview');
    
    const hasData = await this.hasData();
    if (hasData) {
      await this.click(this.selectors.importTrigger);
    } else {
      await this.click(this.selectors.emptyState);
    }
  }

  /**
   * 获取 JSON 数据
   */
  async getJsonData(): Promise<string> {
    await this.switchDataTab('json');
    return await this.getText(this.selectors.jsonDisplay);
  }

  async getJsonContent(): Promise<string> {
    return await this.getJsonData();
  }

  async getProductCardsCount(): Promise<number> {
    await this.switchDataTab('preview');
    return await this.page.locator('.asin-card').count();
  }

  async getProductTitle(index: number): Promise<string> {
    await this.switchDataTab('preview');
    return (await this.page.locator('.asin-card h4').nth(index).textContent())?.trim() || '';
  }

  async getProductAsin(index: number): Promise<string> {
    await this.switchDataTab('preview');
    return (await this.page.locator('.asin-card').nth(index).getAttribute('data-asin')) || '';
  }

  async toggleProductCard(index: number): Promise<void> {
    await this.switchDataTab('preview');
    const asin = await this.getProductAsin(index);
    if (!asin) throw new Error(`Product card not found at index ${index}`);
    await this.callScraperAction('toggleCardExpand', [asin]);
    await this.wait(200);
  }

  async isProductCardExpanded(index: number): Promise<boolean> {
    const asin = await this.getProductAsin(index);
    if (!asin) return false;
    return await this.page.locator(`#card-body-${asin}:not(.hidden)`).count() > 0;
  }

  async getReviewsCount(index: number): Promise<number> {
    const asin = await this.getProductAsin(index);
    if (!asin) return 0;
    await this.page.locator('.asin-card').nth(index).click();
    return await this.page.locator(`#card-body-${asin} .group\\/review`).count();
  }

  async deleteProduct(index: number): Promise<void> {
    const asin = await this.getProductAsin(index);
    if (!asin) throw new Error(`Product card not found at index ${index}`);
    await this.page.evaluate(() => {
      localStorage.setItem('modal_ignore_ignore_del_prod_confirm', 'true');
    });
    await this.callScraperAction('deleteProduct', [asin]);
    await this.page.waitForFunction(
      (deletedAsin) => !document.querySelector(`.asin-card[data-asin="${deletedAsin}"]`),
      asin
    );
  }

  async copyJson(): Promise<void> {
    const json = await this.getJsonContent();
    await this.page.evaluate(async (text) => {
      document.querySelectorAll('.toast').forEach(toast => toast.remove());
      await navigator.clipboard.writeText(text);
      (window as any).showToast?.('已复制', { type: 'success' });
    }, json);
  }

  /**
   * 获取采集的数据对象
   */
  async getScrapedData(): Promise<any> {
    const jsonText = await this.getJsonData();
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }

  // ========== 验证方法 ==========

  /**
   * 验证欢迎横幅是否可见
   */
  async isWelcomeBannerVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.welcomeBanner);
  }

  /**
   * 验证配置卡片是否可见
   */
  async isConfigCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.configCard);
  }

  /**
   * 验证数据管理面板是否可见
   */
  async isDataManagementPanelVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.dataManagementPanel);
  }

  /**
   * 验证所有必需字段是否已填写
   */
  async areRequiredFieldsFilled(): Promise<boolean> {
    const validCount = await this.getValidAsinCount();
    const siteSelected = await this.getSelectedSite();
    
    return validCount > 0 && siteSelected.length > 0;
  }

  // ========== 完整流程方法 ==========

  /**
   * 完整的采集流程
   * 
   * @param config - 采集配置
   * @returns 任务结果摘要
   */
  async completeScrapeFlow(config: ScrapeConfig): Promise<TaskInfo[]> {
    // 1. 选择站点
    if (config.site) {
      await this.selectSite(config.site);
    }

    // 2. 填写 ASIN
    await this.fillAsins(config.asins);

    // 3. 配置评论采集
    if (config.scrapeReviews !== undefined) {
      await this.toggleReviews(config.scrapeReviews);
    }

    // 4. 开始采集
    await this.startScrape();

    // 5. 等待完成
    await this.waitForScrapeComplete();

    // 6. 返回任务结果
    return await this.getTasks();
  }

  /**
   * 快速采集（使用默认配置）
   * 
   * @param asins - ASIN 列表
   * @returns 任务结果摘要
   */
  async quickScrape(asins: string[]): Promise<TaskInfo[]> {
    return await this.completeScrapeFlow({
      site: 'DE',
      asins,
      scrapeReviews: false
    });
  }
}
