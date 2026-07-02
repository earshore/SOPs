import { beforeEach, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/input';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showProgress, showToast } from '@/common/ui';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';
import { KeywordHunterSnapshotService } from '@/modules/app_center/views/keyword_hunter/services/snapshotService';

const inputMocks = vi.hoisted(() => {
  const template = `
    <section>
      <textarea id="kt-keywords-input"></textarea>
      <div id="kt-keyword-highlight-layer"></div>
      <span id="kt-keyword-count"></span>
      <span id="kt-duplicate-badge" class="hidden"><span id="kt-duplicate-count"></span></span>
      <textarea id="kt-copy-input"></textarea>
      <span id="copy-char-count"></span>
      <button id="kt-btn-clean-kw"></button>
      <button id="kt-btn-undo-kw-clean"></button>
      <button id="kt-btn-clean-copy"></button>
      <button id="kt-btn-clear-copy"></button>
      <button id="kt-btn-paste"></button>
      <button id="kt-btn-start-analysis"></button>
      <button id="kt-input-snapshot-save"></button>
      <span id="kt-input-snapshot-count"></span>
      <span id="kt-input-draft-status">
        <span id="kt-input-draft-label"></span>
        <span id="kt-input-draft-detail"></span>
      </span>
      <div id="kt-input-snapshot-loading" class="hidden"></div>
      <div id="kt-input-snapshot-empty" class="hidden"></div>
      <div id="kt-input-snapshot-list"></div>
    </section>
  `;

  const state = {
    keywordTracker: {
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
    },
    updateKeywordTracker: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
  };

  const snapshots: Array<Record<string, any>> = [];
  const resetSnapshots = () => {
    snapshots.splice(0, snapshots.length,
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
    );
  };
  resetSnapshots();

  return {
    actions: {} as Record<string, (...args: unknown[]) => unknown>,
    deleteByIdAsync: vi.fn(async (id: string) => {
      const index = snapshots.findIndex((snapshot) => snapshot.id === id);
      if (index >= 0) snapshots.splice(index, 1);
      const tracker = state.keywordTracker as Record<string, any>;
      if (tracker.currentSnapshotId === id) {
        tracker.currentSnapshotId = null;
      }
      return index >= 0;
    }),
    confirm: vi.fn(() => true),
    getAllAsync: vi.fn(async () => snapshots),
    loadTemplate: vi.fn(async () => template),
    navigateTo: vi.fn(async () => undefined),
    readText: vi.fn(async () => 'clipboard copy'),
    renderTemplate: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    resetSnapshots,
    restore: vi.fn((snapshot: Record<string, any>) => {
      Object.assign(state.keywordTracker, {
        keywordsInputText: snapshot.input.keywordsInputText,
        copyInputText: snapshot.input.copyInputText,
        currentSnapshotId: snapshot.id,
      });
      return snapshot;
    }),
    saveCurrentAsync: vi.fn(async () => ({
      id: 'kh-test',
    })),
    showProgress: vi.fn(),
    showToast: vi.fn(),
    snapshots,
    state,
    unregisterActions: vi.fn(),
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeModuleLoader: {
    getInstance: vi.fn(() => ({
      loadTemplate: inputMocks.loadTemplate,
    })),
  },
}));

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

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => inputMocks.state,
  },
}));

