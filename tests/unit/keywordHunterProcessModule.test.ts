import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/keyword_hunter/process';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui';
import { ErrorService } from '@/services/errorService';
import { callLLM } from '@/services/llmService';
import { StorageService } from '@/services/storageService';

const processMocks = vi.hoisted(() => {
  const template = `
    <section>
      <button id="kt-sync-to-input-btn"></button>
      <button id="kt-translate-btn"><span id="kt-translate-btn-text"></span></button>
      <div id="kt-translate-progress" class="hidden"></div>
      <input id="kt-show-translation" type="checkbox" />
      <div id="kt-copy-display"></div>
      <span id="kt-coverage-rate"></span>
      <div id="kt-coverage-bar"></div>
      <span id="kt-stat-matched"></span>
      <span id="kt-stat-unmatched"></span>
      <span id="kt-stat-total"></span>
      <div id="kt-word-frequency-list"></div>
      <div id="kt-keywords-floating">
        <div class="floating-header"></div>
        <button id="kt-minimize-keywords-btn"></button>
        <span id="kt-tab-matched-count"></span>
        <span id="kt-tab-unmatched-count"></span>
        <div id="kt-all-keywords"></div>
      </div>
      <button id="kt-keywords-minimized"><span id="kt-minimized-badge"></span></button>
    </section>
  `;

  const state = {
    keywordTracker: {
      keywords: [] as string[],
      processedCopy: '',
      formattedCopy: '',
      matchedKeywords: [] as Array<{ keyword: string; count: number }>,
      unmatchedKeywords: [] as string[],
      wordFrequency: [] as Array<[string, number]>,
      paragraphs: [] as Array<{ original: string; translation?: string } | string>,
      translationMode: false,
      keywordLocationIndex: {} as Record<string, number>,
      settings: {
        matchPlural: true,
        matchStem: true,
        matchCase: false,
        matchPartial: false,
      },
      isWindowMinimized: false,
      showTranslation: undefined as boolean | undefined,
    },
    updateKeywordTracker: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(state.keywordTracker, patch);
    }),
    setProcessedCopy: vi.fn((text: string) => {
      state.keywordTracker.processedCopy = text;
    }),
  };

  return {
    handleError: vi.fn(),
    loadTemplate: vi.fn(async () => template),
    navigateTo: vi.fn(async () => undefined),
    renderTemplate: vi.fn((container: HTMLElement, html: string) => {
      container.innerHTML = html;
    }),
    showToast: vi.fn(),
    state,
  };
});

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeModuleLoader: {
    getInstance: vi.fn(() => ({
      loadTemplate: processMocks.loadTemplate,
    })),
  },
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: vi.fn(() => ({
      renderTemplate: processMocks.renderTemplate,
    })),
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: processMocks.showToast,
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: processMocks.handleError,
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
    saveCurrentAsync: vi.fn(async () => ({
      id: 'kh-test',
    })),
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => processMocks.state,
  },
}));

const mockedCallLLM = vi.mocked(callLLM);
const mockedStorage = vi.mocked(StorageService);

function resetTrackerState(): void {
  processMocks.state.keywordTracker = {
    keywords: ['wireless earbuds', 'waterproof shell'],
    processedCopy: 'Wireless earbuds are travel earbuds with long battery life.',
    formattedCopy: '',
    matchedKeywords: [{ keyword: 'wireless earbuds', count: 1 }],
    unmatchedKeywords: ['waterproof shell'],
    wordFrequency: [
      ['earbuds', 2],
      ['wireless', 1],
      ['battery', 1],
      ['shell', 1],
    ],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false,
    },
    isWindowMinimized: false,
    showTranslation: undefined,
  };
}

async function mountProcess(): Promise<HTMLElement> {
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
  mockedCallLLM.mockResolvedValue('【1】 无线耳机翻译');

  Object.defineProperty(window, 'navigateTo', {
    configurable: true,
    value: processMocks.navigateTo,
  });
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent ?? '';
    },
    set(value: string) {
      this.textContent = value;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  unmount();
  document.body.innerHTML = '';
});

