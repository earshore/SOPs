#!/usr/bin/env ts-node
/**
 * 批量替换 any 类型为 unknown
 * 
 * 使用方法：
 * - 预览模式: npm run batch-replace-any -- --dry-run
 * - 执行替换: npm run batch-replace-any
 * - 指定目录: npm run batch-replace-any -- --dir=src/services
 */

import * as fs from 'fs';
import * as path from 'path';

interface ReplaceRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
  safe: boolean; // 是否是安全的替换
}

interface ReplaceResult {
  file: string;
  rule: string;
  count: number;
  lines: number[];
}

// 定义替换规则（按安全性排序）
const REPLACE_RULES: ReplaceRule[] = [
  {
    name: 'record-string-any',
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Record<string, any> → Record<string, unknown>',
    safe: true
  },
  {
    name: 'generic-default-any',
    pattern: /<([A-Z]\w*)\s*=\s*any>/g,
    replacement: '<$1 = unknown>',
    description: '<T = any> → <T = unknown>',
    safe: true
  },
  {
    name: 'generic-extends-any',
    pattern: /<([A-Z]\w*)\s+extends\s+any>/g,
    replacement: '<$1 extends unknown>',
    description: '<T extends any> → <T extends unknown>',
    safe: true
  },
  {
    name: 'array-any',
    pattern: /:\s*any\[\]/g,
    replacement: ': unknown[]',
    description: ': any[] → : unknown[]',
    safe: true
  },
  {
    name: 'array-type-any',
    pattern: /Array<any>/g,
    replacement: 'Array<unknown>',
    description: 'Array<any> → Array<unknown>',
    safe: true
  },
  {
    name: 'function-param-any',
    pattern: /\(([^)]*?):\s*any\)/g,
    replacement: '($1: unknown)',
    description: '(param: any) → (param: unknown)',
    safe: false // 需要检查调用处
  },
  {
    name: 'type-annotation-any',
    pattern: /:\s*any(?=[,;)\]\}>\s])/g,
    replacement: ': unknown',
    description: ': any → : unknown (在类型注解中)',
    safe: false
  }
];

// 需要跳过的目录
const SKIP_DIRS = ['node_modules', 'dist', '.git', '.kiro'];

// 需要跳过的文件模式
const SKIP_FILES = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.d\.ts$/ // 类型定义文件需要更谨慎
];

/**
 * 递归获取所有TypeScript文件
 */
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // 检查是否需要跳过
      const shouldSkip = SKIP_FILES.some(pattern => pattern.test(file));
      if (!shouldSkip) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * 检查行是否在注释中
 */
function isInComment(content: string, index: number): boolean {
  // 检查单行注释
  const lineStart = content.lastIndexOf('\n', index) + 1;
  const lineContent = content.substring(lineStart, index);
  if (lineContent.trim().startsWith('//')) {
    return true;
  }

  // 检查多行注释
  const beforeContent = content.substring(0, index);
  const lastCommentStart = beforeContent.lastIndexOf('/*');
  const lastCommentEnd = beforeContent.lastIndexOf('*/');
  
  return lastCommentStart > lastCommentEnd;
}

/**
 * 检查行是否在字符串中
 */
