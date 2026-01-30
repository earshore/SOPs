#!/usr/bin/env node
/**
 * 全局变量审计工具
 * 扫描代码库中的全局变量使用和onclick调用
 */

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

console.log('🔍 开始扫描全局变量和onclick调用...\n');

// 扫描所有JS和HTML文件
const jsFiles = glob.sync('src/**/*.js', { ignore: ['**/node_modules/**', '**/dist/**'] });
const htmlFiles = glob.sync('src/**/*.html', { ignore: ['**/node_modules/**', '**/dist/**'] });

const globalPattern = /window\.(\w+)\s*=/g;
const globalCallPattern = /window\.(\w+)\(/g;
const onclickPattern = /onclick="([^"]+)"/g;

const globals = new Map();
const globalCalls = new Map();
const onclicks = new Map();

// 扫描JS文件中的window赋值
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  let match;
  while ((match = globalPattern.exec(content)) !== null) {
    const varName = match[1];
    if (!globals.has(varName)) {
      globals.set(varName, []);
    }
    globals.get(varName).push(file);
  }
});

// 扫描JS文件中的window调用
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  let match;
  while ((match = globalCallPattern.exec(content)) !== null) {
    const funcName = match[1];
    if (!globalCalls.has(funcName)) {
      globalCalls.set(funcName, []);
    }
    globalCalls.get(funcName).push(file);
  }
});

// 扫描HTML文件中的onclick
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  let match;
  while ((match = onclickPattern.exec(content)) !== null) {
    const onclick = match[1];
    // 提取函数名
    const funcMatch = onclick.match(/^(\w+)\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      if (!onclicks.has(funcName)) {
        onclicks.set(funcName, []);
      }
      onclicks.get(funcName).push({ file, code: onclick });
    }
  }
});

// 生成报告
console.log('=== 📊 全局变量赋值 (window.xxx = ...) ===');
console.log(`发现 ${globals.size} 个全局变量\n`);
globals.forEach((files, varName) => {
  console.log(`  ${varName}:`);
  files.forEach(file => {
    console.log(`    - ${file}`);
  });
});

console.log('\n=== 📞 全局函数调用 (window.xxx()) ===');
console.log(`发现 ${globalCalls.size} 个全局调用\n`);
globalCalls.forEach((files, funcName) => {
  console.log(`  ${funcName}: ${files.length} 次调用`);
});

console.log('\n=== 🖱️ onclick 调用 ===');
console.log(`发现 ${onclicks.size} 个不同的函数\n`);
onclicks.forEach((occurrences, funcName) => {
  console.log(`  ${funcName}: ${occurrences.length} 次使用`);
  occurrences.slice(0, 3).forEach(({ file, code }) => {
    console.log(`    - ${file}`);
    console.log(`      onclick="${code}"`);
  });
  if (occurrences.length > 3) {
    console.log(`    ... 还有 ${occurrences.length - 3} 处`);
  }
});

// 生成JSON报告
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalGlobals: globals.size,
    totalGlobalCalls: globalCalls.size,
    totalOnclicks: onclicks.size,
    totalOnclickOccurrences: Array.from(onclicks.values()).reduce((sum, arr) => sum + arr.length, 0)
  },
  details: {
    globals: Object.fromEntries(globals),
    globalCalls: Object.fromEntries(globalCalls),
    onclicks: Object.fromEntries(
      Array.from(onclicks.entries()).map(([func, occurrences]) => [
        func,
        occurrences.map(o => ({ file: o.file, code: o.code }))
      ])
    )
  }
};

const reportPath = 'docs/global-audit-report.json';
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n✅ 详细报告已保存到: ${reportPath}`);
console.log('\n=== 📈 统计摘要 ===');
console.log(`  全局变量赋值: ${report.summary.totalGlobals}`);
console.log(`  全局函数调用: ${report.summary.totalGlobalCalls}`);
console.log(`  onclick函数: ${report.summary.totalOnclicks}`);
console.log(`  onclick总次数: ${report.summary.totalOnclickOccurrences}`);

// 生成迁移优先级建议
console.log('\n=== 🎯 迁移优先级建议 ===');
const onclicksByFrequency = Array.from(onclicks.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log('高频onclick函数（优先迁移）:');
onclicksByFrequency.forEach(([func, occurrences], index) => {
  console.log(`  ${index + 1}. ${func} - ${occurrences.length} 次使用`);
});
