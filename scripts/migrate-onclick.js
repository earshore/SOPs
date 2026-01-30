#!/usr/bin/env node
/**
 * onclick自动迁移工具
 * 将 onclick="xxx()" 转换为 data-action="xxx"
 */

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

console.log('🔄 开始迁移onclick调用到data-action...\n');

const htmlFiles = glob.sync('src/**/*.html', { 
  ignore: ['**/node_modules/**', '**/dist/**'] 
});

let totalFiles = 0;
let totalReplacements = 0;
const changes = [];

// 迁移规则
const migrationRules = [
  // 简单的无参数调用: onclick="funcName()"
  {
    pattern: /onclick="(\w+)\(\)"/g,
    replace: (match, funcName) => {
      return `data-action="${funcName}"`;
    }
  },
  
  // 带单个字符串参数: onclick="funcName('param')"
  {
    pattern: /onclick="(\w+)\('([^']+)'\)"/g,
    replace: (match, funcName, param) => {
      return `data-action="${funcName}" data-param="${param}"`;
    }
  },
  
  // 带单个字符串参数（双引号）: onclick='funcName("param")'
  {
    pattern: /onclick='(\w+)\("([^"]+)"\)'/g,
    replace: (match, funcName, param) => {
      return `data-action="${funcName}" data-param="${param}"`;
    }
  },
  
  // switchTab特殊处理: onclick="switchTab('tab', true/false)"
  {
    pattern: /onclick="switchTab\('([^']+)',\s*(true|false)\)"/g,
    replace: (match, tab, updateHistory) => {
      return `data-action="switch-tab" data-tab="${tab}" data-update-history="${updateHistory}"`;
    }
  }
];

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;
  let fileReplacements = 0;
  
  migrationRules.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      content = content.replace(rule.pattern, (...args) => {
        fileReplacements++;
        modified = true;
        return rule.replace(...args);
      });
    }
  });
  
  if (modified) {
    // 备份原文件
    const backupPath = file + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(file));
    
    // 写入修改后的内容
    fs.writeFileSync(file, content);
    
    totalFiles++;
    totalReplacements += fileReplacements;
    changes.push({
      file,
      replacements: fileReplacements
    });
    
    console.log(`✅ ${file}: ${fileReplacements} 处修改`);
  }
});

console.log('\n=== 📊 迁移统计 ===');
console.log(`  修改文件数: ${totalFiles}`);
console.log(`  总替换次数: ${totalReplacements}`);

if (changes.length > 0) {
  console.log('\n=== 📝 详细变更 ===');
  changes.forEach(({ file, replacements }) => {
    console.log(`  ${file}: ${replacements} 处`);
  });
  
  console.log('\n⚠️  原文件已备份为 .backup 后缀');
  console.log('   如需回滚，请运行: npm run rollback-onclick');
}

// 保存迁移报告
const report = {
  timestamp: new Date().toISOString(),
  totalFiles,
  totalReplacements,
  changes
};

fs.writeFileSync('docs/onclick-migration-report.json', JSON.stringify(report, null, 2));
console.log('\n✅ 迁移报告已保存到: docs/onclick-migration-report.json');
