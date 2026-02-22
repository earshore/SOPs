import fs from 'fs';
import path from 'path';

// 读取审计报告
const report = JSON.parse(fs.readFileSync('tests/quality/security-audit-2026-02-22.json', 'utf-8'));
const mediumIssues = report.issues.filter(i => i.severity === 'medium');

console.log(`找到 ${mediumIssues.length} 个中危漏洞需要修复\n`);

// 按文件分组
const fileGroups = {};
mediumIssues.forEach(issue => {
  const file = issue.file.replace(/\\/g, '/');
  if (!fileGroups[file]) {
    fileGroups[file] = [];
  }
  fileGroups[file].push(issue);
});

// 统计
console.log('文件分布:');
Object.entries(fileGroups).forEach(([file, issues]) => {
  console.log(`  ${file}: ${issues.length} 个`);
});

console.log('\n需要手动修复的文件类型:');
console.log('- HTML 模板文件: 需要在对应的 TypeScript 文件中绑定事件');
console.log('- JavaScript 文件: 需要转换为 TypeScript 或手动修复');
console.log('- TypeScript 文件: 已部分修复，剩余需要逐个处理');
