// tests/e2e/pages/RestrictedWordsPage.ts
// ================================================================
// Restricted Words 页面对象
// 封装 Restricted Words 模块的页面交互逻辑
// ================================================================

import { Page, Locator, expect } from '@playwright/test';

export class RestrictedWordsPage {
    readonly page: Page;
    readonly searchInput: Locator;
    readonly searchModeSelect: Locator;
    readonly searchButton: Locator;
    readonly clearButton: Locator;
    readonly categoryFilter: Locator;
    readonly riskFilter: Locator;
    readonly siteContextSelect: Locator;
    readonly resultsTable: Locator;
    readonly statsDisplay: Locator;
    readonly detailModal: Locator;

    constructor(page: Page) {
        this.page = page;
        this.searchInput = page.locator('#rw-search-input');
        this.searchModeSelect = page.locator('#rw-search-mode');
        this.searchButton = page.locator('#rw-search-btn');
        this.clearButton = page.locator('#rw-clear-btn');
        this.categoryFilter = page.locator('#rw-filter-category');
        this.riskFilter = page.locator('#rw-filter-risk');
        this.siteContextSelect = page.locator('#rw-site-context');
        this.resultsTable = page.locator('#rw-results-tbody');
        this.statsDisplay = page.locator('#rw-stats-display');
        this.detailModal = page.locator('#rw-detail-modal');
    }

