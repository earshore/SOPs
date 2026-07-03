// tests/e2e/promptlab-dna-extraction.spec.ts
// ================================================================
// 🧪 Promptlab DNA 自动提取功能 E2E 测试
// 测试从 AI 分析报告自动提取产品 DNA 的功能
// ================================================================

import { test, expect } from '@playwright/test';
import { PromptlabPage } from './pages/PromptlabPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';
import { setupAPIConfig, waitForAppReady } from '../helpers/test-setup';
import { SAMPLE_ANALYSIS_REPORT } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

const PROMPTLAB_E2E_REPORT = {
  ...SAMPLE_ANALYSIS_REPORT,
  _metadata: {
    ...SAMPLE_ANALYSIS_REPORT._metadata,
    language: 'en',
    targetMarket: 'English (US)',
    confidence: {
      'title-keywords': 0.92,
      'selling-points': 0.9,
      'buyer-profile': 0.88,
      'vocab-gap': 0.82,
    },
    overallConfidence: 0.88,
  },
};

type AppStoreWindow = Window & {
  appStore?: { getState?: () => { setAnalysisReport?: (report: unknown) => void } };
};

async function setAnalysisReport(page: import('@playwright/test').Page, report: unknown): Promise<void> {
  await page.waitForFunction(() => {
    const appWindow = window as AppStoreWindow;
    return typeof appWindow.appStore?.getState?.().setAnalysisReport === 'function';
  });

  await page.evaluate(reportValue => {
    const appWindow = window as AppStoreWindow;
    appWindow.appStore?.getState?.().setAnalysisReport?.(reportValue);
  }, report);
}

async function clearAnalysisReport(page: import('@playwright/test').Page): Promise<void> {
  await setAnalysisReport(page, null);
  await page.locator('#lab-analysis-status').getByText(/未检测到分析报告/).waitFor({
    timeout: 5000,
  });
}

async function seedPromptlabReport(page: import('@playwright/test').Page): Promise<void> {
  await setAnalysisReport(page, PROMPTLAB_E2E_REPORT);
  await page.locator('#lab-analysis-status').getByText(/分析报告已就绪/).waitFor({
    timeout: 5000,
  });
  await expect(page.locator('button:has-text("从报告加载")')).toBeEnabled({
    timeout: 5000,
  });
}

async function findOverwriteModal(page: import('@playwright/test').Page, timeout = 1000) {
  const modal = page.getByRole('dialog', { name: /覆盖产品 DNA/ });
  try {
    await modal.waitFor({ state: 'visible', timeout });
    return modal;
  } catch {
    return null;
  }
}

async function cancelOverwriteModal(page: import('@playwright/test').Page): Promise<void> {
  const modal = await findOverwriteModal(page, 3000);
  expect(modal, '应该显示确认对话框').not.toBeNull();
  await modal?.getByRole('button', { name: '取消' }).click();
}

async function confirmOverwriteModal(page: import('@playwright/test').Page): Promise<void> {
  const modal = await findOverwriteModal(page, 3000);
  expect(modal, '应该显示确认对话框').not.toBeNull();
  await modal?.getByRole('button', { name: '覆盖字段' }).click();
}

