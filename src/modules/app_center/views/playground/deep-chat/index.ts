import deepChatBundleUrl from 'deep-chat/dist/deepChat.bundle.js?url';
import '../styles.css';

import { loadTemplate } from '@/common/utils/viewLoader';
import { safeMount } from '@/common/utils/safeMount';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { setSafeHtml } from '@/common/utils/security';
import { showToast } from '@/common/ui/notifications';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { LocalDataStore } from '@/services/localDataStore';
import { appStore } from '@/stores/useAppStore';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import type { LLMProviderConfig, PromptHistoryItem } from '@/types/state';
import {
  buildStoredThreadMessages,
  getDeepChatMessageText,
  mergeThreadHistoryWithRequest,
  normalizeStoredThreadMessages,
  type DeepChatMessage,
  type DeepChatMessageStatus,
  type DeepChatRole,
} from './conversationContext';
import {
  abortPendingPlaygroundRequest,
  appendPendingPlaygroundAssistantText,
  createPendingPlaygroundRequest,
  shouldPreserveStoppedResponse,
  type PendingPlaygroundRequest,
  type PlaygroundPendingAbortReason,
} from './requestLifecycle';
import {
  buildBudgetedPlaygroundMessages,
  DEFAULT_PLAYGROUND_REQUEST_BUDGET,
  getPlaygroundMessageBudgetError,
  getPlaygroundSystemPromptBudgetError,
} from './requestBudget';
import { createDraftPersistController } from './draftPersistence';

const nativeLoggerConsole = globalThis.console;

interface DeepChatRequestBody {
  messages?: DeepChatMessage[];
  text?: string;
}

interface DeepChatSignals {
  onOpen?: () => void;
  onResponse?: (response: { text?: string; error?: string }) => void | Promise<void>;
  onClose?: () => void;
  stopClicked?: {
    listener: () => void;
  };
}

interface DeepChatElement extends HTMLElement {
  history?: DeepChatMessage[];
  defaultInput?: { text?: string; files?: File[] | FileList };
  auxiliaryStyle?: string;
  connect?: {
    stream?: boolean;
    handler: (body: DeepChatRequestBody | DeepChatMessage[], signals: DeepChatSignals) => void;
  };
  stream?: boolean;
  chatStyle?: Record<string, string>;
  inputAreaStyle?: Record<string, string>;
  textInput?: Record<string, unknown>;
  submitButtonStyles?: Record<string, unknown>;
  messageStyles?: Record<string, unknown>;
  introMessage?: { text: string };
  focusInput?: () => void;
  avatars?: boolean;
  names?: boolean;
  displayLoadingBubble?: boolean;
  errorMessages?: Record<string, unknown>;
  submitUserMessage?: (content: { text: string }) => void;
  clearMessages?: (isReset?: boolean) => void;
  getMessages?: () => DeepChatMessage[];
  onRender?: () => void;
  onInput?: (body: { content: { text?: string; files?: File[] }; isUser: boolean }) => void;
}

interface PlaygroundThread {
  id: string;
  title: string;
  messages: DeepChatMessage[];
  draftText?: string;
  createdAt: number;
  updatedAt: number;
}

interface PlaygroundThreadStore {
  activeThreadId: string;
  threads: PlaygroundThread[];
}

interface PlaygroundRequestModelConfig {
  config: LLMProviderConfig | null;
  model: string;
}

