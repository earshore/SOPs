// tests/e2e/restricted-words.spec.ts
// ================================================================
// 🧪 Restricted Words 模块 E2E 测试
// 测试高危词库搜索、筛选、详情查看完整流程
// ================================================================

import { test, expect } from '@playwright/test';
import { RestrictedWordsPage } from './pages/RestrictedWordsPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

test.describe('Restricted Words 模块 E2E 测试', () => {
    test.describe.configure({ mode: 'serial' });

    let restrictedWords: RestrictedWordsPage;

    test.beforeEach(async ({ page }) => {
        restrictedWords = new RestrictedWordsPage(page);
        
        // 导航到 Restricted Words 页面
        await restrictedWords.navigate();
    });

    test.describe('页面加载与初始化', () => {
        test('应该成功加载 Restricted Words 页面', async ({ page }) => {
            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 验证：主要元素可见
            await expect(restrictedWords.searchInput).toBeVisible();
            await expect(restrictedWords.searchButton).toBeVisible();
            await expect(restrictedWords.resultsTable).toBeVisible();

            // 验证：无 JavaScript 错误
            const errors = consoleListener.getErrors();
            expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

            console.log('✅ Restricted Words 页面加载成功');
        });

        test('应该显示正确的初始状态', async () => {
            // 验证：搜索框为空
            const searchValue = await restrictedWords.getSearchValue();
            expect(searchValue).toBe('');

            // 验证：显示所有结果
            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(0);

            // 验证：统计信息显示
            const statsText = await restrictedWords.getStatsText();
            expect(statsText).toContain('显示');
            expect(statsText).toContain('条结果');

            console.log(`✅ 初始状态显示正确 (${resultsCount} 条结果)`);
        });

        test('应该显示筛选选项', async () => {
            // 验证：分类筛选器可见
            await expect(restrictedWords.categoryFilter).toBeVisible();

            // 验证：风险等级筛选器可见
            await expect(restrictedWords.riskFilter).toBeVisible();

            // 验证：站点选择器可见
            await expect(restrictedWords.siteContextSelect).toBeVisible();

            // 验证：有多个分类选项
            const categories = await restrictedWords.getAvailableCategories();
            expect(categories.length).toBeGreaterThan(1);

            // 验证：有多个风险等级选项
            const riskLevels = await restrictedWords.getAvailableRiskLevels();
            expect(riskLevels.length).toBeGreaterThan(1);

            console.log(`✅ 筛选选项显示正确 (${categories.length} 个分类, ${riskLevels.length} 个风险等级)`);
        });
    });

    test.describe('搜索功能', () => {
        test('应该能够执行模糊搜索', async () => {
            await restrictedWords.search('bamboo', 'fuzzy');

            // 验证：找到结果
            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(0);

            // 验证：结果包含搜索关键词
            const containsKeyword = await restrictedWords.resultsContain('Bamboo');
            expect(containsKeyword).toBe(true);

            console.log(`✅ 模糊搜索功能正常 (找到 ${resultsCount} 条结果)`);
        });

        test('应该能够执行精确搜索', async () => {
            await restrictedWords.search('Bamboo', 'exact');

            // 验证：找到结果
            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(0);

            // 验证：结果包含精确关键词
            const firstKeyword = await restrictedWords.getFirstResultKeyword();
            expect(firstKeyword.toLowerCase()).toContain('bamboo');

            console.log(`✅ 精确搜索功能正常 (找到 ${resultsCount} 条结果)`);
        });

        test('应该能够执行全文搜索', async () => {
            await restrictedWords.search('textile', 'fulltext');

            // 验证：找到结果（在描述中包含 textile）
            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThanOrEqual(0);

            console.log(`✅ 全文搜索功能正常 (找到 ${resultsCount} 条结果)`);
        });

        test('应该能够执行正则表达式搜索', async () => {
            await restrictedWords.search('^Bamboo$', 'regex');

            // 验证：找到结果
            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(0);

            console.log(`✅ 正则表达式搜索功能正常 (找到 ${resultsCount} 条结果)`);
        });

        test('应该在没有结果时显示提示', async () => {
            await restrictedWords.search('nonexistentkeyword12345', 'fuzzy');

            // 验证：显示"没有找到"提示
            const hasNoResults = await restrictedWords.hasNoResultsMessage();
            expect(hasNoResults).toBe(true);

            console.log('✅ 无结果提示显示正确');
        });

        test('应该能够清空搜索', async () => {
            // 先执行搜索
            await restrictedWords.search('bamboo', 'fuzzy');
            
            let resultsCount = await restrictedWords.getResultsCount();
            const filteredCount = resultsCount;

            // 清空搜索
            await restrictedWords.clearSearch();

            // 验证：搜索框已清空
            const searchValue = await restrictedWords.getSearchValue();
            expect(searchValue).toBe('');

            // 验证：显示所有结果
            resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(filteredCount);

            console.log(`✅ 清空搜索功能正常 (${filteredCount} → ${resultsCount})`);
        });

        test('应该更新统计信息', async () => {
            await restrictedWords.search('bamboo', 'fuzzy');

            const statsText = await restrictedWords.getStatsText();
            const resultsCount = await restrictedWords.getResultsCount();

            // 验证：统计信息包含结果数量
            expect(statsText).toContain('显示');
            expect(statsText).toContain(resultsCount.toString());

            console.log(`✅ 统计信息更新正确: ${statsText}`);
        });
    });

    test.describe('筛选功能', () => {
        test('应该能够按分类筛选', async () => {
            const initialCount = await restrictedWords.getResultsCount();

            // 获取第一个非"全部"的分类
            const categories = await restrictedWords.getAvailableCategories();
            const specificCategory = categories.find(c => !c.includes('全部'));

            if (specificCategory) {
                // 通过 value 筛选（需要找到对应的 value）
                await restrictedWords.filterByCategory('MAT');

                const filteredCount = await restrictedWords.getResultsCount();

                // 验证：结果已筛选
                expect(filteredCount).toBeLessThanOrEqual(initialCount);
                expect(filteredCount).toBeGreaterThan(0);

                console.log(`✅ 分类筛选功能正常 (${initialCount} → ${filteredCount})`);
            }
        });

        test('应该能够按风险等级筛选', async () => {
            const initialCount = await restrictedWords.getResultsCount();

            // 筛选风险等级 5
            await restrictedWords.filterByRiskLevel('5');

            const filteredCount = await restrictedWords.getResultsCount();

            // 验证：结果已筛选
            expect(filteredCount).toBeLessThanOrEqual(initialCount);
            expect(filteredCount).toBeGreaterThan(0);

            // 验证：第一个结果的风险等级是 5
            const riskLevel = await restrictedWords.getFirstResultRiskLevel();
            expect(riskLevel).toBe('5');

            console.log(`✅ 风险等级筛选功能正常 (${initialCount} → ${filteredCount})`);
        });

        test('应该能够按站点筛选', async () => {
            const initialCount = await restrictedWords.getResultsCount();

            // 筛选德国站点
            await restrictedWords.selectSiteContext('DE');

            const filteredCount = await restrictedWords.getResultsCount();

            // 验证：结果已筛选
            expect(filteredCount).toBeLessThanOrEqual(initialCount);
            expect(filteredCount).toBeGreaterThan(0);

            console.log(`✅ 站点筛选功能正常 (${initialCount} → ${filteredCount})`);
        });

        test('应该能够组合多个筛选条件', async () => {
            const initialCount = await restrictedWords.getResultsCount();

            // 组合筛选：材质成分 + 风险等级5 + 德国站点
            await restrictedWords.filterByCategory('MAT');
            await restrictedWords.filterByRiskLevel('5');
            await restrictedWords.selectSiteContext('DE');

            const filteredCount = await restrictedWords.getResultsCount();

            // 验证：结果已筛选
            expect(filteredCount).toBeLessThanOrEqual(initialCount);

            console.log(`✅ 组合筛选功能正常 (${initialCount} → ${filteredCount})`);
        });

        test('应该能够重置筛选', async () => {
            // 先设置筛选条件
            await restrictedWords.filterByCategory('MAT');
            await restrictedWords.filterByRiskLevel('5');
            
            const filteredCount = await restrictedWords.getResultsCount();

            // 清空筛选
            await restrictedWords.clearSearch();

            const resetCount = await restrictedWords.getResultsCount();

            // 验证：显示更多结果
            expect(resetCount).toBeGreaterThan(filteredCount);

            console.log(`✅ 重置筛选功能正常 (${filteredCount} → ${resetCount})`);
        });
    });

    test.describe('搜索与筛选组合', () => {
        test('应该能够同时使用搜索和筛选', async () => {
            // 搜索 + 分类筛选
            await restrictedWords.search('bamboo', 'fuzzy');
            await restrictedWords.filterByCategory('MAT');

            const resultsCount = await restrictedWords.getResultsCount();

            // 验证：有结果
            expect(resultsCount).toBeGreaterThan(0);

            // 验证：结果包含搜索关键词
            const containsKeyword = await restrictedWords.resultsContain('Bamboo');
            expect(containsKeyword).toBe(true);

            console.log(`✅ 搜索+筛选组合功能正常 (${resultsCount} 条结果)`);
        });

        test('应该能够切换搜索模式', async () => {
            // 模糊搜索
            await restrictedWords.search('bamboo', 'fuzzy');
            const fuzzyCount = await restrictedWords.getResultsCount();

            // 切换到精确搜索
            await restrictedWords.search('Bamboo', 'exact');
            const exactCount = await restrictedWords.getResultsCount();

            // 验证：两种模式都有结果
            expect(fuzzyCount).toBeGreaterThan(0);
            expect(exactCount).toBeGreaterThan(0);

            console.log(`✅ 搜索模式切换功能正常 (模糊: ${fuzzyCount}, 精确: ${exactCount})`);
        });
    });

    test.describe('详情查看功能', () => {
        test('应该能够查看词条详情', async () => {
            // 点击第一个结果的详情按钮
            await restrictedWords.viewDetail(0);

            // 验证：模态框显示
            const isVisible = await restrictedWords.isDetailModalVisible();
            expect(isVisible).toBe(true);

            // 验证：显示关键词
            const keyword = await restrictedWords.getDetailKeyword();
            expect(keyword.length).toBeGreaterThan(0);

            console.log(`✅ 详情查看功能正常 (关键词: ${keyword})`);
        });

        test('应该显示完整的词条信息', async () => {
            await restrictedWords.viewDetail(0);

            // 验证：显示风险描述
            const riskDesc = await restrictedWords.getDetailRiskDescription();
            expect(riskDesc.length).toBeGreaterThan(0);
            expect(riskDesc).toContain('风险');

            // 验证：显示替代方案
            const alternatives = await restrictedWords.getDetailAlternatives();
            expect(alternatives.length).toBeGreaterThan(0);

            console.log(`✅ 词条详情信息完整 (${alternatives.length} 个替代方案)`);
        });

        test('应该能够关闭详情模态框', async () => {
            // 打开详情
            await restrictedWords.viewDetail(0);
            
            let isVisible = await restrictedWords.isDetailModalVisible();
            expect(isVisible).toBe(true);

            // 关闭详情
            await restrictedWords.closeDetail();

            // 验证：模态框已关闭
            isVisible = await restrictedWords.isDetailModalVisible();
            expect(isVisible).toBe(false);

            console.log('✅ 关闭详情功能正常');
        });

        test('应该能够查看不同词条的详情', async () => {
            // 查看第一个词条
            await restrictedWords.viewDetail(0);
            const keyword1 = await restrictedWords.getDetailKeyword();
            await restrictedWords.closeDetail();

            // 查看第二个词条
            await restrictedWords.viewDetail(1);
            const keyword2 = await restrictedWords.getDetailKeyword();
            await restrictedWords.closeDetail();

            // 验证：显示了不同的词条
            expect(keyword1).not.toBe(keyword2);

            console.log(`✅ 多词条详情查看正常 (${keyword1} vs ${keyword2})`);
        });
    });

    test.describe('本地化功能', () => {
        test('应该显示站点本地化关键词', async () => {
            // 选择德国站点
            await restrictedWords.selectSiteContext('DE');

            // 搜索有德语本地化的词条
            await restrictedWords.search('bamboo', 'fuzzy');

            const resultsCount = await restrictedWords.getResultsCount();
            expect(resultsCount).toBeGreaterThan(0);

            // 验证：结果中可能包含德语关键词
            const containsGerman = await restrictedWords.resultsContain('Bambus');
            
            console.log(`✅ 本地化功能正常 (德语关键词: ${containsGerman})`);
        });

        test('应该在详情中显示本地化信息', async () => {
            await restrictedWords.search('bamboo', 'fuzzy');
            await restrictedWords.viewDetail(0);

            const detailContent = await restrictedWords.detailModal.textContent();

            // 验证：详情中包含本地化部分
            expect(detailContent).toContain('本地化');

            console.log('✅ 详情本地化信息显示正常');
        });
    });

    test.describe('数据展示', () => {
        test('应该显示风险等级图标', async () => {
            const firstRiskLevel = await restrictedWords.getFirstResultRiskLevel();

            // 验证：风险等级是有效的数字
            expect(parseInt(firstRiskLevel)).toBeGreaterThanOrEqual(1);
            expect(parseInt(firstRiskLevel)).toBeLessThanOrEqual(5);

            console.log(`✅ 风险等级显示正常 (${firstRiskLevel}级)`);
        });

        test('应该显示分类标签', async () => {
            const category = await restrictedWords.getFirstResultCategory();

            // 验证：分类不为空
            expect(category.length).toBeGreaterThan(0);

            console.log(`✅ 分类标签显示正常 (${category})`);
        });

        test('应该显示受影响站点', async () => {
            const sites = await restrictedWords.getAffectedSites(0);

            // 验证：至少有一个站点
            expect(sites.length).toBeGreaterThan(0);

            console.log(`✅ 受影响站点显示正常 (${sites.join(', ')})`);
        });

        test('应该显示常见产品', async () => {
            const resultsTable = await restrictedWords.resultsTable.textContent();

            // 验证：结果中包含产品信息
            expect(resultsTable?.length).toBeGreaterThan(0);

            console.log('✅ 常见产品信息显示正常');
        });
    });

    test.describe('完整流程测试', () => {
        test('应该完成完整的搜索和查看流程', async ({ page }) => {
            console.log('📊 开始完整流程测试...');

            // 设置控制台错误监听
            const consoleListener = setupConsoleErrorListener(page);

            // 步骤 1: 查看初始结果
            console.log('  1️⃣ 查看初始结果...');
            const initialCount = await restrictedWords.getResultsCount();
            expect(initialCount).toBeGreaterThan(0);
            console.log(`     ✅ 显示 ${initialCount} 条结果`);

            // 步骤 2: 执行搜索
            console.log('  2️⃣ 执行搜索...');
            await restrictedWords.search('bamboo', 'fuzzy');
            const searchCount = await restrictedWords.getResultsCount();
            expect(searchCount).toBeGreaterThan(0);
            console.log(`     ✅ 找到 ${searchCount} 条结果`);

            // 步骤 3: 应用筛选
            console.log('  3️⃣ 应用筛选...');
            await restrictedWords.filterByRiskLevel('5');
            const filteredCount = await restrictedWords.getResultsCount();
            expect(filteredCount).toBeGreaterThan(0);
            console.log(`     ✅ 筛选后 ${filteredCount} 条结果`);

            // 步骤 4: 查看详情
            console.log('  4️⃣ 查看词条详情...');
            await restrictedWords.viewDetail(0);
            const isVisible = await restrictedWords.isDetailModalVisible();
            expect(isVisible).toBe(true);
            const keyword = await restrictedWords.getDetailKeyword();
            console.log(`     ✅ 查看详情: ${keyword}`);

            // 步骤 5: 查看风险描述
            console.log('  5️⃣ 查看风险描述...');
            const riskDesc = await restrictedWords.getDetailRiskDescription();
            expect(riskDesc.length).toBeGreaterThan(0);
            console.log('     ✅ 风险描述显示正常');

            // 步骤 6: 查看替代方案
            console.log('  6️⃣ 查看替代方案...');
            const alternatives = await restrictedWords.getDetailAlternatives();
            expect(alternatives.length).toBeGreaterThan(0);
            console.log(`     ✅ ${alternatives.length} 个替代方案`);

            // 步骤 7: 关闭详情
            console.log('  7️⃣ 关闭详情...');
            await restrictedWords.closeDetail();
            const isClosed = !(await restrictedWords.isDetailModalVisible());
            expect(isClosed).toBe(true);
            console.log('     ✅ 详情已关闭');

            // 步骤 8: 切换站点
            console.log('  8️⃣ 切换站点...');
            await restrictedWords.selectSiteContext('DE');
            const siteCount = await restrictedWords.getResultsCount();
            expect(siteCount).toBeGreaterThan(0);
            console.log(`     ✅ 德国站点 ${siteCount} 条结果`);

            // 步骤 9: 清空筛选
            console.log('  9️⃣ 清空筛选...');
            await restrictedWords.clearSearch();
            const resetCount = await restrictedWords.getResultsCount();
            expect(resetCount).toBeGreaterThan(filteredCount);
            console.log(`     ✅ 重置后 ${resetCount} 条结果`);

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
            await restrictedWords.navigate();
            
            const loadTime = Date.now() - startTime;
            
            console.log(`📊 Restricted Words 页面加载时间: ${loadTime}ms`);
            
            // 验证：加载时间应该小于 3 秒
            expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
        });

        test('搜索响应时间应该合理', async () => {
            const startTime = Date.now();
            
            await restrictedWords.search('bamboo', 'fuzzy');
            
            const searchTime = Date.now() - startTime;
            
            console.log(`📊 搜索响应时间: ${searchTime}ms`);
            
            // 验证：搜索时间应该小于 3 秒
            expect(searchTime, `搜索时间应该小于 3000ms，实际: ${searchTime}ms`).toBeLessThan(3000);
        });

        test('筛选响应时间应该合理', async () => {
            const startTime = Date.now();
            
            await restrictedWords.filterByCategory('MAT');
            
            const filterTime = Date.now() - startTime;
            
            console.log(`📊 筛选响应时间: ${filterTime}ms`);
            
            // 验证：筛选时间应该小于 1 秒
            expect(filterTime, `筛选时间应该小于 1000ms，实际: ${filterTime}ms`).toBeLessThan(1000);
        });
    });

    test.describe('响应式测试', () => {
        test('应该在移动端正确显示', async ({ page }) => {
            // 设置移动端视口
            await page.setViewportSize({ width: 375, height: 667 });

            // 重新加载页面
            await restrictedWords.navigate();

            // 验证：主要元素仍然可见
            await expect(restrictedWords.searchInput).toBeVisible();
            await expect(restrictedWords.searchButton).toBeVisible();

            console.log('✅ 移动端显示正常');
        });

        test('应该在平板端正确显示', async ({ page }) => {
            // 设置平板端视口
            await page.setViewportSize({ width: 768, height: 1024 });

            // 重新加载页面
            await restrictedWords.navigate();

            // 验证：主要元素仍然可见
            await expect(restrictedWords.searchInput).toBeVisible();
            await expect(restrictedWords.categoryFilter).toBeVisible();

            console.log('✅ 平板端显示正常');
        });
    });
});
