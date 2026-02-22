#!/usr/bin/env node
/**
 * 安全审计工具
 * 
 * 功能：
 * - 扫描所有 innerHTML 使用
 * - 扫描 eval 和 Function 构造器
 * - 扫描不安全的 URL 处理
 * - 扫描 XSS 风险点
 * - 扫描不安全的事件处理
 * - 扫描不安全的数据绑定
 * - 生成安全审计报告（HTML + JSON）
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 类型定义
// ============================================================================

type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

interface SecurityRule {
  id: string;
  name: string;
  severity: SecuritySeverity;
  pattern?: RegExp;
  astChecker?: (node: ts.Node, sourceFile: ts.SourceFile) => boolean;
  message: string;
  recommendation: string;
}

interface SecurityIssue {
  ruleId: string;
  severity: SecuritySeverity;
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
  recommendation: string;
}

interface SecurityReport {
  summary: {
    totalIssues: number;
    bySeverity: Record<SecuritySeverity, number>;
    byFile: Record<string, number>;
    byCategory: Record<string, number>;
  };
  issues: SecurityIssue[];
  metrics: {
    totalFiles: number;
    totalLines: number;
    riskScore: number;
  };
  generatedAt: string;
}

interface AuditConfig {
  srcDir: string;
  excludeDirs: string[];
  excludeFiles: string[];
  outputDir: string;
  rules: SecurityRule[];
}

// ============================================================================
// 安全扫描规则配置
// ============================================================================

const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'innerHTML-usage',
    name: 'innerHTML 使用',
    severity: 'high',
    pattern: /\.innerHTML\s*=/,
    message: '使用 innerHTML 可能导致 XSS 攻击',
    recommendation: '使用 SafeRenderer.renderDynamic() 或 textContent 替代'
  },
  {
    id: 'outerHTML-usage',
    name: 'outerHTML 使用',
    severity: 'high',
    pattern: /\.outerHTML\s*=/,
    message: '使用 outerHTML 可能导致 XSS 攻击',
    recommendation: '使用 SafeRenderer 或 DOM API 替代'
  },
  {
    id: 'insertAdjacentHTML-usage',
    name: 'insertAdjacentHTML 使用',
    severity: 'high',
    pattern: /\.insertAdjacentHTML\(/,
    message: '使用 insertAdjacentHTML 可能导致 XSS 攻击',
    recommendation: '使用 SafeRenderer 或 insertAdjacentElement 替代'
  },
  {
    id: 'eval-usage',
    name: 'eval 使用',
    severity: 'critical',
    pattern: /\beval\s*\(/,
    message: '使用 eval 存在严重安全风险',
    recommendation: '避免使用 eval，使用 JSON.parse 或其他安全方法'
  },
  {
    id: 'function-constructor',
    name: 'Function 构造器',
    severity: 'critical',
    pattern: /new\s+Function\s*\(/,
    message: '使用 Function 构造器存在严重安全风险',
    recommendation: '避免动态创建函数，使用普通函数定义'
  },
  {
    id: 'document-write',
    name: 'document.write 使用',
    severity: 'high',
    pattern: /document\.write\(/,
    message: '使用 document.write 可能导致 XSS 攻击',
    recommendation: '使用 DOM API 或 SafeRenderer 替代'
  },
  {
    id: 'javascript-protocol',
    name: 'javascript: 协议',
    severity: 'critical',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile) => {
      // 检测 href="javascript:" 或类似的危险用法
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const text = node.getText(sourceFile);
        const value = text.slice(1, -1).toLowerCase(); // 移除引号
        
        // 如果包含 javascript: 协议
        if (value.includes('javascript:')) {
          // 检查是否在安全检查的上下文中
          const parent = node.parent;
          
          // 排除：数组字面量中的协议列表（安全检查）
          if (parent && ts.isArrayLiteralExpression(parent)) {
            const grandParent = parent.parent;
            if (grandParent && ts.isVariableDeclaration(grandParent)) {
              const varName = grandParent.name.getText(sourceFile).toLowerCase();
              if (varName.includes('dangerous') || varName.includes('protocol') || varName.includes('blocked')) {
                return false; // 这是安全检查代码
              }
            }
          }
          
          // 排除：条件判断中的检查（如 startsWith('javascript:')）
          if (parent && ts.isCallExpression(parent)) {
            const expression = parent.expression;
            if (ts.isPropertyAccessExpression(expression)) {
              const methodName = expression.name.text;
              if (methodName === 'startsWith' || methodName === 'includes' || methodName === 'test') {
                return false; // 这是安全检查代码
              }
            }
          }
          
          // 排除：注释中的说明
          const fullText = sourceFile.getFullText();
          const pos = node.getStart(sourceFile);
          const lineStart = fullText.lastIndexOf('\n', pos) + 1;
          const lineText = fullText.substring(lineStart, pos);
          if (lineText.includes('//') || lineText.trim().startsWith('*')) {
            return false; // 这是注释
          }
          
          // 检测真正的危险用法：href="javascript:" 或 onclick 中的使用
          const nodeText = sourceFile.getFullText().substring(
            Math.max(0, node.getStart(sourceFile) - 50),
            Math.min(sourceFile.getFullText().length, node.getEnd() + 50)
          );
          
          if (nodeText.includes('href=') || nodeText.includes('onclick=') || 
              nodeText.includes('src=') || nodeText.includes('action=')) {
            return true; // 这是真正的漏洞
          }
          
          return false;
        }
      }
      return false;
    },
    message: '使用 javascript: 协议存在 XSS 风险',
    recommendation: '使用事件监听器替代内联 JavaScript'
  },
  {
    id: 'data-uri-script',
    name: 'data: URI 脚本',
    severity: 'high',
    pattern: /data:text\/html|data:application\/javascript/i,
    message: '使用 data: URI 加载脚本存在安全风险',
    recommendation: '使用正常的脚本加载方式'
  },
  {
    id: 'unsafe-url-assignment',
    name: '不安全的 URL 赋值',
    pattern: /(?:location|window\.location|document\.location)(?:\.href)?\s*=\s*(?!['"](?:https?:\/\/|\/)[^'"]*['"])[^;]+/,
    severity: 'high',
    message: '直接赋值动态 URL 可能导致开放重定向漏洞',
    recommendation: '验证 URL 来源，使用白名单机制或 URL 验证函数'
  },
  {
    id: 'unsafe-url-search-params',
    name: '不安全的 URL 参数使用',
    pattern: /(?:location\.search|window\.location\.search|URLSearchParams|new\s+URL\([^)]*\)).*(?:redirect|return|url|goto|next)/i,
    severity: 'medium',
    message: 'URL 参数中的重定向目标未经验证可能导致开放重定向',
    recommendation: '验证重定向目标 URL，使用白名单或相对路径'
  },
  {
    id: 'unsafe-url-hash',
    name: '不安全的 URL hash 使用',
    pattern: /(?:location\.hash|window\.location\.hash)\s*=\s*[^;]+/,
    severity: 'low',
    message: '动态设置 URL hash 可能导致 DOM XSS',
    recommendation: '验证和转义 hash 值'
  },
  {
    id: 'unsafe-window-open',
    name: '不安全的 window.open',
    pattern: /window\.open\([^)]*\+[^)]*\)/,
    severity: 'medium',
    message: '动态构造 window.open URL 可能导致开放重定向',
    recommendation: '验证 URL 参数，使用白名单机制'
  },
  {
    id: 'unsafe-iframe-src',
    name: '不安全的 iframe src',
    pattern: /\.src\s*=\s*[^;'"]*\+[^;]*/,
    severity: 'high',
    message: '动态设置 iframe src 可能导致安全风险',
    recommendation: '验证 URL 来源，使用 CSP 和 sandbox 属性'
  },
  {
    id: 'unsafe-fetch-url',
    name: '不安全的 fetch URL',
    pattern: /fetch\([^)]*\+[^)]*\)/,
    severity: 'medium',
    message: '动态构造 fetch URL 可能导致 SSRF 攻击',
    recommendation: '验证 URL 参数，使用白名单或 URL 解析验证'
  },
  {
    id: 'unsafe-xhr-url',
    name: '不安全的 XMLHttpRequest URL',
    pattern: /\.open\([^,]*,\s*[^)]*\+[^)]*\)/,
    severity: 'medium',
    message: '动态构造 XMLHttpRequest URL 可能导致 SSRF 攻击',
    recommendation: '验证 URL 参数，使用白名单机制'
  },
  {
    id: 'unsafe-anchor-href',
    name: '不安全的 anchor href',
    pattern: /\.href\s*=\s*[^;'"]*\+[^;]*/,
    severity: 'medium',
    message: '动态设置 anchor href 可能导致开放重定向',
    recommendation: '验证 URL，使用相对路径或白名单'
  },
  {
    id: 'unsafe-postmessage',
    name: '不安全的 postMessage',
    pattern: /\.postMessage\([^,]+,\s*['"]?\*['"]?\)/,
    severity: 'high',
    message: 'postMessage 使用通配符 * 存在安全风险',
    recommendation: '指定明确的目标源（origin）'
  },
  {
    id: 'unsafe-cors',
    name: '不安全的 CORS 配置',
    pattern: /Access-Control-Allow-Origin:\s*\*/,
    severity: 'medium',
    message: 'CORS 配置使用通配符存在安全风险',
    recommendation: '指定明确的允许源'
  },
  {
    id: 'unsafe-regex',
    name: '不安全的正则表达式',
    pattern: /new\s+RegExp\([^)]*\+[^)]*\)/,
    severity: 'medium',
    message: '动态构造正则表达式可能导致 ReDoS 攻击',
    recommendation: '使用静态正则表达式或验证输入'
  },
  {
    id: 'localstorage-sensitive',
    name: 'localStorage 存储敏感数据',
    pattern: /localStorage\.setItem\([^)]*(?:password|token|secret|key|credential)[^)]*\)/i,
    severity: 'high',
    message: 'localStorage 存储敏感数据存在安全风险',
    recommendation: '使用加密存储或 sessionStorage'
  },
  {
    id: 'unsafe-event-handler',
    name: '不安全的事件处理器',
    pattern: /on(?:click|load|error|mouseover)\s*=\s*['"][^'"]*['"]/i,
    severity: 'medium',
    message: '内联事件处理器可能导致 XSS 攻击',
    recommendation: '使用 addEventListener 替代内联事件处理器'
  },
  {
    id: 'unsafe-srcdoc',
    name: '不安全的 srcdoc',
    pattern: /<iframe[^>]*srcdoc\s*=/i,
    severity: 'high',
    message: 'iframe srcdoc 可能导致 XSS 攻击',
    recommendation: '验证和转义 srcdoc 内容'
  },
  {
    id: 'unsafe-dangerouslySetInnerHTML',
    name: 'dangerouslySetInnerHTML 使用',
    pattern: /dangerouslySetInnerHTML/,
    severity: 'critical',
    message: '使用 dangerouslySetInnerHTML 存在 XSS 风险',
    recommendation: '使用安全的渲染方法或严格验证内容'
  },
  {
    id: 'sql-injection-risk',
    name: 'SQL 注入风险',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\+.*(?:FROM|INTO|SET|TABLE)/i,
    severity: 'critical',
    message: '字符串拼接 SQL 语句可能导致 SQL 注入',
    recommendation: '使用参数化查询或 ORM'
  },
  {
    id: 'command-injection-risk',
    name: '命令注入风险',
    pattern: /(?:exec|spawn|execSync|spawnSync)\([^)]*\+[^)]*\)/,
    severity: 'critical',
    message: '动态构造命令可能导致命令注入',
    recommendation: '验证输入，使用参数数组而非字符串拼接'
  },
  {
    id: 'path-traversal-risk',
    name: '路径遍历风险',
    pattern: /(?:readFile|writeFile|unlink|rmdir)\([^)]*\+[^)]*\)/,
    severity: 'high',
    message: '动态构造文件路径可能导致路径遍历攻击',
    recommendation: '验证和规范化文件路径，使用白名单'
  },
  {
    id: 'unsafe-random',
    name: '不安全的随机数',
    pattern: /Math\.random\(\)/,
    severity: 'low',
    message: 'Math.random() 不适合安全相关场景',
    recommendation: '使用 crypto.randomBytes() 或 crypto.getRandomValues()'
  },
  {
    id: 'unsafe-url-constructor',
    name: '不安全的 URL 构造',
    severity: 'medium',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile) => {
      // 检测 new URL(userInput) 或 new URL(variable + something)
      if (ts.isNewExpression(node)) {
        const expression = node.expression;
        if (ts.isIdentifier(expression) && expression.text === 'URL') {
          const args = node.arguments;
          if (args && args.length > 0) {
            const firstArg = args[0];
            // 检查是否是二元表达式（字符串拼接）
            if (ts.isBinaryExpression(firstArg) && firstArg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
              return true;
            }
            // 检查是否是模板字符串
            if (ts.isTemplateExpression(firstArg)) {
              return true;
            }
          }
        }
      }
      return false;
    },
    message: '使用未验证的输入构造 URL 可能导致安全风险',
    recommendation: '验证 URL 参数，使用 URL 解析和白名单验证'
  },
  {
    id: 'unsafe-location-replace',
    name: '不安全的 location.replace',
    severity: 'high',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile) => {
      // 检测 location.replace(userInput) 或 window.location.replace(variable + something)
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isPropertyAccessExpression(expression)) {
          const name = expression.name.text;
          if (name === 'replace' || name === 'assign') {
            const object = expression.expression;
            const objectText = object.getText(sourceFile);
            if (objectText.includes('location')) {
              const args = node.arguments;
              if (args && args.length > 0) {
                const firstArg = args[0];
                // 检查是否是二元表达式或模板字符串
                if (ts.isBinaryExpression(firstArg) || ts.isTemplateExpression(firstArg)) {
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    },
    message: '使用未验证的输入调用 location.replace/assign 可能导致开放重定向',
    recommendation: '验证重定向目标，使用白名单或相对路径'
  },
  {
    id: 'unsafe-url-protocol',
    name: '不安全的 URL 协议',
    severity: 'high',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile) => {
      // 检测动态设置 URL 协议
      if (ts.isPropertyAccessExpression(node)) {
        const parent = node.parent;
        if (parent && ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          const name = node.name.text;
          if (name === 'protocol') {
            const object = node.expression;
            const objectText = object.getText(sourceFile);
            if (objectText.includes('location') || objectText.includes('URL')) {
              return true;
            }
          }
        }
      }
      return false;
    },
    message: '动态设置 URL 协议可能导致协议混淆攻击',
    recommendation: '避免动态设置协议，使用固定的 https:// 或 http://'
  }
];

// ============================================================================
// 配置
// ============================================================================

const CONFIG: AuditConfig = {
  srcDir: path.join(__dirname, '../src'),
  excludeDirs: ['node_modules', 'dist', 'build', '.git', 'coverage'],
  excludeFiles: ['.d.ts', '.test.ts', '.spec.ts'],
  outputDir: path.join(__dirname, '../tests/quality'),
  rules: SECURITY_RULES
};

// ============================================================================
// 安全审计器类
// ============================================================================

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private totalFiles = 0;
  private totalLines = 0;
  private fileIssueCount: Map<string, number> = new Map();
  private categoryCount: Map<string, number> = new Map();

  /**
   * 扫描目录
   */
  public scan(directory: string): void {
    this.scanDirectory(directory);
  }

  /**
   * 递归扫描目录
   */
  private scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      console.error(`目录不存在: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (CONFIG.excludeDirs.includes(entry.name)) {
          continue;
        }
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        if (this.shouldScanFile(entry.name)) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * 判断是否应该扫描文件
   */
  private shouldScanFile(filename: string): boolean {
    for (const exclude of CONFIG.excludeFiles) {
      if (filename.endsWith(exclude)) {
        return false;
      }
    }
    return /\.(ts|tsx|js|jsx|html)$/.test(filename);
  }

  /**
   * 扫描单个文件
   */
  private scanFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);

      this.totalFiles++;
      this.totalLines += content.split('\n').length;

      // 基于正则表达式的扫描
      this.scanWithRegex(content, relativePath);

      // 基于 AST 的扫描（仅对 TypeScript/JavaScript 文件）
      if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
        this.scanWithAST(content, relativePath);
      }
    } catch (error) {
      console.error(`扫描文件失败: ${filePath}`, error);
    }
  }

  /**
   * 使用正则表达式扫描
   */
  private scanWithRegex(content: string, filePath: string): void {
    const lines = content.split('\n');

    for (const rule of CONFIG.rules) {
      if (!rule.pattern) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 跳过注释行
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
          continue;
        }

        const match = rule.pattern.exec(line);

        if (match) {
          this.addIssue({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            code: line.trim(),
            recommendation: rule.recommendation
          });
        }

        rule.pattern.lastIndex = 0;
      }
    }
  }

  /**
   * 使用 AST 扫描
   */
  private scanWithAST(content: string, filePath: string): void {
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node): void => {
        for (const rule of CONFIG.rules) {
          if (rule.astChecker && rule.astChecker(node, sourceFile)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(
              node.getStart(sourceFile)
            );

            const codePreview = node.getText(sourceFile).split('\n')[0].trim();

            this.addIssue({
              ruleId: rule.id,
              severity: rule.severity,
              message: rule.message,
              file: filePath,
              line: line + 1,
              column: character + 1,
              code: codePreview.length > 100 ? codePreview.substring(0, 100) + '...' : codePreview,
              recommendation: rule.recommendation
            });
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (error) {
      // AST 解析失败，跳过
    }
  }

  /**
   * 添加问题
   */
  private addIssue(issue: SecurityIssue): void {
    this.issues.push(issue);

    // 更新文件问题计数
    const count = this.fileIssueCount.get(issue.file) || 0;
    this.fileIssueCount.set(issue.file, count + 1);

    // 更新分类计数
    const category = this.getCategoryFromRuleId(issue.ruleId);
    const categoryCount = this.categoryCount.get(category) || 0;
    this.categoryCount.set(category, categoryCount + 1);
  }

  /**
   * 从规则 ID 获取分类
   */
  private getCategoryFromRuleId(ruleId: string): string {
    if (ruleId.includes('innerHTML') || ruleId.includes('outerHTML') || ruleId.includes('insertAdjacentHTML')) {
      return 'XSS - DOM 操作';
    }
    if (ruleId.includes('eval') || ruleId.includes('function-constructor')) {
      return '代码注入';
    }
    if (ruleId.includes('sql')) {
      return 'SQL 注入';
    }
    if (ruleId.includes('command')) {
      return '命令注入';
    }
    if (ruleId.includes('path')) {
      return '路径遍历';
    }
    if (ruleId.includes('url') || ruleId.includes('redirect') || ruleId.includes('location') || 
        ruleId.includes('window-open') || ruleId.includes('iframe') || ruleId.includes('anchor') ||
        ruleId.includes('fetch') || ruleId.includes('xhr')) {
      return 'URL 安全与开放重定向';
    }
    if (ruleId.includes('postmessage') || ruleId.includes('cors')) {
      return '跨域安全';
    }
    if (ruleId.includes('localstorage')) {
      return '数据存储';
    }
    if (ruleId.includes('random')) {
      return '密码学';
    }
    return '其他';
  }

  /**
   * 生成报告
   */
  public generateReport(): SecurityReport {
    const bySeverity: Record<SecuritySeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const issue of this.issues) {
      bySeverity[issue.severity]++;
    }

    const byFile: Record<string, number> = {};
    for (const [file, count] of this.fileIssueCount.entries()) {
      byFile[file] = count;
    }

    const byCategory: Record<string, number> = {};
    for (const [category, count] of this.categoryCount.entries()) {
      byCategory[category] = count;
    }

    // 计算风险分数（0-100，越高越危险）
    const riskScore = this.calculateRiskScore(bySeverity);

    return {
      summary: {
        totalIssues: this.issues.length,
        bySeverity,
        byFile,
        byCategory
      },
      issues: this.issues,
      metrics: {
        totalFiles: this.totalFiles,
        totalLines: this.totalLines,
        riskScore
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 计算风险分数
   */
  private calculateRiskScore(bySeverity: Record<SecuritySeverity, number>): number {
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };

    const totalWeight = 
      bySeverity.critical * weights.critical +
      bySeverity.high * weights.high +
      bySeverity.medium * weights.medium +
      bySeverity.low * weights.low;

    // 归一化到 0-100
    const maxScore = 100;
    const score = Math.min(maxScore, totalWeight);

    return Math.round(score);
  }

  /**
   * 保存 JSON 报告
   */
  public saveJSONReport(report: SecurityReport, outputPath: string): void {
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`✅ JSON 报告已保存: ${outputPath}`);
  }

  /**
   * 保存 HTML 报告
   */
  public saveHTMLReport(report: SecurityReport, outputPath: string): void {
    const html = this.generateHTML(report);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ HTML 报告已保存: ${outputPath}`);
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTML(report: SecurityReport): string {
    const severityColors: Record<SecuritySeverity, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#10b981'
    };

    const severityIcons: Record<SecuritySeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const riskLevel = report.metrics.riskScore >= 70 ? '高风险' :
                      report.metrics.riskScore >= 40 ? '中风险' : '低风险';
    const riskColor = report.metrics.riskScore >= 70 ? '#dc2626' :
                      report.metrics.riskScore >= 40 ? '#f59e0b' : '#10b981';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>安全审计报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { color: #111827; margin-bottom: 0.5rem; }
    .meta { color: #6b7280; font-size: 0.875rem; }
    .risk-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .risk-score {
      font-size: 4rem;
      font-weight: bold;
      color: ${riskColor};
    }
    .risk-label { color: #6b7280; margin-top: 0.5rem; }
    .risk-level {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      margin-top: 1rem;
      background: ${riskColor};
      color: white;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-label { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #111827; }
    .severity-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
    }
    .category-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }
    .category-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .issues {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .issues-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .issue {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .issue:last-child { border-bottom: none; }
    .issue-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .issue-message { font-weight: 500; color: #111827; }
    .issue-location { color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem; }
    .issue-code {
      background: #f9fafb;
      padding: 0.75rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      overflow-x: auto;
    }
    .issue-recommendation {
      background: #dbeafe;
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      color: #1e40af;
    }
    .recommendation-label {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 安全审计报告</h1>
      <div class="meta">生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}</div>
    </div>

    <div class="risk-card">
      <div class="risk-score">${report.metrics.riskScore}</div>
      <div class="risk-label">风险分数</div>
      <span class="risk-level">${riskLevel}</span>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">总问题数</div>
        <div class="stat-value">${report.summary.totalIssues}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">扫描文件数</div>
        <div class="stat-value">${report.metrics.totalFiles}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总代码行数</div>
        <div class="stat-value">${report.metrics.totalLines.toLocaleString()}</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">🔴 严重</div>
        <div class="stat-value" style="color: ${severityColors.critical}">${report.summary.bySeverity.critical}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟠 高</div>
        <div class="stat-value" style="color: ${severityColors.high}">${report.summary.bySeverity.high}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟡 中</div>
        <div class="stat-value" style="color: ${severityColors.medium}">${report.summary.bySeverity.medium}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟢 低</div>
        <div class="stat-value" style="color: ${severityColors.low}">${report.summary.bySeverity.low}</div>
      </div>
    </div>

    <div class="category-section">
      <div class="category-header">
        <h2>问题分类统计</h2>
      </div>
      <div style="padding: 1.5rem;">
        ${Object.entries(report.summary.byCategory).map(([category, count]) => `
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
            <span>${category}</span>
            <span style="font-weight: 600;">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="issues">
      <div class="issues-header">
        <h2>问题详情</h2>
      </div>
      ${report.issues.map(issue => `
        <div class="issue">
          <div class="issue-header">
            <span class="severity-badge" style="background: ${severityColors[issue.severity]}">
              ${severityIcons[issue.severity]} ${issue.severity.toUpperCase()}
            </span>
            <span class="issue-message">${issue.message}</span>
          </div>
          <div class="issue-location">
            📁 ${issue.file} (行 ${issue.line}, 列 ${issue.column})
          </div>
          ${issue.code ? `<div class="issue-code">${this.escapeHtml(issue.code)}</div>` : ''}
          <div class="issue-recommendation">
            <div class="recommendation-label">💡 建议：</div>
            ${issue.recommendation}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// ============================================================================
// 主函数
// ============================================================================

function main(): void {
  console.log('🔒 开始安全审计...\n');

  // 创建审计器
  const auditor = new SecurityAuditor();

  // 扫描源代码目录
  auditor.scan(CONFIG.srcDir);

  // 生成报告
  const report = auditor.generateReport();

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const jsonPath = path.join(CONFIG.outputDir, `security-audit-${timestamp}.json`);
  const htmlPath = path.join(CONFIG.outputDir, `security-audit-${timestamp}.html`);

  auditor.saveJSONReport(report, jsonPath);
  auditor.saveHTMLReport(report, htmlPath);

  // 打印摘要
  console.log('\n📊 安全审计完成！');
  console.log('=====================================');
  console.log(`总问题数: ${report.summary.totalIssues}`);
  console.log(`  🔴 严重: ${report.summary.bySeverity.critical}`);
  console.log(`  🟠 高: ${report.summary.bySeverity.high}`);
  console.log(`  🟡 中: ${report.summary.bySeverity.medium}`);
  console.log(`  🟢 低: ${report.summary.bySeverity.low}`);
  console.log(`扫描文件数: ${report.metrics.totalFiles}`);
  console.log(`总代码行数: ${report.metrics.totalLines.toLocaleString()}`);
  console.log(`风险分数: ${report.metrics.riskScore}/100`);
  console.log('=====================================');

  // 按分类显示统计
  if (Object.keys(report.summary.byCategory).length > 0) {
    console.log('\n📋 问题分类统计:');
    for (const [category, count] of Object.entries(report.summary.byCategory)) {
      console.log(`  ${category}: ${count}`);
    }
  }

  // 显示最严重的问题
  const criticalIssues = report.issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    console.log('\n🚨 严重问题（需立即修复）:');
    criticalIssues.slice(0, 5).forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.message}`);
      console.log(`     位置: ${issue.file}:${issue.line}`);
      console.log(`     建议: ${issue.recommendation}`);
    });
    if (criticalIssues.length > 5) {
      console.log(`  ... 还有 ${criticalIssues.length - 5} 个严重问题`);
    }
  }

  console.log('\n');

  // 如果有严重或高优先级问题，返回非零退出码
  if (report.summary.bySeverity.critical > 0 || report.summary.bySeverity.high > 0) {
    console.log('⚠️  发现严重或高优先级安全问题，建议立即修复！');
    process.exit(1);
  } else if (report.summary.totalIssues > 0) {
    console.log('⚠️  发现安全问题，建议尽快修复。');
    process.exit(0);
  } else {
    console.log('✅ 未发现安全问题！');
    process.exit(0);
  }
}

// 运行主函数
const isMainModule = () => {
  if (typeof process.argv[1] === 'undefined') return false;
  
  const scriptPath = fileURLToPath(import.meta.url);
  const argPath = path.resolve(process.argv[1]);
  
  return scriptPath === argPath;
};

if (isMainModule()) {
  main();
}

export { SecurityAuditor, SecurityReport, SecurityIssue, SecurityRule };
