import BaseModule from '@/common/BaseModule';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';
import { ValidationError } from '@/common/errors/AppError';
import { setSafeHtml } from '@/common/utils/security';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { resolveToolTargetModel } from '@/services/toolStrategyService';
import { getRuntimeDeepChatOptions } from '@/services/runtimeStrategyService';
import { LocalDataStore } from '@/services/localDataStore';
import { appStore } from '@/stores/useAppStore';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import { registerListingCopyArtifact } from '@/modules/app_center/artifactEnvelopeService';
import { applyListingCopyToKeywordHunter } from '@/modules/app_center/keywordHunterListingHandoff';
import {
  saveListingCopy,
  type AppCenterListingCopy,
} from '@/modules/app_center/listingCopyService';
import {
  consumeDeepChatThreadResume,
  consumeListingPromptForDeepChat,
  createListingPromptWorkflowContext,
  type ListingPromptWorkflowContext,
} from '@/modules/app_center/listingWorkflowHandoff';
import {
  buildSystemPromptFromSkillContexts,
  consumeSkillForDeepChat,
  normalizeSkillChipDraftText,
  type SkillDeepChatContext,
} from '@/modules/app_center/skillDeepChatHandoff';
import {
  SKILL_CHIP_CLASS,
  createSkillContextChip,
  serializeChipContainingElement,
  setContentWithInlineSkillChips,
  textContainsSkillChipMarker,
} from './skillContextChip';
import { setWorkspaceContext } from '@/modules/app_center/workspaceContext';
import type { LLMProviderConfig } from '@/types/state';
import { confirmWithModal } from './utils/confirmModal';
import {
  buildStoredThreadMessages,
  mergeThreadHistoryWithRequest,
  normalizeStoredThreadMessages,
} from './conversationContext';
import {
  abortPendingDeepChatRequest,
  appendPendingDeepChatAssistantText,
  createPendingDeepChatRequest,
  isPendingDeepChatDisplayComplete,
  markPendingDeepChatAssistantTextDisplayed,
  markPendingDeepChatRequestSettled,
  shouldPreserveStoppedResponse,
  type PendingDeepChatRequest,
  type DeepChatPendingAbortReason,
} from './requestLifecycle';
import {
  buildBudgetedDeepChatMessages,
  getDeepChatRequestBudgetDefaults,
  getDeepChatMessageBudgetError,
  getDeepChatSystemPromptBudgetError,
  resolveDeepChatRequestBudget,
  type DeepChatRequestBudget,
} from './requestBudget';
import { createDraftPersistController } from './draftPersistence';
import {
  DEEP_CHAT_TEMPLATE_PATH,
  DRAFT_PERSIST_DEBOUNCE_MS,
  EMPTY_CHAT_WRAP_HEIGHT,
  getMaxThreadCount,
  STOPPED_RESPONSE_TEXT,
  THREAD_RAIL_COLLAPSED_CLASS,
  THREAD_STORAGE_KEY,
} from './constants';
import {
  configureDeepChatBase,
  configureDeepChatConnection,
  configureDeepChatStyles,
} from './deepChatConfig';
import { ensureDeepChatElementDefined } from './deepChatElementLoader';
import { cleanupMessageToolbars, setupMessageToolbars } from './messageToolbar';
import { getPromptDrafts } from './promptDrafts';
import { resetPromptPreviewState, setupPromptPreview } from './promptPreview';
import { renderPromptDraftList, renderThreadList, type ThreadMenuState } from './renderers';
import type {
  CreateThreadOptions,
  DeepChatElement,
  DeepChatMessage,
  DeepChatRequestBody,
  DeepChatSignals,
  DeepChatLLMCallContext,
  DeepChatRequestMessages,
  DeepChatRequestModelConfig,
  DeepChatSkillContext,
  DeepChatThread,
  DeepChatThreadStore,
  PreparedDeepChatRequest,
  SaveThreadMessagesOptions,
  TuningControlRefs,
} from './types';
import {
  createTextInputEvent,
  createThreadId,
  escapeHTML,
  getFirstModel,
  getMessageText,
  getThreadTitle,
  normalizeChatMessages,
  normalizeModels,
  normalizeTemperature,
  updateTemperatureTrack,
} from './utils';

const nativeLoggerConsole = globalThis.console;
const PENDING_ASSISTANT_PLACEHOLDER_TEXT = '正在生成回复...';
const PENDING_DISPLAY_INTERVAL_MS = 32;
const PENDING_DISPLAY_CHARS_PER_TICK = 6;
const THREAD_MENU_HEIGHT = 132;
const THREAD_MENU_GAP = 6;
const CHAT_SEARCH_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ChatSearchRefs = {
  modal: HTMLElement;
  input: HTMLInputElement;
  results: HTMLElement;
  openButton: HTMLButtonElement | null;
};

type ChatSearchResult = {
  thread: DeepChatThread;
};

let cleanupCallbacks: Array<() => void> = [];
let currentConfig: LLMProviderConfig | null = null;
let selectedModel = '';
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;
let threadStore: DeepChatThreadStore = createDefaultThreadStore();
let mountedContainer: HTMLElement | null = null;
const pendingRequests = new Map<string, PendingDeepChatRequest>();
const pendingDisplayTimers = new Map<string, number>();
const DEEP_CHAT_SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
let draftInputResizeObserver: ResizeObserver | null = null;
let draftInputResizeRetryTimer: number | null = null;
let draftHeightSyncRaf: number | null = null;
let cleanupDraftInputHeightListener: (() => void) | null = null;
let cleanupSubmitStopButtonListener: (() => void) | null = null;
let submitStopButtonSyncRetryTimer: number | null = null;
let openThreadMenu: ThreadMenuState | null = null;
let editingThreadId: string | null = null;
let editingThreadValue: string = '';
const draftPersistController = createDraftPersistController(
  persistThreadStore,
  DRAFT_PERSIST_DEBOUNCE_MS
);

class DeepChatModule extends BaseModule {
  constructor() {
    super('playground_deep_chat');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) {
      return;
    }
    const mountSignal = this.getAbortSignal();

    const html = await SafeTemplateLoader.getInstance().loadTemplate(DEEP_CHAT_TEMPLATE_PATH);
    if (!this.isCurrentMount(mountSignal)) return;

    const renderer = SafeRenderer.getInstance();

    mountedContainer = container;
    renderer.renderTemplate(container, html);

    const chatHost = container.querySelector<HTMLElement>('#deep-chat-view');
    if (chatHost) {
      // Prevent Deep Chat from injecting its Google-hosted Inter stylesheet under the local-only CSP.
      chatHost.style.fontFamily = DEEP_CHAT_SYSTEM_FONT_STACK;
    }
  }

  protected async init(): Promise<void> {
    const container = this.container;
    if (!container) {
      return;
    }
    const mountSignal = this.getAbortSignal();

    const storedThreadStore = await loadThreadStore();
    if (!this.isCurrentMount(mountSignal)) return;
    threadStore = applyDeepChatThreadResume(applyPendingRequestsToThreadStore(storedThreadStore));
    renderHistoryThreadList(container);
    renderPromptDraftsForActiveThread(container);

    await ensureDeepChatElementDefined();
    if (!this.isCurrentMount(mountSignal)) return;
    initDeepChat(container);
    await refreshLLMConfig(container, () => this.isCurrentMount(mountSignal));
    if (!this.isCurrentMount(mountSignal)) return;
    bindControls(container);
    bindSkillHandoffListeners(container);
    const promptContext = consumeListingPromptForDeepChat();
    if (promptContext) {
      createThreadFromListingPromptContext(container, promptContext);
    } else {
      consumePendingSkillHandoff(container);
    }
    renderSkillContextBar(container);
  }

  protected onUnmount(): void {
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
    resetPromptPreviewState();
    clearDraftInputHeightSync();
    clearSubmitStopButtonSync();
    cleanupMessageToolbars();
    openThreadMenu = null;
    editingThreadId = null;
    editingThreadValue = '';
  }
}

const deepChatModule = new DeepChatModule();

function applyDeepChatThreadResume(store: DeepChatThreadStore): DeepChatThreadStore {
  const threadId = consumeDeepChatThreadResume();
  if (!threadId || !store.threads.some(thread => thread.id === threadId)) return store;
  return { ...store, activeThreadId: threadId };
}

export const mount = (container: HTMLElement): Promise<void> => deepChatModule.mount(container);

export function unmount(): void {
  deepChatModule.unmount();
}

export async function clearDeepChatThreadStore(): Promise<void> {
  abortAllPendingRequests('cleared');
  pendingRequests.clear();
  clearAllPendingDisplayTimers();
  draftPersistController.cancel();
  openThreadMenu = null;
  editingThreadId = null;
  editingThreadValue = '';
  threadStore = createDefaultThreadStore();

  await LocalDataStore.remove(`user:${THREAD_STORAGE_KEY}`);
  StorageService.remove(THREAD_STORAGE_KEY);
  StorageService.remove(`${THREAD_STORAGE_KEY}_migrated_to_indexeddb`);

  const container = getMountedRenderContainer();
  if (!container) {
    return;
  }

  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  refreshChatSearchResultsIfOpen(container);
  replaceChat(container);
  syncPendingStatus(container);
}

async function refreshLLMConfig(
  container: HTMLElement,
  isCurrent: () => boolean = () => true
): Promise<void> {
  const modelSelect = container.querySelector<HTMLSelectElement>('#deep-chat-model-select');

  const config = await StorageService.getLLMConfigWithKey();
  if (!isCurrent()) return;

  currentConfig = config;
  selectedModel =
    resolveToolTargetModel('playground-deep-chat', currentConfig) ||
    getFirstModel(currentConfig) ||
    '';

  if (!modelSelect) {
    return;
  }

  renderLLMConfigState(modelSelect);
}

