/**
 * 命名规则模块
 * 定义和管理HTML ID、CSS类和data属性的命名规范
 */

export { NamingRuleEngine } from './NamingRuleEngine.js';
export type { NamingRule, ValidationResult, NamingCategory } from '../types/index.js';

// HTML ID规则
export {
  HTML_ID_RULES,
  MODULE_PREFIXES,
  CONTAINER_SUFFIXES,
  CONTENT_SUFFIXES,
  INTERACTIVE_SUFFIXES,
  getHtmlIdRules,
  isModuleLevelId,
  isGlobalLevelId,
  extractModulePrefix,
  hasSuffix,
  generateIdSuggestion,
} from './html-id-rules.js';

// CSS类规则
export {
  CSS_CLASS_RULES,
  getCssClassRules,
  isBemBlock,
  isBemElement,
  isBemModifier,
  isStateClass,
  isModuleClass,
  extractBemBlock,
  extractBemElement,
  extractBemModifier,
  isNonSemanticClass,
  generateClassSuggestion,
  validateBemClass,
} from './css-class-rules.js';

// data属性规则
export {
  DATA_ATTR_RULES,
  ALPINE_ATTRIBUTES,
  DATA_ATTR_PREFIXES,
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
} from './data-attr-rules.js';