function isInString(content: string, index: number): boolean {
  const beforeContent = content.substring(0, index);
  
  // 简单检查：统计引号数量
  const singleQuotes = (beforeContent.match(/'/g) || []).length;
  const doubleQuotes = (beforeContent.match(/"/g) || []).length;
  const backticks = (beforeContent.match(/`/g) || []).length;
  
  return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0) || (backticks % 2 !== 0);
}

/**
 * 应用替换规则到文件
 */
function applyRulesToFile(
  filePath: string,
  rules: ReplaceRule[],
  dryRun: boolean = false
): ReplaceResult[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  const results: ReplaceResult[] = [];

  rules.forEach(rule => {
    const matches: number[] = [];
    let match;
    
    // 重置正则表达式
    rule.pattern.lastIndex = 0;
    
    while ((match = rule.pattern.exec(content)) !== null) {
      const index = match.index;
      
      // 跳过注释和字符串中的匹配
      if (isInComment(content, index) || isInString(content, index)) {
        continue;
      }
      
      // 记录行号
      const lineNumber = content.substring(0, index).split('\n').length;
      matches.push(lineNumber);
    }

    if (matches.length > 0) {
      results.push({
        file: filePath,
        rule: rule.name,
        count: matches.length,
        lines: matches
      });

      if (!dryRun) {
        // 重置正则表达式
        rule.pattern.lastIndex = 0;
        newContent = newContent.replace(rule.pattern, rule.replacement);
      }
    }
  });

  // 写入文件
  if (!dryRun && results.length > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return results;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const safeOnly = args.includes('--safe-only');
  
  // 获取目标目录
  let targetDir = 'src';
  const dirArg = args.find(arg => arg.startsWith('--dir='));
  if (dirArg) {
    targetDir = dirArg.split('=')[1];
  }

  console.log('🔍 批量替换 any 类型工具');
  console.log('='.repeat(50));
  console.log(`模式: ${dryRun ? '预览模式（不会修改文件）' : '执行模式'}`);
  console.log(`目录: ${targetDir}`);
  console.log(`规则: ${safeOnly ? '仅安全规则' : '所有规则'}`);
  console.log('='.repeat(50));
  console.log('');

  // 获取所有文件
  const files = getAllTsFiles(targetDir);
  console.log(`📁 找到 ${files.length} 个 TypeScript 文件\n`);

  // 选择规则
  const rules = safeOnly ? REPLACE_RULES.filter(r => r.safe) : REPLACE_RULES;
  
  console.log('📋 应用的替换规则:');
  rules.forEach((rule, index) => {
    console.log(`  ${index + 1}. ${rule.description} ${rule.safe ? '✅' : '⚠️'}`);
  });
  console.log('');

  // 处理所有文件
  const allResults: ReplaceResult[] = [];
  let processedFiles = 0;

  files.forEach(file => {
    const results = applyRulesToFile(file, rules, dryRun);
    if (results.length > 0) {
      allResults.push(...results);
      processedFiles++;
    }
  });

  // 输出结果
  console.log('📊 替换结果:');
  console.log('='.repeat(50));
  
  if (allResults.length === 0) {
    console.log('✨ 没有找到需要替换的内容');
  } else {
    // 按规则统计
    const ruleStats = new Map<string, number>();
    allResults.forEach(result => {
      const count = ruleStats.get(result.rule) || 0;
      ruleStats.set(result.rule, count + result.count);
    });

    console.log(`\n📈 统计:`);
    console.log(`  - 修改文件数: ${processedFiles}`);
    console.log(`  - 总替换次数: ${allResults.reduce((sum, r) => sum + r.count, 0)}`);
    console.log('');
    
    console.log('📋 按规则统计:');
    ruleStats.forEach((count, ruleName) => {
      const rule = rules.find(r => r.name === ruleName);
      console.log(`  - ${rule?.description}: ${count} 处`);
    });
    console.log('');

    // 显示详细信息（仅在预览模式或文件数较少时）
    if (dryRun || processedFiles <= 20) {
      console.log('📝 详细信息:');
      const fileGroups = new Map<string, ReplaceResult[]>();
      allResults.forEach(result => {
        const existing = fileGroups.get(result.file) || [];
        existing.push(result);
        fileGroups.set(result.file, existing);
      });

      fileGroups.forEach((results, file) => {
        const totalCount = results.reduce((sum, r) => sum + r.count, 0);
        console.log(`\n  ${file} (${totalCount} 处):`);
        results.forEach(result => {
          const rule = rules.find(r => r.name === result.rule);
          console.log(`    - ${rule?.description}: ${result.count} 处 (行: ${result.lines.join(', ')})`);
        });
      });
    }
  }

  console.log('');
  console.log('='.repeat(50));
  
  if (dryRun) {
    console.log('💡 提示: 使用 npm run batch-replace-any 执行实际替换');
  } else {
    console.log('✅ 替换完成！');
    console.log('💡 建议: 运行 npm run type-check 检查类型错误');
  }
}

// 运行
main();
