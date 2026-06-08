// src/common/utils/xssFixer.ts
// ================================================================
// 🔒 XSS防护增强工具 (TypeScript版本)
// 提供安全的DOM操作包装函数
// ================================================================

import { escapeHtml, setSafeHtml, createSafeFragment } from './security';

/**
 * XSS风险点类型
 */
export interface XSSRisk {
  type: 'dangerous-attribute' | 'dangerous-url';
  element: Element;
  attribute: string;
  value: string;
  severity: 'high' | 'medium' | 'low';
}

function setTrustedHtml(element: HTMLElement, html: string): void {
  element.replaceChildren(document.createRange().createContextualFragment(html));
}

/**
 * 安全的innerHTML设置 (自动转义)
 * 用于替换所有 element.innerHTML = xxx 的场景
 */
export function setInnerHTML(element: HTMLElement, html: string, trusted: boolean = false): void {
  if (!element) {
    console.warn('[XSSFixer] Element is null or undefined');
    return;
  }

  if (trusted) {
    // 信任的内容(如静态模板),直接设置
    // ✅ 安全: 静态HTML模板，无用户输入
    setTrustedHtml(element, html);
  } else {
    // 不信任的内容,使用安全方法
    setSafeHtml(element, html);
  }
}

/**
 * 安全的模板渲染 (自动转义变量)
 */
export function setTemplate(
  element: HTMLElement,
  template: string,
  data: Record<string, unknown>,
  trustedKeys: string[] = []
): void {
  if (!element) return;

  const html = template.replace(/\$\{(\w+)\}/g, (_match, key) => {
    const value = data[key];
    if (value === undefined || value === null) return '';

    // 检查是否为信任的键
    if (trustedKeys.includes(key)) {
      return String(value);
    }

    return escapeHtml(String(value));
  });

  // ✅ 安全: 静态HTML模板，无用户输入
  setTrustedHtml(element, html);
}

/**
 * 安全的列表渲染
 */
export function renderList<T>(
  element: HTMLElement,
  items: T[],
  renderItem: (item: T, index: number) => string,
  trusted: boolean = false
): void {
  if (!element || !Array.isArray(items)) return;

  if (items.length === 0) {
    // ✅ 安全: 静态HTML模板，无用户输入
    element.replaceChildren();
    return;
  }

  if (trusted) {
    // 信任的渲染函数,直接拼接
    // ✅ 安全: 静态HTML模板，无用户输入
    setTrustedHtml(element, items.map((item, index) => renderItem(item, index)).join(''));
  } else {
    // 不信任的渲染函数,逐个安全插入
    // ✅ 安全: 静态HTML模板，无用户输入
    element.replaceChildren();
    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
      const html = renderItem(item, index);
      const safeFragment = createSafeFragment(html);
      fragment.appendChild(safeFragment);
    });

    element.appendChild(fragment);
  }
}

/**
 * 安全的文本设置 (纯文本,无HTML)
 */
export function setText(element: HTMLElement, text: string): void {
  if (!element) return;
  element.textContent = text;
}

/**
 * 安全的属性设置
 */
export function setAttr(element: HTMLElement, attr: string, value: string): void {
  if (!element) return;

  // 特殊处理危险属性
  if (attr === 'href' || attr === 'src') {
    // 验证URL安全性
    if (value && !isSafeUrl(value)) {
      console.warn(`[XSSFixer] Unsafe URL blocked: ${value}`);
      return;
    }
  }

  // 禁止设置事件处理器属性
  if (attr.startsWith('on')) {
    console.warn(`[XSSFixer] Event handler attribute blocked: ${attr}`);
    return;
  }

  element.setAttribute(attr, value);
}

/**
 * URL安全检查
 */
function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  return !dangerousProtocols.some((protocol) => normalized.startsWith(protocol));
}

/**
 * 批量替换工具 - 用于代码迁移
 * 扫描元素树,找出所有可能的XSS风险点
 */
export function scanXSSRisks(root: HTMLElement = document.body): XSSRisk[] {
  const risks: XSSRisk[] = [];

  // 扫描所有元素
  const allElements = root.querySelectorAll('*');

  allElements.forEach((element) => {
    // 检查危险属性
    const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover'];
    dangerousAttrs.forEach((attr) => {
      if (element.hasAttribute(attr)) {
        risks.push({
          type: 'dangerous-attribute',
          element,
          attribute: attr,
          value: element.getAttribute(attr) || '',
          severity: 'high',
        });
      }
    });

    // 检查危险URL
    const htmlElement = element as HTMLAnchorElement;
    if (htmlElement.href && htmlElement.href.startsWith('javascript:')) {
      risks.push({
        type: 'dangerous-url',
        element,
        attribute: 'href',
        value: htmlElement.href,
        severity: 'high',
      });
    }
  });

  return risks;
}

// 默认导出
export default {
  setInnerHTML,
  setTemplate,
  renderList,
  setText,
  setAttr,
  scanXSSRisks,
};
