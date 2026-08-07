import { copyTextToClipboard } from '@/common/utils/clipboard';

import { setSafeHtml } from '@/common/utils/security';
import { showToast } from '@/common/ui/notifications';
import { MESSAGE_TOOLBAR_CLASS } from '../constants';
import {
  hydrateUserMessageBubblesWithSkillChips,
  serializeChipContainingElement,
} from './skillContextChip';
import type { DeepChatElement, DeepChatMessage, DeepChatSkillContext } from '../types';
import { getMessageText, isZwspOnlyText } from '../infra/utils';
import { isListingPromptContext, sanitizeListingCopy } from './listingCopySanitize';

/** Live generation progress at toolbar end (正在生成回复 · 已收到 N 字). */
export const TOOLBAR_LIVE_STATUS_CLASS = 'deep-chat-toolbar-live-status';

let messageToolbarObserver: MutationObserver | null = null;
let messageToolbarTimer: number | null = null;
let messageToolbarFrame: number | null = null;
/**
 * Guard set BEFORE requestAnimationFrame. Guarding on messageToolbarFrame breaks
 * under synchronous rAF (jsdom mocks): the callback nulls the id first, then the
 * assignment overwrites it, wedging every later scheduled render shut.
 */
let messageToolbarFramePending = false;
let lastToolbarChat: DeepChatElement | null = null;
let lastGetStoredMessages: (() => DeepChatMessage[]) | null = null;
let lastToolbarActions: MessageToolbarActions = {};

export interface MessageToolbarActions {
  canSendToKeywordHunter?: () => boolean;
  sendToKeywordHunter?: (content: string, message?: DeepChatMessage) => void | Promise<void>;
  /** 当前会话 skill 上下文：消息气泡 static Chip / 编辑回填 dismissible Chip */
  getSkillContexts?: () => DeepChatSkillContext[];
  /** 将消息正文回填输入框并保持 Chip 样式 */
  refillComposerWithText?: (text: string) => void;
  /**
   * Live in-flight status for the latest AI bubble, shown at toolbar end.
   * e.g. 「正在生成回复... · 已收到 120 字」— not a separate badge design.
   */
  getLiveGenerationStatusLabel?: () => string | null;
  /**
   * True when the active thread has a non-settled pending generation.
   * Used so remount + ZWSP live bubble still gets a toolbar shell (TB-O1).
   */
  hasActivePendingGeneration?: () => boolean;
}

/**
 * Whether to create/keep a toolbar shell on a message outer.
 * Live AI + in-flight pending must mount even for ZWSP-only bubbles and null liveLabel.
 */
export function shouldMountMessageToolbarShell(args: {
  isLiveAi: boolean;
  hasMeaningfulContent: boolean;
  liveLabel: string | null;
  hasActivePending: boolean;
}): boolean {
  if (args.hasMeaningfulContent) return true;
  if (args.isLiveAi && (Boolean(args.liveLabel) || args.hasActivePending)) return true;
  return false;
}

/** True when bubble text is copy/edit-worthy (not empty / ZWSP-only). */
export function isToolbarCopyableContent(content: string): boolean {
  const trimmed = (content || '').trim();
  if (!trimmed) return false;
  return !isZwspOnlyText(trimmed);
}

export function setupMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[],
  actions: MessageToolbarActions = {}
): void {
  cleanupMessageToolbars();
  lastToolbarChat = chat;
  lastGetStoredMessages = getStoredMessages;
  lastToolbarActions = actions;

  const installToolbars = (): void => {
    const root = chat.shadowRoot;
    if (!root) {
      return;
    }

    scheduleRenderMessageToolbars(chat, getStoredMessages, actions);
    messageToolbarObserver = new MutationObserver(() =>
      scheduleRenderMessageToolbars(chat, getStoredMessages, actions)
    );
    messageToolbarObserver.observe(root, { childList: true, subtree: true });
  };

  messageToolbarTimer = window.setTimeout(installToolbars, 0);
}

