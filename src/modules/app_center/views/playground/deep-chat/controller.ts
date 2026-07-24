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
import {
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  resolveModelCapability,
  shouldShowReasoningControls,
} from '@/services/modelCapability';
import {
  createDeepChatBusinessToolExecutor,
  DEEP_CHAT_BUSINESS_TOOLS,
} from './deepChatBusinessTools';
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
  buildSkillDeepChatUserDraft,
  buildSystemPromptFromSkillContexts,
  consumeSkillForDeepChat,
  normalizeSkillChipDraftText,
  prefixDraftWithSkillContexts,
  stripSkillMarkersFromDraft,
  type SkillDeepChatContext,
} from '@/modules/app_center/skillDeepChatHandoff';
import { skillRegistry } from '@/services/skillRegistry';
import {
  SKILL_CHIP_CLASS,
  createSkillContextChip,
  serializeChipContainingElement,
  setContentWithInlineSkillChips,
  textContainsSkillChipMarker,
} from './skillContextChip';
import { setWorkspaceContext } from '@/modules/app_center/workspaceContext';
import type { LLMProviderConfig } from '@/types/state';
import { chooseWithModal, confirmWithModal } from './utils/confirmModal';
import {
  buildStoredThreadMessages,
  mergeThreadHistoryWithRequest,
  normalizeStoredThreadMessages,
} from './conversationContext';
import {
  abortPendingDeepChatRequest,
  appendPendingDeepChatAssistantText,
  appendPendingDeepChatReasoningText,
  createPendingDeepChatRequest,
  getDeepChatGenerationPhase,
  getPendingReasoningDurationSec,
  isPendingDeepChatDisplayComplete,
  liveGenerationPhaseNeedsBubbleChrome,
  markPendingDeepChatAssistantTextDisplayed,
  markPendingDeepChatPartialPersisted,
  markPendingDeepChatRequestSettled,
  shouldPersistPendingDeepChatPartial,
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
import {
  cleanupMessageToolbars,
  refreshMessageToolbarStatuses,
  setupMessageToolbars,
} from './messageToolbar';
import { getPromptDrafts } from './promptDrafts';
import { resetPromptPreviewState, setupPromptPreview } from './promptPreview';
import { renderPromptDraftList, renderThreadList, type ThreadMenuState } from './renderers';
import { setupSkillLibrary } from './skillLibrary';
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
const PENDING_GENERATING_PREFIX = '正在生成回复...';
const WAITING_STATUS_LABELS = ['思考中...', '等待模型响应...', '正在连接模型...'] as const;
const WAITING_STATUS_ROTATE_MS = 1600;
const GENERATION_CHROME_CLASS = 'deep-chat-generation-chrome';
const INLINE_PENDING_STATUS_ID = 'deep-chat-inline-pending-status';
const PENDING_GENERATION_HOST_CLASS = 'is-pending-generation';
const STREAMING_DT_KEY = 'pending';
/** Shadow DOM rebuild retries when deep-chat recreates loading/AI slots */
const PENDING_CHROME_MAX_RETRIES = 16;
const REASONING_TYPEWRITER_INTERVAL_MS = 28;
const REASONING_TYPEWRITER_CHARS = 3;
const PENDING_DISPLAY_INTERVAL_MS = 32;
const PENDING_DISPLAY_CHARS_PER_TICK = 6;
/** 流式 partial 落盘：累计新增字数阈值 */
const PENDING_PARTIAL_PERSIST_MIN_CHARS = 120;
/** 流式 partial 落盘：最短时间间隔 */
const PENDING_PARTIAL_PERSIST_MIN_MS = 2000;
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
/** Re-attach inline generation chrome when deep-chat rebuilds shadow children */
let pendingChromeObserver: MutationObserver | null = null;
/** The deep-chat host currently observed — must rebind after replaceChat */
let pendingChromeObservedChat: DeepChatElement | null = null;
let pendingChromeRetryRaf: number | null = null;
let pendingChromeRetryTimeouts: number[] = [];
let reasoningTypewriterTimer: number | null = null;
/** Live typewriter target — restart when chrome remounts a new `<pre>`. */
let reasoningTypewriterTextEl: HTMLElement | null = null;
let waitingStatusRotateTimer: number | null = null;
/** Settled 深度思考 expand state keyed by message (`threadId:aiIndex:…`). */
const settledDeepThinkingUi = new Map<
  string,
  { doneOpen: boolean; deepOpen: boolean; displayedLength: number }
>();
const DEEP_CHAT_SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
let draftInputResizeObserver: ResizeObserver | null = null;
let draftInputResizeRetryTimer: number | null = null;
let draftHeightSyncRaf: number | null = null;
let cleanupDraftInputHeightListener: (() => void) | null = null;
let cleanupInlineSkillChipControls: (() => void) | null = null;
let cleanupSubmitStopButtonListener: (() => void) | null = null;
let submitStopButtonSyncRetryTimer: number | null = null;
let submitButtonStateObserver: MutationObserver | null = null;
let submitButtonPinObserver: MutationObserver | null = null;
type SkillChromeElementId = 'deep-chat-skill-load-banner';
const skillChromeElements = new WeakMap<HTMLElement, Map<SkillChromeElementId, HTMLElement>>();
let skillComposerChromeObserver: MutationObserver | null = null;
const SESSION_SKILL_CHIP_DOCK_ID = 'deep-chat-session-skill-chip-dock';
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
    // 回到当前会话即视为已读
    clearThreadUnread(threadStore.activeThreadId);
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
  }

  protected onUnmount(): void {
    if (mountedContainer && document.body.contains(mountedContainer)) {
      saveActiveThreadDraft(mountedContainer);
      saveActiveThreadTuning(mountedContainer);
      draftPersistController.flush();
    }
    cleanupCallbacks.forEach(cleanup => cleanup());
    cleanupCallbacks = [];
    resetPromptPreviewState();
    clearDraftInputHeightSync();
    clearSubmitStopButtonSync();
    cleanupMessageToolbars();
    clearPendingChromeObserver();
    // 软卸载：保留 pendingRequests，生成可在后台继续；remount 后恢复「生成中/输出中」
    // 不 abort 在飞 LLM（与「清空对话」的 disposeActiveSession 区分）
    openThreadMenu = null;
    editingThreadId = null;
    editingThreadValue = '';
    sessionSystemPrompt = '';
    sessionTemperature = 0.3;
    mountedContainer = null;
    currentConfig = null;
    selectedModel = '';
    // 页面离开后：强制 partial 落盘 + 静默推进 displayed/结算（不依赖 DOM）
    pendingRequests.forEach((request, threadId) => {
      persistPendingPartialIfNeeded(request, { force: true });
      schedulePendingAssistantDisplay(threadId);
    });
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

/** 取消在飞请求与显示定时器；可选清空 pending Map（仅「清空对话」） */
function disposeActiveSession(options: { clearPendingMap?: boolean } = {}): void {
  abortAllPendingRequests('cleared');
  clearAllPendingDisplayTimers();
  if (options.clearPendingMap) {
    pendingRequests.clear();
  }
  openThreadMenu = null;
  editingThreadId = null;
  editingThreadValue = '';
  sessionSystemPrompt = '';
  sessionTemperature = 0.3;
}

export async function clearDeepChatThreadStore(): Promise<void> {
  disposeActiveSession({ clearPendingMap: true });
  draftPersistController.cancel();
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
  applyThreadTuningToSession(container);
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
    syncDeepChatReasoningControlsFromThread(container);
    return;
  }

  renderLLMConfigState(modelSelect);
  syncDeepChatReasoningControlsFromThread(container);
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
  // 切会话/切回页面：已接收 stream 直接对齐到 displayed，避免 history 占位或长时间打字机追赶。
  // 深度思考同理对齐 cursor，后台攒下的 reasoning 立刻完整可见，新 chunk 才继续打字。
  pendingRequests.forEach(request => {
    if (request.assistantText) {
      markPendingDeepChatAssistantTextDisplayed(request, request.assistantText);
    }
    if (request.reasoningText) {
      request.reasoningDisplayedLength = request.reasoningText.length;
    }
  });
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
    // 气泡 Chip / 编辑回填：优先会话挂载；发送后已消费则从历史消息标记重建展示上下文
    getSkillContexts: () => collectDisplaySkillContexts(getActiveThread()),
    refillComposerWithText: text => refillComposerWithSkillChips(container, text),
    // 「正在生成回复 · 已收到 N 字」挂在 toolbar 末尾，不占气泡上方
    getLiveGenerationStatusLabel: () => getActiveLiveGenerationStatusLabel(),
  });
  setConversationActive(
    container,
    activeThread.messages.length > 0 || pendingRequests.has(activeThread.id)
  );
  // New deep-chat element every replaceChat — rebind observer and remount chrome hard
  remountDeepThinkingChromeAfterChatReplace(container);
  setupDraftInputHeightSync(container, chat);
  setupSubmitStopButtonSync(container, chat);
  // 恢复所有在飞/待输出会话（切出页面再回来时「生成中」不丢）
  pendingRequests.forEach((_request, threadId) => {
    schedulePendingAssistantDisplay(threadId);
  });
  if (!pendingRequests.has(activeThread.id)) {
    schedulePendingAssistantDisplay(activeThread.id);
  }
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
  syncSessionSkillChipDock(container);
  bindInlineSkillChipControls(container, root);
  placeSkillComposerChrome(container);
  observeSkillComposerChrome(container, chat);

  const onDraftInput = (): void => {
    saveActiveThreadDraft(container);
    window.requestAnimationFrame(() => {
      syncDraftInputHeight(container);
      const chatEl = getChat(container);
      if (chatEl) {
        alignSubmitButtonLayerToTextInput(chatEl);
      }
    });
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

function shouldShowSessionSkillChipDock(
  contexts: DeepChatSkillContext[],
  draftText: string
): boolean {
  if (contexts.length === 0) {
    return false;
  }
  return !textContainsSkillChipMarker(draftText, contexts);
}

function ensureSessionSkillChipDock(
  root: ShadowRoot,
  inputContainer: HTMLElement,
  input: HTMLElement
): HTMLElement {
  const existingDock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);
  if (existingDock) {
    return existingDock;
  }

  const dock = document.createElement('div');
  dock.id = SESSION_SKILL_CHIP_DOCK_ID;
  dock.className = 'deep-chat-session-skill-chip-dock';
  dock.setAttribute('aria-label', '已挂载技能');
  inputContainer.insertBefore(dock, input);
  return dock;
}

function renderSessionSkillChipDockChildren(
  dock: HTMLElement,
  contexts: DeepChatSkillContext[]
): void {
  const renderedSkillIds = Array.from(
    dock.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_CLASS}`)
  ).map(chip => chip.dataset.skillId || '');
  const nextSkillIds = contexts.map(context => context.skillId);
  if (
    renderedSkillIds.length === nextSkillIds.length &&
    renderedSkillIds.every((skillId, index) => skillId === nextSkillIds[index])
  ) {
    return;
  }
  dock.replaceChildren(...contexts.map(context => createSkillContextChip(context, 'dismissible')));
}

/**
 * 展示用 skill 上下文：仍挂载时用会话 skillContexts；
 * 发送后已单次消费时，从用户消息中的「技能名」标记重建（不恢复系统提示词）。
 */
function collectDisplaySkillContexts(thread: DeepChatThread): DeepChatSkillContext[] {
  const mounted = thread.skillContexts || [];
  if (mounted.length > 0) {
    return cloneSkillContexts(mounted);
  }
  return extractSkillContextsFromMessageMarkers(thread.messages || []);
}

/** 从用户消息正文的「技能名」标记提取轻量上下文（仅展示 / 编辑回填 Chip） */
function extractSkillContextsFromMessageMarkers(
  messages: Array<{ role?: string; text?: string }>
): DeepChatSkillContext[] {
  const byTitle = new Map<string, DeepChatSkillContext>();
  for (const message of messages) {
    if (message.role !== 'user' || !message.text) {
      continue;
    }
    for (const match of message.text.matchAll(/「([^」\n]+)」/g)) {
      const skillTitle = match[1]?.trim();
      if (!skillTitle || byTitle.has(skillTitle)) {
        continue;
      }
      byTitle.set(skillTitle, {
        skillId: `history:${skillTitle}`,
        skillTitle,
        skillRaw: '',
      });
    }
  }
  return [...byTitle.values()];
}

/**
 * 单次执行：请求已用当前 skill 系统提示词组装后，立即卸掉会话挂载。
 * 历史消息里的技能标记仍可渲染 static Chip；再次调用需从 Skill Library 重新挂载。
 */
function consumeMountedSkillsAfterSend(container: HTMLElement, threadId: string): void {
  if (threadStore.activeThreadId !== threadId) {
    return;
  }
  const activeThread = getActiveThread();
  if (!activeThread.skillContexts?.length) {
    return;
  }

  updateActiveThreadFields(container, {
    skillContexts: undefined,
    // 技能派生的系统提示一并清掉，避免下一条消息继续带方法论
    systemPrompt: undefined,
  });
  applySkillContextsToSession(container);
  syncSessionSkillChipDock(container);

  const input = getDraftInput(container);
  if (input) {
    const draft = serializeDraftInput(input);
    setDraftInputWithInlineChips(input, draft, []);
    if (draft) {
      notifyDeepChatComposerInput(input, draft);
    }
  }
}

/**
 * 发送前：若仍有会话技能且草稿无内联 Chip 标记，用 dock 提供可移除入口。
 * 单次发送消费后 skillContexts 清空，dock 自动消失。
 * Dock 是 #text-input-container 的兄弟节点，绝不进入 contenteditable / 请求文本。
 */
function syncSessionSkillChipDock(container: HTMLElement): void {
  const root = getChat(container)?.shadowRoot;
  const inputContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const input = root?.querySelector<HTMLElement>('#text-input');
  if (!root || !inputContainer || !input) {
    return;
  }

  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const existingDock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);

  if (!shouldShowSessionSkillChipDock(contexts, activeThread.draftText || '')) {
    existingDock?.remove();
    inputContainer.classList.remove('has-session-skill-chip-dock');
    return;
  }

  const dock = ensureSessionSkillChipDock(root, inputContainer, input);
  renderSessionSkillChipDockChildren(dock, contexts);
  inputContainer.classList.add('has-session-skill-chip-dock');
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

/** 会话技能是否已在输入框内水合为 Chip DOM（非纯文本「技能名」） */
function composerHasSessionSkillChips(
  input: HTMLElement,
  contexts: DeepChatSkillContext[]
): boolean {
  if (contexts.length === 0) {
    return true;
  }
  return contexts.every(context =>
    Array.from(input.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_CLASS}`)).some(
      chip => chip.dataset.skillId === context.skillId
    )
  );
}

function resolveComposerDraftText(
  rawDraft: string,
  contexts: DeepChatSkillContext[]
): { draftText: string; hasMarkers: boolean } {
  const hasMarkers = contexts.length > 0 && textContainsSkillChipMarker(rawDraft || '', contexts);
  return {
    hasMarkers,
    draftText: hasMarkers ? normalizeSkillChipDraftText(rawDraft || '', contexts) : rawDraft || '',
  };
}

