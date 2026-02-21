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
  renderLoading,
  renderNotRegistered,
  renderTimeout
} from '../../components/ErrorBoundary';
import { Logger } from '../../services/loggerService';
import type { DIContainer } from '../di/Container';

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
  private routePrefixes: Set<string>;

  constructor(config: ModuleLoaderConfig) {
    this.containerId = config.containerId;
    this.shellId = config.shellId;
    this.moduleMap = config.moduleMap;
    this.loaderColor = config.loaderColor || 'blue';
    this.moduleName = config.moduleName || 'Module';
    this.currentModule = null;
    
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
    if (this.moduleMap[routeId]) {
      console.warn(`[${this.moduleName}] 覆盖已存在的子模块: ${routeId}`);
    }
    this.moduleMap[routeId] = loader;
    console.log(`[${this.moduleName}] 注册子模块: ${routeId}`);
  }

  /**
   * 等待容器渲染（解决竞态条件）
   * @param id - 容器元素ID
   * @param timeout - 超时时间（毫秒）
   * @returns 容器元素或null
   * @private
   */
  private _waitForContainer(id: string, timeout: number = 3000): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
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
    if (this.currentModule && this.currentModule.unmount) {
      try {
        console.log(`[${this.moduleName}] 🔄 卸载旧模块`);
        this.currentModule.unmount();
      } catch (unmountErr) {
        console.warn(`[${this.moduleName}] 卸载模块时出错:`, unmountErr);
      }
    }
    this.currentModule = null;
  }

  /**
   * 渲染加载动画
   * @param container - 容器元素
   * @private
   */
  private _renderLoading(container: HTMLElement): void {
    renderLoading(container, this.loaderColor, 'Loading module...');
  }

  /**
   * 渲染未注册模块提示
   * @param container - 容器元素
   * @param routeId - 路由ID
   * @private
   */
  private _renderNotRegistered(container: HTMLElement, routeId: string): void {
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
    renderErrorBoundary(container, error, {
      title: '模块加载失败',
      color: this.loaderColor,
      showReload: true,
      showRetry: true,
      onRetry: () => this.loadModule(routeId, 0)
    } as ErrorBoundaryOptions);
  }

  /**
   * 加载子模块（核心方法）
   * @param routeId - 路由ID
   * @param retryCount - 重试次数
   */
  async loadModule(routeId: string, retryCount: number = 0): Promise<void> {
    console.log(`[${this.moduleName}] 🔄 开始加载子模块: ${routeId}`);

    // 1. 等待容器渲染
    const container = await this._waitForContainer(this.containerId);

    if (!container) {
      console.error(`[${this.moduleName}] 容器 #${this.containerId} 未找到 (超时)`);
      const shell = document.getElementById(this.shellId);
      if (shell) {
        renderTimeout(shell);
      }
      return;
    }

    // 2. 卸载旧模块
    this._unmountCurrentModule();

    // 3. 显示加载动画
    this._renderLoading(container);

    // 4. 检查模块是否注册
    const loader = this.moduleMap[routeId];
    if (!loader) {
      this._renderNotRegistered(container, routeId);
      return;
    }

    try {
      // 5. 动态导入模块（集成性能监控）
      console.log(`[${this.moduleName}] 📦 动态导入模块: ${routeId}`);
      
      // 🎯 阶段1: 性能监控 - 测量模块加载时间
      const module = await this._measureModuleLoad(routeId, loader);

      // 6. 挂载新模块
      if (module.mount) {
        console.log(`[${this.moduleName}] 🔧 挂载新模块: ${routeId}`);
        
        // 🎯 如果模块支持容器注入，尝试注入
        if (this._supportsContainerInjection(module)) {
          console.log(`[${this.moduleName}] 💉 模块支持DI容器注入`);
          // 注意：这里假设模块已经在构造时接收了容器
          // 如果需要在mount时注入，需要修改IModule接口
        }
        
        await module.mount(container);
        this.currentModule = module;
        console.log(`[${this.moduleName}] ✅ 子模块加载成功: ${routeId}`);
      } else {
        throw new Error(`模块接口不完整: 缺少 mount() 函数`);
      }
    } catch (err) {
      console.error(`[${this.moduleName}] 加载子模块失败 (重试 ${retryCount}):`, err);

      // 7. 自动重试机制（最多1次）
      if (retryCount < 1) {
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = `
          <div class="p-10 text-center">
            <i class="fas fa-circle-notch fa-spin text-orange-500"></i>
            <span class="ml-2 text-slate-500">连接超时，正在重试...</span>
          </div>
        `;
        setTimeout(() => this.loadModule(routeId, retryCount + 1), 1000);
        return;
      }

      // 8. 渲染错误边界
      this._renderErrorBoundary(container, routeId, err as Error);
    }
  }

  /**
   * 检查模块是否支持容器注入
   * @param module - 模块实例
   * @returns 是否支持容器注入
   * @private
   */
  private _supportsContainerInjection(module: IModule): boolean {
    // 检查模块是否有diContainer属性（BaseModule/StandardModule）
    return 'diContainer' in module;
  }

  /**
   * 测量模块加载时间（集成性能监控）
   * @param routeId - 路由ID
   * @param loader - 加载函数
   * @returns 加载的模块
   * @private
   */
  private async _measureModuleLoad(routeId: string, loader: () => Promise<IModule>): Promise<IModule> {
    // 动态导入性能服务（避免循环依赖）
    try {
      const { performanceService } = await import('../../services/performanceService');
      return await performanceService.measureModuleLoad(routeId, loader);
    } catch (e) {
      // 如果性能服务不可用，直接加载模块
      Logger.debug('性能监控不可用，直接加载模块', {}, this.moduleName);
      return await loader();
    }
  }

  /**
   * 初始化路由监听器
   * @private
   */
  private _initRouteListener(): void {
    // 监听路由变化事件
    window.addEventListener(APP_EVENTS.ROUTE_CHANGED, async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { routeId, config } = customEvent.detail;

      // 🎯 P1 优化：快速前缀过滤，避免无效处理
      if (!this._shouldHandleRoute(routeId)) {
        return; // 前缀不匹配，直接跳过
      }

      console.log(`📡 [${this.moduleName} 调试] 收到路由: ${routeId}, 模块ID: ${config?.module?.id}`);

      // 只处理在moduleMap中注册的路由
      if (this.moduleMap[routeId]) {
        console.log(`✅ [${this.moduleName}] 匹配成功，准备加载子模块: ${routeId}`);

        // 确保Shell已经存在
        const shell = document.getElementById(this.shellId);
        if (!shell) {
          console.warn(`⚠️ [${this.moduleName}] Shell 容器 #${this.shellId} 未找到`);
          return;
        }

        // 加载子模块
        await this.loadModule(routeId);
      }
    });

    // 监听主模块卸载事件
    window.addEventListener(APP_EVENTS.MODULE_UNLOAD, (e: Event) => {
      const customEvent = e as CustomEvent;
      const { panelId } = customEvent.detail;
      
      // 只处理当前模块的卸载
      if (panelId === this.shellId) {
        console.log(`[${this.moduleName}] 🔄 收到模块卸载请求，开始清理子模块`);
        this._unmountCurrentModule();
      }
    });

    console.log(`✅ [${this.moduleName}] 路由监听器已初始化 (前缀: ${Array.from(this.routePrefixes).join(', ')})`);
  }

  /**
   * 销毁加载器（清理资源）
   */
  destroy(): void {
    this._unmountCurrentModule();
    console.log(`✅ [${this.moduleName}] 加载器已销毁`);
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