export function cleanupMessageToolbars(): void {
  messageToolbarObserver?.disconnect();
  messageToolbarObserver = null;
  lastToolbarChat = null;
  lastGetStoredMessages = null;
  lastToolbarActions = {};

  if (messageToolbarTimer !== null) {
    window.clearTimeout(messageToolbarTimer);
    messageToolbarTimer = null;
  }

  if (messageToolbarFrame !== null) {
    window.cancelAnimationFrame(messageToolbarFrame);
    messageToolbarFrame = null;
  }
  messageToolbarFramePending = false;
}

function scheduleRenderMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[],
  actions: MessageToolbarActions
): void {
  if (messageToolbarFramePending) {
    return;
  }

  messageToolbarFramePending = true;
  messageToolbarFrame = window.requestAnimationFrame(() => {
    messageToolbarFramePending = false;
    messageToolbarFrame = null;
    const skillContexts = actions.getSkillContexts?.() || [];
    if (chat.shadowRoot && skillContexts.length > 0) {
      // 已发送用户消息：保持 Chip 样式，但 static 无移除 ×
      hydrateUserMessageBubblesWithSkillChips(chat.shadowRoot, skillContexts);
    }
    renderMessageToolbars(chat, getStoredMessages, actions);
  });
}

function renderMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[],
  actions: MessageToolbarActions
): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  const skillContexts = actions.getSkillContexts?.() || [];
  const messages = Array.from(root.querySelectorAll<HTMLElement>('.outer-message-container'));
  const storedMessages = getStoredMessages();
  const usedStoredMessageIndexes = new Set<number>();
  const liveLabel = actions.getLiveGenerationStatusLabel?.() ?? null;

  // 深度思考 / settled 时 liveLabel 为 null：先清掉残留「思考中…」等，
  // 避免空气泡 early-return 路径留下视觉噪音。
  if (!liveLabel) {
    root.querySelectorAll(`.${TOOLBAR_LIVE_STATUS_CLASS}`).forEach(node => node.remove());
  }

  let lastAiOuterIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const outer = messages[i];
    if (outer && getMessageRole(outer) === 'ai') {
      lastAiOuterIndex = i;
      break;
    }
  }

  messages.forEach((message, outerIndex) => {
    installOrUpdateMessageToolbar({
      message,
      outerIndex,
      lastAiOuterIndex,
      liveLabel,
      chat,
      skillContexts,
      storedMessages,
      usedStoredMessageIndexes,
      actions,
    });
  });
}

function clearLiveToolbarLabelIfEmpty(
  message: HTMLElement,
  isLiveAi: boolean,
  liveLabel: string | null
): void {
  // When liveLabel is cleared (e.g. 深度思考 started), still clear leftover waiting text.
  if (!isLiveAi || liveLabel) {
    return;
  }
  const existing = message.querySelector<HTMLElement>(`.${MESSAGE_TOOLBAR_CLASS}`);
  if (existing) {
    syncToolbarLiveGenerationLabel(existing, null);
  }
}

function installOrUpdateMessageToolbar(args: {
  message: HTMLElement;
  outerIndex: number;
  lastAiOuterIndex: number;
  liveLabel: string | null;
  chat: DeepChatElement;
  skillContexts: DeepChatSkillContext[];
  storedMessages: DeepChatMessage[];
  usedStoredMessageIndexes: Set<number>;
  actions: MessageToolbarActions;
}): void {
  const nodes = readMessageToolbarHostNodes(args.message, args.skillContexts);
  if (!nodes) {
    return;
  }
  const { bubble, innerContainer, role, content } = nodes;
  const isLiveAi = role === 'ai' && args.outerIndex === args.lastAiOuterIndex;
  // ZWSP-only is the live placeholder after remount — content empty, but shell may still mount.
  const meaningfulContent = isZwspOnlyText(content) ? '' : content;
  const hasActivePending = Boolean(args.actions.hasActivePendingGeneration?.());
  if (
    !shouldMountMessageToolbarShell({
      isLiveAi,
      hasMeaningfulContent: Boolean(meaningfulContent),
      liveLabel: args.liveLabel,
      hasActivePending,
    })
  ) {
    clearLiveToolbarLabelIfEmpty(args.message, isLiveAi, args.liveLabel);
    return;
  }

  const storedMessage = findStoredMessageForToolbar(
    args.storedMessages,
    args.usedStoredMessageIndexes,
    role,
    meaningfulContent || '\u200b',
    // Only the live last AI may lag store text; latest-fallback elsewhere steals 「未完成」.
    { preferLatestFallback: isLiveAi }
  );

  const toolbar = ensureMessageToolbarElement({
    message: args.message,
    innerContainer,
    chat: args.chat,
    bubble,
    role,
    storedMessage,
    actions: args.actions,
  });

  // Empty / ZWSP live bubbles keep the shell but disable copy / content-bound actions (TB2).
  syncToolbarContentBoundActions(toolbar, meaningfulContent);

  // 「正在生成回复 · 已收到 N 字」 at toolbar end (after copy / tools), not above bubble.
  syncToolbarLiveGenerationLabel(toolbar, isLiveAi ? args.liveLabel : null);
}

