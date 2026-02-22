// ================================================================
// 🚀 Scraper 页面性能测试
// 使用 Playwright 和 Lighthouse 进行 Scraper 模块性能测试
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
 * 配置浏览器启动参数以支持 Lighthouse
 * 必须在文件顶层配置
 */
test.use({
  launchOptions: {
    args: ['--remote-debugging-port=9222']
  }
});

/**
 * Scraper 页面性能阈值配置
 * 
 * 根据 Web Vitals 标准和项目需求设定
 * Scraper 是一个数据密集型页面，阈值相对宽松
 */
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  performance: 85,        // 性能评分 > 85 (数据密集型页面标准)
  accessibility: 90,      // 可访问性评分 > 90
  bestPractices: 90,      // 最佳实践评分 > 90
  seo: 90,                // SEO 评分 > 90
  
  // 具体指标
  fcp: 1800,              // First Contentful Paint < 1.8s
  lcp: 2800,              // Largest Contentful Paint < 2.8s
  fid: 100,               // First Input Delay < 100ms
  cls: 0.1,               // Cumulative Layout Shift < 0.1
  tbt: 500,               // Total Blocking Time < 500ms (数据密集型页面)
  si: 4000,               // Speed Index < 4s
  tti: 4000,              // Time to Interactive < 4s
};

/**
 * Lighthouse 配置
 */
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop' as const,
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
 * playwright-lighthouse 阈值配置
 * 用于 playAudit 的自动验证
 */
const PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS = {
  performance: PERFORMANCE_THRESHOLDS.performance,
  accessibility: PERFORMANCE_THRESHOLDS.accessibility,
  'best-practices': PERFORMANCE_THRESHOLDS.bestPractices,
  seo: PERFORMANCE_THRESHOLDS.seo,
  pwa: 0  // PWA 不作要求
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
  filename: string,
  report: any,
  format: 'json' | 'html' = 'json'
) {
  ensureReportsDir();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullFilename = `${filename}_${timestamp}.${format}`;
  const filepath = path.join(REPORTS_DIR, fullFilename);
  
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
function printPerformanceSummary(audits: any) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 Scraper 页面性能报告摘要`);
  console.log('='.repeat(70));
  
  // 分类评分
  console.log('\n📈 分类评分:');
  console.log(`  性能 (Performance):       ${formatMetric((audits as any).categories.performance.score, 'score')} ${getStatusIcon((audits as any).categories.performance.score * 100, PERFORMANCE_THRESHOLDS.performance)}`);
  console.log(`  可访问性 (Accessibility):  ${formatMetric((audits as any).categories.accessibility.score, 'score')} ${getStatusIcon((audits as any).categories.accessibility.score * 100, PERFORMANCE_THRESHOLDS.accessibility)}`);
  console.log(`  最佳实践 (Best Practices): ${formatMetric((audits as any).categories['best-practices'].score, 'score')} ${getStatusIcon((audits as any).categories['best-practices'].score * 100, PERFORMANCE_THRESHOLDS.bestPractices)}`);
  console.log(`  SEO:                       ${formatMetric((audits as any).categories.seo.score, 'score')} ${getStatusIcon((audits as any).categories.seo.score * 100, PERFORMANCE_THRESHOLDS.seo)}`);
  
  // Core Web Vitals
  console.log('\n🎯 Core Web Vitals:');
  const fcp = (audits as any).audits['first-contentful-paint']?.numericValue || 0;
  const lcp = (audits as any).audits['largest-contentful-paint']?.numericValue || 0;
  const cls = (audits as any).audits['cumulative-layout-shift']?.numericValue || 0;
  const tbt = (audits as any).audits['total-blocking-time']?.numericValue || 0;
  const si = (audits as any).audits['speed-index']?.numericValue || 0;
  const tti = (audits as any).audits['interactive']?.numericValue || 0;
  
  console.log(`  FCP (First Contentful Paint):    ${formatMetric(fcp)} ${getStatusIcon(fcp, PERFORMANCE_THRESHOLDS.fcp, true)}`);
  console.log(`  LCP (Largest Contentful Paint):  ${formatMetric(lcp)} ${getStatusIcon(lcp, PERFORMANCE_THRESHOLDS.lcp, true)}`);
  console.log(`  CLS (Cumulative Layout Shift):   ${cls.toFixed(3)} ${getStatusIcon(cls, PERFORMANCE_THRESHOLDS.cls, true)}`);
  console.log(`  TBT (Total Blocking Time):       ${formatMetric(tbt)} ${getStatusIcon(tbt, PERFORMANCE_THRESHOLDS.tbt, true)}`);
  console.log(`  SI (Speed Index):                ${formatMetric(si)} ${getStatusIcon(si, PERFORMANCE_THRESHOLDS.si, true)}`);
  console.log(`  TTI (Time to Interactive):       ${formatMetric(tti)} ${getStatusIcon(tti, PERFORMANCE_THRESHOLDS.tti, true)}`);
  
  // 资源统计
  console.log('\n📦 资源统计:');
  const resourceSummary = (audits as any).audits['resource-summary']?.details?.items || [];
  resourceSummary.forEach((item: any) => {
    console.log(`  ${item.resourceType.padEnd(15)}: ${item.requestCount} 个请求, ${(item.transferSize / 1024).toFixed(2)} KB`);
  });
  
  // JavaScript 执行时间
  const bootupTime = (audits as any).audits['bootup-time']?.numericValue || 0;
  console.log(`\n⚡ JavaScript 执行时间: ${formatMetric(bootupTime)}`);
  
  // 主线程工作
  const mainthreadWork = (audits as any).audits['mainthread-work-breakdown']?.numericValue || 0;
  console.log(`🔧 主线程工作时间: ${formatMetric(mainthreadWork)}`);
  
  console.log('='.repeat(70));
}

// ================================================================
// 测试套件
// ================================================================

test.describe('Scraper 页面性能测试', () => {
  
  test.beforeAll(() => {
    console.log('\n🚀 开始 Scraper 页面性能测试...');
    console.log(`报告输出目录: ${REPORTS_DIR}\n`);
    ensureReportsDir();
  });

  test('应该满足性能阈值要求', async ({ page, baseURL }) => {
    console.log(`\n🔍 测试页面: Scraper`);
    console.log(`   URL: /#/app-center/scraper`);
    
    // 导航到 Scraper 页面
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // 等待 Alpine 组件加载
    await page.waitForSelector('[x-data*="scraper"]', { timeout: 10000 }).catch(() => {
      console.warn('   ⚠️  Alpine 组件选择器未找到，继续测试...');
    });
    
    // 等待页面完全加载
    await page.waitForTimeout(2000);
    
    // 运行 Lighthouse 审计
    console.log('   ⏳ 运行 Lighthouse 审计...');
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    // 打印性能摘要
    printPerformanceSummary(audits);
    
    // 保存报告
    saveLighthouseReport('scraper', audits, 'json');
    
    // ============================================================
    // 验证：分类评分
    // ============================================================
    
    const performanceScore = (audits as any).categories.performance.score * 100;
    const accessibilityScore = (audits as any).categories.accessibility.score * 100;
    const bestPracticesScore = (audits as any).categories['best-practices'].score * 100;
    const seoScore = (audits as any).categories.seo.score * 100;
    
    expect(
      performanceScore,
      `Scraper 性能评分应该 >= ${PERFORMANCE_THRESHOLDS.performance}，实际: ${performanceScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance);
    
    expect(
      accessibilityScore,
      `Scraper 可访问性评分应该 >= ${PERFORMANCE_THRESHOLDS.accessibility}，实际: ${accessibilityScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.accessibility);
    
    expect(
      bestPracticesScore,
      `Scraper 最佳实践评分应该 >= ${PERFORMANCE_THRESHOLDS.bestPractices}，实际: ${bestPracticesScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.bestPractices);
    
    expect(
      seoScore,
      `Scraper SEO 评分应该 >= ${PERFORMANCE_THRESHOLDS.seo}，实际: ${seoScore.toFixed(1)}`
    ).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.seo);
    
    // ============================================================
    // 验证：Core Web Vitals
    // ============================================================
    
    const fcp = (audits as any).audits['first-contentful-paint']?.numericValue || 0;
    const lcp = (audits as any).audits['largest-contentful-paint']?.numericValue || 0;
    const cls = (audits as any).audits['cumulative-layout-shift']?.numericValue || 0;
    const tbt = (audits as any).audits['total-blocking-time']?.numericValue || 0;
    
    expect(
      fcp,
      `Scraper FCP 应该 < ${PERFORMANCE_THRESHOLDS.fcp}ms，实际: ${Math.round(fcp)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.fcp);
    
    expect(
      lcp,
      `Scraper LCP 应该 < ${PERFORMANCE_THRESHOLDS.lcp}ms，实际: ${Math.round(lcp)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    
    expect(
      cls,
      `Scraper CLS 应该 < ${PERFORMANCE_THRESHOLDS.cls}，实际: ${cls.toFixed(3)}`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
    
    expect(
      tbt,
      `Scraper TBT 应该 < ${PERFORMANCE_THRESHOLDS.tbt}ms，实际: ${Math.round(tbt)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.tbt);
    
    console.log(`\n✅ Scraper 页面性能测试通过\n`);
  });
  
  test('应该验证 LCP < 2.8s', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const lcp = (audits as any).audits['largest-contentful-paint']?.numericValue || 0;
    
    console.log(`   📊 Scraper LCP: ${formatMetric(lcp)}`);
    
    expect(
      lcp,
      `LCP 应该 < ${PERFORMANCE_THRESHOLDS.lcp}ms，实际: ${Math.round(lcp)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
  });
  
  test('应该验证 FID < 100ms (通过 TBT 估算)', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    // FID 无法在实验室环境中直接测量，使用 TBT 作为替代指标
    const tbt = (audits as any).audits['total-blocking-time']?.numericValue || 0;
    
    console.log(`   📊 Scraper TBT (FID 估算): ${formatMetric(tbt)}`);
    
    // TBT < 500ms 对于数据密集型页面是合理的
    expect(
      tbt,
      `TBT 应该 < ${PERFORMANCE_THRESHOLDS.tbt}ms (估算 FID < 100ms)，实际: ${Math.round(tbt)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.tbt);
  });
  
  test('应该验证 CLS < 0.1', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const cls = (audits as any).audits['cumulative-layout-shift']?.numericValue || 0;
    
    console.log(`   📊 Scraper CLS: ${cls.toFixed(3)}`);
    
    expect(
      cls,
      `CLS 应该 < ${PERFORMANCE_THRESHOLDS.cls}，实际: ${cls.toFixed(3)}`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
  });
  
  test('应该验证 JavaScript 执行时间合理', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const bootupTime = (audits as any).audits['bootup-time']?.numericValue || 0;
    
    console.log(`   📊 Scraper JavaScript 执行时间: ${formatMetric(bootupTime)}`);
    
    // JavaScript 执行时间应该 < 4s (数据密集型页面)
    expect(
      bootupTime,
      `JavaScript 执行时间应该 < 4000ms，实际: ${Math.round(bootupTime)}ms`
    ).toBeLessThan(4000);
  });
  
  test('应该验证主线程工作时间合理', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const mainthreadWork = (audits as any).audits['mainthread-work-breakdown']?.numericValue || 0;
    
    console.log(`   📊 Scraper 主线程工作时间: ${formatMetric(mainthreadWork)}`);
    
    // 主线程工作时间应该 < 5s (数据密集型页面)
    expect(
      mainthreadWork,
      `主线程工作时间应该 < 5000ms，实际: ${Math.round(mainthreadWork)}ms`
    ).toBeLessThan(5000);
  });
  
  test('应该验证 TTI < 4s', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const tti = (audits as any).audits['interactive']?.numericValue || 0;
    
    console.log(`   📊 Scraper TTI: ${formatMetric(tti)}`);
    
    expect(
      tti,
      `TTI 应该 < ${PERFORMANCE_THRESHOLDS.tti}ms，实际: ${Math.round(tti)}ms`
    ).toBeLessThan(PERFORMANCE_THRESHOLDS.tti);
  });
  
  test('应该验证资源加载效率', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const resourceSummary = (audits as any).audits['resource-summary']?.details?.items || [];
    
    console.log(`\n   📦 Scraper 资源统计:`);
    
    let totalRequests = 0;
    let totalSize = 0;
    
    resourceSummary.forEach((item: any) => {
      totalRequests += item.requestCount;
      totalSize += item.transferSize;
      console.log(`      ${item.resourceType.padEnd(15)}: ${item.requestCount} 个请求, ${(item.transferSize / 1024).toFixed(2)} KB`);
    });
    
    console.log(`      ${'总计'.padEnd(15)}: ${totalRequests} 个请求, ${(totalSize / 1024).toFixed(2)} KB`);
    
    // 验证总请求数合理 (< 100 个请求)
    expect(
      totalRequests,
      `总请求数应该 < 100，实际: ${totalRequests}`
    ).toBeLessThan(100);
    
    // 验证总传输大小合理 (< 5MB)
    expect(
      totalSize,
      `总传输大小应该 < 5MB，实际: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
    ).toBeLessThan(5 * 1024 * 1024);
  });
  
  test('应该验证无控制台错误', async ({ page, baseURL }) => {
    const fullUrl = `${baseURL}/#/app-center/scraper`;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const audits = await playAudit({
      page,
      config: LIGHTHOUSE_CONFIG,
      thresholds: PLAYWRIGHT_LIGHTHOUSE_THRESHOLDS,
      port: 9222
    });
    
    const consoleErrors = (audits as any).audits['errors-in-console']?.details?.items || [];
    
    console.log(`\n   🐛 Scraper 控制台错误数: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log(`   ⚠️  发现控制台错误:`);
      consoleErrors.forEach((error: any, index: number) => {
        console.log(`      ${index + 1}. ${error.description}`);
      });
    }
    
    // 验证无严重错误
    expect(
      consoleErrors.length,
      `控制台错误数应该 = 0，实际: ${consoleErrors.length}`
    ).toBe(0);
  });
  
  test.afterAll(() => {
    console.log('\n✅ Scraper 页面性能测试完成');
    console.log(`📁 报告保存在: ${REPORTS_DIR}\n`);
  });
  
});
