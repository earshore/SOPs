/**
 * index.ts - UI 模块统一导出
 * 提供向后兼容的统一接口
 */
export { getEl, getErrorSummary, sleep } from './utils';
export {
  renderMegaMenu,
  renderMoreMenu,
  renderHubMegaMenu,
  renderSopsMegaMenu,
  initMegaMenuAccessibility,
  closeMegaMenus,
} from './megaMenu';
export {
  updateUIForRoute,
  prepareUIForRoute,
  revealMainContent,
  registerSidebarRenderer,
  toggleSOPGroup,
  scrollToSOPModule,
  scrollToHubModule,
  scrollToMoreModule,
} from './navigation';
export { showToast, showProgress, type ToastType } from './notifications';
export {
  searchSOPs,
  clearSOPSearch,
  searchHub,
  clearHubSearch,
  searchSidebar,
  clearSidebarSearch,
} from './search';
import { closeMegaMenus } from './megaMenu';
import {
  toggleSOPGroup,
  scrollToSOPModule,
  scrollToHubModule,
  scrollToMoreModule,
} from './navigation';
export { navigateToRouteId, getRouter, getCurrentRoute, hasRoute } from '../router/initRouter';
import { searchSidebar, clearSOPSearch, clearHubSearch, clearSidebarSearch } from './search';
import { navigateToRouteId } from '../router/initRouter';
import { registerActions, unregisterActions } from '../utils/actionRegistry';

const sidebarSearchInputHandler = (event: Event): void => {
  const target = event.target as HTMLInputElement | null;
  if (target?.id === 'sidebar-search-input') {
    searchSidebar(target.value);
  }
};

document.addEventListener('input', sidebarSearchInputHandler);

// ========================
// 注册动作到 ActionRegistry
// ========================

const UI_ACTIONS = {
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
};

const uiActionNames = Object.keys(UI_ACTIONS);
unregisterActions(uiActionNames);
registerActions(UI_ACTIONS);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('input', sidebarSearchInputHandler);
    unregisterActions(uiActionNames);
  });
}
