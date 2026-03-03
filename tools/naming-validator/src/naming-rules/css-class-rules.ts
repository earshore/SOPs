/**
 * CSS类命名规则
 * 定义CSS类的命名规范和验证规则
 * 支持BEM方法论和模块特定类命名
 */

import type { NamingRule } from '../types/index.js';

/**
 * 模块前缀映射
 * 将模块名称映射到对应的前缀
 */
export const MODULE_PREFIXES = {
  app_center: 'app',
  sops: 'sop',
  amz_hub: 'hub',
} as const;

/**
 * 状态类前缀
 */
export const STATE_PREFIXES = ['is', 'has'] as const;

/**
 * CSS类命名规则集合
 * 
 * 规则说明：
 * 1. BEM Block：小写字母和连字符，如 card、user-profile
 * 2. BEM Element：block__element 格式
 * 3. BEM Modifier：block--modifier 或 block__element--modifier 格式
 * 4. 状态类：is-* 或 has-* 前缀
 * 5. 模块类：{module-prefix}-{component} 格式
 * 6. 禁止非语义化类名（如 blue-button、big-text）
 */
export const CSS_CLASS_RULES: NamingRule[] = [
  {
    name: 'bem-block',
    pattern: /^[a-z]+(-[a-z]+)*$/,
    description: 'BEM Block：小写字母和连字符，如 card、user-profile',
    examples: {
      valid: [
        'card',
        'user-profile',
        'navigation-menu',
        'button',
        'modal',
      ],
      invalid: [
        'Card',
        'userProfile',
        'user_profile',
        'CARD',
        'card__title',
      ],
    },
    category: 'css-class',
  },
  {
    name: 'bem-element',
    pattern: /^[a-z]+(-[a-z]+)*__[a-z]+(-[a-z]+)*$/,
    description: 'BEM Element：block__element 格式',
    examples: {
      valid: [
        'card__title',
        'card__body',
        'user-profile__avatar',
        'navigation-menu__item',
        'button__icon',
      ],
      invalid: [
        'card-title',
        'card__Title',
        'cardTitle',
        'card_title',
        'card__title__subtitle',
      ],
    },
    category: 'css-class',
  },
  {
    name: 'bem-modifier',
    pattern: /^[a-z]+(-[a-z]+)*(__[a-z]+(-[a-z]+)*)?--[a-z]+(-[a-z]+)*$/,
    description: 'BEM Modifier：block--modifier 或 block__element--modifier 格式',
    examples: {
      valid: [
        'card--featured',
        'card--large',
        'card__title--large',
        'button--primary',
        'button__icon--small',
        'user-profile--compact',
      ],
      invalid: [
        'card-featured',
        'card__title-large',
        'cardFeatured',
        'card_featured',
        'card--',
      ],
    },
    category: 'css-class',
  },
  {
    name: 'state-class',
    pattern: /^(is|has)-[a-z]+(-[a-z]+)*$/,
    description: '状态类：is-* 或 has-* 前缀，表示元素状态',
    examples: {
      valid: [
        'is-active',
        'is-disabled',
        'is-loading',
        'has-error',
        'has-children',
        'is-open',
      ],
      invalid: [
        'active',
        'error',
        'isActive',
        'hasError',
        'is_active',
        'is-',
      ],
    },
    category: 'css-class',
  },
  {
    name: 'module-class',
    pattern: /^(app|sop|hub)-[a-z]+(-[a-z]+)*$/,
    description: '模块类：{module-prefix}-{component} 格式，用于模块特定样式',
    examples: {
      valid: [
        'sop-editor',
        'sop-form',
        'app-dashboard',
        'app-sidebar',
        'hub-analytics',
        'hub-chart',
      ],
      invalid: [
        'sopEditor',
        'sop_editor',
        'SOP-EDITOR',
        'editor',
        'sop-',
      ],
    },
    category: 'css-class',
  },
];

/**
 * 获取所有CSS类规则
 * @returns CSS类规则数组
 */
export function getCssClassRules(): NamingRule[] {
  return CSS_CLASS_RULES;
}

/**
 * 检查类名是否为BEM Block
 * @param className 要检查的类名
 * @returns 是否为BEM Block
 */
export function isBemBlock(className: string): boolean {
  return /^[a-z]+(-[a-z]+)*$/.test(className) && 
         !className.includes('__') && 
         !className.includes('--');
}

/**
 * 检查类名是否为BEM Element
 * @param className 要检查的类名
 * @returns 是否为BEM Element
 */
export function isBemElement(className: string): boolean {
  return /^[a-z]+(-[a-z]+)*__[a-z]+(-[a-z]+)*$/.test(className) &&
         !className.includes('--');
}

/**
 * 检查类名是否为BEM Modifier
 * @param className 要检查的类名
 * @returns 是否为BEM Modifier
 */
