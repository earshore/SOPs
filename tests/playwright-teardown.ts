// tests/playwright-teardown.ts
// ================================================================
// 🎭 Playwright 全局清理
// 在所有测试运行后执行
// ================================================================

import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 全局清理函数
 * 在所有测试运行后执行一次
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Playwright 全局清理开始...');

  // 清理临时文件
  const tempDirs = [
    'tests/playwright-report',
    'tests/screenshots/temp'
  ];

  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      console.log(`🗑️  清理目录: ${dir}`);
      // 注意：不删除报告目录，只清理临时文件
    }
  }

  console.log('🧹 Playwright 全局清理完成');
}

export default globalTeardown;
