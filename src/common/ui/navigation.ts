/**
 * navigation.ts - 路由和导航管理
 * 负责页面切换、侧边栏渲染、历史记录管理
 */

import { appStore } from '@/stores/useAppStore';
import {
  MENU_CONFIG,
  getRoutesByModule,
  getRouteFullConfig,
  type RouteWithId,
  type ModuleConfig,
  type RouteFullConfig,
} from '../config/menuConfig';
import { createSidebarRenderer, type SidebarRenderer } from '../components/SidebarRenderer';
import { ensureViewLoaded } from '../utils/viewLoader';
import { APP_EVENTS, emitAppEvent } from '../constants/eventConstants';
import { getEl } from './utils';
import { showToast } from './notifications';
import { setSafeHtml } from '../utils/security';

// ========================
// 侧边栏渲染器注册表
// ========================

const sopsRenderer = createSidebarRenderer({
  moduleId: 'sops',
  categories: MENU_CONFIG.sopCategories,
  overviewRouteId: 'sops_overview',
  enableSearch: true,
  searchPlaceholder: '搜索全站 SOP...',
});

const appCenterRenderer = createSidebarRenderer({
  moduleId: 'app_center',
  categories: MENU_CONFIG.appCategories,
  overviewRouteId: 'app_center_overview',
  enableSearch: true,
  searchPlaceholder: '搜索应用...',
});

const hubRenderer = createSidebarRenderer({
  moduleId: 'amz_hub',
  categories: MENU_CONFIG.hubCategories,
  overviewRouteId: 'amz_hub_overview',
  enableSearch: true,
  searchPlaceholder: '搜索智库内容...',
});

const moreRenderer = createSidebarRenderer({
  moduleId: 'more_core',
  categories: MENU_CONFIG.moreCategories,
  overviewRouteId: 'more_overview',
  enableSearch: true,
  searchPlaceholder: '搜索功能...',
});

const SIDEBAR_RENDERER_REGISTRY: Record<string, SidebarRenderer> = {
  sops: sopsRenderer,
  app_center: appCenterRenderer,
  amz_hub: hubRenderer,
  more_core: moreRenderer,
};

/**
 * 动态注册侧边栏渲染器
 */
export function registerSidebarRenderer(moduleId: string, renderer: SidebarRenderer): void {
  SIDEBAR_RENDERER_REGISTRY[moduleId] = renderer;
}

// ========================
// 侧边栏渲染
// ========================

/**
 * 渲染侧边栏
 */
function renderSidebar(moduleId: string | null): void {
  const sidebar = getEl('dynamic-sidebar');
  if (!sidebar) return;

  // 隐藏逻辑：无模块ID或home模块不显示侧边栏
  if (!moduleId || moduleId === 'home') {
    sidebar.classList.add('hidden', '-ml-64');
    sidebar.removeAttribute('aria-label');
    // ✅ 安全: 清空侧边栏
    sidebar.replaceChildren();
    return;
  }

  // 如果模块有父模块，使用父模块的侧边栏
  const moduleConfig = MENU_CONFIG.modules[moduleId];
  const effectiveModuleId = moduleConfig?.parentModuleId || moduleId;

  // 数据获取与防御
  const effectiveModuleConfig = MENU_CONFIG.modules[effectiveModuleId];
  if (!effectiveModuleConfig) {
    console.error(`⚠️ 未找到模块配置: ${effectiveModuleId}`);
    sidebar.classList.add('hidden', '-ml-64');
    sidebar.removeAttribute('aria-label');
    return;
  }

  const routes = getRoutesByModule(effectiveModuleId);

  // 统一渲染：优先使用SidebarRenderer，自动降级到默认渲染
  renderSidebarContent(sidebar, effectiveModuleId, effectiveModuleConfig, routes);
  sidebar.setAttribute('aria-label', `${effectiveModuleConfig.title} 侧边栏`);

  sidebar.classList.remove('hidden', '-ml-64');
}

export function revealMainContent(): void {
  getEl('main-content')?.classList.remove('app-shell-pending');
}

