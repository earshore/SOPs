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

interface LighthouseResultFile {
  name: string;
  path: string;
  time: number;
}

type AuditMetricKey = keyof AuditMetrics;

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
  
  const results: PageResult[] = [];
  const processedUrls = new Set<string>();
  
  for (const file of getLighthouseResultFiles()) {
    const result = parseLighthouseResultFile(file, processedUrls);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

function getLighthouseResultFiles(): LighthouseResultFile[] {
  return fs.readdirSync(CONFIG.lhciDir)
    .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
    .map(name => {
      const filePath = path.join(CONFIG.lhciDir, name);
      return {
        name,
        path: filePath,
        time: fs.statSync(filePath).mtime.getTime()
      };
    })
    .sort((a, b) => b.time - a.time);
}

function parseLighthouseResultFile(
  file: LighthouseResultFile,
  processedUrls: Set<string>
): PageResult | null {
  try {
    const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
    const url = data.finalUrl || data.requestedUrl;
    
    if (!url || processedUrls.has(url)) {
      return null;
    }

    processedUrls.add(url);
    return createPageResult(url, data, file.time);
  } catch (error) {
    console.error(`❌ 读取文件失败: ${file.name}`, error);
    return null;
  }
}

function createPageResult(url: string, data: any, timestamp: number): PageResult {
  return {
    url,
    name: getPageName(url),
    scores: createPerformanceScores(data.categories),
    audits: createAuditMetrics(data.audits),
    timestamp: new Date(timestamp).toISOString()
  };
}

function createPerformanceScores(categories: any): PerformanceScore {
  return {
    performance: getCategoryScore(categories, 'performance'),
    accessibility: getCategoryScore(categories, 'accessibility'),
    bestPractices: getCategoryScore(categories, 'best-practices'),
    seo: getCategoryScore(categories, 'seo'),
    pwa: getCategoryScore(categories, 'pwa')
  };
}

function getCategoryScore(categories: any, category: string): number {
  return Math.round((categories[category]?.score || 0) * 100);
}

function createAuditMetrics(audits: any): AuditMetrics {
  return {
    fcp: getAuditMetric(audits, 'first-contentful-paint'),
    lcp: getAuditMetric(audits, 'largest-contentful-paint'),
    cls: getAuditMetric(audits, 'cumulative-layout-shift'),
    tbt: getAuditMetric(audits, 'total-blocking-time'),
    si: getAuditMetric(audits, 'speed-index'),
    tti: audits['interactive']?.numericValue
  };
}

function getAuditMetric(audits: any, auditName: string): number {
  return audits[auditName]?.numericValue || 0;
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

function generateMarkdownHeader(report: PerformanceReport): string {
  const { summary } = report;

  return `# 性能测试报告\n\n` +
    `**生成时间:** ${new Date(report.timestamp).toLocaleString('zh-CN')}\n` +
    `**测试页面数:** ${summary.totalPages}\n` +
    `**通过页面数:** ${summary.passedPages}/${summary.totalPages}\n\n` +
    `---\n\n`;
}

function generateMarkdownSummaryScores(summary: PerformanceReport['summary']): string {
  return `## 📊 总体平均评分\n\n` +
    `| 指标 | 分数 | 状态 |\n` +
    `|------|------|------|\n` +
    `| 性能 (Performance) | ${summary.avgScores.performance} | ${getStatus(summary.avgScores.performance)} |\n` +
    `| 可访问性 (Accessibility) | ${summary.avgScores.accessibility} | ${getStatus(summary.avgScores.accessibility)} |\n` +
    `| 最佳实践 (Best Practices) | ${summary.avgScores.bestPractices} | ${getStatus(summary.avgScores.bestPractices)} |\n` +
    `| SEO | ${summary.avgScores.seo} | ${getStatus(summary.avgScores.seo)} |\n` +
    `| PWA | ${summary.avgScores.pwa} | ${getStatus(summary.avgScores.pwa)} |\n\n`;
}

function generateMarkdownSummaryVitals(summary: PerformanceReport['summary']): string {
  return `## 🎯 Core Web Vitals 平均值\n\n` +
    `| 指标 | 值 | 目标 | 状态 |\n` +
    `|------|-----|------|------|\n` +
    `| FCP (First Contentful Paint) | ${formatMs(summary.avgAudits.fcp)} | < 1500ms | ${getStatusIcon(summary.avgAudits.fcp < 1500)} |\n` +
    `| LCP (Largest Contentful Paint) | ${formatMs(summary.avgAudits.lcp)} | < 2500ms | ${getStatusIcon(summary.avgAudits.lcp < 2500)} |\n` +
    `| CLS (Cumulative Layout Shift) | ${summary.avgAudits.cls.toFixed(3)} | < 0.1 | ${getStatusIcon(summary.avgAudits.cls < 0.1)} |\n` +
    `| TBT (Total Blocking Time) | ${formatMs(summary.avgAudits.tbt)} | < 300ms | ${getStatusIcon(summary.avgAudits.tbt < 300)} |\n` +
    `| SI (Speed Index) | ${formatMs(summary.avgAudits.si)} | < 3500ms | ${getStatusIcon(summary.avgAudits.si < 3500)} |\n\n` +
    `---\n\n`;
}

function generateMarkdownScoreRow(
  label: string,
  key: keyof PerformanceScore,
  page: ComparisonResult
): string {
  const current = page.current.scores[key];
  const baseline = page.baseline?.scores[key];
  const diff = page.diff?.scores[key];

  return `| ${label} | ${current} | ${baseline || 'N/A'} | ${diff ? calculateDiff(current, baseline!) : 'N/A'} | ${getStatus(current)} |\n`;
}

function formatAuditMetric(key: keyof AuditMetrics, value: number): string {
  return key === 'cls' ? value.toFixed(3) : formatMs(value);
}

function generateMarkdownAuditRow(
  label: string,
  key: keyof AuditMetrics,
  page: ComparisonResult,
  threshold: number
): string {
  const current = page.current.audits[key] || 0;
  const baseline = page.baseline?.audits[key];
  const diff = page.diff?.audits[key];
  const baselineText = baseline !== undefined ? formatAuditMetric(key, baseline) : 'N/A';
  const diffText = diff ? formatAuditMetric(key, diff) : 'N/A';

  return `| ${label} | ${formatAuditMetric(key, current)} | ${baselineText} | ${diffText} | ${getStatusIcon(current < threshold)} |\n`;
}

function generateMarkdownPageSection(page: ComparisonResult): string {
  return `### ${page.current.name}\n\n` +
    `**URL:** ${page.current.url}\n` +
    `**测试时间:** ${new Date(page.current.timestamp).toLocaleString('zh-CN')}\n\n` +
    `**分类评分:**\n\n` +
    `| 指标 | 当前 | 基线 | 变化 | 状态 |\n` +
    `|------|------|------|------|------|\n` +
    generateMarkdownScoreRow('性能', 'performance', page) +
    generateMarkdownScoreRow('可访问性', 'accessibility', page) +
    generateMarkdownScoreRow('最佳实践', 'bestPractices', page) +
    generateMarkdownScoreRow('SEO', 'seo', page) +
    `\n` +
    `**Core Web Vitals:**\n\n` +
    `| 指标 | 当前 | 基线 | 变化 | 状态 |\n` +
    `|------|------|------|------|------|\n` +
    generateMarkdownAuditRow('FCP', 'fcp', page, 1500) +
    generateMarkdownAuditRow('LCP', 'lcp', page, 2500) +
    generateMarkdownAuditRow('CLS', 'cls', page, 0.1) +
    generateMarkdownAuditRow('TBT', 'tbt', page, 300) +
    generateMarkdownAuditRow('SI', 'si', page, 3500) +
    `\n`;
}

function generateMarkdownPageSections(pages: ComparisonResult[]): string {
  return `## 📄 各页面详细报告\n\n` +
    pages.map(generateMarkdownPageSection).join('');
}

function generateMarkdownRecommendationsSection(recommendations: string[]): string {
  return `---\n\n` +
    `## 💡 改进建议\n\n` +
    recommendations.map((rec, index) => `${index + 1}. ${rec}\n`).join('') +
    `\n---\n\n`;
}

function generateMarkdownNotesSection(): string {
  return `## 📌 说明\n\n` +
    `- 🟢 优秀: 90-100 分\n` +
    `- 🟡 需要改进: 50-89 分\n` +
    `- 🔴 差: 0-49 分\n` +
    `- ✅ 通过: 指标达到目标值\n` +
    `- ❌ 未通过: 指标未达到目标值\n\n`;
}

function generateMarkdownReport(report: PerformanceReport): string {
  return [
    generateMarkdownHeader(report),
    generateMarkdownSummaryScores(report.summary),
    generateMarkdownSummaryVitals(report.summary),
    generateMarkdownPageSections(report.pages),
    generateMarkdownRecommendationsSection(report.recommendations),
    generateMarkdownNotesSection()
  ].join('');
}

function getStatusClass(score: number): string {
  if (score >= 90) return 'status-excellent';
  if (score >= 50) return 'status-good';
  return 'status-poor';
}

function getPassClass(passed: boolean): string {
  return passed ? 'pass' : 'fail';
}

function generateHTMLStyles(): string {
  return `  <style>
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
  </style>`;
}

function generateHTMLHeader(report: PerformanceReport): string {
  const { summary } = report;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>性能测试报告 - ${new Date(report.timestamp).toLocaleDateString('zh-CN')}</title>
${generateHTMLStyles()}
</head>
<body>
  <div class="container">
    <h1>🚀 性能测试报告</h1>
    <div class="meta">
      <span>📅 生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</span>
      <span>📄 测试页面: ${summary.totalPages}</span>
      <span>✅ 通过: ${summary.passedPages}/${summary.totalPages}</span>
    </div>
`;
}

function generateSummaryScoresTable(summary: PerformanceReport['summary']): string {
  const { avgScores } = summary;

  return `
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
          <td>${avgScores.performance}</td>
          <td class="${getStatusClass(avgScores.performance)}">${getStatus(avgScores.performance)}</td>
        </tr>
        <tr>
          <td>可访问性 (Accessibility)</td>
          <td>${avgScores.accessibility}</td>
          <td class="${getStatusClass(avgScores.accessibility)}">${getStatus(avgScores.accessibility)}</td>
        </tr>
        <tr>
          <td>最佳实践 (Best Practices)</td>
          <td>${avgScores.bestPractices}</td>
          <td class="${getStatusClass(avgScores.bestPractices)}">${getStatus(avgScores.bestPractices)}</td>
        </tr>
        <tr>
          <td>SEO</td>
          <td>${avgScores.seo}</td>
          <td class="${getStatusClass(avgScores.seo)}">${getStatus(avgScores.seo)}</td>
        </tr>
      </tbody>
    </table>
`;
}

function generateSummaryVitalsTable(summary: PerformanceReport['summary']): string {
  const { avgAudits } = summary;

  return `
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
          <td>${formatMs(avgAudits.fcp)}</td>
          <td>&lt; 1500ms</td>
          <td class="${getPassClass(avgAudits.fcp < 1500)}">${getStatusIcon(avgAudits.fcp < 1500)}</td>
        </tr>
        <tr>
          <td>LCP (Largest Contentful Paint)</td>
          <td>${formatMs(avgAudits.lcp)}</td>
          <td>&lt; 2500ms</td>
          <td class="${getPassClass(avgAudits.lcp < 2500)}">${getStatusIcon(avgAudits.lcp < 2500)}</td>
        </tr>
        <tr>
          <td>CLS (Cumulative Layout Shift)</td>
          <td>${avgAudits.cls.toFixed(3)}</td>
          <td>&lt; 0.1</td>
          <td class="${getPassClass(avgAudits.cls < 0.1)}">${getStatusIcon(avgAudits.cls < 0.1)}</td>
        </tr>
        <tr>
          <td>TBT (Total Blocking Time)</td>
          <td>${formatMs(avgAudits.tbt)}</td>
          <td>&lt; 300ms</td>
          <td class="${getPassClass(avgAudits.tbt < 300)}">${getStatusIcon(avgAudits.tbt < 300)}</td>
        </tr>
        <tr>
          <td>SI (Speed Index)</td>
          <td>${formatMs(avgAudits.si)}</td>
          <td>&lt; 3500ms</td>
          <td class="${getPassClass(avgAudits.si < 3500)}">${getStatusIcon(avgAudits.si < 3500)}</td>
        </tr>
      </tbody>
    </table>
`;
}

function generatePageScoreRows(page: ComparisonResult): string {
  const scores = page.current.scores;

  return `          <tr>
            <td>性能</td>
            <td>${scores.performance}</td>
            <td>${page.baseline?.scores.performance || 'N/A'}</td>
            <td>${page.diff?.scores.performance ? calculateDiff(scores.performance, page.baseline!.scores.performance) : 'N/A'}</td>
            <td class="${getStatusClass(scores.performance)}">${getStatus(scores.performance)}</td>
          </tr>
          <tr>
            <td>可访问性</td>
            <td>${scores.accessibility}</td>
            <td>${page.baseline?.scores.accessibility || 'N/A'}</td>
            <td>${page.diff?.scores.accessibility ? calculateDiff(scores.accessibility, page.baseline!.scores.accessibility) : 'N/A'}</td>
            <td class="${getStatusClass(scores.accessibility)}">${getStatus(scores.accessibility)}</td>
          </tr>
          <tr>
            <td>最佳实践</td>
            <td>${scores.bestPractices}</td>
            <td>${page.baseline?.scores.bestPractices || 'N/A'}</td>
            <td>${page.diff?.scores.bestPractices ? calculateDiff(scores.bestPractices, page.baseline!.scores.bestPractices) : 'N/A'}</td>
            <td class="${getStatusClass(scores.bestPractices)}">${getStatus(scores.bestPractices)}</td>
          </tr>
          <tr>
            <td>SEO</td>
            <td>${scores.seo}</td>
            <td>${page.baseline?.scores.seo || 'N/A'}</td>
            <td>${page.diff?.scores.seo ? calculateDiff(scores.seo, page.baseline!.scores.seo) : 'N/A'}</td>
            <td class="${getStatusClass(scores.seo)}">${getStatus(scores.seo)}</td>
          </tr>`;
}

function generatePageVitalsRows(page: ComparisonResult): string {
  const audits = page.current.audits;
  const rows = [
    createVitalsRowConfig('FCP', 'fcp', audits.fcp < 1500, formatMs),
    createVitalsRowConfig('LCP', 'lcp', audits.lcp < 2500, formatMs),
    createVitalsRowConfig('CLS', 'cls', audits.cls < 0.1, value => value.toFixed(3)),
    createVitalsRowConfig('TBT', 'tbt', audits.tbt < 300, formatMs),
    createVitalsRowConfig('SI', 'si', audits.si < 3500, formatMs),
  ];

  return rows.map(row => generatePageVitalsRow(page, row)).join('');
}

function createVitalsRowConfig(
  label: string,
  key: AuditMetricKey,
  passed: boolean,
  formatter: (value: number) => string
) {
  return { label, key, passed, formatter };
}

function generatePageVitalsRow(
  page: ComparisonResult,
  row: ReturnType<typeof createVitalsRowConfig>
): string {
  const currentValue = page.current.audits[row.key];
  const baselineValue = page.baseline?.audits[row.key];
  const diffValue = page.diff?.audits[row.key];

  return `          <tr>
            <td>${row.label}</td>
            <td>${row.formatter(currentValue || 0)}</td>
            <td>${baselineValue !== undefined ? row.formatter(baselineValue) : 'N/A'}</td>
            <td>${diffValue ? row.formatter(diffValue) : 'N/A'}</td>
            <td class="${getPassClass(row.passed)}">${getStatusIcon(row.passed)}</td>
          </tr>`;
}

function generatePageSection(page: ComparisonResult): string {
  return `
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
${generatePageScoreRows(page)}
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
${generatePageVitalsRows(page)}
        </tbody>
      </table>
    </div>
`;
}

function generateRecommendationsSection(recommendations: string[]): string {
  const items = recommendations.map(rec => `        <li>${rec}</li>\n`).join('');

  return `
    <h2>💡 改进建议</h2>
    <div class="recommendations">
      <ol>
${items}      </ol>
    </div>
`;
}

function generateReportNotesSection(): string {
  return `
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
}

function generateHTMLReport(report: PerformanceReport): string {
  const { summary, pages, recommendations } = report;

  return [
    generateHTMLHeader(report),
    generateSummaryScoresTable(summary),
    generateSummaryVitalsTable(summary),
    `    <h2>📄 各页面详细报告</h2>\n`,
    pages.map(generatePageSection).join(''),
    generateRecommendationsSection(recommendations),
    generateReportNotesSection()
  ].join('');
}

function calculateReportSummary(currentResults: PageResult[]): PerformanceReport['summary'] {
  const allScores = currentResults.map(r => r.scores);
  const allAudits = currentResults.map(r => r.audits);
  const passedPages = currentResults.filter(r =>
    r.scores.performance >= 90 &&
    r.audits.lcp < 2500 &&
    r.audits.cls < 0.1 &&
    r.audits.tbt < 300
  ).length;

  return {
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
    passedPages,
    failedPages: currentResults.length - passedPages
  };
}

function writeReportFiles(report: PerformanceReport): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  const mdReport = generateMarkdownReport(report);
  const mdPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdReport, 'utf-8');
  console.log(`   ✅ Markdown 报告: ${mdPath}`);

  const htmlReport = generateHTMLReport(report);
  const htmlPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.html`);
  fs.writeFileSync(htmlPath, htmlReport, 'utf-8');
  console.log(`   ✅ HTML 报告: ${htmlPath}`);

  const jsonPath = path.join(CONFIG.outputDir, `performance-report-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`   ✅ JSON 报告: ${jsonPath}`);
}

function printReportSummary(report: PerformanceReport): void {
  const { summary } = report;

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
  const summary = calculateReportSummary(currentResults);
  
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
  writeReportFiles(report);
  
  // 7. 显示摘要
  printReportSummary(report);
  
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
