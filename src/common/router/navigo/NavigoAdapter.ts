/**
 * NavigoAdapter.ts - Navigo 路由适配器
 *
 * 封装 Navigo 库，提供统一的路由 API
 * 负责路由注册、导航、守卫执行、中间件管理等核心功能
 */

import Navigo from 'navigo';
import type {
  Route,
  RouteConfig,
  RouterConfig,
  NavigateOptions,
  RouteHistory,
  RouteGuard,
  RouteMiddleware,
  PreloadOptions,
} from './types';
import { isRouteConfig, isNavigateOptions } from './guards';
import { GuardManager } from './GuardManager';
import { builtinGuardList } from './builtinGuards';
import { MiddlewareManager } from './MiddlewareManager';
import { ParamParser } from './ParamParser';
import { PreloadManager } from './PreloadManager';
import { ErrorHandler } from './ErrorHandler';
import type { RouterStoreSync } from './RouterStore';

import { ValidationError } from '@/common/errors/AppError';

type NavigationTarget = {
  normalizedPath: string;
  to: Route;
  from: Route | null;
};

type NavigationGuardOutcome = {
  allowed: boolean;
  redirect?: string;
};

/**
 * Navigo 路由适配器
 *
 * 提供类型安全的路由管理功能，封装 Navigo 的底层实现
 */
export class NavigoAdapter {
  /** Navigo 实例 */
  private navigo: Navigo;

  /** 守卫管理器 */
  private guardManager: GuardManager;

  /** 中间件管理器 */
  private middlewareManager: MiddlewareManager;

  /** 参数解析器 */
  private paramParser: ParamParser;

  /** 预加载管理器 */
  private preloadManager: PreloadManager;

  /** 错误处理器 */
  private errorHandler: ErrorHandler;

  /** Store 同步器（可选） */
  private storeSync?: RouterStoreSync;

  /** 路由配置映射表 */
  private routes: Map<string, RouteConfig>;

  /** 路由别名映射表 */
  private aliases: Map<string, string>;

  /** 当前路由 */
  private currentRoute: Route | null;

  /** 路由历史记录 */
  private history: RouteHistory[];

  /** 最大历史记录数 */
  private maxHistorySize: number;

  /** 是否正在导航 */
  private isNavigating: boolean;

  /** 路由系统配置 */
  private config: RouterConfig;

  /**
   * 构造函数
   *
   * @param config - 路由系统配置
   */
  constructor(config: RouterConfig = {}) {
    this.config = {
      root: config.root || '/',
      useHash: config.useHash !== undefined ? config.useHash : true,
      hash: config.hash || '#',
      enableLogging: config.enableLogging || false,
      maxHistorySize: config.maxHistorySize || 50,
      defaultRoute: config.defaultRoute,
      notFoundRoute: config.notFoundRoute,
    };

    // 初始化 Navigo
    this.navigo = new Navigo(this.config.root || '/', {
      hash: this.config.useHash,
      strategy: 'ONE',
    });

    // 初始化守卫管理器
    this.guardManager = new GuardManager(this.config.enableLogging);

    // 初始化中间件管理器
    this.middlewareManager = new MiddlewareManager(this.config.enableLogging);

    // 初始化参数解析器
    this.paramParser = new ParamParser();

    // 初始化预加载管理器
    this.preloadManager = new PreloadManager({
      enableLogging: this.config.enableLogging,
      maxCacheSize: 20,
      maxConcurrent: 3,
    });

    // 初始化错误处理器
    this.errorHandler = new ErrorHandler({
      enableLogging: this.config.enableLogging,
      notFoundRoute: this.config.notFoundRoute,
      errorRoute: '/error',
    });

    // 注册内置守卫
    this._registerBuiltinGuards();

    // 初始化状态
    this.routes = new Map();
    this.aliases = new Map();
    this.currentRoute = null;
    this.history = [];
    this.maxHistorySize = this.config.maxHistorySize || 50;
    this.isNavigating = false;

    this._log('NavigoAdapter initialized', this.config);
  }

  // ==================== 路由注册 ====================

  /**
   * 注册单个路由
   *
   * @param path - 路由路径
   * @param config - 路由配置
   * @throws {Error} 如果路由配置无效
   *
   * @example
   * ```typescript
   * adapter.register('/home', {
   *   moduleId: 'home',
   *   label: '首页',
   *   icon: 'fas fa-home',
   *   panelId: 'panel-home'
   * });
   * ```
   */
  register(path: string, config: RouteConfig): void {
    // 验证配置
    if (!isRouteConfig(config)) {
      throw new ValidationError(
        `Invalid route config for path: ${path}`,
        'INVALID_ROUTE_CONFIG',
        'config',
        config
      );
    }

    // 标准化路径
    const normalizedPath = this._normalizePath(path);

    // 存储配置
    this.routes.set(normalizedPath, config);

    // 向 Navigo 注册路由处理器
    this.navigo.on(normalizedPath, async () => {
      // 使用 navigate 方法处理路由
      await this.navigate(normalizedPath, {
        updateHistory: false, // 已经由 Navigo 处理了历史记录
        skipMiddleware: false,
      });
    });

    this._log(`Route registered: ${normalizedPath}`, config);
  }

