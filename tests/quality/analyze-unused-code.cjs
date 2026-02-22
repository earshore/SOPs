// tests/quality/analyze-unused-code.js
// ================================================================
// 分析 ESLint 报告中的未使用代码
// ================================================================

const fs = require('fs');
const path = require('path');

function analyzeUnusedCode() {
  console.log('🔍 分析未使用的代码...\n');

  // 读取 ESLint 报告
  const reportPath = 'eslint-unused-detailed.json';
  if (!fs.existsSync(reportPath)) {
    console.error('❌ 找不到 ESLint 报告文件:', reportPath);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // 统计数据
  const stats = {
    totalFiles: 0,
    filesWithIssues: 0,
    totalUnused: 0,
    byType: {
      variable: 0,
      function: 0,
      parameter: 0,
      import: 0,
      class: 0,
      other: 0
    },
    items: []
  };

  // 分析每个文件
  for (const file of report) {
    if (file.messages.length === 0) continue;

    stats.totalFiles++;
    let hasUnusedIssues = false;

    for (const message of file.messages) {
      // 只关注未使用变量的错误
      if (
        message.ruleId === '@typescript-eslint/no-unused-vars' ||
        message.ruleId === 'no-unused-vars'
      ) {
        hasUnusedIssues = true;
        stats.totalUnused++;

        // 分类
        let type = 'other';
        if (message.message.includes('is defined but never used')) {
          if (message.message.includes('function')) {
            type = 'function';
          } else if (message.message.includes('parameter')) {
            type = 'parameter';
          } else if (message.message.includes('class')) {
            type = 'class';
          } else if (message.message.includes('imported')) {
            type = 'import';
          } else {
            type = 'variable';
          }
        }

        stats.byType[type]++;

        // 提取变量名
        const match = message.message.match(/'([^']+)'/);
        const name = match ? match[1] : 'unknown';

        stats.items.push({
          file: path.relative(process.cwd(), file.filePath).replace(/\\/g, '/'),
          line: message.line,
          column: message.column,
          name,
          type,
          message: message.message,
          severity: message.severity === 2 ? 'error' : 'warning'
        });
      }
    }

    if (hasUnusedIssues) {
      stats.filesWithIssues++;
    }
  }

  // 输出统计信息
  console.log('📊 统计结果:');
  console.log(`  - 扫描文件总数: ${report.length}`);
  console.log(`  - 有问题的文件: ${stats.filesWithIssues}`);
  console.log(`  - 未使用项总数: ${stats.totalUnused}`);
  console.log('\n按类型统计:');
  console.log(`  - 变量: ${stats.byType.variable}`);
  console.log(`  - 函数: ${stats.byType.function}`);
  console.log(`  - 参数: ${stats.byType.parameter}`);
  console.log(`  - 导入: ${stats.byType.import}`);
  console.log(`  - 类: ${stats.byType.class}`);
  console.log(`  - 其他: ${stats.byType.other}`);

  // 生成 JSON 报告
  const jsonPath = 'tests/quality/unused-code-report.json';
  fs.writeFileSync(jsonPath, JSON.stringify(stats, null, 2), 'utf-8');
  console.log(`\n✅ JSON 报告已生成: ${jsonPath}`);

  // 生成 HTML 报告
  generateHTMLReport(stats);

  // 生成清理建议
  generateCleanupSuggestions(stats);

  return stats;
}

