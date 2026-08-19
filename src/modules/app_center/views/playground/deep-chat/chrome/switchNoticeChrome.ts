import { getChat } from '../session/domHelpers';
import { sessionState } from '../session/sessionState';
import { getActiveThread, getThreadForSave } from '../session/threadStore';

/**
 * 模型切换通知（role: system）渲染对账：
 * - 生成中切换模型只落数据不实时渲染（见 appendThreadNotice），生成结束后调用本函数
 *   把缺失的通知补渲染进消息区（按文本去重，已渲染的跳过）；
 * - 同时兜底 vendor 整树重建导致的通知 DOM 丢失（数据层记录始终在 thread.messages，
 *   切走再切回/刷新由 history 恢复，此处只补「内存渲染层」的缺口）。
 */
export function reconcileSwitchNotices(container: HTMLElement, threadId?: string): void {
  // getThreadForSave：按 id 取线程（null 时回落 active），且不触发空线程重建副作用。
  const thread = getThreadForSave(threadId) ?? getActiveThread();
  if (!thread) {
    return;
  }
  // 生成期间切走的会话：不往当前（其它会话的）消息区刷通知；数据已在
  // thread.messages，切回时 history 恢复自然带出通知。
  if (thread.id !== sessionState.threadStore.activeThreadId) {
    return;
  }
  const notices = thread.messages.filter(message => message.role === 'system');
  if (notices.length === 0) {
    return;
  }
  const chat = getChat(container);
  if (!chat?.shadowRoot) {
    return;
  }
  const rendered = new Set<string>();
  chat.shadowRoot
    .querySelectorAll<HTMLElement>('.deep-chat-outer-container-role-system')
    .forEach(element => {
      const text = element.textContent?.trim() ?? '';
      if (text.startsWith('切换至')) {
        rendered.add(text);
      }
    });
  for (const notice of notices) {
    const text = notice.text?.trim() ?? '';
    if (text && !rendered.has(text)) {
      chat.addMessage?.(notice, false);
      rendered.add(text);
    }
  }
}
