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
  renderSopsMegaMenu
} from './megaMenu';

// 导航和路由
export {
  switchTab,
  initRouter,
  registerSidebarRenderer,
  toggleSOPGroup,
  scrollToSOPModule,
  scrollToHubModule,
  scrollToMoreModule
} from './navigation';

// 通知
export {
  showToast,
  showProgress,
  type ToastType
} from './notifications';

// 搜索
export {
  searchSOPs,
  clearSOPSearch,
  searchHub,
  clearHubSearch,
  searchSidebar,
  clearSidebarSearch
} from './search';

// 用户指南
export {
  openUserGuide,
  closeUserGuide,
  switchGuideTab
} from './userGuide';

// 向后兼容：注册到 window
// ========================

import { switchTab } from './navigation';
import { renderMegaMenu, renderMoreMenu, renderHubMegaMenu, renderSopsMegaMenu } from './megaMenu';
import { showToast } from './notifications';
import { searchSOPs, clearSOPSearch, searchHub, clearHubSearch, searchSidebar, clearSidebarSearch } from './search';

// 挂载到 window 供 legacy 代码使用
declare global {
  interface Window {
    switchTab: typeof switchTab;
    renderMegaMenu: typeof renderMegaMenu;
    renderSopsMegaMenu: typeof renderSopsMegaMenu;
    renderHubMegaMenu: typeof renderHubMegaMenu;
    renderMoreMenu: typeof renderMoreMenu;
    showToast: typeof showToast;
    searchSOPs?: typeof searchSOPs;
    clearSOPSearch?: typeof clearSOPSearch;
    searchHub?: typeof searchHub;
    clearHubSearch?: typeof clearHubSearch;
    searchSidebar?: typeof searchSidebar;
    clearSidebarSearch?: typeof clearSidebarSearch;
  }
}

window.switchTab = switchTab;
window.renderMegaMenu = renderMegaMenu;
window.renderSopsMegaMenu = renderSopsMegaMenu;
window.renderHubMegaMenu = renderHubMegaMenu;
window.renderMoreMenu = renderMoreMenu;
window.showToast = showToast;
window.searchSOPs = searchSOPs;
window.clearSOPSearch = clearSOPSearch;
window.searchHub = searchHub;
window.clearHubSearch = clearHubSearch;
window.searchSidebar = searchSidebar;
window.clearSidebarSearch = clearSidebarSearch;

// ========================
// 注册动作到 ActionRegistry
// ========================

import { registerActions } from '../utils/actionRegistry';
import { toggleSOPGroup, scrollToSOPModule, scrollToHubModule, scrollToMoreModule } from './navigation';
import { openUserGuide, closeUserGuide, switchGuideTab } from './userGuide';

registerActions({
  'switch-tab': (params: any) => switchTab(params.tab),
  'toggle-sop-group': (params: any) => toggleSOPGroup(params),
  'clear-sop-search': clearSOPSearch,
  'clear-hub-search': clearHubSearch,
  'clear-sidebar-search': clearSidebarSearch,
  'open-user-guide': openUserGuide,
  'close-user-guide': closeUserGuide,
  'switch-guide-tab': (params: any) => switchGuideTab(params),
  'scroll-to-sop-module': (params: any) => scrollToSOPModule(params.category),
  'scroll-to-hub-module': (params: any) => scrollToHubModule(params.category),
  'scroll-to-more-module': (params: any) => scrollToMoreModule(params.category),
});

console.log("✅ [UI] 模块已加载并注册到 ActionRegistry");
