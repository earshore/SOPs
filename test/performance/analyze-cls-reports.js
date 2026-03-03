// ================================================================
// 📊 CLS 报告分析脚本
// 分析 Lighthouse 报告中的 CLS 数据
// ================================================================

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.join(__dirname, 'lighthouse-reports');
const CLS_THRESHOLD = 0.1;

/**
 * 读取最新的报告文件
 */
function getLatestReports() {
  if (!fs.existsSync(REPORTS_DIR)) {
    console.error(`❌ 报告目录不存在: ${REPORTS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(REPORTS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(REPORTS_DIR, file),
      time: fs.statSync(path.join(REPORTS_DIR, file)).mtime
    }))
    .sort((a, b) => b.time - a.time);

  return files;
}

/**
 * 分析单个报告的 CLS
 */
function analyzeCLS(reportPath) {
  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(content);

    const cls = report.audits?.['cumulative-layout-shift']?.numericValue || 0;
    const url = report.finalUrl || report.requestedUrl || 'Unknown';
    const pageName = path.basename(reportPath, '.json').split('_')[0];

    return {
      pageName,
      url,
      cls,
      passed: cls < CLS_THRESHOLD,
      reportPath
    };
  } catch (error) {
    console.error(`❌ 读取报告失败: ${reportPath}`, error.message);
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CLS 报告分析');
  console.log('='.repeat(70));
  console.log(`\n📁 报告目录: ${REPORTS_DIR}`);
  console.log(`🎯 CLS 阈值: < ${CLS_THRESHOLD}\n`);

  const reports = getLatestReports();

  if (reports.length === 0) {
    console.log('⚠️  未找到任何报告文件');
    return;
  }

  console.log(`📄 找到 ${reports.length} 个报告文件\n`);

  // 按页面分组
  const pageResults = new Map();

  reports.forEach(report => {
    const result = analyzeCLS(report.path);
    if (result) {
      const existing = pageResults.get(result.pageName);
      if (!existing || report.time > existing.time) {
        pageResults.set(result.pageName, { ...result, time: report.time });
      }
    }
  });

  // 打印结果
  console.log('='.repeat(70));
  console.log('页面'.padEnd(25) + 'CLS 值'.padEnd(15) + '状态'.padEnd(10) + '报告时间');
  console.log('-'.repeat(70));

  let allPassed = true;

  Array.from(pageResults.values())
    .sort((a, b) => a.pageName.localeCompare(b.pageName))
    .forEach(result => {
      const status = result.passed ? '✅ 通过' : '❌ 失败';
      const timeStr = new Date(result.time).toLocaleString('zh-CN');
      
      console.log(
        result.pageName.padEnd(25) +
        result.cls.toFixed(3).padEnd(15) +
        status.padEnd(10) +
        timeStr
      );

      if (!result.passed) {
        allPassed = false;
      }
    });

  console.log('='.repeat(70));

  // 统计信息
  const totalPages = pageResults.size;
  const passedPages = Array.from(pageResults.values()).filter(r => r.passed).length;
  const failedPages = totalPages - passedPages;

  console.log(`\n📊 统计信息:`);
  console.log(`   总页面数: ${totalPages}`);
  console.log(`   通过: ${passedPages} ✅`);
  console.log(`   失败: ${failedPages} ❌`);
  console.log(`   通过率: ${((passedPages / totalPages) * 100).toFixed(1)}%`);

  if (allPassed) {
    console.log(`\n✅ 所有页面的 CLS 都 < ${CLS_THRESHOLD}`);
    console.log('='.repeat(70) + '\n');
    process.exit(0);
  } else {
    console.log(`\n❌ 有 ${failedPages} 个页面的 CLS >= ${CLS_THRESHOLD}`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

main();
