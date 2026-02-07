// src/services/performanceService.js
// ================================================================
// 🎯 阶段1: 性能监控服务
// 监控页面加载、Core Web Vitals、用户交互性能
// ================================================================

import { StorageService } from './storageService.js';
import { EnvConfig } from '../common/config/envConfig.js';
import { Logger } from './loggerService.js';

/**
 * 性能指标类型
 */
export const METRIC_TYPES = {
    // 页面加载指标
    PAGE_LOAD: 'page_load',
    DNS: 'dns',
    TCP: 'tcp',
    TTFB: 'ttfb',
    DOWNLOAD: 'download',
    DOM_PARSE: 'dom_parse',
    
    // Core Web Vitals
    LCP: 'lcp',  // Largest Contentful Paint
    FID: 'fid',  // First Input Delay
    CLS: 'cls',  // Cumulative Layout Shift
    FCP: 'fcp',  // First Contentful Paint
    
    // 自定义指标
    MODULE_LOAD: 'module_load',
    API_CALL: 'api_call',
    USER_ACTION: 'user_action',
};

/**
 * 性能监控服务
 */
export class PerformanceService {
    constructor() {
        this.metrics = [];
        this.observers = [];
        this.isInitialized = false;
    }

    /**
     * 初始化性能监控
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('[Performance] 初始化性能监控...');
        
        // 监控页面加载
        this.measurePageLoad();
        
        // 监控 Core Web Vitals
        this.measureLCP();
        this.measureFID();
        this.measureCLS();
        this.measureFCP();
        
        // 监控长任务
        this.measureLongTasks();
        
        this.isInitialized = true;
        console.log('[Performance] 性能监控已启动');
    }

    /**
     * 测量页面加载性能
     */
    measurePageLoad() {
        if (document.readyState === 'complete') {
            this._collectPageLoadMetrics();
        } else {
            window.addEventListener('load', () => {
                // 延迟收集，确保所有资源加载完成
                setTimeout(() => this._collectPageLoadMetrics(), 0);
            });
        }
    }

    /**
     * 收集页面加载指标
     * @private
     */
    _collectPageLoadMetrics() {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) {
            console.warn('[Performance] Navigation timing not available');
            return;
        }

        const metrics = {
            [METRIC_TYPES.DNS]: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
            [METRIC_TYPES.TCP]: Math.round(perfData.connectEnd - perfData.connectStart),
            [METRIC_TYPES.TTFB]: Math.round(perfData.responseStart - perfData.requestStart),
            [METRIC_TYPES.DOWNLOAD]: Math.round(perfData.responseEnd - perfData.responseStart),
            [METRIC_TYPES.DOM_PARSE]: Math.round(perfData.domContentLoadedEventEnd - perfData.responseEnd),
            [METRIC_TYPES.PAGE_LOAD]: Math.round(perfData.loadEventEnd - perfData.fetchStart),
        };

        console.log('[Performance] 页面加载指标:', metrics);
        
        // 记录指标
        Object.entries(metrics).forEach(([type, value]) => {
            this.recordMetric(type, value, { url: window.location.pathname });
        });

