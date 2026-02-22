// ================================================================
// 🚀 首页性能测试
// 使用 Lighthouse CLI 进行首页性能测试
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
 * Lighthouse 性能阈值配置
 */
const PERFORMANCE_THRESHOLDS = {
  performance: 90,        // 性能评分 > 90
  accessibility: 90,      // 可访问性评分 > 90
  bestPractices: 90,      // 最佳实践评分 > 90
  seo: 90,                // SEO 评分 > 90
  fcp: 1500,              // First Contentful Paint < 1.5s
  lcp: 2500,              // Largest Contentful Paint < 2.5s
  cls: 0.1,               // Cumulative Layout Shift < 0.1
  tbt: 300,               // Total Blocking Time < 300ms
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
 * 运行 Lighthouse 测试
 */
function runLighthouse(url: string): any {
  ensureReportsDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `home-${timestamp}.json`);
  
  console.log(`\n🔍 运行 Lighthouse 测试: ${url}`);
  console.log(`   报告路径: ${reportPath}`);
  
  try {
    // 运行 Lighthouse CLI
    const command = `npx lighthouse "${url}" --output=json --output-path="${reportPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`;
    
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
function printPerformanceSummary(report: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 首页性能报告摘要`);
  console.log('='.repeat(60));
  
  // 分类评分
  const categories = report.categories;
  console.log('\n📈 分类评分:');
  console.log(`  性能 (Performance):       ${formatMetric(categories.performance.score, 'score')} ${getStatusIcon(categories.performance.score * 100, PERFORMANCE_THRESHOLDS.performance)}`);
  console.log(`  可访问性 (Accessibility):  ${formatMetric(categories.accessibility.score, 'score')} ${getStatusIcon(categories.accessibility.score * 100, PERFORMANCE_THRESHOLDS.accessibility)}`);
  console.log(`  最佳实践 (Best Practices): ${formatMetric(categories['best-practices'].score, 'score')} ${getStatusIcon(categories['best-practices'].score * 100, PERFORMANCE_THRESHOLDS.bestPractices)}`);
  console.log(`  SEO:                       ${formatMetric(categories.seo.score, 'score')} ${getStatusIcon(categories.seo.score * 100, PERFORMANCE_THRESHOLDS.seo)}`);
  
  // Core Web Vitals
  const audits = report.audits;
  console.log('\n🎯 Core Web Vitals:');
  const fcp = audits['first-contentful-paint']?.numericValue || 0;
  const lcp = audits['largest-contentful-paint']?.numericValue || 0;
  const cls = audits['cumulative-layout-shift']?.numericValue || 0;
  const tbt = audits['total-blocking-time']?.numericValue || 0;
  const si = audits['speed-index']?.numericValue || 0;
  
  console.log(`  FCP (First Contentful Paint):    ${formatMetric(fcp)} ${getStatusIcon(fcp, PERFORMANCE_THRESHOLDS.fcp, true)}`);
  console.log(`  LCP (Largest Contentful Paint):  ${formatMetric(lcp)} ${getStatusIcon(lcp, PERFORMANCE_THRESHOLDS.lcp, true)}`);
  console.log(`  CLS (Cumulative Layout Shift):   ${cls.toFixed(3)} ${getStatusIcon(cls, PERFORMANCE_THRESHOLDS.cls, true)}`);
  console.log(`  TBT (Total Blocking Time):       ${formatMetric(tbt)} ${getStatusIcon(tbt, PERFORMANCE_THRESHOLDS.tbt, true)}`);
  console.log(`  SI (Speed Index):                ${formatMetric(si)}`);
  
  console.log('='.repeat(60) + '\n');
}

// ================================================================
// 测试套件
// ================================================================

test.describe('首页性能测试', () => {
  
  let lighthouseReport: any;
  
  test.beforeAll(async ({ baseURL }) => {
    console.log('\n🚀 开始首页性能测试...');
    console.log(`测试 URL: ${baseURL}/`);
    console.log(`报告输出目录: ${REPORTS_DIR}\n`);
    
    // 运行 Lighthouse 测试
    lighthouseReport = runLighthouse(`${baseURL}/`);
    
    // 打印性能摘要
    printPerformanceSummary(lighthouseReport);
  });
  
  test('应该满足性能评分要求 (> 90)', () => {
    const performanceScore = lighthouseReport.categories.performance.score * 100;
    
    console.log(`📊 性能评分: ${performanceScore}`);
    
    expect(
      performanceScore,
      `首页性能评分应该 >= ${PERFORMANCE_THRESHOLDS.performance}，实际: ${performanceScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance);
  });
  
  test('应该满足可访问性评分要求 (> 90)', () => {
    const accessibilityScore = lighthouseReport.categories.accessibility.score * 100;
    
    console.log(`📊 可访问性评分: ${accessibilityScore}`);
    
    expect(
      accessibilityScore,
      `首页可访问性评分应该 >= ${PERFORMANCE_THRESHOLDS.accessibility}，实际: ${accessibilityScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.accessibility);
  });
  
  test('应该满足最佳实践评分要求 (> 90)', () => {
    const bestPracticesScore = lighthouseReport.categories['best-practices'].score * 100;
    
    console.log(`📊 最佳实践评分: ${bestPracticesScore}`);
    
    expect(
      bestPracticesScore,
      `首页最佳实践评分应该 >= ${PERFORMANCE_THRESHOLDS.bestPractices}，实际: ${bestPracticesScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.bestPractices);
  });
  
  test('应该满足 SEO 评分要求 (> 90)', () => {
    const seoScore = lighthouseReport.categories.seo.score * 100;
    
    console.log(`📊 SEO 评分: ${seoScore}`);
    
    expect(
      seoScore,
      `首页 SEO 评分应该 >= ${PERFORMANCE_THRESHOLDS.seo}，实际: ${seoScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.seo);
  });
  
  test('应该验证 FCP < 1.5s', () => {
    const fcp = lighthouseReport.audits['first-contentful-paint']?.numericValue || 0;
    
    console.log(`📊 FCP: ${formatMetric(fcp)}`);
    
    expect(
      fcp,
      `FCP 应该 < ${PERFORMANCE_THRESHOLDS.fcp}ms，实际: ${Math.round(fcp)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.fcp);
  });
  
  test('应该验证 LCP < 2.5s', () => {
    const lcp = lighthouseReport.audits['largest-contentful-paint']?.numericValue || 0;
    
    console.log(`📊 LCP: ${formatMetric(lcp)}`);
    
    expect(
      lcp,
      `LCP 应该 < ${PERFORMANCE_THRESHOLDS.lcp}ms，实际: ${Math.round(lcp)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
  });
  
  test('应该验证 CLS < 0.1', () => {
    const cls = lighthouseReport.audits['cumulative-layout-shift']?.numericValue || 0;
    
    console.log(`📊 CLS: ${cls.toFixed(3)}`);
    
    expect(
      cls,
      `CLS 应该 < ${PERFORMANCE_THRESHOLDS.cls}，实际: ${cls.toFixed(3)}`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
  });
  
  test('应该验证 TBT < 300ms (FID 估算)', () => {
    const tbt = lighthouseReport.audits['total-blocking-time']?.numericValue || 0;
    
    console.log(`📊 TBT: ${formatMetric(tbt)}`);
    
    // TBT < 300ms 通常意味着 FID < 100ms
    expect(
      tbt,
      `TBT 应该 < ${PERFORMANCE_THRESHOLDS.tbt}ms (估算 FID < 100ms)，实际: ${Math.round(tbt)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.tbt);
  });
  
  test.afterAll(() => {
    console.log('\n✅ 首页性能测试完成');
    console.log(`📁 报告保存在: ${REPORTS_DIR}\n`);
  });
  
});
