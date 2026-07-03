/**
 * 质量仪表板生成器
 * 整合所有质量指标并生成HTML仪表板
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  reportsDir: path.join(__dirname, 'reports'),
  outputFile: path.join(__dirname, 'reports', 'quality-dashboard.html')
};

/**
 * 读取质量指标数据
 */
function loadMetrics() {
  const metrics = {
    quality: null,
    coverage: null,
    lighthouse: null,
    timestamp: new Date().toISOString()
  };

  // 读取代码质量数据
  const qualityFile = path.join(CONFIG.reportsDir, 'quality-latest.json');
  if (fs.existsSync(qualityFile)) {
    metrics.quality = JSON.parse(fs.readFileSync(qualityFile, 'utf-8'));
  }

  // 读取覆盖率数据
  const coverageFile = path.join(CONFIG.reportsDir, 'coverage-baseline.json');
  if (fs.existsSync(coverageFile)) {
    metrics.coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
  }

  // 读取性能数据
  const lighthouseFile = path.join(__dirname, '../performance/baseline-scores.json');
  if (fs.existsSync(lighthouseFile)) {
    metrics.lighthouse = JSON.parse(fs.readFileSync(lighthouseFile, 'utf-8'));
  }

  return metrics;
}

/**
 * 生成HTML仪表板
 */
function generateDashboard(metrics) {
  const generatedAt = new Date(metrics.timestamp).toLocaleString('zh-CN');
  const footerGeneratedAt = new Date().toLocaleString('zh-CN');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>质量仪表板 - 系统稳定性优化</title>
  <style>
${generateDashboardStyles()}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 质量仪表板</h1>
      <div class="subtitle">系统稳定性优化 - 质量基线报告</div>
      <div class="timestamp">生成时间: ${generatedAt}</div>
    </div>

    ${generateOverviewSection(metrics)}
    ${generateQualitySection(metrics.quality)}
    ${generateCoverageSection(metrics.coverage)}
    ${generatePerformanceSection(metrics.lighthouse)}

    <!-- Footer -->
    <div class="footer">
      <p>© 2025 系统稳定性优化项目 | 自动生成于 ${footerGeneratedAt}</p>
    </div>
  </div>

  <script>
${generateDashboardScript()}
  </script>
</body>
</html>`;
}

function generateDashboardStyles() {
  return [
    generateBaseDashboardStyles(),
    generateCardDashboardStyles(),
    generateMetricDashboardStyles(),
    generateTableDashboardStyles()
  ].join('\n');
}

function generateBaseDashboardStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      color: #2d3748;
      font-size: 32px;
      margin-bottom: 10px;
    }

    .header .subtitle {
      color: #718096;
      font-size: 16px;
    }

    .header .timestamp {
      color: #a0aec0;
      font-size: 14px;
      margin-top: 10px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
  `;
}

function generateCardDashboardStyles() {
  return `
    .card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-icon {
      font-size: 32px;
      margin-right: 15px;
    }

    .card-title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .stat-item {
      padding: 15px;
      background: #f7fafc;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .stat-label {
      font-size: 12px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #2d3748;
    }

    .footer {
      background: white;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      color: #718096;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #a0aec0;
      font-size: 16px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .card {
        break-inside: avoid;
      }
    }
  `;
}

function generateMetricDashboardStyles() {
  return `
    .metric {
      margin-bottom: 15px;
    }

    .metric-label {
      font-size: 14px;
      color: #718096;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
    }

    .metric-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }

    .metric-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .status-excellent { color: #48bb78; }
    .status-good { color: #4299e1; }
    .status-warning { color: #ed8936; }
    .status-poor { color: #f56565; }

    .bar-excellent { background: linear-gradient(90deg, #48bb78, #38a169); }
    .bar-good { background: linear-gradient(90deg, #4299e1, #3182ce); }
    .bar-warning { background: linear-gradient(90deg, #ed8936, #dd6b20); }
    .bar-poor { background: linear-gradient(90deg, #f56565, #e53e3e); }
  `;
}

function generateTableDashboardStyles() {
  return `
    .table-container {
      overflow-x: auto;
      margin-top: 15px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      background: #f7fafc;
      font-weight: 600;
      color: #4a5568;
      font-size: 14px;
    }

    td {
      color: #2d3748;
      font-size: 14px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-success {
      background: #c6f6d5;
      color: #22543d;
    }

    .badge-warning {
      background: #feebc8;
      color: #7c2d12;
    }

    .badge-error {
      background: #fed7d7;
      color: #742a2a;
    }
  `;
}

function generateDashboardScript() {
  return `
    // 动画效果
    document.addEventListener('DOMContentLoaded', () => {
      const bars = document.querySelectorAll('.metric-bar-fill');
      bars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
          bar.style.width = width;
        }, 100);
      });
    });
  `;
}