function readMessageToolbarHostNodes(
  message: HTMLElement,
  skillContexts: DeepChatSkillContext[]
): {
  bubble: HTMLElement;
  innerContainer: HTMLElement;
  role: 'user' | 'ai';
  content: string;
} | null {
  const bubble = message.querySelector<HTMLElement>('.message-bubble');
  const innerContainer = message.querySelector<HTMLElement>('.inner-message-container');
  const role = getMessageRole(message);
  if (!bubble || !innerContainer || !role) {
    return null;
  }
  return {
    bubble,
    innerContainer,
    role,
    content: getMessageContent(bubble, skillContexts),
  };
}

function ensureMessageToolbarElement(args: {
  message: HTMLElement;
  innerContainer: HTMLElement;
  chat: DeepChatElement;
  bubble: HTMLElement;
  role: 'user' | 'ai';
  storedMessage: DeepChatMessage | undefined;
  actions: MessageToolbarActions;
}): HTMLElement {
  let toolbar = args.message.querySelector<HTMLElement>(`.${MESSAGE_TOOLBAR_CLASS}`);
  if (toolbar) {
    syncToolbarStatusBadge(toolbar, args.storedMessage);
    return toolbar;
  }
  toolbar = createMessageToolbar(
    args.chat,
    args.bubble,
    args.role,
    args.storedMessage,
    args.actions
  );
  args.innerContainer.appendChild(toolbar);
  return toolbar;
}

/** Enable/disable copy & keyword-hunter when bubble has no real text (TB2). */
export function syncToolbarContentBoundActions(toolbar: HTMLElement, content: string): void {
  const copyable = isToolbarCopyableContent(content);
  toolbar.querySelectorAll<HTMLButtonElement>('[data-toolbar-action="copy"]').forEach(btn => {
    setToolbarButtonDisabled(btn, !copyable, '暂无正文可复制');
  });
  toolbar
    .querySelectorAll<HTMLButtonElement>('[data-toolbar-action="keyword-hunter"]')
    .forEach(btn => {
      setToolbarButtonDisabled(btn, !copyable, '暂无正文可推送');
    });
  toolbar.querySelectorAll<HTMLButtonElement>('[data-toolbar-action="edit"]').forEach(btn => {
    setToolbarButtonDisabled(btn, !copyable, '暂无正文可编辑');
  });
}

function setToolbarButtonDisabled(
  button: HTMLButtonElement,
  disabled: boolean,
  disabledTitle: string
): void {
  button.disabled = disabled;
  button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  if (disabled) {
    button.title = disabledTitle;
    button.classList.add('is-disabled');
  } else {
    // Restore original aria-label as title when re-enabled.
    const label = button.getAttribute('aria-label') || '';
    if (label) button.title = label;
    button.classList.remove('is-disabled');
  }
}

/** Append/update/remove live generation text at the end of the toolbar row. */
function syncToolbarLiveGenerationLabel(toolbar: HTMLElement, label: string | null): void {
  let el = toolbar.querySelector<HTMLElement>(`.${TOOLBAR_LIVE_STATUS_CLASS}`);
  if (!label) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('span');
    el.className = TOOLBAR_LIVE_STATUS_CLASS;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    toolbar.appendChild(el);
  }
  if (el.textContent !== label) {
    el.textContent = label;
  }
}

