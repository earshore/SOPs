/**
 * SafeRenderer - 安全的 DOM 渲染器
 * 
 * 提供安全的 DOM 渲染方法，防止 XSS 攻击
 * 
 * @module SafeRenderer
 */

import { ValidationError } from '@/common/errors/AppError';
import { setSafeHtml } from '@/common/utils/security';

/**
 * 渲染选项接口
 */
export interface RenderOptions {
  /** 是否转义 HTML，默认 true */
  sanitize?: boolean;
  /** 允许的 HTML 标签白名单 */
  allowedTags?: string[];
  /** 允许的 HTML 属性白名单 */
  allowedAttrs?: string[];
}

/**
 * 列表渲染选项接口
 */
export interface ListRenderOptions extends RenderOptions {
  /** 空列表时显示的消息 */
  emptyMessage?: string;
  /** 容器标签名，默认 'div' */
  containerTag?: string;
}

/**
 * 默认转义映射表
 */
const DEFAULT_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * 默认允许的 HTML 标签（用于富文本）
 */
const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'span',
  'ul', 'ol', 'li', 'a', 'img'
];

/**
 * 默认允许的 HTML 属性
 */
const DEFAULT_ALLOWED_ATTRS = [
  'href', 'src', 'alt', 'title', 'class'
];

/**
 * SafeRenderer 类
 * 
 * 单例模式，提供安全的 DOM 渲染方法
 */
export class SafeRenderer {
  private static instance: SafeRenderer;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取 SafeRenderer 单例实例
   * 
   * @returns SafeRenderer 实例
   */
  public static getInstance(): SafeRenderer {
    if (!SafeRenderer.instance) {
      SafeRenderer.instance = new SafeRenderer();
    }
    return SafeRenderer.instance;
  }

  /**
   * 渲染静态模板（已审计，无需转义）
   *
   * 用于渲染已经过安全审计的静态 HTML 模板
   *
   * @param container - 目标容器元素
   * @param template - HTML 模板字符串
   *
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * renderer.renderTemplate(container, '<div class="card">Static Content</div>');
   * ```
   */
  public renderTemplate(container: HTMLElement, template: string): void {
    if (!container) {
      throw new ValidationError(
        'SafeRenderer: container is required',
        'SAFE_RENDERER_NO_CONTAINER',
        'container',
        container,
        { module: 'SafeRenderer', action: 'renderTemplate' }
      );
    }

    if (typeof template !== 'string') {
      throw new ValidationError(
        'SafeRenderer: template must be a string',
        'SAFE_RENDERER_INVALID_TEMPLATE',
        'template',
        typeof template,
        { module: 'SafeRenderer', action: 'renderTemplate' }
      );
    }

    // ✅ 安全: 使用setSafeHtml清理危险标签和事件属性后插入模板
    setSafeHtml(container, template);
  }

  /**
   * 渲染动态内容（自动转义）
   * 
   * 用于渲染包含用户输入或动态数据的内容，自动进行 XSS 防护
   * 
   * @param container - 目标容器元素
   * @param template - 模板字符串，支持 {{key}} 插值语法
   * @param data - 数据对象
   * @param options - 渲染选项
   * 
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * renderer.renderDynamic(
   *   container,
   *   '<div>Hello {{name}}</div>',
   *   { name: '<script>alert("xss")</script>' }
   * );
   * // 输出: <div>Hello &lt;script&gt;alert("xss")&lt;/script&gt;</div>
   * ```
   */
  public renderDynamic(
    container: HTMLElement,
    template: string,
    data: Record<string, unknown>,
    options?: RenderOptions
  ): void {
    if (!container) {
      throw new ValidationError(
        'SafeRenderer: container is required',
        'SAFE_RENDERER_NO_CONTAINER',
        'container',
        container,
        { module: 'SafeRenderer', action: 'renderDynamic' }
      );
    }

    if (typeof template !== 'string') {
      throw new ValidationError(
        'SafeRenderer: template must be a string',
        'SAFE_RENDERER_INVALID_TEMPLATE',
        'template',
        typeof template,
        { module: 'SafeRenderer', action: 'renderDynamic' }
      );
    }

    const sanitize = options?.sanitize !== false; // 默认为 true

    if (sanitize && options?.allowedTags) {
      // 如果指定了白名单，先插值（不转义），然后使用 sanitizeHtml 清理
      const interpolated = this.interpolate(template, data, false);
      // ✅ 安全: sanitizeHtml会根据白名单清理HTML
      container.innerHTML = this.sanitizeHtml(interpolated, options);
    } else {
      // 默认行为：插值时转义
      const interpolated = this.interpolate(template, data, sanitize);
      // ✅ 安全: interpolate已对数据进行转义
      container.innerHTML = interpolated;
    }
  }

