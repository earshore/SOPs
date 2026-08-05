import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/analysis';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui';
import { ErrorService } from '@/services/errorService';
import { callLLM } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { KeywordHunterSnapshotService } from '@/modules/app_center/views/keyword_hunter/services/snapshotService';

const analysisMocks = vi.hoisted(() => {
  const template = `
    <section>
      <button id="keyword-hunter-analyze-btn"><span id="keyword-hunter-analyze-btn-text"></span></button>
      <div id="keyword-hunter-llm-analysis-result"></div>
    </section>
  `;

  const state = {
    keywordTracker: {
      processedCopy: '',
      keywords: [] as string[],
      matchedKeywords: [] as Array<{ keyword: string; count: number }>,
      unmatchedKeywords: [] as string[],
      llmAnalysisResult: '',
    },
    updateKeywordTracker: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
  };

  return {
    handleError: vi.fn(),
    loadTemplate: vi.fn(async () => template),
    renderTemplate: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    renderUntrustedHtml: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    showToast: vi.fn(),
    localDataGet: vi.fn(),
    localDataSet: vi.fn(),
    localDataRemove: vi.fn(),
    llmCacheGet: vi.fn(),
    llmCacheSet: vi.fn(),
    confirmWithModal: vi.fn(async () => true),
    saveCurrentAsync: vi.fn(async () => ({
      id: 'kh-test',
    })),
    getAllSnapshotsAsync: vi.fn(async () => []),
    restoreSnapshot: vi.fn(),
    state,
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => {
  const loader = {
    getInstance: vi.fn(() => ({
      loadTemplate: analysisMocks.loadTemplate,
    })),
  };

  return {
    SafeModuleLoader: loader,
    SafeTemplateLoader: loader,
  };
});

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: vi.fn(() => ({
      renderTemplate: analysisMocks.renderTemplate,
      renderUntrustedHtml: analysisMocks.renderUntrustedHtml,
    })),
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: analysisMocks.showToast,
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: analysisMocks.handleError,
  },
}));

vi.mock('@/services/llmService', () => ({
  callLLM: vi.fn(),
}));

vi.mock('@/services/llmRequestCache', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/llmRequestCache')>();
  return {
    ...actual,
    getTimedLocalCacheValue: analysisMocks.llmCacheGet,
    setTimedLocalCacheValue: analysisMocks.llmCacheSet,
  };
});

vi.mock('@/modules/app_center/views/keyword_hunter/utils/confirmModal', () => ({
  confirmWithModal: analysisMocks.confirmWithModal,
}));

vi.mock('@/services/localDataStore', () => ({
  LocalDataStore: {
    get: analysisMocks.localDataGet,
    set: analysisMocks.localDataSet,
    remove: analysisMocks.localDataRemove,
  },
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
  },
  StorageService: {
    get: vi.fn(),
    getLLMConfig: vi.fn(),
    getLLMConfigWithKey: vi.fn(),
  },
}));

vi.mock('@/modules/app_center/views/keyword_hunter/services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    saveCurrentAsync: analysisMocks.saveCurrentAsync,
    getAllAsync: analysisMocks.getAllSnapshotsAsync,
    restore: analysisMocks.restoreSnapshot,
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => analysisMocks.state,
  },
}));

const mockedCallLLM = vi.mocked(callLLM);
const mockedStorage = vi.mocked(StorageService);

const validListing =
  'Premium wireless earbuds with active noise cancelling, long battery life, ' +
  'comfortable ear tips, clear calls, and travel-ready charging case.';

const scoredMarkdown = `
## Listing 评分 88/100

| 项目 | 分数 |
| --- | --- |
| 核心卖点 | 8/10 |
| 关键词覆盖 | 6/10 |
| 风险项 | -10 |
| 合规检查 | ✅ 通过 |
| 低分项 | 4/10 |
`;

const structuredReportMarkdown = `
## 88/100 — 良好

> 核心卖点清晰，但关键词覆盖和风险表达仍需优化。

### 评分

| 项目 | 分数 |
| --- | --- |
| 核心卖点 | 8/10 |
| 关键词覆盖 | 6/10 |

### 致命问题

> 标题存在弱相关词堆叠，可能降低点击转化。

### Top-3 改写建议

**① 强化开头卖点**
- 原句：Premium wireless earbuds
- 改写：Wireless earbuds with active noise cancelling
- 位置：标题前半段
`;