function isDraftInputReady(
  input: HTMLElement,
  draftText: string,
  contexts: DeepChatSkillContext[]
): boolean {
  // 不因 skillContexts 强制要求输入框 Chip；仅当草稿已含标记时才校验 Chip DOM
  const { draftText: expected, hasMarkers } = resolveComposerDraftText(draftText, contexts);
  if (serializeDraftInput(input) !== expected) {
    return false;
  }
  return !hasMarkers || composerHasSessionSkillChips(input, contexts);
}

function restoreActiveThreadDraftInput(container: HTMLElement, attempts = 8): void {
  const input = getDraftInput(container);
  if (!input) {
    if (attempts > 0) {
      window.setTimeout(() => restoreActiveThreadDraftInput(container, attempts - 1), 80);
    }
    return;
  }

  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  // 空草稿/纯业务正文不强制回填 Chip。
  const { draftText, hasMarkers } = resolveComposerDraftText(
    activeThread.draftText || '',
    contexts
  );
  if (hasMarkers && draftText !== (activeThread.draftText || '')) {
    updateThreadDraft(activeThread.id, draftText);
  }

  if (!isDraftInputReady(input, draftText, contexts)) {
    setDraftInputWithInlineChips(input, draftText, contexts);
  }
  // 不派发 input：避免 deep-chat 用 innerText 回写脏草稿
  syncDraftInputHeight(container, { instant: true });
  syncSessionSkillChipDock(container);

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
  skillComposerChromeObserver?.disconnect();
  skillComposerChromeObserver = null;
  cleanupDraftInputHeightListener?.();
  cleanupDraftInputHeightListener = null;
  cleanupInlineSkillChipControls?.();
  cleanupInlineSkillChipControls = null;
  if (draftInputResizeRetryTimer !== null) {
    window.clearTimeout(draftInputResizeRetryTimer);
    draftInputResizeRetryTimer = null;
  }
  if (draftHeightSyncRaf !== null) {
    window.cancelAnimationFrame(draftHeightSyncRaf);
    draftHeightSyncRaf = null;
  }
}

/**
 * deep-chat 把 inside-end 按钮容器挂在 #input 下（与 #text-input-container 同级）。
 * #input 可能包含短暂的载入提示；若按钮层 inset:0 铺满整列，单行会相对输入框偏下。
 * 策略：不依赖 reparent（deep-chat 可能改回），把按钮层几何对齐到输入框矩形。
 */
function alignSubmitButtonLayerToTextInput(chat: DeepChatElement): boolean {
  const root = chat.shadowRoot;
  const inputArea = root?.querySelector<HTMLElement>('#input');
  const textContainer = root?.querySelector<HTMLElement>('#text-input-container');
  const buttonContainer = root?.querySelector<HTMLElement>(
    '.input-button-container.inner-button-container'
  );
  const button = root?.querySelector<HTMLElement>('.input-button.inside-end');
  if (!inputArea || !textContainer || !buttonContainer || !button) {
    return false;
  }

  const inputRect = inputArea.getBoundingClientRect();
  const textRect = textContainer.getBoundingClientRect();
  if (inputRect.height <= 0 || textRect.height <= 0) {
    return false;
  }

  // 按钮层铺满 #input（实测按钮绝对定位的 containing block 常是 #input，而非按钮层本身）
  buttonContainer.style.setProperty('position', 'absolute', 'important');
  buttonContainer.style.setProperty('inset', '0px', 'important');
  buttonContainer.style.setProperty('top', '0', 'important');
  buttonContainer.style.setProperty('left', '0', 'important');
  buttonContainer.style.setProperty('right', '0', 'important');
  buttonContainer.style.setProperty('bottom', '0', 'important');
  buttonContainer.style.setProperty('width', '100%', 'important');
  buttonContainer.style.setProperty('height', '100%', 'important');
  buttonContainer.style.setProperty('margin', '0', 'important');
  buttonContainer.style.setProperty('transform', 'none', 'important');
  buttonContainer.style.setProperty('pointer-events', 'none', 'important');
  buttonContainer.style.setProperty('z-index', '2', 'important');

  // 用 #input 坐标系把钮锚定到输入框右下。横向沿用 CSS 的动态 inset-inline-end：
  // 它会按 text-input 的 768px 最大宽度在 rail 转场的每帧插值，不能写入静态像素 right。
  const buttonSize = 36;
  const edgePad = 11;
  const buttonBottom = Math.max(0, Math.round(inputRect.bottom - textRect.bottom + edgePad));
  button.style.setProperty('position', 'absolute', 'important');
  button.style.setProperty('top', 'auto', 'important');
  button.style.setProperty('bottom', `${buttonBottom}px`, 'important');
  button.style.setProperty('inset-block-start', 'auto', 'important');
  button.style.setProperty('inset-block-end', `${buttonBottom}px`, 'important');
  button.style.removeProperty('left');
  button.style.removeProperty('right');
  button.style.removeProperty('inset-inline-start');
  button.style.removeProperty('inset-inline-end');
  button.style.setProperty('width', `${buttonSize}px`, 'important');
  button.style.setProperty('height', `${buttonSize}px`, 'important');
  button.style.setProperty('margin', '0', 'important');
  button.style.setProperty('transform', 'none', 'important');
  button.style.setProperty('pointer-events', 'auto', 'important');

  return true;
}

function observeSubmitButtonPin(container: HTMLElement, chat: DeepChatElement): void {
  submitButtonPinObserver?.disconnect();
  submitButtonPinObserver = null;

  const root = chat.shadowRoot;
  const inputArea = root?.querySelector('#input');
  const textContainer = root?.querySelector('#text-input-container');
  const stage = container.querySelector<HTMLElement>('.deep-chat-stage');
  if (!root || !inputArea || !textContainer) {
    return;
  }

  let aligning = false;
  const realign = (): void => {
    if (aligning) {
      return;
    }
    aligning = true;
    try {
      alignSubmitButtonLayerToTextInput(chat);
      observeSubmitButtonState(container, chat);
      // 仅刷新 aria / stop 标记，内部会再 align 但 aligning 期间由上层短路
      const pending = pendingRequests.get(threadStore.activeThreadId);
      const isStopActive = Boolean(pending && !pending.isSettled);
      const button = chat.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
      if (button) {
        syncSubmitButtonMetadata(button, isStopActive);
      }
    } finally {
      aligning = false;
    }
  };

  // 只听结构变化，不听 style（我们自己写 style 会对齐触发死循环）
  submitButtonPinObserver = new MutationObserver(() => {
    realign();
  });
  submitButtonPinObserver.observe(inputArea, {
    childList: true,
    subtree: true,
  });

  let resizeAnimationFrame: number | null = null;
  const onWindowResize = (): void => {
    if (aligning || resizeAnimationFrame !== null) {
      return;
    }
    resizeAnimationFrame = window.requestAnimationFrame(() => {
      resizeAnimationFrame = window.requestAnimationFrame(() => {
        resizeAnimationFrame = null;
        if (!aligning) {
          alignSubmitButtonLayerToTextInput(chat);
        }
      });
    });
  };
  window.addEventListener('resize', onWindowResize);

  const onStageGeometryTransitionEnd = (event: TransitionEvent): void => {
    if (
      event.target === stage &&
      (event.propertyName === 'width' || event.propertyName.startsWith('padding')) &&
      !aligning
    ) {
      alignSubmitButtonLayerToTextInput(chat);
    }
  };
  stage?.addEventListener('transitionend', onStageGeometryTransitionEnd);

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!aligning) {
        alignSubmitButtonLayerToTextInput(chat);
      }
    });
    resizeObserver.observe(textContainer);
    resizeObserver.observe(inputArea);
  }

  const previousDisconnect = submitButtonPinObserver.disconnect.bind(submitButtonPinObserver);
  submitButtonPinObserver.disconnect = () => {
    window.removeEventListener('resize', onWindowResize);
    stage?.removeEventListener('transitionend', onStageGeometryTransitionEnd);
    if (resizeAnimationFrame !== null) {
      window.cancelAnimationFrame(resizeAnimationFrame);
      resizeAnimationFrame = null;
    }
    resizeObserver?.disconnect();
    previousDisconnect();
  };

  realign();
}

function observeSubmitButtonState(container: HTMLElement, chat: DeepChatElement): void {
  submitButtonStateObserver?.disconnect();
  submitButtonStateObserver = null;

  const button = chat.shadowRoot?.querySelector('.input-button.inside-end');
  if (!button) {
    return;
  }

  submitButtonStateObserver = new MutationObserver(() => {
    syncSubmitStopButtonState(container);
  });
  submitButtonStateObserver.observe(button, {
    attributes: true,
    attributeFilter: ['class', 'aria-label', 'aria-disabled', 'aria-busy', 'title'],
  });
}

function setupSubmitStopButtonSync(
  container: HTMLElement,
  chat: DeepChatElement,
  attempts = 10
): void {
  clearSubmitStopButtonSync();
  const onSubmitButtonSpaceIntent = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || event.key !== ' ' || event.repeat) {
      return;
    }

    const button = getSubmitButtonFromEventPath(event, chat);
    if (!button) {
      return;
    }

    const isStopActive = button.hasAttribute('data-deep-chat-stop-active');
    const isUnavailableSubmit =
      !isStopActive &&
      (button.classList.contains('disabled-button') ||
        button.classList.contains('loading-button') ||
        button.getAttribute('aria-disabled') === 'true');
    if (isUnavailableSubmit) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    (button as HTMLElement).click();
  };

  const onSubmitButtonStopIntent = (event: Event): void => {
    const button = getSubmitButtonFromEventPath(event, chat);
    const threadId =
      button?.getAttribute('data-deep-chat-stop-thread-id') || threadStore.activeThreadId;
    const pending = pendingRequests.get(threadId);
    // 仅「生成中」劫持为停止；已 settled 的流式展示阶段不拦截发送
    if (!button || !pending || pending.isSettled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    stopPendingRequest(threadId, { replaceChat: true });
  };

  document.addEventListener('keydown', onSubmitButtonSpaceIntent, true);
  document.addEventListener('click', onSubmitButtonStopIntent, true);
  const root = chat.shadowRoot;
  const pinned = alignSubmitButtonLayerToTextInput(chat);
  if (root) {
    root.addEventListener('keydown', onSubmitButtonSpaceIntent, true);
    root.addEventListener('click', onSubmitButtonStopIntent, true);
  }
  if ((!root || !pinned) && attempts > 0) {
    submitStopButtonSyncRetryTimer = window.setTimeout(
      () => setupSubmitStopButtonSync(container, chat, attempts - 1),
      80
    );
    // 仍挂上清理，避免失败重试前的监听泄漏；成功路径会 clear 后重建
  }

  cleanupSubmitStopButtonListener = () => {
    document.removeEventListener('keydown', onSubmitButtonSpaceIntent, true);
    document.removeEventListener('click', onSubmitButtonStopIntent, true);
    root?.removeEventListener('keydown', onSubmitButtonSpaceIntent, true);
    root?.removeEventListener('click', onSubmitButtonStopIntent, true);
  };
  observeSubmitButtonPin(container, chat);
  observeSubmitButtonState(container, chat);
  syncSubmitStopButtonState(container);
  // deep-chat 初始化/校验会异步清掉 aria，短延迟再刷一次标签与位置
  window.setTimeout(() => {
    alignSubmitButtonLayerToTextInput(chat);
    syncSubmitStopButtonState(container);
  }, 120);
  window.setTimeout(() => {
    alignSubmitButtonLayerToTextInput(chat);
    syncSubmitStopButtonState(container);
  }, 400);
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
  submitButtonStateObserver?.disconnect();
  submitButtonStateObserver = null;
  submitButtonPinObserver?.disconnect();
  submitButtonPinObserver = null;
  if (submitStopButtonSyncRetryTimer !== null) {
    window.clearTimeout(submitStopButtonSyncRetryTimer);
    submitStopButtonSyncRetryTimer = null;
  }
}

function getSubmitButtonLabel(button: HTMLElement, isStopActive: boolean): string {
  if (isStopActive) {
    return '停止生成';
  }
  return button.classList.contains('loading-button') ? '正在准备请求' : '发送消息';
}

function syncSubmitButtonMetadata(button: HTMLElement, isStopActive: boolean): void {
  const label = getSubmitButtonLabel(button, isStopActive);
  const shouldRemoveFromTabOrder =
    !isStopActive &&
    (button.classList.contains('disabled-button') || button.classList.contains('loading-button'));
  const tabIndex = shouldRemoveFromTabOrder ? -1 : 0;
  button.toggleAttribute('data-deep-chat-stop-active', isStopActive);
  if (isStopActive) {
    button.setAttribute('data-deep-chat-stop-thread-id', threadStore.activeThreadId);
  } else if (button.hasAttribute('data-deep-chat-stop-thread-id')) {
    button.removeAttribute('data-deep-chat-stop-thread-id');
  }
  // deep-chat 切 disabled/submit 时会清掉 aria；只在变更时写入，避免 MutationObserver 死循环
  if (button.getAttribute('aria-label') !== label) {
    button.setAttribute('aria-label', label);
  }
  if (button.title !== label) {
    button.title = label;
  }
  if (button.tabIndex !== tabIndex) {
    button.tabIndex = tabIndex;
  }
}

function syncSubmitStopButtonState(container: HTMLElement): void {
  const chat = getChat(container);
  if (chat) {
    alignSubmitButtonLayerToTextInput(chat);
  }

  const pending = pendingRequests.get(threadStore.activeThreadId);
  // 仅「可中止的生成中」显示停止；LLM 已 settle、本地回放时恢复发送/禁用（与点击劫持逻辑一致）
  const isStopActive = Boolean(pending && !pending.isSettled);
  syncStopOverlayState(container, isStopActive);

  const button = chat?.shadowRoot?.querySelector<HTMLElement>('.input-button.inside-end');
  if (!button) {
    return;
  }

  syncSubmitButtonMetadata(button, isStopActive);
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

  bindModelControls({
    container,
    modelSelect,
    refreshButton,
    clearButton,
    railToggleButton,
    settingsButton,
  });
  bindStopOverlayControl(container, stopButton);
  bindThreadControls(container, threadList, promptList);
  bindChatSearchControls(container);
  bindSkillLibraryControls(container);
  bindMobileDrawerControls(container);
  bindTuningControls(container, {
    systemPromptInput,
    temperatureInput,
    temperatureValue,
    resetTuningButton,
    tuningPanel,
  });
  applySkillContextsToSession(container);
  applyThreadTuningToSession(container);
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
}

