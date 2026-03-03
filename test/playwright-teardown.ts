// tests/playwright-teardown.ts
// ================================================================
// 🎭 Playwright 全局清理
// 在所有测试运行后执行
// ================================================================

import { FullConfig } from '@playwright/test';
import { ScreenshotManager } from './helpers/screenshot-manager';
import * as fs from 'fs';

/**
 * 全局清理函数
 * 在所有测试运行后执行一次
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Playwright 全局清理开始...');

  // 获取截图管理器实例
  const screenshotManager = ScreenshotManager.getInstance();

  // 生成 HTML 索引页面
  console.log('📄 生成截图索引页面...');
  screenshotManager.generateHtmlIndex();

  // 打印统计信息
  screenshotManager.printStats();

  // 清理临时文件
  const tempDirs = [
    'tests/screenshots/temp'
  ];

  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      console.log(`🗑️  清理临时目录: ${dir}`);
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`⚠️  清理目录失败: ${dir}`, error);
      }
    }
  }

  console.log('🧹 Playwright 全局清理完成');
}

export default globalTeardown;
