#!/usr/bin/env ts-node
/**
 * 批量替换 console 语句为 loggerService
 * 
 * 使用方法:
 * npm run replace-console -- src/services/llmService.ts
 * npm run replace-console -- "src/services/**\/*.ts"
 */

import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

interface ReplaceStats {
  filesProcessed: number;
  filesModified: number;
  replacements: {
    log: number;
    error: number;
    warn: number;
    info: number;
    debug: number;
  };
}

const stats: ReplaceStats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: {
    log: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
  },
};

/**
 * 计算从源文件到目标文件的相对路径
 */
function getRelativePath(fromFile: string, toFile: string): string {
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, toFile);
  
  // 转换 Windows 路径分隔符为 Unix 风格
  relativePath = relativePath.replace(/\\/g, '/');
  
  // 移除 .ts 扩展名
  relativePath = relativePath.replace(/\.ts$/, '');
  
  // 如果路径不以 . 开头，添加 ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

/**
 * 替换文件中的 console 语句
 */
function replaceConsoleInFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let newContent = content;

  // 检查是否已经导入 Logger
  const hasLoggerImport = /import.*Logger.*from.*['"].*loggerService['"]/.test(content);
  
  // 检查是否有 console 语句
  const hasConsole = /console\.(log|error|warn|info|debug)/.test(content);
  
  if (!hasConsole) {
    return false;
  }

  // 添加 loggerService 导入（如果还没有）
  if (!hasLoggerImport) {
    // 计算相对路径
    const loggerServicePath = path.join(process.cwd(), 'src/services/loggerService.ts');
    const relativePath = getRelativePath(filePath, loggerServicePath);
    
    // 找到最后一个 import 语句的位置
    const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      newContent = 
        content.slice(0, insertPosition) +
        `\nimport { Logger } from '${relativePath}';` +
        content.slice(insertPosition);
      
      modified = true;
    }
  }

  // 替换 console 语句
  const replacements = [
    { from: /console\.log\(/g, to: 'Logger.debug(', type: 'log' as const },
    { from: /console\.error\(/g, to: 'Logger.error(', type: 'error' as const },
    { from: /console\.warn\(/g, to: 'Logger.warn(', type: 'warn' as const },
    { from: /console\.info\(/g, to: 'Logger.info(', type: 'info' as const },
    { from: /console\.debug\(/g, to: 'Logger.debug(', type: 'debug' as const },
  ];

  for (const { from, to, type } of replacements) {
    const matches = newContent.match(from);
    if (matches) {
      newContent = newContent.replace(from, to);
      stats.replacements[type] += matches.length;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    stats.filesModified++;
  }

  return modified;
}

/**
 * 处理文件或目录
 */
async function processPath(pattern: string): Promise<void> {
  const files = await new Promise<string[]>((resolve, reject) => {
    glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    }, (err, matches) => {
      if (err) reject(err);
      else resolve(matches);
    });
  });

  for (const file of files) {
    stats.filesProcessed++;
    const modified = replaceConsoleInFile(file);
    
    if (modified) {
      console.log(`✅ 已修改: ${file}`);
    } else {
      console.log(`⏭️  跳过: ${file} (无需修改)`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ 错误: 请提供文件路径或 glob 模式');
    console.error('用法: npm run replace-console -- <文件路径或模式>');
    console.error('示例: npm run replace-console -- src/services/llmService.ts');
    console.error('示例: npm run replace-console -- "src/services/**/*.ts"');
    process.exit(1);
  }

  console.log('🚀 开始替换 console 语句...\n');

  for (const pattern of args) {
    await processPath(pattern);
  }

  console.log('\n📊 替换统计:');
  console.log(`  处理文件: ${stats.filesProcessed}`);
  console.log(`  修改文件: ${stats.filesModified}`);
  console.log(`  替换详情:`);
  console.log(`    console.log   → Logger.debug: ${stats.replacements.log}`);
  console.log(`    console.error → Logger.error: ${stats.replacements.error}`);
  console.log(`    console.warn  → Logger.warn:  ${stats.replacements.warn}`);
  console.log(`    console.info  → Logger.info:  ${stats.replacements.info}`);
  console.log(`    console.debug → Logger.debug: ${stats.replacements.debug}`);
  
  const total = Object.values(stats.replacements).reduce((a, b) => a + b, 0);
  console.log(`  总计: ${total} 处替换`);
  
  console.log('\n✅ 完成！');
}

main().catch((error) => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
