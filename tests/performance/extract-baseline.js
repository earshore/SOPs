// ================================================================
// 从 Lighthouse CI 结果中提取基线分数
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  lhciDir: path.join(__dirname, '../../.lighthouseci'),
  outputDir: path.join(__dirname, 'baseline-reports'),
  baselineFile: path.join(__dirname, 'baseline-scores.json')
};

function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

function extractScores() {
  console.log('📊 提取 Lighthouse 性能分数...\n');
  
  if (!fs.existsSync(CONFIG.lhciDir)) {
    console.error('❌ 未找到 .lighthouseci 目录');
    return null;
  }
  
  const files = fs.readdirSync(CONFIG.lhciDir)
    .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(CONFIG.lhciDir, f),
      time: fs.statSync(path.join(CONFIG.lhciDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) {
    console.error('❌ 未找到 Lighthouse 结果文件');
    return null;
  }
  
  const scores = {
    timestamp: new Date().toISOString(),
    urls: {},
    summary: {
      performance: [],
      accessibility: [],
      bestPractices: [],
      seo: [],
      pwa: []
    }
  };
  
  files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(file.path, 'utf-8'));
    const url = data.finalUrl || data.requestedUrl;
    const categories = data.categories;
    
    if (!scores.urls[url]) {
      scores.urls[url] = {
        runs: [],
        average: {},
        audits: {}
      };
    }
    
    const runScores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      pwa: Math.round((categories.pwa?.score || 0) * 100)
    };
    
    scores.urls[url].runs.push(runScores);
    
    scores.summary.performance.push(runScores.performance);
    scores.summary.accessibility.push(runScores.accessibility);
    scores.summary.bestPractices.push(runScores.bestPractices);
    scores.summary.seo.push(runScores.seo);
    scores.summary.pwa.push(runScores.pwa);
    
    // 提取关键审计指标
    if (data.audits) {
      const audits = {
        fcp: data.audits['first-contentful-paint']?.numericValue,
        lcp: data.audits['largest-contentful-paint']?.numericValue,
        cls: data.audits['cumulative-layout-shift']?.numericValue,
        tbt: data.audits['total-blocking-time']?.numericValue,
        si: data.audits['speed-index']?.numericValue
      };
      
      if (!scores.urls[url].audits.fcp) {
        scores.urls[url].audits = { fcp: [], lcp: [], cls: [], tbt: [], si: [] };
      }
      
      scores.urls[url].audits.fcp.push(audits.fcp);
      scores.urls[url].audits.lcp.push(audits.lcp);
      scores.urls[url].audits.cls.push(audits.cls);
      scores.urls[url].audits.tbt.push(audits.tbt);
      scores.urls[url].audits.si.push(audits.si);
    }
  });
  
  // 计算每个URL的平均分
  Object.keys(scores.urls).forEach(url => {
    const runs = scores.urls[url].runs;
    scores.urls[url].average = {
      performance: average(runs.map(r => r.performance)),
      accessibility: average(runs.map(r => r.accessibility)),
      bestPractices: average(runs.map(r => r.bestPractices)),
      seo: average(runs.map(r => r.seo)),
      pwa: average(runs.map(r => r.pwa))
    };
    
    // 计算审计指标平均值
    const audits = scores.urls[url].audits;
    scores.urls[url].auditsAverage = {
      fcp: average(audits.fcp),
      lcp: average(audits.lcp),
      cls: average(audits.cls, 3),
      tbt: average(audits.tbt),
      si: average(audits.si)
    };
  });
  
  // 计算总体平均分
  scores.overallAverage = {
    performance: average(scores.summary.performance),
    accessibility: average(scores.summary.accessibility),
    bestPractices: average(scores.summary.bestPractices),
    seo: average(scores.summary.seo),
    pwa: average(scores.summary.pwa)
  };
  
  return scores;
}

function average(numbers, decimals = 0) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  return decimals > 0 ? parseFloat(avg.toFixed(decimals)) : Math.round(avg);
}

function getStatus(score) {
  if (score >= 90) return '🟢 优秀';
  if (score >= 50) return '🟡 需要改进';
  return '🔴 差';
}

function formatMs(ms) {
  if (!ms) return 'N/A';
  return `${Math.round(ms)}ms`;
}

