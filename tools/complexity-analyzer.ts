/**
 * 代码复杂度分析工具
 * 识别过长函数和高复杂度函数
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';

interface ComplexityIssue {
  file: string;
  functionName: string;
  line: number;
  linesCount: number;
  cyclomaticComplexity: number;
  issueType: 'long-function' | 'high-complexity' | 'both';
}

interface ScanResult {
  totalFiles: number;
  totalFunctions: number;
  longFunctions: number;
  complexFunctions: number;
  issues: ComplexityIssue[];
}

class ComplexityAnalyzer {
  private readonly maxLines = 100;
  private readonly maxComplexity = 10;

  private readonly excludeDirs = [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.kiro',
    'html',
  ];

  async scan(): Promise<ScanResult> {
    const files = await this.getSourceFiles();
    const issues: ComplexityIssue[] = [];
    let totalFunctions = 0;

    for (const file of files) {
      const fileIssues = await this.analyzeFile(file);
      issues.push(...fileIssues.issues);
      totalFunctions += fileIssues.totalFunctions;
    }

    const longFunctions = issues.filter(
      i => i.issueType === 'long-function' || i.issueType === 'both'
    ).length;

    const complexFunctions = issues.filter(
      i => i.issueType === 'high-complexity' || i.issueType === 'both'
    ).length;

    return {
      totalFiles: files.length,
      totalFunctions,
      longFunctions,
      complexFunctions,
      issues,
    };
  }

  private async getSourceFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.{js,ts,jsx,tsx}',
      'tests/**/*.{js,ts,jsx,tsx}',
      'tools/**/*.{js,ts}',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: this.excludeDirs.map(dir => `**/${dir}/**`),
      });
      files.push(...matches);
    }

    return files;
  }

  private async analyzeFile(filePath: string): Promise<{
    issues: ComplexityIssue[];
    totalFunctions: number;
  }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues: ComplexityIssue[] = [];
    let totalFunctions = 0;

    // 对于 TypeScript 文件使用 AST 分析
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node)
        ) {
          totalFunctions++;
          const issue = this.analyzeFunctionNode(node, sourceFile, filePath);
          if (issue) {
            issues.push(issue);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } else {
      // 对于 JavaScript 文件使用简单的行数分析
      const jsIssues = this.analyzeJavaScriptFile(content, filePath);
      issues.push(...jsIssues.issues);
      totalFunctions += jsIssues.totalFunctions;
    }

    return { issues, totalFunctions };
  }

  private analyzeFunctionNode(
    node: ts.FunctionLikeDeclaration,
    sourceFile: ts.SourceFile,
    filePath: string
  ): ComplexityIssue | null {
    const functionName = this.getFunctionName(node);
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const linesCount = end.line - start.line + 1;

    const complexity = this.calculateComplexity(node);

    const isLong = linesCount > this.maxLines;
    const isComplex = complexity > this.maxComplexity;

    if (isLong || isComplex) {
      return {
        file: filePath,
        functionName,
        line: start.line + 1,
        linesCount,
        cyclomaticComplexity: complexity,
        issueType: isLong && isComplex ? 'both' : isLong ? 'long-function' : 'high-complexity',
      };
    }

    return null;
  }

  private getFunctionName(node: ts.FunctionLikeDeclaration): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      return ts.isIdentifier(node.name) ? node.name.text : '<computed>';
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      // 尝试从父节点获取名称
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      return '<anonymous>';
    }
    return '<unknown>';
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1; // 基础复杂度

    const visit = (n: ts.Node) => {
      // 增加复杂度的语句
      if (
        ts.isIfStatement(n) ||
        ts.isConditionalExpression(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isCaseClause(n) ||
        ts.isCatchClause(n)
      ) {
        complexity++;
      }

      // 逻辑运算符
      if (ts.isBinaryExpression(n)) {
        if (
          n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private analyzeJavaScriptFile(
    content: string,
    filePath: string
  ): { issues: ComplexityIssue[]; totalFunctions: number } {
    const issues: ComplexityIssue[] = [];
    const lines = content.split('\n');
    let totalFunctions = 0;

    // 简单的函数检测
    const functionPattern = /^\s*(function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?function)/;
    
    let currentFunction: {
      name: string;
      startLine: number;
      braceCount: number;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!currentFunction) {
        const match = functionPattern.exec(line);
        if (match) {
          totalFunctions++;
          const name = match[2] || match[3] || match[4] || '<anonymous>';
          currentFunction = {
            name,
            startLine: i,
            braceCount: 0,
          };
        }
      }

      if (currentFunction) {
        // 计算大括号
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        currentFunction.braceCount += openBraces - closeBraces;

        // 函数结束
        if (currentFunction.braceCount === 0 && openBraces > 0) {
          const linesCount = i - currentFunction.startLine + 1;
          
          if (linesCount > this.maxLines) {
            issues.push({
              file: filePath,
              functionName: currentFunction.name,
              line: currentFunction.startLine + 1,
              linesCount,
              cyclomaticComplexity: 0, // JS 文件不计算复杂度
              issueType: 'long-function',
            });
          }

          currentFunction = null;
        }
      }
    }

    return { issues, totalFunctions };
  }

  generateReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let report = `# 代码复杂度分析报告\n\n`;
    report += `生成时间: ${timestamp}\n\n`;
    report += `## 概览\n\n`;
    report += `- 扫描文件总数: ${result.totalFiles}\n`;
    report += `- 函数总数: ${result.totalFunctions}\n`;
    report += `- 过长函数 (> ${this.maxLines} 行): ${result.longFunctions}\n`;
    report += `- 高复杂度函数 (圈复杂度 > ${this.maxComplexity}): ${result.complexFunctions}\n`;
    report += `- 问题函数总数: ${result.issues.length}\n\n`;

    if (result.issues.length === 0) {
      report += `✅ 未发现复杂度问题\n`;
      return report;
    }

    // 按严重程度排序
    const sorted = [...result.issues].sort((a, b) => {
      if (a.issueType === 'both' && b.issueType !== 'both') return -1;
      if (a.issueType !== 'both' && b.issueType === 'both') return 1;
      return b.linesCount - a.linesCount;
    });

    report += `## 问题列表（按严重程度排序）\n\n`;

    for (const issue of sorted) {
      const severity = issue.issueType === 'both' ? '🔴 严重' : '🟡 中等';
      
      report += `### ${severity} ${issue.file}\n\n`;
      report += `**函数**: \`${issue.functionName}\`\n\n`;
      report += `- 位置: 行 ${issue.line}\n`;
      report += `- 行数: ${issue.linesCount}\n`;
      
      if (issue.cyclomaticComplexity > 0) {
        report += `- 圈复杂度: ${issue.cyclomaticComplexity}\n`;
      }
      
      report += `- 问题类型: `;
      if (issue.issueType === 'both') {
        report += `过长且复杂\n`;
      } else if (issue.issueType === 'long-function') {
        report += `函数过长\n`;
      } else {
        report += `复杂度过高\n`;
      }
      
      report += `\n`;
    }

    report += `## 建议\n\n`;
    report += `### 重构过长函数\n`;
    report += `1. 提取独立的功能到单独的函数\n`;
    report += `2. 使用策略模式替代长 if-else\n`;
    report += `3. 将复杂逻辑拆分为多个小函数\n\n`;
    
    report += `### 降低圈复杂度\n`;
    report += `1. 使用提前返回（Early Return）减少嵌套\n`;
    report += `2. 使用查找表替代多个 if-else\n`;
    report += `3. 提取条件判断到独立函数\n`;
    report += `4. 使用多态替代条件判断\n`;

    return report;
  }

  generateHtmlReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>代码复杂度分析报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #fa709a;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .issue-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .issue-card.severe {
      border-left: 4px solid #ff6b6b;
    }
    .issue-card.moderate {
      border-left: 4px solid #ffd93d;
    }
    .issue-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .severity-badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 10px;
    }
    .severity-severe {
      background: #ff6b6b;
      color: white;
    }
    .severity-moderate {
      background: #ffd93d;
      color: #333;
    }
    .function-name {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    .issue-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .detail-item {
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .detail-label {
      font-size: 12px;
      color: #666;
    }
    .detail-value {
      font-size: 20px;
      font-weight: bold;
      color: #333;
    }
    .recommendations {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }
    .recommendations h3 {
      margin-top: 0;
      color: #1976d2;
    }
    .success {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 代码复杂度分析报告</h1>
    <p>生成时间: ${timestamp}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${result.totalFiles}</div>
      <div class="stat-label">扫描文件总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.totalFunctions}</div>
      <div class="stat-label">函数总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.longFunctions}</div>
      <div class="stat-label">过长函数 (> ${this.maxLines} 行)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.complexFunctions}</div>
      <div class="stat-label">高复杂度函数 (> ${this.maxComplexity})</div>
    </div>
  </div>
