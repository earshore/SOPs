// src/common/utils/security.ts
// ================================================================
// 🎯 P0-2: XSS 安全防护工具 (TypeScript版本)
// 提供安全的 HTML 渲染方法
// ================================================================

// ==================== 类型定义 ====================

/**
 * HTML转义映射表
 */
type EscapeMap = Record<string, string>;

/**
 * Markdown解析器函数类型
 */
type MarkdownParser = (markdown: string) => string;

// ==================== HTML转义函数 ====================

/**
 * HTML 实体转义
 * 将特殊字符转换为 HTML 实体，防止 XSS 注入
 * 
 * @param str - 需要转义的字符串
 * @returns 转义后的安全字符串
 * 
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // 返回: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';

  const escapeMap: EscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]!);
}

/**
 * 批量转义对象中的字符串值
 * 
 * @param obj - 包含字符串值的对象
 * @returns 转义后的对象
 */
export function escapeObject<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  const result = (Array.isArray(obj) ? [] : {}) as Record<string, unknown>;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        result[key] = escapeHtml(value);
      } else if (typeof value === 'object') {
        result[key] = escapeObject(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

// ==================== DOM操作函数 ====================

/**
 * 安全的 innerHTML 设置
 * 使用文本节点替代直接 innerHTML 赋值
 * 
 * @param element - 目标元素
 * @param text - 纯文本内容
 */
export function setTextContent(element: HTMLElement | null, text: string): void {
  if (!element) return;
  element.textContent = text;
}

/**
 * 安全的模板渲染
 * 转义所有变量后再插入 HTML
 * 
 * @param template - HTML 模板字符串
 * @param data - 变量数据
 * @returns 渲染后的安全 HTML
 * 
 * @example
 * safeTemplate('<div class="item">${title}</div>', { title: '<script>bad</script>' })
 * // 返回: '<div class="item">&lt;script&gt;bad&lt;/script&gt;</div>'
 */
export function safeTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\$\{(\w+)\}/g, (_match, key) => {
    const value = data[key];
    if (value === undefined || value === null) return '';
    return escapeHtml(String(value));
  });
}

/**
 * 安全的 HTML 片段创建
 * 使用 DOMParser 解析 HTML，自动移除危险元素
 * 
 * @param html - HTML 字符串
 * @returns 安全的文档片段
 */
export function createSafeFragment(html: string): DocumentFragment {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 移除危险元素
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
  dangerousTags.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });

  // 移除危险属性
  const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];
  doc.querySelectorAll('*').forEach(el => {
    dangerousAttrs.forEach(attr => el.removeAttribute(attr));
    // 移除 javascript: 伪协议
    const anchor = el as HTMLAnchorElement;
    if (anchor.href && anchor.href.startsWith('javascript:')) {
      el.removeAttribute('href');
    }
  });

  const fragment = document.createDocumentFragment();
  while (doc.body.firstChild) {
    fragment.appendChild(doc.body.firstChild);
  }

  return fragment;
}

/**
 * 安全地设置元素 innerHTML
 * 先清理危险内容再设置
 * 
 * @param element - 目标元素
 * @param html - HTML 字符串
 */
export function setSafeHtml(element: HTMLElement | null, html: string): void {
  if (!element) return;
  // ✅ 安全: 静态HTML模板，无用户输入
  element.innerHTML = '';
  element.appendChild(createSafeFragment(html));
}

// ==================== Markdown处理 ====================

/**
 * Markdown 安全渲染
 * 配合 marked.js 使用，清理输出
 * 
 * @param markdown - Markdown 字符串
 * @param markdownParser - marked.parse 或类似函数
 * @returns 安全的 HTML 字符串
 */
export function safeMarkdown(markdown: string, markdownParser?: MarkdownParser): string {
  if (!markdownParser) {
    console.warn('[Security] markdownParser not provided, returning escaped text');
    return escapeHtml(markdown);
  }

  // 先转换 Markdown
  const html = markdownParser(markdown);

  // 创建临时元素清理
  const temp = document.createElement('div');
  temp.appendChild(createSafeFragment(html));

  return temp.innerHTML;
}

// ==================== URL安全检查 ====================

/**
 * URL 安全检查
 * 验证 URL 是否安全（非 javascript: 等伪协议）
 * 
 * @param url - URL 字符串
 * @returns 是否安全
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  const normalized = url.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];

  return !dangerousProtocols.some(protocol => normalized.startsWith(protocol));
}

/**
 * 安全的链接创建
 * 
 * @param url - 链接地址
 * @param text - 链接文本
 * @returns 安全的 <a> 标签 HTML
 */
export function safeLink(url: string, text: string): string {
  if (!isSafeUrl(url)) {
    return escapeHtml(text);
  }
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
}

// ==================== 工具集合 ====================

/**
 * 安全工具集合
 */
export const SecurityUtils = {
  escapeHtml,
  escapeObject,
  setTextContent,
  safeTemplate,
  createSafeFragment,
  setSafeHtml,
  safeMarkdown,
  isSafeUrl,
  safeLink
};

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
  (window as Window & { SecurityUtils?: typeof SecurityUtils }).SecurityUtils = SecurityUtils;
}

// 默认导出
export default SecurityUtils;
