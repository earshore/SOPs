// playwright.config.ts
// ================================================================
// 🎭 Playwright E2E 测试配置
// 用于启动测试和端到端测试
// ================================================================
//
// 并行执行配置说明：
// -------------------
// 1. workers: 控制并行执行的 worker 数量
//    - CI 环境：1（串行执行，更稳定）
//    - 本地环境：CPU 核心数的 50%（平衡性能和稳定性）
//    - 自定义：设置 WORKERS 环境变量
//
// 2. fullyParallel: true
//    - 允许同一文件内的测试并行执行
//    - 提升测试速度，但需要确保测试隔离性
//
// 3. 浏览器项目控制：
//    - BROWSER_ONLY: 只运行指定浏览器（chromium/firefox/webkit）
//    - SKIP_FIREFOX: 跳过 Firefox 测试
//    - SKIP_WEBKIT: 跳过 WebKit 测试
//    - ENABLE_MOBILE: 启用移动端浏览器测试
//
// 使用示例：
// ---------
// # 使用 4 个 worker 并行执行
// WORKERS=4 npm run test:e2e
//
// # 只在 Chromium 上运行测试
// BROWSER_ONLY=chromium npm run test:e2e
//
// # 跳过 Firefox 和 WebKit
// SKIP_FIREFOX=1 SKIP_WEBKIT=1 npm run test:e2e
//
// # 启用移动端测试
// ENABLE_MOBILE=1 npm run test:e2e
//
// ================================================================

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './test',

  // 测试文件匹配模式
  testMatch: [
    '**/startup/**/*.test.ts',
    '**/e2e/**/*.spec.ts',
    '**/visual/**/*.test.ts',
    '**/performance/**/*.test.ts'
  ],

  // 最大失败次数（0 = 不限制）
  maxFailures: 0,

  // 并行执行的 worker 数量
  // CI 环境：1 个 worker（串行执行，更稳定）
  // 本地环境：使用 CPU 核心数的 50%（避免资源耗尽）
  workers: process.env.CI ? 1 : process.env.WORKERS ? parseInt(process.env.WORKERS) : '50%',

  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,

  // 测试超时（30秒）
  timeout: 30000,

  // 全局超时（5分钟）
  globalTimeout: 5 * 60 * 1000,

  // 全局设置脚本
  globalSetup: './test/playwright-setup.ts',

  // 全局清理脚本
  globalTeardown: './test/playwright-teardown.ts',

  // 期望超时（5秒）
  expect: {
    timeout: 5000
  },

  // 完全并行执行测试
  // 允许同一文件内的测试并行执行
  fullyParallel: true,

  // 在所有 worker 之间共享浏览器实例（提升性能）
  // 注意：这可能导致测试间的状态污染，需要确保测试隔离性
  // workers: process.env.SHARED_BROWSER ? 1 : workers,

  // CI 环境下如果有未提交的更改则失败
  forbidOnly: !!process.env.CI,

  // 报告配置
  reporter: [
    // HTML 报告（主要报告格式）
    ['html', {
      outputFolder: 'test/playwright-report',
      open: 'never',
      host: 'localhost',
      port: 9323
    }],

    // JSON 报告（用于自定义处理）
    ['json', {
      outputFile: 'test/playwright-report/results.json'
    }],

    // JUnit XML 报告（用于 CI/CD 集成）
    ['junit', {
      outputFile: 'test/playwright-report/junit.xml',
      embedAnnotationsAsProperties: true,
      embedAttachmentsAsProperty: 'testrun.attachments'
    }],

    // 控制台列表报告
    ['list', {
      printSteps: true
    }],

    // CI 环境使用 GitHub Actions 报告
    ...(process.env.CI && process.env.GITHUB_ACTIONS ? [['github']] : [])
  ],

  // 共享设置
  use: {
    // 基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // 追踪配置（失败时保留）
    // 追踪文件包含完整的测试执行记录，可用于调试
    trace: 'retain-on-failure',

    // 截图配置（失败时自动截图）
    // 截图会自动保存到 tests/screenshots/failures/ 目录
    // 使用 ScreenshotManager 进行统一管理
    // 查看截图: npm run screenshots:view
    // 查看统计: npm run screenshots:stats
    // 清理截图: npm run screenshots:cleanup
    screenshot: 'only-on-failure',

    // 视频配置（失败时录制）
    // 视频会保存到 test-results/ 目录
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
      // 移除 testMatch 限制，使用全局 testMatch 配置
    },

    // 可选：Firefox 测试（通过环境变量控制）
    ...(process.env.SKIP_FIREFOX ? [] : [{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }]),

    // 可选：WebKit 测试（通过环境变量控制）
    ...(process.env.SKIP_WEBKIT ? [] : [{
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }]),

    // 可选：移动端浏览器测试（默认跳过，通过环境变量启用）
    ...(process.env.ENABLE_MOBILE ? [
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] }
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] }
      }
    ] : [])
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
