import { beforeEach, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/input';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showProgress, showToast } from '@/common/ui';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';
import { KeywordHunterSnapshotService } from '@/modules/app_center/views/keyword_hunter/services/snapshotService';

function createKeywordHunterTemplate(): string {
  return `
    <section>
      <h2 id="keyword-hunter-keywords-input-label">关键词列表</h2>
      <textarea id="keyword-hunter-keywords-input" aria-labelledby="keyword-hunter-keywords-input-label"
        aria-describedby="keyword-hunter-keywords-input-helper keyword-hunter-keyword-count-label keyword-hunter-duplicate-badge"></textarea>
      <p id="keyword-hunter-keywords-input-helper">每行一个关键词，支持多语种；清理格式会自动去重。</p>
      <div id="keyword-hunter-keyword-highlight-layer"></div>
      <span id="keyword-hunter-keyword-count-label"><span id="keyword-hunter-keyword-count"></span></span>
      <span id="keyword-hunter-duplicate-badge" class="hidden"><span id="keyword-hunter-duplicate-count"></span></span>
      <h2><span id="keyword-hunter-copy-input-label">目标 Listing 文案</span></h2>
      <textarea id="keyword-hunter-copy-input" aria-labelledby="keyword-hunter-copy-input-label"
        aria-describedby="keyword-hunter-copy-input-helper copy-char-count-label"></textarea>
      <span id="keyword-hunter-copy-input-helper">Tip: 包含完整 Listing 内容可提升分析精度</span>
      <span id="copy-char-count-label"><span id="copy-char-count"></span></span>
      <button id="keyword-hunter-btn-clean-kw"></button>
      <button id="keyword-hunter-btn-undo-kw-clean"></button>
      <button id="keyword-hunter-btn-clean-copy"></button>
      <button id="keyword-hunter-btn-clear-copy"></button>
      <button id="keyword-hunter-btn-paste"></button>
      <button id="keyword-hunter-btn-start-analysis"></button>
      <button id="keyword-hunter-input-snapshot-save"></button>
      <span id="keyword-hunter-input-snapshot-count"></span>
      <span id="keyword-hunter-input-draft-status" role="status" aria-live="polite" aria-atomic="true">
        <span id="keyword-hunter-input-draft-label"></span>
        <span id="keyword-hunter-input-draft-detail"></span>
      </span>
      <div id="keyword-hunter-input-snapshot-loading" class="hidden"></div>
      <div id="keyword-hunter-input-snapshot-empty" class="hidden"></div>
      <div id="keyword-hunter-input-snapshot-list"></div>
    </section>
  `;
}

function createKeywordHunterState() {
  return {
    keywordsInputText: '',
    copyInputText: '',
    keywords: [] as string[],
    processedCopy: '',
    matchedKeywords: [] as Array<{ keyword: string; count: number }>,
    unmatchedKeywords: [] as string[],
    wordFrequency: [] as Array<[string, number]>,
    paragraphs: [],
    translationMode: false,
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false,
    },
    currentSnapshotId: null as string | null,
    snapshotSource: {
      type: 'manual' as const,
    },
  };
}

function createSnapshotFixtures(): Array<Record<string, any>> {
  return [
    {
      id: 'kh-coffee',
      schemaVersion: 1,
      title: 'Coffee Snapshot',
      status: 'matched',
      createdAt: '2026-06-12T08:00:00.000Z',
      updatedAt: '2026-06-12T09:00:00.000Z',
      source: { type: 'manual' },
      input: {
        keywordsInputText: 'coffee grinder\nespresso',
        copyInputText: 'Manual coffee grinder copy',
        settings: {
          matchPlural: true,
          matchStem: true,
          matchCase: false,
          matchPartial: false,
        },
      },
      result: {
        keywords: ['coffee grinder', 'espresso'],
        processedCopy: 'Manual coffee grinder copy',
        matchedKeywords: [{ keyword: 'coffee grinder', count: 2 }],
        unmatchedKeywords: ['espresso'],
        wordFrequency: [['coffee', 2]],
        paragraphs: [],
        llmAnalysisResult: '',
        showTranslation: false,
        translationMode: false,
        coverageRate: 50,
      },
      derived: {
        keywordCount: 2,
        matchedCount: 1,
        unmatchedCount: 1,
        copyHash: 'copy',
        snapshotFingerprint: 'fp',
      },
    },
    {
      id: 'kh-manual',
      schemaVersion: 1,
      title: 'Manual Draft Snapshot',
      status: 'draft',
      createdAt: '2026-06-11T08:00:00.000Z',
      updatedAt: '2026-06-11T09:00:00.000Z',
      source: { type: 'manual' },
      input: {
        keywordsInputText: 'manual',
        copyInputText: 'manual copy',
        settings: {
          matchPlural: true,
          matchStem: true,
          matchCase: false,
          matchPartial: false,
        },
      },
      result: {
        keywords: ['manual'],
        processedCopy: 'manual copy',
        matchedKeywords: [],
        unmatchedKeywords: ['manual'],
        wordFrequency: [],
        paragraphs: [],
        llmAnalysisResult: '',
        showTranslation: false,
        translationMode: false,
        coverageRate: 0,
      },
      derived: {
        keywordCount: 1,
        matchedCount: 0,
        unmatchedCount: 1,
        copyHash: 'manual',
        snapshotFingerprint: 'manual',
      },
    },
  ];
}

