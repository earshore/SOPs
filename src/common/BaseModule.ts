/**
 * BaseModule.ts - 模块基类
 *
 * 提供统一的生命周期管理、资源清理和错误处理
 * 所有业务模块都应继承此类
 * 🎯 增强: 支持DI容器注入和服务获取
 */

import { escapeHtml, setSafeHtml } from '@/common/utils/security';
import { container as globalContainer } from './di/Container';
import type { DIContainer } from './di/Container';
import type { ServiceName } from './di/ServiceRegistry';
import { SERVICE_NAMES } from './di/ServiceRegistry';
import eventBus from './EventBus';
import { APP_EVENTS } from './constants/eventConstants';
import type { ILoggerService, IStorageService, IHttpService } from '@/types/services';
import { SystemError } from '@/common/errors/AppError';

/**
 * 动作处理器类型
 */
export type ActionHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * 动作映射类型
 */
export type ActionMap = Record<string, ActionHandler>;

/**
 * 清理函数类型
 */
export type DisposeFn = () => void;

/**
 * 模块基类
 *
 * 功能特性:
 * - 统一的生命周期管理 (mount/unmount)
 * - 自动资源清理 (事件监听器、定时器、请求)
 * - 错误处理和重试机制
 * - 动作注册和清理
 * - DI容器集成和服务获取
 */
export default class BaseModule {
  /** 模块唯一标识符 */
  protected readonly moduleId: string;

  /** DI容器实例 */
  protected readonly diContainer: DIContainer;

  /** 容器元素 */
  protected container: HTMLElement | null = null;

  /** 清理函数列表 */
  private _disposables: DisposeFn[] = [];

  /** 挂载状态 */
  private _isMounted: boolean = false;

  /** 请求取消控制器 */
  private _abortController: AbortController = new AbortController();

  /** 最近一次卸载所取消的挂载信号，用于清理晚到的异步续体。 */
  private _lastUnmountedSignal: AbortSignal | null = null;

  /** 已注册的动作名称列表 */
  private _registeredActions: string[] = [];

  /**
   * 构造函数
   * @param moduleId - 模块唯一ID
   * @param container - DI容器实例（可选，默认使用全局容器）
   */
  constructor(moduleId: string, container?: DIContainer) {
    this.moduleId = moduleId;
    this.diContainer = container || globalContainer;
  }

  // ================= DI容器服务获取方法 =================

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

  // ================= 生命周期方法 =================

  /**
   * 挂载模块
   * @param container - 容器元素
   */
  async mount(container: HTMLElement): Promise<void> {
    // 安全检查：如果已经挂载，先执行卸载以防止状态泄漏
    if (this._isMounted) {
      this.unmount();
    }

    this.container = container;
    this._isMounted = true;
    this._disposables = []; // 重置清理列表
    const mountSignal = this._abortController.signal;

    try {
      await this.render();
      if (!this.isCurrentMount(mountSignal)) {
        this.cleanupLateMount(mountSignal);
        return;
      }

      await this.init();
    } catch (error) {
      if (!this.isCurrentMount(mountSignal)) {
        this.cleanupLateMount(mountSignal);
        return;
      }

      const moduleError = error as Error;
      this.handleError(moduleError);
      this.emitModuleError(moduleError, 'mount');
      throw moduleError;
    }

    if (!this.isCurrentMount(mountSignal)) {
      this.cleanupLateMount(mountSignal);
    }
  }

  /**
   * 统一异步操作包装器，自动处理错误
   * @param asyncFn - 异步函数
   * @param errorContext - 错误上下文描述
   */
  protected async runAsync<T>(
    asyncFn: () => Promise<T>,
    _errorContext: string = 'Operation failed'
  ): Promise<T | undefined> {
    try {
      return await asyncFn();
    } catch (error) {
      this.handleError(error as Error);
      return undefined;
    }
  }

  /**
   * 渲染 HTML（必须由子类实现）
   */
  protected async render(): Promise<void> {
    throw new SystemError('BaseModule.render() must be implemented', 'MODULE_NOT_IMPLEMENTED', {
      module: this.moduleId,
      action: 'render',
    });
  }

  /**
   * 初始化逻辑（可选由子类实现）
   */
  protected async init(): Promise<void> {
    // 子类可以覆盖此方法
  }

  /**
   * 卸载模块
   */
  unmount(): void {
    if (!this._isMounted) return;

    // 0. 取消所有进行中的请求
    this._lastUnmountedSignal = this._abortController.signal;
    this._abortController.abort();

    // 1. 执行注册的清理函数
    this.disposeResources();

    // 2. 同步清理已注册的动作
    if (this._registeredActions.length > 0) {
      this.unregisterActionsSync();
    }

    // 3. 调用子类特定的清理逻辑
    this.onUnmount();

    this._isMounted = false;

    // 4. 重置 AbortController 以便重新挂载
    this._abortController = new AbortController();
  }

  /**
   * 自定义卸载逻辑（可选由子类实现）
   */
  protected onUnmount(): void {
    // 子类可以覆盖此方法
  }

  // ================= 工具方法 =================