`;

    if (result.issues.length === 0) {
      html += `<div class="success">✅ 未发现复杂度问题</div>`;
    } else {
      // 按严重程度排序
      const sorted = [...result.issues].sort((a, b) => {
        if (a.issueType === 'both' && b.issueType !== 'both') return -1;
        if (a.issueType !== 'both' && b.issueType === 'both') return 1;
        return b.linesCount - a.linesCount;
      });

      for (const issue of sorted) {
        const isSevere = issue.issueType === 'both';
        const severityClass = isSevere ? 'severe' : 'moderate';
        const severityLabel = isSevere ? '严重' : '中等';
        const severityBadgeClass = isSevere ? 'severity-severe' : 'severity-moderate';

        html += `
  <div class="issue-card ${severityClass}">
    <div class="issue-header">
      <span class="severity-badge ${severityBadgeClass}">${severityLabel}</span>
      <span class="function-name">${this.escapeHtml(issue.functionName)}</span>
    </div>
    <div style="color: #666; margin-bottom: 10px;">${issue.file}:${issue.line}</div>
    <div class="issue-details">
      <div class="detail-item">
        <div class="detail-label">行数</div>
        <div class="detail-value">${issue.linesCount}</div>
      </div>
`;
        
        if (issue.cyclomaticComplexity > 0) {
          html += `
      <div class="detail-item">
        <div class="detail-label">圈复杂度</div>
        <div class="detail-value">${issue.cyclomaticComplexity}</div>
      </div>
