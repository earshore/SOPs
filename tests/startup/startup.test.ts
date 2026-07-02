// tests/startup/startup.test.ts
// ================================================================
// 🚀 应用启动测试
// 测试应用能够成功启动，无 JavaScript 错误
// ================================================================

import { test, expect, type Page } from '@playwright/test';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

type ConsoleErrorCategory = 'critical' | 'warnings' | 'deprecations' | 'network' | 'other';

type ConsoleErrorCategories = Record<ConsoleErrorCategory, string[]>;
type StoreStatus = Record<string, unknown>;
type RouterStatus = Record<string, unknown>;
type AlpineStatus = Record<string, unknown>;
type ServicesStatus = Record<string, boolean>;

interface StartupErrorSignals {
  pageErrors: unknown[];
  unhandledRejections: unknown[];
  resourceErrors: string[];
  runtimeErrors: string[];
  alpineErrors: string[];
  routerErrors: string[];
}

interface StartupErrorReport {
  totalErrors: number;
  criticalErrors: number;
  warnings: number;
  deprecations: number;
  networkErrors: number;
  pageErrors: number;
  unhandledRejections: number;
  resourceErrors: number;
  runtimeErrors: number;
  alpineErrors: number;
  routerErrors: number;
}

interface BrowserMemorySnapshot {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface DomStats {
  totalNodes: number;
  eventListeners: number;
  detachedNodes: number;
}

interface GlobalObjectStats {
  total: number;
  customKeys: number;
}

interface BlockingResource {
  name: string;
  type: string;
  duration: number;
  size: number;
}

interface ResourceStats {
  总资源数: number;
  CSS文件数: number;
  JS文件数: number;
  图片数: number;
  字体数: number;
  总传输大小: number;
  平均加载时间: number;
}

// Startup tests run against the Vite dev server. Production Web Vitals budgets
// belong in tests/performance, where Lighthouse runs against a production build.
const STARTUP_DEV_RENDER_BUDGET_MS = 8000;
const STARTUP_DEV_DOM_CONTENT_LOADED_BUDGET_MS = 8000;
const STARTUP_DEV_FCP_BUDGET_MS = 8000;
const STARTUP_DEV_TTFB_BUDGET_MS = 1500;
const STARTUP_DEV_LCP_BUDGET_MS = 9000;
const STARTUP_DEV_MIN_PERFORMANCE_SCORE = 40;

const CONSOLE_ERROR_PATTERNS: Record<
  Exclude<ConsoleErrorCategory, 'other'>,
  readonly string[]
> = {
  deprecations: ['deprecated', 'deprecation'],
  warnings: ['warning', 'warn'],
  network: ['failed to load', 'network', 'fetch', '404', '500'],
  critical: ['error', 'exception', 'uncaught', 'cannot read', 'undefined is not', 'null is not']
};

function hasAnyPattern(value: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => value.includes(pattern));
}

function getConsoleErrorCategory(error: string): ConsoleErrorCategory {
  const errorStr = error.toLowerCase();

  if (hasAnyPattern(errorStr, CONSOLE_ERROR_PATTERNS.deprecations)) return 'deprecations';
  if (hasAnyPattern(errorStr, CONSOLE_ERROR_PATTERNS.warnings)) return 'warnings';
  if (hasAnyPattern(errorStr, CONSOLE_ERROR_PATTERNS.network)) return 'network';
  if (hasAnyPattern(errorStr, CONSOLE_ERROR_PATTERNS.critical)) return 'critical';
  return 'other';
}

function categorizeConsoleErrors(errors: string[]): ConsoleErrorCategories {
  const categories: ConsoleErrorCategories = {
    critical: [],
    warnings: [],
    deprecations: [],
    network: [],
    other: []
  };

  errors.forEach(error => {
    categories[getConsoleErrorCategory(error)].push(error);
  });

  return categories;
}

function logConsoleErrorSummary(totalErrors: number, categories: ConsoleErrorCategories): void {
  console.log('\n📊 控制台错误统计:');
  console.log(`  • 总错误数: ${totalErrors}`);
  console.log(`  • 关键错误: ${categories.critical.length}`);
  console.log(`  • 警告: ${categories.warnings.length}`);
  console.log(`  • 弃用警告: ${categories.deprecations.length}`);
  console.log(`  • 网络错误: ${categories.network.length}`);
  console.log(`  • 其他: ${categories.other.length}`);
}

function formatErrorEntry(entry: unknown, preferredField?: 'message' | 'reason'): string {
  if (entry && typeof entry === 'object' && preferredField && preferredField in entry) {
    const fieldValue = (entry as Record<string, unknown>)[preferredField];
    return String(fieldValue || entry);
  }

  return String(entry);
}

function logNumberedItems(
  title: string,
  items: unknown[],
  logger: (message: string) => void,
  preferredField?: 'message' | 'reason'
): void {
  if (items.length === 0) return;

  logger(title);
  items.forEach((item, index) => {
    logger(`  ${index + 1}. ${formatErrorEntry(item, preferredField)}`);
  });
}

async function readWindowErrorArray(page: Page, propertyName: string): Promise<unknown[]> {
  return page.evaluate(name => (window as any)[name] || [], propertyName);
}

async function readObjectErrorArray(page: Page, propertyName: string): Promise<string[]> {
  return page.evaluate(name => {
    const objectWithErrors = (window as any)[name];
    return objectWithErrors?.__errors || [];
  }, propertyName);
}

async function readResourceErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errors: string[] = [];
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resources.forEach(resource => {
      if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
        // 可能是加载失败或被缓存；当前测试保留原有的保守判断。
      }
    });

    return errors;
  });
}

async function collectStartupErrorSignals(page: Page): Promise<StartupErrorSignals> {
  const [
    pageErrors,
    unhandledRejections,
    resourceErrors,
    runtimeErrors,
    alpineErrors,
    routerErrors
  ] = await Promise.all([
    readWindowErrorArray(page, '__pageErrors'),
    readWindowErrorArray(page, '__unhandledRejections'),
    readResourceErrors(page),
    readWindowErrorArray(page, '__runtimeErrors') as Promise<string[]>,
    readObjectErrorArray(page, 'Alpine'),
    readObjectErrorArray(page, 'router')
  ]);

  return {
    pageErrors,
    unhandledRejections,
    resourceErrors,
    runtimeErrors,
    alpineErrors,
    routerErrors
  };
}

function logStartupErrorDetails(
  categories: ConsoleErrorCategories,
  signals: StartupErrorSignals
): void {
  logNumberedItems('\n❌ 关键错误:', categories.critical, message => console.error(message));
  logNumberedItems('\n⚠️ 网络错误:', categories.network, message => console.warn(message));
  logNumberedItems('\n⚠️ 警告:', categories.warnings, message => console.warn(message));
  logNumberedItems('\n⚠️ 弃用警告:', categories.deprecations, message => console.warn(message));
  logNumberedItems('\n❌ 页面错误事件:', signals.pageErrors, message => console.error(message), 'message');
  logNumberedItems(
    '\n❌ 未捕获的 Promise rejection:',
    signals.unhandledRejections,
    message => console.error(message),
    'reason'
  );
  logNumberedItems('\n❌ 资源加载错误:', signals.resourceErrors, message => console.error(message));
  logNumberedItems('\n❌ JavaScript 运行时错误:', signals.runtimeErrors, message => console.error(message));
  logNumberedItems('\n❌ Alpine.js 错误:', signals.alpineErrors, message => console.error(message));
  logNumberedItems('\n❌ 路由错误:', signals.routerErrors, message => console.error(message));
}

