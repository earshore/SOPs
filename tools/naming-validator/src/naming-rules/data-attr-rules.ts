/**
 * data属性命名规则
 * 定义HTML元素data-*属性的命名规范和验证规则
 * 支持行为、状态、配置和标识相关的data属性
 */

import type { NamingRule } from '../types/index.js';

/**
 * Alpine.js原生属性列表
 * 这些属性应保持原生格式，不进行验证
 */
export const ALPINE_ATTRIBUTES = [
  'x-data',
  'x-init',
  'x-show',
  'x-bind',
  'x-on',
  'x-text',
  'x-html',
  'x-model',
  'x-modelable',
  'x-for',
  'x-transition',
  'x-effect',
  'x-ignore',
  'x-ref',
  'x-cloak',
  'x-teleport',
  'x-if',
  'x-id',
] as const;

/**
 * data属性类型前缀
 */
export const DATA_ATTR_PREFIXES = {
  action: 'data-action',
  state: 'data-state',
  config: 'data-config',
  id: 'data-id',
} as const;

/**
 * data属性命名规则集合
 * 
 * 规则说明：
 * 1. 行为属性：data-action-{action}，用于定义元素的行为
 * 2. 状态属性：data-state-{state}，用于存储元素状态
 * 3. 配置属性：data-config-{config}，用于存储配置信息
 * 4. 标识属性：data-id 或 data-{entity}-id，用于存储实体ID
 * 5. 所有属性值使用kebab-case或snake_case
 * 6. Alpine.js原生属性保持不变
 */
export const DATA_ATTR_RULES: NamingRule[] = [
  {
    name: 'data-action',
    pattern: /^data-action-[a-z]+(-[a-z]+)*$/,
    description: '行为属性：data-action-{action}，用于定义元素的行为或动作',
    examples: {
      valid: [
        'data-action-submit',
        'data-action-toggle-menu',
        'data-action-close-modal',
        'data-action-load-more',
        'data-action-delete-item',
      ],
      invalid: [
        'data-action',
        'data-actionSubmit',
        'data-action-Submit',
        'data-action-',
        'action-submit',
      ],
    },
    category: 'data-attr',
  },
  {
    name: 'data-state',
    pattern: /^data-state-[a-z]+(-[a-z]+)*$/,
    description: '状态属性：data-state-{state}，用于存储元素的状态信息',
    examples: {
      valid: [
        'data-state-active',
        'data-state-loading',
        'data-state-expanded',
        'data-state-selected',
        'data-state-error',
      ],
      invalid: [
        'data-state',
        'data-stateActive',
        'data-state-Active',
        'data-state-',
        'state-active',
      ],
    },
    category: 'data-attr',
  },
  {
    name: 'data-config',
    pattern: /^data-config-[a-z]+(-[a-z]+)*$/,
    description: '配置属性：data-config-{config}，用于存储配置参数',
    examples: {
      valid: [
        'data-config-theme',
        'data-config-max-items',
        'data-config-auto-save',
        'data-config-timeout',
        'data-config-api-endpoint',
      ],
      invalid: [
        'data-config',
        'data-configTheme',
        'data-config-Theme',
        'data-config-',
        'config-theme',
      ],
    },
    category: 'data-attr',
  },
  {
    name: 'data-id',
    pattern: /^data-([a-z]+(-[a-z]+)*-)?id$/,
    description: '标识属性：data-id 或 data-{entity}-id，用于存储实体标识符',
    examples: {
      valid: [
        'data-id',
        'data-user-id',
        'data-sop-id',
        'data-task-id',
        'data-category-id',
        'data-product-item-id',
      ],
      invalid: [
        'data-ID',
        'dataId',
        'data-userId',
        'data-user-ID',
        'user-id',
      ],
    },
    category: 'data-attr',
  },
  {
    name: 'data-generic',
    pattern: /^data-[a-z]+(-[a-z]+)*$/,
    description: '通用data属性：data-{name}，用于其他自定义数据',
    examples: {
      valid: [
        'data-value',
        'data-index',
        'data-target',
        'data-url',
        'data-tooltip',
        'data-role',
      ],
      invalid: [
        'data-',
        'dataValue',
        'data-Value',
        'data_value',
        'value',
      ],
    },
    category: 'data-attr',
  },
];

