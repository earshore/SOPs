/**
 * CSS类命名规则使用示例
 * 展示如何使用CSS类命名规则进行验证
 */

import { NamingRuleEngine } from '../src/naming-rules/NamingRuleEngine.js';
import { 
  CSS_CLASS_RULES, 
  isBemBlock, 
  isBemElement, 
  isBemModifier,
  isStateClass,
  isModuleClass,
  extractBemBlock,
  extractBemElement,
  extractBemModifier,
  extractModulePrefix,
  isNonSemanticClass,
  validateBemClass
} from '../src/naming-rules/css-class-rules.js';

// 创建命名规则引擎实例
const engine = new NamingRuleEngine();

// 注册CSS类规则
engine.registerRules(CSS_CLASS_RULES);

console.log('=== CSS类命名规则验证示例 ===\n');

// 示例1：验证BEM Block
console.log('1. BEM Block验证：');
const bemBlocks = [
  'card',                      // 有效
  'user-profile',              // 有效
  'navigation-menu',           // 有效
  'Card',                      // 无效：大写
  'userProfile',               // 无效：驼峰命名
  'card__title',               // 无效：这是Element
];

bemBlocks.forEach(className => {
  const result = engine.validate(className, 'css-class');
  console.log(`  ${className}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例2：验证BEM Element
console.log('\n2. BEM Element验证：');
const bemElements = [
  'card__title',               // 有效
  'card__body',                // 有效
  'user-profile__avatar',      // 有效
  'card-title',                // 无效：应使用__
  'card__Title',               // 无效：大写
  'card__title__subtitle',     // 无效：嵌套Element
];

bemElements.forEach(className => {
  const result = engine.validate(className, 'css-class');
  console.log(`  ${className}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例3：验证BEM Modifier
console.log('\n3. BEM Modifier验证：');
const bemModifiers = [
  'card--featured',            // 有效
  'card--large',               // 有效
  'card__title--large',        // 有效
  'button--primary',           // 有效
  'card-featured',             // 无效：应使用--
  'card__title-large',         // 无效：应使用--
];

bemModifiers.forEach(className => {
  const result = engine.validate(className, 'css-class');
  console.log(`  ${className}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例4：验证状态类
console.log('\n4. 状态类验证：');
const stateClasses = [
  'is-active',                 // 有效
  'is-disabled',               // 有效
  'has-error',                 // 有效
  'has-children',              // 有效
  'active',                    // 无效：缺少is-前缀
  'isActive',                  // 无效：驼峰命名
];

stateClasses.forEach(className => {
  const result = engine.validate(className, 'css-class');
  console.log(`  ${className}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例5：验证模块类
console.log('\n5. 模块类验证：');
const moduleClasses = [
  'sop-editor',                // 有效
  'app-dashboard',             // 有效
  'hub-analytics',             // 有效
  'sopEditor',                 // 无效：驼峰命名
  'sop_editor',                // 无效：下划线
  'editor',                    // 无效：缺少模块前缀
];

moduleClasses.forEach(className => {
  const result = engine.validate(className, 'css-class');
  console.log(`  ${className}: ${result.isValid ? '✓' : '✗'} ${result.message}`);
  if (result.suggestion) {
    console.log(`    建议: ${result.suggestion}`);
  }
});

// 示例6：检测非语义化类名
console.log('\n6. 非语义化类名检测：');
const nonSemanticClasses = [
  'blue-button',               // 非语义化：颜色
  'big-text',                  // 非语义化：尺寸
  'red-alert',                 // 非语义化：颜色
  'button-large',              // 非语义化：尺寸
  'primary-button',            // 语义化：功能
  'alert-error',               // 语义化：功能
];

nonSemanticClasses.forEach(className => {
  const isNonSemantic = isNonSemanticClass(className);
  console.log(`  ${className}: ${isNonSemantic ? '✗ 非语义化' : '✓ 语义化'}`);
});

// 示例7：使用辅助函数
console.log('\n7. 辅助函数使用：');
const testClasses = [
  'card',
  'card__title',
  'card--featured',
  'card__title--large',
  'is-active',
  'sop-editor',
];

testClasses.forEach(className => {
  console.log(`  ${className}:`);
  console.log(`    是BEM Block: ${isBemBlock(className)}`);
  console.log(`    是BEM Element: ${isBemElement(className)}`);
  console.log(`    是BEM Modifier: ${isBemModifier(className)}`);
  console.log(`    是状态类: ${isStateClass(className)}`);
  console.log(`    是模块类: ${isModuleClass(className)}`);
  
  const block = extractBemBlock(className);
  if (block) console.log(`    Block: ${block}`);
  
  const element = extractBemElement(className);
  if (element) console.log(`    Element: ${element}`);
  
  const modifier = extractBemModifier(className);
  if (modifier) console.log(`    Modifier: ${modifier}`);
  
  const modulePrefix = extractModulePrefix(className);
  if (modulePrefix) console.log(`    模块前缀: ${modulePrefix}`);
});

// 示例8：BEM类名完整性验证
console.log('\n8. BEM类名完整性验证：');
const bemClassesToValidate = [
  'card__title',
  'card__title__subtitle',     // 嵌套Element
  'card--featured--special',   // 嵌套Modifier
  'very-long-component-name-with-many-words__element',  // 过长的Block
];

bemClassesToValidate.forEach(className => {
  const validation = validateBemClass(className);
  console.log(`  ${className}:`);
  console.log(`    有效: ${validation.isValid ? '✓' : '✗'}`);
  if (validation.issues.length > 0) {
    console.log(`    问题: ${validation.issues.join('; ')}`);
  }
  if (validation.suggestions.length > 0) {
    console.log(`    建议: ${validation.suggestions.join('; ')}`);
  }
});

// 示例9：获取所有规则信息
console.log('\n9. 已注册的CSS类规则：');
const cssClassRules = engine.getAllRules('css-class');
console.log(`  共 ${cssClassRules.length} 条规则：`);
cssClassRules.forEach(rule => {
  console.log(`  - ${rule.name}: ${rule.description}`);
});
