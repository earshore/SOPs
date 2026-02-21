// tests/helpers/BasePage.ts
// ================================================================
// 📄 Page Object 基类
// 提供通用的页面操作方法
// ================================================================

import { Page, expect } from '@playwright/test';
import {
  waitForElement,
  waitForNetworkIdle,
  clickElement,
  fillInput,
  isElementVisible,
  getElementText,
  takeScreenshot
} from './playwright-utils';

/**
 * Page Object 基类
 * 所有页面对象都应继承此类
 */
export abstract class BasePage {
  protected page: Page;
  protected baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5173') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * 导航到指定路径
   */
  async navigate(path: string = ''): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await waitForNetworkIdle(this.page);
  }

  /**
   * 等待元素出现
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    await waitForElement(this.page, selector, { timeout });
  }

  /**
   * 点击元素
   */
  async click(selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    await clickElement(this.page, selector, options);
  }

  /**
   * 填写输入框
   */
  async fill(selector: string, value: string, options?: { delay?: number; clear?: boolean }): Promise<void> {
    await fillInput(this.page, selector, value, options);
  }

  /**
   * 选择下拉框选项
   */
  async select(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string): Promise<boolean> {
    return await isElementVisible(this.page, selector);
  }

  /**
   * 获取元素文本
   */
  async getText(selector: string): Promise<string> {
    return await getElementText(this.page, selector);
  }

  /**
   * 获取输入框值
   */
  async getValue(selector: string): Promise<string> {
    return await this.page.inputValue(selector);
  }

  /**
   * 等待文本出现
   */
  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  /**
   * 截图
   */
  async screenshot(name: string, fullPage: boolean = false): Promise<Buffer> {
    return await takeScreenshot(this.page, name, { fullPage });
  }

  /**
   * 刷新页面
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState('networkidle', options);
  }

  /**
   * 执行 JavaScript
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return await this.page.evaluate(fn);
  }

  /**
   * 检查元素是否存在
   */
  async exists(selector: string): Promise<boolean> {
    const element = await this.page.$(selector);
    return element !== null;
  }

  /**
   * 获取元素数量
   */
  async count(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * 等待元素消失
   */
  async waitForElementToDisappear(selector: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 悬停在元素上
   */
  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  /**
   * 双击元素
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.dblclick(selector);
  }

  /**
   * 右键点击元素
   */
  async rightClick(selector: string): Promise<void> {
    await this.page.click(selector, { button: 'right' });
  }

  /**
   * 按键
   */
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * 等待指定时间
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * 检查 Toast 消息
   */
  async expectToast(message: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForSelector('.toast', { timeout });
    const toastText = await this.getText('.toast');
    expect(toastText).toContain(message);
  }

  /**
   * 关闭 Toast
   */
  async closeToast(): Promise<void> {
    const closeButton = await this.page.$('.toast .close');
    if (closeButton) {
      await closeButton.click();
    }
  }

  /**
   * 等待加载动画消失
   */
  async waitForLoadingToFinish(timeout: number = 10000): Promise<void> {
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.skeleton',
      '[data-loading="true"]'
    ];

    for (const selector of loadingSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        await this.waitForElementToDisappear(selector, timeout);
      }
    }
  }

  /**
   * 检查是否有错误提示
   */
  async hasError(): Promise<boolean> {
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[role="alert"]',
      '.toast-error'
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
      '.toast-error'
    ];

    for (const selector of errorSelectors) {
      if (await this.isVisible(selector)) {
        return await this.getText(selector);
      }
    }

    return '';
  }
}
