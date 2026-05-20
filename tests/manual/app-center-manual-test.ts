// tests/manual/app-center-manual-test.ts
// ================================================================
// 🧪 应用中心手动测试脚本
// 模拟真实用户访问，检查控制台错误
// ================================================================

import { chromium, Browser, Page, ConsoleMessage } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  module: string;
  url: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  loadTime: number;
  timestamp: string;
}

const BASE_URL = 'http://localhost:5177';
const TEST_API_KEY = 'AI2026';
const EXAMPLE_JSON_PATH = path.resolve(process.cwd(), 'examples/Amz_B01KYRUBT8_2026-02-25T07-23-54.json');

// 测试模块列表
const TEST_MODULES = [
  { name: '应用中心概览', path: '/#/app-center' },
  { name: 'Scraper - 数据采集', path: '/#/app-center/scraper' },
  { name: 'AI Analysis - 智能分析', path: '/#/app-center/ai-analysis' },
  { name: 'Promptlab - 提示词实验室', path: '/#/app-center/promptlab' },
  { name: 'Playground - Deep Chat', path: '/#/app-center/playground/deep-chat' },
  { name: 'QALab - QA实验室', path: '/#/app-center/qalab' },
  { name: 'Keyword Hunter - 输入', path: '/#/app-center/keyword-hunter/input' },
  { name: 'Keyword Hunter - 处理', path: '/#/app-center/keyword-hunter/process' },
  { name: 'Keyword Hunter - 分析', path: '/#/app-center/keyword-hunter/analysis' },
];

class AppCenterTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private results: TestResult[] = [];
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];

  async setup(): Promise<void> {
    console.log('🚀 启动浏览器...\n');
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();

    // 监听控制台消息
    this.page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        this.consoleErrors.push(text);
        console.log(`   ❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        this.consoleWarnings.push(text);
        console.log(`   ⚠️  Console Warning: ${text}`);
      }
    });

    // 监听页面错误
    this.page.on('pageerror', (error) => {
      this.consoleErrors.push(error.message);
      console.log(`   ❌ Page Error: ${error.message}`);
    });
  }

  async testModule(moduleName: string, modulePath: string): Promise<TestResult> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 测试模块: ${moduleName}`);
    console.log(`🔗 URL: ${BASE_URL}${modulePath}`);
    console.log(`${'='.repeat(70)}\n`);

    // 清空错误记录
    this.consoleErrors = [];
    this.consoleWarnings = [];

    const startTime = Date.now();

    try {
      // 访问页面
      await this.page!.goto(`${BASE_URL}${modulePath}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const loadTime = Date.now() - startTime;
      console.log(`   ✓ 页面加载完成 (${loadTime}ms)`);

      // 等待主要内容加载
      await this.page!.waitForTimeout(2000);

      // 检查页面标题
      const title = await this.page!.title();
      console.log(`   ✓ 页面标题: ${title}`);

      // 截图
      const screenshotPath = `tests/screenshots/manual/${moduleName.replace(/\s+/g, '-')}.png`;
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   ✓ 截图已保存: ${screenshotPath}`);

      const result: TestResult = {
        module: moduleName,
        url: `${BASE_URL}${modulePath}`,
        success: this.consoleErrors.length === 0,
        errors: [...this.consoleErrors],
        warnings: [...this.consoleWarnings],
        loadTime,
        timestamp: new Date().toISOString()
      };

      if (this.consoleErrors.length === 0) {
        console.log(`   ✅ 无控制台错误`);
      } else {
        console.log(`   ❌ 发现 ${this.consoleErrors.length} 个错误`);
      }

      if (this.consoleWarnings.length > 0) {
        console.log(`   ⚠️  发现 ${this.consoleWarnings.length} 个警告`);
      }

      return result;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.log(`   ❌ 测试失败: ${error}`);

      return {
        module: moduleName,
        url: `${BASE_URL}${modulePath}`,
        success: false,
        errors: [...this.consoleErrors, `测试异常: ${error}`],
        warnings: [...this.consoleWarnings],
        loadTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllTests(): Promise<void> {
    for (const module of TEST_MODULES) {
      const result = await this.testModule(module.name, module.path);
      this.results.push(result);
      
      // 每个模块测试后等待一下
      await this.page!.waitForTimeout(1000);
    }
  }

  async generateReport(): Promise<void> {
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`📊 测试报告汇总`);
    console.log(`${'='.repeat(70)}\n`);

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`总测试数: ${totalTests}`);
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}\n`);

    // 详细结果
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.module} (${result.loadTime}ms)`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(err => {
          console.log(`      ❌ ${err}`);
        });
      }
    });

    // 保存 JSON 报告
    const reportPath = 'tests/manual/test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细报告已保存: ${reportPath}`);
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    console.log('\n🏁 测试完成');
  }
}

// 主函数
async function main() {
  const tester = new AppCenterTester();

  try {
    await tester.setup();
    await tester.runAllTests();
    await tester.generateReport();
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

main();