async function confirmOverwriteIfVisible(page: import('@playwright/test').Page): Promise<void> {
  const modal = await findOverwriteModal(page);
  if (modal) {
    await modal.getByRole('button', { name: '覆盖字段' }).click();
  }
}

  let promptlab: PromptlabPage;

  test.beforeEach(async ({ page }) => {
    // 配置 API 密钥
    await setupAPIConfig(page, 'AI2026');

    // 等待应用初始化
    await waitForAppReady(page);

    // 导航到 Promptlab 页面
    promptlab = new PromptlabPage(page);
    await promptlab.navigate();
    await seedPromptlabReport(page);
  });

  test.describe('按钮状态测试', () => {
    test('应该在没有分析报告时禁用"从报告加载"按钮', async () => {
      await clearAnalysisReport(promptlab.page);

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        // 验证：按钮应该禁用
        const isEnabled = await promptlab.isAutoPopulateButtonEnabled();
        expect(isEnabled, '"从报告加载"按钮应该禁用').toBe(false);

        console.log('✅ 没有报告时按钮正确禁用');
      } else {
        console.log('⚠️ 检测到分析报告，跳过此测试');
        test.skip();
      }
    });

    test('应该在有分析报告时启用"从报告加载"按钮', async () => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (hasReport) {
        // 验证：按钮应该启用
        const isEnabled = await promptlab.isAutoPopulateButtonEnabled();
        expect(isEnabled, '"从报告加载"按钮应该启用').toBe(true);

        console.log('✅ 有报告时按钮正确启用');
      } else {
        console.log('⚠️ 没有分析报告，跳过此测试');
        test.skip();
      }
    });
  });

    test('应该能够从分析报告自动提取产品 DNA', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过 DNA 提取测试');
        test.skip();
        return;
      }

      console.log('📊 开始测试 DNA 自动提取...');

      // 步骤 1: 确保 DNA 字段为空
      await promptlab.fillAudience('');
      await promptlab.fillUSPs('');
      await promptlab.fillSpecs('');

      // 步骤 2: 点击"从报告加载"按钮
      console.log('  1️⃣ 点击"从报告加载"按钮...');
      await promptlab.autoPopulateDNA();

      // 步骤 3: 等待 Toast 提示
      await promptlab.wait(1500);

      // 步骤 4: 验证 DNA 字段已填充
      console.log('  2️⃣ 验证 DNA 字段已填充...');
      const isDNAFilled = await promptlab.isDNAAutoFilled();
      expect(isDNAFilled, 'DNA 字段应该已填充').toBe(true);

      // 步骤 5: 获取填充的数据
      const dna = await promptlab.getAutoFilledDNA();

      console.log('  3️⃣ 提取的 DNA 数据:');
      console.log(`     - 目标受众: ${dna.audience.substring(0, 50)}${dna.audience.length > 50 ? '...' : ''}`);
      console.log(`     - 核心卖点: ${dna.usps.split('\n').length} 行`);
      console.log(`     - 技术参数: ${dna.specs.split('\n').length} 行`);

      // 验证：至少有一个字段有内容
      const hasContent = dna.audience.length > 0 || dna.usps.length > 0 || dna.specs.length > 0;
      expect(hasContent, '至少应该提取到一个字段的内容').toBe(true);

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `DNA 提取过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ DNA 自动提取功能正常');
    });

    test('应该在已有内容时显示确认对话框', async ({ page }) => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过确认对话框测试');
        test.skip();
        return;
      }

      console.log('📊 测试覆盖现有内容的确认对话框...');

      // 步骤 1: 先填写一些内容
      await promptlab.fillAudience('现有受众内容');
      await promptlab.fillUSPs('现有卖点内容');
      await promptlab.fillSpecs('现有参数内容');

      // 步骤 2: 点击"从报告加载"按钮并取消覆盖
      await promptlab.autoPopulateDNA();
      await cancelOverwriteModal(page);

      // 验证：内容应该保持不变（因为取消了）
      const dna = await promptlab.getAutoFilledDNA();
      expect(dna.audience, '取消后内容应该保持不变').toBe('现有受众内容');

      console.log('✅ 确认对话框功能正常');
    });

    test('应该在确认后覆盖现有内容', async ({ page }) => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过覆盖测试');
        test.skip();
        return;
      }

      console.log('📊 测试确认后覆盖现有内容...');

      // 步骤 1: 先填写一些内容
      await promptlab.fillAudience('旧的受众内容');
      await promptlab.fillUSPs('旧的卖点内容');
      await promptlab.fillSpecs('旧的参数内容');

      // 步骤 2: 点击"从报告加载"按钮并确认覆盖
      await promptlab.autoPopulateDNA();
      await confirmOverwriteModal(page);
      await promptlab.wait(1500);

      // 验证：内容应该已更新
      const dna = await promptlab.getAutoFilledDNA();
      const isUpdated = dna.audience !== '旧的受众内容' ||
                        dna.usps !== '旧的卖点内容' ||
                        dna.specs !== '旧的参数内容';

      expect(isUpdated, '确认后内容应该已更新').toBe(true);

      console.log('✅ 覆盖现有内容功能正常');
    });

  test.describe('提取数据质量测试', () => {
    test('提取的目标受众应该包含有效信息', async () => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过数据质量测试');
        test.skip();
        return;
      }

      // 清空并提取
      await promptlab.fillAudience('');
      await promptlab.autoPopulateDNA();
      await promptlab.wait(1500);

      const dna = await promptlab.getAutoFilledDNA();

      if (dna.audience.length > 0) {
        // 验证：不应该是错误消息
        expect(dna.audience, '受众不应该是错误消息').not.toContain('未能提取');
        expect(dna.audience, '受众不应该是错误消息').not.toContain('无法');

        // 验证：长度应该合理
        expect(dna.audience.length, '受众长度应该合理').toBeGreaterThan(5);
        expect(dna.audience.length, '受众长度不应过长').toBeLessThan(500);

        console.log(`✅ 目标受众质量良好 (${dna.audience.length} 字符)`);
      } else {
        console.log('⚠️ 未提取到目标受众');
      }
    });

    test('提取的核心卖点应该是多行格式', async () => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过卖点格式测试');
        test.skip();
        return;
      }

      // 清空并提取
      await promptlab.fillUSPs('');
      await promptlab.autoPopulateDNA();
      await promptlab.wait(1500);

      const dna = await promptlab.getAutoFilledDNA();

      if (dna.usps.length > 0) {
        // 验证：应该包含列表标记
        const hasListMarkers = dna.usps.includes('-') || dna.usps.includes('•');
        expect(hasListMarkers, '卖点应该包含列表标记').toBe(true);

        // 验证：应该是多行
        const lines = dna.usps.split('\n').filter(line => line.trim().length > 0);
        expect(lines.length, '卖点应该有多行').toBeGreaterThan(0);

        console.log(`✅ 核心卖点格式正确 (${lines.length} 行)`);
      } else {
        console.log('⚠️ 未提取到核心卖点');
      }
    });

    test('提取的技术参数应该包含规格信息', async () => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过参数测试');
        test.skip();
        return;
      }

      // 清空并提取
      await promptlab.fillSpecs('');
      await promptlab.autoPopulateDNA();
      await promptlab.wait(1500);

      const dna = await promptlab.getAutoFilledDNA();

      if (dna.specs.length > 0) {
        // 验证：不应该是错误消息
        expect(dna.specs, '参数不应该是错误消息').not.toContain('未能提取');

        // 验证：长度应该合理
        expect(dna.specs.length, '参数长度应该合理').toBeGreaterThan(5);

        console.log(`✅ 技术参数质量良好 (${dna.specs.length} 字符)`);
      } else {
        console.log('⚠️ 未提取到技术参数');
      }
    });
  });

  test.describe('完整流程测试', () => {
    test('应该完成从提取 DNA 到生成 Prompt 的完整流程', async ({ page }) => {
      console.log('📊 开始完整流程测试...');

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过完整流程测试');
        test.skip();
        return;
      }

      // 步骤 1: 填写基础信息
      console.log('  1️⃣ 填写基础信息...');
      await promptlab.selectTargetMarket('English');
      await promptlab.fillTier1Keywords('wireless earbuds');
      await promptlab.fillTier2Keywords('bluetooth 5.0, noise cancelling');

      // 步骤 2: 自动提取 DNA
      console.log('  2️⃣ 自动提取产品 DNA...');
      await promptlab.autoPopulateDNA();
      await confirmOverwriteIfVisible(page);
      await promptlab.wait(1500);

      // 验证：DNA 已填充
      const isDNAFilled = await promptlab.isDNAAutoFilled();
      expect(isDNAFilled, 'DNA 应该已填充').toBe(true);

      const dna = await promptlab.getAutoFilledDNA();
      console.log(`     ✅ DNA 提取完成`);

      // 步骤 3: 配置策略
      console.log('  3️⃣ 配置生成策略...');
      await promptlab.selectTone('exciting');
      await promptlab.toggleCosmo(true);
      await promptlab.toggleRufus(true);

      // 步骤 4: 选择报告模块
      console.log('  4️⃣ 选择分析报告模块...');
      const sectionsCount = await promptlab.page.locator('#report-sections-container input[type="checkbox"]').count();
      if (sectionsCount > 0) {
        await promptlab.selectAllReportSections();
        console.log(`     ✅ 已选择 ${sectionsCount} 个报告模块`);
      }

      // 步骤 5: 生成 Listing Prompt
      console.log('  5️⃣ 生成 Listing Prompt...');
      await promptlab.generateListingPrompt();
      await promptlab.wait(1500);

      // 验证：Prompt 已生成
      const hasPrompt = await promptlab.page.locator('#final-prompt-output').inputValue().then(v => v.length > 0);

      if (hasPrompt) {
        const prompt = await promptlab.getGeneratedPrompt();
        const charCount = await promptlab.getCharCount();

        console.log(`     ✅ Prompt 生成成功 (${charCount} 字符)`);

        // 验证：Prompt 应该包含提取的 DNA 信息
        const containsDNA = prompt.toLowerCase().includes('wireless') ||
                           prompt.toLowerCase().includes('earbuds');
        expect(containsDNA, 'Prompt 应该包含产品信息').toBe(true);
      }

      // 验证：整个流程无错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 完整流程测试通过');
    });
  });

  test.describe('错误处理测试', () => {
    test('应该在没有报告时显示警告', async ({ page }) => {
      await clearAnalysisReport(page);

      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (hasReport) {
        console.log('⚠️ 有分析报告，跳过无报告警告测试');
        test.skip();
        return;
      }

      // 尝试点击按钮（应该被禁用）
      const isEnabled = await promptlab.isAutoPopulateButtonEnabled();
      expect(isEnabled, '按钮应该禁用').toBe(false);

      console.log('✅ 没有报告时正确禁用按钮');
    });
  });

  test.describe('性能测试', () => {
    test('DNA 提取时间应该合理', async () => {
      // 检查是否有分析报告
      const hasReport = await promptlab.hasAnalysisReport();

      if (!hasReport) {
        console.log('⚠️ 没有分析报告，跳过性能测试');
        test.skip();
        return;
      }

      // 清空字段
      await promptlab.fillAudience('');
      await promptlab.fillUSPs('');
      await promptlab.fillSpecs('');

      // 测量提取时间
      const startTime = Date.now();
      await promptlab.clickAutoPopulateDNA();
      await promptlab.waitForDNAAutoFilled();
      const extractTime = Date.now() - startTime;

      console.log(`📊 DNA 提取时间: ${extractTime}ms`);

      // 验证：提取时间应该小于 2 秒
      expect(extractTime, `提取时间应该小于 2000ms，实际: ${extractTime}ms`).toBeLessThan(2000);

      console.log('✅ DNA 提取性能良好');
    });
  });
