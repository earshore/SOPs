// src/common/StandardModule.ts
// ================================================================
// 🎯 历史标准化模块基类
// 保留用于兼容旧测试和实验代码；业务模块统一使用 BaseModule。
// 🎯 增强: 支持DI容器注入和服务获取
// ================================================================

import type { IModule, ModuleState, ModuleMetadata } from '../types/modules';
import { container as globalContainer } from './di/Container';
import type { DIContainer } from './di/Container';
import type { ServiceName } from './di/ServiceRegistry';
import { SERVICE_NAMES } from './di/ServiceRegistry';
import type { ILoggerService, IStorageService, IHttpService } from '@/types/services';

/**
 * 标准化模块配置
 */
export interface StandardModuleConfig {
  /** 模块ID */
  id: string;
  /** 模块名称 */
  name: string;
  /** 模块版本 */
  version: string;
  /** 模块元信息 */
  metadata?: ModuleMetadata;
  /** DI容器实例（可选，默认使用全局容器） */
  container?: DIContainer;
}

/**
 * 标准化模块基类
 *
 * 提供统一的模块接口实现,包括:
 * - 完整的生命周期钩子
 * - 状态管理
 * - 错误处理
 *
 * @deprecated 业务模块请统一继承 BaseModule。该类仅保留兼容，不再作为新模块基类。
 *
 * @example
 * ```typescript
 * export class MyModule extends StandardModule {
 *   constructor() {
 *     super({
 *       id: 'my-module',
 *       name: 'My Module',
 *       version: '1.0.0'
 *     });
 *   }
 *
 *   async onInit() {
 *     // 初始化逻辑
 *   }
 *
 *   async mount(container: HTMLElement) {
 *     await super.mount(container);
 *     // 挂载逻辑
 *   }
 *
 *   protected async doMount(container: HTMLElement) {
 *     // 实际挂载逻辑
 *   }
 *
 *   protected async doUnmount() {
 *     // 实际卸载逻辑
 *   }
 * }
 * ```
 */
export abstract class StandardModule implements IModule {
  /** 模块ID */
  public readonly id: string;

  /** 模块名称 */
  public readonly name: string;

  /** 模块版本 */
  public readonly version: string;

  /** 模块元信息 */
  public readonly metadata?: ModuleMetadata;

  /** DI容器实例 */
  protected readonly diContainer: DIContainer;

  /** 模块状态 */
  protected state: ModuleState;

  /** 挂载容器 */
  protected container: HTMLElement | null = null;

  /** 清理函数列表 */
  private disposables: Array<() => void> = [];

  constructor(config: StandardModuleConfig) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.metadata = config.metadata;
    this.diContainer = config.container || globalContainer;

