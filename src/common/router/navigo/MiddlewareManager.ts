/**
 * MiddlewareManager.ts - 路由中间件管理器
 *
 * 负责管理和执行路由中间件
 * 支持 before 和 after 中间件
 */

import type { Route, RouteMiddleware, RouteContext } from './types';
import { isRouteMiddleware } from './guards';
import { ValidationError } from '@/common/errors/AppError';

/**
 * 中间件管理器
 *
 * 管理路由中间件的注册和执行
 */
export class MiddlewareManager {
  /** Before 中间件列表 */
  private beforeMiddlewares: RouteMiddleware[];

  /** After 中间件列表 */
  private afterMiddlewares: RouteMiddleware[];

  /** 是否启用日志 */
  private enableLogging: boolean;

  /**
   * 构造函数
   *
   * @param enableLogging - 是否启用日志
   */
  constructor(enableLogging: boolean = false) {
    this.beforeMiddlewares = [];
    this.afterMiddlewares = [];
    this.enableLogging = enableLogging;

    this._log('MiddlewareManager initialized');
  }

  // ==================== 中间件注册 ====================

  /**
   * 添加 before 中间件
   *
   * @param middleware - 路由中间件
   * @throws {ValidationError} 如果中间件无效
   */
  addBefore(middleware: RouteMiddleware): void {
    if (!isRouteMiddleware(middleware)) {
      throw new ValidationError(
        'Invalid middleware',
        'ROUTER_INVALID_MIDDLEWARE',
        'middleware',
        typeof middleware,
        { module: 'MiddlewareManager', action: 'addBefore' }
      );
    }

    this.beforeMiddlewares.push(middleware);
    this._log(`Before middleware added (total: ${this.beforeMiddlewares.length})`);
  }

  /**
   * 添加 after 中间件
   *
   * @param middleware - 路由中间件
   * @throws {ValidationError} 如果中间件无效
   */
  addAfter(middleware: RouteMiddleware): void {
    if (!isRouteMiddleware(middleware)) {
      throw new ValidationError(
        'Invalid middleware',
        'ROUTER_INVALID_MIDDLEWARE',
        'middleware',
        typeof middleware,
        { module: 'MiddlewareManager', action: 'addAfter' }
      );
    }

    this.afterMiddlewares.push(middleware);
    this._log(`After middleware added (total: ${this.afterMiddlewares.length})`);
  }

  /**
   * 清空所有中间件
   */
  clear(): void {
    this.beforeMiddlewares = [];
    this.afterMiddlewares = [];
    this._log('All middlewares cleared');
  }

  // ==================== 中间件执行 ====================

  /**
   * 执行 before 中间件
   *
   * @param to - 目标路由
   * @param from - 来源路由
   * @returns 是否继续导航
   */
  async runBefore(to: Route, from: Route | null): Promise<boolean> {
    if (this.beforeMiddlewares.length === 0) {
      return true;
    }

    this._log(`Running ${this.beforeMiddlewares.length} before middlewares`);

    let aborted = false;
    let redirectPath: string | null = null;

    const context: RouteContext = {
      to,
      from,
      abort: () => {
        aborted = true;
      },
      redirect: (path: string) => {
        redirectPath = path;
      },
    };

    try {
      await this._runMiddlewareChain(this.beforeMiddlewares, context);

      if (aborted) {
        this._log('Navigation aborted by middleware', 'warn');
        return false;
      }

      if (redirectPath) {
        this._log(`Middleware requested redirect to: ${redirectPath}`);
        // 重定向将由 NavigoAdapter 处理
        return false;
      }

      return true;
    } catch (error) {
      this._log(`Before middleware error: ${(error as Error).message}`, 'error');
      return false;
    }
  }

  /**
   * 执行 after 中间件
   *
   * @param to - 目标路由
   * @param from - 来源路由
   */
  async runAfter(to: Route, from: Route | null): Promise<void> {
    if (this.afterMiddlewares.length === 0) {
      return;
    }

    this._log(`Running ${this.afterMiddlewares.length} after middlewares`);

    const context: RouteContext = {
      to,
      from,
      abort: () => {
        // After 中间件不能中止导航
        this._log('abort() called in after middleware (ignored)', 'warn');
      },
      redirect: () => {
        // After 中间件不能重定向
        this._log('redirect() called in after middleware (ignored)', 'warn');
      },
    };

    try {
      await this._runMiddlewareChain(this.afterMiddlewares, context);
    } catch (error) {
      this._log(`After middleware error: ${(error as Error).message}`, 'error');
    }
  }

  /**
   * 执行中间件链
   *
   * @param middlewares - 中间件列表
   * @param context - 路由上下文
   */
  private async _runMiddlewareChain(
    middlewares: RouteMiddleware[],
    context: RouteContext
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length) {
        return;
      }

      const middleware = middlewares[index++];
      if (middleware) {
        await middleware(context, next);
      }
    };

    await next();
  }

  // ==================== 查询方法 ====================

  /**
   * 获取中间件统计信息
   *
   * @returns 统计信息
   */
  getStats(): {
    beforeCount: number;
    afterCount: number;
    total: number;
  } {
    return {
      beforeCount: this.beforeMiddlewares.length,
      afterCount: this.afterMiddlewares.length,
      total: this.beforeMiddlewares.length + this.afterMiddlewares.length,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 日志输出
   *
   * @param message - 日志消息
   * @param level - 日志级别
   */
  private _log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (!this.enableLogging) return;

    const prefix = '[MiddlewareManager]';
    console[level](prefix, message);
  }
}

/**
 * 创建中间件管理器实例
 *
 * @param enableLogging - 是否启用日志
 * @returns MiddlewareManager 实例
 */
export function createMiddlewareManager(enableLogging?: boolean): MiddlewareManager {
  return new MiddlewareManager(enableLogging);
}
