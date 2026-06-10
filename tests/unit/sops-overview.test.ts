import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTemplate } from '@/common/utils/viewLoader';
import { StorageService } from '@/services/storageService';
import { mount, unmount } from '@/modules/sops/views/overview/index';

const overviewTemplate = `
  <div class="sops-overview">
    <button class="category-filter-btn active bg-blue-500 text-white hover:bg-blue-600" data-category="all"></button>
    <button class="category-filter-btn bg-white text-slate-700 border-slate-300" data-category="growth"></button>
    <section data-category="growth"></section>
    <div class="sop-card" data-category="growth"><h3>Listing</h3><p>SEO</p></div>
    <div data-ops-metric-count="ppc.action_export">0</div>
    <span data-ops-metric-last="ppc.action_export">未记录</span>
    <div data-ops-metric-count="listing.review_template_copy">0</div>
    <span data-ops-metric-last="listing.review_template_copy">未记录</span>
  </div>
`;

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn(),
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('SOPs Overview', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(loadTemplate).mockResolvedValue(overviewTemplate);
    vi.mocked(StorageService.get).mockReturnValue({
      'ppc.action_export': {
        count: 2,
        lastAt: '2026-01-02T03:04:05',
      },
      'listing.review_template_copy': {
        count: 1,
        lastAt: '2026-01-03T04:05:06',
      },
    });
  });

  afterEach(() => {
    unmount();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders local pilot usage metrics on mount', async () => {
    await mount(container);

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/sops/views/overview/template.html');
    expect(StorageService.get).toHaveBeenCalledWith('ops_metrics_v1', {});
    expect(container.querySelector('[data-ops-metric-count="ppc.action_export"]')?.textContent).toBe('2');
    expect(container.querySelector('[data-ops-metric-last="ppc.action_export"]')?.textContent).toBe('01-02 03:04');
    expect(container.querySelector('[data-ops-metric-count="listing.review_template_copy"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-ops-metric-last="listing.review_template_copy"]')?.textContent).toBe('01-03 04:05');
  });

  it('keeps missing local metrics at zero', async () => {
    vi.mocked(StorageService.get).mockReturnValue({});

    await mount(container);

    expect(container.querySelector('[data-ops-metric-count="ppc.action_export"]')?.textContent).toBe('0');
    expect(container.querySelector('[data-ops-metric-last="ppc.action_export"]')?.textContent).toBe('未记录');
  });
});
