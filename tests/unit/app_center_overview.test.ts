import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as overviewModule from '@/modules/app_center/views/overview/index';
import {
  clearArtifactEnvelopeIndex,
  getArtifactsForWorkItem,
  registerComplianceCheckArtifact,
  registerPpcActionListArtifact,
} from '@/modules/app_center/artifactEnvelopeService';

const safeTemplateLoaderMocks = vi.hoisted(() => ({
  loadTemplate: vi.fn(),
}));

const ppcSnapshotMocks = vi.hoisted(() => ({
  getById: vi.fn(),
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: safeTemplateLoaderMocks.loadTemplate,
    }),
  },
}));

vi.mock(
  '@/modules/app_center/views/ppc_tools/ppc_search_terms/export/actionListSnapshotService',
  () => ({
    getPpcActionListSnapshotById: ppcSnapshotMocks.getById,
    queuePpcActionListResume: vi.fn(),
  })
);

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
    <div class="app-overview-recent-heading-actions">
      <button class="app-overview-recent-group-btn hidden" type="button" data-recent-undo-remove></button>
      <button class="app-overview-recent-group-btn" type="button" data-recent-removed-toggle aria-pressed="false"></button>
      <div class="app-overview-recent-columns-toggle" role="group" aria-label="最近继续列数">
        <button class="app-overview-recent-columns-btn" type="button" data-recent-columns="1" aria-pressed="false"></button>
        <button class="app-overview-recent-columns-btn active" type="button" data-recent-columns="2" aria-pressed="true"></button>
        <button class="app-overview-recent-columns-btn" type="button" data-recent-columns="3" aria-pressed="false"></button>
      </div>
      <span class="app-overview-mini-badge app-overview-recent-count-badge">显示 0 项</span>
    </div>
    <div class="app-overview-recent-toolbar">
      <input id="app-overview-recent-search" type="search">
      <div class="app-overview-recent-type-filters"></div>
      <div class="app-overview-recent-status-filters"></div>
    </div>
    <div class="app-overview-recent-shell" data-recent-columns="2">
      <div class="app-overview-recent-list"></div>
      <div class="app-overview-recent-empty hidden">
        <div data-recent-empty-title></div>
        <p data-recent-empty-description></p>
        <button data-recent-empty-start></button>
        <button data-recent-empty-clear class="hidden"><span></span></button>
      </div>
    </div>
    <section id="app-module-apps">
      <div class="app-center-card-grid app-overview-grid"></div>
      <div class="app-overview-list hidden"></div>
      <div id="app-overview-empty" class="hidden"></div>
    </section>
  </div>
