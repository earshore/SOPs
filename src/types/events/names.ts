// src/types/events/names.ts
// ================================================================
// 事件名称类型定义
// ================================================================
export type AppEventName =
  // 应用生命周期
  | 'INITIALIZED'
  | 'READY'
  // 路由事件
  | 'ROUTE_CHANGED'
  | 'ROUTE_BEFORE_CHANGE'
  | 'ROUTE_ERROR'
  | 'ROUTE_REDIRECT'
  // 模块生命周期
  | 'MODULE_LOAD'
  | 'MODULE_LOADED'
  | 'MODULE_MOUNTED'
  | 'MODULE_UNLOAD'
  | 'MODULE_UNMOUNTED'
  | 'MODULE_ERROR'
  // 状态变化
  | 'STATE_CHANGED'
  | 'STATE_UPDATED'
  | 'STATE_RESET'
  // 错误处理
  | 'ERROR_OCCURRED'
  | 'ERROR'
  | 'ERROR_RECOVERED'
  // 性能监控
  | 'PERFORMANCE_METRIC'
  // 数据操作
  | 'DATA_LOADED'
  | 'DATA_SAVED'
  | 'DATA_DELETED'
  | 'DATA_UPDATED'
  // LLM相关
  | 'LLM_REQUEST_START'
  | 'LLM_REQUEST_SUCCESS'
  | 'LLM_REQUEST_ERROR'
  // 搜索相关
  | 'SEARCH_START'
  | 'SEARCH_COMPLETE'
  | 'SEARCH_CLEAR'
  // 加载状态
  | 'LOADING_START'
  | 'LOADING_STOP'
  // 设置相关
  | 'SETTINGS_OPEN'
  | 'SETTINGS_CLOSE'
  // 历史记录
  | 'HISTORY_UPDATED'
  // 配置相关
  | 'CONFIG_CHANGE'
  | 'CONFIG_CHANGED'
  | 'CONFIG_RELOAD'
  | 'CONFIG_VALIDATE'
  // 服务相关
  | 'SERVICE_INIT'
  | 'SERVICE_READY'
  | 'SERVICE_ERROR'
  // UI相关
  | 'UI_MODAL_OPEN'
  | 'UI_MODAL_CLOSE'
  | 'UI_TOAST_SHOW'
  // 工作状态
  | 'WORKING_STATE_START'
  | 'WORKING_STATE_SUCCESS'
  | 'WORKING_STATE_FAILURE'
  | 'WORKING_STATE_TIMEOUT'
  | 'WORKING_STATE_RETRY'
  // 网络状态
  | 'NETWORK_ONLINE'
  | 'NETWORK_OFFLINE'
  // 用户交互
  | 'USER_ACTION'
  // 动作注册
  | 'REGISTER_ACTIONS'
  | 'UNREGISTER_ACTIONS';

/**
 * 模块特定事件名称
 */
export type ModuleEventName =
  // SOPs模块
  | 'SOPS_SEARCH_UPDATED'
  | 'SOPS_CATEGORY_CHANGED'
  // Scraper模块
  | 'SCRAPER_SCRAPE_START'
  | 'SCRAPER_SCRAPE_SUCCESS'
  | 'SCRAPER_SCRAPE_ERROR'
  // Analysis模块
  | 'ANALYSIS_ANALYZE_START'
  | 'ANALYSIS_ANALYZE_SUCCESS'
  | 'ANALYSIS_ANALYZE_ERROR';

/**
 * 自定义事件名称（用户可扩展）
 */
export type CustomEventName = string;

/**
 * 所有事件名称
 */
export type EventName = AppEventName | ModuleEventName | CustomEventName;
