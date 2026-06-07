// src/modules/app_center/views/overview/index.ts
// ================================================================
// 🎯 App Center Overview - 总览页面 (TypeScript版本)
// ================================================================

import { loadTemplate } from '@/common/utils/viewLoader';
import { safeMount } from '@/common/utils/safeMount';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import eventBus from '@/common/EventBus';

interface OverviewFilterState {
  category: string;
  query: string;
}

/**
 * 挂载 App Center 总览模块
 */
const mountInternal = async (container: HTMLElement): Promise<void> => {
  const html = await loadTemplate('src/modules/app_center/views/overview/template.html', { useCache: false });
  // ✅ 安全: 静态HTML模板，无用户输入
  // 为overview页面添加淡入动画（在渲染前添加）
  container.classList.add('fade-in');
  // ✅ 安全: html来自本地静态template.html，无用户输入
  container.innerHTML = html;

  // 初始化事件监听
  initOverviewEvents(container);
};

export const mount = safeMount(mountInternal, { moduleName: 'App Center Overview' });

/**
 * 卸载 App Center 总览模块
 */
export function unmount(): void {
  console.log('❌ App Center 总览模块已卸载');
}

/**
 * 初始化总览页面事件
 */
function initOverviewEvents(container: HTMLElement): void {
  const state: OverviewFilterState = {
    category: 'all',
    query: ''
  };
  const searchInput = container.querySelector<HTMLInputElement>('#app-overview-search');
  const clearSearchBtn = container.querySelector<HTMLButtonElement>('#app-overview-clear-search');

  const filterBtns = container.querySelectorAll<HTMLElement>('.category-filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      if (category) {
        state.category = category;
        setActiveCategory(filterBtns, btn);
        applyOverviewFilters(container, state);
      }
    });
  });

  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value.trim().toLowerCase();
    clearSearchBtn?.classList.toggle('hidden', state.query.length === 0);
    applyOverviewFilters(container, state);
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
    }
    state.query = '';
    clearSearchBtn.classList.add('hidden');
    applyOverviewFilters(container, state);
    searchInput?.focus();
  });

  const childLinks = container.querySelectorAll<HTMLElement>('.app-child-link[data-child-tab]');
  childLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.stopPropagation();
      const targetTab = link.dataset.childTab;
      if (targetTab) {
        eventBus.emit(APP_EVENTS.ROUTE_CHANGE, { routeId: targetTab });
      }
    });
  });

  // 应用卡片点击事件
  const appCards = container.querySelectorAll<HTMLElement>('[data-action="switch-tab"]');
  appCards.forEach((card) => {
    card.addEventListener('click', () => {
      const targetTab = card.dataset.tab;
      if (targetTab) {
        eventBus.emit(APP_EVENTS.ROUTE_CHANGE, { routeId: targetTab });
      }
    });
  });

  applyOverviewFilters(container, state);
}

/**
 * 更新分类按钮选中状态
 */
function setActiveCategory(filterBtns: NodeListOf<HTMLElement>, activeBtn: HTMLElement): void {
  filterBtns.forEach((btn) => {
    const isActive = btn === activeBtn;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('bg-blue-600', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('hover:bg-blue-700', isActive);
    btn.classList.toggle('bg-white', !isActive);
    btn.classList.toggle('text-slate-700', !isActive);
    btn.classList.toggle('border', !isActive);
    btn.classList.toggle('border-slate-300', !isActive);
    btn.classList.toggle('hover:bg-slate-50', !isActive);
  });
}

/**
 * 按分类和搜索词筛选应用卡片
 */
function applyOverviewFilters(container: HTMLElement, state: OverviewFilterState): void {
  const cards = container.querySelectorAll<HTMLElement>('.app-center-card-grid > [data-action="switch-tab"][data-category]');
  let visibleCount = 0;

  cards.forEach((card) => {
    const categoryMatches = state.category === 'all' || card.dataset.category === state.category;
    const searchText = `${card.dataset.search ?? ''} ${card.textContent ?? ''}`.toLowerCase();
    const queryMatches = state.query.length === 0 || searchText.includes(state.query);
    const isVisible = categoryMatches && queryMatches;

    card.style.display = isVisible ? '' : 'none';
    if (isVisible) {
      visibleCount += 1;
      card.classList.add('fade-in');
    }
  });

  const visibleCountText = container.querySelector<HTMLElement>('#app-overview-visible-count');
  if (visibleCountText) {
    visibleCountText.textContent = `显示 ${visibleCount} 个应用`;
  }

  const emptyState = container.querySelector<HTMLElement>('#app-overview-empty');
  if (emptyState) {
    emptyState.classList.toggle('hidden', visibleCount > 0);
  }
}