function createInputMocks(mockApi: typeof vi) {
  const template = createKeywordHunterTemplate();
  const state = {
    keywordTracker: createKeywordHunterState(),
    updateKeywordTracker: mockApi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
  };

  const snapshots = createSnapshotFixtures();
  const resetSnapshots = () => {
    snapshots.splice(0, snapshots.length, ...createSnapshotFixtures());
  };

  return {
    actions: {} as Record<string, (...args: unknown[]) => unknown>,
    deleteByIdAsync: mockApi.fn(async (id: string) => {
      const index = snapshots.findIndex(snapshot => snapshot.id === id);
      if (index >= 0) snapshots.splice(index, 1);
      const tracker = state.keywordTracker as Record<string, any>;
      if (tracker.currentSnapshotId === id) {
        tracker.currentSnapshotId = null;
      }
      return index >= 0;
    }),
    confirm: mockApi.fn(() => true),
    confirmWithModal: mockApi.fn(async () => true),
    getAllAsync: mockApi.fn(async () => snapshots),
    loadTemplate: mockApi.fn(async () => template),
    navigateToRouteId: mockApi.fn(async () => true),
    readText: mockApi.fn(async () => 'clipboard copy'),
    renderTemplate: mockApi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    resetSnapshots,
    restore: mockApi.fn((snapshot: Record<string, any>) => {
      Object.assign(state.keywordTracker, {
        keywordsInputText: snapshot.input.keywordsInputText,
        copyInputText: snapshot.input.copyInputText,
        currentSnapshotId: snapshot.id,
      });
      return snapshot;
    }),
    saveCurrentAsync: mockApi.fn(async () => ({
      id: 'kh-test',
    })),
    showProgress: mockApi.fn(),
    showToast: mockApi.fn(),
    snapshots,
    state,
    unregisterActions: mockApi.fn(),
  };
}

const inputMocks = vi.hoisted(() => createInputMocks(vi));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => {
  const loader = {
    getInstance: vi.fn(() => ({
      loadTemplate: inputMocks.loadTemplate,
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
      renderTemplate: inputMocks.renderTemplate,
    })),
  },
}));

vi.mock('@/common/ui', () => ({
  showProgress: inputMocks.showProgress,
  showToast: inputMocks.showToast,
}));

vi.mock('@/common/router/initRouter', () => ({
  navigateToRouteId: inputMocks.navigateToRouteId,
}));

vi.mock('@/common/utils/actionRegistry', () => ({
  registerActionsWithLegacy: vi.fn((actions: Record<string, (...args: unknown[]) => unknown>) => {
    inputMocks.actions = actions;
    return Object.keys(actions);
  }),
  unregisterActions: inputMocks.unregisterActions,
}));

vi.mock('@/modules/app_center/views/keyword_hunter/services/snapshotService', () => ({
  KeywordHunterSnapshotService: {
    deleteByIdAsync: inputMocks.deleteByIdAsync,
    getAllAsync: inputMocks.getAllAsync,
    restore: inputMocks.restore,
    saveCurrentAsync: inputMocks.saveCurrentAsync,
  },
}));

vi.mock('@/modules/app_center/views/keyword_hunter/utils/confirmModal', () => ({
  confirmWithModal: inputMocks.confirmWithModal,
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => inputMocks.state,
  },
}));

function resetKeywordHunterState(): void {
  inputMocks.state.keywordTracker = {
    keywordsInputText: '',
    copyInputText: '',
    keywords: [],
    processedCopy: '',
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false,
    },
    currentSnapshotId: null,
    snapshotSource: {
      type: 'manual',
    },
  };
}

