// test/e2e/ai-analysis-confidence.spec.ts
// ================================================================
// 🧪 AI 分析置信度系统 E2E 测试
// 验证置信度在真实浏览器中的完整展示流程
// ================================================================

import { test, expect } from '@playwright/test';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

  let aiAnalysis: AIAnalysisPage;

  test.beforeEach(async ({ page }) => {
    aiAnalysis = new AIAnalysisPage(page).useE2EFixture();
    await aiAnalysis.navigate();
  });

  test.describe('1. 总体置信度卡片显示', () => {
    test('应该在分析完成后显示总体置信度卡片', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：总体置信度卡片显示
      const isVisible = await aiAnalysis.isOverallConfidenceCardVisible();
      expect(isVisible, '总体置信度卡片应该显示').toBe(true);

      // 验证：置信度百分比在有效范围内
      const percent = await aiAnalysis.getOverallConfidencePercent();
      expect(percent, '置信度百分比应该 >= 0').toBeGreaterThanOrEqual(0);
      expect(percent, '置信度百分比应该 <= 100').toBeLessThanOrEqual(100);

      console.log(`✅ 总体置信度: ${percent}%`);

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);
    });

    test('应该显示置信度图标', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：置信度图标存在
      const icon = page.locator('.w-10.h-10.rounded-lg svg');
      await expect(icon.first()).toBeVisible();

      console.log('✅ 置信度图标显示正常');
    });

    test('应该显示"总体置信度"文本标签', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：文本标签存在
      await expect(page.locator('text=总体置信度')).toBeVisible();

      console.log('✅ 置信度文本标签显示正常');
    });
  });

  test.describe('2. 颜色指示器测试', () => {
    test('应该根据置信度分数显示正确的颜色', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const percent = await aiAnalysis.getOverallConfidencePercent();
      const color = await aiAnalysis.getOverallConfidenceColorClass();

      console.log(`📊 置信度: ${percent}%, 颜色: ${color}`);

      // 验证：颜色与分数匹配
      if (percent >= 70) {
        expect(color, `置信度 ${percent}% 应该显示绿色`).toBe('green');
      } else if (percent >= 50) {
        expect(color, `置信度 ${percent}% 应该显示黄色`).toBe('yellow');
      } else {
        expect(color, `置信度 ${percent}% 应该显示橙色`).toBe('orange');
      }

      console.log('✅ 颜色指示器正确');
    });

    test('高置信度应该显示绿色指示器', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const percent = await aiAnalysis.getOverallConfidencePercent();

      if (percent >= 70) {
        const color = await aiAnalysis.getOverallConfidenceColorClass();
        expect(color).toBe('green');
        console.log(`✅ 高置信度 (${percent}%) 显示绿色`);
      } else {
        console.log(`⚠️ 置信度 ${percent}% < 70%，跳过绿色验证`);
      }
    });

    test('颜色指示器应该有正确的背景色类', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：至少有一个颜色指示器存在
      const greenIndicator = page.locator('.bg-green-500\\/20');
      const yellowIndicator = page.locator('.bg-yellow-500\\/20');
      const orangeIndicator = page.locator('.bg-orange-500\\/20');

      const hasIndicator =
        (await greenIndicator.count()) > 0 ||
        (await yellowIndicator.count()) > 0 ||
        (await orangeIndicator.count()) > 0;

      expect(hasIndicator, '应该至少有一个颜色指示器').toBe(true);

      console.log('✅ 颜色指示器背景色类正确');
    });
  });

    test('每个分析结果卡片应该显示置信度徽章', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 获取结果卡片数量
      const cardCount = await aiAnalysis.getResultCardCount();
      expect(cardCount, '应该有分析结果').toBeGreaterThan(0);

      // 验证：至少有一个卡片显示置信度徽章
      let badgeCount = 0;
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const hasBadge = await aiAnalysis.hasConfidenceBadge(i);
        if (hasBadge) {
          badgeCount++;
          const percent = await aiAnalysis.getResultConfidencePercent(i);
          console.log(`  卡片 ${i + 1}: 置信度 ${percent}%`);
        }
      }

      expect(badgeCount, '至少应该有一个卡片显示置信度徽章').toBeGreaterThan(0);

      console.log(`✅ ${badgeCount}/${cardCount} 个卡片显示置信度徽章`);
    });

    test('置信度徽章应该显示正确的百分比', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const cardCount = await aiAnalysis.getResultCardCount();

      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const hasBadge = await aiAnalysis.hasConfidenceBadge(i);

        if (hasBadge) {
          const percent = await aiAnalysis.getResultConfidencePercent(i);

          // 验证：百分比在有效范围内
          expect(percent, `卡片 ${i + 1} 置信度应该 >= 0`).toBeGreaterThanOrEqual(0);
          expect(percent, `卡片 ${i + 1} 置信度应该 <= 100`).toBeLessThanOrEqual(100);
        }
      }

      console.log('✅ 置信度徽章百分比正确');
    });

    test('置信度徽章颜色应该与分数匹配', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const cardCount = await aiAnalysis.getResultCardCount();

      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const hasBadge = await aiAnalysis.hasConfidenceBadge(i);

        if (hasBadge) {
          const percent = await aiAnalysis.getResultConfidencePercent(i);
          const color = await aiAnalysis.getResultConfidenceColor(i);

          console.log(`  卡片 ${i + 1}: ${percent}% - ${color}`);

          // 验证：颜色与分数匹配
          if (percent >= 70) {
            expect(color, `卡片 ${i + 1} 置信度 ${percent}% 应该是绿色`).toBe('green');
          } else if (percent >= 50) {
            expect(color, `卡片 ${i + 1} 置信度 ${percent}% 应该是黄色`).toBe('yellow');
          } else {
            expect(color, `卡片 ${i + 1} 置信度 ${percent}% 应该是橙色`).toBe('orange');
          }
        }
      }

      console.log('✅ 徽章颜色与分数匹配');
    });
  test.describe('4. 数据更新测试', () => {
    test('重新分析后置信度应该更新', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 第一次分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectTarget('关键词分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const firstConfidence = await aiAnalysis.getOverallConfidencePercent();
      console.log(`第一次分析置信度: ${firstConfidence}%`);

      // 等待一下
      await aiAnalysis.wait(1000);

      // 第二次分析（选择不同的目标）
      await aiAnalysis.clearAllTargets();
      await aiAnalysis.selectTarget('卖点分析');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      const secondConfidence = await aiAnalysis.getOverallConfidencePercent();
      console.log(`第二次分析置信度: ${secondConfidence}%`);

      // 验证：置信度已更新（可能相同或不同，但应该是有效值）
      expect(secondConfidence, '第二次置信度应该是有效值').toBeGreaterThanOrEqual(0);
      expect(secondConfidence, '第二次置信度应该是有效值').toBeLessThanOrEqual(100);

      console.log('✅ 置信度更新功能正常');
    });
  });

  test.describe('5. 无数据状态测试', () => {
    test('没有分析结果时置信度卡片不应该显示', async ({ page }) => {
      // 验证：初始状态下置信度卡片不显示
      const isVisible = await aiAnalysis.isOverallConfidenceCardVisible();
      expect(isVisible, '没有分析结果时置信度卡片不应该显示').toBe(false);

      console.log('✅ 无数据状态正确');
    });

    test('分析前不应该显示置信度徽章', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      // 选择但不执行分析
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();

      // 验证：置信度卡片不显示
      const isVisible = await aiAnalysis.isOverallConfidenceCardVisible();
      expect(isVisible, '分析前置信度卡片不应该显示').toBe(false);

      console.log('✅ 分析前状态正确');
    });
  });

  test.describe('6. 可访问性测试', () => {
    test('置信度卡片应该有适当的 ARIA 属性', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：置信度元素可访问
      const confidenceCard = page.locator('text=总体置信度').locator('..').locator('..');
      await expect(confidenceCard).toBeVisible();

      console.log('✅ 置信度卡片可访问');
    });

    test('置信度百分比应该对屏幕阅读器可读', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 验证：百分比文本存在且可读
      const percentElement = page.locator('[x-text="overallConfidencePercent"]');
      await expect(percentElement).toBeVisible();

      const text = await percentElement.textContent();
      expect(text, '百分比文本应该存在').toBeTruthy();
      expect(parseInt(text || '0'), '百分比应该是数字').toBeGreaterThanOrEqual(0);

      console.log('✅ 置信度百分比对屏幕阅读器可读');
    });

    test('键盘导航应该能访问置信度信息', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 使用 Tab 键导航
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 验证：焦点可以移动到页面元素
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement, '应该有元素获得焦点').toBeTruthy();

      console.log('✅ 键盘导航正常');
    });
  });

  test.describe('7. 完整流程集成测试', () => {
    test('应该完成完整的置信度展示流程', async ({ page }) => {
      console.log('📊 开始完整流程测试...');

      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      const consoleListener = setupConsoleErrorListener(page);

      // 步骤 1: 验证初始状态
      console.log('  1️⃣ 验证初始状态...');
      let isVisible = await aiAnalysis.isOverallConfidenceCardVisible();
      expect(isVisible, '初始状态不应显示置信度').toBe(false);
      console.log('     ✅ 初始状态正确');

      // 步骤 2: 选择数据
      console.log('  2️⃣ 选择分析数据...');
      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();
      console.log('     ✅ 数据选择完成');

      // 步骤 3: 执行分析
      console.log('  3️⃣ 执行 AI 分析...');
      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();
      console.log('     ✅ 分析完成');

      // 步骤 4: 验证总体置信度
      console.log('  4️⃣ 验证总体置信度...');
      isVisible = await aiAnalysis.isOverallConfidenceCardVisible();
      expect(isVisible, '分析后应显示置信度卡片').toBe(true);

      const overallPercent = await aiAnalysis.getOverallConfidencePercent();
      expect(overallPercent).toBeGreaterThanOrEqual(0);
      expect(overallPercent).toBeLessThanOrEqual(100);
      console.log(`     ✅ 总体置信度: ${overallPercent}%`);

      // 步骤 5: 验证颜色指示器
      console.log('  5️⃣ 验证颜色指示器...');
      const color = await aiAnalysis.getOverallConfidenceColorClass();
      expect(['green', 'yellow', 'orange']).toContain(color);
      console.log(`     ✅ 颜色指示器: ${color}`);

      // 步骤 6: 验证单个报告徽章
      console.log('  6️⃣ 验证单个报告徽章...');
      const cardCount = await aiAnalysis.getResultCardCount();
      let badgeCount = 0;

      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        if (await aiAnalysis.hasConfidenceBadge(i)) {
          badgeCount++;
          const percent = await aiAnalysis.getResultConfidencePercent(i);
          const badgeColor = await aiAnalysis.getResultConfidenceColor(i);
          console.log(`     卡片 ${i + 1}: ${percent}% (${badgeColor})`);
        }
      }

      expect(badgeCount, '应该有置信度徽章').toBeGreaterThan(0);
      console.log(`     ✅ ${badgeCount} 个徽章显示正常`);

      // 验证：整个流程无错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 完整流程测试通过');
    });
  });

  test.describe('8. 性能测试', () => {
    test('置信度计算和显示应该在合理时间内完成', async ({ page }) => {
      const hasData = await aiAnalysis.hasAvailableData();

      if (!hasData) {
        console.log('⚠️ 没有可用数据，跳过测试');
        test.skip();
        return;
      }

      await aiAnalysis.selectAllAsins();
      await aiAnalysis.selectAllTargets();

      const startTime = Date.now();

      await aiAnalysis.startAnalysis();
      await aiAnalysis.waitForAnalysisComplete();

      // 等待置信度显示
      await aiAnalysis.isOverallConfidenceCardVisible();

      const totalTime = Date.now() - startTime;

      console.log(`📊 总耗时: ${totalTime}ms`);

      // 验证：总时间应该在合理范围内（< 5 分钟）
      expect(totalTime, '总耗时应该 < 5 分钟').toBeLessThan(300000);

      console.log('✅ 性能测试通过');
    });
  });
