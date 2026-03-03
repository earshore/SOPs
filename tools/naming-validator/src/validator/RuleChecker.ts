/**
 * 规则检查器
 * 负责使用NamingRuleEngine验证HTML和CSS文件中的命名
 */

import type { 
  ValidationIssue, 
  ValidatorConfig, 
  NamingCategory,
  Severity 
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
        // 检查ID
        if (element.id && this.config.rules['html-id']) {
          const result = this.ruleEngine.validate(element.id, 'html-id');
          if (!result.isValid) {
            issues.push({
              type: 'html-id',
              severity: this.config.severity['html-id'],
              filePath,
              line: element.location.line,
              column: element.location.column,
              currentValue: element.id,
              suggestedValue: result.suggestion || '',
              ruleName: result.ruleName,
              message: result.message,
            });
          }
        }

        // 检查CSS类
        if (this.config.rules['css-class']) {
          for (const className of element.classes) {
            // 跳过Tailwind CSS工具类（通常包含特殊字符或数字）
            if (this.isTailwindClass(className)) {
              continue;
            }

            const result = this.ruleEngine.validate(className, 'css-class');
            if (!result.isValid) {
              issues.push({
                type: 'css-class',
                severity: this.config.severity['css-class'],
                filePath,
                line: element.location.line,
                column: element.location.column,
                currentValue: className,
                suggestedValue: result.suggestion || '',
                ruleName: result.ruleName,
                message: result.message,
              });
            }
          }
        }

        // 检查data属性
        if (this.config.rules['data-attr']) {
          for (const [attrName, attrValue] of element.dataAttributes) {
            const result = this.ruleEngine.validate(attrName, 'data-attr');
            if (!result.isValid) {
              issues.push({
                type: 'data-attr',
                severity: this.config.severity['data-attr'],
                filePath,
                line: element.location.line,
                column: element.location.column,
                currentValue: attrName,
                suggestedValue: result.suggestion || '',
                ruleName: result.ruleName,
                message: result.message,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`解析HTML文件失败: ${filePath}`, error);
    }

    return issues;
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
