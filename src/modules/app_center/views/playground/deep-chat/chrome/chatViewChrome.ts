import { getChat } from '../session/domHelpers';
import { getThreadDisplayMessages } from '../session/pendingRuntime';
import { getActiveThread } from '../session/threadStore';

import type { DeepChatElement } from '../types';

/**
 * vendor 在属性 setter 响应（如 images 赋值）或内部视图重建等路径会整层重建
 * #chat-view（#container 的 childList 变化可观察）：新消息区为空且内部消息列表
 * 被新控制器接管。兜底：观察 #container 的 childList，检测到 chat-view 被替换后
 * 重放当前会话历史（含模型切换通知），避免消息区空置。
 *
 * vendor 重建本身是异步的（新视图落定前 history 赋值可能被吞），因此重放采用
 * 「验证驱动」：重放后短暂等待，若消息区仍为空且线程确有消息，限次重试，直到
 * 渲染落地；重放自身引发的重建由冷却窗口拦截，不会形成观察者风暴。
 *
 * 绑定在 initDeepChat（每次 replaceChat/挂载后调用；shadow 未就绪时延迟重试）。
 * 单测 mock chat 无 #container / #chat-view：绑定与重试均有限次，避免假定时器死循环。
 */
let chatViewObserver: MutationObserver | null = null;
let chatViewRebindTimer: number | null = null;
let chatViewRetryTimer: number | null = null;
let lastHistoryReplayAt = 0;
let chatViewRetryCount = 0;

const CHAT_VIEW_REBIND_DELAY_MS = 80;
const CHAT_VIEW_REPLAY_COOLDOWN_MS = 600;
const CHAT_VIEW_REBIND_MAX_ATTEMPTS = 10;
const CHAT_VIEW_REPLAY_RETRY_MAX = 6;
const CHAT_VIEW_REPLAY_RETRY_DELAY_MS = 320;

/** 消息区当前是否没有任何消息外框（含新视图尚未渲染完成的空窗）。 */
function isMessagesAreaEmpty(chat: DeepChatElement): boolean {
  const messagesEl = chat.shadowRoot?.querySelector('#chat-view')?.querySelector('#messages');
  if (!messagesEl) {
    return true;
  }
  return messagesEl.querySelectorAll('.outer-message-container').length === 0;
}

/** 重放线程显示历史；若重放后消息区仍未落地，继续限次重试。 */
function replayThreadHistoryWithRetry(chat: DeepChatElement, container: HTMLElement): void {
  if (chatViewRetryTimer !== null || chatViewRetryCount >= CHAT_VIEW_REPLAY_RETRY_MAX) {
    return;
  }
  const activeThread = getActiveThread();
  if (!activeThread) {
    return;
  }
  const displayMessages = getThreadDisplayMessages(activeThread);
  if (displayMessages.length === 0) {
    return; // 空会话没有可恢复内容
  }

  chatViewRetryCount += 1;
  chat.history = displayMessages;

  chatViewRetryTimer = window.setTimeout(() => {
    chatViewRetryTimer = null;
    if (getChat(container) !== chat) {
      return; // 元素已更换：initDeepChat 会重新绑定
    }
    if (!isMessagesAreaEmpty(chat)) {
      return; // 已渲染落地，收工
    }
    replayThreadHistoryWithRetry(chat, container);
  }, CHAT_VIEW_REPLAY_RETRY_DELAY_MS);
}

export function watchChatViewRebuild(
  chat: DeepChatElement,
  container: HTMLElement,
  attempt = 0
): void {
  disconnectChatViewRebuildWatch();

  const host = chat.shadowRoot?.querySelector('#container');
  if (!host) {
    // vendor shadow 初次渲染为异步：稍后重试绑定（元素已更换则放弃；
    // 无 #container 的环境（如单测 mock）重试有限次后放弃）。
    if (attempt >= CHAT_VIEW_REBIND_MAX_ATTEMPTS) {
      return;
    }
    chatViewRebindTimer = window.setTimeout(() => {
      chatViewRebindTimer = null;
      if (getChat(container) === chat) {
        watchChatViewRebuild(chat, container, attempt + 1);
      }
    }, CHAT_VIEW_REBIND_DELAY_MS);
    return;
  }

  chatViewObserver = new MutationObserver(() => {
    if (getChat(container) !== chat) {
      return; // replaceChat 已换元素：initDeepChat 会重新绑定
    }
    const now = Date.now();
    // 重放自身会触发 vendor 异步重建（又一发 childList）；冷却窗口内不再响应，
    // 验证重试独立于冷却，只在消息区仍为空时继续。
    if (now - lastHistoryReplayAt < CHAT_VIEW_REPLAY_COOLDOWN_MS) {
      return;
    }
    lastHistoryReplayAt = now;
    chatViewRetryCount = 0;
    replayThreadHistoryWithRetry(chat, container);
  });
  chatViewObserver.observe(host, { childList: true });
}

export function disconnectChatViewRebuildWatch(): void {
  if (chatViewObserver) {
    chatViewObserver.disconnect();
    chatViewObserver = null;
  }
  if (chatViewRebindTimer !== null) {
    window.clearTimeout(chatViewRebindTimer);
    chatViewRebindTimer = null;
  }
  if (chatViewRetryTimer !== null) {
    window.clearTimeout(chatViewRetryTimer);
    chatViewRetryTimer = null;
  }
  chatViewRetryCount = 0;
  // 冷却窗口随观察者生命周期归零：重建兜底从新观察者起重新计时
  lastHistoryReplayAt = 0;
}
