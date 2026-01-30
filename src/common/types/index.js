// src/common/types/index.js
// ================================================================
// 🎯 核心类型定义
// 提供 JSDoc 类型标注，增强 IDE 智能提示
// ================================================================

/**
 * @typedef {Object} RouteConfig
 * @property {string} moduleId - 所属模块 ID
 * @property {string} label - 显示标签
 * @property {string} icon - 图标类名
 * @property {string} panelId - 目标面板 ID
 * @property {string} [category] - 分类（可选）
 */

/**
 * @typedef {Object} ModuleConfig
 * @property {string} id - 模块 ID
 * @property {string} contextId - 上下文 ID
 * @property {string} title - 模块标题
 * @property {string} version - 版本号
 * @property {string} icon - 图标类名
 * @property {string} description - 描述
 */

/**
 * @typedef {Object} ContextConfig
 * @property {string} id - 上下文 ID
 * @property {string} name - 上下文名称
 * @property {string} description - 描述
 */

/**
 * @typedef {Object} RouteChangeEvent
 * @property {string} routeId - 路由 ID
 * @property {string} moduleId - 模块 ID
 * @property {Object} config - 完整配置
 * @property {RouteConfig} config.route - 路由配置
 * @property {ModuleConfig} config.module - 模块配置
 * @property {ContextConfig} config.context - 上下文配置
 * @property {number} timestamp - 时间戳
 */

/**
 * @typedef {function(any, any): void} StateSubscriber
 * @param {any} newValue - 新值
 * @param {any} oldValue - 旧值
 */

/**
 * @typedef {Object} LLMConfig
 * @property {string} endpoint - API 端点
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 * @property {Array<string|Object>} models - 可用模型列表
 */

/**
 * @typedef {Object} ProxyConfig
 * @property {string} type - 代理类型
 * @property {string} [customUrl] - 自定义 URL（可选）
 */

/**
 * @typedef {Object} ToastOptions
 * @property {'success'|'error'|'info'|'warning'} [type] - Toast 类型
 * @property {number} [duration] - 显示时长（毫秒）
 */

/**
 * @typedef {Object} ProgressOptions
 * @property {number} [percentage] - 进度百分比 (0-100)
 * @property {boolean} [show] - 是否显示
 */

/**
 * @typedef {Object} HTTPRequestOptions
 * @property {'GET'|'POST'|'PUT'|'DELETE'} [method] - HTTP 方法
 * @property {Object} [headers] - 请求头
 * @property {any} [body] - 请求体
 * @property {number} [timeout] - 超时时间（毫秒）
 * @property {number} [retries] - 重试次数
 */

/**
 * @typedef {Object} LLMRequestOptions
 * @property {number} [temperature] - 温度参数
 * @property {number} [maxTokens] - 最大 token 数
 * @property {boolean} [jsonMode] - JSON 模式
 * @property {number} [timeout] - 超时时间
 * @property {number} [retries] - 重试次数
 * @property {number} [retryDelay] - 重试延迟
 */

/**
 * @typedef {Object} EventLogEntry
 * @property {string} timestamp - 时间戳
 * @property {string} eventName - 事件名称
 * @property {any} detail - 事件详情
 * @property {string} target - 事件目标
 */

// 导出空对象以支持 ES 模块
export default {};
