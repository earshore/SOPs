// src/common/utils/ModuleLoader.ts
// ================================================================
// 🎯 通用模块加载器 (TypeScript版本)
// 统一管理子模块的加载、卸载、错误处理逻辑
// 消除各业务模块中的重复代码
// 🎯 增强: 支持DI容器注入到模块实例
// ================================================================

import { APP_EVENTS } from '../constants/eventConstants';
import {
  renderErrorBoundary,
  renderNotRegistered,
  renderTimeout,
} from '../../components/ErrorBoundary';
import { ValidationError } from '@/common/errors/AppError';
import { createSafeFragment } from '@/common/utils/security';
import type { DIContainer } from '../di/Container';
import {
  applyPageEnterAnimation,
  clearPageEnterAnimation,
  preparePageEnterAnimation,
} from './pageEnterAnimation';

const LEGACY_CONTENT_ENTER_ANIMATION_CLASS = 'fade-in';
const MODULE_LOADING_DELAY_MS = 300;
const MODULE_LOADING_HOST_CLASS = 'route-loading-skeleton-host';

// ==================== 类型定义 ====================

/**
 * 模块接口
 */
export interface IModule {
  mount: (container: HTMLElement) => Promise<void> | void;
  unmount?: () => void;
}

/**
 * 模块加载器配置
 */
export interface ModuleLoaderConfig {
  /** 内容容器ID */
  containerId: string;
  /** Shell容器ID */
  shellId: string;
  /** 路由ID到动态导入函数的映射 */
  moduleMap: Record<string, () => Promise<IModule>>;
  /** 加载动画颜色 */
  loaderColor?: string;
  /** 模块名称（用于日志） */
  moduleName?: string;
  /** DI容器实例（可选，默认使用全局容器） */
  container?: DIContainer;
  /** 是否在子模块内容挂载完成后应用统一入口动画 */
  contentEnterAnimation?: boolean;
}

/**
 * 错误边界选项
 */
interface ErrorBoundaryOptions {
  title: string;
  color: string;
  showReload: boolean;
  showRetry: boolean;
  onRetry: () => void;
}

// ==================== 模块加载器类 ====================

/**
 * 通用模块加载器类
 */
export class ModuleLoader {
  private containerId: string;
  private shellId: string;
  private moduleMap: Record<string, () => Promise<IModule>>;
  private loaderColor: string;
  private moduleName: string;
  private currentModule: IModule | null;
  private currentContainer: HTMLElement | null;
  private routePrefixes: Set<string>;
  private currentRouteId: string | null; // 🔧 新增：记录当前加载的路由ID
  private isLoading: boolean; // 🔧 新增：标记是否正在加载
  private pendingRouteId: string | null;
  private loadSequence: number;
  private contentEnterAnimation: boolean;
  private loadingTimer: number | null;
  private loadingTimerLoadId: number | null;
  private retryTimer: number | null;
  private retryTimerLoadId: number | null;
  private routeChangeHandler: ((event: Event) => void) | null;
  private moduleUnloadHandler: ((event: Event) => void) | null;
  private isDestroyed: boolean;

  constructor(config: ModuleLoaderConfig) {
    this.containerId = config.containerId;
    this.shellId = config.shellId;
    this.moduleMap = config.moduleMap;
    this.loaderColor = config.loaderColor || 'blue';
    this.moduleName = config.moduleName || 'Module';
    this.currentModule = null;
    this.currentContainer = null;
    this.currentRouteId = null; // 🔧 初始化
    this.isLoading = false; // 🔧 初始化
    this.pendingRouteId = null;
    this.loadSequence = 0;
    this.contentEnterAnimation = config.contentEnterAnimation || false;
    this.loadingTimer = null;
    this.loadingTimerLoadId = null;
    this.retryTimer = null;
    this.retryTimerLoadId = null;
    this.routeChangeHandler = null;
    this.moduleUnloadHandler = null;
    this.isDestroyed = false;

    // 🎯 DI容器注入（预留用于未来的模块工厂函数）
    // const diContainer = config.container || globalContainer;

    // 🎯 P1 优化：提取路由前缀用于快速过滤
    this.routePrefixes = this._extractRoutePrefixes();

    // 自动监听路由变化
    this._initRouteListener();
  }

