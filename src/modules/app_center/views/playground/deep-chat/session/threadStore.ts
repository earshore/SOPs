import { getChat } from './domHelpers';
import { uiHooks } from './uiHooks';
import { getMountedRenderContainer } from './mountContext';
import type { ChatMessage } from '@/services/llmService';

import { LocalDataStore } from '@/services/localDataStore';

import {
  consumeDeepChatThreadResume,
  createListingPromptWorkflowContext,
  type ListingPromptWorkflowContext,
} from '@/modules/app_center/listingWorkflowHandoff';

import { confirmWithModal } from '../infra/confirmModal';
import { buildStoredThreadMessages, normalizeStoredThreadMessages } from './conversationContext';

import { getMaxThreadCount, THREAD_STORAGE_KEY } from '../constants';

import { getPromptDrafts } from '../composer/promptDrafts';

import type {
  CreateThreadOptions,
  DeepChatMessage,
  DeepChatSkillContext,
  DeepChatThread,
  DeepChatThreadStore,
  SaveThreadMessagesOptions,
} from '../types';
import { createThreadId, getThreadTitle, normalizeTemperature } from '../infra/utils';
import { readEffectivePageDefaults, type DeepChatPageDefaults } from './pageDefaults';

import { showToast } from '@/common/ui/notifications';

import {
  sessionState,
  THREAD_MENU_HEIGHT,
  THREAD_MENU_GAP,
  draftPersistController,
} from './sessionState';

