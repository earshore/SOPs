// src/common/utils/actionRegistry.js
// ================================================================
// 🎯 P1 重构: 集中式动作注册中心
// 替代 window.xxx 全局函数挂载模式
// ================================================================

/**
 * 动作注册表
 * 所有可通过 data-action 调用的函数都注册在此
 */
const ActionRegistry = {};

/**
 * 🎯 P1 优化：动作命名规范
 * 推荐使用模块前缀避免命名冲突
 * 例如：kt_xxx (keyword_tracker), mp_xxx (master_prompt)
 */
const NAMING_CONVENTIONS = {
    // 全局动作（无前缀）- UI 核心功能和系统级操作
    global: [
        // 核心导航
        'switchTab', 'renderMegaMenu',
        // 通用 UI
        'showToast', 'close',
        // 设置相关
        'openSettings', 'closeSettings', 'saveProviderConfig', 'loadProviderConfig', 
        'fetchModels', 'toggleApiKeyVisibility', 'testConnection', 'saveProxyConfig',
        // 全局 UI 交互
        'switch-tab', 'toggle-sop-group', 'clear-sop-search', 'clear-hub-search',
        'open-user-guide', 'close-user-guide', 'switch-guide-tab',
        'scroll-to-sop-module', 'scroll-to-hub-module', 'scroll-to-more-module'
    ],
    // 模块前缀映射
    prefixes: {
        'kt_': 'keyword_tracker',
        'mp_': 'master_prompt',
        'sops_': 'sops_module',
        'amz_': 'amz_hub',
        'amzf_': 'amz_hub_features',
        'more_': 'more_module'
    }
};

/**
 * 验证动作命名是否符合规范
 * @param {string} actionName - 动作名称
 * @returns {boolean} 是否符合规范
 * @private
 */
function _validateActionName(actionName) {
    // 全局动作豁免
    if (NAMING_CONVENTIONS.global.includes(actionName)) {
        return true;
    }
    
    // 检查是否有模块前缀
    const hasPrefix = Object.keys(NAMING_CONVENTIONS.prefixes).some(prefix => 
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
 * @param {string} actionName - 动作名称 (对应 data-action 属性值)
 * @param {Function} handler - 处理函数
 */
export function registerAction(actionName, handler) {
    // 🎯 P1 优化：验证命名规范
    _validateActionName(actionName);
    
    if (ActionRegistry[actionName]) {
        console.warn(`[ActionRegistry] 动作 "${actionName}" 已存在，将被覆盖`);
    }
    ActionRegistry[actionName] = handler;
}

/**
 * 批量注册动作
 * @param {Object} actions - { actionName: handler } 映射对象
 */
export function registerActions(actions) {
    Object.entries(actions).forEach(([name, handler]) => {
        registerAction(name, handler);
    });
}

/**
 * 注销单个动作
 * @param {string} actionName - 动作名称
 */
export function unregisterAction(actionName) {
    if (ActionRegistry[actionName]) {
        delete ActionRegistry[actionName];
        
        // 同时从 window 对象移除
        if (window[actionName]) {
            delete window[actionName];
        }
    }
}

/**
 * 批量注销动作
 * @param {string[]} actionNames - 动作名称数组
 */
export function unregisterActions(actionNames) {
    actionNames.forEach(name => unregisterAction(name));
}

/**
 * 执行动作
 * @param {string} actionName - 动作名称
 * @param {Object} params - 参数对象 (来自 data-* 属性)
 * @param {Event} event - 原始事件对象
 * @returns {*} 处理函数返回值
 */
export function executeAction(actionName, params, event) {
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
export function getRegisteredActions() {
    return Object.keys(ActionRegistry);
}

// ================================================================
// 🛡️ 全局事件委托监听器
// ================================================================

/**
 * 初始化全局事件委托
 * 监听点击事件，自动匹配 data-action 并调用对应处理函数
 */
export function initGlobalEventDelegation() {
    document.addEventListener("click", (event) => {
        // 从点击目标向上查找带有 data-action 的元素
        const actionElement = event.target.closest("[data-action]");
        if (!actionElement) return;

        const actionName = actionElement.dataset.action;
        if (!actionName) return;

        // 收集所有 data-* 属性作为参数
        const params = { ...actionElement.dataset };
        delete params.action; // 移除 action 本身

        // 执行动作
        executeAction(actionName, params, event);
    });

    console.log("✅ [ActionRegistry] 全局事件委托已初始化");
}

// ================================================================
// 🔄 向后兼容层：暴露到 window (带弃用警告)
// ================================================================

/** 记录已警告的函数名，避免重复警告 */
const warnedFunctions = new Set();

import { StorageService } from '../../services/storageService.js';

const LEGACY_WARNINGS_KEY = 'enable_legacy_warnings';

/** 
 * 开发模式下是否启用警告 (默认关闭，减少控制台噪音)
 * 开启方式: StorageService.set('enable_legacy_warnings', 'true')
 */
const ENABLE_DEPRECATION_WARNINGS = () => {
    try {
        return StorageService.get(LEGACY_WARNINGS_KEY, 'false') === 'true';
    } catch {
        return false;
    }
};

/**
 * 将注册的动作同时挂载到 window 对象
 * 用于过渡期兼容现有 onclick="xxx()" 调用
 * 🆕 添加弃用警告，引导迁移到 data-action 模式
 * 
 * @param {string} actionName - 动作名称
 * @param {Function} handler - 处理函数
 */
export function registerActionWithLegacy(actionName, handler) {
    registerAction(actionName, handler);

    // 存储当前 handler 用于 getter/setter
    let currentHandler = handler;

    // 使用 Object.defineProperty 实现带警告的 getter
    // 同时添加 setter 以兼容现有代码的 window.xxx = xxx 赋值
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
        set(newHandler) {
            // 允许覆盖以兼容旧代码，但静默忽略（保持注册中心的 handler 不变）
            // 如果需要真正更新，可以取消下面的注释
            // currentHandler = newHandler;
            // ActionRegistry[actionName] = newHandler;
        },
        configurable: true, // 允许后续重新定义
        enumerable: false   // 不出现在 Object.keys(window) 中
    });
}

/**
 * 批量注册并挂载到 window (带弃用警告)
 * @param {Object} actions - { actionName: handler } 映射对象
 * @returns {string[]} 返回注册的动作名称数组（用于后续清理）
 */
export function registerActionsWithLegacy(actions) {
    const actionNames = Object.keys(actions);
    
    Object.entries(actions).forEach(([name, handler]) => {
        registerActionWithLegacy(name, handler);
    });

    console.log(`✅ [ActionRegistry] 已注册 ${actionNames.length} 个动作 (含向后兼容)`);
    
    return actionNames;
}

/**
 * 获取遗留调用统计 (调试用)
 * @returns {string[]} 被遗留调用的函数名列表
 */
export function getLegacyCallStats() {
    return Array.from(warnedFunctions);
}

export default ActionRegistry;