function bindModelControls(refs: ModelControlRefs): void {
  const { clearButton, container, modelSelect, railToggleButton, refreshButton, settingsButton } =
    refs;

  const onModelChange = (): void => {
    const nextModel = modelSelect?.value || selectedModel;
    if (nextModel !== selectedModel) {
      // Invalidate Responses multi-turn chain when model changes mid-thread.
      updateActiveThreadFields(container, {
        lastResponseId: undefined,
        lastResponseModel: undefined,
      });
    }
    selectedModel = nextModel;
    // Capability-gated controls must re-evaluate when the model changes.
    syncDeepChatReasoningControlsFromThread(container);
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

function bindSkillLibraryControls(container: HTMLElement): void {
  setupSkillLibrary(
    container,
    skillId => applySkillFromLibrary(container, skillId),
    cleanup => cleanupCallbacks.push(cleanup)
  );
}

/** 从侧栏 Skill Library 挂载技能：不切路由，复用既有挂载流程 */
async function applySkillFromLibrary(container: HTMLElement, skillId: string): Promise<void> {
  let skill;
  try {
    skill = skillRegistry.getSkill(skillId);
  } catch {
    showToast('技能库暂不可用，请稍后重试', { type: 'error' });
    return;
  }

  if (!skill) {
    showToast('未找到该技能', { type: 'error' });
    return;
  }

  const skillTitle = skill.title.replace(/^[#\s]+/, '').trim() || skill.id;

  // Skill Library「去对话」：当前会话有内容时询问新建 / 附加
  await createThreadFromSkillContext(
    container,
    {
      skillId: skill.id,
      skillTitle,
      skillRaw: skill.raw,
      userDraft: buildSkillDeepChatUserDraft(skillTitle, skill.raw),
    },
    { allowAttachChoice: true }
  );
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
          const displayTitle =
            thread.customTitle ||
            getThreadTitle(thread.messages, 100) ||
            thread.title ||
            'New Thread';
          const title = escapeHTML(displayTitle);

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

function findConfigModelsEntry(
  config: { models?: Array<string | { id: string }> } | null | undefined,
  model: string
): string | { id: string } {
  const found = config?.models?.find(item =>
    typeof item === 'string' ? item === model : item.id === model
  );
  return found ?? model;
}

function parseReasoningEffortValue(value: string | undefined): 'low' | 'medium' | 'high' {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}

type DeepChatReasoningSessionOverride = {
  enabled: boolean;
  effort?: 'low' | 'medium' | 'high';
};

function readLiveReasoningOverrideFromDom(
  container: HTMLElement
): DeepChatReasoningSessionOverride | null {
  const root = container.querySelector<HTMLElement>('#deep-chat-reasoning-controls');
  const enabledEl = container.querySelector<HTMLInputElement>('#deep-chat-reasoning-enabled');
  const effortEl = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');
  if (!root || root.hidden || !enabledEl) {
    return null;
  }
  return {
    enabled: Boolean(enabledEl.checked),
    effort: parseReasoningEffortValue(effortEl?.value),
  };
}

function readStoredReasoningOverride(): DeepChatReasoningSessionOverride | undefined {
  const stored = getActiveThread().reasoning;
  if (!stored) {
    return undefined;
  }
  return {
    enabled: Boolean(stored.enabled),
    ...(stored.effort ? { effort: parseReasoningEffortValue(stored.effort) } : {}),
  };
}

/**
 * Session override for the next request.
 * When reasoning controls are visible, read live DOM (WYSIWYG) so enabling in the UI
 * always maps to request fields even if thread.reasoning lagged behind the checkbox state.
 * When controls are hidden, force enabled:false so no reasoning fields are sent.
 */
function resolveDeepChatReasoningSessionOverride(
  container: HTMLElement | null
): DeepChatReasoningSessionOverride | undefined {
  const config = currentConfig;
  const model = selectedModel || config?.model || '';
  if (!config || !model) {
    return undefined;
  }

  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
  });
  if (!shouldShowReasoningControls(cap)) {
    return { enabled: false };
  }

  if (container) {
    const live = readLiveReasoningOverrideFromDom(container);
    if (live) {
      return live;
    }
  }

  return readStoredReasoningOverride();
}

function bindReasoningTuningControls(container: HTMLElement): void {
  const reasoningEnabled = container.querySelector<HTMLInputElement>(
    '#deep-chat-reasoning-enabled'
  );
  const reasoningEffort = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');

  const onReasoningEnabledChange = (): void => {
    const enabled = Boolean(reasoningEnabled?.checked);
    if (reasoningEffort) {
      reasoningEffort.disabled = !enabled;
    }
    const prev = getActiveThread().reasoning || {};
    updateActiveThreadFields(container, {
      reasoning: {
        ...prev,
        enabled,
        effort: parseReasoningEffortValue(reasoningEffort?.value ?? prev.effort),
      },
    });
  };
  const onReasoningEffortChange = (): void => {
    const effort = parseReasoningEffortValue(reasoningEffort?.value);
    const prev = getActiveThread().reasoning || {};
    const enabled =
      prev.enabled !== undefined ? Boolean(prev.enabled) : Boolean(reasoningEnabled?.checked);
    updateActiveThreadFields(container, {
      reasoning: { ...prev, enabled, effort },
    });
  };
  reasoningEnabled?.addEventListener('change', onReasoningEnabledChange);
  reasoningEffort?.addEventListener('change', onReasoningEffortChange);
  cleanupCallbacks.push(() => {
    reasoningEnabled?.removeEventListener('change', onReasoningEnabledChange);
    reasoningEffort?.removeEventListener('change', onReasoningEffortChange);
  });
  syncDeepChatReasoningControlsFromThread(container);
}

function bindTuningControls(container: HTMLElement, refs: TuningControlRefs): void {
  const { systemPromptInput, temperatureInput, temperatureValue, resetTuningButton, tuningPanel } =
    refs;

  const onSystemPromptInput = (): void => {
    sessionSystemPrompt = systemPromptInput?.value.trim() || '';
    updateActiveThreadFields(container, {
      systemPrompt: sessionSystemPrompt || undefined,
    });
  };
  systemPromptInput?.addEventListener('input', onSystemPromptInput);
  cleanupCallbacks.push(() => systemPromptInput?.removeEventListener('input', onSystemPromptInput));

  const onTemperatureInput = (): void => {
    sessionTemperature = normalizeTemperature(temperatureInput?.value);
    if (temperatureValue) {
      temperatureValue.value = sessionTemperature.toFixed(1);
    }
    updateTemperatureTrack(temperatureInput);
    updateActiveThreadFields(container, { temperature: sessionTemperature });
  };
  temperatureInput?.addEventListener('input', onTemperatureInput);
  cleanupCallbacks.push(() => temperatureInput?.removeEventListener('input', onTemperatureInput));

  bindReasoningTuningControls(container);

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
    updateActiveThreadFields(container, {
      systemPrompt: undefined,
      temperature: 0.3,
      reasoning: undefined,
    });
    syncDeepChatReasoningControlsFromThread(container);
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

/** U4：窄屏会话 / Prompt 抽屉 */
function bindMobileDrawerControls(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.deep-chat-page');
  const backdrop = container.querySelector<HTMLButtonElement>('#deep-chat-drawer-backdrop');
  if (!page) {
    return;
  }

  const closeDrawers = (): void => {
    page.classList.remove('is-thread-drawer-open', 'is-prompt-drawer-open');
    if (backdrop) {
      backdrop.hidden = true;
    }
  };

  const openDrawer = (kind: 'thread' | 'prompt'): void => {
    page.classList.toggle('is-thread-drawer-open', kind === 'thread');
    page.classList.toggle('is-prompt-drawer-open', kind === 'prompt');
    if (backdrop) {
      backdrop.hidden = false;
    }
  };

  const onBarClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('[data-drawer]');
    const drawer = button?.dataset.drawer;
    if (drawer !== 'thread' && drawer !== 'prompt') {
      return;
    }
    event.preventDefault();
    openDrawer(drawer);
  };

  const bar = container.querySelector('.deep-chat-mobile-rail-bar');
  bar?.addEventListener('click', onBarClick);
  backdrop?.addEventListener('click', closeDrawers);
  cleanupCallbacks.push(() => {
    bar?.removeEventListener('click', onBarClick);
    backdrop?.removeEventListener('click', closeDrawers);
    closeDrawers();
  });
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
    // 本请求的 messages 已烘焙 skill 系统提示；立即卸挂载（单次执行）
    consumeMountedSkillsAfterSend(container, activeThread.id);
    syncPendingRequestView(activeThread.id);
    // 仅在进入生成态时刷新列表（勿在每个 stream token 重绘，否则无法点选其他会话）
    renderMountedThreadList();
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
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      // Explicitly omit assistantStatus so partial 「未完成」 is cleared in store.
    });
    markPendingDeepChatRequestSettled(pendingRequest);
    // Paint 「已完成」 immediately (before body typewriter finishes draining).
    {
      const mount = getMountedRenderContainer();
      if (mount) {
        syncAllDeepThinkingChrome(mount);
        // Clear toolbar 「未完成」 without waiting for thread switch / refresh.
        refreshMessageToolbarStatuses(getChat(mount), () =>
          getThreadDisplayMessages(getActiveThread())
        );
      }
    }
    // 后台会话：LLM 一完成就标未读并刷新列表（不等打字机 drain）
    notifyBackgroundPendingSettled(activeThread.id);
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
    nativeLoggerConsole.error('[Deep Chat] LLM 调用失败:', redactSensitiveError(error));
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
    // 已 settle 的后台会话确保未读已标（防止仅依赖 drain 路径时漏刷）
    notifyBackgroundPendingSettled(threadId);
    syncPendingRequestView(threadId);
    schedulePendingAssistantDisplay(threadId);
    return;
  }

  // 已 settle 且展示完成：统一走 completeSettled（含未读），避免直接 delete 漏标
  if (pendingRequest.isSettled) {
    completeSettledPendingDisplay(threadId, pendingRequest);
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
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      // Keep partial marker only when we intentionally stop mid-stream; timeout
      // content is treated as final retained text (no sticky 「未完成」).
    }
  );
  markPendingDeepChatRequestSettled(pendingRequest);
  notifyBackgroundPendingSettled(threadId);
  schedulePendingAssistantDisplay(threadId);
  const mount = getRenderContainerForThread(threadId);
  if (mount) {
    refreshMessageToolbarStatuses(getChat(mount), () =>
      getThreadDisplayMessages(getActiveThread())
    );
  }
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
  const requestMessages = normalizeRequestSkillChipMessages(normalizeChatMessages(body));
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

/** 将 Deep Chat 可能回写的可见 Chip 文本还原为稳定的 raw marker，再持久化/发送。 */
function normalizeRequestSkillChipMessages(messages: ChatMessage[]): ChatMessage[] {
  const contexts = getActiveThread().skillContexts || [];
  if (contexts.length === 0) {
    return messages;
  }

  return messages.map(message =>
    message.role === 'user'
      ? { ...message, content: normalizeSkillChipDraftText(message.content, contexts) }
      : message
  );
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

function prepareDeepChatReasoningCallOptions(): {
  reasoningPrefs?: { enabled: boolean; effort: 'low' | 'medium' | 'high' };
  reasoningSessionOverride?: DeepChatReasoningSessionOverride;
} {
  const mountContainer = getMountedRenderContainer();
  const reasoningSessionOverride = resolveDeepChatReasoningSessionOverride(mountContainer);
  if (reasoningSessionOverride && mountContainer) {
    updateActiveThreadFields(mountContainer, {
      reasoning: {
        enabled: reasoningSessionOverride.enabled,
        ...(reasoningSessionOverride.effort ? { effort: reasoningSessionOverride.effort } : {}),
      },
    });
  }
  // Explicit prefs so hydrate cannot fall back to stale disabled global.
  if (reasoningSessionOverride === undefined) {
    return {};
  }
  return {
    reasoningSessionOverride,
    reasoningPrefs: {
      enabled: reasoningSessionOverride.enabled,
      effort: parseReasoningEffortValue(reasoningSessionOverride.effort),
    },
  };
}

function resolveDeepChatResponsesChainOptions(
  config: LLMProviderConfig,
  model: string
): {
  apiPath?: ReturnType<typeof normalizeApiPathId>;
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  executeTool?: ReturnType<typeof createDeepChatBusinessToolExecutor>;
  enableToolLoop?: boolean;
  maxToolRounds?: number;
} {
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  if (apiPath !== 'responses') {
    return { apiPath };
  }

  const thread = getActiveThread();
  const previousResponseId =
    thread.lastResponseModel === model && thread.lastResponseId ? thread.lastResponseId : undefined;

  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    preferredSurface: 'responses',
  });

  // Read-only business tools whenever Responses tools are supported.
  // callLLM uses stream-first + tool-loop fallback so 深度思考 chrome is preserved.
  const toolOptions = cap.supportsTools
    ? {
        tools: DEEP_CHAT_BUSINESS_TOOLS,
        executeTool: createDeepChatBusinessToolExecutor({
          getThread: () => getActiveThread(),
          getModel: () => model,
          getProvider: () => config.provider,
        }),
        enableToolLoop: true,
        maxToolRounds: 4,
      }
    : {};

  // Only request store/previous_id when capability allows (fail-closed registry + gateway).
  const canChain =
    Boolean(previousResponseId) &&
    cap.supportsPreviousResponseId === true &&
    cap.supportsStore === true;
  return {
    apiPath,
    ...(canChain ? { previousResponseId, store: true } : { store: false }),
    ...toolOptions,
  };
}

function persistDeepChatResponseId(model: string, responseId: string): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  updateActiveThreadFields(container, {
    lastResponseId: responseId,
    lastResponseModel: model,
  });
}

function isResponsesChainUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const blob =
    `${error.message} ${JSON.stringify((error as { response?: unknown }).response ?? '')}`.toLowerCase();
  return (
    /previous_response_id|stored responses are not supported|store.*not supported|not support.*store/.test(
      blob
    ) ||
    ((error as { statusCode?: number }).statusCode === 400 && /previous_response|store/.test(blob))
  );
}

function clearDeepChatResponseChain(): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  updateActiveThreadFields(container, {
    lastResponseId: undefined,
    lastResponseModel: undefined,
  });
}

function stripResponsesChainForRetry(
  chain: ReturnType<typeof resolveDeepChatResponsesChainOptions>
): ReturnType<typeof resolveDeepChatResponsesChainOptions> {
  return {
    apiPath: 'responses',
    store: false,
    ...(chain.tools
      ? {
          tools: chain.tools,
          executeTool: chain.executeTool,
          enableToolLoop: chain.enableToolLoop,
          maxToolRounds: chain.maxToolRounds,
        }
      : {}),
  };
}

type DeepChatStreamState = { streamedText: string };

function createDeepChatStreamHandler(
  pendingRequest: PendingDeepChatRequest,
  signals: DeepChatSignals,
  sourceChat: DeepChatElement | null,
  state: DeepChatStreamState
): (update: { delta: string; reasoningDelta?: string }) => void {
  return update => {
    if (pendingRequest.abortReason) return;
    if (update.reasoningDelta) {
      appendPendingDeepChatReasoningText(pendingRequest, update.reasoningDelta);
    }
    state.streamedText += update.delta;
    if (update.delta) {
      appendPendingAssistantText(pendingRequest, update.delta);
      void emitPendingAssistantDelta(signals, pendingRequest, sourceChat, update.delta);
    } else if (update.reasoningDelta) {
      // Only paint chrome for *this* request's thread (not whatever is currently mounted).
      // Background reasoning must keep accumulating without thrashing another session's UI.
      const container = getRenderContainerForThread(pendingRequest.threadId);
      if (container) {
        syncPendingStatus(container);
      }
    }
  };
}