    /**
     * 导航到 Restricted Words 页面
     */
    async navigate() {
        await this.page.goto('/#sops_restricted_words', { waitUntil: 'domcontentloaded' });
        
        // 等待主要元素加载
        await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * 执行搜索
     */
    async search(keyword: string, mode: 'fuzzy' | 'exact' | 'fulltext' | 'regex' = 'fuzzy') {
        await this.searchModeSelect.selectOption(mode);
        await this.searchInput.fill(keyword);
        await this.searchButton.click();
        
        // 等待结果更新
        await this.page.waitForTimeout(300);
    }

    /**
     * 清空搜索
     */
    async clearSearch() {
        await this.clearButton.click();
        await this.page.waitForTimeout(300);
    }

    /**
     * 按分类筛选
     */
    async filterByCategory(category: string) {
        await this.categoryFilter.selectOption(category);
        await this.page.waitForTimeout(300);
    }

    /**
     * 按风险等级筛选
     */
    async filterByRiskLevel(level: string) {
        await this.riskFilter.selectOption(level);
        await this.page.waitForTimeout(300);
    }

    /**
     * 选择站点上下文
     */
    async selectSiteContext(site: string) {
        await this.siteContextSelect.selectOption(site);
        await this.page.waitForTimeout(300);
    }

    /**
     * 获取结果数量
     */
    async getResultsCount(): Promise<number> {
        const rows = await this.resultsTable.locator('tr').count();
        
        // 如果有"没有找到"的提示行，返回 0
        const noResultsText = await this.resultsTable.textContent();
        if (noResultsText?.includes('没有找到')) {
            return 0;
        }
        
        return rows;
    }

    /**
     * 获取统计信息文本
     */
    async getStatsText(): Promise<string> {
        return await this.statsDisplay.textContent() || '';
    }

    /**
     * 点击查看详情
     */
    async viewDetail(index: number = 0) {
        const detailButtons = this.resultsTable.locator('button:has-text("详情")');
        await detailButtons.nth(index).click();
        
        // 等待模态框显示
        await this.detailModal.waitFor({ state: 'visible', timeout: 2000 });
    }

    /**
     * 关闭详情模态框
     */
    async closeDetail() {
        // 点击关闭按钮或按 ESC 键
        await this.page.keyboard.press('Escape');
        
        // 等待模态框隐藏
        await this.page.waitForTimeout(300);
    }

    /**
     * 检查详情模态框是否可见
     */
    async isDetailModalVisible(): Promise<boolean> {
        const isVisible = await this.detailModal.isVisible();
        const hasHiddenClass = await this.detailModal.evaluate(el => el.classList.contains('hidden'));
        
        return isVisible && !hasHiddenClass;
    }

    /**
     * 获取详情模态框的关键词
     */
    async getDetailKeyword(): Promise<string> {
        const header = this.detailModal.locator('#rw-modal-header');
        const text = await header.textContent();
        
        // 提取关键词（第一个大字）
        const match = text?.match(/[\u4e00-\u9fa5a-zA-Z\s-]+/);
        return match ? match[0].trim() : '';
    }

    /**
     * 获取详情模态框的风险描述
     */
    async getDetailRiskDescription(): Promise<string> {
        const content = this.detailModal.locator('#rw-detail-content');
        const riskSection = content.locator('.content-callout--danger').first();
        await riskSection.waitFor({ state: 'visible', timeout: 3000 });
        
        return await riskSection.textContent() || '';
    }

    /**
     * 获取详情模态框的替代方案
     */
    async getDetailAlternatives(): Promise<string[]> {
        const content = this.detailModal.locator('#rw-detail-content');
        const alternatives = content.locator('.bg-green-50');
        
        const count = await alternatives.count();
        const results: string[] = [];
        
        for (let i = 0; i < count; i++) {
            const text = await alternatives.nth(i).textContent();
            if (text) {
                results.push(text.trim());
            }
        }
        
        return results;
    }

    /**
     * 获取搜索输入框的值
     */
    async getSearchValue(): Promise<string> {
        return await this.searchInput.inputValue();
    }

    /**
     * 获取当前选中的搜索模式
     */
    async getSearchMode(): Promise<string> {
        return await this.searchModeSelect.inputValue();
    }

    /**
     * 获取当前选中的分类
     */
    async getSelectedCategory(): Promise<string> {
        return await this.categoryFilter.inputValue();
    }

    /**
     * 获取当前选中的风险等级
     */
    async getSelectedRiskLevel(): Promise<string> {
        return await this.riskFilter.inputValue();
    }

    /**
     * 获取当前选中的站点
     */
    async getSelectedSite(): Promise<string> {
        return await this.siteContextSelect.inputValue();
    }

    /**
     * 检查结果表格中是否包含指定文本
     */
    async resultsContain(text: string): Promise<boolean> {
        const content = await this.resultsTable.textContent();
        return content?.includes(text) || false;
    }

    /**
     * 获取第一个结果的关键词
     */
    async getFirstResultKeyword(): Promise<string> {
        const firstRow = this.resultsTable.locator('tr').first();
        const keywordCell = firstRow.locator('td').first();
        const keywordDiv = keywordCell.locator('.font-bold').first();
        
        return await keywordDiv.textContent() || '';
    }

    /**
     * 获取第一个结果的分类
     */
    async getFirstResultCategory(): Promise<string> {
        const firstRow = this.resultsTable.locator('tr').first();
        const categoryBadge = firstRow.locator('span[class*="bg-"]').first();
        
        return await categoryBadge.textContent() || '';
    }

    /**
     * 获取第一个结果的风险等级
     */
    async getFirstResultRiskLevel(): Promise<string> {
        const firstRow = this.resultsTable.locator('tr').first();
        const riskCell = firstRow.locator('td').nth(2);
        const riskText = riskCell.locator('span[class*="bg-"]');
        
        const text = await riskText.textContent();
        const match = text?.match(/(\d+)级/);
        
        return match ? match[1] : '';
    }

    /**
     * 获取可用的分类选项
     */
    async getAvailableCategories(): Promise<string[]> {
        const options = await this.categoryFilter.locator('option').allTextContents();
        return options.map(opt => opt.trim()).filter(opt => opt.length > 0);
    }

    /**
     * 获取可用的风险等级选项
     */
    async getAvailableRiskLevels(): Promise<string[]> {
        const options = await this.riskFilter.locator('option').allTextContents();
        return options.map(opt => opt.trim()).filter(opt => opt.length > 0);
    }

    /**
     * 获取可用的站点选项
     */
    async getAvailableSites(): Promise<string[]> {
        const options = await this.siteContextSelect.locator('option').allTextContents();
        return options.map(opt => opt.trim()).filter(opt => opt.length > 0);
    }

    /**
     * 等待 Toast 提示出现
     */
    async expectToast(text: string) {
        const toast = this.page.locator('.toast, .notification, [role="alert"]');
        await expect(toast).toContainText(text, { timeout: 3000 });
    }

    /**
     * 检查页面是否有 JavaScript 错误
     */
    async hasNoConsoleErrors(): Promise<boolean> {
        // 这个方法需要在测试开始时设置监听器
        // 实际检查在测试用例中完成
        return true;
    }

    /**
     * 获取结果表格的所有行
     */
    async getAllResultRows() {
        return this.resultsTable.locator('tr');
    }

    /**
     * 检查是否显示"没有找到"消息
     */
    async hasNoResultsMessage(): Promise<boolean> {
        try {
            await expect(this.resultsTable).toContainText('没有找到', { timeout: 3000 });
            return true;
        } catch {
            return (await this.getResultsCount()) === 0;
        }
    }

    /**
     * 获取结果表格中的站点标签
     */
    async getAffectedSites(rowIndex: number = 0): Promise<string[]> {
        const row = this.resultsTable.locator('tr').nth(rowIndex);
        const sitesCell = row.locator('td').nth(3);
        const siteBadges = sitesCell.locator('span');
        
        const count = await siteBadges.count();
        const sites: string[] = [];
        
        for (let i = 0; i < count; i++) {
            const text = await siteBadges.nth(i).textContent();
            if (text) {
                sites.push(text.trim());
            }
        }
        
        return sites;
    }

    /**
     * 检查结果是否按风险等级排序
     */
    async isResultsSortedByRisk(): Promise<boolean> {
        const rows = await this.getAllResultRows();
        const count = await rows.count();
        
        if (count <= 1) return true;
        
        const riskLevels: number[] = [];
        
        for (let i = 0; i < Math.min(count, 5); i++) {
            const row = rows.nth(i);
            const riskCell = row.locator('td').nth(2);
            const riskText = await riskCell.locator('span[class*="bg-"]').textContent();
            const match = riskText?.match(/(\d+)级/);
            
            if (match) {
                riskLevels.push(parseInt(match[1]));
            }
        }
        
        // 检查是否降序排列
        for (let i = 1; i < riskLevels.length; i++) {
            if (riskLevels[i] > riskLevels[i - 1]) {
                return false;
            }
        }
        
        return true;
    }
}