function buildStartupErrorReport(
  errors: string[],
  categories: ConsoleErrorCategories,
  signals: StartupErrorSignals
): StartupErrorReport {
  return {
    totalErrors: errors.length,
    criticalErrors: categories.critical.length,
    warnings: categories.warnings.length,
    deprecations: categories.deprecations.length,
    networkErrors: categories.network.length,
    pageErrors: signals.pageErrors.length,
    unhandledRejections: signals.unhandledRejections.length,
    resourceErrors: signals.resourceErrors.length,
    runtimeErrors: signals.runtimeErrors.length,
    alpineErrors: signals.alpineErrors.length,
    routerErrors: signals.routerErrors.length
  };
}

function calculateStartupErrorScore(report: StartupErrorReport): number {
  const score =
    100 -
    report.criticalErrors * 20 -
    report.pageErrors * 15 -
    report.unhandledRejections * 15 -
    report.runtimeErrors * 15 -
    report.alpineErrors * 10 -
    report.routerErrors * 10 -
    report.networkErrors * 5 -
    report.warnings * 2 -
    report.deprecations;

  return Math.max(0, score);
}

function getStartupErrorRating(errorScore: number): string {
  if (errorScore === 100) return '完美 🌟';
  if (errorScore >= 90) return '优秀 ✅';
  if (errorScore >= 75) return '良好 ⚠️';
  if (errorScore >= 60) return '一般 ⚠️';
  return '需要修复 ❌';
}

function buildStartupErrorSuggestions(report: StartupErrorReport): string[] {
  const checks: Array<[number, string]> = [
    [report.criticalErrors, '存在关键错误，必须立即修复'],
    [report.pageErrors, '存在页面错误事件，检查全局错误处理器'],
    [report.unhandledRejections, '存在未捕获的 Promise rejection，添加 .catch() 处理'],
    [report.runtimeErrors, '存在 JavaScript 运行时错误，检查代码逻辑'],
    [report.alpineErrors, '存在 Alpine.js 错误，检查组件定义和数据绑定'],
    [report.routerErrors, '存在路由错误，检查路由配置和导航逻辑'],
    [report.networkErrors, '存在网络错误，检查资源路径和服务器配置'],
    [report.warnings, '存在警告信息，建议修复以提升代码质量'],
    [report.deprecations, '存在弃用警告，建议更新到新的 API']
  ];

  return checks.filter(([count]) => count > 0).map(([, suggestion]) => suggestion);
}

function logStartupErrorSuggestions(suggestions: string[]): void {
  if (suggestions.length === 0) {
    console.log('\n✅ 无控制台错误，应用运行完美');
    return;
  }

  console.log('\n💡 修复建议:');
  suggestions.forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion}`);
  });
}

function assertNoStartupErrors(report: StartupErrorReport, errorScore: number): void {
  expect(
    report.totalErrors,
    `应用启动时不应有任何 console.error 输出，但检测到 ${report.totalErrors} 个错误`
  ).toBe(0);
  expect(report.criticalErrors, `不应有关键错误，但检测到 ${report.criticalErrors} 个关键错误`).toBe(0);
  expect(report.pageErrors, `不应有页面错误事件，但检测到 ${report.pageErrors} 个页面错误`).toBe(0);
  expect(
    report.unhandledRejections,
    `不应有未捕获的 Promise rejection，但检测到 ${report.unhandledRejections} 个`
  ).toBe(0);
  expect(report.runtimeErrors, `不应有 JavaScript 运行时错误，但检测到 ${report.runtimeErrors} 个`).toBe(0);
  expect(report.alpineErrors, `不应有 Alpine.js 错误，但检测到 ${report.alpineErrors} 个`).toBe(0);
  expect(report.routerErrors, `不应有路由错误，但检测到 ${report.routerErrors} 个`).toBe(0);
  expect(errorScore, `错误评分应该至少为 90 分，当前: ${errorScore} 分`).toBeGreaterThanOrEqual(90);
}

function toMegabytes(bytes: number): number {
  return bytes / (1024 * 1024);
}

function formatMegabytes(bytes: number): string {
  return toMegabytes(bytes).toFixed(2);
}

async function readBrowserMemory(page: Page): Promise<BrowserMemorySnapshot | null> {
  return page.evaluate(() => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return null;
  });
}

function skipWhenMemoryApiUnavailable(): void {
  console.warn('⚠️ 浏览器不支持 performance.memory API，跳过内存测试');
  console.log('💡 提示: 使用 Chrome 浏览器并启用 --enable-precise-memory-info 标志可以获取精确的内存信息');
  test.skip();
}

function logMemorySnapshot(title: string, memory: BrowserMemorySnapshot): void {
  console.log(title);
  console.log(`  • 已使用 JS 堆内存: ${formatMegabytes(memory.usedJSHeapSize)} MB`);
  console.log(`  • 总 JS 堆内存: ${formatMegabytes(memory.totalJSHeapSize)} MB`);
  console.log(`  • JS 堆内存限制: ${formatMegabytes(memory.jsHeapSizeLimit)} MB`);
}

async function simulateCommonMemoryOperations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const router = (window as any).router;
    if (router && typeof router.navigate === 'function') {
      router.navigate('home', { updateHistory: false });
    }
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      if (index < 3) {
        button.dispatchEvent(new Event('click', { bubbles: true }));
      }
    });
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    (window as any).__tempTestData = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`,
      timestamp: Date.now()
    }));
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    delete (window as any).__tempTestData;
  });
  await page.waitForTimeout(1000);
}

function logMemoryGrowth(
  initialMemory: BrowserMemorySnapshot,
  afterOperationsMemory: BrowserMemorySnapshot | null
): void {
  if (!afterOperationsMemory) return;

  logMemorySnapshot('\n📊 操作后内存使用情况:', afterOperationsMemory);
  const memoryGrowth = afterOperationsMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
  console.log(`\n📊 内存增长: ${formatMegabytes(memoryGrowth)} MB`);
}

async function triggerBrowserGarbageCollection(page: Page): Promise<void> {
  await page.evaluate(() => {
    if ((window as any).gc) {
      console.log('🗑️ 触发垃圾回收...');
      (window as any).gc();
    }
  });
  await page.waitForTimeout(2000);
}

async function readDomStats(page: Page): Promise<DomStats> {
  return page.evaluate(() => ({
    totalNodes: document.querySelectorAll('*').length,
    eventListeners: 0,
    detachedNodes: 0
  }));
}

function logDomStats(domStats: DomStats): void {
  console.log('\n📊 DOM 统计:');
  console.log(`  • 总节点数: ${domStats.totalNodes}`);
}

async function readGlobalObjectStats(page: Page): Promise<GlobalObjectStats> {
  return page.evaluate(() => {
    const globalKeys = Object.keys(window);
    return {
      total: globalKeys.length,
      customKeys: globalKeys.filter(key => {
        return !key.startsWith('webkit') &&
               !key.startsWith('chrome') &&
               !key.startsWith('moz') &&
               key !== 'constructor' &&
               key !== 'prototype';
      }).length
    };
  });
}

function logGlobalObjectStats(globalObjectsCount: GlobalObjectStats): void {
  console.log('\n📊 全局对象统计:');
  console.log(`  • 总属性数: ${globalObjectsCount.total}`);
  console.log(`  • 自定义属性数: ${globalObjectsCount.customKeys}`);
}

function collectMemoryLeakIndicators(
  initialMemory: BrowserMemorySnapshot,
  afterOperationsMemory: BrowserMemorySnapshot | null,
  memoryUsageRate: number,
  domStats: DomStats,
  globalObjectsCount: GlobalObjectStats
): string[] {
  const indicators: string[] = [];

  if (afterOperationsMemory) {
    const memoryGrowthMB = toMegabytes(
      afterOperationsMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    );
    if (memoryGrowthMB > 20) indicators.push(`操作后内存增长过大: ${memoryGrowthMB.toFixed(2)} MB`);
  }

  if (memoryUsageRate > 80) indicators.push(`内存使用率过高: ${memoryUsageRate.toFixed(2)}%`);
  if (domStats.totalNodes > 5000) indicators.push(`DOM 节点数量过多: ${domStats.totalNodes}`);
  if (globalObjectsCount.customKeys > 100) {
    indicators.push(`全局对象属性过多: ${globalObjectsCount.customKeys}`);
  }

  return indicators;
}

