import { getChat } from '../session/domHelpers';
import { getActiveThread } from '../session/threadStore';
import { getThreadDisplayMessages } from '../session/pendingRuntime';
import type { DeepChatElement } from '../types';

/**
 * vendor 在属性 setter 响应（如 images 赋值）等路径会整层重建 #chat-view：
 * 新消息区为空且不重放我们设置的 history。兜底：观察 #container 的 childList，
 * 检测到 chat-view 被替换后重放当前会话历史（含模型切换通知），避免消息区空置。
 *
 * 绑定在 initDeepChat（每次 replaceChat/挂载后调用；shadow 未就绪时延迟重试）。
 * 重放有防抖：重建可能连续多次，冷却窗口内只重放一次；history 重放本身不会
 * 再触发 chat-view 重建（vendor 渲染消息数据，不重建容器）。
 */
let chatViewObserver: MutationObserver | null = null;
let chatViewRebindTimer: number | null = null;
let lastHistoryReplayAt = 0;

const CHAT_VIEW_REBIND_DELAY_MS = 80;
const CHAT_VIEW_REPLAY_COOLDOWN_MS = 600;
const CHAT_VIEW_REBIND_MAX_ATTEMPTS = 10;

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
    if (now - lastHistoryReplayAt < CHAT_VIEW_REPLAY_COOLDOWN_MS) {
      return;
    }
    const activeThread = getActiveThread();
    if (!activeThread) {
      return;
    }
    lastHistoryReplayAt = now;
    chat.history = getThreadDisplayMessages(activeThread);
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
}
