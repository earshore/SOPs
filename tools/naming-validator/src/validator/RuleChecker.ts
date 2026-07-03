/**
 * 规则检查器
 * 负责使用NamingRuleEngine验证HTML和CSS文件中的命名
 */

import type { 
  HTMLElement as ParsedHTMLElement,
  ValidationIssue, 
  ValidationResult,
  ValidatorConfig, 
  NamingCategory
} from '../types/index.js';
import { NamingRuleEngine } from '../naming-rules/NamingRuleEngine.js';
import { HTMLParser } from '../parsers/HTMLParser.js';
import { CSSParser } from '../parsers/CSSParser.js';

/**
 * 规则检查器类
 */
export class RuleChecker {
  private ruleEngine: NamingRuleEngine;
  private config: ValidatorConfig;

  constructor(ruleEngine: NamingRuleEngine, config: ValidatorConfig) {
    this.ruleEngine = ruleEngine;
    this.config = config;
  }

  /**
   * 检查HTML文件
   * @param filePath 文件路径
   * @returns 验证问题列表
   */
  async checkHTMLFile(filePath: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const parser = new HTMLParser();

    try {
      const elements = await parser.parse(filePath);

      for (const element of elements) {
        issues.push(...this.checkHtmlElement(element, filePath));
      }
    } catch (error) {
      console.error(`解析HTML文件失败: ${filePath}`, error);
    }

    return issues;
  }

  private checkHtmlElement(element: ParsedHTMLElement, filePath: string): ValidationIssue[] {
    return [
      ...this.checkHtmlId(element, filePath),
      ...this.checkHtmlClasses(element, filePath),
      ...this.checkHtmlDataAttributes(element, filePath),
    ];
  }

  private checkHtmlId(element: ParsedHTMLElement, filePath: string): ValidationIssue[] {
    if (!element.id || !this.config.rules['html-id']) {
      return [];
    }

    return this.validateHtmlValue(element.id, 'html-id', element, filePath);
  }

  private checkHtmlClasses(element: ParsedHTMLElement, filePath: string): ValidationIssue[] {
    if (!this.config.rules['css-class']) {
      return [];
    }

    return element.classes
      .filter(className => !this.isTailwindClass(className))
      .flatMap(className => this.validateHtmlValue(className, 'css-class', element, filePath));
  }

  private checkHtmlDataAttributes(
    element: ParsedHTMLElement,
    filePath: string
  ): ValidationIssue[] {
    if (!this.config.rules['data-attr']) {
      return [];
    }

    return Array.from(element.dataAttributes.keys())
      .flatMap(attrName => this.validateHtmlValue(attrName, 'data-attr', element, filePath));
  }

  private validateHtmlValue(
    value: string,
    type: NamingCategory,
    element: ParsedHTMLElement,
    filePath: string
  ): ValidationIssue[] {
    const result = this.ruleEngine.validate(value, type);
    return result.isValid ? [] : [this.createIssue(type, filePath, element, value, result)];
  }

  private createIssue(
    type: NamingCategory,
    filePath: string,
    element: ParsedHTMLElement,
    currentValue: string,
    result: ValidationResult
  ): ValidationIssue {
    return {
      type,
      severity: this.config.severity[type],
      filePath,
      line: element.location.line,
      column: element.location.column,
      currentValue,
      suggestedValue: result.suggestion || '',
      ruleName: result.ruleName,
      message: result.message,
    };
  }

  /**
   * 检查CSS文件
   * @param filePath 文件路径
   * @returns 验证问题列表
   */
  async checkCSSFile(filePath: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    
    if (!this.config.rules['css-class']) {
      return issues;
    }

    const parser = new CSSParser();

    try {
      const rules = await parser.parse(filePath);

      for (const rule of rules) {
        for (const className of rule.classes) {
          const result = this.ruleEngine.validate(className, 'css-class');
          if (!result.isValid) {
            issues.push({
              type: 'css-class',
              severity: this.config.severity['css-class'],
              filePath,
              line: rule.location.line,
              column: rule.location.column,
              currentValue: className,
              suggestedValue: result.suggestion || '',
              ruleName: result.ruleName,
              message: result.message,
            });
          }
        }
      }
    } catch (error) {
      console.error(`解析CSS文件失败: ${filePath}`, error);
    }

    return issues;
  }

  /**
   * 判断是否为Tailwind CSS工具类
   * @param className 类名
   * @returns 是否为Tailwind类
   */
  private isTailwindClass(className: string): boolean {
    // Tailwind类的常见特征：
    // 1. 包含冒号（响应式、状态变体）：md:, hover:, focus:
    // 2. 包含方括号（任意值）：w-[100px]
    // 3. 包含斜杠（分数值）：w-1/2
    // 4. 以负号开头（负值）：-mt-4
    // 5. 包含小数点（透明度）：bg-opacity-50
    
    return /[:[\]\/]|^-|opacity-\d+/.test(className);
  }
}
