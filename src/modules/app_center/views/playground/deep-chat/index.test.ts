import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const deepChatTemplate = `
  <div class="playground-shell">
    <div class="playground-page">
      <aside id="playground-thread-rail" class="playground-thread-rail">
        <div class="playground-thread-actions">
          <button id="playground-clear-chat" class="playground-new-thread" type="button">
            <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
            <span>新建会话</span>
          </button>
          <button id="playground-search-chats" class="playground-search-chats" type="button">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <span>搜索会话</span>
          </button>
        </div>
        <h3 class="playground-panel-title">最近会话</h3>
        <div id="playground-thread-list"></div>
      </aside>
      <section class="playground-main">
        <button id="playground-toggle-rail" type="button" aria-expanded="true" aria-label="收起最近会话"></button>
        <select id="playground-model-select"></select>
        <span id="playground-provider-status"></span>
        <button id="playground-open-settings" type="button" hidden>配置模型</button>
        <button id="playground-open-promptlab" type="button">生成 Prompt</button>
        <button id="playground-refresh-config" type="button"></button>
        <details class="playground-tuning-panel">
          <summary>Settings</summary>
          <textarea id="playground-system-prompt"></textarea>
          <output id="playground-temperature-value">0.3</output>
          <input id="playground-temperature" type="range" value="0.3">
          <button id="playground-reset-tuning" type="button"></button>
        </details>
        <div id="playground-pending-status" hidden>
          <span id="playground-pending-status-text"></span>
        </div>
        <div class="playground-chat-wrap">
          <deep-chat id="playground-chat" class="playground-chat"></deep-chat>
          <button id="playground-stop-generation" type="button" hidden>Stop</button>
        </div>
      </section>
      <aside id="playground-prompt-rail">
        <h3 class="playground-panel-title playground-panel-title--prompt">Prompt</h3>
        <div id="playground-prompt-list"></div>
        <div id="playground-prompt-preview-popover" aria-hidden="true">
          <div class="playground-prompt-preview-title"></div>
          <div class="playground-prompt-preview-body"></div>
        </div>
      </aside>
    </div>
    <div id="playground-chat-search-modal" class="playground-chat-search-modal" aria-hidden="true" hidden>
      <div class="playground-chat-search-backdrop" data-chat-search-close></div>
      <section class="playground-chat-search-dialog" role="dialog" aria-modal="true" aria-label="搜索会话">
        <div class="playground-chat-search-bar">
          <input id="playground-chat-search-input" type="search" aria-label="搜索会话">
          <button id="playground-chat-search-close" type="button" data-chat-search-close>
            关闭搜索会话
          </button>
        </div>
        <button class="playground-chat-search-new" type="button" data-chat-search-new>
          新建会话
        </button>
        <div id="playground-chat-search-results" class="playground-chat-search-results" aria-live="polite"></div>
      </section>
    </div>
  </div>
`;

type PromptHistoryState = {
  promptlab: {
    history: Array<{
      id: string;
      prompt: string;
      promptType: 'listing' | 'visual';
      marketplace?: string;
      asins?: string[];
      timestamp?: number;
      generatedAt?: string;
    }>;
  };
  removePromptHistory: ReturnType<typeof vi.fn>;
};

type ImportOptions = {
  config?: Record<string, unknown> | null;
  storedThreadStore?: Record<string, unknown> | null;
  promptHistory?: PromptHistoryState['promptlab']['history'];
  callLLM?: (...args: unknown[]) => Promise<string>;
};

type TestChatMessage = {
  role?: string;
  text?: string;
  html?: string;
  error?: string;
  overwrite?: boolean;
};

class TestDeepChatElement extends HTMLElement {
  history?: TestChatMessage[];
  defaultInput?: { text?: string };
  auxiliaryStyle?: string;
  connect?: {
    stream?: boolean;
    handler: (body: unknown, signals: unknown) => void;
  };
  stream?: boolean;
  chatStyle?: Record<string, string>;
  inputAreaStyle?: Record<string, string>;
  textInput?: Record<string, unknown>;
  submitButtonStyles?: Record<string, unknown>;
  messageStyles?: Record<string, unknown>;
  avatars?: boolean;
  names?: boolean;
  displayLoadingBubble?: boolean;
  errorMessages?: Record<string, unknown>;
  onInput?: (body: { content: { text?: string; files?: File[] }; isUser: boolean }) => void;
  addMessage = vi.fn((message: TestChatMessage) => {
    const nextMessage = { ...message };
    delete nextMessage.overwrite;
    this.history ||= [];

    if (message.overwrite) {
      const role = message.role || 'ai';
      let existingIndex = -1;
      for (let index = this.history.length - 1; index >= 0; index -= 1) {
        if ((this.history[index]?.role || 'ai') === role) {
          existingIndex = index;
          break;
        }
      }
      if (existingIndex >= 0) {
        this.history[existingIndex] = {
          ...this.history[existingIndex],
          ...nextMessage,
        };
        return;
      }
    }

    this.history.push(nextMessage);
  });
  clearMessages = vi.fn(() => {
    this.history = [];
  });
  focusInput = vi.fn();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const textInputContainer = document.createElement('div');
    textInputContainer.id = 'text-input-container';

