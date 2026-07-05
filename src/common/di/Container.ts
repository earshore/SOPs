// src/common/di/Container.ts
// ================================================================
// 🎯 P0修复: 依赖注入容器 (TypeScript版本)
// 解决循环依赖问题，提供标准化的依赖管理
// ================================================================

import { SystemError } from '@/common/errors/AppError';

/**
 * 服务生命周期类型
 */
export type ServiceLifetime = 'transient' | 'singleton';

/**
 * 服务工厂函数类型
 */
export type ServiceFactory<T = unknown> = (container: DIContainer) => T | Promise<T>;

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
  /**
   * 服务是否必须异步解析
   */
  async?: boolean;
}

/**
 * 服务元信息
 */
export interface ServiceMetadata {
  name: string;
  lifetime: ServiceLifetime;
  dependencies: string[];
  async: boolean;
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

  /** 正在解析的异步单例 */
  private pendingSingletons: Map<string, Promise<unknown>>;

  /** 服务生命周期 */
  private lifetimes: Map<string, ServiceLifetime>;

  /** 必须异步解析的服务 */
  private asyncServices: Set<string>;

  /** 服务依赖关系 */
  private dependencies: Map<string, string[]>;

  /** 服务元信息 */
  private metadata: Map<string, ServiceMetadata>;

  constructor() {
    this.factories = new Map();
    this.singletons = new Map();
    this.pendingSingletons = new Map();
    this.lifetimes = new Map();
    this.asyncServices = new Set();
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
      throw new SystemError(`Factory must be a function: ${name}`, 'DI_INVALID_FACTORY', {
        module: 'DIContainer',
        action: 'register',
        serviceName: name,
      });
    }

    const lifetime = options.lifetime || 'singleton';
    const deps = options.dependencies || [];
    const isAsync = options.async || false;

    this.factories.set(name, factory);
    this.lifetimes.set(name, lifetime);
    this.dependencies.set(name, deps);
    if (isAsync) {
      this.asyncServices.add(name);
    } else {
      this.asyncServices.delete(name);
    }
    this.clearCache(name);
    this.metadata.set(name, {
      name,
      lifetime,
      dependencies: deps,
      async: isAsync,
      registered: Date.now(),
      resolved: 0,
    });
  }

  /**
   * 解析服务
   * @param name - 服务名称
   * @returns 服务实例
   * @throws 服务未注册时抛出错误
   */
  resolve<T = unknown>(name: string): T {
    this.assertRegistered(name, 'resolve');

    if (this.asyncServices.has(name)) {
      throw new SystemError(
        `服务 "${name}" 是异步服务，请使用 resolveAsync()`,
        'DI_ASYNC_SERVICE_SYNC_RESOLVE',
        {
          module: 'DIContainer',
          action: 'resolve',
          serviceName: name,
        }
      );
    }

    const lifetime = this.lifetimes.get(name);
    const factory = this.getFactory(name, 'resolve');

    // 2. 单例模式：返回缓存的实例
    if (lifetime === 'singleton') {
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }

      // 创建新实例并缓存
      const instance = factory(this);
      this.assertSyncInstance(name, instance, 'resolve');
      this.singletons.set(name, instance);

      // 更新元信息
      this.markResolved(name);

      return instance as T;
    }

    // 3. 瞬态模式：每次创建新实例
    const instance = factory(this);
    this.assertSyncInstance(name, instance, 'resolve');
    this.markResolved(name);
    return instance as T;
  }

  /**
   * 异步解析服务
   * @param name - 服务名称
   * @returns 服务实例
   */
  async resolveAsync<T = unknown>(name: string): Promise<T> {
    this.assertRegistered(name, 'resolveAsync');

    const lifetime = this.lifetimes.get(name);
    const factory = this.getFactory(name, 'resolveAsync');

    if (lifetime === 'singleton') {
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }

      const pending = this.pendingSingletons.get(name);
      if (pending) {
        return (await pending) as T;
      }

      const loadPromise = Promise.resolve()
        .then(() => factory(this))
        .then(instance => {
          this.singletons.set(name, instance);
          this.markResolved(name);
          return instance;
        })
        .finally(() => {
          this.pendingSingletons.delete(name);
        });

      this.pendingSingletons.set(name, loadPromise);
      return (await loadPromise) as T;
    }

    const instance = await factory(this);
    this.markResolved(name);
    return instance as T;
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
      this.pendingSingletons.delete(name);
    } else {
      this.singletons.clear();
      this.pendingSingletons.clear();
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

  private assertRegistered(name: string, action: string): void {
    if (!this.factories.has(name)) {
      throw new SystemError(`服务未注册: ${name}`, 'DI_SERVICE_NOT_FOUND', {
        module: 'DIContainer',
        action,
        serviceName: name,
      });
    }
  }

  private getFactory(name: string, action: string): ServiceFactory {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new SystemError(`服务未注册: ${name}`, 'DI_SERVICE_NOT_FOUND', {
        module: 'DIContainer',
        action,
        serviceName: name,
      });
    }

    return factory;
  }

  private assertSyncInstance(name: string, instance: unknown, action: string): void {
    if (this.isPromiseLike(instance)) {
      void Promise.resolve(instance).catch(() => {
        // The caller gets a sync contract error below; suppress later async rejection noise.
      });
      throw new SystemError(
        `服务 "${name}" 返回了 Promise，请使用 resolveAsync() 并将服务标记为 async`,
        'DI_ASYNC_SERVICE_SYNC_RESOLVE',
        {
          module: 'DIContainer',
          action,
          serviceName: name,
        }
      );
    }
  }

  private isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      typeof (value as { then?: unknown }).then === 'function'
    );
  }

  private markResolved(name: string): void {
    const meta = this.metadata.get(name);
    if (meta) {
      meta.resolved = Date.now();
    }
  }

  /**
   * 检查循环依赖
   * @param name - 服务名称
   * @param visited - 已访问的服务
   */
  private checkCircularDependency(name: string, visited: Set<string> = new Set()): void {
    if (visited.has(name)) {
      throw new SystemError(
        `检测到循环依赖: ${Array.from(visited).join(' -> ')} -> ${name}`,
        'DI_CIRCULAR_DEPENDENCY',
        {
          module: 'DIContainer',
          action: 'checkCircularDependency',
          serviceName: name,
          chain: Array.from(visited),
        }
      );
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
      errors,
    };
  }

  /**
   * 重置容器（用于测试）
   */
  reset(): void {
    this.factories.clear();
    this.singletons.clear();
    this.pendingSingletons.clear();
    this.lifetimes.clear();
    this.asyncServices.clear();
    this.dependencies.clear();
    this.metadata.clear();
  }
}

// 创建全局容器实例
export const container = new DIContainer();

// 默认导出
export default container;
