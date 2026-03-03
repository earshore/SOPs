// src/common/utils/ui.d.ts
// ================================================================
// 🎯 UI工具库类型声明文件
// ================================================================
// 为 ui.js 提供 TypeScript 类型支持
// 注意：ui.js 将在 Phase 7 进行组件化重构
// ================================================================

/**
 * 侧边栏渲染器接口
 */
export interface SidebarRenderer {
  render(): void;
  update(): void;
  destroy?(): void;
}

/**
 * 侧边栏渲染器配置
 */
export interface SidebarRendererConfig {
  moduleId: string;
  categories: unknown[];
  overviewRouteId: string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

/**
 * Toast 消息类型
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * 注册侧边栏渲染器
 * @param moduleId - 模块ID
 * @param renderer - 渲染器实例
 */
export function registerSidebarRenderer(
  moduleId: string,
  renderer: SidebarRenderer
): void;

/**
 * 渲染大型菜单（Mega Menu）
 */
export function renderMegaMenu(): void;

/**
 * 渲染"更多"菜单
 */
export function renderMoreMenu(): void;

/**
 * 渲染 Amazon 智库顶部菜单
 */
export function renderHubMegaMenu(): void;

/**
 * 渲染 SOPs 大型菜单
 */
export function renderSopsMegaMenu(): void;

/**
 * 更新路由对应的 UI 状态
 * @param routeId - 路由ID
 * @internal 此函数仅供路由系统内部使用
 */
export function updateUIForRoute(routeId: string): Promise<void>;

/**
 * 导航到指定路由
 * @param path - 路由路径（如 '/home', '/scraper'）
 * @param options - 导航选项
 */
export function navigateTo(path: string, options?: { replace?: boolean }): Promise<boolean>;

/**
 * 显示 Toast 提示消息
 * @param message - 消息内容
 * @param type - 消息类型
 */
export function showToast(message: string, type?: ToastType): void;

/**
 * 显示/隐藏全局进度条
 * @param show - 是否显示
 * @param percent - 进度百分比 (0-100)
 */
export function showProgress(show: boolean, percent?: number): void;

/**
 * 获取错误摘要信息
 * @param errorMsg - 错误消息
 * @returns 错误摘要
 */
export function getErrorSummary(errorMsg: string): string;

/**
 * 延迟执行（Promise 包装的 setTimeout）
 * @param ms - 延迟毫秒数
 */
export function sleep(ms: number): Promise<void>;

/**
 * 全局 window 扩展（用于向后兼容）
 * 注意：这些方法将在 Phase 7 重构时移除
 */
declare global {
  interface Window {
    /**
     * 搜索 SOPs
     * @deprecated 将在 Phase 7 重构时移除
     */
    searchSOPs?: (query: string) => void;

    /**
     * 清空 SOP 搜索
     * @deprecated 将在 Phase 7 重构时移除
     */
    clearSOPSearch?: () => void;

    /**
     * 搜索应用中心
     * @deprecated 将在 Phase 7 重构时移除
     */
    searchAppCenter?: (query: string) => void;

    /**
     * 清空应用中心搜索
     * @deprecated 将在 Phase 7 重构时移除
     */
    clearAppCenterSearch?: () => void;

    /**
     * 搜索智库
     * @deprecated 将在 Phase 7 重构时移除
     */
    searchHub?: (query: string) => void;

    /**
     * 清空智库搜索
     * @deprecated 将在 Phase 7 重构时移除
     */
    clearHubSearch?: () => void;

    /**
     * 搜索更多功能
     * @deprecated 将在 Phase 7 重构时移除
     */
    searchMore?: (query: string) => void;

    /**
     * 清空更多功能搜索
     * @deprecated 将在 Phase 7 重构时移除
     */
    clearMoreSearch?: () => void;
  }
}
