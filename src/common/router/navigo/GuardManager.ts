/**
 * GuardManager.ts - 路由守卫管理器
 *
 * 负责管理和执行路由守卫，支持全局守卫和路由级守卫
 * 守卫按优先级顺序执行，可以阻止导航或重定向
 */

import type { Route, RouteGuard } from './types';
import { isRouteGuard, isGuardResult } from './guards';
import { ValidationError } from '@/common/errors/AppError';

/**
 * 守卫管理器
 *
 * 管理全局守卫和路由级守卫的注册、执行
 */
export class GuardManager {
  /** 全局守卫列表 */
  private globalGuards: RouteGuard[];

  /** 路由级守卫映射表 */
  private routeGuards: Map<string, RouteGuard[]>;

  /** 是否启用日志 */
  private enableLogging: boolean;

  /**
   * 构造函数
   *
   * @param enableLogging - 是否启用日志
   */
  constructor(enableLogging: boolean = false) {
    this.globalGuards = [];
    this.routeGuards = new Map();
    this.enableLogging = enableLogging;

    this._log('GuardManager initialized');
  }

  // ==================== 守卫注册 ====================

  /**
   * 添加全局守卫
   *
   * @param guard - 路由守卫
   * @throws {ValidationError} 如果守卫无效
   *
   * @example
   * ```typescript
   * guardManager.addGlobalGuard({
   *   name: 'auth',
   *   priority: 1,
   *   check: async (to, from) => {
   *     return isAuthenticated();
   *   }
   * });
   * ```
   */
  addGlobalGuard(guard: RouteGuard): void {
    if (!isRouteGuard(guard)) {
      throw new ValidationError(
        `Invalid guard: ${JSON.stringify(guard)}`,
        'ROUTER_INVALID_GUARD',
        'guard',
        guard,
        { module: 'GuardManager', action: 'addGlobalGuard' }
      );
    }

    // 检查是否已存在同名守卫
    const existingIndex = this.globalGuards.findIndex(g => g.name === guard.name);
    if (existingIndex !== -1) {
      this._log(`Replacing existing global guard: ${guard.name}`, 'warn');
      this.globalGuards.splice(existingIndex, 1);
    }

    // 添加守卫
    this.globalGuards.push(guard);

    // 按优先级排序（数字越小优先级越高）
    this.globalGuards.sort((a, b) => {
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      return priorityA - priorityB;
    });

    this._log(`Global guard added: ${guard.name} (priority: ${guard.priority ?? 100})`);
  }

  /**
   * 移除全局守卫
   *
   * @param name - 守卫名称
   * @returns 是否成功移除
   */
  removeGlobalGuard(name: string): boolean {
    const index = this.globalGuards.findIndex(g => g.name === name);

    if (index !== -1) {
      this.globalGuards.splice(index, 1);
      this._log(`Global guard removed: ${name}`);
      return true;
    }

    return false;
  }

  /**
   * 添加路由级守卫
   *
   * @param path - 路由路径
   * @param guard - 路由守卫
   * @throws {Error} 如果守卫无效
   */
  addRouteGuard(path: string, guard: RouteGuard): void {
    if (!isRouteGuard(guard)) {
      throw new ValidationError(
        `Invalid guard: ${JSON.stringify(guard)}`,
        'ROUTER_INVALID_GUARD',
        'guard',
        guard,
        { module: 'GuardManager', action: 'addRouteGuard', path }
      );
    }

    // 获取或创建路由守卫列表
    let guards = this.routeGuards.get(path);
    if (!guards) {
      guards = [];
      this.routeGuards.set(path, guards);
    }

    // 检查是否已存在同名守卫
    const existingIndex = guards.findIndex(g => g.name === guard.name);
    if (existingIndex !== -1) {
      this._log(`Replacing existing route guard: ${guard.name} for ${path}`, 'warn');
      guards.splice(existingIndex, 1);
    }

    // 添加守卫
    guards.push(guard);

    // 按优先级排序
    guards.sort((a, b) => {
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      return priorityA - priorityB;
    });

    this._log(`Route guard added: ${guard.name} for ${path} (priority: ${guard.priority ?? 100})`);
  }

  /**
   * 移除路由级守卫
   *
   * @param path - 路由路径
   * @param name - 守卫名称
   * @returns 是否成功移除
   */
  removeRouteGuard(path: string, name: string): boolean {
    const guards = this.routeGuards.get(path);
    if (!guards) return false;

    const index = guards.findIndex(g => g.name === name);
    if (index !== -1) {
      guards.splice(index, 1);

      // 如果该路由没有守卫了，删除映射
      if (guards.length === 0) {
        this.routeGuards.delete(path);
      }

      this._log(`Route guard removed: ${name} for ${path}`);
      return true;
    }

    return false;
  }

  /**
   * 清空所有守卫
   */
  clearAll(): void {
    this.globalGuards = [];
    this.routeGuards.clear();
    this._log('All guards cleared');
  }

