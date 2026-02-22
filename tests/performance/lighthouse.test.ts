// ================================================================
// 🚀 Lighthouse 性能测试
// 使用 Playwright 和 Lighthouse 进行 Web 性能测试
// ================================================================

import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lighthouse 性能阈值配置
 * 
 * 根据 Web Vitals 标准和项目需求设定
 */
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  performance: 90,        // 性能评分 > 90
  accessibility: 90,      // 可访问性评分 > 90
  bestPractices: 90,      // 最佳实践评分 > 90
  seo: 90,                // SEO 评分 > 90
  pwa: 0,                 // PWA 评分（可选）
  
  // 具体指标
  fcp: 1500,              // First Contentful Paint < 1.5s
  lcp: 2500,              // Largest Contentful Paint < 2.5s
  fid: 100,               // First Input Delay < 100ms
  cls: 0.1,               // Cumulative Layout Shift < 0.1
  tbt: 300,               // Total Blocking Time < 300ms
  si: 3500,               // Speed Index < 3.5s
  tti: 3500,              // Time to Interactive < 3.5s
};

/**
 * 测试页面配置
 */
const TEST_PAGES = [
  {
    name: '首页',
    url: '/',
    description: '应用首页性能测试'
  },
  {
    name: 'Promptlab 页面',
    url: '/#/app-center/promptlab',
    description: 'Promptlab 模块性能测试'
  },
  {
    name: 'AI 分析页面',
    url: '/#/app-center/ai-analysis',
    description: 'AI 分析模块性能测试'
  },
  {
    name: 'Scraper 页面',
    url: '/#/app-center/scraper',
    description: 'Scraper 模块性能测试'
  }
];

/**
 * Lighthouse 配置
 */
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false
    }
  }
};

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
 * 保存 Lighthouse 报告
 */
function saveLighthouseReport(
  pageName: string,
  report: any,
  format: 'json' | 'html' = 'json'
) {
  ensureReportsDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${pageName.replace(/\s+/g, '-')}_${timestamp}.${format}`;
  const filepath = path.join(REPORTS_DIR, filename);
  
  const content = format === 'json' 
    ? JSON.stringify(report, null, 2)
    : report;
  
  fs.writeFileSync(filepath, content, 'utf-8');
  
  console.log(`📄 报告已保存: ${filepath}`);
  
  return filepath;
}

/**
 * 格式化性能指标
 */
function formatMetric(value: number, unit: string = 'ms'): string {
  if (unit === 'ms') {
    return `${Math.round(value)}ms`;
  } else if (unit === 's') {
    return `${(value / 1000).toFixed(2)}s`;
  } else if (unit === 'score') {
    return `${Math.round(value * 100)}`;
  }
  return `${value}`;
}

/**
 * 获取性能状态图标
 */
function getStatusIcon(actual: number, threshold: number, inverse: boolean = false): string {
  const passed = inverse ? actual < threshold : actual > threshold;
  return passed ? '✅' : '❌';
}

/**
 * 打印性能报告摘要
 */
function printPerformanceSummary(pageName: string, audits: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${pageName} - 性能报告摘要`);
  console.log('='.repeat(60));
  
  // 分类评分
  console.log('\n📈 分类评分:');
  console.log(`  性能 (Performance):       ${formatMetric(audits.categories.performance.score, 'score')} ${getStatusIcon(audits.categories.performance.score * 100, PERFORMANCE_THRESHOLDS.performance)}`);
  console.log(`  可访问性 (Accessibility):  ${formatMetric(audits.categories.accessibility.score, 'score')} ${getStatusIcon(audits.categories.accessibility.score * 100, PERFORMANCE_THRESHOLDS.accessibility)}`);
  console.log(`  最佳实践 (Best Practices): ${formatMetric(audits.categories['best-practices'].score, 'score')} ${getStatusIcon(audits.categories['best-practices'].score * 100, PERFORMANCE_THRESHOLDS.bestPractices)}`);
  console.log(`  SEO:                       ${formatMetric(audits.categories.seo.score, 'score')} ${getStatusIcon(audits.categories.seo.score * 100, PERFORMANCE_THRESHOLDS.seo)}`);
  
  // Core Web Vitals
  console.log('\n🎯 Core Web Vitals:');
  const fcp = audits.audits['first-contentful-paint']?.numericValue || 0;
  const lcp = audits.audits['largest-contentful-paint']?.numericValue || 0;
  const cls = audits.audits['cumulative-layout-shift']?.numericValue || 0;
  const tbt = audits.audits['total-blocking-time']?.numericValue || 0;
  const si = audits.audits['speed-index']?.numericValue || 0;
  
  console.log(`  FCP (First Contentful Paint):    ${formatMetric(fcp)} ${getStatusIcon(fcp, PERFORMANCE_THRESHOLDS.fcp, true)}`);
  console.log(`  LCP (Largest Contentful Paint):  ${formatMetric(lcp)} ${getStatusIcon(lcp, PERFORMANCE_THRESHOLDS.lcp, true)}`);
  console.log(`  CLS (Cumulative Layout Shift):   ${cls.toFixed(3)} ${getStatusIcon(cls, PERFORMANCE_THRESHOLDS.cls, true)}`);
  console.log(`  TBT (Total Blocking Time):       ${formatMetric(tbt)} ${getStatusIcon(tbt, PERFORMANCE_THRESHOLDS.tbt, true)}`);
  console.log(`  SI (Speed Index):                ${formatMetric(si)} ${getStatusIcon(si, PERFORMANCE_THRESHOLDS.si, true)}`);
  
  console.log('='.repeat(60));
}