interface PlaygroundRequestMessages {
  requestMessages: ChatMessage[];
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

interface PreparedPlaygroundRequest {
  config: LLMProviderConfig;
  model: string;
  activeThread: PlaygroundThread;
  conversationMessages: ChatMessage[];
  messages: ChatMessage[];
  droppedMessageCount: number;
}

interface PlaygroundLLMCallContext {
  messages: ChatMessage[];
  config: LLMProviderConfig;
  model: string;
  signals: DeepChatSignals;
  controller: AbortController;
  pendingRequest: PendingPlaygroundRequest;
}

interface TuningControlRefs {
  systemPromptInput: HTMLTextAreaElement | null;
  temperatureInput: HTMLInputElement | null;
  temperatureValue: HTMLOutputElement | null;
  resetTuningButton: HTMLButtonElement | null;
  tuningPanel: HTMLDetailsElement | null;
}

interface PromptPreviewPointer {
  clientX: number;
  clientY: number;
}

const THREAD_STORAGE_KEY = 'playground_deep_chat_threads_v1';
const MAX_THREAD_COUNT = 30;
const MAX_PROMPT_DRAFT_COUNT = 12;
const DRAFT_PERSIST_DEBOUNCE_MS = 400;
const EMPTY_CHAT_WRAP_HEIGHT = 168;
const MESSAGE_TOOLBAR_CLASS = 'playground-message-toolbar';
const THREAD_RAIL_COLLAPSED_CLASS = 'is-rail-collapsed';
const DEEP_CHAT_SCRIPT_MARKER = 'playground-deep-chat-element';
const DEEP_CHAT_AUXILIARY_STYLE = `
  :host {
    overflow: visible !important;
  }

  #messages {
    padding: 22px 24px 18px;
  }

  :host(.is-empty) #messages {
    display: none !important;
  }

  :host(.is-empty) #chat-view {
    align-content: center !important;
    align-items: center !important;
    grid-template-rows: auto !important;
  }

  .outer-message-container {
    margin-bottom: 26px !important;
  }

  .inner-message-container {
    display: flex !important;
    flex-direction: column !important;
    min-width: 0 !important;
  }

  .deep-chat-outer-container-role-user {
    justify-content: flex-end !important;
  }

  .deep-chat-outer-container-role-user .inner-message-container {
    align-items: flex-end !important;
    max-width: min(78%, 560px) !important;
  }

  .deep-chat-outer-container-role-ai .inner-message-container {
    align-items: flex-start !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .message-bubble {
    box-sizing: border-box !important;
    overflow-wrap: anywhere !important;
  }

  .message-bubble.user-message {
    max-width: 100% !important;
    padding: 10px 14px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: var(--playground-accent-soft, #f8fafc) !important;
    color: #0f172a !important;
    box-shadow: none !important;
  }

  .message-bubble.ai-message {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #1e293b !important;
    box-shadow: none !important;
  }

  .message-bubble.user-message h1,
  .message-bubble.user-message h2,
  .message-bubble.user-message h3,
  .message-bubble.user-message p,
  .message-bubble.user-message ul,
  .message-bubble.user-message ol {
    margin: 0 0 8px !important;
    font-size: 14px !important;
    line-height: 1.55 !important;
  }

  .message-bubble.user-message > :last-child,
  .message-bubble.ai-message > :last-child {
    margin-bottom: 0 !important;
  }

  .message-bubble.ai-message p,
  .message-bubble.ai-message li {
    font-size: 14px !important;
    line-height: 1.75 !important;
  }

  .message-bubble.ai-message h1,
  .message-bubble.ai-message h2,
  .message-bubble.ai-message h3 {
    margin: 18px 0 8px !important;
    color: #0f172a !important;
    font-size: 16px !important;
    line-height: 1.45 !important;
  }

  .message-bubble.ai-message ul,
  .message-bubble.ai-message ol {
    padding-inline-start: 20px !important;
  }

  .message-bubble.ai-message pre,
  .message-bubble.ai-message code {
    max-width: 100% !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }

  .message-bubble.ai-message pre {
    overflow-x: auto !important;
    padding: 12px 14px !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    background: #f8fafc !important;
    color: #334155 !important;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace !important;
    font-size: 12px !important;
    line-height: 1.65 !important;
  }

  .message-bubble.ai-message code {
    border-radius: 4px !important;
    background: #f1f5f9 !important;
    color: #334155 !important;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace !important;
    font-size: 0.92em !important;
    padding: 1px 4px !important;
  }

  .message-bubble.ai-message pre code {
    padding: 0 !important;
    background: transparent !important;
  }

  .input-button.inside-end {
    background: var(--playground-accent, #334155) !important;
    box-shadow: none !important;
  }

  .input-button.inside-end.disabled-button {
    background: #94a3b8 !important;
    opacity: 0.82 !important;
    box-shadow: none !important;
  }

  #submit-icon,
  #submit-icon * {
    color: #ffffff !important;
    fill: #ffffff !important;
    stroke: #ffffff !important;
  }

  .${MESSAGE_TOOLBAR_CLASS} {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 7px;
    color: #8a8f98;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1;
    user-select: none;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="user"] {
    justify-content: flex-end;
    padding-inline-end: 4px;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="ai"] {
    justify-content: flex-start;
    margin-top: 12px;
  }

  .playground-message-time {
    color: #9aa0a6;
    font-variant-numeric: tabular-nums;
  }

  .playground-message-status {
    color: #b45309;
    font-weight: 600;
  }

  .playground-message-tool {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #8a8f98;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
  }

  .playground-message-tool:hover,
  .playground-message-tool:focus-visible {
    background: #f2f3f5;
    color: #4b5563;
    outline: none;
  }

  .playground-message-tool svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #input {
    box-sizing: border-box !important;
    position: relative !important;
    min-height: 0 !important;
    min-width: 0 !important;
    height: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 !important;
    background: transparent !important;
  }

  :host(.is-empty) #input {
    align-items: center !important;
    height: auto !important;
  }

  #text-input-container {
    box-sizing: border-box !important;
    width: min(100%, 768px) !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 58px !important;
    max-height: min(42vh, 420px) !important;
    margin: 0 auto !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 29px !important;
    background: #ffffff !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    overflow-y: auto !important;
  }

  #text-input {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 24px !important;
    padding: 18px 62px 16px 22px !important;
    color: #0f172a !important;
    font-size: 15px !important;
    line-height: 1.45 !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    white-space: pre-wrap !important;
  }

  .input-button-container.inner-button-container {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
  }

  .input-button-container.inner-button-container .input-button {
    pointer-events: auto !important;
  }

  #text-input[contenteditable]:empty:before {
    color: #9a9a9a !important;
  }

  #microphone-button,
  #dropup-button,
  #upload-images-button,
  #upload-gifs-button,
  #upload-audio-button,
  #upload-mixed-files-button,
  #camera-button,
  #file-input,
  #dropup-menu {
    display: none !important;
  }

  .inside-end.input-button,
  .inside-end.submit-button,
  .inside-end.disabled-button,
  .inside-end.loading-button {
    width: 36px !important;
    height: 36px !important;
    inset-inline-end: max(11px, calc((100% - 768px) / 2 + 11px)) !important;
    inset-block-end: 11px !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    background: var(--playground-accent, #334155) !important;
    box-shadow: none !important;
  }

  .inside-end.input-button:hover,
  .inside-end.input-button:focus-visible,
  .inside-end.submit-button:hover,
  .inside-end.submit-button:focus-visible,
  .inside-end.loading-button:hover,
  .inside-end.loading-button:focus-visible,
  .inside-end.disabled-button:hover,
  .inside-end.disabled-button:focus-visible {
    background: var(--playground-accent-hover, #1e293b) !important;
  }

  .inside-end #submit-icon {
    width: 17px !important;
    height: 17px !important;
    filter: brightness(0) invert(1) !important;
  }

  .inside-end #stop-icon {
    position: absolute !important;
    inset: 0 !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 50% !important;
    background: var(--playground-accent, #334155) !important;
    pointer-events: none !important;
  }

  .inside-end #stop-icon::after {
    content: "" !important;
    position: absolute !important;
    inset: 13px !important;
    border-radius: 2px !important;
    background: #ffffff !important;
  }

  @media (max-width: 640px) {
    #messages {
      padding: 18px 16px;
    }

    .deep-chat-outer-container-role-user .inner-message-container {
      max-width: 88% !important;
    }

    #text-input-container {
      width: 100% !important;
      min-height: 56px !important;
      max-height: min(46vh, 340px) !important;
      border-radius: 28px !important;
    }

    #text-input {
      padding: 17px 60px 15px 18px !important;
      font-size: 14px !important;
    }

    .inside-end.input-button,
    .inside-end.submit-button,
    .inside-end.disabled-button,
    .inside-end.loading-button {
      inset-inline-end: 10px !important;
      inset-block-end: 10px !important;
    }
  }
`;

let cleanupCallbacks: Array<() => void> = [];
let currentConfig: LLMProviderConfig | null = null;
let selectedModel = '';
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;
let threadStore: PlaygroundThreadStore = createDefaultThreadStore();
let mountedContainer: HTMLElement | null = null;
const pendingRequests = new Map<string, PendingPlaygroundRequest>();
let messageToolbarObserver: MutationObserver | null = null;
let messageToolbarTimer: number | null = null;
let messageToolbarFrame: number | null = null;
let activePromptPreviewId: string | null = null;
let promptPreviewHideTimer: number | null = null;
let isPromptPreviewHovered = false;
let draftInputResizeObserver: ResizeObserver | null = null;
let draftInputResizeRetryTimer: number | null = null;
let cleanupDraftInputHeightListener: (() => void) | null = null;
const draftPersistController = createDraftPersistController(
  persistThreadStore,
  DRAFT_PERSIST_DEBOUNCE_MS
);
let deepChatElementLoadPromise: Promise<void> | null = null;

const mountInternal = async (container: HTMLElement): Promise<void> => {
  const html = await loadTemplate(
    'src/modules/app_center/views/playground/deep-chat/template.html',
    { disableFadeIn: true }
  );
  const renderer = SafeRenderer.getInstance();

  mountedContainer = container;
  renderer.renderTemplate(container, html);
  threadStore = applyPendingRequestsToThreadStore(await loadThreadStore());
  renderThreadList(container);
  renderPromptDraftList(container);

  await ensureDeepChatElementDefined();
  initDeepChat(container);
  await refreshLLMConfig(container);
  bindControls(container);
};

export const mount = safeMount(mountInternal, { moduleName: 'Deep Chat' });

async function ensureDeepChatElementDefined(): Promise<void> {
  if (customElements.get('deep-chat')) {
    return;
  }

  deepChatElementLoadPromise ||= loadDeepChatElementScript();
  try {
    await deepChatElementLoadPromise;
  } catch (error) {
    deepChatElementLoadPromise = null;
    throw error;
  }
  await customElements.whenDefined('deep-chat');
}

function loadDeepChatElementScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-loader="${DEEP_CHAT_SCRIPT_MARKER}"]`
    );
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Deep Chat 组件加载失败')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.async = true;
    script.src = deepChatBundleUrl;
    script.dataset.loader = DEEP_CHAT_SCRIPT_MARKER;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error('Deep Chat 组件加载失败')), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function unmount(): void {
  if (mountedContainer && document.body.contains(mountedContainer)) {
    saveActiveThreadDraft(mountedContainer);
    draftPersistController.flush();
  }
  cleanupCallbacks.forEach(cleanup => cleanup());
  cleanupCallbacks = [];
  mountedContainer = null;
  currentConfig = null;
  selectedModel = '';
  sessionSystemPrompt = '';
  sessionTemperature = 0.3;
  activePromptPreviewId = null;
  clearPromptPreviewHideTimer();
  isPromptPreviewHovered = false;
  clearDraftInputHeightSync();
  cleanupMessageToolbars();
}

export async function clearPlaygroundThreadStore(): Promise<void> {
  abortAllPendingRequests('cleared');
  pendingRequests.clear();
  draftPersistController.cancel();
  threadStore = createDefaultThreadStore();

  await LocalDataStore.remove(`user:${THREAD_STORAGE_KEY}`);
  StorageService.remove(THREAD_STORAGE_KEY);
  StorageService.remove(`${THREAD_STORAGE_KEY}_migrated_to_indexeddb`);

  const container = getMountedRenderContainer();
  if (!container) {
    return;
  }

  renderThreadList(container);
  replaceChat(container);
  syncPendingStatus(container);
}

async function refreshLLMConfig(container: HTMLElement): Promise<void> {
  const statusEl = container.querySelector<HTMLElement>('#playground-provider-status');
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');

  currentConfig = await StorageService.getLLMConfigWithKey();
  selectedModel = currentConfig?.model || getFirstModel(currentConfig) || '';

  if (!modelSelect) {
    return;
  }

  renderLLMConfigState(statusEl, modelSelect);
}

function renderLLMConfigState(statusEl: HTMLElement | null, modelSelect: HTMLSelectElement): void {
  modelSelect.replaceChildren();

  if (!currentConfig || !currentConfig.apiKey || !selectedModel) {
    if (statusEl) {
      statusEl.textContent = '未配置模型，请先在系统设置中配置 LLM';
    }
    modelSelect.disabled = true;
    modelSelect.appendChild(new Option('未配置模型', ''));
    return;
  }

  const models = normalizeModels(currentConfig);
  const visibleModels = models.length > 0 ? models : [selectedModel];

  visibleModels.forEach(model => {
    modelSelect.appendChild(new Option(model, model));
  });

  modelSelect.value = visibleModels.includes(selectedModel)
    ? selectedModel
    : visibleModels[0] || '';
  selectedModel = modelSelect.value;
  modelSelect.disabled = visibleModels.length <= 1;
  if (statusEl) {
    statusEl.textContent = `${currentConfig.provider} / ${selectedModel}`;
  }
}

function initDeepChat(container: HTMLElement): void {
  const chat = container.querySelector<DeepChatElement>('#playground-chat');
  if (!chat) {
    return;
  }

  const activeThread = getActiveThread();
  configureDeepChatBase(chat, activeThread);
  configureDeepChatStyles(chat);
  configureDeepChatConnection(chat, container);
  chat.onRender?.();
  setupMessageToolbars(chat);
  setConversationActive(
    container,
    activeThread.messages.length > 0 || pendingRequests.has(activeThread.id)
  );
  syncPendingStatus(container);
  setupDraftInputHeightSync(container, chat);
}

function configureDeepChatBase(chat: DeepChatElement, activeThread: PlaygroundThread): void {
  chat.history = getThreadDisplayMessages(activeThread);
  chat.defaultInput = activeThread.draftText ? { text: activeThread.draftText } : undefined;
  chat.onInput = body => {
    updateThreadDraft(activeThread.id, body.content.text || '');
  };
  chat.stream = true;
  chat.auxiliaryStyle = DEEP_CHAT_AUXILIARY_STYLE;
  chat.avatars = false;
  chat.names = false;
  chat.displayLoadingBubble = true;
  chat.errorMessages = {
    displayServiceErrorMessages: true,
  };
}

function configureDeepChatStyles(chat: DeepChatElement): void {
  chat.chatStyle = {
    width: '100%',
    height: '100%',
    overflow: 'visible',
    border: '0',
    borderRadius: '0',
    backgroundColor: 'transparent',
  };
  Object.assign(chat.style, chat.chatStyle);
  chat.inputAreaStyle = {
    backgroundColor: 'transparent',
    borderTop: '0',
    padding: '0',
    alignItems: 'flex-end',
  };
  chat.textInput = {
    placeholder: {
      text: '有问题，尽管问',
      style: { color: '#9a9a9a' },
    },
    styles: {
      container: {
        width: '100%',
        margin: '0',
        borderRadius: '29px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
        minHeight: '58px',
        maxHeight: 'min(42vh, 420px)',
      },
      text: {
        color: '#0f172a',
        fontSize: '15px',
        lineHeight: '1.45',
        padding: '18px 62px 16px 22px',
      },
    },
  };
  chat.submitButtonStyles = {
    submit: {
      container: {
        borderRadius: '999px',
        backgroundColor: 'var(--playground-accent, #334155)',
        width: '34px',
        height: '34px',
      },
    },
  };
  chat.messageStyles = {
    default: {
      shared: {
        outerContainer: {
          width: '100%',
          marginBottom: '26px',
        },
        bubble: {
          fontSize: '14px',
          lineHeight: '1.7',
        },
      },
      user: {
        bubble: {
          backgroundColor: 'var(--playground-accent-soft, #f8fafc)',
          color: '#0f172a',
          border: '0',
          borderRadius: '18px',
          padding: '10px 14px',
        },
      },
      ai: {
        innerContainer: {
          width: '100%',
          maxWidth: '100%',
        },
        bubble: {
          width: '100%',
          maxWidth: '100%',
          backgroundColor: 'transparent',
          color: '#1e293b',
          border: '0',
          borderRadius: '0',
          padding: '0',
        },
      },
    },
  };
}

function configureDeepChatConnection(chat: DeepChatElement, container: HTMLElement): void {
  chat.connect = {
    stream: true,
    handler: (body, signals) => {
      void handlePlaygroundRequest(container, body, signals);
    },
  };
}

function setupDraftInputHeightSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 8
): void {
  clearDraftInputHeightSync();
  const root = chat.shadowRoot;
  const inputContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const input = root?.querySelector<HTMLElement>('#text-input');

  if (!root || !inputContainer || !input) {
    if (attempts > 0) {
      draftInputResizeRetryTimer = window.setTimeout(
        () => setupDraftInputHeightSync(container, chat, attempts - 1),
        50
      );
    }
    return;
  }

  syncDraftInputHeight(container);

  if (typeof ResizeObserver === 'function') {
    draftInputResizeObserver = new ResizeObserver(() => {
      syncDraftInputHeight(container);
    });
    draftInputResizeObserver.observe(inputContainer);
  }

  restoreActiveThreadDraftInput(container);

  const onDraftInput = (): void => {
    saveActiveThreadDraft(container);
    window.requestAnimationFrame(() => syncDraftInputHeight(container));
  };
  root.addEventListener('input', onDraftInput);
  cleanupDraftInputHeightListener = () => root.removeEventListener('input', onDraftInput);
}

function syncDraftInputHeight(container: HTMLElement): void {
  const wrap = container.querySelector<HTMLElement>('.playground-chat-wrap');
  if (!wrap) {
    return;
  }

  const page = container.querySelector<HTMLElement>('.playground-page');
  if (page?.classList.contains('is-chatting')) {
    wrap.style.removeProperty('height');
    return;
  }

  const inputContainer =
    getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input-container');
  const inputHeight = Math.ceil(
    inputContainer?.getBoundingClientRect().height || EMPTY_CHAT_WRAP_HEIGHT
  );
  wrap.style.height = `${Math.max(EMPTY_CHAT_WRAP_HEIGHT, inputHeight)}px`;
}

function getDraftInput(container: HTMLElement): HTMLElement | null {
  return getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input') || null;
}

function getDraftInputText(container: HTMLElement): string {
  return getDraftInput(container)?.textContent || '';
}

function saveActiveThreadDraft(container: HTMLElement): void {
  updateThreadDraft(threadStore.activeThreadId, getDraftInputText(container));
}

function updateThreadDraft(threadId: string, draftText: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread || thread.draftText === draftText) {
    return;
  }

  threadStore = {
    ...threadStore,
    threads: threadStore.threads.map(item =>
      item.id === threadId ? { ...item, draftText, updatedAt: Date.now() } : item
    ),
  };
  draftPersistController.schedule();
}

function restoreActiveThreadDraftInput(container: HTMLElement, attempts = 4): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => restoreActiveThreadDraftInput(container, attempts - 1), 80);
    }
    return;
  }

  const draftText = getActiveThread().draftText || '';
  if (input.textContent !== draftText) {
    input.textContent = draftText;
    input.dispatchEvent(createTextInputEvent(draftText));
    syncDraftInputHeight(container);
  }

  if (attempts > 0) {
    window.setTimeout(() => restoreActiveThreadDraftInput(container, attempts - 1), 80);
  }
}

function clearDraftInputHeightSync(): void {
  draftInputResizeObserver?.disconnect();
  draftInputResizeObserver = null;
  cleanupDraftInputHeightListener?.();
  cleanupDraftInputHeightListener = null;
  if (draftInputResizeRetryTimer !== null) {
    window.clearTimeout(draftInputResizeRetryTimer);
    draftInputResizeRetryTimer = null;
  }
}

function bindControls(container: HTMLElement): void {
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');
  const refreshButton = container.querySelector<HTMLButtonElement>('#playground-refresh-config');
  const clearButton = container.querySelector<HTMLButtonElement>('#playground-clear-chat');
  const railToggleButton = container.querySelector<HTMLButtonElement>('#playground-toggle-rail');
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#playground-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#playground-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>(
    '#playground-temperature-value'
  );
  const resetTuningButton = container.querySelector<HTMLButtonElement>('#playground-reset-tuning');
  const tuningPanel = container.querySelector<HTMLDetailsElement>('.playground-tuning-panel');
  const threadList = container.querySelector<HTMLElement>('#playground-thread-list');
  const promptList = container.querySelector<HTMLElement>('#playground-prompt-list');

  bindModelControls(container, modelSelect, refreshButton, clearButton, railToggleButton);
  bindThreadControls(container, threadList, promptList);
  bindTuningControls({
    systemPromptInput,
    temperatureInput,
    temperatureValue,
    resetTuningButton,
    tuningPanel,
  });
}

function bindModelControls(
  container: HTMLElement,
  modelSelect: HTMLSelectElement | null,
  refreshButton: HTMLButtonElement | null,
  clearButton: HTMLButtonElement | null,
  railToggleButton: HTMLButtonElement | null
): void {
  const onModelChange = (): void => {
    selectedModel = modelSelect?.value || selectedModel;
    updateStatus(container);
  };
  modelSelect?.addEventListener('change', onModelChange);
  cleanupCallbacks.push(() => modelSelect?.removeEventListener('change', onModelChange));

  const onRefresh = async (): Promise<void> => {
    await refreshLLMConfig(container);
    showToast('Deep Chat 模型配置已刷新', { type: 'success' });
  };
  refreshButton?.addEventListener('click', onRefresh);
  cleanupCallbacks.push(() => refreshButton?.removeEventListener('click', onRefresh));

  syncThreadRailState(container);
  const onRailToggle = (): void => {
    toggleThreadRail(container);
  };
  railToggleButton?.addEventListener('click', onRailToggle);
  cleanupCallbacks.push(() => railToggleButton?.removeEventListener('click', onRailToggle));

  const onClear = (): void => {
    createThread(container);
  };
  clearButton?.addEventListener('click', onClear);
  cleanupCallbacks.push(() => clearButton?.removeEventListener('click', onClear));
}

function bindThreadControls(
  container: HTMLElement,
  threadList: HTMLElement | null,
  promptList: HTMLElement | null
): void {
  const onThreadListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-thread-id]');
    const deleteThreadId = deleteButton?.dataset.deleteThreadId;
    if (deleteThreadId) {
      deleteThread(container, deleteThreadId);
      return;
    }

    const switchButton = target?.closest<HTMLButtonElement>('[data-thread-id]');
    const threadId = switchButton?.dataset.threadId;
    if (threadId) {
      switchThread(container, threadId);
    }
  };
  threadList?.addEventListener('click', onThreadListClick);
  cleanupCallbacks.push(() => threadList?.removeEventListener('click', onThreadListClick));

  const onPromptListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-prompt-draft-id]');
    const deletePromptId = deleteButton?.dataset.deletePromptDraftId;
    if (deletePromptId) {
      void deletePromptDraft(container, deletePromptId);
      return;
    }

    const useButton = target?.closest<HTMLButtonElement>('[data-use-prompt-draft-id]');
    const usePromptId = useButton?.dataset.usePromptDraftId;
    if (usePromptId) {
      createThreadFromPromptDraft(container, usePromptId);
      return;
    }

    const promptButton = target?.closest<HTMLButtonElement>('[data-preview-prompt-id]');
    const promptId = promptButton?.dataset.previewPromptId;
    if (promptId) {
      showPromptPreview(container, promptId, promptButton);
    }
  };
  promptList?.addEventListener('click', onPromptListClick);
  cleanupCallbacks.push(() => promptList?.removeEventListener('click', onPromptListClick));
  setupPromptPreview(container, promptList);

  const unsubscribePromptDrafts = appStore.subscribe(() => {
    renderPromptDraftList(container);
  });
  cleanupCallbacks.push(unsubscribePromptDrafts);
}

function bindTuningControls(refs: TuningControlRefs): void {
  const { systemPromptInput, temperatureInput, temperatureValue, resetTuningButton, tuningPanel } =
    refs;

  const onSystemPromptInput = (): void => {
    sessionSystemPrompt = systemPromptInput?.value.trim() || '';
  };
  systemPromptInput?.addEventListener('input', onSystemPromptInput);
  cleanupCallbacks.push(() => systemPromptInput?.removeEventListener('input', onSystemPromptInput));

  const onTemperatureInput = (): void => {
    sessionTemperature = normalizeTemperature(temperatureInput?.value);
    if (temperatureValue) {
      temperatureValue.value = sessionTemperature.toFixed(1);
    }
    updateTemperatureTrack(temperatureInput);
  };
  updateTemperatureTrack(temperatureInput);
  temperatureInput?.addEventListener('input', onTemperatureInput);
  cleanupCallbacks.push(() => temperatureInput?.removeEventListener('input', onTemperatureInput));

  const onResetTuning = (): void => {
    sessionSystemPrompt = '';
    sessionTemperature = 0.3;
    if (systemPromptInput) {
      systemPromptInput.value = '';
    }
    if (temperatureInput) {
      temperatureInput.value = '0.3';
    }
    if (temperatureValue) {
      temperatureValue.value = '0.3';
    }
    updateTemperatureTrack(temperatureInput);
    showToast('Deep Chat 调试参数已重置', { type: 'success' });
  };
  resetTuningButton?.addEventListener('click', onResetTuning);
  cleanupCallbacks.push(() => resetTuningButton?.removeEventListener('click', onResetTuning));

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (!tuningPanel?.open) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && tuningPanel.contains(target)) {
      return;
    }

    tuningPanel.open = false;
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  cleanupCallbacks.push(() => document.removeEventListener('pointerdown', onDocumentPointerDown));
}

function setupPromptPreview(container: HTMLElement, promptList: HTMLElement | null): void {
  const preview = container.querySelector<HTMLElement>('#playground-prompt-preview-popover');
  if (!promptList || !preview) {
    return;
  }
  document.body.appendChild(preview);
  cleanupCallbacks.push(() => preview.remove());

  const onPromptPointerOver = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    const promptButton = target?.closest<HTMLButtonElement>('[data-preview-prompt-id]');
    const promptId = promptButton?.dataset.previewPromptId;
    const relatedTarget = event.relatedTarget as Node | null;
    if (promptButton && relatedTarget && promptButton.contains(relatedTarget)) {
      return;
    }

    if (promptId) {
      showPromptPreview(container, promptId, promptButton, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }
  };

  const onPromptFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement | null;
    const promptButton = target?.closest<HTMLButtonElement>('[data-preview-prompt-id]');
    const promptId = promptButton?.dataset.previewPromptId;
    if (promptId) {
      showPromptPreview(container, promptId, promptButton);
    }
  };

  const onPromptPointerLeave = (): void => {
    schedulePromptPreviewHide(container);
  };

  const onPreviewPointerEnter = (): void => {
    isPromptPreviewHovered = true;
    clearPromptPreviewHideTimer();
  };

  const onPreviewPointerLeave = (): void => {
    isPromptPreviewHovered = false;
    schedulePromptPreviewHide(container);
  };

  promptList.addEventListener('pointerover', onPromptPointerOver);
  promptList.addEventListener('focusin', onPromptFocusIn);
  promptList.addEventListener('pointerleave', onPromptPointerLeave);
  preview.addEventListener('pointerenter', onPreviewPointerEnter);
  preview.addEventListener('pointerleave', onPreviewPointerLeave);
  cleanupCallbacks.push(() => {
    promptList.removeEventListener('pointerover', onPromptPointerOver);
    promptList.removeEventListener('focusin', onPromptFocusIn);
    promptList.removeEventListener('pointerleave', onPromptPointerLeave);
    preview.removeEventListener('pointerenter', onPreviewPointerEnter);
    preview.removeEventListener('pointerleave', onPreviewPointerLeave);
  });
}

function showPromptPreview(
  container: HTMLElement,
  promptId: string,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    hidePromptPreview(container);
    return;
  }

  clearPromptPreviewHideTimer();
  activePromptPreviewId = promptId;
  renderPromptPreview(container, promptDraft, anchor, pointer);
  syncPromptPreviewHighlight(container);
}

function renderPromptPreview(
  container: HTMLElement,
  promptDraft: PromptHistoryItem,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const preview = document.getElementById('playground-prompt-preview-popover');
  const title = preview?.querySelector<HTMLElement>('.playground-prompt-preview-title');
  const body = preview?.querySelector<HTMLElement>('.playground-prompt-preview-body');
  if (!preview || !title || !body) {
    return;
  }

  const typeLabel = `${promptDraft.promptType === 'visual' ? 'Visual' : 'Listing'} Prompt`;
  const previewMeta = formatPromptDraftPreviewMeta(promptDraft);
  setSafeHtml(
    title,
    `
    <span class="playground-prompt-preview-title-main">${escapeHTML(typeLabel)}</span>
    ${previewMeta ? `<span class="playground-prompt-preview-title-meta">${escapeHTML(previewMeta)}</span>` : ''}
  `
  );
  body.textContent = promptDraft.prompt;
  body.scrollTop = 0;
  positionPromptPreview(container, preview, anchor, pointer);
  preview.classList.add('is-visible');
  preview.setAttribute('aria-hidden', 'false');
}

function positionPromptPreview(
  container: HTMLElement,
  preview: HTMLElement,
  anchor?: HTMLElement,
  pointer?: PromptPreviewPointer
): void {
  const promptRail = container.querySelector<HTMLElement>('#playground-prompt-rail');
  const promptRailRect = promptRail?.getBoundingClientRect();
  const anchorRect = anchor?.getBoundingClientRect();
  const viewportPadding = 16;
  const gap = pointer ? 14 : 12;
  const previewWidth = Math.min(480, Math.max(280, window.innerWidth - viewportPadding * 2));
  const previewHeight = Math.min(520, Math.max(260, window.innerHeight - 160));
  const maxLeft = Math.max(viewportPadding, window.innerWidth - previewWidth - viewportPadding);
  const preferredLeft = resolvePromptPreviewLeft({
    pointer,
    anchorRect,
    promptRailRect,
    previewWidth,
    gap,
    viewportPadding,
  });
  const left = Math.round(clampNumber(preferredLeft, viewportPadding, maxLeft));
  const anchoredTop = anchorRect?.top ?? (promptRailRect ? promptRailRect.top + 56 : 118);
  const minTop = 72;
  const maxTop = Math.max(minTop, window.innerHeight - previewHeight - 24);
  const preferredTop = resolvePromptPreviewTop(
    pointer,
    anchoredTop,
    previewHeight,
    gap,
    viewportPadding
  );
  const top = Math.round(clampNumber(preferredTop, minTop, maxTop));
  const anchorY = pointer?.clientY;
  const arrowTop = resolvePromptPreviewArrowTop(anchorY, top, previewHeight);
  const anchorX = pointer?.clientX ?? anchorRect?.left ?? promptRailRect?.left;
  const isLeftOfAnchor = Number.isFinite(anchorX) && left + previewWidth <= Number(anchorX) - 2;

  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
  preview.style.width = `${previewWidth}px`;
  preview.style.maxHeight = `${previewHeight}px`;
  preview.classList.toggle('is-left-of-anchor', isLeftOfAnchor);
  preview.style.setProperty('--playground-prompt-preview-arrow-top', `${arrowTop}px`);
  preview.style.setProperty(
    '--playground-prompt-preview-body-max-height',
    `${Math.max(180, previewHeight - 48)}px`
  );
}

interface PromptPreviewLeftOptions {
  pointer: PromptPreviewPointer | undefined;
  anchorRect: DOMRect | undefined;
  promptRailRect: DOMRect | undefined;
  previewWidth: number;
  gap: number;
  viewportPadding: number;
}

function resolvePromptPreviewLeft({
  pointer,
  anchorRect,
  promptRailRect,
  previewWidth,
  gap,
  viewportPadding,
}: PromptPreviewLeftOptions): number {
  const anchorLeft =
    pointer?.clientX ?? anchorRect?.left ?? promptRailRect?.left ?? viewportPadding;
  const anchorRight =
    pointer?.clientX ?? anchorRect?.right ?? promptRailRect?.right ?? viewportPadding;
  const leftSide = anchorLeft - previewWidth - gap;
  const rightSide = anchorRight + gap;
  const canShowLeft = leftSide >= viewportPadding;
  const canShowRight = rightSide + previewWidth <= window.innerWidth - viewportPadding;

  if (canShowLeft) {
    return leftSide;
  }

  if (canShowRight) {
    return rightSide;
  }

  return leftSide;
}

function resolvePromptPreviewTop(
  pointer: PromptPreviewPointer | undefined,
  anchoredTop: number,
  previewHeight: number,
  gap: number,
  viewportPadding: number
): number {
  if (!pointer) {
    return anchoredTop;
  }

  const pointerTop = pointer.clientY + gap;
  if (pointerTop + previewHeight > window.innerHeight - viewportPadding) {
    return pointer.clientY - previewHeight - gap;
  }

  return pointerTop;
}

function resolvePromptPreviewArrowTop(
  anchorY: number | undefined,
  top: number,
  previewHeight: number
): number {
  if (!Number.isFinite(anchorY)) {
    return 28;
  }

  return Math.round(clampNumber(Number(anchorY) - top - 6, 16, Math.max(16, previewHeight - 24)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function schedulePromptPreviewHide(container: HTMLElement): void {
  clearPromptPreviewHideTimer();
  promptPreviewHideTimer = window.setTimeout(() => {
    if (!isPromptPreviewHovered) {
      hidePromptPreview(container);
    }
  }, 160);
}

function hidePromptPreview(container: HTMLElement): void {
  clearPromptPreviewHideTimer();
  activePromptPreviewId = null;
  syncPromptPreviewHighlight(container);
  const preview = document.getElementById('playground-prompt-preview-popover');
  if (!preview) {
    return;
  }

  preview.classList.remove('is-visible');
  preview.setAttribute('aria-hidden', 'true');
}

function syncPromptPreviewHighlight(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.playground-prompt-item').forEach(item => {
    const promptButton = item.querySelector<HTMLButtonElement>('[data-preview-prompt-id]');
    item.classList.toggle(
      'is-preview-active',
      promptButton?.dataset.previewPromptId === activePromptPreviewId
    );
  });
}

function clearPromptPreviewHideTimer(): void {
  if (promptPreviewHideTimer !== null) {
    window.clearTimeout(promptPreviewHideTimer);
    promptPreviewHideTimer = null;
  }
}

function toggleThreadRail(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.playground-page');
  if (!page) {
    return;
  }

  const shouldCollapse = !page.classList.contains(THREAD_RAIL_COLLAPSED_CLASS);
  page.classList.toggle(THREAD_RAIL_COLLAPSED_CLASS, shouldCollapse);
  syncThreadRailState(container);
}

function syncThreadRailState(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.playground-page');
  const rail = container.querySelector<HTMLElement>('#playground-thread-rail');
  const toggle = container.querySelector<HTMLButtonElement>('#playground-toggle-rail');
  const isCollapsed = page?.classList.contains(THREAD_RAIL_COLLAPSED_CLASS) || false;
  const expandedText = isCollapsed ? '展开历史会话' : '收起历史会话';

  if (rail) {
    rail.setAttribute('aria-hidden', String(isCollapsed));
    (rail as HTMLElement & { inert: boolean }).inert = isCollapsed;
  }

  if (toggle) {
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.setAttribute('aria-label', expandedText);
    toggle.title = expandedText;
  }
}

async function handlePlaygroundRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;
  let pendingThreadId: string | null = null;

  try {
    const preparedRequest = await preparePlaygroundRequest(body, signals);
    if (!preparedRequest) return;

    const { config, model, activeThread, conversationMessages, messages, droppedMessageCount } =
      preparedRequest;

    setConversationActive(container, true);
    signals.onOpen?.();
    requestController = createRequestController();
    pendingThreadId = activeThread.id;

    const pendingRequest = createPendingRequest(
      activeThread.id,
      conversationMessages,
      requestController
    );
    bindStopSignal(signals, pendingRequest);
    pendingRequests.set(activeThread.id, pendingRequest);
    saveThreadMessages(container, conversationMessages, '', { threadId: activeThread.id });
    syncPendingRequestView(activeThread.id);
    notifyContextBudgetApplied(droppedMessageCount);

    const assistantText = await callPlaygroundLLM({
      messages,
      config,
      model,
      signals,
      controller: requestController,
      pendingRequest,
    });
    if (pendingRequest.abortReason || !threadExists(activeThread.id)) {
      return;
    }
    saveThreadMessages(getMountedRenderContainer(), conversationMessages, assistantText, {
      threadId: activeThread.id,
    });
  } catch (error) {
    const pendingRequest = pendingThreadId ? pendingRequests.get(pendingThreadId) : null;
    if (requestController?.signal.aborted) {
      if (pendingRequest?.abortReason === 'stopped') {
        preserveStoppedResponse(pendingThreadId);
      }
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    console.error('[Deep Chat] LLM 调用失败:', error);
    await emitDeepChatResponse(signals, { error: message });
  } finally {
    if (pendingThreadId) {
      pendingRequests.delete(pendingThreadId);
      syncPendingRequestView(pendingThreadId, { replaceChat: true });
    }
    signals.onClose?.();
  }
}

async function preparePlaygroundRequest(
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<PreparedPlaygroundRequest | null> {
  const { config, model } = await getPlaygroundRequestModelConfig();
  if (!config || !config.apiKey || !model) {
    await rejectPlaygroundRequest(signals, '请先在系统设置中配置可用的 LLM 模型。');
    return null;
  }

  const { requestMessages, conversationMessages, messages, droppedMessageCount } =
    createPlaygroundRequestMessages(body);
  if (requestMessages.length === 0) {
    await rejectPlaygroundRequest(signals, '请输入要发送的内容。');
    return null;
  }

  const budgetError = getPlaygroundRequestBudgetError(requestMessages);
  if (budgetError) {
    await rejectPlaygroundRequest(signals, budgetError);
    return null;
  }

  const activeThread = getActiveThread();
  if (pendingRequests.has(activeThread.id)) {
    await rejectPlaygroundRequest(signals, '当前会话仍在生成回复，请等待完成后再发送。');
    return null;
  }

  return {
    config,
    model,
    activeThread,
    conversationMessages,
    messages,
    droppedMessageCount,
  };
}

async function rejectPlaygroundRequest(signals: DeepChatSignals, error: string): Promise<void> {
  await emitDeepChatResponse(signals, { error });
}

async function getPlaygroundRequestModelConfig(): Promise<PlaygroundRequestModelConfig> {
  const config = currentConfig || (await StorageService.getLLMConfigWithKey());
  const model = selectedModel || config?.model || getFirstModel(config);
  return { config, model };
}

function createPlaygroundRequestMessages(
  body: DeepChatRequestBody | DeepChatMessage[]
): PlaygroundRequestMessages {
  const requestMessages = normalizeChatMessages(body);
  const conversationMessages = mergeThreadHistoryWithRequest(
    getActiveThread().messages,
    requestMessages
  );
  const budgetedMessages = buildBudgetedPlaygroundMessages(
    conversationMessages,
    sessionSystemPrompt
  );

  return {
    requestMessages,
    conversationMessages,
    messages: budgetedMessages.messages,
    droppedMessageCount: budgetedMessages.droppedMessageCount,
  };
}

function getPlaygroundRequestBudgetError(requestMessages: ChatMessage[]): string | null {
  return (
    getPlaygroundMessageBudgetError(requestMessages) ||
    getPlaygroundSystemPromptBudgetError(sessionSystemPrompt)
  );
}

function notifyContextBudgetApplied(droppedMessageCount: number): void {
  if (droppedMessageCount <= 0) {
    return;
  }

  showToast(`已自动省略 ${droppedMessageCount} 条较早上下文，以避免超过模型上下文限制。`, {
    type: 'warning',
  });
}

function createRequestController(): AbortController {
  return new AbortController();
}

function bindStopSignal(signals: DeepChatSignals, pendingRequest: PendingPlaygroundRequest): void {
  if (signals.stopClicked) {
    signals.stopClicked.listener = () => abortPendingRequest(pendingRequest.threadId, 'stopped');
  }
}

function abortPendingRequest(threadId: string, reason: PlaygroundPendingAbortReason): boolean {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  abortPendingPlaygroundRequest(pendingRequest, reason);
  return true;
}

function abortAllPendingRequests(reason: PlaygroundPendingAbortReason): void {
  pendingRequests.forEach(pendingRequest => {
    abortPendingPlaygroundRequest(pendingRequest, reason);
  });
}

async function callPlaygroundLLM(context: PlaygroundLLMCallContext): Promise<string> {
  const { messages, config, model, signals, controller, pendingRequest } = context;
  let streamedText = '';
  const finalText = await callLLM(
    messages,
    config.provider,
    config.endpoint,
    config.apiKey,
    model,
    {
      temperature: sessionTemperature,
      maxTokens: DEFAULT_PLAYGROUND_REQUEST_BUDGET.maxOutputTokens,
      retries: 0,
      signal: controller.signal,
      stream: true,
      onStreamUpdate: update => {
        streamedText += update.delta;
        if (update.delta) {
          appendPendingAssistantText(pendingRequest, update.delta);
          void emitDeepChatResponse(signals, { text: update.delta });
        }
      },
    }
  );

  if (!streamedText && finalText) {
    appendPendingAssistantText(pendingRequest, finalText);
    await emitDeepChatResponse(signals, { text: finalText });
  }

  return (finalText || streamedText).trim();
}

function preserveStoppedResponse(threadId: string | null): void {
  if (!threadId) {
    return;
  }

  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  if (!threadExists(threadId)) {
    return;
  }

  if (!shouldPreserveStoppedResponse(pendingRequest)) {
    showToast('已停止生成', { type: 'warning' });
    return;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    pendingRequest.assistantText.trim(),
    {
      threadId,
      assistantCreatedAt: pendingRequest.startedAt,
      assistantStatus: 'stopped',
    }
  );
  showToast('已停止生成，已保留当前回复', { type: 'warning' });
}

function getChat(container: HTMLElement): DeepChatElement | null {
  return container.querySelector<DeepChatElement>('#playground-chat');
}

function setupMessageToolbars(chat: DeepChatElement): void {
  cleanupMessageToolbars();

  const installToolbars = (): void => {
    const root = chat.shadowRoot;
    if (!root) {
      return;
    }

    scheduleRenderMessageToolbars(chat);
    messageToolbarObserver = new MutationObserver(() => scheduleRenderMessageToolbars(chat));
    messageToolbarObserver.observe(root, { childList: true, subtree: true });
  };

  messageToolbarTimer = window.setTimeout(installToolbars, 0);
}

function cleanupMessageToolbars(): void {
  messageToolbarObserver?.disconnect();
  messageToolbarObserver = null;

  if (messageToolbarTimer !== null) {
    window.clearTimeout(messageToolbarTimer);
    messageToolbarTimer = null;
  }

  if (messageToolbarFrame !== null) {
    window.cancelAnimationFrame(messageToolbarFrame);
    messageToolbarFrame = null;
  }
}

function scheduleRenderMessageToolbars(chat: DeepChatElement): void {
  if (messageToolbarFrame !== null) {
    return;
  }

  messageToolbarFrame = window.requestAnimationFrame(() => {
    messageToolbarFrame = null;
    renderMessageToolbars(chat);
  });
}

function renderMessageToolbars(chat: DeepChatElement): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  const messages = Array.from(root.querySelectorAll<HTMLElement>('.outer-message-container'));
  const storedMessages = getThreadDisplayMessages(getActiveThread());
  const usedStoredMessageIndexes = new Set<number>();
  messages.forEach(message => {
    if (message.querySelector(`.${MESSAGE_TOOLBAR_CLASS}`)) {
      return;
    }

    const bubble = message.querySelector<HTMLElement>('.message-bubble');
    const innerContainer = message.querySelector<HTMLElement>('.inner-message-container');
    const role = getMessageRole(message);
    const content = bubble ? getMessageContent(bubble) : '';
    if (!bubble || !innerContainer || !role || !content) {
      return;
    }

    innerContainer.appendChild(
      createMessageToolbar(
        chat,
        bubble,
        role,
        findStoredMessageForToolbar(storedMessages, usedStoredMessageIndexes, role, content)
      )
    );
  });
}

function findStoredMessageForToolbar(
  storedMessages: DeepChatMessage[],
  usedIndexes: Set<number>,
  role: 'user' | 'ai',
  content: string
): DeepChatMessage | undefined {
  const normalizedContent = normalizeToolbarContent(content);
  const exactIndex = storedMessages.findIndex(
    (message, index) =>
      !usedIndexes.has(index) &&
      getToolbarMessageRole(message) === role &&
      normalizeToolbarContent(getMessageText(message)) === normalizedContent
  );
  const index =
    exactIndex >= 0
      ? exactIndex
      : storedMessages.findIndex(
          (message, candidateIndex) =>
            !usedIndexes.has(candidateIndex) && getToolbarMessageRole(message) === role
        );

  if (index < 0) {
    return undefined;
  }

  usedIndexes.add(index);
  return storedMessages[index];
}

function getToolbarMessageRole(message: DeepChatMessage): 'user' | 'ai' {
  return message.role === 'user' ? 'user' : 'ai';
}

function normalizeToolbarContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

function getMessageRole(message: HTMLElement): 'user' | 'ai' | null {
  if (message.classList.contains('deep-chat-outer-container-role-user')) {
    return 'user';
  }

  if (message.classList.contains('deep-chat-outer-container-role-ai')) {
    return 'ai';
  }

  return null;
}

function createMessageToolbar(
  chat: DeepChatElement,
  bubble: HTMLElement,
  role: 'user' | 'ai',
  storedMessage?: DeepChatMessage
): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = MESSAGE_TOOLBAR_CLASS;
  toolbar.dataset.role = role;

  const time = document.createElement('span');
  time.className = 'playground-message-time';
  time.textContent = formatToolbarTime(storedMessage?.createdAt);
  toolbar.appendChild(time);
  if (storedMessage?.status === 'stopped') {
    const status = document.createElement('span');
    status.className = 'playground-message-status';
    status.textContent = '已停止';
    toolbar.appendChild(status);
  }
  toolbar.appendChild(
    createToolbarButton('复制消息', getCopyIcon(), () => copyMessageContent(bubble))
  );

  if (role === 'user') {
    toolbar.appendChild(
      createToolbarButton('编辑消息', getEditIcon(), () => editMessageContent(chat, bubble))
    );
  }

  return toolbar;
}

function createToolbarButton(label: string, icon: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'playground-message-tool';
  button.title = label;
  button.setAttribute('aria-label', label);
  setSafeHtml(button, icon);
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function copyMessageContent(bubble: HTMLElement): void {
  const content = getMessageContent(bubble);
  if (!content) {
    return;
  }

  void writeClipboardText(content)
    .then(() => showToast('消息已复制', { type: 'success' }))
    .catch(() => {
      showToast('复制失败，请手动选择文本复制', { type: 'error' });
    });
}

async function writeClipboardText(content: string): Promise<void> {
  try {
    const clipboard = window.navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(content);
      return;
    }
  } catch {
    // Continue with the selection-based fallback below.
  }

  copyTextWithSelectionFallback(content);
}

function copyTextWithSelectionFallback(content: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : [];

  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (selection) {
    selection.removeAllRanges();
    selectedRanges.forEach(range => selection.addRange(range));
  }

  if (!copied) {
    throw new Error('document.execCommand("copy") returned false');
  }
}

function editMessageContent(chat: DeepChatElement, bubble: HTMLElement): void {
  const content = getMessageContent(bubble);
  const input = chat.shadowRoot?.querySelector<HTMLElement>('#text-input');
  if (!content || !input) {
    return;
  }

  input.textContent = content;
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: content,
    })
  );
  chat.focusInput?.();
  showToast('已放回输入框，可修改后重新发送', { type: 'success' });
}

function getMessageContent(bubble: HTMLElement): string {
  return (bubble.innerText || bubble.textContent || '').trim();
}

function formatToolbarTime(timestamp: number | undefined): string {
  const date = Number.isFinite(timestamp) ? new Date(timestamp as number) : new Date();
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getCopyIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
}

function getEditIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
    </svg>
  `;
}