async function callDeepChatLLM(context: DeepChatLLMCallContext): Promise<string> {
  const { messages, config, model, signals, sourceChat, controller, pendingRequest } = context;
  const streamState: DeepChatStreamState = { streamedText: '' };
  const reasoningOptions = prepareDeepChatReasoningCallOptions();
  let responsesChain = resolveDeepChatResponsesChainOptions(config, model);
  const onStreamUpdate = createDeepChatStreamHandler(
    pendingRequest,
    signals,
    sourceChat,
    streamState
  );

  const run = (chain: typeof responsesChain) =>
    callLLM(messages, config.provider, config.endpoint, config.apiKey, model, {
      temperature: sessionTemperature,
      maxTokens: getDeepChatRequestBudgetDefaults().maxOutputTokens,
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
      ...reasoningOptions,
      ...chain,
      modelsEntry: findConfigModelsEntry(config, model),
      retries: 0,
      ...getRuntimeDeepChatOptions(),
      signal: controller.signal,
      stream: true,
      onResponseId: (responseId: string) => persistDeepChatResponseId(model, responseId),
      onStreamUpdate,
    });

  let finalText: string;
  try {
    finalText = await run(responsesChain);
  } catch (error) {
    if (!isResponsesChainUnsupportedError(error) || responsesChain.apiPath !== 'responses') {
      throw error;
    }
    clearDeepChatResponseChain();
    responsesChain = stripResponsesChainForRetry(responsesChain);
    streamState.streamedText = '';
    finalText = await run(responsesChain);
  }

  if (pendingRequest.abortReason) {
    const container = getMountedRenderContainer();
    if (container) syncPendingStatus(container);
    return pendingRequest.assistantText.trim();
  }

  if (!streamState.streamedText && finalText) {
    appendPendingAssistantText(pendingRequest, finalText);
    await emitPendingAssistantDelta(signals, pendingRequest, sourceChat, finalText);
  }

  syncMountedDeepThinkingChrome();

  const assistantText = (finalText || streamState.streamedText).trim();
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

function syncMountedDeepThinkingChrome(): void {
  const container = getMountedRenderContainer();
  if (container) syncPendingStatus(container);
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
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
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
  // 技能页「在 Deep Chat 试用」：默认新建会话，不弹挂载方式选择
  void createThreadFromSkillContext(container, skillContext, { allowAttachChoice: false });
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

/**
 * 挂载技能：skill 全文 → 系统提示词；输入框 Chip 展示挂载。
 * - 技能页「在 Deep Chat 试用」：固定新建会话（allowAttachChoice=false）。
 * - Deep Chat Skill Library「去对话」：当前会话有内容时才询问新建 / 附加（allowAttachChoice=true）。
 * FB2：仅「附加到当前会话」时，若会覆盖已有系统提示词才需确认（新建会话不弹覆盖框）。
 * 注意：发送清空后 hydrate 不会把 Chip 再塞回空输入框。
 */
async function createThreadFromSkillContext(
  container: HTMLElement,
  skillContext: SkillDeepChatContext,
  options: { allowAttachChoice?: boolean } = {}
): Promise<void> {
  const allowAttachChoice = options.allowAttachChoice === true;
  const activeThread = getActiveThread();
  const canAttachToCurrent =
    allowAttachChoice &&
    Boolean(activeThread) &&
    (activeThread.messages.length > 0 ||
      Boolean(activeThread.skillContexts?.length) ||
      Boolean(activeThread.draftText?.trim()));

  let attachToCurrent = false;
  if (canAttachToCurrent) {
    const choice = await chooseWithModal({
      title: '挂载技能',
      content: `如何挂载技能「${skillContext.skillTitle}」？\n新建会话可保留当前对话不变；附加到当前会话会更新本会话的系统提示词与业务草稿。`,
      primaryLabel: '新建会话',
      secondaryLabel: '附加到当前会话',
      cancelLabel: '取消',
      primaryIsDestructive: false,
    });
    if (choice === 'cancel') {
      showToast('已取消挂载技能', { type: 'warning' });
      return;
    }
    attachToCurrent = choice === 'secondary';
  }

  const skillChip: DeepChatSkillContext = {
    skillId: skillContext.skillId,
    skillTitle: skillContext.skillTitle,
    skillRaw: skillContext.skillRaw,
  };

  if (attachToCurrent) {
    // 仅附加到当前会话时，覆盖已有系统提示词需要确认
    if (!(await confirmOverwriteSystemPromptIfNeeded(container, skillContext))) {
      return;
    }
    showSkillLoadBanner(container, skillContext.skillTitle);
    attachSkillToActiveThread(container, skillContext, skillChip);
    return;
  }

  // 新建会话：草稿前缀技能 Chip 标记，便于输入框立即可见
  const draftWithChip = prefixDraftWithSkillContexts(skillContext.userDraft, [skillChip]);
  showSkillLoadBanner(container, skillContext.skillTitle);
  createThread(container, {
    toastMessage: `已附加技能「${skillContext.skillTitle}」`,
    draftText: draftWithChip,
    skillContexts: [skillChip],
  });

  // 多次重试：replaceChat / shadow 就绪后确保 Chip 水合进输入框。
  // 每次回填都绑定当前线程与初始草稿，绝不覆盖后续编辑或另一个会话。
  scheduleSkillComposerDraftFill(container, skillContext.userDraft, {
    threadId: getActiveThread().id,
    draftText: draftWithChip,
  });
}

/** 附加到当前会话时：若已有非空且不同的系统提示词，确认是否覆盖 */
async function confirmOverwriteSystemPromptIfNeeded(
  container: HTMLElement,
  skillContext: SkillDeepChatContext
): Promise<boolean> {
  const existingPrompt = getCurrentSessionSystemPrompt(container);
  const nextPrompt = skillContext.skillRaw.trim();
  if (!existingPrompt || existingPrompt === nextPrompt) {
    return true;
  }

  const confirmed = await confirmWithModal(
    '覆盖系统提示词',
    `当前会话已有系统提示词。将技能「${skillContext.skillTitle}」附加到本会话会用技能方法论<strong>覆盖</strong>该内容。<br/><span class="text-xs text-slate-500 mt-1 block">若不想覆盖，可改选「新建会话」。可在右上角 Settings 中查看与编辑系统提示词。</span>`,
    'dc_skill_overwrite_system_prompt',
    '覆盖并附加'
  );
  if (!confirmed) {
    showToast('已取消挂载技能', { type: 'warning' });
    return false;
  }
  return true;
}

/** F2：将技能挂到当前会话（更新 skillContexts / 草稿 / 系统提示） */
function attachSkillToActiveThread(
  container: HTMLElement,
  skillContext: SkillDeepChatContext,
  skillChip: DeepChatSkillContext
): void {
  const activeThread = getActiveThread();
  const existing = activeThread.skillContexts || [];
  const withoutDup = existing.filter(item => item.skillId !== skillChip.skillId);
  const nextContexts = [...withoutDup, skillChip];
  const baseDraft =
    activeThread.draftText?.trim() || skillContext.userDraft || activeThread.draftText || '';
  // 附加技能时在输入框前缀 Chip。
  const nextDraft = prefixDraftWithSkillContexts(baseDraft, nextContexts);

  updateActiveThreadFields(container, {
    skillContexts: nextContexts,
    draftText: nextDraft,
  });
  applySkillContextsToSession(container);
  scheduleSkillComposerDraftFill(container, baseDraft, {
    threadId: activeThread.id,
    draftText: nextDraft,
  });
  showToast(`已将技能「${skillContext.skillTitle}」附加到当前会话`, {
    type: 'success',
  });
}

function getCurrentSessionSystemPrompt(container: HTMLElement): string {
  const fromSession = sessionSystemPrompt.trim();
  if (fromSession) {
    return fromSession;
  }
  const input = container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt');
  return input?.value.trim() || '';
}

/** 挂载技能时的短暂到达提示（FB1）：贴输入框上方 */
function showSkillLoadBanner(container: HTMLElement, skillTitle: string): void {
  placeSkillComposerChrome(container);
  const banner = findSkillLoadBanner(container);
  const text =
    banner?.querySelector<HTMLElement>('#deep-chat-skill-load-banner-text') ||
    container.querySelector<HTMLElement>('#deep-chat-skill-load-banner-text');
  if (!banner || !text) {
    return;
  }
  text.textContent = `正在载入技能「${skillTitle}」…`;
  banner.hidden = false;
  // 保证在输入框正上方。
  placeSkillLoadBannerAboveComposer(container);
  window.setTimeout(() => {
    if (banner.isConnected) {
      banner.hidden = true;
    }
  }, 2200);
}

function cloneSkillContexts(contexts: DeepChatSkillContext[]): DeepChatSkillContext[] {
  return contexts.map(context => ({
    skillId: context.skillId,
    skillTitle: context.skillTitle,
    skillRaw: context.skillRaw,
  }));
}

/**
 * 技能上下文 → 会话系统提示词。
 * 有技能：以技能派生为主并写回线程；
 * 无技能：使用线程已持久化的用户 systemPrompt（不含已移除技能的残留全文）。
 */
function applySkillContextsToSession(container: HTMLElement): void {
  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const skillPrompt = buildSystemPromptFromSkillContexts(contexts);
  const persisted = (activeThread.systemPrompt || '').trim();
  const systemPrompt = skillPrompt || (contexts.length === 0 ? persisted : '');

  sessionSystemPrompt = systemPrompt;
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  if (systemPromptInput) {
    systemPromptInput.value = systemPrompt;
  }

  // 有技能时把派生提示词写回线程，保证切会话/重载可恢复
  if (skillPrompt && skillPrompt !== persisted) {
    updateActiveThreadFields(container, { systemPrompt: skillPrompt });
  }

  warnIfSystemPromptOverBudget(systemPrompt);
}

/** 将当前线程的 temperature / systemPrompt 恢复到会话变量与调试面板 */
function applyThreadTuningToSession(container: HTMLElement | null): void {
  if (!container) {
    return;
  }
  const thread = getActiveThread();
  sessionTemperature =
    typeof thread.temperature === 'number' && Number.isFinite(thread.temperature)
      ? normalizeTemperature(String(thread.temperature))
      : 0.3;

  // 技能优先；否则用线程持久化 systemPrompt
  const skillPrompt = buildSystemPromptFromSkillContexts(thread.skillContexts || []);
  sessionSystemPrompt = skillPrompt || (thread.systemPrompt || '').trim();

  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>(
    '#deep-chat-temperature-value'
  );
  if (systemPromptInput) {
    systemPromptInput.value = sessionSystemPrompt;
  }
  if (temperatureInput) {
    temperatureInput.value = sessionTemperature.toFixed(1);
  }
  if (temperatureValue) {
    temperatureValue.value = sessionTemperature.toFixed(1);
  }
  updateTemperatureTrack(temperatureInput);
  syncDeepChatReasoningControlsFromThread(container);
}

function resolveSessionReasoningUiState(provider: string): {
  enabled: boolean;
  effort: 'low' | 'medium' | 'high';
} {
  const override = getActiveThread().reasoning;
  const global = normalizeReasoningUserPrefs(StorageService.getLLMConfig(provider)?.reasoningPrefs);
  return {
    enabled: override?.enabled !== undefined ? Boolean(override.enabled) : global.enabled,
    effort: parseReasoningEffortValue(override?.effort ?? global.effort),
  };
}

/** 按当前线程 + 全局默认同步推理控件（会话切换 / 重置） */
function syncDeepChatReasoningControlsFromThread(container: HTMLElement): void {
  const reasoningRoot = container.querySelector<HTMLElement>('#deep-chat-reasoning-controls');
  const reasoningEnabled = container.querySelector<HTMLInputElement>(
    '#deep-chat-reasoning-enabled'
  );
  const reasoningEffort = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');
  const config = currentConfig;
  const model = selectedModel || config?.model || '';
  if (!reasoningRoot || !config || !model) {
    if (reasoningRoot) {
      reasoningRoot.hidden = true;
    }
    return;
  }

  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
    preferredSurface: apiPath,
  });
  reasoningRoot.hidden = !shouldShowReasoningControls(cap);

  const { enabled, effort } = resolveSessionReasoningUiState(config.provider);
  if (reasoningEnabled) {
    reasoningEnabled.checked = enabled;
  }
  if (reasoningEffort) {
    reasoningEffort.value = effort;
    reasoningEffort.disabled = !enabled;
  }
}

/** 卸载 / 切会话前，把调试面板当前值写回线程 */
function saveActiveThreadTuning(container: HTMLElement): void {
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const systemPrompt = (systemPromptInput?.value ?? sessionSystemPrompt).trim();
  const temperature = temperatureInput
    ? normalizeTemperature(temperatureInput.value)
    : sessionTemperature;
  updateActiveThreadFields(container, {
    systemPrompt: systemPrompt || undefined,
    temperature,
  });
}

/** 挂载技能后若系统提示词超预算，即时预警（不必等到发送） */
function warnIfSystemPromptOverBudget(systemPrompt: string): void {
  const budgetError = getDeepChatSystemPromptBudgetError(systemPrompt);
  if (!budgetError) {
    return;
  }
  showToast(budgetError, {
    type: 'warning',
    description: '请缩短技能全文或系统提示词后再发送',
  });
}

/** 在 light DOM / shadow 中查找技能 UI 节点 */
function findSkillChromeElement(
  container: HTMLElement,
  id: SkillChromeElementId
): HTMLElement | null {
  const element =
    container.querySelector<HTMLElement>(`#${id}`) ||
    getChat(container)?.shadowRoot?.querySelector<HTMLElement>(`#${id}`) ||
    skillChromeElements.get(container)?.get(id) ||
    null;
  if (!element) {
    return null;
  }

  let elements = skillChromeElements.get(container);
  if (!elements) {
    elements = new Map();
    skillChromeElements.set(container, elements);
  }
  elements.set(id, element);
  return element;
}

function findSkillLoadBanner(container: HTMLElement): HTMLElement | null {
  return findSkillChromeElement(container, 'deep-chat-skill-load-banner');
}

/** 将技能载入提示挂入 deep-chat 输入列（#input），位于输入框正上方。 */
function placeSkillChromeInComposer(container: HTMLElement, element: HTMLElement): void {
  const inputArea = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#input');
  if (!inputArea) {
    return;
  }

  const textContainer = inputArea.querySelector('#text-input-container');
  const anchor: Element | null = textContainer;

  if (element.parentElement === inputArea) {
    if (anchor && element.nextElementSibling !== anchor && element !== anchor) {
      inputArea.insertBefore(element, anchor);
    }
    return;
  }

  if (anchor) {
    inputArea.insertBefore(element, anchor);
  } else {
    inputArea.prepend(element);
  }
}

function placeSkillLoadBannerAboveComposer(container: HTMLElement, attempts = 12): void {
  const banner = findSkillLoadBanner(container);
  const inputArea = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#input');
  if (!banner || !inputArea) {
    if (attempts > 0) {
      window.setTimeout(() => placeSkillLoadBannerAboveComposer(container, attempts - 1), 50);
    }
    return;
  }
  placeSkillChromeInComposer(container, banner);
}

function placeSkillComposerChrome(container: HTMLElement): void {
  placeSkillLoadBannerAboveComposer(container);
}

