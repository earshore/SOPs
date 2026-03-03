// tests/helpers/screenshot-fixture.ts
// ================================================================
// 📸 截图 Fixture
// 为 Playwright 测试提供自动失败截图功能
// ================================================================

import { test as base, TestInfo } from '@playwright/test';
import { ScreenshotManager } from './screenshot-manager';

/**
 * 扩展的测试 Fixture
 * 
 * 自动在测试失败时捕获截图
 */
export const test = base.extend({
  /**
   * 自动截图 Fixture
   * 
   * 在每个测试后检查状态，如果失败则自动截图
   */
  autoScreenshot: [async ({ page }, use, testInfo: TestInfo) => {
    // 测试执行前
    await use(page);

    // 测试执行后：检查是否失败
    if (testInfo.status !== testInfo.expectedStatus) {
      const manager = ScreenshotManager.getInstance();
      await manager.captureFailure(page, testInfo);
    }
  }, { auto: true }]
});

export { expect } from '@playwright/test';
