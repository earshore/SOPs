// src/common/StandardModule.ts
// ================================================================
// 🎯 标准化模块基类
// 提供统一的模块接口和生命周期管理
// 🎯 增强: 支持DI容器注入和服务获取
// ================================================================

import type { IModule, ModuleState, ModuleMetadata } from '../types/modules';
import { container as globalContainer } from './di/Container';
import type { DIContainer } from './di/Container';
import type { ServiceName } from './di/ServiceRegistry';
import { SERVICE_NAMES } from './di/ServiceRegistry';
import type { ILoggerService, IStorageService, IHttpService } from '@/types/services';

import { Logger } from '../services/loggerService';
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
      data: null
    };
  }

  /**
   * 挂载模块
   */
  async mount(container: HTMLElement): Promise<void> {
    if (this.state.mounted) {
      Logger.warn(`[${this.id}] 模块已挂载,跳过`);
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

      Logger.debug(`[${this.id}] ✅ 模块已挂载`);
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

      Logger.debug(`[${this.id}] ✅ 模块已卸载`);
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
      Logger.warn(`[${this.id}] 模块未挂载,无法激活`);
      return;
    }

    await this.onActivated?.();
    Logger.debug(`[${this.id}] 模块已激活`);
  }

  /**
   * 失活模块(切换到其他模块)
   */
  async deactivate(): Promise<void> {
    if (!this.state.mounted) {
      return;
    }

    await this.onDeactivated?.();
    Logger.debug(`[${this.id}] 模块已失活`);
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
    try {
      return this.diContainer.resolve<T>(name);
    } catch (error) {
      Logger.error(`[${this.id}] 获取服务失败: ${name}`, error);
      throw error;
    }
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
   */
  protected get logger(): ILoggerService {
    return this.getService<ILoggerService>(SERVICE_NAMES.LOGGER);
  }

  /**
   * 获取Storage服务（便捷属性）
   */
  protected get storage(): IStorageService {
    return this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
  }

  /**
   * 获取Http服务（便捷属性）
   */
  protected get http(): IHttpService {
    return this.getService<IHttpService>(SERVICE_NAMES.HTTP);
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
      } catch (error) {
        Logger.warn(`[${this.id}] 清理资源失败:`, error);
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