  /**
   * 提取所有注册路由的前缀（用于快速过滤）
   * @returns 路由前缀集合
   * @private
   */
  private _extractRoutePrefixes(): Set<string> {
    const prefixes = new Set<string>();
    Object.keys(this.moduleMap).forEach(routeId => {
      // 提取前缀：例如 sops_overview -> sops, amz_hub_overview -> amz
      const prefix = routeId.split('_')[0];
      if (prefix) {
        prefixes.add(prefix);
      }
    });
    return prefixes;
  }

  /**
   * 快速检查路由是否可能匹配（基于前缀）
   * @param routeId - 路由ID
   * @returns 是否应该处理该路由
   * @private
   */
  private _shouldHandleRoute(routeId: string): boolean {
    const prefix = routeId.split('_')[0];
    return prefix ? this.routePrefixes.has(prefix) : false;
  }

  /**
   * 注册子模块（支持动态扩展）
   * @param routeId - 路由ID
   * @param loader - 动态导入函数
   */
  registerSubModule(routeId: string, loader: () => Promise<IModule>): void {
    this.moduleMap[routeId] = loader;
    const prefix = routeId.split('_')[0];
    if (prefix) {
      this.routePrefixes.add(prefix);
    }
  }

  /**
   * 等待容器渲染（解决竞态条件）
   * @param id - 容器元素ID
   * @param timeout - 超时时间（毫秒）
   * @returns 容器元素或null
   * @private
   */
  private _waitForContainer(id: string, timeout: number = 3000): Promise<HTMLElement | null> {
    return new Promise(resolve => {
      const el = document.getElementById(id);
      if (el) return resolve(el);

      const startTime = Date.now();
      const timer = setInterval(() => {
        const el = document.getElementById(id);
        if (el) {
          clearInterval(timer);
          resolve(el);
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(timer);
          resolve(null);
        }
      }, 50);
    });
  }

  /**
   * 卸载当前模块
   * @private
   */
  private _unmountCurrentModule(): void {
    this._clearDelayedLoading();
    this._clearRetry();
    if (this.currentModule && this.currentModule.unmount) {
      try {
        this.currentModule.unmount();
      } catch (unmountErr) {
        console.error(`[${this.moduleName}] 卸载模块时出错:`, unmountErr);
      }
    }
    if (this.currentContainer) {
      this.currentContainer.classList.remove(MODULE_LOADING_HOST_CLASS);
      this.currentContainer.replaceChildren();
    }
    this.currentModule = null;
    this.currentContainer = null;
    this.currentRouteId = null; // 🔧 清除路由ID记录
  }

  /**
   * 渲染加载动画
   * @param container - 容器元素
   * @private
   */
  private _renderLoading(container: HTMLElement, routeId: string): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'route-loading-skeleton';
    wrapper.setAttribute('role', 'status');
    wrapper.setAttribute('aria-live', 'polite');
    wrapper.setAttribute('aria-label', '页面加载中');
    wrapper.dataset.routeId = routeId;

    wrapper.appendChild(
      createSafeFragment(`
        <div class="route-loading-skeleton__card">
          <div class="route-loading-skeleton__header">
            <div class="loading-skeleton route-loading-skeleton__icon" aria-hidden="true"></div>
            <div class="route-loading-skeleton__heading">
              <div class="loading-skeleton route-loading-skeleton__line route-loading-skeleton__line--title"></div>
              <div class="loading-skeleton route-loading-skeleton__line route-loading-skeleton__line--subtitle"></div>
            </div>
          </div>
          <div class="route-loading-skeleton__grid">
            <div class="loading-skeleton route-loading-skeleton__block"></div>
            <div class="loading-skeleton route-loading-skeleton__block"></div>
            <div class="loading-skeleton route-loading-skeleton__block"></div>
            <div class="loading-skeleton route-loading-skeleton__block"></div>
          </div>
          <div class="route-loading-skeleton__table">
            <div class="loading-skeleton route-loading-skeleton__line route-loading-skeleton__line--wide"></div>
            <div class="loading-skeleton route-loading-skeleton__line"></div>
            <div class="loading-skeleton route-loading-skeleton__line"></div>
            <div class="loading-skeleton route-loading-skeleton__line"></div>
          </div>
          <span class="sr-only">页面加载中</span>
        </div>
      `)
    );