  /**
   * 批量注册路由
   *
   * @param routes - 路由配置对象
   *
   * @example
   * ```typescript
   * adapter.registerRoutes({
   *   '/home': homeConfig,
   *   '/about': aboutConfig
   * });
   * ```
   */
  registerRoutes(routes: Record<string, RouteConfig>): void {
    for (const [path, config] of Object.entries(routes)) {
      this.register(path, config);
    }

    this._log(`Registered ${Object.keys(routes).length} routes`);
  }

  /**
   * 注册路由别名
   *
   * @param alias - 别名路径
   * @param target - 目标路径
   *
   * @example
   * ```typescript
   * adapter.registerAlias('/amz_hub', '/amz_hub/overview');
   * ```
   */
  registerAlias(alias: string, target: string): void {
    const normalizedAlias = this._normalizePath(alias);
    const normalizedTarget = this._normalizePath(target);

    this.aliases.set(normalizedAlias, normalizedTarget);

    this._log(`Alias registered: ${normalizedAlias} -> ${normalizedTarget}`);
  }

  // ==================== 导航方法 ====================

  /**
   * 导航到指定路由
   *
   * @param path - 目标路径
   * @param options - 导航选项
   * @returns Promise<boolean> - 导航是否成功
   *
   * @example
   * ```typescript
   * await adapter.navigate('/home');
   * await adapter.navigate('/app-center/scraper', { replace: true });
   * ```
   */
  async navigate(path: string, options: NavigateOptions = {}): Promise<boolean> {
    this._logNavigationRequest(path, options);
    this._assertNavigateOptions(options);

    if (!this._startNavigation()) return false;

    try {
      const target = this._createNavigationTarget(path, options);
      if (!target) return false;

      const { to, from, normalizedPath } = target;
      if (!(await this._runBeforeNavigation(to, from, options))) return false;

      const guardOutcome = await this._runNavigationGuards(to, from, options);
      if (!guardOutcome.allowed) {
        return guardOutcome.redirect
          ? this.navigate(guardOutcome.redirect, { ...options, skipGuards: false })
          : false;
      }

      this._commitNavigation(to, normalizedPath, options);
      await this._runAfterNavigation(to, from, options);
      this._logNavigationComplete(from, normalizedPath);
      return true;
    } catch (error) {
      return this._handleNavigationError(error);
    } finally {
      this._finishNavigation();
    }
  }

  private _logNavigationRequest(path: string, options: NavigateOptions): void {
    this._log(`navigate() called with path: ${path}`, options);
  }

  private _assertNavigateOptions(options: NavigateOptions): void {
    if (isNavigateOptions(options)) return;
    throw new ValidationError(
      'Invalid navigate options',
      'INVALID_NAVIGATE_OPTIONS',
      'options',
      options
    );
  }

  private _startNavigation(): boolean {
    if (this.isNavigating) {
      this._log('Navigation in progress, skipping');
      return false;
    }

    this.isNavigating = true;
    this._log('isNavigating set to true');
    return true;
  }

  private _createNavigationTarget(path: string, options: NavigateOptions): NavigationTarget | null {
    const resolvedPath = this._resolveAlias(path);
    this._log(`Resolved path: ${resolvedPath}`);

    const normalizedPath = this._normalizePath(resolvedPath);
    this._log(`Normalized path: ${normalizedPath}`);

    const config = this.routes.get(normalizedPath);
    if (!config) {
      this._log(`Route not found: ${normalizedPath}`, undefined, 'error');
      return null;
    }
    this._log('Route config found', config);

    const currentUrl = window.location.href;
    const parsedParams = this.paramParser.parseUrl(currentUrl, null, config.params);
    if (parsedParams.errors.length > 0) {
      this._log(
        `Parameter validation errors: ${parsedParams.errors.join(', ')}`,
        undefined,
        'error'
      );
    }

    return {
      normalizedPath,
      from: this.currentRoute,
      to: {
        path: normalizedPath,
        params: parsedParams.path,
        query: parsedParams.query,
        config,
        state: options.state,
        url: currentUrl,
      },
    };
  }

