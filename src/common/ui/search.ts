/**
 * search.ts - 搜索功能模块
 * 提供 SOPs、智库、侧边栏的搜索功能
 */

import { MENU_CONFIG } from '../config/menuConfig';
import { appStore } from '@/stores/useAppStore';
import { getEl } from './utils';

type SearchRoute = {
  id: string;
  category?: string;
  icon?: string;
  label?: string;
};

type MenuSearchConfig = {
  clearBtnId: string;
  clearSearchKey: 'sop' | 'hub';
  emptyMessage: string;
  moduleId: string;
  navContainerId: string;
  resultsContainerId: string;
};

function clearElement(element: Element): void {
  element.textContent = '';
}

function appendEmptyResult(container: Element, message: string, withIcon = false): void {
  clearElement(container);

  const wrapper = document.createElement('div');
  wrapper.className = withIcon
    ? 'p-3 text-xs text-slate-400 text-center'
    : 'text-xs text-slate-400 text-center py-2';

  if (withIcon) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-search mb-2';
    wrapper.appendChild(icon);

    const text = document.createElement('p');
    text.textContent = message;
    wrapper.appendChild(text);
  } else {
    wrapper.textContent = message;
  }

  container.appendChild(wrapper);
}

function resetSearchView(
  resultsContainer: HTMLElement | null,
  navContainer: HTMLElement | null,
  clearBtn: HTMLElement | null
): void {
  resultsContainer?.classList.add('hidden');
  resultsContainer?.setAttribute('aria-hidden', 'true');
  navContainer?.classList.remove('hidden');
  navContainer?.setAttribute('aria-hidden', 'false');
  clearBtn?.classList.add('hidden');
}

function appendSearchMatches(
  container: Element,
  matches: SearchRoute[],
  clearSearchKey: 'sop' | 'hub' | 'sidebar'
): void {
  clearElement(container);

  matches.forEach(route => {
    const button = document.createElement('button');
    button.dataset.action = 'switch-tab';
    button.dataset.tab = route.id;
    button.dataset.clearSearch = clearSearchKey;
    button.className =
      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

    const icon = document.createElement('i');
    icon.className = `${route.icon || 'fas fa-circle'} w-4 text-center`;
    button.appendChild(icon);

    const label = document.createElement('span');
    label.className = clearSearchKey === 'sidebar' ? 'flex-1 text-left' : 'truncate';
    label.textContent = route.label || '';
    button.appendChild(label);

    button.addEventListener('click', () => {
      if (clearSearchKey === 'sop') {
        window.clearSOPSearch?.();
      } else if (clearSearchKey === 'hub') {
        window.clearHubSearch?.();
      } else {
        window.clearSidebarSearch?.();
      }
    });

    container.appendChild(button);
  });
}

function findModuleRoutes(moduleId: string): SearchRoute[] {
  return Object.entries(MENU_CONFIG.routes)
    .filter(([_, cfg]) => cfg.moduleId === moduleId)
    .map(([id, cfg]) => ({ id, ...cfg }));
}

function routeMatchesQuery(route: SearchRoute, lowerQuery: string): boolean {
  const label = (route.label || '').toLowerCase();
  const category = (route.category || '').toLowerCase();

  if (label === lowerQuery) return true;
  if (label.includes(lowerQuery)) return true;

  const initials = label
    .split(/[\s-]+/)
    .map(w => w[0])
    .join('');
  if (initials.includes(lowerQuery)) return true;

  return category.includes(lowerQuery);
}

function searchMenuRoutes(query: string, config: MenuSearchConfig): void {
  const resultsContainer = getEl(config.resultsContainerId);
  const navContainer = getEl(config.navContainerId);
  const clearBtn = getEl(config.clearBtnId);

  if (!query.trim()) {
    resetSearchView(resultsContainer, navContainer, clearBtn);
    return;
  }

  clearBtn?.classList.remove('hidden');
  const lowerQuery = query.toLowerCase();
  const matches = findModuleRoutes(config.moduleId).filter(route =>
    routeMatchesQuery(route, lowerQuery)
  );

  if (!resultsContainer) return;

  if (matches.length === 0) {
    appendEmptyResult(resultsContainer, config.emptyMessage);
  } else {
    appendSearchMatches(resultsContainer, matches, config.clearSearchKey);
  }

  resultsContainer.classList.remove('hidden');
  resultsContainer.setAttribute('aria-hidden', 'false');
  navContainer?.classList.add('hidden');
  navContainer?.setAttribute('aria-hidden', 'true');
}