    container.classList.add(MODULE_LOADING_HOST_CLASS);
    container.replaceChildren(wrapper);
  }

  private _scheduleDelayedLoading(container: HTMLElement, loadId: number, routeId: string): void {
    this._clearDelayedLoading();
    this.loadingTimerLoadId = loadId;
    this.loadingTimer = window.setTimeout(() => {
      this.loadingTimer = null;
      this.loadingTimerLoadId = null;
      if (this._isStaleLoad(loadId) || !this.isLoading) {
        return;
      }

      this._renderLoading(container, routeId);
    }, MODULE_LOADING_DELAY_MS);
  }

  private _clearDelayedLoading(loadId?: number): void {
    if (loadId !== undefined && this.loadingTimerLoadId !== loadId) {
      return;
    }

    if (this.loadingTimer) {
      window.clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
      this.loadingTimerLoadId = null;
    }
  }

  private _clearRetry(loadId?: number): void {
    if (loadId !== undefined && this.retryTimerLoadId !== loadId) {
      return;
    }

    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.retryTimerLoadId = null;
    }
  }

  /**
   * 渲染未注册模块提示
   * @param container - 容器元素
   * @param routeId - 路由ID
   * @private
   */
  private _renderNotRegistered(container: HTMLElement, routeId: string): void {
    container.classList.remove(MODULE_LOADING_HOST_CLASS);
    renderNotRegistered(container, routeId);
  }

  /**
   * 渲染错误边界UI
   * @param container - 容器元素
   * @param routeId - 路由ID
   * @param error - 错误对象
   * @private
   */
  private _renderErrorBoundary(container: HTMLElement, routeId: string, error: Error): void {
    container.classList.remove(MODULE_LOADING_HOST_CLASS);
    renderErrorBoundary(container, error, {
      title: '模块加载失败',
      color: this.loaderColor,
      showReload: true,
      showRetry: true,
      onRetry: () => this.loadModule(routeId, 0),
    } as ErrorBoundaryOptions);
  }

  private _isStaleLoad(loadId: number): boolean {
    return loadId !== this.loadSequence;
  }

  private _shouldSkipLoad(routeId: string): boolean {
    if (this.isLoading && this.pendingRouteId === routeId) {
      return true;
    }

    if (this.currentRouteId === routeId && this.currentModule) {
      return true;
    }

    return false;
  }

  private _startLoad(routeId: string): number {
    this._clearRetry();
    const loadId = ++this.loadSequence;
    this.isLoading = true;
    this.pendingRouteId = routeId;
    return loadId;
  }

  private _cancelPendingLoad(): void {
    this.loadSequence += 1;
    this.isLoading = false;
    this.pendingRouteId = null;
    this._clearDelayedLoading();
    this._clearRetry();
  }

  private _clearLoading(loadId: number): void {
    this._clearDelayedLoading(loadId);
    if (this._isStaleLoad(loadId)) {
      return;
    }

    this.isLoading = false;
    this.pendingRouteId = null;
  }

  private async _prepareContainer(routeId: string, loadId: number): Promise<HTMLElement | null> {
    const container = await this._waitForContainer(this.containerId);

    if (this._isStaleLoad(loadId)) {
      return null;
    }

    if (!container) {
      console.error(`[${this.moduleName}] 容器 #${this.containerId} 未找到 (超时)`);
      const shell = document.getElementById(this.shellId);
      if (shell) {
        renderTimeout(shell);
      }
      return null;
    }

    if (this.currentRouteId !== routeId) {
      this._unmountCurrentModule();
    }

    this.currentContainer = container;
    this._clearContentEnterAnimation(container);
    this._scheduleDelayedLoading(container, loadId, routeId);
    return container;
  }

  private _getRegisteredLoader(
    container: HTMLElement,
    routeId: string
  ): (() => Promise<IModule>) | null {
    const loader = this.moduleMap[routeId];
    if (!loader) {
      this._clearDelayedLoading();
      this._renderNotRegistered(container, routeId);
      return null;
    }

    return loader;
  }

  private _prepareContainerForMount(container: HTMLElement): void {
    this._clearDelayedLoading();
    this._clearContentEnterAnimation(container);
    container.classList.remove(MODULE_LOADING_HOST_CLASS);
    container.replaceChildren();
    this._prepareContentEnterAnimation(container);
    void container.offsetHeight;
  }

  private _clearContentEnterAnimation(container: HTMLElement): void {
    if (!this.contentEnterAnimation) {
      return;
    }

    clearPageEnterAnimation(container);
    container.classList.remove(LEGACY_CONTENT_ENTER_ANIMATION_CLASS);
  }

  private _applyContentEnterAnimation(container: HTMLElement): void {
    if (!this.contentEnterAnimation) {
      return;
    }

    container.classList.remove(LEGACY_CONTENT_ENTER_ANIMATION_CLASS);
    applyPageEnterAnimation(container);
  }

  private _prepareContentEnterAnimation(container: HTMLElement): void {
    if (!this.contentEnterAnimation) {
      return;
    }

    preparePageEnterAnimation(container);
  }

  private _renderRetryLoading(container: HTMLElement): void {
    container.classList.remove(MODULE_LOADING_HOST_CLASS);
    const wrapper = document.createElement('div');
    wrapper.className = 'p-10 text-center';

    const icon = document.createElement('i');
    icon.className = 'fas fa-circle-notch fa-spin text-orange-500';

    const message = document.createElement('span');
    message.className = 'ml-2 text-slate-500';
    message.textContent = '连接超时，正在重试...';

    wrapper.append(icon, message);
    container.replaceChildren(wrapper);
  }

  private async _mountLoadedModule(
    module: IModule,
    container: HTMLElement,
    routeId: string,
    loadId: number
  ): Promise<void> {
    if (!module.mount) {
      throw new ValidationError(
        `模块接口不完整: 缺少 mount() 函数`,
        'MODULE_INVALID_INTERFACE',
        'module',
        module,
        { module: 'ModuleLoader', action: 'loadModule', routeId, moduleName: this.moduleName }
      );
    }

    await module.mount(container);

    if (this._isStaleLoad(loadId)) {
      if (module.unmount) {
        module.unmount();
      }
      return;
    }

    this.currentModule = module;
    this.currentRouteId = routeId;
    this._applyContentEnterAnimation(container);
  }

  private async _scheduleRetry(routeId: string, retryCount: number, loadId: number): Promise<void> {
    const container = await this._waitForContainer(this.containerId);
    if (this._isStaleLoad(loadId)) {
      return;
    }

    if (container) {
      this._clearDelayedLoading(loadId);
      this._clearContentEnterAnimation(container);
      this._renderRetryLoading(container);
    }

    this.retryTimerLoadId = loadId;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.retryTimerLoadId = null;
      if (!this.isDestroyed && !this._isStaleLoad(loadId)) {
        this.loadModule(routeId, retryCount + 1);
      }
    }, 1000);
  }

  private async _handleLoadError(
    routeId: string,
    retryCount: number,
    loadId: number,
    err: unknown
  ): Promise<void> {
    if (this._isStaleLoad(loadId)) {
      return;
    }

    console.error(`[${this.moduleName}] 加载子模块失败 (重试 ${retryCount}):`, err);

    if (retryCount < 1) {
      await this._scheduleRetry(routeId, retryCount, loadId);
      return;
    }

    const container = await this._waitForContainer(this.containerId);
    if (this._isStaleLoad(loadId)) {
      return;
    }
    if (container) {
      this._clearDelayedLoading(loadId);
      this._clearContentEnterAnimation(container);
      this._renderErrorBoundary(container, routeId, err as Error);
    }
  }

  /**
   * 加载子模块（核心方法）
   * @param routeId - 路由ID
   * @param retryCount - 重试次数
   */
  async loadModule(routeId: string, retryCount: number = 0): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    if (this._shouldSkipLoad(routeId)) {
      return;
    }

    const loadId = this._startLoad(routeId);

    try {
      const container = await this._prepareContainer(routeId, loadId);
      if (!container) {
        return;
      }

      const loader = this._getRegisteredLoader(container, routeId);
      if (!loader) {
        return;
      }

      const module = await this._measureModuleLoad(routeId, loader);

      if (this._isStaleLoad(loadId)) {
        return;
      }

      this._prepareContainerForMount(container);
      await this._mountLoadedModule(module, container, routeId, loadId);
    } catch (err) {
      await this._handleLoadError(routeId, retryCount, loadId, err);
    } finally {
      this._clearLoading(loadId);
    }
  }

  /**
   * 测量模块加载时间（集成性能监控）
   * @param routeId - 路由ID
   * @param loader - 加载函数
   * @returns 加载的模块
   * @private
   */
  private async _measureModuleLoad(
    routeId: string,
    loader: () => Promise<IModule>
  ): Promise<IModule> {
    // 动态导入性能服务（避免循环依赖）
    try {
      const { performanceService } = await import('@/services/performanceService');
      return await performanceService.measureModuleLoad(routeId, loader);
    } catch (e) {
      // 如果性能服务不可用，直接加载模块
      return await loader();
    }
  }

  /**
   * 初始化路由监听器
   * @private
   */
  private _initRouteListener(): void {
    // 监听路由变化事件
    this.routeChangeHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { routeId } = customEvent.detail;

      // 🎯 P1 优化：快速前缀过滤，避免无效处理
      if (!this._shouldHandleRoute(routeId)) {
        return; // 前缀不匹配，直接跳过
      }

      // 只处理在moduleMap中注册的路由
      if (this.moduleMap[routeId]) {
        // 确保Shell已经存在
        const shell = document.getElementById(this.shellId);
        if (!shell) {
          console.error(`⚠️ [${this.moduleName}] Shell 容器 #${this.shellId} 未找到`);
          return;
        }

        // 加载子模块
        void this.loadModule(routeId);
      }
    };
    window.addEventListener(APP_EVENTS.ROUTE_CHANGED, this.routeChangeHandler);

    // 监听主模块卸载事件
    this.moduleUnloadHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { panelId } = customEvent.detail;

      // 只处理当前模块的卸载
      if (panelId === this.shellId) {
        this._cancelPendingLoad();
        this._unmountCurrentModule();
      }
    };
    window.addEventListener(APP_EVENTS.MODULE_UNLOAD, this.moduleUnloadHandler);
  }

  /**
   * 销毁加载器（清理资源）
   */
  destroy(): void {
    this.isDestroyed = true;
    this._cancelPendingLoad();
    this._unmountCurrentModule();
    if (this.routeChangeHandler) {
      window.removeEventListener(APP_EVENTS.ROUTE_CHANGED, this.routeChangeHandler);
      this.routeChangeHandler = null;
    }
    if (this.moduleUnloadHandler) {
      window.removeEventListener(APP_EVENTS.MODULE_UNLOAD, this.moduleUnloadHandler);
      this.moduleUnloadHandler = null;
    }
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建模块加载器的工厂函数
 * @param config - 配置对象
 * @returns 模块加载器实例
 */
export function createModuleLoader(config: ModuleLoaderConfig): ModuleLoader {
  return new ModuleLoader(config);
}

// 默认导出
export default ModuleLoader;
