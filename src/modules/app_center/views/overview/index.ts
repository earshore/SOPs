// src/modules/app_center/views/overview/index.ts
// ================================================================
// App Center Overview - 总览页面 (TypeScript版本)
// ================================================================

import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import BaseModule from '@/common/BaseModule';
import { setSafeHtml } from '@/common/utils/security';
import {
  APP_CENTER_CATALOG_CATEGORIES,
  APP_CENTER_CATALOG_GROUPS,
  type AppCenterCatalogCategory,
  type AppCenterCatalogGroup,
  getAppCenterCatalogCategoryCounts,
  getAppCenterCatalogRoute,
} from '../../appCatalog';
import {
  getAppCenterWorkflowDefinition,
  type AppCenterWorkflowStep,
} from '../../workflowDefinitions';
import { cleanupRecentPanel, renderRecentPanel } from './recentPanel';

interface OverviewFilterState {
  category: string;
  query: string;
  viewMode: 'grid' | 'list';
}

class AppCenterOverviewModule extends BaseModule {
  constructor() {
    super('app_center_overview');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/app_center/views/overview/template.html'
    );
    if (!this.isCurrentMount(mountSignal)) return;

    // ✅ 安全: html来自本地静态template.html，无用户输入
    setSafeHtml(container, html);
    renderOverviewCatalog(container);
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();

    // 初始化事件监听
    initOverviewEvents(container);
    await renderRecentPanel(container, () => this.isCurrentMount(mountSignal));
  }

  protected onUnmount(): void {
    cleanupRecentPanel();
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
    viewMode: 'grid',
  };

  const filterRow = container.querySelector<HTMLElement>('.app-overview-filter-row');
  const viewModeBtns = container.querySelectorAll<HTMLButtonElement>(
    '.category-filter-btn[data-view-mode]'
  );
  // Event delegation: category buttons are rendered into the filter row at mount time.
  filterRow?.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const btn = target.closest<HTMLElement>('.category-filter-btn[data-category]');
    if (!btn || !filterRow.contains(btn)) return;

    const category = btn.dataset.category;
    if (!category) return;

    state.category = category;
    const filterBtns = filterRow.querySelectorAll<HTMLElement>('.category-filter-btn');
    setActiveCategory(filterBtns, btn);
    applyOverviewFilters(container, state);
  });

  viewModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewMode = btn.dataset.viewMode;
      if (viewMode === 'grid' || viewMode === 'list') {
        state.viewMode = viewMode;
        setActiveViewMode(viewModeBtns, viewMode);
        syncOverviewViewMode(container, state.viewMode);
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

function renderOverviewCatalog(container: HTMLElement): void {
  renderWorkflowSteps(container);
  renderCategoryFilters(container);
  renderCatalogCards(container);
  renderCatalogList(container);
}

function renderWorkflowSteps(container: HTMLElement): void {
  const flowGrid = container.querySelector<HTMLElement>('.app-overview-flow-grid--tasks');
  if (!flowGrid) return;

  const workflow = getAppCenterWorkflowDefinition('competitor_listing');
  flowGrid.replaceChildren(...workflow.steps.map((step, index) => createWorkflowStep(step, index)));
}

function createWorkflowStep(step: AppCenterWorkflowStep, index: number): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'app-flow-step app-child-link';
  button.type = 'button';
  button.dataset.action = 'switch-tab';
  button.dataset.tab = step.routeId;

  const stepIndex = document.createElement('span');
  stepIndex.className = 'app-flow-index';
  stepIndex.textContent = String(index + 1).padStart(2, '0');

  const iconBox = document.createElement('span');
  iconBox.className = 'app-flow-icon';
  const icon = document.createElement('i');
  icon.className = step.icon;
  icon.setAttribute('aria-hidden', 'true');
  iconBox.append(icon);

  const copy = document.createElement('span');
  copy.className = 'app-flow-copy';
  const title = document.createElement('strong');
  title.textContent = step.title;
  const summary = document.createElement('small');
  summary.textContent = `${step.summary} 复核：${step.reviewPoints.join('、')}`;
  copy.append(title, summary);

  button.append(stepIndex, iconBox, copy);
  return button;
}

function renderCategoryFilters(container: HTMLElement): void {
  const filterRow = container.querySelector<HTMLElement>('.app-overview-filter-row');
  if (!filterRow) return;

  const counts = getAppCenterCatalogCategoryCounts();
  const allCategory: AppCenterCatalogCategory = {
    id: 'all',
    label: '全部应用',
    icon: 'fas fa-th',
  };

  filterRow.replaceChildren(
    createCategoryButton(allCategory, counts.all || 0, true),
    ...APP_CENTER_CATALOG_CATEGORIES.map(category =>
      createCategoryButton(category, counts[category.id] || 0, false)
    )
  );
}