const legacyRenderedReportHtml = `
<h2 aria-label="77/100 — 良好" class="keyword-hunter-report-score-title keyword-hunter-report-score-title--good">
  <span class="keyword-hunter-report-cover-main">
    <span class="keyword-hunter-report-cover-eyebrow">AI 评审报告</span>
    <span class="keyword-hunter-report-cover-title">Listing 评审</span>
    <span class="keyword-hunter-report-cover-meta">综合评级：良好</span>
  </span>
  <span class="keyword-hunter-report-cover-score">77/100</span>
  <div class="score-progress-bar"><div class="score-progress-fill" style="width: 77%;"></div></div>
</h2>
<blockquote><p>执行摘要说明关键词覆盖稳定，但标题表达仍可强化。</p></blockquote>
<table>
  <tbody><tr><td>核心卖点</td><td>7/10</td></tr></tbody>
</table>
`;

function resetKeywordHunterState(): void {
  analysisMocks.state.keywordTracker = {
    processedCopy: '',
    keywords: [],
    matchedKeywords: [],
    unmatchedKeywords: [],
    llmAnalysisResult: '',
  };
}

async function mountAnalysis(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.clearAllMocks();
  resetKeywordHunterState();
  analysisMocks.localDataGet.mockResolvedValue(null);
  analysisMocks.localDataSet.mockResolvedValue(true);
  analysisMocks.localDataRemove.mockResolvedValue(undefined);
  analysisMocks.llmCacheGet.mockResolvedValue(null);
  analysisMocks.llmCacheSet.mockResolvedValue(undefined);
  analysisMocks.confirmWithModal.mockResolvedValue(true);
  mockedStorage.get.mockReturnValue('openai');
  mockedStorage.getLLMConfig.mockReturnValue({
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
  mockedStorage.getLLMConfigWithKey.mockResolvedValue({
    apiKey: 'test-key',
    endpoint: 'https://api.example.test',
    model: 'gpt-test',
  } as never);
  mockedCallLLM.mockResolvedValue(scoredMarkdown);
  analysisMocks.getAllSnapshotsAsync.mockResolvedValue([]);
  analysisMocks.restoreSnapshot.mockReturnValue(null);
  analysisMocks.saveCurrentAsync.mockResolvedValue({
    id: 'kh-test',
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  unmount();
  document.body.innerHTML = '';
});

it('mounts the template and disables analysis when no processed copy exists', async () => {
  const container = await mountAnalysis();
  const button = container.querySelector<HTMLButtonElement>('#keyword-hunter-analyze-btn');

  expect(SafeModuleLoader.getInstance).toHaveBeenCalled();
  expect(SafeRenderer.getInstance).toHaveBeenCalled();
  expect(analysisMocks.loadTemplate).toHaveBeenCalledWith(
    'src/modules/app_center/views/keyword_hunter/analysis/template.html',
    expect.any(Object)
  );
  expect(container.classList.contains('fade-in')).toBe(true);
  expect(button?.disabled).toBe(true);
  expect(button?.classList.contains('cursor-not-allowed')).toBe(true);
  expect(
    container
      .querySelector('#keyword-hunter-llm-analysis-result')
      ?.classList.contains('keyword-hunter-report-rendered')
  ).toBe(false);
});

it('restores saved markdown, renders score badges, and avoids double saving HTML', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = scoredMarkdown;

  const container = await mountAnalysis();

  expect(container.querySelector('h2')?.textContent).toContain('88/100');
  expect(
    container.querySelector('h2')?.classList.contains('keyword-hunter-report-score-title')
  ).toBe(true);
  expect(container.querySelector('h2')?.classList.contains('keyword-hunter-report-cover')).toBe(
    true
  );
  expect(
    container
      .querySelector('h2')
      ?.classList.contains('keyword-hunter-report-score-title--excellent')
  ).toBe(true);
  expect(container.querySelector('.score-progress-bar')).toBeNull();
  expect(container.querySelector('.score-progress-fill')).toBeNull();
  expect(container.querySelectorAll('.score-badge')).toHaveLength(5);
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).not.toContain(
    '✅'
  );
  expect(container.querySelector('.row-risk')).not.toBeNull();
  expect(container.querySelector('.row-low')).not.toBeNull();

  unmount();

  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe(scoredMarkdown);
});

it('enhances only rendered reports with commercial report structure', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = structuredReportMarkdown;

  const container = await mountAnalysis();

  expect(
    container
      .querySelector('#keyword-hunter-llm-analysis-result')
      ?.classList.contains('keyword-hunter-report-rendered')
  ).toBe(true);
  expect(container.querySelector('.keyword-hunter-report-cover-main')).not.toBeNull();
  expect(container.querySelector('h2')?.textContent).not.toContain('AI 评审报告');
  expect(
    container.querySelector('.keyword-hunter-report-cover-summary-text')?.textContent
  ).toContain('核心卖点清晰');
  expect(container.querySelector('.keyword-hunter-report-cover-summary-label')?.textContent).toBe(
    '执行摘要'
  );
  expect(container.querySelector('.keyword-hunter-report-table-shell')).not.toBeNull();
  expect(
    container
      .querySelector('.keyword-hunter-report-executive-summary')
      ?.classList.contains('keyword-hunter-report-executive-summary--merged')
  ).toBe(true);
  expect(container.querySelector('.keyword-hunter-report-risk-summary')).not.toBeNull();
  expect(container.querySelectorAll('.keyword-hunter-report-recommendation-card')).toHaveLength(1);
  expect(
    container.querySelector('.keyword-hunter-report-recommendation-item--proposal')
  ).not.toBeNull();
});

