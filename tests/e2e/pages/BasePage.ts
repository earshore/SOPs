// tests/e2e/pages/BasePage.ts
// ================================================================
// 📄 Page Object 基类
// 提供通用的页面操作方法，所有 E2E 页面对象都应继承此类
// ================================================================

import { Page, expect, Locator } from '@playwright/test';

/**
 * Page Object 基类配置选项
 */
export interface BasePageOptions {
  baseUrl?: string;
  timeout?: number;
}

/**
 * 点击选项
 */
export interface ClickOptions {
  timeout?: number;
  force?: boolean;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

/**
 * 填充选项
 */
export interface FillOptions {
  delay?: number;
  clear?: boolean;
  timeout?: number;
}

/**
 * 等待选项
 */
export interface WaitOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
  fullPage?: boolean;
  path?: string;
  quality?: number;
}

/**
 * Page Object 基类
 * 
 * 提供所有页面对象通用的操作方法，包括：
 * - 导航和页面加载
 * - 元素查找和交互
 * - 等待和验证
 * - 截图和调试
 * 
 * @example
 * ```typescript
 * export class MyPage extends BasePage {
 *   constructor(page: Page) {
 *     super(page, { baseUrl: 'http://localhost:5173' });
 *   }
 * 
 *   async navigate(): Promise<void> {
 *     await super.navigate('/my-page');
 *     await this.waitForPageReady();
 *   }
 * }
 * ```
 */
export abstract class BasePage {
  protected page: Page;
  protected baseUrl: string;
  protected defaultTimeout: number;

  constructor(page: Page, options: BasePageOptions = {}) {
    this.page = page;
    this.baseUrl = options.baseUrl || 'http://localhost:5173';
    this.defaultTimeout = options.timeout || 5000;
  }

  // ========== 导航方法 ==========

  /**
   * 导航到指定路径
   * 
   * @param path - 路径（可以是相对路径或完整 URL）
   * @param options - 导航选项
   */
  async navigate(path: string = '', options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded', ...options });
    await this.waitForPageLoad();
  }

  /**
   * 等待页面加载完成
   * 
   * 默认等待 DOM 内容加载完成和网络空闲
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      // 网络空闲超时不抛出错误，继续执行
      console.warn('Network idle timeout, continuing...');
    });
  }

  /**
   * 刷新页面
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * 返回上一页
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * 前进到下一页
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * 获取页面标题
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  // ========== 元素查找方法 ==========

  /**
   * 获取元素定位器
   * 
   * @param selector - CSS 选择器或文本选择器
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * 检查元素是否存在
   * 
   * @param selector - CSS 选择器
   */
  async exists(selector: string): Promise<boolean> {
    const element = await this.page.$(selector);
    return element !== null;
  }

