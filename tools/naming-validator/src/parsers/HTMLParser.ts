/**
 * HTML解析器
 * 使用jsdom解析HTML文件，提取和更新元素属性
 */

import { readFileSync, writeFileSync } from 'fs';
import type { HTMLElement, SourceLocation } from '../types/index.js';

// 动态导入jsdom（CommonJS模块）
let JSDOM: any;
async function loadJSDOM() {
  if (!JSDOM) {
    const jsdomModule = await import('jsdom');
    JSDOM = jsdomModule.JSDOM;
  }
  return JSDOM;
}

// 类型定义
type JSDOMInstance = any;
type DOMElement = any; // 使用any避免jsdom类型问题

/**
 * 元素修改记录
 */
interface ElementChange {
  element: HTMLElement;
  type: 'id' | 'class' | 'data-attr';
  oldValue: string;
  newValue: string;
  attrName?: string; // 用于data属性
}

/**
 * HTML解析器类
 * 负责解析HTML文件、提取元素信息和更新元素属性
 */
export class HTMLParser {
  private dom: JSDOMInstance | null = null;
  private filePath: string = '';
  private originalContent: string = '';
  private changes: ElementChange[] = [];

  /**
   * 解析HTML文件
   * @param filePath HTML文件路径
   * @returns 解析出的HTML元素数组
   */
  /**
     * 解析HTML文件
     * @param filePath HTML文件路径
     * @returns 解析出的HTML元素数组
     */
    async parse(filePath: string): Promise<HTMLElement[]> {
      this.filePath = filePath;
      this.originalContent = readFileSync(filePath, 'utf-8');
      this.changes = [];

      // 动态加载JSDOM
      const JSDOMClass = await loadJSDOM();

      // 使用jsdom解析HTML
      this.dom = new JSDOMClass(this.originalContent);
      const document = this.dom.window.document;

      const elements: HTMLElement[] = [];

      // 遍历所有元素
      const allElements = document.querySelectorAll('*');

      allElements.forEach((element: DOMElement, index: number) => {
        // 提取id、class和data属性
        const id = (element as any).id || undefined;
        const classes = Array.from(element.classList) as string[];
        const dataAttributes = this.extractDataAttributes(element);

        // 如果元素有id、class或data属性，则添加到结果中
        if (id || classes.length > 0 || dataAttributes.size > 0) {
          elements.push({
            tagName: element.tagName.toLowerCase(),
            id,
            classes,
            dataAttributes,
            location: this.getElementLocation(element, index),
            element, // 保存元素引用以便后续更新
          });
        }
      });

      return elements;
    }


  /**
   * 提取元素的data属性
   * @param element DOM元素
   * @returns data属性的Map
   */
  private extractDataAttributes(element: DOMElement): Map<string, string> {
    const dataAttrs = new Map<string, string>();
    
    // 遍历所有属性
    Array.from(element.attributes).forEach((attr: any) => {
      if (attr.name.startsWith('data-')) {
        dataAttrs.set(attr.name, attr.value);
      }
    });
    
    return dataAttrs;
  }

  /**
   * 获取元素在源文件中的位置
   * @param element DOM元素
   * @param index 元素索引
   * @returns 源代码位置
   */
  private getElementLocation(element: DOMElement, index: number): SourceLocation {
    // 注意：jsdom不提供精确的行号和列号信息
    // 这里使用简化的方法，实际项目中可能需要使用parse5等提供位置信息的解析器
    const tagName = element.tagName.toLowerCase();
    const id = element.id;
    const className = element.className;
    
    // 尝试在原始内容中查找元素的位置
    let searchPattern = `<${tagName}`;
    if (id) {
      searchPattern += `[^>]*id="${id}"`;
    } else if (className) {
      searchPattern += `[^>]*class="${className}"`;
    }
    
    const lines = this.originalContent.split('\n');
    let line = 1;
    let column = 1;
    
    // 简化的位置查找逻辑
    for (let i = 0; i < lines.length; i++) {
      if (id && lines[i].includes(`id="${id}"`)) {
        line = i + 1;
        column = lines[i].indexOf(`id="${id}"`) + 1;
        break;
      } else if (className && lines[i].includes(`class="${className}"`)) {
        line = i + 1;
        column = lines[i].indexOf(`class="${className}"`) + 1;
        break;
      }
    }
    
    return {
      filePath: this.filePath,
      line,
      column,
    };
  }

