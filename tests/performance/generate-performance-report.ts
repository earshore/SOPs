// ================================================================
// 🚀 性能报告生成工具
// 汇总所有性能测试结果，生成综合性能报告
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================================================
// 配置
// ================================================================

interface ReportConfig {
  lhciDir: string;
  baselineFile: string;
  outputDir: string;
  reportsDir: string;
}

const CONFIG: ReportConfig = {
  lhciDir: path.join(__dirname, '../../.lighthouseci'),
  baselineFile: path.join(__dirname, 'baseline-scores.json'),
  outputDir: path.join(__dirname, 'performance-reports'),
  reportsDir: path.join(__dirname, 'lighthouse-reports')
};

// ================================================================
// 类型定义
// ================================================================

interface PerformanceScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
}

interface AuditMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si: number;
  tti?: number;
}

interface PageResult {
  url: string;
  name: string;
  scores: PerformanceScore;
  audits: AuditMetrics;
  timestamp: string;
}

interface ComparisonResult {
  current: PageResult;
  baseline?: PageResult;
  diff?: {
    scores: Partial<PerformanceScore>;
    audits: Partial<AuditMetrics>;
  };
}

interface PerformanceReport {
  timestamp: string;
  summary: {
    totalPages: number;
    avgScores: PerformanceScore;
    avgAudits: AuditMetrics;
    passedPages: number;
    failedPages: number;
  };
  pages: ComparisonResult[];
  recommendations: string[];
}

// ================================================================
// 工具函数
// ================================================================

function ensureOutputDir(): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

function getStatus(score: number): string {
  if (score >= 90) return '🟢 优秀';
  if (score >= 50) return '🟡 需要改进';
  return '🔴 差';
}

function getStatusIcon(passed: boolean): string {
  return passed ? '✅' : '❌';
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return 'N/A';
  return `${Math.round(ms)}ms`;
}

function formatScore(score: number): string {
  return Math.round(score).toString();
}

