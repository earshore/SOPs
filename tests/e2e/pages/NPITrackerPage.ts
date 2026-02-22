// tests/e2e/pages/NPITrackerPage.ts
// ================================================================
// NPI Tracker 页面对象
// 封装 NPI Tracker 页面的元素和操作
// ================================================================

import { Page, expect } from '@playwright/test';
import { BasePage } from '../../helpers/BasePage';

export class NPITrackerPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    // ========================================
    // 导航
    // ========================================

    async navigate(): Promise<void> {
        await this.page.goto('/app_center/sops_npi_tracker');
        await this.page.waitForLoadState('networkidle');
        await this.wait(500);
    }

    // ========================================
    // 表格操作
    // ========================================

    async getTableRowCount(): Promise<number> {
        const rows = this.page.locator('#npi-table-body tr');
        return await rows.count();
    }

    async getVisibleRowCount(): Promise<number> {
        const rows = this.page.locator('#npi-table-body tr:visible');
        return await rows.count();
    }

    async getRowData(index: number): Promise<{
        stage: string;
        sku: string;
        cnName: string;
        store: string;
        asin: string;
        site: string;
    }> {
        const row = this.page.locator('#npi-table-body tr').nth(index);
        
        return {
            stage: await row.locator('td').nth(0).textContent() || '',
            sku: await row.locator('td').nth(1).textContent() || '',
            cnName: await row.locator('td').nth(2).textContent() || '',
            store: await row.locator('td').nth(3).textContent() || '',
            asin: await row.locator('td').nth(4).textContent() || '',
            site: await row.locator('td').nth(5).textContent() || ''
        };
    }

    // ========================================
    // 筛选功能
    // ========================================

    async filterByStore(store: string): Promise<void> {
        const select = this.page.locator('select[onchange*="filterByStore"]');
        await select.selectOption(store);
        await this.wait(500);
    }

    async filterByStage(stage: string): Promise<void> {
        const select = this.page.locator('select[onchange*="filterByStage"]');
        await select.selectOption(stage);
        await this.wait(500);
    }

    async getAvailableStores(): Promise<string[]> {
        const select = this.page.locator('select[onchange*="filterByStore"]');
        const options = await select.locator('option').allTextContents();
        return options.filter(opt => opt.trim() !== '');
    }

    async getAvailableStages(): Promise<string[]> {
        const select = this.page.locator('select[onchange*="filterByStage"]');
        const options = await select.locator('option').allTextContents();
        return options.filter(opt => opt.trim() !== '');
    }

    // ========================================
    // SOP 合规检查
    // ========================================

    async togglePanEU(rowIndex: number): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const checkbox = row.locator('input[type="checkbox"]').first();
        await checkbox.click();
        await this.wait(300);
    }

    async toggleComplianceCheck(rowIndex: number, checkType: 'content' | 'sensitive' | 'creative' | 'ebc'): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const checkboxIndex = {
            'content': 1,
            'sensitive': 2,
            'creative': 3,
            'ebc': 4
        }[checkType];
        
        const checkbox = row.locator('input[type="checkbox"]').nth(checkboxIndex);
        await checkbox.click();
        await this.wait(300);
    }

    async getComplianceStatus(rowIndex: number): Promise<string> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const statusCell = row.locator('td').nth(13); // SOP合规状态列
        return await statusCell.textContent() || '';
    }

    async isComplianceComplete(rowIndex: number): Promise<boolean> {
        const status = await this.getComplianceStatus(rowIndex);
        return status.includes('✓') || status.includes('check-circle');
    }

    // ========================================
    // 财务模型
    // ========================================

    async updateDeliveryFee(rowIndex: number, value: string): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const input = row.locator('input[type="number"]').first();
        await input.fill(value);
        await input.blur();
        await this.wait(500);
    }

    async getDeliveryFee(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const input = row.locator('input[type="number"]').first();
        const value = await input.inputValue();
        return parseFloat(value) || 0;
    }

    async getClearancePrice(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const cell = row.locator('td').nth(16); // 清仓红线列
        const text = await cell.textContent() || '0';
        return parseFloat(text.replace(/[^0-9.]/g, ''));
    }

    async getMovingPrice(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const cell = row.locator('td').nth(17); // 动销价格列
        const text = await cell.textContent() || '0';
        return parseFloat(text.replace(/[^0-9.]/g, ''));
    }

    async getSuggestedPrice(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const cell = row.locator('td').nth(18); // 建议售价列
        const text = await cell.textContent() || '0';
        return parseFloat(text.replace(/[^0-9.]/g, ''));
    }

    async getDeliveryPercent(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const cell = row.locator('td').nth(15); // 配送占比列
        const text = await cell.textContent() || '0';
        return parseFloat(text.replace(/[^0-9.]/g, ''));
    }

    // ========================================
    // 决策操作
    // ========================================

    async toggleDecision(rowIndex: number): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const button = row.locator('button[onclick*="toggleDecision"]');
        await button.click();
        await this.wait(300);
    }

    async getDecision(rowIndex: number): Promise<'keep' | 'kill'> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const button = row.locator('button[onclick*="toggleDecision"]');
        const text = await button.textContent() || '';
        return text.includes('保留') ? 'keep' : 'kill';
    }

    async updateAdsStrategy(rowIndex: number, strategy: 'auto' | 'manual' | 'mixed'): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const select = row.locator('select[onchange*="ads_strategy"]');
        await select.selectOption(strategy);
        await this.wait(300);
    }

    async getAdsStrategy(rowIndex: number): Promise<string> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const select = row.locator('select[onchange*="ads_strategy"]');
        return await select.inputValue();
    }

    // ========================================
    // Next Step 操作
    // ========================================

    async openNextStepEditor(rowIndex: number): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const button = row.locator('button[onclick*="openNextStepEditor"]');
        await button.click();
        await this.wait(500);
    }

    async isNextStepModalVisible(): Promise<boolean> {
        const modal = this.page.locator('#next-step-modal');
        return await modal.isVisible();
    }

    async selectNextStepOption(option: string): Promise<void> {
        const checkbox = this.page.locator(`#next-step-checkboxes input[value="${option}"]`);
        await checkbox.check();
        await this.wait(200);
    }

    async unselectNextStepOption(option: string): Promise<void> {
        const checkbox = this.page.locator(`#next-step-checkboxes input[value="${option}"]`);
        await checkbox.uncheck();
        await this.wait(200);
    }

    async saveNextSteps(): Promise<void> {
        const button = this.page.locator('button[onclick*="saveNextSteps"]');
        await button.click();
        await this.wait(500);
    }

    async closeNextStepModal(): Promise<void> {
        const button = this.page.locator('button[onclick*="closeNextStepModal"]');
        await button.click();
        await this.wait(300);
    }

    async getNextSteps(rowIndex: number): Promise<string[]> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const nextStepCell = row.locator('td').last();
        const badges = await nextStepCell.locator('span.px-2').allTextContents();
        return badges.map(b => b.trim()).filter(b => b !== '+');
    }

    // ========================================
    // 导出功能
    // ========================================

    async exportToExcel(): Promise<any> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.page.locator('button[onclick*="exportToExcel"]').click();
        return await downloadPromise;
    }

    // ========================================
    // 流量转化数据
    // ========================================

    async getTrafficData(rowIndex: number): Promise<{
        sessions: number;
        ctr: number;
        cvr: number;
        acoas: number;
        organicRatio: number;
    }> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        
        return {
            sessions: parseInt(await row.locator('td').nth(20).textContent() || '0'),
            ctr: parseFloat(await row.locator('td').nth(21).textContent() || '0'),
            cvr: parseFloat(await row.locator('td').nth(22).textContent() || '0'),
            acoas: parseFloat(await row.locator('td').nth(23).textContent() || '0'),
            organicRatio: parseFloat(await row.locator('td').nth(24).textContent() || '0')
        };
    }

    // ========================================
    // 库存数据
    // ========================================

    async getInventoryDays(rowIndex: number): Promise<number> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const cell = row.locator('td').nth(7); // 库存周转天数列
        const text = await cell.textContent() || '0';
        return parseInt(text.replace(/[^0-9]/g, ''));
    }

    async isOverstock(rowIndex: number): Promise<boolean> {
        const days = await this.getInventoryDays(rowIndex);
        return days > 60;
    }

    // ========================================
    // ASIN 链接点击
    // ========================================

    async clickASINLink(rowIndex: number): Promise<void> {
        const row = this.page.locator('#npi-table-body tr').nth(rowIndex);
        const link = row.locator('a[href*="/dp/"]');
        await link.click();
    }

    // ========================================
    // 辅助方法
    // ========================================

    async wait(ms: number): Promise<void> {
        await this.page.waitForTimeout(ms);
    }

    async expectToast(message: string): Promise<void> {
        const toast = this.page.locator('.toast, .notification, [role="alert"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
        await expect(toast).toContainText(message);
    }

    async waitForTableUpdate(): Promise<void> {
        await this.wait(500);
    }
}