  /**
   * 更新元素的id属性
   * @param element HTML元素
   * @param newId 新的id值
   */
  updateId(element: HTMLElement, newId: string): void {
    if (!this.dom) {
      throw new Error('必须先调用parse方法解析HTML文件');
    }
    
    if (element.element && element.id) {
      // 记录修改
      this.changes.push({
        element,
        type: 'id',
        oldValue: element.id,
        newValue: newId,
      });
      
      element.element.id = newId;
      element.id = newId;
    }
  }

  /**
   * 更新元素的class属性
   * @param element HTML元素
   * @param oldClass 旧的class名
   * @param newClass 新的class名
   */
  updateClass(element: HTMLElement, oldClass: string, newClass: string): void {
    if (!this.dom) {
      throw new Error('必须先调用parse方法解析HTML文件');
    }
    
    if (element.element) {
      // 记录修改
      this.changes.push({
        element,
        type: 'class',
        oldValue: oldClass,
        newValue: newClass,
      });
      
      element.element.classList.remove(oldClass);
      element.element.classList.add(newClass);
      
      // 更新内部数据
      const index = element.classes.indexOf(oldClass);
      if (index !== -1) {
        element.classes[index] = newClass;
      }
    }
  }

  /**
   * 更新元素的data属性
   * @param element HTML元素
   * @param attrName data属性名（包含data-前缀）
   * @param newValue 新的属性值
   */
  updateDataAttr(element: HTMLElement, attrName: string, newValue: string): void {
    if (!this.dom) {
      throw new Error('必须先调用parse方法解析HTML文件');
    }
    
    if (!attrName.startsWith('data-')) {
      throw new Error('data属性名必须以"data-"开头');
    }
    
    if (element.element) {
      const oldValue = element.element.getAttribute(attrName) || '';
      
      // 记录修改
      this.changes.push({
        element,
        type: 'data-attr',
        oldValue,
        newValue,
        attrName,
      });
      
      element.element.setAttribute(attrName, newValue);
      element.dataAttributes.set(attrName, newValue);
    }
  }

  /**
   * 序列化DOM为HTML字符串，尽可能保留原始格式
   * 使用字符串替换方法来保留原始格式和缩进
   * @returns HTML字符串
   */
  serialize(): string {
    if (!this.dom) {
      throw new Error('必须先调用parse方法解析HTML文件');
    }
    
    let content = this.originalContent;
    
    // 应用所有修改，使用精确的字符串替换来保留格式
    for (const change of this.changes) {
      const { element, type, oldValue, newValue, attrName } = change;
      
      if (type === 'id') {
        // 替换id属性值
        const idPattern = new RegExp(`id=["']${this.escapeRegExp(oldValue)}["']`, 'g');
        content = content.replace(idPattern, `id="${newValue}"`);
      } else if (type === 'class') {
        // 替换class名（需要小心处理，避免替换部分匹配）
        const classPattern = new RegExp(`\\b${this.escapeRegExp(oldValue)}\\b`, 'g');
        content = content.replace(classPattern, newValue);
      } else if (type === 'data-attr' && attrName) {
        // 替换data属性值
        const dataPattern = new RegExp(`${attrName}=["']${this.escapeRegExp(oldValue)}["']`, 'g');
        content = content.replace(dataPattern, `${attrName}="${newValue}"`);
      }
    }
    
    return content;
  }

  /**
   * 转义正则表达式特殊字符
   * @param str 要转义的字符串
   * @returns 转义后的字符串
   */
  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 保存修改后的HTML到文件
   * @param outputPath 输出文件路径（可选，默认覆盖原文件）
   */
  save(outputPath?: string): void {
    const content = this.serialize();
    const targetPath = outputPath || this.filePath;
    writeFileSync(targetPath, content, 'utf-8');
  }

  /**
   * 获取当前DOM对象
   * @returns JSDOM实例
   */
  getDOM(): JSDOMInstance | null {
    return this.dom;
  }

  /**
   * 获取原始文件内容
   * @returns 原始HTML内容
   */
  getOriginalContent(): string {
    return this.originalContent;
  }

  /**
   * 获取所有修改记录
   * @returns 修改记录数组
   */
  getChanges(): ElementChange[] {
    return [...this.changes];
  }

  /**
   * 清除所有修改记录
   */
  clearChanges(): void {
    this.changes = [];
  }
}

