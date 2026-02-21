// tests/report-manager.js
// ================================================================
// 📊 Playwright 测试报告管理器
// 用于生成、查看和管理测试报告
// ================================================================

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// 报告目录配置
const REPORT_DIR = path.join(__dirname, 'playwright-report');
const RESULTS_JSON = path.join(REPORT_DIR, 'results.json');
const JUNIT_XML = path.join(REPORT_DIR, 'junit.xml');
const SUMMARY_FILE = path.join(REPORT_DIR, 'summary.txt');

// 命令行参数
const command = process.argv[2] || 'help';

// 主函数
async function main() {
  switch (command) {
    case 'generate':
      await generateReport();
      break;
    case 'open':
      await openReport();
      break;
    case 'summary':
      await showSummary();
      break;
    case 'clean':
      await cleanReports();
      break;
    case 'archive':
      await archiveReport();
      break;
    case 'serve':
      await serveReport();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

/**
 * 生成测试报告摘要
 */
async function generateReport() {
  console.log('📊 生成测试报告摘要...\n');

  if (!fs.existsSync(RESULTS_JSON)) {
    console.error('❌ 未找到测试结果文件');
    console.error('请先运行测试: npm run test:e2e');
    process.exit(1);
  }

  try {
    const results = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
    
    // 统计信息
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: 0
    };

    // 失败的测试
    const failures = [];

    // 遍历所有套件
    for (const suite of results.suites || []) {
      processSuite(suite, stats, failures);
    }

    // 生成摘要文本
    const summary = generateSummaryText(stats, failures, results);
    
    // 保存摘要
    fs.writeFileSync(SUMMARY_FILE, summary, 'utf-8');
    
    // 输出到控制台
    console.log(summary);
    
    console.log(`\n✅ 报告摘要已保存到: ${SUMMARY_FILE}`);
    
    // 如果有失败，返回错误码
    if (stats.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 生成报告失败:', error.message);
    process.exit(1);
  }
}

/**
 * 处理测试套件
 */
function processSuite(suite, stats, failures) {
  // 处理测试用例
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      stats.total++;
      
      // 获取测试结果
      const results = test.results || [];
      const lastResult = results[results.length - 1];
      
      if (!lastResult) continue;
      
      stats.duration += lastResult.duration || 0;
      
      // 统计状态
      if (lastResult.status === 'passed') {
        stats.passed++;
      } else if (lastResult.status === 'failed') {
        stats.failed++;
        failures.push({
          title: test.title,
          file: spec.file,
          error: lastResult.error?.message || '未知错误',
          line: spec.line
        });
      } else if (lastResult.status === 'skipped') {
        stats.skipped++;
      }
      
      // 检查是否为 flaky 测试（重试后通过）
      if (results.length > 1 && lastResult.status === 'passed') {
        stats.flaky++;
      }
    }
  }
  
  // 递归处理子套件
  for (const child of suite.suites || []) {
    processSuite(child, stats, failures);
  }
}

/**
 * 生成摘要文本
 */
function generateSummaryText(stats, failures, results) {
  const lines = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    📊 测试报告摘要');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  // 基本统计
  lines.push('📈 测试统计:');
  lines.push(`   总计:   ${stats.total} 个测试`);
  lines.push(`   ✅ 通过: ${stats.passed} 个 (${percentage(stats.passed, stats.total)}%)`);
  lines.push(`   ❌ 失败: ${stats.failed} 个 (${percentage(stats.failed, stats.total)}%)`);
  lines.push(`   ⏭️  跳过: ${stats.skipped} 个 (${percentage(stats.skipped, stats.total)}%)`);
  
  if (stats.flaky > 0) {
    lines.push(`   ⚠️  不稳定: ${stats.flaky} 个 (重试后通过)`);
  }
  
  lines.push('');
  
  // 执行时间
  const durationSec = (stats.duration / 1000).toFixed(2);
  const durationMin = (stats.duration / 60000).toFixed(2);
  lines.push(`⏱️  执行时间: ${durationSec}s (${durationMin}min)`);
  lines.push('');
  
  // 浏览器统计
  if (results.config?.projects) {
    lines.push('🌐 浏览器覆盖:');
    for (const project of results.config.projects) {
      lines.push(`   - ${project.name}`);
    }
    lines.push('');
  }
  
  // 失败详情
  if (failures.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                    ❌ 失败的测试');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');
    
    failures.forEach((failure, index) => {
      lines.push(`${index + 1}. ${failure.title}`);
      lines.push(`   文件: ${failure.file}:${failure.line || '?'}`);
      lines.push(`   错误: ${failure.error}`);
      lines.push('');
    });
  }
  
  // 报告位置
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    📁 报告位置');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`HTML 报告: ${path.join(REPORT_DIR, 'index.html')}`);
  lines.push(`JSON 报告: ${RESULTS_JSON}`);
  lines.push(`JUnit XML: ${JUNIT_XML}`);
  lines.push('');
  lines.push('查看报告: npm run test:e2e:report');
  lines.push('');
  
  // 生成时间
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * 计算百分比
 */
function percentage(value, total) {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
}

/**
 * 打开 HTML 报告
 */
