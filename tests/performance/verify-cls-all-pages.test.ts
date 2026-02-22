// ================================================================
// 🚀 验证所有页面 CLS < 0.1
// 使用 Lighthouse CLI 进行 CLS 验证
// ================================================================

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLS 阈值
 */
const CLS_THRESHOLD = 0.1;

/**
 * 测试页面配置
 */
const TEST_PAGES = [
  {
    name: '首页',
    path: '/',
  },
  {
    name: 'Promptlab',
    path: '/#/app-center/promptlab',
  },
  {
    name: 'AI分析',
    path: '/#/app-center/ai-analysis',
  },
  {
    name: 'Scraper',
    path: '/#/app-center/scraper',
  },
];

/**
 * 报告输出目录
 */
const REPORTS_DIR = path.join(__dirname, 'lighthouse-reports');

/**
 * 确保报告目录存在
 */
function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

/**
 * 运行 Lighthouse 测试
 */
function runLighthouse(url: string, pageName: string): any {
  ensureReportsDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `${pageName}-${timestamp}.json`);
  
  console.log(`\n🔍 运行 Lighthouse 测试: ${pageName}`);
  console.log(`   URL: ${url}`);
  console.log(`   报告路径: ${reportPath}`);
  
  try {
    // 运行 Lighthouse CLI
    const command = `npx lighthouse "${url}" --output=json --output-path="${reportPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance --quiet`;
    
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000 // 2分钟超时
    });
    
    // 读取报告
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);
    
    console.log(`   ✅ Lighthouse 测试完成\n`);
    
    return report;
    
  } catch (error: any) {
    console.error(`   ❌ Lighthouse 测试失败: ${error.message}`);
    throw error;
  }
}

// ================================================================
// 测试套件
// ================================================================

test.describe('验证所有页面 CLS < 0.1', () => {
  
  test.beforeAll(() => {
    console.log('\n🚀 开始 CLS 验证测试...');
    console.log(`测试页面数: ${TEST_PAGES.length}`);
    console.log(`CLS 阈值: < ${CLS_THRESHOLD}`);
    console.log(`报告输出目录: ${REPORTS_DIR}\n`);
  });

  // 为每个页面创建测试用例
  TEST_PAGES.forEach((page) => {
    test(`${page.name} 的 CLS 应该 < ${CLS_THRESHOLD}`, async ({ baseURL }) => {
      const fullUrl = `${baseURL}${page.path}`;
      
      // 运行 Lighthouse 测试
      const report = runLighthouse(fullUrl, page.name);
      
      // 获取 CLS 值
      const cls = report.audits?.['cumulative-layout-shift']?.numericValue || 0;
      
      console.log(`📊 ${page.name} CLS: ${cls.toFixed(3)}`);
      
      // 验证 CLS < 0.1
      expect(
        cls,
        `${page.name} 的 CLS 应该 < ${CLS_THRESHOLD}，实际: ${cls.toFixed(3)}`
      ).toBeLessThan(CLS_THRESHOLD);
      
      console.log(`✅ ${page.name} CLS 验证通过\n`);
    });
  });
  
  test.afterAll(() => {
    console.log('\n✅ CLS 验证测试完成');
    console.log(`📁 报告保存在: ${REPORTS_DIR}\n`);
  });
  
});
