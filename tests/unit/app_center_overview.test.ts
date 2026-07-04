import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTemplate } from '@/common/utils/viewLoader';
import * as overviewModule from '@/modules/app_center/views/overview/index';

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn(),
}));

const realOverviewTemplatePath = join(cwd(), 'src/modules/app_center/views/overview/template.html');

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
          <button class="app-child-link" data-action="switch-tab" data-tab="ai_analysis"></button>
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

    expect(loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/overview/template.html',
      { useCache: false }
    );
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('.app-overview-container')).not.toBeNull();
  });

  it('leaves child links and app cards on delegated switch-tab routing', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const appCard = container.querySelector<HTMLElement>('[data-tab="scraper"]');
    const childLink = container.querySelector<HTMLElement>(
      '.app-child-link[data-tab="ai_analysis"]'
    );

    expect(appCard?.dataset.action).toBe('switch-tab');
    expect(childLink?.dataset.action).toBe('switch-tab');
    expect(childLink?.dataset.tab).toBe('ai_analysis');
    expect(childLink?.dataset.childTab).toBeUndefined();
  });

  it('filters cards by category and updates the visible count', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    container.querySelector<HTMLElement>('[data-category="ppc_tools"]')?.click();

    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe(
      'none'
    );
    expect(
      container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display
    ).toBe('');
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 1 个应用'
    );
    expect(
      container
        .querySelector<HTMLElement>('[data-category="ppc_tools"]')
        ?.classList.contains('active')
    ).toBe(true);
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

    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe(
      'none'
    );
    expect(
      container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display
    ).toBe('');
    expect(clearSearchBtn.classList.contains('hidden')).toBe(false);
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 1 个应用'
    );

    clearSearchBtn.click();

    expect(searchInput.value).toBe('');
    expect(container.querySelector<HTMLElement>('[data-tab="scraper"]')?.style.display).toBe('');
    expect(
      container.querySelector<HTMLElement>('[data-tab="ppc_search_terms"]')?.style.display
    ).toBe('');
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

    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 0 个应用'
    );
    expect(
      container.querySelector<HTMLElement>('#app-overview-empty')?.classList.contains('hidden')
    ).toBe(false);
  });

  it('keeps the task path section collapsed by default', () => {
    const html = readFileSync(realOverviewTemplatePath, 'utf8');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    const taskPathSection = wrapper.querySelector('.app-overview-flow .app-overview-collapsible');

    expect(taskPathSection).not.toBeNull();
    expect(taskPathSection?.hasAttribute('open')).toBe(false);
  });
});
