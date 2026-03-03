/**
 * CSS清理工具
 * 扫描并报告可能未使用的CSS文件和规则
 * 
 * 运行: npm run css:cleanup
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const CSS_DIR = join(PROJECT_ROOT, 'src/css');
const MODULES_DIR = join(PROJECT_ROOT, 'src/modules');
const SRC_DIR = join(PROJECT_ROOT, 'src');

interface CSSFile {
  path: string;
  relativePath: string;
  size: number;
  lines: number;
  imports: string[];
  classes: string[];
}

interface UnusedReport {
  unusedFiles: CSSFile[];
  duplicateClasses: Map<string, string[]>;
  emptyFiles: CSSFile[];
  largeFiles: CSSFile[];
  deprecatedPatterns: Array<{ file: string; pattern: string; line: number }>;
}

/**
 * 递归扫描目录中的CSS文件
 */
function scanCSSFiles(dir: string, files: CSSFile[] = []): CSSFile[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和 dist
      if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
        scanCSSFiles(fullPath, files);
      }
    } else if (entry.endsWith('.css')) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      // 提取 @import 语句
      const imports = lines
        .filter(line => line.trim().startsWith('@import'))
        .map(line => line.trim());
      
      // 提取类名 (简单匹配)
      const classMatches = content.match(/\.([\w-]+)/g) || [];
      const classes = [...new Set(classMatches.map(c => c.substring(1)))];
      
      files.push({
        path: fullPath,
        relativePath: relative(PROJECT_ROOT, fullPath),
        size: stat.size,
        lines: lines.length,
        imports,
        classes
      });
    }
  }
  
  return files;
}

/**
 * 检查CSS文件是否被引用
 */