    const textInput = document.createElement('div');
    textInput.id = 'text-input';
    textInput.contentEditable = 'true';
    textInputContainer.append(textInput);

    const submitButton = document.createElement('button');
    submitButton.className = 'input-button inside-end';
    submitButton.type = 'button';

    const messages = document.createElement('div');
    messages.id = 'messages';

    root.append(textInputContainer, submitButton, messages);
  }
}

const defaultConfig = {
  provider: 'openai',
  endpoint: 'https://llm-proxy.example/v1',
  apiKey: 'test-key',
  model: 'gpt-4.1',
  models: ['gpt-4.1', { id: 'gpt-4.1-mini' }],
};

const storedThreadStore = {
  activeThreadId: 'thread-1',
  threads: [
    {
      id: 'thread-1',
      title: 'Existing thread',
      messages: [
        { role: 'user', text: 'Saved question', createdAt: 1000 },
        { role: 'ai', text: 'Saved answer', createdAt: 2000 },
      ],
      draftText: 'Saved draft',
      createdAt: 1000,
      updatedAt: 2000,
    },
    {
      id: 'thread-2',
      title: 'Other thread',
      messages: [{ role: 'user', text: 'Other question', createdAt: 1500 }],
      draftText: '',
      createdAt: 1500,
      updatedAt: 1500,
    },
  ],
};

const promptHistory = [
  {
    id: 'prompt-1',
    prompt: 'Rewrite this listing with sharper benefits',
    promptType: 'listing' as const,
    marketplace: 'US',
    asins: ['B001', 'B002'],
    timestamp: 3000,
  },
  {
    id: 'prompt-2',
    prompt: 'Create a visual concept',
    promptType: 'visual' as const,
    marketplace: 'DE',
    generatedAt: '2026-07-02T08:00:00.000Z',
  },
];

async function importDeepChat(options: ImportOptions = {}) {
  const localDataStore = {
    migrateLocalStorageKey: vi.fn(async () => options.storedThreadStore ?? storedThreadStore),
    get: vi.fn(async () => null),
    set: vi.fn(async () => true),
    remove: vi.fn(async () => true),
  };
  const storageService = {
    getLLMConfigWithKey: vi.fn(async () =>
      options.config === undefined ? defaultConfig : options.config
    ),
    remove: vi.fn(),
  };
  const toast = vi.fn();
  const callLLM = vi.fn(
    options.callLLM ||
      (async (...args: unknown[]) => {
        const callOptions = args[5] as
          | { onStreamUpdate?: (update: { delta: string }) => void }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: 'Streamed ' });
        callOptions?.onStreamUpdate?.({ delta: 'answer' });
        return 'Streamed answer';
      })
  );
  const state: PromptHistoryState = {
    promptlab: {
      history: [...(options.promptHistory ?? promptHistory)],
    },
    removePromptHistory: vi.fn((id: string) => {
      state.promptlab.history = state.promptlab.history.filter(item => item.id !== id);
    }),
  };
  const appStore = {
    getState: vi.fn(() => state),
    subscribe: vi.fn(() => vi.fn()),
  };
  const historyService = {
    deletePromptResultAsync: vi.fn(async () => true),
  };
  const eventBus = {
    emit: vi.fn(),
  };
  const navigateToRouteId = vi.fn(async () => true);

  vi.resetModules();
  vi.doMock('@/common/infrastructure/SafeModuleLoader', () => ({
    SafeTemplateLoader: {
      getInstance: () => ({
        loadTemplate: vi.fn(async () => deepChatTemplate),
      }),
    },
  }));
  vi.doMock('@/common/infrastructure/SafeRenderer', () => ({
    SafeRenderer: {
      getInstance: () => ({
        renderTemplate: (container: HTMLElement, html: string) => {
          const parsed = new DOMParser().parseFromString(html, 'text/html');
          container.replaceChildren(
            ...Array.from(parsed.body.childNodes).map(node => document.importNode(node, true))
          );
        },
      }),
    },
  }));
  vi.doMock('@/services/storageService', () => ({ StorageService: storageService }));
  vi.doMock('@/services/localDataStore', () => ({ LocalDataStore: localDataStore }));
  vi.doMock('@/services/llmService', () => ({ callLLM }));
  vi.doMock('@/common/ui/notifications', () => ({ showToast: toast }));
  vi.doMock('@/stores/useAppStore', () => ({ appStore }));
  vi.doMock('@/common/EventBus', () => ({ default: eventBus }));
  vi.doMock('@/common/router/initRouter', () => ({ navigateToRouteId }));
  vi.doMock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
    HistoryService: historyService,
  }));

  const module = await import('./index');

  return {
    ...module,
    mocks: {
      appStore,
      callLLM,
      eventBus,
      historyService,
      localDataStore,
      navigateToRouteId,
      state,
      storageService,
      toast,
    },
  };
}

