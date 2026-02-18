/**
 * navigation.ts - 路由和导航管理
 * 负责页面切换、侧边栏渲染、历史记录管理
 */

import state from '../state';
import { MENU_CONFIG, getRoutesByModule, getRouteFullConfig, type RouteWithId, type ModuleConfig, type RouteFullConfig } from '../config/menuConfig';
import { createSidebarRenderer, type SidebarRenderer } from '../components/SidebarRenderer';
import { ensureViewLoaded } from '../utils/viewLoader';
import { APP_EVENTS, emitAppEvent } from '../constants/eventConstants';
import { getEl } from './utils';
import { showToast } from './notifications';

// ========================
// 侧边栏渲染器注册表
// ========================

const sopsRenderer = createSidebarRenderer({
  moduleId: 'sops',
  categories: MENU_CONFIG.sopCategories,
  overviewRouteId: 'sops_overview',
  enableSearch: true,
  searchPlaceholder: '搜索全站 SOP...'
});

const appCenterRenderer = createSidebarRenderer({
  moduleId: 'app_center',
  categories: MENU_CONFIG.appCategories,
  overviewRouteId: 'app_center_overview',
  enableSearch: true,
  searchPlaceholder: '搜索应用...'
});

const hubRenderer = createSidebarRenderer({
  moduleId: 'amz_hub_core',
  categories: MENU_CONFIG.hubCategories,
  overviewRouteId: 'amz_hub_overview',
  enableSearch: true,
  searchPlaceholder: '搜索智库内容...'
});

const moreRenderer = createSidebarRenderer({
  moduleId: 'more_core',
  categories: MENU_CONFIG.moreCategories,
  overviewRouteId: 'more_overview',
  enableSearch: true,
  searchPlaceholder: '搜索功能...'
});

const SIDEBAR_RENDERER_REGISTRY: Record<string, SidebarRenderer> = {
  'sops': sopsRenderer,
  'app_center': appCenterRenderer,
  'amz_hub_core': hubRenderer,
  'more_core': moreRenderer
};

/**
 * 动态注册侧边栏渲染器
 */
export function registerSidebarRenderer(moduleId: string, renderer: SidebarRenderer): void {
  if (SIDEBAR_RENDERER_REGISTRY[moduleId]) {
    console.warn(`[UI] 覆盖已存在的侧边栏渲染器: ${moduleId}`);
  }
  SIDEBAR_RENDERER_REGISTRY[moduleId] = renderer;
  console.log(`[UI] 注册侧边栏渲染器: ${moduleId}`);
}

// ========================
// 侧边栏渲染
// ========================

/**
 * 渲染侧边栏
 */
function renderSidebar(moduleId: string | null): void {
  const sidebar = getEl("dynamic-sidebar");
  if (!sidebar) return;

  // 隐藏逻辑
  if (!moduleId) {
    sidebar.classList.add("hidden", "-ml-64");
    sidebar.innerHTML = '';
    return;
  }

  // 如果模块有父模块，使用父模块的侧边栏
  const moduleConfig = MENU_CONFIG.modules[moduleId];
  const effectiveModuleId = moduleConfig?.parentModuleId || moduleId;

  // 数据获取与防御
  const effectiveModuleConfig = MENU_CONFIG.modules[effectiveModuleId];
  if (!effectiveModuleConfig) {
    console.warn(`⚠️ 未找到模块配置: ${effectiveModuleId}`);
    sidebar.classList.add("hidden", "-ml-64");
    return;
  }

  const routes = getRoutesByModule(effectiveModuleId);

  // 统一渲染：优先使用SidebarRenderer，自动降级到默认渲染
  renderSidebarContent(sidebar, effectiveModuleId, effectiveModuleConfig, routes);

  sidebar.classList.remove("hidden", "-ml-64");
}

/**
 * 统一侧边栏内容渲染
 */
function renderSidebarContent(
  sidebar: HTMLElement,
  moduleId: string,
  moduleConfig: ModuleConfig,
  routes: RouteWithId[]
): void {
  const renderer = SIDEBAR_RENDERER_REGISTRY[moduleId];

  if (renderer) {
    // 使用专用渲染器
    renderer.render(sidebar, moduleConfig, routes);
  } else {
    // 使用默认渲染器
    renderDefaultSidebar(sidebar, moduleConfig, routes);
  }
}

/**
 * 默认侧边栏渲染（平铺列表）
 */
