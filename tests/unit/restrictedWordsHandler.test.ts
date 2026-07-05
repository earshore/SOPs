import { beforeEach, expect, it, vi } from 'vitest';
import {
  cleanupRestrictedWordsPanel,
  initRestrictedWordsPanel,
} from '@/modules/sops/views/growth/restricted_words/restrictedWordsHandler';

const actionRegistryMock = vi.hoisted(() => ({
  registerActionsWithLegacy: vi.fn(),
  unregisterActions: vi.fn(),
}));

vi.mock('@/common/utils/actionRegistry', () => actionRegistryMock);

function buildDom(): void {
  document.body.innerHTML = `
    <input id="rw-search-input" />
    <button id="rw-search-btn"></button>
    <button id="rw-clear-btn"></button>
    <select id="rw-search-mode">
      <option value="fuzzy">fuzzy</option>
      <option value="exact">exact</option>
      <option value="fulltext">fulltext</option>
      <option value="regex">regex</option>
    </select>
    <select id="rw-filter-category"></select>
    <select id="rw-filter-risk"></select>
    <select id="rw-site-context">
      <option value="ALL">ALL</option>
      <option value="DE">DE</option>
      <option value="US">US</option>
    </select>
    <div id="rw-stats-display"></div>
    <table><tbody id="rw-results-tbody"></tbody></table>
    <div id="rw-detail-modal" class="hidden">
      <div id="rw-modal-header"></div>
      <div id="rw-detail-content"></div>
    </div>
  `;
}

function rows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('#rw-results-tbody tr'));
}

function setSearch(query: string, mode = 'fuzzy'): void {
  const input = document.getElementById('rw-search-input') as HTMLInputElement;
  const modeSelect = document.getElementById('rw-search-mode') as HTMLSelectElement;
  input.value = query;
  modeSelect.value = mode;
  document.getElementById('rw-search-btn')?.click();
}

function initFreshPanel(): void {
  initRestrictedWordsPanel();
  document.getElementById('rw-clear-btn')?.click();
}

beforeEach(() => {
  vi.useRealTimers();
  buildDom();
  actionRegistryMock.registerActionsWithLegacy.mockReset().mockReturnValue([
    'showWordDetail',
    'closeWordDetail',
  ]);
  actionRegistryMock.unregisterActions.mockReset();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  cleanupRestrictedWordsPanel();
});

  it('initializes filters, renders all rows, and registers legacy actions', () => {
    initFreshPanel();

    expect(document.getElementById('rw-filter-category')?.textContent).toContain('全部分类');
    expect(document.getElementById('rw-filter-risk')?.textContent).toContain('全部');
    expect(rows().length).toBeGreaterThan(10);
    expect(document.getElementById('rw-stats-display')?.textContent).toMatch(/显示 \d+ 条结果/);
    expect(window.showWordDetail).toBeTypeOf('function');
    expect(window.closeWordDetail).toBeTypeOf('function');
    expect(actionRegistryMock.registerActionsWithLegacy).toHaveBeenCalledWith({
      showWordDetail: expect.any(Function),
      closeWordDetail: expect.any(Function),
    });
  });

  it('searches with exact, fuzzy, fulltext, and invalid regex modes', () => {
    initFreshPanel();
    const firstKeyword = rows()[0]?.querySelector('td div')?.textContent?.trim() || '';
    expect(firstKeyword).not.toBe('');

    setSearch(firstKeyword, 'exact');
    expect(rows().length).toBeGreaterThan(0);
    expect(document.getElementById('rw-results-tbody')?.textContent?.toLowerCase()).toContain(
      firstKeyword.toLowerCase()
    );

    setSearch(firstKeyword.slice(0, Math.max(2, Math.floor(firstKeyword.length / 2))), 'fuzzy');
    expect(rows().length).toBeGreaterThan(0);

    setSearch('risk', 'fulltext');
    expect(document.getElementById('rw-stats-display')?.textContent).toMatch(/显示 \d+ 条结果/);

    setSearch('[', 'regex');
    expect(document.getElementById('rw-results-tbody')?.textContent).toContain('没有找到相关高危词条');
    expect(document.getElementById('rw-results-tbody')?.textContent).toContain(
      '推荐操作：清除部分筛选条件，或切换到模糊搜索后重试。'
    );
    expect(document.querySelector('#rw-results-tbody [role="status"]')).not.toBeNull();
  });

  it('filters by category, risk, and site, then resets filters', () => {
    initFreshPanel();
    const initialCount = rows().length;
    const categorySelect = document.getElementById('rw-filter-category') as HTMLSelectElement;
    const riskSelect = document.getElementById('rw-filter-risk') as HTMLSelectElement;
    const siteSelect = document.getElementById('rw-site-context') as HTMLSelectElement;
    const categoryValue = Array.from(categorySelect.options).find(option => option.value)?.value || '';
    const riskValue = Array.from(riskSelect.options).find(option => option.value)?.value || '';

    categorySelect.value = categoryValue;
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(rows().length).toBeLessThanOrEqual(initialCount);

    riskSelect.value = riskValue;
    riskSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('rw-stats-display')?.textContent).toMatch(/显示 \d+ 条结果/);

    siteSelect.value = 'DE';
    siteSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('rw-stats-display')?.textContent).toMatch(/显示 \d+ 条结果/);

    document.getElementById('rw-clear-btn')?.click();

    expect((document.getElementById('rw-search-input') as HTMLInputElement).value).toBe('');
    expect(categorySelect.value).toBe('');
    expect(riskSelect.value).toBe('');
    expect(siteSelect.value).toBe('ALL');
    expect(rows().length).toBe(initialCount);
  });

  it('opens and closes detail modal from rendered actions and window bridge', async () => {
    vi.useFakeTimers();
    initFreshPanel();

    rows()[0]?.querySelector<HTMLButtonElement>('button')?.click();
    await vi.advanceTimersByTimeAsync(16);

    const modal = document.getElementById('rw-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(modal?.classList.contains('show')).toBe(true);
    expect(document.getElementById('rw-modal-header')?.textContent).toContain('ID:');
    expect(document.getElementById('rw-detail-content')?.textContent).toContain('风险');

    window.closeWordDetail?.();
    expect(modal?.classList.contains('show')).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(modal?.classList.contains('hidden')).toBe(true);

    window.showWordDetail?.('__missing__');
    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('cleans up event listeners, action registration, and window bridge', () => {
    initFreshPanel();
    cleanupRestrictedWordsPanel();

    expect(actionRegistryMock.unregisterActions).toHaveBeenCalledWith([
      'showWordDetail',
      'closeWordDetail',
    ]);
    expect(window.showWordDetail).toBeUndefined();
    expect(window.closeWordDetail).toBeUndefined();

    const statsBefore = document.getElementById('rw-stats-display')?.textContent;
    setSearch('anything');
    expect(document.getElementById('rw-stats-display')?.textContent).toBe(statsBefore);
  });
