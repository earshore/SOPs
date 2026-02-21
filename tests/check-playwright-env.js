// tests/check-playwright-env.js
// ================================================================
// 🔍 Playwright 环境检查脚本
// 检查 Playwright 是否正确安装和配置
// ================================================================

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('🔍 检查 Playwright 环境...\n');

let hasErrors = false;

// 1. 检查配置文件
console.log('📋 检查配置文件...');
const configFile = 'playwright.config.ts';
if (fs.existsSync(configFile)) {
  console.log(`${GREEN}✓${RESET} ${configFile} 存在`);
} else {
  console.log(`${RED}✗${RESET} ${configFile} 不存在`);
  hasErrors = true;
}

// 2. 检查测试目录
console.log('\n📁 检查测试目录...');
const testDirs = [
  'tests/startup',
  'tests/e2e',
  'tests/e2e/pages',
  'tests/helpers'
];

for (const dir of testDirs) {
  if (fs.existsSync(dir)) {
    console.log(`${GREEN}✓${RESET} ${dir} 存在`);
  } else {
    console.log(`${RED}✗${RESET} ${dir} 不存在`);
    hasErrors = true;
  }
}

// 3. 检查辅助文件
console.log('\n📄 检查辅助文件...');
const helperFiles = [
  'tests/helpers/playwright-utils.ts',
  'tests/helpers/BasePage.ts',
  'tests/playwright-setup.ts',
  'tests/playwright-teardown.ts'
];

for (const file of helperFiles) {
  if (fs.existsSync(file)) {
    console.log(`${GREEN}✓${RESET} ${file} 存在`);
  } else {
    console.log(`${RED}✗${RESET} ${file} 不存在`);
    hasErrors = true;
  }
}

// 4. 检查 Playwright 浏览器
console.log('\n🌐 检查 Playwright 浏览器...');
try {
  const browser = await chromium.launch({ headless: true });
  await browser.close();
  console.log(`${GREEN}✓${RESET} Chromium 浏览器已安装`);
} catch (error) {
  console.log(`${RED}✗${RESET} Chromium 浏览器未安装`);
  console.log(`${YELLOW}→${RESET} 运行: npm run playwright:install`);
  hasErrors = true;
}

// 5. 检查 package.json 脚本
console.log('\n📦 检查 package.json 脚本...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const requiredScripts = [
  'test:e2e',
  'test:startup',
  'playwright:install'
];

for (const script of requiredScripts) {
  if (packageJson.scripts[script]) {
    console.log(`${GREEN}✓${RESET} npm run ${script} 可用`);
  } else {
    console.log(`${RED}✗${RESET} npm run ${script} 不可用`);
    hasErrors = true;
  }
}

// 总结
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log(`${RED}❌ 环境检查失败${RESET}`);
  console.log('\n请修复上述问题后重试。');
  process.exit(1);
} else {
  console.log(`${GREEN}✅ 环境检查通过${RESET}`);
  console.log('\nPlaywright 测试环境已正确配置！');
  console.log('\n下一步：');
  console.log('  1. 确保浏览器已安装: npm run playwright:install');
  console.log('  2. 启动开发服务器: npm run dev');
  console.log('  3. 运行启动测试: npm run test:startup');
  console.log('  4. 运行 E2E 测试: npm run test:e2e');
}