async function openReport() {
  const htmlReport = path.join(REPORT_DIR, 'index.html');
  
  if (!fs.existsSync(htmlReport)) {
    console.error('❌ 未找到 HTML 报告');
    console.error('请先运行测试: npm run test:e2e');
    process.exit(1);
  }
  
  console.log('🌐 打开测试报告...');
  
  // 根据操作系统选择打开命令
  const command = process.platform === 'win32' ? 'start' :
                  process.platform === 'darwin' ? 'open' : 'xdg-open';
  
  exec(`${command} "${htmlReport}"`, (error) => {
    if (error) {
      console.error('❌ 打开报告失败:', error.message);
      console.log(`\n请手动打开: ${htmlReport}`);
    } else {
      console.log('✅ 报告已在浏览器中打开');
    }
  });
}

/**
 * 显示测试摘要
 */
async function showSummary() {
  if (!fs.existsSync(SUMMARY_FILE)) {
    console.log('📊 未找到摘要文件，正在生成...\n');
    await generateReport();
    return;
  }
  
  const summary = fs.readFileSync(SUMMARY_FILE, 'utf-8');
  console.log(summary);
}

/**
 * 清理报告
 */
async function cleanReports() {
  console.log('🧹 清理测试报告...\n');
  
  if (!fs.existsSync(REPORT_DIR)) {
    console.log('✅ 报告目录不存在，无需清理');
    return;
  }
  
  try {
    // 删除报告文件，但保留目录结构
    const files = [
      'index.html',
      'results.json',
      'junit.xml',
      'summary.txt'
    ];
    
    let cleaned = 0;
    for (const file of files) {
      const filePath = path.join(REPORT_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        cleaned++;
        console.log(`🗑️  删除: ${file}`);
      }
    }
    
    // 清理 trace 和 data 目录
    const dirs = ['trace', 'data'];
    for (const dir of dirs) {
      const dirPath = path.join(REPORT_DIR, dir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`🗑️  删除目录: ${dir}/`);
      }
    }
    
    console.log(`\n✅ 清理完成，删除了 ${cleaned} 个文件`);
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
    process.exit(1);
  }
}

/**
 * 归档报告
 */
async function archiveReport() {
  console.log('📦 归档测试报告...\n');
  
  if (!fs.existsSync(REPORT_DIR)) {
    console.error('❌ 报告目录不存在');
    process.exit(1);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const archiveDir = path.join(__dirname, 'playwright-report-archive');
  const archivePath = path.join(archiveDir, `report-${timestamp}`);
  
  try {
    // 创建归档目录
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // 复制报告
    fs.cpSync(REPORT_DIR, archivePath, { recursive: true });
    
    console.log(`✅ 报告已归档到: ${archivePath}`);
    
    // 列出所有归档
    const archives = fs.readdirSync(archiveDir)
      .filter(name => name.startsWith('report-'))
      .sort()
      .reverse();
    
    console.log(`\n📚 现有归档 (${archives.length} 个):`);
    archives.slice(0, 5).forEach((archive, index) => {
      console.log(`   ${index + 1}. ${archive}`);
    });
    
    if (archives.length > 5) {
      console.log(`   ... 还有 ${archives.length - 5} 个归档`);
    }
  } catch (error) {
    console.error('❌ 归档失败:', error.message);
    process.exit(1);
  }
}

/**
 * 启动报告服务器
 */
async function serveReport() {
  const htmlReport = path.join(REPORT_DIR, 'index.html');
  
  if (!fs.existsSync(htmlReport)) {
    console.error('❌ 未找到 HTML 报告');
    console.error('请先运行测试: npm run test:e2e');
    process.exit(1);
  }
  
  const port = process.env.REPORT_PORT || 9323;
  
  console.log(`🌐 启动报告服务器...`);
  console.log(`📍 地址: http://localhost:${port}`);
  console.log(`📁 目录: ${REPORT_DIR}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
  
  const server = http.createServer((req, res) => {
    let filePath = path.join(REPORT_DIR, req.url === '/' ? 'index.html' : req.url);
    
    // 安全检查：防止目录遍历
    if (!filePath.startsWith(REPORT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      
      // 设置 Content-Type
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(data);
    });
  });
  
  server.listen(port, () => {
    console.log('✅ 服务器已启动');
    
    // 自动打开浏览器
    const command = process.platform === 'win32' ? 'start' :
                    process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    exec(`${command} http://localhost:${port}`, (error) => {
      if (error) {
        console.log('提示: 请手动打开浏览器访问 http://localhost:' + port);
      }
    });
  });
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📊 Playwright 测试报告管理器

用法:
  node tests/report-manager.js <命令>

命令:
  generate    生成测试报告摘要
  open        在浏览器中打开 HTML 报告
  summary     显示测试摘要
  clean       清理测试报告
  archive     归档当前报告
  serve       启动报告服务器
  help        显示帮助信息

示例:
  # 生成报告摘要
  node tests/report-manager.js generate

  # 打开 HTML 报告
  node tests/report-manager.js open

  # 显示测试摘要
  node tests/report-manager.js summary

  # 清理报告
  node tests/report-manager.js clean

  # 归档报告
  node tests/report-manager.js archive

  # 启动报告服务器
  node tests/report-manager.js serve

环境变量:
  REPORT_PORT    报告服务器端口（默认：9323）
  `);
}

// 执行主函数
main().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