        // 发送到分析服务
        this._sendMetrics(metrics);
    }

    /**
     * 测量 LCP (Largest Contentful Paint)
     * 最大内容绘制时间 - 目标 < 2.5s
     */
    measureLCP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                const value = Math.round(lastEntry.renderTime || lastEntry.loadTime);
                
                console.log('[Performance] LCP:', value, 'ms');
                this.recordMetric(METRIC_TYPES.LCP, value, {
                    element: lastEntry.element?.tagName,
                    url: lastEntry.url
                });
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('[Performance] LCP measurement failed:', e);
        }
    }

    /**
     * 测量 FID (First Input Delay)
     * 首次输入延迟 - 目标 < 100ms
     */
    measureFID() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    const value = Math.round(entry.processingStart - entry.startTime);
                    
                    console.log('[Performance] FID:', value, 'ms');
                    this.recordMetric(METRIC_TYPES.FID, value, {
                        eventType: entry.name
                    });
                });
            });

            observer.observe({ entryTypes: ['first-input'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('[Performance] FID measurement failed:', e);
        }
    }

    /**
     * 测量 CLS (Cumulative Layout Shift)
     * 累积布局偏移 - 目标 < 0.1
     */
    measureCLS() {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        let clsEntries = [];

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    // 只统计非用户输入导致的布局偏移
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        clsEntries.push(entry);
                    }
                });

                console.log('[Performance] CLS:', clsValue.toFixed(3));
                this.recordMetric(METRIC_TYPES.CLS, parseFloat(clsValue.toFixed(3)), {
                    entries: clsEntries.length
                });
            });

            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('[Performance] CLS measurement failed:', e);
        }
    }

    /**
     * 测量 FCP (First Contentful Paint)
     * 首次内容绘制 - 目标 < 1.8s
     */
    measureFCP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name === 'first-contentful-paint') {
                        const value = Math.round(entry.startTime);
                        
                        console.log('[Performance] FCP:', value, 'ms');
                        this.recordMetric(METRIC_TYPES.FCP, value);
                    }
                });
            });

            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        } catch (e) {
            console.warn('[Performance] FCP measurement failed:', e);
        }
    }

    /**
     * 测量长任务 (> 50ms)
     */
    measureLongTasks() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    const duration = Math.round(entry.duration);
                    
                    if (duration > 50) {
                        console.warn('[Performance] 长任务检测:', duration, 'ms');
                        this.recordMetric('long_task', duration, {
                            name: entry.name,
                            startTime: Math.round(entry.startTime)
                        });
                    }
                });
            });

            observer.observe({ entryTypes: ['longtask'] });
            this.observers.push(observer);
        } catch (e) {
            // longtask 可能不被支持
            Logger.debug('Long task measurement not supported', {}, 'Performance');
        }
    }

    /**
     * 测量模块加载时间
     * @param {string} moduleName - 模块名称
     * @param {Function} loader - 加载函数
     * @returns {Promise<any>}
     */
    async measureModuleLoad(moduleName, loader) {
        const startTime = performance.now();
        
        try {
            const result = await loader();
            const duration = Math.round(performance.now() - startTime);
            
            console.log(`[Performance] 模块加载 ${moduleName}:`, duration, 'ms');
            this.recordMetric(METRIC_TYPES.MODULE_LOAD, duration, {
                module: moduleName
            });
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            console.error(`[Performance] 模块加载失败 ${moduleName}:`, duration, 'ms', error);
            
            this.recordMetric(METRIC_TYPES.MODULE_LOAD, duration, {
                module: moduleName,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * 测量 API 调用时间
     * @param {string} apiName - API 名称
     * @param {Function} apiCall - API 调用函数
     * @returns {Promise<any>}
     */
    async measureApiCall(apiName, apiCall) {
        const startTime = performance.now();
        
        try {
            const result = await apiCall();
            const duration = Math.round(performance.now() - startTime);
            
            console.log(`[Performance] API调用 ${apiName}:`, duration, 'ms');
            this.recordMetric(METRIC_TYPES.API_CALL, duration, {
                api: apiName,
                success: true
            });
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            console.error(`[Performance] API调用失败 ${apiName}:`, duration, 'ms', error);
            
            this.recordMetric(METRIC_TYPES.API_CALL, duration, {
                api: apiName,
                success: false,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * 测量用户操作时间
     * @param {string} actionName - 操作名称
     * @param {Function} action - 操作函数
     * @returns {Promise<any>}
     */
    async measureUserAction(actionName, action) {
        const startTime = performance.now();
        
        try {
            const result = await action();
            const duration = Math.round(performance.now() - startTime);
            
            console.log(`[Performance] 用户操作 ${actionName}:`, duration, 'ms');
            this.recordMetric(METRIC_TYPES.USER_ACTION, duration, {
                action: actionName
            });
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            
            this.recordMetric(METRIC_TYPES.USER_ACTION, duration, {
                action: actionName,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * 记录性能指标
     * @param {string} type - 指标类型
     * @param {number} value - 指标值
     * @param {Object} context - 上下文信息
     */
    recordMetric(type, value, context = {}) {
        const metric = {
            type,
            value,
            context,
            timestamp: Date.now(),
            url: window.location.pathname
        };

        this.metrics.push(metric);

        // 限制内存中保存的指标数量
        if (this.metrics.length > 100) {
            this.metrics = this.metrics.slice(-50);
        }

        // 保存到本地存储（用于离线分析）
        this._saveMetricsToStorage();
    }

    /**
     * 获取性能报告
     * @returns {Object}
     */
    getReport() {
        const report = {
            summary: this._calculateSummary(),
            metrics: this.metrics,
            timestamp: Date.now()
        };

        return report;
    }

    /**
     * 计算性能摘要
     * @private
     */
    _calculateSummary() {
        const summary = {};

        // 按类型分组
        const grouped = {};
        this.metrics.forEach(metric => {
            if (!grouped[metric.type]) {
                grouped[metric.type] = [];
            }
            grouped[metric.type].push(metric.value);
        });

        // 计算统计值
        Object.entries(grouped).forEach(([type, values]) => {
            summary[type] = {
                count: values.length,
                avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
                min: Math.min(...values),
                max: Math.max(...values),
                p50: this._percentile(values, 50),
                p95: this._percentile(values, 95),
                p99: this._percentile(values, 99)
            };
        });

        return summary;
    }

    /**
     * 计算百分位数
     * @private
     */
    _percentile(values, p) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }

    /**
     * 保存指标到本地存储
     * @private
     */
    _saveMetricsToStorage() {
        try {
            // 只保存最近的指标
            const recentMetrics = this.metrics.slice(-50);
            StorageService.set('performance_metrics', recentMetrics);
        } catch (e) {
            console.warn('[Performance] 保存指标失败:', e);
        }
    }

    /**
     * 发送指标到分析服务
     * @private
     */
    _sendMetrics(metrics) {
        // 仅在生产环境发送
        if (!EnvConfig.isProduction) {
            Logger.debug('开发环境，跳过指标上报', {}, 'Performance');
            return;
        }

        // 📊 性能指标上报
        // 未来功能: 集成分析服务 (Google Analytics, Sentry, 自建服务等)
        // 当前: 仅在开发环境输出到控制台
        console.log('[Performance] 指标上报:', metrics);
        
        // 预留接口: 可通过配置启用远程上报
        // if (EnvConfig.monitoring.performanceEndpoint) {
        //     await this._sendToRemote(metrics);
        // }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.metrics = [];
        this.isInitialized = false;
    }
}

// 创建单例
export const performanceService = new PerformanceService();

// 默认导出
export default performanceService;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.PerformanceService = performanceService;
}
