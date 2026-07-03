import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { loadTemplate } from '@/common/utils/viewLoader';
import eventBus from '@/common/EventBus';
import * as overviewModule from '@/modules/app_center/views/overview/index';

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn()
}));

vi.mock('@/common/EventBus', () => ({
  default: {
    emit: vi.fn()
  }
}));

const overviewTemplate = `
  <div class="app-overview-container">
    <input id="app-overview-search" type="search">
    <button id="app-overview-clear-search" class="hidden" type="button"></button>
    <p id="app-overview-visible-count"></p>
    <button class="category-filter-btn active bg-blue-600 text-white" data-category="all"></button>
    <button class="category-filter-btn bg-white text-slate-700 border border-slate-300" data-category="master_analysis"></button>
    <button class="category-filter-btn bg-white text-slate-700 border border-slate-300" data-category="ppc_tools"></button>
    <section id="app-module-apps">
      <div class="app-center-card-grid">
        <article data-category="master_analysis" data-search="master analysis 数据采集" data-action="switch-tab" data-tab="scraper">
          <button class="app-child-link" data-child-tab="ai_analysis"></button>
        </article>
        <article data-category="ppc_tools" data-search="ppc search term 广告" data-action="switch-tab" data-tab="ppc_search_terms"></article>
      </div>
      <div id="app-overview-empty" class="hidden"></div>
    </section>
  </div>
`;

describe('App Center Overview', () => {
  beforeEach(() => {
    vi.mocked(loadTemplate).mockResolvedValue(overviewTemplate);
    vi.mocked(eventBus.emit).mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('exports the lifecycle API used by ModuleLoader', () => {
    expect(typeof overviewModule.mount).toBe('function');
    expect(typeof overviewModule.unmount).toBe('function');
  });

  it('mounts the overview template into the provided container', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/app_center/views/overview/template.html', { useCache: false });
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('.app-overview-container')).not.toBeNull();
  });

  it('emits route changes from child links and leaves app cards delegated', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    container.querySelector<HTMLElement>('.app-child-link[data-child-tab="ai_analysis"]')?.click();

    expect(eventBus.emit).toHaveBeenCalledTimes(1);
    expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.ROUTE_CHANGE, { routeId: 'ai_analysis' });

    const appCard = container.querySelector<HTMLElement>('[data-tab="scraper"]');
    appCard?.click();

    expect(appCard?.dataset.action).toBe('switch-tab');
    expect(eventBus.emit).toHaveBeenCalledTimes(1);
  });

  it('filters cards by category and updates the visible count', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    container.querySelector<HTMLElement>('[data-category="ppc_tools"]')?.click();

    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe('none');
    expect(container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display).toBe('');
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe('显示 1 个应用');
    expect(container.querySelector<HTMLElement>('[data-category="ppc_tools"]')?.classList.contains('active')).toBe(true);
  });

  it('filters cards by search text and clears the query', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    const searchInput = container.querySelector<HTMLInputElement>('#app-overview-search');
    const clearSearchBtn = container.querySelector<HTMLButtonElement>('#app-overview-clear-search');

    if (!searchInput || !clearSearchBtn) {
      throw new Error('Search controls were not rendered');
    }

    searchInput.value = 'ppc';
    searchInput.dispatchEvent(new Event('input'));

    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe('none');
    expect(container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display).toBe('');
    expect(clearSearchBtn.classList.contains('hidden')).toBe(false);
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe('显示 1 个应用');

    clearSearchBtn.click();

    expect(searchInput.value).toBe('');
    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe('');
    expect(container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display).toBe('');
    expect(clearSearchBtn.classList.contains('hidden')).toBe(true);
  });

  it('shows an empty state when no app matches the search', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    const searchInput = container.querySelector<HTMLInputElement>('#app-overview-search');

    if (!searchInput) {
      throw new Error('Search input was not rendered');
    }

    searchInput.value = 'not-found';
    searchInput.dispatchEvent(new Event('input'));

    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe('显示 0 个应用');
    expect(container.querySelector<HTMLElement>('#app-overview-empty')?.classList.contains('hidden')).toBe(false);
  });
});
