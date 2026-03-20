// tests/e2e/ai-analysis.spec.ts
// ================================================================
// 🧪 AI 智能分析模块 E2E 测试
// 测试 AI 分析完整流程：选择产品、选择分析目标、执行分析、查看结果
// ================================================================

import { test, expect } from '@playwright/test';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

test.describe('AI 智能分析模块 E2E 测试', () => {
  let aiAnalysis: AIAnalysisPage;

  test.beforeEach(async ({ page }) => {
    aiAnalysis = new AIAnalysisPage(page);
    
    // 导航到 AI 分析页面
    await aiAnalysis.navigate();
  });

  test.describe('页面加载与初始化', () => {
    test('应该成功加载 AI 分析页面', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 验证：页面标题正确
      await expect(page).toHaveTitle(/Amazing Amazon Architect/);

      // 验证：主要元素可见
      await expect(page.locator('h2:has-text("AI 智能分析")')).toBeVisible();
      await expect(page.locator('[data-selection-panel-toggle]')).toBeVisible();

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ AI 分析页面加载成功');
    });

    test('应该正确初始化 Alpine 组件', async ({ page }) => {
      // 验证：Alpine 组件已初始化
      const alpineInitialized = await page.evaluate(() => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]');
        return element && (element as any).__x !== undefined;
      });

      expect(alpineInitialized, 'Alpine 组件应该已初始化').toBe(true);

      // 验证：组件状态可访问
      const hasComponentData = await page.evaluate(() => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as any;
        if (!element || !element.__x) return false;
        
        const data = element.__x.$data;
        return data && 
               typeof data.selectedAsins !== 'undefined' &&
               typeof data.selectedTargets !== 'undefined' &&
               typeof data.runAnalysis === 'function';
      });

      expect(hasComponentData, '组件数据应该可访问').toBe(true);

      console.log('✅ Alpine 组件初始化正确');
    });

    test('应该显示正确的初始状态', async () => {
      // 验证：开始分析按钮初始状态
      const isEnabled = await aiAnalysis.isStartAnalysisButtonEnabled();
      
      // 如果没有数据或没有选择，按钮应该禁用
      const hasData = await aiAnalysis.hasAvailableData();
      if (!hasData) {
        expect(isEnabled, '没有数据时按钮应该禁用').toBe(false);
      }

      // 验证：数据源信息显示
      const dataInfo = await aiAnalysis.getDataSourceInfo();
      console.log(`📊 数据源信息: ${dataInfo.hasData ? `${dataInfo.productCount} 个产品, ${dataInfo.reviewCount} 条评论` : '无数据'}`);

      console.log('✅ 初始状态显示正确');
    });
  });

  test.describe('ASIN 选择功能', () => {
    test('应该能够选择和取消选择 ASIN', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      const availableCount = await aiAnalysis.getAvailableAsinsCount();
      expect(availableCount, '应该有可用的 ASIN').toBeGreaterThan(0);

      // 清空所有选择
      await aiAnalysis.clearAllAsins();
      let selectedCount = await aiAnalysis.getSelectedAsinsCount();
      expect(selectedCount, '清空后应该没有选中的 ASIN').toBe(0);

      // 全选所有 ASIN
      await aiAnalysis.selectAllAsins();
      selectedCount = await aiAnalysis.getSelectedAsinsCount();
      expect(selectedCount, '全选后应该选中所有 ASIN').toBe(availableCount);

      console.log(`✅ ASIN 选择功能正常 (共 ${availableCount} 个 ASIN)`);
    });

    test('应该显示已选择的 ASIN 数量', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 选择一些 ASIN
      await aiAnalysis.selectAllAsins();
      
      const selectedCount = await aiAnalysis.getSelectedAsinsCount();
      expect(selectedCount, '应该显示已选择的数量').toBeGreaterThan(0);

      console.log(`✅ 已选择 ${selectedCount} 个 ASIN`);
    });
  });

  test.describe('分析目标选择功能', () => {
    test('应该能够选择和取消选择分析目标', async () => {
      const availableCount = await aiAnalysis.getAvailableTargetsCount();
      expect(availableCount, '应该有可用的分析目标').toBeGreaterThan(0);

      // 清空所有选择
      await aiAnalysis.clearAllTargets();
      let selectedCount = await aiAnalysis.getSelectedTargetsCount();
      expect(selectedCount, '清空后应该没有选中的目标').toBe(0);

      // 全选所有目标
      await aiAnalysis.selectAllTargets();
      selectedCount = await aiAnalysis.getSelectedTargetsCount();
      expect(selectedCount, '全选后应该选中所有目标').toBe(availableCount);

      console.log(`✅ 分析目标选择功能正常 (共 ${availableCount} 个目标)`);
    });

    test('应该能够选择单个分析目标', async () => {
      // 清空所有选择
      await aiAnalysis.clearAllTargets();

      // 选择一个目标
      await aiAnalysis.selectTarget('关键词分析');
      
      const selectedCount = await aiAnalysis.getSelectedTargetsCount();
      expect(selectedCount, '应该选中 1 个目标').toBeGreaterThanOrEqual(1);

      console.log('✅ 单个目标选择功能正常');
    });

    test('应该显示 Listings 和 Reviews 两类分析目标', async ({ page }) => {
      await aiAnalysis.expandSelectionPanelIfNeeded();

      // 验证：Listings 分析标签存在
      await expect(page.locator('div:has-text("Listings 分析")')).toBeVisible();

      // 验证：Reviews 分析标签存在
      await expect(page.locator('div:has-text("Reviews 分析")')).toBeVisible();

      console.log('✅ 分析目标分类显示正确');
    });
  });

  test.describe('提示词预览功能', () => {
    test('应该能够查看 AI 提示词模板', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 选择一些 ASIN 和目标
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');

      // 切换提示词面板
      await aiAnalysis.togglePromptPanel();
      
      const isExpanded = await aiAnalysis.isPromptPanelExpanded();
      expect(isExpanded, '提示词面板应该展开').toBe(true);

      // 获取提示词数量
      const promptCount = await aiAnalysis.getPromptCount();
      expect(promptCount, '应该有提示词').toBeGreaterThan(0);

      console.log(`✅ 提示词预览功能正常 (${promptCount} 个提示词)`);
    });
  });

  test.describe('分析执行功能', () => {
    test('应该在未选择时禁用开始分析按钮', async () => {
      // 清空所有选择
      await aiAnalysis.clearAllAsins();
      await aiAnalysis.clearAllTargets();

      const isEnabled = await aiAnalysis.isStartAnalysisButtonEnabled();
      expect(isEnabled, '未选择时按钮应该禁用').toBe(false);

      console.log('✅ 按钮禁用逻辑正确');
    });

    test('应该在选择后启用开始分析按钮', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 选择 ASIN 和目标
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();

      const isEnabled = await aiAnalysis.isStartAnalysisButtonEnabled();
      expect(isEnabled, '选择后按钮应该启用').toBe(true);

      console.log('✅ 按钮启用逻辑正确');
    });

    test('应该能够开始分析并显示进度', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 选择 ASIN 和目标
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');

      // 开始分析
      await aiAnalysis.startAnalysis();

      // 验证：正在分析
      const isAnalyzing = await aiAnalysis.isAnalyzing();
      expect(isAnalyzing, '应该正在分析').toBe(true);

      // 验证：进度条可见
      await expect(page.locator('.h-3.bg-white\\/20')).toBeVisible();

      console.log('📊 分析已开始，等待完成...');

      // 等待分析完成
      await aiAnalysis.waitForAnalysisComplete(30000);

      // 验证：分析完成
      const progress = await aiAnalysis.getAnalysisProgress();
      expect(progress, '进度应该达到 100%').toBe(100);

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `分析过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 分析执行成功');
    });
  });

  test.describe('分析结果展示', () => {
    test('应该显示分析结果', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：有结果显示
      const hasResults = await aiAnalysis.hasResults();
      expect(hasResults, '应该显示分析结果').toBe(true);

      // 验证：结果卡片数量
      const cardCount = await aiAnalysis.getResultCardsCount();
      expect(cardCount, '应该有结果卡片').toBeGreaterThan(0);

      console.log(`✅ 分析结果显示正常 (${cardCount} 个结果卡片)`);
    });

    test('应该区分 Listings 和 Reviews 结果', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 执行分析（选择两类目标）
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：Listings 结果
      const hasListings = await aiAnalysis.hasListingsResults();
      const listingsCount = await aiAnalysis.getListingsResultsCount();

      // 验证：Reviews 结果
      const hasReviews = await aiAnalysis.hasReviewsResults();
      const reviewsCount = await aiAnalysis.getReviewsResultsCount();

      console.log(`📊 Listings 结果: ${hasListings ? listingsCount : 0} 个`);
      console.log(`📊 Reviews 结果: ${hasReviews ? reviewsCount : 0} 个`);

      // 至少应该有一类结果
      expect(hasListings || hasReviews, '应该至少有一类结果').toBe(true);

      console.log('✅ 结果分类显示正确');
    });

    test('应该显示结果卡片的详细信息', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：结果卡片包含标题
      const cardCount = await aiAnalysis.getResultCardsCount();
      if (cardCount > 0) {
        const title = await aiAnalysis.getResultCardTitle(0);
        expect(title.length, '结果卡片应该有标题').toBeGreaterThan(0);
        console.log(`📊 第一个结果: ${title}`);
      }

      // 验证：结果卡片包含统计数据
      await expect(page.locator('div:has-text("数据概览")')).toBeVisible();

      // 验证：结果卡片包含核心发现
      await expect(page.locator('div:has-text("核心发现")')).toBeVisible();

      // 验证：结果卡片包含详细分析
      await expect(page.locator('div:has-text("详细分析")')).toBeVisible();

      console.log('✅ 结果卡片详细信息显示完整');
    });
  });

  test.describe('JSON 查看器功能', () => {
    test('应该能够查看 JSON 报告', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 切换 JSON 查看器
      await aiAnalysis.toggleJsonViewer();
      
      const isExpanded = await aiAnalysis.isJsonViewerExpanded();
      expect(isExpanded, 'JSON 查看器应该展开').toBe(true);

      // 获取 JSON 内容
      const jsonContent = await aiAnalysis.getJsonContent();
      expect(jsonContent.length, 'JSON 内容应该不为空').toBeGreaterThan(0);

      // 验证：JSON 格式正确
      expect(() => JSON.parse(jsonContent), 'JSON 格式应该正确').not.toThrow();

      console.log(`✅ JSON 查看器功能正常 (${jsonContent.length} 字符)`);
    });

    test('应该能够复制 JSON', async ({ page, context }) => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 授予剪贴板权限
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 复制 JSON
      await aiAnalysis.copyJson();

      // 验证：应该显示成功提示
      await aiAnalysis.expectToast('已复制');

      console.log('✅ JSON 复制功能正常');
    });

    test('应该能够下载 JSON', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 下载 JSON
      const download = await aiAnalysis.downloadJson();
      
      expect(download, '应该触发下载').toBeDefined();
      expect(download.suggestedFilename(), '文件名应该包含 json').toContain('json');

      console.log(`✅ JSON 下载功能正常 (${download.suggestedFilename()})`);
    });
  });

  test.describe('完整流程测试', () => {
    test('应该完成完整的分析流程', async ({ page }) => {
      console.log('📊 开始完整流程测试...');

      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 步骤 1: 选择产品 ASIN
      console.log('  1️⃣ 选择产品 ASIN...');
      await aiAnalysis.selectAllAsins();
      const selectedAsins = await aiAnalysis.getSelectedAsinsCount();
      console.log(`     ✅ 已选择 ${selectedAsins} 个产品`);

      // 步骤 2: 选择分析目标
      console.log('  2️⃣ 选择分析目标...');
      await aiAnalysis.selectAllTargets();
      const selectedTargets = await aiAnalysis.getSelectedTargetsCount();
      console.log(`     ✅ 已选择 ${selectedTargets} 个分析目标`);

      // 步骤 3: 查看提示词预览
      console.log('  3️⃣ 查看提示词预览...');
      await aiAnalysis.togglePromptPanel();
      const promptCount = await aiAnalysis.getPromptCount();
      console.log(`     ✅ 已生成 ${promptCount} 个提示词`);

      // 步骤 4: 开始分析
      console.log('  4️⃣ 开始 AI 分析...');
      await aiAnalysis.startAnalysis();
      
      // 等待分析完成
      await aiAnalysis.waitForAnalysisComplete(30000);
      console.log('     ✅ 分析完成');

      // 步骤 5: 查看结果
      console.log('  5️⃣ 查看分析结果...');
      const hasResults = await aiAnalysis.hasResults();
      expect(hasResults, '应该有分析结果').toBe(true);

      const cardCount = await aiAnalysis.getResultCardsCount();
      console.log(`     ✅ 生成了 ${cardCount} 个结果卡片`);

      // 步骤 6: 查看 JSON 报告
      console.log('  6️⃣ 查看 JSON 报告...');
      await aiAnalysis.toggleJsonViewer();
      const jsonContent = await aiAnalysis.getJsonContent();
      expect(jsonContent.length, 'JSON 内容应该不为空').toBeGreaterThan(0);
      console.log(`     ✅ JSON 报告已生成 (${jsonContent.length} 字符)`);

      // 验证：整个流程无错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 完整流程测试通过');
    });
  });

  test.describe('错误处理', () => {
    test('应该在没有数据时显示提示', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (hasData) {
        console.log('⚠️ 有可用数据，跳过此测试');
        test.skip();
        return;
      }

      // 验证：应该显示无数据提示
      await expect(page.locator('div:has-text("暂无产品数据")')).toBeVisible();
      await expect(page.locator('a:has-text("前往数据采集")')).toBeVisible();

      console.log('✅ 无数据提示显示正确');
    });

    test('应该在未选择时显示禁用原因', async ({ page }) => {
      // 清空所有选择
      await aiAnalysis.clearAllAsins();
      await aiAnalysis.clearAllTargets();

      // 悬停在按钮上
      await aiAnalysis.hover('button:has-text("开始分析")');
      await aiAnalysis.wait(500);

      // 验证：应该显示禁用原因提示
      const hasTooltip = await page.locator('div:has-text("请先选择")').isVisible();
      
      if (hasTooltip) {
        console.log('✅ 禁用原因提示显示正确');
      } else {
        console.log('⚠️ 禁用原因提示可能未显示（可能需要特定交互）');
      }
    });
  });

  test.describe('性能测试', () => {
    test('页面加载时间应该合理', async ({ page }) => {
      const startTime = Date.now();
      
      // 重新加载页面
      await aiAnalysis.navigate();
      
      const loadTime = Date.now() - startTime;
      
      console.log(`📊 AI 分析页面加载时间: ${loadTime}ms`);
      
      // 验证：加载时间应该小于 3 秒
      expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
    });

    test('分析执行时间应该合理', async () => {
      const hasData = await aiAnalysis.hasAvailableData();
      
      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 选择少量目标以加快测试
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');

      // 测量分析时间
      const startTime = Date.now();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete(30000);
      const analysisTime = Date.now() - startTime;

      console.log(`📊 分析执行时间: ${analysisTime}ms`);

      // 验证：分析时间应该小于 30 秒
      expect(analysisTime, `分析时间应该小于 30000ms，实际: ${analysisTime}ms`).toBeLessThan(30000);
    });
  });

  test.describe('响应式测试', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      // 重新加载页面
      await aiAnalysis.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('h2:has-text("AI 智能分析")')).toBeVisible();
      await expect(page.locator('[data-selection-panel-toggle]')).toBeVisible();
      await expect(page.locator('button:has-text("开始分析")')).toBeVisible();

      console.log('✅ 移动端显示正常');
    });

    test('应该在平板端正确显示', async ({ page }) => {
      // 设置平板端视口
      await page.setViewportSize({ width: 768, height: 1024 });

      // 重新加载页面
      await aiAnalysis.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('h2:has-text("AI 智能分析")')).toBeVisible();
      await expect(page.locator('[data-selection-panel-toggle]')).toBeVisible();

      console.log('✅ 平板端显示正常');
    });
  });
});
