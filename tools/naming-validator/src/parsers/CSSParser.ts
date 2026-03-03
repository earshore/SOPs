/**
 * CSS解析器
 * 使用PostCSS解析CSS文件，提取和更新CSS规则
 */

import postcss, { Root, Rule, AtRule } from 'postcss';
import { readFileSync, writeFileSync } from 'fs';
import type { CSSRule, SourceLocation, CSSRuleType } from '../types/index.js';

/**
 * 规则修改记录
 */
interface RuleChange {
  rule: CSSRule;
  type: 'selector';
  oldValue: string;
  newValue: string;
}

/**
 * CSS解析器类
 * 负责解析CSS文件、提取规则信息和更新选择器
 */
export class CSSParser {
  private ast: Root | null = null;
  private filePath: string = '';
  private originalContent: string = '';
  private changes: RuleChange[] = [];

  /**
   * 解析CSS文件
   * @param filePath CSS文件路径
   * @returns 解析出的CSS规则数组
   */
  parse(filePath: string): CSSRule[] {
    this.filePath = filePath;
    this.originalContent = readFileSync(filePath, 'utf-8');
    this.changes = [];
    
    // 使用PostCSS解析CSS
    this.ast = postcss.parse(this.originalContent, { from: filePath });
    
    const rules: CSSRule[] = [];
    
    // 遍历所有规则
    this.ast.walkRules((rule: Rule) => {
      const selector = rule.selector;
      const classes = this.extractClasses(selector);
      
      // 只处理包含类选择器的规则
      if (classes.length > 0) {
        const ruleType = this.identifyRuleType(selector, classes);
        
        rules.push({
          selector,
          classes,
          location: this.getRuleLocation(rule),
          type: ruleType,
          rule, // 保存规则引用以便后续更新
        });
      }
    });
    
    return rules;
  }

  /**
   * 从选择器中提取类名
   * @param selector CSS选择器
   * @returns 类名数组
   */
  extractClasses(selector: string): string[] {
    const classes: string[] = [];
    
    // 匹配类选择器 .class-name
    const classPattern = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;
    
    while ((match = classPattern.exec(selector)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  /**
   * 识别CSS规则类型
   * @param selector 选择器
   * @param classes 类名数组
   * @returns 规则类型
   */
  private identifyRuleType(selector: string, classes: string[]): CSSRuleType {
    // 检查是否为模块类（带有模块前缀）
    const modulePattern = /^(app|sop|hub)-/;
    if (classes.some(cls => modulePattern.test(cls))) {
      return 'module';
    }
    
    // 检查是否为工具类（简短的单一功能类）
    // 工具类通常是单个类选择器，且不包含BEM分隔符
    if (classes.length === 1 && !classes[0].includes('__') && !classes[0].includes('--')) {
      // 常见的工具类模式
      const utilityPatterns = [
        /^(is|has)-/,  // 状态类
        /^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py)-/,  // 间距类
        /^(text|bg|border|flex|grid|hidden|block|inline)-/,  // 常见工具类前缀
      ];
      
      if (utilityPatterns.some(pattern => pattern.test(classes[0]))) {
        return 'utility';
      }
    }
    
    // 检查是否为BEM组件类
    if (classes.some(cls => cls.includes('__') || cls.includes('--'))) {
      return 'component';
    }
    
    // 默认为组件类
    return 'component';
  }

  /**
   * 获取规则在源文件中的位置
   * @param rule PostCSS规则
   * @returns 源代码位置
   */
  private getRuleLocation(rule: Rule): SourceLocation {
    return {
      filePath: this.filePath,
      line: rule.source?.start?.line || 1,
      column: rule.source?.start?.column || 1,
    };
  }

  /**
   * 更新CSS规则的选择器
   * @param cssRule CSS规则
   * @param newSelector 新的选择器
   */
  updateSelector(cssRule: CSSRule, newSelector: string): void {
    if (!this.ast) {
      throw new Error('必须先调用parse方法解析CSS文件');
    }
    
    if (cssRule.rule) {
      // 记录修改
      this.changes.push({
        rule: cssRule,
        type: 'selector',
        oldValue: cssRule.selector,
        newValue: newSelector,
      });
      
      cssRule.rule.selector = newSelector;
      cssRule.selector = newSelector;
      
      // 更新类名列表
      cssRule.classes = this.extractClasses(newSelector);
    }
  }

  /**
   * 序列化AST为CSS字符串，保留原始格式
   * @returns CSS字符串
   */
  serialize(): string {
    if (!this.ast) {
      throw new Error('必须先调用parse方法解析CSS文件');
    }
    
    // PostCSS会自动保留原始格式和注释
    return this.ast.toString();
  }

  /**
   * 保存修改后的CSS到文件
   * @param outputPath 输出文件路径（可选，默认覆盖原文件）
   */
  save(outputPath?: string): void {
    const content = this.serialize();
    const targetPath = outputPath || this.filePath;
    writeFileSync(targetPath, content, 'utf-8');
  }

  /**
   * 获取当前AST对象
   * @returns PostCSS Root实例
   */
  getAST(): Root | null {
    return this.ast;
  }

  /**
   * 获取原始文件内容
   * @returns 原始CSS内容
   */
  getOriginalContent(): string {
    return this.originalContent;
  }

  /**
   * 获取所有修改记录
   * @returns 修改记录数组
   */
  getChanges(): RuleChange[] {
    return [...this.changes];
  }

  /**
   * 清除所有修改记录
   */
  clearChanges(): void {
    this.changes = [];
  }
}