interface CreateThreadOptions {
  toastMessage?: string | null;
}

function createThread(container: HTMLElement, options: CreateThreadOptions = {}): void {
  saveActiveThreadDraft(container);
  const nextThread = createEmptyThread();
  threadStore = {
    activeThreadId: nextThread.id,
    threads: [nextThread, ...threadStore.threads].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStoreNow();
  renderThreadList(container);
  replaceChat(container);
  if (options.toastMessage !== null) {
    showToast(options.toastMessage || '已创建新的 Deep Chat 会话', { type: 'success' });
  }
}

function createThreadFromPromptDraft(container: HTMLElement, promptId: string): void {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    showToast('未找到可用 Prompt，请回到 Prompt 生成页面重新生成', { type: 'warning' });
    renderPromptDraftList(container);
    return;
  }

  createThread(container, { toastMessage: null });
  window.setTimeout(() => fillPromptDraftInput(container, promptDraft.prompt), 80);
}

async function deletePromptDraft(container: HTMLElement, promptId: string): Promise<void> {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    renderPromptDraftList(container);
    return;
  }

  const confirmed = window.confirm('删除后将移除该 Prompt 生成记录，无法恢复。确定删除吗？');
  if (!confirmed) {
    return;
  }

  let deletedFromSnapshots = false;
  try {
    deletedFromSnapshots = await HistoryService.deletePromptResultAsync(promptId);
  } catch (error) {
    console.error('[DeepChat] 删除历史快照 Prompt 结果失败:', error);
  }

  if (!deletedFromSnapshots) {
    showToast('删除 Prompt 生成记录失败，请稍后重试', { type: 'error' });
    return;
  }

  appStore.getState().removePromptHistory(promptId);
  renderPromptDraftList(container);
  showToast('已删除 Prompt 生成记录', { type: 'success' });
}