`;
        }

        html += `
      <div class="detail-item">
        <div class="detail-label">问题类型</div>
        <div class="detail-value" style="font-size: 14px;">
          ${issue.issueType === 'both' ? '过长且复杂' : 
            issue.issueType === 'long-function' ? '函数过长' : '复杂度过高'}
        </div>
      </div>
    </div>
  </div>
`;
      }

      html += `
  <div class="recommendations">
    <h3>💡 重构建议</h3>
    <h4>重构过长函数</h4>
    <ul>
      <li>提取独立的功能到单独的函数</li>
      <li>使用策略模式替代长 if-else</li>
      <li>将复杂逻辑拆分为多个小函数</li>
    </ul>
    <h4>降低圈复杂度</h4>
    <ul>
      <li>使用提前返回（Early Return）减少嵌套</li>
      <li>使用查找表替代多个 if-else</li>
      <li>提取条件判断到独立函数</li>
      <li>使用多态替代条件判断</li>
    </ul>
  </div>
`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

async function main() {
  console.log('🔍 开始分析代码复杂度...\n');

  const analyzer = new ComplexityAnalyzer();
  const result = await analyzer.scan();

  console.log('📊 分析完成!\n');
  console.log(`扫描文件: ${result.totalFiles}`);
  console.log(`函数总数: ${result.totalFunctions}`);
  console.log(`过长函数: ${result.longFunctions}`);
  console.log(`高复杂度函数: ${result.complexFunctions}\n`);

  // 生成报告
  const mdReport = analyzer.generateReport(result);
  const htmlReport = analyzer.generateHtmlReport(result);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `complexity-report-${timestamp}.md`;
  const htmlPath = `complexity-report-${timestamp}.html`;

  fs.writeFileSync(mdPath, mdReport);
  fs.writeFileSync(htmlPath, htmlReport);

  console.log(`✅ Markdown 报告已生成: ${mdPath}`);
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);
}

main().catch(console.error);