function createCategoryButton(
  category: AppCenterCatalogCategory,
  count: number,
  isActive: boolean
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `category-filter-btn${isActive ? ' active' : ''}`;
  button.type = 'button';
  button.dataset.category = category.id;
  button.setAttribute('aria-pressed', String(isActive));

  const icon = document.createElement('i');
  icon.className = category.icon;
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = category.label;

  const countText = document.createElement('em');
  countText.textContent = String(count);

  button.append(icon, label, countText);
  return button;
}

function renderCatalogCards(container: HTMLElement): void {
  const grid = container.querySelector<HTMLElement>('.app-overview-grid');
  if (!grid) return;

  grid.replaceChildren(...APP_CENTER_CATALOG_GROUPS.map(createCatalogCard));
}

function createCatalogCard(group: AppCenterCatalogGroup): HTMLElement {
  const card = document.createElement('article');
  card.className = `app-overview-card ${group.cardClass}`;
  card.dataset.category = group.category;
  card.dataset.search = getCatalogSearchText(group);

  const head = document.createElement('div');
  head.className = 'app-card-head';

  const iconBox = document.createElement('div');
  iconBox.className = 'app-card-icon';
  const icon = document.createElement('i');
  icon.className = group.icon;
  icon.setAttribute('aria-hidden', 'true');
  iconBox.append(icon);

  const badge = document.createElement('span');
  badge.className = 'app-card-badge';
  badge.textContent = group.badge;
  head.append(iconBox, badge);

  const titleRow = document.createElement('div');
  titleRow.className = 'app-card-title-row';
  const titleCopy = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = group.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = group.subtitle;
  titleCopy.append(title, subtitle);
  titleRow.append(titleCopy, createPrimaryLink(group));

  const description = document.createElement('p');
  description.className = 'app-card-desc';
  description.textContent = group.description;

  const actions = document.createElement('div');
  actions.className =
    group.routeIds.length === 1 ? 'app-card-actions app-card-actions-single' : 'app-card-actions';
  actions.append(...group.routeIds.map(routeId => createChildLink(routeId)));

  card.append(head, titleRow, description, actions);
  return card;
}

function createPrimaryLink(group: AppCenterCatalogGroup): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'app-card-primary-link';
  button.type = 'button';
  button.dataset.action = 'switch-tab';
  button.dataset.tab = group.primaryRouteId;
  button.setAttribute(
    'aria-label',
    `打开 ${group.title} ${getAppCenterCatalogRoute(group.primaryRouteId).label}`
  );

  const label = document.createElement('span');
  label.textContent = '打开';
  const icon = document.createElement('i');
  icon.className = 'fas fa-arrow-right';
  icon.setAttribute('aria-hidden', 'true');
  button.append(label, icon);

  return button;
}

function createChildLink(routeId: AppCenterCatalogGroup['routeIds'][number]): HTMLButtonElement {
  const route = getAppCenterCatalogRoute(routeId);
  const button = document.createElement('button');
  button.className = 'app-child-link';
  button.type = 'button';
  button.dataset.action = 'switch-tab';
  button.dataset.tab = route.routeId;

  const icon = document.createElement('i');
  icon.className = route.icon;
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = route.label;

  button.append(icon, label);
  return button;
}

function renderCatalogList(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>('.app-overview-list');
  if (!list) return;

  list.replaceChildren(...APP_CENTER_CATALOG_GROUPS.map(createCatalogListRow));
}