function observeSkillComposerChrome(container: HTMLElement, chat: DeepChatElement): void {
  skillComposerChromeObserver?.disconnect();
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  let observedInputArea = root.querySelector<HTMLElement>('#input');
  const recoverComposer = (shouldRestoreDraft: boolean): void => {
    if (getChat(container) !== chat || chat.shadowRoot !== root) {
      return;
    }
    if (shouldRestoreDraft) {
      restoreActiveThreadDraftInput(container);
    }
    syncSessionSkillChipDock(container);
    placeSkillComposerChrome(container);
    observeSubmitButtonPin(container, chat);
    syncSubmitStopButtonState(container);
  };

  skillComposerChromeObserver = new MutationObserver(mutations => {
    const inputArea = root.querySelector<HTMLElement>('#input');
    const inputWasRebuilt = inputArea !== observedInputArea;
    if (inputWasRebuilt) {
      observedInputArea = inputArea;
    }
    const affectsComposer = mutations.some(mutation => {
      if (mutation.target === inputArea) {
        return true;
      }
      return Array.from([...mutation.addedNodes, ...mutation.removedNodes]).some(
        node =>
          node === inputArea ||
          (node instanceof Element &&
            (node.id === 'input' || Boolean(node.querySelector('#input'))))
      );
    });
    if (inputArea && (inputWasRebuilt || affectsComposer)) {
      // MutationObserver 在下一帧之前运行；必须同步恢复，不能再排一层 rAF，
      // 否则 Deep Chat 重建输入框时会留下一个未定位的可见帧。
      recoverComposer(inputWasRebuilt);
    }
  });
  skillComposerChromeObserver.observe(root, {
    childList: true,
    subtree: true,
  });
}

/** 切换会话 / 重建 deep-chat 前，把载入提示挪回 light DOM，避免随 shadow 销毁。 */
function rescueSkillLoadBannerToStage(container: HTMLElement): void {
  const stage = container.querySelector<HTMLElement>('.deep-chat-stage');
  if (!stage) {
    return;
  }
  const banner = findSkillLoadBanner(container);
  if (banner && banner.parentElement !== stage) {
    stage.appendChild(banner);
  }
}

/** 从会话移除技能挂载，并同步输入框 Chip。 */
function dismissSessionSkillContext(container: HTMLElement, skillId: string): void {
  const activeThread = getActiveThread();
  const removed = (activeThread.skillContexts || []).find(context => context.skillId === skillId);
  if (!removed) {
    return;
  }

  const nextContexts = (activeThread.skillContexts || []).filter(
    context => context.skillId !== skillId
  );
  const input = getDraftInput(container);
  // serialize 会把 Chip 变成「技能名」；必须显式剥掉已移除技能，避免留下纯文本标题
  const rawDraft = input ? serializeDraftInput(input) : activeThread.draftText || '';
  // 不因剩余 skillContexts 强制回填输入框 Chip
  const nextDraft = stripSkillMarkersFromDraft(
    rawDraft,
    [removed.skillTitle],
    activeThread.skillContexts || []
  );
  // 同步系统提示词：剩余技能重建；全部移除则清空（避免残留技能全文）
  const nextSystemPrompt = buildSystemPromptFromSkillContexts(nextContexts);

  updateActiveThreadFields(container, {
    skillContexts: nextContexts.length > 0 ? nextContexts : undefined,
    draftText: nextDraft,
    systemPrompt: nextSystemPrompt || undefined,
  });
  applySkillContextsToSession(container);
  if (input) {
    setDraftInputWithInlineChips(input, nextDraft, nextContexts);
    notifyDeepChatComposerInput(input, nextDraft);
    syncDraftInputHeight(container, { instant: true });
  }
  syncSessionSkillChipDock(container);
}

/** 将 contenteditable 中的 Chip 与文本序列化为纯文本（Chip → 「技能名」） */
function serializeDraftInput(input: HTMLElement): string {
  return serializeChipContainingElement(input, getActiveThread().skillContexts || []);
}

/**
 * 写入草稿：正文含「技能名」标记时水合为 Chip DOM。
 * 调用方负责是否 prefix；本函数不因 skillContexts 自动前缀（避免发送清空后回填）。
 */
function setDraftInputWithInlineChips(
  input: HTMLElement,
  plainText: string,
  contexts: DeepChatSkillContext[]
): void {
  const normalized =
    contexts.length > 0 ? normalizeSkillChipDraftText(plainText, contexts) : plainText;
  if (contexts.length > 0 && textContainsSkillChipMarker(normalized, contexts)) {
    setContentWithInlineSkillChips(input, normalized, contexts, 'dismissible');
    return;
  }
  input.textContent = normalized;
}

/**
 * 程序化写入草稿后通知 deep-chat 内部 TextInput 状态。
 * 仅改 DOM 不派发 input 时，发送按钮可能无响应（需切会话重建才恢复）。
 */
function notifyDeepChatComposerInput(input: HTMLElement, text: string): void {
  input.dispatchEvent(createTextInputEvent(text));
}

/** 编辑消息回填：若正文含技能名标记则保持 Chip，否则纯文本（不恢复会话挂载） */
function refillComposerWithSkillChips(container: HTMLElement, plainText: string): void {
  const input = getDraftInput(container);
  if (!input) {
    return;
  }
  // 编辑回填用展示上下文（含历史标记），不重新挂载系统提示
  const contexts = collectDisplaySkillContexts({
    ...getActiveThread(),
    // 优先从待回填正文解析标记
    messages: [{ role: 'user', text: plainText, createdAt: 0 }],
  });
  const normalized = normalizeSkillChipDraftText(plainText, contexts);
  setDraftInputWithInlineChips(input, normalized, contexts);
  updateThreadDraft(threadStore.activeThreadId, normalized);
  syncSessionSkillChipDock(container);
  // 必须通知 deep-chat，否则 submitFromInput 可能仍视为空/状态未刷新
  notifyDeepChatComposerInput(input, normalized);
  // deep-chat 可能用 innerText 回写并注入换行：再规范一次并同步草稿
  window.setTimeout(() => {
    const latestInput = getDraftInput(container);
    if (!latestInput) {
      return;
    }
    const after = serializeDraftInput(latestInput);
    const refillContexts = collectDisplaySkillContexts({
      ...getActiveThread(),
      messages: [{ role: 'user', text: after, createdAt: 0 }],
    });
    const cleaned = normalizeSkillChipDraftText(after, refillContexts);
    if (cleaned !== after) {
      setDraftInputWithInlineChips(latestInput, cleaned, refillContexts);
      updateThreadDraft(threadStore.activeThreadId, cleaned);
    } else if (after !== normalized) {
      updateThreadDraft(threadStore.activeThreadId, after);
    }
    syncDraftInputHeight(container, { instant: true });
  }, 0);
  syncDraftInputHeight(container, { instant: true });
  getChat(container)?.focusInput?.();
}

/**
 * 恢复草稿：仅当草稿文本本身含技能标记时才水合 Chip DOM。
 * 发送清空后 / 空草稿 + 仍有 skillContexts 时，不把 Chip 塞回输入框。
 */
function shouldRewriteComposerDraft(
  input: HTMLElement,
  draftText: string,
  contexts: DeepChatSkillContext[],
  hasMarkers: boolean
): boolean {
  const serialized = serializeDraftInput(input);
  if (hasMarkers) {
    return serialized !== draftText || !composerHasSessionSkillChips(input, contexts);
  }
  return Boolean(input.querySelector(`.${SKILL_CHIP_CLASS}`)) || serialized !== draftText;
}

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
  const rawDraft = activeThread.draftText || serializeDraftInput(input) || '';
  const { draftText, hasMarkers } = resolveComposerDraftText(rawDraft, contexts);
  if (shouldRewriteComposerDraft(input, draftText, contexts, hasMarkers)) {
    setDraftInputWithInlineChips(input, draftText, contexts);
    if (draftText !== (activeThread.draftText || '')) {
      updateThreadDraft(activeThread.id, draftText);
    }
  }
  syncSessionSkillChipDock(container);
  syncDraftInputHeight(container, { instant: true });
}

function bindInlineSkillChipControls(container: HTMLElement, root: ShadowRoot): void {
  cleanupInlineSkillChipControls?.();
  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const dismissBtn = target?.closest<HTMLElement>('[data-action="dismiss-skill-context"]');
    if (!dismissBtn?.dataset.skillId) return;
    const input = getDraftInput(container);
    const dock = root.querySelector<HTMLElement>(`#${SESSION_SKILL_CHIP_DOCK_ID}`);
    if (!input?.contains(dismissBtn) && !dock?.contains(dismissBtn)) return;
    event.preventDefault();
    event.stopPropagation();
    dismissSessionSkillContext(container, dismissBtn.dataset.skillId);
  };
  root.addEventListener('click', onClick);
  cleanupInlineSkillChipControls = () => {
    root.removeEventListener('click', onClick);
  };
}

/** 这些字段变化才应影响「最近会话」排序；调参/切会话写回不应打乱列表 */
const THREAD_ACTIVITY_SORT_KEYS = new Set([
  'messages',
  'title',
  'customTitle',
  'pinnedAt',
  'skillContexts',
  'draftText',
]);

function updateActiveThreadFields(container: HTMLElement, fields: Partial<DeepChatThread>): void {
  const activeThread = getActiveThread();
  if (!hasThreadFieldChanges(activeThread, fields)) {
    return;
  }

  const bumpsSortOrder = Object.keys(fields).some(key => THREAD_ACTIVITY_SORT_KEYS.has(key));
  const nextThread: DeepChatThread = {
    ...activeThread,
    ...fields,
    updatedAt: bumpsSortOrder ? Date.now() : activeThread.updatedAt,
  };

  // 显式清空时删除可选字段（避免 undefined 持久化为 null 语义）
  if ('skillContexts' in fields && !fields.skillContexts) {
    delete nextThread.skillContexts;
  }
  if ('systemPrompt' in fields && !fields.systemPrompt) {
    delete nextThread.systemPrompt;
  }

  // 保持 threads 数组相对顺序，避免仅因写回字段就把当前会话挪到首位
  threadStore = {
    activeThreadId: nextThread.id,
    threads: threadStore.threads
      .map(thread => (thread.id === nextThread.id ? nextThread : thread))
      .slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  refreshChatSearchResultsIfOpen(container);
}

function hasThreadFieldChanges(thread: DeepChatThread, fields: Partial<DeepChatThread>): boolean {
  for (const [key, value] of Object.entries(fields) as Array<
    [keyof DeepChatThread, DeepChatThread[keyof DeepChatThread]]
  >) {
    const current = thread[key];
    if (key === 'skillContexts') {
      if (JSON.stringify(current ?? null) !== JSON.stringify(value ?? null)) {
        return true;
      }
      continue;
    }
    if (value === undefined) {
      if (current !== undefined && current !== '') {
        return true;
      }
      continue;
    }
    if (current !== value) {
      return true;
    }
  }
  return false;
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

/**
 * 技能挂载后写入输入框：业务草稿 + 技能 Chip（用户可见）。
 * 与 fillPromptDraftInput 分离，避免普通 Prompt 填入也强制前缀 Chip。
 */
type SkillComposerDraftFillTarget = {
  threadId: string;
  draftText: string;
};

function scheduleSkillComposerDraftFill(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget
): void {
  for (const delay of [0, 80, 200]) {
    window.setTimeout(() => fillSkillComposerDraft(container, businessDraft, target), delay);
  }
}

function retrySkillComposerDraftFill(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget,
  attempts: number
): void {
  if (attempts <= 0) {
    return;
  }
  window.setTimeout(
    () => fillSkillComposerDraft(container, businessDraft, target, attempts - 1),
    50
  );
}

function applySkillComposerDraft(
  container: HTMLElement,
  input: HTMLElement,
  businessDraft: string,
  skillContexts: DeepChatSkillContext[],
  threadId: string
): void {
  const normalizedPrompt =
    skillContexts.length > 0
      ? prefixDraftWithSkillContexts(businessDraft, skillContexts)
      : businessDraft;
  setDraftInputWithInlineChips(input, normalizedPrompt, skillContexts);
  updateThreadDraft(threadId, normalizedPrompt);
  syncSessionSkillChipDock(container);
  placeSkillComposerChrome(container);
  syncDraftInputHeight(container, { instant: true });
  notifyDeepChatComposerInput(input, normalizedPrompt);
}

function fillSkillComposerDraft(
  container: HTMLElement,
  businessDraft: string,
  target: SkillComposerDraftFillTarget,
  attempts = 10
): void {
  const activeThread = getActiveThread();
  if (activeThread.id !== target.threadId || (activeThread.draftText || '') !== target.draftText) {
    return;
  }

  const chat = getChat(container);
  const input = chat?.shadowRoot?.querySelector<HTMLElement>('#text-input');
  const skillContexts = activeThread.skillContexts || [];

  if (!chat || !input) {
    retrySkillComposerDraftFill(container, businessDraft, target, attempts);
    return;
  }

  applySkillComposerDraft(container, input, businessDraft, skillContexts, activeThread.id);

  // 若 Chip DOM 仍未就绪，继续重试
  if (skillContexts.length > 0 && !composerHasSessionSkillChips(input, skillContexts)) {
    retrySkillComposerDraftFill(container, businessDraft, target, attempts);
  }
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
  // 普通 Prompt 填入：不强制 Chip；若草稿已含技能标记则保留 Chip 形态
  const normalizedPrompt =
    skillContexts.length > 0 && textContainsSkillChipMarker(prompt, skillContexts)
      ? normalizeSkillChipDraftText(prompt, skillContexts)
      : prompt;
  setDraftInputWithInlineChips(input, normalizedPrompt, skillContexts);
  updateThreadDraft(threadStore.activeThreadId, normalizedPrompt);
  syncSessionSkillChipDock(container);
  syncDraftInputHeight(container, { instant: true });
  // 始终通知 deep-chat（否则附加到当前会话后发送可能无响应）
  notifyDeepChatComposerInput(input, normalizedPrompt);
  window.setTimeout(() => {
    settleFilledPromptDraft({
      container,
      chat,
      prompt,
      normalizedPrompt,
      skillContexts,
      attempts,
    });
  }, 80);
}

function retryOrWarnPromptDraft(container: HTMLElement, prompt: string, attempts: number): void {
  if (attempts > 0) {
    fillPromptDraftInput(container, prompt, attempts - 1);
    return;
  }
  showToast('已创建新会话，但输入框尚未就绪，请稍后重试', {
    type: 'warning',
  });
}

function settleFilledPromptDraft(options: {
  container: HTMLElement;
  chat: DeepChatElement;
  prompt: string;
  normalizedPrompt: string;
  skillContexts: DeepChatSkillContext[];
  attempts: number;
}): void {
  const { container, chat, prompt, normalizedPrompt, skillContexts, attempts } = options;
  const latestInput = getChat(container)?.shadowRoot?.querySelector<HTMLElement>('#text-input');
  if (!latestInput) {
    retryOrWarnPromptDraft(container, prompt, attempts);
    return;
  }

  // 回写后可能注入换行：再规范一次
  const latestText = serializeDraftInput(latestInput);
  const cleaned = normalizeSkillChipDraftText(latestText, getActiveThread().skillContexts || []);
  if (cleaned !== latestText) {
    setDraftInputWithInlineChips(latestInput, cleaned, getActiveThread().skillContexts || []);
    updateThreadDraft(threadStore.activeThreadId, cleaned);
  }

  const matched =
    cleaned === normalizedPrompt ||
    cleaned.includes(normalizedPrompt) ||
    latestText === normalizedPrompt;
  if (!matched) {
    retryOrWarnPromptDraft(container, prompt, attempts);
    return;
  }

  chat.focusInput?.();
  if (skillContexts.length === 0) {
    showToast('已创建新会话并填入 Prompt，确认后可手动发送', {
      type: 'success',
    });
  }
  syncDraftInputHeight(container, { instant: true });
}

function switchThread(container: HTMLElement, threadId: string): void {
  if (threadId === threadStore.activeThreadId) {
    return;
  }

  if (!threadStore.threads.some(thread => thread.id === threadId)) {
    return;
  }

  // 允许在「生成中/输出中」切走：上一会话的打字机在后台静默推进直至完成（不 clear timer）
  saveActiveThreadDraft(container);
  saveActiveThreadTuning(container);
  clearThreadUnread(threadId);
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
  applyThreadTuningToSession(container);
  hydrateActiveThreadInlineSkillChips(container);
  // 目标会话若仍在生成/输出，确保有 drain 在跑（可能已在后台 tick）；始终同步 chrome
  if (pendingRequests.has(threadId)) {
    schedulePendingAssistantDisplay(threadId);
  }
  // replaceChat 换了 deep-chat 节点：必须重绑 observer + 多帧补挂 已完成/深度思考
  remountDeepThinkingChromeAfterChatReplace(container);
  // Re-sync toolbar badges (e.g. clear stale 「未完成」 from store after settle)
  refreshMessageToolbarStatuses(getChat(container), () =>
    getThreadDisplayMessages(getActiveThread())
  );
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

  rescueSkillLoadBannerToStage(container);
  // Detached bubble DOM must not keep receiving typewriter ticks.
  stopReasoningTypewriter();
  disconnectChromeMutationObserver();

  if (typeof chat.clearMessages === 'function') {
    chat.clearMessages(true);
  }

  const nextChat = document.createElement('deep-chat') as DeepChatElement;
  nextChat.id = 'deep-chat-view';
  nextChat.className = 'deep-chat-view';
  nextChat.style.fontFamily = DEEP_CHAT_SYSTEM_FONT_STACK;
  chat.replaceWith(nextChat);
  initDeepChat(container);
  placeSkillComposerChrome(container);
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
      assistantReasoning: options.assistantReasoning,
      assistantReasoningDurationSec: options.assistantReasoningDurationSec,
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
  if (container && !options.skipUiRefresh) {
    renderHistoryThreadList(container);
    refreshChatSearchResultsIfOpen(container);
    syncPendingStatus(container);
    syncSessionSkillChipDock(container);
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

/**
 * Messages shown in deep-chat history + message toolbars.
 * Live pending: no toolbar status badge — progress is only via generation chrome
 * (思考中 / 深度思考 / 正在生成回复 · 已收到 N 字).
 * Interrupted recovery (no pending): store may keep status 「未完成」.
 */
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
      // Keep reasoning metadata on the live AI slot so remount after switchThread
      // can still paint 深度思考 / 已完成 even before the next stream delta.
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
    }
  );

  // Live request: strip 「未完成」 only on the live trailing AI (chrome owns progress).
  // Historical partial/stopped badges must remain stable across switch/remount.
  const withoutLivePartial = stripLiveTrailingPartialStatus(displayMessages);

  if (pendingRequest.displayedAssistantText.trim()) {
    return withoutLivePartial;
  }

  // 占位 AI 槽位；进行中状态只走 chrome（正在生成回复...），不打 toolbar 徽章
  return [
    ...withoutLivePartial,
    {
      role: 'ai',
      text: '\u200b',
      createdAt: pendingRequest.startedAt,
      ...(pendingRequest.reasoningText.trim() ? { reasoning: pendingRequest.reasoningText } : {}),
      reasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
    },
  ];
}

/**
 * While a request is in flight, hide 「未完成」 on the trailing AI only.
 * Keep older partial/stopped badges so switch-thread does not erase history status.
 */
function stripLiveTrailingPartialStatus(messages: DeepChatMessage[]): DeepChatMessage[] {
  let lastAiIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isAssistantMessageRole(messages[i]?.role)) {
      lastAiIndex = i;
      break;
    }
  }
  if (lastAiIndex < 0) {
    return messages;
  }

  return messages.map((message, index) => {
    if (index !== lastAiIndex || message.status !== 'partial') {
      return message;
    }
    const { status: _partial, ...rest } = message;
    return rest;
  });
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
  persistPendingPartialIfNeeded(pendingRequest);
}