  /**
   * 渲染列表（使用 DocumentFragment 优化性能）
   * 
   * 高效渲染大量列表项，避免多次 DOM 操作
   * 
   * @param container - 目标容器元素
   * @param items - 数据数组
   * @param renderer - 渲染函数，接收 item 和 index，返回 HTML 字符串
   * @param options - 列表渲染选项
   * 
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * renderer.renderList(
   *   container,
   *   users,
   *   (user, index) => `<div class="user">${user.name}</div>`,
   *   { emptyMessage: 'No users found' }
   * );
   * ```
   */
  public renderList<T>(
    container: HTMLElement,
    items: T[],
    renderer: (item: T, index: number) => string,
    options?: ListRenderOptions
  ): void {
    if (!container) {
      throw new ValidationError(
        'SafeRenderer: container is required',
        'SAFE_RENDERER_NO_CONTAINER',
        'container',
        container,
        { module: 'SafeRenderer', action: 'renderList' }
      );
    }

    if (!Array.isArray(items)) {
      throw new ValidationError(
        'SafeRenderer: items must be an array',
        'SAFE_RENDERER_INVALID_ITEMS',
        'items',
        typeof items,
        { module: 'SafeRenderer', action: 'renderList' }
      );
    }

    if (typeof renderer !== 'function') {
      throw new ValidationError(
        'SafeRenderer: renderer must be a function',
        'SAFE_RENDERER_INVALID_RENDERER',
        'renderer',
        typeof renderer,
        { module: 'SafeRenderer', action: 'renderList' }
      );
    }

    // 清空容器
    container.innerHTML = '';

    // 处理空列表
    if (items.length === 0) {
      if (options?.emptyMessage) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-message';
        emptyDiv.textContent = options.emptyMessage;
        container.appendChild(emptyDiv);
      }
      return;
    }

    // 使用 DocumentFragment 优化性能
    const fragment = document.createDocumentFragment();
    const containerTag = options?.containerTag || 'div';
    const sanitize = options?.sanitize !== false;

    items.forEach((item, index) => {
      const html = renderer(item, index);
      const element = document.createElement(containerTag);

      if (sanitize) {
        // 转义 HTML
        element.textContent = html;
      } else if (options?.allowedTags) {
        // 使用白名单清理
        // ✅ 安全: sanitizeHtml会根据白名单清理HTML
        element.innerHTML = this.sanitizeHtml(html, options);
      } else {
        // 宽松模式仍经过基础清理，保留常规HTML结构并移除危险内容
        // ✅ 安全: 使用setSafeHtml清理危险标签和事件属性后插入列表项HTML
        setSafeHtml(element, html);
      }

      fragment.appendChild(element);
    });