  /**
   * 检查元素是否可见
   * 
   * @param selector - CSS 选择器
   * @param options - 等待选项
   */
  async isVisible(selector: string, options?: WaitOptions): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, {
        state: 'visible',
        timeout: options?.timeout || 1000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查元素是否隐藏
   * 
   * @param selector - CSS 选择器
   */
  async isHidden(selector: string): Promise<boolean> {
    return !(await this.isVisible(selector));
  }

  /**
   * 获取元素数量
   * 
   * @param selector - CSS 选择器
   */
  async count(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  // ========== 元素交互方法 ==========

  /**
   * 等待元素出现
   * 
   * @param selector - CSS 选择器
   * @param options - 等待选项
   */
  async waitForElement(selector: string, options?: WaitOptions): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: options?.timeout || this.defaultTimeout,
      state: options?.state || 'visible'
    });
  }

  /**
   * 等待元素消失
   * 
   * @param selector - CSS 选择器
   * @param timeout - 超时时间（毫秒）
   */
  async waitForElementToDisappear(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, {
      state: 'hidden',
      timeout: timeout || this.defaultTimeout
    });
  }

  /**
   * 等待文本出现
   * 
   * @param text - 文本内容
   * @param timeout - 超时时间（毫秒）
   */
  async waitForText(text: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(`text=${text}`, {
      timeout: timeout || this.defaultTimeout
    });
  }

  /**
   * 点击元素
   * 
   * @param selector - CSS 选择器
   * @param options - 点击选项
   */
  async click(selector: string, options?: ClickOptions): Promise<void> {
    await this.page.click(selector, {
      timeout: options?.timeout || this.defaultTimeout,
      force: options?.force,
      button: options?.button,
      clickCount: options?.clickCount
    });
  }

  /**
   * 双击元素
   * 
   * @param selector - CSS 选择器
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.dblclick(selector);
  }

  /**
   * 右键点击元素
   * 
   * @param selector - CSS 选择器
   */
  async rightClick(selector: string): Promise<void> {
    await this.page.click(selector, { button: 'right' });
  }

  /**
   * 悬停在元素上
   * 
   * @param selector - CSS 选择器
   */
  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  /**
   * 填写输入框
   * 
   * @param selector - CSS 选择器
   * @param value - 输入值
   * @param options - 填充选项
   */
  async fill(selector: string, value: string, options?: FillOptions): Promise<void> {
    if (options?.clear) {
      await this.page.fill(selector, '');
    }
    
    await this.page.fill(selector, value, {
      timeout: options?.timeout || this.defaultTimeout
    });
    
    if (options?.delay) {
      await this.wait(options.delay);
    }
  }

  /**
   * 输入文本（逐字符输入，触发键盘事件）
   * 
   * @param selector - CSS 选择器
   * @param text - 输入文本
   * @param delay - 每个字符之间的延迟（毫秒）
   */
  async type(selector: string, text: string, delay?: number): Promise<void> {
    await this.page.type(selector, text, { delay: delay || 0 });
  }

  /**
   * 清空输入框
   * 
   * @param selector - CSS 选择器
   */
  async clear(selector: string): Promise<void> {
    await this.page.fill(selector, '');
  }

  /**
   * 选择下拉框选项
   * 
   * @param selector - CSS 选择器
   * @param value - 选项值
   */
  async select(selector: string, value: string | string[]): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * 勾选复选框
   * 
   * @param selector - CSS 选择器
   */
  async check(selector: string): Promise<void> {
    await this.page.check(selector);
  }

  /**
   * 取消勾选复选框
   * 
   * @param selector - CSS 选择器
   */
  async uncheck(selector: string): Promise<void> {
    await this.page.uncheck(selector);
  }

  /**
   * 切换复选框状态
   * 
   * @param selector - CSS 选择器
   * @param checked - 目标状态
   */
  async setChecked(selector: string, checked: boolean): Promise<void> {
    await this.page.setChecked(selector, checked);
  }

  /**
   * 检查复选框是否被勾选
   * 
   * @param selector - CSS 选择器
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.page.isChecked(selector);
  }

  /**
   * 检查元素是否启用
   * 
   * @param selector - CSS 选择器
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  /**
   * 检查元素是否禁用
   * 
   * @param selector - CSS 选择器
   */
  async isDisabled(selector: string): Promise<boolean> {
    return await this.page.isDisabled(selector);
  }

  /**
   * 滚动到元素
   * 
   * @param selector - CSS 选择器
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 滚动到页面顶部
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * 滚动到页面底部
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // ========== 获取元素信息方法 ==========

  /**
   * 获取元素文本内容
   * 
   * @param selector - CSS 选择器
   */
  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  /**
   * 获取输入框的值
   * 
   * @param selector - CSS 选择器
   */
  async getValue(selector: string): Promise<string> {
    return await this.page.inputValue(selector);
  }

  /**
   * 获取元素属性
   * 
   * @param selector - CSS 选择器
   * @param attribute - 属性名
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.getAttribute(selector, attribute);
  }

  /**
   * 获取元素的 innerHTML
   * 
   * @param selector - CSS 选择器
   */
  async getInnerHTML(selector: string): Promise<string> {
    return await this.page.innerHTML(selector);
  }

  /**
   * 获取元素的 innerText
   * 
   * @param selector - CSS 选择器
   */
  async getInnerText(selector: string): Promise<string> {
    return await this.page.innerText(selector);
  }

  // ========== 键盘和鼠标操作 ==========

  /**
   * 按键
   * 
   * @param key - 按键名称（如 'Enter', 'Escape', 'ArrowDown'）
   */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * 按下组合键
   * 
   * @param keys - 按键组合（如 'Control+A', 'Shift+Enter'）
   */
  async pressSequence(...keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.page.keyboard.press(key);
    }
  }

  /**
   * 拖拽元素
   * 
   * @param sourceSelector - 源元素选择器
   * @param targetSelector - 目标元素选择器
   */
  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  // ========== 等待和延迟方法 ==========

  /**
   * 等待指定时间
   * 
   * @param ms - 毫秒数
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 等待导航完成
   * 
   * @param options - 等待选项
   */
  async waitForNavigation(options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await this.page.waitForLoadState(options?.waitUntil || 'networkidle', {
      timeout: options?.timeout || this.defaultTimeout
    });
  }

  /**
   * 等待加载动画消失
   * 
   * @param timeout - 超时时间（毫秒）
   */
  async waitForLoadingToFinish(timeout?: number): Promise<void> {
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.skeleton',
      '[data-loading="true"]',
      '.animate-spin'
    ];

    for (const selector of loadingSelectors) {
      if (await this.exists(selector)) {
        await this.waitForElementToDisappear(selector, timeout || 10000).catch(() => {
          // 超时不抛出错误
          console.warn(`Loading indicator ${selector} did not disappear`);
        });
      }
    }
  }

  /**
   * 等待条件满足
   * 
   * @param condition - 条件函数
   * @param options - 等待选项
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options?: { timeout?: number; interval?: number }
  ): Promise<void> {
    const timeout = options?.timeout || this.defaultTimeout;
    const interval = options?.interval || 100;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.wait(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  // ========== JavaScript 执行方法 ==========

  /**
   * 执行 JavaScript 代码
   * 
   * @param fn - 要执行的函数
   * @param arg - 函数参数
   */
  async evaluate<R, Arg>(fn: (arg: Arg) => R, arg?: Arg): Promise<R> {
    return await this.page.evaluate(fn, arg);
  }

  /**
   * 在元素上执行 JavaScript
   * 
   * @param selector - CSS 选择器
   * @param fn - 要执行的函数
   */
  async evaluateOnElement<R>(selector: string, fn: (element: Element) => R): Promise<R> {
    return await this.page.$eval(selector, fn);
  }

  /**
   * 在所有匹配元素上执行 JavaScript
   * 
   * @param selector - CSS 选择器
   * @param fn - 要执行的函数
   */
  async evaluateOnElements<R>(selector: string, fn: (elements: Element[]) => R): Promise<R> {
    return await this.page.$$eval(selector, fn);
  }

  // ========== Toast 和通知方法 ==========

  /**
   * 等待并验证 Toast 消息
   * 
   * @param message - 期望的消息内容
   * @param timeout - 超时时间（毫秒）
   */
  async expectToast(message: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector('.toast', { timeout: timeout || 5000 });
    const toastText = await this.getText('.toast');
    expect(toastText).toContain(message);
  }

  /**
   * 检查是否显示 Toast
   */
  async hasToast(): Promise<boolean> {
    return await this.isVisible('.toast');
  }

  /**
   * 获取 Toast 消息内容
   */
  async getToastMessage(): Promise<string> {
    if (await this.hasToast()) {
      return await this.getText('.toast');
    }
    return '';
  }

  /**
   * 关闭 Toast
   */
  async closeToast(): Promise<void> {
    const closeButton = await this.page.$('.toast .close, .toast button');
    if (closeButton) {
      await closeButton.click();
    }
  }

  // ========== 错误处理方法 ==========

  /**
   * 检查是否有错误提示
   */
  async hasError(): Promise<boolean> {
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[role="alert"]',
      '.toast-error',
      '.text-red-500',
      '.bg-red-50'
    ];

    for (const selector of errorSelectors) {
      if (await this.isVisible(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[role="alert"]',
      '.toast-error',
      '.text-red-500'
    ];

    for (const selector of errorSelectors) {
      if (await this.isVisible(selector)) {
        return await this.getText(selector);
      }
    }

    return '';
  }

  /**
   * 检查控制台是否有错误
   */
  async hasConsoleErrors(): Promise<boolean> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await this.wait(1000); // 等待可能的错误
    return errors.length > 0;
  }

  // ========== 截图和调试方法 ==========

  /**
   * 截图
   * 
   * @param name - 截图文件名（不含扩展名）
   * @param options - 截图选项
   */
  async screenshot(name: string, options?: ScreenshotOptions): Promise<Buffer> {
    const path = options?.path || `tests/screenshots/${name}.png`;
    
    return await this.page.screenshot({
      path,
      fullPage: options?.fullPage || false,
      quality: options?.quality
    });
  }

  /**
   * 截取元素截图
   * 
   * @param selector - CSS 选择器
   * @param name - 截图文件名
   */
  async screenshotElement(selector: string, name: string): Promise<Buffer> {
    const element = this.page.locator(selector);
    return await element.screenshot({
      path: `tests/screenshots/${name}.png`
    });
  }

  /**
   * 获取页面快照（用于调试）
   */
  async getPageSnapshot(): Promise<string> {
    return await this.page.content();
  }

  /**
   * 打印页面信息（用于调试）
   */
  async debugPageInfo(): Promise<void> {
    console.log('=== Page Debug Info ===');
    console.log('URL:', this.getCurrentUrl());
    console.log('Title:', await this.getTitle());
    console.log('Has errors:', await this.hasError());
    console.log('======================');
  }

  // ========== 对话框处理方法 ==========

  /**
   * 接受对话框（alert, confirm, prompt）
   * 
   * @param promptText - prompt 对话框的输入文本（可选）
   */
  async acceptDialog(promptText?: string): Promise<void> {
    this.page.once('dialog', async dialog => {
      if (promptText && dialog.type() === 'prompt') {
        await dialog.accept(promptText);
      } else {
        await dialog.accept();
      }
    });
  }

  /**
   * 拒绝对话框（confirm, prompt）
   */
  async dismissDialog(): Promise<void> {
    this.page.once('dialog', dialog => dialog.dismiss());
  }

  // ========== 文件上传方法 ==========

  /**
   * 上传文件
   * 
   * @param selector - 文件输入框选择器
   * @param filePath - 文件路径（可以是单个或多个）
   */
  async uploadFile(selector: string, filePath: string | string[]): Promise<void> {
    await this.page.setInputFiles(selector, filePath);
  }

  /**
   * 清除已上传的文件
   * 
   * @param selector - 文件输入框选择器
   */
  async clearUploadedFiles(selector: string): Promise<void> {
    await this.page.setInputFiles(selector, []);
  }

  // ========== 框架和 iframe 方法 ==========

  /**
   * 切换到 iframe
   * 
   * @param selector - iframe 选择器
   */
  async switchToFrame(selector: string): Promise<void> {
    const frameElement = await this.page.$(selector);
    if (frameElement) {
      const frame = await frameElement.contentFrame();
      if (frame) {
        // Playwright 自动处理 frame 切换
        return;
      }
    }
    throw new Error(`Frame not found: ${selector}`);
  }

  // ========== Alpine.js 特定方法 ==========

  /**
   * 等待 Alpine.js 组件初始化
   * 
   * @param componentName - 组件名称（x-data 的值）
   * @param timeout - 超时时间（毫秒）
   */
  async waitForAlpineComponent(componentName: string, timeout?: number): Promise<void> {
    await this.page.waitForFunction(
      (name) => {
        const element = document.querySelector(`[x-data="${name}"]`) as any;
        return element && element.__x;
      },
      componentName,
      { timeout: timeout || this.defaultTimeout }
    );
  }

  /**
   * 获取 Alpine.js 组件数据
   * 
   * @param componentName - 组件名称
   */
  async getAlpineData(componentName: string): Promise<any> {
    return await this.page.evaluate((name) => {
      const element = document.querySelector(`[x-data="${name}"]`) as any;
      return element?.__x?.$data;
    }, componentName);
  }

  /**
   * 检查 Alpine.js 是否已加载
   */
  async isAlpineLoaded(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return typeof (window as any).Alpine !== 'undefined';
    });
  }
}
