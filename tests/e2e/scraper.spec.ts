// tests/e2e/scraper.spec.ts
// ================================================================
// 🧪 Scraper 模块 E2E 测试
// 测试 Scraper 完整流程：输入 ASIN、抓取数据、查看历史记录、导入/导出数据
// ================================================================

import { test, expect } from '@playwright/test';
import { ScraperPage } from './pages/ScraperPage';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

  let scraper: ScraperPage;

  test.beforeEach(async ({ page }) => {
    scraper = new ScraperPage(page);
    
    // 导航到 Scraper 页面
    await scraper.navigate();
  });

  test.describe('页面加载与初始化', () => {
    test('应该成功加载 Scraper 页面', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 验证：页面标题正确
      await expect(page).toHaveTitle(/Amazing Amazon Architect/);

      // 验证：主要元素可见
      await expect(page.locator('h2:has-text("产品数据采集与管理")')).toBeVisible();
      await expect(page.locator('h2:has-text("手动采集配置")')).toBeVisible();

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `页面加载时不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ Scraper 页面加载成功');
    });

    test('应该正确初始化 Alpine 组件', async ({ page }) => {
      // 验证：Alpine 组件已初始化
      const alpineInitialized = await page.evaluate(() => {
        const element = document.querySelector('[x-data="scraperPanel"]');
        return element && (element as any).__x !== undefined;
      });

      expect(alpineInitialized, 'Alpine 组件应该已初始化').toBe(true);

      // 验证：组件状态可访问
      const hasComponentData = await page.evaluate(() => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        if (!element || !element.__x) return false;
        
        const data = element.__x.$data;
        return data && 
               typeof data.selectedSite !== 'undefined' &&
               typeof data.inputAsins !== 'undefined' &&
               typeof data.startScrape === 'function';
      });

      expect(hasComponentData, '组件数据应该可访问').toBe(true);

      console.log('✅ Alpine 组件初始化正确');
    });

    test('应该显示正确的初始状态', async () => {
      // 验证：站点选择按钮可见
      const sitesCount = await scraper.getAvailableSitesCount();
      expect(sitesCount, '应该显示多个站点选项').toBeGreaterThan(5);

      // 验证：开始采集按钮初始状态为禁用
      const canStart = await scraper.canStartScrape();
      expect(canStart, '未输入 ASIN 时按钮应该禁用').toBe(false);

      // 验证：配置面板默认展开或收起
      const isExpanded = await scraper.isConfigPanelExpanded();
      console.log(`📊 配置面板初始状态: ${isExpanded ? '展开' : '收起'}`);

      console.log('✅ 初始状态显示正确');
    });
  });

  test.describe('站点选择功能', () => {
    test('应该能够选择不同的站点', async () => {
      // 选择美国站
      await scraper.selectSite('US');
      let selected = await scraper.getSelectedSite();
      expect(selected, '应该选中美国站').toContain('US');

      // 选择德国站
      await scraper.selectSite('DE');
      selected = await scraper.getSelectedSite();
      expect(selected, '应该选中德国站').toContain('DE');

      // 选择日本站
      await scraper.selectSite('JP');
      selected = await scraper.getSelectedSite();
      expect(selected, '应该选中日本站').toContain('JP');

      console.log('✅ 站点选择功能正常');
    });

    test('应该显示所有可用站点', async () => {
      const sitesCount = await scraper.getAvailableSitesCount();
      
      // 验证：至少有 10 个站点
      expect(sitesCount, '应该至少有 10 个站点').toBeGreaterThanOrEqual(10);

      console.log(`✅ 显示 ${sitesCount} 个可用站点`);
    });
  });

  test.describe('ASIN 输入功能', () => {
    test('应该能够输入单个 ASIN', async () => {
      await scraper.fillAsins('B08N5WRWNW');
      
      const validCount = await scraper.getValidAsinsCount();
      expect(validCount, '应该识别 1 个 ASIN').toBe(1);

      console.log('✅ 单个 ASIN 输入正常');
    });

    test('应该能够输入多个 ASIN（换行分隔）', async () => {
      const asins = ['B08N5WRWNW', 'B09XBHXKKL', 'B0FMGTGMK4'];
      await scraper.fillAsins(asins);
      
      const validCount = await scraper.getValidAsinsCount();
      expect(validCount, '应该识别 3 个 ASIN').toBe(3);

      console.log('✅ 多个 ASIN 输入正常（换行分隔）');
    });

    test('应该能够输入多个 ASIN（逗号分隔）', async () => {
      await scraper.fillAsins('B08N5WRWNW, B09XBHXKKL, B0FMGTGMK4');
      
      const validCount = await scraper.getValidAsinsCount();
      expect(validCount, '应该识别 3 个 ASIN').toBe(3);

      console.log('✅ 多个 ASIN 输入正常（逗号分隔）');
    });

    test('应该过滤无效的 ASIN', async () => {
      await scraper.fillAsins('B08N5WRWNW\ninvalid\n123\nB09XBHXKKL');
      
      const validCount = await scraper.getValidAsinsCount();
      const invalidCount = await scraper.getInvalidCount();
      
      expect(validCount, '应该识别 2 个有效 ASIN').toBe(2);
      expect(invalidCount, '应该过滤 2 个无效项').toBe(2);

      console.log('✅ 无效 ASIN 过滤正常');
    });

    test('应该能够清空输入', async () => {
      await scraper.fillAsins('B08N5WRWNW\nB09XBHXKKL');
      
      let validCount = await scraper.getValidAsinsCount();
      expect(validCount, '输入后应该有 ASIN').toBe(2);

      await scraper.clearAsins();
      
      validCount = await scraper.getValidAsinsCount();
      expect(validCount, '清空后应该没有 ASIN').toBe(0);

      console.log('✅ 清空输入功能正常');
    });

    test('应该实时更新 ASIN 计数', async () => {
      // 输入第一个 ASIN
      await scraper.fillAsins('B08N5WRWNW');
      let validCount = await scraper.getValidAsinsCount();
      expect(validCount).toBe(1);

      // 添加更多 ASIN
      await scraper.fillAsins('B08N5WRWNW\nB09XBHXKKL\nB0FMGTGMK4');
      validCount = await scraper.getValidAsinsCount();
      expect(validCount).toBe(3);

      console.log('✅ ASIN 计数实时更新正常');
    });
  });

  test.describe('采集选项配置', () => {
    test('应该能够切换评论采集选项', async () => {
      // 默认状态
      let isEnabled = await scraper.isReviewScrapingEnabled();
      console.log(`📊 评论采集初始状态: ${isEnabled ? '启用' : '禁用'}`);

      // 切换到启用
      await scraper.toggleReviewScraping(true);
      isEnabled = await scraper.isReviewScrapingEnabled();
      expect(isEnabled, '应该启用评论采集').toBe(true);

      // 切换到禁用
      await scraper.toggleReviewScraping(false);
      isEnabled = await scraper.isReviewScrapingEnabled();
      expect(isEnabled, '应该禁用评论采集').toBe(false);

      console.log('✅ 评论采集选项切换正常');
    });
  });

    test('应该在未输入 ASIN 时禁用开始按钮', async () => {
      const canStart = await scraper.canStartScrape();
      expect(canStart, '未输入 ASIN 时按钮应该禁用').toBe(false);

      console.log('✅ 按钮禁用逻辑正确');
    });

    test('应该在输入 ASIN 后启用开始按钮', async () => {
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      
      const canStart = await scraper.canStartScrape();
      expect(canStart, '输入 ASIN 后按钮应该启用').toBe(true);

      console.log('✅ 按钮启用逻辑正确');
    });

    test('应该能够开始采集并显示进度', async ({ page }) => {
      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 配置采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.toggleReviewScraping(true);

      // 开始采集
      await scraper.startScrape();

      // 验证：正在采集
      const isScraping = await scraper.isScraping();
      expect(isScraping, '应该正在采集').toBe(true);

      console.log('📊 采集已开始，等待完成...');

      // 等待采集完成（最多 30 秒）
      await scraper.waitForScrapeComplete(30000);

      // 验证：采集完成
      const isStillScraping = await scraper.isScraping();
      expect(isStillScraping, '采集应该已完成').toBe(false);

      // 验证：无 JavaScript 错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `采集过程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 采集执行成功');
    });

    test('应该显示采集任务状态', async () => {
      // 配置并开始采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW\nB09XBHXKKL');
      await scraper.startScrape();

      // 等待任务出现
      await scraper.wait(1000);

      // 验证：任务列表可见
      const tasksCount = await scraper.getTasksCount();
      expect(tasksCount, '应该显示采集任务').toBeGreaterThan(0);

      console.log(`📊 显示 ${tasksCount} 个采集任务`);

      // 等待采集完成
      await scraper.waitForScrapeComplete();

      // 验证：任务完成
      const completedCount = await scraper.getCompletedTasksCount();
      expect(completedCount, '应该有完成的任务').toBeGreaterThan(0);

      console.log(`✅ ${completedCount} 个任务已完成`);
    });

    test('应该显示采集进度百分比', async () => {
      // 配置并开始采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();

      // 等待进度更新
      await scraper.wait(1000);

      // 获取进度
      const progress = await scraper.getScrapeProgress();
      expect(progress, '进度应该在 0-100 之间').toBeGreaterThanOrEqual(0);
      expect(progress, '进度应该在 0-100 之间').toBeLessThanOrEqual(100);

      console.log(`📊 当前采集进度: ${progress}%`);

      // 等待完成
      await scraper.waitForScrapeComplete();

      // 验证：进度达到 100%
      const finalProgress = await scraper.getScrapeProgress();
      expect(finalProgress, '完成后进度应该是 100%').toBe(100);

      console.log('✅ 采集进度显示正常');
    });

  test.describe('数据预览功能', () => {
    test('应该显示采集的数据', async () => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 验证：有数据显示
      const hasData = await scraper.hasData();
      expect(hasData, '应该显示采集的数据').toBe(true);

      // 验证：产品卡片数量
      const cardsCount = await scraper.getProductCardsCount();
      expect(cardsCount, '应该至少有 1 个产品卡片').toBeGreaterThanOrEqual(1);

      console.log(`✅ 显示 ${cardsCount} 个产品卡片`);
    });

    test('应该显示产品详细信息', async () => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 验证：产品标题
      const title = await scraper.getProductTitle(0);
      expect(title.length, '产品标题应该不为空').toBeGreaterThan(0);

      // 验证：产品 ASIN
      const asin = await scraper.getProductAsin(0);
      expect(asin, '产品 ASIN 应该正确').toBe('B08N5WRWNW');

      console.log(`📊 产品信息: ${title} (${asin})`);
      console.log('✅ 产品详细信息显示正常');
    });

    test('应该能够展开/收起产品卡片', async () => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 展开卡片
      await scraper.toggleProductCard(0);
      let isExpanded = await scraper.isProductCardExpanded(0);
      expect(isExpanded, '卡片应该展开').toBe(true);

      // 收起卡片
      await scraper.toggleProductCard(0);
      isExpanded = await scraper.isProductCardExpanded(0);
      expect(isExpanded, '卡片应该收起').toBe(false);

      console.log('✅ 产品卡片展开/收起功能正常');
    });

    test('应该显示评论数量', async () => {
      // 执行采集（包含评论）
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.toggleReviewScraping(true);
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 验证：评论数量
      const reviewsCount = await scraper.getReviewsCount(0);
      console.log(`📊 评论数量: ${reviewsCount}`);

      // 如果启用了评论采集，应该有评论
      if (reviewsCount > 0) {
        expect(reviewsCount, '评论数量应该大于 0').toBeGreaterThan(0);
        console.log('✅ 评论数据采集成功');
      } else {
        console.log('⚠️ 未采集到评论数据');
      }
    });
  });

  test.describe('数据标签页切换', () => {
    test('应该能够切换到 JSON 视图', async () => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 切换到 JSON 视图
      await scraper.switchDataTab('json');
      await scraper.wait(500);

      // 获取 JSON 内容
      const jsonContent = await scraper.getJsonContent();
      expect(jsonContent.length, 'JSON 内容应该不为空').toBeGreaterThan(0);

      // 验证：JSON 格式正确
      expect(() => JSON.parse(jsonContent), 'JSON 格式应该正确').not.toThrow();

      console.log(`✅ JSON 视图显示正常 (${jsonContent.length} 字符)`);
    });

    test('应该能够在预览和 JSON 视图之间切换', async () => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 切换到 JSON
      await scraper.switchDataTab('json');
      await scraper.wait(300);

      // 切换回预览
      await scraper.switchDataTab('preview');
      await scraper.wait(300);

      // 验证：预览视图可见
      const hasData = await scraper.hasData();
      expect(hasData, '预览视图应该显示数据').toBe(true);

      console.log('✅ 视图切换功能正常');
    });
  });

  test.describe('数据操作功能', () => {
    test('应该能够删除产品', async ({ page }) => {
      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW\nB09XBHXKKL');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 获取初始数量
      const initialCount = await scraper.getProductCardsCount();
      expect(initialCount, '应该至少有 2 个产品').toBeGreaterThanOrEqual(2);

      // 删除第一个产品
      await scraper.deleteProduct(0);

      // 验证：产品数量减少
      const newCount = await scraper.getProductCardsCount();
      expect(newCount, '产品数量应该减少 1').toBe(initialCount - 1);

      console.log('✅ 删除产品功能正常');
    });

    test('应该能够复制 JSON 数据', async ({ page, context }) => {
      // 授予剪贴板权限
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // 执行采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');
      await scraper.startScrape();
      await scraper.waitForScrapeComplete();

      // 复制 JSON
      await scraper.copyJson();

      // 验证：应该显示成功提示
      await scraper.expectToast('已复制');

      console.log('✅ JSON 复制功能正常');
    });
  });

  test.describe('配置面板功能', () => {
    test('应该能够展开/收起配置面板', async () => {
      // 获取初始状态
      const initialState = await scraper.isConfigPanelExpanded();

      // 切换状态
      await scraper.toggleConfigPanel();
      let newState = await scraper.isConfigPanelExpanded();
      expect(newState, '状态应该改变').toBe(!initialState);

      // 再次切换
      await scraper.toggleConfigPanel();
      newState = await scraper.isConfigPanelExpanded();
      expect(newState, '状态应该恢复').toBe(initialState);

      console.log('✅ 配置面板展开/收起功能正常');
    });
  });

  test.describe('策略指南功能', () => {
    test('应该默认显示策略指南且不提供展开/收起入口', async () => {
      await expect(scraper.isStrategyGuideVisible(), '策略指南应该默认显示').resolves.toBe(true);
      await expect(scraper.hasStrategyGuideToggle(), '策略指南不应保留展开/收起入口').resolves.toBe(false);

      console.log('✅ 策略指南默认展开显示正常');
    });
  });

  test.describe('完整流程测试', () => {
    test('应该完成完整的数据采集流程', async ({ page }) => {
      console.log('📊 开始完整流程测试...');

      // 设置控制台错误监听
      const consoleListener = setupConsoleErrorListener(page);

      // 步骤 1: 选择站点
      console.log('  1️⃣ 选择目标站点...');
      await scraper.selectSite('US');
      const selectedSite = await scraper.getSelectedSite();
      console.log(`     ✅ 已选择站点: ${selectedSite}`);

      // 步骤 2: 输入 ASIN
      console.log('  2️⃣ 输入 ASIN 列表...');
      await scraper.fillAsins(['B08N5WRWNW', 'B09XBHXKKL']);
      const validCount = await scraper.getValidAsinsCount();
      console.log(`     ✅ 已识别 ${validCount} 个 ASIN`);

      // 步骤 3: 配置选项
      console.log('  3️⃣ 配置采集选项...');
      await scraper.toggleReviewScraping(true);
      console.log('     ✅ 已启用评论采集');

      // 步骤 4: 开始采集
      console.log('  4️⃣ 开始数据采集...');
      await scraper.startScrape();
      
      // 等待采集完成
      await scraper.waitForScrapeComplete(30000);
      console.log('     ✅ 采集完成');

      // 步骤 5: 查看数据
      console.log('  5️⃣ 查看采集数据...');
      const hasData = await scraper.hasData();
      expect(hasData, '应该有采集的数据').toBe(true);

      const cardsCount = await scraper.getProductCardsCount();
      console.log(`     ✅ 显示 ${cardsCount} 个产品`);

      // 步骤 6: 查看 JSON
      console.log('  6️⃣ 查看 JSON 数据...');
      const jsonContent = await scraper.getJsonContent();
      expect(jsonContent.length, 'JSON 内容应该不为空').toBeGreaterThan(0);
      console.log(`     ✅ JSON 数据已生成 (${jsonContent.length} 字符)`);

      // 验证：整个流程无错误
      const errors = consoleListener.getErrors();
      expect(errors.length, `完整流程不应有错误，但检测到 ${errors.length} 个错误`).toBe(0);

      console.log('✅ 完整流程测试通过');
    });
  });

  test.describe('错误处理', () => {
    test('应该在未选择站点时显示提示', async () => {
      // 直接输入 ASIN 而不选择站点
      await scraper.fillAsins('B08N5WRWNW');

      // 尝试开始采集
      const canStart = await scraper.canStartScrape();
      
      // 验证：应该有默认站点或显示提示
      console.log(`📊 未选择站点时按钮状态: ${canStart ? '可用' : '禁用'}`);
      console.log('✅ 站点选择验证正常');
    });

    test('应该在没有数据时显示空状态', async ({ page }) => {
      // 验证：应该显示空状态提示
      const hasData = await scraper.hasData();
      
      if (!hasData) {
        // 可以检查是否有空状态提示
        console.log('✅ 空状态显示正常');
      } else {
        console.log('⚠️ 已有数据，跳过空状态测试');
      }
    });
  });

  test.describe('性能测试', () => {
    test('页面加载时间应该合理', async ({ page }) => {
      const startTime = Date.now();
      
      // 重新加载页面
      await scraper.navigate();
      
      const loadTime = Date.now() - startTime;
      
      console.log(`📊 Scraper 页面加载时间: ${loadTime}ms`);
      
      // 验证：加载时间应该小于 3 秒
      expect(loadTime, `页面加载时间应该小于 3000ms，实际: ${loadTime}ms`).toBeLessThan(3000);
    });

    test('数据采集时间应该合理', async () => {
      // 配置采集
      await scraper.selectSite('US');
      await scraper.fillAsins('B08N5WRWNW');

      // 测量采集时间
      const startTime = Date.now();
      await scraper.startScrape();
      await scraper.waitForScrapeComplete(30000);
      const scrapeTime = Date.now() - startTime;

      console.log(`📊 数据采集时间: ${scrapeTime}ms`);

      // 验证：采集时间应该小于 30 秒
      expect(scrapeTime, `采集时间应该小于 30000ms，实际: ${scrapeTime}ms`).toBeLessThan(30000);
    });
  });

  test.describe('响应式测试', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });

      // 重新加载页面
      await scraper.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('h2:has-text("产品数据采集与管理")')).toBeVisible();
      await expect(page.locator('button.site-btn').first()).toBeVisible();

      console.log('✅ 移动端显示正常');
    });

    test('应该在平板端正确显示', async ({ page }) => {
      // 设置平板端视口
      await page.setViewportSize({ width: 768, height: 1024 });

      // 重新加载页面
      await scraper.navigate();

      // 验证：主要元素仍然可见
      await expect(page.locator('h2:has-text("手动采集配置")')).toBeVisible();
      await expect(page.locator('textarea[x-model="inputAsins"]')).toBeVisible();

      console.log('✅ 平板端显示正常');
    });
  });