`;

function registerRecentPpcArtifact(): void {
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
}

describe('App Center Overview', () => {
  beforeEach(() => {
    localStorage.clear();
    clearArtifactEnvelopeIndex();
    safeTemplateLoaderMocks.loadTemplate.mockReset();
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(overviewTemplate);
    ppcSnapshotMocks.getById.mockResolvedValue({
      id: 'ppc-export-001',
      rows: [],
    });
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

  it('renders recent artifacts with a specific PPC review action', async () => {
    registerRecentPpcArtifact();
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const recentItems = container.querySelectorAll('.app-overview-recent-item');
    const reviewButton = container.querySelector<HTMLButtonElement>(
      '.app-overview-recent-action.app-card-primary-link'
    );
    const pinButton = container.querySelector<HTMLButtonElement>('[aria-label="置顶"]');
    const cardTools = recentItems[0]?.querySelectorAll('.app-overview-recent-card-tool');
    const cardCorner = recentItems[0]?.querySelector('.app-overview-recent-card-corner');
    const typeSelect = container.querySelector<HTMLSelectElement>(
      '.app-overview-recent-type-filters select'
    );
    const statusSelect = container.querySelector<HTMLSelectElement>(
      '.app-overview-recent-status-filters select'
    );

    expect(recentItems).toHaveLength(1);
    expect(recentItems[0]?.classList.contains('app-overview-recent-item--ppc_action_list')).toBe(
      true
    );
    // Context-first title; short type once; facts as chips (not raw summary dump)
    expect(recentItems[0]?.querySelector('.app-overview-recent-type')?.textContent).toBe('PPC');
    expect(recentItems[0]?.querySelector('.app-overview-recent-title')?.textContent).toBe(
      'DE · B000000001'
    );
    expect(recentItems[0]?.textContent).toContain('负责人：广告小张');
    expect(recentItems[0]?.textContent).toContain('2 条建议动作');
    expect(recentItems[0]?.textContent).toContain('需人工复核');
    expect(recentItems[0]?.querySelectorAll('.app-overview-recent-fact').length).toBeGreaterThan(0);
    expect(recentItems[0]?.textContent).not.toContain('PPC 动作清单');
    expect(reviewButton?.textContent).toContain('查看 PPC 建议');
    expect(container.querySelectorAll('.app-overview-recent-action')).toHaveLength(1);
    const ppcJourneySteps = recentItems[0]?.querySelectorAll('.app-overview-recent-journey-step');
    expect(ppcJourneySteps).toHaveLength(2);
    expect(ppcJourneySteps?.[0]?.textContent).toContain('生成建议');
    expect(ppcJourneySteps?.[1]?.textContent).toContain('人工复核');
    expect(ppcJourneySteps?.[1]?.classList).toContain('app-overview-recent-journey-step--current');
    expect(cardTools).toHaveLength(3);
    expect(cardCorner?.querySelector('time')).not.toBeNull();
    expect(cardTools?.[0]?.querySelector('span')?.classList).toContain('sr-only');
    expect(pinButton?.getAttribute('title')).toContain('置顶');
    expect(pinButton?.querySelector('i')?.className).toBe('fa-solid fa-thumb-tack');
    expect(pinButton?.getAttribute('aria-pressed')).toBe('false');
    expect(recentItems[0]?.classList.contains('app-overview-recent-item--attention')).toBe(true);
    expect(typeSelect?.options).toHaveLength(7);
    expect(statusSelect?.options).toHaveLength(4);
    expect(container.querySelectorAll('.app-overview-recent-type-filter')).toHaveLength(0);
    expect(container.querySelector('.app-overview-recent-empty')?.classList).toContain('hidden');

    if (!typeSelect) throw new Error('Recent type select was not rendered');
    typeSelect.value = 'analysis_report';
    typeSelect.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.app-overview-recent-item')).toHaveLength(0);
      expect(
        container.querySelector<HTMLSelectElement>('.app-overview-recent-type-filters select')
          ?.value
      ).toBe('analysis_report');
    });
  });

  it('shows one advancing card when the same work item has multiple stage artifacts', async () => {
    registerRecentPpcArtifact();
    registerComplianceCheckArtifact(
      {
        id: 'compliance-latest',
        checklistIds: ['restricted_words'],
        createdAt: '2026-01-01T00:50:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:50:00.000Z',
      }
    );
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const recentItems = container.querySelectorAll('.app-overview-recent-item');
    expect(recentItems).toHaveLength(1);
    expect(recentItems[0]?.getAttribute('data-artifact-type')).toBe('compliance_check');
    expect(container.querySelector('.app-overview-recent-count-badge')?.textContent).toBe(
      '显示 1 项'
    );
    expect(container.querySelector('[data-recent-group-toggle]')).toBeNull();
  });

  it('shows a visible pin state and supports remove undo', async () => {
    registerRecentPpcArtifact();
    const container = document.createElement('div');
    await overviewModule.mount(container);

    container.querySelector<HTMLButtonElement>('[aria-label="置顶"]')?.click();
    await vi.waitFor(() => {
      const pinnedButton = container.querySelector('[aria-label="取消置顶"]');
      expect(pinnedButton?.getAttribute('aria-pressed')).toBe('true');
      expect(pinnedButton?.classList).toContain('active');
    });

    container.querySelector<HTMLButtonElement>('[aria-label="从列表移除"]')?.click();
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.app-overview-recent-item')).toHaveLength(0);
      expect(
        container
          .querySelector<HTMLButtonElement>('[data-recent-undo-remove]')
          ?.classList.contains('hidden')
      ).toBe(false);
    });

    container.querySelector<HTMLButtonElement>('[data-recent-undo-remove]')?.click();
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.app-overview-recent-item')).toHaveLength(1);
    });
  });

  it('distinguishes filtered empty state and clears recent filters', async () => {
    registerRecentPpcArtifact();
    const container = document.createElement('div');
    await overviewModule.mount(container);
    const search = container.querySelector<HTMLInputElement>('#app-overview-recent-search');
    if (!search) throw new Error('Recent search input was not rendered');

    search.value = 'not-found';
    search.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      expect(container.querySelector('[data-recent-empty-title]')?.textContent).toBe(
        '没有符合条件的作业'
      );
    });

    container.querySelector<HTMLButtonElement>('[data-recent-empty-clear]')?.click();
    await vi.waitFor(() => {
      expect(search.value).toBe('');
      expect(container.querySelectorAll('.app-overview-recent-item')).toHaveLength(1);
    });
  });

  it('expands the local compliance checklist and saves a manual status', async () => {
    registerComplianceCheckArtifact(
      {
        id: 'compliance-001',
        checklistIds: ['restricted_words', 'brand_infringement'],
        createdAt: '2026-01-01T00:50:00.000Z',
      },
      {
        workItemId: 'competitor_listing:hist-001',
        marketplace: 'DE',
        language: 'German',
        asinOrSku: 'B000000001',
        sourceRoute: 'keyword_hunter_analysis',
        updatedAt: '2026-01-01T00:50:00.000Z',
      }
    );
    const container = document.createElement('div');
    await overviewModule.mount(container);

    const progressButton =
      container.querySelector<HTMLButtonElement>('[aria-label="查看复核进度"]');
    progressButton?.click();
    expect(progressButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.app-overview-compliance-review.hidden')).toBeNull();
    expect(container.textContent).toContain('不会自动修改 Listing 或广告');
    const journey = container.querySelector('.app-overview-recent-journey');
    const journeySteps = journey?.querySelectorAll('.app-overview-recent-journey-step');
    expect(journeySteps).toHaveLength(5);
    expect(journeySteps?.[0]?.textContent).toContain('数据采集');
    expect(journeySteps?.[4]?.textContent).toContain('合规复核');
    expect(journeySteps?.[4]?.classList).toContain('app-overview-recent-journey-step--current');
    expect(journey?.textContent).toContain('当前：合规复核');
    expect(container.querySelector('.app-overview-recent-item')?.textContent).not.toContain(
      '已完成 0/5 步'
    );

    const firstStatus = container.querySelector<HTMLSelectElement>(
      '[data-compliance-item-id="restricted_words"]'
    );
    if (!firstStatus) throw new Error('Compliance status control was not rendered');
    firstStatus.value = 'confirmed';
    firstStatus.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const [artifact] = getArtifactsForWorkItem('competitor_listing:hist-001');
      expect(String(artifact?.metadata?.reviewStates)).toContain('confirmed');
    });
  });

  it('shows recent empty state guidance when no artifacts exist', async () => {
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const empty = container.querySelector<HTMLElement>('.app-overview-recent-empty');
    const list = container.querySelector<HTMLElement>('.app-overview-recent-list');

    expect(list?.classList.contains('hidden')).toBe(true);
    expect(empty?.classList.contains('hidden')).toBe(false);
    expect(empty?.textContent).toContain('暂无最近作业');
    expect(empty?.querySelector<HTMLButtonElement>('[data-tab="scraper"]')?.textContent).toContain(
      '开始采集'
    );
  });

  it('lets users switch recent columns and persists the preference', async () => {
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const container = document.createElement('div');

    await overviewModule.mount(container);

    const shell = container.querySelector<HTMLElement>('.app-overview-recent-shell');
    const oneColBtn = container.querySelector<HTMLButtonElement>(
      '.app-overview-recent-columns-btn[data-recent-columns="1"]'
    );
    const threeColBtn = container.querySelector<HTMLButtonElement>(
      '.app-overview-recent-columns-btn[data-recent-columns="3"]'
    );

    expect(shell?.getAttribute('data-recent-columns')).toBe('2');
    expect(
      container
        .querySelector('.app-overview-recent-columns-btn[data-recent-columns="2"]')
        ?.getAttribute('aria-pressed')
    ).toBe('true');

    threeColBtn?.click();

    expect(shell?.getAttribute('data-recent-columns')).toBe('3');
    expect(threeColBtn?.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('app_center_overview_recent_columns_v1')).toBe('3');

    oneColBtn?.click();

    expect(shell?.getAttribute('data-recent-columns')).toBe('1');
    expect(oneColBtn?.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('app_center_overview_recent_columns_v1')).toBe('1');
  });

  it('restores the saved recent columns preference on mount', async () => {
    localStorage.setItem('app_center_overview_recent_columns_v1', '3');
    safeTemplateLoaderMocks.loadTemplate.mockResolvedValue(
      readFileSync(realOverviewTemplatePath, 'utf8')
    );
    const container = document.createElement('div');

    await overviewModule.mount(container);

    expect(
      container.querySelector('.app-overview-recent-shell')?.getAttribute('data-recent-columns')
    ).toBe('3');
    expect(
      container
        .querySelector('.app-overview-recent-columns-btn[data-recent-columns="3"]')
        ?.getAttribute('aria-pressed')
    ).toBe('true');
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

    const masterCard = container.querySelector<HTMLElement>(
      '.app-overview-card[data-category="master_analysis"]'
    );
    const ppcCard = container.querySelector<HTMLElement>(
      '.app-overview-card[data-category="ppc_tools"]'
    );
    const masterRow = container.querySelector<HTMLElement>(
      '.app-overview-list-row[data-category="master_analysis"]'
    );
    const ppcRow = container.querySelector<HTMLElement>(
      '.app-overview-list-row[data-category="ppc_tools"]'
    );

    // Author CSS uses display:flex on cards; only `.hidden` reliably hides them.
    expect(masterCard?.hidden).toBe(true);
    expect(masterCard?.classList.contains('hidden')).toBe(true);
    expect(ppcCard?.hidden).toBe(false);
    expect(ppcCard?.classList.contains('hidden')).toBe(false);
    expect(masterRow?.hidden).toBe(true);
    expect(masterRow?.classList.contains('hidden')).toBe(true);
    expect(ppcRow?.hidden).toBe(false);
    expect(ppcRow?.classList.contains('hidden')).toBe(false);
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