function renderLLMConfigState(modelSelect: HTMLSelectElement): void {
  modelSelect.replaceChildren();
  const settingsButton =
    modelSelect
      .closest('.deep-chat-main')
      ?.querySelector<HTMLButtonElement>('#deep-chat-open-settings') ??
    modelSelect.ownerDocument.querySelector<HTMLButtonElement>('#deep-chat-open-settings');
  const config = currentConfig;
  const hasUsableConfig = !!config?.apiKey && !!selectedModel;
  if (settingsButton) {
    settingsButton.hidden = hasUsableConfig;
  }

  if (!hasUsableConfig) {
    modelSelect.disabled = true;
    modelSelect.appendChild(new Option('未配置模型', ''));
    return;
  }

  const models = normalizeModels(config);
  const visibleModels = models.length > 0 ? models : [selectedModel];

  visibleModels.forEach(model => {
    modelSelect.appendChild(new Option(model, model));
  });

  modelSelect.value = visibleModels.includes(selectedModel)
    ? selectedModel
    : visibleModels[0] || '';
  selectedModel = modelSelect.value;
  modelSelect.disabled = visibleModels.length <= 1;
}

function initDeepChat(container: HTMLElement): void {
  const chat = container.querySelector<DeepChatElement>('#deep-chat-view');
  if (!chat) {
    return;
  }

  const activeThread = getActiveThread();
  configureDeepChatBase(chat, activeThread, updateThreadDraft, getThreadDisplayMessages);
  // deep-chat 默认用 innerText 抽正文，会在 contenteditable=false 的 Chip 两侧插入换行；
  // 统一走 serialize，避免刷新后换行累积。
  chat.onInput = () => {
    updateThreadDraft(threadStore.activeThreadId, getDraftInputText(container));
  };
  configureDeepChatStyles(chat);
  configureDeepChatConnection(chat, container, handleDeepChatRequest);
  chat.onRender?.();
  setupMessageToolbars(chat, () => getThreadDisplayMessages(getActiveThread()), {
    canSendToKeywordHunter: () => Boolean(getActiveListingPromptContext()),
    sendToKeywordHunter: (content, message) => sendAssistantCopyToKeywordHunter(content, message),
    getSkillContexts: () => getActiveThread().skillContexts || [],
    refillComposerWithText: text => refillComposerWithSkillChips(container, text),
  });
  setConversationActive(
    container,
    activeThread.messages.length > 0 || pendingRequests.has(activeThread.id)
  );
  syncPendingStatus(container);
  setupDraftInputHeightSync(container, chat);
  setupSubmitStopButtonSync(container, chat);
  schedulePendingAssistantDisplay(activeThread.id);
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
  bindInlineSkillChipControls(container, root);

  const onDraftInput = (): void => {
    saveActiveThreadDraft(container);
    window.requestAnimationFrame(() => syncDraftInputHeight(container));
  };
  root.addEventListener('input', onDraftInput);
  cleanupDraftInputHeightListener = () => root.removeEventListener('input', onDraftInput);
}

function syncDraftInputHeight(container: HTMLElement, options: { instant?: boolean } = {}): void {
  const apply = (): void => {
    draftHeightSyncRaf = null;
    const wrap = container.querySelector<HTMLElement>('.deep-chat-wrap');
    if (!wrap) {
      return;
    }

    const page = container.querySelector<HTMLElement>('.deep-chat-page');
    if (page?.classList.contains('is-chatting')) {
      wrap.classList.remove('is-draft-height-md', 'is-draft-height-lg', 'is-draft-height-xl');
      return;
    }

    const inputContainer =
      getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input-container');
    const inputHeight = Math.ceil(
      inputContainer?.getBoundingClientRect().height || EMPTY_CHAT_WRAP_HEIGHT
    );
    const draftHeight = Math.max(EMPTY_CHAT_WRAP_HEIGHT, inputHeight);
    const nextMd = draftHeight > EMPTY_CHAT_WRAP_HEIGHT;
    const nextLg = draftHeight > 240;
    const nextXl = draftHeight > 340;
    const changed =
      wrap.classList.contains('is-draft-height-md') !== nextMd ||
      wrap.classList.contains('is-draft-height-lg') !== nextLg ||
      wrap.classList.contains('is-draft-height-xl') !== nextXl;
    if (!changed) {
      return;
    }

    if (options.instant) {
      wrap.classList.add('is-height-instant');
    }
    wrap.classList.toggle('is-draft-height-md', nextMd);
    wrap.classList.toggle('is-draft-height-lg', nextLg);
    wrap.classList.toggle('is-draft-height-xl', nextXl);
    if (options.instant) {
      // 强制应用瞬时高度，再下一帧恢复 transition，避免试用进入时上下晃动
      void wrap.offsetHeight;
      window.requestAnimationFrame(() => {
        wrap.classList.remove('is-height-instant');
      });
    }
  };

  if (options.instant) {
    if (draftHeightSyncRaf !== null) {
      window.cancelAnimationFrame(draftHeightSyncRaf);
      draftHeightSyncRaf = null;
    }
    apply();
    return;
  }

  if (draftHeightSyncRaf !== null) {
    return;
  }
  draftHeightSyncRaf = window.requestAnimationFrame(apply);
}

function getDraftInput(container: HTMLElement): HTMLElement | null {
  return getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input') || null;
}

function getDraftInputText(container: HTMLElement): string {
  const input = getDraftInput(container);
  return input ? serializeDraftInput(input) : '';
}

function saveActiveThreadDraft(container: HTMLElement): void {
  updateThreadDraft(threadStore.activeThreadId, getDraftInputText(container));
}

function updateThreadDraft(threadId: string, draftText: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread || thread.draftText === draftText) {
    return;
  }

  const wasVisibleInHistory = isThreadVisibleInHistory(thread);
  const updatedThread = { ...thread, draftText, updatedAt: Date.now() };
  threadStore = {
    ...threadStore,
    threads: threadStore.threads.map(item => (item.id === threadId ? updatedThread : item)),
  };
  draftPersistController.schedule();
  if (wasVisibleInHistory !== isThreadVisibleInHistory(updatedThread)) {
    renderMountedThreadList();
  }
}

function isDraftInputReady(
  input: HTMLElement,
  draftText: string,
  _contexts: DeepChatSkillContext[]
): boolean {
  return serializeDraftInput(input) === draftText;
}

function restoreActiveThreadDraftInput(container: HTMLElement, attempts = 4): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => restoreActiveThreadDraftInput(container, attempts - 1), 80);
    }
    return;
  }

  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const draftText = normalizeSkillChipDraftText(activeThread.draftText || '', contexts);
  // 修复历史脏数据（Chip 两侧被浏览器/innerText 注入的换行）
  if (draftText !== (activeThread.draftText || '')) {
    updateThreadDraft(activeThread.id, draftText);
  }

  if (!isDraftInputReady(input, draftText, contexts)) {
    setDraftInputWithInlineChips(input, draftText, contexts);
  }
  // 不派发 input：避免 deep-chat 用 innerText 回写脏草稿
  syncDraftInputHeight(container, { instant: true });

  if (attempts > 0) {
    window.setTimeout(() => {
      const latest = getDraftInput(container);
      if (!latest || !isDraftInputReady(latest, draftText, contexts)) {
        restoreActiveThreadDraftInput(container, attempts - 1);
      }
    }, 80);
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
  if (draftHeightSyncRaf !== null) {
    window.cancelAnimationFrame(draftHeightSyncRaf);
    draftHeightSyncRaf = null;
  }
}

function setupSubmitStopButtonSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 10
): void {
  clearSubmitStopButtonSync();
  const onSubmitButtonStopIntent = (event: Event): void => {
    const button = getSubmitButtonFromEventPath(event, chat);
    const threadId =
      button?.getAttribute('data-deep-chat-stop-thread-id') || threadStore.activeThreadId;
    if (!button || !pendingRequests.has(threadId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const replaceChat = event.type !== 'pointerdown';
    if (stopPendingRequest(threadId, { replaceChat }) && !replaceChat) {
      window.setTimeout(() => syncPendingRequestView(threadId, { replaceChat: true }), 0);
    }
  };

  document.addEventListener('pointerdown', onSubmitButtonStopIntent, true);
  document.addEventListener('click', onSubmitButtonStopIntent, true);
  const root = chat.shadowRoot;
  if (root) {
    root.addEventListener('pointerdown', onSubmitButtonStopIntent, true);
    root.addEventListener('click', onSubmitButtonStopIntent, true);
  } else if (attempts > 0) {
    submitStopButtonSyncRetryTimer = window.setTimeout(
      () => setupSubmitStopButtonSync(container, chat, attempts - 1),
      80
    );
  }

  cleanupSubmitStopButtonListener = () => {
    document.removeEventListener('pointerdown', onSubmitButtonStopIntent, true);
    document.removeEventListener('click', onSubmitButtonStopIntent, true);
    root?.removeEventListener('pointerdown', onSubmitButtonStopIntent, true);
    root?.removeEventListener('click', onSubmitButtonStopIntent, true);
  };
  syncSubmitStopButtonState(container);
}

function getSubmitButtonFromEventPath(event: Event, chat: DeepChatElement): Element | null {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (path.length > 0 && !path.includes(chat)) {
    return null;
  }

  const pathButton = path.find(
    (target): target is Element =>
      target instanceof Element &&
      target.classList.contains('input-button') &&
      target.classList.contains('inside-end')
  );
  if (pathButton) {
    return pathButton;
  }

  const coordinateButton = getSubmitButtonFromPointerEvent(event, chat);
  if (coordinateButton) {
    return coordinateButton;
  }

  const target = event.target instanceof Element ? event.target : null;
  return target?.closest('.input-button.inside-end') || null;
}

function getSubmitButtonFromPointerEvent(event: Event, chat: DeepChatElement): Element | null {
  if (!(event instanceof MouseEvent)) {
    return null;
  }

  const button = chat.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
  if (!button) {
    return null;
  }

  const rect = button.getBoundingClientRect();
  const isInsideButton =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  return isInsideButton ? button : null;
}

function clearSubmitStopButtonSync(): void {
  cleanupSubmitStopButtonListener?.();
  cleanupSubmitStopButtonListener = null;
  if (submitStopButtonSyncRetryTimer !== null) {
    window.clearTimeout(submitStopButtonSyncRetryTimer);
    submitStopButtonSyncRetryTimer = null;
  }
}

function syncSubmitStopButtonState(container: HTMLElement): void {
  const isPending = pendingRequests.has(threadStore.activeThreadId);
  syncStopOverlayState(container, isPending);

  const button = getChat(container)?.shadowRoot?.querySelector<HTMLElement>(
    '.input-button.inside-end'
  );
  if (!button) {
    return;
  }

  const label = isPending ? '停止生成' : '发送消息';
  button.toggleAttribute('data-deep-chat-stop-active', isPending);
  if (isPending) {
    button.setAttribute('data-deep-chat-stop-thread-id', threadStore.activeThreadId);
  } else {
    button.removeAttribute('data-deep-chat-stop-thread-id');
  }
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncStopOverlayState(container: HTMLElement, _isPending: boolean): void {
  const stopButton = container.querySelector<HTMLButtonElement>('#deep-chat-stop-generation');
  if (!stopButton) {
    return;
  }

  stopButton.hidden = true;
  stopButton.disabled = true;
  delete stopButton.dataset.threadId;
}

function bindControls(container: HTMLElement): void {
  const modelSelect = container.querySelector<HTMLSelectElement>('#deep-chat-model-select');
  const refreshButton = container.querySelector<HTMLButtonElement>('#deep-chat-refresh-config');
  const clearButton = container.querySelector<HTMLButtonElement>('#deep-chat-clear-chat');
  const railToggleButton = container.querySelector<HTMLButtonElement>('#deep-chat-toggle-rail');
  const stopButton = container.querySelector<HTMLButtonElement>('#deep-chat-stop-generation');
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>(
    '#deep-chat-temperature-value'
  );
  const resetTuningButton = container.querySelector<HTMLButtonElement>('#deep-chat-reset-tuning');
  const tuningPanel = container.querySelector<HTMLDetailsElement>('.deep-chat-tuning-panel');
  const threadList = container.querySelector<HTMLElement>('#deep-chat-thread-list');
  const promptList = container.querySelector<HTMLElement>('#deep-chat-prompt-list');
  const settingsButton = container.querySelector<HTMLButtonElement>('#deep-chat-open-settings');
  const promptlabButton = container.querySelector<HTMLButtonElement>('#deep-chat-open-promptlab');

  bindModelControls({
    container,
    modelSelect,
    refreshButton,
    clearButton,
    railToggleButton,
    settingsButton,
    promptlabButton,
  });
  bindStopOverlayControl(container, stopButton);
  bindThreadControls(container, threadList, promptList);
  bindChatSearchControls(container);
  bindSkillContextBarControls(container);
  bindTuningControls({
    systemPromptInput,
    temperatureInput,
    temperatureValue,
    resetTuningButton,
    tuningPanel,
  });
  applySkillContextsToSession(container);
  hydrateActiveThreadInlineSkillChips(container);
}

function bindStopOverlayControl(
  container: HTMLElement,
  stopButton: HTMLButtonElement | null
): void {
  const onStop = (event: MouseEvent): void => {
    event.preventDefault();
    const threadId = stopButton?.dataset.threadId || threadStore.activeThreadId;
    stopPendingRequest(threadId);
  };

  stopButton?.addEventListener('click', onStop);
  cleanupCallbacks.push(() => stopButton?.removeEventListener('click', onStop));
  syncStopOverlayState(container, pendingRequests.has(threadStore.activeThreadId));
}

interface ModelControlRefs {
  container: HTMLElement;
  modelSelect: HTMLSelectElement | null;
  refreshButton: HTMLButtonElement | null;
  clearButton: HTMLButtonElement | null;
  railToggleButton: HTMLButtonElement | null;
  settingsButton: HTMLButtonElement | null;
  promptlabButton: HTMLButtonElement | null;
}

function bindModelControls(refs: ModelControlRefs): void {
  const {
    clearButton,
    container,
    modelSelect,
    promptlabButton,
    railToggleButton,
    refreshButton,
    settingsButton,
  } = refs;

  const onModelChange = (): void => {
    selectedModel = modelSelect?.value || selectedModel;
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

  const onOpenSettings = (): void => {
    openModelSettings();
  };
  settingsButton?.addEventListener('click', onOpenSettings);
  cleanupCallbacks.push(() => settingsButton?.removeEventListener('click', onOpenSettings));

  const onOpenPromptlab = (): void => {
    void openPromptlab();
  };
  promptlabButton?.addEventListener('click', onOpenPromptlab);
  cleanupCallbacks.push(() => promptlabButton?.removeEventListener('click', onOpenPromptlab));
}

function bindThreadControls(
  container: HTMLElement,
  threadList: HTMLElement | null,
  promptList: HTMLElement | null
): void {
  const onThreadListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const menuActionButton = target?.closest<HTMLButtonElement>('[data-thread-menu-action]');
    const menuAction = menuActionButton?.dataset.threadMenuAction;
    const menuActionThreadId = menuActionButton?.dataset.threadMenuThreadId;
    if (menuAction && menuActionThreadId) {
      handleThreadMenuAction(container, menuActionThreadId, menuAction);
      return;
    }

    const menuButton = target?.closest<HTMLButtonElement>('[data-thread-menu-id]');
    const menuThreadId = menuButton?.dataset.threadMenuId;
    if (menuThreadId && menuButton) {
      toggleThreadMenu(container, menuThreadId, menuButton);
      return;
    }

    const switchButton = target?.closest<HTMLButtonElement>('[data-thread-id]');
    const threadId = switchButton?.dataset.threadId;
    if (threadId) {
      closeThreadMenu(container);
      switchThread(container, threadId);
    }
  };
  threadList?.addEventListener('click', onThreadListClick);
  cleanupCallbacks.push(() => threadList?.removeEventListener('click', onThreadListClick));

  bindThreadEditControls(container, threadList);

  const onDocumentClick = (event: MouseEvent): void => {
    if (!openThreadMenu) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.deep-chat-thread-menu, [data-thread-menu-id]')) {
      return;
    }

    closeThreadMenu(container);
  };
  document.addEventListener('click', onDocumentClick);
  cleanupCallbacks.push(() => document.removeEventListener('click', onDocumentClick));

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && openThreadMenu) {
      closeThreadMenu(container);
    }
  };
  document.addEventListener('keydown', onDocumentKeydown);
  cleanupCallbacks.push(() => document.removeEventListener('keydown', onDocumentKeydown));

  const onPromptListClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-open-promptlab]')) {
      void openPromptlab();
      return;
    }

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
  };
  promptList?.addEventListener('click', onPromptListClick);
  cleanupCallbacks.push(() => promptList?.removeEventListener('click', onPromptListClick));
  setupPromptPreview(container, promptList, cleanup => cleanupCallbacks.push(cleanup));

  const unsubscribePromptDrafts = appStore.subscribe(() => {
    renderPromptDraftsForActiveThread(container);
  });
  cleanupCallbacks.push(unsubscribePromptDrafts);
}

function bindThreadEditControls(container: HTMLElement, threadList: HTMLElement | null): void {
  const onThreadListInput = (event: Event): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input || input.dataset.threadEditId !== editingThreadId) {
      return;
    }
    editingThreadValue = input.value;
  };
  threadList?.addEventListener('input', onThreadListInput);
  cleanupCallbacks.push(() => threadList?.removeEventListener('input', onThreadListInput));

  const onThreadListKeydown = (event: KeyboardEvent): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input) {
      return;
    }
    const editThreadId = input.dataset.threadEditId ?? '';
    if (event.key === 'Enter') {
      event.preventDefault();
      commitThreadRename(container, editThreadId, input.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelThreadRename();
    }
  };
  threadList?.addEventListener('keydown', onThreadListKeydown);
  cleanupCallbacks.push(() => threadList?.removeEventListener('keydown', onThreadListKeydown));

  const onThreadListFocusOut = (event: FocusEvent): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
      '.deep-chat-thread-name-input'
    );
    if (!input || input.dataset.threadEditId !== editingThreadId) {
      return;
    }
    commitThreadRename(container, input.dataset.threadEditId ?? '', input.value);
  };
  threadList?.addEventListener('focusout', onThreadListFocusOut);
  cleanupCallbacks.push(() => threadList?.removeEventListener('focusout', onThreadListFocusOut));
}

function openModelSettings(): void {
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
}

async function openPromptlab(): Promise<void> {
  try {
    const didNavigate = await navigateToRouteId('promptlab');
    if (!didNavigate) {
      showToast('无法打开 Prompt 生成页面，请稍后重试', { type: 'error' });
    }
  } catch (error) {
    console.error('[DeepChat] 打开 Prompt 生成页面失败:', error);
    showToast('无法打开 Prompt 生成页面，请稍后重试', { type: 'error' });
  }
}

function bindChatSearchControls(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  portalChatSearchModal(refs.modal);
  const { modal, input, openButton } = refs;

  const onOpen = (): void => {
    openChatSearchModal(container);
  };
  openButton?.addEventListener('click', onOpen);
  cleanupCallbacks.push(() => openButton?.removeEventListener('click', onOpen));

  const onInput = (): void => {
    renderChatSearchResults(container);
  };
  input.addEventListener('input', onInput);
  cleanupCallbacks.push(() => input.removeEventListener('input', onInput));

  const onModalClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.deep-chat-search-dialog')) {
      closeChatSearchModal(container);
      return;
    }

    if (target.closest('[data-chat-search-close]')) {
      closeChatSearchModal(container);
      return;
    }

    const newChatButton = target.closest('[data-chat-search-new]');
    if (newChatButton) {
      createThread(container);
      closeChatSearchModal(container);
      return;
    }

    const resultButton = target.closest<HTMLButtonElement>('[data-chat-search-thread-id]');
    const threadId = resultButton?.dataset.chatSearchThreadId;
    if (threadId) {
      switchThread(container, threadId);
      closeChatSearchModal(container);
      return;
    }

    if (target.closest('.deep-chat-search-bar')) {
      return;
    }

    closeChatSearchModal(container);
  };
  modal.addEventListener('click', onModalClick);
  cleanupCallbacks.push(() => modal.removeEventListener('click', onModalClick));

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (modal.hidden) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeChatSearchModal(container);
      return;
    }
    if (event.key === 'Tab') {
      keepChatSearchFocus(modal, event);
    }
  };
  document.addEventListener('keydown', onDocumentKeydown);
  cleanupCallbacks.push(() => document.removeEventListener('keydown', onDocumentKeydown));

  renderChatSearchResults(container);
}

