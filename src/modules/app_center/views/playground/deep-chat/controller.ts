import BaseModule from '@/common/BaseModule';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';
import { setSafeHtml } from '@/common/utils/security';
import { callLLM, type ChatMessage } from '@/services/llmService';
import { StorageService } from '@/services/storageService';
import { LocalDataStore } from '@/services/localDataStore';
import { appStore } from '@/stores/useAppStore';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import type { LLMProviderConfig } from '@/types/state';
import {
  buildStoredThreadMessages,
  mergeThreadHistoryWithRequest,
  normalizeStoredThreadMessages,
} from './conversationContext';
import {
  abortPendingPlaygroundRequest,
  appendPendingPlaygroundAssistantText,
  createPendingPlaygroundRequest,
  isPendingPlaygroundDisplayComplete,
  markPendingPlaygroundAssistantTextDisplayed,
  markPendingPlaygroundRequestSettled,
  shouldPreserveStoppedResponse,
  type PendingPlaygroundRequest,
  type PlaygroundPendingAbortReason,
} from './requestLifecycle';
import {
  buildBudgetedPlaygroundMessages,
  DEFAULT_PLAYGROUND_REQUEST_BUDGET,
  getPlaygroundMessageBudgetError,
  getPlaygroundSystemPromptBudgetError,
  resolvePlaygroundRequestBudget,
  type PlaygroundRequestBudget,
} from './requestBudget';
import { createDraftPersistController } from './draftPersistence';
import {
  DEEP_CHAT_TEMPLATE_PATH,
  DRAFT_PERSIST_DEBOUNCE_MS,
  EMPTY_CHAT_WRAP_HEIGHT,
  MAX_THREAD_COUNT,
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
  PlaygroundLLMCallContext,
  PlaygroundRequestMessages,
  PlaygroundRequestModelConfig,
  PlaygroundThread,
  PlaygroundThreadStore,
  PreparedPlaygroundRequest,
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
  thread: PlaygroundThread;
};

let cleanupCallbacks: Array<() => void> = [];
let currentConfig: LLMProviderConfig | null = null;
let selectedModel = '';
let sessionSystemPrompt = '';
let sessionTemperature = 0.3;
let threadStore: PlaygroundThreadStore = createDefaultThreadStore();
let mountedContainer: HTMLElement | null = null;
const pendingRequests = new Map<string, PendingPlaygroundRequest>();
const pendingDisplayTimers = new Map<string, number>();
let draftInputResizeObserver: ResizeObserver | null = null;
let draftInputResizeRetryTimer: number | null = null;
let cleanupDraftInputHeightListener: (() => void) | null = null;
let cleanupSubmitStopButtonListener: (() => void) | null = null;
let submitStopButtonSyncRetryTimer: number | null = null;
let openThreadMenu: ThreadMenuState | null = null;
const draftPersistController = createDraftPersistController(
  persistThreadStore,
  DRAFT_PERSIST_DEBOUNCE_MS
);

class DeepChatModule extends BaseModule {
  constructor() {
    super('playground');
  }

  protected async render(): Promise<void> {
    if (!this.container) {
      return;
    }

    const html = await SafeTemplateLoader.getInstance().loadTemplate(DEEP_CHAT_TEMPLATE_PATH);
    const renderer = SafeRenderer.getInstance();

    mountedContainer = this.container;
    renderer.renderTemplate(this.container, html);
  }

  protected async init(): Promise<void> {
    if (!this.container) {
      return;
    }

    threadStore = applyPendingRequestsToThreadStore(await loadThreadStore());
    renderHistoryThreadList(this.container);
    renderPromptDraftsForActiveThread(this.container);

    await ensureDeepChatElementDefined();
    initDeepChat(this.container);
    await refreshLLMConfig(this.container);
    bindControls(this.container);
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
  }
}

const deepChatModule = new DeepChatModule();

export const mount = (container: HTMLElement): Promise<void> => deepChatModule.mount(container);

export function unmount(): void {
  deepChatModule.unmount();
}

