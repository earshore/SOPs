// tests/e2e/pages/PromptlabPage.ts
// ================================================================
// 📄 Promptlab Page Object
// 封装 Promptlab 模块的页面操作
// ================================================================

import { Page } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

/**
 * Promptlab 页面对象
 */
export class PromptlabPage extends BasePage {
  // ========== Selectors ==========
  
  // 导航
  private readonly promptlabLink = '#nav-promptlab, a[href*="promptlab"]';
  
  // Card 1: Product DNA
  private readonly targetMarketSelect = '#lab-target-market';
  private readonly tier1KeywordsInput = '#lab-keywords-tier1';
  private readonly tier2KeywordsInput = '#lab-keywords-tier2';
  private readonly audienceInput = '#lab-audience';
  private readonly uspsTextarea = '#lab-usps';
  private readonly specsTextarea = '#lab-specs';
  private readonly socialHookInput = '#lab-social-hook';
  private readonly negativeKeywordsInput = '#negative-keywords';
  
  // Card 2: Analysis Report
  private readonly analysisStatusDiv = '#lab-analysis-status';
  private readonly reportSectionsContainer = '#report-sections-container';
  private readonly reportSectionCheckbox = 'input[name="report-section"]';
  private readonly selectAllButton = 'button:has-text("全选")';
  private readonly clearSelectionsButton = 'button:has-text("清空")';
  
  // Card 3: Strategy Config
  private readonly toneSelect = '#lab-tone';
  private readonly customStrategyTextarea = '#lab-custom-strategy';
  private readonly cosmoCheckbox = '#opt-cosmo';
  private readonly rufusCheckbox = '#opt-rufus';
  private readonly emojiCheckbox = '#opt-emoji';
  