function getChat(container: HTMLElement): TestDeepChatElement {
  const chat = container.querySelector<TestDeepChatElement>('#playground-chat');
  if (!chat) {
    throw new Error('Deep Chat element not found');
  }
  return chat;
}

function queryRequired<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

function expectStoredAssistantMessage(
  setMock: ReturnType<typeof vi.fn>,
  text: string,
  threadShape: Record<string, unknown> = {}
): void {
  expect(setMock).toHaveBeenCalledWith(
    'user:playground_deep_chat_threads_v1',
    expect.objectContaining({
      activeThreadId: 'thread-1',
      threads: expect.arrayContaining([
        expect.objectContaining({
          ...threadShape,
          messages: expect.arrayContaining([expect.objectContaining({ role: 'ai', text })]),
        }),
      ]),
    }),
    'user-data'
  );
}

async function mountAndStartStoppableRequest(callLLM: NonNullable<ImportOptions['callLLM']>) {
  const container = document.createElement('main');
  document.body.append(container);
  const { mount, unmount, mocks } = await importDeepChat({ callLLM });

  await mount(container);
  const onClose = vi.fn();
  const signals = {
    onResponse: vi.fn(),
    onClose,
    stopClicked: { listener: vi.fn() },
  };
  const originalStopListener = signals.stopClicked.listener;

  getChat(container).connect?.handler(
    { messages: [{ role: 'user', text: 'Stop this request' }] },
    signals
  );

  await vi.waitFor(() => {
    expect(mocks.callLLM).toHaveBeenCalled();
    expect(signals.stopClicked.listener).not.toBe(originalStopListener);
  });

  return { container, mocks, onClose, signals, unmount };
}

beforeAll(() => {
  if (!customElements.get('deep-chat')) {
    customElements.define('deep-chat', TestDeepChatElement);
  }
});

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-02T08:00:00.000Z'));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  global.ResizeObserver = class TestResizeObserver {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  vi.doUnmock('@/common/infrastructure/SafeModuleLoader');
  vi.doUnmock('@/common/infrastructure/SafeRenderer');
  vi.doUnmock('@/services/storageService');
  vi.doUnmock('@/services/localDataStore');
  vi.doUnmock('@/services/llmService');
  vi.doUnmock('@/common/ui/notifications');
  vi.doUnmock('@/stores/useAppStore');
  vi.doUnmock('@/common/EventBus');
  vi.doUnmock('@/common/router/initRouter');
  vi.doUnmock('@/modules/app_center/views/master_analysis/services/historyService');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('deep-chat playground template copy', () => {
  it('uses localized sidebar labels, recovery actions, and search modal copy', () => {
    const template = readFileSync(
      'src/modules/app_center/views/playground/deep-chat/template.html',
      'utf8'
    );

    expect(template).toContain('class="fa-regular fa-pen-to-square"');
    expect(template).toContain('<span>新建会话</span>');
    expect(template).toContain('<span>搜索会话</span>');
    expect(template).toContain('>最近会话</h3>');
    expect(template).toContain('id="playground-open-settings"');
    expect(template).toContain('id="playground-open-promptlab"');
    expect(template).toContain('>Prompt</h3>');
    expect(template).toContain('id="playground-chat-search-modal"');
    expect(template).toContain('aria-label="搜索会话"');
    expect(template).toContain('class="playground-chat-search-bar"');
    expect(template).toContain('data-chat-search-new');
    expect(template).not.toContain('<span>New Chat</span>');
    expect(template).not.toContain('<span>Search Chats</span>');
    expect(template).not.toContain('>Prompts</h3>');
  });
});

