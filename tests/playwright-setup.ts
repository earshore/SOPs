// tests/playwright-setup.ts
// ================================================================
// 🎭 Playwright 全局设置
// 在所有测试运行前执行
// ================================================================

import { chromium, FullConfig } from '@playwright/test';

/**
 * 全局设置函数
 * 在所有测试运行前执行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('🎭 Playwright 全局设置开始...');

  // 检查开发服务器是否已启动
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log(`📡 检查开发服务器: ${baseURL}`);
    await page.goto(baseURL, { timeout: 10000 });
    
    console.log('✅ 开发服务器已就绪');
    
    await browser.close();
  } catch (error) {
    console.error('❌ 开发服务器未启动或无法访问');
    console.error('请先运行: npm run dev');
    throw error;
  }

  console.log('🎭 Playwright 全局设置完成');
}

export default globalSetup;