function fillPromptDraftInput(container: HTMLElement, prompt: string, attempts = 8): void {
  const chat = getChat(container);
  const input = chat?.shadowRoot?.querySelector<HTMLElement>('#text-input');

  if (!chat || !input) {
    if (attempts > 0) {
      window.setTimeout(() => fillPromptDraftInput(container, prompt, attempts - 1), 50);
      return;
    }
    showToast('已创建新会话，但输入框尚未就绪，请稍后重试', { type: 'warning' });
    return;
  }

  input.textContent = prompt;
  updateThreadDraft(threadStore.activeThreadId, prompt);
  input.dispatchEvent(createTextInputEvent(prompt));
  window.setTimeout(() => {
    const latestInput = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input');
    if (latestInput?.textContent?.includes(prompt)) {
      chat.focusInput?.();
      showToast('已创建新会话并填入 Prompt，确认后可手动发送', { type: 'success' });
      return;
    }

    if (attempts > 0) {
      fillPromptDraftInput(container, prompt, attempts - 1);
      return;
    }

    showToast('已创建新会话，但输入框尚未就绪，请稍后重试', { type: 'warning' });
  }, 80);
}

function createTextInputEvent(prompt: string): Event {
  if (typeof InputEvent === 'function') {
    return new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: prompt,
    });
  }

  return new Event('input', { bubbles: true });
}

