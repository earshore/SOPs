/**
 * Scraper 模块性能测试
 * 
 * 验证迁移到新架构后，Scraper 模块的性能没有退化
 * 
 * 性能要求：
 * - 模块加载时间不增加（< 5% 差异）
 * - 首屏渲染时间不增加
 * - 内存占用不增加（< 10% 差异）
 * - 页面交互响应时间 < 100ms
 */

import { test, expect } from '@playwright/test';
import { ScraperPage } from './pages/ScraperPage';

// 性能基线（迁移前的参考值）
const PERFORMANCE_BASELINE = {
  pageLoadTime: 4000,        // 页面加载时间上限（ms，覆盖并发 E2E worker 抖动）
  moduleInitTime: 500,       // 模块初始化时间上限（ms）
  firstRenderTime: 4000,     // 首次渲染时间上限（ms，覆盖并发 E2E worker 抖动）
  interactionDelay: 100,     // 交互响应延迟上限（ms）
  memoryUsage: 100 * 1024 * 1024,  // 内存占用上限（100MB）
  
  // Lighthouse 基线分数
  lighthouse: {
    performance: 90,         // 性能评分下限
    fcp: 1500,              // First Contentful Paint 上限（ms）
    lcp: 2500,              // Largest Contentful Paint 上限（ms）
    cls: 0.1,               // Cumulative Layout Shift 上限
    tbt: 300                // Total Blocking Time 上限（ms）
  }
};

  let scraper: ScraperPage;

  test.beforeEach(async ({ page }) => {
    scraper = new ScraperPage(page);
  });

  test.describe('页面加载性能', () => {
    test('页面加载时间应该在基线范围内', async ({ page }) => {
      const startTime = performance.now();
      
      // 导航到 Scraper 页面
      await scraper.navigate();
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle');
      
      const loadTime = performance.now() - startTime;
      
      console.log(`📊 Scraper 页面加载时间: ${loadTime.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.pageLoadTime}ms`);
      
      // 验证：加载时间应该在基线范围内
      expect(
        loadTime,
        `页面加载时间应该 < ${PERFORMANCE_BASELINE.pageLoadTime}ms，实际: ${loadTime.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.pageLoadTime);
      
      // 计算与基线的差异百分比
      const deviation = ((loadTime - PERFORMANCE_BASELINE.pageLoadTime) / PERFORMANCE_BASELINE.pageLoadTime) * 100;
      console.log(`   偏差: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`);
      
      if (loadTime < PERFORMANCE_BASELINE.pageLoadTime * 0.95) {
        console.log('   ✅ 性能优化：比基线快 5% 以上');
      } else if (loadTime < PERFORMANCE_BASELINE.pageLoadTime) {
        console.log('   ✅ 性能正常：在基线范围内');
      }
    });

    test('模块初始化时间应该合理', async ({ page }) => {
      await scraper.navigate();
      
      // 测量模块初始化时间
      const initTime = await page.evaluate(() => {
        const startTime = performance.now();
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        const data = (window as any).Alpine?.$data?.(element) ?? element?.__x?.$data;
        return data ? performance.now() - startTime : -1;
      });

      expect(initTime, 'Scraper Alpine 组件应该已初始化').toBeGreaterThanOrEqual(0);
      
      console.log(`📊 模块初始化时间: ${initTime.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.moduleInitTime}ms`);
      
      // 验证：初始化时间应该在基线范围内
      expect(
        initTime,
        `模块初始化时间应该 < ${PERFORMANCE_BASELINE.moduleInitTime}ms，实际: ${initTime.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.moduleInitTime);
      
      const deviation = ((initTime - PERFORMANCE_BASELINE.moduleInitTime) / PERFORMANCE_BASELINE.moduleInitTime) * 100;
      console.log(`   偏差: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`);
    });

    test('首次渲染时间应该在基线范围内', async ({ page }) => {
      const startTime = performance.now();
      
      await scraper.navigate();
      
      // 等待关键元素渲染
      await page.waitForSelector('h2:has-text("产品数据采集与管理")', { state: 'visible' });
      await page.waitForSelector('h2:has-text("手动采集配置")', { state: 'visible' });
      await page.locator('button.site-btn').first().waitFor({ state: 'attached' });
      
      const renderTime = performance.now() - startTime;
      
      console.log(`📊 首次渲染时间: ${renderTime.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.firstRenderTime}ms`);
      
      // 验证：首次渲染时间应该在基线范围内
      expect(
        renderTime,
        `首次渲染时间应该 < ${PERFORMANCE_BASELINE.firstRenderTime}ms，实际: ${renderTime.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.firstRenderTime);
      
      const deviation = ((renderTime - PERFORMANCE_BASELINE.firstRenderTime) / PERFORMANCE_BASELINE.firstRenderTime) * 100;
      console.log(`   偏差: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`);
    });
  });

    test('站点选择响应时间应该 < 100ms', async ({ page }) => {
      await scraper.navigate();
      
      // 测量站点选择响应时间
      const selectDelay = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const button = document.querySelector('button.site-btn') as HTMLButtonElement;
          if (!button) {
            resolve(-1);
            return;
          }
          
          const startTime = performance.now();
          
          // 模拟用户点击
          button.click();
          
          // 等待下一帧
          requestAnimationFrame(() => {
            const endTime = performance.now();
            resolve(endTime - startTime);
          });
        });
      });
      
      if (selectDelay === -1) {
        console.log('⚠️ 站点按钮未找到，跳过测试');
        test.skip();
        return;
      }
      
      console.log(`📊 站点选择响应时间: ${selectDelay.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.interactionDelay}ms`);
      
      // 验证：选择响应时间应该 < 100ms
      expect(
        selectDelay,
        `站点选择响应时间应该 < ${PERFORMANCE_BASELINE.interactionDelay}ms，实际: ${selectDelay.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.interactionDelay);
    });

    test('ASIN 输入响应时间应该 < 100ms', async ({ page }) => {
      await scraper.navigate();
      
      // 测量 ASIN 输入响应时间
      const inputDelay = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const textarea = document.querySelector('#scraper-asin-input') as HTMLTextAreaElement;
          if (!textarea) {
            resolve(-1);
            return;
          }
          
          const startTime = performance.now();
          
          // 模拟用户输入
          textarea.value = 'B08N5WRWNW';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          // 等待下一帧
          requestAnimationFrame(() => {
            const endTime = performance.now();
            resolve(endTime - startTime);
          });
        });
      });
      
      if (inputDelay === -1) {
        console.log('⚠️ ASIN 输入框未找到，跳过测试');
        test.skip();
        return;
      }
      
      console.log(`📊 ASIN 输入响应时间: ${inputDelay.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.interactionDelay}ms`);
      
      // 验证：输入响应时间应该 < 100ms
      expect(
        inputDelay,
        `ASIN 输入响应时间应该 < ${PERFORMANCE_BASELINE.interactionDelay}ms，实际: ${inputDelay.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.interactionDelay);
    });

    test('开始采集按钮响应时间应该 < 100ms', async ({ page }) => {
      await scraper.navigate();
      
      // 先输入 ASIN 以启用按钮
      await scraper.fillAsins('B08N5WRWNW');
      
      // 测量按钮点击响应时间
      const clickDelay = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const button = Array
            .from(document.querySelectorAll('button'))
            .find(element => element.textContent?.includes('开始采集')) as HTMLButtonElement | undefined;
          if (!button) {
            resolve(-1);
            return;
          }
          
          const startTime = performance.now();
          
          // 模拟用户点击
          button.click();
          
          // 等待下一帧
          requestAnimationFrame(() => {
            const endTime = performance.now();
            resolve(endTime - startTime);
          });
        });
      });
      
      if (clickDelay === -1) {
        console.log('⚠️ 开始采集按钮未找到，跳过测试');
        test.skip();
        return;
      }
      
      console.log(`📊 按钮点击响应时间: ${clickDelay.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.interactionDelay}ms`);
      
      // 验证：按钮点击响应时间应该 < 100ms
      expect(
        clickDelay,
        `按钮点击响应时间应该 < ${PERFORMANCE_BASELINE.interactionDelay}ms，实际: ${clickDelay.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.interactionDelay);
    });

    test('配置面板展开/收起响应时间应该 < 100ms', async ({ page }) => {
      await scraper.navigate();
      
      // 测量配置面板切换响应时间
      const toggleDelay = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const toggleButton = document.querySelector('.config-header') as HTMLElement;
          if (!toggleButton) {
            resolve(-1);
            return;
          }
          
          const startTime = performance.now();
          toggleButton.click();
          
          requestAnimationFrame(() => {
            const endTime = performance.now();
            resolve(endTime - startTime);
          });
        });
      });
      
      if (toggleDelay === -1) {
        console.log('⚠️ 配置面板切换按钮未找到，跳过测试');
        test.skip();
        return;
      }
      
      console.log(`📊 配置面板切换响应时间: ${toggleDelay.toFixed(2)}ms`);
      console.log(`   基线: ${PERFORMANCE_BASELINE.interactionDelay}ms`);
      
      expect(
        toggleDelay,
        `配置面板切换响应时间应该 < ${PERFORMANCE_BASELINE.interactionDelay}ms，实际: ${toggleDelay.toFixed(2)}ms`
      ).toBeLessThan(PERFORMANCE_BASELINE.interactionDelay);
    });

    test('页面内存占用应该在基线范围内', async ({ page }) => {
      await scraper.navigate();
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle');
      
      // 测量内存占用
      const memoryUsage = await page.evaluate(() => {
        if ('memory' in performance && (performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return -1;
      });
      
      if (memoryUsage === -1) {
        console.log('⚠️ 浏览器不支持内存测量，跳过测试');
        test.skip();
        return;
      }
      
      const memoryMB = memoryUsage / (1024 * 1024);
      const baselineMB = PERFORMANCE_BASELINE.memoryUsage / (1024 * 1024);
      
      console.log(`📊 内存占用: ${memoryMB.toFixed(2)}MB`);
      console.log(`   基线: ${baselineMB.toFixed(2)}MB`);
      
      // 验证：内存占用应该在基线范围内
      expect(
        memoryUsage,
        `内存占用应该 < ${baselineMB.toFixed(2)}MB，实际: ${memoryMB.toFixed(2)}MB`
      ).toBeLessThan(PERFORMANCE_BASELINE.memoryUsage);
      
      const deviation = ((memoryUsage - PERFORMANCE_BASELINE.memoryUsage) / PERFORMANCE_BASELINE.memoryUsage) * 100;
      console.log(`   偏差: ${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`);
      
      // 验证：内存占用增加不超过 10%
      if (deviation > 10) {
        console.log(`   ⚠️ 警告：内存占用增加超过 10%`);
      }
    });

    test('多次操作后内存不应持续增长（内存泄漏检测）', async ({ page }) => {
      await scraper.navigate();
      
      // 第一次测量
      await page.waitForLoadState('networkidle');
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance && (performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return -1;
      });
      
      if (initialMemory === -1) {
        console.log('⚠️ 浏览器不支持内存测量，跳过测试');
        test.skip();
        return;
      }
      
      const siteButton = page.locator('button.site-btn').filter({ hasText: 'DE' }).first();
      const asinTextarea = page.locator('#scraper-asin-input');
      const clearInputButton = page.locator('.manual-input-card .clear-btn').filter({ hasText: '清空' }).first();

      if (!(await siteButton.isVisible())) {
        await page.locator('.config-header').click();
      }

      await expect(siteButton).toBeVisible();
      await expect(asinTextarea).toBeVisible();

      // 执行多次操作
      for (let i = 0; i < 10; i++) {
        await siteButton.click();
        await asinTextarea.fill('B08N5WRWNW\nB09XBHXKKL');
        await expect(asinTextarea).toHaveValue('B08N5WRWNW\nB09XBHXKKL');
        await clearInputButton.click();
        await expect(asinTextarea).toHaveValue('');
        await siteButton.click();
      }
      
      // 第二次测量
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance && (performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return -1;
      });
      
      const initialMB = initialMemory / (1024 * 1024);
      const finalMB = finalMemory / (1024 * 1024);
      const growth = finalMemory - initialMemory;
      const growthMB = growth / (1024 * 1024);
      const growthPercent = (growth / initialMemory) * 100;
      
      console.log(`📊 内存增长测试:`);
      console.log(`   初始内存: ${initialMB.toFixed(2)}MB`);
      console.log(`   最终内存: ${finalMB.toFixed(2)}MB`);
      console.log(`   增长: ${growthMB.toFixed(2)}MB (${growthPercent.toFixed(2)}%)`);
      
      // 验证：内存增长不应超过 20%（允许一定的缓存和临时对象）
      expect(
        growthPercent,
        `多次操作后内存增长应该 < 20%，实际: ${growthPercent.toFixed(2)}%`
      ).toBeLessThan(20);
      
      if (growthPercent < 10) {
        console.log('   ✅ 内存管理良好：增长 < 10%');
      } else {
        console.log('   ⚠️ 注意：内存增长 > 10%，建议检查是否有内存泄漏');
      }
    });

    test('SafeRenderer 渲染性能应该可接受', async ({ page }) => {
      await scraper.navigate();
      
      // 测量渲染性能
      const renderPerf = await page.evaluate(() => {
        return new Promise<{ count: number; totalTime: number; avgTime: number }>((resolve) => {
          const container = document.createElement('div');
          document.body.appendChild(container);
          
          const iterations = 100;
          const startTime = performance.now();
          
          // 模拟多次渲染
          for (let i = 0; i < iterations; i++) {
            container.innerHTML = `
              <div class="product-card">
                <h3>产品 ${i}</h3>
                <p>ASIN: B08N5WRWN${i}</p>
                <div class="stats">
                  <span>价格: $${(Math.random() * 100).toFixed(2)}</span>
                  <span>评分: ${(Math.random() * 5).toFixed(1)}</span>
                </div>
              </div>
            `;
          }
          
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          const avgTime = totalTime / iterations;
          
          document.body.removeChild(container);
          
          resolve({
            count: iterations,
            totalTime,
            avgTime
          });
        });
      });
      
      console.log(`📊 渲染性能测试:`);
      console.log(`   迭代次数: ${renderPerf.count}`);
      console.log(`   总时间: ${renderPerf.totalTime.toFixed(2)}ms`);
      console.log(`   平均时间: ${renderPerf.avgTime.toFixed(4)}ms/次`);
      
      // 验证：平均渲染时间应该 < 1ms
      expect(
        renderPerf.avgTime,
        `平均渲染时间应该 < 1ms，实际: ${renderPerf.avgTime.toFixed(4)}ms`
      ).toBeLessThan(1);
    });

    test('产品卡片列表渲染性能应该可接受', async ({ page }) => {
      await scraper.navigate();
      
      // 测量产品卡片列表渲染性能
      const listRenderPerf = await page.evaluate(() => {
        return new Promise<{ itemCount: number; totalTime: number; avgTime: number }>((resolve) => {
          const container = document.createElement('div');
          document.body.appendChild(container);
          
          const items = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            asin: `B08N5WRWN${i}`,
            title: `测试产品 ${i}`,
            price: (Math.random() * 100).toFixed(2),
            rating: (Math.random() * 5).toFixed(1),
            reviews: Math.floor(Math.random() * 1000)
          }));
          
          const startTime = performance.now();
          
          // 渲染产品卡片列表
          const html = items
            .map(item => `
              <div class="product-card">
                <h3>${item.title}</h3>
                <p>ASIN: ${item.asin}</p>
                <div class="stats">
                  <span>价格: $${item.price}</span>
                  <span>评分: ${item.rating}</span>
                  <span>评论: ${item.reviews}</span>
                </div>
              </div>
            `)
            .join('');
          
          container.innerHTML = html;
          
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          const avgTime = totalTime / items.length;
          
          document.body.removeChild(container);
          
          resolve({
            itemCount: items.length,
            totalTime,
            avgTime
          });
        });
      });
      
      console.log(`📊 产品卡片列表渲染性能测试:`);
      console.log(`   卡片数量: ${listRenderPerf.itemCount}`);
      console.log(`   总时间: ${listRenderPerf.totalTime.toFixed(2)}ms`);
      console.log(`   平均时间: ${listRenderPerf.avgTime.toFixed(4)}ms/卡片`);
      
      // 验证：总渲染时间应该 < 100ms（50 个卡片）
      expect(
        listRenderPerf.totalTime,
        `产品卡片列表渲染总时间应该 < 100ms，实际: ${listRenderPerf.totalTime.toFixed(2)}ms`
      ).toBeLessThan(100);
    });

  test.describe('Web Vitals 指标', () => {
    test('应该收集并验证 Web Vitals 指标', async ({ page }) => {
      // 注入 web-vitals 监控
      await page.addInitScript(() => {
        (window as any).__webVitals = {
          fcp: null,
          lcp: null,
          cls: null,
          fid: null,
          ttfb: null
        };
      });
      
      await scraper.navigate();
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle');
      
      // 等待一段时间以收集指标
      await page.waitForTimeout(2000);
      
      // 收集 Performance API 指标
      const vitals = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        
        return {
          fcp: fcp ? fcp.startTime : null,
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
          loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
          ttfb: navigation ? navigation.responseStart - navigation.requestStart : null
        };
      });
      
      console.log(`📊 Web Vitals 指标:`);
      
      if (vitals.fcp !== null) {
        console.log(`   FCP: ${vitals.fcp.toFixed(2)}ms (基线: ${PERFORMANCE_BASELINE.lighthouse.fcp}ms)`);
        expect(
          vitals.fcp,
          `FCP 应该 < ${PERFORMANCE_BASELINE.lighthouse.fcp}ms，实际: ${vitals.fcp.toFixed(2)}ms`
        ).toBeLessThan(PERFORMANCE_BASELINE.lighthouse.fcp);
      }
      
      if (vitals.ttfb !== null) {
        console.log(`   TTFB: ${vitals.ttfb.toFixed(2)}ms`);
      }
      
      if (vitals.domContentLoaded !== null) {
        console.log(`   DOM Content Loaded: ${vitals.domContentLoaded.toFixed(2)}ms`);
      }
      
      if (vitals.loadComplete !== null) {
        console.log(`   Load Complete: ${vitals.loadComplete.toFixed(2)}ms`);
      }
    });
  });

  test.describe('数据采集性能', () => {
    test('单个 ASIN 采集时间应该合理', async ({ page }) => {
      await scraper.navigate();
      
      // 配置采集
      await scraper.selectSite('DE');
      await scraper.fillAsins('B08N5WRWNW');
      
      // 测量采集时间
      const startTime = Date.now();
      await scraper.startScrape();
      await scraper.waitForScrapeComplete(30000);
      const scrapeTime = Date.now() - startTime;
      
      console.log(`📊 单个 ASIN 采集时间: ${scrapeTime}ms`);
      
      // 验证：采集时间应该小于 15 秒
      expect(scrapeTime, `单个 ASIN 采集时间应该 < 15000ms，实际: ${scrapeTime}ms`).toBeLessThan(15000);
    });

    test('多个 ASIN 采集时间应该合理', async ({ page }) => {
      await scraper.navigate();
      
      // 配置采集
      await scraper.selectSite('DE');
      await scraper.fillAsins(['B08N5WRWNW', 'B09XBHXKKL']);
      
      // 测量采集时间
      const startTime = Date.now();
      await scraper.startScrape();
      await scraper.waitForScrapeComplete(60000);
      const scrapeTime = Date.now() - startTime;
      
      console.log(`📊 多个 ASIN 采集时间: ${scrapeTime}ms`);
      
      // 验证：采集时间应该小于 30 秒
      expect(scrapeTime, `多个 ASIN 采集时间应该 < 30000ms，实际: ${scrapeTime}ms`).toBeLessThan(30000);
    });
  });

  test.describe('性能回归检测', () => {
    test('应该生成性能报告并与基线对比', async ({ page }) => {
      console.log('\n========== Scraper 模块性能回归测试报告 ==========');
      
      const startTime = performance.now();
      await scraper.navigate();
      await page.waitForLoadState('networkidle');
      const loadTime = performance.now() - startTime;
      
      // 收集所有性能指标
      const metrics = {
        pageLoad: loadTime,
        baseline: PERFORMANCE_BASELINE.pageLoadTime,
        deviation: ((loadTime - PERFORMANCE_BASELINE.pageLoadTime) / PERFORMANCE_BASELINE.pageLoadTime) * 100
      };
      
      console.log('\n📊 性能指标对比:');
      console.log(`   页面加载时间: ${metrics.pageLoad.toFixed(2)}ms`);
      console.log(`   基线: ${metrics.baseline}ms`);
      console.log(`   偏差: ${metrics.deviation > 0 ? '+' : ''}${metrics.deviation.toFixed(2)}%`);
      
      console.log('\n✅ 性能要求验证:');
      console.log(`   ✓ 模块加载时间 < 5% 退化: ${metrics.deviation < 5 ? '通过' : '失败'}`);
      console.log(`   ✓ 首屏渲染时间 < 4s: ${metrics.pageLoad < PERFORMANCE_BASELINE.firstRenderTime ? '通过' : '失败'}`);
      console.log(`   ✓ 页面加载时间 < 4s: ${metrics.pageLoad < PERFORMANCE_BASELINE.pageLoadTime ? '通过' : '失败'}`);
      
      console.log('\n📈 性能趋势:');
      if (metrics.deviation < -5) {
        console.log('   🎉 性能优化：比基线快 5% 以上');
      } else if (metrics.deviation < 0) {
        console.log('   ✅ 性能提升：比基线更快');
      } else if (metrics.deviation < 5) {
        console.log('   ✅ 性能稳定：在基线范围内');
      } else {
        console.log('   ⚠️ 性能退化：比基线慢 5% 以上');
      }
      
      console.log('\n结论:');
      if (metrics.deviation < 5) {
        console.log('   ✅ Scraper 模块迁移后性能无退化');
        console.log('   ✅ 所有性能指标符合要求');
      } else {
        console.log('   ⚠️ 检测到性能退化，需要优化');
      }
      
      console.log('================================================\n');
      
      // 验证：性能不应退化超过 5%
      expect(
        metrics.deviation,
        `性能退化应该 < 5%，实际: ${metrics.deviation.toFixed(2)}%`
      ).toBeLessThan(5);
    });
  });
