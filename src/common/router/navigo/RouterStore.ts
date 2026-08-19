/**
 * RouterStore.ts - 路由状态管理（Zustand 集成）
 *
 * 将路由状态同步到 Zustand Store
 */

import { createStore } from 'zustand/vanilla';

import type { Route, RouteHistory } from './types';

/**
 * 路由状态
 */
export interface RouterState {
  /** 当前路由 */
  currentRoute: Route | null;

  /** 上一个路由 */
  previousRoute: Route | null;

  /** 路由历史 */
  history: RouteHistory[];

  /** 是否正在导航 */
  isNavigating: boolean;

  /** 导航错误 */
  error: Error | null;
}

/**
 * 路由操作
 */
export interface RouterActions {
  /** 设置当前路由 */
  setCurrentRoute: (route: Route) => void;

  /** 设置导航状态 */
  setNavigating: (isNavigating: boolean) => void;

  /** 设置错误 */
  setError: (error: Error | null) => void;

  /** 添加历史记录 */
  addHistory: (route: RouteHistory) => void;

  /** 清空历史记录 */
  clearHistory: () => void;

  /** 重置状态 */
  reset: () => void;
}

/**
 * 路由 Store 类型
 */
export type RouterStore = RouterState & RouterActions;

/**
 * 初始状态
 */
const initialState: RouterState = {
  currentRoute: null,
  previousRoute: null,
  history: [],
  isNavigating: false,
  error: null,
};

/**
 * 创建路由 Store
 *
 * @param _enableDevtools - 是否启用 Redux DevTools（保留参数用于兼容，但不使用）
 * @param maxHistorySize - 最大历史记录数
 * @returns Zustand Store
 */
export function createRouterStore(_enableDevtools = false, maxHistorySize = 50) {
  const store = createStore<RouterStore>()(set => ({
    ...initialState,

    setCurrentRoute: (route: Route) =>
      set(state => ({
        currentRoute: route,
        previousRoute: state.currentRoute,
      })),

    setNavigating: (isNavigating: boolean) => set({ isNavigating }),

    setError: (error: Error | null) => set({ error }),

    addHistory: (route: RouteHistory) =>
      set(state => {
        const newHistory = [...state.history, route];

        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        return { history: newHistory };
      }),

    clearHistory: () => set({ history: [] }),

    reset: () => set(initialState),
  }));

  return store;
}

/**
 * 路由 Store 同步器
 *
 * 将 NavigoAdapter 的状态同步到 Zustand Store
 */
export class RouterStoreSync {
  private store: ReturnType<typeof createRouterStore>;
  private unsubscribe?: () => void;

  constructor(store: ReturnType<typeof createRouterStore>) {
    this.store = store;
  }

  /**
   * 同步当前路由
   */
  syncCurrentRoute(route: Route): void {
    this.store.getState().setCurrentRoute(route);
  }

  /**
   * 同步导航状态
   */
  syncNavigating(isNavigating: boolean): void {
    this.store.getState().setNavigating(isNavigating);
  }

  /**
   * 同步错误
   */
  syncError(error: Error | null): void {
    this.store.getState().setError(error);
  }

  /**
   * 同步历史记录
   */
  syncHistory(route: RouteHistory): void {
    this.store.getState().addHistory(route);
  }

  /**
   * 订阅 Store 变化
   *
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  subscribe(callback: (state: RouterState) => void): () => void {
    return this.store.subscribe(callback);
  }

  /**
   * 获取当前状态
   */
  getState(): RouterState {
    return this.store.getState();
  }

  /**
   * 销毁同步器
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

/**
 * 创建路由 Store 同步器
 *
 * @param store - Zustand Store 实例
 * @returns RouterStoreSync 实例
 */
export function createRouterStoreSync(
  store: ReturnType<typeof createRouterStore>
): RouterStoreSync {
  return new RouterStoreSync(store);
}