export async function loadThreadStore(): Promise<DeepChatThreadStore> {
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

export function persistThreadStore(): void {
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

export function persistThreadStoreNow(): void {
  draftPersistController.cancel();
  persistThreadStore();
}

export function getPersistableThreadStore(): DeepChatThreadStore {
  const threads = sessionState.threadStore.threads
    .filter(isPersistableThread)
    .slice(0, getMaxThreadCount());
  const activeThreadId = threads.some(
    thread => thread.id === sessionState.threadStore.activeThreadId
  )
    ? sessionState.threadStore.activeThreadId
    : threads[0]?.id || '';

  return { activeThreadId, threads };
}

export function isPersistableThread(thread: DeepChatThread): boolean {
  return (
    thread.messages.length > 0 ||
    Boolean(thread.draftText?.trim()) ||
    Boolean(thread.skillContexts && thread.skillContexts.length > 0)
  );
}

export function createDefaultThreadStore(): DeepChatThreadStore {
  const thread = createEmptyThread();
  return {
    activeThreadId: thread.id,
    threads: [thread],
  };
}

export function createEmptyThread(): DeepChatThread {
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

export function getActiveThread(): DeepChatThread {
  const activeThread = sessionState.threadStore.threads.find(
    thread => thread.id === sessionState.threadStore.activeThreadId
  );

  if (activeThread) {
    return activeThread;
  }

  const fallbackThread = sessionState.threadStore.threads[0] || createEmptyThread();
  sessionState.threadStore = {
    activeThreadId: fallbackThread.id,
    threads:
      sessionState.threadStore.threads.length > 0
        ? sessionState.threadStore.threads
        : [fallbackThread],
  };
  persistThreadStoreNow();
  return fallbackThread;
}

/**
 * 会话内追加系统通知消息（模型切换提示等）：实时渲染 + 落线程。
 * 仅展示不发送：mergeThreadHistoryWithRequest 丢弃 system 角色。
 */
export function appendThreadNotice(container: HTMLElement | null, text: string): void {
  if (!container) {
    return;
  }
  const thread = getActiveThread();
  const last = thread.messages[thread.messages.length - 1];
  if (last?.role === 'system' && last.text === text) {
    return;
  }
  const message: DeepChatMessage = { role: 'system', text, createdAt: Date.now() };
  const chat = getChat(container);
  // 生成中只落数据不实时渲染（通知追加会带动消息区滚动/重排，干扰当次生成观感）；
  // 生成结束由 reconcileSwitchNotices 统一补渲染，记录一条不丢。
  const isGenerating = sessionState.pendingRequests.has(thread.id);
  if (!isGenerating && chat) {
    const messagesEl = chat.shadowRoot?.querySelector<HTMLElement>('#messages');
    const prevScrollTop = messagesEl?.scrollTop ?? 0;
    const wasNearBottom = messagesEl
      ? messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 32
      : true;
    chat.addMessage?.(message, false);
    // 用户不在底部时保留视野，避免追加通知把滚动拉走（“闪一下”）。
    if (messagesEl && !wasNearBottom) {
      messagesEl.scrollTop = prevScrollTop;
      window.requestAnimationFrame(() => {
        messagesEl.scrollTop = prevScrollTop;
      });
    }
  }
  updateActiveThreadFields(container, { messages: [...thread.messages, message] });
}

export function getThreadForSave(threadId?: string): DeepChatThread | null {
  if (!threadId) {
    return getActiveThread();
  }

  return getThreadById(threadId);
}

/** Lookup by id only — never falls back to the active thread. */
export function getThreadById(threadId: string): DeepChatThread | null {
  return sessionState.threadStore.threads.find(thread => thread.id === threadId) ?? null;
}

export function threadExists(threadId: string): boolean {
  return sessionState.threadStore.threads.some(thread => thread.id === threadId);
}

/**
 * Messages shown in deep-chat history + message toolbars.
 * Live pending: no toolbar status badge — progress is only via generation chrome
 * (思考中 / 深度思考 / 正在生成回复 · 已收到 N 字).
 * Interrupted recovery (no pending): store may keep status 「未完成」.
 */

export function saveThreadMessages(
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
      assistantPushBlockReason: options.assistantPushBlockReason,
      assistantReasoning: options.assistantReasoning,
      assistantReasoningDurationSec: options.assistantReasoningDurationSec,
      assistantPreReplySteps: options.assistantPreReplySteps,
      userAttachmentMeta: options.userAttachmentMeta,
    }
  );

  const nextThread: DeepChatThread = {
    ...activeThread,
    title: activeThread.customTitle || getThreadTitle(storedMessages),
    messages: storedMessages,
    draftText: '',
    updatedAt: now,
  };

  const activeThreadId = sessionState.threadStore.threads.some(
    thread => thread.id === sessionState.threadStore.activeThreadId
  )
    ? sessionState.threadStore.activeThreadId
    : nextThread.id;

  sessionState.threadStore = {
    activeThreadId,
    threads: [
      nextThread,
      ...sessionState.threadStore.threads.filter(thread => thread.id !== nextThread.id),
    ].slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  if (container && !options.skipUiRefresh) {
    renderHistoryThreadList(container);
    uiHooks.refreshChatSearchResultsIfOpen(container);
    uiHooks.syncPendingStatus(container);
    uiHooks.syncSessionSkillChipDock(container);
  }
}

/** 仅追加 system 切换通知的 messages 写回：条数计数已排除通知，侧栏无需整表重绘 */
function isNoticeOnlySystemAppend(
  thread: DeepChatThread,
  fields: Partial<DeepChatThread>
): boolean {
  return (
    'messages' in fields &&
    Array.isArray(fields.messages) &&
    fields.messages.length === thread.messages.length + 1 &&
    fields.messages.at(-1)?.role === 'system'
  );
}

/** 显式清空时删除可选字段（避免 undefined 持久化为 null 语义） */
function pruneThreadOptionalFields(
  nextThread: DeepChatThread,
  fields: Partial<DeepChatThread>
): void {
  if ('skillContexts' in fields && !fields.skillContexts) {
    delete nextThread.skillContexts;
  }
  if ('systemPrompt' in fields && !fields.systemPrompt) {
    delete nextThread.systemPrompt;
  }
}

export function updateActiveThreadFields(
  container: HTMLElement,
  fields: Partial<DeepChatThread>
): void {
  updateThreadFields(container, getActiveThread().id, fields);
}

/**
 * Write fields to a specific thread. Preserves activeThreadId when the target
 * is a background thread (must not steal focus during mid-generation switch).
 */
export function updateThreadFields(
  container: HTMLElement,
  threadId: string,
  fields: Partial<DeepChatThread>
): void {
  const targetThread = getThreadById(threadId);
  if (!targetThread) {
    return;
  }
  if (!hasThreadFieldChanges(targetThread, fields)) {
    return;
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
  const bumpsSortOrder = Object.keys(fields).some(key => THREAD_ACTIVITY_SORT_KEYS.has(key));
  const nextThread: DeepChatThread = {
    ...targetThread,
    ...fields,
    updatedAt: bumpsSortOrder ? Date.now() : targetThread.updatedAt,
  };

  pruneThreadOptionalFields(nextThread, fields);

  // 保持 threads 数组相对顺序；后台线程写回不得改写 activeThreadId
  const activeStillExists = sessionState.threadStore.threads.some(
    thread => thread.id === sessionState.threadStore.activeThreadId
  );
  sessionState.threadStore = {
    activeThreadId: activeStillExists
      ? sessionState.threadStore.activeThreadId
      : nextThread.id,
    threads: sessionState.threadStore.threads
      .map(thread => (thread.id === nextThread.id ? nextThread : thread))
      .slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  // 侧栏只展示标题/条数/时间：仅排序相关字段变化才重绘，调参/模型/链字段写回
  // 不再整表重建；「仅追加 system 切换通知」的 messages 变更同样跳过（条数计数
  // 已排除通知），避免切换模型时侧栏闪烁。
  if (bumpsSortOrder && !isNoticeOnlySystemAppend(targetThread, fields)) {
    renderHistoryThreadList(container);
  }
  uiHooks.refreshChatSearchResultsIfOpen(container);
}

export function hasThreadFieldChanges(
  thread: DeepChatThread,
  fields: Partial<DeepChatThread>
): boolean {
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

export function markThreadUnread(threadId: string): void {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
  if (!thread || thread.hasUnread) {
    return;
  }

  sessionState.threadStore = {
    ...sessionState.threadStore,
    threads: sessionState.threadStore.threads.map(item =>
      item.id === threadId ? { ...item, hasUnread: true } : item
    ),
  };
  persistThreadStoreNow();
}

export function clearThreadUnread(threadId: string): void {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
  if (!thread?.hasUnread) {
    return;
  }

  sessionState.threadStore = {
    ...sessionState.threadStore,
    threads: sessionState.threadStore.threads.map(item => {
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

export function sanitizeThread(thread: DeepChatThread): DeepChatThread | null {
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

export function getSanitizedThreadMessages(
  messages: DeepChatThread['messages'],
  fallbackCreatedAt: number
): DeepChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return normalizeStoredThreadMessages(messages, { fallbackCreatedAt });
}

export function getSanitizedThreadTitle(
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

export function getSanitizedSkillContexts(value: unknown): DeepChatSkillContext[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const contexts = value
    .map(parseSkillContextItem)
    .filter((context): context is DeepChatSkillContext => context !== null);
  return contexts.length > 0 ? contexts : null;
}

export function getSanitizedListingPromptContext(
  value: unknown
): ListingPromptWorkflowContext | null {
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

export function parseSkillContextItem(item: unknown): DeepChatSkillContext | null {
  if (!item || typeof item !== 'object') return null;
  const context = item as Partial<DeepChatSkillContext>;
  const skillId = typeof context.skillId === 'string' ? context.skillId.trim() : '';
  const skillTitle = typeof context.skillTitle === 'string' ? context.skillTitle.trim() : '';
  const skillRaw = typeof context.skillRaw === 'string' ? context.skillRaw.trim() : '';
  if (!skillId || !skillTitle || !skillRaw) return null;
  return { skillId, skillTitle, skillRaw };
}

export function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim() || undefined;
}

export function getFiniteTimestamp(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function getOptionalFiniteTimestamp(value: unknown): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

export function isValidThreadStore(
  value: DeepChatThreadStore | null
): value is DeepChatThreadStore {
  return Boolean(value && typeof value.activeThreadId === 'string' && Array.isArray(value.threads));
}

export function cloneListingPromptContext(
  context: ListingPromptWorkflowContext
): ListingPromptWorkflowContext {
  return {
    ...context,
    seoKeywords: [...context.seoKeywords],
  };
}

export function getActiveListingPromptContext(): ListingPromptWorkflowContext | null {
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

export function applyDeepChatThreadResume(store: DeepChatThreadStore): DeepChatThreadStore {
  const threadId = consumeDeepChatThreadResume();
  if (!threadId || !store.threads.some(thread => thread.id === threadId)) return store;
  return { ...store, activeThreadId: threadId };
}

/** 页面默认继承字段（线程显式字段优先；model 继承页面默认，无则跟随全局）。 */
function createInheritedThreadDefaults(
  pageDefaults: DeepChatPageDefaults
): Partial<DeepChatThread> {
  return {
    ...(pageDefaults.model ? { model: pageDefaults.model } : {}),
    ...(pageDefaults.systemPrompt ? { systemPrompt: pageDefaults.systemPrompt } : {}),
    ...(typeof pageDefaults.temperature === 'number'
      ? { temperature: pageDefaults.temperature }
      : {}),
    ...(pageDefaults.reasoning ? { reasoning: { ...pageDefaults.reasoning } } : {}),
  };
}

export function createThread(container: HTMLElement, options: CreateThreadOptions = {}): void {
  uiHooks.saveActiveThreadDraft(container);
  const pageDefaults = readEffectivePageDefaults(sessionState.currentConfig?.provider || '');
  const inheritedDefaults = createInheritedThreadDefaults(pageDefaults);
  const nextThread: DeepChatThread = {
    ...createEmptyThread(),
    ...(options.promptDraftId ? { promptDraftId: options.promptDraftId } : {}),
    ...(options.listingPromptContext
      ? {
          listingPromptContext: cloneListingPromptContext(options.listingPromptContext),
        }
      : {}),
    ...(options.skillContexts && options.skillContexts.length > 0
      ? { skillContexts: uiHooks.cloneSkillContexts(options.skillContexts) }
      : {}),
    ...(options.draftText ? { draftText: options.draftText } : {}),
    ...inheritedDefaults,
  };
  sessionState.threadStore = {
    activeThreadId: nextThread.id,
    threads: [nextThread, ...sessionState.threadStore.threads].slice(0, getMaxThreadCount()),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  uiHooks.refreshChatSearchResultsIfOpen(container);
  uiHooks.replaceChat(container);
  uiHooks.applySkillContextsToSession(container);
  // 新线程继承页面默认后同步 sessionState 与调试面板 DOM（skill 优先语义由
  // applySkillContextsToSession 内部保证，顺序与 switchThread 一致）
  uiHooks.applyThreadTuningToSession(container);
  uiHooks.hydrateActiveThreadInlineSkillChips(container);
  if (options.toastMessage !== null) {
    showToast(options.toastMessage || '已创建新的 Deep Chat 会话', {
      type: 'success',
    });
  }
}

export function createThreadFromPromptDraft(container: HTMLElement, promptId: string): void {
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
  window.setTimeout(() => uiHooks.fillPromptDraftInput(container, promptDraft.prompt), 80);
}

export function createThreadFromListingPromptContext(
  container: HTMLElement,
  promptContext: ListingPromptWorkflowContext
): void {
  createThread(container, {
    toastMessage: null,
    promptDraftId: promptContext.promptId,
    listingPromptContext: promptContext,
    draftText: promptContext.prompt,
  });
  window.setTimeout(() => uiHooks.fillPromptDraftInput(container, promptContext.prompt), 80);
}

/**
 * 消费 Skills→Deep Chat 试用 handoff（可被 init / 路由重入 / handoff 事件调用）。
 * @returns 是否成功创建了技能会话
 */

export function switchThread(container: HTMLElement, threadId: string): void {
  if (threadId === sessionState.threadStore.activeThreadId) {
    return;
  }

  if (!sessionState.threadStore.threads.some(thread => thread.id === threadId)) {
    return;
  }

  // 允许在「生成中/输出中」切走：上一会话的打字机在后台静默推进直至完成（不 clear timer）
  uiHooks.saveActiveThreadDraft(container);
  uiHooks.saveActiveThreadTuning(container);
  clearThreadUnread(threadId);
  sessionState.threadStore = {
    ...sessionState.threadStore,
    activeThreadId: threadId,
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  renderPromptDraftsForActiveThread(container);
  uiHooks.refreshChatSearchResultsIfOpen(container);
  uiHooks.replaceChat(container);
  uiHooks.applySkillContextsToSession(container);
  uiHooks.applyThreadTuningToSession(container);
  uiHooks.hydrateActiveThreadInlineSkillChips(container);
  // 目标会话若仍在生成/输出，确保有 drain 在跑（可能已在后台 tick）；始终同步 chrome
  if (sessionState.pendingRequests.has(threadId)) {
    uiHooks.schedulePendingAssistantDisplay(threadId);
  }
  // uiHooks.replaceChat 换了 deep-chat 节点：必须重绑 observer + 多帧补挂 已完成/深度思考
  uiHooks.remountDeepThinkingChromeAfterChatReplace(container);
  // Re-sync toolbar badges (e.g. clear stale 「未完成」 from store after settle)
  uiHooks.refreshMessageToolbarStatuses(getChat(container), () =>
    uiHooks.getThreadDisplayMessages(getActiveThread())
  );
}

export async function deleteThread(container: HTMLElement, threadId: string): Promise<void> {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
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

  uiHooks.abortPendingRequest(threadId, 'deleted');
  const remainingThreads = sessionState.threadStore.threads.filter(item => item.id !== threadId);
  const firstRemainingThread = remainingThreads[0];
  const nextStore = firstRemainingThread
    ? {
        activeThreadId:
          threadId === sessionState.threadStore.activeThreadId
            ? firstRemainingThread.id
            : sessionState.threadStore.activeThreadId,
        threads: remainingThreads,
      }
    : createDefaultThreadStore();

  const shouldReplaceChat = threadId === sessionState.threadStore.activeThreadId;
  sessionState.threadStore = nextStore;
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  if (shouldReplaceChat) {
    renderPromptDraftsForActiveThread(container);
  }
  uiHooks.refreshChatSearchResultsIfOpen(container);
  if (shouldReplaceChat) {
    uiHooks.replaceChat(container);
  }
  showToast(`已删除会话：${thread.title}`, { type: 'success' });
}

export function renameThread(container: HTMLElement, threadId: string): void {
  beginThreadRename(container, threadId);
}

export function beginThreadRename(container: HTMLElement, threadId: string): void {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  closeThreadMenu(container);
  sessionState.editingThreadId = threadId;
  sessionState.editingThreadValue = thread.customTitle || thread.title;
  renderHistoryThreadList(container);
  focusEditingInput(container, true);
}

export function commitThreadRename(
  container: HTMLElement,
  threadId: string,
  rawValue: string
): void {
  if (sessionState.editingThreadId !== threadId) {
    return;
  }

  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
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

export function cancelThreadRename(): void {
  exitThreadEdit();
  const container = getMountedRenderContainer();
  if (container) {
    renderHistoryThreadList(container);
  }
}

export function exitThreadEdit(): void {
  sessionState.editingThreadId = null;
  sessionState.editingThreadValue = '';
}

export function focusEditingInput(container: HTMLElement, selectAll: boolean): void {
  if (!sessionState.editingThreadId) {
    return;
  }

  const input = container.querySelector<HTMLInputElement>('.deep-chat-thread-name-input');
  if (!input || input.dataset.threadEditId !== sessionState.editingThreadId) {
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

export function togglePinnedThread(container: HTMLElement, threadId: string): void {
  const thread = sessionState.threadStore.threads.find(item => item.id === threadId);
  if (!thread) {
    return;
  }

  updateThreadMetadata(container, threadId, {
    pinnedAt: thread.pinnedAt ? undefined : Date.now(),
  });
}

export function updateThreadMetadata(
  container: HTMLElement,
  threadId: string,
  changes: Partial<DeepChatThread>
): void {
  sessionState.threadStore = {
    ...sessionState.threadStore,
    threads: sessionState.threadStore.threads.map(thread =>
      thread.id === threadId ? { ...thread, ...changes } : thread
    ),
  };
  persistThreadStoreNow();
  renderHistoryThreadList(container);
  uiHooks.refreshChatSearchResultsIfOpen(container);
}

export function toggleThreadMenu(
  container: HTMLElement,
  threadId: string,
  button: HTMLButtonElement
): void {
  if (sessionState.openThreadMenu?.threadId === threadId) {
    closeThreadMenu(container);
    return;
  }

  sessionState.openThreadMenu = {
    threadId,
    placement: shouldOpenThreadMenuAbove(button) ? 'above' : 'below',
  };
  renderHistoryThreadList(container);
}

export function shouldOpenThreadMenuAbove(button: HTMLButtonElement): boolean {
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

export function closeThreadMenu(container: HTMLElement): void {
  if (!sessionState.openThreadMenu) {
    return;
  }

  sessionState.openThreadMenu = null;
  renderHistoryThreadList(container);
}

export function handleThreadMenuAction(
  container: HTMLElement,
  threadId: string,
  action: string
): void {
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

export function renderMountedThreadList(): void {
  const container = getMountedRenderContainer();
  if (container) {
    renderHistoryThreadList(container);
    uiHooks.refreshChatSearchResultsIfOpen(container);
  }
}

export function renderHistoryThreadList(container: HTMLElement): void {
  const editingState = sessionState.editingThreadId
    ? { id: sessionState.editingThreadId, value: sessionState.editingThreadValue }
    : null;
  uiHooks.renderThreadList(
    container,
    getHistoryThreadStore(),
    sessionState.pendingRequests,
    sessionState.openThreadMenu,
    editingState
  );
  if (sessionState.editingThreadId) {
    focusEditingInput(container, false);
  }
}

export function getHistoryThreadStore(): DeepChatThreadStore {
  return {
    ...sessionState.threadStore,
    threads: sessionState.threadStore.threads.filter(isThreadVisibleInHistory),
  };
}

export function isThreadVisibleInHistory(thread: DeepChatThread): boolean {
  return sessionState.pendingRequests.has(thread.id) || isPersistableThread(thread);
}

export function renderPromptDraftsForActiveThread(container: HTMLElement): void {
  const promptDraftId = sessionState.threadStore.threads.find(
    thread => thread.id === sessionState.threadStore.activeThreadId
  )?.promptDraftId;
  uiHooks.renderPromptDraftList(container, promptDraftId);
}

export function getSanitizedThreadOptionalFields(thread: DeepChatThread): Partial<DeepChatThread> {
  const fields: Partial<DeepChatThread> = {};
  const customTitle = getOptionalString(thread.customTitle);
  const promptDraftId = getOptionalString(thread.promptDraftId);
  const systemPrompt = getOptionalString(thread.systemPrompt);
  const model = getOptionalString(thread.model);
  // Responses 链与最后调用模型：跨会话/刷新恢复所需，清洗时保留。
  const lastResponseId = getOptionalString(thread.lastResponseId);
  const lastResponseModel = getOptionalString(thread.lastResponseModel);
  const pinnedAt = getOptionalFiniteTimestamp(thread.pinnedAt);
  const listingPromptContext = getSanitizedListingPromptContext(thread.listingPromptContext);
  const skillContexts = getSanitizedSkillContexts(thread.skillContexts);
  assignOptionalStringField(fields, 'customTitle', customTitle);
  assignOptionalStringField(fields, 'promptDraftId', promptDraftId);
  assignOptionalStringField(fields, 'systemPrompt', systemPrompt);
  assignOptionalStringField(fields, 'model', model);
  assignOptionalStringField(fields, 'lastResponseId', lastResponseId);
  assignOptionalStringField(fields, 'lastResponseModel', lastResponseModel);
  if (typeof thread.temperature === 'number' && Number.isFinite(thread.temperature)) {
    fields.temperature = normalizeTemperature(String(thread.temperature));
  }
  if (listingPromptContext) fields.listingPromptContext = listingPromptContext;
  if (skillContexts) fields.skillContexts = skillContexts;
  if (pinnedAt) fields.pinnedAt = pinnedAt;
  if (thread.hasUnread === true) fields.hasUnread = true;
  return fields;
}

function assignOptionalStringField(
  fields: Partial<DeepChatThread>,
  key:
    | 'customTitle'
    | 'promptDraftId'
    | 'systemPrompt'
    | 'model'
    | 'lastResponseId'
    | 'lastResponseModel',
  value: string | undefined
): void {
  if (value) {
    fields[key] = value;
  }
}

/** 日志脱敏：避免 apiKey / token 等敏感字段进入 console */