function portalChatSearchModal(modal: HTMLElement): void {
  const body = modal.ownerDocument.body;
  if (modal.parentElement === body) {
    return;
  }

  body.append(modal);
  cleanupCallbacks.push(() => modal.remove());
}

function openChatSearchModal(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  saveActiveThreadDraft(container);
  positionChatSearchModal(container, refs.modal);
  refs.input.value = '';
  renderChatSearchResults(container);
  refs.modal.hidden = false;
  refs.modal.classList.add('is-visible');
  refs.modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    if (refs.modal.hidden) {
      return;
    }
    refs.input.focus();
    refs.input.select();
  }, 0);
}

function positionChatSearchModal(container: HTMLElement, modal: HTMLElement): void {
  const main = container.querySelector<HTMLElement>('.deep-chat-main');
  const rect = main?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    modal.style.removeProperty('--deep-chat-search-left');
    modal.style.removeProperty('--deep-chat-search-top');
    return;
  }

  modal.style.setProperty('--deep-chat-search-left', `${rect.left + rect.width / 2}px`);
  modal.style.setProperty('--deep-chat-search-top', `${rect.top + rect.height / 2}px`);
}

function closeChatSearchModal(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs || refs.modal.hidden) {
    return;
  }

  refs.modal.hidden = true;
  refs.modal.classList.remove('is-visible');
  refs.modal.setAttribute('aria-hidden', 'true');
  refs.openButton?.focus();
}

function renderChatSearchResults(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (!refs) {
    return;
  }

  const query = refs.input.value.trim();
  const results = getChatSearchResults(query);
  if (results.length === 0) {
    setSafeHtml(
      refs.results,
      `
      <div class="deep-chat-search-empty">
        未找到匹配会话
      </div>
    `
    );
    return;
  }

  const groupLabel = query ? '搜索结果' : '今天';

  setSafeHtml(
    refs.results,
    `
    <div class="deep-chat-search-group">${escapeHTML(groupLabel)}</div>
    <div class="deep-chat-search-result-list">
      ${results
        .map(({ thread }) => {
          const isActive = thread.id === threadStore.activeThreadId;
          const title = escapeHTML(thread.title);

          return `
        <button
          class="deep-chat-search-result${isActive ? ' is-active' : ''}"
          type="button"
          data-chat-search-thread-id="${escapeHTML(thread.id)}"
          aria-label="打开会话 ${title}"
        >
          <span class="deep-chat-search-result-icon" aria-hidden="true">
            <i class="far fa-message"></i>
          </span>
          <span class="deep-chat-search-result-copy">
            <span class="deep-chat-search-result-title">${title}</span>
          </span>
        </button>
      `;
        })
        .join('')}
    </div>
  `
  );
}

function getChatSearchResults(query: string): ChatSearchResult[] {
  const normalizedQuery = normalizeChatSearchText(query);
  return [...threadStore.threads]
    .filter(isThreadVisibleInHistory)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((thread): ChatSearchResult | null => {
      const matchedText = normalizedQuery
        ? getThreadMatchedSearchText(thread, normalizedQuery)
        : '';
      if (normalizedQuery && !matchedText) {
        return null;
      }

      return {
        thread,
      };
    })
    .filter((result): result is ChatSearchResult => result !== null);
}

function getThreadMatchedSearchText(thread: DeepChatThread, normalizedQuery: string): string {
  const searchableValues = [
    thread.title,
    thread.draftText || '',
    ...thread.messages.map(message => getMessageText(message)),
  ];

  return (
    searchableValues.find(value => normalizeChatSearchText(value).includes(normalizedQuery)) || ''
  );
}

function normalizeChatSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function keepChatSearchFocus(modal: HTMLElement, event: KeyboardEvent): void {
  const focusableElements = Array.from(
    modal.querySelectorAll<HTMLElement>(CHAT_SEARCH_FOCUSABLE_SELECTOR)
  ).filter(element => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
  }
}

function refreshChatSearchResultsIfOpen(container: HTMLElement): void {
  const refs = getChatSearchRefs(container);
  if (refs && !refs.modal.hidden) {
    renderChatSearchResults(container);
  }
}

