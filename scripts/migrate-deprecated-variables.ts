/**
 * 自动迁移已废弃的 CSS 变量
 * 
 * 功能:
 * 1. 自动替换已废弃的变量名
 * 2. 生成迁移报告
 * 3. 支持 dry-run 模式预览更改
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  from: RegExp;
  to: string;
  description: string;
}

// 迁移规则
const MIGRATIONS: Migration[] = [
  // 圆角变量迁移
  {
    from: /--radius-none\b/g,
    to: '--rounded-none',
    description: '圆角: none'
  },
  {
    from: /--radius-xs\b/g,
    to: '--rounded-xs',
    description: '圆角: xs'
  },
  {
    from: /--radius-sm\b/g,
    to: '--rounded-sm',
    description: '圆角: sm'
  },
  {
    from: /--radius-md\b/g,
    to: '--rounded-md',
    description: '圆角: md'
  },
  {
    from: /--radius-lg\b/g,
    to: '--rounded-lg',
    description: '圆角: lg'
  },
  {
    from: /--radius-xl\b/g,
    to: '--rounded-xl',
    description: '圆角: xl'
  },
  {
    from: /--radius-2xl\b/g,
    to: '--rounded-2xl',
    description: '圆角: 2xl'
  },
  {
    from: /--radius-3xl\b/g,
    to: '--rounded-3xl',
    description: '圆角: 3xl'
  },
  {
    from: /--radius-full\b/g,
    to: '--rounded-full',
    description: '圆角: full'
  },
  
  // 颜色变量迁移
  {
    from: /--color-primary-lighter\b/g,
    to: '--color-primary-light',
    description: '主色: lighter → light'
  },
  {
    from: /--color-warning-light\b/g,
    to: '--color-amber-400',
    description: '警告色: warning-light → amber-400'
  },
  {
    from: /--color-success-lighter\b/g,
    to: '--color-green-400',
    description: '成功色: success-lighter → green-400'
  }
];

interface FileChange {
  file: string;
  changes: Array<{
    line: number;
    from: string;
    to: string;
    context: string;
  }>;
}

function getAllCSSFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        getAllCSSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function migrateFile(filePath: string, dryRun: boolean): FileChange | null {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let newContent = content;
  const changes: FileChange['changes'] = [];
  
  for (const migration of MIGRATIONS) {
    const matches = content.matchAll(migration.from);
    
    for (const match of matches) {
      if (match.index !== undefined) {
        // 找到匹配所在的行
        let currentPos = 0;
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length + 1; // +1 for newline
          if (currentPos + lineLength > match.index) {
            changes.push({
              line: i + 1,
              from: match[0],
              to: migration.to,
              context: lines[i].trim()
            });
            break;
          }
          currentPos += lineLength;
        }
      }
    }
    
    newContent = newContent.replace(migration.from, migration.to);
  }
  
  if (changes.length > 0) {
    if (!dryRun) {
      writeFileSync(filePath, newContent, 'utf-8');
    }
    
    return {
      file: filePath,
      changes
    };
  }
  
  return null;
}

function migrate(dryRun: boolean = false): void {
  const projectRoot = join(__dirname, '..');
  const srcDir = join(projectRoot, 'src');
  
  const cssFiles = getAllCSSFiles(srcDir);
  const fileChanges: FileChange[] = [];
  
  console.log(`🔍 扫描 ${cssFiles.length} 个 CSS 文件...\n`);
  
  for (const file of cssFiles) {
    const change = migrateFile(file, dryRun);
    if (change) {
      fileChanges.push(change);
    }
  }
  
  // 生成报告
  console.log('═'.repeat(80));
  console.log(dryRun ? 'CSS 变量迁移预览 (Dry Run)' : 'CSS 变量迁移完成');
  console.log('═'.repeat(80));
  console.log('');
  
  if (fileChanges.length === 0) {
    console.log('✅ 没有需要迁移的变量');
    return;
  }
  
  const totalChanges = fileChanges.reduce((sum, fc) => sum + fc.changes.length, 0);
  
  console.log(`📊 统计信息:`);
  console.log(`   修改文件: ${fileChanges.length}`);
  console.log(`   总变更数: ${totalChanges}`);
  console.log('');
  
  // 按迁移类型分组统计
  const migrationStats = new Map<string, number>();
  for (const fc of fileChanges) {
    for (const change of fc.changes) {
      const key = `${change.from} → ${change.to}`;
      migrationStats.set(key, (migrationStats.get(key) || 0) + 1);
    }
  }
  
  console.log('📋 迁移统计:');
  for (const [migration, count] of migrationStats) {
    console.log(`   ${migration}: ${count} 处`);
  }
  console.log('');
  
  // 显示详细变更
  console.log('📝 详细变更:');
  console.log('─'.repeat(80));
  
  for (const fc of fileChanges) {
    const relPath = relative(projectRoot, fc.file);
    console.log(`\n${relPath} (${fc.changes.length} 处变更)`);
    
    // 按行号排序
    fc.changes.sort((a, b) => a.line - b.line);
    
    for (const change of fc.changes) {
      console.log(`  L${change.line}: ${change.from} → ${change.to}`);
      console.log(`       ${change.context}`);
    }
  }
  
  console.log('');
  console.log('═'.repeat(80));
  
  if (dryRun) {
    console.log('💡 这是预览模式，没有实际修改文件');
    console.log('   运行 npm run css:migrate 执行实际迁移');
  } else {
    console.log('✅ 迁移完成！');
    console.log('');
    console.log('📋 下一步:');
    console.log('   1. 检查变更是否正确');
    console.log('   2. 运行 npm run generate:tokens 重新生成配置');
    console.log('   3. 测试应用确保样式正常');
  }
  
  console.log('═'.repeat(80));
}

// 检查命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

migrate(dryRun);
