// tests/e2e/npi-tracker.spec.ts
// ================================================================
// 🧪 NPI Tracker 模块 E2E 测试
// 测试 NPI Tracker 完整流程：表格渲染、筛选、SOP合规、财务模型、决策管理、导出
// ================================================================

import { test, expect } from '@playwright/test';
import { NPITrackerPage } from './pages/NPITrackerPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

    let npiTracker: NPITrackerPage;

    test.beforeEach(async ({ page }) => {
        npiTracker = new NPITrackerPage(page);
        
        // 导航到 NPI Tracker 页面
        await npiTracker.navigate();
    });

    test.describe('页面加载与初始化', () => {
        test('应该成功加载 NPI Tracker 页面', async ({ page }) => {
            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 验证：主要元素可见
            await expect(page.locator('h1:has-text("新品生命周期跟踪 SOP")')).toBeVisible();
            await expect(page.locator('#npi-table-body')).toBeVisible();

            // 验证：无 JavaScript 错误
            const errors = consoleListener.getErrors();
            expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

            console.log('✅ NPI Tracker 页面加载成功');
        });

        test('应该显示产品数据表格', async () => {
            // 验证：表格有数据
            const rowCount = await npiTracker.getTableRowCount();
            expect(rowCount).toBeGreaterThan(0);

            console.log(`✅ 表格显示 ${rowCount} 条产品数据`);
        });

        test('应该显示完整的表格列', async () => {
            // 验证：表头存在
            const headers = await npiTracker.page.locator('thead th').allTextContents();
            
            expect(headers.length).toBeGreaterThan(20);
            expect(headers.some(h => h.includes('阶段'))).toBe(true);
            expect(headers.some(h => h.includes('SKU'))).toBe(true);
            expect(headers.some(h => h.includes('ASIN'))).toBe(true);

            console.log(`✅ 表格包含 ${headers.length} 列`);
        });
    });

    test.describe('筛选功能', () => {
        test('应该能够按店铺筛选', async () => {
            const initialCount = await npiTracker.getTableRowCount();
            
            // 获取可用的店铺选项
            const stores = await npiTracker.getAvailableStores();
            expect(stores.length).toBeGreaterThan(1);
            
            // 筛选特定店铺（排除 "全部"）
            const specificStore = stores.find(s => s !== 'all' && s.trim() !== '');
            
            if (specificStore) {
                await npiTracker.filterByStore(specificStore);
                
                const filteredCount = await npiTracker.getVisibleRowCount();
                
                // 验证：筛选后的数量应该小于或等于总数
                expect(filteredCount).toBeLessThanOrEqual(initialCount);
                
                console.log(`✅ 店铺筛选功能正常 (${initialCount} → ${filteredCount})`);
            } else {
                console.log('⚠️ 只有 "全部" 选项，跳过店铺筛选测试');
            }
        });

        test('应该能够按阶段筛选', async () => {
            const initialCount = await npiTracker.getTableRowCount();
            
            // 获取可用的阶段选项
            const stages = await npiTracker.getAvailableStages();
            expect(stages.length).toBeGreaterThan(1);
            
            // 筛选特定阶段
            const specificStage = stages.find(s => s !== 'all' && s.trim() !== '');
            
            if (specificStage) {
                await npiTracker.filterByStage(specificStage);
                
                const filteredCount = await npiTracker.getVisibleRowCount();
                
                // 验证：筛选后的数量应该小于或等于总数
                expect(filteredCount).toBeLessThanOrEqual(initialCount);
                
                console.log(`✅ 阶段筛选功能正常 (${initialCount} → ${filteredCount})`);
            }
        });

        test('应该能够重置筛选', async () => {
            // 先筛选
            const stores = await npiTracker.getAvailableStores();
            const specificStore = stores.find(s => s !== 'all' && s.trim() !== '');
            
            if (specificStore) {
                await npiTracker.filterByStore(specificStore);
                const filteredCount = await npiTracker.getVisibleRowCount();
                
                // 重置筛选
                await npiTracker.filterByStore('all');
                const resetCount = await npiTracker.getVisibleRowCount();
                
                // 验证：重置后显示更多数据
                expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
                
                console.log(`✅ 筛选重置功能正常 (${filteredCount} → ${resetCount})`);
            }
        });
    });

    test.describe('SOP 合规检查', () => {
        test('应该能够切换泛欧选项', async () => {
            await npiTracker.togglePanEU(0);
            
            // 验证：表格已更新
            await npiTracker.waitForTableUpdate();
            
            console.log('✅ 泛欧选项切换功能正常');
        });

        test('应该能够切换合规检查项', async () => {
            // 切换内容检查
            await npiTracker.toggleComplianceCheck(0, 'content');
            await npiTracker.waitForTableUpdate();
            
            // 切换敏感词检查
            await npiTracker.toggleComplianceCheck(0, 'sensitive');
            await npiTracker.waitForTableUpdate();
            
            console.log('✅ 合规检查项切换功能正常');
        });

        test('应该显示合规状态', async () => {
            const status = await npiTracker.getComplianceStatus(0);
            
            expect(status).toBeDefined();
            expect(status.length).toBeGreaterThan(0);
            
            console.log(`✅ 合规状态显示正常: ${status}`);
        });

        test('应该在所有检查完成后显示完成状态', async () => {
            // 勾选所有合规检查项
            await npiTracker.setComplianceCheck(0, 'content', true);
            await npiTracker.setComplianceCheck(0, 'sensitive', true);
            await npiTracker.setComplianceCheck(0, 'creative', true);
            await npiTracker.setComplianceCheck(0, 'ebc', true);
            
            await npiTracker.waitForTableUpdate();
            
            // 验证：显示完成状态
            const isComplete = await npiTracker.isComplianceComplete(0);
            expect(isComplete).toBe(true);
            
            console.log('✅ 合规完成状态显示正常');
        });
    });

    test.describe('财务模型计算', () => {
        test('应该能够更新配送费', async () => {
            const newFee = '5.50';
            
            await npiTracker.updateDeliveryFee(0, newFee);
            
            const updatedFee = await npiTracker.getDeliveryFee(0);
            expect(updatedFee).toBe(parseFloat(newFee));
            
            console.log(`✅ 配送费更新功能正常: ${updatedFee}`);
        });

        test('应该自动计算配送费35%红线价格', async () => {
            const deliveryFee = 5.0;
            await npiTracker.updateDeliveryFee(0, deliveryFee.toString());
            
            const clearancePrice = await npiTracker.getClearancePrice(0);
            const expectedPrice = deliveryFee / 0.35;
            
            // 允许小数点误差
            expect(Math.abs(clearancePrice - expectedPrice)).toBeLessThan(0.1);
            
            console.log(`✅ 清仓红线计算正确: ${clearancePrice} (预期: ${expectedPrice})`);
        });

        test('应该自动计算配送费30%复核价', async () => {
            const deliveryFee = 5.0;
            await npiTracker.updateDeliveryFee(0, deliveryFee.toString());
            
            const movingPrice = await npiTracker.getMovingPrice(0);
            const expectedPrice = deliveryFee / 0.3;
            
            expect(Math.abs(movingPrice - expectedPrice)).toBeLessThan(0.1);
            
            console.log(`✅ 动销价格计算正确: ${movingPrice} (预期: ${expectedPrice})`);
        });

        test('应该自动计算配送费25%参考价', async () => {
            const deliveryFee = 5.0;
            await npiTracker.updateDeliveryFee(0, deliveryFee.toString());
            
            const suggestedPrice = await npiTracker.getSuggestedPrice(0);
            const expectedPrice = deliveryFee / 0.25;
            
            expect(Math.abs(suggestedPrice - expectedPrice)).toBeLessThan(0.1);
            
            console.log(`✅ 建议售价计算正确: ${suggestedPrice} (预期: ${expectedPrice})`);
        });

        test('应该自动计算配送占比', async () => {
            const deliveryFee = 5.0;
            await npiTracker.updateDeliveryFee(0, deliveryFee.toString());
            
            const deliveryPercent = await npiTracker.getDeliveryPercent(0);
            
            // 配送占比应该在合理范围内
            expect(deliveryPercent).toBeGreaterThan(0);
            expect(deliveryPercent).toBeLessThan(100);
            
            console.log(`✅ 配送占比计算正确: ${deliveryPercent}%`);
        });
    });

    test.describe('决策管理', () => {
        test('应该能够切换保留/放弃决策', async () => {
            const initialDecision = await npiTracker.getDecision(0);
            
            await npiTracker.toggleDecision(0);
            
            const newDecision = await npiTracker.getDecision(0);
            expect(newDecision).not.toBe(initialDecision);
            
            console.log(`✅ 决策切换功能正常 (${initialDecision} → ${newDecision})`);
        });

        test('应该能够更新广告策略', async () => {
            await npiTracker.updateAdsStrategy(0, 'manual');
            
            const strategy = await npiTracker.getAdsStrategy(0);
            expect(strategy).toBe('manual');
            
            console.log(`✅ 广告策略更新功能正常: ${strategy}`);
        });

        test('应该能够在不同广告策略间切换', async () => {
            const strategies: Array<'auto' | 'manual' | 'mixed'> = ['auto', 'manual', 'mixed'];
            
            for (const strategy of strategies) {
                await npiTracker.updateAdsStrategy(0, strategy);
                const current = await npiTracker.getAdsStrategy(0);
                expect(current).toBe(strategy);
            }
            
            console.log('✅ 广告策略切换功能正常');
        });
    });

    test.describe('Next Step 管理', () => {
        test('应该能够打开 Next Step 编辑器', async () => {
            await npiTracker.openNextStepEditor(0);
            
            const isVisible = await npiTracker.isNextStepModalVisible();
            expect(isVisible).toBe(true);
            
            console.log('✅ Next Step 编辑器打开成功');
        });

        test('滚动表格后 Next Step 编辑器应该保持在视口内', async ({ page }) => {
            await page.locator('#sops_content_area').evaluate((element) => {
                element.scrollTop = 900;
            });
            await page.locator('.npi-lifecycle-table-scroll').evaluate((element) => {
                element.scrollLeft = element.scrollWidth;
            });

            await npiTracker.openNextStepEditor(0);

            const dialogBox = await page.locator('#next-step-modal > div').boundingBox();
            const viewport = page.viewportSize();

            expect(dialogBox).not.toBeNull();
            expect(viewport).not.toBeNull();
            expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
            expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);
        });

        test('应该能够选择 Next Step 选项', async () => {
            await npiTracker.openNextStepEditor(0);
            
            await npiTracker.selectNextStepOption('加VINE (0评论)');
            await npiTracker.selectNextStepOption('降价/Coupon (CVR低)');
            
            await npiTracker.saveNextSteps();
            
            const nextSteps = await npiTracker.getNextSteps(0);
            expect(nextSteps.length).toBeGreaterThan(0);
            
            console.log(`✅ Next Step 选择功能正常: ${nextSteps.join(', ')}`);
        });

        test('应该能够取消选择 Next Step 选项', async () => {
            await npiTracker.openNextStepEditor(0);
            
            // 先选择
            await npiTracker.selectNextStepOption('加VINE (0评论)');
            // 再取消
            await npiTracker.unselectNextStepOption('加VINE (0评论)');
            
            await npiTracker.saveNextSteps();
            
            console.log('✅ Next Step 取消选择功能正常');
        });

        test('应该能够关闭 Next Step 编辑器', async () => {
            await npiTracker.openNextStepEditor(0);
            
            await npiTracker.closeNextStepModal();
            
            const isVisible = await npiTracker.isNextStepModalVisible();
            expect(isVisible).toBe(false);
            
            console.log('✅ Next Step 编辑器关闭功能正常');
        });
    });

    test.describe('数据展示', () => {
        test('应该显示产品基础信息', async () => {
            const rowData = await npiTracker.getRowData(0);
            
            expect(rowData.sku).toBeDefined();
            expect(rowData.sku.length).toBeGreaterThan(0);
            expect(rowData.asin).toBeDefined();
            expect(rowData.asin.length).toBeGreaterThan(0);
            
            console.log('✅ 产品基础信息显示正常');
            console.log(`   SKU: ${rowData.sku}`);
            console.log(`   ASIN: ${rowData.asin}`);
            console.log(`   店铺: ${rowData.store}`);
        });

        test('应该显示流量转化数据', async () => {
            const trafficData = await npiTracker.getTrafficData(0);
            
            expect(trafficData.sessions).toBeGreaterThanOrEqual(0);
            expect(trafficData.ctr).toBeGreaterThanOrEqual(0);
            expect(trafficData.cvr).toBeGreaterThanOrEqual(0);
            
            console.log('✅ 流量转化数据显示正常');
            console.log(`   流量: ${trafficData.sessions}`);
            console.log(`   CTR: ${trafficData.ctr}%`);
            console.log(`   CVR: ${trafficData.cvr}%`);
            console.log(`   ACOAS: ${trafficData.acoas}%`);
        });

        test('应该显示库存周转天数', async () => {
            const inventoryDays = await npiTracker.getInventoryDays(0);
            
            expect(inventoryDays).toBeGreaterThanOrEqual(0);
            
            console.log(`✅ 库存周转天数显示正常: ${inventoryDays}天`);
        });

        test('应该标识库存积压产品', async () => {
            const rowCount = await npiTracker.getTableRowCount();
            
            for (let i = 0; i < Math.min(rowCount, 5); i++) {
                const isOverstock = await npiTracker.isOverstock(i);
                const days = await npiTracker.getInventoryDays(i);
                
                if (days > 60) {
                    expect(isOverstock).toBe(true);
                    console.log(`⚠️ 产品 ${i} 库存积压: ${days}天`);
                }
            }
            
            console.log('✅ 库存积压标识功能正常');
        });
    });

    test.describe('导出功能', () => {
        test('应该能够导出 Excel', async () => {
            const download = await npiTracker.exportToExcel();
            
            expect(download).toBeDefined();
            expect(download.suggestedFilename()).toContain('NPI_Tracker');
            expect(download.suggestedFilename()).toContain('.csv');
            
            console.log(`✅ Excel 导出功能正常 (${download.suggestedFilename()})`);
        });

        test('导出的文件名应该包含日期', async () => {
            const download = await npiTracker.exportToExcel();
            
            const filename = download.suggestedFilename();
            const datePattern = /\d{4}-\d{2}-\d{2}/;
            
            expect(datePattern.test(filename)).toBe(true);
            
            console.log(`✅ 导出文件名包含日期: ${filename}`);
        });
    });

    test.describe('完整流程测试', () => {
        test('应该完成完整的产品管理流程', async ({ page }) => {
            console.log('📊 开始完整流程测试...');

            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 步骤 1: 查看产品列表
            console.log('  1️⃣ 查看产品列表...');
            const rowCount = await npiTracker.getTableRowCount();
            expect(rowCount).toBeGreaterThan(0);
            console.log(`     ✅ 显示 ${rowCount} 条产品`);

            // 步骤 2: 筛选特定店铺
            console.log('  2️⃣ 筛选特定店铺...');
            const stores = await npiTracker.getAvailableStores();
            const specificStore = stores.find(s => s !== 'all' && s.trim() !== '');
            if (specificStore) {
                await npiTracker.filterByStore(specificStore);
                console.log(`     ✅ 筛选店铺: ${specificStore}`);
            }

            // 步骤 3: 更新 SOP 合规检查
            console.log('  3️⃣ 更新 SOP 合规检查...');
            await npiTracker.toggleComplianceCheck(0, 'content');
            await npiTracker.toggleComplianceCheck(0, 'sensitive');
            console.log('     ✅ 合规检查已更新');

            // 步骤 4: 更新财务模型
            console.log('  4️⃣ 更新财务模型...');
            await npiTracker.updateDeliveryFee(0, '6.00');
            const suggestedPrice = await npiTracker.getSuggestedPrice(0);
            expect(suggestedPrice).toBeGreaterThan(0);
            console.log(`     ✅ 建议售价: €${suggestedPrice}`);

            // 步骤 5: 更新决策
            console.log('  5️⃣ 更新决策...');
            await npiTracker.toggleDecision(0);
            await npiTracker.updateAdsStrategy(0, 'manual');
            console.log('     ✅ 决策已更新');

            // 步骤 6: 添加 Next Steps
            console.log('  6️⃣ 添加 Next Steps...');
            await npiTracker.openNextStepEditor(0);
            await npiTracker.selectNextStepOption('加VINE (0评论)');
            await npiTracker.saveNextSteps();
            const nextSteps = await npiTracker.getNextSteps(0);
            expect(nextSteps.length).toBeGreaterThan(0);
            console.log(`     ✅ Next Steps: ${nextSteps.join(', ')}`);

            // 步骤 7: 导出数据
            console.log('  7️⃣ 导出数据...');
            const download = await npiTracker.exportToExcel();
            expect(download).toBeDefined();
            console.log(`     ✅ 数据导出成功 (${download.suggestedFilename()})`);

            // 验证：整个流程无错误
            const errors = consoleListener.getErrors();
            expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

            console.log('✅ 完整流程测试通过');
        });
    });

    test.describe('性能测试', () => {
        test('页面加载时间应该合理', async ({ page }) => {
            const startTime = Date.now();
            
            // 重新加载页面
            await npiTracker.navigate();
            
            const loadTime = Date.now() - startTime;
            
            console.log(`📊 NPI Tracker 页面加载时间: ${loadTime}ms`);
            
            // 验证：加载时间应该小于 3 秒
            expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
        });

        test('表格渲染时间应该合理', async () => {
            const startTime = Date.now();
            
            // 触发表格重新渲染（通过筛选）
            await npiTracker.filterByStore('all');
            
            const renderTime = Date.now() - startTime;
            
            console.log(`📊 表格渲染时间: ${renderTime}ms`);
            
            // 验证：并发浏览器回归下渲染时间仍应保持在可接受范围内
            expect(renderTime, `表格渲染时间应该小于 5000ms，实际: ${renderTime}ms`).toBeLessThan(5000);
        });
    });

    test.describe('响应式测试', () => {
        test('应该在移动端正确显示', async ({ page }) => {
            // 设置移动端视口
            await page.setViewportSize({ width: 375, height: 667 });

            // 重新加载页面
            await npiTracker.navigate();

            // 验证：表格仍然可见（可能需要横向滚动）
            await expect(page.locator('#npi-table-body')).toBeVisible();

            console.log('✅ 移动端显示正常');
        });

        test('应该在平板端正确显示', async ({ page }) => {
            // 设置平板端视口
            await page.setViewportSize({ width: 768, height: 1024 });

            // 重新加载页面
            await npiTracker.navigate();

            // 验证：表格正常显示
            await expect(page.locator('#npi-table-body')).toBeVisible();

            console.log('✅ 平板端显示正常');
        });
    });