/**
 * 生成概览部分
 */
function generateOverviewSection(metrics) {
  const hasData = metrics.quality || metrics.coverage || metrics.lighthouse;
  
  if (!hasData) {
    return '<div class="card"><div class="no-data">暂无数据，请先运行质量检查</div></div>';
  }

  const overallScore = calculateOverallScore(metrics);
  const status = getScoreStatus(overallScore);

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">🎯</div>
        <div class="card-title">总体质量评分</div>
      </div>
      <div class="metric">
        <div class="metric-value status-${status}">${overallScore}分</div>
        <div class="metric-bar">
          <div class="metric-bar-fill bar-${status}" style="width: ${overallScore}%"></div>
        </div>
      </div>
      <div class="stats-grid">
        ${metrics.quality ? `
        <div class="stat-item">
          <div class="stat-label">代码质量</div>
          <div class="stat-value">${calculateQualityScore(metrics.quality)}</div>
        </div>` : ''}
        ${metrics.coverage ? `
        <div class="stat-item">
          <div class="stat-label">测试覆盖率</div>
          <div class="stat-value">${Math.round(metrics.coverage.summary.lines.pct)}%</div>
        </div>` : ''}
        ${metrics.lighthouse ? `
        <div class="stat-item">
          <div class="stat-label">性能评分</div>
          <div class="stat-value">${metrics.lighthouse.overallAverage.performance}</div>
        </div>` : ''}
        <div class="stat-item">
          <div class="stat-label">状态</div>
          <div class="stat-value">${getStatusBadge(status)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 生成代码质量部分
 */
function generateQualitySection(quality) {
  if (!quality) {
    return '<div class="card"><div class="no-data">代码质量数据未找到</div></div>';
  }

  return `
    <div class="grid">
      ${generateEslintQualityCard(quality.eslint)}
      ${generateTypeScriptQualityCard(quality.typescript)}
      ${generateCodeStatsCard(quality.codeStats)}
      ${generateComplexityQualityCard(quality.complexity)}
    </div>
  `;
}

function generateEslintQualityCard(eslint) {
  const score = calculateESLintScore(eslint);

  return `
      <div class="card">
        <div class="card-header">
          <div class="card-icon">📋</div>
          <div class="card-title">ESLint 检查</div>
        </div>
        ${generateScoreMetric('质量评分', score)}
        <div class="stats-grid">
          ${generateStatItem('检查文件', eslint.totalFiles)}
          ${generateStatItem('错误数', eslint.totalErrors, eslint.totalErrors > 0 ? 'poor' : 'excellent')}
          ${generateStatItem('警告数', eslint.totalWarnings, eslint.totalWarnings > 10 ? 'warning' : 'good')}
          ${generateStatItem('规则数', Object.keys(eslint.errorsByRule).length)}
        </div>
        ${generateTopIssuesTable(eslint.errorsByRule, 'ESLint 规则')}
      </div>
  `;
}

function generateTypeScriptQualityCard(typescript) {
  const score = calculateTSScore(typescript);

  return `
      <div class="card">
        <div class="card-header">
          <div class="card-icon">🔷</div>
          <div class="card-title">TypeScript 类型检查</div>
        </div>
        ${generateScoreMetric('类型安全评分', score)}
        <div class="stats-grid">
          ${generateStatItem('检查文件', typescript.totalFiles || 0)}
          ${generateStatItem('类型错误', typescript.totalErrors, typescript.totalErrors > 0 ? 'poor' : 'excellent')}
        </div>
        ${generateTopIssuesTable(typescript.errorsByCategory, '错误类型')}
      </div>
  `;
}

function generateCodeStatsCard(codeStats) {
  return `
      <div class="card">
        <div class="card-header">
          <div class="card-icon">📊</div>
          <div class="card-title">代码统计</div>
        </div>
        <div class="stats-grid">
          ${generateStatItem('总文件数', codeStats.totalFiles)}
          ${generateStatItem('总行数', codeStats.totalLines.toLocaleString())}
          ${generateStatItem('代码行数', codeStats.totalCodeLines.toLocaleString())}
          ${generateStatItem('注释行数', codeStats.totalCommentLines.toLocaleString())}
          ${generateStatItem('空行数', codeStats.totalBlankLines.toLocaleString())}
          ${generateStatItem('平均每文件', `${codeStats.avgLinesPerFile} 行`)}
        </div>
      </div>
  `;
}

function generateComplexityQualityCard(complexity) {
  const score = calculateComplexityScore(complexity);

  return `
      <div class="card">
        <div class="card-header">
          <div class="card-icon">📈</div>
          <div class="card-title">代码复杂度</div>
        </div>
        ${generateScoreMetric('复杂度评分', score)}
        <div class="stats-grid">
          ${generateStatItem('平均复杂度', complexity.avgComplexity)}
          ${generateStatItem('最大复杂度', complexity.maxComplexity, complexity.maxComplexity > 15 ? 'poor' : 'good')}
          ${generateStatItem('超阈值文件', complexity.filesOverThreshold, complexity.filesOverThreshold > 5 ? 'warning' : 'excellent')}
          ${generateStatItem('阈值标准', 10)}
        </div>
      </div>
  `;
}

function generateScoreMetric(label, score) {
  const status = getScoreStatus(score);

  return `
        <div class="metric">
          <div class="metric-label">${label}</div>
          <div class="metric-value status-${status}">${score}分</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${status}" style="width: ${score}%"></div>
          </div>
        </div>
  `;
}

function generateStatItem(label, value, status) {
  const statusClass = status ? ` status-${status}` : '';

  return `
          <div class="stat-item">
            <div class="stat-label">${label}</div>
            <div class="stat-value${statusClass}">${value}</div>
          </div>
  `;
}

/**
 * 生成测试覆盖率部分
 */
function generateCoverageSection(coverage) {
  if (!coverage) {
    return '<div class="card"><div class="no-data">测试覆盖率数据未找到</div></div>';
  }

  return `
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">🧪</div>
          <div class="card-title">测试覆盖率</div>
        </div>
        <div class="metric">
          <div class="metric-label">语句覆盖率</div>
          <div class="metric-value status-${getScoreStatus(coverage.summary.statements.pct)}">${coverage.summary.statements.pct.toFixed(2)}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(coverage.summary.statements.pct)}" style="width: ${coverage.summary.statements.pct}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">分支覆盖率</div>
          <div class="metric-value status-${getScoreStatus(coverage.summary.branches.pct)}">${coverage.summary.branches.pct.toFixed(2)}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(coverage.summary.branches.pct)}" style="width: ${coverage.summary.branches.pct}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">函数覆盖率</div>
          <div class="metric-value status-${getScoreStatus(coverage.summary.functions.pct)}">${coverage.summary.functions.pct.toFixed(2)}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(coverage.summary.functions.pct)}" style="width: ${coverage.summary.functions.pct}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">行覆盖率</div>
          <div class="metric-value status-${getScoreStatus(coverage.summary.lines.pct)}">${coverage.summary.lines.pct.toFixed(2)}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(coverage.summary.lines.pct)}" style="width: ${coverage.summary.lines.pct}%"></div>
          </div>
        </div>
      </div>

      ${coverage.testStats ? `
      <div class="card">
        <div class="card-header">
          <div class="card-icon">📝</div>
          <div class="card-title">测试统计</div>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">单元测试</div>
            <div class="stat-value">${coverage.testStats.byType.unit}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">集成测试</div>
            <div class="stat-value">${coverage.testStats.byType.integration}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">总测试数</div>
            <div class="stat-value">${coverage.testStats.total}</div>
          </div>
          ${coverage.sourceStats ? `
          <div class="stat-item">
            <div class="stat-label">源文件数</div>
            <div class="stat-value">${coverage.sourceStats.files}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">源代码行数</div>
            <div class="stat-value">${coverage.sourceStats.lines.toLocaleString()}</div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * 生成性能部分
 */
function generatePerformanceSection(lighthouse) {
  if (!lighthouse) {
    return '<div class="card"><div class="no-data">性能数据未找到</div></div>';
  }

  const avg = lighthouse.overallAverage;

  return `
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">⚡</div>
          <div class="card-title">Lighthouse 性能评分</div>
        </div>
        <div class="metric">
          <div class="metric-label">性能 (Performance)</div>
          <div class="metric-value status-${getScoreStatus(avg.performance)}">${avg.performance}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(avg.performance)}" style="width: ${avg.performance}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">可访问性 (Accessibility)</div>
          <div class="metric-value status-${getScoreStatus(avg.accessibility)}">${avg.accessibility}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(avg.accessibility)}" style="width: ${avg.accessibility}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">最佳实践 (Best Practices)</div>
          <div class="metric-value status-${getScoreStatus(avg.bestPractices)}">${avg.bestPractices}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(avg.bestPractices)}" style="width: ${avg.bestPractices}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">SEO</div>
          <div class="metric-value status-${getScoreStatus(avg.seo)}">${avg.seo}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(avg.seo)}" style="width: ${avg.seo}%"></div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">PWA</div>
          <div class="metric-value status-${getScoreStatus(avg.pwa)}">${avg.pwa}</div>
          <div class="metric-bar">
            <div class="metric-bar-fill bar-${getScoreStatus(avg.pwa)}" style="width: ${avg.pwa}%"></div>
          </div>
        </div>
      </div>

      ${generateUrlPerformanceTable(lighthouse.urls)}
    </div>
  `;
}

/**
 * 生成Top问题表格
 */
function generateTopIssuesTable(issues, title) {
  const entries = Object.entries(issues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (entries.length === 0) {
    return '<div style="margin-top: 15px; color: #48bb78;">✅ 没有发现问题</div>';
  }

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>${title}</th>
            <th style="text-align: right;">数量</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(([rule, count]) => `
            <tr>
              <td><code>${rule}</code></td>
              <td style="text-align: right;"><span class="badge badge-${count > 10 ? 'error' : count > 5 ? 'warning' : 'success'}">${count}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * 生成URL性能表格
 */
