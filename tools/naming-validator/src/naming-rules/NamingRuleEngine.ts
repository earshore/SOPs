/**
 * 命名规则引擎
 * 负责管理命名规则、验证命名和生成建议
 */

import type { NamingRule, ValidationResult, NamingCategory } from '../types/index.js';
import { generateIdSuggestion } from './html-id-rules.js';
import { generateClassSuggestion } from './css-class-rules.js';
import { generateDataAttrSuggestion } from './data-attr-rules.js';

/**
 * 命名规则引擎类
 * 提供规则注册、验证和建议生成功能
 */
export class NamingRuleEngine {
  private rules: Map<string, NamingRule>;

  constructor() {
    this.rules = new Map();
  }

  /**
   * 注册命名规则
   * @param rule 要注册的命名规则
   */
  registerRule(rule: NamingRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * 批量注册命名规则
   * @param rules 要注册的命名规则数组
   */
  registerRules(rules: NamingRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * 验证命名是否符合规范
   * @param value 要验证的命名值
   * @param category 命名类别
   * @returns 验证结果
   */
  validate(value: string, category: NamingCategory): ValidationResult {
    // 获取该类别的所有规则
    const categoryRules = this.getRulesByCategory(category);

    if (categoryRules.length === 0) {
      return {
        isValid: false,
        ruleName: 'no-rules',
        message: `没有为类别 "${category}" 定义规则`,
      };
    }

    // 尝试匹配任一规则
    for (const rule of categoryRules) {
      if (rule.pattern.test(value)) {
        return {
          isValid: true,
          ruleName: rule.name,
          message: `命名符合规则: ${rule.description}`,
        };
      }
    }

    // 如果没有匹配的规则，生成建议
    const suggestion = this.getSuggestion(value, category);
    const ruleDescriptions = categoryRules.map(r => r.description).join('; ');

    return {
      isValid: false,
      ruleName: 'validation-failed',
      suggestion,
      message: `命名不符合任何规则。期望格式: ${ruleDescriptions}`,
    };
  }

  /**
   * 为不符合规范的命名生成建议
   * @param value 当前命名值
   * @param category 命名类别
   * @returns 建议的命名
   */
  getSuggestion(value: string, category: NamingCategory): string {
    // 根据类别使用专门的建议生成逻辑
    switch (category) {
      case 'html-id':
        return generateIdSuggestion(value);
      
      case 'css-class':
        return generateClassSuggestion(value);
      
      case 'data-attr':
        return generateDataAttrSuggestion(value);
      
      default:
        return value;
    }
  }

  /**
   * 获取指定类别的所有规则
   * @param category 命名类别（可选）
   * @returns 规则数组
   */
  getAllRules(category?: NamingCategory): NamingRule[] {
    if (category) {
      return this.getRulesByCategory(category);
    }
    return Array.from(this.rules.values());
  }

  /**
   * 根据名称获取规则
   * @param name 规则名称
   * @returns 规则对象或undefined
   */
  getRule(name: string): NamingRule | undefined {
    return this.rules.get(name);
  }

  /**
   * 检查规则是否已注册
   * @param name 规则名称
   * @returns 是否已注册
   */
  hasRule(name: string): boolean {
    return this.rules.has(name);
  }

  /**
   * 获取已注册规则的数量
   * @returns 规则数量
   */
  getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * 清除所有已注册的规则
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * 获取指定类别的规则
   * @param category 命名类别
   * @returns 该类别的规则数组
   */
  private getRulesByCategory(category: NamingCategory): NamingRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }
}
