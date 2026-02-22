#!/usr/bin/env node
/**
 * 技术债务扫描工具
 * 
 * 功能：
 * - 扫描代码中的 TODO、FIXME、HACK 注释
 * - 扫描 @ts-ignore 和 @ts-expect-error
 * - 扫描 any 类型使用
 * - 扫描 console.log 调试代码
 * - 扫描重复代码块（> 10 行）
 * - 扫描过长函数（> 100 行）
 * - 扫描过深嵌套（> 4 层）
 * - 生成 HTML 和 JSON 报告
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

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface ScanRule {
  id: string;
  name: string;
  severity: Severity;
  pattern?: RegExp;
  astChecker?: (node: ts.Node, sourceFile: ts.SourceFile) => boolean;
  message: string;
}

interface TechDebtIssue {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
}

interface TechDebtReport {
  summary: {
    totalIssues: number;
    bySeverity: Record<Severity, number>;
    byFile: Record<string, number>;
  };
  issues: TechDebtIssue[];
  metrics: {
    totalFiles: number;
    totalLines: number;
    debtRatio: number;
  };
  generatedAt: string;
}

interface ScanConfig {
  srcDir: string;
  excludeDirs: string[];
  excludeFiles: string[];
  outputDir: string;
  rules: ScanRule[];
}

// ============================================================================
// 扫描规则配置
// ============================================================================

const SCAN_RULES: ScanRule[] = [
  {
    id: 'todo-comment',
    name: 'TODO 注释',
    severity: 'low',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*TODO:/i,
    message: '存在未完成的 TODO 注释'
  },
  {
    id: 'fixme-comment',
    name: 'FIXME 注释',
    severity: 'medium',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*FIXME:/i,
    message: '存在需要修复的 FIXME 注释'
  },
  {
    id: 'hack-comment',
    name: 'HACK 注释',
    severity: 'high',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*HACK:/i,
    message: '存在临时解决方案 HACK 注释'
  },
  {
    id: 'ts-ignore',
    name: 'TypeScript 忽略',
    severity: 'medium',
    pattern: /^\s*\/\/\s*@ts-ignore(?:\s|$)/,
    message: '使用了 @ts-ignore 忽略类型检查'
  },
  {
    id: 'ts-expect-error',
    name: 'TypeScript 预期错误',
    severity: 'low',
    pattern: /^\s*\/\/\s*@ts-expect-error(?:\s|$)/,
    message: '使用了 @ts-expect-error'
  },
  {
    id: 'console-log',
    name: '调试日志',
    severity: 'low',
    pattern: /console\.(log|debug|info)\(/,
    message: '存在调试用的 console 语句'
  },
  {
    id: 'console-warn',
    name: '警告日志',
    severity: 'low',
    pattern: /console\.warn\(/,
    message: '存在 console.warn 语句'
  },
  {
    id: 'any-type',
    name: 'any 类型',
    severity: 'medium',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile): boolean => {
      // 1. 检查变量声明 (let x: any)
      if (ts.isVariableDeclaration(node) && node.type) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 2. 检查参数声明 (function foo(x: any))
      if (ts.isParameter(node) && node.type) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 3. 检查函数返回类型 (function foo(): any)
      if (
        (ts.isFunctionDeclaration(node) || 
         ts.isMethodDeclaration(node) || 
         ts.isArrowFunction(node) ||
         ts.isFunctionExpression(node)) &&
        node.type
      ) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 4. 检查属性声明 (class Foo { x: any })
      if (ts.isPropertyDeclaration(node) && node.type) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 5. 检查类型别名 (type Foo = any)
      if (ts.isTypeAliasDeclaration(node)) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any' || typeText.includes('any')) return true;
      }

      // 6. 检查接口属性 (interface Foo { x: any })
      if (ts.isPropertySignature(node) && node.type) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 7. 检查接口方法签名 (interface Foo { method(): any })
      if (ts.isMethodSignature(node)) {
        // 检查返回类型
        if (node.type) {
          const typeText = node.type.getText(sourceFile);
          if (typeText === 'any') return true;
        }
        // 参数会被单独的 isParameter 检查捕获
      }

      // 8. 检查类型断言 (x as any)
      if (ts.isAsExpression(node)) {
        const typeText = node.type.getText(sourceFile);
        if (typeText === 'any') return true;
      }

      // 9. 检查 any 关键字节点本身
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        return true;
      }

      return false;
    },
    message: '使用了 any 类型'
  },
  {
    id: 'long-function',
    name: '过长函数',
    severity: 'medium',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile): boolean => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      ) {
        // 获取函数体的起始和结束位置
        const body = ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node)
          ? node.body
          : ts.isArrowFunction(node) && ts.isBlock(node.body)
          ? node.body
          : null;

        if (!body) {
          // 箭头函数可能没有块体（如 () => expr）
          return false;
        }

        // 计算函数体的实际行数（不包括前导空白）
        const startPos = body.getStart(sourceFile);
        const endPos = body.getEnd();
        const bodyText = sourceFile.text.substring(startPos, endPos);
        
        // 计算非空行数
        const lines = bodyText.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
        
        return nonEmptyLines > 100;
      }
      return false;
    },
    message: '函数超过 100 行'
  },
  {
    id: 'deep-nesting',
    name: '过深嵌套',
    severity: 'medium',
    astChecker: (node: ts.Node, sourceFile: ts.SourceFile): boolean => {
      // 只检查控制流语句节点本身
      if (
        !ts.isIfStatement(node) &&
        !ts.isForStatement(node) &&
        !ts.isWhileStatement(node) &&
        !ts.isDoStatement(node) &&
        !ts.isSwitchStatement(node) &&
        !ts.isTryStatement(node)
      ) {
        return false;
      }

      // 计算当前节点的嵌套深度
      // 向上遍历父节点，统计控制流语句的数量
      let depth = 0;
      let current: ts.Node | undefined = node.parent;
      
      while (current) {
        // 检查父节点是否是控制流语句
        if (
          ts.isIfStatement(current) ||
          ts.isForStatement(current) ||
          ts.isWhileStatement(current) ||
          ts.isDoStatement(current) ||
          ts.isSwitchStatement(current) ||
          ts.isTryStatement(current)
        ) {
          depth++;
        }
        
        // 如果到达函数边界，停止计数
        if (
          ts.isFunctionDeclaration(current) ||
          ts.isMethodDeclaration(current) ||
          ts.isArrowFunction(current) ||
          ts.isFunctionExpression(current)
        ) {
          break;
        }
        
        current = current.parent;
      }
      
      // 当前节点本身也算一层，所以总深度是 depth + 1
      return (depth + 1) > 4;
    },
    message: '嵌套深度超过 4 层'
  },
  {
    id: 'duplicate-code',
    name: '重复代码',
    severity: 'medium',
    // 注意：此规则通过 scanDuplicateCode 方法单独处理
    message: '发现重复代码块'
  }
];

// ============================================================================
// 配置
// ============================================================================

const CONFIG: ScanConfig = {
  srcDir: path.join(__dirname, '../src'),
  excludeDirs: ['node_modules', 'dist', 'build', '.git'],
  excludeFiles: ['.d.ts'],
  outputDir: path.join(__dirname, '../tests/quality'),
  rules: SCAN_RULES
};

// ============================================================================
// 扫描器类
// ============================================================================

class TechDebtScanner {
  private issues: TechDebtIssue[] = [];
  private totalFiles = 0;
  private totalLines = 0;
  private fileIssueCount: Map<string, number> = new Map();

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
        // 跳过排除的目录
        if (CONFIG.excludeDirs.includes(entry.name)) {
          continue;
        }
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // 只扫描 TypeScript 和 JavaScript 文件
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
    // 跳过排除的文件类型
    for (const exclude of CONFIG.excludeFiles) {
      if (filename.endsWith(exclude)) {
        return false;
      }
    }

    // 只扫描 .ts, .tsx, .js, .jsx 文件
    return /\.(ts|tsx|js|jsx)$/.test(filename);
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

      // 基于 AST 的扫描（仅对 TypeScript 文件）
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        this.scanWithAST(content, relativePath);
      }

      // 扫描重复代码
      this.scanDuplicateCode(content, relativePath);
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
        const match = rule.pattern.exec(line);

        if (match) {
          this.addIssue({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            code: line.trim()
          });
        }

        // 重置正则表达式的 lastIndex
        rule.pattern.lastIndex = 0;
      }
    }
  }

  /**
   * 使用 AST 扫描
   */
  private scanWithAST(content: string, filePath: string): void {
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

          // 为过长函数规则添加额外的上下文信息
          let message = rule.message;
          let codePreview = node.getText(sourceFile).split('\n')[0].trim();

          if (rule.id === 'long-function') {
            const functionInfo = this.getFunctionInfo(node, sourceFile);
            message = `${functionInfo.type}${functionInfo.name ? ` '${functionInfo.name}'` : ''} 超过 100 行（实际: ${functionInfo.lines} 行）`;
            codePreview = functionInfo.signature;
          } else if (rule.id === 'deep-nesting') {
            // 为过深嵌套规则添加深度信息
            const nestingInfo = this.getNestingInfo(node, sourceFile);
            message = `${nestingInfo.statementType} 嵌套深度超过 4 层（实际: ${nestingInfo.depth} 层）`;
            codePreview = nestingInfo.preview;
          }

          this.addIssue({
            ruleId: rule.id,
            severity: rule.severity,
            message,
            file: filePath,
            line: line + 1,
            column: character + 1,
            code: codePreview
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * 获取函数信息（名称、类型、行数）
   */
  private getFunctionInfo(node: ts.Node, sourceFile: ts.SourceFile): {
    name: string;
    type: string;
    lines: number;
    signature: string;
  } {
    let name = '';
    let type = '';
    let lines = 0;
    let signature = '';

    if (ts.isFunctionDeclaration(node)) {
      type = '函数';
      name = node.name?.getText(sourceFile) || '<匿名>';
      
      // 获取函数签名（不包括函数体）
      const bodyStart = node.body?.getStart(sourceFile) || node.getEnd();
      signature = sourceFile.text.substring(node.getStart(sourceFile), bodyStart).trim();
      
      // 计算函数体行数
      if (node.body) {
        const bodyText = node.body.getText(sourceFile);
        lines = bodyText.split('\n').filter(line => line.trim().length > 0).length;
      }
    } else if (ts.isMethodDeclaration(node)) {
      type = '方法';
      name = node.name.getText(sourceFile);
      
      // 获取方法签名
      const bodyStart = node.body?.getStart(sourceFile) || node.getEnd();
      signature = sourceFile.text.substring(node.getStart(sourceFile), bodyStart).trim();
      
      // 计算方法体行数
      if (node.body) {
        const bodyText = node.body.getText(sourceFile);
        lines = bodyText.split('\n').filter(line => line.trim().length > 0).length;
      }
    } else if (ts.isArrowFunction(node)) {
      type = '箭头函数';
      
      // 尝试获取变量名
      if (node.parent && ts.isVariableDeclaration(node.parent)) {
        name = node.parent.name.getText(sourceFile);
      } else if (node.parent && ts.isPropertyDeclaration(node.parent)) {
        name = node.parent.name.getText(sourceFile);
      }
      
      // 获取箭头函数签名
      if (ts.isBlock(node.body)) {
        const bodyStart = node.body.getStart(sourceFile);
        signature = sourceFile.text.substring(node.getStart(sourceFile), bodyStart).trim() + ' => {';
        
        // 计算函数体行数
        const bodyText = node.body.getText(sourceFile);
        lines = bodyText.split('\n').filter(line => line.trim().length > 0).length;
      } else {
        signature = node.getText(sourceFile).split('\n')[0].trim();
        lines = 1;
      }
    } else if (ts.isFunctionExpression(node)) {
      type = '函数表达式';
      name = node.name?.getText(sourceFile) || '';
      
      // 尝试从父节点获取名称
      if (!name && node.parent && ts.isVariableDeclaration(node.parent)) {
        name = node.parent.name.getText(sourceFile);
      }
      
      // 获取函数签名
      const bodyStart = node.body?.getStart(sourceFile) || node.getEnd();
      signature = sourceFile.text.substring(node.getStart(sourceFile), bodyStart).trim();
      
      // 计算函数体行数
      if (node.body) {
        const bodyText = node.body.getText(sourceFile);
        lines = bodyText.split('\n').filter(line => line.trim().length > 0).length;
      }
    }

    // 限制签名长度
    if (signature.length > 120) {
      signature = signature.substring(0, 120) + '...';
    }

    return { name, type, lines, signature };
  }

  /**
   * 获取嵌套信息（语句类型、深度、代码预览）
   */
  private getNestingInfo(node: ts.Node, sourceFile: ts.SourceFile): {
    statementType: string;
    depth: number;
    preview: string;
  } {
    // 确定语句类型
    let statementType = '';
    if (ts.isIfStatement(node)) {
      statementType = 'if 语句';
    } else if (ts.isForStatement(node)) {
      statementType = 'for 循环';
    } else if (ts.isWhileStatement(node)) {
      statementType = 'while 循环';
    } else if (ts.isDoStatement(node)) {
      statementType = 'do-while 循环';
    } else if (ts.isSwitchStatement(node)) {
      statementType = 'switch 语句';
    } else if (ts.isTryStatement(node)) {
      statementType = 'try-catch 语句';
    }

    // 计算嵌套深度
    let depth = 1; // 当前节点本身算一层
    let current: ts.Node | undefined = node.parent;
    
    while (current) {
      if (
        ts.isIfStatement(current) ||
        ts.isForStatement(current) ||
        ts.isWhileStatement(current) ||
        ts.isDoStatement(current) ||
        ts.isSwitchStatement(current) ||
        ts.isTryStatement(current)
      ) {
        depth++;
      }
      
      // 如果到达函数边界，停止计数
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isMethodDeclaration(current) ||
        ts.isArrowFunction(current) ||
        ts.isFunctionExpression(current)
      ) {
        break;
      }
      
      current = current.parent;
    }

    // 获取代码预览（第一行）
    const fullText = node.getText(sourceFile);
    const firstLine = fullText.split('\n')[0].trim();
    let preview = firstLine;
    
    // 限制预览长度
    if (preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }

    return { statementType, depth, preview };
  }

  /**
   * 扫描重复代码
   * 使用滑动窗口算法检测重复代码块（> 10 行）
   */
  private scanDuplicateCode(content: string, filePath: string): void {
    const lines = content.split('\n');
    const MIN_DUPLICATE_LINES = 10;
    
    // 预处理：标准化代码行（移除空白和注释）
    const normalizedLines = this.normalizeCodeLines(lines);
    
    // 存储代码块的哈希值和位置
    const blockMap = new Map<string, Array<{ line: number; originalCode: string }>>();
    
    // 使用滑动窗口提取代码块
    for (let i = 0; i <= normalizedLines.length - MIN_DUPLICATE_LINES; i++) {
      const block = normalizedLines.slice(i, i + MIN_DUPLICATE_LINES);
      
      // 跳过主要是空行的块
      const nonEmptyLines = block.filter(line => line.length > 0);
      if (nonEmptyLines.length < MIN_DUPLICATE_LINES * 0.5) {
        continue;
      }
      
      // 计算代码块的哈希值
      const blockHash = this.hashCodeBlock(block);
      
      // 获取原始代码（用于显示）
      const originalCode = lines.slice(i, i + MIN_DUPLICATE_LINES).join('\n');
      
      if (!blockMap.has(blockHash)) {
        blockMap.set(blockHash, []);
      }
      
      blockMap.get(blockHash)!.push({
        line: i + 1,
        originalCode
      });
    }
    
    // 找出重复的代码块
    for (const [hash, occurrences] of blockMap.entries()) {
      if (occurrences.length > 1) {
        // 只报告第一次出现的位置
        const firstOccurrence = occurrences[0];
        const codePreview = this.getCodePreview(firstOccurrence.originalCode);
        
        this.addIssue({
          ruleId: 'duplicate-code',
          severity: 'medium',
          message: `发现重复代码块（共 ${occurrences.length} 处，行数 ≥ ${MIN_DUPLICATE_LINES}）`,
          file: filePath,
          line: firstOccurrence.line,
          column: 1,
          code: codePreview
        });
      }
    }
  }
  
  /**
   * 标准化代码行
   * 移除空白字符、注释，保留代码结构
   */
  private normalizeCodeLines(lines: string[]): string[] {
    return lines.map(line => {
      let normalized = line.trim();
      
      // 移除单行注释
      normalized = normalized.replace(/\/\/.*$/, '');
      
      // 移除多余的空白
      normalized = normalized.replace(/\s+/g, ' ');
      
      return normalized;
    });
  }
  
  /**
   * 计算代码块的哈希值
   * 使用简单的字符串哈希算法
   */
  private hashCodeBlock(lines: string[]): string {
    const content = lines.join('\n');
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return hash.toString(36);
  }
  
  /**
   * 获取代码预览（前3行）
   */
  private getCodePreview(code: string): string {
    const lines = code.split('\n').slice(0, 3);
    const preview = lines.join('\n');
    
    if (preview.length > 120) {
      return preview.substring(0, 120) + '...';
    }
    
    return preview + '\n...';
  }

  /**
   * 添加问题
   */
  private addIssue(issue: TechDebtIssue): void {
    this.issues.push(issue);

    // 更新文件问题计数
    const count = this.fileIssueCount.get(issue.file) || 0;
    this.fileIssueCount.set(issue.file, count + 1);
  }

  /**
   * 生成报告
   */
  public generateReport(): TechDebtReport {
    const bySeverity: Record<Severity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const issue of this.issues) {
      bySeverity[issue.severity]++;
    }

    const byFile: Record<string, number> = {};
    for (const [file, count] of this.fileIssueCount.entries()) {
      byFile[file] = count;
    }

    return {
      summary: {
        totalIssues: this.issues.length,
        bySeverity,
        byFile
      },
      issues: this.issues,
      metrics: {
        totalFiles: this.totalFiles,
        totalLines: this.totalLines,
        debtRatio: this.totalLines > 0 ? this.issues.length / this.totalLines : 0
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 保存 JSON 报告
   */
  public saveJSONReport(report: TechDebtReport, outputPath: string): void {
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`✅ JSON 报告已保存: ${outputPath}`);
  }

  /**
   * 保存 HTML 报告
   */
  public saveHTMLReport(report: TechDebtReport, outputPath: string): void {
    const html = this.generateHTML(report);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ HTML 报告已保存: ${outputPath}`);
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTML(report: TechDebtReport): string {
    const severityColors: Record<Severity, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#10b981'
    };

    const severityIcons: Record<Severity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>技术债务扫描报告</title>
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
    .issue-location { color: #6b7280; font-size: 0.875rem; }
    .issue-code {
      background: #f9fafb;
      padding: 0.75rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 技术债务扫描报告</h1>
      <div class="meta">生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}</div>
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
      <div class="stat-card">
        <div class="stat-label">债务比率</div>
        <div class="stat-value">${(report.metrics.debtRatio * 100).toFixed(2)}%</div>
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
  console.log('🔍 开始扫描技术债务...\n');

  // 创建扫描器
  const scanner = new TechDebtScanner();

  // 扫描源代码目录
  scanner.scan(CONFIG.srcDir);

  // 生成报告
  const report = scanner.generateReport();

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const jsonPath = path.join(CONFIG.outputDir, `tech-debt-${timestamp}.json`);
  const htmlPath = path.join(CONFIG.outputDir, `tech-debt-${timestamp}.html`);

  scanner.saveJSONReport(report, jsonPath);
  scanner.saveHTMLReport(report, htmlPath);

  // 打印摘要
  console.log('\n📊 扫描完成！');
  console.log('=====================================');
  console.log(`总问题数: ${report.summary.totalIssues}`);
  console.log(`  🔴 严重: ${report.summary.bySeverity.critical}`);
  console.log(`  🟠 高: ${report.summary.bySeverity.high}`);
  console.log(`  🟡 中: ${report.summary.bySeverity.medium}`);
  console.log(`  🟢 低: ${report.summary.bySeverity.low}`);
  console.log(`扫描文件数: ${report.metrics.totalFiles}`);
  console.log(`总代码行数: ${report.metrics.totalLines.toLocaleString()}`);
  console.log(`债务比率: ${(report.metrics.debtRatio * 100).toFixed(2)}%`);
  console.log('=====================================\n');

  // 如果有严重或高优先级问题，返回非零退出码
  if (report.summary.bySeverity.critical > 0 || report.summary.bySeverity.high > 0) {
    process.exit(1);
  }
}

// 运行主函数
// 兼容 Windows 和 Unix 系统
const isMainModule = () => {
  if (typeof process.argv[1] === 'undefined') return false;
  
  const scriptPath = fileURLToPath(import.meta.url);
  const argPath = path.resolve(process.argv[1]);
  
  return scriptPath === argPath;
};

if (isMainModule()) {
  main();
}

export { TechDebtScanner, TechDebtReport, TechDebtIssue, ScanRule };
