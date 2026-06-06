/**
 * search.ts - 搜索功能模块
 * 提供 SOPs、智库、侧边栏的搜索功能
 */

import { MENU_CONFIG } from '../config/menuConfig';
import { appStore } from '@/stores/useAppStore';
import { getEl } from './utils';

import { Logger } from '../../services/loggerService';

type SearchRoute = {
  id: string;
  icon?: string;
  label?: string;
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

function appendSearchMatches(
  container: Element,
  matches: SearchRoute[],
  clearSearchKey: 'sop' | 'hub' | 'sidebar',
): void {
  clearElement(container);

  matches.forEach((route) => {
    const button = document.createElement('button');
    button.dataset.action = 'switch-tab';
    button.dataset.tab = route.id;
    button.dataset.clearSearch = clearSearchKey;
    button.className = 'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all';

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

/**
 * 搜索 SOPs
 */
export function searchSOPs(query: string): void {
  const resultsContainer = getEl('sop-search-results');
  const navContainer = getEl('sop-nav-container');
  const clearBtn = getEl('sop-search-clear');

  if (!query.trim()) {
    resultsContainer?.classList.add('hidden');
    navContainer?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    return;
  }

  clearBtn?.classList.remove('hidden');
  const lowerQuery = query.toLowerCase();

  // 搜索所有 SOP 路由
  const allRoutes = Object.entries(MENU_CONFIG.routes)
    .filter(([_, cfg]) => cfg.moduleId === 'sops')
    .map(([id, cfg]) => ({ id, ...cfg }));

  const matches = allRoutes.filter(route => {
    const label = (route.label || '').toLowerCase();
    const category = (route.category || '').toLowerCase();

    // 完全匹配
    if (label === lowerQuery) return true;
    // 模糊匹配
    if (label.includes(lowerQuery)) return true;
    // 首字母匹配
    const initials = label.split(/[\s-]+/).map(w => w[0]).join('');
    if (initials.includes(lowerQuery)) return true;
    // 分类匹配
    if (category.includes(lowerQuery)) return true;

    return false;
  });

  if (!resultsContainer) return;

  if (matches.length === 0) {
    appendEmptyResult(resultsContainer, '未找到匹配的 SOP');
  } else {
    appendSearchMatches(resultsContainer, matches, 'sop');
  }

  resultsContainer.classList.remove('hidden');
  navContainer?.classList.add('hidden');
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
  resultsContainer?.classList.add('hidden');
  navContainer?.classList.remove('hidden');
  clearBtn?.classList.add('hidden');
}

/**
 * 搜索智库内容
 */
export function searchHub(query: string): void {
  const resultsContainer = getEl('hub-search-results');
  const navContainer = getEl('hub-nav-container');
  const clearBtn = getEl('hub-search-clear');

  if (!query.trim()) {
    resultsContainer?.classList.add('hidden');
    navContainer?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    return;
  }

  clearBtn?.classList.remove('hidden');
  const lowerQuery = query.toLowerCase();

  // 搜索所有智库路由
  const allRoutes = Object.entries(MENU_CONFIG.routes)
    .filter(([_, cfg]) => cfg.moduleId === 'amz_hub_core')
    .map(([id, cfg]) => ({ id, ...cfg }));

  const matches = allRoutes.filter(route => {
    const label = (route.label || '').toLowerCase();
    const category = (route.category || '').toLowerCase();

    if (label === lowerQuery) return true;
    if (label.includes(lowerQuery)) return true;
    const initials = label.split(/[\s-]+/).map(w => w[0]).join('');
    if (initials.includes(lowerQuery)) return true;
    if (category.includes(lowerQuery)) return true;

    return false;
  });

  if (!resultsContainer) return;

  if (matches.length === 0) {
    appendEmptyResult(resultsContainer, '未找到匹配的内容');
  } else {
    appendSearchMatches(resultsContainer, matches, 'hub');
  }

  resultsContainer.classList.remove('hidden');
  navContainer?.classList.add('hidden');
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
  resultsContainer?.classList.add('hidden');
  navContainer?.classList.remove('hidden');
  clearBtn?.classList.add('hidden');
}

/**
 * 通用侧边栏搜索功能
 */
export function searchSidebar(query: string): void {
  const resultsContainer = getEl('sidebar-search-results');
  const navContainer = getEl('sidebar-nav-container');
  const clearBtn = getEl('sidebar-search-clear');

  if (!resultsContainer || !navContainer) {
    Logger.warn('[searchSidebar] 未找到搜索容器');
    return;
  }

  // 显示/隐藏清除按钮
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !query);
  }

  if (!query.trim()) {
    resultsContainer.classList.add('hidden');
    navContainer.classList.remove('hidden');
    return;
  }

  // 从当前 tab 推断模块
  const currentTab = appStore.getState().ui.currentTab || '';
  const currentRoute = MENU_CONFIG.routes[currentTab];
  if (!currentRoute) {
    Logger.warn('[searchSidebar] 当前路由未找到');
    return;
  }

  const currentModuleId = currentRoute.moduleId;
  if (!currentModuleId) {
    Logger.warn('[searchSidebar] 当前模块ID未找到');
    return;
  }

  // 获取该模块的所有路由
  const allRoutes = Object.entries(MENU_CONFIG.routes)
    .filter(([_, config]) => config.moduleId === currentModuleId)
    .map(([id, config]) => ({ id, ...config }));

  // 搜索匹配
  const lowerQuery = query.toLowerCase();
  const matches = allRoutes.filter(route =>
    route.label.toLowerCase().includes(lowerQuery)
  );

  // 显示结果
  if (matches.length === 0) {
    appendEmptyResult(resultsContainer, '未找到匹配项', true);
    resultsContainer.classList.remove('hidden');
    navContainer.classList.add('hidden');
  } else {
    appendSearchMatches(resultsContainer, matches, 'sidebar');
    
    resultsContainer.classList.remove('hidden');
    navContainer.classList.add('hidden');
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
  navContainer?.classList.remove('hidden');
  clearBtn?.classList.add('hidden');
}
