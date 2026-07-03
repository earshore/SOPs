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
      <button id="kt-analyze-btn"><span id="kt-analyze-btn-text"></span></button>
      <div id="kt-llm-analysis-result"></div>
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
    showToast: vi.fn(),
    saveCurrentAsync: vi.fn(async () => ({
      id: 'kh-test',
    })),
    getAllSnapshotsAsync: vi.fn(async () => []),
    restoreSnapshot: vi.fn(),
    state,
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeModuleLoader: {
    getInstance: vi.fn(() => ({
      loadTemplate: analysisMocks.loadTemplate,
    })),
  },
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: vi.fn(() => ({
      renderTemplate: analysisMocks.renderTemplate,
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

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    LLM_ACTIVE_PROVIDER: 'llm_active_provider',
    LLM_CONFIG_PREFIX: 'llm_',
  },
  StorageService: {
    get: vi.fn(),
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

function resetTrackerState(): void {
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
  resetTrackerState();
  mockedStorage.get.mockReturnValue('openai');
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
  const button = container.querySelector<HTMLButtonElement>('#kt-analyze-btn');

  expect(SafeModuleLoader.getInstance).toHaveBeenCalled();
  expect(SafeRenderer.getInstance).toHaveBeenCalled();
  expect(analysisMocks.loadTemplate).toHaveBeenCalledWith(
    'src/modules/app_center/views/keyword_hunter/analysis/template.html',
    expect.any(Object)
  );
  expect(container.classList.contains('fade-in')).toBe(true);
  expect(button?.disabled).toBe(true);
  expect(button?.classList.contains('cursor-not-allowed')).toBe(true);
});

it('restores saved markdown, renders score badges, and avoids double saving HTML', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = scoredMarkdown;

  const container = await mountAnalysis();

  expect(container.querySelector('h2')?.textContent).toContain('88/100');
  expect(container.querySelector('h2')?.classList.contains('kh-report-score-title')).toBe(true);
  expect(
    container.querySelector('h2')?.classList.contains('kh-report-score-title--excellent')
  ).toBe(true);
  expect(container.querySelector('.score-progress-bar')).not.toBeNull();
  expect(container.querySelector('.score-progress-fill')).not.toBeNull();
  expect(container.querySelectorAll('.score-badge')).toHaveLength(5);
  expect(container.querySelector('#kt-llm-analysis-result')?.textContent).not.toContain('✅');
  expect(container.querySelector('.row-risk')).not.toBeNull();
  expect(container.querySelector('.row-low')).not.toBeNull();

  unmount();

  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe(scoredMarkdown);
});

it('does not restore a historical report when the current analysis state is empty', async () => {
  const snapshot = {
    id: 'kh-reported',
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
  expect(container.querySelector('#kt-llm-analysis-result')?.textContent).not.toContain('88/100');
  expect(container.querySelector('#kt-analyze-btn')?.classList.contains('cursor-pointer')).toBe(
    true
  );
});

it('does not write a stale cached report back after the current input clears analysis', async () => {
  analysisMocks.state.keywordTracker.llmAnalysisResult = scoredMarkdown;
  const firstContainer = await mountAnalysis();
  expect(firstContainer.querySelector('#kt-llm-analysis-result')?.textContent).toContain('88/100');

  unmount();
  firstContainer.remove();

  Object.assign(analysisMocks.state.keywordTracker, {
    processedCopy: `${validListing} Updated.`,
    llmAnalysisResult: '',
  });

  const secondContainer = await mountAnalysis();
  expect(secondContainer.querySelector('#kt-llm-analysis-result')?.textContent).not.toContain(
    '88/100'
  );

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

  click(container.querySelector('#kt-analyze-btn'));
  await Promise.resolve();
  await Promise.resolve();

  expect(container.querySelector('#kt-analyze-btn-text')?.textContent).toBe('分析中…');
  expect(container.querySelector('#kt-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  await vi.waitFor(() => {
    expect(mockedCallLLM).toHaveBeenCalledTimes(1);
  });

  vi.advanceTimersByTime(3500);
  expect(container.querySelector('#kt-loading-state')?.textContent).toContain(
    'AI 正在深度分析 Listing'
  );

  vi.advanceTimersByTime(6500);
  expect(container.querySelector('#kt-loading-state')?.textContent).toContain('正在生成评审报告');

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(container.querySelector('#kt-analyze-btn-text')?.textContent).toBe('报告已生成');

  expect(mockedCallLLM).toHaveBeenCalledWith(
    expect.any(Array),
    'openai',
    'https://api.example.test',
    'test-key',
    'gpt-test',
    { temperature: 0.1, jsonMode: false }
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
  click(firstContainer.querySelector('#kt-analyze-btn'));
  await Promise.resolve();
  await Promise.resolve();

  expect(firstContainer.querySelector('#kt-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);

  unmount();
  firstContainer.remove();

  const secondContainer = await mountAnalysis();
  expect(secondContainer.querySelector('#kt-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );
  expect(secondContainer.querySelector('#kt-analyze-btn-text')?.textContent).toBe('分析中…');
  expect(mockedCallLLM).toHaveBeenCalledTimes(1);

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(secondContainer.querySelector('#kt-llm-analysis-result')?.textContent).toContain('88/100');
  expect(secondContainer.querySelector('#kt-analyze-btn-text')?.textContent).toBe('报告已生成');
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
  click(firstContainer.querySelector('#kt-analyze-btn'));
  await Promise.resolve();
  await Promise.resolve();

  expect(firstContainer.querySelector('#kt-loading-state')?.textContent).toContain(
    '正在读取文案与关键词数据'
  );

  unmount();
  firstContainer.remove();

  Object.assign(analysisMocks.state.keywordTracker, {
    processedCopy: `${validListing} Updated.`,
    llmAnalysisResult: '',
  });

  const secondContainer = await mountAnalysis();
  expect(secondContainer.querySelector('#kt-loading-state')).toBeNull();

  resolveAnalysis(scoredMarkdown);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(16);

  expect(secondContainer.querySelector('#kt-llm-analysis-result')?.textContent).not.toContain(
    '88/100'
  );
  expect(analysisMocks.state.keywordTracker.llmAnalysisResult).toBe('');
});

it('warns when the generated report cannot be archived automatically', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  analysisMocks.saveCurrentAsync.mockRejectedValueOnce(new Error('IndexedDB 不可写'));
  const container = await mountAnalysis();

  click(container.querySelector('#kt-analyze-btn'));

  await vi.waitFor(() => {
    expect(container.querySelector('#kt-analyze-btn-text')?.textContent).toBe('报告已生成');
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

  click(container.querySelector('#kt-analyze-btn'));

  expect(showToast).toHaveBeenCalledWith('文案内容为空，无法进行 AI 分析', {
    type: 'warning',
  });
  expect(mockedCallLLM).not.toHaveBeenCalled();

  analysisMocks.state.keywordTracker.processedCopy = 'too short';
  await mount(container);
  click(container.querySelector('#kt-analyze-btn'));

  await vi.waitFor(() => {
    expect(container.querySelector('#kt-llm-analysis-result')?.textContent).toContain(
      '无法进行分析'
    );
  });

  expect(ErrorService.handle).not.toHaveBeenCalled();
  expect(container.querySelector('#kt-llm-analysis-result')?.textContent).toContain(
    '输入内容过短或不具备 Amazon Listing 特征'
  );
  expect(container.querySelector('#kt-analyze-btn-text')?.textContent).toBe('生成报告');
});

it('reports non-validation failures and supports retrying from the rendered error state', async () => {
  analysisMocks.state.keywordTracker.processedCopy = validListing;
  mockedCallLLM.mockRejectedValueOnce(new Error('503 upstream unavailable'));
  const container = await mountAnalysis();

  click(container.querySelector('#kt-analyze-btn'));

  await vi.waitFor(() => {
    expect(ErrorService.handle).toHaveBeenCalled();
  });
  expect(container.querySelector('#kt-llm-analysis-result')?.textContent).toContain(
    '服务暂时不可用 (503)'
  );

  mockedCallLLM.mockResolvedValueOnce(scoredMarkdown);
  click(container.querySelector('#kt-llm-analysis-result button'));

  await vi.waitFor(() => {
    expect(container.querySelector('#kt-analyze-btn-text')?.textContent).toBe('报告已生成');
  });
  expect(container.querySelectorAll('.score-badge')).toHaveLength(5);
});