function generateHTMLReport(stats) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>未使用代码分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
    .stat { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
    .stat-label { font-size: 14px; color: #666; margin-bottom: 5px; }
    .stat-value { font-size: 28px; font-weight: bold; color: #333; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h2 { color: #333; margin-bottom: 15px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #666; font-size: 14px; }
    td { font-size: 14px; }
    .type-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .type-variable { background: #e3f2fd; color: #1976d2; }
    .type-function { background: #f3e5f5; color: #7b1fa2; }
    .type-parameter { background: #fff3e0; color: #f57c00; }
    .type-import { background: #e8f5e9; color: #388e3c; }
    .type-class { background: #fce4ec; color: #c2185b; }
    .type-other { background: #f5f5f5; color: #666; }
    .file-path { font-family: 'Courier New', monospace; font-size: 13px; color: #666; }
    .location { font-family: 'Courier New', monospace; font-size: 12px; color: #999; }
    .severity-warning { color: #ff9800; }
    .severity-error { color: #f44336; }
    .filter-bar { margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .filter-btn.active { background: #007bff; color: white; border-color: #007bff; }
    .filter-btn:hover { background: #f8f9fa; }
    .filter-btn.active:hover { background: #0056b3; }
    .search-box { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; width: 300px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 未使用代码分析报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      
      <div class="summary">
        <div class="stat">
          <div class="stat-label">扫描文件数</div>
          <div class="stat-value">${stats.totalFiles}</div>
        </div>
        <div class="stat">
          <div class="stat-label">有问题的文件</div>
          <div class="stat-value">${stats.filesWithIssues}</div>
        </div>
        <div class="stat">
          <div class="stat-label">未使用项总数</div>
          <div class="stat-value">${stats.totalUnused}</div>
        </div>
        <div class="stat">
          <div class="stat-label">变量</div>
          <div class="stat-value">${stats.byType.variable}</div>
        </div>
        <div class="stat">
          <div class="stat-label">函数</div>
          <div class="stat-value">${stats.byType.function}</div>
        </div>
        <div class="stat">
          <div class="stat-label">参数</div>
          <div class="stat-value">${stats.byType.parameter}</div>
        </div>
        <div class="stat">
          <div class="stat-label">导入</div>
          <div class="stat-value">${stats.byType.import}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>未使用代码详情</h2>
      
      <div class="filter-bar">
        <button class="filter-btn active" onclick="filterByType('all')">全部 (${stats.totalUnused})</button>
        <button class="filter-btn" onclick="filterByType('variable')">变量 (${stats.byType.variable})</button>
        <button class="filter-btn" onclick="filterByType('function')">函数 (${stats.byType.function})</button>
        <button class="filter-btn" onclick="filterByType('parameter')">参数 (${stats.byType.parameter})</button>
        <button class="filter-btn" onclick="filterByType('import')">导入 (${stats.byType.import})</button>
        <button class="filter-btn" onclick="filterByType('class')">类 (${stats.byType.class})</button>
        <input type="text" class="search-box" placeholder="搜索文件或变量名..." onkeyup="searchTable(this.value)">
      </div>

      <table id="issuesTable">
        <thead>
          <tr>
            <th>类型</th>
            <th>名称</th>
            <th>文件</th>
            <th>位置</th>
            <th>严重程度</th>
          </tr>
        </thead>
        <tbody>
          ${stats.items
            .map(
              (item) => `
          <tr data-type="${item.type}" data-search="${item.file.toLowerCase()} ${item.name.toLowerCase()}">
            <td><span class="type-badge type-${item.type}">${getTypeLabel(item.type)}</span></td>
            <td><code>${item.name}</code></td>
            <td class="file-path">${item.file}</td>
            <td class="location">${item.line}:${item.column}</td>
            <td class="severity-${item.severity}">${item.severity === 'error' ? '❌ 错误' : '⚠️ 警告'}</td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function filterByType(type) {
      const rows = document.querySelectorAll('#issuesTable tbody tr');
      const buttons = document.querySelectorAll('.filter-btn');
      
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      rows.forEach(row => {
        if (type === 'all' || row.dataset.type === type) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function searchTable(query) {
      const rows = document.querySelectorAll('#issuesTable tbody tr');
      const lowerQuery = query.toLowerCase();
      
      rows.forEach(row => {
        const searchText = row.dataset.search;
        if (searchText.includes(lowerQuery)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>
  `;

  const htmlPath = 'tests/quality/unused-code-report.html';
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);
}

function getTypeLabel(type) {
  const labels = {
    variable: '变量',
    function: '函数',
    parameter: '参数',
    import: '导入',
    class: '类',
    other: '其他'
  };
  return labels[type] || type;
}

function generateCleanupSuggestions(stats) {
  console.log('\n📝 清理建议:\n');

  // 按文件分组
  const byFile = {};
  for (const item of stats.items) {
    if (!byFile[item.file]) {
      byFile[item.file] = [];
    }
    byFile[item.file].push(item);
  }

  // 输出每个文件的建议
  const sortedFiles = Object.keys(byFile).sort((a, b) => byFile[b].length - byFile[a].length);
  
  console.log('优先处理以下文件（按问题数量排序）:\n');
  
  for (let i = 0; i < Math.min(10, sortedFiles.length); i++) {
    const file = sortedFiles[i];
    const items = byFile[file];
    console.log(`${i + 1}. ${file} (${items.length} 个问题)`);
    
    // 显示前3个问题
    for (let j = 0; j < Math.min(3, items.length); j++) {
      const item = items[j];
      console.log(`   - 第 ${item.line} 行: ${getTypeLabel(item.type)} '${item.name}'`);
    }
    
    if (items.length > 3) {
      console.log(`   ... 还有 ${items.length - 3} 个问题`);
    }
    console.log('');
  }

  // 生成清理脚本建议
  console.log('\n💡 建议操作:');
  console.log('1. 删除未使用的导入（最安全）');
  console.log('2. 删除未使用的私有函数和变量');
  console.log('3. 将未使用的参数重命名为 _paramName（如果是回调函数参数）');
  console.log('4. 审查未使用的导出函数（可能被其他模块使用）');
  console.log('\n⚠️ 注意: 删除代码前请确保运行完整的测试套件！');
}

// 执行分析
try {
  const stats = analyzeUnusedCode();
  
  if (stats.totalUnused > 0) {
    console.log(`\n⚠️ 发现 ${stats.totalUnused} 个未使用的代码项`);
    console.log('请查看报告: tests/quality/unused-code-report.html');
  } else {
    console.log('\n✅ 没有发现未使用的代码');
  }
} catch (error) {
  console.error('❌ 分析失败:', error);
  process.exit(1);
}