function calculateDiff(current: number, baseline: number): string {
  const diff = current - baseline;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}`;
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round(sum / numbers.length);
}

// ================================================================
// 数据收集
// ================================================================

function loadBaselineScores(): any {
  if (!fs.existsSync(CONFIG.baselineFile)) {
    console.warn('⚠️  未找到基线数据文件');
    return null;
  }
  
  try {
    const content = fs.readFileSync(CONFIG.baselineFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ 读取基线数据失败:', error);
    return null;
  }
}

function loadLatestLighthouseResults(): PageResult[] {
  if (!fs.existsSync(CONFIG.lhciDir)) {
    console.warn('⚠️  未找到 Lighthouse CI 结果目录');
    return [];
  }
  
  const files = fs.readdirSync(CONFIG.lhciDir)
    .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.lhciDir, f),
      time: fs.statSync(path.join(CONFIG.lhciDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  const results: PageResult[] = [];
  const processedUrls = new Set<string>();
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
      const url = data.finalUrl || data.requestedUrl;
      
      if (processedUrls.has(url)) continue;
      processedUrls.add(url);
      
      const categories = data.categories;
      const audits = data.audits;
      
      results.push({
        url,
        name: getPageName(url),
        scores: {
          performance: Math.round((categories.performance?.score || 0) * 100),
          accessibility: Math.round((categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
          seo: Math.round((categories.seo?.score || 0) * 100),
          pwa: Math.round((categories.pwa?.score || 0) * 100)
        },
        audits: {
          fcp: audits['first-contentful-paint']?.numericValue || 0,
          lcp: audits['largest-contentful-paint']?.numericValue || 0,
          cls: audits['cumulative-layout-shift']?.numericValue || 0,
          tbt: audits['total-blocking-time']?.numericValue || 0,
          si: audits['speed-index']?.numericValue || 0,
          tti: audits['interactive']?.numericValue
        },
        timestamp: new Date(file.time).toISOString()
      });
    } catch (error) {
      console.error(`❌ 读取文件失败: ${file.name}`, error);
    }
  }
  
  return results;
}

function getPageName(url: string): string {
  if (url.includes('promptlab')) return 'Promptlab 页面';
  if (url.includes('ai-analysis')) return 'AI 分析页面';
  if (url.includes('scraper')) return 'Scraper 页面';
  if (url.includes('qa-lab')) return 'QA Lab 页面';
  if (url.includes('keyword-hunter')) return 'Keyword Hunter 页面';
  return '首页';
}

function compareWithBaseline(current: PageResult[], baseline: any): ComparisonResult[] {
  if (!baseline || !baseline.urls) {
    return current.map(page => ({ current: page }));
  }
  
  return current.map(page => {
    const baselineData = baseline.urls[page.url];
    
    if (!baselineData) {
      return { current: page };
    }
    
    const baselineResult: PageResult = {
      url: page.url,
      name: page.name,
      scores: baselineData.average,
      audits: baselineData.auditsAverage,
      timestamp: baseline.timestamp
    };
    
    const diff = {
      scores: {
        performance: page.scores.performance - baselineResult.scores.performance,
        accessibility: page.scores.accessibility - baselineResult.scores.accessibility,
        bestPractices: page.scores.bestPractices - baselineResult.scores.bestPractices,
        seo: page.scores.seo - baselineResult.scores.seo,
        pwa: page.scores.pwa - baselineResult.scores.pwa
      },
      audits: {
        fcp: page.audits.fcp - baselineResult.audits.fcp,
        lcp: page.audits.lcp - baselineResult.audits.lcp,
        cls: page.audits.cls - baselineResult.audits.cls,
        tbt: page.audits.tbt - baselineResult.audits.tbt,
        si: page.audits.si - baselineResult.audits.si
      }
    };
    
    return { current: page, baseline: baselineResult, diff };
  });
}

// ================================================================
// 报告生成
// ================================================================

function generateRecommendations(pages: ComparisonResult[]): string[] {
  const recommendations: string[] = [];
  
  pages.forEach(page => {
    const scores = page.current.scores;
    const audits = page.current.audits;
    
    if (scores.performance < 90) {
      recommendations.push(`${page.current.name}: 性能评分 ${scores.performance} < 90，建议优化代码分割、资源压缩`);
    }
    
    if (audits.lcp > 2500) {
      recommendations.push(`${page.current.name}: LCP ${formatMs(audits.lcp)} > 2.5s，建议优化关键渲染路径`);
    }
    
    if (audits.cls > 0.1) {
      recommendations.push(`${page.current.name}: CLS ${audits.cls.toFixed(3)} > 0.1，建议为图片和广告预留空间`);
    }
    
    if (audits.tbt > 300) {
      recommendations.push(`${page.current.name}: TBT ${formatMs(audits.tbt)} > 300ms，建议减少 JavaScript 执行时间`);
    }
    
    if (scores.accessibility < 90) {
      recommendations.push(`${page.current.name}: 可访问性评分 ${scores.accessibility} < 90，建议检查 ARIA 标签和键盘导航`);
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('所有页面性能指标均达标，继续保持！');
  }
  
  return recommendations;
}

function generateMarkdownReport(report: PerformanceReport): string {
  const { summary, pages, recommendations } = report;
  
  let md = `# 性能测试报告\n\n`;
  md += `**生成时间:** ${new Date(report.timestamp).toLocaleString('zh-CN')}\n`;
  md += `**测试页面数:** ${summary.totalPages}\n`;
  md += `**通过页面数:** ${summary.passedPages}/${summary.totalPages}\n\n`;
  md += `---\n\n`;
  
  // 总体评分
  md += `## 📊 总体平均评分\n\n`;
  md += `| 指标 | 分数 | 状态 |\n`;
  md += `|------|------|------|\n`;
  md += `| 性能 (Performance) | ${summary.avgScores.performance} | ${getStatus(summary.avgScores.performance)} |\n`;
  md += `| 可访问性 (Accessibility) | ${summary.avgScores.accessibility} | ${getStatus(summary.avgScores.accessibility)} |\n`;
  md += `| 最佳实践 (Best Practices) | ${summary.avgScores.bestPractices} | ${getStatus(summary.avgScores.bestPractices)} |\n`;
  md += `| SEO | ${summary.avgScores.seo} | ${getStatus(summary.avgScores.seo)} |\n`;
  md += `| PWA | ${summary.avgScores.pwa} | ${getStatus(summary.avgScores.pwa)} |\n\n`;
  
  // Core Web Vitals
  md += `## 🎯 Core Web Vitals 平均值\n\n`;
  md += `| 指标 | 值 | 目标 | 状态 |\n`;
  md += `|------|-----|------|------|\n`;
  md += `| FCP (First Contentful Paint) | ${formatMs(summary.avgAudits.fcp)} | < 1500ms | ${getStatusIcon(summary.avgAudits.fcp < 1500)} |\n`;
  md += `| LCP (Largest Contentful Paint) | ${formatMs(summary.avgAudits.lcp)} | < 2500ms | ${getStatusIcon(summary.avgAudits.lcp < 2500)} |\n`;
  md += `| CLS (Cumulative Layout Shift) | ${summary.avgAudits.cls.toFixed(3)} | < 0.1 | ${getStatusIcon(summary.avgAudits.cls < 0.1)} |\n`;
  md += `| TBT (Total Blocking Time) | ${formatMs(summary.avgAudits.tbt)} | < 300ms | ${getStatusIcon(summary.avgAudits.tbt < 300)} |\n`;
  md += `| SI (Speed Index) | ${formatMs(summary.avgAudits.si)} | < 3500ms | ${getStatusIcon(summary.avgAudits.si < 3500)} |\n\n`;
  
  md += `---\n\n`;
  
  // 各页面详情
  md += `## 📄 各页面详细报告\n\n`;
  
  pages.forEach(page => {
    md += `### ${page.current.name}\n\n`;
    md += `**URL:** ${page.current.url}\n`;
    md += `**测试时间:** ${new Date(page.current.timestamp).toLocaleString('zh-CN')}\n\n`;
    
    // 分类评分
    md += `**分类评分:**\n\n`;
    md += `| 指标 | 当前 | 基线 | 变化 | 状态 |\n`;
    md += `|------|------|------|------|------|\n`;
    
    const scores = page.current.scores;
    const baseline = page.baseline?.scores;
    const diff = page.diff?.scores;
    
    md += `| 性能 | ${scores.performance} | ${baseline?.performance || 'N/A'} | ${diff?.performance ? calculateDiff(scores.performance, baseline!.performance) : 'N/A'} | ${getStatus(scores.performance)} |\n`;
    md += `| 可访问性 | ${scores.accessibility} | ${baseline?.accessibility || 'N/A'} | ${diff?.accessibility ? calculateDiff(scores.accessibility, baseline!.accessibility) : 'N/A'} | ${getStatus(scores.accessibility)} |\n`;
    md += `| 最佳实践 | ${scores.bestPractices} | ${baseline?.bestPractices || 'N/A'} | ${diff?.bestPractices ? calculateDiff(scores.bestPractices, baseline!.bestPractices) : 'N/A'} | ${getStatus(scores.bestPractices)} |\n`;
    md += `| SEO | ${scores.seo} | ${baseline?.seo || 'N/A'} | ${diff?.seo ? calculateDiff(scores.seo, baseline!.seo) : 'N/A'} | ${getStatus(scores.seo)} |\n\n`;
    
    // Core Web Vitals
    md += `**Core Web Vitals:**\n\n`;
    md += `| 指标 | 当前 | 基线 | 变化 | 状态 |\n`;
    md += `|------|------|------|------|------|\n`;
    
    const audits = page.current.audits;
    const baselineAudits = page.baseline?.audits;
    const auditsDiff = page.diff?.audits;
    
    md += `| FCP | ${formatMs(audits.fcp)} | ${baselineAudits ? formatMs(baselineAudits.fcp) : 'N/A'} | ${auditsDiff?.fcp ? formatMs(auditsDiff.fcp) : 'N/A'} | ${getStatusIcon(audits.fcp < 1500)} |\n`;
    md += `| LCP | ${formatMs(audits.lcp)} | ${baselineAudits ? formatMs(baselineAudits.lcp) : 'N/A'} | ${auditsDiff?.lcp ? formatMs(auditsDiff.lcp) : 'N/A'} | ${getStatusIcon(audits.lcp < 2500)} |\n`;
    md += `| CLS | ${audits.cls.toFixed(3)} | ${baselineAudits ? baselineAudits.cls.toFixed(3) : 'N/A'} | ${auditsDiff?.cls ? auditsDiff.cls.toFixed(3) : 'N/A'} | ${getStatusIcon(audits.cls < 0.1)} |\n`;
    md += `| TBT | ${formatMs(audits.tbt)} | ${baselineAudits ? formatMs(baselineAudits.tbt) : 'N/A'} | ${auditsDiff?.tbt ? formatMs(auditsDiff.tbt) : 'N/A'} | ${getStatusIcon(audits.tbt < 300)} |\n`;
    md += `| SI | ${formatMs(audits.si)} | ${baselineAudits ? formatMs(baselineAudits.si) : 'N/A'} | ${auditsDiff?.si ? formatMs(auditsDiff.si) : 'N/A'} | ${getStatusIcon(audits.si < 3500)} |\n\n`;
  });
  
  md += `---\n\n`;
  
  // 改进建议
  md += `## 💡 改进建议\n\n`;
  recommendations.forEach((rec, index) => {
    md += `${index + 1}. ${rec}\n`;
  });
  
  md += `\n---\n\n`;
  md += `## 📌 说明\n\n`;
  md += `- 🟢 优秀: 90-100 分\n`;
  md += `- 🟡 需要改进: 50-89 分\n`;
  md += `- 🔴 差: 0-49 分\n`;
  md += `- ✅ 通过: 指标达到目标值\n`;
  md += `- ❌ 未通过: 指标未达到目标值\n\n`;
  
  return md;
}