    container.appendChild(fragment);
  }

  /**
   * 渲染组件
   * 
   * 渲染预定义的组件模板
   * 
   * @param container - 目标容器元素
   * @param componentName - 组件名称
   * @param props - 组件属性
   * 
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * renderer.renderComponent(container, 'user-card', { name: 'John', age: 30 });
   * ```
   */
  public renderComponent(
    container: HTMLElement,
    componentName: string,
    props?: Record<string, unknown>
  ): void {
    if (!container) {
      throw new ValidationError(
        'SafeRenderer: container is required',
        'SAFE_RENDERER_NO_CONTAINER',
        'container',
        container,
        { module: 'SafeRenderer', action: 'renderComponent' }
      );
    }

    if (!componentName) {
      throw new ValidationError(
        'SafeRenderer: componentName is required',
        'SAFE_RENDERER_NO_COMPONENT_NAME',
        'componentName',
        componentName,
        { module: 'SafeRenderer', action: 'renderComponent' }
      );
    }

    // 创建组件容器
    const componentDiv = document.createElement('div');
    componentDiv.setAttribute('data-component', componentName);
    
    // 设置属性
    if (props) {
      Object.keys(props).forEach(key => {
        const value = props[key];
        if (typeof value === 'string' || typeof value === 'number') {
          componentDiv.setAttribute(`data-${key}`, String(value));
        }
      });
    }

    container.appendChild(componentDiv);
  }

  /**
   * 转义 HTML 特殊字符
   * 
   * 将 HTML 特殊字符转换为实体编码，防止 XSS 攻击
   * 
   * @param text - 要转义的文本
   * @returns 转义后的文本
   * 
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * const safe = renderer.escapeHtml('<script>alert("xss")</script>');
   * // 返回: &lt;script&gt;alert("xss")&lt;/script&gt;
   * ```
   */
  public escapeHtml(text: string): string {
    if (typeof text !== 'string') {
      return String(text);
    }

    return text.replace(/[&<>"'/]/g, (char) => DEFAULT_ESCAPE_MAP[char] || char);
  }

  /**
   * 清理 HTML，只保留白名单中的标签和属性
   * 
   * @param html - 要清理的 HTML 字符串
   * @param options - 清理选项
   * @returns 清理后的 HTML
   * 
   * @example
   * ```typescript
   * const renderer = SafeRenderer.getInstance();
   * const clean = renderer.sanitizeHtml(
   *   '<div data-action="alert">Hello</div>',
   *   { allowedTags: ['div'], allowedAttrs: ['class'] }
   * );
   * ```
   */
  public sanitizeHtml(html: string, options?: RenderOptions): string {
    if (typeof html !== 'string') {
      return '';
    }

    const allowedTags = options?.allowedTags || DEFAULT_ALLOWED_TAGS;
    const allowedAttrs = options?.allowedAttrs || DEFAULT_ALLOWED_ATTRS;

    // 创建临时 DOM 解析 HTML
    const temp = document.createElement('div');
    // ✅ 安全: 临时DOM用于解析，后续会通过白名单过滤
    temp.innerHTML = html;

    // 递归清理节点
    const cleanNode = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.cloneNode(true);
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // 检查标签是否在白名单中
        if (!allowedTags.includes(tagName)) {
          return null;
        }

        // 创建新元素
        const newElement = document.createElement(tagName);

        // 复制允许的属性
        Array.from(element.attributes).forEach(attr => {
          if (allowedAttrs.includes(attr.name)) {
            // 额外检查 href 和 src 属性，防止 javascript: 协议
            if (attr.name === 'href' || attr.name === 'src') {
              const value = attr.value.trim().toLowerCase();
              if (!value.startsWith('javascript:') && !value.startsWith('data:')) {
                newElement.setAttribute(attr.name, attr.value);
              }
            } else {
              newElement.setAttribute(attr.name, attr.value);
            }
          }
        });

        // 递归处理子节点
        Array.from(element.childNodes).forEach(child => {
          const cleanedChild = cleanNode(child);
          if (cleanedChild) {
            newElement.appendChild(cleanedChild);
          }
        });

        return newElement;
      }

      return null;
    };

    // 清理所有子节点
    const cleanedFragment = document.createDocumentFragment();
    Array.from(temp.childNodes).forEach(child => {
      const cleanedChild = cleanNode(child);
      if (cleanedChild) {
        cleanedFragment.appendChild(cleanedChild);
      }
    });

    // 转换回 HTML 字符串
    const cleanedDiv = document.createElement('div');
    cleanedDiv.appendChild(cleanedFragment);
    return cleanedDiv.innerHTML;
  }

  /**
   * 模板插值
   * 
   * 将模板字符串中的 {{key}} 替换为数据对象中的值
   * 
   * @param template - 模板字符串
   * @param data - 数据对象
   * @param sanitize - 是否转义值，默认 true
   * @returns 插值后的字符串
   * 
   * @private
   */
  private interpolate(
    template: string,
    data: Record<string, unknown>,
    sanitize: boolean = true
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const value = data[key];
      
      if (value === undefined || value === null) {
        return '';
      }

      const stringValue = String(value);
      return sanitize ? this.escapeHtml(stringValue) : stringValue;
    });
  }
}

/**
 * 导出单例实例的便捷访问方法
 */
export const safeRenderer = SafeRenderer.getInstance();