/** Map store status → toolbar badge. Live in-flight uses chrome, not this badge. */
export function resolveToolbarStatusLabel(
  status: DeepChatMessage['status']
): { label: string; statusKey: string } | null {
  if (status === 'stopped') return { label: '已停止', statusKey: 'stopped' };
  if (status === 'partial') return { label: '未完成', statusKey: 'partial' };
  return null;
}

/** Keep/remove status badge: 未完成 | 已停止 (not live 「生成中」) */
function syncToolbarStatusBadge(
  toolbar: HTMLElement,
  storedMessage: DeepChatMessage | undefined
): void {
  const existing = toolbar.querySelector<HTMLElement>('.deep-chat-message-status');
  const resolved = resolveToolbarStatusLabel(storedMessage?.status);

  if (!resolved) {
    existing?.remove();
    return;
  }

  if (existing) {
    if (existing.textContent !== resolved.label) {
      existing.textContent = resolved.label;
    }
    existing.dataset.status = resolved.statusKey;
    return;
  }

  const statusEl = document.createElement('span');
  statusEl.className = 'deep-chat-message-status';
  statusEl.dataset.status = resolved.statusKey;
  statusEl.textContent = resolved.label;
  // Insert after time (first child) so order stays: time | status | tools
  const time = toolbar.querySelector('.deep-chat-message-time');
  if (time?.nextSibling) {
    toolbar.insertBefore(statusEl, time.nextSibling);
  } else if (time) {
    time.insertAdjacentElement('afterend', statusEl);
  } else {
    toolbar.prepend(statusEl);
  }
}

/** Force toolbar status re-sync (call after settle / stop / thread remount / stream tick). */
export function refreshMessageToolbarStatuses(
  chat: DeepChatElement | null,
  getStoredMessages?: () => DeepChatMessage[]
): void {
  const targetChat = chat ?? lastToolbarChat;
  const getMessages = getStoredMessages ?? lastGetStoredMessages;
  if (!targetChat?.shadowRoot || !getMessages) {
    return;
  }
  scheduleRenderMessageToolbars(targetChat, getMessages, lastToolbarActions);
}

function findUnusedRoleIndex(
  storedMessages: DeepChatMessage[],
  usedIndexes: Set<number>,
  role: 'user' | 'ai',
  preferLatest: boolean
): number {
  if (preferLatest) {
    for (let i = storedMessages.length - 1; i >= 0; i--) {
      const candidate = storedMessages[i];
      if (candidate && !usedIndexes.has(i) && getToolbarMessageRole(candidate) === role) {
        return i;
      }
    }
    return -1;
  }
  // Pair left-to-right so earlier bubbles never steal the latest 「未完成/已停止」.
  for (let i = 0; i < storedMessages.length; i++) {
    const candidate = storedMessages[i];
    if (candidate && !usedIndexes.has(i) && getToolbarMessageRole(candidate) === role) {
      return i;
    }
  }
  return -1;
}

/**
 * Pair a DOM bubble with a store message for status badges.
 * - Exact content match first (stable across switch thread / remount).
 * - Fallback: chronological first unused of role (historical bubbles).
 * - preferLatestFallback: only for the live last AI (stream text can lag store).
 */
