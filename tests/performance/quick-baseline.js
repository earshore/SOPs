// ================================================================
// Lighthouse 快速基线测试
// 使用已构建的文件进行快速测试（不启动开发服务器）
// ================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  // 输出目录
  outputDir: path.join(__dirname, 'baseline-reports'),
  // 基线文件
  baselineFile: path.join(__dirname, 'baseline-scores.json'),
  // 构建目录
  distDir: path.join(__dirname, '../../dist')
};

/**
 * 检查构建文件是否存在
 */
function checkBuildExists() {
  if (!fs.existsSync(CONFIG.distDir)) {
    console.error('❌ 未找到构建文件，请先运行: npm run build');
    return false;
  }
  
  const indexPath = path.join(CONFIG.distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ 未找到 index.html，请先运行: npm run build');
    return false;
  }
  
  return true;
}

/**
 * 确保输出目录存在
 */
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

/**
 * 运行单个页面的 Lighthouse 测试
 */
function runLighthouseForFile(filePath, name) {
  console.log(`\n🔍 测试: ${name}`);
  
  try {
    const outputPath = path.join(CONFIG.outputDir, `${name}.json`);
    const htmlPath = path.join(CONFIG.outputDir, `${name}.html`);
    
    // 使用 Lighthouse CLI 直接测试文件
    const command = `npx lighthouse "file:///${filePath.replace(/\\/g, '/')}" --output=json --output=html --output-path="${outputPath.replace(/\\/g, '/')}" --preset=desktop --quiet --chrome-flags="--headless"`;
    
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    console.log(`  ✅ 完成`);
    
    // 读取结果
    const jsonPath = `${outputPath}.report.json`;
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      return {
        name,
        scores: {
          performance: Math.round((data.categories.performance?.score || 0) * 100),
          accessibility: Math.round((data.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((data.categories['best-practices']?.score || 0) * 100),
          seo: Math.round((data.categories.seo?.score || 0) * 100),
          pwa: Math.round((data.categories.pwa?.score || 0) * 100)
        },
        reportPath: `${outputPath}.report.html`
      };
    }
    
    return null;
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    return null;
  }
}

/**
 * 计算平均分
 */
function calculateAverage(results) {
  const totals = {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
    pwa: 0
  };
  
  results.forEach(result => {
    if (result && result.scores) {
      totals.performance += result.scores.performance;
      totals.accessibility += result.scores.accessibility;
      totals.bestPractices += result.scores.bestPractices;
      totals.seo += result.scores.seo;
      totals.pwa += result.scores.pwa;
    }
  });
  
  const count = results.filter(r => r !== null).length;
  
  return {
    performance: Math.round(totals.performance / count),
    accessibility: Math.round(totals.accessibility / count),
    bestPractices: Math.round(totals.bestPractices / count),
    seo: Math.round(totals.seo / count),
    pwa: Math.round(totals.pwa / count)
  };
}

/**
 * 保存基线
 */
function saveBaseline(results, average) {
  const baseline = {
    timestamp: new Date().toISOString(),
    results,
    average
  };
  
  fs.writeFileSync(
    CONFIG.baselineFile,
    JSON.stringify(baseline, null, 2),
    'utf-8'
  );
  
  console.log(`\n💾 基线已保存: ${CONFIG.baselineFile}`);
}

/**
 * 生成报告
 */
function generateReport(results, average) {
  const getStatus = (score) => {
    if (score >= 90) return '🟢 优秀';
    if (score >= 50) return '🟡 需要改进';
    return '🔴 差';
  };
  
  const report = `# Lighthouse 性能基线报告（快速测试）

**生成时间:** ${new Date().toLocaleString('zh-CN')}

---

## 总体平均分数

| 指标 | 分数 | 状态 |
|------|------|------|
| 性能 (Performance) | ${average.performance} | ${getStatus(average.performance)} |
| 可访问性 (Accessibility) | ${average.accessibility} | ${getStatus(average.accessibility)} |
| 最佳实践 (Best Practices) | ${average.bestPractices} | ${getStatus(average.bestPractices)} |
| SEO | ${average.seo} | ${getStatus(average.seo)} |
| PWA | ${average.pwa} | ${getStatus(average.pwa)} |

---

## 各页面详细分数

${results.filter(r => r !== null).map(result => `### ${result.name}

| 指标 | 分数 | 状态 |
|------|------|------|
| 性能 | ${result.scores.performance} | ${getStatus(result.scores.performance)} |
| 可访问性 | ${result.scores.accessibility} | ${getStatus(result.scores.accessibility)} |
| 最佳实践 | ${result.scores.bestPractices} | ${getStatus(result.scores.bestPractices)} |
| SEO | ${result.scores.seo} | ${getStatus(result.scores.seo)} |
| PWA | ${result.scores.pwa} | ${getStatus(result.scores.pwa)} |

📄 [查看详细报告](${path.basename(result.reportPath)})
`).join('\n')}

---

## 评分标准

- 🟢 **90-100**: 优秀
- 🟡 **50-89**: 需要改进
- 🔴 **0-49**: 差

---

**注意:** 此为快速基线测试，使用本地文件进行测试。完整测试请使用 \`run-baseline.bat\`。
`;
  
  const reportPath = path.join(CONFIG.outputDir, 'quick-baseline-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📝 报告已生成: ${reportPath}`);
}

/**
 * 显示摘要
 */
function displaySummary(average) {
  const getStatus = (score) => {
    if (score >= 90) return '🟢 优秀';
    if (score >= 50) return '🟡 需要改进';
    return '🔴 差';
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 性能基线测试结果摘要');
  console.log('='.repeat(60));
  console.log(`\n总体平均分数:`);
  console.log(`  性能:       ${average.performance} ${getStatus(average.performance)}`);
  console.log(`  可访问性:   ${average.accessibility} ${getStatus(average.accessibility)}`);
  console.log(`  最佳实践:   ${average.bestPractices} ${getStatus(average.bestPractices)}`);
  console.log(`  SEO:        ${average.seo} ${getStatus(average.seo)}`);
  console.log(`  PWA:        ${average.pwa} ${getStatus(average.pwa)}`);
  console.log('\n' + '='.repeat(60));
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 Lighthouse 快速基线测试');
  console.log('='.repeat(60));
  
  // 检查构建文件
  if (!checkBuildExists()) {
    process.exit(1);
  }
  
  // 确保输出目录存在
  ensureOutputDir();
  
  // 测试主页
  const indexPath = path.join(CONFIG.distDir, 'index.html');
  const results = [
    runLighthouseForFile(indexPath, 'index')
  ];
  
  // 计算平均分
  const average = calculateAverage(results);
  
  // 保存基线
  saveBaseline(results, average);
  
  // 生成报告
  generateReport(results, average);
  
  // 显示摘要
  displaySummary(average);
  
  console.log('\n✅ 快速基线测试完成！');
  console.log(`\n📄 查看报告: ${path.join(CONFIG.outputDir, 'quick-baseline-report.md')}`);
}

// 运行
main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