async function mountInput(): Promise<HTMLElement> {
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
  unmount();
  document.body.innerHTML = '';
  vi.clearAllMocks();
  inputMocks.confirm.mockReturnValue(true);
  inputMocks.confirmWithModal.mockResolvedValue(true);
  inputMocks.actions = {};
  resetKeywordHunterState();
  inputMocks.resetSnapshots();
  Object.defineProperty(window, 'confirm', {
    configurable: true,
    value: inputMocks.confirm,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: inputMocks.readText },
  });
});

it('mounts the template, restores inputs, updates counters, and registers actions', async () => {
  inputMocks.state.keywordTracker.keywordsInputText = 'alpha\nbeta\nalpha';
  inputMocks.state.keywordTracker.copyInputText = 'short copy';

  const container = await mountInput();

  expect(SafeModuleLoader.getInstance).toHaveBeenCalled();
  expect(SafeRenderer.getInstance).toHaveBeenCalled();
  expect(inputMocks.loadTemplate).toHaveBeenCalledWith(
    'src/modules/app_center/views/keyword_hunter/input/template.html',
    expect.any(Object)
  );
  expect(container.classList.contains('fade-in')).toBe(true);
  expect(
    container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')?.value
  ).toBe('alpha\nbeta\nalpha');
  expect(container.querySelector('#keyword-hunter-keyword-count')?.textContent).toBe('3');
  expect(
    container.querySelector('#keyword-hunter-keywords-input')?.getAttribute('aria-labelledby')
  ).toBe('keyword-hunter-keywords-input-label');
  expect(
    container.querySelector('#keyword-hunter-keywords-input')?.getAttribute('aria-describedby')
  ).toContain('keyword-hunter-keywords-input-helper');
  expect(
    container.querySelector('#keyword-hunter-duplicate-badge')?.classList.contains('hidden')
  ).toBe(false);
  expect(container.querySelector('#keyword-hunter-duplicate-count')?.textContent).toBe('1');
  expect(container.querySelector('#copy-char-count')?.textContent).toBe('10');
  expect(
    container.querySelector('#keyword-hunter-copy-input')?.getAttribute('aria-labelledby')
  ).toBe('keyword-hunter-copy-input-label');
  expect(
    container.querySelector('#keyword-hunter-copy-input')?.getAttribute('aria-describedby')
  ).toContain('keyword-hunter-copy-input-helper');
  expect(container.querySelector('#keyword-hunter-input-draft-status')?.textContent).toContain(
    '本机草稿'
  );
  expect(container.querySelector('#keyword-hunter-input-draft-status')?.getAttribute('role')).toBe(
    'status'
  );
  expect(
    container.querySelector<HTMLButtonElement>('#keyword-hunter-btn-undo-kw-clean')?.disabled
  ).toBe(true);
  expect(registerActionsWithLegacy).toHaveBeenCalledWith(
    expect.objectContaining({
      keyword_hunter_cleanKeywords: expect.any(Function),
      keyword_hunter_startAnalysis: expect.any(Function),
    })
  );
});

it('renders the embedded history snapshot panel on the input page', async () => {
  const container = await mountInput();

  expect(KeywordHunterSnapshotService.getAllAsync).toHaveBeenCalled();
  expect(container.querySelector('#keyword-hunter-input-snapshot-count')?.textContent).toBe(
    '2 个快照'
  );
  expect(container.querySelector('#keyword-hunter-input-snapshot-list')?.textContent).toContain(
    'Coffee Snapshot'
  );
  expect(container.querySelector('#keyword-hunter-input-snapshot-list')?.textContent).toContain(
    'Manual Draft Snapshot'
  );
  expect(container.querySelector('[data-keyword-hunter-snapshot-filter]')).toBeNull();
  expect(container.querySelector('#keyword-hunter-input-snapshot-open-history')).toBeNull();

  const restoreButton = container.querySelector(
    '.keyword-hunter-input-snapshot-action.restore'
  );
  expect(restoreButton?.getAttribute('title')).toBe('加载快照（恢复到输入页）');
  click(restoreButton);
  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.restore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kh-coffee' })
    );
  });
  expect(
    container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')?.value
  ).toBe('coffee grinder\nespresso');
  expect(container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')?.value).toBe(
    'Manual coffee grinder copy'
  );
  expect(container.querySelector('#keyword-hunter-input-draft-label')?.textContent).toBe('已载入');
  expect(container.querySelector('#keyword-hunter-input-draft-detail')?.textContent).toBe(
    'Coffee Snapshot'
  );

  click(container.querySelector('button[title="删除快照"]'));
  await vi.waitFor(() => {
    expect(inputMocks.confirmWithModal).toHaveBeenCalledWith(
      '删除输入快照',
      expect.stringContaining('此操作无法撤销'),
      'kh_ignore_delete_input_snapshot',
      '删除快照'
    );
  });
  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.deleteByIdAsync).toHaveBeenCalledWith('kh-coffee');
  });
  await vi.waitFor(() => {
    expect(
      container.querySelector('#keyword-hunter-input-snapshot-list')?.textContent
    ).not.toContain('Coffee Snapshot');
  });
  expect(container.querySelector('#keyword-hunter-input-snapshot-list')?.textContent).toContain(
    'Manual Draft Snapshot'
  );
  expect(inputMocks.navigateToRouteId).not.toHaveBeenCalled();

  click(container.querySelector('#keyword-hunter-input-snapshot-save'));
  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({});
  });
});