it('normalizes legacy rendered report chrome when restoring old HTML', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = legacyRenderedReportHtml;

  const container = await mountAnalysis();

  expect(
    container
      .querySelector('#keyword-hunter-llm-analysis-result')
      ?.classList.contains('keyword-hunter-report-rendered')
  ).toBe(true);
  expect(container.querySelector('h2')?.textContent).not.toContain('AI 评审报告');
  expect(container.querySelector('.keyword-hunter-report-cover-eyebrow')).toBeNull();
  expect(container.querySelector('.score-progress-bar')).toBeNull();
  expect(container.querySelector('.score-progress-fill')).toBeNull();
  expect(
    container.querySelector('.keyword-hunter-report-cover-summary-text')?.textContent
  ).toContain('执行摘要说明');
  expect(container.querySelector('.keyword-hunter-report-cover-summary-label')?.textContent).toBe(
    '执行摘要'
  );
});

it('does not restore a historical report when the current analysis state is empty', async () => {
  const snapshot = {
    id: 'keyword-hunter-reported',
    status: 'reported',
    input: {
      keywordsInputText: 'wireless earbuds',
      copyInputText: validListing,
      settings: {
        matchPlural: true,
        matchStem: true,
        matchCase: false,
        matchPartial: false,
      },
    },
    result: {
      keywords: ['wireless earbuds'],
      processedCopy: validListing,
      matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
      unmatchedKeywords: [],
      wordFrequency: [['wireless', 1]],
      paragraphs: [],
      llmAnalysisResult: scoredMarkdown,
      coverageRate: 100,
    },
    derived: {
      matchedCount: 1,
      unmatchedCount: 0,
    },
  };
  analysisMocks.getAllSnapshotsAsync.mockResolvedValueOnce([snapshot]);
  analysisMocks.state.keywordTracker.processedCopy = validListing;

  const container = await mountAnalysis();

  expect(KeywordHunterSnapshotService.getAllAsync).not.toHaveBeenCalled();
  expect(KeywordHunterSnapshotService.restore).not.toHaveBeenCalled();
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).not.toContain(
    '88/100'
  );
  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });
});

it('does not write a stale cached report back after the current input clears analysis', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = scoredMarkdown;
  const firstContainer = await mountAnalysis();
  expect(
    firstContainer.querySelector('#keyword-hunter-llm-analysis-result')?.textContent
  ).toContain('88/100');

  unmount();
  firstContainer.remove();

  Object.assign(analysisMocks.state.keywordTracker, {
    processedCopy: `${validListing} Updated.`,
    llmAnalysisResult: '',
  });

  const secondContainer = await mountAnalysis();
  expect(
    secondContainer.querySelector('#keyword-hunter-llm-analysis-result')?.textContent
  ).not.toContain('88/100');

  unmount();

  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe('');
});

