// ================================================================
// Lighthouse 性能基线测试
// 用于建立性能基线并生成报告
// ================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  // 测试URL
  urls: [
    'http://localhost:3000/',
    'http://localhost:3000/#/sops',
    'http://localhost:3000/#/app-center'
  ],
  // 输出目录
  outputDir: path.join(__dirname, 'baseline-reports'),
  // 基线文件
  baselineFile: path.join(__dirname, 'baseline-scores.json'),
  // 运行次数
  numberOfRuns: 3
};

/**
 * 确保输出目录存在
 */
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

/**
 * 运行 Lighthouse 测试
 */
function runLighthouse() {
  console.log('🚀 开始运行 Lighthouse 性能测试...\n');
  
  try {
    // 运行 Lighthouse CI
    const command = 'npx lhci autorun --config=lighthouserc.js';
    console.log(`执行命令: ${command}\n`);
    
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    
    console.log('\n✅ Lighthouse 测试完成');
    return true;
  } catch (error) {
    console.error('\n❌ Lighthouse 测试失败:', error.message);
    return false;
  }
}

/**
 * 从 Lighthouse CI 结果中提取分数
 */
function extractScores() {
  console.log('\n📊 提取性能分数...');
  
  try {
    // Lighthouse CI 将结果保存在 .lighthouseci 目录
    const lhciDir = path.join(__dirname, '../../.lighthouseci');
    
    if (!fs.existsSync(lhciDir)) {
      console.warn('⚠️  未找到 .lighthouseci 目录，无法提取分数');
      return null;
    }
    
    // 查找最新的结果文件
    const files = fs.readdirSync(lhciDir)
      .filter(f => f.startsWith('lhr-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(lhciDir, f),
        time: fs.statSync(path.join(lhciDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length === 0) {
      console.warn('⚠️  未找到 Lighthouse 结果文件');
      return null;
    }
    
    // 读取所有结果并计算平均分
    const scores = {
      urls: {},
      timestamp: new Date().toISOString(),
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
          average: {}
        };
      }
      
      const runScores = {
        performance: categories.performance?.score * 100 || 0,
        accessibility: categories.accessibility?.score * 100 || 0,
        bestPractices: categories['best-practices']?.score * 100 || 0,
        seo: categories.seo?.score * 100 || 0,
        pwa: categories.pwa?.score * 100 || 0
      };
      
      scores.urls[url].runs.push(runScores);
      
      // 添加到汇总
      scores.summary.performance.push(runScores.performance);
      scores.summary.accessibility.push(runScores.accessibility);
      scores.summary.bestPractices.push(runScores.bestPractices);
      scores.summary.seo.push(runScores.seo);
      scores.summary.pwa.push(runScores.pwa);
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
  } catch (error) {
    console.error('❌ 提取分数失败:', error.message);
    return null;
  }
}

/**
 * 计算平均值
 */
function average(numbers) {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

/**
 * 保存基线分数
 */
function saveBaseline(scores) {
  console.log('\n💾 保存基线分数...');
  
  try {
    fs.writeFileSync(
      CONFIG.baselineFile,
      JSON.stringify(scores, null, 2),
      'utf-8'
    );
    console.log(`✅ 基线分数已保存到: ${CONFIG.baselineFile}`);
  } catch (error) {
    console.error('❌ 保存基线失败:', error.message);
  }
}

/**
 * 生成报告
 */
function generateReport(scores) {
  console.log('\n📝 生成性能报告...');
  
  const report = `# Lighthouse 性能基线报告

**生成时间:** ${new Date(scores.timestamp).toLocaleString('zh-CN')}

---

## 总体平均分数

| 指标 | 分数 | 状态 |
|------|------|------|
| 性能 (Performance) | ${scores.overallAverage.performance} | ${getStatus(scores.overallAverage.performance)} |
| 可访问性 (Accessibility) | ${scores.overallAverage.accessibility} | ${getStatus(scores.overallAverage.accessibility)} |
| 最佳实践 (Best Practices) | ${scores.overallAverage.bestPractices} | ${getStatus(scores.overallAverage.bestPractices)} |
| SEO | ${scores.overallAverage.seo} | ${getStatus(scores.overallAverage.seo)} |
| PWA | ${scores.overallAverage.pwa} | ${getStatus(scores.overallAverage.pwa)} |

---

## 各页面详细分数

${Object.keys(scores.urls).map(url => {
  const urlScores = scores.urls[url];
  return `### ${url}

| 指标 | 平均分 | 各次运行 |
|------|--------|----------|
| 性能 | ${urlScores.average.performance} | ${urlScores.runs.map(r => r.performance).join(', ')} |
| 可访问性 | ${urlScores.average.accessibility} | ${urlScores.runs.map(r => r.accessibility).join(', ')} |
| 最佳实践 | ${urlScores.average.bestPractices} | ${urlScores.runs.map(r => r.bestPractices).join(', ')} |
| SEO | ${urlScores.average.seo} | ${urlScores.runs.map(r => r.seo).join(', ')} |
| PWA | ${urlScores.average.pwa} | ${urlScores.runs.map(r => r.pwa).join(', ')} |
`;
}).join('\n')}

---

## 评分标准

- 🟢 **90-100**: 优秀
- 🟡 **50-89**: 需要改进
- 🔴 **0-49**: 差

---

## 下一步行动

${getRecommendations(scores.overallAverage)}

---

**注意:** 此报告为性能基线，用于后续性能对比和优化跟踪。
`;
  
  const reportPath = path.join(CONFIG.outputDir, 'baseline-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ 报告已生成: ${reportPath}`);
  
  return reportPath;
}

/**
 * 获取状态图标
 */
function getStatus(score) {
  if (score >= 90) return '🟢 优秀';
  if (score >= 50) return '🟡 需要改进';
  return '🔴 差';
}

/**
 * 获取改进建议
 */
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

/**
 * 显示结果摘要
 */
function displaySummary(scores) {
  console.log('\n' + '='.repeat(60));
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

/**
 * 主函数
 */
async function main() {
  console.log('🎯 Lighthouse 性能基线测试');
  console.log('='.repeat(60));
  
  // 确保输出目录存在
  ensureOutputDir();
  
  // 运行 Lighthouse
  const success = runLighthouse();
  
  if (!success) {
    console.error('\n❌ 测试失败，请检查错误信息');
    process.exit(1);
  }
  
  // 提取分数
  const scores = extractScores();
  
  if (!scores) {
    console.error('\n❌ 无法提取分数，请检查 Lighthouse CI 输出');
    process.exit(1);
  }
  
  // 保存基线
  saveBaseline(scores);
  
  // 生成报告
  const reportPath = generateReport(scores);
  
  // 显示摘要
  displaySummary(scores);
  
  console.log(`\n📄 详细报告: ${reportPath}`);
  console.log(`📊 基线数据: ${CONFIG.baselineFile}`);
  console.log('\n✅ 性能基线测试完成！');
}

// 运行
main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