it('asks before restoring a snapshot over the local draft', async () => {
  inputMocks.confirmWithModal.mockResolvedValueOnce(false);
  const container = await mountInput();
  const nativeConfirm = vi.spyOn(window, 'confirm');
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')!.value =
    'unsaved keyword';
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')!.value =
    'unsaved copy';

  click(container.querySelector('.keyword-hunter-input-snapshot-action.restore'));

  await vi.waitFor(() => {
    expect(inputMocks.confirmWithModal).toHaveBeenCalledWith(
      '恢复输入快照',
      expect.stringContaining('确定恢复快照吗'),
      '',
      '恢复快照'
    );
  });
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(KeywordHunterSnapshotService.restore).not.toHaveBeenCalled();
  expect(
    container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')?.value
  ).toBe('unsaved keyword');
  expect(container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')?.value).toBe(
    'unsaved copy'
  );
});

it('clears stale analysis results before saving edited input as a draft snapshot', async () => {
  Object.assign(inputMocks.state.keywordTracker, {
    keywords: ['old keyword'],
    processedCopy: 'old copy',
    matchedKeywords: [{ keyword: 'old keyword', count: 1 }],
    unmatchedKeywords: [],
    wordFrequency: [['old', 1]],
    llmAnalysisResult: '# Old report',
    currentSnapshotId: 'kh-stale',
    snapshotSource: { type: 'manual' },
  });

  const container = await mountInput();
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')!.value =
    'fresh keyword';
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')!.value = 'fresh copy';

  click(container.querySelector('#keyword-hunter-input-snapshot-save'));

  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({});
  });
  expect(inputMocks.state.keywordTracker.keywords).toEqual(['fresh keyword']);
  expect(inputMocks.state.keywordTracker.processedCopy).toBe('fresh copy');
  expect(inputMocks.state.keywordTracker.matchedKeywords).toEqual([]);
  expect(inputMocks.state.keywordTracker.unmatchedKeywords).toEqual(['fresh keyword']);
  expect(inputMocks.state.keywordTracker.wordFrequency).toEqual([]);
  expect(inputMocks.state.keywordTracker.llmAnalysisResult).toBe('');
  expect(inputMocks.state.keywordTracker.currentSnapshotId).toBeNull();
  expect(inputMocks.state.keywordTracker.snapshotSource).toEqual({ type: 'manual' });
});

it('keeps process and report state when saving an unchanged full Keyword Hunter snapshot', async () => {
  Object.assign(inputMocks.state.keywordTracker, {
    keywordsInputText: 'wireless earbuds',
    copyInputText: 'Wireless earbuds copy',
    keywords: ['wireless earbuds'],
    processedCopy: 'Wireless earbuds copy',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
    unmatchedKeywords: [],
    wordFrequency: [['wireless', 1]],
    paragraphs: [
      {
        original: 'Wireless earbuds copy',
        translation: '无线耳机文案',
      },
    ],
    translationMode: true,
    showTranslation: true,
    llmAnalysisResult: '## 88/100',
    currentSnapshotId: 'kh-full',
  });

  const container = await mountInput();
  click(container.querySelector('#keyword-hunter-input-snapshot-save'));

  await vi.waitFor(() => {
    expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({});
  });
  expect(inputMocks.state.keywordTracker.processedCopy).toBe('Wireless earbuds copy');
  expect(inputMocks.state.keywordTracker.matchedKeywords).toEqual([
    { keyword: 'wireless earbuds', count: 1 },
  ]);
  expect(inputMocks.state.keywordTracker.paragraphs).toEqual([
    {
      original: 'Wireless earbuds copy',
      translation: '无线耳机文案',
    },
  ]);
  expect(inputMocks.state.keywordTracker.llmAnalysisResult).toBe('## 88/100');
});