    this.state = {
      mounted: false,
      loading: false,
      error: null,
      data: null,
    };
  }

  /**
   * 挂载模块
   */
  async mount(container: HTMLElement): Promise<void> {
    if (this.state.mounted) {
      return;
    }

    try {
      this.state.loading = true;
      this.container = container;

      // 生命周期: 初始化
      await this.onInit?.();

      // 执行挂载逻辑(子类实现)
      await this.doMount(container);

      this.state.mounted = true;
      this.state.loading = false;

      // 生命周期: 挂载完成
      await this.onMounted?.();
    } catch (error) {
      this.state.loading = false;
      this.state.error = error as Error;

      // 生命周期: 错误处理
      this.onError?.(error as Error);

      throw error;
    }
  }

  /**
   * 卸载模块
   */
  async unmount(): Promise<void> {
    if (!this.state.mounted) {
      return;
    }

    try {
      // 生命周期: 卸载前
      await this.onBeforeUnmount?.();

      // 执行卸载逻辑(子类实现)
      await this.doUnmount();

      // 清理所有注册的资源
      this.cleanup();

      this.state.mounted = false;
      this.container = null;

      // 生命周期: 卸载完成
      await this.onUnmounted?.();

      // 向后兼容
      this.onUnmount?.();
    } catch (error) {
      this.state.error = error as Error;
      this.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 激活模块(从其他模块切换回来)
   */
  async activate(): Promise<void> {
    if (!this.state.mounted) {
      return;
    }

    await this.onActivated?.();
  }

  /**
   * 失活模块(切换到其他模块)
   */
  async deactivate(): Promise<void> {
    if (!this.state.mounted) {
      return;
    }

    await this.onDeactivated?.();
  }

  /**
   * 获取模块状态
   */
  getState(): ModuleState {
    return { ...this.state };
  }

  /**
   * 模块是否已挂载
   */
  isMounted(): boolean {
    return this.state.mounted;
  }

  // ================================================================
  // DI容器服务获取方法
  // ================================================================

  /**
   * 获取服务实例（类型安全）
   * @param name - 服务名称
   * @returns 服务实例
   */
  protected getService<T = unknown>(name: ServiceName): T {
    return this.diContainer.resolve<T>(name);
  }

  /**
   * 异步获取服务实例（类型安全）
   * @param name - 服务名称
   * @returns 服务实例
   */
  protected getServiceAsync<T = unknown>(name: ServiceName): Promise<T> {
    return this.diContainer.resolveAsync<T>(name);
  }

  /**
   * 检查服务是否存在
   * @param name - 服务名称
   * @returns 是否存在
   */
  protected hasService(name: ServiceName): boolean {
    return this.diContainer.has(name);
  }

  /**
   * 获取Logger服务（便捷属性）
   * @deprecated logger 是异步服务。新代码请使用 await this.getLogger()。
   */
  protected get logger(): ILoggerService {
    return this.getService<ILoggerService>(SERVICE_NAMES.LOGGER);
  }

  /**
   * 获取Logger服务
   */
  protected getLogger(): Promise<ILoggerService> {
    return this.getServiceAsync<ILoggerService>(SERVICE_NAMES.LOGGER);
  }

  /**
   * 获取Storage服务（便捷属性）
   */
  protected get storage(): IStorageService {
    return this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
  }

  /**
   * 获取Http服务（便捷属性）
   * @deprecated http 是异步服务。新代码请使用 await this.getHttp()。
   */
  protected get http(): IHttpService {
    return this.getService<IHttpService>(SERVICE_NAMES.HTTP);
  }

  /**
   * 获取Http服务
   */
  protected getHttp(): Promise<IHttpService> {
    return this.getServiceAsync<IHttpService>(SERVICE_NAMES.HTTP);
  }

  // ================================================================
  // 资源管理方法
  // ================================================================

  /**
   * 注册清理函数
   */
  protected addDisposable(dispose: () => void): void {
    this.disposables.push(dispose);
  }

  /**
   * 清理所有资源
   */
  private cleanup(): void {
    this.disposables.forEach(dispose => {
      try {
        dispose();
      } catch {
        // 继续清理剩余资源。
      }
    });
    this.disposables = [];
  }

  /**
   * 更新模块数据
   */
  protected updateData(data: unknown): void {
    this.state.data = data;
  }

  /**
   * 设置错误状态
   */
  protected setError(error: Error): void {
    this.state.error = error;
    this.onError?.(error);
  }

  /**
   * 清除错误状态
   */
  protected clearError(): void {
    this.state.error = null;
  }

  // ================================================================
  // 抽象方法 - 子类必须实现
  // ================================================================

  /**
   * 执行挂载逻辑(子类实现)
   */
  protected abstract doMount(container: HTMLElement): Promise<void> | void;

  /**
   * 执行卸载逻辑(子类实现)
   */
  protected abstract doUnmount(): Promise<void> | void;

  // ================================================================
  // 生命周期钩子 - 子类可选实现(公共方法)
  // ================================================================

  /**
   * 模块初始化(在mount之前调用)
   */
  onInit?(): Promise<void> | void;

  /**
   * 模块挂载完成
   */
  onMounted?(): Promise<void> | void;

  /**
   * 模块激活(从其他模块切换回来)
   */
  onActivated?(): Promise<void> | void;

  /**
   * 模块失活(切换到其他模块)
   */
  onDeactivated?(): Promise<void> | void;

  /**
   * 模块卸载前
   */
  onBeforeUnmount?(): Promise<void> | void;

  /**
   * 模块卸载完成
   */
  onUnmounted?(): Promise<void> | void;

  /**
   * 模块错误处理
   */
  onError?(error: Error): void;

  /**
   * 向后兼容: 旧的卸载钩子
   */
  onUnmount?(): void;
}

/**
 * 默认导出
 */
export default StandardModule;