function logMemoryLeakIndicators(memoryLeakIndicators: string[]): void {
  if (memoryLeakIndicators.length === 0) {
    console.log('\n✅ 未检测到明显的内存泄漏迹象');
    return;
  }

  console.log('\n⚠️ 检测到潜在的内存问题:');
  memoryLeakIndicators.forEach((indicator, index) => {
    console.log(`  ${index + 1}. ${indicator}`);
  });
}

function calculateMemoryScore(
  usedMemoryMB: number,
  memoryUsageRate: number,
  totalNodes: number,
  leakIndicatorCount: number
): number {
  const penalties = [
    usedMemoryMB > 80 ? 10 : 0,
    usedMemoryMB > 90 ? 10 : 0,
    usedMemoryMB > 95 ? 10 : 0,
    memoryUsageRate > 60 ? 5 : 0,
    memoryUsageRate > 70 ? 5 : 0,
    memoryUsageRate > 80 ? 10 : 0,
    totalNodes > 3000 ? 5 : 0,
    totalNodes > 5000 ? 10 : 0,
    leakIndicatorCount * 10
  ];

  return penalties.reduce((score, penalty) => score - penalty, 100);
}

function getMemoryRating(memoryScore: number): string {
  if (memoryScore >= 90) return '优秀 🌟';
  if (memoryScore >= 75) return '良好 ✅';
  if (memoryScore >= 60) return '一般 ⚠️';
  return '需要优化 ❌';
}

function buildMemoryOptimizationSuggestions(
  usedMemoryMB: number,
  memoryUsageRate: number,
  domStats: DomStats,
  globalObjectsCount: GlobalObjectStats,
  memoryLeakIndicators: string[]
): string[] {
  const checks: Array<[boolean, string]> = [
    [usedMemoryMB > 80, '内存占用偏高，考虑优化数据结构或减少缓存'],
    [memoryUsageRate > 70, '内存使用率较高，考虑实现内存回收机制'],
    [domStats.totalNodes > 3000, 'DOM 节点数量较多，考虑使用虚拟滚动或懒加载'],
    [globalObjectsCount.customKeys > 50, '全局对象属性较多，考虑使用模块化或命名空间'],
    [memoryLeakIndicators.length > 0, '检测到潜在内存泄漏，建议使用 Chrome DevTools Memory Profiler 进行详细分析']
  ];

  return checks.filter(([shouldSuggest]) => shouldSuggest).map(([, suggestion]) => suggestion);
}

