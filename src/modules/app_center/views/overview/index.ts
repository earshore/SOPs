// src/modules/app_center/views/overview/index.ts
// ================================================================
// App Center Overview - 总览页面 (TypeScript版本)
// ================================================================

import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import BaseModule from '@/common/BaseModule';
import { setSafeHtml } from '@/common/utils/security';

interface OverviewFilterState {
  category: string;
  query: string;
}

class AppCenterOverviewModule extends BaseModule {
  constructor() {
    super('app_center_overview');
  }

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/app_center/views/overview/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    // 为overview页面添加淡入动画（在渲染前添加）
    this.container.classList.add('fade-in');
    // ✅ 安全: html来自本地静态template.html，无用户输入
    setSafeHtml(this.container, html);
  }

  protected async init(): Promise<void> {
    if (!this.container) return;

    // 初始化事件监听
    initOverviewEvents(this.container);
  }
}

const appCenterOverviewModule = new AppCenterOverviewModule();

export const mount = (container: HTMLElement): Promise<void> =>
  appCenterOverviewModule.mount(container);
export const unmount = (): void => {
  appCenterOverviewModule.unmount();
};

/**
 * 初始化总览页面事件
 */
function initOverviewEvents(container: HTMLElement): void {
  const state: OverviewFilterState = {
    category: 'all',
    query: '',
  };

  const filterBtns = container.querySelectorAll<HTMLElement>('.category-filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      if (category) {
        state.category = category;
        setActiveCategory(filterBtns, btn);
        applyOverviewFilters(container, state);
      }
    });
  });

  const searchInput = container.querySelector<HTMLInputElement>('#app-overview-search');
  const clearSearchBtn = container.querySelector<HTMLButtonElement>('#app-overview-clear-search');

  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value.trim().toLowerCase();
    clearSearchBtn?.classList.toggle('hidden', state.query.length === 0);
    applyOverviewFilters(container, state);
  });

  clearSearchBtn?.addEventListener('click', () => {
    state.query = '';
    if (searchInput) searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    applyOverviewFilters(container, state);
  });

  applyOverviewFilters(container, state);
}

/**
 * 更新分类按钮选中状态
 */
function setActiveCategory(filterBtns: NodeListOf<HTMLElement>, activeBtn: HTMLElement): void {
  filterBtns.forEach(btn => {
    const isActive = btn === activeBtn;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

/**
 * 按分类筛选应用卡片
 */
function applyOverviewFilters(container: HTMLElement, state: OverviewFilterState): void {
  const cards = container.querySelectorAll<HTMLElement>('.app-center-card-grid > [data-category]');
  let visibleCount = 0;

  cards.forEach(card => {
    const categoryMatches = state.category === 'all' || card.dataset.category === state.category;
    const searchableText = `${card.dataset.search || ''} ${card.textContent || ''}`.toLowerCase();
    const queryMatches = !state.query || searchableText.includes(state.query);
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
