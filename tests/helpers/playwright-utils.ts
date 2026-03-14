// tests/helpers/playwright-utils.ts
// ================================================================
// 🎭 Playwright 测试工具函数
// 提供常用的测试辅助方法
// ================================================================

import { Page } from '@playwright/test';

/**
 * 等待条件满足
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`);
}

/**
 * 等待元素出现
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: {
    timeout?: number;
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
  } = {}
): Promise<void> {
  const { timeout = 5000, state = 'visible' } = options;
  await page.waitForSelector(selector, { timeout, state });
}

/**
 * 等待网络空闲
 */
export async function waitForNetworkIdle(
  page: Page,
  options: {
    timeout?: number;
    idleTime?: number;
  } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(idleTime);
}

/**
 * 检查控制台错误
 */
export function setupConsoleErrorListener(page: Page): {
  errors: string[];
  warnings: string[];
  getErrors: () => string[];
  getWarnings: () => string[];
  hasErrors: () => boolean;
  hasWarnings: () => boolean;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return {
    errors,
    warnings,
    getErrors: () => [...errors],
    getWarnings: () => [...warnings],
    hasErrors: () => errors.length > 0,
    hasWarnings: () => warnings.length > 0
  };
}

/**
 * 获取性能指标
 */
export async function getPerformanceMetrics(page: Page): Promise<{
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}> {
  const metrics = await page.evaluate(() => {
    const timing = performance.timing;
    const paintEntries = performance.getEntriesByType('paint');

    return {
      navigationStart: timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime,
      firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime
    };
  });

  return metrics;
}

/**
 * 获取内存使用情况
 */
export async function getMemoryUsage(page: Page): Promise<{
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedJSHeapSizeMB: number;
}> {
  const memory = await page.evaluate(() => {
    const mem = (performance as any).memory;
    if (!mem) {
      return null;
    }

    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      usedJSHeapSizeMB: Math.round(mem.usedJSHeapSize / 1024 / 1024)
    };
  });

  if (!memory) {
    throw new Error('Memory API not available');
  }

  return memory;
}

/**
 * 检查 Alpine.js 是否加载
 */
export async function isAlpineLoaded(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as any).Alpine !== 'undefined';
  });
}

/**
 * 检查 Zustand store 是否初始化
 */
export async function isStoreInitialized(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as any).useAppStore !== 'undefined';
  });
}

/**
 * 获取 Alpine 组件列表
 */
export async function getAlpineComponents(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const alpine = (window as any).Alpine;
    if (!alpine || !alpine._x_dataStack) {
      return [];
    }

    // 获取已注册的组件名称
    const components: string[] = [];
    const dataStack = alpine._x_dataStack || [];
    
    dataStack.forEach((data: any) => {
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (!components.includes(key)) {
            components.push(key);
          }
        });
      }
    });

    return components;
  });
}

/**
 * 模拟用户输入
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string,
  options: {
    delay?: number;
    clear?: boolean;
  } = {}
): Promise<void> {
  const { delay = 0, clear = true } = options;

  if (clear) {
    await page.fill(selector, '');
  }

  await page.type(selector, value, { delay });
}

/**
 * 等待并点击元素
 */
export async function clickElement(
  page: Page,
  selector: string,
  options: {
    timeout?: number;
    force?: boolean;
  } = {}
): Promise<void> {
  const { timeout = 5000, force = false } = options;
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  await page.click(selector, { force });
}

/**
 * 截图并保存
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: {
    fullPage?: boolean;
    path?: string;
  } = {}
): Promise<Buffer> {
  const { fullPage = false, path } = options;
  const screenshotPath = path || `tests/screenshots/${name}-${Date.now()}.png`;

  return await page.screenshot({
    path: screenshotPath,
    fullPage
  });
}

/**
 * 检查元素是否可见
 */
export async function isElementVisible(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const element = await page.$(selector);
    if (!element) {
      return false;
    }
    return await element.isVisible();
  } catch {
    return false;
  }
}

/**
 * 获取元素文本内容
 */
export async function getElementText(
  page: Page,
  selector: string
): Promise<string> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return await element.textContent() || '';
}

/**
 * 等待 URL 变化
 */
export async function waitForUrlChange(
  page: Page,
  expectedUrl: string | RegExp,
  options: {
    timeout?: number;
  } = {}
): Promise<void> {
  const { timeout = 5000 } = options;
  await page.waitForURL(expectedUrl, { timeout });
}

/**
 * 检查路由是否初始化
 */
export async function isRouterInitialized(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof (window as any).router !== 'undefined';
  });
}

/**
 * 获取当前路由
 */
export async function getCurrentRoute(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const router = (window as any).router;
    if (!router) {
      return '';
    }
    return router.currentRoute || window.location.hash || '';
  });
}
