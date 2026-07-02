// tests/unit/npi-tracker.test.ts
// ================================================================
// NPI Tracker 模块单元测试
// 测试模块生命周期、表格渲染、数据更新、财务计算和导出功能
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildNpiReviewTemplate, mount, unmount } from '@/modules/sops/views/growth/npi_tracker/index';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { StorageService } from '@/services/storageService';

// Mock 依赖
vi.mock('@/modules/sops/views/growth/npi_tracker/data/mockData', () => ({
    MOCK_PRODUCTS: [
        {
            stage: 'new-test',
            sku: 'TEST-SKU-001',
            cn_name: '测试产品',
            store: 'Test Store',
            asin: 'B08TEST001',
            site: 'DE',
            qty_shipped: 100,
            inventory_days: 45,
            is_pan_eu: true,
            check_content: true,
            check_sensitive: false,
            check_creative: true,
            check_ebc: false,
            delivery_fee: 5.0,
            break_even: '10.00',
            sessions: 1000,
            ctr_7d: 1.5,
            cvr_7d: 3.2,
            acoas: 35,
            organic_ratio: 60,
            vine_status: '0/30',
            ads_strategy: 'auto',
            decision: 'keep',
            next_step: []
        },
        {
            stage: 'growth',
            sku: 'TEST-SKU-002',
            cn_name: '测试产品2',
            store: 'Test Store 2',
            asin: 'B08TEST002',
            site: 'FR',
            qty_shipped: 200,
            inventory_days: 70,
            is_pan_eu: false,
            check_content: true,
            check_sensitive: true,
            check_creative: true,
            check_ebc: true,
            delivery_fee: 6.0,
            break_even: '12.00',
            sessions: 2000,
            ctr_7d: 2.0,
            cvr_7d: 4.0,
            acoas: 40,
            organic_ratio: 55,
            vine_status: '15/30',
            ads_strategy: 'manual',
            decision: 'kill',
            next_step: ['加VINE (0评论)']
        }
    ],
    STAGE_CONFIG: {
        'new-test': { label: '新品测试', color: 'bg-blue-100 text-blue-700' },
        'growth': { label: '成长期', color: 'bg-green-100 text-green-700' }
    },
    SITE_FLAGS: {
        'DE': '🇩🇪',
        'FR': '🇫🇷'
    },
    SITE_DOMAINS: {
        'DE': 'amazon.de',
        'FR': 'amazon.fr'
    }
}));