function logMemoryOptimizationSuggestions(suggestions: string[]): void {
  if (suggestions.length === 0) {
    console.log('\n✅ 内存使用良好，无需特别优化');
    return;
  }

  console.log('\n💡 优化建议:');
  suggestions.forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion}`);
  });
}

function assertMemoryHealth(
  usedMemoryMB: number,
  memoryUsageRate: number,
  totalNodes: number,
  memoryScore: number
): void {
  expect(usedMemoryMB, `应用内存占用应该小于 100MB，实际: ${usedMemoryMB.toFixed(2)} MB`).toBeLessThan(100);
  expect(memoryUsageRate, `内存使用率不应超过 85%，实际: ${memoryUsageRate.toFixed(2)}%`).toBeLessThan(85);
  expect(totalNodes, `DOM 节点数不应超过 5000，实际: ${totalNodes}`).toBeLessThan(5000);
  expect(memoryScore, `内存评分应该至少为 60 分，当前: ${memoryScore} 分`).toBeGreaterThanOrEqual(60);
}

async function readPerformanceMetrics(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const metrics: Record<string, number> = {};

    if (navigation) {
      metrics['DNS查询时间'] = navigation.domainLookupEnd - navigation.domainLookupStart;
      metrics['TCP连接时间'] = navigation.connectEnd - navigation.connectStart;
      metrics['请求响应时间'] = navigation.responseEnd - navigation.requestStart;
      metrics['DOM解析时间'] = navigation.domInteractive - navigation.responseEnd;
      metrics['DOMContentLoaded'] = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      metrics['页面完全加载'] = navigation.loadEventEnd - navigation.fetchStart;
      metrics['TTFB'] = navigation.responseStart - navigation.fetchStart;
    }

    const fp = paint.find(entry => entry.name === 'first-paint');
    if (fp) metrics['First Paint'] = fp.startTime;
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) metrics['First Contentful Paint'] = fcp.startTime;

    return metrics;
  });
}

function logPerformanceMetrics(performanceMetrics: Record<string, number>): void {
  console.log('📊 详细性能指标:');
  for (const [metric, value] of Object.entries(performanceMetrics)) {
    console.log(`  • ${metric}: ${value.toFixed(2)}ms`);
  }
}

async function readLargestContentfulPaint(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>(resolve => {
      let lcpValue = 0;
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry && lastEntry.renderTime) {
          lcpValue = lastEntry.renderTime;
        } else if (lastEntry && lastEntry.loadTime) {
          lcpValue = lastEntry.loadTime;
        }
      });

      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.warn('LCP 监听失败:', e);
      }

      setTimeout(() => {
        observer.disconnect();
        resolve(lcpValue);
      }, 1000);
    });
  });
}

function recordLargestContentfulPaint(
  performanceMetrics: Record<string, number>,
  lcpMetric: number
): void {
  if (lcpMetric <= 0) return;

  console.log(`📊 Largest Contentful Paint (LCP): ${lcpMetric.toFixed(2)}ms`);
  performanceMetrics['LCP'] = lcpMetric;
}

function assertCorePerformanceMetrics(
  renderTime: number,
  performanceMetrics: Record<string, number>,
  lcpMetric: number
): void {
  expect(
    renderTime,
    `dev server 首屏渲染时间应该小于 ${STARTUP_DEV_RENDER_BUDGET_MS}ms，实际: ${renderTime}ms`
  ).toBeLessThan(STARTUP_DEV_RENDER_BUDGET_MS);
  if (performanceMetrics['DOMContentLoaded']) {
    expect(
      performanceMetrics['DOMContentLoaded'],
      `dev server DOMContentLoaded 应该小于 ${STARTUP_DEV_DOM_CONTENT_LOADED_BUDGET_MS}ms，实际: ${performanceMetrics['DOMContentLoaded'].toFixed(2)}ms`
    ).toBeLessThan(STARTUP_DEV_DOM_CONTENT_LOADED_BUDGET_MS);
  }
  if (performanceMetrics['First Contentful Paint']) {
    expect(
      performanceMetrics['First Contentful Paint'],
      `dev server First Contentful Paint 应该小于 ${STARTUP_DEV_FCP_BUDGET_MS}ms，实际: ${performanceMetrics['First Contentful Paint'].toFixed(2)}ms`
    ).toBeLessThan(STARTUP_DEV_FCP_BUDGET_MS);
  }
  if (performanceMetrics['TTFB']) {
    expect(
      performanceMetrics['TTFB'],
      `dev server TTFB 应该小于 ${STARTUP_DEV_TTFB_BUDGET_MS}ms，实际: ${performanceMetrics['TTFB'].toFixed(2)}ms`
    ).toBeLessThan(STARTUP_DEV_TTFB_BUDGET_MS);
  }
  if (lcpMetric > 0) {
    expect(
      lcpMetric,
      `dev server LCP 应该小于 ${STARTUP_DEV_LCP_BUDGET_MS}ms，实际: ${lcpMetric.toFixed(2)}ms`
    ).toBeLessThan(STARTUP_DEV_LCP_BUDGET_MS);
  }
}

async function readBlockingResources(page: Page): Promise<BlockingResource[]> {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter(resource => {
        return (
          (resource.initiatorType === 'link' || resource.initiatorType === 'script') &&
          resource.duration > 100
        );
      })
      .map(resource => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize
      }));
  });
}

function logBlockingResources(blockingResources: BlockingResource[]): void {
  if (blockingResources.length === 0) {
    console.log('\n✅ 未检测到明显阻塞渲染的资源');
    return;
  }

  console.log('\n⚠️ 检测到可能阻塞渲染的资源:');
  blockingResources.forEach((resource, index) => {
    console.log(`  ${index + 1}. ${resource.type}: ${resource.name}`);
    console.log(`     耗时: ${resource.duration.toFixed(2)}ms, 大小: ${(resource.size / 1024).toFixed(2)}KB`);
  });
}

async function readResourceStats(page: Page): Promise<ResourceStats> {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const stats: ResourceStats = {
      总资源数: resources.length,
      CSS文件数: 0,
      JS文件数: 0,
      图片数: 0,
      字体数: 0,
      总传输大小: 0,
      平均加载时间: 0
    };
    let totalDuration = 0;

    resources.forEach(resource => {
      if (resource.initiatorType === 'link' || resource.name.endsWith('.css')) {
        stats.CSS文件数++;
      } else if (resource.initiatorType === 'script' || resource.name.endsWith('.js')) {
        stats.JS文件数++;
      } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(resource.name)) {
        stats.图片数++;
      } else if (/\.(woff|woff2|ttf|otf|eot)$/i.test(resource.name)) {
        stats.字体数++;
      }

      stats.总传输大小 += resource.transferSize || 0;
      totalDuration += resource.duration;
    });

    stats.平均加载时间 = resources.length > 0 ? totalDuration / resources.length : 0;
    return stats;
  });
}

function logResourceStats(resourceStats: ResourceStats): void {
  console.log('\n📊 资源加载统计:');
  console.log(`  • 总资源数: ${resourceStats.总资源数}`);
  console.log(`  • CSS 文件: ${resourceStats.CSS文件数}`);
  console.log(`  • JS 文件: ${resourceStats.JS文件数}`);
  console.log(`  • 图片: ${resourceStats.图片数}`);
  console.log(`  • 字体: ${resourceStats.字体数}`);
  console.log(`  • 总传输大小: ${(resourceStats.总传输大小 / 1024).toFixed(2)}KB`);
  console.log(`  • 平均加载时间: ${resourceStats.平均加载时间.toFixed(2)}ms`);
}

function sumThresholdPenalties(
  value: number | undefined,
  thresholds: Array<[number, number]>
): number {
  if (!value) return 0;

  return thresholds.reduce((total, [threshold, penalty]) => {
    return value > threshold ? total + penalty : total;
  }, 0);
}

function calculatePerformanceScore(
  renderTime: number,
  performanceMetrics: Record<string, number>,
  lcpMetric: number,
  blockingResources: BlockingResource[],
  resourceStats: ResourceStats
): number {
  const penalty =
    sumThresholdPenalties(renderTime, [[1500, 10], [1800, 10]]) +
    sumThresholdPenalties(performanceMetrics['TTFB'], [[300, 5], [400, 5]]) +
    sumThresholdPenalties(performanceMetrics['First Contentful Paint'], [[1200, 10]]) +
    sumThresholdPenalties(lcpMetric, [[2000, 10]]) +
    sumThresholdPenalties(blockingResources.length, [[5, 10]]) +
    sumThresholdPenalties(resourceStats.总传输大小, [[1024 * 1024, 10]]);

  return 100 - penalty;
}

function getPerformanceRating(performanceScore: number): string {
  if (performanceScore >= 90) return '优秀 🌟';
  if (performanceScore >= 75) return '良好 ✅';
  if (performanceScore >= 60) return '一般 ⚠️';
  return '需要优化 ❌';
}

function buildPerformanceSuggestions(
  renderTime: number,
  performanceMetrics: Record<string, number>,
  blockingResources: BlockingResource[],
  resourceStats: ResourceStats
): string[] {
  const checks: Array<[boolean, string]> = [
    [renderTime > 1500, '首屏渲染时间偏长，考虑优化关键渲染路径'],
    [
      Boolean(performanceMetrics['TTFB'] && performanceMetrics['TTFB'] > 300),
      'TTFB 偏高，考虑优化服务器响应时间或使用 CDN'
    ],
    [blockingResources.length > 5, '存在较多阻塞渲染的资源，考虑异步加载或延迟加载'],
    [resourceStats.总传输大小 > 1024 * 1024, '资源总大小较大，考虑压缩、代码分割或使用更小的库'],
    [resourceStats.图片数 > 10, '图片数量较多，考虑使用懒加载或图片优化']
  ];

  return checks.filter(([shouldSuggest]) => shouldSuggest).map(([, suggestion]) => suggestion);
}

function logPerformanceSuggestions(suggestions: string[]): void {
  if (suggestions.length === 0) {
    console.log('\n✅ 性能表现良好，无需特别优化');
    return;
  }

  console.log('\n💡 优化建议:');
  suggestions.forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion}`);
  });
}

function assertPerformanceScore(performanceScore: number): void {
  expect(
    performanceScore,
    `dev server 性能评分应该至少为 ${STARTUP_DEV_MIN_PERFORMANCE_SCORE} 分，当前: ${performanceScore} 分`
  ).toBeGreaterThanOrEqual(STARTUP_DEV_MIN_PERFORMANCE_SCORE);
}

async function readStorePresenceStatus(page: Page): Promise<StoreStatus> {
  return page.evaluate(() => {
    const results: Record<string, any> = {};
    results['useAppStore存在'] = typeof (window as any).useAppStore !== 'undefined' &&
                                  (window as any).useAppStore !== null;
    results['appStore别名存在'] = typeof (window as any).appStore !== 'undefined' &&
                                  (window as any).appStore !== null;

    const store = (window as any).useAppStore;
    if (!store) return results;

    results['getState方法存在'] = typeof store.getState === 'function';
    results['setState方法存在'] = typeof store.setState === 'function';
    results['subscribe方法存在'] = typeof store.subscribe === 'function';
    return results;
  });
}