it('shows loading phases, renders successful analysis, and stores raw markdown', async () => {
  vi.useFakeTimers();
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.state.keywordTracker.keywords = ['wireless earbuds'];
  analysisMocks.state.keywordTracker.matchedKeywords = [{ keyword: 'wireless earbuds', count: 1 }];
  analysisMocks.state.keywordTracker.unmatchedKeywords = ['waterproof'];
  let resolveAnalysis: (value: string) => void = () => undefined;
  mockedCallLLM.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        resolveAnalysis = resolve;
      })
  );
  const container = await mountAnalysis();

  click(container.querySelector('#keyword-hunter-analyze-btn'));
  await Promise.resolve();
  await Promise.resolve();

  expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe('分析中…');
  expect(container.querySelector('#keyword-hunter-loading-state')?.getAttribute('role')).toBe(
    'status'
  );
  expect(container.querySelector('#keyword-hunter-loading-state')?.getAttribute('aria-live')).toBe(
    'polite'
  );
  expect(container.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });

  vi.advanceTimersByTime(3500);
  expect(container.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    'AI 正在深度分析 Listing'
  );

  vi.advanceTimersByTime(6500);
  expect(container.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '正在生成评审报告'
  );

  const options = mockedCallLLM.mock.calls[0]?.[5] as
    | {
        onFirstResponse?: (metrics: {
          elapsedMs: number;
          firstChunkMs?: number;
          chunkCount: number;
        }) => void;
      }
    | undefined;
  options?.onFirstResponse?.({ elapsedMs: 800, firstChunkMs: 800, chunkCount: 1 });
  expect(container.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '模型已首响 0.8s'
  );
  expect(container.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '流式响应已开始'
  );

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe('重新生成');

  expect(mockedCallLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'openai',
    'https://api.example.test',
    'test-key',
    'gpt-test',
    expect.objectContaining({
      temperature: 0.1,
      jsonMode: false,
      maxTokens: 12000,
      stream: true,
      onFirstResponse: expect.any(Function),
      strategyTargetId: 'keyword-hunter-listing-review',
    })
  );
  expect(container.querySelectorAll('.score-badge')).toHaveLength(5);
  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe(scoredMarkdown);
  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({
      status: 'reported',
    });
  });
  expect(showToast).toHaveBeenCalledWith('报告生成成功', { type: 'success' });
});

it('keeps the pending analysis state visible after leaving and returning', async () => {
  vi.useFakeTimers();
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.state.keywordTracker.keywords = ['wireless earbuds'];
  analysisMocks.state.keywordTracker.matchedKeywords = [{ keyword: 'wireless earbuds', count: 1 }];
  let resolveAnalysis: (value: string) => void = () => undefined;
  mockedCallLLM.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        resolveAnalysis = resolve;
      })
  );

  const firstContainer = await mountAnalysis();
  click(firstContainer.querySelector('#keyword-hunter-analyze-btn'));

  expect(firstContainer.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });

  unmount();
  firstContainer.remove();

  const secondContainer = await mountAnalysis();
  expect(secondContainer.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  expect(secondContainer.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe(
    '分析中…'
  );
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(
    secondContainer.querySelector('#keyword-hunter-llm-analysis-result')?.textContent
  ).toContain('88/100');
  expect(secondContainer.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe(
    '重新生成'
  );
  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe(scoredMarkdown);
  expect(showToast).toHaveBeenCalledWith('报告生成成功', { type: 'success' });
});

it('ignores a pending analysis run after the processed copy changes', async () => {
  vi.useFakeTimers();
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.state.keywordTracker.keywords = ['wireless earbuds'];
  let resolveAnalysis: (value: string) => void = () => undefined;
  mockedCallLLM.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        resolveAnalysis = resolve;
      })
  );

  const firstContainer = await mountAnalysis();
  click(firstContainer.querySelector('#keyword-hunter-analyze-btn'));

  expect(firstContainer.querySelector('#keyword-hunter-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });

  unmount();
  firstContainer.remove();

  Object.assign(analysisMocks.state.keywordTracker, {
    processedCopy: `${validListing} Updated.`,
    llmAnalysisResult: '',
  });

  const secondContainer = await mountAnalysis();
  expect(secondContainer.querySelector('#keyword-hunter-loading-state')).toBeNull();
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(
    secondContainer.querySelector('#keyword-hunter-llm-analysis-result')?.textContent
  ).not.toContain('88/100');
  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe('');
});