  // ==================== 守卫执行 ====================

  /**
   * 执行所有守卫
   *
   * @param to - 目标路由
   * @param from - 来源路由
   * @returns 守卫执行结果
   *
   * @example
   * ```typescript
   * const result = await guardManager.runGuards(toRoute, fromRoute);
   * if (result.allowed) {
   *   // 允许导航
   * } else if (result.redirect) {
   *   // 重定向到其他路由
   * }
   * ```
   */
  async runGuards(
    to: Route,
    from: Route | null
  ): Promise<{ allowed: boolean; redirect?: string; reason?: string }> {
    this._log(`Running guards: ${from?.path || 'null'} -> ${to.path}`);

    // 1. 执行全局守卫
    const globalResult = await this._runGuardList(this.globalGuards, to, from, 'global');
    if (!globalResult.allowed) {
      return globalResult;
    }

    // 2. 执行路由级守卫
    const routeGuards = this.routeGuards.get(to.path) || [];
    const routeResult = await this._runGuardList(routeGuards, to, from, 'route');
    if (!routeResult.allowed) {
      return routeResult;
    }

    // 3. 执行路由配置中的守卫
    if (to.config.guards && to.config.guards.length > 0) {
      const configResult = await this._runGuardList(to.config.guards, to, from, 'config');
      if (!configResult.allowed) {
        return configResult;
      }
    }

    this._log('All guards passed');
    return { allowed: true };
  }

  /**
   * 执行守卫列表
   *
   * @param guards - 守卫列表
   * @param to - 目标路由
   * @param from - 来源路由
   * @param type - 守卫类型（用于日志）
   * @returns 执行结果
   */
  private async _runGuardList(
    guards: RouteGuard[],
    to: Route,
    from: Route | null,
    type: string
  ): Promise<{ allowed: boolean; redirect?: string; reason?: string }> {
    for (const guard of guards) {
      try {
        this._log(`Executing ${type} guard: ${guard.name}`);

        const startTime = performance.now();
        const result = await guard.check(to, from);
        const duration = Math.round(performance.now() - startTime);

        this._log(`Guard ${guard.name} completed in ${duration}ms`);

        // 验证结果
        if (!isGuardResult(result)) {
          throw new ValidationError(
            `Invalid guard result from ${guard.name}`,
            'ROUTER_INVALID_GUARD_RESULT',
            'result',
            result,
            { module: 'GuardManager', action: 'runGuards', guardName: guard.name }
          );
        }

        // 处理布尔结果
        if (typeof result === 'boolean') {
          if (!result) {
            this._log(`Guard ${guard.name} rejected navigation`, 'warn');
            return {
              allowed: false,
              reason: `Guard ${guard.name} rejected`,
            };
          }
          continue;
        }

        // 处理对象结果
        if (result.allow === false) {
          this._log(`Guard ${guard.name} rejected navigation`, 'warn');
          return {
            allowed: false,
            redirect: result.redirect,
            reason: result.reason || `Guard ${guard.name} rejected`,
          };
        }

        // 处理重定向
        if (result.redirect) {
          this._log(`Guard ${guard.name} requested redirect to ${result.redirect}`);
          return {
            allowed: false,
            redirect: result.redirect,
            reason: result.reason || `Guard ${guard.name} redirected`,
          };
        }
      } catch (error) {
        this._log(`Guard ${guard.name} threw error: ${(error as Error).message}`, 'error');
        return {
          allowed: false,
          reason: `Guard ${guard.name} error: ${(error as Error).message}`,
        };
      }
    }

    return { allowed: true };
  }

  // ==================== 查询方法 ====================

  /**
   * 获取所有全局守卫
   *
   * @returns 全局守卫列表（副本）
   */
  getGlobalGuards(): RouteGuard[] {
    return [...this.globalGuards];
  }

  /**
   * 获取指定路由的守卫
   *
   * @param path - 路由路径
   * @returns 路由守卫列表（副本）
   */
  getRouteGuards(path: string): RouteGuard[] {
    const guards = this.routeGuards.get(path);
    return guards ? [...guards] : [];
  }

  /**
   * 获取守卫统计信息
   *
   * @returns 统计信息
   */
  getStats(): {
    globalGuardCount: number;
    routeGuardCount: number;
    totalRoutes: number;
  } {
    return {
      globalGuardCount: this.globalGuards.length,
      routeGuardCount: Array.from(this.routeGuards.values()).reduce(
        (sum, guards) => sum + guards.length,
        0
      ),
      totalRoutes: this.routeGuards.size,
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

    const prefix = '[GuardManager]';
    console[level](prefix, message);
  }
}

/**
 * 创建守卫管理器实例
 *
 * @param enableLogging - 是否启用日志
 * @returns GuardManager 实例
 */
export function createGuardManager(enableLogging?: boolean): GuardManager {
  return new GuardManager(enableLogging);
}