  private async _runBeforeNavigation(
    to: Route,
    from: Route | null,
    options: NavigateOptions
  ): Promise<boolean> {
    if (options.skipMiddleware) return true;
    this._log('Running before middleware...');

    const middlewareResult = await this.middlewareManager.runBefore(to, from);
    if (!middlewareResult) {
      this._log('Navigation blocked by middleware', undefined, 'warn');
      return false;
    }

    this._log('Before middleware passed');
    return true;
  }

  private async _runNavigationGuards(
    to: Route,
    from: Route | null,
    options: NavigateOptions
  ): Promise<NavigationGuardOutcome> {
    if (options.skipGuards) return { allowed: true };
    this._log('Running guards...');

    const guardResult = await this.guardManager.runGuards(to, from);
    if (guardResult.allowed) {
      this._log('Guards passed');
      return { allowed: true };
    }

    this._log(`Navigation blocked by guard: ${guardResult.reason}`, undefined, 'warn');

    if (guardResult.redirect) {
      this._log(`Redirecting to: ${guardResult.redirect}`);
      return { allowed: false, redirect: guardResult.redirect };
    }

    return { allowed: false };
  }

  private _commitNavigation(to: Route, normalizedPath: string, options: NavigateOptions): void {
    this._log('Updating current route');
    this.currentRoute = to;
    this._syncCurrentRoute(to);
    this._recordNavigationHistory(to);
    this._updateBrowserHistory(normalizedPath, options);
  }

  private _syncCurrentRoute(to: Route): void {
    if (!this.storeSync) return;
    this._log('Syncing to store');
    this.storeSync.syncCurrentRoute(to);
  }

  private _recordNavigationHistory(to: Route): void {
    this._log('Recording history');
    this._recordHistory(to);
  }

  private _updateBrowserHistory(normalizedPath: string, options: NavigateOptions): void {
    if (options.updateHistory === false) return;
    this._log('Updating browser history');

    if (options.replace) {
      this.navigo.navigate(normalizedPath, { historyAPIMethod: 'replaceState' });
      return;
    }
    this.navigo.navigate(normalizedPath);
  }

  private async _runAfterNavigation(
    to: Route,
    from: Route | null,
    options: NavigateOptions
  ): Promise<void> {
    if (options.skipMiddleware) return;
    this._log('Running after middleware...');
    await this.middlewareManager.runAfter(to, from);
    this._log('After middleware completed');
  }

  private _logNavigationComplete(from: Route | null, normalizedPath: string): void {
    this._log(`Navigated: ${from?.path || 'null'} -> ${normalizedPath}`);
  }

  private _handleNavigationError(error: unknown): boolean {
    this._log(`Navigation error: ${(error as Error).message}`, error, 'error');

    if (this.storeSync) {
      this.storeSync.syncError(error as Error);
    }

    return false;
  }

  private _finishNavigation(): void {
    this._log('isNavigating set to false');
    this.isNavigating = false;

    if (this.storeSync) {
      this.storeSync.syncNavigating(false);
    }
  }

  /**
   * 后退
   */
  back(): void {
    window.history.back();
    this._log('Navigate back');
  }

  /**
   * 前进
   */
  forward(): void {
    window.history.forward();
    this._log('Navigate forward');
  }

  /**
   * 跳转到历史记录中的特定位置
   *
   * @param delta - 相对当前位置的偏移量
   */
  go(delta: number): void {
    window.history.go(delta);
    this._log(`Navigate go(${delta})`);
  }

  // ==================== 守卫管理 ====================

  /**
   * 添加全局守卫
   *
   * @param guard - 路由守卫
   */
  addGuard(guard: RouteGuard): void {
    this.guardManager.addGlobalGuard(guard);
  }

  /**
   * 移除全局守卫
   *
   * @param name - 守卫名称
   * @returns 是否成功移除
   */
  removeGuard(name: string): boolean {
    return this.guardManager.removeGlobalGuard(name);
  }

  /**
   * 添加路由级守卫
   *
   * @param path - 路由路径
   * @param guard - 路由守卫
   */
  addRouteGuard(path: string, guard: RouteGuard): void {
    const normalizedPath = this._normalizePath(path);
    this.guardManager.addRouteGuard(normalizedPath, guard);
  }

  /**
   * 获取守卫管理器
   *
   * @returns GuardManager 实例
   */
  getGuardManager(): GuardManager {
    return this.guardManager;
  }

  // ==================== 中间件管理 ====================

  /**
   * 添加 before 中间件
   *
   * @param middleware - 路由中间件
   */
  use(middleware: RouteMiddleware): void {
    this.middlewareManager.addBefore(middleware);
  }

  /**
   * 添加 after 中间件
   *
   * @param middleware - 路由中间件
   */
  useAfter(middleware: RouteMiddleware): void {
    this.middlewareManager.addAfter(middleware);
  }

