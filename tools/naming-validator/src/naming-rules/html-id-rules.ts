/**
 * HTML ID命名规则
 * 定义HTML元素ID的命名规范和验证规则
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
 * 容器后缀
 */
export const CONTAINER_SUFFIXES = ['container', 'wrapper', 'box'] as const;

/**
 * 内容区域后缀
 */
export const CONTENT_SUFFIXES = ['content', 'body', 'main'] as const;

/**
 * 交互元素后缀
 */
export const INTERACTIVE_SUFFIXES = [
  'button',
  'input',
  'select',
  'checkbox',
  'radio',
  'textarea',
  'form',
  'link',
] as const;

/**
 * HTML ID命名规则集合
 * 
 * 规则说明：
 * 1. 模块级ID：{module}-{component}-{element}，至少3个部分
 * 2. 全局级ID：{component}-{element}，至少2个部分
 * 3. 所有ID必须使用kebab-case（小写字母和连字符）
 * 4. 禁止使用驼峰命名法和下划线
 */
export const HTML_ID_RULES: NamingRule[] = [
  {
    name: 'module-level-id',
    pattern: /^(app|sop|hub)-[a-z]+(-[a-z]+)+$/,
    description: '模块级ID：{module}-{component}-{element}，使用模块前缀(app/sop/hub)',
    examples: {
      valid: [
        'sop-editor-container',
        'app-dashboard-content',
        'hub-analytics-chart',
        'sop-form-submit-button',
        'app-sidebar-toggle-button',
      ],
      invalid: [
        'sopEditor',
        'SOP_EDITOR',
        'sop-editor',
        'editor-container',
        'sop_editor_container',
      ],
    },
    category: 'html-id',
  },
  {
    name: 'global-level-id',
    pattern: /^(?!(app|sop|hub)-)[a-z]+(-[a-z]+)+$/,
    description: '全局级ID：{component}-{element}，不使用模块前缀',
    examples: {
      valid: [
        'modal-overlay',
        'sidebar-toggle',
        'header-logo',
        'footer-copyright',
        'notification-container',
      ],
      invalid: [
        'modalOverlay',
        'Modal_Overlay',
        'modal',
        'MODAL-OVERLAY',
        'app-modal-overlay',
      ],
    },
    category: 'html-id',
  },
  {
    name: 'container-id',
    pattern: /^([a-z]+-)+[a-z]+(container|wrapper|box)$/,
    description: '容器ID：以-container、-wrapper或-box结尾',
    examples: {
      valid: [
        'sop-editor-container',
        'modal-content-wrapper',
        'sidebar-box',
        'app-main-container',
      ],
      invalid: [
        'container',
        'sopContainer',
        'sop-editor-cont',
        'editor_container',
      ],
    },
    category: 'html-id',
  },
  {
    name: 'content-id',
    pattern: /^([a-z]+-)+[a-z]+(content|body|main)$/,
    description: '内容区域ID：以-content、-body或-main结尾',
    examples: {
      valid: [
        'modal-content',
        'sidebar-body',
        'app-main',
        'sop-editor-content',
      ],
      invalid: [
        'content',
        'modalContent',
        'modal-cont',
        'editor_content',
      ],
    },
    category: 'html-id',
  },
  {
    name: 'interactive-id',
    pattern: /^([a-z]+-)+[a-z]+(button|input|select|checkbox|radio|textarea|form|link)$/,
    description: '交互元素ID：以交互元素类型结尾（如-button、-input等）',
    examples: {
      valid: [
        'submit-button',
        'search-input',
        'category-select',
        'agree-checkbox',
        'gender-radio',
        'comment-textarea',
        'login-form',
        'home-link',
      ],
      invalid: [
        'button',
        'submitButton',
        'submit-btn',
        'search_input',
      ],
    },
    category: 'html-id',
  },
  {
    name: 'kebab-case-id',
    pattern: /^[a-z]+(-[a-z]+)*$/,
    description: '基础ID格式：小写字母和连字符（kebab-case），禁止驼峰和下划线',
    examples: {
      valid: [
        'user-profile',
        'navigation-menu',
        'search-bar',
        'footer',
      ],
      invalid: [
        'userProfile',
        'UserProfile',
        'user_profile',
        'USER-PROFILE',
        'user--profile',
      ],
    },
    category: 'html-id',
  },
];

/**
 * 获取所有HTML ID规则
 * @returns HTML ID规则数组
 */
export function getHtmlIdRules(): NamingRule[] {
  return HTML_ID_RULES;
}

/**
 * 检查ID是否为模块级ID
 * @param id 要检查的ID
 * @returns 是否为模块级ID
 */
export function isModuleLevelId(id: string): boolean {
  return /^(app|sop|hub)-/.test(id);
}

/**
 * 检查ID是否为全局级ID
 * @param id 要检查的ID
 * @returns 是否为全局级ID
 */
export function isGlobalLevelId(id: string): boolean {
  return !isModuleLevelId(id) && /^[a-z]+(-[a-z]+)+$/.test(id);
}

/**
 * 从ID中提取模块前缀
 * @param id 要提取的ID
 * @returns 模块前缀或null
 */
export function extractModulePrefix(id: string): string | null {
  const match = id.match(/^(app|sop|hub)-/);
  return match ? match[1] : null;
}

/**
 * 检查ID是否使用了指定的后缀
 * @param id 要检查的ID
 * @param suffixes 后缀数组
 * @returns 是否使用了指定后缀
 */
export function hasSuffix(id: string, suffixes: readonly string[]): boolean {
  return suffixes.some(suffix => id.endsWith(`-${suffix}`));
}

/**
 * 为ID生成智能建议
 * @param value 当前ID值
 * @returns 建议的ID
 */
export function generateIdSuggestion(value: string): string {
  // 基础转换：转为小写并替换非法字符
  let suggestion = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/_{1,}/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-]+|[-]+$/g, '');

  // 如果ID太短（单个单词），建议添加描述性后缀
  if (!suggestion.includes('-')) {
    suggestion = `${suggestion}-element`;
  }

  return suggestion;
}
