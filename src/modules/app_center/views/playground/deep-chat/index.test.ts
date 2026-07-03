import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const deepChatTemplate = `
  <div class="playground-shell">
    <div class="playground-page">
      <aside id="playground-thread-rail" class="playground-thread-rail">
        <button id="playground-clear-chat" type="button">New</button>
        <div id="playground-thread-list"></div>
      </aside>
      <section>
        <button id="playground-toggle-rail" type="button" aria-expanded="true"></button>
        <select id="playground-model-select"></select>
        <span id="playground-provider-status"></span>
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
        </div>
      </section>
      <aside id="playground-prompt-rail">
        <div id="playground-prompt-list"></div>
        <div id="playground-prompt-preview-popover" aria-hidden="true">
          <div class="playground-prompt-preview-title"></div>
          <div class="playground-prompt-preview-body"></div>
        </div>
      </aside>
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

class TestDeepChatElement extends HTMLElement {
  history?: unknown[];
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

    const messages = document.createElement('div');
    messages.id = 'messages';

    root.append(textInputContainer, messages);
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

  vi.resetModules();
  vi.doMock('@/common/utils/viewLoader', () => ({
    loadTemplate: vi.fn(async () => deepChatTemplate),
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
  vi.doMock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
    HistoryService: historyService,
  }));

  const module = await import('./index');

  return {
    ...module,
    mocks: {
      appStore,
      callLLM,
      historyService,
      localDataStore,
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
  vi.doUnmock('@/common/utils/viewLoader');
  vi.doUnmock('@/common/infrastructure/SafeRenderer');
  vi.doUnmock('@/services/storageService');
  vi.doUnmock('@/services/localDataStore');
  vi.doUnmock('@/services/llmService');
  vi.doUnmock('@/common/ui/notifications');
  vi.doUnmock('@/stores/useAppStore');
  vi.doUnmock('@/modules/app_center/views/master_analysis/services/historyService');
  vi.useRealTimers();
  vi.restoreAllMocks();
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

    container.querySelector<HTMLButtonElement>('[data-preview-prompt-id="prompt-1"]')?.click();
    expect(document.body.querySelector('.playground-prompt-preview-title')?.textContent).toContain(
      'Listing Prompt'
    );

    container.querySelector<HTMLButtonElement>('[data-use-prompt-draft-id="prompt-1"]')?.click();
    await vi.advanceTimersByTimeAsync(200);
    expect(getChat(container).shadowRoot?.querySelector('#text-input')?.textContent).toContain(
      'Rewrite this listing'
    );

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

describe('deep-chat playground request stopping', () => {
  it('binds the stop button to abort the active request and persist a stopped response', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as { signal?: AbortSignal } | undefined;
        return new Promise<string>((_resolve, reject) => {
          callOptions?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        });
      },
    });

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

    signals.stopClicked.listener();

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

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

describe('deep-chat playground request errors', () => {
  it('rejects requests when no usable model config is available', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({ config: null });

    await mount(container);
    const onResponse = vi.fn();
    const onClose = vi.fn();

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