export async function clearPlaygroundThreadStore(): Promise<void> {
  abortAllPendingRequests('cleared');
  pendingRequests.clear();
  clearAllPendingDisplayTimers();
  draftPersistController.cancel();
  openThreadMenu = null;
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
  const settingsButton =
    modelSelect
      .closest('.playground-main')
      ?.querySelector<HTMLButtonElement>('#playground-open-settings') ??
    modelSelect.ownerDocument.querySelector<HTMLButtonElement>('#playground-open-settings');
  const config = currentConfig;
  const hasUsableConfig = !!config?.apiKey && !!selectedModel;
  if (settingsButton) {
    settingsButton.hidden = hasUsableConfig;
  }

  if (!hasUsableConfig) {
    if (statusEl) {
      statusEl.textContent = '未配置模型，请先在系统设置中配置 LLM';
    }
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
  if (statusEl) {
    statusEl.textContent = `${config.provider} / ${selectedModel}`;
  }
}

function initDeepChat(container: HTMLElement): void {
  const chat = container.querySelector<DeepChatElement>('#playground-chat');
  if (!chat) {
    return;
  }

  const activeThread = getActiveThread();
  configureDeepChatBase(chat, activeThread, updateThreadDraft, getThreadDisplayMessages);
  configureDeepChatStyles(chat);
  configureDeepChatConnection(chat, container, handlePlaygroundRequest);
  chat.onRender?.();
  setupMessageToolbars(chat, () => getThreadDisplayMessages(getActiveThread()));
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
    wrap.classList.remove('is-draft-height-md', 'is-draft-height-lg', 'is-draft-height-xl');
    return;
  }

  const inputContainer =
    getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input-container');
  const inputHeight = Math.ceil(
    inputContainer?.getBoundingClientRect().height || EMPTY_CHAT_WRAP_HEIGHT
  );
  const draftHeight = Math.max(EMPTY_CHAT_WRAP_HEIGHT, inputHeight);
  wrap.classList.toggle('is-draft-height-md', draftHeight > EMPTY_CHAT_WRAP_HEIGHT);
  wrap.classList.toggle('is-draft-height-lg', draftHeight > 240);
  wrap.classList.toggle('is-draft-height-xl', draftHeight > 340);
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

function setupSubmitStopButtonSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 10
): void {
  clearSubmitStopButtonSync();
  const onSubmitButtonStopIntent = (event: Event): void => {
    const button = getSubmitButtonFromEventPath(event, chat);
    const threadId =
      button?.getAttribute('data-playground-stop-thread-id') || threadStore.activeThreadId;
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
  button.toggleAttribute('data-playground-stop-active', isPending);
  if (isPending) {
    button.setAttribute('data-playground-stop-thread-id', threadStore.activeThreadId);
  } else {
    button.removeAttribute('data-playground-stop-thread-id');
  }
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncStopOverlayState(container: HTMLElement, _isPending: boolean): void {
  const stopButton = container.querySelector<HTMLButtonElement>('#playground-stop-generation');
  if (!stopButton) {
    return;
  }

  stopButton.hidden = true;
  stopButton.disabled = true;
  delete stopButton.dataset.threadId;
}

function bindControls(container: HTMLElement): void {
  const modelSelect = container.querySelector<HTMLSelectElement>('#playground-model-select');
  const refreshButton = container.querySelector<HTMLButtonElement>('#playground-refresh-config');
  const clearButton = container.querySelector<HTMLButtonElement>('#playground-clear-chat');
  const railToggleButton = container.querySelector<HTMLButtonElement>('#playground-toggle-rail');
  const stopButton = container.querySelector<HTMLButtonElement>('#playground-stop-generation');
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
  const settingsButton = container.querySelector<HTMLButtonElement>('#playground-open-settings');
  const promptlabButton = container.querySelector<HTMLButtonElement>('#playground-open-promptlab');

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
  bindTuningControls({
    systemPromptInput,
    temperatureInput,
    temperatureValue,
    resetTuningButton,
    tuningPanel,
  });
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

  const onDocumentClick = (event: MouseEvent): void => {
    if (!openThreadMenu) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('.playground-thread-menu, [data-thread-menu-id]')) {
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
    if (!target?.closest('.playground-chat-search-dialog')) {
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

    if (target.closest('.playground-chat-search-bar')) {
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
  const main = container.querySelector<HTMLElement>('.playground-main');
  const rect = main?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    modal.style.removeProperty('--playground-chat-search-left');
    modal.style.removeProperty('--playground-chat-search-top');
    return;
  }

  modal.style.setProperty('--playground-chat-search-left', `${rect.left + rect.width / 2}px`);
  modal.style.setProperty('--playground-chat-search-top', `${rect.top + rect.height / 2}px`);
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
      <div class="playground-chat-search-empty">
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
    <div class="playground-chat-search-group">${escapeHTML(groupLabel)}</div>
    <div class="playground-chat-search-result-list">
      ${results
        .map(({ thread }) => {
          const isActive = thread.id === threadStore.activeThreadId;
          const title = escapeHTML(thread.title);

          return `
        <button
          class="playground-chat-search-result${isActive ? ' is-active' : ''}"
          type="button"
          data-chat-search-thread-id="${escapeHTML(thread.id)}"
          aria-label="打开会话 ${title}"
        >
          <span class="playground-chat-search-result-icon" aria-hidden="true">
            <i class="far fa-message"></i>
          </span>
          <span class="playground-chat-search-result-copy">
            <span class="playground-chat-search-result-title">${title}</span>
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

function getThreadMatchedSearchText(thread: PlaygroundThread, normalizedQuery: string): string {
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
    container.querySelector<HTMLElement>('#playground-chat-search-modal') ||
    root.querySelector<HTMLElement>('#playground-chat-search-modal');
  const input =
    container.querySelector<HTMLInputElement>('#playground-chat-search-input') ||
    root.querySelector<HTMLInputElement>('#playground-chat-search-input');
  const results =
    container.querySelector<HTMLElement>('#playground-chat-search-results') ||
    root.querySelector<HTMLElement>('#playground-chat-search-results');
  if (!modal || !input || !results) {
    return null;
  }

  return {
    modal,
    input,
    results,
    openButton: container.querySelector<HTMLButtonElement>('#playground-search-chats'),
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

async function handlePlaygroundRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;
  let pendingThreadId: string | null = null;
  let lifecyclePendingRequest: PendingPlaygroundRequest | null = null;

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
    lifecyclePendingRequest = pendingRequest;
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
    markPendingPlaygroundRequestSettled(pendingRequest);
    schedulePendingAssistantDisplay(activeThread.id);
  } catch (error) {
    if (requestController?.signal.aborted) {
      return;
    }
    if (preserveTimedOutPartialResponse(pendingThreadId, error)) {
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    const responseText = formatPlaygroundErrorResponse(message);
    console.error('[Deep Chat] LLM 调用失败:', error);
    saveFailedPlaygroundResponse(pendingThreadId, responseText);
    await emitDeepChatResponse(signals, { text: responseText });
  } finally {
    cleanupLifecyclePendingRequest(pendingThreadId, lifecyclePendingRequest);
    signals.onClose?.();
  }
}

function cleanupLifecyclePendingRequest(
  threadId: string | null,
  lifecyclePendingRequest: PendingPlaygroundRequest | null
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
  if (pendingRequest.isSettled && !isPendingPlaygroundDisplayComplete(pendingRequest)) {
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

async function preparePlaygroundRequest(
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<PreparedPlaygroundRequest | null> {
  const { config, model } = await getPlaygroundRequestModelConfig();
  if (!config || !config.apiKey || !model) {
    await rejectPlaygroundRequest(signals, '请先在系统设置中配置可用的 LLM 模型。');
    return null;
  }

  const requestBudget = resolvePlaygroundRequestBudget(config, model);
  const { requestMessages, conversationMessages, messages, droppedMessageCount } =
    createPlaygroundRequestMessages(body, requestBudget);
  if (requestMessages.length === 0) {
    await rejectPlaygroundRequest(signals, '请输入要发送的内容。');
    return null;
  }

  const budgetError = getPlaygroundRequestBudgetError(requestMessages, requestBudget);
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
  await emitDeepChatResponse(signals, { text: formatPlaygroundErrorResponse(error) });
}

function formatPlaygroundErrorResponse(error: string): string {
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
  markPendingPlaygroundRequestSettled(pendingRequest);
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

function saveFailedPlaygroundResponse(threadId: string | null, responseText: string): void {
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

async function getPlaygroundRequestModelConfig(): Promise<PlaygroundRequestModelConfig> {
  const config = currentConfig || (await StorageService.getLLMConfigWithKey());
  const model = selectedModel || config?.model || getFirstModel(config);
  return { config, model };
}

function createPlaygroundRequestMessages(
  body: DeepChatRequestBody | DeepChatMessage[],
  budget: PlaygroundRequestBudget
): PlaygroundRequestMessages {
  const requestMessages = normalizeChatMessages(body);
  const conversationMessages = mergeThreadHistoryWithRequest(
    getActiveThread().messages,
    requestMessages
  );
  const budgetedMessages = buildBudgetedPlaygroundMessages(
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

function getPlaygroundRequestBudgetError(
  requestMessages: ChatMessage[],
  budget: PlaygroundRequestBudget
): string | null {
  return (
    getPlaygroundMessageBudgetError(requestMessages, budget) ||
    getPlaygroundSystemPromptBudgetError(sessionSystemPrompt, budget)
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
    signals.stopClicked.listener = () => stopPendingRequest(pendingRequest.threadId);
  }
}

function abortPendingRequest(threadId: string, reason: PlaygroundPendingAbortReason): boolean {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  abortPendingPlaygroundRequest(pendingRequest, reason);
  clearPendingDisplayTimer(threadId);
  return true;
}

function stopPendingRequest(threadId: string, options: { replaceChat?: boolean } = {}): boolean {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return false;
  }

  if (pendingRequest.isSettled) {
    markPendingPlaygroundAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
    renderPendingAssistantDisplayIfActive(threadId, pendingRequest);
    completeSettledPendingDisplay(threadId, pendingRequest);
    return true;
  }

  abortPendingPlaygroundRequest(pendingRequest, 'stopped');
  clearPendingDisplayTimer(threadId);
  preserveStoppedResponse(threadId);
  pendingRequests.delete(threadId);
  renderMountedThreadList();
  syncPendingRequestView(threadId, { replaceChat: options.replaceChat ?? true });
  return true;
}

function abortAllPendingRequests(reason: PlaygroundPendingAbortReason): void {
  pendingRequests.forEach(pendingRequest => {
    abortPendingPlaygroundRequest(pendingRequest, reason);
  });
}

async function callPlaygroundLLM(context: PlaygroundLLMCallContext): Promise<string> {
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
      maxTokens: DEFAULT_PLAYGROUND_REQUEST_BUDGET.maxOutputTokens,
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
      retries: 0,
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
    throw new Error('模型没有返回任何内容，请稍后重试或检查模型/上下文配置。');
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
  return container.querySelector<DeepChatElement>('#playground-chat');
}

function createThread(container: HTMLElement, options: CreateThreadOptions = {}): void {
  saveActiveThreadDraft(container);
  const nextThread: PlaygroundThread = {
    ...createEmptyThread(),
    ...(options.promptDraftId ? { promptDraftId: options.promptDraftId } : {}),
  };
  threadStore = {
    activeThreadId: nextThread.id,
    threads: [nextThread, ...threadStore.threads].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  refreshChatSearchResultsIfOpen(container);
  replaceChat(container);
  if (options.toastMessage !== null) {
    showToast(options.toastMessage || '已创建新的 Deep Chat 会话', { type: 'success' });
  }
}

function createThreadFromPromptDraft(container: HTMLElement, promptId: string): void {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    showToast('未找到可用 Prompt，请回到 Prompt 生成页面重新生成', { type: 'warning' });
    renderPromptDraftsForActiveThread(container);
    return;
  }

  createThread(container, { toastMessage: null, promptDraftId: promptId });
  window.setTimeout(() => fillPromptDraftInput(container, promptDraft.prompt), 80);
}

async function deletePromptDraft(container: HTMLElement, promptId: string): Promise<void> {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    renderPromptDraftsForActiveThread(container);
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
  nextChat.id = 'playground-chat';
  nextChat.className = 'playground-chat';
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
  renderThreadList(container, getHistoryThreadStore(), pendingRequests, openThreadMenu);
}

function getHistoryThreadStore(): PlaygroundThreadStore {
  return {
    ...threadStore,
    threads: threadStore.threads.filter(isThreadVisibleInHistory),
  };
}

function isThreadVisibleInHistory(thread: PlaygroundThread): boolean {
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
  const item = button.closest<HTMLElement>('.playground-thread-item');
  const list = button.closest<HTMLElement>('.playground-thread-list');
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
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  const title = window.prompt('重命名会话', thread.customTitle || thread.title);
  if (title === null) {
    return;
  }

  const trimmedTitle = title.replace(/\s+/g, ' ').trim();
  if (!trimmedTitle) {
    showToast('会话名称不能为空', { type: 'warning' });
    return;
  }

  updateThreadMetadata(container, threadId, {
    title: trimmedTitle,
    customTitle: trimmedTitle,
    updatedAt: Date.now(),
  });
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
  changes: Partial<PlaygroundThread>
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

  const nextThread: PlaygroundThread = {
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
    ].slice(0, MAX_THREAD_COUNT),
  };
  persistThreadStoreNow();
  if (container) {
    renderHistoryThreadList(container);
    refreshChatSearchResultsIfOpen(container);
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
): PendingPlaygroundRequest {
  return createPendingPlaygroundRequest(threadId, conversationMessages, { controller });
}

function appendPendingAssistantText(pendingRequest: PendingPlaygroundRequest, delta: string): void {
  appendPendingPlaygroundAssistantText(pendingRequest, delta);
  syncPendingRequestView(pendingRequest.threadId);
}

function schedulePendingAssistantDisplay(threadId: string): void {
  const pendingRequest = pendingRequests.get(threadId);
  if (!pendingRequest) {
    return;
  }

  if (isPendingPlaygroundDisplayComplete(pendingRequest)) {
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
  markPendingPlaygroundAssistantTextDisplayed(pendingRequest, nextDisplayText);
  renderPendingAssistantDisplay(container, pendingRequest);
  syncPendingStatus(container);
  renderMountedThreadList();

  if (isPendingPlaygroundDisplayComplete(pendingRequest)) {
    completeSettledPendingDisplay(threadId, pendingRequest);
    return;
  }

  schedulePendingAssistantDisplay(threadId);
}

function getNextPendingAssistantDisplayText(pendingRequest: PendingPlaygroundRequest): string {
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
  pendingRequest: PendingPlaygroundRequest
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
  pendingRequest: PendingPlaygroundRequest
): void {
  const container = getRenderContainerForThread(threadId);
  if (container) {
    renderPendingAssistantDisplay(container, pendingRequest);
  }
}

function completeSettledPendingDisplay(
  threadId: string,
  pendingRequest: PendingPlaygroundRequest
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

function getPendingStatusText(pendingRequest: PendingPlaygroundRequest): string {
  const charCount = pendingRequest.assistantText.trim().length;
  const prefix = pendingRequest.isSettled ? '正在显示回复...' : PENDING_ASSISTANT_PLACEHOLDER_TEXT;
  if (charCount === 0) {
    return prefix;
  }

  return `${prefix}已收到 ${charCount.toLocaleString('zh-CN')} 字`;
}

async function emitPendingAssistantDelta(
  signals: DeepChatSignals,
  pendingRequest: PendingPlaygroundRequest,
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
    markPendingPlaygroundAssistantTextDisplayed(pendingRequest, pendingRequest.assistantText);
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

function sanitizeThread(thread: PlaygroundThread): PlaygroundThread | null {
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

function getSanitizedThreadOptionalFields(thread: PlaygroundThread): Partial<PlaygroundThread> {
  const customTitle = getOptionalString(thread.customTitle);
  const promptDraftId = getOptionalString(thread.promptDraftId);
  const pinnedAt = getOptionalFiniteTimestamp(thread.pinnedAt);

  return {
    ...(customTitle ? { customTitle } : {}),
    ...(promptDraftId ? { promptDraftId } : {}),
    ...(pinnedAt ? { pinnedAt } : {}),
  };
}

function getSanitizedThreadMessages(
  messages: PlaygroundThread['messages'],
  fallbackCreatedAt: number
): DeepChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return normalizeStoredThreadMessages(messages, { fallbackCreatedAt });
}

function getSanitizedThreadTitle(
  title: PlaygroundThread['title'],
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

function isValidThreadStore(value: PlaygroundThreadStore | null): value is PlaygroundThreadStore {
  return Boolean(value && typeof value.activeThreadId === 'string' && Array.isArray(value.threads));
}

function setConversationActive(container: HTMLElement, isActive: boolean): void {
  container.querySelector('.playground-page')?.classList.toggle('is-chatting', isActive);
  const chat = getChat(container);
  chat?.classList.toggle('is-chatting', isActive);
  chat?.classList.toggle('is-empty', !isActive);
  syncDraftInputHeight(container);
}

function updateStatus(container: HTMLElement): void {
  const statusEl = container.querySelector<HTMLElement>('#playground-provider-status');
  if (statusEl && currentConfig && selectedModel) {
    statusEl.textContent = `${currentConfig.provider} / ${selectedModel}`;
  }
}