function createCatalogListRow(group: AppCenterCatalogGroup): HTMLElement {
  const row = document.createElement('div');
  row.className = `app-overview-list-row ${group.cardClass}`;
  row.setAttribute('role', 'listitem');
  row.dataset.category = group.category;
  row.dataset.search = getCatalogSearchText(group);

  const main = document.createElement('div');
  main.className = 'app-overview-list-main';
  const icon = document.createElement('span');
  icon.className = 'app-overview-list-icon';
  icon.setAttribute('aria-hidden', 'true');
  const iconInner = document.createElement('i');
  iconInner.className = group.icon;
  icon.append(iconInner);
  const copy = document.createElement('div');
  copy.className = 'app-overview-list-copy';
  const title = document.createElement('h3');
  title.textContent = group.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = group.subtitle;
  copy.append(title, subtitle);
  main.append(icon, copy);

  const value = document.createElement('p');
  value.className = 'app-overview-list-value';
  value.textContent = group.description;

  const meta = document.createElement('div');
  meta.className = 'app-overview-list-meta';
  meta.setAttribute('aria-label', `${group.title} 标签`);
  const badge = document.createElement('span');
  badge.className = 'app-overview-list-badge';
  badge.textContent = group.badge;
  meta.append(badge, ...group.tags.map(createListTag));

  const actions = document.createElement('div');
  actions.className = 'app-overview-list-actions';
  const secondary = document.createElement('div');
  secondary.className = 'app-overview-list-secondary';
  secondary.append(...group.routeIds.map(routeId => createChildLink(routeId)));
  actions.append(createPrimaryLink(group), secondary);

  row.append(main, value, meta, actions);
  return row;
}

function createListTag(tag: string): HTMLElement {
  const element = document.createElement('span');
  element.className = 'app-overview-list-tag';
  element.textContent = tag;
  return element;
}

function getCatalogSearchText(group: AppCenterCatalogGroup): string {
  const routeLabels = group.routeIds.map(routeId => getAppCenterCatalogRoute(routeId).label);
  return [
    group.title,
    group.subtitle,
    group.description,
    ...group.tags,
    ...group.searchKeywords,
    ...routeLabels,
  ].join(' ');
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
 * 更新应用矩阵显示模式
 */
function setActiveViewMode(
  viewModeBtns: NodeListOf<HTMLButtonElement>,
  activeViewMode: OverviewFilterState['viewMode']
): void {
  viewModeBtns.forEach(btn => {
    const isActive = btn.dataset.viewMode === activeViewMode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function syncOverviewViewMode(
  container: HTMLElement,
  viewMode: OverviewFilterState['viewMode']
): void {
  const grid = container.querySelector<HTMLElement>('.app-overview-grid');
  const list = container.querySelector<HTMLElement>('.app-overview-list');
  const showGrid = viewMode === 'grid';

  grid?.classList.toggle('hidden', !showGrid);
  grid?.setAttribute('aria-hidden', String(!showGrid));
  list?.classList.toggle('hidden', showGrid);
  list?.setAttribute('aria-hidden', String(showGrid));
}

/**
 * 按分类筛选应用卡片
 */
function applyOverviewFilters(container: HTMLElement, state: OverviewFilterState): void {
  const cards = container.querySelectorAll<HTMLElement>('.app-overview-grid > [data-category]');
  const listRows = container.querySelectorAll<HTMLElement>('.app-overview-list > [data-category]');
  let visibleCount = 0;
  let visibleListCount = 0;

  cards.forEach(card => {
    const isVisible = overviewItemMatches(card, state);
    setOverviewItemVisibility(card, isVisible);
    if (isVisible) {
      visibleCount += 1;
    }
  });

  listRows.forEach(row => {
    const isVisible = overviewItemMatches(row, state);
    setOverviewItemVisibility(row, isVisible);
    if (isVisible) {
      visibleListCount += 1;
    }
  });

  if (cards.length === 0) {
    visibleCount = visibleListCount;
  }

  const visibleCountText = container.querySelector<HTMLElement>('#app-overview-visible-count');
  if (visibleCountText) {
    visibleCountText.textContent = `显示 ${visibleCount} 个应用`;
  }

  const emptyState = container.querySelector<HTMLElement>('#app-overview-empty');
  if (emptyState) {
    emptyState.classList.toggle('hidden', visibleCount > 0);
  }

  syncOverviewViewMode(container, state.viewMode);
}

function overviewItemMatches(item: HTMLElement, state: OverviewFilterState): boolean {
  const categoryMatches = state.category === 'all' || item.dataset.category === state.category;
  const searchableText = `${item.dataset.search || ''} ${item.textContent || ''}`.toLowerCase();
  const queryMatches = !state.query || searchableText.includes(state.query);

  return categoryMatches && queryMatches;
}

/**
 * Author CSS sets `display: flex` on overview cards/rows, which overrides the UA
 * `[hidden] { display: none }` rule. Use the shared `.hidden` utility
 * (`display: none !important`) so category filters actually hide items visually.
 */
function setOverviewItemVisibility(item: HTMLElement, isVisible: boolean): void {
  item.hidden = !isVisible;
  item.classList.toggle('hidden', !isVisible);
  item.classList.toggle('fade-in', isVisible);
}
