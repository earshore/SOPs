/**
 * index.ts - 路由系统统一导出
 *
 * 导出新的 Navigo 路由系统
 */

// 导出新的 Navigo 路由系统
export * from './navigo';

// 导出路由初始化函数
export { initRouter, getRouter, navigateToRouteId, getCurrentRoute, hasRoute } from './initRouter';

/**
 * 路由系统初始化选项
 */
export interface RouterSystemOptions {
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 是否启用滚动恢复 */
  enableScrollRestoration?: boolean;
  /** 默认页面标题 */
  defaultTitle?: string;
}
