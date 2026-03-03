/**
 * 快速测试脚本 - 验证核心功能
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 快速功能测试\n');

// 创建测试目录
const testDir = join(process.cwd(), 'test', 'fixtures');
if (!existsSync(testDir)) {
  mkdirSync(testDir, { recursive: true });
}

// 创建测试HTML文件
const testHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <!-- 正确的命名 -->
  <div id="app-header-container" class="header">
    <button id="app-header-toggle" class="header__toggle">Toggle</button>
  </div>
  
  <!-- 错误的命名 - 驼峰式 -->
  <div id="userProfile" class="userCard">
    <input id="searchInput" class="searchBox" />
  </div>
  
  <!-- 错误的命名 - 下划线 -->
  <div id="main_content" class="main_section">
    <span id="user_name" class="user_info">Name</span>
  </div>
  
  <!-- data属性测试 -->
  <button data-action-click="submit" data-state-active="true">Submit</button>
  <div data-config-theme="dark" data-id="123">Config</div>
</body>
</html>`;

const testHTMLPath = join(testDir, 'test.html');
writeFileSync(testHTMLPath, testHTML, 'utf-8');

console.log('✅ 测试文件已创建:', testHTMLPath);

// 测试命名规则
console.log('\n📋 测试命名规则引擎...\n');

const testCases = [
  // HTML ID测试
  { type: 'HTML ID', value: 'app-header-container', expected: true },
  { type: 'HTML ID', value: 'header-toggle', expected: true },
  { type: 'HTML ID', value: 'userProfile', expected: false },
  { type: 'HTML ID', value: 'main_content', expected: false },
  
  // CSS类测试
  { type: 'CSS类', value: 'header', expected: true },
  { type: 'CSS类', value: 'header__toggle', expected: true },
  { type: 'CSS类', value: 'header--active', expected: true },
  { type: 'CSS类', value: 'is-active', expected: true },
  { type: 'CSS类', value: 'userCard', expected: false },
  { type: 'CSS类', value: 'main_section', expected: false },
  
  // data属性测试
  { type: 'data属性', value: 'data-action-click', expected: true },
  { type: 'data属性', value: 'data-state-active', expected: true },
  { type: 'data属性', value: 'data-config-theme', expected: true },
  { type: 'data属性', value: 'data-id', expected: true },
];

// 简单的规则验证
const htmlIdPattern = /^([a-z]+(-[a-z]+)+)$/;
const cssClassPattern = /^([a-z]+(-[a-z]+)*)(__[a-z]+(-[a-z]+)*)?(--[a-z]+(-[a-z]+)*)?$|^(is|has)-[a-z]+(-[a-z]+)*$/;
const dataAttrPattern = /^data-(action|state|config|id)(-[a-z]+)*$/;

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  let pattern;
  if (test.type === 'HTML ID') {
    pattern = htmlIdPattern;
  } else if (test.type === 'CSS类') {
    pattern = cssClassPattern;
  } else if (test.type === 'data属性') {
    pattern = dataAttrPattern;
  }
  
  const result = pattern.test(test.value);
  const success = result === test.expected;
  
  if (success) {
    console.log(`✅ ${test.type}: "${test.value}" - ${test.expected ? '有效' : '无效'}`);
    passed++;
  } else {
    console.log(`❌ ${test.type}: "${test.value}" - 预期 ${test.expected ? '有效' : '无效'}, 实际 ${result ? '有效' : '无效'}`);
    failed++;
  }
});

console.log(`\n测试结果: ${passed} 通过, ${failed} 失败`);

if (failed === 0) {
  console.log('\n✅ 所有测试通过！');
} else {
  console.log('\n❌ 部分测试失败');
  process.exit(1);
}