describe('deep-chat playground module', () => {
  it('mounts stored threads, model config, prompt history, and tuning controls', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, clearPlaygroundThreadStore, mocks } = await importDeepChat();

    await mount(container);

    const chat = getChat(container);
    expect(chat.history).toHaveLength(2);
    expect(chat.defaultInput).toEqual({ text: 'Saved draft' });
    expect(chat.submitButtonStyles).toMatchObject({
      loading: { container: { backgroundColor: '#dc2626' } },
      stop: { container: { backgroundColor: '#dc2626' } },
    });
    expect(container.querySelector('#playground-provider-status')?.textContent).toBe(
      'openai / gpt-4.1'
    );
    expect(queryRequired<HTMLButtonElement>(container, '#playground-open-settings').hidden).toBe(
      true
    );
    expect([...container.querySelectorAll('option')].map(option => option.value)).toEqual([
      'gpt-4.1',
      'gpt-4.1-mini',
    ]);
    expect(container.querySelector('#playground-thread-list')?.textContent).toContain(
      'Existing thread'
    );
    expect(container.querySelector('#playground-prompt-list')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(container.querySelector('.playground-prompt-icon')).toBeNull();
    expect(container.querySelector('.playground-page')?.classList.contains('is-prompt-empty')).toBe(
      false
    );

    const temperature = queryRequired<HTMLInputElement>(container, '#playground-temperature');
    const temperatureValue = queryRequired<HTMLOutputElement>(
      container,
      '#playground-temperature-value'
    );
    const systemPrompt = queryRequired<HTMLTextAreaElement>(container, '#playground-system-prompt');
    systemPrompt.value = 'Act as an SOP assistant';
    systemPrompt.dispatchEvent(new Event('input'));
    temperature.value = '0.8';
    temperature.dispatchEvent(new Event('input'));
    expect(temperatureValue.value).toBe('0.8');

    container.querySelector<HTMLButtonElement>('#playground-reset-tuning')?.click();
    expect(systemPrompt.value).toBe('');
    expect(temperature.value).toBe('0.3');
    expect(mocks.toast).toHaveBeenCalledWith('Deep Chat 调试参数已重置', { type: 'success' });

    container.querySelector<HTMLButtonElement>('#playground-toggle-rail')?.click();
    expect(
      container.querySelector('.playground-page')?.classList.contains('is-rail-collapsed')
    ).toBe(true);

    const promptRecord = queryRequired<HTMLButtonElement>(
      container,
      '[data-preview-prompt-id="prompt-1"]'
    );
    expect(container.querySelector('.playground-prompt-use')).toBeNull();
    promptRecord.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.body.querySelector('.playground-prompt-preview-title')?.textContent).toContain(
      'Listing Prompt'
    );

    promptRecord.click();
    await vi.advanceTimersByTimeAsync(600);
    expect(getChat(container).shadowRoot?.querySelector('#text-input')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(container.querySelector('.playground-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );
    const selectedPromptRecord = queryRequired<HTMLButtonElement>(
      container,
      '[data-use-prompt-draft-id="prompt-1"]'
    );
    expect(selectedPromptRecord.classList.contains('playground-prompt-draft')).toBe(true);
    expect(selectedPromptRecord.getAttribute('aria-pressed')).toBe('true');
    expect(selectedPromptRecord.getAttribute('aria-label')).toContain('当前会话已使用');
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([expect.objectContaining({ promptDraftId: 'prompt-1' })]),
      }),
      'user-data'
    );

    queryRequired<HTMLButtonElement>(container, '#playground-open-promptlab').click();
    await vi.waitFor(() => {
      expect(mocks.navigateToRouteId).toHaveBeenCalledWith('promptlab');
    });

    container.querySelector<HTMLButtonElement>('[data-delete-prompt-draft-id="prompt-1"]')?.click();
    await vi.runAllTimersAsync();
    expect(mocks.historyService.deletePromptResultAsync).toHaveBeenCalledWith('prompt-1');
    expect(mocks.state.removePromptHistory).toHaveBeenCalledWith('prompt-1');

    await clearPlaygroundThreadStore();
    expect(mocks.localDataStore.remove).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1'
    );
    expect(mocks.storageService.remove).toHaveBeenCalledWith('playground_deep_chat_threads_v1');

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe('deep-chat playground thread history', () => {
  it('keeps a new empty thread out of recent history until it has draft content', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();

    await mount(container);

    queryRequired<HTMLButtonElement>(container, '#playground-clear-chat').click();

    expect(getChat(container).history).toEqual([]);
    expect(container.querySelector('#playground-thread-list')?.textContent).not.toContain(
      'New Thread'
    );
    expect(container.querySelector('.playground-thread-item.is-active')).toBeNull();
    expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        activeThreadId: 'thread-1',
        threads: expect.not.arrayContaining([expect.objectContaining({ title: 'New Thread' })]),
      }),
      'user-data'
    );

    const chat = getChat(container);
    const shadowRoot = chat.shadowRoot;
    if (!shadowRoot) {
      throw new Error('Deep Chat shadow root not found');
    }
    queryRequired<HTMLElement>(shadowRoot, '#text-input').textContent = 'Draft only';
    chat.onInput?.({ content: { text: 'Draft only', files: [] }, isUser: true });

    expect(container.querySelector('#playground-thread-list')?.textContent).toContain('New Thread');
    expect(container.querySelector('#playground-thread-list')?.textContent).toContain('草稿');

    await vi.advanceTimersByTimeAsync(500);

    expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            title: 'New Thread',
            draftText: 'Draft only',
          }),
        ]),
      }),
      'user-data'
    );

    unmount();
  });
});

