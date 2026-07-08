import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as overviewModule from '@/modules/app_center/views/overview/index';
import {
  clearArtifactEnvelopeIndex,
  registerPpcActionListArtifact,
} from '@/modules/app_center/artifactEnvelopeService';

const safeTemplateLoaderMocks = vi.hoisted(() => ({
  loadTemplate: vi.fn(),
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: safeTemplateLoaderMocks.loadTemplate,
    }),
  },
}));

const realOverviewTemplatePath = join(cwd(), 'src/modules/app_center/views/overview/template.html');

const overviewTemplate = `
  <div class="app-overview-container">
    <input id="app-overview-search" type="search">
    <button id="app-overview-clear-search" class="hidden" type="button"></button>
    <p id="app-overview-visible-count"></p>
    <div class="app-overview-filter-row" role="group" aria-label="应用分类"></div>
    <button class="app-overview-view-btn active" data-view-mode="grid" aria-pressed="true"></button>
    <button class="app-overview-view-btn" data-view-mode="list" aria-pressed="false"></button>
    <div class="app-overview-flow-grid app-overview-flow-grid--tasks"></div>
    <div class="app-overview-recent-list"></div>
    <div class="app-overview-recent-empty hidden"></div>
    <section id="app-module-apps">
      <div class="app-center-card-grid app-overview-grid"></div>
      <div class="app-overview-list hidden"></div>
      <div id="app-overview-empty" class="hidden"></div>
    </section>
  </div>
`;