/**
 * 获取所有data属性规则
 * @returns data属性规则数组
 */
export function getDataAttrRules(): NamingRule[] {
  return DATA_ATTR_RULES;
}

/**
 * 检查属性是否为Alpine.js原生属性
 * @param attrName 属性名称
 * @returns 是否为Alpine.js原生属性
 */
export function isAlpineAttribute(attrName: string): boolean {
  // 检查完整匹配
  if (ALPINE_ATTRIBUTES.includes(attrName as any)) {
    return true;
  }
  
  // 检查带修饰符的属性（如 x-on:click, x-bind:class）
  const baseAttr = attrName.split(':')[0].split('.')[0];
  return ALPINE_ATTRIBUTES.includes(baseAttr as any);
}

/**
 * 检查属性是否为行为属性
 * @param attrName 属性名称
 * @returns 是否为行为属性
 */
export function isActionAttribute(attrName: string): boolean {
  return /^data-action-[a-z]+(-[a-z]+)*$/.test(attrName);
}

/**
 * 检查属性是否为状态属性
 * @param attrName 属性名称
 * @returns 是否为状态属性
 */
export function isStateAttribute(attrName: string): boolean {
  return /^data-state-[a-z]+(-[a-z]+)*$/.test(attrName);
}

/**
 * 检查属性是否为配置属性
 * @param attrName 属性名称
 * @returns 是否为配置属性
 */
export function isConfigAttribute(attrName: string): boolean {
  return /^data-config-[a-z]+(-[a-z]+)*$/.test(attrName);
}

/**
 * 检查属性是否为标识属性
 * @param attrName 属性名称
 * @returns 是否为标识属性
 */
export function isIdAttribute(attrName: string): boolean {
  return /^data-([a-z]+(-[a-z]+)*-)?id$/.test(attrName);
}

/**
 * 从data属性中提取类型前缀
 * @param attrName 属性名称
 * @returns 类型前缀或null
 */
export function extractDataAttrType(attrName: string): string | null {
  if (isActionAttribute(attrName)) return 'action';
  if (isStateAttribute(attrName)) return 'state';
  if (isConfigAttribute(attrName)) return 'config';
  if (isIdAttribute(attrName)) return 'id';
  return null;
}

/**
 * 从data属性中提取名称部分
 * @param attrName 属性名称
 * @returns 名称部分或null
 */
export function extractDataAttrName(attrName: string): string | null {
  // data-action-{name}
  const actionMatch = attrName.match(/^data-action-(.+)$/);
  if (actionMatch) return actionMatch[1];
  
  // data-state-{name}
  const stateMatch = attrName.match(/^data-state-(.+)$/);
  if (stateMatch) return stateMatch[1];
  
  // data-config-{name}
  const configMatch = attrName.match(/^data-config-(.+)$/);
  if (configMatch) return configMatch[1];
  
  // data-{entity}-id
  const idMatch = attrName.match(/^data-(.+)-id$/);
  if (idMatch) return idMatch[1];
  
  // data-id
  if (attrName === 'data-id') return 'id';
  
  // data-{name}
  const genericMatch = attrName.match(/^data-(.+)$/);
  if (genericMatch) return genericMatch[1];
  
  return null;
}

/**
 * 为data属性生成智能建议
 * @param value 当前属性名称
 * @returns 建议的属性名称
 */
