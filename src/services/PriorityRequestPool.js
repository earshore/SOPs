// src/services/PriorityRequestPool.js
// ================================================================
// 🎯 P1优化: 优先级请求池
// 确保用户操作优先执行，后台任务不阻塞交互
// ================================================================

/**
 * 请求优先级枚举
 */
export const REQUEST_PRIORITY = {
    CRITICAL: 0,  // 关键操作（用户点击、表单提交）
    HIGH: 1,      // 高优先级（数据加载、路由切换）
    NORMAL: 2,    // 普通优先级（默认）
    LOW: 3,       // 低优先级（预加载、缓存更新）
    IDLE: 4       // 空闲时执行（分析、日志上报）
};

/**
 * 优先级请求池
 * 按优先级管理并发请求，确保高优先级任务优先执行
 */
export class PriorityRequestPool {
    constructor(maxConcurrent = 6) {
        this.max = maxConcurrent;
        this.running = 0;
        this.queues = {
            [REQUEST_PRIORITY.CRITICAL]: [],
            [REQUEST_PRIORITY.HIGH]: [],
            [REQUEST_PRIORITY.NORMAL]: [],
            [REQUEST_PRIORITY.LOW]: [],
            [REQUEST_PRIORITY.IDLE]: []
        };
        this.stats = {
            total: 0,
            completed: 0,
            failed: 0,
            byPriority: {}
        };
    }

    /**
     * 添加请求到队列
     * @param {Function} fn - 异步请求函数
     * @param {number} priority - 优先级
     * @param {Object} meta - 元数据（用于调试）
     * @returns {Promise<any>}
     */
    async add(fn, priority = REQUEST_PRIORITY.NORMAL, meta = {}) {
        this.stats.total++;
        
        return new Promise((resolve, reject) => {
            const task = {
                fn,
                resolve,
                reject,
                priority,
                meta,
                createdAt: Date.now()
            };
            
            // 加入对应优先级队列
            this.queues[priority].push(task);
            
            // 尝试执行
            this._tryExecute();
        });
    }

    /**
     * 尝试执行队列中的任务
     * @private
     */
    _tryExecute() {
        if (this.running >= this.max) {
            return;
        }

        // 按优先级顺序查找任务
        const priorities = [
            REQUEST_PRIORITY.CRITICAL,
            REQUEST_PRIORITY.HIGH,
            REQUEST_PRIORITY.NORMAL,
            REQUEST_PRIORITY.LOW,
            REQUEST_PRIORITY.IDLE
        ];
        
        for (const priority of priorities) {
            const queue = this.queues[priority];
            if (queue.length > 0) {
                const task = queue.shift();
                this._execute(task);
                return;
            }
        }
    }

    /**
     * 执行单个任务
     * @param {Object} task - 任务对象
     * @private
     */
    async _execute(task) {
        this.running++;
        const startTime = performance.now();
        
        try {
            const result = await task.fn();
            const duration = Math.round(performance.now() - startTime);
            
            // 记录统计
            this.stats.completed++;
            if (!this.stats.byPriority[task.priority]) {
                this.stats.byPriority[task.priority] = { completed: 0, failed: 0, totalDuration: 0 };
            }
            this.stats.byPriority[task.priority].completed++;
            this.stats.byPriority[task.priority].totalDuration += duration;
            
            // 调试日志
            if (duration > 1000) {
                console.warn(`[RequestPool] 慢请求 (${duration}ms):`, task.meta);
            }
            
            task.resolve(result);
        } catch (error) {
            this.stats.failed++;
            if (!this.stats.byPriority[task.priority]) {
                this.stats.byPriority[task.priority] = { completed: 0, failed: 0, totalDuration: 0 };
            }
            this.stats.byPriority[task.priority].failed++;
            
            console.error('[RequestPool] 请求失败:', task.meta, error);
            task.reject(error);
        } finally {
            this.running--;
            this._tryExecute();
        }
    }

    /**
     * 获取当前状态
     * @returns {Object}
     */
    getStatus() {
        const queueLengths = {};
        Object.entries(this.queues).forEach(([priority, queue]) => {
            queueLengths[priority] = queue.length;
        });

        return {
            running: this.running,
            max: this.max,
            queues: queueLengths,
            stats: this.stats
        };
    }

    /**
     * 获取统计报告
     * @returns {Object}
     */
    getReport() {
        const report = {
            summary: {
                total: this.stats.total,
                completed: this.stats.completed,
                failed: this.stats.failed,
                successRate: this.stats.total > 0 
                    ? Math.round((this.stats.completed / this.stats.total) * 100) 
                    : 0
            },
            byPriority: {}
        };

        Object.entries(this.stats.byPriority).forEach(([priority, stats]) => {
            const total = stats.completed + stats.failed;
            report.byPriority[priority] = {
                ...stats,
                avgDuration: stats.completed > 0 
                    ? Math.round(stats.totalDuration / stats.completed) 
                    : 0,
                successRate: total > 0 
                    ? Math.round((stats.completed / total) * 100) 
                    : 0
            };
        });

        return report;
    }

    /**
     * 清空所有队列（用于测试）
     */
    clear() {
        Object.values(this.queues).forEach(queue => {
            queue.forEach(task => {
                task.reject(new Error('Request pool cleared'));
            });
            queue.length = 0;
        });
        console.log('[RequestPool] 已清空所有队列');
    }

    /**
     * 重置统计数据
     */
    resetStats() {
        this.stats = {
            total: 0,
            completed: 0,
            failed: 0,
            byPriority: {}
        };
        console.log('[RequestPool] 统计数据已重置');
    }
}

// 创建全局实例
export const priorityRequestPool = new PriorityRequestPool(6);

// 默认导出
export default priorityRequestPool;

// ================================================================
// 🔄 向后兼容：暴露到 window
// ================================================================
if (typeof window !== 'undefined') {
    window.PriorityRequestPool = PriorityRequestPool;
    window.REQUEST_PRIORITY = REQUEST_PRIORITY;
    window.priorityRequestPool = priorityRequestPool;
}