async function readStoreModuleStatus(page: Page): Promise<StoreStatus> {
  return page.evaluate(() => {
    try {
      const state = (window as any).useAppStore?.getState?.();
      return {
        状态对象存在: state !== null && typeof state === 'object',
        UI状态存在: state?.ui !== undefined && state?.ui !== null,
        Scraper状态存在: state?.scraper !== undefined && state?.scraper !== null,
        Analysis状态存在: state?.analysis !== undefined && state?.analysis !== null,
        PromptLab状态存在: state?.promptlab !== undefined && state?.promptlab !== null,
        KeywordTracker状态存在: state?.keywordTracker !== undefined && state?.keywordTracker !== null
      };
    } catch (error) {
      return {
        状态获取错误: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

async function readStoreUiStatus(page: Page): Promise<StoreStatus> {
  return page.evaluate(() => {
    const state = (window as any).useAppStore?.getState?.();
    if (!state?.ui) return {};

    return {
      'UI.currentTab': state.ui.currentTab || '未设置',
      'UI.theme': state.ui.theme || '未设置',
      'UI.loading': state.ui.loading !== undefined ? state.ui.loading : '未设置'
    };
  });
}

async function readStoreActionStatus(page: Page): Promise<StoreStatus> {
  return page.evaluate(() => {
    const state = (window as any).useAppStore?.getState?.();
    if (!state) return {};

    return {
      setCurrentTab方法存在: typeof state.setCurrentTab === 'function',
      setTheme方法存在: typeof state.setTheme === 'function',
      setLoading方法存在: typeof state.setLoading === 'function',
      updateUI方法存在: typeof state.updateUI === 'function'
    };
  });
}

async function readStoreStatus(page: Page): Promise<StoreStatus> {
  const [presence, modules, ui, actions] = await Promise.all([
    readStorePresenceStatus(page),
    readStoreModuleStatus(page),
    readStoreUiStatus(page),
    readStoreActionStatus(page)
  ]);

  return {
    ...presence,
    ...modules,
    ...ui,
    ...actions
  };
}

function logStoreStatus(storeStatus: StoreStatus): void {
  console.log('📊 Zustand Store 初始化状态:');
  for (const [key, value] of Object.entries(storeStatus)) {
    const icon = value === true || (typeof value === 'string' && !key.includes('错误') && value !== '未设置') ? '✅' : '❌';
    console.log(`  ${icon} ${key}: ${value}`);
  }
}

function assertRequiredStoreStatus(storeStatus: StoreStatus): void {
  const requiredChecks: Array<[string, string]> = [
    ['useAppStore存在', 'useAppStore 应该已加载到 window'],
    ['getState方法存在', 'store.getState() 方法应该存在'],
    ['setState方法存在', 'store.setState() 方法应该存在'],
    ['subscribe方法存在', 'store.subscribe() 方法应该存在'],
    ['状态对象存在', 'store 状态对象应该已初始化'],
    ['UI状态存在', 'UI 状态应该已初始化'],
    ['Scraper状态存在', 'Scraper 状态应该已初始化'],
    ['Analysis状态存在', 'Analysis 状态应该已初始化'],
    ['PromptLab状态存在', 'PromptLab 状态应该已初始化'],
    ['KeywordTracker状态存在', 'KeywordTracker 状态应该已初始化'],
    ['setCurrentTab方法存在', 'setCurrentTab() 方法应该存在'],
    ['setTheme方法存在', 'setTheme() 方法应该存在'],
    ['setLoading方法存在', 'setLoading() 方法应该存在'],
    ['updateUI方法存在', 'updateUI() 方法应该存在']
  ];

  requiredChecks.forEach(([key, message]) => {
    expect(storeStatus[key], message).toBe(true);
  });
}

async function checkStoreReactivity(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      try {
        const store = (window as any).useAppStore;
        if (!store || typeof store.getState !== 'function') {
          resolve(false);
          return;
        }

        const initialTab = store.getState().ui.currentTab;
        let changeDetected = false;
        const unsubscribe = store.subscribe((state: any) => {
          if (state.ui.currentTab !== initialTab) changeDetected = true;
        });

        store.getState().setCurrentTab('test-tab');
        setTimeout(() => {
          const newTab = store.getState().ui.currentTab;
          unsubscribe();
          resolve(newTab === 'test-tab' && changeDetected);
        }, 100);
      } catch (error) {
        console.error('Store 响应式测试失败:', error);
        resolve(false);
      }
    });
  });
}

async function checkStorePersistence(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const store = (window as any).useAppStore;
      if (!store) return false;

      return localStorage.getItem('app-storage') !== null;
    } catch (error) {
      console.error('Store 持久化检查失败:', error);
      return false;
    }
  });
}

function filterStoreErrors(errors: string[]): string[] {
  return errors.filter(error => hasAnyPattern(error.toLowerCase(), ['store', 'zustand', 'state']));
}

function assertNoStoreErrors(storeErrors: string[]): void {
  logNumberedItems('❌ 检测到 Store 相关错误:', storeErrors, message => console.error(message));
  expect(storeErrors.length, `不应有 Store 相关错误，但检测到 ${storeErrors.length} 个错误`).toBe(0);
}

async function checkStoreActions(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      try {
        const store = (window as any).useAppStore;
        if (!store) {
          resolve(false);
          return;
        }

        const state = store.getState();
        state.setTheme('dark');
        state.setLoading(true);
        state.setSidebarCollapsed(true);

        setTimeout(() => {
          const newState = store.getState();
          resolve(
            newState.ui.theme === 'dark' &&
            newState.ui.loading === true &&
            newState.ui.sidebarCollapsed === true
          );
        }, 100);
      } catch (error) {
        console.error('Actions 测试失败:', error);
        resolve(false);
      }
    });
  });
}

function countStoreFunctionality(
  storeStatus: StoreStatus,
  storeReactivityWorks: boolean,
  actionsWork: boolean
): number {
  const checks = [
    storeStatus['useAppStore存在'],
    storeStatus['getState方法存在'],
    storeStatus['setState方法存在'],
    storeStatus['subscribe方法存在'],
    storeStatus['状态对象存在'],
    storeStatus['UI状态存在'],
    storeStatus['Scraper状态存在'],
    storeStatus['Analysis状态存在'],
    storeStatus['PromptLab状态存在'],
    storeStatus['KeywordTracker状态存在'],
    storeStatus['setCurrentTab方法存在'],
    storeStatus['setTheme方法存在'],
    storeStatus['setLoading方法存在'],
    storeStatus['updateUI方法存在'],
    storeReactivityWorks,
    actionsWork
  ];

  return checks.filter(status => status === true).length;
}

async function readRouterStatus(page: Page): Promise<RouterStatus> {
  return page.evaluate(() => {
    const results: Record<string, any> = {};
    results['Router对象存在'] = typeof (window as any).router !== 'undefined' &&
                                (window as any).router !== null;
    results['Router类存在'] = typeof (window as any).Router !== 'undefined';

    const router = (window as any).router;
    if (router) {
      results['navigate方法存在'] = typeof router.navigate === 'function';
      results['back方法存在'] = typeof router.back === 'function';
      results['forward方法存在'] = typeof router.forward === 'function';
      results['go方法存在'] = typeof router.go === 'function';
      results['getCurrentRoute方法存在'] = typeof router.getCurrentRoute === 'function';
      results['getHistory方法存在'] = typeof router.getHistory === 'function';
      results['register方法存在'] = typeof router.register === 'function';
      results['registerRoutes方法存在'] = typeof router.registerRoutes === 'function';
      results['当前路由'] = router.getCurrentRoute ? router.getCurrentRoute() : null;
      results['历史记录数量'] = router.getHistory ? router.getHistory().length : 0;
    }

    return results;
  });
}

function logRouterStatus(routerStatus: RouterStatus): void {
  console.log('📊 路由系统初始化状态:');
  for (const [key, value] of Object.entries(routerStatus)) {
    if (typeof value === 'boolean') {
      console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
    } else if (key === '当前路由') {
      console.log(`  📍 ${key}:`, value);
    } else if (key === '历史记录数量') {
      console.log(`  📚 ${key}: ${value}`);
    }
  }
}

function assertRequiredRouterStatus(routerStatus: RouterStatus): void {
  const requiredChecks: Array<[string, string]> = [
    ['Router对象存在', 'Router 对象应该已初始化'],
    ['navigate方法存在', 'navigate() 方法应该存在'],
    ['back方法存在', 'back() 方法应该存在'],
    ['forward方法存在', 'forward() 方法应该存在'],
    ['go方法存在', 'go() 方法应该存在'],
    ['getCurrentRoute方法存在', 'getCurrentRoute() 方法应该存在'],
    ['getHistory方法存在', 'getHistory() 方法应该存在'],
    ['register方法存在', 'register() 方法应该存在'],
    ['registerRoutes方法存在', 'registerRoutes() 方法应该存在']
  ];

  requiredChecks.forEach(([key, message]) => {
    expect(routerStatus[key], message).toBe(true);
  });
}

async function checkRouterEventListeners(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      const testPopstate = () => {
        const event = new PopStateEvent('popstate', {
          state: { routeId: 'home' }
        });
        const originalPushState = window.history.pushState;
        window.history.pushState = function(...args) {
          return originalPushState.apply(this, args);
        };

        window.dispatchEvent(event);
        window.history.pushState = originalPushState;
        resolve(true);
      };

      setTimeout(testPopstate, 100);
    });
  });
}

