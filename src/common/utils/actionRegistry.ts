// src/common/utils/actionRegistry.ts
// ================================================================
// 🎯 集中式动作注册中心 (TypeScript版本)
// 替代 window.xxx 全局函数挂载模式
// ================================================================

import { StorageService } from '../../services/storageService';
import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';

/**
 * 动作处理函数类型
 */
export type ActionHandler = (params: Record<string, unknown>, event: Event) => unknown;

/**
 * 动作映射类型
 */
export type ActionMap = Record<string, ActionHandler>;

/**
 * 动作注册表类型
 */
interface ActionRegistryMap {
  [actionName: string]: ActionHandler;
}

/**
 * 命名规范配置
 */
interface NamingConventions {
  global: string[];
  prefixes: Record<string, string>;
}

/**
 * 动作注册表
 */
const ActionRegistry: ActionRegistryMap = {};

/**
 * 动作命名规范
 */
const NAMING_CONVENTIONS: NamingConventions = {
  // 全局动作（无前缀）- UI 核心功能和系统级操作
  global: [
    // 核心导航
    'switch-tab', // 通过 ActionRegistry 事件委托，内部调用 navigateTo
    'renderMegaMenu',
    // 通用 UI
    'showToast',
    'close',
    'clear-sidebar-search',
    // 设置相关
    'openSettings',
    'closeSettings',
    'saveProviderConfig',
    'loadProviderConfig',
    'fetchModels',
    'toggleApiKeyVisibility',
    'testConnection',
    'saveProxyConfig',
    'openPerformanceMonitor',
    'showPerformanceReport',
    'switchTheme',
    'getAllThemes',
    'getCurrentTheme',
    'showLogs',
    'showErrors',
    'clearLogs',
    'downloadLogs',
    // 全局 UI 交互
    'toggle-sop-group',
    'clear-sop-search',
    'clear-hub-search',
    'scroll-to-sop-module',
    'scroll-to-hub-module',
    'scroll-to-more-module',

    // NPI Tracker 模块专用动作
    'updateField',
    'updateDeliveryFee',
    'toggleDecision',
    'openNextStepEditor',
    'saveNextSteps',
    'closeNextStepModal',
    'exportToExcel',
    'copyNpiReviewTemplate',
    'copyListingReviewTemplate',
    'filterByStore',
    'filterByStage',

    // Restricted Words 模块专用动作
    'showWordDetail',
    'closeWordDetail',

    // Analysis 模块专用动作
    'toggleAllModules',
    'selectAllAsins',
    'copyPromptText',
    'translateReport',
    'copyReportMarkdown',
    'exportReport',
    'toggleCardResize',
  ],
  // 模块前缀映射
  prefixes: {
    kt_: 'keyword_tracker',
    mp_: 'master_analysis',
    sops_: 'sops_module',
    amz_: 'amz_hub',
    amzf_: 'amz_hub_features',
    more_: 'more_module',
  },
};

/**
 * 验证动作命名是否符合规范
 */
function _validateActionName(actionName: string): boolean {
  // 全局动作豁免
  if (NAMING_CONVENTIONS.global.includes(actionName)) {
    return true;
  }

  // 检查是否有模块前缀
  const hasPrefix = Object.keys(NAMING_CONVENTIONS.prefixes).some((prefix) =>
    actionName.startsWith(prefix)
  );

  if (!hasPrefix && !actionName.startsWith('_')) {
    console.warn(
      `⚠️ [ActionRegistry] 动作 "${actionName}" 未使用模块前缀。\n` +
        `   推荐格式: <prefix>_<action>，例如: kt_syncToInput\n` +
        `   可用前缀: ${Object.keys(NAMING_CONVENTIONS.prefixes).join(', ')}`
    );
  }

  return true;
}

/**
 * 注册动作处理函数
 */
export function registerAction(actionName: string, handler: ActionHandler): void {
  _validateActionName(actionName);

  if (ActionRegistry[actionName]) {
    console.warn(`[ActionRegistry] 动作 "${actionName}" 已存在，将被覆盖`);
  }
  ActionRegistry[actionName] = handler;
}

/**
 * 批量注册动作
 */
export function registerActions(actions: Record<string, ActionHandler>): void {
  Object.entries(actions).forEach(([name, handler]) => {
    registerAction(name, handler);
  });
}

/**
 * 注销单个动作
 */
