// src/common/utils/actionRegistry.ts
// ================================================================
// 🎯 集中式动作注册中心 (TypeScript版本)
// 替代 window.xxx 全局函数挂载模式
// ================================================================

import { StorageService } from '@/services/storageService';
import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';
import { ACTION_GLOBAL_NAMES, ACTION_PREFIXES, validateRegistryActionName } from './actionNaming';

const nativeLoggerConsole = globalThis.console;

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

const ActionRegistry: ActionRegistryMap = {};
let delegatedClickHandler: ((event: MouseEvent) => void) | null = null;

/**
 * 验证动作命名是否符合规范
 */
function validateActionNameForRegistry(actionName: string): boolean {
  const validation = validateRegistryActionName(actionName);
  if (validation.valid) {
    return true;
  }

  nativeLoggerConsole.warn(
    `[ActionRegistry] Action "${actionName}" does not match the naming convention.\n` +
      `   Expected: known global action or <prefix>_<camelAction>, for example keyword_hunter_syncToInput\n` +
      `   Global actions: ${ACTION_GLOBAL_NAMES.join(', ')}\n` +
      `   Available prefixes: ${Object.keys(ACTION_PREFIXES).join(', ')}`
  );

  return true;
}

/**
 * 注册动作处理函数
 */
export function registerAction(actionName: string, handler: ActionHandler): void {
  validateActionNameForRegistry(actionName);

  if (ActionRegistry[actionName]) {
    nativeLoggerConsole.warn(`[ActionRegistry] 动作 "${actionName}" 已存在，将被覆盖`);
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
  actionNames.forEach(name => unregisterAction(name));
}

/**
 * 执行动作
 */
export function executeAction(
  actionName: string,
  params: Record<string, unknown>,
  event: Event
): unknown {
  const handler = ActionRegistry[actionName];
  if (!handler) {
    nativeLoggerConsole.warn(`[ActionRegistry] 未注册的动作: "${actionName}"`);
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
  if (delegatedClickHandler) {
    return;
  }

  delegatedClickHandler = event => {
    // 从点击目标向上查找带有 data-action 的元素
    if (!(event.target instanceof Element)) return;
    const actionElement = event.target.closest<HTMLElement>('[data-action]');
    if (!actionElement) return;

    const actionName = actionElement.dataset.action;
    if (!actionName) return;

    // 收集所有 data-* 属性作为参数
    const params = { ...actionElement.dataset };
    delete params.action; // 移除 action 本身

    // 执行动作
    executeAction(actionName, params, event);
  };

  document.addEventListener('click', delegatedClickHandler);
}

/**
 * 销毁全局事件委托（测试/热重载清理）
 */
export function destroyGlobalEventDelegation(): void {
  if (!delegatedClickHandler) {
    return;
  }

  document.removeEventListener('click', delegatedClickHandler);
  delegatedClickHandler = null;
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
        nativeLoggerConsole.warn(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isActionMap(value: unknown): value is ActionMap {
  return isRecord(value) && Object.values(value).every(handler => typeof handler === 'function');
}

function isRegisterActionsPayload(payload: unknown): payload is {
  moduleId?: string;
  actions: ActionMap;
} {
  return isRecord(payload) && isActionMap(payload.actions);
}

function isUnregisterActionsPayload(payload: unknown): payload is {
  moduleId?: string;
  actionNames: string[];
} {
  return (
    isRecord(payload) &&
    Array.isArray(payload.actionNames) &&
    payload.actionNames.every(actionName => typeof actionName === 'string')
  );
}

// ================================================================
// 🔧 监听事件总线,实现解耦
// ================================================================

// 监听注册事件
eventBus.on(APP_EVENTS.REGISTER_ACTIONS, (payload: unknown) => {
  if (!isRegisterActionsPayload(payload)) {
    nativeLoggerConsole.warn('[ActionRegistry] 忽略无效 REGISTER_ACTIONS payload');
    return;
  }

  registerActionsWithLegacy(payload.actions);
});

// 监听清理事件
eventBus.on(APP_EVENTS.UNREGISTER_ACTIONS, (payload: unknown) => {
  if (!isUnregisterActionsPayload(payload)) {
    nativeLoggerConsole.warn('[ActionRegistry] 忽略无效 UNREGISTER_ACTIONS payload');
    return;
  }

  unregisterActions(payload.actionNames);
});

export default ActionRegistry;
