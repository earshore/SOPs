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
// 🔄 向后兼容层：暴露到 window (过渡期使用)
// ================================================================

/**
 * 将注册的动作同时挂载到 window 对象
 * 用于过渡期兼容现有 onclick="xxx()" 调用
 * @param {string} actionName - 动作名称
 * @param {Function} handler - 处理函数
 */
export function registerActionWithLegacy(actionName, handler) {
    registerAction(actionName, handler);
    // 向后兼容：同时挂载到 window
    window[actionName] = handler;
}

/**
 * 批量注册并挂载到 window
 */
export function registerActionsWithLegacy(actions) {
    Object.entries(actions).forEach(([name, handler]) => {
        registerActionWithLegacy(name, handler);
    });
}

export default ActionRegistry;