describe('App Center Overview', () => {
  beforeEach(() => {
    localStorage.clear();
    clearArtifactEnvelopeIndex();
    safeTemplateLoaderMocks.loadTemplate.mockReset();
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(overviewTemplate);
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

    expect(safeTemplateLoaderMocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/overview/template.html'
    );
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('.app-overview-container')).not.toBeNull();
  });

  it('renders category controls, app cards, and compact rows from catalog data', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    expect(container.querySelectorAll('.category-filter-btn[data-category]')).toHaveLength(5);
    expect(
      container.querySelector('.category-filter-btn[data-category="all"]')?.textContent
    ).toContain('全部应用');
    expect(
      container.querySelector('.category-filter-btn[data-category="master_analysis"]')?.textContent
    ).toContain('1');
    expect(container.querySelectorAll('.app-overview-card[data-category]')).toHaveLength(4);
    expect(container.querySelectorAll('.app-overview-list-row[data-category]')).toHaveLength(4);
    expect(
      container.querySelector('.app-overview-card[data-category="keyword_hunter"]')?.textContent
    ).toContain('Keyword Hunter');
    expect(
      container.querySelector(
        '.app-overview-card .app-child-link[data-tab="keyword_hunter_process"]'
      )?.textContent
    ).toContain('SEO 处理');
  });

  it('renders the competitor Listing workflow steps from workflow definitions', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const workflowSteps = container.querySelectorAll(
      '.app-overview-flow-grid--tasks .app-flow-step[data-action="switch-tab"]'
    );

    expect(workflowSteps).toHaveLength(5);
    expect(workflowSteps[0]?.textContent).toContain('数据采集');
    expect(workflowSteps[4]?.textContent).toContain('合规复核');
    expect(
      container.querySelector('.app-flow-step[data-tab="keyword_hunter_analysis"]')?.textContent
    ).toContain('高危词');
    expect(container.textContent).not.toContain('新品作业流');
  });

  it('renders recent artifacts with next step entries', async () => {
    registerPpcActionListArtifact(
      {
        id: 'ppc-export-001',
        reportType: 'search_term',
        filter: 'scale_budget',
        rowCount: 2,
        owner: '广告小张',
        requiresHumanConfirmation: true,
        createdAt: '2026-01-01T00:40:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'ppc_search_terms',
        updatedAt: '2026-01-01T00:40:00.000Z',
      }
    );
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const recentItems = container.querySelectorAll('.app-overview-recent-item');
    const continueButton = container.querySelector<HTMLButtonElement>(
      '.app-overview-recent-item [data-action="switch-tab"]'
    );

    expect(recentItems).toHaveLength(1);
    expect(recentItems[0]?.textContent).toContain('PPC 动作清单');
    expect(recentItems[0]?.textContent).toContain('Owner 广告小张');
    expect(continueButton?.dataset.tab).toBe('ppc_search_terms');
    expect(container.querySelector('.app-overview-recent-empty')?.classList).toContain('hidden');
  });

  it('keeps cards as containers and leaves entry buttons on delegated switch-tab routing', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const appCard = container.querySelector<HTMLElement>(
      'article[data-category="master_analysis"]'
    );
    const primaryLink = container.querySelector<HTMLElement>(
      '.app-card-primary-link[data-tab="scraper"]'
    );
    const childLink = container.querySelector<HTMLElement>(
      '.app-child-link[data-tab="ai_analysis"]'
    );

    expect(appCard?.dataset.action).toBeUndefined();
    expect(appCard?.getAttribute('role')).toBeNull();
    expect(appCard?.getAttribute('tabindex')).toBeNull();
    expect(primaryLink?.dataset.action).toBe('switch-tab');
    expect(childLink?.dataset.action).toBe('switch-tab');
    expect(childLink?.dataset.tab).toBe('ai_analysis');
    expect(childLink?.dataset.childTab).toBeUndefined();
  });

  it('filters cards by category and updates the visible count', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);
    container
      .querySelector<HTMLElement>('.category-filter-btn[data-category="ppc_tools"]')
      ?.click();

    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="master_analysis"]')
        ?.hidden
    ).toBe(true);
    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="ppc_tools"]')?.hidden
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>(
        '.app-overview-list-row[data-category="master_analysis"]'
      )?.hidden
    ).toBe(true);
    expect(
      container.querySelector<HTMLElement>('.app-overview-list-row[data-category="ppc_tools"]')
        ?.hidden
    ).toBe(false);
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 1 个应用'
    );
    expect(
      container
        .querySelector<HTMLElement>('.category-filter-btn[data-category="ppc_tools"]')
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

    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="master_analysis"]')
        ?.hidden
    ).toBe(true);
    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="ppc_tools"]')?.hidden
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>(
        '.app-overview-list-row[data-category="master_analysis"]'
      )?.hidden
    ).toBe(true);
    expect(
      container.querySelector<HTMLElement>('.app-overview-list-row[data-category="ppc_tools"]')
        ?.hidden
    ).toBe(false);
    expect(clearSearchBtn.classList.contains('hidden')).toBe(false);
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 1 个应用'
    );

    clearSearchBtn.click();

    expect(searchInput.value).toBe('');
    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="master_analysis"]')
        ?.hidden
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>('.app-overview-card[data-category="ppc_tools"]')?.hidden
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>(
        '.app-overview-list-row[data-category="master_analysis"]'
      )?.hidden
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>('.app-overview-list-row[data-category="ppc_tools"]')
        ?.hidden
    ).toBe(false);
    expect(clearSearchBtn.classList.contains('hidden')).toBe(true);
  });

  it('switches between card and compact list view without changing the visible count', async () => {
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const grid = container.querySelector<HTMLElement>('.app-overview-grid');
    const list = container.querySelector<HTMLElement>('.app-overview-list');
    const gridBtn = container.querySelector<HTMLButtonElement>('[data-view-mode="grid"]');
    const listBtn = container.querySelector<HTMLButtonElement>('[data-view-mode="list"]');

    expect(grid?.classList.contains('hidden')).toBe(false);
    expect(grid?.getAttribute('aria-hidden')).toBe('false');
    expect(list?.classList.contains('hidden')).toBe(true);
    expect(list?.getAttribute('aria-hidden')).toBe('true');

    listBtn?.click();

    expect(grid?.classList.contains('hidden')).toBe(true);
    expect(grid?.getAttribute('aria-hidden')).toBe('true');
    expect(list?.classList.contains('hidden')).toBe(false);
    expect(list?.getAttribute('aria-hidden')).toBe('false');
    expect(gridBtn?.getAttribute('aria-pressed')).toBe('false');
    expect(listBtn?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('#app-overview-visible-count')?.textContent).toBe(
      '显示 4 个应用'
    );
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

  it('keeps real app cards non-interactive and exposes explicit entry buttons', async () => {
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const wrapper = document.createElement('div');

    await overviewModule.mount(wrapper);

    expect(wrapper.querySelector('.app-overview-card[role="button"]')).toBeNull();
    expect(wrapper.querySelector('.app-overview-card[tabindex]')).toBeNull();
    expect(
      wrapper.querySelectorAll(
        '.app-overview-card .app-card-primary-link[data-action="switch-tab"]'
      )
    ).toHaveLength(4);
  });

  it('exposes the PC compact list view as non-interactive rows with explicit buttons', async () => {
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const wrapper = document.createElement('div');

    await overviewModule.mount(wrapper);

    const viewModeButtons = wrapper.querySelectorAll('.app-overview-view-btn[data-view-mode]');
    const list = wrapper.querySelector('.app-overview-list');
    const rows = wrapper.querySelectorAll('.app-overview-list-row[data-category]');

    expect(viewModeButtons).toHaveLength(2);
    expect(list?.classList.contains('hidden')).toBe(true);
    expect(rows).toHaveLength(4);
    expect(wrapper.querySelector('.app-overview-list-row[role="button"]')).toBeNull();
    expect(wrapper.querySelector('.app-overview-list-row[tabindex]')).toBeNull();
    expect(
      wrapper.querySelectorAll(
        '.app-overview-list-row .app-card-primary-link[data-action="switch-tab"]'
      )
    ).toHaveLength(4);
  });

  it('uses the current Keyword Hunter entry labels', async () => {
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const wrapper = document.createElement('div');

    await overviewModule.mount(wrapper);

    const inputEntry = wrapper.querySelector(
      '.app-overview-card .app-child-link[data-tab="keyword_hunter_input"]'
    );
    const processEntry = wrapper.querySelector(
      '.app-overview-card .app-child-link[data-tab="keyword_hunter_process"]'
    );
    const analysisEntry = wrapper.querySelector(
      '.app-overview-card .app-child-link[data-tab="keyword_hunter_analysis"]'
    );

    expect(inputEntry?.textContent).toContain('输入格式化');
    expect(processEntry?.textContent).toContain('SEO 处理');
    expect(analysisEntry?.textContent).toContain('Listing 评审');
    expect(inputEntry?.textContent).not.toContain('输入模块');
    expect(processEntry?.textContent).not.toContain('处理模块');
    expect(analysisEntry?.textContent).not.toContain('分析统计');
  });
});
