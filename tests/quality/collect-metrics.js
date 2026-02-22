/**
 * 代码质量指标收集工具
 * 收集 ESLint、TypeScript、代码统计等质量指标
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = 'src';
const outputDir = path.join('tests', 'quality', 'reports');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔍 开始收集代码质量指标...\n');

// 1. 收集 ESLint 指标
console.log('📋 收集 ESLint 指标...');
let eslintMetrics = {
  totalFiles: 0,
  totalErrors: 0,
  totalWarnings: 0,
  errorsByRule: {}
};

try {
  // 先运行 ESLint 并保存到文件
  execSync('npm run lint -- --format json > tests/quality/eslint-output.json 2>&1', {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
} catch (error) {
  // ESLint 有错误时会抛出异常，但文件已经生成
}

// 读取并解析 ESLint 输出
try {
  const eslintOutputPath = path.join('tests', 'quality', 'eslint-output.json');
  if (fs.existsSync(eslintOutputPath)) {
    const eslintOutput = fs.readFileSync(eslintOutputPath, 'utf-8');
    // 移除可能的非 JSON 前缀
    const jsonStart = eslintOutput.indexOf('[');
    if (jsonStart >= 0) {
      const jsonContent = eslintOutput.substring(jsonStart);
      const results = JSON.parse(jsonContent);
      eslintMetrics = parseESLintResults(results);
    }
  }
} catch (error) {
  console.log('  ⚠ 无法解析 ESLint 输出:', error.message);
}

console.log(`  ✓ 检查了 ${eslintMetrics.totalFiles} 个文件`);
console.log(`  ✓ 发现 ${eslintMetrics.totalErrors} 个错误, ${eslintMetrics.totalWarnings} 个警告\n`);

// 2. 收集 TypeScript 指标
console.log('📋 收集 TypeScript 类型检查指标...');
let tsMetrics = {
  totalFiles: 0,
  totalErrors: 0,
  errorsByCategory: {}
};

try {
  execSync('npm run type-check', { encoding: 'utf-8' });
  console.log('  ✓ 类型检查通过\n');
} catch (error) {
  const output = error.stdout || error.stderr || '';
  tsMetrics = parseTypeScriptErrors(output);
  console.log(`  ✓ 发现 ${tsMetrics.totalErrors} 个类型错误\n`);
}

// 3. 收集代码统计指标
console.log('📊 收集代码统计指标...');
const codeStats = analyzeCodeStats(srcDir);
console.log(`  ✓ 分析了 ${codeStats.totalFiles} 个文件`);
console.log(`  ✓ 总行数: ${codeStats.totalLines} (代码: ${codeStats.totalCodeLines}, 注释: ${codeStats.totalCommentLines})\n`);

// 4. 收集复杂度指标
console.log('📈 收集代码复杂度指标...');
const complexityMetrics = analyzeComplexity(srcDir);
console.log(`  ✓ 平均复杂度: ${complexityMetrics.avgComplexity}`);
console.log(`  ✓ 最大复杂度: ${complexityMetrics.maxComplexity}\n`);

// 5. 生成报告
const metrics = {
  timestamp: new Date().toISOString(),
  eslint: eslintMetrics,
  typescript: tsMetrics,
  codeStats,
  complexity: complexityMetrics
};

saveReport(metrics);
printSummary(metrics);

// ============================================================================
// 辅助函数
// ============================================================================

function parseESLintResults(results) {
  let totalErrors = 0;
  let totalWarnings = 0;
  const errorsByRule = {};

  results.forEach(file => {
    totalErrors += file.errorCount;
    totalWarnings += file.warningCount;

    file.messages.forEach(msg => {
      if (msg.ruleId) {
        errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
      }
    });
  });

  return {
    totalFiles: results.length,
    totalErrors,
    totalWarnings,
    errorsByRule
  };
}

function parseTypeScriptErrors(output) {
  const lines = output.split('\n').filter(line => line.trim());
  const errors = lines.filter(line => line.includes('error TS'));

  const errorsByCategory = {};
  errors.forEach(error => {
    const match = error.match(/error (TS\d+):/);
    if (match) {
      const code = match[1];
      errorsByCategory[code] = (errorsByCategory[code] || 0) + 1;
    }
  });

  const files = new Set(
    errors.map(error => {
      const match = error.match(/^(.+?)\(/);
      return match ? match[1] : '';
    }).filter(Boolean)
  );

  return {
    totalFiles: files.size,
    totalErrors: errors.length,
    errorsByCategory
  };
}

function analyzeCodeStats(dir) {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    totalCodeLines: 0,
    totalCommentLines: 0,
    totalBlankLines: 0,
    avgLinesPerFile: 0
  };

  const files = getAllFiles(dir, ['.ts', '.js']);
  stats.totalFiles = files.length;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    stats.totalLines += lines.length;

    let inBlockComment = false;
    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        stats.totalBlankLines++;
      } else if (trimmed.startsWith('/*')) {
        inBlockComment = true;
        stats.totalCommentLines++;
      } else if (inBlockComment) {
        stats.totalCommentLines++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
      } else if (trimmed.startsWith('//')) {
        stats.totalCommentLines++;
      } else {
        stats.totalCodeLines++;
      }
    });
  });

  stats.avgLinesPerFile = stats.totalFiles > 0 
    ? Math.round(stats.totalLines / stats.totalFiles) 
    : 0;

  return stats;
}

function analyzeComplexity(dir) {
  const complexities = [];
  const files = getAllFiles(dir, ['.ts', '.js']);
  let filesOverThreshold = 0;
  const threshold = 10;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const complexity = calculateCyclomaticComplexity(content);
    complexities.push(complexity);

    if (complexity > threshold) {
      filesOverThreshold++;
    }
  });

  const avgComplexity = complexities.length > 0
    ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length * 10) / 10
    : 0;
  const maxComplexity = complexities.length > 0
    ? Math.max(...complexities)
    : 0;

  return {
    avgComplexity,
    maxComplexity,
    filesOverThreshold
  };
}

function calculateCyclomaticComplexity(code) {
  let complexity = 1;

  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*.*\s*:/g,
    /&&/g,
    /\|\|/g
  ];

  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  return complexity;
}

function getAllFiles(dir, extensions) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(item)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  });

  return files;
}

function saveReport(metrics) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 保存 JSON 报告
  const jsonPath = path.join(outputDir, `quality-baseline-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

  // 保存最新报告
  const latestPath = path.join(outputDir, 'quality-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));

  console.log(`\n📄 报告已保存:`);
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${latestPath}`);
}

function printSummary(metrics) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 代码质量基线报告');
  console.log('='.repeat(60));
  console.log(`\n生成时间: ${new Date(metrics.timestamp).toLocaleString('zh-CN')}\n`);

  console.log('ESLint 检查:');
  console.log(`  - 检查文件: ${metrics.eslint.totalFiles}`);
  console.log(`  - 错误数量: ${metrics.eslint.totalErrors}`);
  console.log(`  - 警告数量: ${metrics.eslint.totalWarnings}`);
  
  if (Object.keys(metrics.eslint.errorsByRule).length > 0) {
    console.log('  - Top 5 规则:');
    const topRules = Object.entries(metrics.eslint.errorsByRule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topRules.forEach(([rule, count]) => {
      console.log(`    • ${rule}: ${count}`);
    });
  }

  console.log('\nTypeScript 类型检查:');
  console.log(`  - 检查文件: ${metrics.typescript.totalFiles}`);
  console.log(`  - 类型错误: ${metrics.typescript.totalErrors}`);
  
  if (Object.keys(metrics.typescript.errorsByCategory).length > 0) {
    console.log('  - Top 5 错误类型:');
    const topErrors = Object.entries(metrics.typescript.errorsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topErrors.forEach(([code, count]) => {
      console.log(`    • ${code}: ${count}`);
    });
  }

  console.log('\n代码统计:');
  console.log(`  - 总文件数: ${metrics.codeStats.totalFiles}`);
  console.log(`  - 总行数: ${metrics.codeStats.totalLines}`);
  console.log(`  - 代码行数: ${metrics.codeStats.totalCodeLines}`);
  console.log(`  - 注释行数: ${metrics.codeStats.totalCommentLines}`);
  console.log(`  - 空行数: ${metrics.codeStats.totalBlankLines}`);
  console.log(`  - 平均每文件: ${metrics.codeStats.avgLinesPerFile} 行`);

  console.log('\n代码复杂度:');
  console.log(`  - 平均复杂度: ${metrics.complexity.avgComplexity}`);
  console.log(`  - 最大复杂度: ${metrics.complexity.maxComplexity}`);
  console.log(`  - 超过阈值(10)的文件: ${metrics.complexity.filesOverThreshold}`);

  console.log('\n' + '='.repeat(60));
}