export function unregisterAction(actionName: string): void {
  if (ActionRegistry[actionName]) {
    delete ActionRegistry[actionName];

    // 同时从 window 对象移除
    const windowWithAction = window as unknown as Record<string, unknown>;
    if (windowWithAction[actionName]) {
      delete windowWithAction[actionName];
    }
  }
}

/**
 * 批量注销动作
 */
export function unregisterActions(actionNames: string[]): void {
  actionNames.forEach((name) => unregisterAction(name));
}

/**
 * 执行动作
 */
export function executeAction(actionName: string, params: Record<string, unknown>, event: Event): unknown {
  const handler = ActionRegistry[actionName];
  if (!handler) {
    console.warn(`[ActionRegistry] 未注册的动作: "${actionName}"`);
    return;
  }
  return handler(params, event);
}

/**
 * 获取已注册的所有动作名称 (调试用)
 */
export function getRegisteredActions(): string[] {
  return Object.keys(ActionRegistry);
}

// ================================================================
// 🛡️ 全局事件委托监听器
// ================================================================

/**
 * 初始化全局事件委托
 */
export function initGlobalEventDelegation(): void {
  document.addEventListener('click', (event) => {
    // 从点击目标向上查找带有 data-action 的元素
    const target = event.target as HTMLElement;
    const actionElement = target.closest('[data-action]') as HTMLElement;
    if (!actionElement) return;

    const actionName = actionElement.dataset.action;
    if (!actionName) return;

    // 收集所有 data-* 属性作为参数
    const params = { ...actionElement.dataset };
    delete params.action; // 移除 action 本身

    // 执行动作
    executeAction(actionName, params, event);
  });

}

// ================================================================
// 🔄 向后兼容层：暴露到 window (带弃用警告)
// ================================================================

/** 记录已警告的函数名，避免重复警告 */
const warnedFunctions = new Set<string>();

const LEGACY_WARNINGS_KEY = 'enable_legacy_warnings';

/**
 * 开发模式下是否启用警告
 */
const ENABLE_DEPRECATION_WARNINGS = (): boolean => {
  try {
    const value = StorageService.get<string>(LEGACY_WARNINGS_KEY, 'false');
    return value === 'true';
  } catch {
    return false;
  }
};

/**
 * 将注册的动作同时挂载到 window 对象
 */
export function registerActionWithLegacy(actionName: string, handler: ActionHandler): void {
  registerAction(actionName, handler);

  // 存储当前 handler 用于 getter/setter
  let currentHandler = handler;

  // 使用 Object.defineProperty 实现带警告的 getter
  Object.defineProperty(window, actionName, {
    get() {
      // 弃用警告 (每个函数只警告一次)
      if (ENABLE_DEPRECATION_WARNINGS() && !warnedFunctions.has(actionName)) {
        warnedFunctions.add(actionName);
        console.warn(
          `⚠️ [Deprecated] window.${actionName}() 即将弃用。\n` +
            `   请迁移到: <button data-action="${actionName}">...\n` +
            `   (此警告已手动开启，关闭: StorageService.remove('enable_legacy_warnings'))`
        );
      }
      return currentHandler;
    },
    set(_newHandler: ActionHandler) {
      // 允许覆盖以兼容旧代码，但静默忽略
    },
    configurable: true,
    enumerable: false,
  });
}

/**
 * 批量注册并挂载到 window (带弃用警告)
 */
export function registerActionsWithLegacy(actions: Record<string, ActionHandler>): string[] {
  const actionNames = Object.keys(actions);

  Object.entries(actions).forEach(([name, handler]) => {
    registerActionWithLegacy(name, handler);
  });

  return actionNames;
}

/**
 * 获取遗留调用统计 (调试用)
 */
export function getLegacyCallStats(): string[] {
  return Array.from(warnedFunctions);
}

// ================================================================
// 🔧 监听事件总线,实现解耦
// ================================================================

// 监听注册事件
eventBus.on(APP_EVENTS.REGISTER_ACTIONS, (payload: unknown) => {
  const { actions } = payload as { moduleId: string; actions: ActionMap };
  registerActionsWithLegacy(actions);
});

// 监听清理事件
eventBus.on('unregisterActions', (payload: unknown) => {
  const { actionNames } = payload as { moduleId: string; actionNames: string[] };
  unregisterActions(actionNames);
});

export default ActionRegistry;
