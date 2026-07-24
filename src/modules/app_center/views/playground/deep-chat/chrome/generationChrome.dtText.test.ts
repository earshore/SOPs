import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX,
  resolveDeepChatDtBodyEl,
  stripSettledChromeFromHost,
  syncDeepChatDtBodyScrollCap,
  syncLivePlaceholderBubble,
} from './generationChrome';
import { GENERATION_CHROME_CLASS } from '../session/sessionState';
import type { PendingDeepChatRequest } from '../request/lifecycle';

describe('syncDeepChatDtBodyScrollCap', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  function mountBodyWithText(textContent: string): { body: HTMLElement; text: HTMLElement } {
    const body = document.createElement('div');
    body.className = 'deep-chat-dt-body';
    const text = document.createElement('pre');
    text.className = 'deep-chat-dt-text';
    text.textContent = textContent;
    body.appendChild(text);
    document.body.appendChild(body);
    return { body, text };
  }

  it('resolves body from either body or inner text node', () => {
    const { body, text } = mountBodyWithText('x');
    expect(resolveDeepChatDtBodyEl(body)).toBe(body);
    expect(resolveDeepChatDtBodyEl(text)).toBe(body);
  });

  it('does not force a tall frame when text is short (uses content height, not stretched body)', () => {
    const { body, text } = mountBodyWithText('short reasoning');
    // Stretched body would report a large scrollHeight — must not trust that alone.
    Object.defineProperty(body, 'scrollHeight', { configurable: true, get: () => 480 });
    Object.defineProperty(text, 'scrollHeight', { configurable: true, get: () => 40 });

    const scrollSetter = vi.fn();
    Object.defineProperty(body, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: scrollSetter,
    });

    syncDeepChatDtBodyScrollCap(text, DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX);
    // Short content: scrollTop reset to 0 (not stuck at bottom of a tall empty frame)
    expect(scrollSetter).toHaveBeenCalledWith(0);
    expect(body.classList.contains('is-scroll-capped')).toBe(false);
  });

  it('sticks to bottom when content exceeds max height', () => {
    const { body, text } = mountBodyWithText('long\n'.repeat(80));
    Object.defineProperty(body, 'scrollHeight', { configurable: true, get: () => 480 });
    Object.defineProperty(text, 'scrollHeight', { configurable: true, get: () => 480 });

    let top = 0;
    Object.defineProperty(body, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (v: number) => {
        top = v;
      },
    });

    syncDeepChatDtBodyScrollCap(text, DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX);
    expect(top).toBe(480);
  });
});

describe('stripSettledChromeFromHost (continue-chat flash)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('removes leftover is-settled chrome so live slot does not flash 已完成 0s', () => {
    const host = document.createElement('div');
    const chrome = document.createElement('div');
    chrome.className = `${GENERATION_CHROME_CLASS} is-settled`;
    const settled = document.createElement('div');
    settled.className = 'deep-chat-dt-settled';
    settled.innerHTML =
      '<button class="deep-chat-dt-done-toggle"><span class="deep-chat-dt-done-label">已完成 0s</span></button>';
    chrome.appendChild(settled);
    host.appendChild(chrome);
    document.body.appendChild(host);

    stripSettledChromeFromHost(host);
    expect(host.querySelector(`.${GENERATION_CHROME_CLASS}`)).toBeNull();
    expect(host.querySelector('.deep-chat-dt-settled')).toBeNull();
  });
});

describe('syncLivePlaceholderBubble (ZWSP remount row)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('marks ZWSP-only AI bubble as live placeholder while pending has no displayed text', () => {
    const host = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble ai-message';
    const p = document.createElement('p');
    p.textContent = '\u200b';
    bubble.appendChild(p);
    host.appendChild(bubble);
    document.body.appendChild(host);

    const pending = {
      isSettled: false,
      displayedAssistantText: '',
    } as PendingDeepChatRequest;

    syncLivePlaceholderBubble(host, pending);
    expect(bubble.classList.contains('is-live-placeholder')).toBe(true);
    expect(p.getAttribute('data-live-placeholder')).toBe('true');
  });

  it('clears placeholder once real assistant text is displayed', () => {
    const host = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble ai-message';
    bubble.textContent = 'hello world';
    host.appendChild(bubble);
    document.body.appendChild(host);

    const pending = {
      isSettled: false,
      displayedAssistantText: 'hello world',
    } as PendingDeepChatRequest;

    syncLivePlaceholderBubble(host, pending);
    expect(bubble.classList.contains('is-live-placeholder')).toBe(false);
  });
});