function renderDefaultSidebar(sidebar: HTMLElement, moduleConfig: ModuleConfig, routes: RouteWithId[]): void {
  try {
    const currentTab = state.ui?.currentTab || '';

    const html = `
      <div class="flex flex-col h-full bg-white">
        <div class="p-6 pb-2">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${moduleConfig.title}
          </h2>
          <nav class="space-y-1">
            ${routes.map(route => {
              const isActive = currentTab === route.id;
              const activeClasses = isActive
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';

              return `
                <button data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}" 
                  class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeClasses} transition-all duration-200">
                  <i class="${route.icon} w-5 text-center"></i> 
                  ${route.label}
                </button>
              `;
            }).join('')}
          </nav>
        </div>  
        <div class="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
          <div class="flex items-center gap-3 text-slate-400 text-xs">
            <i class="${moduleConfig.icon}"></i>
            <span>${moduleConfig.version}</span>
          </div>
        </div>
      </div>
    `;
    sidebar.innerHTML = html;
  } catch (e) {
    console.error(`❌ 侧边栏渲染错误:`, e);
  }
}

// ========================
// 头部导航更新
// ========================

/**
 * 更新头部导航高亮
 */
function updateHeaderNav(fullConfig: RouteFullConfig): void {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("text-blue-600", "border-blue-600");
    el.classList.add("text-slate-600", "border-transparent");
  });

  let targetId = null;
  if (fullConfig && fullConfig.context) {
    const contextBtn = getEl(`nav-${fullConfig.context.id}`);
    const specificBtn = fullConfig.context.id === 'hub' ? getEl('nav-amz_hub') : null;

    if (contextBtn) targetId = `nav-${fullConfig.context.id}`;
    if (specificBtn) targetId = 'nav-amz_hub';
  }

  if (targetId) {
    const targetBtn = getEl(targetId);
    if (targetBtn) {
      targetBtn.classList.remove("text-slate-600", "border-transparent");
      targetBtn.classList.add("text-blue-600", "border-blue-600");
    }
  }
}

// ========================
// 路由切换
// ========================

// 记录当前激活的主模块 Panel
let currentActivePanel: string | null = null;

/**
 * 全能路由切换函数
 */
export async function switchTab(tab: string, updateHistory: boolean = true): Promise<void> {
  const cleanTab = String(tab).trim();

  // 处理别名
  if (cleanTab === 'amz_hub') {
    switchTab('amz_hub_overview', updateHistory);
    return;
  }

  // 按需加载视图
  try {
    await ensureViewLoaded(cleanTab);
  } catch (err) {
    console.error("View lazy load failed:", err);
    showToast("页面资源加载失败，请重试", "error");
    return;
  }

  // 更新全局状态
  if (state.ui) {
    state.ui.currentTab = cleanTab;
  }
  const fullConfig = getRouteFullConfig(cleanTab);

  // 渲染侧边栏
  const targetModuleId = fullConfig ? fullConfig.module.id : null;
  renderSidebar(targetModuleId);

  // 面板显隐
  let targetPanelId = 'panel-home';
  if (fullConfig && fullConfig.route.panelId) {
    targetPanelId = fullConfig.route.panelId;
  }

  // 主模块生命周期管理
  if (currentActivePanel && currentActivePanel !== targetPanelId) {
    console.log(`[Router] 主模块切换: ${currentActivePanel} -> ${targetPanelId}`);
    emitAppEvent(APP_EVENTS.MODULE_UNLOAD, {
      panelId: currentActivePanel,
      nextPanelId: targetPanelId
    });
  }
  currentActivePanel = targetPanelId;

  // 隐藏所有面板
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));

  const targetPanel = getEl(targetPanelId);
  if (targetPanel) {
    targetPanel.classList.remove("hidden");
  } else {
    console.warn(`⚠️ 目标面板 [${targetPanelId}] 未找到，回退至 Home`);
    const home = getEl('panel-home');
    if (home) home.classList.remove("hidden");
  }

  // 更新导航高亮
  if (fullConfig) {
    updateHeaderNav(fullConfig);
  }

  // URL History Management
  if (updateHistory) {
    const newHash = cleanTab === 'home' ? '' : `#${cleanTab}`;
    const currentHash = window.location.hash;

    if (currentHash !== newHash) {
      const newUrl = newHash === ''
        ? window.location.pathname + window.location.search
        : newHash;

      history.pushState({ routeId: cleanTab }, '', newUrl);
    }
  }

  // 分发路由变更事件
  emitAppEvent(APP_EVENTS.ROUTE_CHANGED, {
    routeId: cleanTab,
    moduleId: targetModuleId,
    config: fullConfig
  });

  console.log(`📡 路由切换事件已广播: ${cleanTab} (Module: ${targetModuleId})`);
}