function generateReport(scores) {
  console.log('📝 生成性能基线报告...\n');
  
  const report = `# Lighthouse 性能基线报告

**生成时间:** ${new Date(scores.timestamp).toLocaleString('zh-CN')}  
**测试页面数:** ${Object.keys(scores.urls).length}  
**每页运行次数:** 3

---

## 📊 总体平均分数

| 指标 | 分数 | 状态 |
|------|------|------|
| 性能 (Performance) | ${scores.overallAverage.performance} | ${getStatus(scores.overallAverage.performance)} |
| 可访问性 (Accessibility) | ${scores.overallAverage.accessibility} | ${getStatus(scores.overallAverage.accessibility)} |
| 最佳实践 (Best Practices) | ${scores.overallAverage.bestPractices} | ${getStatus(scores.overallAverage.bestPractices)} |
| SEO | ${scores.overallAverage.seo} | ${getStatus(scores.overallAverage.seo)} |
| PWA | ${scores.overallAverage.pwa} | ${getStatus(scores.overallAverage.pwa)} |

---

## 📄 各页面详细分数

${Object.keys(scores.urls).map(url => {
  const urlScores = scores.urls[url];
  const audits = urlScores.auditsAverage;
  
  return `### ${url}

**分类评分:**

| 指标 | 平均分 | 各次运行 | 状态 |
|------|--------|----------|------|
| 性能 | ${urlScores.average.performance} | ${urlScores.runs.map(r => r.performance).join(', ')} | ${getStatus(urlScores.average.performance)} |
| 可访问性 | ${urlScores.average.accessibility} | ${urlScores.runs.map(r => r.accessibility).join(', ')} | ${getStatus(urlScores.average.accessibility)} |
| 最佳实践 | ${urlScores.average.bestPractices} | ${urlScores.runs.map(r => r.bestPractices).join(', ')} | ${getStatus(urlScores.average.bestPractices)} |
| SEO | ${urlScores.average.seo} | ${urlScores.runs.map(r => r.seo).join(', ')} | ${getStatus(urlScores.average.seo)} |
| PWA | ${urlScores.average.pwa} | ${urlScores.runs.map(r => r.pwa).join(', ')} | ${getStatus(urlScores.average.pwa)} |

**Core Web Vitals:**

| 指标 | 平均值 | 目标 | 状态 |
|------|--------|------|------|
| FCP (首次内容绘制) | ${formatMs(audits.fcp)} | < 1800ms | ${audits.fcp < 1800 ? '✅' : '❌'} |
| LCP (最大内容绘制) | ${formatMs(audits.lcp)} | < 2500ms | ${audits.lcp < 2500 ? '✅' : '❌'} |
| CLS (累积布局偏移) | ${audits.cls} | < 0.1 | ${audits.cls < 0.1 ? '✅' : '❌'} |
| TBT (总阻塞时间) | ${formatMs(audits.tbt)} | < 300ms | ${audits.tbt < 300 ? '✅' : '❌'} |
| SI (速度指数) | ${formatMs(audits.si)} | < 3400ms | ${audits.si < 3400 ? '✅' : '❌'} |
`;
}).join('\n')}

---

## 📈 评分标准

- 🟢 **90-100**: 优秀
- 🟡 **50-89**: 需要改进
- 🔴 **0-49**: 差

---

## 🎯 改进建议

${getRecommendations(scores.overallAverage)}

---

## 📌 注意事项

1. 此报告为性能基线，用于后续性能对比和优化跟踪
2. 测试环境：本地开发环境 (localhost:4173)
3. 测试配置：Desktop preset, 每个URL运行3次
4. 详细的 Lighthouse 报告保存在 \`.lighthouseci/\` 目录

---

**下一步:** 根据此基线进行性能优化，目标是所有指标达到 90 分以上
`;
  
  const reportPath = path.join(CONFIG.outputDir, 'baseline-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ 报告已生成: ${reportPath}\n`);
  
  return reportPath;
}

function getRecommendations(scores) {
  const recommendations = [];
  
  if (scores.performance < 90) {
    recommendations.push('- 🎯 **性能优化**: 考虑代码分割、懒加载、资源压缩等优化手段');
  }
  if (scores.accessibility < 90) {
    recommendations.push('- ♿ **可访问性**: 检查ARIA标签、键盘导航、颜色对比度等');
  }
  if (scores.bestPractices < 90) {
    recommendations.push('- ✅ **最佳实践**: 检查HTTPS、控制台错误、图片优化等');
  }
  if (scores.seo < 90) {
    recommendations.push('- 🔍 **SEO优化**: 添加meta标签、改进语义化HTML、优化移动端体验');
  }
  
  if (recommendations.length === 0) {
    return '✨ 所有指标都很优秀！继续保持。';
  }
  
  return recommendations.join('\n');
}

function saveBaseline(scores) {
  console.log('💾 保存基线数据...\n');
  
  fs.writeFileSync(
    CONFIG.baselineFile,
    JSON.stringify(scores, null, 2),
    'utf-8'
  );
  
  console.log(`✅ 基线数据已保存: ${CONFIG.baselineFile}\n`);
}

function displaySummary(scores) {
  console.log('='.repeat(60));
  console.log('📊 性能基线测试结果摘要');
  console.log('='.repeat(60));
  console.log(`\n测试时间: ${new Date(scores.timestamp).toLocaleString('zh-CN')}`);
  console.log(`测试页面数: ${Object.keys(scores.urls).length}`);
  console.log(`\n总体平均分数:`);
  console.log(`  性能:       ${scores.overallAverage.performance} ${getStatus(scores.overallAverage.performance)}`);
  console.log(`  可访问性:   ${scores.overallAverage.accessibility} ${getStatus(scores.overallAverage.accessibility)}`);
  console.log(`  最佳实践:   ${scores.overallAverage.bestPractices} ${getStatus(scores.overallAverage.bestPractices)}`);
  console.log(`  SEO:        ${scores.overallAverage.seo} ${getStatus(scores.overallAverage.seo)}`);
  console.log(`  PWA:        ${scores.overallAverage.pwa} ${getStatus(scores.overallAverage.pwa)}`);
  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('🎯 提取 Lighthouse 性能基线\n');
  console.log('='.repeat(60) + '\n');
  
  ensureOutputDir();
  
  const scores = extractScores();
  
  if (!scores) {
    console.error('\n❌ 提取失败');
    process.exit(1);
  }
  
  saveBaseline(scores);
  generateReport(scores);
  displaySummary(scores);
  
  console.log('\n✅ 性能基线建立完成！');
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
