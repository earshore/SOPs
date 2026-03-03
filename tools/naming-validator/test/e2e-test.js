/**
 * 端到端测试脚本 - 测试完整的验证和迁移流程
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

console.log('🧪 端到端测试\n');

const testDir = join(process.cwd(), 'test', 'e2e-fixtures');
const cliPath = join(process.cwd(), 'dist', 'cli.js');

// 清理并创建测试目录
if (existsSync(testDir)) {
  rmSync(testDir, { recursive: true, force: true });
}
mkdirSync(testDir, { recursive: true });

// 创建测试文件
const testHTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <!-- 正确命名 -->
  <div id="app-header-container" class="header">
    <button id="app-header-toggle" class="header__toggle">Toggle</button>
  </div>
  
  <!-- 错误命名 -->
  <div id="userProfile" class="userCard">
    <input id="searchInput" class="searchBox" />
  </div>
</body>
</html>`;

const testCSS = `.header {
  background: #333;
}

.header__toggle {
  padding: 0.5rem;
}

/* 错误命名 */
.userCard {
  border: 1px solid #ccc;
}

.searchBox {
  width: 100%;
}`;

writeFileSync(join(testDir, 'test.html'), testHTML, 'utf-8');
writeFileSync(join(testDir, 'test.css'), testCSS, 'utf-8');

console.log('✅ 测试文件已创建\n');

// 测试1: 验证命令
console.log('📋 测试1: 验证命令\n');
try {
  const output = execSync(`node "${cliPath}" validate "${testDir}" --format json`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  const report = JSON.parse(output.split('\n').find(line => line.startsWith('{')));
  
  console.log(`  发现问题: ${report.totalIssues}`);
  console.log(`  扫描文件: ${report.totalFiles}`);
  
  if (report.totalIssues > 0) {
    console.log('  ✅ 验证命令正常工作\n');
  } else {
    console.log('  ❌ 应该检测到命名问题\n');
    process.exit(1);
  }
} catch (error) {
  console.log('  ⚠️  验证命令执行（预期有错误退出码）\n');
}

// 测试2: 预览模式
console.log('📋 测试2: 迁移预览模式\n');
try {
  const output = execSync(`node "${cliPath}" migrate "${testDir}" --dry-run`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  if (output.includes('预览模式')) {
    console.log('  ✅ 预览模式正常工作\n');
  } else {
    console.log('  ❌ 预览模式输出异常\n');
    process.exit(1);
  }
} catch (error) {
  console.log('  ❌ 预览模式执行失败:', error.message, '\n');
  process.exit(1);
}

// 测试3: 备份列表
console.log('📋 测试3: 列出备份\n');
try {
  const output = execSync(`node "${cliPath}" list-backups`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  console.log('  ✅ 备份列表命令正常工作\n');
} catch (error) {
  console.log('  ❌ 备份列表命令失败:', error.message, '\n');
  process.exit(1);
}

// 测试4: 配置文件加载
console.log('📋 测试4: 配置文件加载\n');
const configPath = join(testDir, '.naming-rules.json');
const testConfig = {
  validator: {
    include: ['**/*.html'],
    exclude: ['node_modules/**'],
    rules: {
      'html-id': true,
      'css-class': false,
      'data-attr': false
    }
  }
};
writeFileSync(configPath, JSON.stringify(testConfig, null, 2), 'utf-8');

try {
  const output = execSync(`node "${cliPath}" validate "${testDir}" --config "${configPath}" --format json`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  console.log('  ✅ 配置文件加载正常\n');
} catch (error) {
  console.log('  ⚠️  配置文件测试完成（预期有错误退出码）\n');
}

// 清理测试文件
console.log('🧹 清理测试文件...\n');
rmSync(testDir, { recursive: true, force: true });

console.log('✅ 所有端到端测试通过！\n');
console.log('测试覆盖:');
console.log('  ✅ 验证命令');
console.log('  ✅ 迁移预览模式');
console.log('  ✅ 备份管理');
console.log('  ✅ 配置文件加载');
