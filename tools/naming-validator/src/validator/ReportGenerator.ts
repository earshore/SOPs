/**
 * 报告生成器
 * 负责生成验证报告，支持JSON和Markdown格式
 */

import type { ValidationReport, ValidationIssue } from '../types/index.js';
import * as path from 'path';

/**
 * 报告格式
 */
export type ReportFormat = 'json' | 'markdown';

/**
 * 报告生成器类
 */
export class ReportGenerator {
  /**
   * 生成验证报告
   * @param issues 验证问题列表
   * @param totalFiles 总文件数
   * @returns 验证报告
   */
  generateReport(issues: ValidationIssue[], totalFiles: number): ValidationReport {
    const summary = this.calculateSummary(issues);

    return {
      totalFiles,
      totalIssues: issues.length,
      issues,
      summary,
    };
  }

  /**
   * 格式化报告输出
   * @param report 验证报告
   * @param format 输出格式
   * @returns 格式化的报告字符串
   */
  formatReport(report: ValidationReport, format: ReportFormat): string {
    switch (format) {
      case 'json':
        return this.formatJSON(report);
      case 'markdown':
        return this.formatMarkdown(report);
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }
  }

  /**
   * 计算报告摘要
   * @param issues 验证问题列表
   * @returns 摘要信息
   */
  private calculateSummary(issues: ValidationIssue[]) {
    const summary = {
      errors: 0,
      warnings: 0,
      byType: {} as Record<string, number>,
    };

    for (const issue of issues) {
      // 统计严重级别
      if (issue.severity === 'error') {
        summary.errors++;
      } else {
        summary.warnings++;
      }

      // 统计类型
      if (!summary.byType[issue.type]) {
        summary.byType[issue.type] = 0;
      }
      summary.byType[issue.type]++;
    }

    return summary;
  }

  /**
   * 格式化为JSON
   * @param report 验证报告
   * @returns JSON字符串
   */
  private formatJSON(report: ValidationReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 格式化为Markdown
   * @param report 验证报告
   * @returns Markdown字符串
   */
  private formatMarkdown(report: ValidationReport): string {
    const lines: string[] = [];

    // 标题
    lines.push('# 命名规范验证报告\n');

    // 摘要
    lines.push('## 摘要\n');
    lines.push(`- 扫描文件数: ${report.totalFiles}`);
    lines.push(`- 发现问题数: ${report.totalIssues}`);
    lines.push(`- 错误: ${report.summary.errors}`);
    lines.push(`- 警告: ${report.summary.warnings}\n`);

    // 按类型统计
    if (Object.keys(report.summary.byType).length > 0) {
      lines.push('### 问题类型分布\n');
      for (const [type, count] of Object.entries(report.summary.byType)) {
        const typeName = this.getTypeName(type);
        lines.push(`- ${typeName}: ${count}`);
      }
      lines.push('');
    }

    // 详细问题列表
    if (report.issues.length > 0) {
      lines.push('## 详细问题\n');

      // 按文件分组
      const issuesByFile = this.groupIssuesByFile(report.issues);

      for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
        lines.push(`### ${filePath}\n`);

        for (const issue of fileIssues) {
          const severity = issue.severity === 'error' ? '❌' : '⚠️';
          const typeName = this.getTypeName(issue.type);
          
          lines.push(`${severity} **${typeName}** (行 ${issue.line}, 列 ${issue.column})`);
          lines.push(`- 当前值: \`${issue.currentValue}\``);
          lines.push(`- 建议值: \`${issue.suggestedValue}\``);
          lines.push(`- 说明: ${issue.message}`);
          lines.push('');
        }
      }
    } else {
      lines.push('## ✅ 未发现问题\n');
      lines.push('所有文件的命名都符合规范！');
    }

    return lines.join('\n');
  }

  /**
   * 按文件分组问题
   * @param issues 验证问题列表
   * @returns 按文件分组的问题
   */
  private groupIssuesByFile(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
    const grouped: Record<string, ValidationIssue[]> = {};

    for (const issue of issues) {
      if (!grouped[issue.filePath]) {
        grouped[issue.filePath] = [];
      }
      grouped[issue.filePath].push(issue);
    }

    return grouped;
  }

  /**
   * 获取类型的中文名称
   * @param type 类型标识
   * @returns 中文名称
   */
  private getTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      'html-id': 'HTML ID',
      'css-class': 'CSS 类名',
      'data-attr': 'data 属性',
    };

    return typeNames[type] || type;
  }
}
