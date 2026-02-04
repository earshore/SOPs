// src/common/constants/eventConstants.js
// ================================================================
// 🎯 统一事件命名常量
// 集中管理所有应用级事件名称，避免硬编码字符串
// ================================================================

/**
 * 应用级事件常量
 * 命名规范: APP_[模块]_[动作]
 */
export const APP_EVENTS = {
    // 路由事件
    ROUTE_CHANGED: 'app:route-changed',
    ROUTE_BEFORE_CHANGE: 'app:route-before-change',
    ROUTE_ERROR: 'app:route-error',
    
    // 应用生命周期
    INITIALIZED: 'app:initialized',
    READY: 'app:ready',
    
    // 模块生命周期
    MODULE_MOUNTED: 'app:module-mounted',
    MODULE_UNMOUNTED: 'app:module-unmounted',
    MODULE_UNLOAD: 'app:module-unload', // 主模块卸载请求（在切换前触发）
    MODULE_ERROR: 'app:module-error',
    
    // 状态变化
    STATE_UPDATED: 'app:state-updated',
    STATE_RESET: 'app:state-reset',
    
    // 用户交互
    USER_ACTION: 'app:user-action',
    
    // 错误处理
    ERROR_OCCURRED: 'app:error-occurred',
    ERROR_RECOVERED: 'app:error-recovered',
    
    // 数据操作
    DATA_LOADED: 'app:data-loaded',
    DATA_SAVED: 'app:data-saved',
    DATA_DELETED: 'app:data-deleted',
    
    // LLM 相关
    LLM_REQUEST_START: 'app:llm-request-start',
    LLM_REQUEST_SUCCESS: 'app:llm-request-success',
    LLM_REQUEST_ERROR: 'app:llm-request-error',
    
    // 搜索相关
    SEARCH_START: 'app:search-start',
    SEARCH_COMPLETE: 'app:search-complete',
    SEARCH_CLEAR: 'app:search-clear'
};

/**
 * 模块特定事件常量
 */
export const MODULE_EVENTS = {
    // SOPs 模块
    SOPS: {
        SEARCH_UPDATED: 'sops:search-updated',
        CATEGORY_CHANGED: 'sops:category-changed'
    },
    
    // Scraper 模块
    SCRAPER: {
        SCRAPE_START: 'scraper:scrape-start',
        SCRAPE_SUCCESS: 'scraper:scrape-success',
        SCRAPE_ERROR: 'scraper:scrape-error'
    },
    
    // Analysis 模块
    ANALYSIS: {
        ANALYZE_START: 'analysis:analyze-start',
        ANALYZE_SUCCESS: 'analysis:analyze-success',
        ANALYZE_ERROR: 'analysis:analyze-error'
    }
};

/**
 * 事件数据类型定义 (JSDoc)
 */

/**
 * @typedef {Object} RouteChangedEvent
 * @property {string} routeId - 路由ID
 * @property {Object} config - 路由配置
 * @property {Object} from - 来源路由
 */

/**
 * @typedef {Object} ModuleMountedEvent
 * @property {string} moduleId - 模块ID
 * @property {HTMLElement} container - 容器元素
 * @property {number} timestamp - 挂载时间戳
 */

/**
 * @typedef {Object} ErrorOccurredEvent
 * @property {Error} error - 错误对象
 * @property {string} source - 错误来源
 * @property {Object} context - 错误上下文
 */

/**
 * 触发应用事件的辅助函数
 * @param {string} eventName - 事件名称
 * @param {Object} detail - 事件详情
 */
export function emitAppEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { 
        detail: {
            ...detail,
            timestamp: Date.now()
        }
    }));
}

/**
 * 监听应用事件的辅助函数
 * @param {string} eventName - 事件名称
 * @param {Function} handler - 事件处理函数
 * @returns {Function} 取消监听函数
 */
export function onAppEvent(eventName, handler) {
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
}

// 默认导出
export default APP_EVENTS;