export function findStoredMessageForToolbar(
  storedMessages: DeepChatMessage[],
  usedIndexes: Set<number>,
  role: 'user' | 'ai',
  content: string,
  options: { preferLatestFallback?: boolean } = {}
): DeepChatMessage | undefined {
  const normalizedContent = normalizeToolbarContent(content);
  let index = storedMessages.findIndex(
    (message, messageIndex) =>
      !usedIndexes.has(messageIndex) &&
      getToolbarMessageRole(message) === role &&
      normalizeToolbarContent(getMessageText(message)) === normalizedContent
  );

  if (index < 0) {
    index = findUnusedRoleIndex(
      storedMessages,
      usedIndexes,
      role,
      Boolean(options.preferLatestFallback)
    );
  }

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
  storedMessage: DeepChatMessage | undefined,
  actions: MessageToolbarActions
): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = MESSAGE_TOOLBAR_CLASS;
  toolbar.dataset.role = role;

  const time = document.createElement('span');
  time.className = 'deep-chat-message-time';
  time.textContent = formatToolbarTime(storedMessage?.createdAt);
  toolbar.appendChild(time);
  syncToolbarStatusBadge(toolbar, storedMessage);
  const skillContexts = actions.getSkillContexts?.() || [];

  toolbar.appendChild(
    createToolbarButton(
      '复制消息',
      getCopyIcon(),
      () => copyMessageContent(bubble, skillContexts),
      {
        action: 'copy',
      }
    )
  );

  if (role === 'ai' && actions.sendToKeywordHunter && actions.canSendToKeywordHunter?.()) {
    toolbar.appendChild(
      createToolbarButton(
        '推送到 Keyword Hunter 复核',
        getSendIcon(),
        () => {
          void actions.sendToKeywordHunter?.(
            getOutgoingMessageContent(bubble, skillContexts),
            storedMessage
          );
        },
        { emphasized: true, action: 'keyword-hunter' }
      )
    );
  }

  if (role === 'user') {
    toolbar.appendChild(
      createToolbarButton(
        '编辑消息',
        getEditIcon(),
        () => editMessageContent(chat, bubble, actions),
        { action: 'edit' }
      )
    );
  }

  return toolbar;
}

function createToolbarButton(
  label: string,
  icon: string,
  onClick: () => void,
  options: { emphasized?: boolean; action?: string } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.emphasized
    ? 'deep-chat-message-tool deep-chat-message-tool--emphasized'
    : 'deep-chat-message-tool';
  button.title = label;
  button.setAttribute('aria-label', label);
  if (options.action) {
    button.dataset.toolbarAction = options.action;
  }
  setSafeHtml(button, icon);
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    onClick();
  });
  return button;
}

function copyMessageContent(bubble: HTMLElement, skillContexts: DeepChatSkillContext[] = []): void {
  const content = getOutgoingMessageContent(bubble, skillContexts);
  if (!content) {
    return;
  }

  void copyTextToClipboard(content)
    .then(ok => {
      if (!ok) {
        showToast('复制失败，请手动选择文本复制', { type: 'error' });
        return;
      }
      showToast('消息已复制', { type: 'success' });
    })
    .catch(() => {
      showToast('复制失败，请手动选择文本复制', { type: 'error' });
    });
}

function editMessageContent(
  chat: DeepChatElement,
  bubble: HTMLElement,
  actions: MessageToolbarActions
): void {
  const skillContexts = actions.getSkillContexts?.() || [];
  const content = getOutgoingMessageContent(bubble, skillContexts);
  if (!content) {
    return;
  }

  if (actions.refillComposerWithText) {
    // 保持 Chip 样式回填；输入框内 hover 显示移除 ×
    actions.refillComposerWithText(content);
  } else {
    const input = chat.shadowRoot?.querySelector<HTMLElement>('#text-input');
    if (!input) {
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
  }
  showToast('已放回输入框，可修改后重新发送', { type: 'success' });
}

function getMessageContent(
  bubble: HTMLElement,
  skillContexts: DeepChatSkillContext[] = []
): string {
  // 优先序列化 Chip 为「技能名」，避免 innerText 拆碎标签
  if (bubble.querySelector('.deep-chat-context-chip')) {
    return serializeChipContainingElement(bubble, skillContexts).trim();
  }
  return (bubble.innerText || bubble.textContent || '').trim();
}

/**
 * 消息正文出口（复制 / 推送到 Keyword Hunter / 编辑回填共用）。
 * Listing 工作流下剥离模型误写入正文的自我审查/开场前言，普通聊天原样返回。
 */
function getOutgoingMessageContent(
  bubble: HTMLElement,
  skillContexts: DeepChatSkillContext[] = []
): string {
  const content = getMessageContent(bubble, skillContexts);
  return isListingPromptContext() ? sanitizeListingCopy(content) : content;
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

function getSendIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 2 11 13"></path>
      <path d="m22 2-7 20-4-9-9-4Z"></path>
    </svg>
  `;
}
