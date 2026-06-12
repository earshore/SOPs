import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/input';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showProgress, showToast } from '@/common/ui';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';

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
    },
    updateKeywordTracker: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
  };

  return {
    actions: {} as Record<string, (...args: unknown[]) => unknown>,
    loadTemplate: vi.fn(async () => template),
    navigateTo: vi.fn(async () => undefined),
    readText: vi.fn(async () => 'clipboard copy'),
    renderTemplate: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    showProgress: vi.fn(),
    showToast: vi.fn(),
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
  };
}

async function mountInput(): Promise<HTMLElement> {
  const container = document.createElement('section');
  document.body.appendChild(container);
  await mount(container);
  return container;
}

beforeEach(() => {
  unmount();
  document.body.innerHTML = '';
  vi.clearAllMocks();
  inputMocks.actions = {};
  resetTrackerState();
  Object.defineProperty(window, 'navigateTo', {
    configurable: true,
    value: inputMocks.navigateTo,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: inputMocks.readText },
  });
});

describe('Keyword Hunter input module', () => {
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
    expect(container.querySelector<HTMLButtonElement>('#kt-btn-undo-kw-clean')?.disabled).toBe(true);
    expect(registerActionsWithLegacy).toHaveBeenCalledWith(expect.objectContaining({
      kt_cleanKeywords: expect.any(Function),
      kt_startAnalysis: expect.any(Function),
    }));
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
      'wireless earbuds\nwaterproof';
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
});
