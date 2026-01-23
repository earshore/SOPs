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
 * 注册动作处理函数
 * @param {string} actionName - 动作名称 (对应 data-action 属性值)
 * @param {Function} handler - 处理函数
 */
export function registerAction(actionName, handler) {
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

/** 开发模式下是否启用警告 (可通过 localStorage 控制) */
const ENABLE_DEPRECATION_WARNINGS = () => {
    try {
        return localStorage.getItem('disable_legacy_warnings') !== 'true';
    } catch {
        return true;
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
                    `   禁用此警告: localStorage.setItem('disable_legacy_warnings', 'true')`
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
 */
export function registerActionsWithLegacy(actions) {
    Object.entries(actions).forEach(([name, handler]) => {
        registerActionWithLegacy(name, handler);
    });

    console.log(`✅ [ActionRegistry] 已注册 ${Object.keys(actions).length} 个动作 (含向后兼容)`);
}

/**
 * 获取遗留调用统计 (调试用)
 * @returns {string[]} 被遗留调用的函数名列表
 */
export function getLegacyCallStats() {
    return Array.from(warnedFunctions);
}

export default ActionRegistry;