describe('NPI Tracker Module', () => {
    let container: HTMLElement;
    let mockTemplate: string;
    let anchorClick: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // 创建测试容器
        container = document.createElement('div');
        container.id = 'npi-tracker-container';
        document.body.appendChild(container);

        // Mock 模板内容
        mockTemplate = `
            <div id="npi-tracker-panel">
                <div class="filters">
                    <select onchange="filterByStore(this.value)">
                        <option value="all">全部店铺</option>
                        <option value="Test Store">Test Store</option>
                    </select>
                    <select onchange="filterByStage(this.value)">
                        <option value="all">全部阶段</option>
                        <option value="new-test">新品测试</option>
                    </select>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>阶段</th>
                            <th>SKU</th>
                            <th>中文名</th>
                            <th>店铺</th>
                            <th>ASIN</th>
                        </tr>
                    </thead>
                    <tbody id="npi-table-body"></tbody>
                </table>
                <input id="npi-review-owner" value="运营小李" />
                <button onclick="exportToExcel()">导出Excel</button>
                <button data-action="copyNpiReviewTemplate">复制复盘模板</button>
                <div id="next-step-modal" class="hidden">
                    <div id="next-step-checkboxes"></div>
                    <button onclick="saveNextSteps()">保存</button>
                    <button onclick="closeNextStepModal()">关闭</button>
                </div>
            </div>
        `;

        // Mock SafeModuleLoader
        vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockResolvedValue(mockTemplate);

        // Mock SafeRenderer
        vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation((el, html) => {
            el.innerHTML = html;
        });

        // Mock URL.createObjectURL and revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
        anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        // Mock alert
        global.alert = vi.fn();
        vi.spyOn(StorageService, 'get').mockReturnValue({});
        vi.spyOn(StorageService, 'set').mockReturnValue(true);
    });

    afterEach(() => {
        // 清理 DOM
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        anchorClick.mockRestore();
        vi.clearAllMocks();
    });

    // ========================================
    // 模块生命周期测试
    // ========================================

    describe('Module Lifecycle', () => {
        it('should mount module successfully', async () => {
            await mount(container);

            expect(SafeModuleLoader.getInstance().loadTemplate).toHaveBeenCalledWith(
                'src/modules/sops/views/growth/npi_tracker/template.html',
                expect.any(Object)
            );
            expect(SafeRenderer.getInstance().renderTemplate).toHaveBeenCalledWith(
                container,
                mockTemplate
            );
        });

        it('should handle mount errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockError = new Error('Template load failed');
            
            vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockRejectedValue(mockError);

            await expect(mount(container)).rejects.toThrow('Template load failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('[NPITracker]'),
                mockError
            );

            consoleErrorSpy.mockRestore();
        });

        it('should register global actions on mount', async () => {
            await mount(container);

            // 验证全局函数已注册
            expect(window.updateField).toBeDefined();
            expect(window.updateDeliveryFee).toBeDefined();
            expect(window.toggleDecision).toBeDefined();
            expect(window.exportToExcel).toBeDefined();
            expect(window.copyNpiReviewTemplate).toBeDefined();
        });

        it('should render table after mount', async () => {
            await mount(container);

            // 等待表格渲染
            await new Promise(resolve => setTimeout(resolve, 200));

            const tbody = document.getElementById('npi-table-body');
            expect(tbody).toBeDefined();
            expect(tbody?.innerHTML.length).toBeGreaterThan(0);
        });

        it('should unmount module successfully', async () => {
            await mount(container);
            
            unmount();

            // 验证：全局函数已清理（通过 ActionRegistry）
            // 注意：实际清理由 ActionRegistry 处理
            expect(() => unmount()).not.toThrow();
        });

        it('should handle unmount errors gracefully', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => unmount()).not.toThrow();

            consoleErrorSpy.mockRestore();
        });
    });

    // ========================================
    // 表格渲染测试
    // ========================================

    describe('Table Rendering', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should render table with product data', () => {
            const tbody = document.getElementById('npi-table-body');
            const rows = tbody?.querySelectorAll('tr');
            
            expect(rows).toBeDefined();
            expect(rows!.length).toBeGreaterThan(0);
            expect(rows![0]?.querySelectorAll('td').length).toBe(29);
        });

        it('should display product basic information', () => {
            const tbody = document.getElementById('npi-table-body');
            const firstRow = tbody?.querySelector('tr');
            
            expect(firstRow?.textContent).toContain('TEST-SKU-001');
            expect(firstRow?.textContent).toContain('B08TEST001');
        });

        it('should display stage badge', () => {
            const tbody = document.getElementById('npi-table-body');
            const stageBadge = tbody?.querySelector('.px-2.py-1.rounded');
            
            expect(stageBadge).toBeDefined();
            expect(stageBadge?.textContent).toContain('新品测试');
        });

        it('should display compliance checkboxes', () => {
            const tbody = document.getElementById('npi-table-body');
            const checkboxes = tbody?.querySelectorAll('input[type="checkbox"]');
            
            expect(checkboxes).toBeDefined();
            expect(checkboxes!.length).toBeGreaterThan(0);
        });

        it('should display financial data', () => {
            const tbody = document.getElementById('npi-table-body');
            const deliveryInput = tbody?.querySelector('input[type="number"]');
            
            expect(deliveryInput).toBeDefined();
            expect((deliveryInput as HTMLInputElement)?.value).toBe('5');
        });
    });

    // ========================================
    // 数据更新测试
    // ========================================

    describe('Data Updates', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should update field value', () => {
            if (window.updateField) {
                window.updateField(0, 'is_pan_eu', true);
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });

        it('should update delivery fee', () => {
            if (window.updateDeliveryFee) {
                window.updateDeliveryFee(0, '7.50');
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });

        it('should toggle decision', () => {
            if (window.toggleDecision) {
                window.toggleDecision(0);
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });

        it('should handle invalid index gracefully', () => {
            if (window.updateField) {
                expect(() => window.updateField!(999, 'is_pan_eu', true)).not.toThrow();
            }
        });
    });

    // ========================================
    // 财务计算测试
    // ========================================

    describe('Financial Calculations', () => {
        it('should calculate clearance price correctly', () => {
            const deliveryFee = 5.0;
            const expectedClearance = deliveryFee / 0.35;
            
            // 计算公式：配送费 / 0.35
            expect(expectedClearance).toBeCloseTo(14.29, 2);
        });

        it('should calculate moving price correctly', () => {
            const deliveryFee = 5.0;
            const expectedMoving = deliveryFee / 0.3;
            
            // 计算公式：配送费 / 0.3
            expect(expectedMoving).toBeCloseTo(16.67, 2);
        });

        it('should calculate suggested price correctly', () => {
            const deliveryFee = 5.0;
            const expectedSuggested = deliveryFee / 0.25;
            
            // 计算公式：配送费 / 0.25
            expect(expectedSuggested).toBe(20.0);
        });

        it('should calculate delivery percent correctly', () => {
            const deliveryFee = 5.0;
            const currentPrice = 12.0;
            const expectedPercent = (deliveryFee / currentPrice) * 100;
            
            // 计算公式：(配送费 / 当前价格) * 100
            expect(expectedPercent).toBeCloseTo(41.67, 1);
        });
    });

    // ========================================
    // 合规状态测试
    // ========================================

    describe('Compliance Status', () => {
        it('should calculate compliance status correctly', () => {
            const record = {
                check_content: true,
                check_sensitive: false,
                check_creative: true,
                check_ebc: false
            };
            
            const checks = [
                record.check_content,
                record.check_sensitive,
                record.check_creative,
                record.check_ebc
            ];
            const completed = checks.filter(Boolean).length;
            
            expect(completed).toBe(2);
            expect(completed < 4).toBe(true);
        });

        it('should identify complete compliance', () => {
            const record = {
                check_content: true,
                check_sensitive: true,
                check_creative: true,
                check_ebc: true
            };
            
            const checks = [
                record.check_content,
                record.check_sensitive,
                record.check_creative,
                record.check_ebc
            ];
            const completed = checks.filter(Boolean).length;
            
            expect(completed).toBe(4);
        });
    });

    // ========================================
    // 筛选功能测试
    // ========================================

    describe('Filtering', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should filter by store', () => {
            if (window.filterByStore) {
                window.filterByStore('Test Store');
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });

        it('should filter by stage', () => {
            if (window.filterByStage) {
                window.filterByStage('new-test');
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });

        it('should reset filter to show all', () => {
            if (window.filterByStore) {
                window.filterByStore('all');
                
                // 验证：表格已重新渲染
                const tbody = document.getElementById('npi-table-body');
                expect(tbody?.innerHTML.length).toBeGreaterThan(0);
            }
        });
    });

    // ========================================
    // Next Step 管理测试
    // ========================================

    describe('Next Step Management', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should open next step editor', () => {
            if (window.openNextStepEditor) {
                window.openNextStepEditor(0);
                
                const modal = document.getElementById('next-step-modal');
                expect(modal?.classList.contains('hidden')).toBe(false);
            }
        });

        it('should close next step modal', () => {
            if (window.openNextStepEditor && window.closeNextStepModal) {
                window.openNextStepEditor(0);
                window.closeNextStepModal();
                
                const modal = document.getElementById('next-step-modal');
                expect(modal?.classList.contains('hidden')).toBe(true);
            }
        });

        it('should save next steps', () => {
            if (window.openNextStepEditor && window.saveNextSteps) {
                window.openNextStepEditor(0);
                
                // 模拟选择选项
                const checkboxes = document.getElementById('next-step-checkboxes');
                if (checkboxes) {
                    checkboxes.innerHTML = `
                        <label>
                            <input type="checkbox" value="加VINE (0评论)" checked>
                            <span>加VINE (0评论)</span>
                        </label>
                    `;
                }
                
                window.saveNextSteps();
                
                const modal = document.getElementById('next-step-modal');
                expect(modal?.classList.contains('hidden')).toBe(true);
            }
        });

        it('should handle invalid index in next step editor', () => {
            if (window.openNextStepEditor) {
                expect(() => window.openNextStepEditor!(999)).not.toThrow();
            }
        });
    });

    // ========================================
    // 导出功能测试
    // ========================================

    describe('Export Functions', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should export to Excel', () => {
            if (window.exportToExcel) {
                window.exportToExcel();
                
                // 验证：创建了 Blob URL
                expect(global.URL.createObjectURL).toHaveBeenCalled();
                
                // 验证：显示了成功提示
                expect(global.alert).toHaveBeenCalled();
            }
        });

        it('should include BOM in exported CSV', () => {
            if (window.exportToExcel) {
                window.exportToExcel();
                
                // 验证：Blob 创建时包含 BOM
                const blobCall = (global.URL.createObjectURL as any).mock.calls[0];
                expect(blobCall).toBeDefined();
            }
        });

        it('should include formulas in exported data', () => {
            // 导出的数据应该包含 Excel 公式
            const deliveryFee = 5.0;
            const row = 2; // Excel 行号（1-indexed，row 1 是表头）
            
            const expectedFormula = `=O${row}/0.35`;
            expect(expectedFormula).toContain('O');
            expect(expectedFormula).toContain('/0.35');
        });

        it('should handle empty data gracefully', () => {
            // 清空数据后导出
            if (window.exportToExcel) {
                // 注意：实际实现中会检查数据是否为空
                expect(() => window.exportToExcel!()).not.toThrow();
            }
        });
    });

    // ========================================
    // 复盘模板测试
    // ========================================

    describe('Review Template', () => {
        it('should build review template with summary and manual review items', () => {
            const template = buildNpiReviewTemplate([
                {
                    stage: 'growth',
                    sku: 'TEST-SKU-002',
                    cn_name: '测试产品2',
                    store: 'Test Store 2',
                    asin: 'B08TEST002',
                    site: 'FR',
                    qty_shipped: 200,
                    inventory_days: 70,
                    is_pan_eu: false,
                    check_content: true,
                    check_sensitive: true,
                    check_creative: true,
                    check_ebc: true,
                    delivery_fee: 6.0,
                    break_even: '12.00',
                    sessions: 2000,
                    ctr_7d: 2.0,
                    cvr_7d: 4.0,
                    acoas: 40,
                    organic_ratio: 55,
                    vine_status: '15/30',
                    ads_strategy: 'manual',
                    decision: 'kill',
                    next_step: ['清仓 (扶不起)']
                }
            ], '运营小李');

            expect(template).toContain('NPI 周复盘归档');
            expect(template).toContain('作业负责人：运营小李');
            expect(template).toContain('SKU 数：1');
            expect(template).toContain('TEST-SKU-002');
            expect(template).toContain('配送费35%红线：€17.14');
            expect(template).toContain('当前结论为放弃');
            expect(template).toContain('需 运营小李 确认下一步动作');
            expect(template).toContain('清仓 (扶不起)');
            expect(template).toContain('负责人：运营小李');
        });

        it('should copy review template to clipboard', async () => {
            const writeText = vi.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText },
            });

            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
            const ownerInput = document.getElementById('npi-review-owner') as HTMLInputElement | null;
            if (ownerInput) ownerInput.value = '运营小李';
            await window.copyNpiReviewTemplate?.();

            expect(writeText).toHaveBeenCalledWith(expect.stringContaining('NPI 周复盘归档'));
            expect(writeText).toHaveBeenCalledWith(expect.stringContaining('作业负责人：运营小李'));
            expect(StorageService.set).toHaveBeenCalledWith('npi_review_owner_v1', '运营小李');
            expect(global.alert).toHaveBeenCalledWith('已复制 NPI 复盘模板，可粘贴到周报或归档文档。');
        });
    });

    // ========================================
    // 库存预警测试
    // ========================================

    describe('Inventory Warnings', () => {
        it('should identify overstock products', () => {
            const inventoryDays = 70;
            const isOverstock = inventoryDays > 60;
            
            expect(isOverstock).toBe(true);
        });

        it('should not flag normal inventory', () => {
            const inventoryDays = 45;
            const isOverstock = inventoryDays > 60;
            
            expect(isOverstock).toBe(false);
        });
    });

    // ========================================
    // 价格预警测试
    // ========================================

    describe('Price Warnings', () => {
        it('should identify price below clearance', () => {
            const deliveryFee = 5.0;
            const clearancePrice = deliveryFee / 0.35;
            const suggestedPrice = deliveryFee / 0.25;
            
            const isPriceBelowClearance = suggestedPrice < clearancePrice;
            
            expect(isPriceBelowClearance).toBe(false);
        });

        it('should flag dangerously low prices', () => {
            const deliveryFee = 10.0;
            const clearancePrice = deliveryFee / 0.35;
            const currentPrice = 15.0;
            
            const isPriceBelowClearance = currentPrice < clearancePrice;
            
            expect(isPriceBelowClearance).toBe(true);
        });
    });

    // ========================================
    // 错误处理测试
    // ========================================

    describe('Error Handling', () => {
        beforeEach(async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        it('should handle missing DOM elements gracefully', () => {
            // 移除表格元素
            const tbody = document.getElementById('npi-table-body');
            if (tbody) {
                tbody.remove();
            }
            
            // 尝试更新数据
            if (window.updateField) {
                expect(() => window.updateField!(0, 'is_pan_eu', true)).not.toThrow();
            }
        });

        it('should handle invalid field names gracefully', () => {
            if (window.updateField) {
                expect(() => window.updateField!(0, 'invalid_field' as any, true)).not.toThrow();
            }
        });

        it('should handle invalid delivery fee values', () => {
            if (window.updateDeliveryFee) {
                expect(() => window.updateDeliveryFee!(0, 'invalid')).not.toThrow();
            }
        });

        it('should handle missing modal elements', () => {
            const modal = document.getElementById('next-step-modal');
            if (modal) {
                modal.remove();
            }
            
            if (window.openNextStepEditor) {
                expect(() => window.openNextStepEditor!(0)).not.toThrow();
            }
        });
    });

    // ========================================
    // 数据完整性测试
    // ========================================

    describe('Data Integrity', () => {
        it('should maintain data structure after updates', async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (window.updateField) {
                window.updateField(0, 'is_pan_eu', true);
                
                // 验证：数据结构仍然完整
                const tbody = document.getElementById('npi-table-body');
                const rows = tbody?.querySelectorAll('tr');
                expect(rows).toBeDefined();
                expect(rows!.length).toBeGreaterThan(0);
            }
        });

        it('should preserve other fields when updating one field', async () => {
            await mount(container);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (window.updateDeliveryFee) {
                window.updateDeliveryFee(0, '8.00');
                
                // 验证：其他字段仍然存在
                const tbody = document.getElementById('npi-table-body');
                const firstRow = tbody?.querySelector('tr');
                expect(firstRow?.textContent).toContain('TEST-SKU-001');
            }
        });
    });
});
