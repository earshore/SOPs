// src/common/router/RoutePreloader.ts
// ================================================================
// 🎯 路由预加载管理器
// 支持鼠标悬停预加载和空闲时预加载高频路由
// ================================================================

import { moduleCssLoader } from '../utils/moduleCssLoader';
import { MENU_CONFIG } from '../config/menuConfig';
import type { RouteConfig } from '../../types/config';

/**
 * 预加载策略
 */
export type PreloadStrategy = 'hover' | 'idle' | 'manual';

/**
 * 预加载配置
 */
interface PreloadConfig {
  // 启用鼠标悬停预加载
  enableHoverPreload: boolean;
  // 启用空闲时预加载
  enableIdlePreload: boolean;
  // 悬停延迟（毫秒）
  hoverDelay: number;
  // 高频路由列表（空闲时优先预加载）
  highFrequencyRoutes: string[];
}

/**
 * 路由预加载管理器
 */
class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadingRoutes = new Map<string, Promise<void>>();
  private hoverTimers = new Map<string, number>();
  private idleCallbackId: number | null = null;
  
  private config: PreloadConfig = {
    enableHoverPreload: true,
    enableIdlePreload: true,
    hoverDelay: 100,
    highFrequencyRoutes: ['home', 'app_center_overview', 'sops_overview']
  };

  /**
   * 初始化预加载器
   */
  initialize(config?: Partial<PreloadConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.enableHoverPreload) {
      this.setupHoverPreload();
    }

    if (this.config.enableIdlePreload) {
      this.setupIdlePreload();
    }

    console.log('✅ [RoutePreloader] 路由预加载器已初始化', this.config);
  }

  /**
   * 设置鼠标悬停预加载
   */
  private setupHoverPreload(): void {
    // 监听所有导航链接的鼠标悬停事件
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      
      // 查找最近的导航链接
      const link = target.closest('[data-route-id], [data-action="switchTab"]') as HTMLElement;
      if (!link) return;

      const routeId = link.dataset.routeId || link.dataset.param;
      if (!routeId) return;

      this.schedulePreload(routeId, 'hover');
    }, { passive: true });

    // 清除悬停定时器
    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-route-id], [data-action="switchTab"]') as HTMLElement;
      if (!link) return;

      const routeId = link.dataset.routeId || link.dataset.param;
      if (!routeId) return;

      this.cancelScheduledPreload(routeId);
    }, { passive: true });
  }

  /**
   * 设置空闲时预加载
   */
  private setupIdlePreload(): void {
    // 使用requestIdleCallback在浏览器空闲时预加载
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback(() => {
        this.preloadHighFrequencyRoutes();
      }, { timeout: 2000 });
    } else {
      // 降级方案：延迟执行
      setTimeout(() => {
        this.preloadHighFrequencyRoutes();
      }, 2000);
    }
  }

  /**
   * 调度预加载
   */
  private schedulePreload(routeId: string, strategy: PreloadStrategy): void {
    // 已预加载或正在预加载，跳过
    if (this.preloadedRoutes.has(routeId) || this.preloadingRoutes.has(routeId)) {
      return;
    }

    // 取消之前的定时器
    this.cancelScheduledPreload(routeId);

    // 设置新的定时器
    const delay = strategy === 'hover' ? this.config.hoverDelay : 0;
    const timerId = window.setTimeout(() => {
      this.preloadRoute(routeId, strategy);
      this.hoverTimers.delete(routeId);
    }, delay);

    this.hoverTimers.set(routeId, timerId);
  }

  /**
   * 取消调度的预加载
   */
  private cancelScheduledPreload(routeId: string): void {
    const timerId = this.hoverTimers.get(routeId);
    if (timerId) {
      clearTimeout(timerId);
      this.hoverTimers.delete(routeId);
    }
  }

  /**
   * 预加载路由
   */
  async preloadRoute(routeId: string, strategy: PreloadStrategy = 'manual'): Promise<void> {
    // 已预加载，跳过
    if (this.preloadedRoutes.has(routeId)) {
      return;
    }

    // 正在预加载，返回现有Promise
    if (this.preloadingRoutes.has(routeId)) {
      return this.preloadingRoutes.get(routeId)!;
    }

    // 获取路由配置
    const routeConfig = MENU_CONFIG.routes[routeId];
    if (!routeConfig) {
      console.warn(`[RoutePreloader] 路由配置未找到: ${routeId}`);
      return;
    }

    console.log(`🔄 [RoutePreloader] 预加载路由: ${routeId} (策略: ${strategy})`);

    // 创建预加载Promise
    const preloadPromise = this.preloadRouteImpl(routeId, routeConfig);
    this.preloadingRoutes.set(routeId, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(routeId);
      console.log(`✅ [RoutePreloader] 路由预加载完成: ${routeId}`);
    } catch (error) {
      console.error(`❌ [RoutePreloader] 路由预加载失败: ${routeId}`, error);
    } finally {
      this.preloadingRoutes.delete(routeId);
    }
  }

  /**
   * 实际预加载实现
   */
  private async preloadRouteImpl(_routeId: string, routeConfig: RouteConfig): Promise<void> {
    const tasks: Promise<void>[] = [];

    // 1. 预加载模块CSS
    if (routeConfig.moduleId) {
      tasks.push(moduleCssLoader.preloadModuleCSS(routeConfig.moduleId));
    }

    // 2. 预加载路由数据（如果配置了preload函数）
    if (routeConfig.meta?.preload && typeof routeConfig.meta.preload === 'function') {
      tasks.push(routeConfig.meta.preload());
    }

    // 3. 预加载依赖路由
    if (routeConfig.meta?.dependencies && Array.isArray(routeConfig.meta.dependencies)) {
      for (const depRouteId of routeConfig.meta.dependencies) {
        tasks.push(this.preloadRoute(depRouteId, 'manual'));
      }
    }

    // 并行执行所有预加载任务
    await Promise.all(tasks);
  }

  /**
   * 预加载高频路由
   */
  async preloadHighFrequencyRoutes(): Promise<void> {
    console.log('🔄 [RoutePreloader] 开始预加载高频路由');

    const tasks = this.config.highFrequencyRoutes.map(routeId => 
      this.preloadRoute(routeId, 'idle')
    );

    await Promise.allSettled(tasks);
    console.log('✅ [RoutePreloader] 高频路由预加载完成');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('✅ [RoutePreloader] 配置已更新', this.config);
  }

  /**
   * 检查路由是否已预加载
   */
  isRoutePreloaded(routeId: string): boolean {
    return this.preloadedRoutes.has(routeId);
  }

  /**
   * 获取预加载统计
   */
  getStats(): { preloaded: number; preloading: number } {
    return {
      preloaded: this.preloadedRoutes.size,
      preloading: this.preloadingRoutes.size
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清除所有定时器
    this.hoverTimers.forEach(timerId => clearTimeout(timerId));
    this.hoverTimers.clear();

    // 取消空闲回调
    if (this.idleCallbackId !== null && 'cancelIdleCallback' in window) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    console.log('✅ [RoutePreloader] 资源已清理');
  }
}

// 导出单例
export const routePreloader = new RoutePreloader();
