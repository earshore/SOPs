import { afterEach, describe, expect, it, vi } from 'vitest';

import { disconnectChatViewRebuildWatch, watchChatViewRebuild } from './chatViewChrome';
import { sessionState } from '../session/sessionState';
import type { DeepChatElement, DeepChatThread } from '../types';

function makeThread(id: string, messages: DeepChatThread['messages']): DeepChatThread {
  return {
    id,
    title: id,
    messages,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

/** 模拟 vendor 结构：host(shadow) > #container > #chat-view > #messages */
function mountChatView(): {
  container: HTMLElement;
  host: HTMLElement;
  containerEl: HTMLElement;
  chatView: HTMLElement;
  messages: HTMLElement;
  historyValue: unknown[];
  historySets: { count: number };
} {
  const container = document.createElement('div');
  const host = document.createElement('div');
  host.id = 'deep-chat-view';
  const shadow = host.attachShadow({ mode: 'open' });
  const containerEl = document.createElement('div');
  containerEl.id = 'container';
  const chatView = document.createElement('div');
  chatView.id = 'chat-view';
  const messages = document.createElement('div');
  messages.id = 'messages';
  chatView.appendChild(messages);
  containerEl.appendChild(chatView);
  shadow.appendChild(containerEl);
  container.appendChild(host);

  const historyValue: unknown[] = [];
  const historySets = { count: 0 };
  Object.defineProperty(host, 'history', {
    configurable: true,
    get: () => historyValue,
    set: (value: unknown[]) => {
      historyValue.splice(0, historyValue.length, ...(value as never[]));
      historySets.count += 1;
    },
  });
  return { container, host, containerEl, chatView, messages, historyValue, historySets };
}

/** 模拟 vendor 整层重建：#container 下的 #chat-view（含 #messages）被新元素替换 */
function rebuildChatView(containerEl: HTMLElement): void {
  const chatView = document.createElement('div');
  chatView.id = 'chat-view';
  const messages = document.createElement('div');
  messages.id = 'messages';
  chatView.appendChild(messages);
  containerEl.replaceChild(chatView, containerEl.querySelector('#chat-view')!);
}

describe('watchChatViewRebuild verification-driven replay', () => {
  afterEach(() => {
    disconnectChatViewRebuildWatch();
    sessionState.threadStore = { activeThreadId: '', threads: [] };
    sessionState.pendingRequests.clear();
    document.body.replaceChildren();
  });

  it('replays thread history when the chat-view is rebuilt', async () => {
    const { container, host, containerEl, historySets, historyValue } = mountChatView();
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [
        makeThread('t1', [
          { role: 'user', text: 'Q1', createdAt: 1 },
          { role: 'ai', text: 'A1', createdAt: 2 },
        ]),
      ],
    };

    watchChatViewRebuild(host as unknown as DeepChatElement, container);
    rebuildChatView(containerEl);

    await vi.waitFor(() => expect(historySets.count).toBe(1));
    expect(historyValue).toHaveLength(2);
  });

  it('retries the replay while the message area stays empty (vendor async rebuild window)', async () => {
    const { container, host, containerEl, historySets } = mountChatView();
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [
        makeThread('t1', [
          { role: 'user', text: 'Q1', createdAt: 1 },
          { role: 'ai', text: 'A1', createdAt: 2 },
        ]),
      ],
    };

    watchChatViewRebuild(host as unknown as DeepChatElement, container);
    rebuildChatView(containerEl);

    await vi.waitFor(() => expect(historySets.count).toBe(1));
    // 消息区仍为空：320ms 后应再重放一次
    await new Promise(resolve => setTimeout(resolve, 360));
    expect(historySets.count).toBe(2);

    // 渲染落地后不再重试
    const messages = containerEl.querySelector('#messages')!;
    const row = document.createElement('div');
    row.className = 'outer-message-container';
    messages.appendChild(row);
    const settledCount = historySets.count;
    await new Promise(resolve => setTimeout(resolve, 360 * 4));
    expect(historySets.count).toBe(settledCount);
  });

  it('stops retrying after the bounded attempt budget when the area never renders', async () => {
    const { container, host, containerEl, historySets } = mountChatView();
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [makeThread('t1', [{ role: 'user', text: 'Q1', createdAt: 1 }])],
    };

    watchChatViewRebuild(host as unknown as DeepChatElement, container);
    rebuildChatView(containerEl);

    await vi.waitFor(() => expect(historySets.count).toBe(1));
    // 空消息区永远不落地：刚好打到上限（6 次重放）后停止
    await new Promise(resolve => setTimeout(resolve, 320 * 8));
    expect(historySets.count).toBe(6);
  });

  it('does not replay when the active thread has no displayable messages', async () => {
    const { container, host, containerEl, historySets } = mountChatView();
    sessionState.threadStore = {
      activeThreadId: 't1',
      threads: [makeThread('t1', [])],
    };

    watchChatViewRebuild(host as unknown as DeepChatElement, container);
    rebuildChatView(containerEl);

    // 观察者会触发，但空会话没有可恢复内容：等待重试窗口后仍无重放
    await new Promise(resolve => setTimeout(resolve, 360 * 3));
    expect(historySets.count).toBe(0);
  });
});