  /**
   * 添加自动清理的事件监听器
   * @param target - 事件目标
   * @param type - 事件类型
   * @param listener - 事件监听器
   * @param options - 监听器选项
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document | null,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  protected addEventListener(
    target: EventTarget | null,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!target) return;
    target.addEventListener(type, listener, options);
    this._disposables.push(() => {
      target.removeEventListener(type, listener, options);
    });
  }

  /**
   * 添加自动清理的定时器
   * @param callback - 回调函数
   * @param delay - 延迟时间（毫秒）
   * @returns 定时器ID
   */
  protected setTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    this._disposables.push(() => clearTimeout(id));
    return id;
  }

  /**
   * 添加自动清理的循环定时器
   * @param callback - 回调函数
   * @param delay - 间隔时间（毫秒）
   * @returns 定时器ID
   */
  protected setInterval(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay);
    this._disposables.push(() => clearInterval(id));
    return id;
  }

  /**
   * 注册任意清理函数
   * @param fn - 清理函数
   */
  protected addDisposable(fn: DisposeFn): void {
    if (typeof fn === 'function') {
      this._disposables.push(fn);
    }
  }

  /**
   * 注册动作（自动在卸载时清理）
   * 使用事件驱动解耦，避免循环依赖
   * @param actions - 动作映射对象
   */
  protected registerActions(actions: ActionMap): void {
    // 使用事件总线发送注册请求，完全解耦
    eventBus.emit(APP_EVENTS.REGISTER_ACTIONS, {
      moduleId: this.moduleId,
      actions,
    });

    // 保存动作名称用于清理
    this._registeredActions.push(...Object.keys(actions));
  }

  /**
   * 清理已注册的动作（同步版本）
   * 使用依赖注入容器清理
   * @private
   */
  private unregisterActionsSync(): void {
    if (this._registeredActions.length === 0) return;

    try {
      // 使用依赖注入容器获取actionRegistry
      const actionRegistry = this.diContainer.resolve<{ unregisterAction: (name: string) => void }>(
        'actionRegistry'
      );

      // 清理每个动作
      this._registeredActions.forEach(actionName => {
        actionRegistry.unregisterAction(actionName);
      });

      this._registeredActions = [];
    } catch {
      // 卸载流程继续进行。
    }
  }

  /**
   * 发起可取消的 fetch 请求
   * @param url - 请求URL
   * @param options - fetch 选项
   * @returns Response Promise
   */
  protected async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      signal: this._abortController.signal,
    });
  }

  /**
   * 获取 AbortSignal（用于其他需要取消的操作）
   * @returns AbortSignal
   */
  protected getAbortSignal(): AbortSignal {
    return this._abortController.signal;
  }

  /**
   * 判断由某次挂载捕获的信号是否仍代表当前挂载。
   * 异步渲染在 await 后提交 DOM 前应调用此方法，避免旧挂载覆盖新页面。
   */
  protected isCurrentMount(signal: AbortSignal): boolean {
    return this._isMounted && !signal.aborted && this._abortController.signal === signal;
  }

  private disposeResources(): void {
    this._disposables.forEach(dispose => {
      try {
        dispose();
      } catch {
        // 继续清理剩余资源。
      }
    });
    this._disposables = [];
  }

  private cleanupLateMount(signal: AbortSignal): void {
    if (this._isMounted || this._lastUnmountedSignal !== signal) {
      return;
    }

    this.disposeResources();
    if (this._registeredActions.length > 0) {
      this.unregisterActionsSync();
    }
    this.onUnmount();
  }

  /**
   * 统一错误处理
   * @param error - 错误对象
   */
  protected handleError(error: Error): void {
    if (this.container) {
      // ✅ 安全: moduleId和error.message已通过escapeHtml转义
      setSafeHtml(
        this.container,
        `
                <div class="flex flex-col items-center justify-center p-12 text-center h-full fade-in">
                    <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-800 mb-2">模块加载失败 (${escapeHtml(this.moduleId)})</h3>
                    <p class="text-sm text-slate-500 mb-6 max-w-md break-words">${escapeHtml(error.message)}</p>
                    <button type="button" data-module-retry="true" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                        <i class="fas fa-redo mr-2"></i>重试
                    </button>
                </div>
            `
      );

      // 绑定重试逻辑
      const btn = this.container.querySelector<HTMLButtonElement>('button[data-module-retry]');
      if (btn) {
        this.addEventListener(btn, 'click', () => {
          const container = this.container;
          if (!container) return;

          // ✅ 安全: 静态HTML模板，无用户输入
          setSafeHtml(
            container,
            '<div class="p-10 text-center"><i class="fas fa-spinner fa-spin text-slate-400"></i></div>'
          );
          // 重新挂载
          this.mount(container).catch(e => {
            // mount 已经渲染错误状态并发出 MODULE_ERROR，这里只消费 rejection。
            void e;
          });
        });
      }
    }
  }

  private emitModuleError(error: Error, phase: string): void {
    eventBus.emit(APP_EVENTS.MODULE_ERROR, {
      moduleId: this.moduleId,
      phase,
      error,
      message: error.message,
    });
  }

  /**
   * 获取挂载状态
   */
  get isMounted(): boolean {
    return this._isMounted;
  }
}
