import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListingPromptWorkflowContext } from '@/modules/app_center/listingWorkflowHandoff';

const deepChatTemplate = `
  <div class="deep-chat-shell">
    <div class="deep-chat-page">
      <aside id="deep-chat-thread-rail" class="deep-chat-thread-rail">
        <div class="deep-chat-thread-actions">
          <button id="deep-chat-clear-chat" class="deep-chat-new-thread" type="button">
            <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
            <span>新建会话</span>
          </button>
          <button id="deep-chat-search-chats" class="deep-chat-search-chats" type="button">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <span>搜索会话</span>
          </button>
          <button
            id="deep-chat-skill-library"
            class="deep-chat-skill-library-btn"
            type="button"
            aria-label="Skill Library"
            aria-haspopup="dialog"
            aria-controls="deep-chat-skill-library-modal"
            aria-expanded="false"
          >
            Skill Library
          </button>
        </div>
        <h3 class="deep-chat-panel-title">最近会话</h3>
        <div id="deep-chat-thread-list"></div>
      </aside>
      <section class="deep-chat-main">
        <button id="deep-chat-toggle-rail" type="button" aria-expanded="true" aria-label="收起最近会话"></button>
        <select id="deep-chat-model-select"></select>
        <button id="deep-chat-refresh-config" type="button"></button>
        <button id="deep-chat-open-settings" type="button" hidden>配置模型</button>
        <div class="deep-chat-top-actions">
          <details class="deep-chat-tuning-panel">
            <summary>Settings</summary>
            <textarea id="deep-chat-system-prompt"></textarea>
            <output id="deep-chat-temperature-value">0.3</output>
            <input id="deep-chat-temperature" type="range" value="0.3">
            <div id="deep-chat-reasoning-controls" class="deep-chat-field deep-chat-field-reasoning" hidden>
              <span class="deep-chat-reasoning-label">推理（本会话）</span>
              <label class="deep-chat-reasoning-toggle" for="deep-chat-reasoning-enabled">
                <input id="deep-chat-reasoning-enabled" type="checkbox" />
                <span>启用推理</span>
              </label>
              <label class="deep-chat-reasoning-effort-wrap" for="deep-chat-reasoning-effort">
                <span>思考强度</span>
                <select id="deep-chat-reasoning-effort" aria-label="思考强度"></select>
              </label>
            </div>
            <button id="deep-chat-reset-tuning" type="button"></button>
          </details>
        </div>
        <div id="deep-chat-pending-status" hidden>
          <span id="deep-chat-pending-status-text"></span>
        </div>
        <details id="deep-chat-reasoning-stream" class="deep-chat-reasoning-stream" hidden>
          <summary class="deep-chat-reasoning-stream-summary">思考过程</summary>
          <pre id="deep-chat-reasoning-stream-body" class="deep-chat-reasoning-stream-body"></pre>
        </details>
        <div class="deep-chat-wrap">
          <deep-chat id="deep-chat-view" class="deep-chat-view"></deep-chat>
          <button id="deep-chat-stop-generation" type="button" hidden>Stop</button>
        </div>
        <div id="deep-chat-skill-load-banner" class="deep-chat-skill-load-banner" hidden>
          <span id="deep-chat-skill-load-banner-text">正在载入技能…</span>
        </div>
      </section>
      <aside id="deep-chat-prompt-rail">
        <h3 class="deep-chat-panel-title deep-chat-panel-title--prompt">Prompt</h3>
        <div id="deep-chat-prompt-list"></div>
        <div id="deep-chat-prompt-preview-popover" aria-hidden="true">
          <div class="deep-chat-prompt-preview-title"></div>
          <div class="deep-chat-prompt-preview-body"></div>
        </div>
      </aside>
    </div>
    <div id="deep-chat-search-modal" class="deep-chat-search-modal" aria-hidden="true" hidden>
      <div class="deep-chat-search-backdrop" data-chat-search-close></div>
      <section class="deep-chat-search-dialog" role="dialog" aria-modal="true" aria-label="搜索会话">
        <div class="deep-chat-search-bar">
          <input id="deep-chat-search-input" type="search" aria-label="搜索会话">
          <button id="deep-chat-search-close" type="button" data-chat-search-close>
            关闭搜索会话
          </button>
        </div>
        <button class="deep-chat-search-new" type="button" data-chat-search-new>
          新建会话
        </button>
        <div id="deep-chat-search-results" class="deep-chat-search-results" aria-live="polite"></div>
      </section>
    </div>
    <div id="deep-chat-skill-library-modal" class="deep-chat-skill-library-modal" aria-hidden="true" hidden>
      <div class="deep-chat-skill-library-backdrop" data-skill-library-close></div>
      <section
        class="deep-chat-skill-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deep-chat-skill-library-title"
      >
        <header class="deep-chat-skill-library-header">
          <h2 id="deep-chat-skill-library-title">Skill Library</h2>
          <button type="button" data-skill-library-close aria-label="关闭 Skill Library">关闭</button>
        </header>
        <input id="deep-chat-skill-library-search" type="search" aria-label="搜索技能">
        <select id="deep-chat-skill-library-category" aria-label="技能分类">
          <option value="all">全部分类</option>
        </select>
        <div id="deep-chat-skill-library-results" class="deep-chat-skill-library-results" aria-live="polite"></div>
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
  threadStoreLoadDelay?: Promise<void>;
  threadStoreLoadDelays?: Promise<void>[];
  promptHistory?: PromptHistoryState['promptlab']['history'];
  toolStrategySettings?: Record<string, unknown> | null;
  callLLM?: (...args: unknown[]) => Promise<string>;
  pendingPromptContext?: ListingPromptWorkflowContext;
  pendingThreadId?: string;
};

type TestChatMessage = {
  role?: string;
  text?: string;
  html?: string;
  error?: string;
  overwrite?: boolean;
};

class TestDeepChatElement extends HTMLElement {
  static vendorOnRender?: (element: TestDeepChatElement) => void;

  history?: TestChatMessage[];
  /** 模拟 deep-chat：defaultInput 以纯文本写入输入框（不含水合 Chip） */
  private _defaultInput?: { text?: string };
  get defaultInput(): { text?: string } | undefined {
    return this._defaultInput;
  }
  set defaultInput(value: { text?: string } | undefined) {
    this._defaultInput = value;
    const input = this.shadowRoot?.querySelector<HTMLElement>('#text-input');
    if (input) {
      input.textContent = value?.text || '';
    }
  }
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

  connectedCallback(): void {
    if (!TestDeepChatElement.vendorOnRender) {
      return;
    }

    window.setTimeout(() => TestDeepChatElement.vendorOnRender?.(this), 20);
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

const deepChatStorageKeys = {
  LLM_ACTIVE_PROVIDER: 'llm_active_provider',
  TOOL_STRATEGY_SETTINGS: 'tool_strategy_settings',
  RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
} as const;

function createDeepChatStorageService(options: ImportOptions) {
  return {
    get: vi.fn((key: string, fallback?: unknown) => {
      if (key === deepChatStorageKeys.TOOL_STRATEGY_SETTINGS) {
        return options.toolStrategySettings ?? null;
      }
      return fallback ?? null;
    }),
    getLLMConfigWithKey: vi.fn(async () =>
      options.config === undefined ? defaultConfig : options.config
    ),
    getLLMConfig: vi.fn(() => {
      const config = options.config === undefined ? defaultConfig : options.config;
      if (!config) return null;
      const { apiKey: _apiKey, ...rest } = config as { apiKey?: string };
      return rest;
    }),
    remove: vi.fn(),
  };
}

function installListingWorkflowMocks() {
  const mocks = {
    saveListingCopy: vi.fn((copy: unknown) => copy),
    registerListingCopyArtifact: vi.fn(),
    applyListingCopyToKeywordHunter: vi.fn(),
    setWorkspaceContext: vi.fn(),
  };
  vi.doMock('@/modules/app_center/listingCopyService', () => ({
    saveListingCopy: mocks.saveListingCopy,
  }));
  vi.doMock('@/modules/app_center/artifactEnvelopeService', () => ({
    registerListingCopyArtifact: mocks.registerListingCopyArtifact,
  }));
  vi.doMock('@/modules/app_center/keywordHunterListingHandoff', () => ({
    applyListingCopyToKeywordHunter: mocks.applyListingCopyToKeywordHunter,
  }));
  vi.doMock('@/modules/app_center/workspaceContext', () => ({
    setWorkspaceContext: mocks.setWorkspaceContext,
  }));
  return mocks;
}

async function prepareListingPromptHandoff(options: ImportOptions) {
  const handoff = await import('@/modules/app_center/listingWorkflowHandoff');
  if (options.pendingPromptContext) {
    handoff.queueListingPromptForDeepChat(options.pendingPromptContext);
  }
  if (options.pendingThreadId) {
    handoff.queueDeepChatThreadResume(options.pendingThreadId);
  }
  return handoff;
}

function createLocalDataStoreMock(options: ImportOptions) {
  let threadStoreLoadIndex = 0;
  let persistedThreadStore = options.storedThreadStore ?? storedThreadStore;
  return {
    migrateLocalStorageKey: vi.fn(async () => {
      await (options.threadStoreLoadDelays?.[threadStoreLoadIndex++] ??
        options.threadStoreLoadDelay);
      return persistedThreadStore;
    }),
    get: vi.fn(async (key: string) => {
      if (key === 'user:playground_deep_chat_threads_v1') {
        return persistedThreadStore;
      }
      return null;
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      if (key === 'user:playground_deep_chat_threads_v1') {
        persistedThreadStore = value as typeof persistedThreadStore;
      }
      return true;
    }),
    remove: vi.fn(async () => true),
  };
}

function createDefaultDeepChatCall() {
  return async (...args: unknown[]) => {
    const callOptions = args[5] as
      | { onStreamUpdate?: (update: { delta: string }) => void }
      | undefined;
    callOptions?.onStreamUpdate?.({ delta: 'Streamed ' });
    callOptions?.onStreamUpdate?.({ delta: 'answer' });
    return 'Streamed answer';
  };
}

function createDeepChatPromptHistoryState(options: ImportOptions) {
  const state: PromptHistoryState = {
    promptlab: {
      history: [...(options.promptHistory ?? promptHistory)],
    },
    removePromptHistory: vi.fn((id: string) => {
      state.promptlab.history = state.promptlab.history.filter(item => item.id !== id);
    }),
  };
  return {
    state,
    appStore: {
      getState: vi.fn(() => state),
      subscribe: vi.fn(() => vi.fn()),
    },
  };
}

function createDeepChatTestRuntime(options: ImportOptions) {
  const { state, appStore } = createDeepChatPromptHistoryState(options);
  return {
    localDataStore: createLocalDataStoreMock(options),
    storageService: createDeepChatStorageService(options),
    toast: vi.fn(),
    callLLM: vi.fn(options.callLLM || createDefaultDeepChatCall()),
    state,
    appStore,
    historyService: {
      deletePromptResultAsync: vi.fn(async () => true),
    },
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(() => vi.fn()),
    },
    navigateToRouteId: vi.fn(async () => true),
    confirmWithModal: vi.fn(async () => true),
    chooseWithModal: vi.fn(async (): Promise<'primary' | 'secondary' | 'cancel'> => 'primary'),
  };
}

function installDeepChatTemplateMocks() {
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
        escapeHtml: (text: string) =>
          String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;'),
        renderTemplate: (container: HTMLElement, html: string) => {
          const parsed = new DOMParser().parseFromString(html, 'text/html');
          container.replaceChildren(
            ...Array.from(parsed.body.childNodes).map(node => document.importNode(node, true))
          );
        },
      }),
    },
  }));
}

async function importDeepChat(options: ImportOptions = {}) {
  const {
    localDataStore,
    storageService,
    toast,
    callLLM,
    state,
    appStore,
    historyService,
    eventBus,
    navigateToRouteId,
    confirmWithModal,
    chooseWithModal,
  } = createDeepChatTestRuntime(options);

  vi.resetModules();
  const listingWorkflowMocks = installListingWorkflowMocks();
  installDeepChatTemplateMocks();
  vi.doMock('@/services/storageService', () => ({
    STORAGE_KEYS: deepChatStorageKeys,
    StorageService: storageService,
  }));
  vi.doMock('@/services/localDataStore', () => ({
    LocalDataStore: localDataStore,
  }));
  vi.doMock('@/services/llmService', () => ({
    callLLM,
    // Used by request/budget when measuring message size for context trimming.
    chatContentToPlainText: (content: unknown) => {
      if (content == null) return '';
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map(part =>
            part && typeof part === 'object' && 'text' in part
              ? String((part as { text?: unknown }).text ?? '')
              : ''
          )
          .join('');
      }
      return String(content);
    },
  }));
  vi.doMock('@/services/skillRegistry', () => ({
    skillRegistry: {
      ensureInitialized: vi.fn(),
      getCategories: vi.fn(() => [{ id: 'pricing_profit', label: '定价利润', count: 1 }]),
      listSkills: vi.fn(() => [
        {
          id: 'profit-calculator',
          title: '利润测算',
          description: '快速测算 FBA 利润',
          category: 'pricing_profit',
          categoryLabel: '定价利润',
          status: 'available',
          hasScripts: false,
          source: 'amazon-skills',
          repoPath: 'profit-calculator/SKILL.md',
        },
      ]),
      getSkill: vi.fn((id: string) =>
        id === 'profit-calculator'
          ? {
              id: 'profit-calculator',
              title: '利润测算',
              description: '快速测算 FBA 利润',
              category: 'pricing_profit',
              categoryLabel: '定价利润',
              status: 'available',
              hasScripts: false,
              source: 'amazon-skills',
              repoPath: 'profit-calculator/SKILL.md',
              body: '# Profit',
              raw: '# Profit Calculator\n\nUse this skill for FBA profit.',
              frontmatter: {},
            }
          : undefined
      ),
    },
  }));
  vi.doMock('@/common/ui/notifications', () => ({ showToast: toast }));
  vi.doMock('@/stores/useAppStore', () => ({ appStore }));
  vi.doMock('@/common/EventBus', () => ({ default: eventBus }));
  vi.doMock('@/common/router/initRouter', () => ({ navigateToRouteId }));
  vi.doMock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
    HistoryService: historyService,
  }));
  vi.doMock('./infra/confirmModal', () => ({
    confirmWithModal,
    chooseWithModal,
  }));
  vi.doMock('@/components/modal/confirmModal', () => ({
    confirmWithModal,
    chooseWithModal,
  }));

  const listingWorkflowHandoff = await prepareListingPromptHandoff(options);
  const module = await import('./index');

  return {
    ...module,
    mocks: {
      appStore,
      callLLM,
      confirmWithModal,
      chooseWithModal,
      eventBus,
      historyService,
      localDataStore,
      listingWorkflowHandoff,
      navigateToRouteId,
      ...listingWorkflowMocks,
      state,
      storageService,
      toast,
    },
  };
}

type DeepChatMocks = Awaited<ReturnType<typeof importDeepChat>>['mocks'];

function expectPersistedThread(
  mocks: DeepChatMocks,
  expectedThread: Record<string, unknown>
): void {
  expect(mocks.localDataStore.set).toHaveBeenLastCalledWith(
    'user:playground_deep_chat_threads_v1',
    expect.objectContaining({
      threads: expect.arrayContaining([expect.objectContaining(expectedThread)]),
    }),
    'user-data'
  );
}

function expectSelectedPrompt(container: HTMLElement, text: string, pressed: boolean): void {
  const prompt = [
    ...container.querySelectorAll<HTMLButtonElement>('[data-use-prompt-draft-id]'),
  ].find(item => item.textContent?.includes(text));
  expect(prompt, `Prompt not found: ${text}`).toBeDefined();
  expect(prompt?.getAttribute('aria-pressed')).toBe(String(pressed));
  if (pressed) {
    expect(container.querySelector('.deep-chat-prompt-item.is-selected')?.textContent).toContain(
      text
    );
  }
}

function getChat(container: HTMLElement): TestDeepChatElement {
  const chat = container.querySelector<TestDeepChatElement>('#deep-chat-view');
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
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 800,
  });
  global.ResizeObserver = class TestResizeObserver {
    observe(): void {}
    disconnect(): void {}
    unobserve(): void {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  TestDeepChatElement.vendorOnRender = undefined;
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
  vi.doUnmock('@/modules/app_center/listingCopyService');
  vi.doUnmock('@/modules/app_center/artifactEnvelopeService');
  vi.doUnmock('@/modules/app_center/keywordHunterListingHandoff');
  vi.doUnmock('@/modules/app_center/workspaceContext');
  vi.doUnmock('./infra/confirmModal');
  vi.doUnmock('@/components/modal/confirmModal');
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
    expect(template).toContain('id="deep-chat-skill-library"');
    expect(template.indexOf('id="deep-chat-search-chats"')).toBeLessThan(
      template.indexOf('id="deep-chat-skill-library"')
    );
    expect(template.indexOf('id="deep-chat-skill-library"')).toBeLessThan(
      template.indexOf('>最近会话</h3>')
    );
    expect(template).toContain('>最近会话</h3>');
    expect(template).toContain('id="deep-chat-open-settings"');
    expect(template).not.toContain('id="deep-chat-open-promptlab"');
    expect(template).not.toContain('deep-chat-provider-status');
    expect(template.indexOf('id="deep-chat-model-select"')).toBeLessThan(
      template.indexOf('id="deep-chat-refresh-config"')
    );
    expect(template.indexOf('id="deep-chat-refresh-config"')).toBeLessThan(
      template.indexOf('class="deep-chat-top-actions"')
    );
    expect(template.indexOf('class="deep-chat-top-actions"')).toBeLessThan(
      template.indexOf('class="deep-chat-tuning-panel"')
    );
    // Skill Library lives in the thread rail, not the top actions cluster.
    expect(template.indexOf('id="deep-chat-skill-library"')).toBeLessThan(
      template.indexOf('class="deep-chat-top-actions"')
    );
    expect(template).toContain('>Prompt</h3>');
    expect(template).toContain('id="deep-chat-search-modal"');
    expect(template).toContain('aria-label="搜索会话"');
    expect(template).toContain('class="deep-chat-search-bar"');
    expect(template).toContain('data-chat-search-new');
    expect(template).not.toContain('id="deep-chat-skill-context-bar"');
    expect(template).not.toContain('<span>New Chat</span>');
    expect(template).not.toContain('<span>Search Chats</span>');
    expect(template).not.toContain('>Prompts</h3>');
  });
});

describe('deep-chat playground font initialization', () => {
  it('sets the system font before an already-defined Deep Chat element can load Google Fonts', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseThreadStoreLoad: () => void = () => {};
    const threadStoreLoadDelay = new Promise<void>(resolve => {
      releaseThreadStoreLoad = resolve;
    });
    let fontFamilyAtVendorRender = '';
    TestDeepChatElement.vendorOnRender = element => {
      fontFamilyAtVendorRender = element.style.fontFamily;
      if (!fontFamilyAtVendorRender) {
        const googleFont = document.createElement('link');
        googleFont.href = 'https://fonts.googleapis.com/css2?family=Inter';
        document.head.append(googleFont);
      }
    };
    const { mount, unmount } = await importDeepChat({ threadStoreLoadDelay });

    const mountPromise = mount(container);
    await vi.advanceTimersByTimeAsync(0);

    try {
      expect(customElements.get('deep-chat')).toBe(TestDeepChatElement);
      expect(getChat(container)).toBeInstanceOf(TestDeepChatElement);

      await vi.advanceTimersByTimeAsync(20);

      expect(fontFamilyAtVendorRender).toContain('system-ui');
      expect(document.head.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();

      releaseThreadStoreLoad();
      await mountPromise;

      queryRequired<HTMLButtonElement>(container, '#deep-chat-clear-chat').click();
      expect(getChat(container).style.fontFamily).toContain('system-ui');
    } finally {
      releaseThreadStoreLoad();
      await mountPromise;
      unmount();
    }
  });
});

describe('deep-chat playground lifecycle', () => {
  it('does not let a stale init bind controls after a remount', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseFirstLoad!: () => void;
    let releaseSecondLoad!: () => void;
    const firstLoad = new Promise<void>(resolve => {
      releaseFirstLoad = resolve;
    });
    const secondLoad = new Promise<void>(resolve => {
      releaseSecondLoad = resolve;
    });
    const { mount, unmount, mocks } = await importDeepChat({
      threadStoreLoadDelays: [firstLoad, secondLoad],
    });
    const documentAddEventListener = vi.spyOn(document, 'addEventListener');

    const firstMount = mount(container);
    let secondMount: Promise<void> | undefined;

    try {
      await vi.waitFor(() => {
        expect(mocks.localDataStore.migrateLocalStorageKey).toHaveBeenCalledTimes(1);
      });

      unmount();
      container.textContent = 'route-b';
      secondMount = mount(container);
      await vi.waitFor(() => {
        expect(mocks.localDataStore.migrateLocalStorageKey).toHaveBeenCalledTimes(2);
      });

      releaseSecondLoad();
      await secondMount;
      const currentConfigCalls = mocks.storageService.getLLMConfigWithKey.mock.calls.length;
      const currentDocumentListenerCalls = documentAddEventListener.mock.calls.length;
      const currentSubscribeCalls = mocks.appStore.subscribe.mock.calls.length;
      const threadList = queryRequired<HTMLElement>(container, '#deep-chat-thread-list');
      const replaceChildren = vi.spyOn(threadList, 'replaceChildren');

      releaseFirstLoad();
      await firstMount;

      expect(mocks.storageService.getLLMConfigWithKey).toHaveBeenCalledTimes(currentConfigCalls);
      expect(documentAddEventListener).toHaveBeenCalledTimes(currentDocumentListenerCalls);
      expect(mocks.appStore.subscribe).toHaveBeenCalledTimes(currentSubscribeCalls);
      expect(replaceChildren).not.toHaveBeenCalled();
      expect(container.querySelector('#deep-chat-view')).toBeInstanceOf(TestDeepChatElement);
    } finally {
      releaseFirstLoad();
      releaseSecondLoad();
      await Promise.allSettled([firstMount, ...(secondMount ? [secondMount] : [])]);
      unmount();
    }
  });
});

describe('deep-chat playground module', () => {
  it('mounts stored threads, model config, prompt history, and tuning controls', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, clearDeepChatThreadStore, mocks } = await importDeepChat();

    await mount(container);

    const chat = getChat(container);
    expect(chat.history).toHaveLength(2);
    expect(chat.defaultInput).toEqual({ text: 'Saved draft' });
    expect(chat.submitButtonStyles).toMatchObject({
      loading: { container: { backgroundColor: '#dc2626' } },
      stop: { container: { backgroundColor: '#dc2626' } },
    });
    expect(queryRequired<HTMLButtonElement>(container, '#deep-chat-open-settings').hidden).toBe(
      true
    );
    expect(
      [...container.querySelectorAll<HTMLOptionElement>('#deep-chat-model-select option')].map(
        option => option.value
      )
    ).toEqual(['gpt-4.1', 'gpt-4.1-mini']);
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Existing thread'
    );
    expect(container.querySelector('#deep-chat-prompt-list')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(container.querySelector('.deep-chat-prompt-icon')).toBeNull();
    expect(container.querySelector('.deep-chat-page')?.classList.contains('is-prompt-empty')).toBe(
      false
    );

    const temperature = queryRequired<HTMLInputElement>(container, '#deep-chat-temperature');
    const temperatureValue = queryRequired<HTMLOutputElement>(
      container,
      '#deep-chat-temperature-value'
    );
    const systemPrompt = queryRequired<HTMLTextAreaElement>(container, '#deep-chat-system-prompt');
    systemPrompt.value = 'Act as an SOP assistant';
    systemPrompt.dispatchEvent(new Event('input'));
    temperature.value = '0.8';
    temperature.dispatchEvent(new Event('input'));
    expect(temperatureValue.value).toBe('0.8');

    container.querySelector<HTMLButtonElement>('#deep-chat-reset-tuning')?.click();
    expect(systemPrompt.value).toBe('');
    expect(temperature.value).toBe('0.3');
    expect(mocks.toast).toHaveBeenCalledWith('Deep Chat 调试参数已重置', {
      type: 'success',
    });

    container.querySelector<HTMLButtonElement>('#deep-chat-toggle-rail')?.click();
    expect(
      container.querySelector('.deep-chat-page')?.classList.contains('is-rail-collapsed')
    ).toBe(true);

    const promptRecord = queryRequired<HTMLButtonElement>(
      container,
      '[data-preview-prompt-id="prompt-1"]'
    );
    expect(container.querySelector('.deep-chat-prompt-use')).toBeNull();
    promptRecord.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.body.querySelector('.deep-chat-prompt-preview-title')?.textContent).toContain(
      'Listing Prompt'
    );

    promptRecord.click();
    await vi.advanceTimersByTimeAsync(600);
    expect(getChat(container).shadowRoot?.querySelector('#text-input')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(container.querySelector('.deep-chat-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );
    const selectedPromptRecord = queryRequired<HTMLButtonElement>(
      container,
      '[data-use-prompt-draft-id="prompt-1"]'
    );
    expect(selectedPromptRecord.classList.contains('deep-chat-prompt-draft')).toBe(true);
    expect(selectedPromptRecord.getAttribute('aria-pressed')).toBe('true');
    expect(selectedPromptRecord.getAttribute('aria-label')).toContain('当前会话已使用');
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([expect.objectContaining({ promptDraftId: 'prompt-1' })]),
      }),
      'user-data'
    );

    expect(container.querySelector('#deep-chat-open-promptlab')).toBeNull();
    expect(container.querySelector('[data-open-promptlab]')).toBeNull();

    container.querySelector<HTMLButtonElement>('[data-delete-prompt-draft-id="prompt-1"]')?.click();
    await vi.runAllTimersAsync();
    expect(mocks.historyService.deletePromptResultAsync).toHaveBeenCalledWith('prompt-1');
    expect(mocks.state.removePromptHistory).toHaveBeenCalledWith('prompt-1');

    await clearDeepChatThreadStore();
    expect(mocks.localDataStore.remove).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1'
    );
    expect(mocks.storageService.remove).toHaveBeenCalledWith('playground_deep_chat_threads_v1');

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe('deep-chat Listing workflow handoff', () => {
  it('selects the queued thread when reopening a generated product copy', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat({
      pendingThreadId: 'thread-2',
    });

    await mount(container);

    expect(
      container
        .querySelector<HTMLButtonElement>('[data-thread-id="thread-2"]')
        ?.closest('.deep-chat-thread-item')?.classList
    ).toContain('is-active');
    unmount();
  });

  it('adds an icon beside copy that sends generated copy with the selected Prompt keywords', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const selectedPromptThreadStore = {
      activeThreadId: 'thread-1',
      threads: [
        {
          ...storedThreadStore.threads[0],
          promptDraftId: 'prompt-1',
          listingPromptContext: {
            promptId: 'prompt-1',
            prompt: 'Rewrite this listing with sharper benefits',
            seoKeywords: ['wireless earbuds', 'long battery life'],
            workItemId: 'competitor_listing:history-1',
            marketplace: 'US',
            asinOrSku: 'B001',
          },
        },
        storedThreadStore.threads[1],
      ],
    };
    const { mount, unmount, mocks } = await importDeepChat({
      storedThreadStore: selectedPromptThreadStore,
    });

    await mount(container);
    const shadowRoot = getChat(container).shadowRoot;
    if (!shadowRoot) throw new Error('Deep Chat shadow root not found');
    const outer = document.createElement('div');
    outer.className = 'outer-message-container deep-chat-outer-container-role-ai';
    const inner = document.createElement('div');
    inner.className = 'inner-message-container';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = 'Saved answer';
    inner.append(bubble);
    outer.append(inner);
    shadowRoot.querySelector('#messages')?.append(outer);
    await vi.advanceTimersByTimeAsync(0);

    await vi.waitFor(() => {
      expect(
        shadowRoot.querySelector<HTMLButtonElement>('[aria-label="推送到 Keyword Hunter 复核"]')
      ).not.toBeNull();
    });
    const sendButton = queryRequired<HTMLButtonElement>(
      shadowRoot,
      '[aria-label="推送到 Keyword Hunter 复核"]'
    );
    expect(sendButton.previousElementSibling?.getAttribute('aria-label')).toBe('复制消息');
    expect(sendButton.className).toContain('deep-chat-message-tool--emphasized');
    expect(shadowRoot.querySelector('[aria-label="复制消息"]')?.className).not.toContain(
      'deep-chat-message-tool--emphasized'
    );

    sendButton.click();
    await vi.waitFor(() => {
      expect(mocks.navigateToRouteId).toHaveBeenCalledWith('keyword_hunter_input');
    });
    expect(mocks.saveListingCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: 'prompt-1',
        content: 'Saved answer',
        seoKeywords: ['wireless earbuds', 'long battery life'],
        workItemId: 'competitor_listing:history-1',
      })
    );
    expect(mocks.registerListingCopyArtifact).toHaveBeenCalled();
    expect(mocks.applyListingCopyToKeywordHunter).toHaveBeenCalled();
    expect(mocks.setWorkspaceContext).toHaveBeenCalledWith(
      expect.objectContaining({
        workItemId: 'competitor_listing:history-1',
        sourceRoute: 'keyword_hunter_input',
      })
    );

    unmount();
  });
});

describe('deep-chat Prompt handoff', () => {
  it('consumes a Prompt handoff by creating a selected product-copy conversation', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const promptContext: ListingPromptWorkflowContext = {
      promptId: 'prompt-1',
      prompt: 'Rewrite this listing with sharper benefits',
      seoKeywords: ['wireless earbuds', 'long battery life'],
      workItemId: 'competitor_listing:history-1',
      marketplace: 'US',
      asinOrSku: 'B001',
    };
    const { mount, unmount, mocks } = await importDeepChat({
      pendingPromptContext: promptContext,
    });

    await mount(container);
    await vi.advanceTimersByTimeAsync(600);

    expect(getChat(container).shadowRoot?.querySelector('#text-input')?.textContent).toBe(
      promptContext.prompt
    );
    expect(container.querySelector('.deep-chat-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );
    expect(mocks.listingWorkflowHandoff.consumeListingPromptForDeepChat()).toBeNull();
    expectPersistedThread(mocks, {
      promptDraftId: 'prompt-1',
      listingPromptContext: promptContext,
    });

    unmount();
  });
});

async function queueProfitSkillAndMount() {
  const container = document.createElement('main');
  document.body.append(container);
  const { mount, unmount, mocks } = await importDeepChat();
  const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
  const userDraft = skillHandoff.buildSkillDeepChatUserDraft('利润测算');
  skillHandoff.queueSkillForDeepChat({
    skillId: 'profit-calculator',
    skillTitle: '利润测算',
    skillRaw: '# Profit Calculator\n\nUse margin tables.',
    userDraft,
  });
  await mount(container);
  await vi.advanceTimersByTimeAsync(600);
  return { container, unmount, mocks, skillHandoff, userDraft };
}

describe('deep-chat skill trial composer chip', () => {
  it('keeps the mounted Skill as a dismissible input Chip without a context bar', async () => {
    const { container, unmount, mocks, skillHandoff } = await queueProfitSkillAndMount();
    const chat = getChat(container);
    const input = chat.shadowRoot?.querySelector<HTMLElement>('#text-input');

    await vi.waitFor(() => {
      expect(input?.querySelector('.deep-chat-context-chip')?.textContent).toContain('利润测算');
    });
    const dismiss = input?.querySelector<HTMLButtonElement>(
      '[data-action="dismiss-skill-context"][data-skill-id="profit-calculator"]'
    );
    expect(dismiss).not.toBeNull();
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(chat.shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(input?.textContent).toContain('业务数据');
    expect(
      container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value
    ).toContain('Profit Calculator');
    expectPersistedThread(mocks, {
      skillContexts: [
        expect.objectContaining({
          skillId: 'profit-calculator',
          skillTitle: '利润测算',
        }),
      ],
    });
    expect(skillHandoff.consumeSkillForDeepChat()).toBeNull();

    dismiss?.click();
    await vi.advanceTimersByTimeAsync(50);

    expect(input?.querySelector('.deep-chat-context-chip')).toBeNull();
    expect(input?.textContent).toContain('业务数据');
    expect(input?.textContent).not.toContain('利润测算');
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(chat.shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value).toBe(
      ''
    );
    const persistedStore = mocks.localDataStore.set.mock.calls.at(-1)?.[1] as {
      threads?: Array<{
        skillContexts?: Array<{ skillId?: string }>;
        systemPrompt?: string;
      }>;
    };
    expect(
      persistedStore.threads?.some(thread =>
        thread.skillContexts?.some(context => context.skillId === 'profit-calculator')
      )
    ).toBe(false);
    expect(
      persistedStore.threads?.some(thread => thread.systemPrompt?.includes('Profit Calculator'))
    ).toBe(false);

    unmount();
  });
});

describe('deep-chat skill trial rehydrate', () => {
  it('rehydrates skill chips after remount when draft only has plain skill markers', async () => {
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    const segment = skillHandoff.formatSkillTitleSegment('利润测算');
    const draftText = `${segment}\n业务数据：ASIN-1`;
    const container = document.createElement('main');
    document.body.append(container);

    const stored = {
      activeThreadId: 'thread-skill-persist',
      threads: [
        {
          id: 'thread-skill-persist',
          title: '技能会话',
          messages: [{ role: 'user', text: 'hello', createdAt: 1000 }],
          draftText,
          skillContexts: [
            {
              skillId: 'profit-calculator',
              skillTitle: '利润测算',
              skillRaw: '# Profit Calculator',
            },
          ],
          createdAt: 1000,
          updatedAt: 2000,
        },
      ],
    };

    const first = await importDeepChat({ storedThreadStore: stored });
    await first.mount(container);
    await vi.advanceTimersByTimeAsync(400);

    // defaultInput 写入纯文本后，restore 必须再水合为 Chip
    expect(
      getChat(container).shadowRoot?.querySelector('#text-input .deep-chat-context-chip')
        ?.textContent
    ).toContain('利润测算');
    expect(getChat(container).shadowRoot?.querySelector('#text-input')?.textContent).toContain(
      '业务数据'
    );

    first.unmount();
    container.replaceChildren();

    const second = await importDeepChat({ storedThreadStore: stored });
    await second.mount(container);
    await vi.advanceTimersByTimeAsync(400);

    expect(
      getChat(container).shadowRoot?.querySelector('#text-input .deep-chat-context-chip')
        ?.textContent
    ).toContain('利润测算');
    expect(
      getChat(container).shadowRoot?.querySelectorAll('#text-input .deep-chat-context-chip').length
    ).toBe(1);

    second.unmount();
  });
});

describe('deep-chat skill trial confirm flows', () => {
  it('does not ask overwrite confirm when creating a new skill session', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);
    await vi.advanceTimersByTimeAsync(200);

    const systemPrompt = container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt');
    expect(systemPrompt).not.toBeNull();
    systemPrompt!.value = '用户自定义系统提示词';
    systemPrompt!.dispatchEvent(new Event('input', { bubbles: true }));

    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    const { consumePendingSkillHandoff } = await import('./controller');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'skill-new-session',
      skillTitle: '新建会话技能',
      skillRaw: '# New Session Skill',
      userDraft: skillHandoff.buildSkillDeepChatUserDraft('新建会话技能'),
    });
    expect(consumePendingSkillHandoff(container)).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    // 技能页试用固定新建会话，不询问挂载方式
    expect(mocks.chooseWithModal).not.toHaveBeenCalled();
    expect(mocks.confirmWithModal).not.toHaveBeenCalled();
    expect(
      container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value
    ).toContain('New Session Skill');
    unmount();
  });

  it('asks overwrite confirm only when attaching skill to current session from Skill Library', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    // 先通过技能页 handoff 建出会话，使 Skill Library 可选择「附加」
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'skill-seed',
      skillTitle: '种子技能',
      skillRaw: '# Seed',
      userDraft: skillHandoff.buildSkillDeepChatUserDraft('种子技能'),
    });
    await mount(container);
    await vi.advanceTimersByTimeAsync(200);

    const systemPrompt = container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt');
    systemPrompt!.value = '用户自定义系统提示词';
    systemPrompt!.dispatchEvent(new Event('input', { bubbles: true }));

    mocks.chooseWithModal.mockResolvedValueOnce('secondary');
    mocks.confirmWithModal.mockResolvedValueOnce(false);

    queryRequired<HTMLButtonElement>(container, '#deep-chat-skill-library').click();
    queryRequired<HTMLButtonElement>(
      document,
      '[data-skill-library-apply="profit-calculator"]'
    ).click();
    await vi.advanceTimersByTimeAsync(100);

    expect(mocks.chooseWithModal).toHaveBeenCalled();
    expect(mocks.confirmWithModal).toHaveBeenCalled();
    expect(systemPrompt?.value).toBe('用户自定义系统提示词');
    unmount();
  });
});

describe('deep-chat skill trial attach and second handoff', () => {
  it('consumes a second skill handoff while Deep Chat is already mounted', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);
    await vi.advanceTimersByTimeAsync(200);
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    const { consumePendingSkillHandoff } = await import('./controller');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'skill-second',
      skillTitle: '第二技能',
      skillRaw: '# Second Skill',
      userDraft: skillHandoff.buildSkillDeepChatUserDraft('第二技能'),
    });
    expect(consumePendingSkillHandoff(container)).toBe(true);
    expect(mocks.chooseWithModal).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(mocks.confirmWithModal).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(
        getChat(container).shadowRoot?.querySelector('#text-input .deep-chat-context-chip')
          ?.textContent
      ).toContain('第二技能');
    });
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(getChat(container).shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(
      container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value
    ).toContain('Second Skill');
    expectPersistedThread(mocks, {
      skillContexts: [expect.objectContaining({ skillId: 'skill-second' })],
    });
    expect(skillHandoff.consumeSkillForDeepChat()).toBeNull();
    unmount();
  });

  it('can attach a skill to the current session from Skill Library when user chooses attach', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'skill-first',
      skillTitle: '第一技能',
      skillRaw: '# First',
      userDraft: skillHandoff.buildSkillDeepChatUserDraft('第一技能'),
    });
    await mount(container);
    await vi.advanceTimersByTimeAsync(300);

    // 技能页试用固定新建；附加路径只来自 Skill Library「去对话」
    mocks.chooseWithModal.mockResolvedValueOnce('secondary');
    mocks.confirmWithModal.mockResolvedValueOnce(true);
    queryRequired<HTMLButtonElement>(container, '#deep-chat-skill-library').click();
    queryRequired<HTMLButtonElement>(
      document,
      '[data-skill-library-apply="profit-calculator"]'
    ).click();
    await vi.advanceTimersByTimeAsync(200);

    expect(mocks.chooseWithModal).toHaveBeenCalled();
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(getChat(container).shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    await vi.waitFor(() => {
      const chipTexts = [
        ...Array.from(
          getChat(container).shadowRoot?.querySelectorAll('#text-input .deep-chat-context-chip') ||
            []
        ),
      ].map(el => el.textContent || '');
      expect(chipTexts.some(t => t.includes('利润测算') || t.includes('第一技能'))).toBe(true);
    });
    expect(
      container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value
    ).toContain('Profit Calculator');
    unmount();
  });
});

describe('deep-chat skill trial after send', () => {
  it('consumes mounted skill after send (one-shot): no dock, no system prompt, no skillContexts', async () => {
    const { container, unmount, mocks, userDraft, skillHandoff } = await queueProfitSkillAndMount();
    const chat = getChat(container);
    const root = chat.shadowRoot;
    const input = root?.querySelector<HTMLElement>('#text-input');
    const onResponse = vi.fn();
    const onClose = vi.fn();

    // 发送前应仍挂载（系统提示 + 输入 Chip）
    expect(
      container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value
    ).toContain('Profit Calculator');
    expect(input?.querySelector('.deep-chat-context-chip')).not.toBeNull();

    // 模拟真实发送：序列化 Chip 后正文含「技能名」标记
    const sendText = skillHandoff.prefixDraftWithSkillContexts(userDraft, [
      { skillTitle: '利润测算' },
    ]);
    input!.textContent = '';
    chat.onInput?.({ content: { text: '', files: [] }, isUser: true });
    chat.connect?.handler({ text: sendText }, { onResponse, onClose });

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    // 单次执行：发送后卸掉会话挂载
    expect(root?.querySelector('#deep-chat-session-skill-chip-dock')).toBeNull();
    expect(input?.querySelector('.deep-chat-context-chip')).toBeNull();
    expect(container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value).toBe(
      ''
    );

    const persistedStore = mocks.localDataStore.set.mock.calls.at(-1)?.[1] as {
      threads?: Array<{
        skillContexts?: Array<{ skillId?: string }>;
        systemPrompt?: string;
        messages?: Array<{ role?: string; text?: string }>;
      }>;
    };
    expect(
      persistedStore.threads?.some(thread =>
        thread.skillContexts?.some(context => context.skillId === 'profit-calculator')
      )
    ).toBe(false);
    expect(
      persistedStore.threads?.some(thread => thread.systemPrompt?.includes('Profit Calculator'))
    ).toBe(false);
    // 用户消息保留技能标记（历史 Chip 展示），但不续挂会话
    expect(
      persistedStore.threads?.some(thread =>
        thread.messages?.some(
          message => message.role === 'user' && message.text?.includes('「利润测算」')
        )
      )
    ).toBe(true);

    unmount();
  });

  it('does not let a delayed skill fill overwrite edits after the input Chip is dismissed', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    const userDraft = skillHandoff.buildSkillDeepChatUserDraft('利润测算');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'profit-calculator',
      skillTitle: '利润测算',
      skillRaw: '# Profit Calculator\n\nUse margin tables.',
      userDraft,
    });

    await mount(container);
    await vi.advanceTimersByTimeAsync(20);

    const chat = getChat(container);
    const input = queryRequired<HTMLElement>(chat.shadowRoot || document, '#text-input');
    const dismiss = queryRequired<HTMLButtonElement>(
      input,
      '[data-action="dismiss-skill-context"][data-skill-id="profit-calculator"]'
    );
    dismiss.click();
    input.textContent = '保留这段刚刚编辑的草稿';
    chat.onInput?.({
      content: { text: input.textContent, files: [] },
      isUser: true,
    });

    await vi.advanceTimersByTimeAsync(300);

    expect(input.textContent).toBe('保留这段刚刚编辑的草稿');
    unmount();
  });

  it('does not let a delayed skill fill write into a newly active thread', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat({
      storedThreadStore: {
        activeThreadId: 'thread-a',
        threads: [
          {
            id: 'thread-a',
            title: 'Thread A',
            messages: [{ role: 'user', text: 'A message', createdAt: 1000 }],
            draftText: 'A 草稿',
            createdAt: 1000,
            updatedAt: 1000,
          },
          {
            id: 'thread-b',
            title: 'Thread B',
            messages: [{ role: 'user', text: 'B message', createdAt: 2000 }],
            draftText: 'B 草稿应保持不变',
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
      },
    });
    const skillHandoff = await import('@/modules/app_center/skillDeepChatHandoff');
    skillHandoff.queueSkillForDeepChat({
      skillId: 'profit-calculator',
      skillTitle: '利润测算',
      skillRaw: '# Profit Calculator\n\nUse margin tables.',
      userDraft: skillHandoff.buildSkillDeepChatUserDraft('利润测算'),
    });

    await mount(container);
    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-b"]').click();
    await vi.advanceTimersByTimeAsync(300);

    expect(
      queryRequired<HTMLElement>(getChat(container).shadowRoot || document, '#text-input')
        .textContent
    ).toBe('B 草稿应保持不变');
    unmount();
  });

  it('does not keep system prompt or skillContexts after send (one-shot skill)', async () => {
    const { container, unmount, mocks, userDraft } = await queueProfitSkillAndMount();
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(getChat(container).shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    const onResponse = vi.fn();
    const onClose = vi.fn();
    getChat(container).connect?.handler({ text: userDraft }, { onResponse, onClose });
    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);
    expect(container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt')?.value).toBe(
      ''
    );
    const persistedStore = mocks.localDataStore.set.mock.calls.at(-1)?.[1] as {
      threads?: Array<{ skillContexts?: unknown; systemPrompt?: string }>;
    };
    expect(
      persistedStore.threads?.some(
        thread => Array.isArray(thread.skillContexts) && thread.skillContexts.length > 0
      )
    ).toBe(false);
    unmount();
  });
});

describe('deep-chat playground thread history', () => {
  it('keeps a new empty thread out of recent history until it has draft content', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();

    await mount(container);

    queryRequired<HTMLButtonElement>(container, '#deep-chat-clear-chat').click();

    expect(getChat(container).history).toEqual([]);
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).not.toContain(
      'New Thread'
    );
    expect(container.querySelector('.deep-chat-thread-item.is-active')).toBeNull();
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
    chat.onInput?.({
      content: { text: 'Draft only', files: [] },
      isUser: true,
    });

    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain('New Thread');
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain('草稿');

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

  it('uses the Deep Chat default model from tool strategy for requests', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      toolStrategySettings: {
        version: 2,
        targets: {
          'playground-deep-chat': {
            defaultModelsByProvider: {
              openai: 'gpt-4.1-mini',
            },
          },
        },
      },
    });

    await mount(container);

    expect(queryRequired<HTMLSelectElement>(container, '#deep-chat-model-select').value).toBe(
      'gpt-4.1-mini'
    );

    const onResponse = vi.fn();
    const onClose = vi.fn();
    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Use strategy model' }] },
      { onResponse, onClose }
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    expect(mocks.callLLM.mock.calls[0]?.[4]).toBe('gpt-4.1-mini');

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

    expect(container.querySelector('.deep-chat-thread-icon')).toBeNull();

    openThreadMenu('thread-2');

    const menu = queryRequired<HTMLElement>(container, '.deep-chat-thread-menu');
    expect(menu.textContent).toContain('重命名');
    expect(menu.textContent).toContain('置顶聊天');
    expect(menu.textContent).toContain('删除');
    expect(menu.classList.contains('deep-chat-thread-menu--below')).toBe(true);
    expect(menu.hasAttribute('style')).toBe(false);
    expect(menu.closest('.deep-chat-thread-item')?.querySelector('[data-thread-menu-id]')).toBe(
      queryRequired<HTMLButtonElement>(container, '[data-thread-menu-id="thread-2"]')
    );

    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="pin"]').click();

    expect(container.querySelector('.deep-chat-thread-item')?.textContent).toContain(
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

    openThreadMenu('thread-2');
    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="rename"]').click();

    const editInput = queryRequired<HTMLInputElement>(
      container,
      '[data-thread-edit-id="thread-2"]'
    );
    editInput.value = 'Renamed thread';
    editInput.dispatchEvent(new Event('input', { bubbles: true }));
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Renamed thread'
    );
    expectPersistedThread(mocks, {
      id: 'thread-2',
      title: 'Renamed thread',
      customTitle: 'Renamed thread',
    });

    openThreadMenu('thread-2');
    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="delete"]').click();
    await vi.runAllTimersAsync();

    expect(container.querySelector('#deep-chat-thread-list')?.textContent).not.toContain(
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

    expectSelectedPrompt(container, 'Rewrite this listing', true);

    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-1"]').click();

    expect(container.querySelector('.deep-chat-prompt-item.is-selected')).toBeNull();
    expectSelectedPrompt(container, 'Rewrite this listing', false);

    queryRequired<HTMLButtonElement>(container, '[data-use-prompt-draft-id="prompt-2"]').click();

    expectSelectedPrompt(container, 'Create a visual concept', true);
    expectSelectedPrompt(container, 'Rewrite this listing', false);

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

    expect(container.querySelector('.deep-chat-prompt-item.is-selected')?.textContent).toContain(
      'Rewrite this listing'
    );

    unmount();
    await mount(container);

    expectSelectedPrompt(container, 'Rewrite this listing', true);

    unmount();
  });
});

describe('deep-chat playground prompt empty state', () => {
  it('shows the prompt rail empty callout and links to Prompt generation', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      promptHistory: [],
    });

    await mount(container);

    expect(container.querySelector('.deep-chat-page')?.classList.contains('is-prompt-empty')).toBe(
      true
    );
    expect(container.querySelector('#deep-chat-open-promptlab')).toBeNull();
    expect(container.querySelector('.deep-chat-prompt-empty')).not.toBeNull();
    expect(container.querySelector('#deep-chat-prompt-list')?.textContent).toContain('暂无 Prompt');
    expect(container.querySelector('#deep-chat-prompt-list')?.textContent).toContain('生成 Prompt');
    expect(container.querySelector('#deep-chat-prompt-list')?.textContent).toContain(
      '从 Prompt 生成页创建后，可在这里一键带入新会话。'
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
      queryRequired<HTMLElement>(container, '.deep-chat-main'),
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

    queryRequired<HTMLButtonElement>(container, '#deep-chat-search-chats').click();
    const modal = queryRequired<HTMLElement>(document, '#deep-chat-search-modal');
    const input = queryRequired<HTMLInputElement>(document, '#deep-chat-search-input');
    const results = queryRequired<HTMLElement>(document, '#deep-chat-search-results');

    expect(modal.hidden).toBe(false);
    expect(modal.parentElement).toBe(document.body);
    expect(modal.style.getPropertyValue('--deep-chat-search-left')).toBe('750px');
    expect(modal.style.getPropertyValue('--deep-chat-search-top')).toBe('430px');
    expect(results.textContent).toContain('今天');
    expect(results.textContent).toContain('Saved question');
    expect(results.textContent).toContain('Other question');

    input.value = 'Other question';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(results.textContent).toContain('搜索结果');
    expect(results.textContent).toContain('Other question');
    expect(results.textContent).not.toContain('Saved question');

    queryRequired<HTMLButtonElement>(results, '[data-chat-search-thread-id="thread-2"]').click();

    expect(modal.hidden).toBe(true);
    expect(container.querySelector('.deep-chat-thread-item.is-active')?.textContent).toContain(
      'Other thread'
    );
    expect(getChat(container).history).toEqual([
      expect.objectContaining({ role: 'user', text: 'Other question' }),
    ]);

    unmount();
    expect(document.querySelector('#deep-chat-search-modal')).toBeNull();
  });

  it('closes Search Chats from blank areas without breaking New Chat or result clicks', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();

    await mount(container);

    const openButton = queryRequired<HTMLButtonElement>(container, '#deep-chat-search-chats');
    const modal = queryRequired<HTMLElement>(document, '#deep-chat-search-modal');
    const input = queryRequired<HTMLInputElement>(document, '#deep-chat-search-input');
    const results = queryRequired<HTMLElement>(document, '#deep-chat-search-results');

    openButton.click();
    expect(modal.hidden).toBe(false);

    input.click();
    expect(modal.hidden).toBe(false);

    results.click();
    expect(modal.hidden).toBe(true);

    openButton.click();
    queryRequired<HTMLButtonElement>(document, '[data-chat-search-new]').click();
    expect(modal.hidden).toBe(true);
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).not.toContain(
      'New Thread'
    );
    expect(container.querySelector('.deep-chat-thread-item.is-active')).toBeNull();

    openButton.click();
    queryRequired<HTMLElement>(document, '.deep-chat-search-backdrop').click();
    expect(modal.hidden).toBe(true);

    openButton.click();
    queryRequired<HTMLButtonElement>(results, '[data-chat-search-thread-id="thread-2"]').click();
    expect(modal.hidden).toBe(true);
    expect(container.querySelector('.deep-chat-thread-item.is-active')?.textContent).toContain(
      'Other thread'
    );

    unmount();
  });
});

describe('deep-chat playground skill library', () => {
  it('opens Skill Library from the thread rail under Search Chats and applies a skill without leaving the page', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();

    await mount(container);

    const openButton = queryRequired<HTMLButtonElement>(container, '#deep-chat-skill-library');
    const searchChats = queryRequired<HTMLButtonElement>(container, '#deep-chat-search-chats');
    const threadActions = queryRequired<HTMLElement>(container, '.deep-chat-thread-actions');
    expect(threadActions.contains(openButton)).toBe(true);
    expect(searchChats.compareDocumentPosition(openButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(openButton.textContent).toContain('Skill Library');

    openButton.click();
    const modal = queryRequired<HTMLElement>(document, '#deep-chat-skill-library-modal');
    const results = queryRequired<HTMLElement>(document, '#deep-chat-skill-library-results');

    expect(modal.hidden).toBe(false);
    expect(modal.parentElement).toBe(document.body);
    expect(openButton.getAttribute('aria-expanded')).toBe('true');
    expect(results.textContent).toContain('利润测算');
    expect(results.textContent).toContain('定价利润');

    queryRequired<HTMLButtonElement>(
      results,
      '[data-skill-library-apply="profit-calculator"]'
    ).click();

    // 调用后应立刻关闭 Skill Library，避免挡住后续「挂载技能」确认模态框
    expect(modal.hidden).toBe(true);
    expect(openButton.getAttribute('aria-expanded')).toBe('false');

    await vi.waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.stringContaining('利润测算'),
        expect.objectContaining({ type: 'success' })
      );
    });
    expect(mocks.navigateToRouteId).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(
        getChat(container).shadowRoot?.querySelector('#text-input .deep-chat-context-chip')
          ?.textContent
      ).toContain('利润测算');
    });
    expect(container.querySelector('#deep-chat-skill-context-bar')).toBeNull();
    expect(getChat(container).shadowRoot?.querySelector('#deep-chat-skill-context-bar')).toBeNull();

    unmount();
    expect(document.querySelector('#deep-chat-skill-library-modal')).toBeNull();
  });
});

describe('deep-chat playground reasoning prefs', () => {
  it('passes session reasoning override to callLLM when sending', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'o3-mini',
        models: [{ id: 'o3-mini', context: 200000, features: ['reasoning'] }],
        reasoningPrefs: { enabled: false, effort: 'low' },
      },
    });

    await mount(container);

    const reasoningRoot = queryRequired<HTMLElement>(container, '#deep-chat-reasoning-controls');
    // Capability registry maps o3-mini → show controls
    expect(reasoningRoot.hidden).toBe(false);

    const enabled = queryRequired<HTMLInputElement>(container, '#deep-chat-reasoning-enabled');
    enabled.checked = true;
    enabled.dispatchEvent(new Event('change', { bubbles: true }));

    const effort = queryRequired<HTMLSelectElement>(container, '#deep-chat-reasoning-effort');
    effort.value = 'high';
    effort.dispatchEvent(new Event('change', { bubbles: true }));

    const chat = getChat(container);
    const onClose = vi.fn();
    chat.connect?.handler(
      { messages: [{ role: 'user', text: 'Reason about margins' }] },
      { onResponse: vi.fn(), onClose }
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const options = mocks.callLLM.mock.calls[0]?.[5] as {
      reasoningSessionOverride?: { enabled?: boolean; effort?: string };
    };
    expect(options.reasoningSessionOverride).toEqual({
      enabled: true,
      effort: 'high',
    });

    unmount();
  });

  it('renders only the effort tiers the active model supports', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    // grok-4.5 官方仅 low|medium|high
    const { mount, unmount } = await importDeepChat({
      config: {
        provider: 'new_api',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'grok-4.5',
        models: ['grok-4.5'],
      },
    });

    await mount(container);
    const effort = queryRequired<HTMLSelectElement>(container, '#deep-chat-reasoning-effort');
    expect(Array.from(effort.options).map(option => option.value)).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(effort.options[0]?.textContent).toBe('低 (low)');

    unmount();
  });

  it('renders the full five tiers for models that support xhigh/max', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'gpt-5.1',
        models: ['gpt-5.1'],
      },
    });

    await mount(container);
    const effort = queryRequired<HTMLSelectElement>(container, '#deep-chat-reasoning-effort');
    expect(Array.from(effort.options).map(option => option.value)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);

    unmount();
  });

  it('clamps a stored effort above the model ceiling and writes it back to the thread', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    // grok-4.5 天花板为 high；已存的 max 应落到 high 并回写线程
    const { mount, unmount, mocks } = await importDeepChat({
      config: {
        provider: 'new_api',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'grok-4.5',
        models: ['grok-4.5'],
        reasoningPrefs: { enabled: true, effort: 'max' },
      },
    });

    await mount(container);
    await vi.advanceTimersByTimeAsync(400);
    const effort = queryRequired<HTMLSelectElement>(container, '#deep-chat-reasoning-effort');
    expect(effort.value).toBe('high');

    const chat = getChat(container);
    const onClose = vi.fn();
    chat.connect?.handler(
      { messages: [{ role: 'user', text: 'Reason within model limits' }] },
      { onResponse: vi.fn(), onClose }
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const options = mocks.callLLM.mock.calls[0]?.[5] as {
      reasoningSessionOverride?: { enabled?: boolean; effort?: string };
    };
    expect(options.reasoningSessionOverride).toEqual({ enabled: true, effort: 'high' });

    const persisted = mocks.localDataStore.set.mock.calls
      .filter(([key]) => key === 'user:playground_deep_chat_threads_v1')
      .at(-1)?.[1] as {
      threads?: Array<{ id: string; reasoning?: { enabled?: boolean; effort?: string } }>;
    };
    expect(persisted?.threads?.[0]?.reasoning).toEqual({ enabled: true, effort: 'high' });

    unmount();
  });

  it('hides session reasoning controls for models without a mapRequest', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'gpt-4.1',
        models: ['gpt-4.1'],
      },
    });

    await mount(container);
    expect(queryRequired<HTMLElement>(container, '#deep-chat-reasoning-controls').hidden).toBe(
      true
    );
    unmount();
  });

  it('re-syncs reasoning controls when the model select changes', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'o3-mini',
        models: ['o3-mini', 'gpt-4.1'],
      },
    });

    await mount(container);
    const reasoningRoot = queryRequired<HTMLElement>(container, '#deep-chat-reasoning-controls');
    expect(reasoningRoot.hidden).toBe(false);

    const modelSelect = queryRequired<HTMLSelectElement>(container, '#deep-chat-model-select');
    modelSelect.value = 'gpt-4.1';
    modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(reasoningRoot.hidden).toBe(true);

    modelSelect.value = 'o3-mini';
    modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(reasoningRoot.hidden).toBe(false);

    unmount();
  });

  it('forces reasoning off for unsupported models even if thread override was on', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'gpt-4.1',
        models: ['gpt-4.1'],
        reasoningPrefs: { enabled: true, effort: 'high' },
      },
    });

    await mount(container);
    expect(queryRequired<HTMLElement>(container, '#deep-chat-reasoning-controls').hidden).toBe(
      true
    );

    const chat = getChat(container);
    const onClose = vi.fn();
    chat.connect?.handler(
      { messages: [{ role: 'user', text: 'No reasoning fields please' }] },
      { onResponse: vi.fn(), onClose }
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const options = mocks.callLLM.mock.calls[0]?.[5] as {
      reasoningSessionOverride?: { enabled?: boolean; effort?: string };
    };
    expect(options.reasoningSessionOverride).toEqual({ enabled: false });

    unmount();
  });

  it('clears session reasoning override on reset tuning', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat({
      config: {
        provider: 'openai',
        endpoint: 'https://llm-proxy.example/v1',
        apiKey: 'test-key',
        model: 'o3-mini',
        models: ['o3-mini'],
        reasoningPrefs: { enabled: false, effort: 'medium' },
      },
    });

    await mount(container);
    const enabled = queryRequired<HTMLInputElement>(container, '#deep-chat-reasoning-enabled');
    enabled.checked = true;
    enabled.dispatchEvent(new Event('change', { bubbles: true }));

    queryRequired<HTMLButtonElement>(container, '#deep-chat-reset-tuning').click();
    expect(enabled.checked).toBe(false);

    const chat = getChat(container);
    const onClose = vi.fn();
    chat.connect?.handler(
      { messages: [{ role: 'user', text: 'After reset' }] },
      { onResponse: vi.fn(), onClose }
    );

    await vi.waitFor(() => {
      expect(mocks.callLLM).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const options = mocks.callLLM.mock.calls[0]?.[5] as {
      reasoningSessionOverride?: { enabled?: boolean; effort?: string };
    };
    // Controls visible; live DOM after reset is unchecked → session override enabled:false
    expect(options.reasoningSessionOverride?.enabled).toBe(false);

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

describe('deep-chat playground concurrent sessions', () => {
  it('allows switching threads while generating and marks unread when background output finishes', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const { mount, unmount } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string }) => void;
              signal?: AbortSignal;
            }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: 'Background ' });
        await streamGate;
        callOptions?.onStreamUpdate?.({ delta: 'complete' });
        return 'Background complete';
      },
    });

    await mount(container);
    const onClose = vi.fn();
    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Generate in thread 1' }] },
      {
        onResponse: vi.fn(async () => undefined),
        onClose,
        stopClicked: { listener: vi.fn() },
      }
    );

    await vi.waitFor(() => {
      expect(
        container.querySelector('.deep-chat-thread-item.is-active .deep-chat-thread-meta')
          ?.textContent
      ).toMatch(/生成中|输出中/);
    });

    const otherThreadButton = queryRequired<HTMLButtonElement>(
      container,
      '[data-thread-id="thread-2"]'
    );
    otherThreadButton.click();

    await vi.waitFor(() => {
      expect(container.querySelector('.deep-chat-thread-item.is-active')?.textContent).toContain(
        'Other thread'
      );
    });

    // 生成中会话仍应在列表中可见，且切走后不阻断
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toMatch(/生成中|输出中/);

    releaseStream();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    // LLM settle 后应立即出现未读圆点，无需再点击会话、也无需等打字机播完
    await vi.waitFor(() => {
      const thread1 = container
        .querySelector('[data-thread-id="thread-1"]')
        ?.closest('.deep-chat-thread-item');
      expect(
        thread1?.classList.contains('is-unread') ||
          thread1?.querySelector('.deep-chat-thread-unread')
      ).toBeTruthy();
    });

    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-1"]').click();
    await vi.waitFor(() => {
      const active = container.querySelector('.deep-chat-thread-item.is-active');
      expect(active?.querySelector('[data-thread-id="thread-1"]')).not.toBeNull();
    });
    // 切回即清除未读
    expect(container.querySelector('.deep-chat-thread-unread')).toBeNull();
    expect(container.querySelector('.deep-chat-thread-item.is-unread')).toBeNull();

    unmount();
  });
});

describe('deep-chat playground reasoning stream stability', () => {
  it('keeps accumulating reasoning while switching threads and restores full text on return', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const onStreamUpdateCalls: Array<{ delta: string; reasoningDelta?: string }> = [];
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string; reasoningDelta?: string }) => void;
              signal?: AbortSignal;
            }
          | undefined;
        const push = (update: { delta: string; reasoningDelta?: string }) => {
          onStreamUpdateCalls.push(update);
          callOptions?.onStreamUpdate?.(update);
        };
        push({ delta: '', reasoningDelta: 'Step A. ' });
        push({ delta: '', reasoningDelta: 'Step B before switch. ' });
        await streamGate;
        // Continues after user left the generating thread
        push({ delta: '', reasoningDelta: 'Step C after switch. ' });
        push({ delta: 'Final answer' });
        return 'Final answer';
      },
    });

    await mount(container);
    const onClose = vi.fn();
    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Think carefully' }] },
      {
        onResponse: vi.fn(async () => undefined),
        onClose,
        stopClicked: { listener: vi.fn() },
      }
    );

    await vi.waitFor(() => {
      expect(onStreamUpdateCalls.length).toBeGreaterThanOrEqual(2);
    });

    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-2"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('.deep-chat-thread-item.is-active')?.textContent).toContain(
        'Other thread'
      );
    });

    releaseStream();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    queryRequired<HTMLButtonElement>(container, '[data-thread-id="thread-1"]').click();
    await vi.waitFor(() => {
      expect(
        container.querySelector('.deep-chat-thread-item.is-active [data-thread-id="thread-1"]')
      ).not.toBeNull();
    });
    await vi.advanceTimersByTimeAsync(400);

    const saved = mocks.localDataStore.set.mock.calls
      .map(
        call =>
          call[1] as {
            threads?: Array<{
              id: string;
              messages?: Array<{ reasoning?: string; text?: string }>;
            }>;
          }
      )
      .filter(Boolean)
      .at(-1);
    const thread1 = saved?.threads?.find(thread => thread.id === 'thread-1');
    const aiWithReasoning = thread1?.messages?.find(
      message => typeof message.reasoning === 'string' && message.reasoning.includes('Step C')
    );
    expect(aiWithReasoning?.reasoning).toContain('Step A.');
    expect(aiWithReasoning?.reasoning).toContain('Step B before switch.');
    expect(aiWithReasoning?.reasoning).toContain('Step C after switch.');
    expect(aiWithReasoning?.text || '').toContain('Final answer');

    unmount();
  });

  it('keeps reasoning stream across page unmount without aborting', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    let sawAbort = false;
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string; reasoningDelta?: string }) => void;
              signal?: AbortSignal;
            }
          | undefined;
        callOptions?.signal?.addEventListener(
          'abort',
          () => {
            sawAbort = true;
          },
          { once: true }
        );
        callOptions?.onStreamUpdate?.({ delta: '', reasoningDelta: 'Reason before leave. ' });
        await streamGate;
        callOptions?.onStreamUpdate?.({
          delta: '',
          reasoningDelta: 'Reason after leave. ',
        });
        callOptions?.onStreamUpdate?.({ delta: 'Done' });
        return 'Done';
      },
    });

    await mount(container);
    const onClose = vi.fn();
    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Leave mid-think' }] },
      {
        onResponse: vi.fn(async () => undefined),
        onClose,
        stopClicked: { listener: vi.fn() },
      }
    );

    await vi.waitFor(() => {
      expect(
        container.querySelector('.deep-chat-thread-item.is-active .deep-chat-thread-meta')
          ?.textContent
      ).toMatch(/生成中|输出中/);
    });

    unmount();
    expect(sawAbort).toBe(false);

    releaseStream();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(sawAbort).toBe(false);

    await mount(container);
    await vi.advanceTimersByTimeAsync(400);

    const saved = mocks.localDataStore.set.mock.calls
      .map(
        call =>
          call[1] as {
            threads?: Array<{
              id: string;
              messages?: Array<{ reasoning?: string; text?: string }>;
            }>;
          }
      )
      .filter(Boolean)
      .at(-1);
    const thread1 = saved?.threads?.find(thread => thread.id === 'thread-1');
    const ai = thread1?.messages?.find(
      message => typeof message.reasoning === 'string' && message.reasoning.includes('after leave')
    );
    expect(ai?.reasoning).toContain('Reason before leave.');
    expect(ai?.reasoning).toContain('Reason after leave.');
    expect(ai?.text || '').toContain('Done');

    unmount();
  });
});

describe('deep-chat playground remount streaming display', () => {
  it('keeps generating state across unmount and resumes display on remount', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    let sawAbort = false;
    const { mount, unmount } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string }) => void;
              signal?: AbortSignal;
            }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: 'First ' });
        callOptions?.signal?.addEventListener(
          'abort',
          () => {
            sawAbort = true;
          },
          { once: true }
        );
        await streamGate;
        callOptions?.onStreamUpdate?.({ delta: 'Second' });
        return 'First Second';
      },
    });

    await mount(container);
    const onResponse = vi.fn(async () => undefined);
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Keep generating across leave' }] },
      { onResponse, onClose, stopClicked: { listener: vi.fn() } }
    );

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({ text: 'First ' });
    });

    // 切出页面：不应 abort 在飞生成
    unmount();
    expect(sawAbort).toBe(false);

    // 切回：列表应仍显示生成态，并继续输出
    await mount(container);
    await vi.advanceTimersByTimeAsync(100);
    expect(
      container.querySelector('.deep-chat-thread-item.is-active .deep-chat-thread-meta')
        ?.textContent
    ).toMatch(/生成中|输出中/);

    releaseStream();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    await vi.advanceTimersByTimeAsync(400);

    expect(getChat(container).history).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ai', text: 'First Second' })])
    );
    expect(sawAbort).toBe(false);

    unmount();
  });
});

describe('deep-chat playground background stream settlement', () => {
  it('keeps receiving stream text and settles while the page is unmounted', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    let sawAbort = false;
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string }) => void;
              signal?: AbortSignal;
            }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: 'Silent ' });
        callOptions?.signal?.addEventListener(
          'abort',
          () => {
            sawAbort = true;
          },
          { once: true }
        );
        await streamGate;
        callOptions?.onStreamUpdate?.({ delta: 'background complete' });
        return 'Silent background complete';
      },
    });

    await mount(container);
    const onResponse = vi.fn(async () => undefined);
    const onClose = vi.fn();

    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Generate after leave' }] },
      { onResponse, onClose, stopClicked: { listener: vi.fn() } }
    );

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({ text: 'Silent ' });
    });

    // 切出后不再向旧 signals 推流，但 LLM 与内存态继续
    unmount();
    expect(sawAbort).toBe(false);
    const responseCallsBeforeBackground = onResponse.mock.calls.length;

    releaseStream();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    await vi.advanceTimersByTimeAsync(200);

    // 后台结算：旧 Deep Chat 实例不应再收到后续 delta
    expect(onResponse.mock.calls.length).toBe(responseCallsBeforeBackground);
    expectStoredAssistantMessage(mocks.localDataStore.set, 'Silent background complete');
    expect(sawAbort).toBe(false);

    // 切回即可看到完整回复，无需等待「恢复输出」
    await mount(container);
    await vi.advanceTimersByTimeAsync(100);
    expect(getChat(container).history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'ai',
          text: 'Silent background complete',
        }),
      ])
    );

    unmount();
  });
});

describe('deep-chat playground partial stream recovery', () => {
  it('persists partial stream text so a full remount can recover mid-generation output', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    let releaseStream = (): void => {};
    const streamGate = new Promise<void>(resolve => {
      releaseStream = resolve;
    });
    const partialText = `${'半截回复内容'.repeat(20)}`;
    const { mount, unmount, mocks } = await importDeepChat({
      callLLM: async (...args: unknown[]) => {
        const callOptions = args[5] as
          | {
              onStreamUpdate?: (update: { delta: string }) => void;
            }
          | undefined;
        callOptions?.onStreamUpdate?.({ delta: partialText });
        await streamGate;
        callOptions?.onStreamUpdate?.({ delta: ' 已补全' });
        return `${partialText} 已补全`;
      },
    });

    await mount(container);
    getChat(container).connect?.handler(
      { messages: [{ role: 'user', text: 'Recover after refresh' }] },
      {
        onResponse: vi.fn(async () => undefined),
        onClose: vi.fn(),
        stopClicked: { listener: vi.fn() },
      }
    );

    await vi.waitFor(() => {
      expect(mocks.localDataStore.set).toHaveBeenCalledWith(
        'user:playground_deep_chat_threads_v1',
        expect.objectContaining({
          threads: expect.arrayContaining([
            expect.objectContaining({
              messages: expect.arrayContaining([
                expect.objectContaining({
                  role: 'ai',
                  text: partialText,
                  status: 'partial',
                }),
              ]),
            }),
          ]),
        }),
        'user-data'
      );
    });

    // 模拟刷新：卸载并重新加载模块，仅靠存储恢复
    const persistedStore = mocks.localDataStore.set.mock.calls
      .filter(call => call[0] === 'user:playground_deep_chat_threads_v1')
      .at(-1)?.[1];
    unmount();
    releaseStream();

    const remounted = await importDeepChat({
      storedThreadStore: persistedStore as typeof storedThreadStore,
    });
    await remounted.mount(container);
    expect(getChat(container).history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'ai',
          text: partialText,
          status: 'partial',
        }),
      ])
    );

    remounted.unmount();
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
      '#deep-chat-stop-generation'
    );
    expect(overlayStopButton.hidden).toBe(true);
    expect(overlayStopButton.dataset.threadId).toBeUndefined();

    const submitButton = queryRequired<HTMLButtonElement>(
      getChat(container).shadowRoot || document,
      '.input-button.inside-end'
    );
    expect(submitButton.getAttribute('data-deep-chat-stop-active')).toBe('');
    expect(submitButton.getAttribute('data-deep-chat-stop-thread-id')).toBe('thread-1');
    expect(submitButton.getAttribute('aria-label')).toBe('停止生成');

    submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(container.querySelector('#deep-chat-thread-list')?.textContent).not.toContain('生成中');
    expectStoredAssistantMessage(mocks.localDataStore.set, '已停止生成。');
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                role: 'ai',
                text: '已停止生成。',
                status: 'stopped',
              }),
            ]),
          }),
        ]),
      }),
      'user-data'
    );
    expect(mocks.toast).toHaveBeenCalledWith('已停止生成', { type: 'warning' });

    unmount();
  });

  it('clears stop-active once the request settles (display replay is not a stop state)', async () => {
    const streamDeferred: { resolve: ((value: string) => void) | null } = {
      resolve: null,
    };
    const { container, onClose, unmount } = await mountAndStartStoppableRequest(
      async (...args: unknown[]) => {
        const callOptions = args[5] as {
          onStreamUpdate?: (update: { delta: string }) => void;
        };
        callOptions.onStreamUpdate?.({ delta: 'Partial ' });
        return new Promise<string>(resolve => {
          streamDeferred.resolve = resolve;
        });
      }
    );

    const getSubmitButton = () =>
      queryRequired<HTMLButtonElement>(
        getChat(container).shadowRoot || document,
        '.input-button.inside-end'
      );

    expect(getSubmitButton().getAttribute('data-deep-chat-stop-active')).toBe('');
    expect(getSubmitButton().getAttribute('aria-label')).toBe('停止生成');

    expect(streamDeferred.resolve).not.toBeNull();
    streamDeferred.resolve?.('Partial answer');
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalled();
      expect(getSubmitButton().hasAttribute('data-deep-chat-stop-active')).toBe(false);
    });
    expect(getSubmitButton().getAttribute('aria-label')).toBe('发送消息');
    expect(getSubmitButton().hasAttribute('data-deep-chat-stop-thread-id')).toBe(false);

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
    const settingsButton = queryRequired<HTMLButtonElement>(container, '#deep-chat-open-settings');

    expect(settingsButton.hidden).toBe(false);
    settingsButton.click();
    expect(mocks.eventBus.emit).toHaveBeenCalledWith('app:settings-open');

    getChat(container).connect?.handler({ text: 'Hello' }, { onResponse, onClose });

    await vi.waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith({
        text: '请求失败：请先在系统设置中配置可用的 LLM 模型。',
      });
      expect(onClose).toHaveBeenCalled();
    });
    expect(mocks.callLLM).not.toHaveBeenCalled();
    expect(queryRequired<HTMLSelectElement>(container, '#deep-chat-model-select').value).toBe('');

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

    await vi.waitFor(() => {
      expectStoredAssistantMessage(mocks.localDataStore.set, '请求失败：上游 API 返回格式异常');
    });

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
    expect(
      onResponse.mock.calls.some(
        ([response]) => (response as { text?: string }).text === '请求失败：模型响应超时(90秒)'
      )
    ).toBe(false);
    await vi.waitFor(() => {
      expectStoredAssistantMessage(mocks.localDataStore.set, '已生成的回复内容');
    });
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

    await vi.waitFor(() => {
      expectStoredAssistantMessage(
        mocks.localDataStore.set,
        '请求失败：模型没有返回任何内容，请稍后重试或检查模型/上下文配置。'
      );
    });

    unmount();
  });
});

function startInlineRename(container: HTMLElement, threadId: string): HTMLInputElement {
  queryRequired<HTMLButtonElement>(container, `[data-thread-menu-id="${threadId}"]`).click();
  queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="rename"]').click();
  return queryRequired<HTMLInputElement>(container, `[data-thread-edit-id="${threadId}"]`);
}

describe('deep-chat playground inline rename commits', () => {
  it('enters inline edit mode with the current title preselected', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount } = await importDeepChat();
    await mount(container);

    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-id="thread-1"]').click();
    queryRequired<HTMLButtonElement>(container, '[data-thread-menu-action="rename"]').click();

    const input = queryRequired<HTMLInputElement>(container, '[data-thread-edit-id="thread-1"]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input.value).toBe('Existing thread');
    expect(input.getAttribute('maxlength')).toBe('120');

    unmount();
  });

  it('commits the new name on Enter and persists it', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);

    const input = startInlineRename(container, 'thread-2');
    input.value = 'Renamed thread';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Renamed thread'
    );
    expect(mocks.localDataStore.set).toHaveBeenCalledWith(
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

    unmount();
  });

  it('commits the new name on blur', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);

    const input = startInlineRename(container, 'thread-2');
    input.value = 'Blurred name';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await vi.runAllTimersAsync();

    expectPersistedThread(mocks, {
      id: 'thread-2',
      title: 'Blurred name',
      customTitle: 'Blurred name',
    });

    unmount();
  });
});

describe('deep-chat playground inline rename validation', () => {
  it('cancels the rename on Escape without persisting', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);

    const input = startInlineRename(container, 'thread-2');
    input.value = 'Abandoned name';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(mocks.localDataStore.set).not.toHaveBeenCalledWith(
      'user:playground_deep_chat_threads_v1',
      expect.objectContaining({
        threads: expect.arrayContaining([
          expect.objectContaining({
            id: 'thread-2',
            customTitle: 'Abandoned name',
          }),
        ]),
      }),
      'user-data'
    );
    expect(container.querySelector('input.deep-chat-thread-name-input')).toBeNull();
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Other thread'
    );

    unmount();
  });

  it('rejects an empty name and keeps the original title', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);

    const input = startInlineRename(container, 'thread-2');
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(mocks.toast).toHaveBeenCalledWith('会话名称不能为空', {
      type: 'warning',
    });
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Other thread'
    );

    unmount();
  });

  it('does not persist when the name is unchanged', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const { mount, unmount, mocks } = await importDeepChat();
    await mount(container);

    const input = startInlineRename(container, 'thread-2');
    const callsBefore = mocks.localDataStore.set.mock.calls.length;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.runAllTimersAsync();

    expect(mocks.localDataStore.set.mock.calls.length).toBe(callsBefore);
    expect(container.querySelector('#deep-chat-thread-list')?.textContent).toContain(
      'Other thread'
    );

    unmount();
  });
});
