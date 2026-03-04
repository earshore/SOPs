// src/common/di/Container.ts
// ================================================================
// 🎯 P0修复: 依赖注入容器 (TypeScript版本)
// 解决循环依赖问题，提供标准化的依赖管理
// ================================================================

import { Logger } from '@services/loggerService';

/**
 * 服务生命周期类型
 */
export type ServiceLifetime = 'transient' | 'singleton';

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T = unknown> = (container: DIContainer) => T;

/**
 * 服务注册选项
 */
export interface RegisterOptions {
  /**
   * 服务生命周期（默认singleton）
   */
  lifetime?: ServiceLifetime;
  /**
   * 服务依赖列表
   */
  dependencies?: string[];
}

/**
 * 服务元信息
 */
export interface ServiceMetadata {
  name: string;
  lifetime: ServiceLifetime;
  dependencies: string[];
  registered: number;
  resolved: number;
}

/**
 * 依赖注入容器
 * 提供服务注册、解析和生命周期管理
 */
export class DIContainer {
  /** 服务工厂函数 */
  private factories: Map<string, ServiceFactory>;
  
  /** 单例实例缓存 */
  private singletons: Map<string, unknown>;
  
  /** 服务生命周期 */
  private lifetimes: Map<string, ServiceLifetime>;
  
  /** 服务依赖关系 */
  private dependencies: Map<string, string[]>;
  
  /** 服务元信息 */
  private metadata: Map<string, ServiceMetadata>;

  constructor() {
    this.factories = new Map();
    this.singletons = new Map();
    this.lifetimes = new Map();
    this.dependencies = new Map();
    this.metadata = new Map();
  }

  /**
   * 注册服务
   * @param name - 服务名称
   * @param factory - 工厂函数 (container) => instance
   * @param options - 配置选项
   */
  register<T = unknown>(
    name: string,
    factory: ServiceFactory<T>,
    options: RegisterOptions = {}
  ): void {
    if (typeof factory !== 'function') {
      throw new Error(`[DIContainer] Factory must be a function: ${name}`);
    }

    const lifetime = options.lifetime || 'singleton';
    const deps = options.dependencies || [];
    
    this.factories.set(name, factory);
    this.lifetimes.set(name, lifetime);
    this.dependencies.set(name, deps);
    this.metadata.set(name, {
      name,
      lifetime,
      dependencies: deps,
      registered: Date.now(),
      resolved: 0
    });
    
    Logger.debug(`[DIContainer] 已注册服务: ${name} (${lifetime})`);
  }

  /**
   * 解析服务
   * @param name - 服务名称
   * @returns 服务实例
   * @throws 服务未注册时抛出错误
   */
  resolve<T = unknown>(name: string): T {
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
      
      // 更新元信息
      const meta = this.metadata.get(name);
      if (meta) {
        meta.resolved = Date.now();
      }
      
      Logger.debug(`[DIContainer] 创建单例: ${name}`);
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
      Logger.debug(`[DIContainer] 已清除缓存: ${name}`);
    } else {
      this.singletons.clear();
      Logger.debug(`[DIContainer] 已清除所有缓存`);
    }
  }

  /**
   * 获取所有已注册的服务名称
   */
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }
  
  /**
   * 获取服务元信息
   * @param name - 服务名称
   */
  getMetadata(name: string): ServiceMetadata | undefined {
    return this.metadata.get(name);
  }
  
  /**
   * 获取所有服务元信息
   */
  getAllMetadata(): ServiceMetadata[] {
    return Array.from(this.metadata.values());
  }
  
  /**
   * 检查循环依赖
   * @param name - 服务名称
   * @param visited - 已访问的服务
   */
  private checkCircularDependency(name: string, visited: Set<string> = new Set()): void {
    if (visited.has(name)) {
      throw new Error(`[DIContainer] 检测到循环依赖: ${Array.from(visited).join(' -> ')} -> ${name}`);
    }
    
    visited.add(name);
    const deps = this.dependencies.get(name) || [];
    
    for (const dep of deps) {
      this.checkCircularDependency(dep, new Set(visited));
    }
  }
  
  /**
   * 验证所有依赖
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [name, deps] of this.dependencies.entries()) {
      // 检查循环依赖
      try {
        this.checkCircularDependency(name);
      } catch (error) {
        errors.push((error as Error).message);
      }
      
      // 检查依赖是否已注册
      for (const dep of deps) {
        if (!this.has(dep)) {
          errors.push(`[DIContainer] 服务 "${name}" 依赖的服务 "${dep}" 未注册`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 重置容器（用于测试）
   */
  reset(): void {
    this.factories.clear();
    this.singletons.clear();
    this.lifetimes.clear();
    this.dependencies.clear();
    this.metadata.clear();
    Logger.debug(`[DIContainer] 容器已重置`);
  }
}

// 创建全局容器实例
export const container = new DIContainer();

// 默认导出
export default container;