function switchThread(container: HTMLElement, threadId: string): void {
  if (threadId === threadStore.activeThreadId) {
    return;
  }

  if (!threadStore.threads.some(thread => thread.id === threadId)) {
    return;
  }

  saveActiveThreadDraft(container);
  threadStore = {
    ...threadStore,
    activeThreadId: threadId,
  };
  persistThreadStoreNow();
  renderThreadList(container);
  replaceChat(container);
}

function deleteThread(container: HTMLElement, threadId: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  const confirmed = window.confirm(
    '删除后仅移除本地 Deep Chat 历史，无法恢复。确定删除这个会话吗？'
  );
  if (!confirmed) {
    return;
  }

  abortPendingRequest(threadId, 'deleted');
  const remainingThreads = threadStore.threads.filter(item => item.id !== threadId);
  const firstRemainingThread = remainingThreads[0];
  const nextStore = firstRemainingThread
    ? {
        activeThreadId:
          threadId === threadStore.activeThreadId
            ? firstRemainingThread.id
            : threadStore.activeThreadId,
        threads: remainingThreads,
      }
    : createDefaultThreadStore();

  const shouldReplaceChat = threadId === threadStore.activeThreadId;
  threadStore = nextStore;
  persistThreadStoreNow();
  renderThreadList(container);
  if (shouldReplaceChat) {
    replaceChat(container);
  }
  showToast(`已删除会话：${thread.title}`, { type: 'success' });
}

