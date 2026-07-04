// tests/e2e/pages/PromptlabPage.ts
// ================================================================
// 📄 Promptlab 页面对象
// 提供 Promptlab 模块的页面操作方法
// ================================================================

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * 产品 DNA 数据接口
 */
export interface ProductDNA {
  targetMarket?: string;
  keywordsTier1?: string;
  keywordsTier2?: string;
  tier1Keywords?: string;
  tier2Keywords?: string;
  negative?: string;
  negativeKeywords?: string;
  audience?: string;
  usps?: string;
  specs?: string;
  socialHook?: string;
}

/**
 * 策略配置接口
 */
export interface StrategyConfig {
  tone?: 'professional' | 'exciting' | 'emotional' | 'minimalist';
  customStrategy?: string;
  useCosmo?: boolean;
  useRufus?: boolean;
  useEmoji?: boolean;
}

/**
 * 控制台模式类型
 */
export type ConsoleMode = 'listing' | 'visual';

interface PromptGenerationWaitOptions {
  expectedTerms?: string[];
  timeout?: number;
}

/**
 * Promptlab 页面对象
 * 
 * 提供 Promptlab 模块的所有交互方法，包括：
 * - 产品 DNA 填写
 * - 分析报告选择
 * - 策略配置
 * - Prompt 生成和复制
 * 
 * @example
 * ```typescript
 * const promptlab = new PromptlabPage(page);
 * await promptlab.navigate();
 * await promptlab.fillProductDNA({
 *   targetMarket: 'English',
 *   keywordsTier1: 'wireless earbuds',
 *   keywordsTier2: 'bluetooth 5.0, noise cancelling'
 * });
 * await promptlab.generateListingPrompt();
 * const prompt = await promptlab.getGeneratedPrompt();
 * ```
 */
export class PromptlabPage extends BasePage {
  // ========== 选择器定义 ==========
  
  // 产品 DNA 输入框
  private readonly selectors = {
    // 目标市场
    targetMarket: '#lab-target-market',
    
    // 关键词
    keywordsTier1: '#lab-keywords-tier1',
    keywordsTier2: '#lab-keywords-tier2',
    negativeKeywords: '#negative-keywords',
    
    // 产品信息
    audience: '#lab-audience',
    usps: '#lab-usps',
    specs: '#lab-specs',
    socialHook: '#lab-social-hook',
    
    // 分析报告
    analysisStatus: '#lab-analysis-status',
    reportSectionsContainer: '#report-sections-container',
    selectAllButton: 'button:has-text("全选")',
    clearAllButton: 'button:has-text("清空")',
    
    // 策略配置
    tone: '#lab-tone',
    customStrategy: '#lab-custom-strategy',
    cosmoCheckbox: '#opt-cosmo',
    rufusCheckbox: '#opt-rufus',
    emojiCheckbox: '#opt-emoji',
    
    // 控制台
    listingModeButton: '#btn-mode-listing',
    visualModeButton: '#btn-mode-visual',
    generatePromptButton: '#btn-generate-prompt',
    generateVisualButton: '#btn-generate-visual',
    
    // 输出
    promptOutput: '#final-prompt-output',
    copyButton: 'button[title="复制"]',
    clearButton: 'button[title="清空"]',
    charCount: '#prompt-word-count',
    
    // 卡片
    productDnaCard: '#card-product-dna',
    analysisCard: '#card-analysis',
    strategyCard: '#card-strategy',
    outputCard: '#prompt-output-card'
  };

  constructor(page: Page) {
    super(page, { baseUrl: 'http://localhost:5173' });
  }

  // ========== 导航方法 ==========

