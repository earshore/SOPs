// src/common/di/Container.ts
// ================================================================
// 🎯 P0修复: 依赖注入容器 (TypeScript版本)
// 解决循环依赖问题，提供标准化的依赖管理
// ================================================================

/**
 * 服务生命周期类型
 */
export type ServiceLifetime = 'transient' | 'singleton';

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T = any> = (container: DIContainer) => T;

/**
 * 服务注册选项
 */
export interface RegisterOptions {
  /**
   * 服务生命周期（默认singleton）
   */
  lifetime?: ServiceLifetime;
}

/**
 * 依赖注入容器
 * 提供服务注册、解析和生命周期管理
 */
export class DIContainer {
  /** 服务工厂函数 */
  private factories: Map<string, ServiceFactory>;
  
  /** 单例实例缓存 */
  private singletons: Map<string, any>;
  
  /** 服务生命周期 */
  private lifetimes: Map<string, ServiceLifetime>;

  constructor() {
    this.factories = new Map();
    this.singletons = new Map();
    this.lifetimes = new Map();
  }

  /**
   * 注册服务
   * @param name - 服务名称
   * @param factory - 工厂函数 (container) => instance
   * @param options - 配置选项
   */
  register<T = any>(
    name: string,
    factory: ServiceFactory<T>,
    options: RegisterOptions = {}
  ): void {
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
   * @param name - 服务名称
   * @returns 服务实例
   * @throws 服务未注册时抛出错误
   */
  resolve<T = any>(name: string): T {
    // 1. 检查服务是否已注册
    if (!this.factories.has(name)) {
      throw new Error(`[DIContainer] 服务未注册: ${name}`);
    }

    const lifetime = this.lifetimes.get(name);

    // 2. 单例模式：返回缓存的实例
    if (lifetime === 'singleton') {
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }

      // 创建新实例并缓存
      const factory = this.factories.get(name)!;
      const instance = factory(this);
      this.singletons.set(name, instance);
      
      console.log(`[DIContainer] 创建单例: ${name}`);
      return instance as T;
    }

    // 3. 瞬态模式：每次创建新实例
    const factory = this.factories.get(name)!;
    return factory(this) as T;
  }

  /**
   * 检查服务是否已注册
   * @param name - 服务名称
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * 清除单例缓存
   * @param name - 服务名称，不传则清除所有
   */
  clearCache(name?: string): void {
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
   */
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * 重置容器（用于测试）
   */
  reset(): void {
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
if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
  (window as any).__DIContainer = container;
  console.log('✅ [DIContainer] 开发模式：容器已暴露到 window.__DIContainer');
}