function replaceChat(container: HTMLElement): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  if (typeof chat.clearMessages === 'function') {
    chat.clearMessages(true);
  }

  const nextChat = document.createElement('deep-chat') as DeepChatElement;
  nextChat.id = 'playground-chat';
  nextChat.className = 'playground-chat';
  chat.replaceWith(nextChat);
  initDeepChat(container);
}

function renderThreadList(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>('#playground-thread-list');
  if (!list) {
    return;
  }

  const sortedThreads = [...threadStore.threads].sort((a, b) => b.updatedAt - a.updatedAt);
  setSafeHtml(
    list,
    sortedThreads
      .map(thread => {
        const isActive = thread.id === threadStore.activeThreadId;
        const messageCount = thread.messages.length;
        const pendingRequest = pendingRequests.get(thread.id);
        const hasDraft = !!thread.draftText?.trim();
        const meta = pendingRequest
          ? `生成中 · ${formatThreadTime(pendingRequest.updatedAt)}`
          : hasDraft
            ? `草稿 · ${formatThreadTime(thread.updatedAt)}`
            : messageCount > 0
              ? `${messageCount} 条 · ${formatThreadTime(thread.updatedAt)}`
              : `空会话 · ${formatThreadTime(thread.updatedAt)}`;

        return `
      <div class="playground-thread-item${isActive ? ' is-active' : ''}">
        <button class="playground-thread-select" type="button" data-thread-id="${thread.id}">
          <span class="playground-thread-icon">
            <i class="far fa-message"></i>
          </span>
          <span class="playground-thread-copy">
            <span class="playground-thread-name">${escapeHTML(thread.title)}</span>
            <span class="playground-thread-meta">${escapeHTML(meta)}</span>
          </span>
        </button>
        <button class="playground-thread-delete" type="button" data-delete-thread-id="${thread.id}" aria-label="删除会话 ${escapeHTML(thread.title)}" title="删除会话">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
      })
      .join('')
  );
}

function renderPromptDraftList(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>('#playground-prompt-list');
  if (!list) {
    return;
  }

  const prompts = getPromptDrafts();
  if (prompts.length === 0) {
    setSafeHtml(
      list,
      `
      <div class="playground-prompt-empty">
        暂无生成 Prompt
      </div>
    `
    );
    hidePromptPreview(container);
    return;
  }

  setSafeHtml(
    list,
    prompts
      .map(prompt => {
        const typeLabel = prompt.promptType === 'visual' ? 'Visual' : 'Listing';
        const iconClass = prompt.promptType === 'visual' ? 'fas fa-palette' : 'fas fa-pen-nib';
        const meta = formatPromptDraftMeta(prompt);
        const snippet = truncateText(prompt.prompt.replace(/\s+/g, ' ').trim(), 70);
        const previewAriaLabel = `预览 ${typeLabel} Prompt`;
        const useAriaLabel = `创建新会话并填入 ${typeLabel} Prompt`;
        const isPreviewActive = prompt.id === activePromptPreviewId;

        return `
      <div class="playground-prompt-item playground-prompt-item--${typeLabel.toLowerCase()}${isPreviewActive ? ' is-preview-active' : ''}">
        <button class="playground-prompt-draft" type="button" data-preview-prompt-id="${escapeHTML(prompt.id)}" aria-label="${escapeHTML(previewAriaLabel)}" aria-describedby="playground-prompt-preview-popover">
          <span class="playground-prompt-icon">
            <i class="${iconClass}" aria-hidden="true"></i>
          </span>
          <span class="playground-prompt-copy">
            <span class="playground-prompt-row">
              <span class="playground-prompt-badge">${typeLabel}</span>
              <span class="playground-prompt-meta">${escapeHTML(meta)}</span>
            </span>
            <span class="playground-prompt-snippet">${escapeHTML(snippet)}</span>
          </span>
        </button>
        <button class="playground-prompt-use" type="button" data-use-prompt-draft-id="${escapeHTML(prompt.id)}" aria-label="${escapeHTML(useAriaLabel)}" title="使用 Prompt">
          <i class="fas fa-arrow-right-to-bracket" aria-hidden="true"></i>
        </button>
        <button class="playground-prompt-delete" type="button" data-delete-prompt-draft-id="${escapeHTML(prompt.id)}" aria-label="删除 ${typeLabel} Prompt" title="删除 Prompt">
          <i class="fas fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;
      })
      .join('')
  );

  const activePrompt = activePromptPreviewId
    ? prompts.find(prompt => prompt.id === activePromptPreviewId)
    : null;
  if (activePrompt) {
    renderPromptPreview(container, activePrompt);
  } else if (activePromptPreviewId) {
    hidePromptPreview(container);
  }
}