  // Console & Output
  private readonly listingModeButton = '#btn-mode-listing';
  private readonly visualModeButton = '#btn-mode-visual';
  private readonly generateListingButton = '#btn-generate-prompt';
  private readonly generateVisualButton = '#btn-generate-visual';
  private readonly promptOutput = '#final-prompt-output';
  private readonly copyPromptButton = 'button:has-text("复制")';
  private readonly clearInputsButton = 'button:has-text("清空输入")';
  
  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl);
  }

  // ========== Navigation ==========
  
  /**
   * 导航到 Promptlab 页面
   */
  async navigate(): Promise<void> {
    await super.navigate('/app_center/promptlab');
    await this.waitForPageLoad();
    await this.waitForPromptlabReady();
  }
  
  /**
   * 通过导航链接进入 Promptlab
   */
  async navigateViaLink(): Promise<void> {
    await this.click(this.promptlabLink);
    await this.waitForPageLoad();
    await this.waitForPromptlabReady();
  }
  
  /**
   * 等待 Promptlab 模块就绪
   */
  async waitForPromptlabReady(): Promise<void> {
    // 等待主要元素加载
    await this.waitForElement(this.targetMarketSelect);
    await this.waitForElement(this.tier1KeywordsInput);
    await this.waitForElement(this.generateListingButton);
    
    // 等待 Alpine 组件初始化
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[x-data="promptlabPanel"]');
      return element && (element as any).__x;
    }, { timeout: 5000 });
  }

  // ========== Product DNA (Card 1) ==========
  
  /**
   * 选择目标市场
   */
  async selectTargetMarket(market: string): Promise<void> {
    await this.select(this.targetMarketSelect, market);
    await this.wait(300); // 等待状态更新
  }
  
  /**
   * 填写 Tier 1 关键词
   */
  async fillTier1Keywords(keywords: string): Promise<void> {
    await this.fill(this.tier1KeywordsInput, keywords);
  }
  
  /**
   * 填写 Tier 2 关键词
   */
  async fillTier2Keywords(keywords: string): Promise<void> {
    await this.fill(this.tier2KeywordsInput, keywords);
  }
  
  /**
   * 填写目标受众
   */
  async fillAudience(audience: string): Promise<void> {
    await this.fill(this.audienceInput, audience);
  }
  
  /**
   * 填写核心卖点
   */
  async fillUSPs(usps: string): Promise<void> {
    await this.fill(this.uspsTextarea, usps);
  }
  
  /**
   * 填写详细参数
   */
  async fillSpecs(specs: string): Promise<void> {
    await this.fill(this.specsTextarea, specs);
  }
  
  /**
   * 填写社媒 Hook
   */
  async fillSocialHook(hook: string): Promise<void> {
    await this.fill(this.socialHookInput, hook);
  }
  
  /**
   * 填写限制词
   */
  async fillNegativeKeywords(keywords: string): Promise<void> {
    await this.fill(this.negativeKeywordsInput, keywords);
  }
  
  /**
   * 填写完整的产品 DNA
   */
  async fillProductDNA(data: {
    targetMarket: string;
    tier1Keywords: string;
    tier2Keywords: string;
    audience?: string;
    usps?: string;
    specs?: string;
    socialHook?: string;
    negativeKeywords?: string;
  }): Promise<void> {
    await this.selectTargetMarket(data.targetMarket);
    await this.fillTier1Keywords(data.tier1Keywords);
    await this.fillTier2Keywords(data.tier2Keywords);
    
    if (data.audience) await this.fillAudience(data.audience);
    if (data.usps) await this.fillUSPs(data.usps);
    if (data.specs) await this.fillSpecs(data.specs);
    if (data.socialHook) await this.fillSocialHook(data.socialHook);
    if (data.negativeKeywords) await this.fillNegativeKeywords(data.negativeKeywords);
  }

  // ========== Analysis Report (Card 2) ==========
  
  /**
   * 检查分析报告状态
   */
  async getAnalysisStatus(): Promise<string> {
    return await this.getText(this.analysisStatusDiv);
  }
  
  /**
   * 检查是否有分析报告
   */
  async hasAnalysisReport(): Promise<boolean> {
    const status = await this.getAnalysisStatus();
    return status.includes('已就绪') || status.includes('就绪');
  }
  
  /**
   * 获取报告模块数量
   */
  async getReportSectionsCount(): Promise<number> {
    return await this.count(this.reportSectionCheckbox);
  }
  
  /**
   * 选择报告模块
   */
  async selectReportSection(value: string): Promise<void> {
    await this.page.check(`${this.reportSectionCheckbox}[value="${value}"]`);
  }
  
  /**
   * 取消选择报告模块
   */
  async unselectReportSection(value: string): Promise<void> {
    await this.page.uncheck(`${this.reportSectionCheckbox}[value="${value}"]`);
  }
  
  /**
   * 全选报告模块
   */
  async selectAllReportSections(): Promise<void> {
    await this.click(this.selectAllButton);
    await this.wait(300);
  }
  
  /**
   * 清空报告模块选择
   */
  async clearReportSelections(): Promise<void> {
    await this.click(this.clearSelectionsButton);
    await this.wait(300);
  }
  
  /**
   * 获取已选择的报告模块数量
   */
  async getSelectedReportSectionsCount(): Promise<number> {
    return await this.page.locator(`${this.reportSectionCheckbox}:checked`).count();
  }

  // ========== Strategy Config (Card 3) ==========
  
  /**
   * 选择文案语气
   */
  async selectTone(tone: string): Promise<void> {
    await this.select(this.toneSelect, tone);
  }
  
  /**
   * 填写自定义规则
   */
  async fillCustomStrategy(strategy: string): Promise<void> {
    await this.fill(this.customStrategyTextarea, strategy);
  }
  
  /**
   * 切换 COSMO 优化
   */
  async toggleCosmo(enabled: boolean): Promise<void> {
    const isChecked = await this.page.isChecked(this.cosmoCheckbox);
    if (isChecked !== enabled) {
      await this.click(this.cosmoCheckbox);
    }
  }
  
  /**
   * 切换 Rufus 优化
   */
  async toggleRufus(enabled: boolean): Promise<void> {
    const isChecked = await this.page.isChecked(this.rufusCheckbox);
    if (isChecked !== enabled) {
      await this.click(this.rufusCheckbox);
    }
  }
  
  /**
   * 切换 Emoji 点缀
   */
  async toggleEmoji(enabled: boolean): Promise<void> {
    const isChecked = await this.page.isChecked(this.emojiCheckbox);
    if (isChecked !== enabled) {
      await this.click(this.emojiCheckbox);
    }
  }

  // ========== Console & Output ==========
  
  /**
   * 切换到 Listing 模式
   */
  async switchToListingMode(): Promise<void> {
    await this.click(this.listingModeButton);
    await this.wait(500); // 等待动画完成
  }
  
  /**
   * 切换到 Visual 模式
   */
  async switchToVisualMode(): Promise<void> {
    await this.click(this.visualModeButton);
    await this.wait(500); // 等待动画完成
  }
  
  /**
   * 生成 Listing Prompt
   */
  async generateListingPrompt(): Promise<void> {
    await this.click(this.generateListingButton);
    await this.wait(1000); // 等待生成完成
  }
  
  /**
   * 生成 Visual Prompt
   */
  async generateVisualPrompt(): Promise<void> {
    await this.click(this.generateVisualButton);
    await this.wait(1000); // 等待生成完成
  }
  
  /**
   * 获取生成的 Prompt
   */
  async getGeneratedPrompt(): Promise<string> {
    return await this.getValue(this.promptOutput);
  }
  
  /**
   * 检查 Prompt 是否已生成
   */
  async hasGeneratedPrompt(): Promise<boolean> {
    const prompt = await this.getGeneratedPrompt();
    return prompt.length > 10;
  }
  
  /**
   * 复制 Prompt
   */
  async copyPrompt(): Promise<void> {
    await this.click(this.copyPromptButton);
    await this.wait(300);
  }
  
  /**
   * 清空所有输入
   */
  async clearAllInputs(): Promise<void> {
    // 需要确认对话框
    this.page.once('dialog', dialog => dialog.accept());
    await this.click(this.clearInputsButton);
    await this.wait(500);
  }
  
  /**
   * 检查生成按钮是否可用
   */
  async isGenerateButtonEnabled(): Promise<boolean> {
    return await this.page.isEnabled(this.generateListingButton);
  }
  
  /**
   * 获取字符计数
   */
  async getCharCount(): Promise<number> {
    const prompt = await this.getGeneratedPrompt();
    return prompt.length;
  }

  // ========== Validation ==========
  
  /**
   * 验证必填字段是否已填写
   */
  async validateRequiredFields(): Promise<{
    targetMarket: boolean;
    tier1Keywords: boolean;
    tier2Keywords: boolean;
  }> {
    const targetMarket = await this.getValue(this.targetMarketSelect);
    const tier1 = await this.getValue(this.tier1KeywordsInput);
    const tier2 = await this.getValue(this.tier2KeywordsInput);
    
    return {
      targetMarket: targetMarket.length > 0,
      tier1Keywords: tier1.trim().length > 0,
      tier2Keywords: tier2.trim().length > 0
    };
  }
  
  /**
   * 检查是否准备就绪（可以生成 Prompt）
   */
  async isReady(): Promise<boolean> {
    const hasReport = await this.hasAnalysisReport();
    const fields = await this.validateRequiredFields();
    
    return hasReport && 
           fields.targetMarket && 
           fields.tier1Keywords && 
           fields.tier2Keywords;
  }
}
