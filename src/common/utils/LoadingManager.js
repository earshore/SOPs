// src/common/utils/LoadingManager.js
// ================================================================
// 🎯 统一加载状态管理器
// 解决多个模块同时显示 loading、状态不一致的问题
// ================================================================

import { APP_EVENTS, emitAppEvent } from '../constants/eventConstants.js';

/**
 * 加载任务配置
 * @typedef {Object} LoadingTask
 * @property {string} id - 任务唯一标识
 * @property {string} [message] - 加载提示信息
 * @property {number} [priority] - 优先级（数字越大优先级越高）
 * @property {number} startTime - 开始时间戳
 */

/**
 * 统一加载状态管理器
 * 管理全局加载状态，避免多个 loading 同时显示
 */
export class LoadingManager {
    constructor() {
        /** @type {Map<string, LoadingTask>} */
        this.tasks = new Map();
        this.globalLoadingElement = null;
        this.defaultMessage = '加载中...';
    }

    /**
     * 开始一个加载任务
     * @param {string} taskId - 任务ID
     * @param {Object} options - 配置选项
     * @param {string} [options.message] - 加载提示信息
     * @param {number} [options.priority=0] - 优先级
     */
    start(taskId, options = {}) {
        const task = {
            id: taskId,
            message: options.message || this.defaultMessage,
            priority: options.priority || 0,
            startTime: Date.now()
        };

        this.tasks.set(taskId, task);
        this._updateUI();

        // 触发事件
        emitAppEvent(APP_EVENTS.LOADING_START, { taskId, task });

        console.log(`⏳ [LoadingManager] 开始任务: ${taskId} (${task.message})`);
    }

    /**
     * 结束一个加载任务
     * @param {string} taskId - 任务ID
     */
    stop(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            console.warn(`⚠️ [LoadingManager] 任务不存在: ${taskId}`);
            return;
        }

        const duration = Date.now() - task.startTime;
        this.tasks.delete(taskId);
        this._updateUI();

        // 触发事件
        emitAppEvent(APP_EVENTS.LOADING_STOP, { taskId, duration });

        console.log(`✅ [LoadingManager] 完成任务: ${taskId} (耗时 ${duration}ms)`);
    }

    /**
     * 检查是否有加载任务
     * @returns {boolean}
     */
    get isLoading() {
        return this.tasks.size > 0;
    }

    /**
     * 获取当前加载任务数量
     * @returns {number}
     */
    get taskCount() {
        return this.tasks.size;
    }

    /**
     * 获取当前显示的加载信息
     * @returns {string}
     */
    get currentMessage() {
        if (this.tasks.size === 0) return '';

        // 返回优先级最高的任务消息
        const tasks = Array.from(this.tasks.values());
        tasks.sort((a, b) => b.priority - a.priority);
        return tasks[0].message;
    }

    /**
     * 获取所有任务列表
     * @returns {Array<LoadingTask>}
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * 清空所有任务
     */
    clearAll() {
        const taskIds = Array.from(this.tasks.keys());
        this.tasks.clear();
        this._updateUI();

        console.log(`🧹 [LoadingManager] 清空所有任务 (${taskIds.length} 个)`);
    }

    /**
     * 设置全局 Loading 元素
     * @param {HTMLElement} element - Loading 元素
     */
    setGlobalLoadingElement(element) {
        this.globalLoadingElement = element;
    }

    /**
     * 更新 UI 显示
     * @private
     */
    _updateUI() {
        if (!this.globalLoadingElement) return;

        if (this.isLoading) {
            this.globalLoadingElement.classList.remove('hidden');
            this.globalLoadingElement.classList.add('flex');
            
            // 更新消息
            const messageEl = this.globalLoadingElement.querySelector('[data-loading-message]');
            if (messageEl) {
                messageEl.textContent = this.currentMessage;
            }
        } else {
            this.globalLoadingElement.classList.add('hidden');
            this.globalLoadingElement.classList.remove('flex');
        }
    }

    /**
     * 包装异步函数，自动管理加载状态
     * @param {string} taskId - 任务ID
     * @param {Function} asyncFn - 异步函数
     * @param {Object} options - 配置选项
     * @returns {Promise<*>}
     * 
     * @example
     * const result = await loadingManager.wrap('fetch-data', async () => {
     *   return await fetchData();
     * }, { message: '正在获取数据...' });
     */
    async wrap(taskId, asyncFn, options = {}) {
        this.start(taskId, options);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.stop(taskId);
        }
    }

    /**
     * 创建带作用域的加载管理器
     * @param {string} scope - 作用域名称
     * @returns {Object} 作用域加载管理器
     * 
     * @example
     * const scraperLoading = loadingManager.createScope('scraper');
     * scraperLoading.start('fetch'); // 实际任务ID: scraper:fetch
     * scraperLoading.stop('fetch');
     */
    createScope(scope) {
        return {
            start: (taskId, options) => this.start(`${scope}:${taskId}`, options),
            stop: (taskId) => this.stop(`${scope}:${taskId}`),
            wrap: (taskId, asyncFn, options) => this.wrap(`${scope}:${taskId}`, asyncFn, options)
        };
    }
}

// 创建全局实例
export const loadingManager = new LoadingManager();

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
    window.loadingManager = loadingManager;
}

export default loadingManager;