  /**
   * 获取中间件管理器
   *
   * @returns MiddlewareManager 实例
   */
  getMiddlewareManager(): MiddlewareManager {
    return this.middlewareManager;
  }

  /**
   * 获取参数解析器
   *
   * @returns ParamParser 实例
   */
  getParamParser(): ParamParser {
    return this.paramParser;
  }

  /**
   * 获取预加载管理器
   *
   * @returns PreloadManager 实例
   */
  getPreloadManager(): PreloadManager {
    return this.preloadManager;
  }

  /**
   * 获取错误处理器
   *
   * @returns ErrorHandler 实例
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 设置 Store 同步器
   *
   * @param storeSync - Store 同步器实例
   */
  setStoreSync(storeSync: RouterStoreSync): void {
    this.storeSync = storeSync;
    this._log('Store sync enabled');
  }

  /**
   * 预加载路由
   *
   * @param path - 路由路径
   * @param options - 预加载选项
   * @returns Promise<boolean> - 是否成功
   */
  async preloadRoute(path: string, options?: PreloadOptions): Promise<boolean> {
    const normalizedPath = this._normalizePath(path);
    const config = this.routes.get(normalizedPath);

    if (!config) {
      this._log(`Cannot preload: route not found: ${normalizedPath}`, undefined, 'warn');
      return false;
    }

    return this.preloadManager.preload(normalizedPath, config, options);
  }

  // ==================== 查询方法 ====================

  /**
   * 获取当前路由
   *
   * @returns 当前路由对象，如果没有则返回 null
   */
  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * 获取路由历史记录
   *
   * @returns 历史记录数组（副本）
   */
  getHistory(): RouteHistory[] {
    return [...this.history];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
    this._log('History cleared');
  }

  /**
   * 获取路由配置
   *
   * @param path - 路由路径
   * @returns 路由配置，如果不存在则返回 null
   */
  getRouteConfig(path: string): RouteConfig | null {
    const normalizedPath = this._normalizePath(path);
    return this.routes.get(normalizedPath) || null;
  }

  /**
   * 检查路由是否存在
   *
   * @param path - 路由路径
   * @returns 路由是否存在
   */
  hasRoute(path: string): boolean {
    const normalizedPath = this._normalizePath(path);
    return this.routes.has(normalizedPath);
  }

  /**
   * 获取所有已注册的路由路径
   *
   * @returns 路由路径数组
   */
  getAllRoutes(): string[] {
    return Array.from(this.routes.keys());
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动路由系统
   *
   * 解析当前 URL 并执行初始导航
   */
  resolve(): void {
    this.navigo.resolve();
    this._log('Router resolved');
  }

  /**
   * 销毁路由系统
   *
   * 清理所有监听器和状态
   */
  destroy(): void {
    this.navigo.destroy();
    this.preloadManager.destroy();
    this.routes.clear();
    this.aliases.clear();
    this.history = [];
    this.currentRoute = null;

    if (this.storeSync) {
      this.storeSync.destroy();
    }

    this._log('Router destroyed');
  }

  // ==================== 私有方法 ====================

  /**
   * 注册内置守卫
   */
  private _registerBuiltinGuards(): void {
    for (const guard of builtinGuardList) {
      this.guardManager.addGlobalGuard(guard);
    }

    this._log(`Registered ${builtinGuardList.length} builtin guards`);
  }

  /**
   * 标准化路径
   *
   * @param path - 原始路径
   * @returns 标准化后的路径
   */
  private _normalizePath(path: string): string {
    // 移除开头的 hash 符号
    let normalized = path.replace(/^#/, '');

    // 确保以 / 开头
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    // 移除末尾的 /（除非是根路径）
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }

  /**
   * 解析路由别名
   *
   * @param path - 原始路径
   * @returns 解析后的路径
   */
  private _resolveAlias(path: string): string {
    const normalizedPath = this._normalizePath(path);
    return this.aliases.get(normalizedPath) || normalizedPath;
  }

  /**
   * 记录历史
   *
   * @param route - 路由对象
   */
  private _recordHistory(route: Route): void {
    const historyItem: RouteHistory = {
      ...route,
      timestamp: Date.now(),
    };

    this.history.push(historyItem);

    // 同步到 Store
    if (this.storeSync) {
      this.storeSync.syncHistory(historyItem);
    }

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 日志输出
   *
   * @param message - 日志消息
   * @param data - 附加数据
   * @param level - 日志级别
   */
  private _log(message: string, data?: unknown, level: 'log' | 'error' | 'warn' = 'log'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[NavigoAdapter]';

    if (data !== undefined) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }
}

/**
 * 创建路由适配器实例
 *
 * @param config - 路由系统配置
 * @returns NavigoAdapter 实例
 */
export function createRouter(config?: RouterConfig): NavigoAdapter {
  return new NavigoAdapter(config);
}