describe('deep-chat playground thread menu', () => {
  it('opens the recent thread menu and handles rename, pin, and delete actions', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();

    const openThreadMenu = (threadId: string): void => {
      const button = queryRequired<HTMLButtonElement>(
        container,
        `[data-thread-menu-id="${threadId}"]`
      );
      button.click();
    };

    await mount(container);

    expect(container.querySelector('.playground-thread-icon')).toBeNull();

    openThreadMenu('thread-2');

    const menu = queryRequired<HTMLElement>(container, '.playground-thread-menu');
    expect(menu.textContent).toContain('重命名');
    expect(menu.textContent).toContain('置顶聊天');
    expect(menu.textContent).toContain('删除');
    expect(menu.classList.contains('playground-thread-menu--below')).toBe(true);
    expect(menu.hasAttribute('style')).toBe(false);
    expect(menu.closest('.playground-thread-item')?.querySelector('[data-thread-menu-id]')).toBe(
      queryRequired<HTMLButtonElement>(container, '[data-thread-menu-id="thread-2"]')
    );

    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="pin"]').click();

    expect(container.querySelector('.playground-thread-item')?.textContent).toContain(
      'Other thread'
    );
    expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            id: 'thread-2',
            pinnedAt: expect.any(Number),
          }),
        ]),
      }),
      'user-data'
    );

    vi.spyOn(window, 'prompt').mockReturnValue('Renamed thread');
    openThreadMenu('thread-2');
    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="rename"]').click();

    expect(container.querySelector('#playground-thread-list')?.textContent).toContain(
      'Renamed thread'
    );
    expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            id: 'thread-2',
            title: 'Renamed thread',
            customTitle: 'Renamed thread',
          }),
        ]),
      }),
      'user-data'
    );

    openThreadMenu('thread-2');
    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="delete"]').click();

    expect(container.querySelector('#playground-thread-list')?.textContent).not.toContain(
      'Renamed thread'
    );

    unmount();
  });
});