it('cleans duplicate keywords and restores the previous value with undo', async () => {
  const container = await mountInput();
  const input = container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input');
  expect(input).not.toBeNull();
  input!.value = 'Alpha, beta; Alpha!!';

  inputMocks.actions.keyword_hunter_cleanKeywords({}, new Event('click'));

  expect(input!.value).toBe('alpha\nbeta');
  expect(showToast).toHaveBeenCalledWith('已清理格式并去重，移除 1 个重复项', {
    type: 'success',
  });
  expect(
    container.querySelector<HTMLButtonElement>('#keyword-hunter-btn-undo-kw-clean')?.disabled
  ).toBe(false);

  inputMocks.actions.keyword_hunter_undoKeywordClean({}, new Event('click'));

  expect(input!.value).toBe('Alpha, beta; Alpha!!');
  expect(showToast).toHaveBeenCalledWith('已撤回上一步', { type: 'success' });

  inputMocks.actions.keyword_hunter_undoKeywordClean({}, new Event('click'));
  expect(showToast).toHaveBeenCalledWith('没有可撤回的关键词操作', { type: 'info' });
});

it('cleans, clears, and pastes copy text while persisting input state', async () => {
  const container = await mountInput();
  const copyInput = container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input');
  expect(copyInput).not.toBeNull();
  copyInput!.value = '**Bold** and `code`\n\n\nplain';

  inputMocks.actions.keyword_hunter_cleanCopyFormat({}, new Event('click'));

  expect(copyInput!.value).toBe('Bold and code\n\nplain');
  expect(container.querySelector('#copy-char-count')?.textContent).toBe('20');
  expect(inputMocks.state.keywordTracker.copyInputText).toBe('Bold and code\n\nplain');

  inputMocks.actions.keyword_hunter_clearCopyInput({}, new Event('click'));
  expect(copyInput!.value).toBe('');
  expect(container.querySelector('#copy-char-count')?.textContent).toBe('0');

  await inputMocks.actions.keyword_hunter_pasteFromClipboard({}, new Event('click'));
  expect(copyInput!.value).toBe('clipboard copy');
  expect(inputMocks.state.keywordTracker.copyInputText).toBe('clipboard copy');
});

it('validates required inputs and stores analysis results before navigation', async () => {
  const container = await mountInput();
  await inputMocks.actions.keyword_hunter_startAnalysis({}, new Event('click'));

  expect(showToast).toHaveBeenCalledWith('请先输入关键词和文案', { type: 'warning' });
  expect(inputMocks.navigateToRouteId).not.toHaveBeenCalled();

  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')!.value =
    'wireless earbuds\nwaterproof\nWireless Earbuds';
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')!.value =
    'These wireless earbuds are comfortable wireless earbuds for travel.';

  await inputMocks.actions.keyword_hunter_startAnalysis({}, new Event('click'));

  expect(showProgress).toHaveBeenNthCalledWith(1, true, 50);
  expect(showProgress).toHaveBeenLastCalledWith(false);
  expect(inputMocks.state.keywordTracker.keywords).toEqual(['wireless earbuds', 'waterproof']);
  expect(inputMocks.state.keywordTracker.matchedKeywords).toEqual([
    { keyword: 'wireless earbuds', count: 2 },
  ]);
  expect(inputMocks.state.keywordTracker.unmatchedKeywords).toEqual(['waterproof']);
  expect(inputMocks.state.keywordTracker.wordFrequency[0]).toEqual(['wireless', 2]);
  expect(inputMocks.navigateToRouteId).toHaveBeenCalledWith('keyword_hunter_process');
});

it('saves current input values and unregisters actions on unmount', async () => {
  const container = await mountInput();
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-keywords-input')!.value =
    'saved keyword';
  container.querySelector<HTMLTextAreaElement>('#keyword-hunter-copy-input')!.value = 'saved copy';

  unmount();

  expect(inputMocks.state.keywordTracker.keywordsInputText).toBe('saved keyword');
  expect(inputMocks.state.keywordTracker.copyInputText).toBe('saved copy');
  expect(unregisterActions).toHaveBeenCalledWith([
    'keyword_hunter_cleanKeywords',
    'keyword_hunter_removeDuplicates',
    'keyword_hunter_undoKeywordClean',
    'keyword_hunter_cleanCopyFormat',
    'keyword_hunter_pasteFromClipboard',
    'keyword_hunter_clearCopyInput',
    'keyword_hunter_startAnalysis',
  ]);
});