function isFileReferenced(cssFile: CSSFile, allFiles: string[]): boolean {
  const fileName = cssFile.relativePath;
  
  // 检查是否在 main.css 中被导入
  const mainCss = join(CSS_DIR, 'main.css');
  if (allFiles.includes(mainCss)) {
    const mainContent = readFileSync(mainCss, 'utf-8');
    if (mainContent.includes(fileName) || mainContent.includes(cssFile.path)) {
      return true;
    }
  }
  
  // 检查是否在 TypeScript/JavaScript 文件中被导入
  const tsFiles = scanTSFiles(SRC_DIR);
  for (const tsFile of tsFiles) {
    const content = readFileSync(tsFile, 'utf-8');
    if (content.includes(fileName) || content.includes(cssFile.relativePath)) {
      return true;
    }
  }
  
  // 检查是否在其他CSS文件中被导入
  for (const file of allFiles) {
    if (file === cssFile.path) continue;
    const content = readFileSync(file, 'utf-8');
    if (content.includes(fileName) || content.includes(cssFile.relativePath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 扫描TypeScript/JavaScript文件
 */
function scanTSFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
        scanTSFiles(fullPath, files);
      }
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 查找重复的类名
 */
function findDuplicateClasses(cssFiles: CSSFile[]): Map<string, string[]> {
  const classMap = new Map<string, string[]>();
  
  for (const file of cssFiles) {
    for (const className of file.classes) {
      if (!classMap.has(className)) {
        classMap.set(className, []);
      }
      classMap.get(className)!.push(file.relativePath);
    }
  }
  
  // 只保留出现在多个文件中的类名
  const duplicates = new Map<string, string[]>();
  for (const [className, files] of classMap.entries()) {
    if (files.length > 1) {
      duplicates.set(className, files);
    }
  }
  
  return duplicates;
}

/**
 * 查找已废弃的CSS模式
 */
function findDeprecatedPatterns(cssFiles: CSSFile[]): Array<{ file: string; pattern: string; line: number }> {
  const deprecated: Array<{ file: string; pattern: string; line: number }> = [];
  
  const deprecatedPatterns = [
    /--radius-/,  // 应该使用 --rounded-
    /--color-primary-lighter/,  // 应该使用 --color-primary-light
    /--color-warning-light(?!er)/,  // 应该使用 --color-amber-400
    /@import.*\.css['"];?\s*$/,  // 裸 @import (应该使用相对路径)
    /!important/,  // 过度使用 !important
  ];
  
  for (const file of cssFiles) {
    const content = readFileSync(file.path, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      for (const pattern of deprecatedPatterns) {
        if (pattern.test(line)) {
          deprecated.push({
            file: file.relativePath,
            pattern: pattern.source,
            line: index + 1
          });
        }
      }
    });
  }
  
  return deprecated;
}

/**
 * 生成清理报告
 */
function generateReport(): UnusedReport {
  console.log('🔍 扫描CSS文件...\n');
  
  const cssFiles = scanCSSFiles(SRC_DIR);
  const allFilePaths = cssFiles.map(f => f.path);
  
  console.log(`📊 找到 ${cssFiles.length} 个CSS文件\n`);
  
  // 查找未使用的文件
  const unusedFiles = cssFiles.filter(file => {
    // 跳过主CSS文件和生成的文件
    if (file.relativePath.includes('main.css') || 
        file.relativePath.includes('.generated.')) {
      return false;
    }
    return !isFileReferenced(file, allFilePaths);
  });
  
  // 查找空文件或几乎为空的文件
  const emptyFiles = cssFiles.filter(file => {
    const content = readFileSync(file.path, 'utf-8');
    const nonCommentLines = content
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('//');
      });
    return nonCommentLines.length < 5;
  });
  
  // 查找大文件 (>1000行)
  const largeFiles = cssFiles
    .filter(file => file.lines > 1000)
    .sort((a, b) => b.lines - a.lines);
  
  // 查找重复的类名
  const duplicateClasses = findDuplicateClasses(cssFiles);
  
  // 查找已废弃的模式
  const deprecatedPatterns = findDeprecatedPatterns(cssFiles);
  
  return {
    unusedFiles,
    duplicateClasses,
    emptyFiles,
    largeFiles,
    deprecatedPatterns
  };
}

/**
 * 打印报告
 */
function printReport(report: UnusedReport): void {
  console.log('═'.repeat(80));
  console.log('CSS 清理报告');
  console.log('═'.repeat(80));
  console.log('');
  
  // 未使用的文件
  if (report.unusedFiles.length > 0) {
    console.log('⚠️  可能未使用的CSS文件:');
    console.log('─'.repeat(80));
    for (const file of report.unusedFiles) {
      console.log(`   ${file.relativePath}`);
      console.log(`   大小: ${(file.size / 1024).toFixed(2)} KB, 行数: ${file.lines}`);
      console.log('');
    }
  } else {
    console.log('✅ 未发现未使用的CSS文件\n');
  }
  
  // 空文件
  if (report.emptyFiles.length > 0) {
    console.log('📝 空文件或几乎为空的文件:');
    console.log('─'.repeat(80));
    for (const file of report.emptyFiles) {
      console.log(`   ${file.relativePath} (${file.lines} 行)`);
    }
    console.log('');
  }
  
  // 大文件
  if (report.largeFiles.length > 0) {
    console.log('📦 大型CSS文件 (>1000行):');
    console.log('─'.repeat(80));
    for (const file of report.largeFiles) {
      console.log(`   ${file.relativePath}`);
      console.log(`   行数: ${file.lines}, 大小: ${(file.size / 1024).toFixed(2)} KB`);
      console.log('');
    }
  }
  
  // 重复的类名 (只显示前20个)
  if (report.duplicateClasses.size > 0) {
    console.log(`🔄 重复的类名 (${report.duplicateClasses.size} 个):`);
    console.log('─'.repeat(80));
    let count = 0;
    for (const [className, files] of report.duplicateClasses.entries()) {
      if (count++ >= 20) {
        console.log(`   ... 还有 ${report.duplicateClasses.size - 20} 个重复类名`);
        break;
      }
      console.log(`   .${className} (${files.length} 个文件)`);
      files.forEach(file => console.log(`      - ${file}`));
      console.log('');
    }
  }
  
  // 已废弃的模式
  if (report.deprecatedPatterns.length > 0) {
    console.log(`⚠️  已废弃的CSS模式 (${report.deprecatedPatterns.length} 处):`);
    console.log('─'.repeat(80));
    const grouped = new Map<string, typeof report.deprecatedPatterns>();
    for (const item of report.deprecatedPatterns) {
      if (!grouped.has(item.file)) {
        grouped.set(item.file, []);
      }
      grouped.get(item.file)!.push(item);
    }
    
    for (const [file, items] of grouped.entries()) {
      console.log(`   ${file}:`);
      items.forEach(item => {
        console.log(`      行 ${item.line}: ${item.pattern}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ 未发现已废弃的CSS模式\n');
  }
  
  // 总结
  console.log('═'.repeat(80));
  console.log('📊 总结:');
  console.log('─'.repeat(80));
  console.log(`   可能未使用的文件: ${report.unusedFiles.length}`);
  console.log(`   空文件: ${report.emptyFiles.length}`);
  console.log(`   大文件 (>1000行): ${report.largeFiles.length}`);
  console.log(`   重复的类名: ${report.duplicateClasses.size}`);
  console.log(`   已废弃的模式: ${report.deprecatedPatterns.length}`);
  console.log('═'.repeat(80));
  console.log('');
  
  if (report.unusedFiles.length === 0 && 
      report.emptyFiles.length === 0 && 
      report.deprecatedPatterns.length === 0) {
    console.log('✅ CSS代码库状态良好！');
  } else {
    console.log('💡 建议: 审查并清理上述问题以减少技术债务');
  }
}

// 执行清理报告
try {
  const report = generateReport();
  printReport(report);
} catch (error) {
  console.error('❌ 生成清理报告失败:', error);
  process.exit(1);
}
