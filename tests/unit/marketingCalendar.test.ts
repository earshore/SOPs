import { beforeEach, expect, it, vi } from 'vitest';
import {
  __setTodayForTests,
  mount,
  unmount,
} from '@/modules/amz_hub/views/practice/marketing_calendar';
import { AMZF_COPY } from '@/modules/amz_hub/data/marketingCalendar/copy';
import { buildOpsViews } from '@/modules/amz_hub/views/practice/marketing_calendar/opsCalendarEngine';
import {
  renderOpsCard,
  renderPendingSection,
} from '@/modules/amz_hub/views/practice/marketing_calendar/renderOps';
import { resolveYear } from '@/modules/amz_hub/data/marketingCalendar/resolveYear';
import { renderEncyclopedia } from '@/modules/amz_hub/views/practice/marketing_calendar/renderEncyclopedia';
import { getPrimaryCtas } from '@/modules/amz_hub/data/marketingCalendar/primaryCtas';
import type { EventOccurrence } from '@/modules/amz_hub/data/marketingCalendar/types';

const mocks = vi.hoisted(() => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
  configGet: vi.fn(),
  container: {
    resolve: vi.fn(),
    has: vi.fn(),
  },
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: mocks.configGet,
  },
}));

vi.mock('@/common/di/Container', () => ({
  container: mocks.container,
}));

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function input(element: HTMLInputElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mountCalendar(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

beforeEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  __setTodayForTests(null);
  mocks.storage.get.mockReset().mockReturnValue(['Prime Day', '圣诞']);
  mocks.storage.set.mockReset();
  mocks.configGet.mockReset().mockReturnValue(5);
  mocks.container.resolve.mockReset().mockImplementation((name: string) => {
    if (name === 'storage') return mocks.storage;
    return {};
  });
  mocks.container.has.mockReset().mockReturnValue(true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  unmount();
});

  it('mounts the calendar and renders countries, stats, and event cards', async () => {
    const container = await mountCalendar();

    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector('#amzf_stats')?.textContent).toContain('营销节点');
    expect(container.querySelector('#amzf_country_tabs')?.textContent).toContain('全部');
    expect(container.querySelector('#amzf_main')?.textContent).toMatch(/怎么打|电商切入策略/);
    expect(mocks.storage.get).toHaveBeenCalledWith('amzf_search_history', []);
  });

  it('mounts ops workbench shell: 作业台 tab, default 60-day chip, source panel', async () => {
    const container = await mountCalendar();

    expect(container.textContent).toContain(AMZF_COPY['tab.ops']);
    expect(container.querySelector('[data-amzf-main-tab="ops"]')).not.toBeNull();
    expect(container.querySelector('[data-amzf-main-tab="encyclopedia"]')).not.toBeNull();

    const d60 = container.querySelector('[data-amzf-time-window="d60"]');
    expect(d60).not.toBeNull();
    expect(d60?.classList.contains('amzf_active')).toBe(true);

    expect(container.querySelector('#amzf_source_panel')).not.toBeNull();
    expect(container.querySelector('#amzf_ops_root')).not.toBeNull();
    expect(container.querySelector('#amzf_pending_section')).not.toBeNull();
    expect(container.querySelector('#amzf_page_checklist')).not.toBeNull();
  });

  it('searches, persists history, and clears search state', async () => {
    vi.useFakeTimers();
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    const clear = container.querySelector('#amzf_clear');

    expect(search).not.toBeNull();
    search?.focus();
    await vi.advanceTimersByTimeAsync(16);
    expect(document.body.querySelector('#amzf_search_history')).not.toBeNull();
    expect(document.body.querySelector('#amzf_search_history')?.classList.contains('amzf_show')).toBe(true);

    input(search as HTMLInputElement, 'Prime');
    await vi.advanceTimersByTimeAsync(300);

    expect(clear?.classList.contains('amzf_visible')).toBe(true);
    expect(container.querySelector('#amzf_main')?.textContent).toContain('Prime');

    search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(mocks.storage.set).toHaveBeenCalledWith(
      'amzf_search_history',
      expect.arrayContaining(['Prime'])
    );

    click(clear);
    expect(search?.value).toBe('');
    expect(clear?.classList.contains('amzf_visible')).toBe(false);
  });

  it('handles country, view, section, and quick-tag controls through delegated clicks', async () => {
    const container = await mountCalendar();
    const germany = container.querySelector('[data-amzf-country="DE"]');
    click(germany);

    expect(germany?.classList.contains('amzf_active')).toBe(true);

    click(container.querySelector('[data-action="amzf_switchView"][data-param="event"]'));
    expect(container.querySelector('#amzf_btn_event')?.classList.contains('amzf_active')).toBe(true);
    expect(container.querySelector('#amzf_main')?.innerHTML).toContain('amzf_event_view');

    const sectionToggle = container.querySelector('[data-amzf-toggle-section]');
    const sectionId = (sectionToggle as HTMLElement | null)?.dataset.amzfToggleSection;
    click(sectionToggle);

    expect(sectionId ? document.getElementById(sectionId)?.classList.contains('amzf_expanded') : false).toBe(true);

    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();
    const quickTag = document.body.querySelector<HTMLElement>('[data-amzf-quick-tag]');
    click(quickTag);

    expect(search?.value).toBe(quickTag?.dataset.amzfQuickTag);
    expect(document.body.querySelector('#amzf_search_history')?.classList.contains('amzf_show')).toBe(false);
  });

  it('renders and mutates search history controls outside the module container', async () => {
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();

    const history = document.body.querySelector('#amzf_search_history');
    expect(history?.textContent).toContain('搜索历史');
    expect(history?.textContent).toContain('Prime Day');

    click(history?.querySelector('[data-amzf-delete-history-index="0"]'));
    expect(mocks.storage.set).toHaveBeenCalledWith('amzf_search_history', ['圣诞']);

    click(history?.querySelector('[data-amzf-clear-history]'));
    expect(mocks.storage.set).toHaveBeenCalledWith('amzf_search_history', []);
  });

  it('hides or removes floating history on document interactions and unmount', async () => {
    const container = await mountCalendar();
    const search = container.querySelector<HTMLInputElement>('#amzf_search');
    search?.focus();

    const history = document.body.querySelector('#amzf_search_history');
    expect(history?.classList.contains('amzf_show')).toBe(true);

    window.dispatchEvent(new Event('scroll'));
    expect(history?.classList.contains('amzf_show')).toBe(false);

    search?.dispatchEvent(new FocusEvent('focus'));
    window.dispatchEvent(new Event('resize'));
    expect(history?.classList.contains('amzf_show')).toBe(true);

    unmount();
    expect(document.body.querySelector('#amzf_search_history')).toBeNull();
  });

  it('switches main tab between ops and encyclopedia', async () => {
    const container = await mountCalendar();

    expect(container.querySelector('[data-amzf-main-tab="ops"]')?.classList.contains('amzf_active')).toBe(
      true
    );
    expect(container.querySelector('#amzf_time_chips')?.classList.contains('amzf_hidden')).toBe(false);
    expect(container.querySelector('#amzf_main')?.querySelector('.amzf_ops_list, .amzf_empty')).not.toBeNull();

    click(container.querySelector('[data-amzf-main-tab="encyclopedia"]'));

    expect(
      container.querySelector('[data-amzf-main-tab="encyclopedia"]')?.classList.contains('amzf_active')
    ).toBe(true);
    expect(container.querySelector('#amzf_time_chips')?.classList.contains('amzf_hidden')).toBe(true);
    expect(container.querySelector('#amzf_encyclopedia_view_toggle')?.classList.contains('amzf_hidden')).toBe(
      false
    );
    expect(container.querySelector('#amzf_main')?.querySelector('.amzf_timeline, .amzf_empty')).not.toBeNull();
    expect(container.querySelector('#amzf_pending_section')?.innerHTML).toBe('');

    click(container.querySelector('[data-amzf-main-tab="ops"]'));
    expect(container.querySelector('[data-amzf-main-tab="ops"]')?.classList.contains('amzf_active')).toBe(
      true
    );
    expect(container.querySelector('#amzf_time_chips')?.classList.contains('amzf_hidden')).toBe(false);
  });

  it('applies country filter on ops list', async () => {
    __setTodayForTests('2026-06-01');
    const container = await mountCalendar();

    // all-year window so DE-only filter is visible without empty d60
    click(container.querySelector('[data-amzf-time-window="all"]'));
    const allCount = container.querySelectorAll('#amzf_main [data-amzf-occurrence]').length;
    expect(allCount).toBeGreaterThan(0);

    click(container.querySelector('[data-amzf-country="DE"]'));
    expect(container.querySelector('[data-amzf-country="DE"]')?.classList.contains('amzf_active')).toBe(
      true
    );

    const deCards = container.querySelectorAll('#amzf_main [data-amzf-occurrence]');
    expect(deCards.length).toBeGreaterThan(0);
    expect(deCards.length).toBeLessThanOrEqual(allCount);

    // encyclopedia with DE filter still renders month sections from EventOccurrence
    click(container.querySelector('[data-amzf-main-tab="encyclopedia"]'));
    expect(container.querySelector('#amzf_main .amzf_month_section, #amzf_main .amzf_empty')).not.toBeNull();
  });

  it('switches time window chips and re-renders ops list', async () => {
    __setTodayForTests('2026-06-01');
    const container = await mountCalendar();

    const d60 = container.querySelector('[data-amzf-time-window="d60"]');
    expect(d60?.classList.contains('amzf_active')).toBe(true);
    const d60Count = container.querySelectorAll('#amzf_main [data-amzf-occurrence]').length;

    click(container.querySelector('[data-amzf-time-window="month"]'));
    expect(
      container.querySelector('[data-amzf-time-window="month"]')?.classList.contains('amzf_active')
    ).toBe(true);
    expect(d60?.classList.contains('amzf_active')).toBe(false);

    const monthCount = container.querySelectorAll('#amzf_main [data-amzf-occurrence]').length;
    // June 2026 window ⊆ next 60 days from June 1 — month count ≤ d60
    expect(monthCount).toBeLessThanOrEqual(d60Count);

    click(container.querySelector('[data-amzf-time-window="all"]'));
    const allCount = container.querySelectorAll('#amzf_main [data-amzf-occurrence]').length;
    expect(allCount).toBeGreaterThanOrEqual(d60Count);
  });

  it('shows dual primary CTAs on Prime Day ads window (fixed today)', () => {
    // Pure path: fixed today without mount hook
    const occs = resolveYear(2026);
    const views = buildOpsViews(
      occs,
      {
        selectedCountry: 'ALL',
        selectedTypes: [],
        timeWindow: 'all',
        showEnded: true,
        searchTerm: '',
      },
      '2026-06-18',
      new Set()
    );
    const prime = views.find(v => v.occurrence.templateId === 'prime-day');
    expect(prime).toBeDefined();
    expect(prime!.primaryCtas).toHaveLength(2);
    expect(prime!.primaryCtas.map(c => c.key)).toEqual(['promoTools', 'ppc']);

    const html = renderOpsCard(prime!);
    expect(html.match(/data-amzf-primary-cta=/g)?.length).toBe(2);
    expect(html).toContain('data-action="switch-tab"');
    expect(html).toContain('data-tab="amz_promo_tools"');
    expect(html).toContain('data-tab="sops_ppc_advertising"');
  });

  it('renders switch-tab primary CTAs for inventory + enroll sample (T-25)', () => {
    const occs = resolveYear(2026);
    const views = buildOpsViews(
      occs,
      {
        selectedCountry: 'ALL',
        selectedTypes: [],
        timeWindow: 'all',
        showEnded: true,
        searchTerm: '',
      },
      '2026-05-29',
      new Set()
    );
    const prime = views.find(v => v.occurrence.templateId === 'prime-day');
    expect(prime).toBeDefined();
    expect(prime!.primaryCtas.map(c => c.routeId).sort()).toEqual(
      ['sops_inventory_replenishment', 'sops_promotion_submission'].sort()
    );

    const html = renderOpsCard(prime!);
    expect(html).toContain('data-action="switch-tab"');
    expect(html).toContain('data-tab="sops_inventory_replenishment"');
    expect(html).toContain('data-tab="sops_promotion_submission"');
    expect(html.match(/data-action="switch-tab"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('pending primary CTA uses data-amzf-scroll-source, not hash href', () => {
    const pendingOcc: EventOccurrence = {
      occurrenceId: 'prime-day:pending',
      templateId: 'prime-day',
      year: 2026,
      name: 'Prime Day',
      nameEn: 'Prime Day',
      emoji: '📦',
      type: 'shopping',
      priority: 'S',
      countries: ['DE'],
      description: 'pending',
      strategy: 'wait',
      tags: [],
      startDate: '',
      endDate: '',
      dateLabel: '',
      confidence: 'pending_official',
      amazonOfficial: true,
    };
    const ctas = getPrimaryCtas(pendingOcc, '2026-05-01');
    expect(ctas[0]?.kind).toBe('anchor');
    expect(ctas[0]?.anchorId).toBe('amzf_source_panel');

    const cardHtml = renderOpsCard({
      occurrence: pendingOcc,
      openPhases: [],
      lifecycle: 'pending',
      primaryCtas: ctas,
      secondaryCtas: [],
      watched: false,
    });
    expect(cardHtml).toContain('data-amzf-scroll-source="amzf_source_panel"');
    expect(cardHtml).not.toContain('href="#amzf_source_panel"');
    expect(cardHtml).toContain('data-amzf-primary-cta="pendingSource"');

    const sectionHtml = renderPendingSection([pendingOcc]);
    expect(sectionHtml).toContain('data-amzf-scroll-source="amzf_source_panel"');
    expect(sectionHtml).not.toContain('href="#amzf_source_panel"');
  });

  it('renderEncyclopedia builds month and event views from occurrences', () => {
    const occs = resolveYear(2026).slice(0, 8);
    const monthHtml = renderEncyclopedia({
      occurrences: occs,
      view: 'country',
      searchTerm: '',
    });
    expect(monthHtml).toContain('amzf_timeline');
    expect(monthHtml).toContain('amzf_month_section');
    expect(monthHtml).toContain('data-amzf-occurrence=');

    const eventHtml = renderEncyclopedia({
      occurrences: occs,
      view: 'event',
      searchTerm: '',
    });
    expect(eventHtml).toContain('amzf_event_view');
    expect(eventHtml).toContain('amzf_event_comparison');
  });
