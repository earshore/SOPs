/**
 * LegacyAdapter.ts - 向后兼容适配器
 *
 * 提供与旧路由系统的兼容接口，确保平滑迁移
 * 
 * ⚠️ 移除计划：
 * - 阶段 1 (2026-03-01 ~ 2026-05-31): 保留，显示弃用警告
 * - 阶段 2 (2026-06-01 ~ 2026-08-31): 仅保留核心 API，增强警告
 * - 阶段 3 (2026-09-01): 完全移除
 * 
 * 当前阶段: 阶段 1
 * 预计移除日期: 2026-09-01
 */

import type { NavigoAdapter } from './NavigoAdapter';
import type { Route } from './types';
import { routeIdToPath } from '../routePaths';

/**
 * 旧版 switchTab 函数签名
 */
type LegacySwitchTabFn = (
  routeId: string,
  options?: {
    updateHistory?: boolean;
    state?: Record<string, unknown>;
  }
) => void;

/**
 * 向后兼容适配器
 * 
 * ⚠️ 此类将在 2026-09-01 移除
 */
export class LegacyAdapter {
  private router: NavigoAdapter;
  private deprecationWarnings: Set<string>;
  private showWarnings: boolean;
  
  /** 移除计划阶段 */
  private static readonly REMOVAL_PHASE = 1;
  private static readonly REMOVAL_DATE = '2026-09-01';

  constructor(router: NavigoAdapter, showWarnings = true) {
    this.router = router;
    this.deprecationWarnings = new Set();
    this.showWarnings = showWarnings;
    
    // 显示移除计划警告
    if (showWarnings && LegacyAdapter.REMOVAL_PHASE === 1) {
      console.warn(
        `[LegacyAdapter] 向后兼容层将在 ${LegacyAdapter.REMOVAL_DATE} 移除。` +
        `请尽快迁移到新的路由 API。`
      );
    }
  }

  /**
   * 创建兼容的 switchTab 函数
   *
   * @returns switchTab 函数
   */
  createSwitchTab(): LegacySwitchTabFn {
    return (routeId: string, options = {}) => {
      this._warnDeprecation('switchTab', 'router.navigate()');

      // 转换路由 ID 为路径
      const path = this._routeIdToPath(routeId);

      // 调用新的导航方法
      this.router.navigate(path, {
        replace: options.updateHistory === false,
        state: options.state,
      });
    };
  }

  /**
   * 创建兼容的全局 router 对象
   *
   * @returns 兼容的 router 对象
   */
  createLegacyRouter(): {
    navigate: (path: string) => void;
    back: () => void;
    forward: () => void;
    getCurrentRoute: () => Route | null;
  } {
    this._warnDeprecation('window.router', 'import { router } from "@router/navigo"');

    return {
      navigate: (path: string) => {
        this.router.navigate(path);
      },
      back: () => {
        this.router.back();
      },
      forward: () => {
        this.router.forward();
      },
      getCurrentRoute: () => {
        return this.router.getCurrentRoute();
      },
    };
  }

  /**
   * 触发兼容的路由事件
   *
   * @param to - 目标路由
   * @param from - 来源路由
   */
  emitLegacyEvents(to: Route, from: Route | null): void {
    // 触发旧的 APP_EVENTS
    this._emitAppEvent('route:change', {
      to: {
        path: to.path,
        moduleId: to.config.moduleId,
        panelId: to.config.panelId,
      },
      from: from
        ? {
            path: from.path,
            moduleId: from.config.moduleId,
            panelId: from.config.panelId,
          }
        : null,
    });

    // 触发旧的自定义事件
    this._emitCustomEvent('routeChanged', {
      detail: {
        to: to.path,
        from: from?.path || null,
      },
    });
  }

  /**
   * 安装全局兼容 API
   *
   * 将兼容函数挂载到 window 对象
   * 
   * ⚠️ 此方法将在 2026-09-01 移除
   */
  installGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    // 挂载 switchTab
    const windowWithLegacy = window as unknown as Record<string, unknown>;
    windowWithLegacy.switchTab = this.createSwitchTab();

    // 挂载 router
    windowWithLegacy.router = this.createLegacyRouter();

    console.warn(
      '[LegacyAdapter] Global APIs installed. ' +
        'Please migrate to ES modules: import { router } from "@router/navigo". ' +
        `These APIs will be removed on ${LegacyAdapter.REMOVAL_DATE}.`
    );
  }

  /**
   * 卸载全局兼容 API
   */
  uninstallGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    const windowWithLegacy = window as unknown as Record<string, unknown>;
    delete windowWithLegacy.switchTab;
    delete windowWithLegacy.router;

    console.log('[LegacyAdapter] Global APIs uninstalled');
  }

  /**
   * 路由 ID 转路径
   *
   * @param routeId - 路由 ID
   * @returns 路径
   */
  private _routeIdToPath(routeId: string): string {
    return routeIdToPath(routeId);
  }

  /**
   * 触发 APP_EVENTS
   */
  private _emitAppEvent(eventName: string, data: unknown): void {
    if (typeof window === 'undefined') return;

    // 检查是否存在 APP_EVENTS
    const windowWithEvents = window as unknown as Record<string, unknown>;
    const APP_EVENTS = windowWithEvents.APP_EVENTS;
    if (!APP_EVENTS) return;

    // 触发事件
    if (typeof APP_EVENTS === 'object' && APP_EVENTS !== null && 'emit' in APP_EVENTS) {
      const emitter = APP_EVENTS as { emit?: (name: string, data: unknown) => void };
      if (typeof emitter.emit === 'function') {
        emitter.emit(eventName, data);
      }
    }
  }

  /**
   * 触发自定义事件
   */
  private _emitCustomEvent(eventName: string, options: CustomEventInit): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent(eventName, options);
    window.dispatchEvent(event);
  }

  /**
   * 弃用警告
   */
  private _warnDeprecation(oldAPI: string, newAPI: string): void {
    if (!this.showWarnings) return;

    const key = `${oldAPI}->${newAPI}`;

    // 每个 API 只警告一次
    if (this.deprecationWarnings.has(key)) return;

    this.deprecationWarnings.add(key);

    console.warn(
      `[DEPRECATED] "${oldAPI}" is deprecated and will be removed in the next major version. ` +
        `Please use "${newAPI}" instead.`
    );
  }
}

/**
 * 创建向后兼容适配器
 */
export function createLegacyAdapter(router: NavigoAdapter, showWarnings = true): LegacyAdapter {
  return new LegacyAdapter(router, showWarnings);
}