function generateUrlPerformanceTable(urls) {
  if (!urls || Object.keys(urls).length === 0) {
    return '';
  }

  return `
    <div class="card" style="grid-column: 1 / -1;">
      <div class="card-header">
        <div class="card-icon">🌐</div>
        <div class="card-title">各页面性能详情</div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>性能</th>
              <th>可访问性</th>
              <th>最佳实践</th>
              <th>SEO</th>
              <th>PWA</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(urls).map(([url, data]) => `
              <tr>
                <td><code>${url}</code></td>
                <td><span class="badge badge-${getBadgeClass(data.average.performance)}">${data.average.performance}</span></td>
                <td><span class="badge badge-${getBadgeClass(data.average.accessibility)}">${data.average.accessibility}</span></td>
                <td><span class="badge badge-${getBadgeClass(data.average.bestPractices)}">${data.average.bestPractices}</span></td>
                <td><span class="badge badge-${getBadgeClass(data.average.seo)}">${data.average.seo}</span></td>
                <td><span class="badge badge-${getBadgeClass(data.average.pwa)}">${data.average.pwa}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 计算总体评分
 */
function calculateOverallScore(metrics) {
  let totalScore = 0;
  let count = 0;

  if (metrics.quality) {
    totalScore += calculateQualityScore(metrics.quality);
    count++;
  }

  if (metrics.coverage) {
    totalScore += metrics.coverage.summary.lines.pct;
    count++;
  }

  if (metrics.lighthouse) {
    totalScore += metrics.lighthouse.overallAverage.performance;
    count++;
  }

  return count > 0 ? Math.round(totalScore / count) : 0;
}

/**
 * 计算代码质量评分
 */
function calculateQualityScore(quality) {
  const eslintScore = calculateESLintScore(quality.eslint);
  const tsScore = calculateTSScore(quality.typescript);
  const complexityScore = calculateComplexityScore(quality.complexity);
  
  return Math.round((eslintScore + tsScore + complexityScore) / 3);
}

/**
 * 计算ESLint评分
 */
function calculateESLintScore(eslint) {
  const errorPenalty = eslint.totalErrors * 2;
  const warningPenalty = eslint.totalWarnings * 0.5;
  const score = Math.max(0, 100 - errorPenalty - warningPenalty);
  return Math.round(score);
}

/**
 * 计算TypeScript评分
 */
function calculateTSScore(typescript) {
  const errorPenalty = typescript.totalErrors * 2;
  const score = Math.max(0, 100 - errorPenalty);
  return Math.round(score);
}

/**
 * 计算复杂度评分
 */
function calculateComplexityScore(complexity) {
  const avgPenalty = Math.max(0, (complexity.avgComplexity - 5) * 5);
  const maxPenalty = Math.max(0, (complexity.maxComplexity - 15) * 2);
  const filesPenalty = complexity.filesOverThreshold * 3;
  const score = Math.max(0, 100 - avgPenalty - maxPenalty - filesPenalty);
  return Math.round(score);
}

/**
 * 获取评分状态
 */
function getScoreStatus(score) {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
}

/**
 * 获取状态徽章
 */
function getStatusBadge(status) {
  const badges = {
    excellent: '🟢 优秀',
    good: '🔵 良好',
    warning: '🟡 警告',
    poor: '🔴 差'
  };
  return badges[status] || '⚪ 未知';
}

/**
 * 获取徽章样式类
 */
function getBadgeClass(score) {
  if (score >= 90) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

/**
 * 保存HTML文件
 */
function saveDashboard(html) {
  fs.writeFileSync(CONFIG.outputFile, html, 'utf-8');
  console.log(`✅ 质量仪表板已生成: ${CONFIG.outputFile}`);
}

/**
 * 主函数
 */
function main() {
  console.log('📊 开始生成质量仪表板...\n');

  // 确保报告目录存在
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
  }

  // 加载指标数据
  const metrics = loadMetrics();

  // 生成HTML
  const html = generateDashboard(metrics);

  // 保存文件
  saveDashboard(html);

  console.log('\n✨ 质量仪表板生成完成！');
  console.log(`\n📂 在浏览器中打开: ${CONFIG.outputFile}`);
}

// 运行
main();
