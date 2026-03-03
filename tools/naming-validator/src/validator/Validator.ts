/**
 * 验证工具主类
 * 整合文件扫描、规则检查和报告生成功能
 */

import type { ValidationReport, ValidatorConfig } from '../types/index.js';
import { NamingRuleEngine } from '../naming-rules/NamingRuleEngine.js';
import { FileScanner } from './FileScanner.js';
import { RuleChecker } from './RuleChecker.js';
import { ReportGenerator, type ReportFormat } from './ReportGenerator.js';
import { 
  getHtmlIdRules, 
  getCssClassRules, 
  getDataAttrRules 
} from '../naming-rules/index.js';

/**
 * 验证工具类
 */
export class Validator {
  private ruleEngine: NamingRuleEngine;
  private config: ValidatorConfig;

  constructor(config: ValidatorConfig) {
    this.config = config;
    this.ruleEngine = new NamingRuleEngine();
    this.initializeRules();
  }

  /**
   * 初始化命名规则
   */
  private initializeRules(): void {
    // 注册HTML ID规则
    if (this.config.rules['html-id']) {
      this.ruleEngine.registerRules(getHtmlIdRules());
    }

    // 注册CSS类规则
    if (this.config.rules['css-class']) {
      this.ruleEngine.registerRules(getCssClassRules());
    }

    // 注册data属性规则
    if (this.config.rules['data-attr']) {
      this.ruleEngine.registerRules(getDataAttrRules());
    }
  }

  /**
   * 扫描目录并生成验证报告
   * @param dirPath 目录路径
   * @returns 验证报告
   */
  async scanDirectory(dirPath: string): Promise<ValidationReport> {
    // 扫描文件
    const scanner = new FileScanner();
    const scanResult = await scanner.scan({
      rootDir: dirPath,
      include: this.config.include,
      exclude: this.config.exclude,
    });

    // 检查文件
    const checker = new RuleChecker(this.ruleEngine, this.config);
    const allIssues = [];

    // 检查HTML文件
    for (const htmlFile of scanResult.htmlFiles) {
      const issues = await checker.checkHTMLFile(htmlFile);
      allIssues.push(...issues);
    }

    // 检查CSS文件
    for (const cssFile of scanResult.cssFiles) {
      const issues = await checker.checkCSSFile(cssFile);
      allIssues.push(...issues);
    }

    // 生成报告
    const generator = new ReportGenerator();
    return generator.generateReport(allIssues, scanResult.totalFiles);
  }

  /**
   * 验证单个文件
   * @param filePath 文件路径
   * @returns 验证报告
   */
  async validateFile(filePath: string): Promise<ValidationReport> {
    const checker = new RuleChecker(this.ruleEngine, this.config);
    const issues = [];

    if (filePath.endsWith('.html')) {
      issues.push(...await checker.checkHTMLFile(filePath));
    } else if (filePath.endsWith('.css')) {
      issues.push(...await checker.checkCSSFile(filePath));
    }

    const generator = new ReportGenerator();
    return generator.generateReport(issues, 1);
  }

  /**
   * 生成格式化的报告
   * @param report 验证报告
   * @param format 报告格式
   * @returns 格式化的报告字符串
   */
  generateReport(report: ValidationReport, format: ReportFormat): string {
    const generator = new ReportGenerator();
    return generator.formatReport(report, format);
  }
}
