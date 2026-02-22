/**
 * 注释代码清理工具
 * 扫描并清理项目中注释掉的代码
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface CommentedCodeIssue {
  file: string;
  line: number;
  content: string;
  type: 'single-line' | 'multi-line';
  linesCount: number;
}

interface ScanResult {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  issues: CommentedCodeIssue[];
}

class CommentedCodeCleaner {
  private readonly patterns = {
    // 匹配注释掉的代码特征
    codePatterns: [
      /\/\/\s*(const|let|var|function|class|import|export|if|for|while|return)/,
      /\/\/\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:({]/,
      /\/\/\s*\w+\.\w+\(/,
      /\/\/\s*<\w+/,  // HTML 标签
    ],
    // 多行注释中的代码
    multiLineCode: /\/\*[\s\S]*?(const|let|var|function|class|import|export)[\s\S]*?\*\//g,
  };

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
    const issues: CommentedCodeIssue[] = [];

    for (const file of files) {
      const fileIssues = await this.scanFile(file);
      issues.push(...fileIssues);
    }

    return {
      totalFiles: files.length,
      filesWithIssues: new Set(issues.map(i => i.file)).size,
      totalIssues: issues.length,
      issues,
    };
  }

  private async getSourceFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.{js,ts,jsx,tsx}',
      'tests/**/*.{js,ts,jsx,tsx}',
      'tools/**/*.{js,ts}',
      'examples/**/*.{js,ts}',
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

  private async scanFile(filePath: string): Promise<CommentedCodeIssue[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: CommentedCodeIssue[] = [];

    // 扫描单行注释
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 跳过 JSDoc 注释
      if (trimmed.startsWith('/**') || trimmed.startsWith('*')) {
        continue;
      }

      // 检查是否是注释掉的代码
      if (trimmed.startsWith('//')) {
        const isCode = this.patterns.codePatterns.some(pattern => 
          pattern.test(trimmed)
        );

        if (isCode) {
          // 检查是否是连续的注释代码块
          let endLine = i;
          while (endLine + 1 < lines.length && 
                 lines[endLine + 1].trim().startsWith('//')) {
            endLine++;
          }

          issues.push({
            file: filePath,
            line: i + 1,
            content: lines.slice(i, endLine + 1).join('\n'),
            type: 'single-line',
            linesCount: endLine - i + 1,
          });

          i = endLine; // 跳过已处理的行
        }
      }
    }

    // 扫描多行注释中的代码
    const multiLineMatches = content.matchAll(this.patterns.multiLineCode);
    for (const match of multiLineMatches) {
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      // 排除 JSDoc 注释
      if (!match[0].includes('/**') && !match[0].includes('@param')) {
        issues.push({
          file: filePath,
          line: lineNumber,
          content: match[0],
          type: 'multi-line',
          linesCount: match[0].split('\n').length,
        });
      }
    }

    return issues;
  }

  generateReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let report = `# 注释代码清理报告\n\n`;
    report += `生成时间: ${timestamp}\n\n`;
    report += `## 概览\n\n`;
    report += `- 扫描文件总数: ${result.totalFiles}\n`;
    report += `- 存在问题的文件: ${result.filesWithIssues}\n`;
    report += `- 注释代码块总数: ${result.totalIssues}\n`;
    report += `- 注释代码行数: ${result.issues.reduce((sum, i) => sum + i.linesCount, 0)}\n\n`;

    if (result.issues.length === 0) {
      report += `✅ 未发现注释掉的代码\n`;
      return report;
    }

    // 按文件分组
    const byFile = new Map<string, CommentedCodeIssue[]>();
    for (const issue of result.issues) {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, []);
      }
      byFile.get(issue.file)!.push(issue);
    }

    report += `## 详细列表\n\n`;
    
    for (const [file, issues] of byFile) {
      report += `### ${file}\n\n`;
      report += `发现 ${issues.length} 处注释代码\n\n`;
      
      for (const issue of issues) {
        report += `**行 ${issue.line}** (${issue.type}, ${issue.linesCount} 行):\n`;
        report += '```\n';
        report += issue.content.substring(0, 200);
        if (issue.content.length > 200) {
          report += '\n... (已截断)';
        }
        report += '\n```\n\n';
      }
    }

    report += `## 建议\n\n`;
    report += `1. 审查每处注释代码,确认是否需要保留\n`;
    report += `2. 删除不需要的注释代码,保持代码库整洁\n`;
    report += `3. 如果代码需要保留作为参考,考虑移到文档或示例中\n`;
    report += `4. 使用版本控制系统(Git)来追踪历史代码,而不是注释\n`;

    return report;
  }

  generateHtmlReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>注释代码清理报告</title>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      color: #667eea;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .file-section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .file-header {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .issue {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #ff6b6b;
      border-radius: 4px;
    }
    .issue-header {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .issue-type {
      display: inline-block;
      padding: 2px 8px;
      background: #ff6b6b;
      color: white;
      border-radius: 3px;
      font-size: 12px;
      margin-left: 10px;
    }
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 13px;
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
    .recommendations ul {
      margin: 10px 0;
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
    <h1>📝 注释代码清理报告</h1>
    <p>生成时间: ${timestamp}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${result.totalFiles}</div>
      <div class="stat-label">扫描文件总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.filesWithIssues}</div>
      <div class="stat-label">存在问题的文件</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.totalIssues}</div>
      <div class="stat-label">注释代码块总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.issues.reduce((sum, i) => sum + i.linesCount, 0)}</div>
      <div class="stat-label">注释代码行数</div>
    </div>
  </div>
