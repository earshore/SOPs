import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/ppc_search_terms/index';
import { loadTemplate } from '@/common/utils/viewLoader';
import { showToast } from '@/common/ui/notifications';

interface LlmMockRow {
  id: string;
  action: string;
  reason: string;
  priority: number;
}

interface LlmMockInput {
  rows: LlmMockRow[];
  onProgress?: (progress: { completedBatches: number; totalBatches: number }) => void;
}

const mocks = vi.hoisted(() => ({
  analyzeWithLLM: vi.fn(),
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  showToast: vi.fn(),
  template: `
    <div>
      <div id="ppc-stat-rows"></div>
      <div id="ppc-stat-rows-label"></div>
      <div id="ppc-stat-spend"></div>
      <div id="ppc-stat-acos"></div>
      <div id="ppc-stat-actions"></div>
      <p id="ppc-file-name"></p>
      <p id="ppc-mapping-status"></p>
      <select id="ppc-report-type">
        <option value="auto">自动识别</option>
        <option value="search_term">店铺搜索广告报告</option>
        <option value="erp_campaign">ERP 广告活动报表</option>
      </select>
      <textarea id="ppc-paste-input"></textarea>
      <input id="ppc-file-input" type="file" />
      <input id="ppc-target-acos" value="35" />
      <input id="ppc-high-acos" value="55" />
      <input id="ppc-min-clicks" value="12" />
      <input id="ppc-min-spend" value="15" />
      <input id="ppc-min-orders" value="2" />
      <input id="ppc-min-ctr" value="0.35" />
      <input id="ppc-allow-local-fallback" type="checkbox" />
      <input id="ppc-use-context" type="checkbox" />
      <button id="ppc-analysis-settings-toggle" type="button" aria-expanded="false"></button>
      <div id="ppc-analysis-settings-body" class="hidden"></div>
      <div id="ppc-context-fields" class="hidden">
        <input id="ppc-context-asin" />
        <input id="ppc-context-category" />
        <textarea id="ppc-context-listing"></textarea>
      </div>
      <button id="ppc-btn-sample" type="button"></button>
      <button id="ppc-btn-parse" type="button"></button>
      <button id="ppc-btn-clear" type="button"></button>
      <button id="ppc-export-all" type="button"></button>
      <button id="ppc-export-current" type="button"></button>
      <button id="ppc-export-negative" type="button"></button>
      <button id="ppc-export-harvest" type="button"></button>
      <button id="ppc-copy-summary" type="button"></button>
      <input id="ppc-action-search" type="search" />
      <button id="ppc-action-search-clear" type="button"></button>
      <div id="ppc-filter-buttons"></div>
      <p id="ppc-result-count"></p>
      <div id="ppc-empty-state"><div id="ppc-empty-title"></div><p id="ppc-empty-description"></p></div>
      <div id="ppc-table-wrapper" class="hidden"><table><thead><tr><th id="ppc-object-header"></th></tr></thead><tbody id="ppc-results-body"></tbody></table></div>
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

vi.mock('@/modules/app_center/views/ppc_search_terms/services/llmAnalysisService', () => ({
  analyzePpcSearchTermsWithLLM: mocks.analyzeWithLLM,
}));

async function flushAnalysis(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

describe('PPC 搜索词分析器 UI 行为', () => {
  let container: HTMLElement;
  let anchorClick: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.storageGet.mockReturnValue({});
    mocks.storageSet.mockClear();
    mocks.showToast.mockClear();
    mocks.analyzeWithLLM.mockReset();
    mocks.analyzeWithLLM.mockImplementation(async ({ rows, onProgress }: LlmMockInput) => {
      onProgress?.({ completedBatches: 1, totalBatches: 1 });
      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        reason: `模型建议：${row.reason}`,
        priority: row.priority,
      }));
    });
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

  it('加载样例后可调用模型、筛选并导出当前筛选', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-export-current')?.click();

    expect(loadTemplate).toHaveBeenCalledWith('src/modules/app_center/views/ppc_search_terms/template.html');
    expect(mocks.analyzeWithLLM).toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('共 10 行，当前筛选 2 行。');
    expect(anchorClick).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('导出完成', { type: 'success', description: '2 行动作已导出' });
  });

  it('清空时重置结果和筛选状态', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-clear')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('等待导入数据。');
    expect(container.querySelector<HTMLButtonElement>('[data-filter="all"]')?.classList.contains('active')).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('#ppc-paste-input')?.value).toBe('');
  });

  it('支持动作清单搜索并导出当前搜索结果', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();

    const search = container.querySelector<HTMLInputElement>('#ppc-action-search');
    if (search) {
      search.value = 'waterproof dog jacket';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }

    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('共 10 行，匹配 1 行，当前筛选 1 行。');
    expect(container.querySelectorAll('#ppc-results-body tr')).toHaveLength(1);

    container.querySelector<HTMLButtonElement>('#ppc-export-current')?.click();
    expect(showToast).toHaveBeenCalledWith('导出完成', { type: 'success', description: '1 行动作已导出' });

    container.querySelector<HTMLButtonElement>('#ppc-action-search-clear')?.click();
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('共 10 行，当前筛选 10 行。');
  });

  it('剪贴板不可用时提示复制失败', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();
    container.querySelector<HTMLButtonElement>('#ppc-copy-summary')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(showToast).toHaveBeenCalledWith('复制失败', {
      type: 'error',
      description: '当前浏览器没有开放剪贴板写入权限',
    });
  });

  it('模型失败且未开启降级时不使用本地规则', async () => {
    mocks.analyzeWithLLM.mockRejectedValueOnce(new Error('LLM unavailable'));

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(showToast).toHaveBeenCalledWith('分析失败', { type: 'error', description: 'LLM unavailable' });
  });

  it('模型失败且开启降级时使用本地规则', async () => {
    mocks.analyzeWithLLM.mockRejectedValueOnce(new Error('LLM unavailable'));
    const fallback = container.querySelector<HTMLInputElement>('#ppc-allow-local-fallback');
    if (fallback) {
      fallback.checked = true;
      fallback.dispatchEvent(new Event('change'));
    }

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(showToast).toHaveBeenCalledWith('模型分析失败，已使用本地规则', {
      type: 'warning',
      description: 'LLM unavailable',
    });
  });

  it('开启产品上下文时传给模型分析服务', async () => {
    const useContext = container.querySelector<HTMLInputElement>('#ppc-use-context');
    if (useContext) {
      useContext.checked = true;
      useContext.dispatchEvent(new Event('change'));
    }
    const asin = container.querySelector<HTMLInputElement>('#ppc-context-asin');
    const category = container.querySelector<HTMLInputElement>('#ppc-context-category');
    const listing = container.querySelector<HTMLTextAreaElement>('#ppc-context-listing');
    if (asin) asin.value = 'B0TEST1234';
    if (category) category.value = 'Dog Coats';
    if (listing) listing.value = 'Waterproof winter dog coat with reflective strips.';

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();

    expect(mocks.analyzeWithLLM).toHaveBeenCalledWith(expect.objectContaining({
      context: {
        asin: 'B0TEST1234',
        category: 'Dog Coats',
        listing: 'Waterproof winter dog coat with reflective strips.',
      },
    }));
  });
});
