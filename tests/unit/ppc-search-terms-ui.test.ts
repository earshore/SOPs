import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/ppc_search_terms/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { showToast } from '@/common/ui/notifications';

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  showToast: vi.fn(),
  template: `
    <div>
      <div id="ppc-stat-rows"></div>
      <div id="ppc-stat-spend"></div>
      <div id="ppc-stat-acos"></div>
      <div id="ppc-stat-actions"></div>
      <p id="ppc-file-name"></p>
      <p id="ppc-mapping-status"></p>
      <textarea id="ppc-paste-input"></textarea>
      <input id="ppc-file-input" type="file" />
      <input id="ppc-target-acos" value="35" />
      <input id="ppc-high-acos" value="55" />
      <input id="ppc-min-clicks" value="12" />
      <input id="ppc-min-spend" value="15" />
      <input id="ppc-min-orders" value="2" />
      <input id="ppc-min-ctr" value="0.35" />
      <button id="ppc-btn-sample" type="button"></button>
      <button id="ppc-btn-parse" type="button"></button>
      <button id="ppc-btn-clear" type="button"></button>
      <button id="ppc-export-all" type="button"></button>
      <button id="ppc-export-current" type="button"></button>
      <button id="ppc-export-negative" type="button"></button>
      <button id="ppc-export-harvest" type="button"></button>
      <button id="ppc-copy-summary" type="button"></button>
      <button class="ppc-filter-btn active" type="button" data-filter="all"></button>
      <button class="ppc-filter-btn" type="button" data-filter="negative_exact"></button>
      <button class="ppc-filter-btn" type="button" data-filter="harvest_exact"></button>
      <button class="ppc-filter-btn" type="button" data-filter="scale_budget"></button>
      <button class="ppc-filter-btn" type="button" data-filter="bid_down"></button>
      <button class="ppc-filter-btn" type="button" data-filter="listing_term"></button>
      <button class="ppc-filter-btn" type="button" data-filter="observe"></button>
      <p id="ppc-result-count"></p>
      <div id="ppc-empty-state"></div>
      <div id="ppc-table-wrapper" class="hidden"><table><tbody id="ppc-results-body"></tbody></table></div>
    </div>
  `,
}));

vi.mock('@/common/utils/viewLoader', () => ({
  loadTemplate: vi.fn(() => Promise.resolve(mocks.template)),
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: () => ({
      renderTemplate: (container: HTMLElement, html: string) => {
        container.innerHTML = html;
      },
    }),
  },
}));

vi.mock('@/common/ui/notifications', () => ({
  showToast: mocks.showToast,
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

describe('PPC 搜索词分析器 UI 行为', () => {
  let container: HTMLElement;
  let anchorClick: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockReturnValue({});
    mocks.storageSet.mockClear();
    mocks.showToast.mockClear();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await mount(container);
  });

  afterEach(() => {
    unmount();
    anchorClick.mockRestore();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('加载样例后可筛选并导出当前筛选', () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-export-current')?.click();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/app_center/views/ppc_search_terms/template.html');
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('共 10 行，当前筛选 2 行。');
    expect(anchorClick).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('导出完成', { type: 'success', description: '2 行动作已导出' });
  });

  it('清空时重置结果和筛选状态', () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-clear')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('等待导入数据。');
    expect(container.querySelector<HTMLButtonElement>('[data-filter="all"]')?.classList.contains('active')).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('#ppc-paste-input')?.value).toBe('');
  });

  it('剪贴板不可用时提示复制失败', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-copy-summary')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showToast).toHaveBeenCalledWith('复制失败', {
      type: 'error',
      description: '当前浏览器没有开放剪贴板写入权限',
    });
  });
});
