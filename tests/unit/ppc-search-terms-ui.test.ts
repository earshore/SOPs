import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/ppc_tools/ppc_search_terms/index';
import { showToast } from '@/common/ui/notifications';

interface LlmMockRow {
  id: string;
  action: string;
  reason: string;
  priority: number;
}

interface LlmMockInput {
  rows: LlmMockRow[];
  signal?: AbortSignal;
  onProgress?: (progress: {
    completedBatches: number;
    totalBatches: number;
    decisions?: LlmMockRow[];
    cachedBatches?: number;
    firstResponse?: {
      batchIndex: number;
      elapsedMs: number;
      firstChunkMs?: number;
      chunkCount: number;
    };
  }) => void;
}

interface LlmMockAgentResult {
  decisions: LlmMockRow[];
  modelDecisionIds: string[];
  toolCalls: Array<{
    tool: string;
    inputRows: number;
    outputRows: number;
    note: string;
  }>;
  summary: {
    totalRows: number;
    localRows: number;
    modelRows: number;
    skippedModelRows: number;
  };
}

const mocks = vi.hoisted(() => ({
  analyzeWithAgent: vi.fn(),
  loadTemplate: vi.fn(),
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
      <div
        id="ppc-mapping-status"
        class="ppc-status-line ppc-status-line--empty"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ></div>
      <select id="ppc-report-type">
        <option value="auto">自动识别</option>
        <option value="search_term">店铺搜索广告报告</option>
        <option value="erp_search_term">ERP 广告搜索词报表</option>
        <option value="erp_campaign">ERP 广告活动报表</option>
      </select>
      <label for="ppc-paste-input" class="ppc-field-label">粘贴广告报表内容</label>
      <textarea id="ppc-paste-input" aria-describedby="ppc-paste-help ppc-paste-error ppc-mapping-status"></textarea>
      <p id="ppc-paste-help">首行必须包含列名；文件导入和粘贴内容二选一即可。</p>
      <p id="ppc-paste-error" class="ppc-field-error hidden" role="alert"></p>
      <input id="ppc-file-input" type="file" aria-describedby="ppc-file-name ppc-mapping-status" />
      <button
        id="ppc-threshold-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="ppc-threshold-body"
      >
        <span id="ppc-threshold-toggle-label">展开</span>
      </button>
      <div id="ppc-threshold-body" class="hidden">
        <div id="ppc-threshold-grid"></div>
      </div>
      <input id="ppc-action-owner" value="广告负责人" aria-describedby="ppc-action-owner-help" />
      <span id="ppc-action-owner-help">用于动作清单 Owner 和周复盘的下次动作负责人。</span>
      <input id="ppc-use-agent" type="checkbox" />
      <input id="ppc-allow-local-fallback" type="checkbox" />
      <input id="ppc-use-context" type="checkbox" />
      <div id="ppc-analysis-settings-body"></div>
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
      <input id="ppc-action-search" type="search" aria-describedby="ppc-result-count ppc-table-help" />
      <button id="ppc-action-search-clear" type="button"></button>
      <div id="ppc-filter-buttons"></div>
      <h2 id="ppc-results-title">动作清单</h2>
      <p id="ppc-result-count"></p>
      <div id="ppc-empty-state"><div id="ppc-empty-title"></div><p id="ppc-empty-description"></p></div>
      <div
        id="ppc-table-wrapper"
        class="hidden"
        role="region"
        aria-labelledby="ppc-results-title"
        aria-describedby="ppc-result-count ppc-table-help"
        tabindex="0"
      >
        <p id="ppc-table-help">表格支持横向滚动；按搜索词、动作和核心广告指标查看建议。</p>
        <table aria-labelledby="ppc-results-title" aria-describedby="ppc-result-count ppc-table-help">
          <caption class="sr-only">PPC 搜索词动作清单</caption>
          <thead>
            <tr>
              <th id="ppc-object-header" scope="col">搜索词</th>
              <th scope="col">动作</th>
              <th scope="col">花费</th>
              <th scope="col">销售额</th>
              <th scope="col">订单</th>
              <th scope="col">ACOS</th>
              <th scope="col">CTR</th>
              <th scope="col">CVR</th>
              <th scope="col">原因</th>
            </tr>
          </thead>
          <tbody id="ppc-results-body"></tbody>
        </table>
      </div>
    </div>
  `,
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: () => ({
      loadTemplate: mocks.loadTemplate,
    }),
  },
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
  STORAGE_KEYS: {
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
  },
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

vi.mock(
  '@/modules/app_center/views/ppc_tools/ppc_search_terms/services/llmAnalysisService',
  () => ({
    analyzePpcSearchTermsWithAgent: mocks.analyzeWithAgent,
  })
);

async function flushAnalysis(): Promise<void> {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

async function loadSampleAndAnalyze(container: HTMLElement): Promise<void> {
  const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
  if (useAgent) {
    useAgent.checked = true;
    useAgent.dispatchEvent(new Event('change'));
  }
  container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
  container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
  await flushAnalysis();
}

let container: HTMLElement;
let anchorClick: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mocks.storageGet.mockReturnValue({});
  mocks.storageSet.mockClear();
  mocks.showToast.mockClear();
  mocks.loadTemplate.mockReset();
  mocks.loadTemplate.mockResolvedValue(mocks.template);
  mocks.analyzeWithAgent.mockReset();
  mocks.analyzeWithAgent.mockImplementation(async ({ rows, onProgress }: LlmMockInput) => {
    const decisions = rows.map(row => ({
      id: row.id,
      action: row.action,
      reason: `模型建议：${row.reason}`,
      priority: row.priority,
    }));
    onProgress?.({ completedBatches: 1, totalBatches: 1, decisions });
    return {
      decisions,
      modelDecisionIds: [],
      toolCalls: [
        {
          tool: 'local_metric_rules',
          inputRows: rows.length,
          outputRows: rows.length,
          note: '本地指标规则已完成全量预判',
        },
      ],
      summary: {
        totalRows: rows.length,
        localRows: rows.length,
        modelRows: 0,
        skippedModelRows: 0,
      },
    };
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test'),
  });
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

describe('PPC 搜索词分析器 UI - 初始化和阈值', () => {
  it('加载样例后可调用模型、筛选并导出当前筛选', async () => {
    await loadSampleAndAnalyze(container);
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-export-current')?.click();

    expect(mocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/ppc_tools/ppc_search_terms/template.html'
    );
    expect(mocks.analyzeWithAgent).toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe(
      '共 10 行，当前筛选 2 行。'
    );
    expect(anchorClick).toHaveBeenCalled();
    expect(mocks.storageSet).toHaveBeenCalledWith('ppc_action_owner_v1', '广告负责人');
    expect(showToast).toHaveBeenCalledWith('导出完成', {
      type: 'success',
      description: '2 行动作已导出',
    });
  });

  it('从本地存储恢复动态阈值字段并保存修改', async () => {
    unmount();
    container.replaceChildren();
    mocks.storageGet.mockImplementation((key: string, fallback: unknown) => {
      const thresholds = {
        targetAcos: 42,
        highAcos: 63,
        minClicksNoOrder: 18,
        minSpendNoOrder: 24,
        minOrdersHarvest: 4,
        minCtr: 0.5,
      };
      if (key === 'runtime_strategy_settings') {
        return {
          ppcSearchTerms: {
            thresholds,
          },
        };
      }
      if (key === 'ppc_search_terms_thresholds_v1') return thresholds;
      return fallback;
    });

    await mount(container);

    expect(container.querySelectorAll('#ppc-threshold-grid input')).toHaveLength(6);
    expect(container.querySelectorAll('.ppc-threshold-helper')).toHaveLength(6);
    expect(container.querySelector<HTMLInputElement>('#ppc-target-acos')?.value).toBe('42');
    expect(container.querySelector<HTMLInputElement>('#ppc-min-ctr')?.value).toBe('0.5');
    expect(
      container
        .querySelector<HTMLInputElement>('#ppc-target-acos')
        ?.getAttribute('aria-describedby')
    ).toBe('ppc-target-acos-help');
    expect(container.querySelector('#ppc-target-acos-help')?.textContent).toContain('控价');

    const targetAcos = container.querySelector<HTMLInputElement>('#ppc-target-acos');
    if (targetAcos) {
      targetAcos.value = '40';
      mocks.storageSet.mockClear();
      targetAcos.dispatchEvent(new Event('change', { bubbles: true }));
    }

    expect(mocks.storageSet).toHaveBeenCalledWith('ppc_search_terms_thresholds_v1', {
      targetAcos: 40,
      highAcos: 63,
      minClicksNoOrder: 18,
      minSpendNoOrder: 24,
      minOrdersHarvest: 4,
      minCtr: 0.5,
    });
  });

  it('分析阈值默认收起，并可展开/收起', async () => {
    const toggle = container.querySelector<HTMLButtonElement>('#ppc-threshold-toggle');
    const body = container.querySelector<HTMLElement>('#ppc-threshold-body');

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(body?.classList.contains('hidden')).toBe(true);

    toggle?.click();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#ppc-threshold-toggle-label')?.textContent).toBe('收起');
    expect(body?.classList.contains('hidden')).toBe(false);

    toggle?.click();

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('#ppc-threshold-toggle-label')?.textContent).toBe('展开');
    expect(body?.classList.contains('hidden')).toBe(true);
  });
});

describe('PPC 搜索词分析器 UI - 默认本地分析', () => {
  it('默认仅使用本地规则，不调用 Agent 语义复核', async () => {
    expect(container.querySelector('#ppc-mapping-status')?.getAttribute('role')).toBe('status');
    expect(container.querySelector('#ppc-mapping-status')?.getAttribute('aria-live')).toBe(
      'polite'
    );
    expect(container.querySelector('.ppc-field-label')?.textContent).toContain('粘贴广告报表内容');
    expect(container.querySelector('#ppc-paste-error')?.getAttribute('role')).toBe('alert');
    expect(container.querySelector('#ppc-paste-error')?.classList.contains('hidden')).toBe(true);
    expect(container.querySelector('#ppc-paste-input')?.getAttribute('aria-describedby')).toContain(
      'ppc-paste-error'
    );
    expect(container.querySelector('#ppc-paste-input')?.getAttribute('aria-describedby')).toContain(
      'ppc-mapping-status'
    );
    expect(container.querySelector('#ppc-file-input')?.getAttribute('aria-describedby')).toContain(
      'ppc-file-name'
    );
    const actionSearchDescription = container
      .querySelector('#ppc-action-search')
      ?.getAttribute('aria-describedby');
    expect(actionSearchDescription).toContain('ppc-result-count');
    expect(actionSearchDescription).toContain('ppc-table-help');
    const tableWrapper = container.querySelector<HTMLElement>('#ppc-table-wrapper');
    const table = container.querySelector<HTMLTableElement>('.ppc-results-table, table');
    expect(tableWrapper?.getAttribute('role')).toBe('region');
    expect(tableWrapper?.getAttribute('aria-labelledby')).toBe('ppc-results-title');
    expect(tableWrapper?.getAttribute('aria-describedby')).toBe('ppc-result-count ppc-table-help');
    expect(tableWrapper?.tabIndex).toBe(0);
    expect(container.querySelector('#ppc-table-help')?.textContent).toContain('横向滚动');
    expect(table?.getAttribute('aria-labelledby')).toBe('ppc-results-title');
    expect(table?.getAttribute('aria-describedby')).toBe('ppc-result-count ppc-table-help');
    expect(table?.querySelector('caption')?.textContent).toContain('PPC 搜索词动作清单');
    expect(
      Array.from(container.querySelectorAll('#ppc-table-wrapper th')).every(
        header => header.getAttribute('scope') === 'col'
      )
    ).toBe(true);

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
    await flushAnalysis();

    expect(mocks.analyzeWithAgent).not.toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      '本地规则分析完成'
    );
    expect(showToast).toHaveBeenCalledWith('PPC 本地分析完成', {
      type: 'success',
      description: '已识别 10 行搜索词',
    });
  });
});

describe('PPC 搜索词分析器 UI - 筛选和复制', () => {
  it('清空时重置结果和筛选状态', async () => {
    await loadSampleAndAnalyze(container);
    container.querySelector<HTMLButtonElement>('[data-filter="scale_budget"]')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-clear')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe('等待导入数据。');
    expect(
      container
        .querySelector<HTMLButtonElement>('[data-filter="all"]')
        ?.classList.contains('active')
    ).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('#ppc-paste-input')?.value).toBe('');
  });

  it('支持动作清单搜索并导出当前搜索结果', async () => {
    await loadSampleAndAnalyze(container);

    const search = container.querySelector<HTMLInputElement>('#ppc-action-search');
    if (search) {
      search.value = 'waterproof dog jacket';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }

    expect(container.querySelector('#ppc-result-count')?.textContent).toBe(
      '共 10 行，匹配 1 行，当前筛选 1 行。'
    );
    expect(container.querySelectorAll('#ppc-results-body tr')).toHaveLength(1);

    container.querySelector<HTMLButtonElement>('#ppc-export-current')?.click();
    expect(showToast).toHaveBeenCalledWith('导出完成', {
      type: 'success',
      description: '1 行动作已导出',
    });

    container.querySelector<HTMLButtonElement>('#ppc-action-search-clear')?.click();
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe(
      '共 10 行，当前筛选 10 行。'
    );
  });

  it('剪贴板不可用时提示复制失败', async () => {
    await loadSampleAndAnalyze(container);
    container.querySelector<HTMLButtonElement>('#ppc-copy-summary')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(showToast).toHaveBeenCalledWith('复制失败', {
      type: 'error',
      description: '当前浏览器没有开放剪贴板写入权限',
    });
  });

  it('复制复盘模板成功时保留负责人', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await loadSampleAndAnalyze(container);
    const ownerInput = container.querySelector<HTMLInputElement>('#ppc-action-owner');
    if (ownerInput) ownerInput.value = '广告小张';
    container.querySelector<HTMLButtonElement>('#ppc-copy-summary')?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# PPC 搜索词周复盘'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Owner：广告小张'));
    expect(mocks.storageSet).toHaveBeenCalledWith('ppc_action_owner_v1', '广告小张');
    expect(showToast).toHaveBeenCalledWith('复盘模板已复制', { type: 'success' });
  });
});

describe('PPC 搜索词分析器 UI - 导入流程', () => {
  it('空数据分析时显示字段级错误，并在加载样例后恢复状态语义', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
    await flushAnalysis();

    const textarea = container.querySelector<HTMLTextAreaElement>('#ppc-paste-input');
    const fieldError = container.querySelector('#ppc-paste-error');
    const status = container.querySelector('#ppc-mapping-status');

    expect(textarea?.getAttribute('aria-invalid')).toBe('true');
    expect(fieldError?.textContent).toContain('请先粘贴报表内容或选择报表文件');
    expect(fieldError?.classList.contains('hidden')).toBe(false);
    expect(status?.getAttribute('role')).toBe('alert');
    expect(status?.getAttribute('aria-live')).toBe('assertive');
    expect(status?.textContent).toContain('没有可分析的数据');

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();

    expect(textarea?.hasAttribute('aria-invalid')).toBe(false);
    expect(fieldError?.textContent).toBe('');
    expect(fieldError?.classList.contains('hidden')).toBe(true);
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('样例数据已加载');
  });

  it('导入或加载数据后等待用户主动点击分析', async () => {
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    await flushAnalysis();

    expect(mocks.analyzeWithAgent).not.toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      '请点击“分析当前数据”'
    );

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
    await flushAnalysis();

    expect(mocks.analyzeWithAgent).toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
  });

  it('选择报表文件后只导入数据，不自动分析', async () => {
    const csv = 'Search Term,Clicks,Spend,Sales,Orders\nmanual import term,12,20,0,0';
    const file = new File([csv], 'manual-import.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { configurable: true, value: () => Promise.resolve(csv) });
    const input = container.querySelector<HTMLInputElement>('#ppc-file-input');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input?.dispatchEvent(new Event('change', { bubbles: true }));
    await flushAnalysis();

    expect(container.querySelector<HTMLTextAreaElement>('#ppc-paste-input')?.value).toBe(csv);
    expect(container.querySelector('#ppc-file-name')?.textContent).toContain('manual-import.csv');
    expect(mocks.analyzeWithAgent).not.toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
    await flushAnalysis();

    expect(mocks.analyzeWithAgent).toHaveBeenCalled();
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('1');
  });

  it('报表文件读取失败时标记上传控件并切换为错误状态', async () => {
    const file = new File(['broken'], 'broken.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () => Promise.reject(new Error('disk read failed')),
    });
    const input = container.querySelector<HTMLInputElement>('#ppc-file-input');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input?.dispatchEvent(new Event('change', { bubbles: true }));
    await flushAnalysis();

    const status = container.querySelector('#ppc-mapping-status');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(status?.getAttribute('role')).toBe('alert');
    expect(status?.getAttribute('aria-live')).toBe('assertive');
    expect(status?.textContent).toContain('文件读取失败');
    expect(showToast).toHaveBeenCalledWith('文件读取失败', {
      type: 'error',
      description: 'disk read failed',
    });
  });
});

describe('PPC 搜索词分析器 UI - Agent 增量', () => {
  it('动作清单先展示本地初判，再增量展示 Agent 复核结果', async () => {
    const deferred = createDeferred<LlmMockAgentResult>();
    let progressHandler: LlmMockInput['onProgress'];
    mocks.analyzeWithAgent.mockImplementationOnce(({ onProgress }: LlmMockInput) => {
      progressHandler = onProgress;
      return deferred.promise;
    });

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-result-count')?.textContent).toBe(
      '共 10 行，当前筛选 10 行。'
    );
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      '本地工具已生成初判'
    );

    progressHandler?.({
      completedBatches: 0,
      totalBatches: 2,
      firstResponse: {
        batchIndex: 1,
        elapsedMs: 900,
        firstChunkMs: 900,
        chunkCount: 1,
      },
    });

    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain('首响 0.9s');

    const rows = (mocks.analyzeWithAgent.mock.calls[0]?.[0] as LlmMockInput).rows;
    progressHandler?.({
      completedBatches: 1,
      totalBatches: 2,
      cachedBatches: 1,
      decisions: [
        {
          id: rows[0]?.id || '',
          action: 'observe',
          reason: '模型实时建议：先观察',
          priority: 99,
        },
      ],
    });

    expect(container.querySelector('#ppc-results-body')?.textContent).toContain(
      '模型实时建议：先观察'
    );
    expect(container.querySelector('.ppc-results-row-reviewed')).not.toBeNull();
    expect(container.querySelector('#ppc-results-body')?.textContent).toContain('Agent 复核');
    expect(container.querySelector('#ppc-results-body')?.textContent).toContain('语义复核结论');
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      'Agent 语义工具复核中 1/2'
    );
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain('缓存 1');

    deferred.resolve({
      decisions: rows.map(row => ({
        id: row.id,
        action: row.action,
        reason: `模型建议：${row.reason}`,
        priority: row.priority,
      })),
      modelDecisionIds: [rows[0]?.id || ''],
      toolCalls: [
        {
          tool: 'local_metric_rules',
          inputRows: rows.length,
          outputRows: rows.length,
          note: '本地指标规则已完成全量预判',
        },
      ],
      summary: {
        totalRows: rows.length,
        localRows: rows.length,
        modelRows: 0,
        skippedModelRows: 0,
      },
    });
    await flushAnalysis();

    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain('PPC Agent 完成');
  });

  it('分析中切换页面后恢复进度并继续接收 Agent 更新', async () => {
    const deferred = createDeferred<LlmMockAgentResult>();
    let progressHandler: LlmMockInput['onProgress'];
    let capturedRows: LlmMockRow[] = [];
    mocks.analyzeWithAgent.mockImplementationOnce(({ rows, onProgress }: LlmMockInput) => {
      capturedRows = rows;
      progressHandler = onProgress;
      return deferred.promise;
    });

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.disabled).toBe(true);
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      '本地工具已生成初判'
    );

    unmount();
    container.replaceChildren();
    await mount(container);

    expect(container.querySelector<HTMLTextAreaElement>('#ppc-paste-input')?.value).toContain(
      'winter dog coat'
    );
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.disabled).toBe(true);
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      '本地工具已生成初判'
    );

    progressHandler?.({
      completedBatches: 1,
      totalBatches: 2,
      decisions: [
        {
          id: capturedRows[0]?.id || '',
          action: 'observe',
          reason: '切页后的模型建议：先观察',
          priority: 99,
        },
      ],
    });

    expect(container.querySelector('#ppc-results-body')?.textContent).toContain(
      '切页后的模型建议：先观察'
    );
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain(
      'Agent 语义工具复核中 1/2'
    );

    deferred.resolve({
      decisions: capturedRows.map(row => ({
        id: row.id,
        action: row.action,
        reason: `模型建议：${row.reason}`,
        priority: row.priority,
      })),
      modelDecisionIds: [capturedRows[0]?.id || ''],
      toolCalls: [
        {
          tool: 'local_metric_rules',
          inputRows: capturedRows.length,
          outputRows: capturedRows.length,
          note: '本地指标规则已完成全量预判',
        },
      ],
      summary: {
        totalRows: capturedRows.length,
        localRows: capturedRows.length,
        modelRows: 0,
        skippedModelRows: 0,
      },
    });
    await flushAnalysis();

    expect(container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.disabled).toBe(false);
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain('PPC Agent 完成');
  });
});

describe('PPC 搜索词分析器 UI - Agent 取消', () => {
  it('清空时取消进行中的 Agent 分析并忽略过期返回', async () => {
    const deferred = createDeferred<LlmMockAgentResult>();
    let capturedRows: LlmMockRow[] = [];
    let capturedSignal: AbortSignal | undefined;
    mocks.analyzeWithAgent.mockImplementationOnce(({ rows, signal }: LlmMockInput) => {
      capturedRows = rows;
      capturedSignal = signal;
      return deferred.promise;
    });

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.disabled).toBe(true);

    container.querySelector<HTMLButtonElement>('#ppc-btn-clear')?.click();
    expect(capturedSignal?.aborted).toBe(true);
    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.disabled).toBe(false);

    deferred.resolve({
      decisions: capturedRows.map(row => ({
        id: row.id,
        action: row.action,
        reason: '过期 Agent 结果',
        priority: row.priority,
      })),
      modelDecisionIds: capturedRows.map(row => row.id),
      toolCalls: [],
      summary: {
        totalRows: capturedRows.length,
        localRows: 0,
        modelRows: capturedRows.length,
        skippedModelRows: 0,
      },
    });
    await flushAnalysis();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('0');
    expect(container.querySelector('#ppc-results-body')?.textContent).not.toContain(
      '过期 Agent 结果'
    );
  });
});

describe('PPC 搜索词分析器 UI - Agent 失败和上下文', () => {
  it('模型失败且未开启降级时保留本地初判', async () => {
    mocks.analyzeWithAgent.mockRejectedValueOnce(new Error('LLM unavailable'));

    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
    await flushAnalysis();

    expect(container.querySelector('#ppc-stat-rows')?.textContent).toBe('10');
    expect(container.querySelector('#ppc-mapping-status')?.textContent).toContain('Agent 复核失败');
    expect(showToast).toHaveBeenCalledWith('分析失败', {
      type: 'error',
      description: 'LLM unavailable',
    });
  });

  it('模型失败且开启降级时使用本地规则', async () => {
    mocks.analyzeWithAgent.mockRejectedValueOnce(new Error('LLM unavailable'));
    const useAgent = container.querySelector<HTMLInputElement>('#ppc-use-agent');
    if (useAgent) {
      useAgent.checked = true;
      useAgent.dispatchEvent(new Event('change'));
    }
    const fallback = container.querySelector<HTMLInputElement>('#ppc-allow-local-fallback');
    if (fallback) {
      fallback.checked = true;
      fallback.dispatchEvent(new Event('change'));
    }

    container.querySelector<HTMLButtonElement>('#ppc-btn-sample')?.click();
    container.querySelector<HTMLButtonElement>('#ppc-btn-parse')?.click();
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

    await loadSampleAndAnalyze(container);

    expect(mocks.analyzeWithAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          asin: 'B0TEST1234',
          category: 'Dog Coats',
          listing: 'Waterproof winter dog coat with reflective strips.',
        },
      })
    );
  });
});
