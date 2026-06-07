#!/usr/bin/env node
// tools/fix-logger-imports.js
// ================================================================
// 🔧 自动修复工具: 移除基础设施服务中的 Logger 依赖
// 将 loggerService 导入替换为直接使用 console
// ================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  srcDir: path.resolve(__dirname, '../src'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

const stats = {
  filesScanned: 0,
  filesModified: 0,
  importsRemoved: 0,
  callsReplaced: 0
};

/**
 * 检查文件是否包含 logger 导入限制
 */
function shouldFixFile(content) {
  const hasRestrictedImport =
    /import\s+.*\s+from\s+['"].*loggerService['"]/.test(content) ||
    /import\s+\{[^}]*Logger[^}]*\}\s+from/.test(content);

  return hasRestrictedImport;
}

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  stats.filesScanned++;

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  if (!shouldFixFile(content)) {
    return false;
  }

  if (CONFIG.verbose) {
    console.log(`📝 处理: ${path.relative(CONFIG.srcDir, filePath)}`);
  }

  // 1. 移除 Logger 相关的导入语句
  const importPatterns = [
    /import\s+\{\s*Logger\s*\}\s+from\s+['"].*loggerService['"];\s*\n/g,
    /import\s+\{\s*createLogger\s*\}\s+from\s+['"].*loggerService['"];\s*\n/g,
    /import\s+\{[^}]*Logger[^}]*\}\s+from\s+['"].*loggerService['"];\s*\n/g,
  ];

  importPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      stats.importsRemoved++;
    }
  });

  // 2. 替换 Logger 调用为 console 调用
  const replacements = [
    // Logger.debug() -> console.debug()
    { from: /Logger\.debug\(/g, to: 'console.debug(' },
    // Logger.info() -> console.log()
    { from: /Logger\.info\(/g, to: 'console.log(' },
    // Logger.warn() -> console.warn()
    { from: /Logger\.warn\(/g, to: 'console.warn(' },
    // Logger.error() -> console.error()
    { from: /Logger\.error\(/g, to: 'console.error(' },
    // this.logger.debug() -> console.debug()
    { from: /this\.logger\.debug\(/g, to: 'console.debug(' },
    { from: /this\.logger\.info\(/g, to: 'console.log(' },
    { from: /this\.logger\.warn\(/g, to: 'console.warn(' },
    { from: /this\.logger\.error\(/g, to: 'console.error(' },
  ];

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      stats.callsReplaced += matches.length;
    }
  });

  // 3. 移除 logger 实例变量声明
  content = content.replace(
    /private\s+logger:\s*Logger;\s*\n/g,
    ''
  );
  content = content.replace(
    /private\s+readonly\s+logger\s*=\s*Logger\.getInstance\([^)]*\);\s*\n/g,
    ''
  );

  // 4. 移除 logger 初始化
  content = content.replace(
    /this\.logger\s*=\s*Logger\.getInstance\([^)]*\);\s*\n/g,
    ''
  );
  content = content.replace(
    /this\.logger\s*=\s*createLogger\([^)]*\);\s*\n/g,
    ''
  );

  // 5. 清理多余的空行（最多保留2个连续空行）
  content = content.replace(/\n\n\n+/g, '\n\n');

  // 检查是否有修改
  if (content !== originalContent) {
    if (!CONFIG.dryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    stats.filesModified++;
    return true;
  }

  return false;
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过 node_modules, dist, tests
      if (['node_modules', 'dist', 'tests', 'test', '.git'].includes(file)) {
        continue;
      }
      scanDirectory(filePath);
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(file))) {
      fixFile(filePath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 Logger 导入修复工具\n');

  if (CONFIG.dryRun) {
    console.log('🔍 DRY RUN 模式 - 不会修改文件\n');
  }

  console.log(`📁 扫描目录: ${CONFIG.srcDir}\n`);

  const startTime = Date.now();
  scanDirectory(CONFIG.srcDir);
  const duration = Date.now() - startTime;

  console.log('\n✅ 扫描完成!\n');
  console.log('📊 统计结果:');
  console.log(`   - 扫描文件: ${stats.filesScanned}`);
  console.log(`   - 修改文件: ${stats.filesModified}`);
  console.log(`   - 移除导入: ${stats.importsRemoved}`);
  console.log(`   - 替换调用: ${stats.callsReplaced}`);
  console.log(`   - 耗时: ${duration}ms`);

  if (CONFIG.dryRun) {
    console.log('\n💡 提示: 移除 --dry-run 参数以实际修改文件');
  } else if (stats.filesModified > 0) {
    console.log('\n✅ 文件已修改，请运行以下命令验证:');
    console.log('   npm run lint');
    console.log('   npm run type-check');
  }
}

// 运行
main();