/** 节流把已接收 stream 文本写入会话存储，刷新后可恢复半截回复 */
function persistPendingPartialIfNeeded(
  pendingRequest: PendingDeepChatRequest,
  options: { force?: boolean } = {}
): void {
  if (
    !shouldPersistPendingDeepChatPartial(pendingRequest, {
      minChars: PENDING_PARTIAL_PERSIST_MIN_CHARS,
      minIntervalMs: PENDING_PARTIAL_PERSIST_MIN_MS,
      force: options.force,
    })
  ) {
    return;
  }

  const assistantText = pendingRequest.assistantText.trim();
  if (!assistantText || !threadExists(pendingRequest.threadId)) {
    return;
  }

  saveThreadMessages(
    getMountedRenderContainer(),
    pendingRequest.conversationMessages,
    assistantText,
    {
      threadId: pendingRequest.threadId,
      assistantCreatedAt: pendingRequest.startedAt,
      assistantStatus: 'partial',
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      skipUiRefresh: true,
    }
  );
  markPendingDeepChatPartialPersisted(pendingRequest);
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

  // 非当前会话也继续调度：后台静默推进 displayed 文本直至完成
  if (pendingDisplayTimers.has(threadId)) {
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
  if (!pendingRequest) {
    return;
  }

  const wasSettled = pendingRequest.isSettled;
  // 未挂载页面：跳过打字机节流，直接同步到已接收全文，保证后台可完成结算
  const nextDisplayText = getMountedRenderContainer()
    ? getNextPendingAssistantDisplayText(pendingRequest)
    : pendingRequest.assistantText;
  markPendingDeepChatAssistantTextDisplayed(pendingRequest, nextDisplayText);

  const container = getRenderContainerForThread(threadId);
  if (container) {
    renderPendingAssistantDisplay(container, pendingRequest);
    syncPendingStatus(container);
  }
  // 无 container：仅推进内存中的 displayedAssistantText（静默输出）

  // 不在每个打字机 tick 重绘会话列表（会打掉点击）；仅状态翻转时刷新 meta
  if (wasSettled !== pendingRequest.isSettled) {
    renderMountedThreadList();
  }

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

  // 空内容时不把「正在生成」写进气泡正文，改由气泡前 inline status 展示
  const text = pendingRequest.displayedAssistantText.trim() || '\u200b';
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

  // 后台完成：极简未读实心圆点；当前会话完成则不标未读
  notifyBackgroundPendingSettled(threadId);

  const container = getRenderContainerForThread(threadId);
  if (container) {
    // Immediate + deferred remount: deep-chat may rebuild the AI bubble one
    // or two frames after addMessage overwrite, which drops settled chrome.
    syncAllDeepThinkingChrome(container);
    scheduleDeepThinkingChromeRetry(container);
    refreshMessageToolbarStatuses(getChat(container), () =>
      getThreadDisplayMessages(getActiveThread())
    );
    window.setTimeout(() => {
      if (getRenderContainerForThread(threadId) === container) {
        syncAllDeepThinkingChrome(container);
        refreshMessageToolbarStatuses(getChat(container), () =>
          getThreadDisplayMessages(getActiveThread())
        );
      }
    }, 80);
  }
}

/** 非当前会话的生成一旦 settle，立即标未读并刷新侧栏（不等打字机播完） */
function notifyBackgroundPendingSettled(threadId: string): void {
  if (threadStore.activeThreadId === threadId) {
    renderMountedThreadList();
    return;
  }

  markThreadUnread(threadId);
  renderMountedThreadList();
}

function markThreadUnread(threadId: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread || thread.hasUnread) {
    return;
  }

  threadStore = {
    ...threadStore,
    threads: threadStore.threads.map(item =>
      item.id === threadId ? { ...item, hasUnread: true } : item
    ),
  };
  persistThreadStoreNow();
}

function clearThreadUnread(threadId: string): void {
  const thread = threadStore.threads.find(item => item.id === threadId);
  if (!thread?.hasUnread) {
    return;
  }

  threadStore = {
    ...threadStore,
    threads: threadStore.threads.map(item => {
      if (item.id !== threadId) {
        return item;
      }
      const next = { ...item };
      delete next.hasUnread;
      return next;
    }),
  };
  // 调用方会 persist / 重绘；此处仅更新内存。若仅清未读也需落盘：
  persistThreadStoreNow();
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
    // Soft remount after switch-page: keep partial assistant text + status for recovery.
    // Empty assistant used to wipe force-persisted 「未完成」 mid-stream.
    const assistantText = pendingRequest.assistantText.trim();
    const storedMessages = buildStoredThreadMessages(
      existingThread?.messages || [],
      pendingRequest.conversationMessages,
      assistantText,
      {
        now: pendingRequest.startedAt,
        assistantCreatedAt: pendingRequest.startedAt,
        ...(assistantText && !pendingRequest.isSettled
          ? { assistantStatus: 'partial' as const }
          : {}),
        assistantReasoning: pendingRequest.reasoningText,
        assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      }
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

  // 先 replace 再挂 inline chrome，避免 status 被 chat 重建冲掉
  if (options.replaceChat) {
    replaceChat(container);
  }
  syncPendingStatus(container);
}

function disconnectChromeMutationObserver(): void {
  pendingChromeObserver?.disconnect();
  pendingChromeObserver = null;
  pendingChromeObservedChat = null;
}

function clearChromeRetrySchedule(): void {
  if (pendingChromeRetryRaf !== null) {
    window.cancelAnimationFrame(pendingChromeRetryRaf);
    pendingChromeRetryRaf = null;
  }
  for (const id of pendingChromeRetryTimeouts) {
    window.clearTimeout(id);
  }
  pendingChromeRetryTimeouts = [];
}

function clearPendingChromeObserver(): void {
  disconnectChromeMutationObserver();
  clearChromeRetrySchedule();
  if (reasoningTypewriterTimer !== null) {
    window.clearTimeout(reasoningTypewriterTimer);
    reasoningTypewriterTimer = null;
  }
  clearWaitingStatusRotateTimer();
}

function clearWaitingStatusRotateTimer(): void {
  if (waitingStatusRotateTimer !== null) {
    window.clearInterval(waitingStatusRotateTimer);
    waitingStatusRotateTimer = null;
  }
}

function ensureWaitingStatusRotateTimer(): void {
  if (waitingStatusRotateTimer !== null) {
    return;
  }
  waitingStatusRotateTimer = window.setInterval(() => {
    const container = getMountedRenderContainer();
    const pending = pendingRequests.get(threadStore.activeThreadId);
    if (!container || !pending || getDeepChatGenerationPhase(pending) !== 'waiting') {
      clearWaitingStatusRotateTimer();
      return;
    }
    syncPendingStatus(container);
  }, WAITING_STATUS_ROTATE_MS);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function clearStreamingGenerationChrome(chat: DeepChatElement | null): void {
  chat?.classList.remove(PENDING_GENERATION_HOST_CLASS);
  chat?.shadowRoot
    ?.querySelectorAll(`.${GENERATION_CHROME_CLASS}.is-streaming`)
    .forEach(node => node.remove());
  // Do NOT disconnect MutationObserver here — deep-chat often rebuilds the last
  // AI bubble after settle; without the observer 「已完成」 never remounts.
}

function isAssistantMessageRole(role?: string): boolean {
  return role === 'ai' || role === 'assistant';
}

function listAiMessageHosts(root: ShadowRoot): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    [
      '.deep-chat-outer-container-role-ai .inner-message-container',
      '.outer-message-container.deep-chat-outer-container-role-ai .inner-message-container',
    ].join(', ')
  );
  if (nodes.length > 0) {
    return Array.from(nodes);
  }

  const fallback: HTMLElement[] = [];
  const loadingDots = root.querySelector<HTMLElement>('.deep-chat-loading-message-dots-container');
  if (loadingDots?.parentElement instanceof HTMLElement) {
    fallback.push(loadingDots.parentElement);
  } else {
    const loadingBubble = root.querySelector<HTMLElement>(
      '.deep-chat-loading-message-bubble, .message-bubble.deep-chat-loading-message-bubble'
    );
    if (loadingBubble?.parentElement instanceof HTMLElement) {
      fallback.push(loadingBubble.parentElement);
    }
  }
  return fallback;
}

function buildSettledDtKey(threadId: string, aiIndex: number, message: DeepChatMessage): string {
  const stamp = message.createdAt ?? 0;
  const snippet = (message.text || message.content || '').slice(0, 32);
  return `${threadId}:ai${aiIndex}:${stamp}:${snippet}`;
}

function findMessageBubbleAnchor(host: HTMLElement): HTMLElement | null {
  return (
    host.querySelector<HTMLElement>(
      [
        ':scope > .message-bubble',
        ':scope > .deep-chat-loading-message-bubble',
        ':scope > .deep-chat-loading-message-dots-container',
        '.message-bubble',
        '.deep-chat-loading-message-bubble',
        '.deep-chat-loading-message-dots-container',
      ].join(', ')
    ) ?? null
  );
}

/**
 * Reading order before formal reply:
 * 1) 深度思考
 * 2) 正在生成回复…
 * 3) message bubble
 */
function placeGenerationChromeRoot(host: HTMLElement, chromeRoot: HTMLElement): void {
  const anchor = findMessageBubbleAnchor(host);
  if (chromeRoot.parentElement !== host) {
    if (anchor) {
      host.insertBefore(chromeRoot, anchor);
    } else {
      host.prepend(chromeRoot);
    }
    return;
  }
  if (anchor && chromeRoot.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_PRECEDING) {
    host.insertBefore(chromeRoot, anchor);
  }
}

/** Inline SVG chevron (shadow DOM has no Font Awesome). Collapsed: >; expanded: rotate to v. */
function createChevronIcon(doc: Document): HTMLElement {
  const wrap = doc.createElement('span');
  wrap.className = 'deep-chat-dt-chevron';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('focusable', 'false');

  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  // Chevron pointing right (>)
  path.setAttribute('d', 'M6 3.2 L11 8 L6 12.8');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  wrap.appendChild(svg);
  return wrap;
}

function setToggleExpanded(toggle: HTMLElement, expanded: boolean): void {
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggle.classList.toggle('is-expanded', expanded);
}

function prefersInstantReasoningText(): boolean {
  return prefersReducedMotion();
}

function stopReasoningTypewriter(): void {
  if (reasoningTypewriterTimer !== null) {
    window.clearTimeout(reasoningTypewriterTimer);
    reasoningTypewriterTimer = null;
  }
  reasoningTypewriterTextEl = null;
}

/**
 * Streaming-only typewriter. Reads full text live each tick so collapse→expand
 * and late reasoning chunks keep advancing (no stale snapshot freeze).
 */