`;

    if (result.issues.length === 0) {
      html += `<div class="success">✅ 未发现注释掉的代码</div>`;
    } else {
      // 按文件分组
      const byFile = new Map<string, CommentedCodeIssue[]>();
      for (const issue of result.issues) {
        if (!byFile.has(issue.file)) {
          byFile.set(issue.file, []);
        }
        byFile.get(issue.file)!.push(issue);
      }

      for (const [file, issues] of byFile) {
        html += `
  <div class="file-section">
    <div class="file-header">${file}</div>
    <p>发现 ${issues.length} 处注释代码</p>
`;
        
        for (const issue of issues) {
          const preview = issue.content.substring(0, 200);
          const truncated = issue.content.length > 200;
          
          html += `
    <div class="issue">
      <div class="issue-header">
        行 ${issue.line}
        <span class="issue-type">${issue.type}</span>
        <span class="issue-type">${issue.linesCount} 行</span>
      </div>
      <pre>${this.escapeHtml(preview)}${truncated ? '\n... (已截断)' : ''}</pre>
    </div>
`;
        }
        
        html += `  </div>\n`;
      }

      html += `
  <div class="recommendations">
    <h3>💡 建议</h3>
    <ul>
      <li>审查每处注释代码,确认是否需要保留</li>
      <li>删除不需要的注释代码,保持代码库整洁</li>
      <li>如果代码需要保留作为参考,考虑移到文档或示例中</li>
      <li>使用版本控制系统(Git)来追踪历史代码,而不是注释</li>
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
  console.log('🔍 开始扫描注释代码...\n');

  const cleaner = new CommentedCodeCleaner();
  const result = await cleaner.scan();

  console.log('📊 扫描完成!\n');
  console.log(`扫描文件: ${result.totalFiles}`);
  console.log(`问题文件: ${result.filesWithIssues}`);
  console.log(`注释代码块: ${result.totalIssues}`);
  console.log(`注释代码行: ${result.issues.reduce((sum, i) => sum + i.linesCount, 0)}\n`);

  // 生成报告
  const mdReport = cleaner.generateReport(result);
  const htmlReport = cleaner.generateHtmlReport(result);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `commented-code-report-${timestamp}.md`;
  const htmlPath = `commented-code-report-${timestamp}.html`;

  fs.writeFileSync(mdPath, mdReport);
  fs.writeFileSync(htmlPath, htmlReport);

  console.log(`✅ Markdown 报告已生成: ${mdPath}`);
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);
}

main().catch(console.error);
