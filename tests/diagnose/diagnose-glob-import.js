// 诊断脚本: 检查Vite glob导入在运行时的行为
// 用于排查容器污染问题

import { chromium } from '@playwright/test';

async function diagnoseGlobImport() {
  console.log('🔍 开始诊断 Vite glob 导入行为...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 监听console输出
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning' || text.includes('[ViewLoader]') || text.includes('[AppCenter]')) {
      console.log(`[浏览器 ${type}] ${text}`);
    }
  });

  try {
    // 1. 访问首页
    console.log('📍 步骤1: 访问首页');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2. 点击App Center按钮
    console.log('\n📍 步骤2: 点击 App Center 按钮');
    await page.click('[data-action="switchTab"][data-tab="app_center"]');
    await page.waitForTimeout(1000);

    // 3. 点击Promptlab按钮
    console.log('\n📍 步骤3: 点击 Promptlab 按钮');
    await page.click('[data-action="switchTab"][data-tab="promptlab"]');
    await page.waitForTimeout(2000);

    // 4. 检查容器内容
    console.log('\n📍 步骤4: 检查容器内容');
    const containerInfo = await page.evaluate(() => {
      const container = document.getElementById('app_center_content_area');
      if (!container) return { error: '容器未找到' };

      const children = Array.from(container.children);
      return {
        childCount: children.length,
        firstChildTag: children[0]?.tagName,
        firstChildContent: children[0]?.outerHTML?.substring(0, 200),
        innerHTML: container.innerHTML.substring(0, 500),
        hasMetaTag: container.querySelector('meta') !== null,
        hasHeadTag: container.querySelector('head') !== null,
        hasBodyTag: container.querySelector('body') !== null
      };
    });

    console.log('\n📊 容器诊断结果:');
    console.log(JSON.stringify(containerInfo, null, 2));

    // 5. 检查htmlModules的内容
    console.log('\n📍 步骤5: 检查 htmlModules 导入内容');
    const moduleCheck = await page.evaluate(async () => {
      // 尝试访问viewLoader模块
      try {
        // 通过动态导入获取htmlModules
        await import('/src/common/utils/viewLoader.ts');
        
        // 检查是否能访问htmlModules (它是私有的,但我们可以通过其他方式检查)
        // 尝试加载app_center模板
        const testPath = '/src/modules/app_center/app_center.html';
        
        // 模拟loadTemplate的行为
        const result = {
          canImport: true,
          testPath: testPath,
          error: null
        };
        
        return result;
      } catch (e) {
        return {
          canImport: false,
          error: e.message
        };
      }
    });

    console.log('\n📊 模块导入检查:');
    console.log(JSON.stringify(moduleCheck, null, 2));

    // 6. 检查loadHtml函数的执行
    console.log('\n📍 步骤6: 检查 loadHtml 执行过程');
    const loadHtmlTrace = await page.evaluate(() => {
      // 尝试触发一次loadHtml (通过重新加载promptlab)
      window.dispatchEvent(new CustomEvent('route:changed', {
        detail: {
          routeId: 'promptlab',
          config: { module: { id: 'app_center' } }
        }
      }));
      
      return { triggered: true };
    });

    console.log('\n📊 loadHtml 追踪:');
    console.log(JSON.stringify(loadHtmlTrace, null, 2));

    // 等待一段时间观察
    console.log('\n⏳ 等待5秒以观察页面状态...');
    await page.waitForTimeout(5000);

    // 7. 最终检查
    const finalCheck = await page.evaluate(() => {
      const container = document.getElementById('app_center_content_area');
      return {
        childCount: container?.children.length,
        hasPromptlabPanel: !!document.getElementById('promptlab-panel'),
        containerHTML: container?.innerHTML.substring(0, 300)
      };
    });

    console.log('\n📊 最终状态:');
    console.log(JSON.stringify(finalCheck, null, 2));

  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error);
  }

  console.log('\n✅ 诊断完成,浏览器将保持打开状态以便检查');
  console.log('按 Ctrl+C 退出');
  
  // 保持浏览器打开
  await new Promise(() => {});
}

diagnoseGlobImport().catch(console.error);
