// src/common/router/Router.ts
// ================================================================
// 🎯 完整的路由系统（TypeScript版本）
// 支持浏览器历史、路由守卫、中间件
// ================================================================

import { APP_EVENTS, emitAppEvent } from '../constants/eventConstants';
import { routeGuard } from './RouteGuard';
import { routeMiddleware } from './RouteMiddleware';
import { routeErrorHandler } from './ErrorHandler';
import { MENU_CONFIG } from '../config/menuConfig';
import { ensureViewLoaded } from '../utils/viewLoader';
import type { Route, RouteConfig, NavigationOptions, RouteHistory } from '../../types/config';

/**
 * 路由管理器
 */
export class Router {
    private routes: Map<string, RouteConfig>;
    private currentRoute: Route | null;
    private history: RouteHistory[];
    private maxHistorySize: number;
    private isNavigating: boolean;
    
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.history = [];
        this.maxHistorySize = 50;
        this.isNavigating = false;
        
        // 初始化浏览器历史监听
        this._initHistoryListener();
        
        // 注册内置守卫（按优先级顺序）
        this._registerBuiltinGuards();
    }

    /**
     * 注册内置守卫
     * @private
     */
    private _registerBuiltinGuards(): void {
        // 动态导入守卫，避免循环依赖
        import('./RouteGuard').then(({ 
            metaValidationGuard, 
            dependencyGuard, 
            authGuard, 
            dataPreloadGuard 
        }) => {
            // 按优先级顺序注册
            routeGuard.register('metaValidation', metaValidationGuard);
            routeGuard.register('dependency', dependencyGuard);
            routeGuard.register('auth', authGuard);
            routeGuard.register('dataPreload', dataPreloadGuard);
            
            console.log('✅ [Router] 内置守卫已注册');
        }).catch(error => {
            console.error('[Router] 注册内置守卫失败:', error);
        });
    }

    /**
     * 注册路由
     * @param path - 路由路径
     * @param config - 路由配置
     */
    register(path: string, config: RouteConfig): void {
        this.routes.set(path, {
            ...config,
            meta: config.meta || {}
        });
    }

    /**
     * 批量注册路由
     * @param routes - 路由配置对象
     */
    registerRoutes(routes: Record<string, RouteConfig>): void {
        Object.entries(routes).forEach(([path, config]) => {
            this.register(path, config);
        });
    }

    /**
     * 导航到指定路由
     * @param routeId - 路由ID
     * @param options - 导航选项
     * @returns 是否导航成功
     */
    async navigate(routeId: string, options: NavigationOptions = {}): Promise<boolean> {
        const {
            updateHistory = true,
            replace = false,
            state = {}
        } = options;

        // 防止重复导航
        if (this.isNavigating) {
            console.warn('[Router] Navigation in progress, skipping');
            return false;
        }

        // 检查路由是否存在
        const routeConfig = (MENU_CONFIG as any).routes[routeId];
        if (!routeConfig) {
            console.error(`[Router] Route not found: ${routeId}`);
            routeErrorHandler.handle(
                new Error(`Route not found: ${routeId}`),
                { routeId, from: this.currentRoute }
            );
            return false;
        }

        this.isNavigating = true;

        try {
            const from = this.currentRoute;
            const to: Route = {
                path: routeId,
                config: routeConfig,
                state
            };

            // 1. 执行前置中间件
            const middlewarePassed = await routeMiddleware.runBeforeEach(to, from);
            if (!middlewarePassed) {
                this.isNavigating = false;
                return false;
            }

            // 2. 执行路由守卫
            const allowed = await routeGuard.runGuards(to, from);
            if (!allowed) {
                this.isNavigating = false;
                return false;
            }

            // 3. 确保视图已加载
            await ensureViewLoaded(routeId);

            // 4. 更新浏览器历史
            if (updateHistory) {
                const url = `#${routeId}`;
                if (replace) {
                    window.history.replaceState({ routeId, ...state }, '', url);
                } else {
                    window.history.pushState({ routeId, ...state }, '', url);
                }
            }

            // 5. 更新当前路由
            this.currentRoute = to;

            // 6. 记录历史
            this._recordHistory(to);

            // 7. 触发路由变化事件
            emitAppEvent(APP_EVENTS.ROUTE_CHANGED, {
                routeId,
                config: routeConfig,
                from,
                to
            });

            // 8. 执行后置中间件
            await routeMiddleware.runAfterEach(to, from);

            console.log(`[Router] Navigated: ${from?.path || 'null'} -> ${routeId}`);
            return true;

        } catch (error) {
            console.error('[Router] Navigation error:', error);
            routeErrorHandler.handle(error as Error, {
                routeId,
                from: this.currentRoute,
                action: 'navigate'
            });
            return false;
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * 后退
     */
    back(): void {
        window.history.back();
    }

    /**
     * 前进
     */
    forward(): void {
        window.history.forward();
    }

    /**
     * 跳转到历史记录中的特定位置
     * @param delta - 相对当前位置的偏移量
     */
    go(delta: number): void {
        window.history.go(delta);
    }

    /**
     * 获取当前路由
     * @returns 当前路由对象
     */
    getCurrentRoute(): Route | null {
        return this.currentRoute;
    }

    /**
     * 获取历史记录
     * @returns 历史记录数组
     */
    getHistory(): RouteHistory[] {
        return [...this.history];
    }

    /**
     * 清空历史记录
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * 初始化浏览器历史监听
     * @private
     */
    private _initHistoryListener(): void {
        window.addEventListener('popstate', (event) => {
            const state = event.state;
            if (state && state.routeId) {
                // 浏览器前进/后退时，不更新历史
                this.navigate(state.routeId, {
                    updateHistory: false,
                    state
                });
            }
        });

        // 监听 hash 变化（兼容旧代码）
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && (MENU_CONFIG as any).routes[hash]) {
                this.navigate(hash, { updateHistory: false });
            }
        });
    }

    /**
     * 记录历史
     * @private
     */
    private _recordHistory(route: Route): void {
        this.history.push({
            ...route,
            timestamp: Date.now()
        });

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
}

// 创建全局实例
export const router = new Router();

// 向后兼容：暴露到 window
if (typeof window !== 'undefined') {
    (window as any).router = router;
}

export default router;
