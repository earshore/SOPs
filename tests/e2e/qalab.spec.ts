// tests/e2e/qalab.spec.ts
// ================================================================
// 🧪 QA Lab 模块 E2E 测试
// 测试 QA Lab 完整流程：加载数据、生成 Q&A、语言切换、分类筛选、导出
// ================================================================

import { test, expect } from '@playwright/test';
import { QALabPage } from './pages/QALabPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

test.describe('QA Lab 模块 E2E 测试', () => {
    let qalab: QALabPage;

    test.beforeEach(async ({ page }) => {
        qalab = new QALabPage(page);
        
        // 导航到 QA Lab 页面
        await qalab.navigate();
    });

    test.describe('页面加载与初始化', () => {
        test('应该成功加载 QA Lab 页面', async ({ page }) => {
            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 验证：页面标题正确
            await expect(page).toHaveTitle(/Amazing Amazon Architect/);

            // 验证：主要元素可见
            await expect(page.locator('h2:has-text("QA Lab"), h2:has-text("Rufus Q&A")')).toBeVisible();
            await expect(page.locator('#jsonInput')).toBeVisible();
            await expect(page.locator('button:has-text("智能分析"), button:has-text("开始分析")')).toBeVisible();

            // 验证：无 JavaScript 错误
            const errors = consoleListener.getErrors();
            expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

            console.log('✅ QA Lab 页面加载成功');
        });

        test('应该显示正确的初始状态', async () => {
            // 验证：输入框为空
            const inputValue = await qalab.getInputValue();
            expect(inputValue).toBe('');

            // 验证：结果区域不可见
            const hasResults = await qalab.hasResults();
            expect(hasResults).toBe(false);

            // 验证：进度区域不可见
            const isProgressVisible = await qalab.isProgressVisible();
            expect(isProgressVisible).toBe(false);

            console.log('✅ 初始状态显示正确');
        });
    });

    test.describe('示例数据加载', () => {
        test('应该能够加载示例数据', async () => {
            await qalab.loadSample();

            // 验证：输入框已填充数据
            const inputValue = await qalab.getInputValue();
            expect(inputValue.length).toBeGreaterThan(0);
            expect(inputValue).toContain('marketplace');

            // 验证：数据是有效的 JSON
            expect(() => JSON.parse(inputValue)).not.toThrow();

            console.log('✅ 示例数据加载成功');
        });

        test('应该显示加载成功提示', async () => {
            await qalab.loadSample();

            // 验证：显示成功提示
            await qalab.expectToast('示例数据');

            console.log('✅ 加载提示显示正确');
        });
    });

    test.describe('输入清空功能', () => {
        test('应该能够清空输入', async () => {
            // 先加载示例数据
            await qalab.loadSample();
            
            let inputValue = await qalab.getInputValue();
            expect(inputValue.length).toBeGreaterThan(0);

            // 清空输入
            await qalab.clearInput();

            // 验证：输入框已清空
            inputValue = await qalab.getInputValue();
            expect(inputValue).toBe('');

            console.log('✅ 输入清空功能正常');
        });

        test('应该显示清空成功提示', async () => {
            await qalab.loadSample();
            await qalab.clearInput();

            // 验证：显示成功提示
            await qalab.expectToast('已清空');

            console.log('✅ 清空提示显示正确');
        });
    });

    test.describe('Q&A 生成功能', () => {
        test('应该能够生成 Q&A', async ({ page }) => {
            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 加载示例数据
            await qalab.loadSample();

            // 开始分析
            await qalab.startAnalysis();

            // 验证：进度条显示
            const isProgressVisible = await qalab.isProgressVisible();
            expect(isProgressVisible).toBe(true);

            console.log('📊 分析进行中，等待完成...');

            // 等待分析完成
            await qalab.waitForAnalysisComplete(15000);

            // 验证：有结果显示
            const hasResults = await qalab.hasResults();
            expect(hasResults).toBe(true);

            // 验证：生成了 Q&A 卡片
            const cardCount = await qalab.getQACardsCount();
            expect(cardCount).toBeGreaterThan(0);

            console.log(`✅ Q&A 生成成功 (${cardCount} 个)`);

            // 验证：无 JavaScript 错误
            const errors = consoleListener.getErrors();
            expect(errors.length, `生成过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);
        });

        test('应该显示生成成功提示', async () => {
            await qalab.loadSample();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete();

            // 验证：显示成功提示
            await qalab.expectToast('分析完成');

            console.log('✅ 生成提示显示正确');
        });

        test('应该在没有输入时显示错误提示', async () => {
            // 不加载数据，直接开始分析
            await qalab.startAnalysis();

            // 验证：显示错误提示
            await qalab.expectToast('粘贴');

            console.log('✅ 错误提示显示正确');
        });

        test('应该在 JSON 格式错误时显示错误提示', async () => {
            // 输入无效的 JSON
            await qalab.setInputValue('invalid json {');
            await qalab.startAnalysis();

            // 验证：显示错误提示
            await qalab.expectToast('JSON');

            console.log('✅ JSON 错误提示显示正确');
        });
    });

    test.describe('Q&A 卡片交互', () => {
        test.beforeEach(async () => {
            // 生成 Q&A
            await qalab.loadSample();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete();
        });

        test('应该能够展开和折叠单个 Q&A 卡片', async () => {
            // 展开第一个卡片
            await qalab.toggleQACard(0);
            let isExpanded = await qalab.isQACardExpanded(0);
            expect(isExpanded).toBe(true);

            // 折叠第一个卡片
            await qalab.toggleQACard(0);
            isExpanded = await qalab.isQACardExpanded(0);
            expect(isExpanded).toBe(false);

            console.log('✅ 单个卡片展开/折叠功能正常');
        });

        test('应该能够全部展开', async () => {
            await qalab.toggleExpandAll();

            // 验证：所有卡片已展开
            const allExpanded = await qalab.areAllCardsExpanded();
            expect(allExpanded).toBe(true);

            console.log('✅ 全部展开功能正常');
        });

        test('应该能够全部折叠', async () => {
            // 先全部展开
            await qalab.toggleExpandAll();
            
            // 再全部折叠
            await qalab.toggleExpandAll();

            // 验证：所有卡片已折叠
            const allCollapsed = await qalab.areAllCardsCollapsed();
            expect(allCollapsed).toBe(true);

            console.log('✅ 全部折叠功能正常');
        });

        test('应该显示 Q&A 卡片的详细信息', async () => {
            // 展开第一个卡片
            await qalab.toggleQACard(0);

            // 验证：卡片包含问题
            const question = await qalab.getQACardTitle(0);
            expect(question.length).toBeGreaterThan(0);

            // 验证：卡片包含答案
            const answer = await qalab.getQACardAnswer(0);
            expect(answer.length).toBeGreaterThan(0);

            // 验证：卡片包含分类
            const category = await qalab.getQACardCategory(0);
            expect(category.length).toBeGreaterThan(0);

            // 验证：卡片包含置信度
            const confidence = await qalab.getQACardConfidence(0);
            expect(confidence).toBeGreaterThanOrEqual(1);
            expect(confidence).toBeLessThanOrEqual(5);

            console.log(`✅ Q&A 卡片详细信息显示完整`);
            console.log(`   问题: ${question.substring(0, 50)}...`);
            console.log(`   分类: ${category}`);
            console.log(`   置信度: ${confidence}/5`);
        });

        test('应该能够复制 Q&A', async ({ context }) => {
            // 授予剪贴板权限
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);

            // 复制第一个 Q&A
            await qalab.copyQA(0);

            // 验证：显示成功提示
            await qalab.expectToast('已复制');

            console.log('✅ Q&A 复制功能正常');
        });
    });

    test.describe('语言切换功能', () => {
        test.beforeEach(async () => {
            // 生成 Q&A
            await qalab.loadSample();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete();
        });

        test('应该显示多种语言选项', async () => {
            const languages = await qalab.getAvailableLanguages();
            
            expect(languages.length).toBeGreaterThan(1);
            expect(languages).toContain('en');
            expect(languages).toContain('de');

            console.log(`✅ 支持 ${languages.length} 种语言: ${languages.join(', ')}`);
        });

        test('应该能够切换语言', async () => {
            const initialLang = await qalab.getCurrentLanguage();
            
            // 切换到英语
            await qalab.switchLanguage('en');
            
            const newLang = await qalab.getCurrentLanguage();
            expect(newLang).not.toBe(initialLang);

            // 验证：Q&A 内容已更新
            const question = await qalab.getQACardTitle(0);
            expect(question.length).toBeGreaterThan(0);

            console.log(`✅ 语言切换功能正常 (${initialLang} → ${newLang})`);
        });

        test('应该显示语言切换成功提示', async () => {
            await qalab.switchLanguage('en');

            // 验证：显示成功提示
            await qalab.expectToast('语言已切换');

            console.log('✅ 语言切换提示显示正确');
        });
    });

    test.describe('分类筛选功能', () => {
        test.beforeEach(async () => {
            // 生成 Q&A
            await qalab.loadSample();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete();
        });

        test('应该显示多种分类选项', async () => {
            const categories = await qalab.getAvailableCategories();
            
            expect(categories.length).toBeGreaterThan(1);
            expect(categories).toContain('all');

            console.log(`✅ 支持 ${categories.length} 种分类: ${categories.join(', ')}`);
        });

        test('应该能够切换分类', async () => {
            const initialCount = await qalab.getVisibleQACardsCount();
            
            // 获取可用的分类（排除 'all'）
            const categories = await qalab.getAvailableCategories();
            const specificCategory = categories.find(c => c !== 'all');
            
            if (specificCategory) {
                // 切换到特定分类
                await qalab.switchCategory(specificCategory);
                
                const filteredCount = await qalab.getVisibleQACardsCount();
                
                // 验证：筛选后的数量应该小于或等于总数
                expect(filteredCount).toBeLessThanOrEqual(initialCount);
                
                console.log(`✅ 分类筛选功能正常 (${initialCount} → ${filteredCount})`);
            } else {
                console.log('⚠️ 只有 "all" 分类，跳过筛选测试');
            }
        });

        test('应该能够切换回全部分类', async () => {
            const categories = await qalab.getAvailableCategories();
            const specificCategory = categories.find(c => c !== 'all');
            
            if (specificCategory) {
                // 先切换到特定分类
                await qalab.switchCategory(specificCategory);
                const filteredCount = await qalab.getVisibleQACardsCount();
                
                // 切换回全部
                await qalab.switchCategory('all');
                const allCount = await qalab.getVisibleQACardsCount();
                
                // 验证：全部分类显示更多 Q&A
                expect(allCount).toBeGreaterThanOrEqual(filteredCount);
                
                console.log(`✅ 切换回全部分类功能正常 (${filteredCount} → ${allCount})`);
            }
        });
    });

    test.describe('导出功能', () => {
        test.beforeEach(async () => {
            // 生成 Q&A
            await qalab.loadSample();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete();
        });

        test('应该能够导出 JSON', async () => {
            const download = await qalab.exportJSON();
            
            expect(download).toBeDefined();
            expect(download.suggestedFilename()).toContain('rufus-qa');
            expect(download.suggestedFilename()).toContain('.json');

            console.log(`✅ JSON 导出功能正常 (${download.suggestedFilename()})`);
        });

        test('应该能够导出 CSV', async () => {
            const download = await qalab.exportCSV();
            
            expect(download).toBeDefined();
            expect(download.suggestedFilename()).toContain('rufus-qa');
            expect(download.suggestedFilename()).toContain('.csv');

            console.log(`✅ CSV 导出功能正常 (${download.suggestedFilename()})`);
        });

        test('应该能够导出文本', async () => {
            const download = await qalab.exportText();
            
            expect(download).toBeDefined();
            expect(download.suggestedFilename()).toContain('rufus-qa');
            expect(download.suggestedFilename()).toContain('.txt');

            console.log(`✅ 文本导出功能正常 (${download.suggestedFilename()})`);
        });

        test('应该显示导出成功提示', async () => {
            await qalab.exportJSON();

            // 验证：显示成功提示
            await qalab.expectToast('导出成功');

            console.log('✅ 导出提示显示正确');
        });
    });

    test.describe('完整流程测试', () => {
        test('应该完成完整的 Q&A 生成和导出流程', async ({ page, context }) => {
            console.log('📊 开始完整流程测试...');

            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 步骤 1: 加载示例数据
            console.log('  1️⃣ 加载示例数据...');
            await qalab.loadSample();
            const inputValue = await qalab.getInputValue();
            expect(inputValue.length).toBeGreaterThan(0);
            console.log('     ✅ 示例数据已加载');

            // 步骤 2: 开始分析
            console.log('  2️⃣ 开始 Q&A 分析...');
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete(15000);
            console.log('     ✅ 分析完成');

            // 步骤 3: 查看生成的 Q&A
            console.log('  3️⃣ 查看生成的 Q&A...');
            const cardCount = await qalab.getQACardsCount();
            expect(cardCount).toBeGreaterThan(0);
            console.log(`     ✅ 生成了 ${cardCount} 个 Q&A`);

            // 步骤 4: 展开查看详情
            console.log('  4️⃣ 展开查看 Q&A 详情...');
            await qalab.toggleQACard(0);
            const question = await qalab.getQACardTitle(0);
            const answer = await qalab.getQACardAnswer(0);
            expect(question.length).toBeGreaterThan(0);
            expect(answer.length).toBeGreaterThan(0);
            console.log(`     ✅ Q&A 详情显示正常`);

            // 步骤 5: 切换语言
            console.log('  5️⃣ 切换语言...');
            await qalab.switchLanguage('en');
            const newQuestion = await qalab.getQACardTitle(0);
            expect(newQuestion).not.toBe(question);
            console.log('     ✅ 语言切换成功');

            // 步骤 6: 筛选分类
            console.log('  6️⃣ 筛选分类...');
            const categories = await qalab.getAvailableCategories();
            const specificCategory = categories.find(c => c !== 'all');
            if (specificCategory) {
                await qalab.switchCategory(specificCategory);
                console.log(`     ✅ 分类筛选成功 (${specificCategory})`);
            }

            // 步骤 7: 复制 Q&A
            console.log('  7️⃣ 复制 Q&A...');
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            await qalab.copyQA(0);
            console.log('     ✅ Q&A 复制成功');

            // 步骤 8: 导出数据
            console.log('  8️⃣ 导出数据...');
            const download = await qalab.exportJSON();
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
            await qalab.navigate();
            
            const loadTime = Date.now() - startTime;
            
            console.log(`📊 QA Lab 页面加载时间: ${loadTime}ms`);
            
            // 验证：加载时间应该小于 3 秒
            expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
        });

        test('Q&A 生成时间应该合理', async () => {
            await qalab.loadSample();

            // 测量生成时间
            const startTime = Date.now();
            await qalab.startAnalysis();
            await qalab.waitForAnalysisComplete(15000);
            const generateTime = Date.now() - startTime;

            console.log(`📊 Q&A 生成时间: ${generateTime}ms`);

            // 验证：生成时间应该小于 15 秒
            expect(generateTime, `生成时间应该小于 15000ms，实际: ${generateTime}ms`).toBeLessThan(15000);
        });
    });

    test.describe('响应式测试', () => {
        test('应该在移动端正确显示', async ({ page }) => {
            // 设置移动端视口
            await page.setViewportSize({ width: 375, height: 667 });

            // 重新加载页面
            await qalab.navigate();

            // 验证：主要元素仍然可见
            await expect(page.locator('#jsonInput')).toBeVisible();
            await expect(page.locator('button:has-text("智能分析"), button:has-text("开始分析")')).toBeVisible();

            console.log('✅ 移动端显示正常');
        });

        test('应该在平板端正确显示', async ({ page }) => {
            // 设置平板端视口
            await page.setViewportSize({ width: 768, height: 1024 });

            // 重新加载页面
            await qalab.navigate();

            // 验证：主要元素仍然可见
            await expect(page.locator('#jsonInput')).toBeVisible();
            await expect(page.locator('button:has-text("加载示例")')).toBeVisible();

            console.log('✅ 平板端显示正常');
        });
    });
});