describe('deep-chat playground prompt selection', () => {
  it('keeps prompt selection on the active thread and clears it when switching threads', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();

    await mount(container);

    queryRequired<HTMLButtonElement>(container, '[data-use-prompt-draft-id="prompt-1"]').click();

    expect(container.querySelector('.playground-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(
      queryRequired<HTMLButtonElement>(
        container,
        '[data-use-prompt-draft-id="prompt-1"]'
      ).getAttribute('aria-pressed')
    ).toBe('true');

    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-1"]').click();

    expect(container.querySelector('.playground-prompt-item.is-selected')).toBeNull();
    expect(
      queryRequired<HTMLButtonElement>(
        container,
        '[data-use-prompt-draft-id="prompt-1"]'
      ).getAttribute('aria-pressed')
    ).toBe('false');

    queryRequired<HTMLButtonElement>(container, '[data-use-prompt-draft-id="prompt-2"]').click();

    expect(container.querySelector('.playground-prompt-item.is-selected')?.textContent).toContain(
      'Create a visual concept'
    );
    expect(
      queryRequired<HTMLButtonElement>(
        container,
        '[data-use-prompt-draft-id="prompt-2"]'
      ).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      queryRequired<HTMLButtonElement>(
        container,
        '[data-use-prompt-draft-id="prompt-1"]'
      ).getAttribute('aria-pressed')
    ).toBe('false');

    unmount();
  });

  it('restores the selected prompt when the Deep Chat page remounts', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const selectedPromptThreadStore = {
      activeThreadId: 'thread-1',
      threads: [
        {
          ...storedThreadStore.threads[0],
          promptDraftId: 'prompt-1',
        },
        storedThreadStore.threads[1],
      ],
    };
    const { mount, unmount } = await importDeepChat({
      storedThreadStore: selectedPromptThreadStore,
    });

    await mount(container);

    expect(container.querySelector('.playground-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );

    unmount();
    await mount(container);

    expect(container.querySelector('.playground-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(
      queryRequired<HTMLButtonElement>(
        container,
        '[data-use-prompt-draft-id="prompt-1"]'
      ).getAttribute('aria-pressed')
    ).toBe('true');

    unmount();
  });
});

describe('deep-chat playground prompt empty state', () => {
  it('marks the PC prompt rail empty state and links to Prompt generation', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({ promptHistory: [] });

    await mount(container);

    expect(container.querySelector('.playground-page')?.classList.contains('is-prompt-empty')).toBe(
      true
    );
    expect(container.querySelector('#playground-prompt-list')?.textContent).toContain(
      '暂无 Prompt'
    );
    expect(container.querySelector('#playground-prompt-list')?.textContent).toContain(
      '前往 Prompt 生成'
    );

    queryRequired<HTMLButtonElement>(container, '[data-open-promptlab]').click();
    await vi.waitFor(() => {
      expect(mocks.navigateToRouteId).toHaveBeenCalledWith('promptlab');
    });

    unmount();
  });
});

describe('deep-chat playground search chats', () => {
  it('opens chat search, filters live results, and switches to a matching chat', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();

    await mount(container);
    vi.spyOn(
      queryRequired<HTMLElement>(container, '.playground-main'),
      'getBoundingClientRect'
    ).mockReturnValue({
      bottom: 780,
      height: 700,
      left: 300,
      right: 1200,
      top: 80,
      width: 900,
      x: 300,
      y: 80,
      toJSON: () => ({}),
    } as DOMRect);

    queryRequired<HTMLButtonElement>(container, '#playground-search-chats').click();
    const modal = queryRequired<HTMLElement>(document, '#playground-chat-search-modal');
    const input = queryRequired<HTMLInputElement>(document, '#playground-chat-search-input');
    const results = queryRequired<HTMLElement>(document, '#playground-chat-search-results');

    expect(modal.hidden).toBe(false);
    expect(modal.parentElement).toBe(document.body);
    expect(modal.style.getPropertyValue('--playground-chat-search-left')).toBe('750px');
    expect(modal.style.getPropertyValue('--playground-chat-search-top')).toBe('430px');
    expect(results.textContent).toContain('今天');
    expect(results.textContent).toContain('Existing thread');
    expect(results.textContent).toContain('Other thread');

    input.value = 'Other question';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(results.textContent).toContain('搜索结果');
    expect(results.textContent).toContain('Other thread');
    expect(results.textContent).not.toContain('Existing thread');

    queryRequired<HTMLButtonElement>(results, '[data-chat-search-thread-id="thread-2"]').click();

    expect(modal.hidden).toBe(true);
    expect(container.querySelector('.playground-thread-item.is-active')?.textContent).toContain(
      'Other thread'
    );
    expect(getChat(container).history).toEqual([
      expect.objectContaining({ role: 'user', text: 'Other question' }),
    ]);

    unmount();
    expect(document.querySelector('#playground-chat-search-modal')).toBeNull();
  });

  it('closes Search Chats from blank areas without breaking New Chat or result clicks', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();

    await mount(container);

    const openButton = queryRequired<HTMLButtonElement>(container, '#playground-search-chats');
    const modal = queryRequired<HTMLElement>(document, '#playground-chat-search-modal');
    const input = queryRequired<HTMLInputElement>(document, '#playground-chat-search-input');
    const results = queryRequired<HTMLElement>(document, '#playground-chat-search-results');

    openButton.click();
    expect(modal.hidden).toBe(false);

    input.click();
    expect(modal.hidden).toBe(false);

    results.click();
    expect(modal.hidden).toBe(true);

    openButton.click();
    queryRequired<HTMLButtonElement>(document, '[data-chat-search-new]').click();
    expect(modal.hidden).toBe(true);
    expect(container.querySelector('#playground-thread-list')?.textContent).not.toContain(
      'New Thread'
    );
    expect(container.querySelector('.playground-thread-item.is-active')).toBeNull();

    openButton.click();
    queryRequired<HTMLElement>(document, '.playground-chat-search-backdrop').click();
    expect(modal.hidden).toBe(true);

    openButton.click();
    queryRequired<HTMLButtonElement>(results, '[data-chat-search-thread-id="thread-2"]').click();
    expect(modal.hidden).toBe(true);
    expect(container.querySelector('.playground-thread-item.is-active')?.textContent).toContain(
      'Other thread'
    );

    unmount();
  });
});