/**
 * 初始化路由系统
 */
export function initRouter(): void {
  // 监听 popstate 事件（浏览器前进/后退）
  window.addEventListener('popstate', (event) => {
    const hash = window.location.hash.slice(1);
    const target = hash || 'home';

    console.log(`[Router] popstate detected, navigating to: ${target}`);

    const routeId = event.state?.routeId || target;
    switchTab(routeId, false);
  });

  // 处理页面首次加载的 Deep Link
  const initialHash = window.location.hash.slice(1);
  if (initialHash) {
    console.log(`[Router] Booting with Deep Link: ${initialHash}`);
    switchTab(initialHash, true);
  } else {
    switchTab('home', true);
  }
}

// ========================
// 滚动与导航辅助函数
// ========================

/**
 * 切换 SOP 分组
 */
export function toggleSOPGroup(params: { category: string }): void {
  const { category } = params;
  if (!category) return;

  const groupItems = getEl(`sop-group-${category}`);
  const chevron = getEl(`sop-chevron-${category}`);

  if (groupItems && chevron) {
    groupItems.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
  }
}

/**
 * 滚动到 SOP 模块区域
 */
export function scrollToSOPModule(categoryId: string): void {
  if (!categoryId) {
    console.warn('⚠️ scrollToSOPModule: categoryId 为空');
    return;
  }

  const moduleId = `sop-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });

    moduleElement.classList.add('sop-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('sop-module-highlight');
    }, 2000);

    updateSidebarActiveState(categoryId);
    console.log(`✅ 滚动到 SOP 模块: ${categoryId}`);
  } else {
    console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
  }
}

/**
 * 更新侧边栏按钮的选中状态
 */
function updateSidebarActiveState(categoryId: string): void {
  document.querySelectorAll('[data-action="scroll-to-sop-module"]').forEach(btn => {
    btn.classList.remove('sop-sidebar-active');
  });

  const activeBtn = document.querySelector(`[data-action="scroll-to-sop-module"][data-category="${categoryId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('sop-sidebar-active');
  }
}

/**
 * 滚动到智库模块区域
 */
export function scrollToHubModule(categoryId: string): void {
  if (!categoryId) {
    console.warn('⚠️ scrollToHubModule: categoryId 为空');
    return;
  }

  const moduleId = `hub-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });

    moduleElement.classList.add('hub-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('hub-module-highlight');
    }, 2000);

    updateHubSidebarActiveState(categoryId);
    console.log(`✅ 滚动到智库模块: ${categoryId}`);
  } else {
    console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
  }
}

/**
 * 更新智库侧边栏按钮的选中状态
 */
function updateHubSidebarActiveState(categoryId: string): void {
  document.querySelectorAll('[data-action="scroll-to-hub-module"]').forEach(btn => {
    btn.classList.remove('hub-sidebar-active');
  });

  const activeBtn = document.querySelector(`[data-action="scroll-to-hub-module"][data-category="${categoryId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('hub-sidebar-active');
  }
}

/**
 * 滚动到 More 模块区域
 */
export function scrollToMoreModule(categoryId: string): void {
  if (!categoryId) {
    console.warn('⚠️ scrollToMoreModule: categoryId 为空');
    return;
  }

  const moduleId = `more-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });

    moduleElement.classList.add('more-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('more-module-highlight');
    }, 2000);

    updateMoreSidebarActiveState(categoryId);
    console.log(`✅ 滚动到 More 模块: ${categoryId}`);
  } else {
    console.warn(`⚠️ 未找到模块元素: ${moduleId}`);
  }
}

/**
 * 更新 More 侧边栏按钮的选中状态
 */
function updateMoreSidebarActiveState(categoryId: string): void {
  document.querySelectorAll('[data-action="scroll-to-more-module"]').forEach(btn => {
    btn.classList.remove('more-sidebar-active');
  });

  const activeBtn = document.querySelector(`[data-action="scroll-to-more-module"][data-category="${categoryId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('more-sidebar-active');
  }
}
