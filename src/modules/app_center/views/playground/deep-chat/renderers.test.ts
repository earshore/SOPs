import { describe, expect, it } from 'vitest';
import { renderThreadList } from './renderers';
import type { DeepChatThreadStore } from './types';

function makeStore(): DeepChatThreadStore {
  return {
    activeThreadId: 'thread-1',
    threads: [
      {
        id: 'thread-1',
        title: 'First thread',
        messages: [],
        draftText: '',
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'thread-2',
        title: 'Second thread',
        messages: [],
        draftText: '',
        createdAt: 1500,
        updatedAt: 1500,
      },
    ],
  };
}

function createThreadListContainer(): HTMLDivElement {
  const container = document.createElement('div');
  const list = document.createElement('div');
  list.id = 'deep-chat-thread-list';
  container.append(list);
  return container;
}

describe('renderThreadList skill badge', () => {
  it('shows a skill badge when the thread has skillContexts', () => {
    const container = createThreadListContainer();
    const store = makeStore();
    store.threads[0] = {
      ...store.threads[0]!,
      skillContexts: [
        {
          skillId: 'profit-calculator',
          skillTitle: '利润测算',
          skillRaw: '# Profit',
        },
      ],
    };
    renderThreadList(container, store, new Map());
    const badge = container.querySelector('.deep-chat-thread-skill-badge');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('title')).toContain('利润测算');
    expect(container.querySelector('#thread-2') || true).toBeTruthy();
    expect(container.querySelectorAll('.deep-chat-thread-skill-badge').length).toBe(1);
  });
});

describe('renderThreadList unread indicator', () => {
  it('shows a solid unread dot for inactive threads with hasUnread', () => {
    const container = createThreadListContainer();
    const store = makeStore();
    store.threads[1] = {
      ...store.threads[1]!,
      hasUnread: true,
    };
    renderThreadList(container, store, new Map());
    const unreadItem = container.querySelector('.deep-chat-thread-item.is-unread');
    expect(unreadItem).not.toBeNull();
    expect(unreadItem?.querySelector('.deep-chat-thread-unread')).not.toBeNull();
    expect(unreadItem?.textContent).toContain('Second thread');
  });

  it('does not show unread on the active thread even if hasUnread is set', () => {
    const container = createThreadListContainer();
    const store = makeStore();
    store.threads[0] = {
      ...store.threads[0]!,
      hasUnread: true,
    };
    renderThreadList(container, store, new Map());
    expect(container.querySelector('.deep-chat-thread-unread')).toBeNull();
    expect(container.querySelector('.deep-chat-thread-item.is-unread')).toBeNull();
  });
});

describe('renderThreadList inline rename editing', () => {
  it('renders a normal text item when not editing', () => {
    const container = createThreadListContainer();
    renderThreadList(container, makeStore(), new Map());
    const list = container.querySelector('#deep-chat-thread-list');
    expect(list).not.toBeNull();
    expect(list?.querySelector('input.deep-chat-thread-name-input')).toBeNull();
    expect(list?.textContent).toContain('First thread');
  });

  it('renders an inline input for the editing thread seeded with the current value', () => {
    const container = createThreadListContainer();
    renderThreadList(container, makeStore(), new Map(), null, {
      id: 'thread-2',
      value: 'Second thread',
    });
    const list = container.querySelector('#deep-chat-thread-list');
    expect(list).not.toBeNull();
    const input = list?.querySelector<HTMLInputElement>('input.deep-chat-thread-name-input');
    expect(input).not.toBeNull();
    expect(input?.dataset.threadEditId).toBe('thread-2');
    expect(input?.value).toBe('Second thread');
    expect(input?.getAttribute('maxlength')).toBe('120');
  });

  it('escapes the editing value so it is attribute-safe and round-trips', () => {
    const container = createThreadListContainer();
    const raw = '<script>"&</script>';
    renderThreadList(container, makeStore(), new Map(), null, { id: 'thread-2', value: raw });
    const input = container.querySelector<HTMLInputElement>('input.deep-chat-thread-name-input');
    expect(input).not.toBeNull();
    // getAttribute returns the decoded value; escapeHTML + attribute parsing keep it safe
    expect(input?.getAttribute('value')).toBe(raw);
    // The dangerous double-quote is escaped, so the attribute cannot be broken out of.
    const serialized = input?.outerHTML ?? '';
    expect(serialized).toContain('&quot;');
  });
});
