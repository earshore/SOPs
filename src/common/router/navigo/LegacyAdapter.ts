/**
 * LegacyAdapter.ts - 向后兼容适配器
 *
 * 提供与旧路由系统的兼容接口，确保平滑迁移
 */

import type { NavigoAdapter } from './NavigoAdapter';
import type { Route } from './types';

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
 */
export class LegacyAdapter {
  private router: NavigoAdapter;
  private deprecationWarnings: Set<string>;
  private showWarnings: boolean;

  constructor(router: NavigoAdapter, showWarnings = true) {
    this.router = router;
    this.deprecationWarnings = new Set();
    this.showWarnings = showWarnings;
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
   */
  installGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    // 挂载 switchTab
    (window as any).switchTab = this.createSwitchTab();

    // 挂载 router
    (window as any).router = this.createLegacyRouter();

    console.warn(
      '[LegacyAdapter] Global APIs installed. ' +
        'Please migrate to ES modules: import { router } from "@router/navigo"'
    );
  }

  /**
   * 卸载全局兼容 API
   */
  uninstallGlobalAPI(): void {
    if (typeof window === 'undefined') return;

    delete (window as any).switchTab;
    delete (window as any).router;

    console.log('[LegacyAdapter] Global APIs uninstalled');
  }

  /**
   * 路由 ID 转路径
   *
   * @param routeId - 路由 ID
   * @returns 路径
   */
  private _routeIdToPath(routeId: string): string {
    // 如果已经是路径格式（以 / 开头），直接返回
    if (routeId.startsWith('/')) {
      return routeId;
    }

    // 转换为路径格式
    return `/${routeId}`;
  }

  /**
   * 触发 APP_EVENTS
   */
  private _emitAppEvent(eventName: string, data: unknown): void {
    if (typeof window === 'undefined') return;

    // 检查是否存在 APP_EVENTS
    const APP_EVENTS = (window as any).APP_EVENTS;
    if (!APP_EVENTS) return;

    // 触发事件
    if (typeof APP_EVENTS.emit === 'function') {
      APP_EVENTS.emit(eventName, data);
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