function getChatSearchRefs(container: HTMLElement): ChatSearchRefs | null {
  const root = container.ownerDocument;
  const modal =
    container.querySelector<HTMLElement>('#deep-chat-search-modal') ||
    root.querySelector<HTMLElement>('#deep-chat-search-modal');
  const input =
    container.querySelector<HTMLInputElement>('#deep-chat-search-input') ||
    root.querySelector<HTMLInputElement>('#deep-chat-search-input');
  const results =
    container.querySelector<HTMLElement>('#deep-chat-search-results') ||
    root.querySelector<HTMLElement>('#deep-chat-search-results');
  if (!modal || !input || !results) {
    return null;
  }

  return {
    modal,
    input,
    results,
    openButton: container.querySelector<HTMLButtonElement>('#deep-chat-search-chats'),
  };
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

function toggleThreadRail(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  if (!page) {
    return;
  }

  const shouldCollapse = !page.classList.contains(THREAD_RAIL_COLLAPSED_CLASS);
  page.classList.toggle(THREAD_RAIL_COLLAPSED_CLASS, shouldCollapse);
  syncThreadRailState(container);
}

function syncThreadRailState(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  const rail = container.querySelector<HTMLElement>('#deep-chat-thread-rail');
  const toggle = container.querySelector<HTMLButtonElement>('#deep-chat-toggle-rail');
  const isCollapsed = page?.classList.contains(THREAD_RAIL_COLLAPSED_CLASS) || false;
  const expandedText = isCollapsed ? '展开最近会话' : '收起最近会话';

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

async function handleDeepChatRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;
  let pendingThreadId: string | null = null;
  let lifecyclePendingRequest: PendingDeepChatRequest | null = null;

  try {
    const preparedRequest = await prepareDeepChatRequest(body, signals);
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
    lifecyclePendingRequest = pendingRequest;
    bindStopSignal(signals, pendingRequest);
    pendingRequests.set(activeThread.id, pendingRequest);
    saveThreadMessages(container, conversationMessages, '', {
      threadId: activeThread.id,
    });
    syncPendingRequestView(activeThread.id);
    notifyContextBudgetApplied(droppedMessageCount);

    const assistantText = await callDeepChatLLM({
      messages,
      config,
      model,
      signals,
      sourceChat: getChat(container),
      controller: requestController,
      pendingRequest,
    });
    if (pendingRequest.abortReason || !threadExists(activeThread.id)) {
      return;
    }
    saveThreadMessages(getMountedRenderContainer(), conversationMessages, assistantText, {
      threadId: activeThread.id,
    });
    markPendingDeepChatRequestSettled(pendingRequest);
    schedulePendingAssistantDisplay(activeThread.id);
  } catch (error) {
    if (requestController?.signal.aborted) {
      return;
    }
    if (preserveTimedOutPartialResponse(pendingThreadId, error)) {
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    const responseText = formatDeepChatErrorResponse(message);
    console.error('[Deep Chat] LLM 调用失败:', error);
    saveFailedDeepChatResponse(pendingThreadId, responseText);
    await emitDeepChatResponse(signals, { text: responseText });
  } finally {
    cleanupLifecyclePendingRequest(pendingThreadId, lifecyclePendingRequest);
    signals.onClose?.();
  }
}

function cleanupLifecyclePendingRequest(
  threadId: string | null,
  lifecyclePendingRequest: PendingDeepChatRequest | null
): void {
  if (!threadId || !lifecyclePendingRequest) {
    return;
  }

  const pendingRequest = pendingRequests.get(threadId);
  if (pendingRequest !== lifecyclePendingRequest) {
    return;
  }

  if (pendingRequest.abortReason === 'stopped') {
    preserveStoppedResponse(threadId);
  }
  if (pendingRequest.isSettled && !isPendingDeepChatDisplayComplete(pendingRequest)) {
    renderMountedThreadList();
    syncPendingRequestView(threadId);
    schedulePendingAssistantDisplay(threadId);
    return;
  }

  clearPendingDisplayTimer(threadId);
  pendingRequests.delete(threadId);
  renderMountedThreadList();
  syncPendingRequestView(threadId, { replaceChat: true });
}

async function prepareDeepChatRequest(
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<PreparedDeepChatRequest | null> {
  const { config, model } = await getDeepChatRequestModelConfig();
  if (!config || !config.apiKey || !model) {
    await rejectDeepChatRequest(signals, '请先在系统设置中配置可用的 LLM 模型。');
    return null;
  }

  const requestBudget = resolveDeepChatRequestBudget(config, model);
  const { requestMessages, conversationMessages, messages, droppedMessageCount } =
    createDeepChatRequestMessages(body, requestBudget);
  if (requestMessages.length === 0) {
    await rejectDeepChatRequest(signals, '请输入要发送的内容。');
    return null;
  }

  const budgetError = getDeepChatRequestBudgetError(requestMessages, requestBudget);
  if (budgetError) {
    await rejectDeepChatRequest(signals, budgetError);
    return null;
  }

  const activeThread = getActiveThread();
  if (pendingRequests.has(activeThread.id)) {
    await rejectDeepChatRequest(signals, '当前会话仍在生成回复，请等待完成后再发送。');
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

async function rejectDeepChatRequest(signals: DeepChatSignals, error: string): Promise<void> {
  await emitDeepChatResponse(signals, {
    text: formatDeepChatErrorResponse(error),
  });
}

function formatDeepChatErrorResponse(error: string): string {
  return `请求失败：${error}`;
}

function preserveTimedOutPartialResponse(threadId: string | null, error: unknown): boolean {
  if (!isLLMTimeoutError(error) || !threadId || !threadExists(threadId)) {
    return false;
  }

  const pendingRequest = pendingRequests.get(threadId);
  const partialResponse = pendingRequest?.assistantText.trim();
  if (!pendingRequest || !partialResponse) {
    return false;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    partialResponse,
    {
      threadId,
      assistantCreatedAt: pendingRequest.startedAt,
    }
  );
  markPendingDeepChatRequestSettled(pendingRequest);
  schedulePendingAssistantDisplay(threadId);
  showToast('模型响应超时，已保留已生成内容', { type: 'warning' });
  return true;
}

function isLLMTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    (error as Error & { code?: string }).code === 'LLM_TIMEOUT' ||
    error.message.includes('模型响应超时')
  );
}

function saveFailedDeepChatResponse(threadId: string | null, responseText: string): void {
  if (!threadId || !threadExists(threadId)) {
    return;
  }

  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  const partialResponse = pendingRequest.assistantText.trim();
  const assistantText = partialResponse ? `${partialResponse}\n\n${responseText}` : responseText;
  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    assistantText,
    {
      threadId,
    }
  );
}

async function getDeepChatRequestModelConfig(): Promise<DeepChatRequestModelConfig> {
  const config = currentConfig || (await StorageService.getLLMConfigWithKey());
  const model = selectedModel || config?.model || getFirstModel(config);
  return { config, model };
}

function createDeepChatRequestMessages(
  body: DeepChatRequestBody | DeepChatMessage[],
  budget: DeepChatRequestBudget
): DeepChatRequestMessages {
  const requestMessages = normalizeChatMessages(body);
  const conversationMessages = mergeThreadHistoryWithRequest(
    getActiveThread().messages,
    requestMessages
  );
  const budgetedMessages = buildBudgetedDeepChatMessages(
    conversationMessages,
    sessionSystemPrompt,
    budget
  );

  return {
    requestMessages,
    conversationMessages,
    messages: budgetedMessages.messages,
    droppedMessageCount: budgetedMessages.droppedMessageCount,
  };
}

function getDeepChatRequestBudgetError(
  requestMessages: ChatMessage[],
  budget: DeepChatRequestBudget
): string | null {
  return (
    getDeepChatMessageBudgetError(requestMessages, budget) ||
    getDeepChatSystemPromptBudgetError(sessionSystemPrompt, budget)
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

function bindStopSignal(signals: DeepChatSignals, pendingRequest: PendingDeepChatRequest): void {
  if (signals.stopClicked) {
    signals.stopClicked.listener = () => stopPendingRequest(pendingRequest.threadId);
  }
}

function abortPendingRequest(threadId: string, reason: DeepChatPendingAbortReason): boolean {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  abortPendingDeepChatRequest(pendingRequest, reason);
  clearPendingDisplayTimer(threadId);
  return true;
}

function stopPendingRequest(threadId: string, options: { replaceChat?: boolean } = {}): boolean {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  if (pendingRequest.isSettled) {
    markPendingDeepChatAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
    renderPendingAssistantDisplayIfActive(threadId, pendingRequest);
    completeSettledPendingDisplay(threadId, pendingRequest);
    return true;
  }

  abortPendingDeepChatRequest(pendingRequest, 'stopped');
  clearPendingDisplayTimer(threadId);
  preserveStoppedResponse(threadId);
  pendingRequests.delete(threadId);
  renderMountedThreadList();
  syncPendingRequestView(threadId, {
    replaceChat: options.replaceChat ?? true,
  });
  return true;
}

function abortAllPendingRequests(reason: DeepChatPendingAbortReason): void {
  pendingRequests.forEach(pendingRequest => {
    abortPendingDeepChatRequest(pendingRequest, reason);
  });
}

async function callDeepChatLLM(context: DeepChatLLMCallContext): Promise<string> {
  const { messages, config, model, signals, sourceChat, controller, pendingRequest } = context;
  let streamedText = '';
  const finalText = await callLLM(
    messages,
    config.provider,
    config.endpoint,
    config.apiKey,
    model,
    {
      temperature: sessionTemperature,
      maxTokens: getDeepChatRequestBudgetDefaults().maxOutputTokens,
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
      retries: 0,
      ...getRuntimeDeepChatOptions(),
      signal: controller.signal,
      stream: true,
      onStreamUpdate: update => {
        if (pendingRequest.abortReason) {
          return;
        }
        streamedText += update.delta;
        if (update.delta) {
          appendPendingAssistantText(pendingRequest, update.delta);
          void emitPendingAssistantDelta(signals, pendingRequest, sourceChat, update.delta);
        }
      },
    }
  );

  if (pendingRequest.abortReason) {
    return pendingRequest.assistantText.trim();
  }

  if (!streamedText && finalText) {
    appendPendingAssistantText(pendingRequest, finalText);
    await emitPendingAssistantDelta(signals, pendingRequest, sourceChat, finalText);
  }

  const assistantText = (finalText || streamedText).trim();
  if (!assistantText) {
    throw new ValidationError(
      '模型没有返回任何内容，请稍后重试或检查模型/上下文配置。',
      'DEEP_CHAT_001',
      'assistantText',
      assistantText,
      { module: 'deep-chat', action: 'resolveAssistantText' }
    );
  }

  return assistantText;
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
    saveThreadMessages(
      getMountedRenderContainer(),
      pendingRequest.conversationMessages,
      STOPPED_RESPONSE_TEXT,
      {
        threadId,
        assistantCreatedAt: pendingRequest.startedAt,
        assistantStatus: 'stopped',
      }
    );
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
  return container.querySelector<DeepChatElement>('#deep-chat-view');
}

function createThread(container: HTMLElement, options: CreateThreadOptions = {}): void {
  saveActiveThreadDraft(container);
  const nextThread: DeepChatThread = {
    ...createEmptyThread(),
    ...(options.promptDraftId ? { promptDraftId: options.promptDraftId } : {}),
    ...(options.listingPromptContext
      ? {
          listingPromptContext: cloneListingPromptContext(options.listingPromptContext),
        }
      : {}),
    ...(options.skillContexts && options.skillContexts.length > 0
      ? { skillContexts: cloneSkillContexts(options.skillContexts) }
      : {}),
    ...(options.draftText ? { draftText: options.draftText } : {}),
  };
  threadStore = {
    activeThreadId: nextThread.id,
    threads: [nextThread, ...threadStore.threads].slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  refreshChatSearchResultsIfOpen(container);
  replaceChat(container);
  applySkillContextsToSession(container);
  hydrateActiveThreadInlineSkillChips(container);
  if (options.toastMessage !== null) {
    showToast(options.toastMessage || '已创建新的 Deep Chat 会话', {
      type: 'success',
    });
  }
}

function createThreadFromPromptDraft(container: HTMLElement, promptId: string): void {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    showToast('未找到可用 Prompt，请回到 Prompt 生成页面重新生成', {
      type: 'warning',
    });
    renderPromptDraftsForActiveThread(container);
    return;
  }

  const listingPromptContext =
    promptDraft.promptType === 'listing'
      ? createListingPromptWorkflowContext(promptDraft)
      : undefined;
  createThread(container, {
    toastMessage: null,
    promptDraftId: promptId,
    listingPromptContext,
    draftText: promptDraft.prompt,
  });
  window.setTimeout(() => fillPromptDraftInput(container, promptDraft.prompt), 80);
}

function createThreadFromListingPromptContext(
  container: HTMLElement,
  promptContext: ListingPromptWorkflowContext
): void {
  createThread(container, {
    toastMessage: null,
    promptDraftId: promptContext.promptId,
    listingPromptContext: promptContext,
    draftText: promptContext.prompt,
  });
  window.setTimeout(() => fillPromptDraftInput(container, promptContext.prompt), 80);
}

/**
 * 消费 Skills→Deep Chat 试用 handoff（可被 init / 路由重入 / handoff 事件调用）。
 * @returns 是否成功创建了技能会话
 */
export function consumePendingSkillHandoff(container: HTMLElement): boolean {
  const skillContext = consumeSkillForDeepChat();
  if (!skillContext) {
    return false;
  }
  createThreadFromSkillContext(container, skillContext);
  return true;
}

function bindSkillHandoffListeners(container: HTMLElement): void {
  const tryConsume = (): void => {
    if (!mountedContainer || mountedContainer !== container) {
      return;
    }
    if (!document.body.contains(container)) {
      return;
    }
    consumePendingSkillHandoff(container);
  };

  const onRouteChanged = (event: Event): void => {
    const detail = (event as CustomEvent<{ routeId?: string }>).detail;
    if (detail?.routeId !== 'playground_deep_chat') {
      return;
    }
    tryConsume();
  };

  const unsubHandoff = eventBus.on(APP_EVENTS.SKILL_DEEP_CHAT_HANDOFF, tryConsume);
  window.addEventListener(APP_EVENTS.ROUTE_CHANGED, onRouteChanged);
  cleanupCallbacks.push(() => {
    unsubHandoff();
    window.removeEventListener(APP_EVENTS.ROUTE_CHANGED, onRouteChanged);
  });
}

/** Skills 页试用：skill 全文 → 系统提示词；Context Bar 展示挂载；输入框仅业务草稿 */
function createThreadFromSkillContext(
  container: HTMLElement,
  skillContext: SkillDeepChatContext
): void {
  const skillChip: DeepChatSkillContext = {
    skillId: skillContext.skillId,
    skillTitle: skillContext.skillTitle,
    skillRaw: skillContext.skillRaw,
  };

  createThread(container, {
    toastMessage: `已附加技能「${skillContext.skillTitle}」`,
    draftText: skillContext.userDraft,
    skillContexts: [skillChip],
  });

  window.setTimeout(() => fillPromptDraftInput(container, skillContext.userDraft), 80);
  renderSkillContextBar(container);
}

function cloneSkillContexts(contexts: DeepChatSkillContext[]): DeepChatSkillContext[] {
  return contexts.map(context => ({
    skillId: context.skillId,
    skillTitle: context.skillTitle,
    skillRaw: context.skillRaw,
  }));
}

function applySkillContextsToSession(container: HTMLElement): void {
  const contexts = getActiveThread().skillContexts || [];
  const systemPrompt = buildSystemPromptFromSkillContexts(contexts);
  sessionSystemPrompt = systemPrompt;
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  if (systemPromptInput) {
    systemPromptInput.value = systemPrompt;
  }
  renderSkillContextBar(container);
}

/** 会话级 Context Bar：已挂载技能的唯一可移除入口（不依赖输入框） */
function renderSkillContextBar(container: HTMLElement): void {
  const bar = container.querySelector<HTMLElement>('#deep-chat-skill-context-bar');
  const chips = container.querySelector<HTMLElement>('#deep-chat-skill-context-chips');
  if (!bar || !chips) {
    return;
  }

  const contexts = getActiveThread().skillContexts || [];
  chips.replaceChildren();
  if (contexts.length === 0) {
    bar.hidden = true;
    return;
  }

  bar.hidden = false;
  for (const context of contexts) {
    chips.appendChild(createSkillContextChip(context, 'dismissible'));
  }
}

function bindSkillContextBarControls(container: HTMLElement): void {
  const chips = container.querySelector<HTMLElement>('#deep-chat-skill-context-chips');
  if (!chips) {
    return;
  }

  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const dismissBtn = target?.closest<HTMLElement>('[data-action="dismiss-skill-context"]');
    if (!dismissBtn?.dataset.skillId || !chips.contains(dismissBtn)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dismissSessionSkillContext(container, dismissBtn.dataset.skillId);
  };

  chips.addEventListener('click', onClick);
  cleanupCallbacks.push(() => chips.removeEventListener('click', onClick));
}

/** 从会话移除技能挂载（Context Bar），并同步系统提示词 */
function dismissSessionSkillContext(container: HTMLElement, skillId: string): void {
  const activeThread = getActiveThread();
  const nextContexts = (activeThread.skillContexts || []).filter(
    context => context.skillId !== skillId
  );

  updateActiveThreadFields(container, {
    skillContexts: nextContexts.length > 0 ? nextContexts : undefined,
  });
  applySkillContextsToSession(container);
  showToast('已移除技能上下文', { type: 'success' });
}

/** 将 contenteditable 中的 Chip 与文本序列化为纯文本（Chip → 「技能名」） */
function serializeDraftInput(input: HTMLElement): string {
  return serializeChipContainingElement(input, getActiveThread().skillContexts || []);
}

/**
 * 写入草稿：仅当正文含「技能名」标记时水合为可移除 Chip（编辑历史消息用）。
 * 会话级技能挂载不写入输入框。
 */
function setDraftInputWithInlineChips(
  input: HTMLElement,
  plainText: string,
  contexts: DeepChatSkillContext[]
): void {
  const normalized = normalizeSkillChipDraftText(plainText, contexts);
  if (contexts.length > 0 && textContainsSkillChipMarker(normalized, contexts)) {
    setContentWithInlineSkillChips(input, normalized, contexts, 'dismissible');
    return;
  }
  input.textContent = normalized;
}

/** 编辑消息回填：若正文含技能名标记则保持 Chip，否则纯文本 */
function refillComposerWithSkillChips(container: HTMLElement, plainText: string): void {
  const input = getDraftInput(container);
  if (!input) {
    return;
  }
  const contexts = getActiveThread().skillContexts || [];
  const normalized = normalizeSkillChipDraftText(plainText, contexts);
  setDraftInputWithInlineChips(input, normalized, contexts);
  updateThreadDraft(threadStore.activeThreadId, normalized);
  syncDraftInputHeight(container, { instant: true });
  getChat(container)?.focusInput?.();
}

/** 恢复草稿文本；不因 skillContexts 强制注入输入 Chip */
function hydrateActiveThreadInlineSkillChips(container: HTMLElement, attempts = 12): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => hydrateActiveThreadInlineSkillChips(container, attempts - 1), 50);
    }
    return;
  }
  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const draftText = normalizeSkillChipDraftText(
    activeThread.draftText || serializeDraftInput(input),
    contexts
  );
  if (serializeDraftInput(input) !== draftText) {
    setDraftInputWithInlineChips(input, draftText, contexts);
  }
  syncDraftInputHeight(container, { instant: true });
  renderSkillContextBar(container);
}