function scheduleReasoningTypewriter(
  textEl: HTMLElement,
  getFullText: () => string,
  getDisplayed: () => number,
  setDisplayed: (n: number) => void,
  isActive: () => boolean
): void {
  stopReasoningTypewriter();
  reasoningTypewriterTextEl = textEl;

  const run = (): void => {
    if (!isActive() || reasoningTypewriterTextEl !== textEl || !textEl.isConnected) {
      reasoningTypewriterTimer = null;
      if (reasoningTypewriterTextEl === textEl) {
        reasoningTypewriterTextEl = null;
      }
      return;
    }
    const full = getFullText();
    let displayed = getDisplayed();
    if (prefersInstantReasoningText() || displayed >= full.length) {
      if (textEl.textContent !== full) {
        textEl.textContent = full;
      }
      setDisplayed(full.length);
      textEl.scrollTop = textEl.scrollHeight;
      // Stay armed: more reasoning may still arrive while expanded.
      // Next ensureStreamingDeepThinkingBlock / resume will restart if full grows.
      reasoningTypewriterTimer = null;
      return;
    }
    displayed = Math.min(full.length, displayed + REASONING_TYPEWRITER_CHARS);
    setDisplayed(displayed);
    textEl.textContent = full.slice(0, displayed);
    textEl.scrollTop = textEl.scrollHeight;
    reasoningTypewriterTimer = window.setTimeout(run, REASONING_TYPEWRITER_INTERVAL_MS);
  };

  run();
}

function isStreamingReasoningTypewriterActive(pending: PendingDeepChatRequest): boolean {
  return (
    pending.reasoningUiExpanded === true &&
    !pending.isSettled &&
    pendingRequests.get(pending.threadId) === pending &&
    threadStore.activeThreadId === pending.threadId
  );
}

function resumeStreamingReasoningTypewriter(
  textEl: HTMLElement,
  pending: PendingDeepChatRequest
): void {
  if (pending.reasoningDisplayedLength === undefined) {
    pending.reasoningDisplayedLength = 0;
  }
  // Already driving this live `<pre>`: each tick re-reads pending.reasoningText.
  // Skip restart on every reasoning chunk (avoids jank). Remounted nodes rebind.
  if (
    reasoningTypewriterTimer !== null &&
    reasoningTypewriterTextEl === textEl &&
    textEl.isConnected &&
    isStreamingReasoningTypewriterActive(pending)
  ) {
    return;
  }
  scheduleReasoningTypewriter(
    textEl,
    () => pending.reasoningText,
    () => pending.reasoningDisplayedLength ?? 0,
    n => {
      pending.reasoningDisplayedLength = n;
    },
    () => isStreamingReasoningTypewriterActive(pending)
  );
}

function getChromeOnHost(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(`:scope > .${GENERATION_CHROME_CLASS}`);
}

function ensureGenerationChromeOnHost(
  host: HTMLElement,
  key: string,
  mode: 'streaming' | 'settled'
): HTMLElement {
  let chrome = getChromeOnHost(host);
  if (!chrome) {
    chrome = host.ownerDocument.createElement('div');
    chrome.className = GENERATION_CHROME_CLASS;
  }
  chrome.dataset.dtKey = key;
  chrome.classList.toggle('is-streaming', mode === 'streaming');
  chrome.classList.toggle('is-settled', mode === 'settled');
  return chrome;
}

function ensureStreamingDeepThinkingBlock(
  chrome: HTMLElement,
  reasoningText: string,
  pending: PendingDeepChatRequest
): void {
  const doc = chrome.ownerDocument;
  let block = chrome.querySelector<HTMLElement>('.deep-chat-dt-stream');
  if (!block) {
    block = doc.createElement('div');
    block.className = 'deep-chat-dt-stream';

    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'deep-chat-dt-toggle';
    toggle.setAttribute('aria-expanded', 'false');

    const label = doc.createElement('span');
    label.className = 'deep-chat-dt-label';
    label.textContent = '深度思考';
    toggle.append(label, createChevronIcon(doc));

    const body = doc.createElement('div');
    body.className = 'deep-chat-dt-body';
    body.hidden = true;
    const text = doc.createElement('pre');
    text.className = 'deep-chat-dt-text';
    body.append(text);

    toggle.addEventListener('click', () => {
      const next = !pending.reasoningUiExpanded;
      pending.reasoningUiExpanded = next;
      setToggleExpanded(toggle, next);
      body.hidden = !next;
      if (next) {
        // Resume from displayed cursor; live full text so output does not freeze.
        resumeStreamingReasoningTypewriter(text, pending);
      } else {
        // Pause only — keep reasoningDisplayedLength so re-expand continues.
        stopReasoningTypewriter();
      }
    });

    block.append(toggle, body);
    chrome.append(block);
  }

  const toggle = block.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const body = block.querySelector<HTMLElement>('.deep-chat-dt-body');
  const text = block.querySelector<HTMLElement>('.deep-chat-dt-text');
  if (!toggle || !body || !text) {
    return;
  }

  const expanded = Boolean(pending.reasoningUiExpanded);
  setToggleExpanded(toggle, expanded);
  body.hidden = !expanded;

  const full = reasoningText;
  if (!full.trim()) {
    block.hidden = true;
    return;
  }
  block.hidden = false;

  // Collapsed: keep cursor; do not drive the typewriter timer.
  if (!expanded) {
    return;
  }

  paintOrResumeStreamingReasoning(text, pending, full);
}

function paintOrResumeStreamingReasoning(
  textEl: HTMLElement,
  pending: PendingDeepChatRequest,
  full: string
): void {
  if (prefersInstantReasoningText()) {
    textEl.textContent = full;
    pending.reasoningDisplayedLength = full.length;
    stopReasoningTypewriter();
    return;
  }

  const displayed = pending.reasoningDisplayedLength ?? 0;
  if (displayed >= full.length) {
    if (textEl.textContent !== full) {
      textEl.textContent = full;
    }
    pending.reasoningDisplayedLength = full.length;
    return;
  }

  // New chunks or re-expand with remaining text → keep typewriter running.
  resumeStreamingReasoningTypewriter(textEl, pending);
}

function hideStatusInChrome(chrome: HTMLElement): void {
  const statusEl = chrome.querySelector<HTMLElement>('#' + INLINE_PENDING_STATUS_ID);
  if (statusEl) {
    statusEl.hidden = true;
    // Remove so waiting copy cannot flash back via stale DOM / CSS edge cases
    statusEl.remove();
  }
}

function getWaitingStatusLabel(pending: PendingDeepChatRequest, now = Date.now()): string {
  const elapsed = Math.max(0, now - pending.startedAt);
  const index = Math.floor(elapsed / WAITING_STATUS_ROTATE_MS) % WAITING_STATUS_LABELS.length;
  return WAITING_STATUS_LABELS[index] ?? WAITING_STATUS_LABELS[0];
}

function getGeneratingStatusLabel(pending: PendingDeepChatRequest): string {
  const charCount = pending.assistantText.trim().length;
  if (charCount === 0) {
    return PENDING_GENERATING_PREFIX;
  }
  return `${PENDING_GENERATING_PREFIX} · 已收到 ${charCount.toLocaleString('zh-CN')} 字`;
}

/**
 * Live status for toolbar end — waiting / generating only.
 * Once 深度思考 starts (phase === reasoning), hide 「思考中… / 等待模型响应…」
 * so waiting copy does not sit next to the reasoning chrome as visual noise.
 */
function getActiveLiveGenerationStatusLabel(): string | null {
  const pending = pendingRequests.get(threadStore.activeThreadId);
  if (!pending || pending.isSettled) {
    return null;
  }
  const phase = getDeepChatGenerationPhase(pending);
  if (phase === 'waiting') {
    return getWaitingStatusLabel(pending);
  }
  if (phase === 'generating') {
    return getGeneratingStatusLabel(pending);
  }
  // reasoning | settled: no toolbar live status (深度思考 / 已完成 own the UI)
  return null;
}

/**
 * Phase-driven streaming chrome (above bubble):
 * waiting  → no bubble chrome (status lives on toolbar end only)
 * reasoning → 深度思考 only
 * generating → 深度思考 (if any); 「正在生成回复 · 已收到 N 字」 on toolbar end
 * body typewriter sits in message bubble
 *
 * Critical: never create-then-remove empty chrome on waiting/no-reasoning paths.
 * That thrash + MutationObserver remount freezes the page (edit → resend repro).
 */
function mountStreamingGenerationChrome(host: HTMLElement, pending: PendingDeepChatRequest): void {
  const phase = getDeepChatGenerationPhase(pending);
  const hasReasoning = Boolean(pending.reasoningText.trim());

  if (phase === 'waiting') {
    // Do not touch bubble chrome DOM — toolbar owns waiting status.
    ensureWaitingStatusRotateTimer();
    refreshLiveGenerationToolbarStatus();
    return;
  }

  clearWaitingStatusRotateTimer();

  if (!liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning)) {
    // generating without reasoning: drop stray empty streaming chrome once, idempotently
    const existing = getChromeOnHost(host);
    if (
      existing?.classList.contains('is-streaming') &&
      !existing.querySelector('.deep-chat-dt-stream') &&
      !existing.querySelector('.deep-chat-dt-settled')
    ) {
      existing.remove();
    }
    refreshLiveGenerationToolbarStatus();
    return;
  }

  const chrome = ensureGenerationChromeOnHost(host, STREAMING_DT_KEY, 'streaming');
  // Drop settled nodes only on this generating host (history 已完成 stays on earlier hosts)
  chrome.querySelector('.deep-chat-dt-settled')?.remove();
  // Status line no longer sits above the bubble — toolbar end owns it.
  hideStatusInChrome(chrome);

  if (phase === 'reasoning' || hasReasoning) {
    ensureStreamingDeepThinkingBlock(chrome, pending.reasoningText, pending);
    placeGenerationChromeRoot(host, chrome);
  }
  refreshLiveGenerationToolbarStatus();
}

function refreshLiveGenerationToolbarStatus(): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  refreshMessageToolbarStatuses(getChat(container), () =>
    getThreadDisplayMessages(getActiveThread())
  );
}

function formatCompletedDurationLabel(durationSec: number): string {
  return `已完成 ${Math.max(0, Math.round(durationSec))}s`;
}

function getOrCreateSettledUiState(uiKey: string): {
  doneOpen: boolean;
  deepOpen: boolean;
  displayedLength: number;
} {
  let state = settledDeepThinkingUi.get(uiKey);
  if (!state) {
    state = { doneOpen: false, deepOpen: false, displayedLength: 0 };
    settledDeepThinkingUi.set(uiKey, state);
  }
  return state;
}

/**
 * Settled chrome: always show 「已完成 Xs」 after a generation finishes.
 * Nested 「深度思考」 only when reasoning text is non-empty.
 */
function mountSettledDeepThinkingChrome(
  host: HTMLElement,
  reasoningText: string,
  durationSec: number,
  uiKey: string
): void {
  const full = reasoningText.trim();
  const chrome = ensureGenerationChromeOnHost(host, uiKey, 'settled');
  chrome.querySelector('.deep-chat-dt-stream')?.remove();
  chrome.querySelector('#' + INLINE_PENDING_STATUS_ID)?.remove();

  const doc = host.ownerDocument;
  let settled = chrome.querySelector<HTMLElement>('.deep-chat-dt-settled');
  if (!settled) {
    settled = createSettledDeepThinkingDom(doc, uiKey);
    chrome.append(settled);
  }

  // Keep latest text/duration on the node so click handlers stay current after remounts
  settled.dataset.dtFull = full;
  settled.dataset.dtDuration = String(Math.max(0, Math.round(durationSec)));

  applySettledDeepThinkingUi(settled, full, durationSec, uiKey);
  placeGenerationChromeRoot(host, chrome);
}

function createSettledDeepThinkingDom(doc: Document, uiKey: string): HTMLElement {
  const settled = doc.createElement('div');
  settled.className = 'deep-chat-dt-settled';

  const doneToggle = doc.createElement('button');
  doneToggle.type = 'button';
  doneToggle.className = 'deep-chat-dt-done-toggle';
  doneToggle.setAttribute('aria-expanded', 'false');
  const doneLabel = doc.createElement('span');
  doneLabel.className = 'deep-chat-dt-done-label';
  doneToggle.append(doneLabel, createChevronIcon(doc));

  const donePanel = doc.createElement('div');
  donePanel.className = 'deep-chat-dt-done-panel';
  donePanel.hidden = true;

  const deepToggle = doc.createElement('button');
  deepToggle.type = 'button';
  deepToggle.className = 'deep-chat-dt-toggle';
  deepToggle.setAttribute('aria-expanded', 'false');
  const deepLabel = doc.createElement('span');
  deepLabel.className = 'deep-chat-dt-label';
  deepLabel.textContent = '深度思考';
  deepToggle.append(deepLabel, createChevronIcon(doc));

  const deepBody = doc.createElement('div');
  deepBody.className = 'deep-chat-dt-body';
  deepBody.hidden = true;
  const deepText = doc.createElement('pre');
  deepText.className = 'deep-chat-dt-text';
  deepBody.append(deepText);

  const readModel = (): { full: string; durationSec: number } => ({
    full: settled.dataset.dtFull ?? '',
    durationSec: Number(settled.dataset.dtDuration ?? '0') || 0,
  });

  doneToggle.addEventListener('click', () => {
    const model = readModel();
    // No nested 深度思考 → 已完成 is display-only (no expand)
    if (!model.full.trim()) {
      return;
    }
    const state = getOrCreateSettledUiState(uiKey);
    state.doneOpen = !state.doneOpen;
    if (!state.doneOpen) {
      state.deepOpen = false;
    }
    applySettledDeepThinkingUi(settled, model.full, model.durationSec, uiKey);
  });

  deepToggle.addEventListener('click', () => {
    const model = readModel();
    if (!model.full.trim()) {
      return;
    }
    const state = getOrCreateSettledUiState(uiKey);
    state.deepOpen = !state.deepOpen;
    applySettledDeepThinkingUi(settled, model.full, model.durationSec, uiKey);
  });

  donePanel.append(deepToggle, deepBody);
  settled.append(doneToggle, donePanel);
  return settled;
}

function applySettledDeepThinkingUi(
  settled: HTMLElement,
  fullText: string,
  durationSec: number,
  uiKey: string
): void {
  const state = getOrCreateSettledUiState(uiKey);
  const nodes = readSettledDeepThinkingNodes(settled);
  if (!nodes) {
    return;
  }

  const full = fullText.trim();
  const doneLabelText = formatCompletedDurationLabel(durationSec);
  // Only write when changed — avoid childList MutationObserver thrash on remount.
  if (nodes.doneLabel.textContent !== doneLabelText) {
    nodes.doneLabel.textContent = doneLabelText;
  }
  nodes.doneToggle.classList.toggle('is-static', !full);
  const disabled = full ? 'false' : 'true';
  if (nodes.doneToggle.getAttribute('aria-disabled') !== disabled) {
    nodes.doneToggle.setAttribute('aria-disabled', disabled);
  }

  // No reasoning channel: show 「已完成 Xs」 only (non-expandable).
  if (!full) {
    state.doneOpen = false;
    state.deepOpen = false;
    setToggleExpanded(nodes.doneToggle, false);
    nodes.donePanel.hidden = true;
    nodes.deepToggle.hidden = true;
    nodes.deepBody.hidden = true;
    stopReasoningTypewriter();
    return;
  }

  nodes.deepToggle.hidden = false;
  setToggleExpanded(nodes.doneToggle, state.doneOpen);
  // Nested hierarchy: 已完成 collapsed → hide entire panel (深度思考 + body).
  // Only after 已完成 expands can user toggle 深度思考.
  if (!state.doneOpen) {
    state.deepOpen = false;
    nodes.donePanel.hidden = true;
    setToggleExpanded(nodes.deepToggle, false);
    nodes.deepBody.hidden = true;
    stopReasoningTypewriter();
    return;
  }

  nodes.donePanel.hidden = false;
  setToggleExpanded(nodes.deepToggle, state.deepOpen);
  nodes.deepBody.hidden = !state.deepOpen;

  if (!state.deepOpen) {
    stopReasoningTypewriter();
    return;
  }

  // Settled: content is final — always show full text immediately (no typewriter).
  stopReasoningTypewriter();
  nodes.deepText.textContent = full;
  state.displayedLength = full.length;
}