export function prepareUIForRoute(routeId: string): void {
  const fullConfig = getRouteFullConfig(String(routeId).trim());
  const targetModuleId = fullConfig ? fullConfig.module.id : null;

  try {
    renderSidebar(targetModuleId);
  } finally {
    revealMainContent();
  }
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
function renderDefaultSidebar(
  sidebar: HTMLElement,
  moduleConfig: ModuleConfig,
  routes: RouteWithId[]
): void {
  try {
    const currentTab = appStore.getState().ui.currentTab || '';

    const html = `
      <div class="flex flex-col h-full bg-[var(--surface-panel,#ffffff)]">
        <div class="p-6 pb-2">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${moduleConfig.title}
          </h2>
          <nav class="space-y-1" aria-label="${moduleConfig.title} 导航">
            ${routes
              .map(route => {
                const isActive = currentTab === route.id;
                const activeClasses = isActive
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                  : 'text-[color:var(--color-text-secondary,#475569)] hover:bg-[var(--color-bg-hover,rgba(0,0,0,0.04))] hover:text-[color:var(--color-text-primary,#0f172a)]';

                return `
                <button type="button" data-action="switch-tab" data-tab="${route.id}" id="sidebar-btn-${route.id}"
                  ${isActive ? 'aria-current="page"' : ''}
                  class="sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activeClasses} transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring,var(--color-primary))] focus-visible:ring-offset-2">
                  <i class="${route.icon} w-5 text-center"></i> 
                  ${route.label}
                </button>
              `;
              })
              .join('')}
          </nav>
        </div>
        <div class="mt-auto p-6 border-t border-[color:var(--border-subtle,rgba(148,163,184,0.24))] bg-[var(--color-bg-secondary,#f8fafc)]">
          <div class="flex items-center gap-3 text-slate-400 text-xs">
            <i class="${moduleConfig.icon}"></i>
            <span>${moduleConfig.version}</span>
          </div>
        </div>
      </div>
    `;
    // ✅ 安全: HTML模板使用内部配置数据(moduleConfig, routes来自MENU_CONFIG)
    setSafeHtml(sidebar, html);
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
  // Active color is tokenized in header-main.css via [aria-current='page']
  document.querySelectorAll<HTMLElement>('.nav-trigger').forEach(el => {
    el.removeAttribute('aria-current');
  });

  const targetBtn = getEl(`nav-${fullConfig.context.id}`);
  if (targetBtn) {
    targetBtn.setAttribute('aria-current', 'page');
  }
}

// ========================
// 路由切换（已废弃，仅用于内部 UI 更新）
// ========================

// 记录当前激活的主模块 Panel
let currentActivePanel: string | null = null;

export async function ensureRouteViewAvailable(routeId: string): Promise<void> {
  try {
    await ensureViewLoaded(String(routeId).trim());
  } catch (err) {
    console.error('[Navigation] ❌ View lazy load failed:', err);
    showToast('页面资源加载失败，请重试', { type: 'error' });
    throw err;
  }
}

async function loadRouteView(routeId: string): Promise<void> {
  await ensureRouteViewAvailable(routeId);

  // 等待 DOM 更新完成
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function getTargetPanelId(fullConfig: RouteFullConfig | null): string {
  return fullConfig?.route.panelId || 'panel-home';
}

function prepareRoutePanelHandoff(targetPanelId: string): void {
  const visiblePanel = document.querySelector<HTMLElement>('.panel:not(.hidden)');
  const previousPanelId = currentActivePanel ?? visiblePanel?.id ?? null;

  if (!previousPanelId || previousPanelId === targetPanelId) {
    return;
  }

  emitAppEvent(APP_EVENTS.MODULE_UNLOAD, {
    panelId: previousPanelId,
    nextPanelId: targetPanelId,
  });

  // 在等待新视图的懒加载资源时立即退出旧面板，避免加载指示器覆盖旧页面内容。
  document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
  currentActivePanel = null;
}

function showRoutePanel(targetPanelId: string): HTMLElement | null {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));

  const targetPanel = getEl(targetPanelId);
  if (targetPanel) {
    targetPanel.classList.remove('hidden');
    return targetPanel;
  }

  console.error(`⚠️ [Navigation] 目标面板 [${targetPanelId}] 未找到，回退至 Home`);
  const home = getEl('panel-home');
  if (home) {
    home.classList.remove('hidden');
    return home;
  }

  return null;
}

/**
 * 内部 UI 更新函数
 * 由新路由系统的中间件调用，负责更新侧边栏、面板显隐等 UI 状态
 *
 * @internal 此函数仅供路由系统内部使用
 */
export async function updateUIForRoute(routeId: string): Promise<void> {
  const cleanTab = String(routeId).trim();

  try {
    const fullConfig = getRouteFullConfig(cleanTab);
    const targetPanelId = getTargetPanelId(fullConfig);

    // 在等待懒加载视图前先退出旧面板，确保慢加载指示器只出现于路由切换空档。
    prepareRoutePanelHandoff(targetPanelId);
    await loadRouteView(cleanTab);

    // 更新全局状态
    appStore.getState().setCurrentTab(cleanTab);

    // 渲染侧边栏
    const targetModuleId = fullConfig ? fullConfig.module.id : null;
    renderSidebar(targetModuleId);

    // 新视图已就绪后再显示目标面板。
    currentActivePanel = targetPanelId;

    const visiblePanel = showRoutePanel(targetPanelId);
    const mainContent = getEl('main-content');
    if (mainContent) {
      if (visiblePanel?.id === targetPanelId && fullConfig) {
        mainContent.dataset.currentRoute = cleanTab;
      } else if (visiblePanel?.id === 'panel-home') {
        mainContent.dataset.currentRoute = 'home';
      } else {
        delete mainContent.dataset.currentRoute;
      }
    }

    // 更新导航高亮
    if (fullConfig) {
      updateHeaderNav(fullConfig);
    }

    // 分发路由变更事件
    emitAppEvent(APP_EVENTS.ROUTE_CHANGED, {
      routeId: cleanTab,
      moduleId: targetModuleId,
      config: fullConfig,
    });
  } finally {
    revealMainContent();
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
    return;
  }

  const moduleId = `sop-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });

    moduleElement.classList.add('sop-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('sop-module-highlight');
    }, 2000);
  }
}

/**
 * 滚动到智库模块区域
 */
export function scrollToHubModule(categoryId: string): void {
  if (!categoryId) {
    return;
  }

  const moduleId = `hub-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });

    moduleElement.classList.add('hub-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('hub-module-highlight');
    }, 2000);
  }
}

/**
 * 滚动到 More 模块区域
 */
export function scrollToMoreModule(categoryId: string): void {
  if (!categoryId) {
    return;
  }

  const moduleId = `more-module-${categoryId}`;
  const moduleElement = document.getElementById(moduleId);

  if (moduleElement) {
    moduleElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });

    moduleElement.classList.add('more-module-highlight');
    setTimeout(() => {
      moduleElement.classList.remove('more-module-highlight');
    }, 2000);
  }
}