describe('deep-chat playground successful requests', () => {
  it('handles a streamed LLM request and persists the assistant response', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();

    await mount(container);
    const chat = getChat(container);
    const onOpen = vi.fn();
    const onResponse = vi.fn();
    const onClose = vi.fn();
    const signals = {
      onOpen,
      onResponse,
      onClose,
      stopClicked: { listener: vi.fn() },
    };

    chat.connect?.handler(
      { messages: [{ role: 'user', text: 'What should we do next?' }] },
      signals
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    expect(onOpen).toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalledWith({ text: 'Streamed ' });
    expect(onResponse).toHaveBeenCalledWith({ text: 'answer' });
    expectStoredAssistantMessage(mocks.localDataStore.set, 'Streamed answer', {
      title: 'Saved question',
    });

    unmount();
  });
});

describe('deep-chat playground remount streaming', () => {
  it('continues pending typewriter output after remounting during a stream', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | { onStreamUpdate?: (update: { delta: string }) => void }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: 'First ' });
        await streamGate;
        callOptions?.onStreamUpdate?.({ delta: 'Second' });
        return 'First Second';
      },
    });

    await mount(container);
    let originalChatMounted = true;
    const onResponse = vi.fn(async () => {
      if (!originalChatMounted) {
        throw new Error('old Deep Chat instance is unmounted');
      }
    });
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Keep typing across remount' }] },
      { onResponse, onClose, stopClicked: { listener: vi.fn() } }
    );

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({ text: 'First ' });
    });

    originalChatMounted = false;
    unmount();
    await mount(container);

    expect(getChat(container).history).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ai', text: 'First' })])
    );
    expect(getChat(container).history).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ai', text: 'First Second' })])
    );

    releaseStream();

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    await vi.advanceTimersByTimeAsync(200);

    expect(getChat(container).history).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ai', text: 'First Second' })])
    );
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'ai', text: 'First Second' }),
            ]),
          }),
        ]),
      }),
      'user-data'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[Deep Chat] 忽略已卸载会话的响应更新:',
      expect.any(Error)
    );

    unmount();
  });
});

describe('deep-chat playground request stopping', () => {
  it('binds the stop button to abort the active request and persist a stopped response', async () => {
    const { container, mocks, onClose, unmount } = await mountAndStartStoppableRequest(
      async (...args: unknown[]) => {
        const callOptions = args[5] as { signal?: AbortSignal } | undefined;
        return new Promise<string>((_resolve, reject) => {
          callOptions?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        });
      }
    );

    const overlayStopButton = queryRequired<HTMLButtonElement>(
      container,
      '#playground-stop-generation'
    );
    expect(overlayStopButton.hidden).toBe(true);
    expect(overlayStopButton.dataset.threadId).toBeUndefined();

    const submitButton = queryRequired<HTMLButtonElement>(
      getChat(container).shadowRoot || document,
      '.input-button.inside-end'
    );
    expect(submitButton.getAttribute('data-playground-stop-active')).toBe('');
    expect(submitButton.getAttribute('data-playground-stop-thread-id')).toBe('thread-1');

    submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(container.querySelector('#playground-thread-list')?.textContent).not.toContain('生成中');
    expectStoredAssistantMessage(mocks.localDataStore.set, '已停止生成。');
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'ai', text: '已停止生成。', status: 'stopped' }),
            ]),
          }),
        ]),
      }),
      'user-data'
    );
    expect(mocks.toast).toHaveBeenCalledWith('已停止生成', { type: 'warning' });

    unmount();
  });
});