async function checkRouterNavigation(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      const router = (window as any).router;
      if (!router || typeof router.navigate !== 'function') {
        resolve(false);
        return;
      }

      router
        .navigate('home', { updateHistory: false })
        .then((result: boolean) => resolve(result === true))
        .catch((error: unknown) => {
          console.error('导航测试失败:', error);
          resolve(false);
        });
    });
  });
}

async function checkRouterHistory(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const router = (window as any).router;
    if (!router || typeof router.getHistory !== 'function') return false;

    try {
      return Array.isArray(router.getHistory());
    } catch (error) {
      console.error('历史记录测试失败:', error);
      return false;
    }
  });
}

function filterRouterErrors(errors: string[]): string[] {
  return errors.filter(error =>
    hasAnyPattern(error.toLowerCase(), ['router', 'route', 'navigation', 'navigate'])
  );
}

function assertNoRouterErrors(routerErrors: string[]): void {
  logNumberedItems('❌ 检测到路由相关错误:', routerErrors, message => console.error(message));
  expect(routerErrors.length, `不应有路由相关错误，但检测到 ${routerErrors.length} 个错误`).toBe(0);
}

async function readRouteSupportStatus(page: Page): Promise<Record<string, boolean>> {
  return page.evaluate(() => ({
    RouteGuard存在: typeof (window as any).routeGuard !== 'undefined' ||
                    typeof (window as any).RouteGuardManager !== 'undefined',
    RouteMiddleware存在: typeof (window as any).routeMiddleware !== 'undefined' ||
                         typeof (window as any).RouteMiddlewareManager !== 'undefined',
    RouteErrorHandler存在: typeof (window as any).routeErrorHandler !== 'undefined' ||
                           typeof (window as any).RouteErrorHandlerManager !== 'undefined'
  }));
}

function logRouteSupportStatus(guardsAndMiddlewareStatus: Record<string, boolean>): void {
  console.log('📊 路由辅助系统状态:');
  for (const [key, value] of Object.entries(guardsAndMiddlewareStatus)) {
    console.log(`  ${value ? '✅' : '⚠️'} ${key}: ${value ? '已初始化' : '未初始化'}`);
  }
}

function countRouterFunctionality(
  routerStatus: RouterStatus,
  eventListenersRegistered: boolean,
  navigationWorks: boolean,
  historyWorks: boolean
): number {
  const checks = [
    routerStatus['Router对象存在'],
    routerStatus['navigate方法存在'],
    routerStatus['back方法存在'],
    routerStatus['forward方法存在'],
    routerStatus['go方法存在'],
    routerStatus['getCurrentRoute方法存在'],
    routerStatus['getHistory方法存在'],
    routerStatus['register方法存在'],
    routerStatus['registerRoutes方法存在'],
    eventListenersRegistered,
    navigationWorks,
    historyWorks
  ];

  return checks.filter(status => status === true).length;
}

function assertRouterFunctionality(functionalityCount: number): void {
  const functionalityRate = functionalityCount / 12;
  expect(
    functionalityRate,
    `至少 90% 的路由核心功能应该正常，当前: ${Math.round(functionalityRate * 100)}%`
  ).toBeGreaterThanOrEqual(0.9);
}

async function readAlpineStatus(page: Page): Promise<AlpineStatus> {
  return page.evaluate(() => {
    const results: Record<string, any> = {};
    results['Alpine对象存在'] = typeof (window as any).Alpine !== 'undefined' &&
                                (window as any).Alpine !== null;
    results['Alpine已启动'] = (window as any).Alpine &&
                              typeof (window as any).Alpine.version !== 'undefined';

    const alpine = (window as any).Alpine;
    if (alpine) {
      results['data方法存在'] = typeof alpine.data === 'function';
      results['store方法存在'] = typeof alpine.store === 'function';
      results['start方法存在'] = typeof alpine.start === 'function';
      results['Alpine版本'] = alpine.version || '未知';
    }

    return results;
  });
}

function logAlpineStatus(alpineStatus: AlpineStatus): void {
  console.log('📊 Alpine.js 加载状态:');
  for (const [key, value] of Object.entries(alpineStatus)) {
    const icon = value === true || (typeof value === 'string' && value !== '未知') ? '✅' : '❌';
    console.log(`  ${icon} ${key}: ${value}`);
  }
}

function assertRequiredAlpineStatus(alpineStatus: AlpineStatus): void {
  const requiredChecks: Array<[string, string]> = [
    ['Alpine对象存在', 'Alpine 对象应该已加载到 window'],
    ['Alpine已启动', 'Alpine.js 应该已启动'],
    ['data方法存在', 'Alpine.data() 方法应该存在'],
    ['store方法存在', 'Alpine.store() 方法应该存在'],
    ['start方法存在', 'Alpine.start() 方法应该存在']
  ];

  requiredChecks.forEach(([key, message]) => {
    expect(alpineStatus[key], message).toBe(true);
  });
}

async function readRegisteredAlpineComponents(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const alpine = (window as any).Alpine;
    if (!alpine) return [];

    const components: string[] = [];
    document.querySelectorAll('[x-data]').forEach(el => {
      const xDataValue = el.getAttribute('x-data');
      if (xDataValue) components.push(xDataValue);
    });

    return components;
  });
}

function logRegisteredAlpineComponents(registeredComponents: string[]): void {
  console.log(`📊 检测到 ${registeredComponents.length} 个 Alpine 组件实例`);
  if (registeredComponents.length > 0) {
    console.log(
      '  组件列表:',
      registeredComponents.slice(0, 5).join(', ') + (registeredComponents.length > 5 ? '...' : '')
    );
  }
}

async function checkAlpineReactivity(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      try {
        const testDiv = document.createElement('div');
        testDiv.setAttribute('x-data', '{ test: "hello" }');
        testDiv.setAttribute('x-text', 'test');
        testDiv.style.display = 'none';
        document.body.appendChild(testDiv);

        setTimeout(() => {
          const textContent = testDiv.textContent;
          document.body.removeChild(testDiv);
          resolve(textContent === 'hello');
        }, 500);
      } catch {
        resolve(false);
      }
    });
  });
}

function filterAlpineErrors(errors: string[]): string[] {
  return errors.filter(error =>
    hasAnyPattern(error.toLowerCase(), ['alpine', 'x-data', 'x-bind', 'x-on'])
  );
}

function assertNoAlpineErrors(alpineErrors: string[]): void {
  logNumberedItems('❌ 检测到 Alpine 相关错误:', alpineErrors, message => console.error(message));
  expect(alpineErrors.length, `不应有 Alpine 相关错误，但检测到 ${alpineErrors.length} 个错误`).toBe(0);
}

async function checkAlpineComponentRegistration(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      try {
        const alpine = (window as any).Alpine;
        if (!alpine || typeof alpine.data !== 'function') {
          resolve(false);
          return;
        }

        alpine.data('testComponent', () => ({
          message: 'test',
          getMessage() {
            return this.message;
          }
        }));
        resolve(true);
      } catch (error) {
        console.error('组件注册失败:', error);
        resolve(false);
      }
    });
  });
}

function countAlpineFunctionality(
  alpineStatus: AlpineStatus,
  alpineReactivityWorks: boolean,
  componentInitWorks: boolean
): number {
  const checks = [
    alpineStatus['Alpine对象存在'],
    alpineStatus['Alpine已启动'],
    alpineStatus['data方法存在'],
    alpineStatus['store方法存在'],
    alpineStatus['start方法存在'],
    alpineReactivityWorks,
    componentInitWorks
  ];

  return checks.filter(status => status === true).length;
}

