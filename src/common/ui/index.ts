/**
 * index.ts - UI 模块统一导出
 * 提供向后兼容的统一接口
 */

// 工具函数
export { getEl, getErrorSummary, sleep } from './utils';

// Mega Menu 渲染
export {
  renderMegaMenu,
  renderMoreMenu,
  renderHubMegaMenu,
  renderSopsMegaMenu,
  initMegaMenuAccessibility,
  closeMegaMenus,
} from './megaMenu';

// 导航和路由
export {
  updateUIForRoute,
  registerSidebarRenderer,
  toggleSOPGroup,
  scrollToSOPModule,
  scrollToHubModule,
  scrollToMoreModule,
} from './navigation';

// 通知
export { showToast, showProgress, type ToastType } from './notifications';

// 搜索
export {
  searchSOPs,
  clearSOPSearch,
  searchHub,
  clearHubSearch,
  searchSidebar,
  clearSidebarSearch,
} from './search';

// 新路由系统（推荐使用）
export { navigateToRouteId, getRouter, getCurrentRoute, hasRoute } from '../router/initRouter';

// 向后兼容：注册到 window
// ========================

import {
  renderMegaMenu,
  renderMoreMenu,
  renderHubMegaMenu,
  renderSopsMegaMenu,
  initMegaMenuAccessibility,
  closeMegaMenus,
} from './megaMenu';
import { showToast } from './notifications';
import {
  searchSOPs,
  clearSOPSearch,
  searchHub,
  clearHubSearch,
  searchSidebar,
  clearSidebarSearch,
} from './search';
import { navigateToRouteId } from '../router/initRouter';

// 挂载到 window 供 legacy 代码使用
declare global {
  interface Window {
    renderMegaMenu: typeof renderMegaMenu;
    renderSopsMegaMenu: typeof renderSopsMegaMenu;
    renderHubMegaMenu: typeof renderHubMegaMenu;
    renderMoreMenu: typeof renderMoreMenu;
    initMegaMenuAccessibility: typeof initMegaMenuAccessibility;
    closeMegaMenus: typeof closeMegaMenus;
    showToast: typeof showToast;
    searchSOPs?: typeof searchSOPs;
    clearSOPSearch?: typeof clearSOPSearch;
    searchHub?: typeof searchHub;
    clearHubSearch?: typeof clearHubSearch;
    searchSidebar?: typeof searchSidebar;
    clearSidebarSearch?: typeof clearSidebarSearch;
  }
}

window.renderMegaMenu = renderMegaMenu;
window.renderSopsMegaMenu = renderSopsMegaMenu;
window.renderHubMegaMenu = renderHubMegaMenu;
window.renderMoreMenu = renderMoreMenu;
window.initMegaMenuAccessibility = initMegaMenuAccessibility;
window.closeMegaMenus = closeMegaMenus;
window.showToast = showToast;
window.searchSOPs = searchSOPs;
window.clearSOPSearch = clearSOPSearch;
window.searchHub = searchHub;
window.clearHubSearch = clearHubSearch;
window.searchSidebar = searchSidebar;
window.clearSidebarSearch = clearSidebarSearch;

document.addEventListener('input', event => {
  const target = event.target as HTMLInputElement | null;
  if (target?.id === 'sidebar-search-input') {
    searchSidebar(target.value);
  }
});

// ========================
// 注册动作到 ActionRegistry
// ========================

import { registerActions } from '../utils/actionRegistry';
import {
  toggleSOPGroup,
  scrollToSOPModule,
  scrollToHubModule,
  scrollToMoreModule,
} from './navigation';

registerActions({
  // 路由导航（通过 data-action="switch-tab" data-tab="xxx" 触发）
  'switch-tab': async (params: Record<string, unknown>, event: Event) => {
    event.preventDefault();
    const tab = typeof params.tab === 'string' ? params.tab.trim() : '';
    if (!tab) {
      return;
    }

    const didNavigate = await navigateToRouteId(tab);
    if (didNavigate) {
      closeMegaMenus({ blurActive: true });
    }
  },
  'toggle-sop-group': (params: Record<string, unknown>) =>
    toggleSOPGroup({ category: (params.group as string) || (params.category as string) }),
  'clear-sop-search': clearSOPSearch,
  'clear-hub-search': clearHubSearch,
  'clear-sidebar-search': clearSidebarSearch,
  'scroll-to-sop-module': (params: Record<string, unknown>) =>
    scrollToSOPModule(params.category as string),
  'scroll-to-hub-module': (params: Record<string, unknown>) =>
    scrollToHubModule(params.category as string),
  'scroll-to-more-module': (params: Record<string, unknown>) =>
    scrollToMoreModule(params.category as string),
});