describe('deep-chat playground request stopping after settled aborts', () => {
  it('persists a stopped response when an aborted request settles without throwing', async () => {
    const { mocks, onClose, signals, unmount } = await mountAndStartStoppableRequest(
      async (...args: unknown[]) => {
        const callOptions = args[5] as { signal?: AbortSignal } | undefined;
        return new Promise<string>(resolve => {
          callOptions?.signal?.addEventListener('abort', () => resolve('Late response'), {
            once: true,
          });
        });
      }
    );

    signals.stopClicked.listener();

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expectStoredAssistantMessage(mocks.localDataStore.set, '已停止生成。');
    expect(mocks.localDataStore.set).not.toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'ai', text: 'Late response' }),
            ]),
          }),
        ]),
      }),
      'user-data'
    );

    unmount();
  });
});

describe('deep-chat playground request errors', () => {
  it('rejects requests when no usable model config is available', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({ config: null });

    await mount(container);
    const onResponse = vi.fn();
    const onClose = vi.fn();
    const settingsButton = queryRequired<HTMLButtonElement>(container, '#playground-open-settings');

    expect(settingsButton.hidden).toBe(false);
    settingsButton.click();
    expect(mocks.eventBus.emit).toHaveBeenCalledWith('open-settings');

    getChat(container).connect?.handler({ text: 'Hello' }, { onResponse, onClose });

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({
        text: '请求失败：请先在系统设置中配置可用的 LLM 模型。',
      });
      expect(onClose).toHaveBeenCalled();
    });
    expect(mocks.callLLM).not.toHaveBeenCalled();
    expect(container.querySelector('#playground-provider-status')?.textContent).toContain(
      '未配置模型'
    );

    unmount();
  });
});

describe('deep-chat playground failed responses', () => {
  it('persists a visible assistant error when the LLM request fails after send', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async () => {
        throw new Error('上游 API 返回格式异常');
      },
    });

    await mount(container);
    const onResponse = vi.fn();
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Trigger a failed request' }] },
      { onResponse, onClose }
    );

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({
        text: '请求失败：上游 API 返回格式异常',
      });
      expect(onClose).toHaveBeenCalled();
    });

    expectStoredAssistantMessage(mocks.localDataStore.set, '请求失败：上游 API 返回格式异常');

    unmount();
  });
});

describe('deep-chat playground timeout responses', () => {
  it('preserves streamed partial text without appending timeout errors', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const timeoutError = Object.assign(new Error('模型响应超时(90秒)'), {
      code: 'LLM_TIMEOUT',
    });
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | { onStreamUpdate?: (update: { delta: string }) => void }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: '已生成的' });
        callOptions?.onStreamUpdate?.({ delta: '回复内容' });
        throw timeoutError;
      },
    });

    await mount(container);
    const onResponse = vi.fn();
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Generate a long response' }] },
      { onResponse, onClose }
    );

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(onResponse).toHaveBeenCalledWith({ text: '已生成的' });
    expect(onResponse).toHaveBeenCalledWith({ text: '回复内容' });
    expect(onResponse).not.toHaveBeenCalledWith({ text: '请求失败：模型响应超时(90秒)' });
    expectStoredAssistantMessage(mocks.localDataStore.set, '已生成的回复内容');
    expect(JSON.stringify(mocks.localDataStore.set.mock.calls)).not.toContain(
      '请求失败：模型响应超时(90秒)'
    );
    expect(mocks.toast).toHaveBeenCalledWith('模型响应超时，已保留已生成内容', {
      type: 'warning',
    });

    unmount();
  });
});

describe('deep-chat playground empty responses', () => {
  it('persists a visible assistant error when the LLM response is empty', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async () => '',
    });

    await mount(container);
    const onResponse = vi.fn();
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Trigger an empty response' }] },
      { onResponse, onClose }
    );

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({
        text: '请求失败：模型没有返回任何内容，请稍后重试或检查模型/上下文配置。',
      });
      expect(onClose).toHaveBeenCalled();
    });

    expectStoredAssistantMessage(
      mocks.localDataStore.set,
      '请求失败：模型没有返回任何内容，请稍后重试或检查模型/上下文配置。'
    );

    unmount();
  });
});
