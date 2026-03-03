/**
 * data属性命名规则示例
 * 演示如何使用data属性命名规则进行验证和建议生成
 */

import {
  DATA_ATTR_RULES,
  ALPINE_ATTRIBUTES,
  getDataAttrRules,
  isAlpineAttribute,
  isActionAttribute,
  isStateAttribute,
  isConfigAttribute,
  isIdAttribute,
  extractDataAttrType,
  extractDataAttrName,
  generateDataAttrSuggestion,
  validateDataAttrValue,
  validateDataAttrBestPractices,
} from '../src/naming-rules/data-attr-rules.js';

console.log('=== data属性命名规则示例 ===\n');

// 1. 获取所有规则
console.log('1. 所有data属性规则：');
const rules = getDataAttrRules();
rules.forEach(rule => {
  console.log(`\n规则名称: ${rule.name}`);
  console.log(`描述: ${rule.description}`);
  console.log(`正则: ${rule.pattern}`);
  console.log(`有效示例: ${rule.examples.valid.join(', ')}`);
  console.log(`无效示例: ${rule.examples.invalid.join(', ')}`);
});

// 2. 检查Alpine.js属性
console.log('\n\n2. Alpine.js属性检查：');
const alpineAttrs = ['x-data', 'x-show', 'x-on:click', 'x-bind:class', 'data-action-submit'];
alpineAttrs.forEach(attr => {
  console.log(`${attr}: ${isAlpineAttribute(attr) ? 'Alpine.js属性' : '自定义属性'}`);
});

// 3. 检查属性类型
console.log('\n\n3. 属性类型检查：');
const testAttrs = [
  'data-action-submit',
  'data-state-loading',
  'data-config-theme',
  'data-user-id',
  'data-id',
  'data-value',
];

testAttrs.forEach(attr => {
  console.log(`\n${attr}:`);
  console.log(`  行为属性: ${isActionAttribute(attr)}`);
  console.log(`  状态属性: ${isStateAttribute(attr)}`);
  console.log(`  配置属性: ${isConfigAttribute(attr)}`);
  console.log(`  标识属性: ${isIdAttribute(attr)}`);
  console.log(`  类型: ${extractDataAttrType(attr) || '通用'}`);
  console.log(`  名称: ${extractDataAttrName(attr)}`);
});

// 4. 生成建议
console.log('\n\n4. 命名建议生成：');
const invalidAttrs = [
  'actionSubmit',
  'data-actionSubmit',
  'stateLoading',
  'data-state-Loading',
  'userId',
  'data_user_id',
  'x-data',  // Alpine.js属性应保持不变
];

invalidAttrs.forEach(attr => {
  const suggestion = generateDataAttrSuggestion(attr);
  console.log(`${attr} -> ${suggestion}`);
});

// 5. 验证属性值格式
console.log('\n\n5. 属性值格式验证：');
const attrValues = [
  'submit-form',
  'loadMore',
  'load more',
  'load_more',
  'SUBMIT',
];

attrValues.forEach(value => {
  const result = validateDataAttrValue(value);
  console.log(`\n值: "${value}"`);
  console.log(`  有效: ${result.isValid}`);
  if (!result.isValid) {
    console.log(`  问题: ${result.issues.join('; ')}`);
    console.log(`  建议: ${result.suggestions.join('; ')}`);
  }
});

// 6. 最佳实践验证
console.log('\n\n6. 最佳实践验证：');
const practiceAttrs = [
  'data-action-submit',
  'action-submit',
  'data-very-long-attribute-name-that-is-too-long',
  'data-value',
  'x-data',
];

practiceAttrs.forEach(attr => {
  const result = validateDataAttrBestPractices(attr);
  console.log(`\n属性: ${attr}`);
  console.log(`  符合最佳实践: ${result.isValid}`);
  if (!result.isValid) {
    console.log(`  问题: ${result.issues.join('; ')}`);
    console.log(`  建议: ${result.suggestions.join('; ')}`);
  }
});

// 7. 规则模式测试
console.log('\n\n7. 规则模式测试：');
const testCases = [
  // data-action规则
  { attr: 'data-action-submit', expected: true, rule: 'data-action' },
  { attr: 'data-action-toggle-menu', expected: true, rule: 'data-action' },
  { attr: 'data-action', expected: false, rule: 'data-action' },
  { attr: 'data-actionSubmit', expected: false, rule: 'data-action' },
  
  // data-state规则
  { attr: 'data-state-active', expected: true, rule: 'data-state' },
  { attr: 'data-state-loading', expected: true, rule: 'data-state' },
  { attr: 'data-state', expected: false, rule: 'data-state' },
  
  // data-config规则
  { attr: 'data-config-theme', expected: true, rule: 'data-config' },
  { attr: 'data-config-max-items', expected: true, rule: 'data-config' },
  { attr: 'data-config', expected: false, rule: 'data-config' },
  
  // data-id规则
  { attr: 'data-id', expected: true, rule: 'data-id' },
  { attr: 'data-user-id', expected: true, rule: 'data-id' },
  { attr: 'data-product-item-id', expected: true, rule: 'data-id' },
  { attr: 'data-userId', expected: false, rule: 'data-id' },
  
  // 通用data属性
  { attr: 'data-value', expected: true, rule: 'data-generic' },
  { attr: 'data-index', expected: true, rule: 'data-generic' },
  { attr: 'dataValue', expected: false, rule: 'data-generic' },
];

testCases.forEach(({ attr, expected, rule }) => {
  const ruleObj = rules.find(r => r.name === rule);
  if (ruleObj) {
    const matches = ruleObj.pattern.test(attr);
    const status = matches === expected ? '✓' : '✗';
    console.log(`${status} ${attr} (规则: ${rule}, 期望: ${expected}, 实际: ${matches})`);
  }
});

console.log('\n=== 示例完成 ===');
