/**
 * HTML ID命名规则使用示例
 * 展示如何使用HTML ID命名规则进行验证
 */

import { NamingRuleEngine } from '../src/naming-rules/NamingRuleEngine.js';
import { HTML_ID_RULES, isModuleLevelId, isGlobalLevelId, extractModulePrefix } from '../src/naming-rules/html-id-rules.js';

// 创建命名规则引擎实例
const engine = new NamingRuleEngine();

// 注册HTML ID规则
engine.registerRules(HTML_ID_RULES);

console.log('=== HTML ID命名规则验证示例 ===\n');

// 示例1：验证模块级ID
console.log('1. 模块级ID验证：');
const moduleLevelIds = [
  'sop-editor-container',      // 有效
  'app-dashboard-content',     // 有效
  'hub-analytics-chart',       // 有效
  'sopEditor',                 // 无效：驼峰命名
  'sop-editor',                // 无效：只有两个部分
];

moduleLevelIds.forEach(id => {
  const result = engine.validate(id, 'html-id');
  console.log(`  ${id}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例2：验证全局级ID
console.log('\n2. 全局级ID验证：');
const globalLevelIds = [
  'modal-overlay',             // 有效
  'sidebar-toggle',            // 有效
  'modalOverlay',              // 无效：驼峰命名
  'modal',                     // 无效：只有一个部分
  'app-modal-overlay',         // 无效：不应使用模块前缀
];

globalLevelIds.forEach(id => {
  const result = engine.validate(id, 'html-id');
  console.log(`  ${id}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例3：验证容器ID
console.log('\n3. 容器ID验证：');
const containerIds = [
  'sop-editor-container',      // 有效
  'modal-content-wrapper',     // 有效
  'sidebar-box',               // 有效
  'container',                 // 无效：太短
  'sopContainer',              // 无效：驼峰命名
];

containerIds.forEach(id => {
  const result = engine.validate(id, 'html-id');
  console.log(`  ${id}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
});

// 示例4：验证交互元素ID
console.log('\n4. 交互元素ID验证：');
const interactiveIds = [
  'submit-button',             // 有效
  'search-input',              // 有效
  'category-select',           // 有效
  'button',                    // 无效：太短
  'submitButton',              // 无效：驼峰命名
];

interactiveIds.forEach(id => {
  const result = engine.validate(id, 'html-id');
  console.log(`  ${id}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
});

// 示例5：使用辅助函数
console.log('\n5. 辅助函数使用：');
const testIds = [
  'sop-editor-container',
  'modal-overlay',
  'app-dashboard-content',
];

testIds.forEach(id => {
  console.log(`  ${id}:`);
  console.log(`    是模块级ID: ${isModuleLevelId(id)}`);
  console.log(`    是全局级ID: ${isGlobalLevelId(id)}`);
  const prefix = extractModulePrefix(id);
  if (prefix) {
    console.log(`    模块前缀: ${prefix}`);
  }
});

// 示例6：获取所有规则信息
console.log('\n6. 已注册的HTML ID规则：');
const htmlIdRules = engine.getAllRules('html-id');
console.log(`  共 ${htmlIdRules.length} 条规则：`);
htmlIdRules.forEach(rule => {
  console.log(`  - ${rule.name}: ${rule.description}`);
});
