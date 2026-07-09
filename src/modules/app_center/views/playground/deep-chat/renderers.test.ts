import { describe, expect, it } from 'vitest';
import { renderThreadList } from './renderers';

// Minimal store shape; typing is intentionally loose for the unit test.
function makeStore(): any {
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
