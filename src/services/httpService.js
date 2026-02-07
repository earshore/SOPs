// src/services/httpService.js
// ================================================================
// 🎯 P1-5: 统一 HTTP 请求服务
// 替代分散的 fetch 调用
// 🔄 P1优化: 增强超时控制和并发管理
// ================================================================

import { Logger } from './loggerService.js';

/**
 * HTTP 请求配置
 * @typedef {Object} HttpOptions
 * @property {string} [method='GET'] - 请求方法
 * @property {Object} [headers] - 请求头
 * @property {Object|string} [body] - 请求体
 * @property {number} [timeout=30000] - 超时时间 (毫秒)
 * @property {number} [retries=0] - 重试次数
 * @property {number} [retryDelay=1000] - 重试间隔 (毫秒)
 * @property {boolean} [json=true] - 是否自动解析 JSON
 * @property {AbortSignal} [signal] - 外部取消信号
 */

/**
 * HTTP 错误类
 */
export class HttpError extends Error {
    constructor(status, message, response = null) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.response = response;
    }
}

/**
 * 并发控制池
 * 限制同时进行的请求数量
 */
class RequestPool {
    constructor(maxConcurrent = 6) {
        this.max = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    async add(fn) {
        if (this.running >= this.max) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.running++;
        try {
            return await fn();
        } finally {
            this.running--;
            if (this.queue.length > 0) {
                this.queue.shift()();
            }
        }
    }
}

import { priorityRequestPool, REQUEST_PRIORITY } from './PriorityRequestPool.js';

// 全局请求池（向后兼容）
const globalRequestPool = new RequestPool(6);

/**
 * 统一 HTTP 请求服务
 */
export const HttpService = {
    /**
     * 默认配置
     */
    defaults: {
        timeout: 30000,
        retries: 0,
        retryDelay: 1000,
        headers: {
            'Content-Type': 'application/json',
        },
    },

    /**
     * 发送 HTTP 请求
     * 
     * @param {string} url - 请求 URL
     * @param {HttpOptions} [options={}] - 请求配置
     * @returns {Promise<*>} 响应数据
     * @throws {HttpError} HTTP 错误
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            timeout = this.defaults.timeout,
            retries = this.defaults.retries,
            retryDelay = this.defaults.retryDelay,
            json = true,
            signal = null,
            usePool = false, // 🔄 P1优化: 是否使用并发控制
            priority = REQUEST_PRIORITY.NORMAL, // 🎯 P1优化: 请求优先级
            measurePerformance = true, // 🎯 阶段1: 是否测量性能
        } = options;

        // 合并请求头
        const finalHeaders = { ...this.defaults.headers, ...headers };

        // 执行请求的函数
        const executeRequest = async () => {
            let lastError = null;
            
            for (let attempt = 0; attempt <= retries; attempt++) {
                // 创建独立的 AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                // 如果提供了外部signal,监听其abort事件
                if (signal) {
                    signal.addEventListener('abort', () => controller.abort(), { once: true });
                }

                try {
                    // 构建请求配置
                    const fetchOptions = {
                        method,
                        headers: finalHeaders,
                        signal: controller.signal,
                    };

                    // 处理请求体
                    if (body) {
                        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                    }

                    const response = await fetch(url, fetchOptions);
                    clearTimeout(timeoutId);

                    // 检查响应状态
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new HttpError(response.status, errorText, response);
                    }

                    // 解析响应
                    if (json) {
                        return await response.json();
                    }
                    return await response.text();

                } catch (error) {
                    clearTimeout(timeoutId);
                    lastError = error;

                    // 如果是最后一次尝试，抛出错误
                    if (attempt === retries) {
                        throw error;
                    }

                    // 等待后重试
                    await this._delay(retryDelay * (attempt + 1));
                    console.log(`[HttpService] Retry ${attempt + 1}/${retries}: ${url}`);
                }
            }

            throw lastError;
        };

        // 🎯 阶段1: 性能监控 - 测量API调用时间
        if (measurePerformance) {
            try {
                const { performanceService } = await import('./performanceService.js');
                const apiName = this._extractApiName(url);
                
                if (usePool) {
                    // 🎯 P1优化: 使用优先级请求池
                    return await performanceService.measureApiCall(apiName, () => 
                        priorityRequestPool.add(executeRequest, priority, { url, method })
                    );
                }
                
                return await performanceService.measureApiCall(apiName, executeRequest);
            } catch (e) {
                // 如果性能服务不可用，直接执行请求
                Logger.debug('性能监控不可用，直接执行请求', {}, 'HttpService');
            }
        }

        // 🔄 P1优化: 使用优先级请求池
        if (usePool) {
            return await priorityRequestPool.add(executeRequest, priority, { url, method });
        }
        
        return await executeRequest();
    },

    /**
     * 从URL提取API名称（用于性能监控）
     * @param {string} url - 请求URL
     * @returns {string}
     * @private
     */
    _extractApiName(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            // 提取最后两段路径作为API名称
            const segments = path.split('/').filter(s => s);
            return segments.slice(-2).join('/') || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    },

    /**
     * GET 请求快捷方法
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    },

    /**
     * POST 请求快捷方法
     */
    async post(url, body, options = {}) {
        return this.request(url, { ...options, method: 'POST', body });
    },

    /**
     * 加载 HTML 模板
     * 
     * @param {string} url - 模板 URL
     * @returns {Promise<string>} HTML 字符串
     */
    async loadTemplate(url) {
        return this.request(url, { json: false });
    },

    /**
     * 带授权的 API 请求
     * 
     * @param {string} url - API URL
     * @param {string} token - Bearer Token
     * @param {HttpOptions} [options={}] - 其他配置
     */
    async apiRequest(url, token, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };
        return this.request(url, { ...options, headers });
    },

    /**
     * 延迟函数
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 创建带基础 URL 的客户端
     * 
     * @param {string} baseUrl - 基础 URL
     * @param {Object} [defaultHeaders={}] - 默认请求头
     * @returns {Object} 客户端对象
     * 
     * @example
     * const llmClient = HttpService.createClient('https://api.openai.com/v1', {
     *   'Authorization': 'Bearer sk-xxx'
     * });
     * const models = await llmClient.get('/models');
     */
    createClient(baseUrl, defaultHeaders = {}) {
        const client = {
            get: (path, options = {}) =>
                this.request(`${baseUrl}${path}`, {
                    ...options,
                    method: 'GET',
                    headers: { ...defaultHeaders, ...options.headers }
                }),
            post: (path, body, options = {}) =>
                this.request(`${baseUrl}${path}`, {
                    ...options,
                    method: 'POST',
                    body,
                    headers: { ...defaultHeaders, ...options.headers }
                }),
        };
        return client;
    },
};

// 默认导出
export default HttpService;

// 导出优先级常量
export { REQUEST_PRIORITY } from './PriorityRequestPool.js';

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.HttpService = HttpService;
    window.HttpError = HttpError;
    window.REQUEST_PRIORITY = REQUEST_PRIORITY;
}