  /**
   * 导航到 Promptlab 页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/#/app-center/master-analysis/promptlab');
    try {
      await this.waitForPageReady();
    } catch {
      await super.navigate('/#/app-center/master-analysis/promptlab');
      await this.waitForPageReady();
    }
  }

  /**
   * 等待页面就绪
   */
  async waitForPageReady(): Promise<void> {
    await this.waitForElement(this.selectors.productDnaCard, { timeout: 10000 });
    await this.waitForElement(this.selectors.generatePromptButton, { timeout: 10000 });
    await this.waitForPromptlabAlpineReady();
    await this.waitForLoadingToFinish();
  }

  private async waitForPromptlabAlpineReady(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        if (!root || typeof alpine?.$data !== 'function') return false;

        const data = alpine.$data(root) as { profile?: unknown; renderReportAnalysis?: unknown };
        return !!data?.profile && typeof data.renderReportAnalysis === 'function';
      },
      undefined,
      { timeout }
    );
  }

  private async waitForProfileField(
    field: string,
    value: string | boolean,
    timeout = 5000
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ fieldName, expectedValue }) => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        if (!root || typeof alpine?.$data !== 'function') return false;

        const data = alpine.$data(root) as { profile?: Record<string, unknown> };
        return data.profile?.[fieldName] === expectedValue;
      },
      { fieldName: field, expectedValue: value },
      { timeout }
    );
  }

  private async getPromptlabStateValue<T>(property: string, fallback: T): Promise<T> {
    return await this.page.evaluate(
      ({ property, fallbackValue }) => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        const data = root && typeof alpine?.$data === 'function'
          ? (alpine.$data(root) as Record<string, unknown>)
          : undefined;
        return (data?.[property] as T | undefined) ?? fallbackValue;
      },
      { property, fallbackValue: fallback }
    );
  }

  private async callPromptlabAction(action: string): Promise<void> {
    await this.page.evaluate(actionName => {
      const root = document.querySelector('[x-data="promptlabPanel"]');
      const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
        .Alpine;
      const data = root && typeof alpine?.$data === 'function'
        ? (alpine.$data(root) as Record<string, unknown>)
        : undefined;

      if (typeof data?.[actionName] !== 'function') {
        throw new Error(`Promptlab action not found: ${actionName}`);
      }

      (data[actionName] as () => void)();
    }, action);
  }

  private async waitForSelectedReportSectionsCount(expected: number, timeout = 5000): Promise<void> {
    await this.page.waitForFunction(
      expectedCount => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        const data = root && typeof alpine?.$data === 'function'
          ? (alpine.$data(root) as { profile?: { selectedReportSections?: unknown[] } })
          : undefined;
        return (data?.profile?.selectedReportSections?.length ?? 0) === expectedCount;
      },
      expected,
      { timeout }
    );
  }

  // ========== 产品 DNA 填写方法 ==========

  /**
   * 填写产品 DNA 信息
   * 
   * @param data - 产品 DNA 数据
   */
  async fillProductDNA(data: ProductDNA): Promise<void> {
    const keywordsTier1 = data.keywordsTier1 ?? data.tier1Keywords;
    const keywordsTier2 = data.keywordsTier2 ?? data.tier2Keywords;
    const negative = data.negative ?? data.negativeKeywords;

    if (data.targetMarket) {
      await this.selectTargetMarket(data.targetMarket);
    }

    if (keywordsTier1) {
      await this.fillTier1Keywords(keywordsTier1);
    }

    if (keywordsTier2) {
      await this.fillTier2Keywords(keywordsTier2);
    }

    if (negative) {
      await this.fillNegativeKeywords(negative);
    }

    if (data.audience) {
      await this.fillAudience(data.audience);
    }

    if (data.usps) {
      await this.fillUSPs(data.usps);
    }

    if (data.specs) {
      await this.fillSpecs(data.specs);
    }

    if (data.socialHook) {
      await this.fillSocialHook(data.socialHook);
    }
  }

  /**
   * 选择目标市场
   * 
   * @param market - 市场名称
   */
  async selectTargetMarket(market: string): Promise<void> {
    const optionValue = await this.resolveTargetMarketOption(market);
    await this.select(this.selectors.targetMarket, optionValue);
    await this.waitForProfileField('targetMarket', optionValue);
  }

  private async resolveTargetMarketOption(market: string): Promise<string> {
    const options = this.page.locator(`${this.selectors.targetMarket} option`);
    const count = await options.count();
    const fallbackMarket = market === 'English' ? 'English (US)' : market;
    const optionData: Array<{ value: string; label: string }> = [];

    for (let index = 0; index < count; index++) {
      const option = options.nth(index);
      const value = (await option.getAttribute('value')) || '';
      const label = (await option.textContent()) || '';
      optionData.push({ value, label });
    }

    return (
      optionData.find(option => option.value === market || option.label === market)?.value ||
      optionData.find(
        option => option.value === fallbackMarket || option.label.startsWith(`${fallbackMarket} `)
      )?.value ||
      optionData.find(option => option.label.includes(market))?.value ||
      market
    );
  }

  /**
   * 填写 Tier 1 关键词
   * 
   * @param keywords - 关键词
   */
  async fillTier1Keywords(keywords: string): Promise<void> {
    await this.fill(this.selectors.keywordsTier1, keywords);
    await this.waitForProfileField('keywordsTier1', keywords);
  }

  /**
   * 填写 Tier 2 关键词
   * 
   * @param keywords - 关键词
   */
  async fillTier2Keywords(keywords: string): Promise<void> {
    await this.fill(this.selectors.keywordsTier2, keywords);
    await this.waitForProfileField('keywordsTier2', keywords);
  }

  /**
   * 填写限制词
   * 
   * @param keywords - 限制词
   */
  async fillNegativeKeywords(keywords: string): Promise<void> {
    await this.fill(this.selectors.negativeKeywords, keywords);
    await this.waitForProfileField('negative', keywords);
  }

  /**
   * 填写目标受众
   * 
   * @param audience - 受众描述
   */
  async fillAudience(audience: string): Promise<void> {
    await this.fill(this.selectors.audience, audience);
    await this.waitForProfileField('audience', audience);
  }

  /**
   * 填写核心卖点
   * 
   * @param usps - 卖点描述
   */
  async fillUSPs(usps: string): Promise<void> {
    await this.fill(this.selectors.usps, usps);
    await this.waitForProfileField('usps', usps);
  }

  /**
   * 填写产品参数
   * 
   * @param specs - 参数描述
   */
  async fillSpecs(specs: string): Promise<void> {
    await this.fill(this.selectors.specs, specs);
    await this.waitForProfileField('specs', specs);
  }

  /**
   * 填写社媒 Hook
   * 
   * @param hook - Hook 内容
   */
  async fillSocialHook(hook: string): Promise<void> {
    await this.fill(this.selectors.socialHook, hook);
    await this.waitForProfileField('socialHook', hook);
  }

  /**
   * 获取产品 DNA 数据
   */
  async getProductDNA(): Promise<ProductDNA> {
    return {
      targetMarket: await this.getValue(this.selectors.targetMarket),
      keywordsTier1: await this.getValue(this.selectors.keywordsTier1),
      keywordsTier2: await this.getValue(this.selectors.keywordsTier2),
      negative: await this.getValue(this.selectors.negativeKeywords),
      audience: await this.getValue(this.selectors.audience),
      usps: await this.getValue(this.selectors.usps),
      specs: await this.getValue(this.selectors.specs),
      socialHook: await this.getValue(this.selectors.socialHook)
    };
  }

  async waitForListingReady(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      ({
        targetMarketSelector,
        tier1Selector,
        tier2Selector,
        buttonSelector,
      }: {
        targetMarketSelector: string;
        tier1Selector: string;
        tier2Selector: string;
        buttonSelector: string;
      }) => {
        const getValue = (selector: string) =>
          (document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null)?.value.trim() || '';
        const button = document.querySelector(buttonSelector) as HTMLButtonElement | null;
        return (
          getValue(targetMarketSelector).length > 0 &&
          getValue(tier1Selector).length > 0 &&
          getValue(tier2Selector).length > 0 &&
          !!button &&
          !button.disabled
        );
      },
      {
        targetMarketSelector: this.selectors.targetMarket,
        tier1Selector: this.selectors.keywordsTier1,
        tier2Selector: this.selectors.keywordsTier2,
        buttonSelector: this.selectors.generatePromptButton,
      },
      { timeout }
    );
  }

  async ensureListingRequiredFields(
    fallback: Pick<ProductDNA, 'targetMarket' | 'keywordsTier1' | 'keywordsTier2'>
  ): Promise<void> {
    const current = await this.getProductDNA();

    if (!current.targetMarket && fallback.targetMarket) {
      await this.selectTargetMarket(fallback.targetMarket);
    }

    if (!current.keywordsTier1?.trim() && fallback.keywordsTier1) {
      await this.fillTier1Keywords(fallback.keywordsTier1);
    }

    if (!current.keywordsTier2?.trim() && fallback.keywordsTier2) {
      await this.fillTier2Keywords(fallback.keywordsTier2);
    }

    await this.waitForListingReady();
  }

  // ========== 分析报告方法 ==========

  /**
   * 获取分析报告状态
   */
  async getAnalysisStatus(): Promise<string> {
    return await this.getText(this.selectors.analysisStatus);
  }

  /**
   * 检查是否有分析报告
   */
  async hasAnalysisReport(): Promise<boolean> {
    const status = await this.getAnalysisStatus();
    return status.includes('已就绪');
  }

  /**
   * 全选分析报告维度
   */
  async selectAllReportSections(): Promise<void> {
    await this.callPromptlabAction('selectAllReportSections');
    const sectionsCount = await this.getReportSectionsCount();
    await this.waitForSelectedReportSectionsCount(sectionsCount);
  }

  /**
   * 清空分析报告选择
   */
  async clearReportSections(): Promise<void> {
    await this.callPromptlabAction('clearReportSections');
    await this.waitForSelectedReportSectionsCount(0);
  }

  async clearReportSelections(): Promise<void> {
    await this.clearReportSections();
  }

  async getReportSectionsCount(): Promise<number> {
    return await this.page
      .locator(`${this.selectors.reportSectionsContainer} input.dimension-checkbox, ${this.selectors.reportSectionsContainer} input[name="report-section"]`)
      .count();
  }

  private async clickFirstVisible(selector: string): Promise<void> {
    const buttons = this.page.locator(selector);
    const count = await buttons.count();

    for (let index = 0; index < count; index++) {
      const button = buttons.nth(index);
      if (await button.isVisible()) {
        await button.click();
        return;
      }
    }
  }

  /**
   * 选择特定的报告维度
   * 
   * @param sectionName - 维度名称
   */
  async selectReportSection(sectionName: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"][value="${sectionName}"]`);
    await checkbox.check();
  }

  /**
   * 取消选择特定的报告维度
   * 
   * @param sectionName - 维度名称
   */
  async unselectReportSection(sectionName: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"][value="${sectionName}"]`);
    await checkbox.uncheck();
  }

  /**
   * 获取已选择的报告维度数量
   */
  async getSelectedReportSectionsCount(): Promise<number> {
    const profile = await this.getPromptlabStateValue<{ selectedReportSections?: unknown[] }>('profile', {});
    return profile.selectedReportSections?.length ?? 0;
  }

  // ========== 策略配置方法 ==========

  /**
   * 配置生成策略
   * 
   * @param config - 策略配置
   */
  async configureStrategy(config: StrategyConfig): Promise<void> {
    if (config.tone) {
      await this.selectTone(config.tone);
    }

    if (config.customStrategy !== undefined) {
      await this.fillCustomStrategy(config.customStrategy);
    }

    if (config.useCosmo !== undefined) {
      await this.toggleCosmo(config.useCosmo);
    }

    if (config.useRufus !== undefined) {
      await this.toggleRufus(config.useRufus);
    }

    if (config.useEmoji !== undefined) {
      await this.toggleEmoji(config.useEmoji);
    }
  }

  /**
   * 选择文案语气
   * 
   * @param tone - 语气类型
   */
  async selectTone(tone: 'professional' | 'exciting' | 'emotional' | 'minimalist'): Promise<void> {
    await this.select(this.selectors.tone, tone);
    await this.waitForProfileField('tone', tone);
  }

  /**
   * 填写自定义策略
   * 
   * @param strategy - 策略内容
   */
  async fillCustomStrategy(strategy: string): Promise<void> {
    await this.fill(this.selectors.customStrategy, strategy);
    await this.waitForProfileField('customStrategy', strategy);
  }

  /**
   * 切换 COSMO 优化
   * 
   * @param enabled - 是否启用
   */
  async toggleCosmo(enabled: boolean): Promise<void> {
    await this.setChecked(this.selectors.cosmoCheckbox, enabled);
    await this.waitForProfileField('useCosmo', enabled);
  }

  /**
   * 切换 Rufus 优化
   * 
   * @param enabled - 是否启用
   */
  async toggleRufus(enabled: boolean): Promise<void> {
    await this.setChecked(this.selectors.rufusCheckbox, enabled);
    await this.waitForProfileField('useRufus', enabled);
  }

  /**
   * 切换 Emoji 点缀
   * 
   * @param enabled - 是否启用
   */
  async toggleEmoji(enabled: boolean): Promise<void> {
    await this.setChecked(this.selectors.emojiCheckbox, enabled);
    await this.waitForProfileField('useEmoji', enabled);
  }

  /**
   * 获取策略配置
   */
  async getStrategyConfig(): Promise<StrategyConfig> {
    return {
      tone: await this.getValue(this.selectors.tone) as any,
      customStrategy: await this.getValue(this.selectors.customStrategy),
      useCosmo: await this.isChecked(this.selectors.cosmoCheckbox),
      useRufus: await this.isChecked(this.selectors.rufusCheckbox),
      useEmoji: await this.isChecked(this.selectors.emojiCheckbox)
    };
  }

  // ========== 控制台操作方法 ==========

  /**
   * 切换控制台模式
   * 
   * @param mode - 模式类型（listing 或 visual）
   */
  async switchConsoleMode(mode: ConsoleMode): Promise<void> {
    const button = mode === 'listing' 
      ? this.selectors.listingModeButton 
      : this.selectors.visualModeButton;
    
    await this.click(button);
    await this.page.waitForFunction(
      expectedMode => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        const data = root && typeof alpine?.$data === 'function'
          ? (alpine.$data(root) as { currentConsoleMode?: string })
          : undefined;
        return data?.currentConsoleMode === expectedMode;
      },
      mode
    );
  }

  async switchToVisualMode(): Promise<void> {
    await this.switchConsoleMode('visual');
  }

  /**
   * 生成 Listing Prompt
   */
  async generateListingPrompt(options?: PromptGenerationWaitOptions): Promise<void> {
    await this.switchConsoleMode('listing');
    await this.waitForListingReady();
    await this.click(this.selectors.generatePromptButton);
    await this.waitForPromptGeneration(options);
  }

  /**
   * 生成 Visual Prompt
   */
  async generateVisualPrompt(): Promise<void> {
    await this.switchConsoleMode('visual');
    await this.waitForVisualReady();
    await this.click(this.selectors.generateVisualButton);
    await this.waitForPromptGeneration();
  }

  async waitForVisualReady(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      buttonSelector => {
        const root = document.querySelector('[x-data="promptlabPanel"]');
        const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
          .Alpine;
        const data = root && typeof alpine?.$data === 'function'
          ? (alpine.$data(root) as { isVisualReady?: boolean })
          : undefined;
        const button = document.querySelector(buttonSelector) as HTMLButtonElement | null;
        return data?.isVisualReady === true && !!button && !button.disabled;
      },
      this.selectors.generateVisualButton,
      { timeout }
    );
  }

  /**
   * 等待 Prompt 生成完成
   */
  async waitForPromptGeneration(options: PromptGenerationWaitOptions = {}): Promise<void> {
    // 等待输出框有内容
    await this.page.waitForFunction(
      ({ selector, expectedTerms }: { selector: string; expectedTerms: string[] }) => {
        const textarea = document.querySelector(selector) as HTMLTextAreaElement;
        if (!textarea || textarea.value.trim().length === 0) return false;

        const normalizedPrompt = textarea.value.toLowerCase();
        return (
          expectedTerms.length === 0 ||
          expectedTerms.some(term => normalizedPrompt.includes(term.toLowerCase()))
        );
      },
      {
        selector: this.selectors.promptOutput,
        expectedTerms: options.expectedTerms?.filter(Boolean) || [],
      },
      { timeout: options.timeout || 30000 }
    );
  }

  /**
   * 检查生成按钮是否可用
   */
  async isGenerateButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.selectors.generatePromptButton);
  }

  // ========== 输出操作方法 ==========

  /**
   * 获取生成的 Prompt
   */
  async getGeneratedPrompt(): Promise<string> {
    return await this.getValue(this.selectors.promptOutput);
  }

  async hasGeneratedPrompt(): Promise<boolean> {
    return (await this.getGeneratedPrompt()).trim().length > 0;
  }

  /**
   * 复制 Prompt 到剪贴板
   */
  async copyPrompt(): Promise<void> {
    await this.page.evaluate(() => {
      document.querySelectorAll('.toast').forEach(toast => toast.remove());
    });
    await this.click(this.selectors.copyButton);
    await this.page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('.toast')).some(toast =>
        toast.textContent?.includes('已复制')
      );
    });
  }

  /**
   * 清空所有输入
   */
  async clearAllInputs(): Promise<void> {
    await this.click(this.selectors.clearButton);
    const modal = this.page.getByRole('dialog', { name: /清空 PromptLab 输入/ });
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    await modal.getByRole('button', { name: '清空输入' }).click();
    await this.waitForProfileField('targetMarket', '');
    await this.waitForProfileField('keywordsTier1', '');
    await this.waitForProfileField('keywordsTier2', '');
  }

  /**
   * 获取字符数
   */
  async getCharCount(): Promise<number> {
    return (await this.getGeneratedPrompt()).length;
  }

  /**
   * 检查是否超出字符限制
   */
  async isOverCharLimit(): Promise<boolean> {
    const charCountElement = this.page.locator(this.selectors.charCount);
    const classes = await charCountElement.getAttribute('class');
    return classes?.includes('text-red-600') || false;
  }

  // ========== 验证方法 ==========

  /**
   * 验证产品 DNA 卡片是否可见
   */
  async isProductDnaCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.productDnaCard);
  }

  /**
   * 验证分析报告卡片是否可见
   */
  async isAnalysisCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.analysisCard);
  }

  /**
   * 验证策略配置卡片是否可见
   */
  async isStrategyCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.strategyCard);
  }

  /**
   * 验证输出卡片是否可见
   */
  async isOutputCardVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.outputCard);
  }

  /**
   * 验证所有必需字段是否已填写
   */
  async areRequiredFieldsFilled(): Promise<boolean> {
    const tier1 = await this.getValue(this.selectors.keywordsTier1);
    const tier2 = await this.getValue(this.selectors.keywordsTier2);
    
    return tier1.length > 0 && tier2.length > 0;
  }

  // ========== DNA 自动提取方法 ==========

  /**
   * 触发"从报告加载"，自动提取产品 DNA
   */
  async autoPopulateDNA(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        return Array.from(document.querySelectorAll('#card-product-dna button')).some(button => {
          return (
            button.textContent?.includes('从报告加载') &&
            !(button as HTMLButtonElement).disabled
          );
        });
      },
      undefined,
      { timeout: 5000 }
    );

    await this.page.evaluate(() => {
      const root = document.querySelector('[x-data="promptlabPanel"]');
      const alpine = (window as Window & { Alpine?: { $data?: (element: Element) => unknown } })
        .Alpine;
      const data = root && typeof alpine?.$data === 'function'
        ? (alpine.$data(root) as { autoPopulateDNA?: () => Promise<void> })
        : null;
      void data?.autoPopulateDNA?.();
    });

    const overwriteModal = this.page.getByRole('dialog', { name: /覆盖产品 DNA/ });
    try {
      await overwriteModal.waitFor({ state: 'visible', timeout: 1000 });
      return;
    } catch {
      // No overwrite confirmation was shown; continue waiting for direct auto-fill.
    }

    await this.waitForDNAAutoFilled(5000);
  }

  async clickAutoPopulateDNA(): Promise<void> {
    const button = this.page.locator('#card-product-dna button').filter({ hasText: '从报告加载' });
    await button.click();
  }

  async waitForDNAAutoFilled(timeout: number = 3000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const getValue = (selector: string) =>
          (document.querySelector(selector) as HTMLTextAreaElement | null)?.value.trim() || '';
        return ['#lab-audience', '#lab-usps', '#lab-specs'].some(selector => getValue(selector).length > 0);
      },
      undefined,
      { timeout }
    );
  }

  /**
   * 检查"从报告加载"按钮是否可用
   */
  async isAutoPopulateButtonEnabled(): Promise<boolean> {
    const button = this.page.locator('#card-product-dna button').filter({ hasText: '从报告加载' });
    return await button.isEnabled();
  }

  /**
   * 检查 DNA 字段是否已自动填充
   */
  async isDNAAutoFilled(): Promise<boolean> {
    const audience = await this.getValue(this.selectors.audience);
    const usps = await this.getValue(this.selectors.usps);
    const specs = await this.getValue(this.selectors.specs);

    return audience.length > 0 || usps.length > 0 || specs.length > 0;
  }

  /**
   * 获取自动填充的 DNA 数据
   */
  async getAutoFilledDNA(): Promise<{ audience: string; usps: string; specs: string }> {
    return {
      audience: await this.getValue(this.selectors.audience),
      usps: await this.getValue(this.selectors.usps),
      specs: await this.getValue(this.selectors.specs)
    };
  }

  // ========== 完整流程方法 ==========

  /**
   * 完整的 Listing Prompt 生成流程
   * 
   * @param dna - 产品 DNA 数据
   * @param strategy - 策略配置（可选）
   * @returns 生成的 Prompt
   */
  async completeListingFlow(
    dna: ProductDNA,
    strategy?: StrategyConfig
  ): Promise<string> {
    // 1. 填写产品 DNA
    await this.fillProductDNA(dna);

    // 2. 配置策略（如果提供）
    if (strategy) {
      await this.configureStrategy(strategy);
    }

    // 3. 生成 Prompt
    await this.generateListingPrompt();

    // 4. 返回生成的 Prompt
    return await this.getGeneratedPrompt();
  }

  /**
   * 完整的 Visual Prompt 生成流程
   * 
   * @param dna - 产品 DNA 数据
   * @param strategy - 策略配置（可选）
   * @returns 生成的 Prompt
   */
  async completeVisualFlow(
    dna: ProductDNA,
    strategy?: StrategyConfig
  ): Promise<string> {
    // 1. 填写产品 DNA
    await this.fillProductDNA(dna);

    // 2. 配置策略（如果提供）
    if (strategy) {
      await this.configureStrategy(strategy);
    }

    // 3. 生成 Visual Prompt
    await this.generateVisualPrompt();

    // 4. 返回生成的 Prompt
    return await this.getGeneratedPrompt();
  }
}