export function isBemModifier(className: string): boolean {
  return /^[a-z]+(-[a-z]+)*(__[a-z]+(-[a-z]+)*)?--[a-z]+(-[a-z]+)*$/.test(className);
}

/**
 * 检查类名是否为状态类
 * @param className 要检查的类名
 * @returns 是否为状态类
 */
export function isStateClass(className: string): boolean {
  return /^(is|has)-[a-z]+(-[a-z]+)*$/.test(className);
}

/**
 * 检查类名是否为模块类
 * @param className 要检查的类名
 * @returns 是否为模块类
 */
export function isModuleClass(className: string): boolean {
  return /^(app|sop|hub)-[a-z]+(-[a-z]+)*$/.test(className);
}

/**
 * 从BEM类名中提取Block名称
 * @param className BEM类名
 * @returns Block名称或null
 */
export function extractBemBlock(className: string): string | null {
  // 匹配 block__element--modifier 或 block__element 或 block--modifier 或 block
  const match = className.match(/^([a-z]+(-[a-z]+)*)/);
  return match ? match[1] : null;
}

/**
 * 从BEM类名中提取Element名称
 * @param className BEM类名
 * @returns Element名称或null
 */
export function extractBemElement(className: string): string | null {
  const match = className.match(/__([a-z]+(-[a-z]+)*)/);
  return match ? match[1] : null;
}

/**
 * 从BEM类名中提取Modifier名称
 * @param className BEM类名
 * @returns Modifier名称或null
 */
export function extractBemModifier(className: string): string | null {
  const match = className.match(/--([a-z]+(-[a-z]+)*)$/);
  return match ? match[1] : null;
}

/**
 * 从模块类中提取模块前缀
 * @param className 模块类名
 * @returns 模块前缀或null
 */
export function extractModulePrefix(className: string): string | null {
  const match = className.match(/^(app|sop|hub)-/);
  return match ? match[1] : null;
}

/**
 * 检查类名是否为非语义化类名
 * 非语义化类名是指直接描述样式而非功能的类名
 * @param className 要检查的类名
 * @returns 是否为非语义化类名
 */
export function isNonSemanticClass(className: string): boolean {
  // 常见的非语义化模式
  const nonSemanticPatterns = [
    /^(red|blue|green|yellow|orange|purple|pink|gray|black|white)-/,  // 颜色
    /^(big|small|large|tiny|huge)-/,  // 尺寸
    /^(bold|italic|underline)-/,  // 文本样式
    /-(red|blue|green|yellow|orange|purple|pink|gray|black|white)$/,  // 颜色后缀
    /-(big|small|large|tiny|huge)$/,  // 尺寸后缀
  ];

  return nonSemanticPatterns.some(pattern => pattern.test(className));
}

/**
 * 为CSS类名生成智能建议
 * @param value 当前类名
 * @returns 建议的类名
 */
export function generateClassSuggestion(value: string): string {
  // 基础转换：转为小写并替换非法字符
  let suggestion = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/_{1,}/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-]+|[-]+$/g, '');

  // 如果包含驼峰命名，转换为kebab-case
  suggestion = suggestion.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  // 如果包含下划线但不是BEM分隔符，转换为连字符
  if (!suggestion.includes('__') && !suggestion.includes('--')) {
    suggestion = suggestion.replace(/_/g, '-');
  }

  // 如果是非语义化类名，提示使用语义化命名
  if (isNonSemanticClass(suggestion)) {
    // 尝试提取有意义的部分
    const parts = suggestion.split('-');
    const meaningfulParts = parts.filter(part => 
      !['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray', 'black', 'white',
        'big', 'small', 'large', 'tiny', 'huge', 'bold', 'italic', 'underline'].includes(part)
    );
    
    if (meaningfulParts.length > 0) {
      suggestion = meaningfulParts.join('-');
    } else {
      suggestion = 'component-name';  // 默认建议
    }
  }

  return suggestion;
}

/**
 * 验证BEM类名的完整性
 * 检查BEM类名是否符合最佳实践
 * @param className BEM类名
 * @returns 验证结果和建议
 */
export function validateBemClass(className: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查是否包含多个__
  if ((className.match(/__/g) || []).length > 1) {
    issues.push('BEM Element不应嵌套（不应包含多个__）');
    suggestions.push('考虑扁平化Element结构');
  }

  // 检查是否包含多个--
  if ((className.match(/--/g) || []).length > 1) {
    issues.push('BEM Modifier不应嵌套（不应包含多个--）');
    suggestions.push('考虑使用单个Modifier或组合类');
  }

  // 检查Block名称长度
  const block = extractBemBlock(className);
  if (block && block.split('-').length > 3) {
    issues.push('Block名称过长（建议不超过3个单词）');
    suggestions.push('考虑简化Block名称');
  }

  // 检查Element名称长度
  const element = extractBemElement(className);
  if (element && element.split('-').length > 3) {
    issues.push('Element名称过长（建议不超过3个单词）');
    suggestions.push('考虑简化Element名称');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}
