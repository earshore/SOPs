/**
 * Simple Event Bus for module communication
 */
class EventBus {
    constructor() {
        /** @type {Object.<string, Function[]>} */
        this.events = {};
        
        /** 监听器管理配置 */
        this._config = {
            maxListenersPerEvent: 50, // 每个事件最大监听器数量
            warningThreshold: 30,      // 警告阈值
            enableLeakDetection: true, // 启用内存泄漏检测
        };
        
        /** 监听器统计 */
        this._stats = {
            totalListeners: 0,
            eventCounts: {},
        };
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function(any): void} callback - Callback function
     * @returns {function(): void} unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
            this._stats.eventCounts[event] = 0;
        }
        
        // 检查监听器数量
        const currentCount = this.events[event].length;
        
        if (currentCount >= this._config.maxListenersPerEvent) {
            console.error(
                `[EventBus] 事件 "${event}" 的监听器数量已达上限 (${this._config.maxListenersPerEvent})，` +
                `可能存在内存泄漏！请检查是否正确移除了监听器。`
            );
            return () => {}; // 返回空函数，防止添加更多监听器
        }
        
        if (currentCount >= this._config.warningThreshold) {
            console.warn(
                `[EventBus] 警告：事件 "${event}" 的监听器数量过多 (${currentCount})，` +
                `可能存在内存泄漏风险。建议检查监听器是否正确移除。`
            );
        }
        
        this.events[event].push(callback);
        this._stats.totalListeners++;
        this._stats.eventCounts[event]++;

        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function(any): void} callback - Callback function
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        const initialLength = this.events[event].length;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
        const removedCount = initialLength - this.events[event].length;
        
        if (removedCount > 0) {
            this._stats.totalListeners -= removedCount;
            this._stats.eventCounts[event] -= removedCount;
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} [data] - Data to pass to listeners
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in listener for event "${event}":`, error);
            }
        });
    }
    
    /**
     * 移除事件的所有监听器
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (!this.events[event]) return;
        
        const count = this.events[event].length;
        this._stats.totalListeners -= count;
        delete this.events[event];
        delete this._stats.eventCounts[event];
        
        console.log(`[EventBus] 已移除事件 "${event}" 的所有监听器 (${count} 个)`);
    }
    
    /**
     * 获取监听器统计信息
     * @returns {{totalListeners: number, eventCounts: Object, events: Array}}
     */
    getStats() {
        const events = Object.keys(this.events).map(event => ({
            name: event,
            listenerCount: this.events[event].length,
            isWarning: this.events[event].length >= this._config.warningThreshold,
            isError: this.events[event].length >= this._config.maxListenersPerEvent,
        }));
        
        return {
            totalListeners: this._stats.totalListeners,
            eventCounts: { ...this._stats.eventCounts },
            events,
        };
    }
    
    /**
     * 检测潜在的内存泄漏
     * @returns {Array<{event: string, count: number, severity: string}>}
     */
    detectLeaks() {
        if (!this._config.enableLeakDetection) {
            return [];
        }
        
        const leaks = [];
        
        for (const [event, listeners] of Object.entries(this.events)) {
            const count = listeners.length;
            
            if (count >= this._config.maxListenersPerEvent) {
                leaks.push({
                    event,
                    count,
                    severity: 'critical',
                    message: `事件 "${event}" 的监听器数量已达上限 (${count})`,
                });
            } else if (count >= this._config.warningThreshold) {
                leaks.push({
                    event,
                    count,
                    severity: 'warning',
                    message: `事件 "${event}" 的监听器数量过多 (${count})`,
                });
            }
        }
        
        return leaks;
    }
    
    /**
     * 打印调试信息
     */
    debug() {
        const stats = this.getStats();
        const leaks = this.detectLeaks();
        
        console.group('[EventBus] 调试信息');
        console.log('总监听器数量:', stats.totalListeners);
        console.log('事件数量:', Object.keys(this.events).length);
        console.table(stats.events);
        
        if (leaks.length > 0) {
            console.warn('检测到潜在的内存泄漏:');
            console.table(leaks);
        } else {
            console.log('✅ 未检测到内存泄漏');
        }
        
        console.groupEnd();
    }
    
    /**
     * 配置EventBus
     * @param {Object} config - 配置选项
     * @param {number} [config.maxListenersPerEvent] - 每个事件最大监听器数量
     * @param {number} [config.warningThreshold] - 警告阈值
     * @param {boolean} [config.enableLeakDetection] - 启用内存泄漏检测
     */
    configure(config) {
        this._config = { ...this._config, ...config };
        console.log('[EventBus] 配置已更新:', this._config);
    }
}

const eventBus = new EventBus();
export default eventBus;