/**
 * 搜索 SOPs
 */
export function searchSOPs(query: string): void {
  searchMenuRoutes(query, {
    clearBtnId: 'sop-search-clear',
    clearSearchKey: 'sop',
    emptyMessage: '未找到匹配的 SOP',
    moduleId: 'sops',
    navContainerId: 'sop-nav-container',
    resultsContainerId: 'sop-search-results',
  });
}

/**
 * 清空 SOP 搜索
 */
export function clearSOPSearch(): void {
  const input = getEl('sop-search-input') as HTMLInputElement;
  const resultsContainer = getEl('sop-search-results');
  const navContainer = getEl('sop-nav-container');
  const clearBtn = getEl('sop-search-clear');

  if (input) input.value = '';
  resetSearchView(resultsContainer, navContainer, clearBtn);
}

/**
 * 搜索智库内容
 */
export function searchHub(query: string): void {
  searchMenuRoutes(query, {
    clearBtnId: 'hub-search-clear',
    clearSearchKey: 'hub',
    emptyMessage: '未找到匹配的内容',
    moduleId: 'amz_hub',
    navContainerId: 'hub-nav-container',
    resultsContainerId: 'hub-search-results',
  });
}

/**
 * 清空智库搜索
 */
export function clearHubSearch(): void {
  const searchInput = getEl('hub-search-input') as HTMLInputElement;
  const resultsContainer = getEl('hub-search-results');
  const navContainer = getEl('hub-nav-container');
  const clearBtn = getEl('hub-search-clear');

  if (searchInput) searchInput.value = '';
  resetSearchView(resultsContainer, navContainer, clearBtn);
}

/**
 * 通用侧边栏搜索功能
 */
export function searchSidebar(query: string): void {
  const resultsContainer = getEl('sidebar-search-results');
  const navContainer = getEl('sidebar-nav-container');
  const clearBtn = getEl('sidebar-search-clear');

  if (!resultsContainer || !navContainer) {
    return;
  }

  // 显示/隐藏清除按钮
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !query);
  }

  if (!query.trim()) {
    resultsContainer.classList.add('hidden');
    resultsContainer.setAttribute('aria-hidden', 'true');
    navContainer.classList.remove('hidden');
    navContainer.setAttribute('aria-hidden', 'false');
    return;
  }

  // 从当前 tab 推断模块
  const currentTab = appStore.getState().ui.currentTab || '';
  const currentRoute = MENU_CONFIG.routes[currentTab];
  if (!currentRoute) {
    return;
  }

  const currentModuleId = currentRoute.moduleId;
  if (!currentModuleId) {
    return;
  }

  // 获取该模块的所有路由
  const allRoutes = Object.entries(MENU_CONFIG.routes)
    .filter(([_, config]) => config.moduleId === currentModuleId)
    .map(([id, config]) => ({ id, ...config }));

  // 搜索匹配
  const lowerQuery = query.toLowerCase();
  const matches = allRoutes.filter(route => route.label.toLowerCase().includes(lowerQuery));

  // 显示结果
  if (matches.length === 0) {
    appendEmptyResult(resultsContainer, '未找到匹配项', true);
    resultsContainer.classList.remove('hidden');
    resultsContainer.setAttribute('aria-hidden', 'false');
    navContainer.classList.add('hidden');
    navContainer.setAttribute('aria-hidden', 'true');
  } else {
    appendSearchMatches(resultsContainer, matches, 'sidebar');

    resultsContainer.classList.remove('hidden');
    resultsContainer.setAttribute('aria-hidden', 'false');
    navContainer.classList.add('hidden');
    navContainer.setAttribute('aria-hidden', 'true');
  }
}

/**
 * 清除侧边栏搜索
 */
export function clearSidebarSearch(): void {
  const searchInput = getEl('sidebar-search-input') as HTMLInputElement;
  const resultsContainer = getEl('sidebar-search-results');
  const navContainer = getEl('sidebar-nav-container');
  const clearBtn = getEl('sidebar-search-clear');

  if (searchInput) searchInput.value = '';
  resultsContainer?.classList.add('hidden');
  resultsContainer?.setAttribute('aria-hidden', 'true');
  navContainer?.classList.remove('hidden');
  navContainer?.setAttribute('aria-hidden', 'false');
  clearBtn?.classList.add('hidden');
}
