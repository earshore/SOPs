// src/common/di/Container.js
// ================================================================
// 🎯 P0修复: 依赖注入容器
// 解决循环依赖问题，提供标准化的依赖管理
// ================================================================

/**
 * 依赖注入容器
 * 提供服务注册、解析和生命周期管理
 */
class DIContainer {
    constructor() {
        /** @type {Map<string, Function>} 服务工厂函数 */
        this.factories = new Map();
        
        /** @type {Map<string, any>} 单例实例缓存 */
        this.singletons = new Map();
        
        /** @type {Map<string, 'transient'|'singleton'>} 服务生命周期 */
        this.lifetimes = new Map();
    }

    /**
     * 注册服务
     * @param {string} name - 服务名称
     * @param {Function} factory - 工厂函数 (container) => instance
     * @param {Object} options - 配置选项
     * @param {'transient'|'singleton'} options.lifetime - 生命周期（默认singleton）
     */
    register(name, factory, options = {}) {
        if (typeof factory !== 'function') {
            throw new Error(`[DIContainer] Factory must be a function: ${name}`);
        }

        const lifetime = options.lifetime || 'singleton';
        
        this.factories.set(name, factory);
        this.lifetimes.set(name, lifetime);
        
        console.log(`[DIContainer] 已注册服务: ${name} (${lifetime})`);
    }

    /**
     * 解析服务
     * @param {string} name - 服务名称
     * @returns {any} 服务实例
     * @throws {Error} 服务未注册时抛出错误
     */
    resolve(name) {
        // 1. 检查服务是否已注册
        if (!this.factories.has(name)) {
            throw new Error(`[DIContainer] 服务未注册: ${name}`);
        }

        const lifetime = this.lifetimes.get(name);

        // 2. 单例模式：返回缓存的实例
        if (lifetime === 'singleton') {
            if (this.singletons.has(name)) {
                return this.singletons.get(name);
            }

            // 创建新实例并缓存
            const factory = this.factories.get(name);
            const instance = factory(this);
            this.singletons.set(name, instance);
            
            console.log(`[DIContainer] 创建单例: ${name}`);
            return instance;
        }

        // 3. 瞬态模式：每次创建新实例
        const factory = this.factories.get(name);
        return factory(this);
    }

    /**
     * 检查服务是否已注册
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    has(name) {
        return this.factories.has(name);
    }

    /**
     * 清除单例缓存
     * @param {string} [name] - 服务名称，不传则清除所有
     */
    clearCache(name = null) {
        if (name) {
            this.singletons.delete(name);
            console.log(`[DIContainer] 已清除缓存: ${name}`);
        } else {
            this.singletons.clear();
            console.log(`[DIContainer] 已清除所有缓存`);
        }
    }

    /**
     * 获取所有已注册的服务名称
     * @returns {string[]}
     */
    getRegisteredServices() {
        return Array.from(this.factories.keys());
    }

    /**
     * 重置容器（用于测试）
     */
    reset() {
        this.factories.clear();
        this.singletons.clear();
        this.lifetimes.clear();
        console.log(`[DIContainer] 容器已重置`);
    }
}

// 创建全局容器实例
export const container = new DIContainer();

// 默认导出
export default container;

// ================================================================
// 🔄 向后兼容：暴露到 window (开发调试用)
// ================================================================
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    window.__DIContainer = container;
    console.log('✅ [DIContainer] 开发模式：容器已暴露到 window.__DIContainer');
}
