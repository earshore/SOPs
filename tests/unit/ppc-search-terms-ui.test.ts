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
  signal?: AbortSignal;
  onProgress?: (progress: {
    completedBatches: number;
    totalBatches: number;
    decisions?: LlmMockRow[];
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
        <option value="erp_search_term">ERP 广告搜索词报表</option>
        <option value="erp_campaign">ERP 广告活动报表</option>
      </select>
      <textarea id="ppc-paste-input"></textarea>
      <input id="ppc-file-input" type="file" />
      <div id="ppc-threshold-grid"></div>
      <input id="ppc-action-owner" value="广告负责人" />
      <input id="ppc-use-agent" type="checkbox" />
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
  analyzePpcSearchTermsWithAgent: mocks.analyzeWithAgent,
}));

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

    expect(loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/ppc_search_terms/template.html'
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
      if (key === 'ppc_search_terms_thresholds_v1') {
        return {
          targetAcos: 42,
          highAcos: 63,
          minClicksNoOrder: 18,
          minSpendNoOrder: 24,
          minOrdersHarvest: 4,
          minCtr: 0.5,
        };
      }
      return fallback;
    });

    await mount(container);

    expect(container.querySelectorAll('#ppc-threshold-grid input')).toHaveLength(6);
    expect(container.querySelector<HTMLInputElement>('#ppc-target-acos')?.value).toBe('42');
    expect(container.querySelector<HTMLInputElement>('#ppc-min-ctr')?.value).toBe('0.5');

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

  it('默认仅使用本地规则，不调用 Agent 语义复核', async () => {
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

    const rows = (mocks.analyzeWithAgent.mock.calls[0]?.[0] as LlmMockInput).rows;
    progressHandler?.({
      completedBatches: 1,
      totalBatches: 2,
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
