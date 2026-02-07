// src/common/bootstrap/ServiceBootstrap.js
// ================================================================
// 🎯 服务初始化管理器
// 按依赖顺序初始化所有核心服务，确保启动流程可控
// ================================================================

/**
 * 服务初始化管理器
 * 负责按依赖关系顺序初始化所有核心服务
 */
export class ServiceBootstrap {
    constructor() {
        this.services = new Map();
        this.initOrder = [];
        this.failedServices = [];
        this.initializedServices = new Set();
    }

    /**
     * 注册服务
     * @param {string} name - 服务名称
     * @param {Function} initializer - 初始化函数 async () => service
     * @param {Object} options - 配置选项
     * @param {string[]} options.dependencies - 依赖的服务名称列表
     * @param {boolean} options.optional - 是否为可选服务
     * @param {number} options.timeout - 超时时间（毫秒）
     * @param {Function} options.fallback - 失败时的降级函数
     */
    register(name, initializer, options = {}) {
        if (this.services.has(name)) {
            console.warn(`[Bootstrap] 服务 "${name}" 已注册，将被覆盖`);
        }

        this.services.set(name, {
            name,
            initializer,
            dependencies: options.dependencies || [],
            optional: options.optional || false,
            timeout: options.timeout || 5000,
            fallback: options.fallback || null
        });

        console.log(`✅ [Bootstrap] 已注册服务: ${name}`);
    }

    /**
     * 按依赖顺序初始化所有服务
     * @returns {Promise<Object>} { success: boolean, failed: Array }
     */
    async initialize() {
        console.log('\n🚀 [Bootstrap] 开始初始化服务...\n');
        
        try {
            // 1. 拓扑排序，确定初始化顺序
            this.initOrder = this._topologicalSort();
            console.log(`📋 [Bootstrap] 初始化顺序:`, this.initOrder.join(' → '));
            
            // 2. 按顺序初始化
            for (const serviceName of this.initOrder) {
                await this._initService(serviceName);
            }
            
            // 3. 报告初始化结果
            this._reportStatus();
            
            return {
                success: this.failedServices.length === 0,
                failed: this.failedServices,
                initialized: Array.from(this.initializedServices)
            };
        } catch (error) {
            console.error('❌ [Bootstrap] 初始化流程失败:', error);
            throw error;
        }
    }

    /**
     * 初始化单个服务
     * @param {string} name - 服务名称
     * @returns {Promise<any>} 服务实例
     * @private
     */
    async _initService(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`服务 "${name}" 未注册`);
        }

        // 跳过已初始化的服务
        if (this.initializedServices.has(name)) {
            return;
        }

        console.log(`⏳ [Bootstrap] 初始化服务: ${name}`);
        const startTime = performance.now();

        try {
            // 设置超时
            const result = await Promise.race([
                service.initializer(),
                this._timeout(service.timeout, name)
            ]);

            const duration = Math.round(performance.now() - startTime);
            console.log(`✅ [Bootstrap] ${name} 初始化成功 (${duration}ms)`);
            
            this.initializedServices.add(name);
            return result;

        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            console.error(`❌ [Bootstrap] ${name} 初始化失败 (${duration}ms):`, error.message);

            // 如果是可选服务，使用降级方案
            if (service.optional) {
                if (service.fallback) {
                    console.warn(`[Bootstrap] 使用 ${name} 的降级方案`);
                    try {
                        const fallbackResult = await service.fallback();
                        this.initializedServices.add(name);
                        return fallbackResult;
                    } catch (fallbackError) {
                        console.error(`[Bootstrap] ${name} 降级方案也失败:`, fallbackError);
                    }
                } else {
                    console.warn(`[Bootstrap] ${name} 是可选服务，跳过`);
                }
                return null;
            }

            // 如果是必需服务，记录失败
            this.failedServices.push({ 
                name, 
                error: error.message,
                duration 
            });
            
            throw error;
        }
    }

    /**
     * 拓扑排序（确定初始化顺序）
     * @returns {string[]} 排序后的服务名称列表
     * @private
     */
    _topologicalSort() {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (name) => {
            if (visited.has(name)) return;
            
            if (visiting.has(name)) {
                throw new Error(`检测到循环依赖: ${name}`);
            }

            visiting.add(name);

            const service = this.services.get(name);
            if (service) {
                // 先访问依赖
                service.dependencies.forEach(dep => {
                    if (!this.services.has(dep)) {
                        throw new Error(`服务 "${name}" 依赖的 "${dep}" 未注册`);
                    }
                    visit(dep);
                });
            }

            visiting.delete(name);
            visited.add(name);
            sorted.push(name);
        };

        // 访问所有服务
        for (const name of this.services.keys()) {
            visit(name);
        }

        return sorted;
    }

    /**
     * 超时处理
     * @param {number} ms - 超时时间
     * @param {string} serviceName - 服务名称
     * @returns {Promise<never>}
     * @private
     */
    _timeout(ms, serviceName) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`服务 ${serviceName} 初始化超时 (${ms}ms)`));
            }, ms);
        });
    }

    /**
     * 报告初始化状态
     * @private
     */
    _reportStatus() {
        const total = this.services.size;
        const failed = this.failedServices.length;
        const success = total - failed;

        console.log(`\n📊 [Bootstrap] 初始化完成:`);
        console.log(`   ✅ 成功: ${success}/${total}`);
        
        if (failed > 0) {
            console.log(`   ❌ 失败: ${failed}/${total}`);
            this.failedServices.forEach(({ name, error, duration }) => {
                console.log(`      - ${name}: ${error} (${duration}ms)`);
            });
        }
        
        console.log('');
    }

    /**
     * 获取已初始化的服务列表
     * @returns {string[]}
     */
    getInitializedServices() {
        return Array.from(this.initializedServices);
    }

    /**
     * 检查服务是否已初始化
     * @param {string} name - 服务名称
     * @returns {boolean}
     */
    isInitialized(name) {
        return this.initializedServices.has(name);
    }

    /**
     * 重置初始化状态（用于测试）
     */
    reset() {
        this.services.clear();
        this.initOrder = [];
        this.failedServices = [];
        this.initializedServices.clear();
        console.log('✅ [Bootstrap] 已重置');
    }
}

// 创建全局实例
export const serviceBootstrap = new ServiceBootstrap();

// 默认导出
export default serviceBootstrap;