function readSettledDeepThinkingNodes(settled: HTMLElement): {
  doneToggle: HTMLElement;
  doneLabel: HTMLElement;
  donePanel: HTMLElement;
  deepToggle: HTMLElement;
  deepBody: HTMLElement;
  deepText: HTMLElement;
} | null {
  const doneToggle = settled.querySelector<HTMLElement>('.deep-chat-dt-done-toggle');
  const doneLabel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-label');
  const donePanel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-panel');
  const deepToggle = settled.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const deepBody = settled.querySelector<HTMLElement>('.deep-chat-dt-body');
  const deepText = settled.querySelector<HTMLElement>('.deep-chat-dt-text');
  if (!doneToggle || !doneLabel || !donePanel || !deepToggle || !deepBody || !deepText) {
    return null;
  }
  return { doneToggle, doneLabel, donePanel, deepToggle, deepBody, deepText };
}

/**
 * Bind MutationObserver to the *current* deep-chat instance.
 * replaceChat() destroys the previous element; without rebind, chrome never remounts
 * after thread switches (已完成 / 深度思考 disappear until refresh).
 */
function observePendingGenerationChrome(chat: DeepChatElement): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  if (pendingChromeObserver && pendingChromeObservedChat === chat) {
    return;
  }

  disconnectChromeMutationObserver();
  pendingChromeObservedChat = chat;
  pendingChromeObserver = new MutationObserver(() => {
    const container = getMountedRenderContainer();
    const liveChat = container ? getChat(container) : null;
    // Drop stale callbacks from a replaced deep-chat node
    if (!container || liveChat !== chat || !chat.isConnected || !chat.shadowRoot) {
      return;
    }
    if (shouldSkipChromeRemount(chat.shadowRoot)) {
      return;
    }
    syncAllDeepThinkingChrome(container);
  });
  pendingChromeObserver.observe(root, { childList: true, subtree: true });
}

function liveHostHasRequiredGenerationChrome(
  liveHost: Element,
  pending: PendingDeepChatRequest
): boolean {
  const phase = getDeepChatGenerationPhase(pending);
  const hasReasoning = Boolean(pending.reasoningText.trim());
  // waiting / generating-without-reasoning never mount streaming chrome — requiring
  // `.is-streaming` here caused infinite MutationObserver remount (page freeze on resend).
  if (!liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning)) {
    return true;
  }
  const selector =
    phase === 'settled'
      ? `:scope > .${GENERATION_CHROME_CLASS}.is-settled`
      : `:scope > .${GENERATION_CHROME_CLASS}.is-streaming`;
  return Boolean(liveHost.querySelector(selector));
}

function hostsHaveSettledChromeWhereRequired(
  hosts: Element[],
  storedAi: DeepChatMessage[],
  streamHostIndex: number
): boolean {
  for (let hostIndex = 0; hostIndex < streamHostIndex; hostIndex++) {
    const host = hosts[hostIndex];
    const mapped = resolveStoredAiForHost(hostIndex, streamHostIndex, storedAi);
    if (!mapped || !messageHasSettledChrome(mapped.message)) {
      continue;
    }
    if (!host?.querySelector(`:scope > .${GENERATION_CHROME_CLASS}.is-settled`)) {
      return false;
    }
  }
  return true;
}

/** True when generation chrome already present where required (avoid thrash). */
function shouldSkipChromeRemount(root: ShadowRoot): boolean {
  const pending = pendingRequests.get(threadStore.activeThreadId);
  const hosts = listAiMessageHosts(root);
  if (hosts.length === 0) {
    return false;
  }

  if (pending) {
    const liveHost = hosts[hosts.length - 1];
    if (!liveHost) return false;
    if (!liveHostHasRequiredGenerationChrome(liveHost, pending)) {
      return false;
    }

    // Historical AI hosts (exclude live slot) must keep 已完成 while a request is in flight.
    const streamHostIndex = hosts.length - 1;
    const storedAi = getActiveThread().messages.filter(message =>
      isAssistantMessageRole(message.role)
    );
    const historicalStored = storedAi.length >= hosts.length ? storedAi.slice(0, -1) : storedAi;
    return hostsHaveSettledChromeWhereRequired(hosts, historicalStored, streamHostIndex);
  }

  // Finished thread: every AI host that should show 已完成 must still have it.
  // Checking only the last host missed mid-list drops after history rebuild.
  const thread = getActiveThread();
  const storedAi = thread.messages.filter(message => isAssistantMessageRole(message.role));
  return hostsHaveSettledChromeWhereRequired(hosts, storedAi, hosts.length);
}

function scheduleDeepThinkingChromeRetry(container: HTMLElement, attempt = 0): void {
  if (pendingChromeRetryRaf !== null) {
    return;
  }
  pendingChromeRetryRaf = window.requestAnimationFrame(() => {
    pendingChromeRetryRaf = null;
    const chat = getChat(container);
    if (!chat) {
      return;
    }
    // Always attempt remount when hosts exist; also rebind observer to this chat
    if (chat.shadowRoot) {
      observePendingGenerationChrome(chat);
      if (listAiMessageHosts(chat.shadowRoot).length > 0) {
        syncAllDeepThinkingChrome(container);
        return;
      }
    }
    if (attempt + 1 < PENDING_CHROME_MAX_RETRIES) {
      scheduleDeepThinkingChromeRetry(container, attempt + 1);
    }
  });
}

/**
 * After replaceChat / switchThread: force observer rebind + multi-phase remount.
 * deep-chat paints history async; a single sync often races empty shadow DOM.
 */
function remountDeepThinkingChromeAfterChatReplace(container: HTMLElement): void {
  disconnectChromeMutationObserver();
  clearChromeRetrySchedule();
  syncAllDeepThinkingChrome(container);
  scheduleDeepThinkingChromeRetry(container, 0);
  for (const delayMs of [32, 80, 160, 320]) {
    const id = window.setTimeout(() => {
      pendingChromeRetryTimeouts = pendingChromeRetryTimeouts.filter(t => t !== id);
      if (getMountedRenderContainer() !== container) {
        return;
      }
      syncAllDeepThinkingChrome(container);
    }, delayMs);
    pendingChromeRetryTimeouts.push(id);
  }
}

function hideLegacyLightDomGenerationChrome(container: HTMLElement): void {
  const topStatus = container.querySelector<HTMLElement>('#deep-chat-pending-status');
  if (topStatus) {
    topStatus.hidden = true;
  }
  const lightReasoning = container.querySelector<HTMLElement>('#deep-chat-reasoning-stream');
  if (lightReasoning) {
    lightReasoning.hidden = true;
  }
}

/**
 * Completed AI replies get 「已完成」 chrome.
 * Partial (still streaming to disk) does not — unless it already has reasoning metadata.
 */
function messageHasSettledChrome(message: DeepChatMessage | undefined): boolean {
  if (!message) return false;
  if (message.status === 'partial') {
    return (
      Boolean(message.reasoning?.trim()) ||
      (typeof message.reasoningDurationSec === 'number' &&
        Number.isFinite(message.reasoningDurationSec))
    );
  }
  // Finished AI message: always show 已完成 (duration 0 if unknown).
  return true;
}

function mountSettledChromeForMessage(
  host: HTMLElement,
  threadId: string,
  storedIndex: number,
  message: DeepChatMessage
): void {
  const uiKey = buildSettledDtKey(threadId, storedIndex, message);
  mountSettledDeepThinkingChrome(
    host,
    message.reasoning ?? '',
    typeof message.reasoningDurationSec === 'number' ? message.reasoningDurationSec : 0,
    uiKey
  );
}

/**
 * Align AI DOM hosts to stored AI messages from the end.
 * deep-chat sometimes inserts an extra loading host; head-align would steal the last message.
 */
function resolveStoredAiForHost(
  hostIndex: number,
  hostsLength: number,
  storedAi: DeepChatMessage[]
): { message: DeepChatMessage; storedIndex: number } | null {
  if (storedAi.length === 0 || hostsLength === 0) {
    return null;
  }
  // Map last host → last stored AI, second-last → second-last, ...
  const storedIndex = storedAi.length - 1 - (hostsLength - 1 - hostIndex);
  if (storedIndex < 0 || storedIndex >= storedAi.length) {
    return null;
  }
  const message = storedAi[storedIndex];
  if (!message) {
    return null;
  }
  return { message, storedIndex };
}

/**
 * Attach 已完成 / 深度思考 chrome to finished AI bubbles,
 * and streaming chrome only on the latest bubble while generating.
 */
function syncAllDeepThinkingChrome(container: HTMLElement): void {
  hideLegacyLightDomGenerationChrome(container);

  const chat = getChat(container);
  if (!chat) {
    syncSubmitStopButtonState(container);
    return;
  }

  const root = chat.shadowRoot;
  if (!root) {
    scheduleDeepThinkingChromeRetry(container);
    syncSubmitStopButtonState(container);
    return;
  }

  const thread = getActiveThread();
  const pending = pendingRequests.get(thread.id);
  const hosts = listAiMessageHosts(root);
  if (hosts.length === 0) {
    scheduleDeepThinkingChromeRetry(container);
    syncSubmitStopButtonState(container);
    return;
  }

  // Keep observer alive across settle so deep-chat rebuilds re-attach chrome.
  observePendingGenerationChrome(chat);

  const storedAi = thread.messages.filter(message => isAssistantMessageRole(message.role));
  const streamHostIndex = pending ? hosts.length - 1 : -1;

  hosts.forEach((host, hostIndex) => {
    if (pending && hostIndex === streamHostIndex) {
      chat.classList.add(PENDING_GENERATION_HOST_CLASS);
      // Reply finished (LLM settled) but body typewriter may still drain → 已完成 Xs
      if (getDeepChatGenerationPhase(pending) === 'settled') {
        clearWaitingStatusRotateTimer();
        const durationSec = getPendingReasoningDurationSec(pending);
        const uiKey = `${thread.id}:pending-settled:${pending.startedAt}`;
        mountSettledDeepThinkingChrome(host, pending.reasoningText, durationSec, uiKey);
        return;
      }
      mountStreamingGenerationChrome(host, pending);
      return;
    }

    // Historical hosts while generating: exclude last stored AI (belongs to live turn).
    // Finished thread: end-align all hosts to all stored AI messages.
    const mapped = pending
      ? resolveStoredAiForHost(
          hostIndex,
          Math.max(0, streamHostIndex),
          storedAi.length >= hosts.length ? storedAi.slice(0, -1) : storedAi
        )
      : resolveStoredAiForHost(hostIndex, hosts.length, storedAi);

    if (mapped && messageHasSettledChrome(mapped.message)) {
      mountSettledChromeForMessage(host, thread.id, mapped.storedIndex, mapped.message);
      return;
    }

    // Only strip settled chrome when this host clearly has no finished AI mapping
    // (e.g. transient loading host). Never strip is-streaming here — stream path owns it.
    const chrome = getChromeOnHost(host);
    if (chrome?.classList.contains('is-settled') && !pending) {
      chrome.remove();
    }
  });

  if (!pending) {
    clearStreamingGenerationChrome(chat);
    // Re-attach settled after clearing streaming nodes (observer stays alive).
    hosts.forEach((host, hostIndex) => {
      const mapped = resolveStoredAiForHost(hostIndex, hosts.length, storedAi);
      if (mapped && messageHasSettledChrome(mapped.message)) {
        mountSettledChromeForMessage(host, thread.id, mapped.storedIndex, mapped.message);
      }
    });
  }

  syncSubmitStopButtonState(container);
}

function syncPendingStatus(container: HTMLElement): void {
  syncAllDeepThinkingChrome(container);
}

async function emitPendingAssistantDelta(
  signals: DeepChatSignals,
  pendingRequest: PendingDeepChatRequest,
  sourceChat: DeepChatElement | null,
  delta: string
): Promise<void> {
  // 切走会话/离开页面后不再向已卸载的 Deep Chat signals 推流，避免停滞与无效 await
  if (!isCurrentResponseTarget(pendingRequest.threadId, sourceChat)) {
    schedulePendingAssistantDisplay(pendingRequest.threadId);
    return;
  }

  const previousDisplayedLength = pendingRequest.assistantText.length - delta.length;
  const delivered = await emitDeepChatResponse(signals, { text: delta });
  if (delivered && pendingRequest.displayedAssistantText.length === previousDisplayedLength) {
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
  const fields: Partial<DeepChatThread> = {};
  const customTitle = getOptionalString(thread.customTitle);
  const promptDraftId = getOptionalString(thread.promptDraftId);
  const systemPrompt = getOptionalString(thread.systemPrompt);
  const pinnedAt = getOptionalFiniteTimestamp(thread.pinnedAt);
  const listingPromptContext = getSanitizedListingPromptContext(thread.listingPromptContext);
  const skillContexts = getSanitizedSkillContexts(thread.skillContexts);
  if (customTitle) fields.customTitle = customTitle;
  if (promptDraftId) fields.promptDraftId = promptDraftId;
  if (systemPrompt) fields.systemPrompt = systemPrompt;
  if (typeof thread.temperature === 'number' && Number.isFinite(thread.temperature)) {
    fields.temperature = normalizeTemperature(String(thread.temperature));
  }
  if (listingPromptContext) fields.listingPromptContext = listingPromptContext;
  if (skillContexts) fields.skillContexts = skillContexts;
  if (pinnedAt) fields.pinnedAt = pinnedAt;
  if (thread.hasUnread === true) fields.hasUnread = true;
  return fields;
}

/** 日志脱敏：避免 apiKey / token 等敏感字段进入 console */
function redactSensitiveError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // 不展开 cause/stack 里可能夹带的配置对象
      stack: error.stack,
    };
  }
  if (!error || typeof error !== 'object') {
    return error;
  }
  try {
    return JSON.parse(
      JSON.stringify(error, (key, value) => {
        if (/api[_-]?key|authorization|password|secret|token|bearer/i.test(key)) {
          return '[REDACTED]';
        }
        return value;
      })
    );
  } catch {
    return String(error);
  }
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
  if (customTitle) {
    return customTitle;
  }
  const persistedTitle = getOptionalString(title);
  if (persistedTitle && persistedTitle !== 'New Thread') {
    return persistedTitle;
  }
  const derived = getThreadTitle(messages);
  return derived || persistedTitle || 'New Thread';
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
