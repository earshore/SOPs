import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const appStoreMock = vi.hoisted(() => ({
  getState: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: appStoreMock,
}));

import { hidePromptPreview, resetPromptPreviewState, setupPromptPreview } from './promptPreview';

const PROMPT_DRAFT = {
  id: 'prompt-1',
  prompt: 'Rewrite this listing with sharper benefits',
  promptType: 'listing' as const,
  marketplace: 'US',
  asins: ['B001'],
  timestamp: 1000,
};

function mountFixture() {
  const container = document.createElement('div');
  const promptList = document.createElement('div');
  promptList.id = 'deep-chat-prompt-list';
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.previewPromptId = 'prompt-1';
  promptList.append(button);
  container.append(promptList);
  const preview = document.createElement('div');
  preview.id = 'deep-chat-prompt-preview-popover';
  preview.classList.add('deep-chat-prompt-preview-popover');
  preview.setAttribute('aria-hidden', 'true');
  const title = document.createElement('div');
  title.className = 'deep-chat-prompt-preview-title';
  const body = document.createElement('div');
  body.className = 'deep-chat-prompt-preview-body';
  preview.append(title, body);
  container.append(preview);
  const cleanups: Array<() => void> = [];
  setupPromptPreview(container, promptList, cleanup => cleanups.push(cleanup));
  document.body.append(container);
  return { container, promptList, button, preview, cleanups };
}

function hover(button: HTMLElement): void {
  button.dispatchEvent(
    new MouseEvent('pointerover', { bubbles: true, clientX: 100, clientY: 100 })
  );
}

function isVisible(preview: HTMLElement): boolean {
  return preview.classList.contains('is-visible');
}

describe('deep chat prompt preview (hover-only)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    appStoreMock.getState.mockReturnValue({
      promptlab: { history: [PROMPT_DRAFT] },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    resetPromptPreviewState();
    vi.restoreAllMocks();
  });

  it('shows after the 1s hover dwell', () => {
    const { button, preview, cleanups } = mountFixture();

    hover(button);
    expect(isVisible(preview)).toBe(false);
    vi.advanceTimersByTime(999);
    expect(isVisible(preview)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isVisible(preview)).toBe(true);
    expect(preview.getAttribute('aria-hidden')).toBe('false');
    expect(preview.querySelector('.deep-chat-prompt-preview-title')?.textContent).toContain(
      'Listing Prompt'
    );

    cleanups.forEach(cleanup => cleanup());
  });

  it('hides shortly after pointer leaves the list', () => {
    const { promptList, button, preview, cleanups } = mountFixture();

    hover(button);
    vi.advanceTimersByTime(1000);
    expect(isVisible(preview)).toBe(true);

    promptList.dispatchEvent(new MouseEvent('pointerleave'));
    vi.advanceTimersByTime(160);
    expect(isVisible(preview)).toBe(false);
    expect(preview.getAttribute('aria-hidden')).toBe('true');

    cleanups.forEach(cleanup => cleanup());
  });

  it('keeps the bubble visible while the preview itself is hovered', () => {
    const { promptList, button, preview, cleanups } = mountFixture();

    hover(button);
    vi.advanceTimersByTime(1000);
    preview.dispatchEvent(new MouseEvent('pointerenter'));
    promptList.dispatchEvent(new MouseEvent('pointerleave'));
    vi.advanceTimersByTime(300);
    expect(isVisible(preview)).toBe(true);

    cleanups.forEach(cleanup => cleanup());
  });

  it('click-hide during the dwell cancels the show timer', () => {
    const { button, preview, container, cleanups } = mountFixture();

    hover(button);
    vi.advanceTimersByTime(500);
    hidePromptPreview(container);
    vi.advanceTimersByTime(1000);
    expect(isVisible(preview)).toBe(false);

    cleanups.forEach(cleanup => cleanup());
  });

  it('suppresses dwell rescheduling for residual pointerover right after a click', () => {
    const { button, preview, cleanups } = mountFixture();

    // 点击（真实点击序列会残留一次同位置 pointerover）
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    hover(button);
    vi.advanceTimersByTime(1500);
    expect(isVisible(preview)).toBe(false);

    // 点击窗口（1s）过后再次 hover：正常调度显示
    vi.advanceTimersByTime(2000);
    hover(button);
    vi.advanceTimersByTime(1000);
    expect(isVisible(preview)).toBe(true);

    cleanups.forEach(cleanup => cleanup());
  });

  it('focus does not show the preview (mouse-hover only)', () => {
    const { button, preview, cleanups } = mountFixture();

    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(1200);
    expect(isVisible(preview)).toBe(false);

    cleanups.forEach(cleanup => cleanup());
  });
});