function getPromptDrafts(): PromptHistoryItem[] {
  const history = appStore.getState().promptlab.history || [];

  return history
    .filter(item =>
      Boolean(
        item && item.prompt && (item.promptType === 'listing' || item.promptType === 'visual')
      )
    )
    .sort((a, b) => getPromptDraftTime(b) - getPromptDraftTime(a))
    .slice(0, MAX_PROMPT_DRAFT_COUNT);
}

function getPromptDraftTime(prompt: PromptHistoryItem): number {
  if (Number.isFinite(prompt.timestamp)) {
    return prompt.timestamp;
  }

  const generatedTime = prompt.generatedAt ? new Date(prompt.generatedAt).getTime() : 0;
  return Number.isFinite(generatedTime) ? generatedTime : 0;
}

function formatPromptDraftMeta(prompt: PromptHistoryItem): string {
  const parts = [
    prompt.marketplace,
    prompt.asins && prompt.asins.length > 0 ? prompt.asins.slice(0, 2).join(', ') : '',
    formatThreadTime(getPromptDraftTime(prompt)),
  ].filter(Boolean);

  return parts.join(' · ');
}

function formatPromptDraftPreviewMeta(prompt: PromptHistoryItem): string {
  const asins = prompt.asins?.filter(Boolean).join(', ') || '';
  const parts = [prompt.marketplace, asins, formatThreadTime(getPromptDraftTime(prompt))].filter(
    Boolean
  );

  return parts.join(' · ');
}

interface SaveThreadMessagesOptions {
  threadId?: string;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
}