export function generateDataAttrSuggestion(value: string): string {
  // 如果是Alpine.js属性，保持不变
  if (isAlpineAttribute(value)) {
    return value;
  }

  // 基础转换：转为小写并替换非法字符
  let suggestion = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/_{1,}/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-]+|[-]+$/g, '');

  // 如果不以data-开头，添加data-前缀
  if (!suggestion.startsWith('data-')) {
    suggestion = `data-${suggestion}`;
  }

  // 如果包含驼峰命名，转换为kebab-case
  suggestion = suggestion.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  // 尝试识别属性类型并添加适当的前缀
  const name = suggestion.replace(/^data-/, '');
  
  // 检查是否应该是action属性
  const actionKeywords = ['submit', 'click', 'toggle', 'open', 'close', 'load', 'save', 'delete', 'update', 'create'];
  if (actionKeywords.some(keyword => name.includes(keyword))) {
    if (!suggestion.startsWith('data-action-')) {
      suggestion = `data-action-${name}`;
    }
  }
  
  // 检查是否应该是state属性
  const stateKeywords = ['active', 'loading', 'expanded', 'collapsed', 'selected', 'disabled', 'visible', 'hidden'];
  if (stateKeywords.some(keyword => name.includes(keyword))) {
    if (!suggestion.startsWith('data-state-')) {
      suggestion = `data-state-${name}`;
    }
  }
  
  // 检查是否应该是config属性
  const configKeywords = ['theme', 'max', 'min', 'timeout', 'interval', 'url', 'endpoint', 'api'];
  if (configKeywords.some(keyword => name.includes(keyword))) {
    if (!suggestion.startsWith('data-config-')) {
      suggestion = `data-config-${name}`;
    }
  }
  
  // 检查是否应该是id属性
  if (name.endsWith('id') || name === 'id') {
    if (!suggestion.match(/^data-([a-z]+(-[a-z]+)*-)?id$/)) {
      if (name === 'id') {
        suggestion = 'data-id';
      } else {
        const entityName = name.replace(/-?id$/, '');
        suggestion = entityName ? `data-${entityName}-id` : 'data-id';
      }
    }
  }

  return suggestion;
}

/**
 * 验证data属性值的格式
 * 检查属性值是否使用kebab-case或snake_case
 * @param value 属性值
 * @returns 验证结果
 */
export function validateDataAttrValue(value: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查是否包含大写字母
  if (/[A-Z]/.test(value)) {
    issues.push('属性值不应包含大写字母');
    suggestions.push('使用kebab-case或snake_case格式');
  }

  // 检查是否包含空格
  if (/\s/.test(value)) {
    issues.push('属性值不应包含空格');
    suggestions.push('使用连字符(-)或下划线(_)分隔单词');
  }

  // 检查是否包含特殊字符（除了-和_）
  if (/[^a-z0-9-_]/.test(value)) {
    issues.push('属性值包含非法字符');
    suggestions.push('只使用小写字母、数字、连字符和下划线');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * 检查data属性命名是否符合最佳实践
 * @param attrName 属性名称
 * @returns 验证结果和建议
 */
export function validateDataAttrBestPractices(attrName: string): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // 检查是否为Alpine.js属性（应该跳过验证）
  if (isAlpineAttribute(attrName)) {
    return { isValid: true, issues: [], suggestions: [] };
  }

  // 检查是否以data-开头
  if (!attrName.startsWith('data-')) {
    issues.push('自定义数据属性必须以data-开头');
    suggestions.push(`使用 data-${attrName}`);
  }

  // 检查属性名称长度
  if (attrName.split('-').length > 5) {
    issues.push('属性名称过长（建议不超过5个部分）');
    suggestions.push('考虑简化属性名称');
  }

  // 检查是否使用了明确的类型前缀
  const type = extractDataAttrType(attrName);
  if (!type && attrName.startsWith('data-')) {
    const name = attrName.replace(/^data-/, '');
    if (name.length > 0) {
      suggestions.push('考虑使用明确的类型前缀（action/state/config/id）');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}
