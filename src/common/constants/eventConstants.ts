// src/common/constants/eventConstants.ts
// ================================================================
// 🎯 统一事件命名常量 (TypeScript版本)
// 集中管理所有应用级事件名称，避免硬编码字符串
// ================================================================

/**
 * 应用级事件常量
 * 命名规范: APP_[模块]_[动作]
 */
export const APP_EVENTS = {
  // 路由事件
  ROUTE_CHANGED: 'app:route-changed',
  ROUTE_CHANGE: 'route-change', // Legacy: 用于向后兼容
  ROUTE_BEFORE_CHANGE: 'app:route-before-change',
  ROUTE_ERROR: 'app:route-error',
  ROUTE_REDIRECT: 'route-redirect', // 路由重定向
  
  // 应用生命周期
  INITIALIZED: 'app:initialized',
  READY: 'app:ready',
  
  // 模块生命周期
  MODULE_MOUNTED: 'app:module-mounted',
  MODULE_UNMOUNTED: 'app:module-unmounted',
  MODULE_UNLOAD: 'app:module-unload', // 主模块卸载请求（在切换前触发）
  MODULE_LOADED: 'app:module-loaded',
  MODULE_ERROR: 'app:module-error',
  
  // 状态变化
  STATE_UPDATED: 'app:state-updated',
  STATE_RESET: 'app:state-reset',
  
  // 用户交互
  USER_ACTION: 'app:user-action',
  
  // 错误处理
  ERROR_OCCURRED: 'app:error-occurred',
  ERROR: 'app:error',
  ERROR_RECOVERED: 'app:error-recovered',
  
  // 数据操作
  DATA_LOADED: 'app:data-loaded',
  DATA_SAVED: 'app:data-saved',
  DATA_DELETED: 'app:data-deleted',
  DATA_UPDATED: 'app:data-updated',
  
  // LLM 相关
  LLM_REQUEST_START: 'app:llm-request-start',
  LLM_REQUEST_SUCCESS: 'app:llm-request-success',
  LLM_REQUEST_ERROR: 'app:llm-request-error',
  
  // 搜索相关
  SEARCH_START: 'app:search-start',
  SEARCH_COMPLETE: 'app:search-complete',
  SEARCH_CLEAR: 'app:search-clear',
  
  // 加载状态相关
  LOADING_START: 'app:loading-start',
  LOADING_STOP: 'app:loading-stop',
  
  // 设置相关
  SETTINGS_OPEN: 'open-settings',
  SETTINGS_CLOSE: 'close-settings',
  
  // 历史记录相关
  HISTORY_UPDATED: 'history-updated',
  
  // 动作注册
  REGISTER_ACTIONS: 'registerActions',
  UNREGISTER_ACTIONS: 'unregisterActions',
  
  // 配置相关
  CONFIG_CHANGE: 'app:config-change',
  CONFIG_CHANGED: 'app:config-changed',
  CONFIG_RELOAD: 'app:config-reload',
  CONFIG_VALIDATE: 'app:config-validate',
  
  // 服务相关
  SERVICE_INIT: 'app:service-init',
  SERVICE_READY: 'app:service-ready',
  SERVICE_ERROR: 'app:service-error',
  
  // UI相关
  UI_MODAL_OPEN: 'app:ui-modal-open',
  UI_MODAL_CLOSE: 'app:ui-modal-close',
  UI_TOAST_SHOW: 'app:ui-toast-show'
} as const;

/**
 * 模块特定事件常量
 */
export const MODULE_EVENTS = {
  // SOPs 模块
  SOPS: {
    SEARCH_UPDATED: 'sops:search-updated',
    CATEGORY_CHANGED: 'sops:category-changed'
  },
  
  // Scraper 模块
  SCRAPER: {
    SCRAPE_START: 'scraper:scrape-start',
    SCRAPE_SUCCESS: 'scraper:scrape-success',
    SCRAPE_ERROR: 'scraper:scrape-error'
  },
  
  // Analysis 模块
  ANALYSIS: {
    ANALYZE_START: 'analysis:analyze-start',
    ANALYZE_SUCCESS: 'analysis:analyze-success',
    ANALYZE_ERROR: 'analysis:analyze-error'
  }
} as const;

// ==================== 类型定义 ====================

/**
 * 应用事件类型
 */
export type AppEventType = typeof APP_EVENTS[keyof typeof APP_EVENTS];

/**
 * 路由变更事件详情
 */
export interface RouteChangedEventDetail {
  routeId: string;
  config: any;
  from?: any;
}

/**
 * 模块挂载事件详情
 */
export interface ModuleMountedEventDetail {
  moduleId: string;
  container: HTMLElement;
  timestamp: number;
}

/**
 * 错误发生事件详情
 */
export interface ErrorOccurredEventDetail {
  error: Error;
  source: string;
  context?: any;
}

/**
 * 状态更新事件详情
 */
export interface StateUpdatedEventDetail {
  path: string;
  value: any;
  oldValue?: any;
}

/**
 * 数据加载事件详情
 */
export interface DataLoadedEventDetail {
  dataType: string;
  data: any;
  source?: string;
}

/**
 * LLM请求事件详情
 */
export interface LLMRequestEventDetail {
  requestId: string;
  model?: string;
  prompt?: string;
  response?: any;
  error?: Error;
}

/**
 * 通用事件详情
 */
export interface AppEventDetail {
  timestamp: number;
  [key: string]: any;
}

// ==================== 辅助函数 ====================

/**
 * 触发应用事件的辅助函数
 */
export function emitAppEvent<T extends AppEventDetail = AppEventDetail>(
  eventName: string,
  detail: Omit<T, 'timestamp'> = {} as Omit<T, 'timestamp'>
): void {
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        ...detail,
        timestamp: Date.now()
      }
    })
  );
}

/**
 * 监听应用事件的辅助函数
 */
export function onAppEvent<T extends AppEventDetail = AppEventDetail>(
  eventName: string,
  handler: (event: CustomEvent<T>) => void
): () => void {
  const typedHandler = handler as EventListener;
  window.addEventListener(eventName, typedHandler);
  return () => window.removeEventListener(eventName, typedHandler);
}

/**
 * 一次性监听应用事件
 */
export function onceAppEvent<T extends AppEventDetail = AppEventDetail>(
  eventName: string,
  handler: (event: CustomEvent<T>) => void
): void {
  const wrappedHandler = (event: Event) => {
    handler(event as CustomEvent<T>);
    window.removeEventListener(eventName, wrappedHandler);
  };
  window.addEventListener(eventName, wrappedHandler);
}

// 默认导出
export default APP_EVENTS;