// ================================================================
// 测试套件
// ================================================================

test.describe('Lighthouse 性能测试', () => {
  
  test.beforeAll(() => {
    console.log('\n🚀 开始 Lighthouse 性能测试...');
    console.log(`测试页面数: ${TEST_PAGES.length}`);
    console.log(`报告输出目录: ${REPORTS_DIR}\n`);
    ensureReportsDir();
  });

  // 为每个页面创建测试用例
  TEST_PAGES.forEach((page) => {
    test.describe(`${page.name} 性能测试`, () => {
      
      test(`应该满足性能阈值要求`, async ({ page: playwrightPage, baseURL }) => {
        console.log(`\n🔍 测试页面: ${page.name}`);
        console.log(`   URL: ${page.url}`);
        console.log(`   描述: ${page.description}`);
        
        // 导航到目标页面
        const fullUrl = `${baseURL}${page.url}`;
        await playwrightPage.goto(fullUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // 等待页面完全加载
        await playwrightPage.waitForTimeout(2000);
        
        // 运行 Lighthouse 审计
        console.log('   ⏳ 运行 Lighthouse 审计...');
        
        const audits = await playAudit({
          page: playwrightPage,
          config: LIGHTHOUSE_CONFIG,
          port: 9222
        });
        
        // 打印性能摘要
        printPerformanceSummary(page.name, audits);
        
        // 保存报告
        saveLighthouseReport(page.name, audits, 'json');
        
        // ============================================================
        // 验证：分类评分
        // ============================================================
        
        const performanceScore = audits.categories.performance.score * 100;
        const accessibilityScore = audits.categories.accessibility.score * 100;
        const bestPracticesScore = audits.categories['best-practices'].score * 100;
        const seoScore = audits.categories.seo.score * 100;
        
        expect(
          performanceScore,
          `${page.name} 性能评分应该 > ${PERFORMANCE_THRESHOLDS.performance}，实际: ${performanceScore}`
        ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance);
        
        expect(
          accessibilityScore,
          `${page.name} 可访问性评分应该 > ${PERFORMANCE_THRESHOLDS.accessibility}，实际: ${accessibilityScore}`
        ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.accessibility);
        
        expect(
          bestPracticesScore,
          `${page.name} 最佳实践评分应该 > ${PERFORMANCE_THRESHOLDS.bestPractices}，实际: ${bestPracticesScore}`
        ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.bestPractices);
        
        expect(
          seoScore,
          `${page.name} SEO 评分应该 > ${PERFORMANCE_THRESHOLDS.seo}，实际: ${seoScore}`
        ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.seo);
        
        // ============================================================
        // 验证：Core Web Vitals
        // ============================================================
        
        const fcp = audits.audits['first-contentful-paint']?.numericValue || 0;
        const lcp = audits.audits['largest-contentful-paint']?.numericValue || 0;
        const cls = audits.audits['cumulative-layout-shift']?.numericValue || 0;
        const tbt = audits.audits['total-blocking-time']?.numericValue || 0;
        
        expect(
          fcp,
          `${page.name} FCP 应该 < ${PERFORMANCE_THRESHOLDS.fcp}ms，实际: ${Math.round(fcp)}ms`
        ).toBeLessThan(PERFORMANCE_THRESHOLDS.fcp);
        
        expect(
          lcp,
          `${page.name} LCP 应该 < ${PERFORMANCE_THRESHOLDS.lcp}ms，实际: ${Math.round(lcp)}ms`
        ).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
        
        expect(
          cls,
          `${page.name} CLS 应该 < ${PERFORMANCE_THRESHOLDS.cls}，实际: ${cls.toFixed(3)}`
        ).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
        
        expect(
          tbt,
          `${page.name} TBT 应该 < ${PERFORMANCE_THRESHOLDS.tbt}ms，实际: ${Math.round(tbt)}ms`
        ).toBeLessThan(PERFORMANCE_THRESHOLDS.tbt);
        
        console.log(`\n✅ ${page.name} 性能测试通过\n`);
      });
      
      test(`应该验证 LCP < 2.5s`, async ({ page: playwrightPage, baseURL }) => {
        const fullUrl = `${baseURL}${page.url}`;
        await playwrightPage.goto(fullUrl, { waitUntil: 'networkidle' });
        await playwrightPage.waitForTimeout(2000);
        
        const audits = await playAudit({
          page: playwrightPage,
          config: LIGHTHOUSE_CONFIG,
          port: 9222
        });
        
        const lcp = audits.audits['largest-contentful-paint']?.numericValue || 0;
        
        console.log(`   📊 ${page.name} LCP: ${formatMetric(lcp)}`);
        
        expect(
          lcp,
          `LCP 应该 < 2500ms，实际: ${Math.round(lcp)}ms`
        ).toBeLessThan(2500);
      });
      
      test(`应该验证 FID < 100ms (通过 TBT 估算)`, async ({ page: playwrightPage, baseURL }) => {
        const fullUrl = `${baseURL}${page.url}`;
        await playwrightPage.goto(fullUrl, { waitUntil: 'networkidle' });
        await playwrightPage.waitForTimeout(2000);
        
        const audits = await playAudit({
          page: playwrightPage,
          config: LIGHTHOUSE_CONFIG,
          port: 9222
        });
        
        // FID 无法在实验室环境中直接测量，使用 TBT 作为替代指标
        const tbt = audits.audits['total-blocking-time']?.numericValue || 0;
        
        console.log(`   📊 ${page.name} TBT (FID 估算): ${formatMetric(tbt)}`);
        
        // TBT < 300ms 通常意味着 FID < 100ms
        expect(
          tbt,
          `TBT 应该 < 300ms (估算 FID < 100ms)，实际: ${Math.round(tbt)}ms`
        ).toBeLessThan(300);
      });
      
      test(`应该验证 CLS < 0.1`, async ({ page: playwrightPage, baseURL }) => {
        const fullUrl = `${baseURL}${page.url}`;
        await playwrightPage.goto(fullUrl, { waitUntil: 'networkidle' });
        await playwrightPage.waitForTimeout(2000);
        
        const audits = await playAudit({
          page: playwrightPage,
          config: LIGHTHOUSE_CONFIG,
          port: 9222
        });
        
        const cls = audits.audits['cumulative-layout-shift']?.numericValue || 0;
        
        console.log(`   📊 ${page.name} CLS: ${cls.toFixed(3)}`);
        
        expect(
          cls,
          `CLS 应该 < 0.1，实际: ${cls.toFixed(3)}`
        ).toBeLessThan(0.1);
      });
      
    });
  });
  
  test.describe('性能对比测试', () => {
    
    test('应该生成性能对比报告', async ({ page: playwrightPage, baseURL }) => {
      console.log('\n📊 生成性能对比报告...\n');
      
      const results: any[] = [];
      
      // 测试所有页面
      for (const testPage of TEST_PAGES) {
        const fullUrl = `${baseURL}${testPage.url}`;
        await playwrightPage.goto(fullUrl, { waitUntil: 'networkidle' });
        await playwrightPage.waitForTimeout(2000);
        
        const audits = await playAudit({
          page: playwrightPage,
          config: LIGHTHOUSE_CONFIG,
          port: 9222
        });
        
        results.push({
          name: testPage.name,
          url: testPage.url,
          performance: audits.categories.performance.score * 100,
          accessibility: audits.categories.accessibility.score * 100,
          bestPractices: audits.categories['best-practices'].score * 100,
          seo: audits.categories.seo.score * 100,
          fcp: audits.audits['first-contentful-paint']?.numericValue || 0,
          lcp: audits.audits['largest-contentful-paint']?.numericValue || 0,
          cls: audits.audits['cumulative-layout-shift']?.numericValue || 0,
          tbt: audits.audits['total-blocking-time']?.numericValue || 0,
          si: audits.audits['speed-index']?.numericValue || 0
        });
      }
      
      // 打印对比表格
      console.log('\n' + '='.repeat(100));
      console.log('📊 性能对比报告');
      console.log('='.repeat(100));
      console.log('\n分类评分对比:\n');
      console.log('页面'.padEnd(20) + '性能'.padEnd(10) + '可访问性'.padEnd(12) + '最佳实践'.padEnd(12) + 'SEO'.padEnd(10));
      console.log('-'.repeat(100));
      
      results.forEach(result => {
        console.log(
          result.name.padEnd(20) +
          `${Math.round(result.performance)}`.padEnd(10) +
          `${Math.round(result.accessibility)}`.padEnd(12) +
          `${Math.round(result.bestPractices)}`.padEnd(12) +
          `${Math.round(result.seo)}`.padEnd(10)
        );
      });
      
      console.log('\nCore Web Vitals 对比:\n');
      console.log('页面'.padEnd(20) + 'FCP(ms)'.padEnd(12) + 'LCP(ms)'.padEnd(12) + 'CLS'.padEnd(10) + 'TBT(ms)'.padEnd(12));
      console.log('-'.repeat(100));
      
      results.forEach(result => {
        console.log(
          result.name.padEnd(20) +
          `${Math.round(result.fcp)}`.padEnd(12) +
          `${Math.round(result.lcp)}`.padEnd(12) +
          `${result.cls.toFixed(3)}`.padEnd(10) +
          `${Math.round(result.tbt)}`.padEnd(12)
        );
      });
      
      console.log('='.repeat(100) + '\n');
      
      // 保存对比报告
      const comparisonReport = {
        timestamp: new Date().toISOString(),
        results,
        summary: {
          avgPerformance: results.reduce((sum, r) => sum + r.performance, 0) / results.length,
          avgAccessibility: results.reduce((sum, r) => sum + r.accessibility, 0) / results.length,
          avgBestPractices: results.reduce((sum, r) => sum + r.bestPractices, 0) / results.length,
          avgSeo: results.reduce((sum, r) => sum + r.seo, 0) / results.length,
          avgFcp: results.reduce((sum, r) => sum + r.fcp, 0) / results.length,
          avgLcp: results.reduce((sum, r) => sum + r.lcp, 0) / results.length,
          avgCls: results.reduce((sum, r) => sum + r.cls, 0) / results.length,
          avgTbt: results.reduce((sum, r) => sum + r.tbt, 0) / results.length
        }
      };
      
      saveLighthouseReport('comparison', comparisonReport, 'json');
      
      // 验证：所有页面都应该满足基本要求
      results.forEach(result => {
        expect(
          result.performance,
          `${result.name} 性能评分应该 >= 90`
        ).toBeGreaterThanOrEqual(90);
      });
      
      console.log('✅ 性能对比报告生成完成\n');
    });
    
  });
  
  test.afterAll(() => {
    console.log('\n✅ Lighthouse 性能测试完成');
    console.log(`📁 报告保存在: ${REPORTS_DIR}\n`);
  });
  
});
