/**
 * 报告生成服务
 * 负责生成各种格式的分析报告
 */

import { AnalysisResult } from '../types';

/**
 * 格式化历史日期
 */
export function formatHistoryDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    
    // 如果是今天
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    // 如果是昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    // 其他日期
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch (error) {
    return timestamp;
  }
}

/**
 * 生成 Markdown 格式报告
 */
export function generateMarkdownReport(
  results: AnalysisResult[],
  selectedAsins: string[],
  dataSourceMarketplace: string,
  dataSourceLabel: string
): string {
  const lines: string[] = [];
  
  // 标题
  lines.push('# AI 智能分析报告\n');
  lines.push(`**产品 ASIN**: ${selectedAsins.join(', ')}\n`);
  lines.push(`**分析时间**: ${new Date().toLocaleString('zh-CN')}\n`);
  lines.push(`**市场**: ${dataSourceMarketplace}\n`);
  lines.push(`**数据源**: ${dataSourceLabel}\n`);
  lines.push('\n---\n');
  
  // Listings 分析结果
  const listingsResults = results.filter(r => r.source === 'Listings');
  if (listingsResults.length > 0) {
    lines.push('\n## 📦 Listings 分析\n');
    for (const result of listingsResults) {
      lines.push(`\n### ${result.title}\n`);
      
      // 统计数据
      if (result.stats && result.stats.length > 0) {
        lines.push('\n**统计数据**:\n');
        for (const stat of result.stats) {
          lines.push(`- ${stat.label}: ${stat.value}`);
        }
        lines.push('');
      }
      
      // 核心发现
      if (result.highlights && result.highlights.length > 0) {
        lines.push('\n**核心发现**:\n');
        for (const highlight of result.highlights) {
          lines.push(`- ${highlight.text}`);
        }
        lines.push('');
      }
      
      // 详细分析
      if (result.details && result.details.length > 0) {
        lines.push('\n**详细分析**:\n');
        for (const detail of result.details) {
          lines.push(`\n#### ${detail.category}\n`);
          for (const item of detail.items) {
            lines.push(`- ${item}`);
          }
        }
        lines.push('');
      }
    }
  }
  
  // Reviews 分析结果
  const reviewsResults = results.filter(r => r.source === 'Reviews');
  if (reviewsResults.length > 0) {
    lines.push('\n## ⭐ Reviews 分析\n');
    for (const result of reviewsResults) {
      lines.push(`\n### ${result.title}\n`);
      
      // 统计数据
      if (result.stats && result.stats.length > 0) {
        lines.push('\n**统计数据**:\n');
        for (const stat of result.stats) {
          lines.push(`- ${stat.label}: ${stat.value}`);
        }
        lines.push('');
      }
      
      // 核心发现
      if (result.highlights && result.highlights.length > 0) {
        lines.push('\n**核心发现**:\n');
        for (const highlight of result.highlights) {
          lines.push(`- ${highlight.text}`);
        }
        lines.push('');
      }
      
      // 详细分析
      if (result.details && result.details.length > 0) {
        lines.push('\n**详细分析**:\n');
        for (const detail of result.details) {
          lines.push(`\n#### ${detail.category}\n`);
          for (const item of detail.items) {
            lines.push(`- ${item}`);
          }
        }
        lines.push('');
      }
    }
  }
  
  lines.push('\n---\n');
  lines.push(`\n*报告生成于 ${new Date().toLocaleString('zh-CN')}*\n`);
  
  return lines.join('\n');
}

/**
 * 生成完整的 JSON 报告数据
 */
export function generateJsonReportData(
  results: AnalysisResult[],
  selectedAsins: string[],
  selectedTargets: string[],
  dataSource: string,
  dataSourceMarketplace: string,
  analysisReport: any
) {
  return {
    metadata: {
      asins: selectedAsins,
      targets: selectedTargets,
      timestamp: new Date().toISOString(),
      dataSource: dataSource,
      marketplace: dataSourceMarketplace
    },
    results: results,
    analysisReport: analysisReport
  };
}

/**
 * 高亮 JSON 字符串（用于显示）
 */
export function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-blue-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-slate-500">$1</span>');
}
