import { setSafeHtml } from '@/common/utils/security';
import { showToast } from '@/common/ui/notifications';
import { MESSAGE_TOOLBAR_CLASS } from './constants';
import type { DeepChatElement, DeepChatMessage } from './types';
import { getMessageText } from './utils';

let messageToolbarObserver: MutationObserver | null = null;
let messageToolbarTimer: number | null = null;
let messageToolbarFrame: number | null = null;

export function setupMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[]
): void {
  cleanupMessageToolbars();

  const installToolbars = (): void => {
    const root = chat.shadowRoot;
    if (!root) {
      return;
    }

    scheduleRenderMessageToolbars(chat, getStoredMessages);
    messageToolbarObserver = new MutationObserver(() =>
      scheduleRenderMessageToolbars(chat, getStoredMessages)
    );
    messageToolbarObserver.observe(root, { childList: true, subtree: true });
  };

  messageToolbarTimer = window.setTimeout(installToolbars, 0);
}

export function cleanupMessageToolbars(): void {
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

function scheduleRenderMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[]
): void {
  if (messageToolbarFrame !== null) {
    return;
  }

  messageToolbarFrame = window.requestAnimationFrame(() => {
    messageToolbarFrame = null;
    renderMessageToolbars(chat, getStoredMessages);
  });
}

function renderMessageToolbars(
  chat: DeepChatElement,
  getStoredMessages: () => DeepChatMessage[]
): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  const messages = Array.from(root.querySelectorAll<HTMLElement>('.outer-message-container'));
  const storedMessages = getStoredMessages();
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
  textarea.className = 'sr-only';
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