it('warns when the generated report cannot be archived automatically', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.saveCurrentAsync.mockRejectedValueOnce(new Error('IndexedDB 不可写'));
  const container = await mountAnalysis();

  click(container.querySelector('#keyword-hunter-analyze-btn'));

  await vi.waitFor(() => {
    expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe(
      '重新生成'
    );
  });
  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe(scoredMarkdown);
  expect(showToast).toHaveBeenCalledWith('报告生成成功', { type: 'success' });
  await vi.waitFor(() => {
    expect(showToast).toHaveBeenCalledWith('报告已生成，但历史快照自动保存失败：IndexedDB 不可写', {
      type: 'warning',
    });
  });
});

it('warns on empty copy and renders validation errors without reporting to ErrorService', async () => {
  const container = await mountAnalysis();

  click(container.querySelector('#keyword-hunter-analyze-btn'));

  expect(showToast).toHaveBeenCalledWith('文案内容为空，无法进行 AI 分析', {
    type: 'warning',
  });
  expect(mockedCallLLM).not.toHaveBeenCalled();

  analysisMocks.state.keywordTracker.processedCopy = 'too short';
  await mount(container);
  click(container.querySelector('#keyword-hunter-analyze-btn'));

  await vi.waitFor(() => {
    expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).toContain(
      '无法进行分析'
    );
  });

  expect(ErrorService.handle).not.toHaveBeenCalled();
  expect(
    container.querySelector('#keyword-hunter-llm-analysis-result [role="alert"]')?.textContent
  ).toContain('无法进行分析');
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).toContain(
    '输入内容过短或不具备 Amazon Listing 特征'
  );
  expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe('重新生成');
});

it('reports non-validation failures and supports retrying from the rendered error state', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  mockedCallLLM.mockRejectedValueOnce(new Error('503 upstream unavailable'));
  const container = await mountAnalysis();

  click(container.querySelector('#keyword-hunter-analyze-btn'));

  await vi.waitFor(() => {
    expect(ErrorService.handle).toHaveBeenCalled();
  });
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).toContain(
    '服务暂时不可用 (503)'
  );
  expect(
    container.querySelector('#keyword-hunter-llm-analysis-result [role="alert"]')?.textContent
  ).toContain('分析失败');

  mockedCallLLM.mockResolvedValueOnce(scoredMarkdown);
  click(container.querySelector('#keyword-hunter-llm-analysis-result button'));

  await vi.waitFor(() => {
    expect(container.querySelectorAll('.score-badge')).toHaveLength(5);
  });
  expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe('重新生成');
});

it('regenerates the report with a fresh LLM call even when a cached report exists', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.state.keywordTracker.llmAnalysisResult = scoredMarkdown;
  analysisMocks.llmCacheGet.mockResolvedValue('STALE-CACHED-REPORT');

  const container = await mountAnalysis();
  click(container.querySelector('#keyword-hunter-analyze-btn'));

  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });
  expect(analysisMocks.confirmWithModal).toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith('正在重新生成评审报告…', { type: 'info' });

  await vi.waitFor(() => {
    expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe(
      '重新生成'
    );
  });
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).toContain(
    '88/100'
  );
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).not.toContain(
    'STALE-CACHED-REPORT'
  );
  expect(analysisMocks.llmCacheSet).toHaveBeenCalledWith(
    expect.stringContaining('cache:keyword-hunter-llm:'),
    expect.objectContaining({ response: scoredMarkdown })
  );
});

it('serves the cached report on the auto-start path without calling the model', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.llmCacheGet.mockResolvedValue(scoredMarkdown);

  const container = await mountAnalysis();

  await vi.waitFor(() => {
    expect(container.querySelector('#keyword-hunter-analyze-btn-text')?.textContent).toBe(
      '重新生成'
    );
  });
  expect(mockedCallLLM).not.toHaveBeenCalled();
  expect(container.querySelector('#keyword-hunter-llm-analysis-result')?.textContent).toContain(
    '88/100'
  );
});
