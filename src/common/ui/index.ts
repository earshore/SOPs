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
  updateUIForRoute,
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

// 新路由系统（推荐使用）
export { navigateTo, getRouter, getCurrentRoute, hasRoute } from '../router/initRouter';

// 向后兼容：注册到 window
// ========================

import { renderMegaMenu, renderMoreMenu, renderHubMegaMenu, renderSopsMegaMenu } from './megaMenu';
import { showToast } from './notifications';
import { searchSOPs, clearSOPSearch, searchHub, clearHubSearch, searchSidebar, clearSidebarSearch } from './search';
import { navigateTo } from '../router/initRouter';

// 挂载到 window 供 legacy 代码使用
declare global {
  interface Window {
    navigateTo: typeof navigateTo;
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

window.navigateTo = navigateTo;
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

import { Logger } from '../../services/loggerService';
registerActions({
  // 路由导航（通过 data-action="switch-tab" data-tab="xxx" 触发）
  'switch-tab': async (params: Record<string, unknown>) => {
    const tab = (params.tab as string) || '';
    if (!tab) {
      Logger.warn('[ActionRegistry] switch-tab: missing tab parameter');
      return;
    }
    
    // 将路由 ID 转换为实际路径
    let path = tab;
    
    // 应用中心路由映射
    if (tab === 'app_center_overview') {
      path = '/app-center';
    } else if (tab === 'scraper') {
      path = '/app-center/scraper';
    } else if (tab === 'ai_analysis') {
      path = '/app-center/ai-analysis';
    } else if (tab === 'promptlab') {
      path = '/app-center/promptlab';
    } else if (tab === 'qalab') {
      path = '/app-center/qalab';
    } else if (tab === 'kw_input') {
      path = '/app-center/keyword-hunter/input';
    } else if (tab === 'kw_process') {
      path = '/app-center/keyword-hunter/process';
    } else if (tab === 'kw_analysis') {
      path = '/app-center/keyword-hunter/analysis';
    } else if (!tab.startsWith('/')) {
      path = `/${tab}`;
    }
    
    await navigateTo(path);
  },
  'toggle-sop-group': (params: Record<string, unknown>) => toggleSOPGroup({ category: params.group as string || params.category as string }),
  'clear-sop-search': clearSOPSearch,
  'clear-hub-search': clearHubSearch,
  'clear-sidebar-search': clearSidebarSearch,
  'open-user-guide': openUserGuide,
  'close-user-guide': closeUserGuide,
  'switch-guide-tab': (params: Record<string, unknown>) => switchGuideTab({ tab: params.tab as string }),
  'scroll-to-sop-module': (params: Record<string, unknown>) => scrollToSOPModule(params.category as string),
  'scroll-to-hub-module': (params: Record<string, unknown>) => scrollToHubModule(params.category as string),
  'scroll-to-more-module': (params: Record<string, unknown>) => scrollToMoreModule(params.category as string),
});

Logger.debug("✅ [UI] 模块已加载并注册到 ActionRegistry");
