/**
 * 页面加载检查脚本
 * 使用 Playwright 检查页面加载情况和控制台输出
 */

import { chromium } from 'playwright';
import fs from 'fs';

async function checkPageLoad() {
  console.log('🚀 开始检查页面加载...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // 收集所有控制台消息
  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];
  
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    consoleLogs.push({ type, text, timestamp: new Date().toISOString() });
    
    if (type === 'error') {
      consoleErrors.push(text);
      console.log(`❌ [ERROR] ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
      console.log(`⚠️  [WARN] ${text}`);
    } else if (type === 'log' || type === 'info') {
      console.log(`ℹ️  [${type.toUpperCase()}] ${text}`);
    } else if (type === 'debug') {
      console.log(`🔍 [DEBUG] ${text}`);
    }
  });
  
  // 收集页面错误
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log(`💥 [PAGE ERROR] ${error.message}`);
  });
  
  // 收集请求失败
  const failedRequests = [];
  page.on('requestfailed', request => {
    const failure = request.failure();
    failedRequests.push({
      url: request.url(),
      error: failure ? failure.errorText : 'Unknown error'
    });
    console.log(`🔴 [REQUEST FAILED] ${request.url()}`);
    if (failure) {
      console.log(`   Error: ${failure.errorText}`);
    }
  });
  
  // 收集成功的请求
  const successfulRequests = [];
  page.on('response', response => {
    if (response.status() >= 200 && response.status() < 300) {
      successfulRequests.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    }
  });
  
  try {
    console.log(`\n📍 导航到: http://localhost:5177\n`);
    
    // 导航到页面
    const response = await page.goto('http://localhost:5177', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log(`\n✅ 页面响应状态: ${response.status()}\n`);
    
    // 等待一段时间让 JavaScript 执行
    console.log('⏳ 等待 JavaScript 执行...\n');
    await page.waitForTimeout(5000);
    
    // 检查页面标题
    const title = await page.title();
    console.log(`📄 页面标题: ${title}\n`);
    
    // 检查关键元素是否存在
    console.log('🔍 检查关键元素...\n');
    
    const checks = [
      { selector: 'header', name: 'Header' },
      { selector: '#main-content', name: 'Main Content' },
      { selector: '#toast-container', name: 'Toast Container' },
      { selector: '#global-loading', name: 'Global Loading' },
      { selector: '.logo-button', name: 'Logo Button' },
      { selector: 'nav', name: 'Navigation' }
    ];
    
    for (const check of checks) {
      try {
        const element = await page.$(check.selector);
        if (element) {
          const isVisible = await element.isVisible();
          console.log(`  ${isVisible ? '✅' : '⚠️ '} ${check.name} (${check.selector}): ${isVisible ? '可见' : '存在但不可见'}`);
        } else {
          console.log(`  ❌ ${check.name} (${check.selector}): 未找到`);
        }
      } catch (error) {
        console.log(`  ❌ ${check.name} (${check.selector}): 检查失败 - ${error.message}`);
      }
    }
    
    // 检查是否有 Alpine.js
    console.log('\n🔍 检查 Alpine.js...\n');
    const hasAlpine = await page.evaluate(() => {
      return typeof window.Alpine !== 'undefined';
    });
    console.log(`  ${hasAlpine ? '✅' : '❌'} Alpine.js: ${hasAlpine ? '已加载' : '未加载'}`);
    
    // 检查是否有 Zustand Store
    console.log('\n🔍 检查 Zustand Store...\n');
    const hasStore = await page.evaluate(() => {
      return typeof window.appStore !== 'undefined';
    });
    console.log(`  ${hasStore ? '✅' : '❌'} Zustand Store: ${hasStore ? '已加载' : '未加载'}`);
    
    // 检查是否有 Router
    console.log('\n🔍 检查 Router...\n');
    const hasRouter = await page.evaluate(() => {
      return typeof window.router !== 'undefined' || typeof window.Router !== 'undefined';
    });
    console.log(`  ${hasRouter ? '✅' : '❌'} Router: ${hasRouter ? '已加载' : '未加载'}`);
    
    // 截图
    console.log('\n📸 保存截图...\n');
    await page.screenshot({ path: 'page-screenshot.png', fullPage: true });
    console.log('  ✅ 截图已保存: page-screenshot.png\n');
    
    // 等待用户查看
    console.log('⏸️  浏览器将保持打开 10 秒，请查看页面...\n');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error(`\n❌ 页面加载失败: ${error.message}\n`);
  }
  
  // 生成报告
  console.log('\n' + '='.repeat(80));
  console.log('📊 加载报告');
  console.log('='.repeat(80) + '\n');
  
  console.log(`📝 控制台消息总数: ${consoleLogs.length}`);
  console.log(`   - 错误: ${consoleErrors.length}`);
  console.log(`   - 警告: ${consoleWarnings.length}`);
  console.log(`   - 其他: ${consoleLogs.length - consoleErrors.length - consoleWarnings.length}\n`);
  
  console.log(`💥 页面错误: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    pageErrors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    console.log();
  }
  
  console.log(`🔴 失败的请求: ${failedRequests.length}`);
  if (failedRequests.length > 0) {
    failedRequests.forEach((req, i) => {
      console.log(`   ${i + 1}. ${req.url}`);
      console.log(`      错误: ${req.error}`);
    });
    console.log();
  }
  
  console.log(`✅ 成功的请求: ${successfulRequests.length}`);
  
  // 保存详细日志
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalConsoleLogs: consoleLogs.length,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
      successfulRequests: successfulRequests.length
    },
    consoleLogs,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    failedRequests,
    successfulRequests: successfulRequests.slice(0, 20) // 只保存前20个
  };
  
  fs.writeFileSync('page-load-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 详细报告已保存: page-load-report.json\n');
  
  await browser.close();
  
  // 返回是否有严重问题
  const hasCriticalIssues = consoleErrors.length > 0 || pageErrors.length > 0 || failedRequests.length > 0;
  
  if (hasCriticalIssues) {
    console.log('❌ 发现严重问题，请查看上方日志\n');
    process.exit(1);
  } else {
    console.log('✅ 页面加载正常，无严重问题\n');
    process.exit(0);
  }
}

checkPageLoad().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