describe('Keyword Hunter process module', () => {
  it('mounts template content, renders highlighted copy, stats, and floating keywords', async () => {
    const container = await mountProcess();

    expect(SafeModuleLoader.getInstance).toHaveBeenCalled();
    expect(SafeRenderer.getInstance).toHaveBeenCalled();
    expect(processMocks.loadTemplate).toHaveBeenCalledWith(
      'src/modules/app_center/views/keyword_hunter/process/template.html',
      expect.any(Object),
    );
    expect(container.classList.contains('fade-in')).toBe(true);
    expect(document.body.querySelector('#kt-keywords-floating')?.parentElement).toBe(document.body);
    expect(document.body.querySelector('#kt-keywords-minimized')?.parentElement).toBe(document.body);
    expect(document.querySelectorAll('#kt-copy-display .highlightable').length).toBeGreaterThan(0);
    expect(document.querySelector('#kt-coverage-rate')?.textContent).toBe('50%');
    expect((document.querySelector<HTMLElement>('#kt-coverage-bar')?.style.width)).toBe('50%');
    expect(document.querySelector('#kt-stat-matched')?.textContent).toBe('1');
    expect(document.querySelector('#kt-stat-unmatched')?.textContent).toBe('1');
    expect(document.querySelector('#kt-stat-total')?.textContent).toBe('2');
    expect(document.querySelector('#kt-word-frequency-list')?.textContent).toContain('earbuds');
    expect(document.querySelector('#kt-word-frequency-list')?.textContent).toContain('未在文案中出现的关键词词根');
    expect(document.querySelectorAll('#kt-all-keywords .keyword-status-item')).toHaveLength(2);
    expect(document.querySelector('#kt-tab-matched-count')?.textContent).toBe('1');
    expect(document.querySelector('#kt-tab-unmatched-count')?.textContent).toBe('1');
    expect(document.querySelector('#kt-minimized-badge')?.textContent).toBe('1');
    expect(document.querySelector<HTMLButtonElement>('#kt-translate-btn')?.disabled).toBe(false);
  });

  it('locates matched keywords and unmatched roots from rendered controls', async () => {
    vi.useFakeTimers();
    await mountProcess();

    click(document.querySelector('#kt-all-keywords .keyword-status-item--matched'));
    expect(document.querySelectorAll('#kt-copy-display .highlight-focus').length).toBeGreaterThan(0);
    expect(processMocks.state.keywordTracker.keywordLocationIndex['wireless earbuds']).toBe(0);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('定位: wireless earbuds'));

    const rootTag = Array.from(document.querySelectorAll<HTMLElement>('[title="点击在关键词监控中定位"]'))
      .find((element) => element.textContent?.includes('waterproof'));
    click(rootTag ?? null);
    vi.advanceTimersByTime(300);

    expect(document.querySelector('.keyword-unmatched')?.classList.contains('keyword-root-highlight')).toBe(true);
    expect(showToast).toHaveBeenCalledWith('找到 1 个包含 "waterproof" 的关键词');

    vi.advanceTimersByTime(3000);
    expect(document.querySelector('.keyword-unmatched')?.classList.contains('keyword-root-highlight')).toBe(false);
  });

  it('translates copy, renders translation mode, and hides progress after completion', async () => {
    vi.useFakeTimers();
    await mountProcess();

    click(document.querySelector('#kt-translate-btn'));
    await vi.waitFor(() => {
      expect(processMocks.state.keywordTracker.translationMode).toBe(true);
    });

    expect(mockedCallLLM).toHaveBeenCalled();
    expect(processMocks.state.keywordTracker.translationMode).toBe(true);
    expect(processMocks.state.keywordTracker.paragraphs).toEqual([
      {
        original: 'Wireless earbuds are travel earbuds with long battery life.',
        translation: '无线耳机翻译',
      },
    ]);
    expect(document.querySelector<HTMLInputElement>('#kt-show-translation')?.checked).toBe(true);
    expect(document.querySelector('#kt-copy-display .sentence-translation')?.textContent).toBe('无线耳机翻译');
    expect(document.querySelector<HTMLElement>('#kt-translate-progress')?.style.width).toBe('100%');

    vi.advanceTimersByTime(500);
    expect(document.querySelector('#kt-translate-progress')?.classList.contains('hidden')).toBe(true);
  });

  it('handles translation failures without losing the enabled button state', async () => {
    mockedCallLLM.mockRejectedValueOnce(new Error('provider down'));
    await mountProcess();

    click(document.querySelector('#kt-translate-btn'));
    await vi.waitFor(() => {
      expect(ErrorService.handle).toHaveBeenCalled();
    });

    expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
      action: 'translateCopyImmersive',
      module: 'keywordTracker',
    });
    expect(document.querySelector<HTMLButtonElement>('#kt-translate-btn')?.disabled).toBe(false);
    expect(document.querySelector('#kt-translate-btn-text')?.textContent).toBe('AI 沉浸式翻译');
    expect(document.querySelector('#kt-translate-progress')?.classList.contains('hidden')).toBe(true);
  });

  it('syncs original translation text back to input and toggles floating window state', async () => {
    vi.useFakeTimers();
    processMocks.state.keywordTracker.translationMode = true;
    processMocks.state.keywordTracker.paragraphs = [
      { original: 'Original one', translation: '译文一' },
      { original: 'Original two', translation: '译文二' },
    ];
    await mountProcess();

    click(document.querySelector('#kt-sync-to-input-btn'));
    await vi.waitFor(() => {
      expect(processMocks.navigateTo).toHaveBeenCalledWith('/app-center/keyword-hunter/input');
    });

    expect(processMocks.state.setProcessedCopy).toHaveBeenCalledWith('Original one\nOriginal two');
    expect(processMocks.state.keywordTracker.copyInputText).toBe('Original one\nOriginal two');
    expect(processMocks.navigateTo).toHaveBeenCalledWith('/app-center/keyword-hunter/input');
    expect(showToast).toHaveBeenCalledWith('已同步原文到输入模块');

    click(document.querySelector('#kt-minimize-keywords-btn'));
    vi.advanceTimersByTime(200);
    expect(document.querySelector('#kt-keywords-floating')?.classList.contains('show')).toBe(false);
    expect(document.querySelector('#kt-keywords-minimized')?.classList.contains('show')).toBe(true);
    expect(processMocks.state.keywordTracker.isWindowMinimized).toBe(true);

    click(document.querySelector('#kt-keywords-minimized'));
    expect(document.querySelector('#kt-keywords-floating')?.classList.contains('show')).toBe(true);
    expect(processMocks.state.keywordTracker.isWindowMinimized).toBe(false);
  });

  it('saves display state and removes floating DOM on unmount', async () => {
    await mountProcess();
    const checkbox = document.querySelector<HTMLInputElement>('#kt-show-translation');
    expect(checkbox).not.toBeNull();
    checkbox!.checked = true;

    unmount();

    expect(processMocks.state.keywordTracker.processedCopy).toContain('Wireless earbuds');
    expect(processMocks.state.keywordTracker.showTranslation).toBe(true);
    expect(document.querySelector('#kt-keywords-floating')).toBeNull();
    expect(document.querySelector('#kt-keywords-minimized')).toBeNull();
  });
});