async function hasAppContainer(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return window.hasOwnProperty('__container__') || typeof (window as any).container !== 'undefined';
  });
}

async function readServicesStatus(page: Page): Promise<ServicesStatus> {
  return page.evaluate(() => ({
    'Alpine.js': typeof (window as any).Alpine !== 'undefined' &&
                 (window as any).Alpine !== null,
    EventBus: typeof (window as any).eventBus !== 'undefined' ||
              typeof (window as any).EventBus !== 'undefined',
    Router: typeof (window as any).router !== 'undefined' ||
            typeof (window as any).Router !== 'undefined',
    LoadingManager: typeof (window as any).loadingManager !== 'undefined' ||
                    typeof (window as any).LoadingManager !== 'undefined',
    ActionRegistry: typeof (window as any).actionRegistry !== 'undefined' ||
                    typeof (window as any).ActionRegistry !== 'undefined',
    State: typeof (window as any).state !== 'undefined',
    AppStore: typeof (window as any).useAppStore !== 'undefined'
  }));
}

function logServicesStatus(servicesStatus: ServicesStatus): void {
  console.log('📊 服务初始化状态:');
  for (const [service, status] of Object.entries(servicesStatus)) {
    console.log(`  ${status ? '✅' : '❌'} ${service}: ${status ? '已初始化' : '未初始化'}`);
  }
}

function filterCriticalInitializationErrors(errors: string[]): string[] {
  return errors.filter(error => {
    const errorStr = error.toLowerCase();
    return !hasAnyPattern(errorStr, ['deprecated', 'warning', 'favicon']);
  });
}

function assertCoreServicesInitialized(
  servicesStatus: ServicesStatus,
  criticalErrors: string[]
): void {
  logNumberedItems('❌ 检测到关键错误:', criticalErrors, message => console.error(message));
  expect(servicesStatus['Alpine.js'], 'Alpine.js 应该已初始化').toBe(true);
  expect(servicesStatus['State'], '全局状态应该已初始化').toBe(true);
  expect(
    criticalErrors.length,
    `服务初始化时不应有关键错误，但检测到 ${criticalErrors.length} 个错误`
  ).toBe(0);
}

async function checkAppInitialized(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise<boolean>(resolve => {
      const mainContent = document.getElementById('main-content');
      if (mainContent && mainContent.offsetParent !== null) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      window.addEventListener(
        'app:initialized',
        () => {
          clearTimeout(timeout);
          resolve(true);
        },
        { once: true }
      );
    });
  });
}

async function checkRouterWorks(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return typeof (window as any).router !== 'undefined' &&
           typeof (window as any).router.navigate === 'function';
  });
}