function generateHTMLReport(report: PerformanceReport): string {
  const { summary, pages, recommendations } = report;
  
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>性能测试报告 - ${new Date(report.timestamp).toLocaleDateString('zh-CN')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; margin-bottom: 10px; font-size: 32px; }
    h2 { color: #34495e; margin: 30px 0 15px; font-size: 24px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h3 { color: #555; margin: 20px 0 10px; font-size: 20px; }
    .meta { color: #7f8c8d; margin-bottom: 30px; }
    .meta span { margin-right: 20px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: 600;
    }
    tr:hover { background: #f8f9fa; }
    .status-excellent { color: #27ae60; font-weight: 600; }
    .status-good { color: #f39c12; font-weight: 600; }
    .status-poor { color: #e74c3c; font-weight: 600; }
    .pass { color: #27ae60; font-size: 18px; }
    .fail { color: #e74c3c; font-size: 18px; }
    .recommendations {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .recommendations li {
      margin: 10px 0;
      padding-left: 10px;
    }
    .page-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .chart-container {
      margin: 20px 0;
      padding: 20px;
      background: white;
      border-radius: 5px;
    }
    .score-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    .badge-excellent { background: #d4edda; color: #155724; }
    .badge-good { background: #fff3cd; color: #856404; }
    .badge-poor { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 性能测试报告</h1>
    <div class="meta">
      <span>📅 生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</span>
      <span>📄 测试页面: ${summary.totalPages}</span>
      <span>✅ 通过: ${summary.passedPages}/${summary.totalPages}</span>
    </div>

    <h2>📊 总体平均评分</h2>
    <table>
      <thead>
        <tr>
          <th>指标</th>
          <th>分数</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>性能 (Performance)</td>
          <td>${summary.avgScores.performance}</td>
          <td class="${summary.avgScores.performance >= 90 ? 'status-excellent' : summary.avgScores.performance >= 50 ? 'status-good' : 'status-poor'}">${getStatus(summary.avgScores.performance)}</td>
        </tr>
        <tr>
          <td>可访问性 (Accessibility)</td>
          <td>${summary.avgScores.accessibility}</td>
          <td class="${summary.avgScores.accessibility >= 90 ? 'status-excellent' : summary.avgScores.accessibility >= 50 ? 'status-good' : 'status-poor'}">${getStatus(summary.avgScores.accessibility)}</td>
        </tr>
        <tr>
          <td>最佳实践 (Best Practices)</td>
          <td>${summary.avgScores.bestPractices}</td>
          <td class="${summary.avgScores.bestPractices >= 90 ? 'status-excellent' : summary.avgScores.bestPractices >= 50 ? 'status-good' : 'status-poor'}">${getStatus(summary.avgScores.bestPractices)}</td>
        </tr>
        <tr>
          <td>SEO</td>
          <td>${summary.avgScores.seo}</td>
          <td class="${summary.avgScores.seo >= 90 ? 'status-excellent' : summary.avgScores.seo >= 50 ? 'status-good' : 'status-poor'}">${getStatus(summary.avgScores.seo)}</td>
        </tr>
      </tbody>
    </table>

    <h2>🎯 Core Web Vitals 平均值</h2>
    <table>
      <thead>
        <tr>
          <th>指标</th>
          <th>值</th>
          <th>目标</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>FCP (First Contentful Paint)</td>
          <td>${formatMs(summary.avgAudits.fcp)}</td>
          <td>&lt; 1500ms</td>
          <td class="${summary.avgAudits.fcp < 1500 ? 'pass' : 'fail'}">${getStatusIcon(summary.avgAudits.fcp < 1500)}</td>
        </tr>
        <tr>
          <td>LCP (Largest Contentful Paint)</td>
          <td>${formatMs(summary.avgAudits.lcp)}</td>
          <td>&lt; 2500ms</td>
          <td class="${summary.avgAudits.lcp < 2500 ? 'pass' : 'fail'}">${getStatusIcon(summary.avgAudits.lcp < 2500)}</td>
        </tr>
        <tr>
          <td>CLS (Cumulative Layout Shift)</td>
          <td>${summary.avgAudits.cls.toFixed(3)}</td>
          <td>&lt; 0.1</td>
          <td class="${summary.avgAudits.cls < 0.1 ? 'pass' : 'fail'}">${getStatusIcon(summary.avgAudits.cls < 0.1)}</td>
        </tr>
        <tr>
          <td>TBT (Total Blocking Time)</td>
          <td>${formatMs(summary.avgAudits.tbt)}</td>
          <td>&lt; 300ms</td>
          <td class="${summary.avgAudits.tbt < 300 ? 'pass' : 'fail'}">${getStatusIcon(summary.avgAudits.tbt < 300)}</td>
        </tr>
        <tr>
          <td>SI (Speed Index)</td>
          <td>${formatMs(summary.avgAudits.si)}</td>
          <td>&lt; 3500ms</td>
          <td class="${summary.avgAudits.si < 3500 ? 'pass' : 'fail'}">${getStatusIcon(summary.avgAudits.si < 3500)}</td>
        </tr>
      </tbody>
    </table>

    <h2>📄 各页面详细报告</h2>
`;

  pages.forEach(page => {
    const scores = page.current.scores;
    const audits = page.current.audits;
    
    html += `
    <div class="page-section">
      <h3>${page.current.name}</h3>
      <p><strong>URL:</strong> ${page.current.url}</p>
      <p><strong>测试时间:</strong> ${new Date(page.current.timestamp).toLocaleString('zh-CN')}</p>
      
      <h4>分类评分</h4>
      <table>
        <thead>
          <tr>
            <th>指标</th>
            <th>当前</th>
            <th>基线</th>
            <th>变化</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>性能</td>
            <td>${scores.performance}</td>
            <td>${page.baseline?.scores.performance || 'N/A'}</td>
            <td>${page.diff?.scores.performance ? calculateDiff(scores.performance, page.baseline!.scores.performance) : 'N/A'}</td>
            <td class="${scores.performance >= 90 ? 'status-excellent' : scores.performance >= 50 ? 'status-good' : 'status-poor'}">${getStatus(scores.performance)}</td>
          </tr>
          <tr>
            <td>可访问性</td>
            <td>${scores.accessibility}</td>
            <td>${page.baseline?.scores.accessibility || 'N/A'}</td>
            <td>${page.diff?.scores.accessibility ? calculateDiff(scores.accessibility, page.baseline!.scores.accessibility) : 'N/A'}</td>
            <td class="${scores.accessibility >= 90 ? 'status-excellent' : scores.accessibility >= 50 ? 'status-good' : 'status-poor'}">${getStatus(scores.accessibility)}</td>
          </tr>
          <tr>
            <td>最佳实践</td>
            <td>${scores.bestPractices}</td>
            <td>${page.baseline?.scores.bestPractices || 'N/A'}</td>
            <td>${page.diff?.scores.bestPractices ? calculateDiff(scores.bestPractices, page.baseline!.scores.bestPractices) : 'N/A'}</td>
            <td class="${scores.bestPractices >= 90 ? 'status-excellent' : scores.bestPractices >= 50 ? 'status-good' : 'status-poor'}">${getStatus(scores.bestPractices)}</td>
          </tr>
          <tr>
            <td>SEO</td>
            <td>${scores.seo}</td>
            <td>${page.baseline?.scores.seo || 'N/A'}</td>
            <td>${page.diff?.scores.seo ? calculateDiff(scores.seo, page.baseline!.scores.seo) : 'N/A'}</td>
            <td class="${scores.seo >= 90 ? 'status-excellent' : scores.seo >= 50 ? 'status-good' : 'status-poor'}">${getStatus(scores.seo)}</td>
          </tr>
        </tbody>
      </table>
      
      <h4>Core Web Vitals</h4>
      <table>
        <thead>
          <tr>
            <th>指标</th>
            <th>当前</th>
            <th>基线</th>
            <th>变化</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FCP</td>
            <td>${formatMs(audits.fcp)}</td>
            <td>${page.baseline ? formatMs(page.baseline.audits.fcp) : 'N/A'}</td>
            <td>${page.diff?.audits.fcp ? formatMs(page.diff.audits.fcp) : 'N/A'}</td>
            <td class="${audits.fcp < 1500 ? 'pass' : 'fail'}">${getStatusIcon(audits.fcp < 1500)}</td>
          </tr>
          <tr>
            <td>LCP</td>
            <td>${formatMs(audits.lcp)}</td>
            <td>${page.baseline ? formatMs(page.baseline.audits.lcp) : 'N/A'}</td>
            <td>${page.diff?.audits.lcp ? formatMs(page.diff.audits.lcp) : 'N/A'}</td>
            <td class="${audits.lcp < 2500 ? 'pass' : 'fail'}">${getStatusIcon(audits.lcp < 2500)}</td>
          </tr>
          <tr>
            <td>CLS</td>
            <td>${audits.cls.toFixed(3)}</td>
            <td>${page.baseline ? page.baseline.audits.cls.toFixed(3) : 'N/A'}</td>
            <td>${page.diff?.audits.cls ? page.diff.audits.cls.toFixed(3) : 'N/A'}</td>
            <td class="${audits.cls < 0.1 ? 'pass' : 'fail'}">${getStatusIcon(audits.cls < 0.1)}</td>
          </tr>
          <tr>
            <td>TBT</td>
            <td>${formatMs(audits.tbt)}</td>
            <td>${page.baseline ? formatMs(page.baseline.audits.tbt) : 'N/A'}</td>
            <td>${page.diff?.audits.tbt ? formatMs(page.diff.audits.tbt) : 'N/A'}</td>
            <td class="${audits.tbt < 300 ? 'pass' : 'fail'}">${getStatusIcon(audits.tbt < 300)}</td>
          </tr>
          <tr>
            <td>SI</td>
            <td>${formatMs(audits.si)}</td>
            <td>${page.baseline ? formatMs(page.baseline.audits.si) : 'N/A'}</td>
            <td>${page.diff?.audits.si ? formatMs(page.diff.audits.si) : 'N/A'}</td>
            <td class="${audits.si < 3500 ? 'pass' : 'fail'}">${getStatusIcon(audits.si < 3500)}</td>
          </tr>
        </tbody>
      </table>
    </div>
`;
  });

  html += `
    <h2>💡 改进建议</h2>
    <div class="recommendations">
      <ol>
`;

  recommendations.forEach(rec => {
    html += `        <li>${rec}</li>\n`;
  });

  html += `
      </ol>
    </div>

    <h2>📌 说明</h2>
    <ul>
      <li>🟢 优秀: 90-100 分</li>
      <li>🟡 需要改进: 50-89 分</li>
      <li>🔴 差: 0-49 分</li>
      <li>✅ 通过: 指标达到目标值</li>
      <li>❌ 未通过: 指标未达到目标值</li>
    </ul>
  </div>
</body>
</html>
`;

  return html;
}

// ================================================================
// 主函数
// ================================================================

async function generateReport(): Promise<void> {
  console.log('\n🚀 开始生成性能报告...\n');
  console.log('='.repeat(60));
  
  ensureOutputDir();
  
  // 1. 加载数据
  console.log('\n📊 步骤 1: 加载性能数据');
  const currentResults = loadLatestLighthouseResults();
  
  if (currentResults.length === 0) {
    console.error('❌ 未找到 Lighthouse 测试结果');
    console.log('\n💡 提示: 请先运行 Lighthouse 测试:');
    console.log('   npm run lighthouse');
    process.exit(1);
  }
  
  console.log(`   ✅ 已加载 ${currentResults.length} 个页面的测试结果`);
  
  const baseline = loadBaselineScores();
  if (baseline) {
    console.log('   ✅ 已加载基线数据');
  } else {
    console.log('   ⚠️  未找到基线数据，将不进行对比');
  }
  
  // 2. 对比分析
  console.log('\n📈 步骤 2: 对比分析');
  const comparisons = compareWithBaseline(currentResults, baseline);
  console.log(`   ✅ 已完成 ${comparisons.length} 个页面的对比分析`);
  
  // 3. 计算汇总数据
  console.log('\n🔢 步骤 3: 计算汇总数据');
  
  const allScores = currentResults.map(r => r.scores);
  const allAudits = currentResults.map(r => r.audits);
  
  const summary = {
    totalPages: currentResults.length,
    avgScores: {
      performance: average(allScores.map(s => s.performance)),
      accessibility: average(allScores.map(s => s.accessibility)),
      bestPractices: average(allScores.map(s => s.bestPractices)),
      seo: average(allScores.map(s => s.seo)),
      pwa: average(allScores.map(s => s.pwa))
    },
    avgAudits: {
      fcp: average(allAudits.map(a => a.fcp)),
      lcp: average(allAudits.map(a => a.lcp)),
      cls: allAudits.reduce((sum, a) => sum + a.cls, 0) / allAudits.length,
      tbt: average(allAudits.map(a => a.tbt)),
      si: average(allAudits.map(a => a.si))
    },
    passedPages: currentResults.filter(r => 
      r.scores.performance >= 90 &&
      r.audits.lcp < 2500 &&
      r.audits.cls < 0.1 &&
      r.audits.tbt < 300
    ).length,
    failedPages: 0
  };
  
  summary.failedPages = summary.totalPages - summary.passedPages;
  
  console.log(`   ✅ 平均性能评分: ${summary.avgScores.performance}`);
  console.log(`   ✅ 通过页面数: ${summary.passedPages}/${summary.totalPages}`);
  
  // 4. 生成建议
  console.log('\n💡 步骤 4: 生成改进建议');
  const recommendations = generateRecommendations(comparisons);
  console.log(`   ✅ 已生成 ${recommendations.length} 条建议`);
  
  // 5. 构建报告对象
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    summary,
    pages: comparisons,
    recommendations
  };
  
  // 6. 生成报告文件
  console.log('\n📝 步骤 5: 生成报告文件');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  // Markdown 报告
  const mdReport = generateMarkdownReport(report);
  const mdPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport, 'utf-8');
  console.log(`   ✅ Markdown 报告: ${mdPath}`);
  
  // HTML 报告
  const htmlReport = generateHTMLReport(report);
  const htmlPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.html`);
  fs.writeFileSync(htmlPath, htmlReport, 'utf-8');
  console.log(`   ✅ HTML 报告: ${htmlPath}`);
  
  // JSON 报告
  const jsonPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`   ✅ JSON 报告: ${jsonPath}`);
  
  // 7. 显示摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 性能报告摘要');
  console.log('='.repeat(60));
  console.log(`\n测试时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}`);
  console.log(`测试页面数: ${summary.totalPages}`);
  console.log(`通过页面数: ${summary.passedPages}/${summary.totalPages}`);
  console.log(`\n总体平均评分:`);
  console.log(`  性能:       ${summary.avgScores.performance} ${getStatus(summary.avgScores.performance)}`);
  console.log(`  可访问性:   ${summary.avgScores.accessibility} ${getStatus(summary.avgScores.accessibility)}`);
  console.log(`  最佳实践:   ${summary.avgScores.bestPractices} ${getStatus(summary.avgScores.bestPractices)}`);
  console.log(`  SEO:        ${summary.avgScores.seo} ${getStatus(summary.avgScores.seo)}`);
  console.log(`\nCore Web Vitals 平均值:`);
  console.log(`  FCP: ${formatMs(summary.avgAudits.fcp)} ${getStatusIcon(summary.avgAudits.fcp < 1500)}`);
  console.log(`  LCP: ${formatMs(summary.avgAudits.lcp)} ${getStatusIcon(summary.avgAudits.lcp < 2500)}`);
  console.log(`  CLS: ${summary.avgAudits.cls.toFixed(3)} ${getStatusIcon(summary.avgAudits.cls < 0.1)}`);
  console.log(`  TBT: ${formatMs(summary.avgAudits.tbt)} ${getStatusIcon(summary.avgAudits.tbt < 300)}`);
  console.log('\n' + '='.repeat(60));
  
  console.log('\n✅ 性能报告生成完成！');
  console.log(`\n📁 报告保存在: ${CONFIG.outputDir}`);
  console.log(`\n💡 提示: 在浏览器中打开 HTML 报告以查看详细信息`);
}

// 运行
generateReport().catch(error => {
  console.error('\n❌ 生成报告失败:', error);
  console.error('\n堆栈信息:', error.stack);
  process.exit(1);
});
