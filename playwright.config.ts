// playwright.config.ts
// ================================================================
// 🎭 Playwright E2E 测试配置
// 用于启动测试和端到端测试
// ================================================================

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',

  // 测试文件匹配模式
  testMatch: [
    '**/startup/**/*.test.ts',
    '**/e2e/**/*.spec.ts'
  ],

  // 最大失败次数（0 = 不限制）
  maxFailures: 0,

  // 并行执行的 worker 数量
  workers: process.env.CI ? 1 : undefined,

  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,

  // 测试超时（30秒）
  timeout: 30000,

  // 全局超时（5分钟）
  globalTimeout: 5 * 60 * 1000,

  // 全局设置脚本
  globalSetup: './tests/playwright-setup.ts',

  // 全局清理脚本
  globalTeardown: './tests/playwright-teardown.ts',

  // 期望超时（5秒）
  expect: {
    timeout: 5000
  },

  // 完全并行执行测试
  fullyParallel: true,

  // CI 环境下如果有未提交的更改则失败
  forbidOnly: !!process.env.CI,

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
    ['json', { outputFile: 'tests/playwright-report/results.json' }],
    ['list']
  ],

  // 共享设置
  use: {
    // 基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // 追踪配置（失败时保留）
    trace: 'retain-on-failure',

    // 截图配置（失败时截图）
    screenshot: 'only-on-failure',

    // 视频配置（失败时录制）
    video: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    
    // 忽略 HTTPS 错误
    ignoreHTTPSErrors: true,

    // 操作超时
    actionTimeout: 10000,

    // 导航超时
    navigationTimeout: 30000
  },

  // 项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome 特定配置
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        }
      }
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },

    // 移动端浏览器
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],

  // Web Server 配置（自动启动开发服务器）
  webServer: process.env.SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