function saveThreadMessages(
  container: HTMLElement | null,
  conversationMessages: ChatMessage[],
  assistantText: string,
  options: SaveThreadMessagesOptions = {}
): void {
  const activeThread = getThreadForSave(options.threadId);
  if (!activeThread) {
    return;
  }

  const now = Date.now();
  const storedMessages = buildStoredThreadMessages(
    activeThread.messages,
    conversationMessages,
    assistantText,
    {
      now,
      assistantCreatedAt: options.assistantCreatedAt,
      assistantStatus: options.assistantStatus,
    }
  );

  const nextThread: PlaygroundThread = {
    ...activeThread,
    title: getThreadTitle(storedMessages),
    messages: storedMessages,
    draftText: '',
    updatedAt: now,
  };

  const activeThreadId = threadStore.threads.some(
    thread => thread.id === threadStore.activeThreadId
  )
    ? threadStore.activeThreadId
    : nextThread.id;

  threadStore = {
    activeThreadId,
    threads: [
      nextThread,
      ...threadStore.threads.filter(thread => thread.id !== nextThread.id),
    ].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStoreNow();
  if (container) {
    renderThreadList(container);
    syncPendingStatus(container);
  }
}

async function loadThreadStore(): Promise<PlaygroundThreadStore> {
  const indexedKey = `user:${THREAD_STORAGE_KEY}`;
  const stored =
    (await LocalDataStore.migrateLocalStorageKey<PlaygroundThreadStore>(
      THREAD_STORAGE_KEY,
      indexedKey,
      'user-data'
    )) || (await LocalDataStore.get<PlaygroundThreadStore>(indexedKey, null));
  if (!isValidThreadStore(stored)) {
    return createDefaultThreadStore();
  }

  const threads = stored.threads
    .map(sanitizeThread)
    .filter((thread): thread is PlaygroundThread => thread !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_THREAD_COUNT);

  if (threads.length === 0) {
    return createDefaultThreadStore();
  }

  const activeThreadId = threads.some(thread => thread.id === stored.activeThreadId)
    ? stored.activeThreadId
    : threads[0]?.id || createThreadId();

  return { activeThreadId, threads };
}

function persistThreadStore(): void {
  void LocalDataStore.set(
    `user:${THREAD_STORAGE_KEY}`,
    getPersistableThreadStore(),
    'user-data'
  ).then(saved => {
    if (!saved) {
      showToast('Deep Chat 会话保存失败：空间不足，请导出备份后清理缓存', { type: 'error' });
    }
  });
}

function persistThreadStoreNow(): void {
  draftPersistController.cancel();
  persistThreadStore();
}

function getPersistableThreadStore(): PlaygroundThreadStore {
  const threads = threadStore.threads.filter(isPersistableThread).slice(0, MAX_THREAD_COUNT);
  const activeThreadId = threads.some(thread => thread.id === threadStore.activeThreadId)
    ? threadStore.activeThreadId
    : threads[0]?.id || '';

  return { activeThreadId, threads };
}

function isPersistableThread(thread: PlaygroundThread): boolean {
  return thread.messages.length > 0 || Boolean(thread.draftText?.trim());
}

function createDefaultThreadStore(): PlaygroundThreadStore {
  const thread = createEmptyThread();
  return {
    activeThreadId: thread.id,
    threads: [thread],
  };
}

function createEmptyThread(): PlaygroundThread {
  const now = Date.now();
  return {
    id: createThreadId(),
    title: 'New Thread',
    messages: [],
    draftText: '',
    createdAt: now,
    updatedAt: now,
  };
}

function getActiveThread(): PlaygroundThread {
  const activeThread = threadStore.threads.find(thread => thread.id === threadStore.activeThreadId);

  if (activeThread) {
    return activeThread;
  }

  const fallbackThread = threadStore.threads[0] || createEmptyThread();
  threadStore = {
    activeThreadId: fallbackThread.id,
    threads: threadStore.threads.length > 0 ? threadStore.threads : [fallbackThread],
  };
  persistThreadStoreNow();
  return fallbackThread;
}

function getThreadForSave(threadId?: string): PlaygroundThread | null {
  if (!threadId) {
    return getActiveThread();
  }

  const existingThread = threadStore.threads.find(thread => thread.id === threadId);
  if (existingThread) {
    return existingThread;
  }

  return null;
}

function threadExists(threadId: string): boolean {
  return threadStore.threads.some(thread => thread.id === threadId);
}

function getThreadDisplayMessages(thread: PlaygroundThread): DeepChatMessage[] {
  const pendingRequest = pendingRequests.get(thread.id);
  if (!pendingRequest) {
    return thread.messages;
  }

  return [
    ...thread.messages,
    {
      role: 'ai',
      text: pendingRequest.assistantText.trim() || '正在生成回复...',
      createdAt: pendingRequest.startedAt,
    },
  ];
}

function createPendingRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  controller: AbortController
): PendingPlaygroundRequest {
  return createPendingPlaygroundRequest(threadId, conversationMessages, { controller });
}

function appendPendingAssistantText(pendingRequest: PendingPlaygroundRequest, delta: string): void {
  appendPendingPlaygroundAssistantText(pendingRequest, delta);
  syncPendingRequestView(pendingRequest.threadId);
}

function applyPendingRequestsToThreadStore(store: PlaygroundThreadStore): PlaygroundThreadStore {
  let nextStore = store;

  pendingRequests.forEach(pendingRequest => {
    const existingThread = nextStore.threads.find(thread => thread.id === pendingRequest.threadId);
    const storedMessages = buildStoredThreadMessages(
      existingThread?.messages || [],
      pendingRequest.conversationMessages,
      '',
      { now: pendingRequest.startedAt }
    );
    const nextThread: PlaygroundThread = {
      ...(existingThread || {
        id: pendingRequest.threadId,
        title: 'New Thread',
        messages: [],
        draftText: '',
        createdAt: pendingRequest.startedAt,
        updatedAt: pendingRequest.updatedAt,
      }),
      title: getThreadTitle(storedMessages),
      messages: storedMessages,
      updatedAt: pendingRequest.updatedAt,
    };

    const activeThreadId = nextStore.threads.some(thread => thread.id === nextStore.activeThreadId)
      ? nextStore.activeThreadId
      : nextThread.id;

    nextStore = {
      activeThreadId,
      threads: [
        nextThread,
        ...nextStore.threads.filter(thread => thread.id !== nextThread.id),
      ].slice(0, MAX_THREAD_COUNT),
    };
  });

  return nextStore;
}

function getRenderContainerForThread(threadId: string): HTMLElement | null {
  const container = getMountedRenderContainer();
  if (!container) {
    return null;
  }

  return threadStore.activeThreadId === threadId ? container : null;
}

function getMountedRenderContainer(): HTMLElement | null {
  if (!mountedContainer || !document.body.contains(mountedContainer)) {
    return null;
  }

  return mountedContainer;
}

function syncPendingRequestView(threadId: string, options: { replaceChat?: boolean } = {}): void {
  const container = getRenderContainerForThread(threadId);
  if (!container) {
    return;
  }

  syncPendingStatus(container);
  if (options.replaceChat) {
    replaceChat(container);
  }
}

function syncPendingStatus(container: HTMLElement): void {
  const status = container.querySelector<HTMLElement>('#playground-pending-status');
  const statusText = container.querySelector<HTMLElement>('#playground-pending-status-text');
  if (!status || !statusText) {
    return;
  }

  const pendingRequest = pendingRequests.get(threadStore.activeThreadId);
  if (!pendingRequest) {
    status.hidden = true;
    statusText.textContent = '';
    return;
  }

  statusText.textContent = getPendingStatusText(pendingRequest);
  status.hidden = false;
}

function getPendingStatusText(pendingRequest: PendingPlaygroundRequest): string {
  const charCount = pendingRequest.assistantText.trim().length;
  if (charCount === 0) {
    return '正在生成回复...';
  }

  return `正在生成回复...已收到 ${charCount.toLocaleString('zh-CN')} 字`;
}

async function emitDeepChatResponse(
  signals: DeepChatSignals,
  response: { text?: string; error?: string }
): Promise<void> {
  try {
    await signals.onResponse?.(response);
  } catch (error) {
    nativeLoggerConsole.warn('[Deep Chat] 忽略已卸载会话的响应更新:', error);
  }
}

function sanitizeThread(thread: PlaygroundThread): PlaygroundThread | null {
  if (!thread || typeof thread.id !== 'string') {
    return null;
  }

  const draftText = typeof thread.draftText === 'string' ? thread.draftText : '';
  const createdAt = Number.isFinite(thread.createdAt) ? thread.createdAt : Date.now();
  const updatedAt = Number.isFinite(thread.updatedAt) ? thread.updatedAt : createdAt;
  const messages = Array.isArray(thread.messages)
    ? normalizeStoredThreadMessages(thread.messages, { fallbackCreatedAt: updatedAt })
    : [];

  return {
    id: thread.id,
    title:
      typeof thread.title === 'string' && thread.title.trim()
        ? thread.title.trim()
        : getThreadTitle(messages),
    messages,
    draftText,
    createdAt,
    updatedAt,
  };
}

function isValidThreadStore(value: PlaygroundThreadStore | null): value is PlaygroundThreadStore {
  return Boolean(value && typeof value.activeThreadId === 'string' && Array.isArray(value.threads));
}

function getThreadTitle(messages: DeepChatMessage[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user');
  const title = getMessageText((firstUserMessage || messages[0] || {}) as DeepChatMessage).replace(
    /\s+/g,
    ' '
  );
  return title ? truncateText(title, 42) : 'New Thread';
}

function formatThreadTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createThreadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `thread-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.playground-page')?.classList.toggle('is-chatting', isActive);
  const chat = getChat(container);
  chat?.classList.toggle('is-chatting', isActive);
  chat?.classList.toggle('is-empty', !isActive);
  syncDraftInputHeight(container);
}

function updateTemperatureTrack(input: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  const percent = normalizeTemperature(input.value) * 100;
  input.style.setProperty('--playground-temperature-percent', `${percent}%`);
}

function normalizeChatMessages(body: DeepChatRequestBody | DeepChatMessage[]): ChatMessage[] {
  const rawMessages = Array.isArray(body) ? body : body.messages || [];

  if (rawMessages.length === 0 && !Array.isArray(body) && body.text) {
    return [{ role: 'user', content: body.text }];
  }

  return rawMessages
    .map((message): ChatMessage | null => {
      const content = getMessageText(message);
      if (!content) {
        return null;
      }

      return {
        role: toChatRole(message.role),
        content,
      };
    })
    .filter((message): message is ChatMessage => message !== null);
}

function getMessageText(message: DeepChatMessage): string {
  return getDeepChatMessageText(message);
}

function toChatRole(role: DeepChatRole | undefined): ChatMessage['role'] {
  if (role === 'system') {
    return 'system';
  }

  if (role === 'user') {
    return 'user';
  }

  return 'assistant';
}

function normalizeModels(config: LLMProviderConfig | null): string[] {
  if (!config?.models) {
    return [];
  }

  return config.models
    .map(model => (typeof model === 'string' ? model : model.id))
    .filter((model): model is string => Boolean(model));
}

function getFirstModel(config: LLMProviderConfig | null): string {
  return normalizeModels(config)[0] || '';
}

function normalizeTemperature(value: string | undefined): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0.3;
  }

  return Math.min(1, Math.max(0, Number(numericValue.toFixed(1))));
}

function updateStatus(container: HTMLElement): void {
  const statusEl = container.querySelector<HTMLElement>('#playground-provider-status');
  if (statusEl && currentConfig && selectedModel) {
    statusEl.textContent = `${currentConfig.provider} / ${selectedModel}`;
  }
}
