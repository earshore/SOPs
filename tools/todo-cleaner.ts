/**
 * TODO 清理工具
 * 扫描并识别过时的 TODO 注释（> 6 个月）
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

interface TodoIssue {
  file: string;
  line: number;
  content: string;
  type: 'TODO' | 'FIXME' | 'HACK' | 'XXX' | 'NOTE';
  age?: number; // 天数
  lastModified?: Date;
  author?: string;
}

interface ScanResult {
  totalFiles: number;
  totalTodos: number;
  outdatedTodos: number;
  issues: TodoIssue[];
}

class TodoCleaner {
  private readonly patterns = [
    /\/\/\s*(TODO|FIXME|HACK|XXX|NOTE):?\s*(.+)/gi,
    /\/\*\s*(TODO|FIXME|HACK|XXX|NOTE):?\s*(.+?)\s*\*\//gi,
  ];

  private readonly excludeDirs = [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.kiro',
    'html',
  ];

  private readonly outdatedThresholdDays = 180; // 6 个月

  async scan(): Promise<ScanResult> {
    const files = await this.getSourceFiles();
    const issues: TodoIssue[] = [];

    for (const file of files) {
      const fileIssues = await this.scanFile(file);
      issues.push(...fileIssues);
    }

    // 尝试获取 Git 信息
    for (const issue of issues) {
      try {
        const gitInfo = this.getGitInfo(issue.file, issue.line);
        if (gitInfo) {
          issue.lastModified = gitInfo.date;
          issue.author = gitInfo.author;
          issue.age = Math.floor(
            (Date.now() - gitInfo.date.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } catch (error) {
        // Git 信息获取失败,跳过
      }
    }

    const outdatedTodos = issues.filter(
      i => i.age && i.age > this.outdatedThresholdDays
    ).length;

    return {
      totalFiles: files.length,
      totalTodos: issues.length,
      outdatedTodos,
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

  private async scanFile(filePath: string): Promise<TodoIssue[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: TodoIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of this.patterns) {
        pattern.lastIndex = 0; // 重置正则
        const match = pattern.exec(line);
        
        if (match) {
          issues.push({
            file: filePath,
            line: i + 1,
            content: match[2]?.trim() || match[0],
            type: match[1].toUpperCase() as TodoIssue['type'],
          });
        }
      }
    }

    return issues;
  }

  private getGitInfo(file: string, line: number): { date: Date; author: string } | null {
    try {
      const cmd = `git log -1 --format="%ai|%an" -L ${line},${line}:"${file}"`;
      const output = execSync(cmd, { encoding: 'utf-8' }).trim();
      
      if (output) {
        const [dateStr, author] = output.split('|');
        return {
          date: new Date(dateStr),
          author,
        };
      }
    } catch (error) {
      // 忽略错误
    }
    
    return null;
  }

  generateReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let report = `# TODO 清理报告\n\n`;
    report += `生成时间: ${timestamp}\n\n`;
    report += `## 概览\n\n`;
    report += `- 扫描文件总数: ${result.totalFiles}\n`;
    report += `- TODO 总数: ${result.totalTodos}\n`;
    report += `- 过时 TODO (> 6个月): ${result.outdatedTodos}\n\n`;

    if (result.totalTodos === 0) {
      report += `✅ 未发现 TODO 注释\n`;
      return report;
    }

    // 按类型统计
    const byType = new Map<string, TodoIssue[]>();
    for (const issue of result.issues) {
      if (!byType.has(issue.type)) {
        byType.set(issue.type, []);
      }
      byType.get(issue.type)!.push(issue);
    }

    report += `## 按类型统计\n\n`;
    for (const [type, issues] of byType) {
      report += `- ${type}: ${issues.length}\n`;
    }
    report += `\n`;

    // 过时的 TODO
    const outdated = result.issues.filter(
      i => i.age && i.age > this.outdatedThresholdDays
    );

    if (outdated.length > 0) {
      report += `## ⚠️ 过时的 TODO (> 6个月)\n\n`;
      
      for (const issue of outdated) {
        report += `### ${issue.file}:${issue.line}\n\n`;
        report += `- 类型: ${issue.type}\n`;
        report += `- 内容: ${issue.content}\n`;
        report += `- 年龄: ${issue.age} 天\n`;
        if (issue.author) {
          report += `- 作者: ${issue.author}\n`;
        }
        if (issue.lastModified) {
          report += `- 最后修改: ${issue.lastModified.toISOString().split('T')[0]}\n`;
        }
        report += `\n`;
      }
    }

    // 所有 TODO 列表
    report += `## 所有 TODO 列表\n\n`;
    
    const byFile = new Map<string, TodoIssue[]>();
    for (const issue of result.issues) {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, []);
      }
      byFile.get(issue.file)!.push(issue);
    }

    for (const [file, issues] of byFile) {
      report += `### ${file}\n\n`;
      
      for (const issue of issues) {
        const ageStr = issue.age ? ` (${issue.age}天)` : '';
        report += `- **行 ${issue.line}** [${issue.type}]${ageStr}: ${issue.content}\n`;
      }
      
      report += `\n`;
    }

    report += `## 建议\n\n`;
    report += `1. 优先处理过时的 TODO (> 6个月)\n`;
    report += `2. 将已完成的 TODO 删除\n`;
    report += `3. 将长期 TODO 转换为 Issue 或任务\n`;
    report += `4. 为 TODO 添加负责人和截止日期\n`;
    report += `5. 定期审查和清理 TODO 列表\n`;

    return report;
  }

  generateHtmlReport(result: ScanResult): string {
    const timestamp = new Date().toISOString();
    
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TODO 清理报告</title>
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
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
      color: #f5576c;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .type-stats {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .type-badge {
      display: inline-block;
      padding: 5px 12px;
      margin: 5px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
    }
    .type-TODO { background: #ffd93d; color: #333; }
    .type-FIXME { background: #ff6b6b; color: white; }
    .type-HACK { background: #ff8c42; color: white; }
    .type-XXX { background: #a8dadc; color: #333; }
    .type-NOTE { background: #95e1d3; color: #333; }
    .outdated-section {
      background: #fff3cd;
      border-left: 4px solid #ff6b6b;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
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
      border-bottom: 2px solid #f5576c;
    }
    .todo-item {
      padding: 10px;
      margin: 10px 0;
      background: #f9f9f9;
      border-left: 4px solid #ffd93d;
      border-radius: 4px;
    }
    .todo-item.outdated {
      border-left-color: #ff6b6b;
      background: #fff5f5;
    }
    .todo-meta {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .age-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #ff6b6b;
      color: white;
      border-radius: 3px;
      font-size: 11px;
      margin-left: 5px;
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
  </style>
</head>
<body>
  <div class="header">
    <h1>📝 TODO 清理报告</h1>
    <p>生成时间: ${timestamp}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${result.totalFiles}</div>
      <div class="stat-label">扫描文件总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.totalTodos}</div>
      <div class="stat-label">TODO 总数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${result.outdatedTodos}</div>
      <div class="stat-label">过时 TODO (> 6个月)</div>
    </div>
  </div>
`;

    if (result.totalTodos > 0) {
      // 按类型统计
      const byType = new Map<string, TodoIssue[]>();
      for (const issue of result.issues) {
        if (!byType.has(issue.type)) {
          byType.set(issue.type, []);
        }
        byType.get(issue.type)!.push(issue);
      }

      html += `
  <div class="type-stats">
    <h3>按类型统计</h3>
`;
      for (const [type, issues] of byType) {
        html += `    <span class="type-badge type-${type}">${type}: ${issues.length}</span>\n`;
      }
      html += `  </div>\n`;

      // 过时的 TODO
      const outdated = result.issues.filter(
        i => i.age && i.age > this.outdatedThresholdDays
      );

      if (outdated.length > 0) {
        html += `
  <div class="outdated-section">
    <h3>⚠️ 过时的 TODO (> 6个月)</h3>
    <p>这些 TODO 已经存在超过 6 个月,需要优先处理</p>
`;
        for (const issue of outdated) {
          html += `
    <div class="todo-item outdated">
      <strong>${issue.file}:${issue.line}</strong>
      <span class="type-badge type-${issue.type}">${issue.type}</span>
      <span class="age-badge">${issue.age} 天</span>
      <div>${this.escapeHtml(issue.content)}</div>
      <div class="todo-meta">
        ${issue.author ? `作者: ${issue.author} | ` : ''}
        ${issue.lastModified ? `最后修改: ${issue.lastModified.toISOString().split('T')[0]}` : ''}
      </div>
    </div>
`;
        }
        html += `  </div>\n`;
      }

      // 按文件分组
      const byFile = new Map<string, TodoIssue[]>();
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
`;
        for (const issue of issues) {
          const isOutdated = issue.age && issue.age > this.outdatedThresholdDays;
          const ageStr = issue.age ? `<span class="age-badge">${issue.age} 天</span>` : '';
          
          html += `
    <div class="todo-item${isOutdated ? ' outdated' : ''}">
      <strong>行 ${issue.line}</strong>
      <span class="type-badge type-${issue.type}">${issue.type}</span>
      ${ageStr}
      <div>${this.escapeHtml(issue.content)}</div>
    </div>
`;
        }
        html += `  </div>\n`;
      }
    }

    html += `
  <div class="recommendations">
    <h3>💡 建议</h3>
    <ul>
      <li>优先处理过时的 TODO (> 6个月)</li>
      <li>将已完成的 TODO 删除</li>
      <li>将长期 TODO 转换为 Issue 或任务</li>
      <li>为 TODO 添加负责人和截止日期</li>
      <li>定期审查和清理 TODO 列表</li>
    </ul>
  </div>

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
  console.log('🔍 开始扫描 TODO 注释...\n');

  const cleaner = new TodoCleaner();
  const result = await cleaner.scan();

  console.log('📊 扫描完成!\n');
  console.log(`扫描文件: ${result.totalFiles}`);
  console.log(`TODO 总数: ${result.totalTodos}`);
  console.log(`过时 TODO: ${result.outdatedTodos}\n`);

  // 生成报告
  const mdReport = cleaner.generateReport(result);
  const htmlReport = cleaner.generateHtmlReport(result);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `todo-report-${timestamp}.md`;
  const htmlPath = `todo-report-${timestamp}.html`;

  fs.writeFileSync(mdPath, mdReport);
  fs.writeFileSync(htmlPath, htmlReport);

  console.log(`✅ Markdown 报告已生成: ${mdPath}`);
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);
}

main().catch(console.error);
