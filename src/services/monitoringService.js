// src/services/monitoringService.js
// ================================================================
// 🎯 阶段1: 错误监控服务
// 集成Sentry或其他错误追踪服务
// ================================================================

import { EnvConfig } from '../common/config/envConfig.js';
import { Logger } from './loggerService.js';

/**
 * 错误监控配置
 * @typedef {Object} MonitoringConfig
 * @property {string} dsn - Sentry DSN
 * @property {string} environment - 环境名称
 * @property {string} release - 版本号
 * @property {number} tracesSampleRate - 性能追踪采样率
 * @property {Function} beforeSend - 发送前处理函数
 */

/**
 * 错误监控服务
 */
export class MonitoringService {
    constructor() {
        this.isInitialized = false;
        this.Sentry = null;
        this.config = null;
    }

    /**
     * 初始化监控服务
     * @param {MonitoringConfig} config - 配置对象
     */
    async init(config = {}) {
        if (this.isInitialized) {
            Logger.warn('监控服务已初始化', {}, 'Monitoring');
            return;
        }

        // 仅在生产环境启用
        if (!EnvConfig.isProduction && !config.forceEnable) {
            Logger.info('开发环境，跳过监控服务初始化', {}, 'Monitoring');
            return;
        }

        this.config = {
            dsn: config.dsn || '',
            environment: config.environment || EnvConfig.environment,
            release: config.release || '1.0.0',
            tracesSampleRate: config.tracesSampleRate || 0.1,
            beforeSend: config.beforeSend || this._defaultBeforeSend.bind(this),
        };

        // 检查DSN
        if (!this.config.dsn) {
            Logger.warn('未配置Sentry DSN，监控服务未启用', {}, 'Monitoring');
            return;
        }

        try {
            // 动态导入Sentry（避免增加初始包大小）
            const Sentry = await this._loadSentry();
            this.Sentry = Sentry;

            // 初始化Sentry
            Sentry.init({
                dsn: this.config.dsn,
                environment: this.config.environment,
                release: this.config.release,
                tracesSampleRate: this.config.tracesSampleRate,
                beforeSend: this.config.beforeSend,
                
                // 集成配置
                integrations: [
                    new Sentry.BrowserTracing({
                        tracingOrigins: ['localhost', /^\//],
                    }),
                ],

                // 忽略特定错误
                ignoreErrors: [
                    // 浏览器扩展错误
                    'top.GLOBALS',
                    'chrome-extension://',
                    'moz-extension://',
                    // 网络错误
                    'NetworkError',
                    'Failed to fetch',
                    // 取消的请求
                    'AbortError',
                ],
            });

            this.isInitialized = true;
            Logger.info('监控服务初始化成功', { dsn: this.config.dsn }, 'Monitoring');
        } catch (error) {
            Logger.error('监控服务初始化失败', error, 'Monitoring');
        }
    }

    /**
     * 加载Sentry SDK
     * @private
     */
    async _loadSentry() {
        // 这里使用CDN加载，避免打包到主bundle
        // 生产环境建议使用npm包并配置代码分割
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://browser.sentry-cdn.com/7.x/bundle.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                if (window.Sentry) {
                    resolve(window.Sentry);
                } else {
                    reject(new Error('Sentry SDK加载失败'));
                }
            };
            script.onerror = () => reject(new Error('Sentry SDK加载失败'));
            document.head.appendChild(script);
        });
    }

    /**
     * 默认的beforeSend处理函数
     * @private
     */
    _defaultBeforeSend(event, hint) {
        // 过滤敏感信息
        if (event.request) {
            // 移除Cookie
            delete event.request.cookies;
            
            // 移除Authorization头
            if (event.request.headers) {
                delete event.request.headers['Authorization'];
                delete event.request.headers['authorization'];
            }
        }

        // 过滤localStorage中的敏感数据
        if (event.contexts && event.contexts.state) {
            const state = event.contexts.state;
            if (state.llm) {
                delete state.llm.apiKey;
            }
        }

        // 添加自定义上下文
        event.contexts = event.contexts || {};
        event.contexts.app = {
            version: this.config.release,
            environment: this.config.environment,
            userAgent: navigator.userAgent,
        };

        return event;
    }

    /**
     * 捕获异常
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息
     */
    captureException(error, context = {}) {
        if (!this.isInitialized || !this.Sentry) {
            Logger.error('捕获异常（监控服务未启用）', error, context.module || 'App');
            return;
        }

        this.Sentry.captureException(error, {
            tags: context.tags || {},
            extra: context.extra || {},
            level: context.level || 'error',
        });

        Logger.error('捕获异常', error, context.module || 'App');
    }

    /**
     * 捕获消息
     * @param {string} message - 消息内容
     * @param {string} level - 日志级别
     * @param {Object} context - 上下文信息
     */
    captureMessage(message, level = 'info', context = {}) {
        if (!this.isInitialized || !this.Sentry) {
            Logger.info(`捕获消息（监控服务未启用）: ${message}`, context, 'Monitoring');
            return;
        }

        this.Sentry.captureMessage(message, {
            level,
            tags: context.tags || {},
            extra: context.extra || {},
        });

        Logger.info(message, context, 'Monitoring');
    }

    /**
     * 设置用户信息
     * @param {Object} user - 用户信息
     */
    setUser(user) {
        if (!this.isInitialized || !this.Sentry) {
            return;
        }

        // 过滤敏感信息
        const safeUser = {
            id: user.id,
            username: user.username,
            // 不包含email等敏感信息
        };

        this.Sentry.setUser(safeUser);
        Logger.info('设置用户信息', safeUser, 'Monitoring');
    }

    /**
     * 设置标签
     * @param {string} key - 标签键
     * @param {string} value - 标签值
     */
    setTag(key, value) {
        if (!this.isInitialized || !this.Sentry) {
            return;
        }

        this.Sentry.setTag(key, value);
    }

    /**
     * 设置上下文
     * @param {string} name - 上下文名称
     * @param {Object} context - 上下文数据
     */
    setContext(name, context) {
        if (!this.isInitialized || !this.Sentry) {
            return;
        }

        this.Sentry.setContext(name, context);
    }

    /**
     * 添加面包屑
     * @param {Object} breadcrumb - 面包屑数据
     */
    addBreadcrumb(breadcrumb) {
        if (!this.isInitialized || !this.Sentry) {
            return;
        }

        this.Sentry.addBreadcrumb(breadcrumb);
    }

    /**
     * 开始性能追踪
     * @param {string} name - 追踪名称
     * @returns {Object} 追踪对象
     */
    startTransaction(name) {
        if (!this.isInitialized || !this.Sentry) {
            return null;
        }

        return this.Sentry.startTransaction({ name });
    }
}

// 创建单例
export const monitoringService = new MonitoringService();

// 默认导出
export default monitoringService;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.MonitoringService = monitoringService;
}
