import { afterEach, describe, expect, it, vi } from 'vitest';
// vi used for typewriter rearm fake timers
import {
  DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX,
  applySettledDeepThinkingUi,
  getOrCreateSettledUiState,
  liveHostHasRequiredGenerationChrome,
  mountSettledDeepThinkingChrome,
  paintOrResumeStreamingReasoning,
  preparePendingSettledHandoff,
  resolveDeepChatDtBodyEl,
  stopReasoningTypewriter,
  stripSettledChromeFromHost,
  syncActivityListDom,
  syncDeepChatDtBodyScrollCap,
  syncLivePlaceholderBubble,
} from './generationChrome';
import { GENERATION_CHROME_CLASS, sessionState } from '../session/sessionState';
import type { PendingDeepChatRequest } from '../request/lifecycle';
import {
  createPendingDeepChatRequest,
  markPendingDeepChatRequestSettled,
} from '../request/lifecycle';

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
    const doneToggle = document.createElement('button');
    doneToggle.className = 'deep-chat-dt-done-toggle';
    const doneLabel = document.createElement('span');
    doneLabel.className = 'deep-chat-dt-done-label';
    doneLabel.textContent = '已完成 0s';
    doneToggle.appendChild(doneLabel);
    settled.appendChild(doneToggle);
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

describe('settled activity list DOM', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders expandable activity rows and applies settled chrome labels', () => {
    const list = document.createElement('div');
    list.className = 'deep-chat-dt-activity-list is-settled-list';
    document.body.appendChild(list);

    const expanded: Record<string, boolean> = { t1: true };
    syncActivityListDom(
      list,
      [
        {
          id: 't1',
          kind: 'tool',
          label: '网页搜索',
          detail: 'result body',
          status: 'done',
          order: 0,
        },
        {
          id: 't2',
          kind: 'status',
          label: '准备中',
          status: 'running',
          order: 1,
        },
      ],
      {
        getExpanded: id => Boolean(expanded[id]),
        setExpanded: (id, open) => {
          expanded[id] = open;
        },
        showStatusBadge: true,
      }
    );

    expect(list.querySelectorAll('.deep-chat-dt-activity')).toHaveLength(2);
    expect(list.querySelector('[data-step-id="t1"] .deep-chat-dt-text')?.textContent).toBe(
      'result body'
    );
    expect(
      list
        .querySelector('[data-step-id="t2"] .deep-chat-dt-toggle')
        ?.classList.contains('is-static')
    ).toBe(true);

    const settled = document.createElement('div');
    settled.className = 'deep-chat-dt-settled';
    const doneToggle = document.createElement('button');
    doneToggle.type = 'button';
    doneToggle.className = 'deep-chat-dt-done-toggle';
    const doneLabel = document.createElement('span');
    doneLabel.className = 'deep-chat-dt-done-label';
    doneToggle.appendChild(doneLabel);
    const donePanel = document.createElement('div');
    donePanel.className = 'deep-chat-dt-done-panel';
    donePanel.hidden = true;
    const settledList = document.createElement('div');
    settledList.className = 'deep-chat-dt-activity-list is-settled-list';
    donePanel.appendChild(settledList);
    settled.append(doneToggle, donePanel);
    document.body.appendChild(settled);

    applySettledDeepThinkingUi(settled, '', 3, 'test-ui-key', []);
    expect(settled.querySelector('.deep-chat-dt-done-label')?.textContent).toMatch(/已完成/);
    expect(
      settled.querySelector('.deep-chat-dt-done-toggle')?.classList.contains('is-static')
    ).toBe(true);
  });
});

