// src/services/errorService.js
// ================================================================
// 🎯 P1-3: 统一错误处理服务
// 替代分散的 catch 块处理逻辑
// ================================================================

import { showToast } from '../common/utils/ui.js';

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
    NETWORK: 'NETWORK',
    TIMEOUT: 'TIMEOUT',
    AUTH: 'AUTH',
    VALIDATION: 'VALIDATION',
    PARSE: 'PARSE',
    STORAGE: 'STORAGE',
    UNKNOWN: 'UNKNOWN',
};

/**
 * 用户友好的错误消息映射
 */
const USER_MESSAGES = {
    [ERROR_TYPES.NETWORK]: '网络连接失败，请检查网络后重试',
    [ERROR_TYPES.TIMEOUT]: '请求超时，请稍后重试',
    [ERROR_TYPES.AUTH]: 'API 认证失败，请检查密钥配置',
    [ERROR_TYPES.VALIDATION]: '输入数据有误，请检查后重试',
    [ERROR_TYPES.PARSE]: '数据解析失败',
    [ERROR_TYPES.STORAGE]: '数据存储失败',
    [ERROR_TYPES.UNKNOWN]: '操作失败，请重试',
};

/**
 * 错误处理配置
 * @typedef {Object} ErrorContext
 * @property {string} [module] - 模块名称 (用于日志)
 * @property {string} [action] - 操作名称 (用于日志)
 * @property {boolean} [notify=true] - 是否显示 toast 通知
 * @property {boolean} [rethrow=false] - 是否重新抛出错误
 * @property {string} [customMessage] - 自定义用户消息
 */

/**
 * 统一错误处理服务
 */
export const ErrorService = {
    /**
     * 分析错误类型
     * @param {Error} error - 错误对象
     * @returns {string} 错误类型
     */
    classify(error) {
        if (!error) return ERROR_TYPES.UNKNOWN;

        const message = error.message?.toLowerCase() || '';
        const name = error.name || '';

        // 超时错误
        if (name === 'AbortError' || message.includes('timeout') || message.includes('超时')) {
            return ERROR_TYPES.TIMEOUT;
        }

        // 网络错误
        if (name === 'TypeError' && message.includes('fetch')) {
            return ERROR_TYPES.NETWORK;
        }
        if (message.includes('network') || message.includes('网络')) {
            return ERROR_TYPES.NETWORK;
        }

        // 认证错误
        if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('认证')) {
            return ERROR_TYPES.AUTH;
        }

        // 解析错误
        if (name === 'SyntaxError' || message.includes('json') || message.includes('parse')) {
            return ERROR_TYPES.PARSE;
        }

        // 存储错误
        if (name === 'QuotaExceededError' || message.includes('storage') || message.includes('存储')) {
            return ERROR_TYPES.STORAGE;
        }

        return ERROR_TYPES.UNKNOWN;
    },

    /**
     * 获取用户友好消息
     * @param {Error} error - 错误对象
     * @param {string} [customMessage] - 自定义消息
     * @returns {string}
     */
    getUserMessage(error, customMessage = null) {
        if (customMessage) return customMessage;

        const type = this.classify(error);
        return USER_MESSAGES[type] || USER_MESSAGES[ERROR_TYPES.UNKNOWN];
    },

    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {ErrorContext} [context={}] - 上下文配置
     */
    handle(error, context = {}) {
        const {
            module = 'App',
            action = 'operation',
            notify = true,
            rethrow = false,
            customMessage = null,
        } = context;

        // 确保 error 是一个对象
        if (!error) {
            error = new Error('Unknown error occurred');
        }

        // 如果 error 不是 Error 实例,尝试转换
        if (!(error instanceof Error)) {
            const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
            error = new Error(errorMsg);
        }

        const errorType = this.classify(error);
        const userMessage = this.getUserMessage(error, customMessage);

        // 1. 记录日志 - 使用Logger服务
        this._logError(error, { module, action, errorType });

        // 2. 用户通知
        if (notify && typeof showToast === 'function') {
            showToast(userMessage, 'error');
        }

        // 3. 错误上报 - 发送到监控服务
        this._reportError(error, { module, action, errorType });

        // 4. 是否重新抛出
        if (rethrow) {
            throw error;
        }
    },

    /**
     * 记录错误日志
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文
     * @private
     */
    async _logError(error, context) {
        try {
            const { Logger } = await import('./loggerService.ts');
            Logger.error(
                `${context.action} failed`,
                error,
                context.module
            );
        } catch (e) {
            // 如果Logger服务不可用，回退到console
            console.error(`[${context.module}] ${context.action} failed:`, {
                type: context.errorType,
                message: error.message,
                stack: error.stack,
            });
        }
    },

    /**
     * 上报错误到监控服务
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文
     * @private
     */
    async _reportError(error, context) {
        try {
            const { monitoringService } = await import('./monitoringService.js');
            monitoringService.captureException(error, {
                module: context.module,
                tags: {
                    action: context.action,
                    errorType: context.errorType,
                },
            });
        } catch (e) {
            // 监控服务不可用，静默失败
            Logger.debug('监控服务不可用', {}, 'ErrorService');
        }
    },

    /**
     * 创建带上下文的错误处理器
     * 用于简化模块内的错误处理
     * 
     * @param {string} module - 模块名称
     * @returns {Function} 绑定模块上下文的处理函数
     * 
     * @example
     * const handleError = ErrorService.createHandler('Analysis');
     * try { ... } catch (e) { handleError(e, { action: 'generateReport' }); }
     */
    createHandler(module) {
        return (error, context = {}) => {
            this.handle(error, { ...context, module });
        };
    },

    /**
     * 包装异步函数，自动处理错误
     * 
     * @param {Function} fn - 异步函数
     * @param {ErrorContext} context - 错误上下文
     * @returns {Function} 包装后的函数
     * 
     * @example
     * const safeAnalyze = ErrorService.wrap(analyze, { module: 'Analysis' });
     * await safeAnalyze(data); // 错误自动处理
     */
    wrap(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
                return null;
            }
        };
    },

    /**
     * 安静地执行函数，忽略错误
     * 用于非关键操作
     * 
     * @param {Function} fn - 函数
     * @param {*} defaultValue - 出错时的默认返回值
     * @returns {*}
     */
    silent(fn, defaultValue = null) {
        try {
            return fn();
        } catch (e) {
            Logger.debug('Silent error', { message: e.message }, 'ErrorService');
            return defaultValue;
        }
    },
};

// 默认导出
export default ErrorService;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.ErrorService = ErrorService;
    window.ERROR_TYPES = ERROR_TYPES;
}
