/**
 * index.ts - 路由系统统一导出
 *
 * 导出新的 Navigo 路由系统
 */

// 导出新的 Navigo 路由系统
export * from './navigo';

// 导出路由初始化函数
export {
  initRouter,
  getRouter,
  navigateTo,
  getCurrentRoute,
  hasRoute,
} from './initRouter';

// 导入用于向后兼容函数
import { initRouter as initRouterFn } from './initRouter';

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

/**
 * 初始化路由系统（向后兼容接口）
 * @deprecated 使用 initRouter() 代替
 */
export function initRouterSystem(): void {
  // eslint-disable-next-line no-console
  console.warn('[Router] initRouterSystem() 已弃用，请使用 initRouter()');

  // 调用新的初始化函数
  initRouterFn();
}