function bindInlineSkillChipControls(container: HTMLElement, root: ShadowRoot): void {
  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const dismissBtn = target?.closest<HTMLElement>('[data-action="dismiss-skill-context"]');
    if (!dismissBtn?.dataset.skillId) return;
    const input = getDraftInput(container);
    // 输入框内 Chip 仅移除 DOM 标记，不拆会话 skillContexts（会话绑定在 Context Bar）
    if (!input || !input.contains(dismissBtn)) return;
    event.preventDefault();
    event.stopPropagation();
    const chip = Array.from(input.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_CLASS}`)).find(
      item => item.dataset.skillId === dismissBtn.dataset.skillId
    );
    chip?.remove();
    const nextDraft = serializeDraftInput(input);
    updateThreadDraft(threadStore.activeThreadId, nextDraft);
    input.dispatchEvent(createTextInputEvent(nextDraft));
    syncDraftInputHeight(container);
  };
  root.addEventListener('click', onClick);
  cleanupCallbacks.push(() => root.removeEventListener('click', onClick));
}

function updateActiveThreadFields(container: HTMLElement, fields: Partial<DeepChatThread>): void {
  const activeThread = getActiveThread();
  const nextThread: DeepChatThread = {
    ...activeThread,
    ...fields,
    updatedAt: Date.now(),
  };

  // skillContexts 显式清空时删除字段
  if ('skillContexts' in fields && !fields.skillContexts) {
    delete nextThread.skillContexts;
  }

  threadStore = {
    activeThreadId: nextThread.id,
    threads: [
      nextThread,
      ...threadStore.threads.filter(thread => thread.id !== nextThread.id),
    ].slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  refreshChatSearchResultsIfOpen(container);
}

function cloneListingPromptContext(
  context: ListingPromptWorkflowContext
): ListingPromptWorkflowContext {
  return {
    ...context,
    seoKeywords: [...context.seoKeywords],
  };
}

function getActiveListingPromptContext(): ListingPromptWorkflowContext | null {
  const activeThread = getActiveThread();
  if (activeThread.listingPromptContext) {
    return cloneListingPromptContext(activeThread.listingPromptContext);
  }

  if (!activeThread.promptDraftId) return null;
  const prompt = getPromptDrafts().find(
    item => item.id === activeThread.promptDraftId && item.promptType === 'listing'
  );
  return prompt ? createListingPromptWorkflowContext(prompt) : null;
}

async function sendAssistantCopyToKeywordHunter(
  content: string,
  message?: DeepChatMessage
): Promise<void> {
  const promptContext = getActiveListingPromptContext();
  if (!promptContext) {
    showToast('请先在右侧 Prompt 列表选择一个 Listing Prompt', {
      type: 'warning',
    });
    return;
  }
  if (promptContext.seoKeywords.length === 0) {
    showToast('当前 Prompt 没有关联 SEO 关键词，请回到 Prompt 生成页面补充', {
      type: 'warning',
    });
    return;
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) return;
  const activeThread = getActiveThread();
  const createdAtMs = Number.isFinite(message?.createdAt) ? Number(message?.createdAt) : Date.now();
  const copy: AppCenterListingCopy = {
    id: `${activeThread.id}:${createdAtMs}`,
    workItemId: promptContext.workItemId,
    promptId: promptContext.promptId,
    threadId: activeThread.id,
    content: trimmedContent,
    seoKeywords: [...promptContext.seoKeywords],
    marketplace: promptContext.marketplace,
    asinOrSku: promptContext.asinOrSku,
    createdAt: new Date().toISOString(),
  };

  try {
    saveListingCopy(copy);
    registerListingCopyArtifact(copy);
    applyListingCopyToKeywordHunter(copy);
    setWorkspaceContext({
      workItemId: copy.workItemId,
      marketplace: copy.marketplace as never,
      asinOrSku: copy.asinOrSku,
      sourceRoute: 'keyword_hunter_input',
    });

    const didNavigate = await navigateToRouteId('keyword_hunter_input');
    showToast(
      didNavigate
        ? `已带入产品文案和 ${copy.seoKeywords.length} 个 SEO 关键词`
        : '产品文案已保存，但无法打开 Keyword Hunter',
      { type: didNavigate ? 'success' : 'warning' }
    );
  } catch (error) {
    console.error('[DeepChat] 推送产品文案失败:', error);
    showToast(error instanceof Error ? error.message : '推送产品文案失败，请重试', {
      type: 'error',
    });
  }
}

async function deletePromptDraft(container: HTMLElement, promptId: string): Promise<void> {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    renderPromptDraftsForActiveThread(container);
    return;
  }

  const confirmed = await confirmWithModal(
    '删除 Prompt 生成记录',
    '删除后将移除该 Prompt 生成记录，<br/><span class="text-xs text-red-400 mt-1 block">无法恢复</span>',
    'dc_ignore_delete_prompt',
    '删除 Prompt'
  );
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
  renderPromptDraftsForActiveThread(container);
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
    showToast('已创建新会话，但输入框尚未就绪，请稍后重试', {
      type: 'warning',
    });
    return;
  }

  const skillContexts = getActiveThread().skillContexts || [];
  const normalizedPrompt = normalizeSkillChipDraftText(prompt, skillContexts);
  setDraftInputWithInlineChips(input, normalizedPrompt, skillContexts);
  updateThreadDraft(threadStore.activeThreadId, normalizedPrompt);
  syncDraftInputHeight(container, { instant: true });
  // 技能 Chip 草稿不派发 input，避免 deep-chat innerText 污染；普通 Prompt 仍通知组件
  if (skillContexts.length === 0) {
    input.dispatchEvent(createTextInputEvent(normalizedPrompt));
  }
  window.setTimeout(() => {
    const latestInput = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input');
    const latestText = latestInput ? serializeDraftInput(latestInput) : '';
    if (latestText === normalizedPrompt || latestText.includes(normalizedPrompt)) {
      chat.focusInput?.();
      if (skillContexts.length === 0) {
        showToast('已创建新会话并填入 Prompt，确认后可手动发送', {
          type: 'success',
        });
      }
      syncDraftInputHeight(container, { instant: true });
      return;
    }

    if (attempts > 0) {
      fillPromptDraftInput(container, prompt, attempts - 1);
      return;
    }

    showToast('已创建新会话，但输入框尚未就绪，请稍后重试', {
      type: 'warning',
    });
  }, 80);
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
  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  refreshChatSearchResultsIfOpen(container);
  replaceChat(container);
  applySkillContextsToSession(container);
  hydrateActiveThreadInlineSkillChips(container);
}

async function deleteThread(container: HTMLElement, threadId: string): Promise<void> {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  const confirmed = await confirmWithModal(
    '删除会话',
    '删除后仅移除本地 Deep Chat 历史，<br/><span class="text-xs text-red-400 mt-1 block">无法恢复</span>',
    'dc_ignore_delete_thread',
    '删除会话'
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
  renderHistoryThreadList(container);
  if (shouldReplaceChat) {
    renderPromptDraftsForActiveThread(container);
  }
  refreshChatSearchResultsIfOpen(container);
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
  nextChat.id = 'deep-chat-view';
  nextChat.className = 'deep-chat-view';
  nextChat.style.fontFamily = DEEP_CHAT_SYSTEM_FONT_STACK;
  chat.replaceWith(nextChat);
  initDeepChat(container);
}

function renderMountedThreadList(): void {
  const container = getMountedRenderContainer();
  if (container) {
    renderHistoryThreadList(container);
    refreshChatSearchResultsIfOpen(container);
  }
}

function renderHistoryThreadList(container: HTMLElement): void {
  const editingState = editingThreadId ? { id: editingThreadId, value: editingThreadValue } : null;
  renderThreadList(
    container,
    getHistoryThreadStore(),
    pendingRequests,
    openThreadMenu,
    editingState
  );
  if (editingThreadId) {
    focusEditingInput(container, false);
  }
}

function getHistoryThreadStore(): DeepChatThreadStore {
  return {
    ...threadStore,
    threads: threadStore.threads.filter(isThreadVisibleInHistory),
  };
}

function isThreadVisibleInHistory(thread: DeepChatThread): boolean {
  return pendingRequests.has(thread.id) || isPersistableThread(thread);
}

function toggleThreadMenu(
  container: HTMLElement,
  threadId: string,
  button: HTMLButtonElement
): void {
  if (openThreadMenu?.threadId === threadId) {
    closeThreadMenu(container);
    return;
  }

  openThreadMenu = {
    threadId,
    placement: shouldOpenThreadMenuAbove(button) ? 'above' : 'below',
  };
  renderHistoryThreadList(container);
}

function shouldOpenThreadMenuAbove(button: HTMLButtonElement): boolean {
  const item = button.closest<HTMLElement>('.deep-chat-thread-item');
  const list = button.closest<HTMLElement>('.deep-chat-thread-list');
  if (!item || !list) {
    return false;
  }

  const itemRect = item.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const requiredSpace = THREAD_MENU_HEIGHT + THREAD_MENU_GAP;
  const spaceBelow = listRect.bottom - itemRect.bottom;
  const spaceAbove = itemRect.top - listRect.top;

  return spaceBelow < requiredSpace && spaceAbove >= requiredSpace;
}

function closeThreadMenu(container: HTMLElement): void {
  if (!openThreadMenu) {
    return;
  }

  openThreadMenu = null;
  renderHistoryThreadList(container);
}

function handleThreadMenuAction(container: HTMLElement, threadId: string, action: string): void {
  closeThreadMenu(container);

  if (action === 'rename') {
    renameThread(container, threadId);
    return;
  }

  if (action === 'pin') {
    togglePinnedThread(container, threadId);
    return;
  }

  if (action === 'delete') {
    deleteThread(container, threadId);
  }
}

function renameThread(container: HTMLElement, threadId: string): void {
  beginThreadRename(container, threadId);
}

function beginThreadRename(container: HTMLElement, threadId: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  closeThreadMenu(container);
  editingThreadId = threadId;
  editingThreadValue = thread.customTitle || thread.title;
  renderHistoryThreadList(container);
  focusEditingInput(container, true);
}

function commitThreadRename(container: HTMLElement, threadId: string, rawValue: string): void {
  if (editingThreadId !== threadId) {
    return;
  }

  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    exitThreadEdit();
    renderHistoryThreadList(container);
    return;
  }

  const trimmed = rawValue.replace(/\s+/g, ' ').trim();
  const originalTitle = thread.customTitle || thread.title;
  if (!trimmed) {
    showToast('会话名称不能为空', { type: 'warning' });
    exitThreadEdit();
    renderHistoryThreadList(container);
    return;
  }

  if (trimmed === originalTitle) {
    exitThreadEdit();
    renderHistoryThreadList(container);
    return;
  }

  exitThreadEdit();
  updateThreadMetadata(container, threadId, {
    title: trimmed,
    customTitle: trimmed,
    updatedAt: Date.now(),
  });
}

function cancelThreadRename(): void {
  exitThreadEdit();
  const container = getMountedRenderContainer();
  if (container) {
    renderHistoryThreadList(container);
  }
}

function exitThreadEdit(): void {
  editingThreadId = null;
  editingThreadValue = '';
}

function focusEditingInput(container: HTMLElement, selectAll: boolean): void {
  if (!editingThreadId) {
    return;
  }

  const input = container.querySelector<HTMLInputElement>('.deep-chat-thread-name-input');
  if (!input || input.dataset.threadEditId !== editingThreadId) {
    return;
  }

  input.focus();
  if (selectAll) {
    input.select();
  } else {
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }
}

function togglePinnedThread(container: HTMLElement, threadId: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  updateThreadMetadata(container, threadId, {
    pinnedAt: thread.pinnedAt ? undefined : Date.now(),
  });
}

function updateThreadMetadata(
  container: HTMLElement,
  threadId: string,
  changes: Partial<DeepChatThread>
): void {
  threadStore = {
    ...threadStore,
    threads: threadStore.threads.map(thread =>
      thread.id === threadId ? { ...thread, ...changes } : thread
    ),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  refreshChatSearchResultsIfOpen(container);
}

function renderPromptDraftsForActiveThread(container: HTMLElement): void {
  const promptDraftId = threadStore.threads.find(
    thread => thread.id === threadStore.activeThreadId
  )?.promptDraftId;
  renderPromptDraftList(container, promptDraftId);
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

  const nextThread: DeepChatThread = {
    ...activeThread,
    title: activeThread.customTitle || getThreadTitle(storedMessages),
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
    ].slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  if (container) {
    renderHistoryThreadList(container);
    refreshChatSearchResultsIfOpen(container);
    syncPendingStatus(container);
  }
}

async function loadThreadStore(): Promise<DeepChatThreadStore> {
  const indexedKey = `user:${THREAD_STORAGE_KEY}`;
  const stored =
    (await LocalDataStore.migrateLocalStorageKey<DeepChatThreadStore>(
      THREAD_STORAGE_KEY,
      indexedKey,
      'user-data'
    )) || (await LocalDataStore.get<DeepChatThreadStore>(indexedKey, null));
  if (!isValidThreadStore(stored)) {
    return createDefaultThreadStore();
  }

  const threads = stored.threads
    .map(sanitizeThread)
    .filter((thread): thread is DeepChatThread => thread !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, getMaxThreadCount());

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
      showToast('Deep Chat 会话保存失败：空间不足，请导出备份后清理缓存', {
        type: 'error',
      });
    }
  });
}

function persistThreadStoreNow(): void {
  draftPersistController.cancel();
  persistThreadStore();
}

function getPersistableThreadStore(): DeepChatThreadStore {
  const threads = threadStore.threads.filter(isPersistableThread).slice(0, getMaxThreadCount());
  const activeThreadId = threads.some(thread => thread.id === threadStore.activeThreadId)
    ? threadStore.activeThreadId
    : threads[0]?.id || '';

  return { activeThreadId, threads };
}

function isPersistableThread(thread: DeepChatThread): boolean {
  return (
    thread.messages.length > 0 ||
    Boolean(thread.draftText?.trim()) ||
    Boolean(thread.skillContexts && thread.skillContexts.length > 0)
  );
}

function createDefaultThreadStore(): DeepChatThreadStore {
  const thread = createEmptyThread();
  return {
    activeThreadId: thread.id,
    threads: [thread],
  };
}

function createEmptyThread(): DeepChatThread {
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

function getActiveThread(): DeepChatThread {
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

function getThreadForSave(threadId?: string): DeepChatThread | null {
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

function getThreadDisplayMessages(thread: DeepChatThread): DeepChatMessage[] {
  const pendingRequest = pendingRequests.get(thread.id);
  if (!pendingRequest) {
    return thread.messages;
  }

  const displayMessages = buildStoredThreadMessages(
    thread.messages,
    pendingRequest.conversationMessages,
    pendingRequest.displayedAssistantText,
    {
      now: pendingRequest.startedAt,
      assistantCreatedAt: pendingRequest.startedAt,
    }
  );

  if (pendingRequest.displayedAssistantText.trim()) {
    return displayMessages;
  }

  return [
    ...displayMessages,
    {
      role: 'ai',
      text: PENDING_ASSISTANT_PLACEHOLDER_TEXT,
      createdAt: pendingRequest.startedAt,
    },
  ];
}

function createPendingRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  controller: AbortController
): PendingDeepChatRequest {
  return createPendingDeepChatRequest(threadId, conversationMessages, {
    controller,
  });
}

function appendPendingAssistantText(pendingRequest: PendingDeepChatRequest, delta: string): void {
  appendPendingDeepChatAssistantText(pendingRequest, delta);
  syncPendingRequestView(pendingRequest.threadId);
}

function schedulePendingAssistantDisplay(threadId: string): void {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  if (isPendingDeepChatDisplayComplete(pendingRequest)) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  if (pendingDisplayTimers.has(threadId) || !getRenderContainerForThread(threadId)) {
    return;
  }

  const timer = window.setTimeout(() => {
    drainPendingAssistantDisplay(threadId);
  }, PENDING_DISPLAY_INTERVAL_MS);
  pendingDisplayTimers.set(threadId, timer);
}

function drainPendingAssistantDisplay(threadId: string): void {
  pendingDisplayTimers.delete(threadId);
  const pendingRequest = pendingRequests.get(threadId);
  const container = getRenderContainerForThread(threadId);
  if (!pendingRequest || !container) {
    return;
  }

  const nextDisplayText = getNextPendingAssistantDisplayText(pendingRequest);
  markPendingDeepChatAssistantTextDisplayed(pendingRequest, nextDisplayText);
  renderPendingAssistantDisplay(container, pendingRequest);
  syncPendingStatus(container);
  renderMountedThreadList();

  if (isPendingDeepChatDisplayComplete(pendingRequest)) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  schedulePendingAssistantDisplay(threadId);
}

function getNextPendingAssistantDisplayText(pendingRequest: PendingDeepChatRequest): string {
  const currentLength = pendingRequest.displayedAssistantText.length;
  const remainingLength = pendingRequest.assistantText.length - currentLength;
  const step = Math.min(
    48,
    Math.max(PENDING_DISPLAY_CHARS_PER_TICK, Math.ceil(remainingLength / 40))
  );

  return pendingRequest.assistantText.slice(0, currentLength + step);
}

function renderPendingAssistantDisplay(
  container: HTMLElement,
  pendingRequest: PendingDeepChatRequest
): void {
  const chat = getChat(container);
  if (!chat) {
    return;
  }

  const text = pendingRequest.displayedAssistantText || PENDING_ASSISTANT_PLACEHOLDER_TEXT;
  if (typeof chat.addMessage === 'function') {
    chat.addMessage({ role: 'ai', text, overwrite: true }, true);
    return;
  }

  replaceChat(container);
}

function renderPendingAssistantDisplayIfActive(
  threadId: string,
  pendingRequest: PendingDeepChatRequest
): void {
  const container = getRenderContainerForThread(threadId);
  if (container) {
    renderPendingAssistantDisplay(container, pendingRequest);
  }
}

function completeSettledPendingDisplay(
  threadId: string,
  pendingRequest: PendingDeepChatRequest
): void {
  if (!pendingRequest.isSettled || pendingRequests.get(threadId) !== pendingRequest) {
    return;
  }

  clearPendingDisplayTimer(threadId);
  pendingRequests.delete(threadId);
  renderMountedThreadList();

  const container = getRenderContainerForThread(threadId);
  if (container) {
    syncPendingStatus(container);
  }
}

function clearPendingDisplayTimer(threadId: string): void {
  const timer = pendingDisplayTimers.get(threadId);
  if (timer === undefined) {
    return;
  }

  window.clearTimeout(timer);
  pendingDisplayTimers.delete(threadId);
}

function clearAllPendingDisplayTimers(): void {
  pendingDisplayTimers.forEach(timer => {
    window.clearTimeout(timer);
  });
  pendingDisplayTimers.clear();
}

function applyPendingRequestsToThreadStore(store: DeepChatThreadStore): DeepChatThreadStore {
  let nextStore = store;

  pendingRequests.forEach(pendingRequest => {
    const existingThread = nextStore.threads.find(thread => thread.id === pendingRequest.threadId);
    const storedMessages = buildStoredThreadMessages(
      existingThread?.messages || [],
      pendingRequest.conversationMessages,
      '',
      { now: pendingRequest.startedAt }
    );
    const nextThread: DeepChatThread = {
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
      ].slice(0, getMaxThreadCount()),
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
  const status = container.querySelector<HTMLElement>('#deep-chat-pending-status');
  const statusText = container.querySelector<HTMLElement>('#deep-chat-pending-status-text');
  if (!status || !statusText) {
    syncSubmitStopButtonState(container);
    return;
  }

  const pendingRequest = pendingRequests.get(threadStore.activeThreadId);
  if (!pendingRequest) {
    status.hidden = true;
    statusText.textContent = '';
    syncSubmitStopButtonState(container);
    return;
  }

  statusText.textContent = getPendingStatusText(pendingRequest);
  status.hidden = false;
  syncSubmitStopButtonState(container);
}

function getPendingStatusText(pendingRequest: PendingDeepChatRequest): string {
  const charCount = pendingRequest.assistantText.trim().length;
  const prefix = pendingRequest.isSettled ? '正在显示回复...' : PENDING_ASSISTANT_PLACEHOLDER_TEXT;
  if (charCount === 0) {
    return prefix;
  }

  return `${prefix}已收到 ${charCount.toLocaleString('zh-CN')} 字`;
}

async function emitPendingAssistantDelta(
  signals: DeepChatSignals,
  pendingRequest: PendingDeepChatRequest,
  sourceChat: DeepChatElement | null,
  delta: string
): Promise<void> {
  const previousDisplayedLength = pendingRequest.assistantText.length - delta.length;
  const delivered = await emitDeepChatResponse(signals, { text: delta });
  const deliveredToMountedChat =
    delivered && isCurrentResponseTarget(pendingRequest.threadId, sourceChat);
  if (
    deliveredToMountedChat &&
    pendingRequest.displayedAssistantText.length === previousDisplayedLength
  ) {
    markPendingDeepChatAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
    return;
  }

  schedulePendingAssistantDisplay(pendingRequest.threadId);
}

function isCurrentResponseTarget(threadId: string, sourceChat: DeepChatElement | null): boolean {
  const container = getRenderContainerForThread(threadId);
  return Boolean(container && sourceChat && getChat(container) === sourceChat);
}

async function emitDeepChatResponse(
  signals: DeepChatSignals,
  response: { text?: string; error?: string }
): Promise<boolean> {
  try {
    await signals.onResponse?.(response);
    return true;
  } catch (error) {
    nativeLoggerConsole.warn('[Deep Chat] 忽略已卸载会话的响应更新:', error);
    return false;
  }
}

function sanitizeThread(thread: DeepChatThread): DeepChatThread | null {
  if (!thread || typeof thread.id !== 'string') {
    return null;
  }

  const draftText = getOptionalString(thread.draftText) || '';
  const optionalFields = getSanitizedThreadOptionalFields(thread);
  const createdAt = getFiniteTimestamp(thread.createdAt, Date.now());
  const updatedAt = getFiniteTimestamp(thread.updatedAt, createdAt);
  const messages = getSanitizedThreadMessages(thread.messages, updatedAt);

  return {
    id: thread.id,
    title: getSanitizedThreadTitle(thread.title, optionalFields.customTitle, messages),
    messages,
    draftText,
    ...optionalFields,
    createdAt,
    updatedAt,
  };
}

function getSanitizedThreadOptionalFields(thread: DeepChatThread): Partial<DeepChatThread> {
  const customTitle = getOptionalString(thread.customTitle);
  const promptDraftId = getOptionalString(thread.promptDraftId);
  const pinnedAt = getOptionalFiniteTimestamp(thread.pinnedAt);
  const listingPromptContext = getSanitizedListingPromptContext(thread.listingPromptContext);
  const skillContexts = getSanitizedSkillContexts(thread.skillContexts);

  return {
    ...(customTitle ? { customTitle } : {}),
    ...(promptDraftId ? { promptDraftId } : {}),
    ...(listingPromptContext ? { listingPromptContext } : {}),
    ...(skillContexts ? { skillContexts } : {}),
    ...(pinnedAt ? { pinnedAt } : {}),
  };
}

function parseSkillContextItem(item: unknown): DeepChatSkillContext | null {
  if (!item || typeof item !== 'object') return null;
  const context = item as Partial<DeepChatSkillContext>;
  const skillId = typeof context.skillId === 'string' ? context.skillId.trim() : '';
  const skillTitle = typeof context.skillTitle === 'string' ? context.skillTitle.trim() : '';
  const skillRaw = typeof context.skillRaw === 'string' ? context.skillRaw.trim() : '';
  if (!skillId || !skillTitle || !skillRaw) return null;
  return { skillId, skillTitle, skillRaw };
}

function getSanitizedSkillContexts(value: unknown): DeepChatSkillContext[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const contexts = value
    .map(parseSkillContextItem)
    .filter((context): context is DeepChatSkillContext => context !== null);
  return contexts.length > 0 ? contexts : null;
}

function getSanitizedListingPromptContext(value: unknown): ListingPromptWorkflowContext | null {
  if (!value || typeof value !== 'object') return null;
  const context = value as Partial<ListingPromptWorkflowContext>;
  if (
    typeof context.promptId !== 'string' ||
    typeof context.prompt !== 'string' ||
    typeof context.workItemId !== 'string' ||
    typeof context.marketplace !== 'string' ||
    typeof context.asinOrSku !== 'string' ||
    !Array.isArray(context.seoKeywords) ||
    !context.seoKeywords.every(keyword => typeof keyword === 'string')
  ) {
    return null;
  }
  return cloneListingPromptContext(context as ListingPromptWorkflowContext);
}

function getSanitizedThreadMessages(
  messages: DeepChatThread['messages'],
  fallbackCreatedAt: number
): DeepChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return normalizeStoredThreadMessages(messages, { fallbackCreatedAt });
}

function getSanitizedThreadTitle(
  title: DeepChatThread['title'],
  customTitle: string | undefined,
  messages: DeepChatMessage[]
): string {
  return customTitle || getOptionalString(title) || getThreadTitle(messages);
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim() || undefined;
}

function getFiniteTimestamp(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function getOptionalFiniteTimestamp(value: unknown): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function isValidThreadStore(value: DeepChatThreadStore | null): value is DeepChatThreadStore {
  return Boolean(value && typeof value.activeThreadId === 'string' && Array.isArray(value.threads));
}

function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.deep-chat-page')?.classList.toggle('is-chatting', isActive);
  const chat = getChat(container);
  chat?.classList.toggle('is-chatting', isActive);
  chat?.classList.toggle('is-empty', !isActive);
  syncDraftInputHeight(container);
}