describe('preparePendingSettledHandoff + mountSettledDeepThinkingChrome', () => {
  afterEach(() => {
    document.body.replaceChildren();
    sessionState.settledDeepThinkingUi.clear();
    stopReasoningTypewriter();
  });

  it('keeps reasoning readable after settle when stream was expanded (O1)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const pending = createPendingDeepChatRequest('thread-handoff', []);
    pending.reasoningText = 'visible reasoning body line';
    pending.reasoningUiExpanded = true;
    pending.reasoningDisplayedLength = 4; // mid-typewriter

    // Production order: mark (clears live expand) then handoff/sync chrome.
    markPendingDeepChatRequestSettled(pending);
    expect(pending.reasoningUiExpanded).toBe(false);
    expect(pending.reasoningExpandedAtSettle).toBe(true);
    expect(pending.isSettled).toBe(true);

    const uiKey = `thread-handoff:pending-settled:${pending.startedAt}`;
    preparePendingSettledHandoff(pending, uiKey);

    expect(pending.reasoningDisplayedLength).toBe(pending.reasoningText.length);
    const state = getOrCreateSettledUiState(uiKey);
    expect(state.doneOpen).toBe(true);
    expect(state.activityOpen.reasoning).toBe(true);

    mountSettledDeepThinkingChrome(host, pending.reasoningText, 2, uiKey);
    const text = host.querySelector(
      '.deep-chat-dt-activity[data-kind="reasoning"] .deep-chat-dt-text'
    );
    expect(text?.textContent).toBe('visible reasoning body line');
    const donePanel = host.querySelector('.deep-chat-dt-done-panel') as HTMLElement | null;
    expect(donePanel?.hidden).toBe(false);
  });

  it('does not force-open 已完成 when user collapsed stream (A1)', () => {
    const pending = createPendingDeepChatRequest('thread-collapsed', []);
    pending.reasoningText = 'hidden while collapsed';
    pending.reasoningUiExpanded = false;
    pending.reasoningDisplayedLength = 3;

    markPendingDeepChatRequestSettled(pending);
    expect(pending.reasoningExpandedAtSettle).toBe(false);

    const uiKey = `thread-collapsed:pending-settled:${pending.startedAt}`;
    preparePendingSettledHandoff(pending, uiKey);
    const state = getOrCreateSettledUiState(uiKey);
    expect(state.doneOpen).toBe(false);
    expect(state.activityOpen.reasoning).toBeFalsy();
    // Flush still completes full length so no truncated slice is lost.
    expect(pending.reasoningDisplayedLength).toBe(pending.reasoningText.length);
  });
});

describe('paintOrResumeStreamingReasoning', () => {
  afterEach(() => {
    document.body.replaceChildren();
    stopReasoningTypewriter();
  });

  it('instant-paints large one-shot reasoning dumps (O3)', () => {
    const text = document.createElement('pre');
    text.className = 'deep-chat-dt-text';
    const body = document.createElement('div');
    body.className = 'deep-chat-dt-body';
    body.appendChild(text);
    document.body.appendChild(body);

    const pending = createPendingDeepChatRequest('thread-instant', []);
    pending.reasoningUiExpanded = true;
    const full = 'x'.repeat(200);
    pending.reasoningText = full;
    pending.reasoningDisplayedLength = 0;

    paintOrResumeStreamingReasoning(text, pending, full);
    expect(text.textContent).toBe(full);
    expect(pending.reasoningDisplayedLength).toBe(full.length);
  });

  it('re-arms typewriter when full grows after catch-up (O3)', () => {
    vi.useFakeTimers();
    const text = document.createElement('pre');
    text.className = 'deep-chat-dt-text';
    const body = document.createElement('div');
    body.className = 'deep-chat-dt-body';
    body.appendChild(text);
    document.body.appendChild(body);

    const pending = createPendingDeepChatRequest('thread-rearm', []);
    pending.reasoningUiExpanded = true;
    pending.reasoningText = 'abc';
    pending.reasoningDisplayedLength = 3;
    sessionState.pendingRequests.set(pending.threadId, pending);
    sessionState.threadStore.activeThreadId = pending.threadId;

    paintOrResumeStreamingReasoning(text, pending, pending.reasoningText);
    expect(text.textContent).toBe('abc');

    pending.reasoningText = 'abcdef';
    paintOrResumeStreamingReasoning(text, pending, pending.reasoningText);
    // Typewriter should be scheduled; advance timers until catch-up.
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(30);
    }
    expect(pending.reasoningDisplayedLength).toBe(6);
    expect(text.textContent).toBe('abcdef');

    sessionState.pendingRequests.delete(pending.threadId);
    vi.useRealTimers();
  });
});

describe('liveHostHasRequiredGenerationChrome (O4 remount skip)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('treats streaming chrome as present when phase needs bubble chrome', () => {
    const host = document.createElement('div');
    const chrome = document.createElement('div');
    chrome.className = `${GENERATION_CHROME_CLASS} is-streaming`;
    host.appendChild(chrome);

    const pending = createPendingDeepChatRequest('thread-chrome', []);
    pending.reasoningText = 'r';
    expect(liveHostHasRequiredGenerationChrome(host, pending)).toBe(true);
  });

  it('stripSettledChromeFromHost removes settled flash before stream mount', () => {
    const host = document.createElement('div');
    const chrome = document.createElement('div');
    chrome.className = `${GENERATION_CHROME_CLASS} is-settled`;
    const settled = document.createElement('div');
    settled.className = 'deep-chat-dt-settled';
    const label = document.createElement('span');
    label.className = 'deep-chat-dt-done-label';
    label.textContent = '已完成 0s';
    settled.appendChild(label);
    chrome.appendChild(settled);
    host.appendChild(chrome);
    document.body.appendChild(host);

    stripSettledChromeFromHost(host);
    expect(host.querySelector(`.${GENERATION_CHROME_CLASS}`)).toBeNull();
  });
});
