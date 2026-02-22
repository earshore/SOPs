// tests/e2e/pages/QALabPage.ts
// ================================================================
// QA Lab 页面对象
// 封装 QA Lab 页面的元素和操作
// ================================================================

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

export class QALabPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    // ========================================
    // 导航
    // ========================================

    async navigate(): Promise<void> {
        await this.page.goto('/app_center/qalab');
        await this.page.waitForLoadState('networkidle');
        await this.wait(500);
    }

    // ========================================
    // 输入区域
    // ========================================

    async getInputValue(): Promise<string> {
        const input = this.page.locator('#jsonInput');
        return await input.inputValue();
    }

    async setInputValue(value: string): Promise<void> {
        const input = this.page.locator('#jsonInput');
        await input.fill(value);
    }

    async clearInput(): Promise<void> {
        await this.clickButton('[data-action="amz_qalab_clearInput"]');
    }

    async loadSample(): Promise<void> {
        await this.clickButton('[data-action="amz_qalab_loadSample"]');
        await this.wait(500);
    }

    async startAnalysis(): Promise<void> {
        await this.clickButton('[data-action="amz_qalab_startAnalysis"]');
    }

    // ========================================
    // 进度区域
    // ========================================

    async isProgressVisible(): Promise<boolean> {
        const progressSection = this.page.locator('#progressSection');
        return await progressSection.isVisible();
    }

    async waitForAnalysisComplete(timeout: number = 10000): Promise<void> {
        // 等待进度条消失
        await this.page.waitForSelector('#progressSection:not(.active)', { timeout });
        
        // 等待结果区域显示
        await this.page.waitForSelector('#resultsSection.active', { timeout });
        
        await this.wait(500);
    }

    async getProgressSteps(): Promise<string[]> {
        const steps = await this.page.locator('.progress-step').allTextContents();
        return steps;
    }

    // ========================================
    // 结果区域
    // ========================================

    async hasResults(): Promise<boolean> {
        const resultsSection = this.page.locator('#resultsSection.active');
        return await resultsSection.isVisible();
    }

    async getQACardsCount(): Promise<number> {
        const cards = this.page.locator('.qa-card');
        return await cards.count();
    }

    async getVisibleQACardsCount(): Promise<number> {
        const cards = this.page.locator('.qa-card:visible');
        return await cards.count();
    }

    async getQACardTitle(index: number): Promise<string> {
        const card = this.page.locator('.qa-card').nth(index);
        const question = card.locator('.qa-question');
        return await question.textContent() || '';
    }

    async getQACardAnswer(index: number): Promise<string> {
        const card = this.page.locator('.qa-card').nth(index);
        const answer = card.locator('.qa-answer');
        return await answer.textContent() || '';
    }

    async getQACardCategory(index: number): Promise<string> {
        const card = this.page.locator('.qa-card').nth(index);
        const category = card.locator('.qa-category');
        return await category.textContent() || '';
    }

    async getQACardConfidence(index: number): Promise<number> {
        const card = this.page.locator('.qa-card').nth(index);
        const confidence = card.locator('.qa-confidence');
        const text = await confidence.textContent() || '0';
        return parseInt(text.match(/\d+/)?.[0] || '0');
    }

    // ========================================
    // Q&A 卡片操作
    // ========================================

    async toggleQACard(index: number): Promise<void> {
        const card = this.page.locator('.qa-card').nth(index);
        await card.click();
        await this.wait(300);
    }

    async isQACardExpanded(index: number): Promise<boolean> {
        const card = this.page.locator('.qa-card').nth(index);
        return await card.evaluate(el => el.classList.contains('open'));
    }

    async copyQA(index: number): Promise<void> {
        const card = this.page.locator('.qa-card').nth(index);
        const copyBtn = card.locator('button:has-text("复制")');
        await copyBtn.click();
        await this.wait(500);
    }

    async toggleExpandAll(): Promise<void> {
        await this.clickButton('#expandAllBtn');
        await this.wait(300);
    }

    async areAllCardsExpanded(): Promise<boolean> {
        const cards = await this.page.locator('.qa-card').all();
        
        for (const card of cards) {
            const isOpen = await card.evaluate(el => el.classList.contains('open'));
            if (!isOpen) return false;
        }
        
        return true;
    }

    async areAllCardsCollapsed(): Promise<boolean> {
        const cards = await this.page.locator('.qa-card').all();
        
        for (const card of cards) {
            const isOpen = await card.evaluate(el => el.classList.contains('open'));
            if (isOpen) return false;
        }
        
        return true;
    }

    // ========================================
    // 语言切换
    // ========================================

    async getCurrentLanguage(): Promise<string> {
        const activeBtn = this.page.locator('.lang-btn.active');
        return await activeBtn.textContent() || '';
    }

    async switchLanguage(lang: string): Promise<void> {
        const langBtn = this.page.locator(`.lang-btn[data-lang="${lang}"]`);
        await langBtn.click();
        await this.wait(500);
    }

    async getAvailableLanguages(): Promise<string[]> {
        const langBtns = this.page.locator('.lang-btn');
        const langs: string[] = [];
        
        const count = await langBtns.count();
        for (let i = 0; i < count; i++) {
            const lang = await langBtns.nth(i).getAttribute('data-lang');
            if (lang) langs.push(lang);
        }
        
        return langs;
    }

    // ========================================
    // 分类筛选
    // ========================================

    async getCurrentCategory(): Promise<string> {
        const activeBtn = this.page.locator('.category-btn.active');
        return await activeBtn.textContent() || '';
    }

    async switchCategory(category: string): Promise<void> {
        const categoryBtn = this.page.locator(`.category-btn[data-category="${category}"]`);
        await categoryBtn.click();
        await this.wait(500);
    }

    async getAvailableCategories(): Promise<string[]> {
        const categoryBtns = this.page.locator('.category-btn');
        const categories: string[] = [];
        
        const count = await categoryBtns.count();
        for (let i = 0; i < count; i++) {
            const category = await categoryBtns.nth(i).getAttribute('data-category');
            if (category) categories.push(category);
        }
        
        return categories;
    }

    // ========================================
    // 导出功能
    // ========================================

    async exportJSON(): Promise<any> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.clickButton('[data-action="amz_qalab_exportJSON"]');
        return await downloadPromise;
    }

    async exportCSV(): Promise<any> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.clickButton('[data-action="amz_qalab_exportCSV"]');
        return await downloadPromise;
    }

    async exportText(): Promise<any> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.clickButton('[data-action="amz_qalab_exportText"]');
        return await downloadPromise;
    }

    // ========================================
    // 统计信息
    // ========================================

    async getTotalQACount(): Promise<number> {
        const countElement = this.page.locator('.total-qa-count');
        const text = await countElement.textContent() || '0';
        return parseInt(text.match(/\d+/)?.[0] || '0');
    }

    async getFilteredQACount(): Promise<number> {
        const countElement = this.page.locator('.filtered-qa-count');
        const text = await countElement.textContent() || '0';
        return parseInt(text.match(/\d+/)?.[0] || '0');
    }

    // ========================================
    // Toast 提示
    // ========================================

    async expectToast(message: string): Promise<void> {
        const toast = this.page.locator('.toast, .notification, [role="alert"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
        await expect(toast).toContainText(message);
    }

    async waitForToastDisappear(): Promise<void> {
        await this.page.waitForSelector('.toast, .notification, [role="alert"]', { 
            state: 'hidden',
            timeout: 5000 
        });
    }

    // ========================================
    // 辅助方法
    // ========================================

    async clickButton(selector: string): Promise<void> {
        const button = this.page.locator(selector);
        await button.click();
    }

    async wait(ms: number): Promise<void> {
        await this.page.waitForTimeout(ms);
    }

    async getValue(selector: string): Promise<string> {
        const element = this.page.locator(selector);
        return await element.inputValue();
    }

    async hover(selector: string): Promise<void> {
        const element = this.page.locator(selector);
        await element.hover();
    }
}