function resetTrackerState(): void {
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
  inputMocks.actions = {};
  resetTrackerState();
  inputMocks.resetSnapshots();
  Object.defineProperty(window, 'navigateTo', {
    configurable: true,
    value: inputMocks.navigateTo,
  });
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
      expect.any(Object),
    );
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')?.value).toBe(
      'alpha\nbeta\nalpha',
    );
    expect(container.querySelector('#kt-keyword-count')?.textContent).toBe('3');
    expect(container.querySelector('#kt-duplicate-badge')?.classList.contains('hidden')).toBe(false);
    expect(container.querySelector('#kt-duplicate-count')?.textContent).toBe('1');
    expect(container.querySelector('#copy-char-count')?.textContent).toBe('10');
    expect(container.querySelector('#kt-input-draft-status')?.textContent).toContain('本机草稿');
    expect(container.querySelector<HTMLButtonElement>('#kt-btn-undo-kw-clean')?.disabled).toBe(true);
    expect(registerActionsWithLegacy).toHaveBeenCalledWith(expect.objectContaining({
      kt_cleanKeywords: expect.any(Function),
      kt_startAnalysis: expect.any(Function),
    }));
  });

  it('renders the embedded history snapshot panel on the input page', async () => {
    const container = await mountInput();

    expect(KeywordHunterSnapshotService.getAllAsync).toHaveBeenCalled();
    expect(container.querySelector('#kt-input-snapshot-count')?.textContent).toBe('2 个快照');
    expect(container.querySelector('#kt-input-snapshot-list')?.textContent).toContain('Coffee Snapshot');
    expect(container.querySelector('#kt-input-snapshot-list')?.textContent).toContain('Manual Draft Snapshot');
    expect(container.querySelector('[data-kh-snapshot-filter]')).toBeNull();
    expect(container.querySelector('#kt-input-snapshot-open-history')).toBeNull();

    click(container.querySelector('button[title="恢复到输入页"]'));
    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.restore).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'kh-coffee' }),
      );
    });
    expect(container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')?.value).toBe(
      'coffee grinder\nespresso',
    );
    expect(container.querySelector<HTMLTextAreaElement>('#kt-copy-input')?.value).toBe(
      'Manual coffee grinder copy',
    );
    expect(container.querySelector('#kt-input-draft-label')?.textContent).toBe('已载入');
    expect(container.querySelector('#kt-input-draft-detail')?.textContent).toBe('Coffee Snapshot');

    click(container.querySelector('button[title="删除快照"]'));
    await vi.waitFor(() => {
      expect(inputMocks.confirm).toHaveBeenCalledWith(expect.stringContaining('删除后无法从本地历史恢复'));
    });
    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.deleteByIdAsync).toHaveBeenCalledWith('kh-coffee');
    });
    await vi.waitFor(() => {
      expect(container.querySelector('#kt-input-snapshot-list')?.textContent).not.toContain('Coffee Snapshot');
    });
    expect(container.querySelector('#kt-input-snapshot-list')?.textContent).toContain('Manual Draft Snapshot');
    expect(inputMocks.navigateTo).not.toHaveBeenCalled();

    click(container.querySelector('#kt-input-snapshot-save'));
    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({ status: 'draft' });
    });
  });

  it('asks before restoring a snapshot over the local draft', async () => {
    inputMocks.confirm.mockReturnValueOnce(false);
    const container = await mountInput();
    container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')!.value = 'unsaved keyword';
    container.querySelector<HTMLTextAreaElement>('#kt-copy-input')!.value = 'unsaved copy';

    click(container.querySelector('button[title="恢复到输入页"]'));

    await vi.waitFor(() => {
      expect(inputMocks.confirm).toHaveBeenCalledWith(expect.stringContaining('确定恢复快照吗'));
    });
    expect(KeywordHunterSnapshotService.restore).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')?.value).toBe('unsaved keyword');
    expect(container.querySelector<HTMLTextAreaElement>('#kt-copy-input')?.value).toBe('unsaved copy');
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
    container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')!.value = 'fresh keyword';
    container.querySelector<HTMLTextAreaElement>('#kt-copy-input')!.value = 'fresh copy';

    click(container.querySelector('#kt-input-snapshot-save'));

    await vi.waitFor(() => {
      expect(KeywordHunterSnapshotService.saveCurrentAsync).toHaveBeenCalledWith({ status: 'draft' });
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

  it('cleans duplicate keywords and restores the previous value with undo', async () => {
    const container = await mountInput();
    const input = container.querySelector<HTMLTextAreaElement>('#kt-keywords-input');
    expect(input).not.toBeNull();
    input!.value = 'Alpha, beta; Alpha!!';

    inputMocks.actions.kt_cleanKeywords({}, new Event('click'));

    expect(input!.value).toBe('alpha\nbeta');
    expect(showToast).toHaveBeenCalledWith('已清理格式并去重，移除 1 个重复项', {
      type: 'success',
    });
    expect(container.querySelector<HTMLButtonElement>('#kt-btn-undo-kw-clean')?.disabled).toBe(false);

    inputMocks.actions.kt_undoKeywordClean({}, new Event('click'));

    expect(input!.value).toBe('Alpha, beta; Alpha!!');
    expect(showToast).toHaveBeenCalledWith('已撤回上一步', { type: 'success' });

    inputMocks.actions.kt_undoKeywordClean({}, new Event('click'));
    expect(showToast).toHaveBeenCalledWith('没有可撤回的关键词操作', { type: 'info' });
  });

  it('cleans, clears, and pastes copy text while persisting input state', async () => {
    const container = await mountInput();
    const copyInput = container.querySelector<HTMLTextAreaElement>('#kt-copy-input');
    expect(copyInput).not.toBeNull();
    copyInput!.value = '**Bold** and `code`\n\n\nplain';

    inputMocks.actions.kt_cleanCopyFormat({}, new Event('click'));

    expect(copyInput!.value).toBe('Bold and code\n\nplain');
    expect(container.querySelector('#copy-char-count')?.textContent).toBe('20');
    expect(inputMocks.state.keywordTracker.copyInputText).toBe('Bold and code\n\nplain');

    inputMocks.actions.kt_clearCopyInput({}, new Event('click'));
    expect(copyInput!.value).toBe('');
    expect(container.querySelector('#copy-char-count')?.textContent).toBe('0');

    await inputMocks.actions.kt_pasteFromClipboard({}, new Event('click'));
    expect(copyInput!.value).toBe('clipboard copy');
    expect(inputMocks.state.keywordTracker.copyInputText).toBe('clipboard copy');
  });

  it('validates required inputs and stores analysis results before navigation', async () => {
    const container = await mountInput();
    await inputMocks.actions.kt_startAnalysis({}, new Event('click'));

    expect(showToast).toHaveBeenCalledWith('请先输入关键词和文案', { type: 'warning' });
    expect(inputMocks.navigateTo).not.toHaveBeenCalled();

    container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')!.value =
      'wireless earbuds\nwaterproof\nWireless Earbuds';
    container.querySelector<HTMLTextAreaElement>('#kt-copy-input')!.value =
      'These wireless earbuds are comfortable wireless earbuds for travel.';

    await inputMocks.actions.kt_startAnalysis({}, new Event('click'));

    expect(showProgress).toHaveBeenNthCalledWith(1, true, 50);
    expect(showProgress).toHaveBeenLastCalledWith(false);
    expect(inputMocks.state.keywordTracker.keywords).toEqual(['wireless earbuds', 'waterproof']);
    expect(inputMocks.state.keywordTracker.matchedKeywords).toEqual([
      { keyword: 'wireless earbuds', count: 2 },
    ]);
    expect(inputMocks.state.keywordTracker.unmatchedKeywords).toEqual(['waterproof']);
    expect(inputMocks.state.keywordTracker.wordFrequency[0]).toEqual(['wireless', 2]);
    expect(inputMocks.navigateTo).toHaveBeenCalledWith('/app-center/keyword-hunter/process');
  });

  it('saves current input values and unregisters actions on unmount', async () => {
    const container = await mountInput();
    container.querySelector<HTMLTextAreaElement>('#kt-keywords-input')!.value = 'saved keyword';
    container.querySelector<HTMLTextAreaElement>('#kt-copy-input')!.value = 'saved copy';

    unmount();

    expect(inputMocks.state.keywordTracker.keywordsInputText).toBe('saved keyword');
    expect(inputMocks.state.keywordTracker.copyInputText).toBe('saved copy');
    expect(unregisterActions).toHaveBeenCalledWith([
      'kt_cleanKeywords',
      'kt_removeDuplicates',
      'kt_undoKeywordClean',
      'kt_cleanCopyFormat',
      'kt_pasteFromClipboard',
      'kt_clearCopyInput',
      'kt_startAnalysis',
    ]);
  });
