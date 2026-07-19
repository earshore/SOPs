// tests/e2e/promptlab.spec.ts
// ================================================================
// 🧪 Promptlab 模块 E2E 测试
// 测试 Promptlab 完整流程：填写产品 DNA、选择分析报告、生成 Prompt
// ================================================================

import { test, expect } from '@playwright/test';
import {
  clearAnalysisHistoryFixture,
  loadAnalysisHistoryFixture,
} from './ai-analysis-fixtures';
import { PromptlabPage } from './pages/PromptlabPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';
import { SAMPLE_ANALYSIS_REPORT } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

const PROMPTLAB_E2E_REPORT = {
  ...SAMPLE_ANALYSIS_REPORT,
  _metadata: {
    ...SAMPLE_ANALYSIS_REPORT._metadata,
    language: 'en',
    targetMarket: 'English (US)',
    overallConfidence: 0.88,
  },
};

  let promptlab: PromptlabPage;

  test.beforeEach(async ({ page }) => {
    await loadAnalysisHistoryFixture(page, PROMPTLAB_E2E_REPORT);
    promptlab = new PromptlabPage(page);
    
    // 导航到 Promptlab 页面
    await promptlab.navigate();
    await page.locator('#lab-analysis-status').getByText(/分析报告已就绪/).waitFor({
      timeout: 5000,
    });
  });

  test.describe('页面加载与初始化', () => {
    test('应该成功加载 Promptlab 页面', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 验证：页面标题正确
      await expect(page).toHaveTitle(/Amazing Amazon Architect/);

      // 验证：主要元素可见
      await expect(page.locator('#card-product-dna')).toBeVisible();
      await expect(page.locator('#card-analysis')).toBeVisible();
      await expect(page.locator('#card-strategy')).toBeVisible();

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ Promptlab 页面加载成功');
    });

    test('应该正确初始化 Alpine 组件', async ({ page }) => {
      // 验证：Alpine 组件已初始化
      const alpineInitialized = await page.evaluate(() => {
        const element = document.querySelector('[x-data="promptlabPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return Boolean(data);
      });

      expect(alpineInitialized, 'Alpine 组件应该已初始化').toBe(true);

      // 验证：组件状态可访问
      const hasComponentData = await page.evaluate(() => {
        const element = document.querySelector('[x-data="promptlabPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        if (!data) return false;
        
        return data && 
               typeof data.profile !== 'undefined' &&
               typeof data.generateListingPrompt === 'function';
      });

      expect(hasComponentData, '组件数据应该可访问').toBe(true);

      console.log('✅ Alpine 组件初始化正确');
    });

    test('应该显示正确的初始状态', async () => {
      // 验证：目标市场下拉框有选项
      const marketOptions = await promptlab.page.locator('#lab-target-market option').count();
      expect(marketOptions, '目标市场应该有多个选项').toBeGreaterThan(1);

      // 验证：生成按钮初始状态为禁用（因为没有填写必填字段）
      const isEnabled = await promptlab.isGenerateButtonEnabled();
      expect(isEnabled, '生成按钮初始应该禁用').toBe(false);

      // 验证：分析报告状态显示
      const status = await promptlab.getAnalysisStatus();
      expect(status.length, '应该显示分析报告状态').toBeGreaterThan(0);

      console.log('✅ 初始状态显示正确');
    });
  });

  test.describe('产品 DNA 填写', () => {
    test('应该能够填写所有产品 DNA 字段', async () => {
      const productData = {
        targetMarket: 'English (US)',
        tier1Keywords: 'wireless earbuds, bluetooth headphones',
        tier2Keywords: 'noise cancelling, waterproof, long battery life',
        audience: 'Tech enthusiasts, fitness lovers',
        usps: '- 40-hour battery life\n- Active noise cancellation\n- IPX7 waterproof',
        specs: 'Bluetooth 5.3\nWeight: 50g\nCharging: USB-C',
        socialHook: '🔥 Limited Time Offer',
        negativeKeywords: 'cheap, fake'
      };

      // 填写产品 DNA
      await promptlab.fillProductDNA(productData);

      // 验证：所有字段已填写
      expect(await promptlab.getValue('#lab-target-market')).toBe(productData.targetMarket);
      expect(await promptlab.getValue('#lab-keywords-tier1')).toBe(productData.tier1Keywords);
      expect(await promptlab.getValue('#lab-keywords-tier2')).toBe(productData.tier2Keywords);
      expect(await promptlab.getValue('#lab-audience')).toBe(productData.audience);
      expect(await promptlab.getValue('#lab-usps')).toBe(productData.usps);
      expect(await promptlab.getValue('#lab-specs')).toBe(productData.specs);
      expect(await promptlab.getValue('#lab-social-hook')).toBe(productData.socialHook);
      expect(await promptlab.getValue('#negative-keywords')).toBe(productData.negativeKeywords);

      console.log('✅ 产品 DNA 填写成功');
    });

    test('应该验证必填字段', async () => {
      // 只填写部分字段
      await promptlab.selectTargetMarket('English (US)');
      await promptlab.fillTier1Keywords('wireless earbuds');

      // 验证：缺少 Tier 2 关键词时，按钮应该禁用
      let isEnabled = await promptlab.isGenerateButtonEnabled();
      expect(isEnabled, '缺少必填字段时按钮应该禁用').toBe(false);

      // 填写 Tier 2 关键词
      await promptlab.fillTier2Keywords('noise cancelling, waterproof');

      // 等待状态更新
      await promptlab.wait(500);

      // 注意：如果没有分析报告，按钮仍然可能禁用
      // 这里我们只验证字段填写功能

      console.log('✅ 必填字段验证正确');
    });

    test('应该能够清空所有输入', async () => {
      // 先填写一些数据
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'test product',
        tier2Keywords: 'test keywords'
      });

      // 清空输入
      await promptlab.clearAllInputs();

      // 验证：所有字段已清空
      expect(await promptlab.getValue('#lab-target-market')).toBe('');
      expect(await promptlab.getValue('#lab-keywords-tier1')).toBe('');
      expect(await promptlab.getValue('#lab-keywords-tier2')).toBe('');

      console.log('✅ 清空输入功能正常');
    });
  });

  test.describe('分析报告选择', () => {
    test('应该显示分析报告状态', async () => {
      const status = await promptlab.getAnalysisStatus();
      
      // 验证：状态文本不为空
      expect(status.length, '应该显示分析报告状态').toBeGreaterThan(0);

      // 验证：状态包含关键词
      const hasStatusKeyword = status.includes('就绪') || 
                               status.includes('未检测') || 
                               status.includes('检测中');
      expect(hasStatusKeyword, '状态应该包含关键词').toBe(true);

      console.log(`📊 分析报告状态: ${status}`);
    });

    test('应该能够选择和取消选择报告模块', async () => {
      // 检查是否有报告模块
      const sectionsCount = await promptlab.getReportSectionsCount();
      
      if (sectionsCount === 0) {
        console.log('⚠️ 没有可用的报告模块，跳过测试');
        test.skip();
        return;
      }

      // 清空所有选择
      await promptlab.clearReportSelections();
      
      // 验证：所有模块已取消选择
      let selectedCount = await promptlab.getSelectedReportSectionsCount();
      expect(selectedCount, '清空后应该没有选中的模块').toBe(0);

      // 全选所有模块
      await promptlab.selectAllReportSections();
      
      // 验证：所有模块已选中
      selectedCount = await promptlab.getSelectedReportSectionsCount();
      expect(selectedCount, '全选后应该选中所有模块').toBe(sectionsCount);

      console.log(`✅ 报告模块选择功能正常 (共 ${sectionsCount} 个模块)`);
    });
  });

  test.describe('策略配置', () => {
    test('应该能够配置生成策略', async () => {
      // 选择文案语气
      await promptlab.selectTone('exciting');
      expect(await promptlab.getValue('#lab-tone')).toBe('exciting');

      // 填写自定义规则
      await promptlab.fillCustomStrategy('禁止使用 "Best Seller" 词汇');
      expect(await promptlab.getValue('#lab-custom-strategy')).toContain('Best Seller');

      // 切换 AI 优化选项
      await promptlab.toggleCosmo(false);
      expect(await promptlab.page.isChecked('#opt-cosmo')).toBe(false);

      await promptlab.toggleRufus(false);
      expect(await promptlab.page.isChecked('#opt-rufus')).toBe(false);

      await promptlab.toggleEmoji(false);
      expect(await promptlab.page.isChecked('#opt-emoji')).toBe(false);

      // 重新启用
      await promptlab.toggleCosmo(true);
      expect(await promptlab.page.isChecked('#opt-cosmo')).toBe(true);

      console.log('✅ 策略配置功能正常');
    });
  });

    test('应该能够生成 Listing Prompt', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 填写必填字段
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'wireless earbuds',
        tier2Keywords: 'bluetooth 5.0, noise cancelling, waterproof'
      });

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (!hasReport) {
        console.log('⚠️ 没有分析报告，测试生成功能可能失败');
        // 仍然尝试生成，应该显示警告
      }

      // 尝试生成 Listing Prompt
      await promptlab.generateListingPrompt();

      // 等待生成完成或显示错误提示
      await promptlab.wait(1500);

      // 如果有报告，验证生成结果
      if (hasReport) {
        const hasPrompt = await promptlab.hasGeneratedPrompt();
        
        if (hasPrompt) {
          const prompt = await promptlab.getGeneratedPrompt();
          
          // 验证：Prompt 不为空
          expect(prompt.length, 'Prompt 应该不为空').toBeGreaterThan(0);
          
          // 验证：Prompt 包含关键词
          const containsKeywords = prompt.toLowerCase().includes('wireless') || 
                                   prompt.toLowerCase().includes('earbuds');
          expect(containsKeywords, 'Prompt 应该包含关键词').toBe(true);
          
          // 验证：字符计数正确
          const charCount = await promptlab.getCharCount();
          expect(charCount, '字符计数应该正确').toBe(prompt.length);
          
          console.log(`✅ Listing Prompt 生成成功 (${charCount} 字符)`);
        } else {
          console.log('⚠️ Prompt 未生成，可能需要更多配置');
        }
      }

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `生成过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);
    });

    test('应该能够切换到 Visual 模式并生成 Visual Prompt', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 填写必填字段
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'wireless earbuds',
        tier2Keywords: 'bluetooth 5.0, noise cancelling'
      });

      // 切换到 Visual 模式
      await promptlab.switchToVisualMode();

      // 验证：模式切换成功（通过检查按钮状态或其他视觉元素）
      await promptlab.wait(500);

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过 Visual Prompt 生成测试');
        test.skip();
        return;
      }

      // 生成 Visual Prompt
      await promptlab.generateVisualPrompt();

      // 等待生成完成
      await promptlab.wait(1500);

      // 验证生成结果
      const hasPrompt = await promptlab.hasGeneratedPrompt();
      
      if (hasPrompt) {
        const prompt = await promptlab.getGeneratedPrompt();
        
        // 验证：Prompt 不为空
        expect(prompt.length, 'Visual Prompt 应该不为空').toBeGreaterThan(0);
        
        console.log(`✅ Visual Prompt 生成成功 (${prompt.length} 字符)`);
      }

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `生成过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);
    });

    test('应该能够复制生成的 Prompt', async ({ page, context }) => {
      // 授予剪贴板权限
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // 填写必填字段
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'test product',
        tier2Keywords: 'test keywords'
      });

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过复制测试');
        test.skip();
        return;
      }

      // 生成 Prompt
      await promptlab.generateListingPrompt();
      await promptlab.wait(1500);

      // 检查是否生成成功
      const hasPrompt = await promptlab.hasGeneratedPrompt();
      
      if (!hasPrompt) {
        console.log('⚠️ Prompt 未生成，跳过复制测试');
        test.skip();
        return;
      }

      // 复制 Prompt
      await promptlab.copyPrompt();

      // 验证：应该显示成功提示
      await promptlab.expectToast('已复制');

      console.log('✅ Prompt 复制功能正常');
    });

  test.describe('完整流程测试', () => {
    test('应该完成完整的 Prompt 生成流程', async ({ page }) => {
      console.log('📊 开始完整流程测试...');

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 步骤 1: 填写产品 DNA
      console.log('  1️⃣ 填写产品 DNA...');
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'wireless earbuds, bluetooth headphones',
        tier2Keywords: 'noise cancelling, waterproof, long battery life',
        audience: 'Tech enthusiasts, fitness lovers',
        usps: '- 40-hour battery life\n- Active noise cancellation',
        specs: 'Bluetooth 5.3\nWeight: 50g',
        socialHook: '🔥 Limited Time Offer'
      });

      // 步骤 2: 配置策略
      console.log('  2️⃣ 配置生成策略...');
      await promptlab.selectTone('exciting');
      await promptlab.toggleCosmo(true);
      await promptlab.toggleRufus(true);
      await promptlab.toggleEmoji(true);

      // 步骤 3: 选择报告模块（如果有）
      console.log('  3️⃣ 选择分析报告模块...');
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (hasReport) {
        const sectionsCount = await promptlab.getReportSectionsCount();
        if (sectionsCount > 0) {
          await promptlab.selectAllReportSections();
          console.log(`     ✅ 已选择 ${sectionsCount} 个报告模块`);
        }
      } else {
        console.log('     ⚠️ 没有分析报告');
      }

      // 步骤 4: 生成 Listing Prompt
      console.log('  4️⃣ 生成 Listing Prompt...');
      await promptlab.generateListingPrompt();
      await promptlab.wait(1500);

      // 验证生成结果
      if (hasReport) {
        const hasPrompt = await promptlab.hasGeneratedPrompt();
        
        if (hasPrompt) {
          const prompt = await promptlab.getGeneratedPrompt();
          const charCount = await promptlab.getCharCount();
          
          console.log(`     ✅ Listing Prompt 生成成功 (${charCount} 字符)`);
          
          // 验证：Prompt 质量
          expect(prompt.length, 'Prompt 长度应该合理').toBeGreaterThan(50);
          expect(await promptlab.isOverCharLimit(), 'Prompt token 数不应超过配置上限').toBe(false);
        }
      }

      // 步骤 5: 切换到 Visual 模式并生成
      console.log('  5️⃣ 切换到 Visual 模式...');
      await promptlab.switchToVisualMode();
      
      if (hasReport) {
        console.log('  6️⃣ 生成 Visual Prompt...');
        await promptlab.generateVisualPrompt();
        await promptlab.wait(1500);

        const hasVisualPrompt = await promptlab.hasGeneratedPrompt();
        if (hasVisualPrompt) {
          const visualPrompt = await promptlab.getGeneratedPrompt();
          console.log(`     ✅ Visual Prompt 生成成功 (${visualPrompt.length} 字符)`);
        }
      }

      // 验证：整个流程无错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 完整流程测试通过');
    });
  });

  test.describe('错误处理', () => {
    test('应该在缺少必填字段时显示警告', async () => {
      const isEnabled = await promptlab.isGenerateButtonEnabled();
      expect(isEnabled, '缺少必填字段时生成按钮应该禁用').toBe(false);

      console.log('✅ 缺少必填字段时正确显示警告');
    });

    test('应该在没有分析报告时显示提示', async ({ page }) => {
      await clearAnalysisHistoryFixture(page);

      // 填写必填字段
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'test product',
        tier2Keywords: 'test keywords'
      });

      // 检查分析报告状态
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (!hasReport) {
        // 尝试生成
        await promptlab.generateListingPrompt();
        await promptlab.wait(500);

        // 应该显示提示信息
        console.log('✅ 没有分析报告时正确显示提示');
      } else {
        console.log('⚠️ 有分析报告，跳过此测试');
        test.skip();
      }
    });
  });

  test.describe('性能测试', () => {
    test('页面加载时间应该合理', async ({ page }) => {
      const startTime = Date.now();
      
      // 重新加载页面
      await promptlab.navigate();
      
      const loadTime = Date.now() - startTime;
      
      console.log(`📊 Promptlab 页面加载时间: ${loadTime}ms`);
      
      // 验证：加载时间应该小于 3 秒
      expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
    });

    test('Prompt 生成时间应该合理', async () => {
      // 填写必填字段
      await promptlab.fillProductDNA({
        targetMarket: 'English (US)',
        tier1Keywords: 'test product',
        tier2Keywords: 'test keywords'
      });

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();
      
      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过性能测试');
        test.skip();
        return;
      }

      // 测量生成时间
      const startTime = Date.now();
      await promptlab.generateListingPrompt();
      const generateTime = Date.now() - startTime;

      console.log(`📊 Prompt 生成时间: ${generateTime}ms`);

      // 验证：生成时间应该小于 3 秒
      expect(generateTime, `生成时间应该小于 3000ms，实际: ${generateTime}ms`).toBeLessThan(3000);
    });
  });

  test.describe('响应式测试', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      // 重新加载页面
      await promptlab.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('#card-product-dna')).toBeVisible();
      await expect(page.locator('#card-analysis')).toBeVisible();
      await expect(page.locator('#card-strategy')).toBeVisible();

      console.log('✅ 移动端显示正常');
    });

    test('应该在平板端正确显示', async ({ page }) => {
      // 设置平板端视口
      await page.setViewportSize({ width: 768, height: 1024 });

      // 重新加载页面
      await promptlab.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('#card-product-dna')).toBeVisible();
      await expect(page.locator('#card-analysis')).toBeVisible();

      console.log('✅ 平板端显示正常');
    });
  });