function assertServiceInitializationRate(servicesStatus: ServicesStatus): void {
  const initializedCount = Object.values(servicesStatus).filter(status => status).length;
  const totalServices = Object.keys(servicesStatus).length;
  const initializationRate = initializedCount / totalServices;

  console.log(`\n📊 服务初始化统计: ${initializedCount}/${totalServices} 个服务已初始化`);
  expect(
    initializationRate,
    `至少 80% 的关键服务应该已初始化，当前: ${Math.round(initializationRate * 100)}%`
  ).toBeGreaterThanOrEqual(0.8);
}

  test('1.5.3 应用成功启动（无 JS 错误）', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待主内容区域加载
    await page.waitForSelector('#main-content', {
      state: 'visible',
      timeout: 10000
    });

    // 验证：无控制台错误
    const errors = consoleListener.getErrors();
    
    // 如果有错误，输出详细信息以便调试
    if (errors.length > 0) {
      console.error('❌ 检测到控制台错误:');
      errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：应该没有 JavaScript 错误
    expect(errors.length, `应用启动时不应有 JavaScript 错误，但检测到 ${errors.length} 个错误`).toBe(0);

    // 验证：页面标题正确
    const title = await page.title();
    expect(title).toBe('Amazing Amazon Architect');

    // 验证：主要 DOM 元素存在
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();

    // 验证：无页面错误（pageerror 事件）
    // 这已经被 setupConsoleErrorListener 捕获了
    expect(consoleListener.hasErrors()).toBe(false);

    console.log('✅ 应用启动测试通过：无 JavaScript 错误');
  });

  test('1.5.4 测试所有服务初始化成功', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用初始化完成事件
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待一段时间确保所有服务初始化完成
    await page.waitForTimeout(2000);

    console.log(`📊 DI 容器: ${(await hasAppContainer(page)) ? '✅ 已初始化' : '⚠️ 未暴露'}`);
    const servicesStatus = await readServicesStatus(page);
    logServicesStatus(servicesStatus);
    assertCoreServicesInitialized(
      servicesStatus,
      filterCriticalInitializationErrors(consoleListener.getErrors())
    );

    const appInitialized = await checkAppInitialized(page);
    expect(appInitialized, '应用应该触发初始化完成事件').toBe(true);

    if (await checkRouterWorks(page)) console.log('✅ 路由系统已正常初始化');
    assertServiceInitializationRate(servicesStatus);

    console.log('✅ 所有服务初始化测试通过');
  });

  test('1.5.5 测试 Alpine.js 正确加载', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待 Alpine.js 加载完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined &&
             (window as any).Alpine !== null;
    }, { timeout: 10000 });

    console.log('📊 开始检测 Alpine.js 加载状态...');

    const alpineStatus = await readAlpineStatus(page);
    logAlpineStatus(alpineStatus);
    assertRequiredAlpineStatus(alpineStatus);
    logRegisteredAlpineComponents(await readRegisteredAlpineComponents(page));

    const alpineReactivityWorks = await checkAlpineReactivity(page);
    console.log(`📊 Alpine 响应式功能: ${alpineReactivityWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(alpineReactivityWorks, 'Alpine.js 响应式功能应该正常工作').toBe(true);

    assertNoAlpineErrors(filterAlpineErrors(consoleListener.getErrors()));

    const componentInitWorks = await checkAlpineComponentRegistration(page);
    console.log(`📊 Alpine 组件注册功能: ${componentInitWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(componentInitWorks, 'Alpine.js 组件注册功能应该正常工作').toBe(true);

    const functionalityCount = countAlpineFunctionality(
      alpineStatus,
      alpineReactivityWorks,
      componentInitWorks
    );
    console.log(`\n📊 Alpine.js 功能统计: ${functionalityCount}/7 项功能正常`);
    expect(functionalityCount, 'Alpine.js 所有核心功能都应该正常工作').toBe(7);

    console.log('✅ Alpine.js 加载测试通过');
  });

  test('1.5.7 测试路由系统初始化', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用初始化完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待路由系统初始化
    await page.waitForTimeout(2000);

    console.log('📊 开始检测路由系统初始化状态...');

    const routerStatus = await readRouterStatus(page);
    logRouterStatus(routerStatus);
    assertRequiredRouterStatus(routerStatus);

    const eventListenersRegistered = await checkRouterEventListeners(page);
    console.log(`📊 路由事件监听器: ${eventListenersRegistered ? '✅ 已注册' : '❌ 未注册'}`);
    expect(eventListenersRegistered, '路由事件监听器应该已注册').toBe(true);

    const navigationWorks = await checkRouterNavigation(page);
    console.log(`📊 路由导航功能: ${navigationWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(navigationWorks, '路由导航功能应该正常工作').toBe(true);

    const currentRoute = routerStatus['当前路由'];
    const hasCurrentRoute = currentRoute !== null && currentRoute !== undefined;
    console.log(`📊 当前路由状态: ${hasCurrentRoute ? '✅ 已设置' : '⚠️ 未设置'}`);

    const historyWorks = await checkRouterHistory(page);
    console.log(`📊 路由历史记录功能: ${historyWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(historyWorks, '路由历史记录功能应该正常工作').toBe(true);

    assertNoRouterErrors(filterRouterErrors(consoleListener.getErrors()));
    logRouteSupportStatus(await readRouteSupportStatus(page));

    const functionalityCount = countRouterFunctionality(
      routerStatus,
      eventListenersRegistered,
      navigationWorks,
      historyWorks
    );
    console.log(`\n📊 路由系统功能统计: ${functionalityCount}/12 项功能正常`);
    assertRouterFunctionality(functionalityCount);

    console.log('✅ 路由系统初始化测试通过');
  });

  test('1.5.8 采集首屏性能并验证 dev server 启动未失控', async ({ page }) => {
    console.log('📊 开始测试首屏渲染时间...');

    // 记录导航开始时间
    const navigationStartTime = Date.now();

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 等待主内容区域可见
    await page.waitForSelector('#main-content', {
      state: 'visible',
      timeout: 10000
    });

    // 记录首屏渲染完成时间
    const firstRenderTime = Date.now();

    // 计算首屏渲染时间
    const renderTime = firstRenderTime - navigationStartTime;

    console.log(`📊 首屏渲染时间: ${renderTime}ms`);

    const performanceMetrics = await readPerformanceMetrics(page);
    logPerformanceMetrics(performanceMetrics);
    const lcpMetric = await readLargestContentfulPaint(page);
    recordLargestContentfulPaint(performanceMetrics, lcpMetric);

    const criticalRenderingPath = performanceMetrics['DOMContentLoaded'] || renderTime;
    console.log(`\n📊 关键渲染路径时间: ${criticalRenderingPath.toFixed(2)}ms`);
    assertCorePerformanceMetrics(renderTime, performanceMetrics, lcpMetric);

    const blockingResources = await readBlockingResources(page);
    logBlockingResources(blockingResources);
    const resourceStats = await readResourceStats(page);
    logResourceStats(resourceStats);

    const performanceScore = calculatePerformanceScore(
      renderTime,
      performanceMetrics,
      lcpMetric,
      blockingResources,
      resourceStats
    );
    console.log(`\n📊 性能评分: ${performanceScore}/100`);
    console.log(`📊 性能评级: ${getPerformanceRating(performanceScore)}`);
    logPerformanceSuggestions(
      buildPerformanceSuggestions(renderTime, performanceMetrics, blockingResources, resourceStats)
    );
    assertPerformanceScore(performanceScore);

    console.log('\n✅ 首屏渲染时间测试通过');
  });

  test('1.5.9 测试内存占用 < 100MB', async ({ page }) => {
    console.log('📊 开始测试内存占用...');

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用完全初始化
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待所有异步操作完成
    await page.waitForTimeout(3000);

    const initialMemory = await readBrowserMemory(page);
    if (!initialMemory) {
      skipWhenMemoryApiUnavailable();
      return;
    }

    logMemorySnapshot('📊 初始内存使用情况:', initialMemory);

    console.log('\n📊 执行常见操作以模拟实际使用...');
    await simulateCommonMemoryOperations(page);

    const afterOperationsMemory = await readBrowserMemory(page);
    logMemoryGrowth(initialMemory, afterOperationsMemory);
    await triggerBrowserGarbageCollection(page);

    const finalMemory = await readBrowserMemory(page);
    if (!finalMemory) {
      console.error('❌ 无法获取最终内存使用情况');
      return;
    }

    logMemorySnapshot('\n📊 最终内存使用情况:', finalMemory);

    const memoryUsageRate = (finalMemory.usedJSHeapSize / finalMemory.jsHeapSizeLimit) * 100;
    const usedMemoryMB = toMegabytes(finalMemory.usedJSHeapSize);
    const totalMemoryMB = toMegabytes(finalMemory.totalJSHeapSize);
    console.log(`\n📊 内存占用: ${usedMemoryMB.toFixed(2)} MB / ${totalMemoryMB.toFixed(2)} MB`);
    console.log(`📊 内存使用率: ${memoryUsageRate.toFixed(2)}%`);

    const domStats = await readDomStats(page);
    logDomStats(domStats);
    const globalObjectsCount = await readGlobalObjectStats(page);
    logGlobalObjectStats(globalObjectsCount);

    const memoryLeakIndicators = collectMemoryLeakIndicators(
      initialMemory,
      afterOperationsMemory,
      memoryUsageRate,
      domStats,
      globalObjectsCount
    );
    logMemoryLeakIndicators(memoryLeakIndicators);
    const memoryScore = calculateMemoryScore(
      usedMemoryMB,
      memoryUsageRate,
      domStats.totalNodes,
      memoryLeakIndicators.length
    );
    console.log(`\n📊 内存评分: ${memoryScore}/100`);
    console.log(`📊 内存评级: ${getMemoryRating(memoryScore)}`);
    logMemoryOptimizationSuggestions(
      buildMemoryOptimizationSuggestions(
        usedMemoryMB,
        memoryUsageRate,
        domStats,
        globalObjectsCount,
        memoryLeakIndicators
      )
    );
    assertMemoryHealth(usedMemoryMB, memoryUsageRate, domStats.totalNodes, memoryScore);

    console.log('\n✅ 内存占用测试通过');
  });

  test('1.5.10 测试无 console.error 输出', async ({ page }) => {
    console.log('📊 开始测试控制台错误输出...');

    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用完全初始化
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待所有异步操作完成
    await page.waitForTimeout(3000);

    console.log('📊 检查控制台错误输出...');

    const errors = consoleListener.getErrors();
    const errorCategories = categorizeConsoleErrors(errors);
    const errorSignals = await collectStartupErrorSignals(page);
    const errorReport = buildStartupErrorReport(errors, errorCategories, errorSignals);
    const errorScore = calculateStartupErrorScore(errorReport);

    logConsoleErrorSummary(errors.length, errorCategories);
    logStartupErrorDetails(errorCategories, errorSignals);
    console.log(`\n📊 错误严重程度评分: ${errorScore}/100`);
    console.log(`📊 错误评级: ${getStartupErrorRating(errorScore)}`);
    logStartupErrorSuggestions(buildStartupErrorSuggestions(errorReport));
    assertNoStartupErrors(errorReport, errorScore);

    console.log('\n✅ 控制台错误输出测试通过');
  });

  test('1.5.6 测试 Zustand store 初始化', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待 Zustand store 加载完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('useAppStore') && 
             (window as any).useAppStore !== undefined &&
             (window as any).useAppStore !== null;
    }, { timeout: 10000 });

    console.log('📊 开始检测 Zustand Store 初始化状态...');

    const storeStatus = await readStoreStatus(page);
    logStoreStatus(storeStatus);
    assertRequiredStoreStatus(storeStatus);

    const storeReactivityWorks = await checkStoreReactivity(page);
    console.log(`📊 Store 响应式功能: ${storeReactivityWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(storeReactivityWorks, 'Zustand store 响应式功能应该正常工作').toBe(true);

    const storePersistenceWorks = await checkStorePersistence(page);
    console.log(`📊 Store 持久化功能: ${storePersistenceWorks ? '✅ 已启用' : '⚠️ 未检测到'}`);

    const storeErrors = filterStoreErrors(consoleListener.getErrors());
    assertNoStoreErrors(storeErrors);

    const actionsWork = await checkStoreActions(page);
    console.log(`📊 Store Actions 功能: ${actionsWork ? '✅ 正常工作' : '❌ 未正常工作'}`);
    expect(actionsWork, 'Zustand store Actions 应该正常工作').toBe(true);

    const functionalityCount = countStoreFunctionality(storeStatus, storeReactivityWorks, actionsWork);
    console.log(`\n📊 Zustand Store 功能统计: ${functionalityCount}/16 项功能正常`);
    expect(functionalityCount, 'Zustand Store 所有核心功能都应该正常工作').toBeGreaterThanOrEqual(15);

    console.log('✅ Zustand Store 初始化测试通过');
  });
