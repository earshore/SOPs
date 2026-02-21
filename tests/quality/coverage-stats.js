// ================================================================
// 🎯 测试覆盖率统计脚本
// 用于统计当前项目的测试覆盖率并生成报告
// ================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  reportDir: path.join(__dirname, 'reports'),
  coverageFile: path.join(__dirname, 'reports', 'coverage-baseline.json'),
  summaryFile: path.join(__dirname, 'reports', 'coverage-summary.txt')
};

// 确保报告目录存在
if (!fs.existsSync(CONFIG.reportDir)) {
  fs.mkdirSync(CONFIG.reportDir, { recursive: true });
}

/**
 * 运行测试覆盖率
 */
function runCoverageTests() {
  console.log('📊 开始运行测试覆盖率统计...\n');
  
  try {
    // 运行测试并生成覆盖率报告
    const output = execSync('npm run test:coverage', {
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    return output;
  } catch (error) {
    // 即使测试失败，也可能生成了覆盖率报告
    console.warn('⚠️  部分测试失败，但继续生成覆盖率报告\n');
    return error.stdout || '';
  }
}

/**
 * 解析覆盖率输出
 */
function parseCoverageOutput(output) {
  const lines = output.split('\n');
  const coverageData = {
    timestamp: new Date().toISOString(),
    summary: {
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      lines: { total: 0, covered: 0, pct: 0 }
    },
    files: []
  };

  // 查找覆盖率摘要行
  let inSummary = false;
  for (const line of lines) {
    if (line.includes('All files')) {
      inSummary = true;
      continue;
    }
    
    if (inSummary && line.trim()) {
      // 解析覆盖率百分比
      const match = line.match(/(\d+\.?\d*)\s*%/g);
      if (match && match.length >= 4) {
        const percentages = match.map(m => parseFloat(m));
        coverageData.summary.statements.pct = percentages[0] || 0;
        coverageData.summary.branches.pct = percentages[1] || 0;
        coverageData.summary.functions.pct = percentages[2] || 0;
        coverageData.summary.lines.pct = percentages[3] || 0;
      }
      break;
    }
  }

  return coverageData;
}

/**
 * 读取JSON覆盖率报告
 */
function readJsonCoverageReport() {
  const jsonSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  
  if (fs.existsSync(jsonSummaryPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonSummaryPath, 'utf-8'));
      return data;
    } catch (error) {
      console.warn('⚠️  无法读取JSON覆盖率报告:', error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * 从V8覆盖率数据计算覆盖率
 */
function calculateCoverageFromV8() {
  const tmpDir = path.join(process.cwd(), 'coverage', '.tmp');
  
  if (!fs.existsSync(tmpDir)) {
    return null;
  }
  
  const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('coverage-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    return null;
  }
  
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalStatements = 0;
  let coveredStatements = 0;
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, file), 'utf-8'));
      
      if (data.result) {
        for (const script of data.result) {
          // 只统计src目录下的文件
          if (!script.url || !script.url.includes('/src/')) {
            continue;
          }
          
          if (script.functions) {
            for (const func of script.functions) {
              totalFunctions++;
              if (func.ranges && func.ranges.length > 0 && func.ranges[0].count > 0) {
                coveredFunctions++;
              }
              
              // 统计语句覆盖率
              if (func.ranges) {
                for (const range of func.ranges) {
                  totalStatements++;
                  if (range.count > 0) {
                    coveredStatements++;
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // 忽略解析错误
    }
  }
  
  if (totalFunctions === 0) {
    return null;
  }
  
  return {
    statements: { pct: (coveredStatements / totalStatements * 100).toFixed(2) },
    branches: { pct: 0 }, // V8数据不包含分支覆盖率
    functions: { pct: (coveredFunctions / totalFunctions * 100).toFixed(2) },
    lines: { pct: (coveredStatements / totalStatements * 100).toFixed(2) }
  };
}

/**
 * 统计测试文件
 */
function countTestFiles() {
  const testDirs = ['tests/unit', 'tests/integration'];
  let totalTests = 0;
  const testsByType = {
    unit: 0,
    integration: 0
  };

  for (const dir of testDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      const testFiles = files.filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'));
      
      if (dir.includes('unit')) {
        testsByType.unit = testFiles.length;
      } else if (dir.includes('integration')) {
        testsByType.integration = testFiles.length;
      }
      
      totalTests += testFiles.length;
    }
  }

  return { total: totalTests, byType: testsByType };
}

/**
 * 统计源代码文件
 */
function countSourceFiles() {
  const srcDir = path.join(process.cwd(), 'src');
  let totalFiles = 0;
  let totalLines = 0;

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        totalFiles++;
        const content = fs.readFileSync(fullPath, 'utf-8');
        totalLines += content.split('\n').length;
      }
    }
  }

  if (fs.existsSync(srcDir)) {
    walkDir(srcDir);
  }

  return { files: totalFiles, lines: totalLines };
}

/**
 * 生成覆盖率报告
 */
function generateReport(coverageData, testStats, sourceStats) {
  const report = [];
  
  report.push('='.repeat(70));
  report.push('📊 测试覆盖率统计报告');
  report.push('='.repeat(70));
  report.push('');
  
  // 基本信息
  report.push('📅 生成时间: ' + new Date().toLocaleString('zh-CN'));
  report.push('');
  
  // 源代码统计
  report.push('📁 源代码统计:');
  report.push(`   - TypeScript 文件数: ${sourceStats.files}`);
  report.push(`   - 总代码行数: ${sourceStats.lines}`);
  report.push('');
  
  // 测试文件统计
  report.push('🧪 测试文件统计:');
  report.push(`   - 单元测试: ${testStats.byType.unit} 个文件`);
  report.push(`   - 集成测试: ${testStats.byType.integration} 个文件`);
  report.push(`   - 总计: ${testStats.total} 个测试文件`);
  report.push('');
  
  // 覆盖率统计
  report.push('📈 覆盖率统计:');
  report.push('-'.repeat(70));
  report.push('类型          覆盖率      状态');
  report.push('-'.repeat(70));
  
  const metrics = [
    { name: 'Statements', value: coverageData.summary.statements.pct, threshold: 60 },
    { name: 'Branches  ', value: coverageData.summary.branches.pct, threshold: 55 },
    { name: 'Functions ', value: coverageData.summary.functions.pct, threshold: 60 },
    { name: 'Lines     ', value: coverageData.summary.lines.pct, threshold: 60 }
  ];
  
  for (const metric of metrics) {
    const status = metric.value >= metric.threshold ? '✅ 达标' : '❌ 未达标';
    const pct = metric.value.toFixed(2).padStart(6);
    report.push(`${metric.name}    ${pct}%     ${status} (目标: ${metric.threshold}%)`);
  }
  
  report.push('-'.repeat(70));
  report.push('');
  
  // 总体评估
  const avgCoverage = (
    coverageData.summary.statements.pct +
    coverageData.summary.branches.pct +
    coverageData.summary.functions.pct +
    coverageData.summary.lines.pct
  ) / 4;
  
  report.push('📊 总体评估:');
  report.push(`   - 平均覆盖率: ${avgCoverage.toFixed(2)}%`);
  
  if (avgCoverage >= 60) {
    report.push('   - 状态: ✅ 良好 - 已达到Week 2目标(60%)');
  } else if (avgCoverage >= 50) {
    report.push('   - 状态: ⚠️  接近目标 - 需要继续改进');
  } else {
    report.push('   - 状态: ❌ 需要改进 - 距离目标还有差距');
  }
  
  report.push('');
  report.push('🎯 下一步目标:');
  report.push('   - Week 2 目标: 60% 覆盖率');
  report.push('   - Week 3 目标: 80% 覆盖率');
  report.push('');
  report.push('='.repeat(70));
  
  return report.join('\n');
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始统计测试覆盖率...\n');
  
  // 1. 运行测试
  const testOutput = runCoverageTests();
  
  // 2. 读取JSON报告
  let coverageData = readJsonCoverageReport();
  
  // 3. 如果JSON报告不存在，尝试从V8数据计算
  if (!coverageData || !coverageData.total) {
    console.log('📝 从V8覆盖率数据计算...\n');
    const v8Coverage = calculateCoverageFromV8();
    
    if (v8Coverage) {
      coverageData = {
        timestamp: new Date().toISOString(),
        summary: {
          statements: { pct: parseFloat(v8Coverage.statements.pct) },
          branches: { pct: parseFloat(v8Coverage.branches.pct) },
          functions: { pct: parseFloat(v8Coverage.functions.pct) },
          lines: { pct: parseFloat(v8Coverage.lines.pct) }
        }
      };
    } else {
      // 最后尝试解析文本输出
      console.log('📝 从测试输出解析覆盖率数据...\n');
      coverageData = parseCoverageOutput(testOutput);
    }
  } else {
    // 转换JSON格式
    const total = coverageData.total;
    coverageData = {
      timestamp: new Date().toISOString(),
      summary: {
        statements: { pct: total.statements.pct },
        branches: { pct: total.branches.pct },
        functions: { pct: total.functions.pct },
        lines: { pct: total.lines.pct }
      }
    };
  }
  
  // 4. 统计测试文件
  const testStats = countTestFiles();
  
  // 5. 统计源代码文件
  const sourceStats = countSourceFiles();
  
  // 6. 生成报告
  const report = generateReport(coverageData, testStats, sourceStats);
  
  // 7. 保存报告
  fs.writeFileSync(CONFIG.summaryFile, report, 'utf-8');
  fs.writeFileSync(CONFIG.coverageFile, JSON.stringify({
    ...coverageData,
    testStats,
    sourceStats
  }, null, 2), 'utf-8');
  
  // 8. 输出报告
  console.log(report);
  console.log('');
  console.log(`✅ 报告已保存到: ${CONFIG.summaryFile}`);
  console.log(`✅ 数据已保存到: ${CONFIG.coverageFile}`);
  console.log('');
}

// 运行
main();
