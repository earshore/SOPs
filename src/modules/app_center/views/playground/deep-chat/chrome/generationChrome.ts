import {
  getChat,
  createChevronIcon,
  setToggleExpanded,
  formatCompletedDurationLabel,
} from '../session/domHelpers';
import { uiHooks, registerChromeUiHooks } from '../session/uiHooks';
import { getActiveThread } from '../session/threadStore';
import { getMountedRenderContainer, getThreadDisplayMessages } from '../session/pendingRuntime';

import {
  getDeepChatGenerationPhase,
  getPendingReasoningDurationSec,
  liveGenerationPhaseNeedsBubbleChrome,
  type PendingDeepChatRequest,
} from '../request/lifecycle';
import {
  buildPreReplyActivityTimeline,
  type PreReplyActivityStep,
} from '../request/preReplyActivity';
import {
  flushDisplayedLength,
  liveStreamingChromeSatisfied,
  resolveSettledHandoffExpand,
  shouldFlushTypewriterOnSettle,
  shouldInstantPaintReasoning,
  shouldRearmTypewriter,
  typewriterStep,
} from './reasoningDisplayState';

import { refreshMessageToolbarStatuses } from '../composer/messageToolbar';

import type { DeepChatElement, DeepChatMessage } from '../types';
import { isZwspOnlyText } from '../infra/utils';

import {
  sessionState,
  PENDING_GENERATING_PREFIX,
  WAITING_STATUS_LABELS,
  WAITING_STATUS_ROTATE_MS,
  GENERATION_CHROME_CLASS,
  INLINE_PENDING_STATUS_ID,
  PENDING_GENERATION_HOST_CLASS,
  STREAMING_DT_KEY,
  PENDING_CHROME_MAX_RETRIES,
  REASONING_TYPEWRITER_INTERVAL_MS,
  REASONING_TYPEWRITER_CHARS,
} from '../session/sessionState';

export function disconnectChromeMutationObserver(): void {
  sessionState.pendingChromeObserver?.disconnect();
  sessionState.pendingChromeObserver = null;
  sessionState.pendingChromeObservedChat = null;
}

export function clearChromeRetrySchedule(): void {
  if (sessionState.pendingChromeRetryRaf !== null) {
    window.cancelAnimationFrame(sessionState.pendingChromeRetryRaf);
    sessionState.pendingChromeRetryRaf = null;
  }
  for (const id of sessionState.pendingChromeRetryTimeouts) {
    window.clearTimeout(id);
  }
  sessionState.pendingChromeRetryTimeouts = [];
}

export function clearPendingChromeObserver(): void {
  disconnectChromeMutationObserver();
  clearChromeRetrySchedule();
  if (sessionState.reasoningTypewriterTimer !== null) {
    window.clearTimeout(sessionState.reasoningTypewriterTimer);
    sessionState.reasoningTypewriterTimer = null;
  }
  clearWaitingStatusRotateTimer();
}

export function clearWaitingStatusRotateTimer(): void {
  if (sessionState.waitingStatusRotateTimer !== null) {
    window.clearInterval(sessionState.waitingStatusRotateTimer);
    sessionState.waitingStatusRotateTimer = null;
  }
}

export function ensureWaitingStatusRotateTimer(): void {
  if (sessionState.waitingStatusRotateTimer !== null) {
    return;
  }
  sessionState.waitingStatusRotateTimer = window.setInterval(() => {
    const container = getMountedRenderContainer();
    const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
    if (!container || !pending || getDeepChatGenerationPhase(pending) !== 'waiting') {
      clearWaitingStatusRotateTimer();
      return;
    }
    syncPendingStatus(container);
  }, WAITING_STATUS_ROTATE_MS);
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function clearStreamingGenerationChrome(chat: DeepChatElement | null): void {
  chat?.classList.remove(PENDING_GENERATION_HOST_CLASS);
  chat?.shadowRoot
    ?.querySelectorAll(`.${GENERATION_CHROME_CLASS}.is-streaming`)
    .forEach(node => node.remove());
  // Do NOT disconnect MutationObserver here — deep-chat often rebuilds the last
  // AI bubble after settle; without the observer 「已完成」 never remounts.
}

export function isAssistantMessageRole(role?: string): boolean {
  return role === 'ai' || role === 'assistant';
}

export function listAiMessageHosts(root: ShadowRoot): HTMLElement[] {
  const nodes = root.querySelectorAll<HTMLElement>(
    [
      '.deep-chat-outer-container-role-ai .inner-message-container',
      '.outer-message-container.deep-chat-outer-container-role-ai .inner-message-container',
    ].join(', ')
  );
  if (nodes.length > 0) {
    return Array.from(nodes);
  }

  const fallback: HTMLElement[] = [];
  const loadingDots = root.querySelector<HTMLElement>('.deep-chat-loading-message-dots-container');
  if (loadingDots?.parentElement instanceof HTMLElement) {
    fallback.push(loadingDots.parentElement);
  } else {
    const loadingBubble = root.querySelector<HTMLElement>(
      '.deep-chat-loading-message-bubble, .message-bubble.deep-chat-loading-message-bubble'
    );
    if (loadingBubble?.parentElement instanceof HTMLElement) {
      fallback.push(loadingBubble.parentElement);
    }
  }
  return fallback;
}

export function buildSettledDtKey(
  threadId: string,
  aiIndex: number,
  message: DeepChatMessage
): string {
  const stamp = message.createdAt ?? 0;
  const snippet = (message.text || message.content || '').slice(0, 32);
  return `${threadId}:ai${aiIndex}:${stamp}:${snippet}`;
}

export function findMessageBubbleAnchor(host: HTMLElement): HTMLElement | null {
  return (
    host.querySelector<HTMLElement>(
      [
        ':scope > .message-bubble',
        ':scope > .deep-chat-loading-message-bubble',
        ':scope > .deep-chat-loading-message-dots-container',
        '.message-bubble',
        '.deep-chat-loading-message-bubble',
        '.deep-chat-loading-message-dots-container',
      ].join(', ')
    ) ?? null
  );
}

/**
 * Live in-flight AI slot uses `\u200b` so deep-chat still creates a host for chrome.
 * After page/thread remount, history rehydration renders that as empty ZWSP `<p>` between
 * toolbar and 深度思考 — collapse it until real assistant text arrives.
 */
export function syncLivePlaceholderBubble(
  host: HTMLElement,
  pending: PendingDeepChatRequest | null | undefined
): void {
  const bubble = host.querySelector<HTMLElement>(
    ':scope > .message-bubble, .message-bubble.ai-message, .message-bubble'
  );
  if (!bubble) return;

  const inFlightPlaceholder =
    pending != null &&
    !pending.isSettled &&
    isZwspOnlyText(pending.displayedAssistantText) &&
    isZwspOnlyText(bubble.textContent);

  bubble.classList.toggle('is-live-placeholder', inFlightPlaceholder);
  bubble.querySelectorAll('p').forEach(p => {
    if (inFlightPlaceholder && isZwspOnlyText(p.textContent)) {
      p.setAttribute('data-live-placeholder', 'true');
    } else {
      p.removeAttribute('data-live-placeholder');
    }
  });
}

/**
 * Reading order before formal reply:
 * 1) pre-reply activity timeline (深度思考 + tools)
 * 2) 正在生成回复… (toolbar)
 * 3) message bubble
 */

export function placeGenerationChromeRoot(host: HTMLElement, chromeRoot: HTMLElement): void {
  const anchor = findMessageBubbleAnchor(host);
  if (chromeRoot.parentElement !== host) {
    if (anchor) {
      host.insertBefore(chromeRoot, anchor);
    } else {
      host.prepend(chromeRoot);
    }
    return;
  }
  if (anchor && chromeRoot.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_PRECEDING) {
    host.insertBefore(chromeRoot, anchor);
  }
}

/** Inline SVG chevron (shadow DOM has no Font Awesome). Collapsed: >; expanded: rotate to v. */

export function liveHostHasRequiredGenerationChrome(
  liveHost: Element,
  pending: PendingDeepChatRequest
): boolean {
  const phase = getDeepChatGenerationPhase(pending);
  const hasReasoning = Boolean(pending.reasoningText.trim());
  const hasActivity = Boolean(pending.preReplySteps?.length);
  // waiting / generating-without-reasoning never mount streaming chrome — requiring
  // `.is-streaming` here caused infinite MutationObserver remount (page freeze on resend).
  const needsBubbleChrome = liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning, hasActivity);
  if (phase === 'settled') {
    return Boolean(liveHost.querySelector(`:scope > .${GENERATION_CHROME_CLASS}.is-settled`));
  }
  const hasStreamingChrome = Boolean(
    liveHost.querySelector(`:scope > .${GENERATION_CHROME_CLASS}.is-streaming`)
  );
  return liveStreamingChromeSatisfied({ hasStreamingChrome, needsBubbleChrome });
}

export function hostsHaveSettledChromeWhereRequired(
  hosts: Element[],
  storedAi: DeepChatMessage[],
  streamHostIndex: number
): boolean {
  for (let hostIndex = 0; hostIndex < streamHostIndex; hostIndex++) {
    const host = hosts[hostIndex];
    const mapped = resolveStoredAiForHost(hostIndex, streamHostIndex, storedAi);
    if (!mapped || !messageHasSettledChrome(mapped.message)) {
      continue;
    }
    if (!host?.querySelector(`:scope > .${GENERATION_CHROME_CLASS}.is-settled`)) {
      return false;
    }
  }
  return true;
}

/** True when generation chrome already present where required (avoid thrash). */

export function shouldSkipChromeRemount(root: ShadowRoot): boolean {
  const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
  const hosts = listAiMessageHosts(root);
  if (hosts.length === 0) {
    return false;
  }

  if (pending) {
    const liveHost = hosts[hosts.length - 1];
    if (!liveHost) return false;
    if (!liveHostHasRequiredGenerationChrome(liveHost, pending)) {
      return false;
    }

    // Historical AI hosts (exclude live slot) must keep 已完成 while a request is in flight.
    const streamHostIndex = hosts.length - 1;
    const storedAi = getActiveThread().messages.filter(message =>
      isAssistantMessageRole(message.role)
    );
    const historicalStored = storedAi.length >= hosts.length ? storedAi.slice(0, -1) : storedAi;
    return hostsHaveSettledChromeWhereRequired(hosts, historicalStored, streamHostIndex);
  }

  // Finished thread: every AI host that should show 已完成 must still have it.
  // Checking only the last host missed mid-list drops after history rebuild.
  const thread = getActiveThread();
  const storedAi = thread.messages.filter(message => isAssistantMessageRole(message.role));
  return hostsHaveSettledChromeWhereRequired(hosts, storedAi, hosts.length);
}

export function syncPendingStatus(container: HTMLElement): void {
  syncAllDeepThinkingChrome(container);
}

export function syncAllDeepThinkingChrome(container: HTMLElement): void {
  hideLegacyLightDomGenerationChrome(container);

  const chat = getChat(container);
  if (!chat) {
    uiHooks.syncSubmitStopButtonState(container);
    return;
  }

  const root = chat.shadowRoot;
  if (!root) {
    scheduleDeepThinkingChromeRetry(container);
    uiHooks.syncSubmitStopButtonState(container);
    return;
  }

  const thread = getActiveThread();
  const pending = sessionState.pendingRequests.get(thread.id);
  const hosts = listAiMessageHosts(root);
  if (hosts.length === 0) {
    scheduleDeepThinkingChromeRetry(container);
    uiHooks.syncSubmitStopButtonState(container);
    return;
  }

  // Keep observer alive across settle so deep-chat rebuilds re-attach chrome.
  observePendingGenerationChrome(chat);

  const storedAi = thread.messages.filter(message => isAssistantMessageRole(message.role));
  const streamHostIndex = pending ? hosts.length - 1 : -1;

  hosts.forEach((host, hostIndex) => {
    if (pending && hostIndex === streamHostIndex) {
      chat.classList.add(PENDING_GENERATION_HOST_CLASS);
      // Reply finished (LLM settled) but body typewriter may still drain → 已完成 Xs
      if (getDeepChatGenerationPhase(pending) === 'settled') {
        clearWaitingStatusRotateTimer();
        const durationSec = getPendingReasoningDurationSec(pending);
        const uiKey = `${thread.id}:pending-settled:${pending.startedAt}`;
        preparePendingSettledHandoff(pending, uiKey);
        const steps = buildPreReplyActivityTimeline({
          reasoningText: pending.reasoningText,
          steps: pending.preReplySteps,
        });
        mountSettledDeepThinkingChrome(host, pending.reasoningText, durationSec, uiKey, steps);
        // Typewriter may still be draining real text — drop ZWSP placeholder styling.
        syncLivePlaceholderBubble(host, pending);
        return;
      }
      // In-flight live slot must never keep a previous turn's 「已完成」 chrome.
      // deep-chat often reuses the last AI host before the loading bubble appears;
      // leaving is-settled painted causes a flash of 「已完成 0s」 then 深度思考.
      stripSettledChromeFromHost(host);
      mountStreamingGenerationChrome(host, pending);
      // Collapse ZWSP-only history bubble after remount (page switch mid-generation).
      syncLivePlaceholderBubble(host, pending);
      return;
    }

    // Historical hosts while generating: exclude last stored AI (belongs to live turn).
    // Finished thread: end-align all hosts to all stored AI messages.
    const mapped = pending
      ? resolveStoredAiForHost(
          hostIndex,
          Math.max(0, streamHostIndex),
          storedAi.length >= hosts.length ? storedAi.slice(0, -1) : storedAi
        )
      : resolveStoredAiForHost(hostIndex, hosts.length, storedAi);

    if (mapped && messageHasSettledChrome(mapped.message)) {
      mountSettledChromeForMessage(host, thread.id, mapped.storedIndex, mapped.message);
      return;
    }

    // Only strip settled chrome when this host clearly has no finished AI mapping
    // (e.g. transient loading host). Never strip is-streaming here — stream path owns it.
    const chrome = getChromeOnHost(host);
    if (chrome?.classList.contains('is-settled') && !pending) {
      chrome.remove();
    }
  });

  if (!pending) {
    clearStreamingGenerationChrome(chat);
    // Re-attach settled after clearing streaming nodes (observer stays alive).
    hosts.forEach((host, hostIndex) => {
      // No live request: clear any leftover placeholder collapse class.
      syncLivePlaceholderBubble(host, null);
      const mapped = resolveStoredAiForHost(hostIndex, hosts.length, storedAi);
      if (mapped && messageHasSettledChrome(mapped.message)) {
        mountSettledChromeForMessage(host, thread.id, mapped.storedIndex, mapped.message);
      }
    });
  }

  uiHooks.syncSubmitStopButtonState(container);
}

export function messageHasSettledChrome(message: DeepChatMessage | undefined): boolean {
  if (!message) return false;
  if (message.status === 'partial') {
    return (
      Boolean(message.reasoning?.trim()) ||
      Boolean(message.preReplySteps?.length) ||
      (typeof message.reasoningDurationSec === 'number' &&
        Number.isFinite(message.reasoningDurationSec))
    );
  }
  // Finished AI message: always show 已完成 (duration 0 if unknown).
  return true;
}

export function resolveMessagePreReplySteps(message: DeepChatMessage): PreReplyActivityStep[] {
  return buildPreReplyActivityTimeline({
    reasoningText: message.reasoning,
    steps: message.preReplySteps,
  });
}

export function resolveStoredAiForHost(
  hostIndex: number,
  hostsLength: number,
  storedAi: DeepChatMessage[]
): { message: DeepChatMessage; storedIndex: number } | null {
  if (storedAi.length === 0 || hostsLength === 0) {
    return null;
  }
  // Map last host → last stored AI, second-last → second-last, ...
  const storedIndex = storedAi.length - 1 - (hostsLength - 1 - hostIndex);
  if (storedIndex < 0 || storedIndex >= storedAi.length) {
    return null;
  }
  const message = storedAi[storedIndex];
  if (!message) {
    return null;
  }
  return { message, storedIndex };
}

/**
 * Attach 已完成 / 深度思考 chrome to finished AI bubbles,
 * and streaming chrome only on the latest bubble while generating.
 */

export function prefersInstantReasoningText(): boolean {
  return prefersReducedMotion();
}

export function pendingTypewriterKey(pending: PendingDeepChatRequest): string {
  return `${pending.threadId}:${pending.startedAt}`;
}

/** Stop typewriter. When pendingKey is set, only stop if it matches the active binding. */
export function stopReasoningTypewriter(pendingKey?: string | null): void {
  if (
    pendingKey != null &&
    sessionState.reasoningTypewriterKey != null &&
    sessionState.reasoningTypewriterKey !== pendingKey
  ) {
    return;
  }
  if (sessionState.reasoningTypewriterTimer !== null) {
    window.clearTimeout(sessionState.reasoningTypewriterTimer);
    sessionState.reasoningTypewriterTimer = null;
  }
  sessionState.reasoningTypewriterTextEl = null;
  sessionState.reasoningTypewriterKey = null;
}

/**
 * Expand flag for settle handoff: prefer snapshot taken in markPendingDeepChatRequestSettled
 * (production order is mark → sync chrome; live flag is already false by then).
 */
export function resolvePendingExpandForHandoff(pending: PendingDeepChatRequest): boolean {
  if (pending.reasoningExpandedAtSettle !== undefined) {
    return pending.reasoningExpandedAtSettle === true;
  }
  return pending.reasoningUiExpanded === true;
}

/** Flush stream display cursor then apply settle expand inheritance (spec O1/O3). */
export function preparePendingSettledHandoff(pending: PendingDeepChatRequest, uiKey: string): void {
  const fullLen = pending.reasoningText.length;
  const displayed = pending.reasoningDisplayedLength ?? 0;
  if (shouldFlushTypewriterOnSettle(displayed, fullLen)) {
    pending.reasoningDisplayedLength = flushDisplayedLength(fullLen);
  }
  stopReasoningTypewriter(pendingTypewriterKey(pending));

  const handoff = resolveSettledHandoffExpand({
    reasoningUiExpanded: resolvePendingExpandForHandoff(pending),
    hasReasoningText: Boolean(pending.reasoningText.trim()),
  });
  const state = getOrCreateSettledUiState(uiKey);
  if (handoff.doneOpen) {
    state.doneOpen = true;
    state.activityOpen = { ...state.activityOpen, reasoning: handoff.reasoningRowOpen };
    state.deepOpen = handoff.reasoningRowOpen;
  }
  state.displayedLength = fullLen;
}

/** Max height (px) for 深度思考 body before scroll — keep in sync with CSS 12.5rem. */
export const DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX = 200;

/** @deprecated use DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX */
export const DEEP_CHAT_DT_TEXT_MAX_HEIGHT_PX = DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX;

/**
 * Resolve the scroll frame for 深度思考 / activity detail.
 * Cap + scroll belong on `.deep-chat-dt-body`, not the inner text node.
 */
export function resolveDeepChatDtBodyEl(
  textOrBody: HTMLElement | null | undefined
): HTMLElement | null {
  if (!textOrBody) return null;
  if (textOrBody.classList.contains('deep-chat-dt-body')) {
    return textOrBody;
  }
  const parent = textOrBody.parentElement;
  if (parent?.classList.contains('deep-chat-dt-body')) {
    return parent;
  }
  return textOrBody.closest('.deep-chat-dt-body');
}

/**
 * Keep 深度思考 body scrolled to the latest line while streaming once content
 * exceeds the CSS max-height. Sizing is pure CSS (height:fit-content + max-height);
 * do NOT measure body.scrollHeight for capping — a stretched body would false-positive
 * and leave a tall empty scroll frame while text is still short.
 */
export function syncDeepChatDtBodyScrollCap(
  textOrBody: HTMLElement,
  maxHeightPx = DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX
): void {
  const bodyEl = resolveDeepChatDtBodyEl(textOrBody);
  if (!bodyEl?.isConnected) return;

  // Clear any legacy class / inline size from older builds.
  bodyEl.classList.remove('is-scroll-capped');
  bodyEl.style.height = '';
  bodyEl.style.minHeight = '';
  bodyEl.style.maxHeight = '';

  const textEl =
    bodyEl.querySelector<HTMLElement>('.deep-chat-dt-text') ??
    (textOrBody.classList.contains('deep-chat-dt-text') ? textOrBody : null);

  // Content height = text node (true glyph box), not the possibly-stretched body.
  const contentHeight = textEl?.scrollHeight ?? bodyEl.scrollHeight;
  if (contentHeight > maxHeightPx + 1) {
    // Stick to bottom so newest reasoning stays visible.
    bodyEl.scrollTop = bodyEl.scrollHeight;
  } else {
    bodyEl.scrollTop = 0;
  }
}

/** @deprecated use syncDeepChatDtBodyScrollCap */
export function syncDeepChatDtTextScrollCap(
  textOrBody: HTMLElement,
  maxHeightPx = DEEP_CHAT_DT_BODY_MAX_HEIGHT_PX
): void {
  syncDeepChatDtBodyScrollCap(textOrBody, maxHeightPx);
}

/**
 * Streaming-only typewriter. Reads full text live each tick so collapse→expand
 * and late reasoning chunks keep advancing (no stale snapshot freeze).
 */
export type ReasoningTypewriterOptions = {
  textEl: HTMLElement;
  getFullText: () => string;
  getDisplayed: () => number;
  setDisplayed: (n: number) => void;
  isActive: () => boolean;
  pendingKey?: string;
};

export function scheduleReasoningTypewriter(options: ReasoningTypewriterOptions): void {
  const { textEl, getFullText, getDisplayed, setDisplayed, isActive, pendingKey } = options;
  stopReasoningTypewriter();
  sessionState.reasoningTypewriterTextEl = textEl;
  sessionState.reasoningTypewriterKey = pendingKey ?? null;

  const run = (): void => {
    if (!isActive() || sessionState.reasoningTypewriterTextEl !== textEl || !textEl.isConnected) {
      sessionState.reasoningTypewriterTimer = null;
      if (sessionState.reasoningTypewriterTextEl === textEl) {
        sessionState.reasoningTypewriterTextEl = null;
        sessionState.reasoningTypewriterKey = null;
      }
      return;
    }
    const full = getFullText();
    let displayed = getDisplayed();
    if (prefersInstantReasoningText() || displayed >= full.length) {
      if (textEl.textContent !== full) {
        textEl.textContent = full;
      }
      setDisplayed(full.length);
      syncDeepChatDtBodyScrollCap(textEl);
      // Timer idle; paintOrResumeStreamingReasoning re-arms when full grows (shouldRearm).
      sessionState.reasoningTypewriterTimer = null;
      return;
    }
    displayed = typewriterStep(displayed, full.length, REASONING_TYPEWRITER_CHARS);
    setDisplayed(displayed);
    textEl.textContent = full.slice(0, displayed);
    syncDeepChatDtBodyScrollCap(textEl);
    sessionState.reasoningTypewriterTimer = window.setTimeout(
      run,
      REASONING_TYPEWRITER_INTERVAL_MS
    );
  };

  run();
}

export function isStreamingReasoningTypewriterActive(pending: PendingDeepChatRequest): boolean {
  return (
    pending.reasoningUiExpanded === true &&
    !pending.isSettled &&
    sessionState.pendingRequests.get(pending.threadId) === pending &&
    sessionState.threadStore.activeThreadId === pending.threadId
  );
}

export function resumeStreamingReasoningTypewriter(
  textEl: HTMLElement,
  pending: PendingDeepChatRequest
): void {
  if (pending.reasoningDisplayedLength === undefined) {
    pending.reasoningDisplayedLength = 0;
  }
  const key = pendingTypewriterKey(pending);
  // Already driving this live `<pre>` for this pending: each tick re-reads full text.
  if (
    sessionState.reasoningTypewriterTimer !== null &&
    sessionState.reasoningTypewriterTextEl === textEl &&
    sessionState.reasoningTypewriterKey === key &&
    textEl.isConnected &&
    isStreamingReasoningTypewriterActive(pending)
  ) {
    return;
  }
  scheduleReasoningTypewriter({
    textEl,
    getFullText: () => pending.reasoningText,
    getDisplayed: () => pending.reasoningDisplayedLength ?? 0,
    setDisplayed: n => {
      pending.reasoningDisplayedLength = n;
    },
    isActive: () => isStreamingReasoningTypewriterActive(pending),
    pendingKey: key,
  });
}

export function getChromeOnHost(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(`:scope > .${GENERATION_CHROME_CLASS}`);
}

export function ensureGenerationChromeOnHost(
  host: HTMLElement,
  key: string,
  mode: 'streaming' | 'settled'
): HTMLElement {
  let chrome = getChromeOnHost(host);
  if (!chrome) {
    chrome = host.ownerDocument.createElement('div');
    chrome.className = GENERATION_CHROME_CLASS;
  }
  chrome.dataset.dtKey = key;
  chrome.classList.toggle('is-streaming', mode === 'streaming');
  chrome.classList.toggle('is-settled', mode === 'settled');
  return chrome;
}

export function paintOrResumeStreamingReasoning(
  textEl: HTMLElement,
  pending: PendingDeepChatRequest,
  full: string
): void {
  const key = pendingTypewriterKey(pending);
  if (prefersInstantReasoningText()) {
    textEl.textContent = full;
    pending.reasoningDisplayedLength = full.length;
    stopReasoningTypewriter(key);
    syncDeepChatDtBodyScrollCap(textEl);
    return;
  }

  const displayed = pending.reasoningDisplayedLength ?? 0;
  // Large one-shot reasoning dump: paint full immediately (spec O3 / F6).
  if (shouldInstantPaintReasoning(full.length) && displayed === 0) {
    textEl.textContent = full;
    pending.reasoningDisplayedLength = full.length;
    stopReasoningTypewriter(key);
    syncDeepChatDtBodyScrollCap(textEl);
    return;
  }

  if (displayed >= full.length) {
    if (textEl.textContent !== full) {
      textEl.textContent = full;
    }
    pending.reasoningDisplayedLength = full.length;
    syncDeepChatDtBodyScrollCap(textEl);
    return;
  }

  if (
    shouldRearmTypewriter({
      displayed,
      fullLength: full.length,
      expanded: pending.reasoningUiExpanded === true,
      settled: Boolean(pending.isSettled),
    })
  ) {
    resumeStreamingReasoningTypewriter(textEl, pending);
  }
}

export function hideStatusInChrome(chrome: HTMLElement): void {
  const statusEl = chrome.querySelector<HTMLElement>('#' + INLINE_PENDING_STATUS_ID);
  if (statusEl) {
    statusEl.hidden = true;
    // Remove so waiting copy cannot flash back via stale DOM / CSS edge cases
    statusEl.remove();
  }
}

export function getWaitingStatusLabel(pending: PendingDeepChatRequest, now = Date.now()): string {
  const elapsed = Math.max(0, now - pending.startedAt);
  const index = Math.floor(elapsed / WAITING_STATUS_ROTATE_MS) % WAITING_STATUS_LABELS.length;
  return WAITING_STATUS_LABELS[index] ?? WAITING_STATUS_LABELS[0];
}

export function getGeneratingStatusLabel(pending: PendingDeepChatRequest): string {
  const charCount = pending.assistantText.trim().length;
  if (charCount === 0) {
    return PENDING_GENERATING_PREFIX;
  }
  return `${PENDING_GENERATING_PREFIX} · 已收到 ${charCount.toLocaleString('zh-CN')} 字`;
}

/**
 * Live status for toolbar end (waiting / reasoning / generating / tools).
 * Must stay non-null while in-flight so remount + ZWSP bubbles still mount toolbar shell.
 * 「思考中…」rotates only in waiting; reasoning uses a fixed short label beside 深度思考 chrome.
 */

export function getActiveLiveGenerationStatusLabel(): string | null {
  const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
  if (!pending || pending.isSettled) {
    return null;
  }
  const phase = getDeepChatGenerationPhase(pending);
  const runningTool = pending.preReplySteps?.find(s => s.status === 'running' && s.kind === 'tool');
  if (runningTool) {
    return `正在${runningTool.label}…`;
  }
  if (phase === 'waiting') {
    return getWaitingStatusLabel(pending);
  }
  if (phase === 'reasoning') {
    return '深度思考中…';
  }
  if (phase === 'generating') {
    return getGeneratingStatusLabel(pending);
  }
  return null;
}

/**
 * Phase-driven streaming chrome (above bubble):
 * waiting  → no bubble chrome (status lives on toolbar end only)
 * reasoning → 深度思考 only
 * generating → 深度思考 (if any); 「正在生成回复 · 已收到 N 字」 on toolbar end
 * body typewriter sits in message bubble
 *
 * Critical: never create-then-remove empty chrome on waiting/no-reasoning paths.
 * That thrash + MutationObserver remount freezes the page (edit → resend repro).
 */

/** Remove settled 「已完成」 chrome from a host (live in-flight slot only). */
export function stripSettledChromeFromHost(host: HTMLElement): void {
  const chrome = getChromeOnHost(host);
  if (!chrome) return;
  if (chrome.classList.contains('is-settled') || chrome.querySelector('.deep-chat-dt-settled')) {
    chrome.remove();
  }
}

function removeStaleStreamingChrome(
  host: HTMLElement,
  opts: { keepActivityList?: boolean } = {}
): void {
  stripSettledChromeFromHost(host);
  const existing = getChromeOnHost(host);
  if (!existing?.classList.contains('is-streaming')) return;
  if (existing.querySelector('.deep-chat-dt-stream')) return;
  if (opts.keepActivityList && existing.querySelector('.deep-chat-dt-activity-list')) return;
  existing.remove();
}

export function mountStreamingGenerationChrome(
  host: HTMLElement,
  pending: PendingDeepChatRequest
): void {
  const phase = getDeepChatGenerationPhase(pending);
  const hasReasoning = Boolean(pending.reasoningText.trim());
  const hasActivity = Boolean(pending.preReplySteps?.length);

  if (phase === 'waiting' && !hasActivity) {
    // Toolbar owns waiting status. Clear any stale settled chrome so continue-chat
    // does not flash 「已完成 0s」 on the live slot before 深度思考 mounts.
    removeStaleStreamingChrome(host);
    ensureWaitingStatusRotateTimer();
    refreshLiveGenerationToolbarStatus();
    return;
  }

  clearWaitingStatusRotateTimer();

  if (!liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning, hasActivity)) {
    // generating without reasoning: drop stray chrome once, including leftover 已完成
    removeStaleStreamingChrome(host, { keepActivityList: true });
    refreshLiveGenerationToolbarStatus();
    return;
  }

  const chrome = ensureGenerationChromeOnHost(host, STREAMING_DT_KEY, 'streaming');
  // Drop settled nodes only on this generating host (history 已完成 stays on earlier hosts)
  chrome.querySelector('.deep-chat-dt-settled')?.remove();
  chrome.classList.remove('is-settled');
  chrome.classList.add('is-streaming');
  // Status line no longer sits above the bubble — toolbar end owns it.
  hideStatusInChrome(chrome);

  if (phase === 'reasoning' || hasReasoning) {
    uiHooks.ensureStreamingDeepThinkingBlock(chrome, pending.reasoningText, pending);
  }
  if (hasActivity) {
    ensureStreamingActivityList(chrome, pending);
  }
  placeGenerationChromeRoot(host, chrome);
  refreshLiveGenerationToolbarStatus();
}

/** Live tool rows above the bubble (same toggle language as 深度思考). */
export function ensureStreamingActivityList(
  chrome: HTMLElement,
  pending: PendingDeepChatRequest
): void {
  const steps = (pending.preReplySteps ?? []).filter(s => s.kind !== 'reasoning');
  let list = chrome.querySelector<HTMLElement>('.deep-chat-dt-activity-list.is-streaming-list');
  if (!steps.length) {
    list?.remove();
    return;
  }
  const doc = chrome.ownerDocument;
  if (!list) {
    list = doc.createElement('div');
    list.className = 'deep-chat-dt-activity-list is-streaming-list';
    chrome.append(list);
  }
  syncActivityListDom(list, steps, {
    getExpanded: id => Boolean(pending.activityUiExpanded?.[id]),
    setExpanded: (id, open) => {
      pending.activityUiExpanded = { ...(pending.activityUiExpanded || {}), [id]: open };
    },
    showStatusBadge: true,
  });
}

export function refreshLiveGenerationToolbarStatus(): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  refreshMessageToolbarStatuses(getChat(container), () =>
    getThreadDisplayMessages(getActiveThread())
  );
}

export function getOrCreateSettledUiState(uiKey: string): {
  doneOpen: boolean;
  deepOpen: boolean;
  displayedLength: number;
  activityOpen: Record<string, boolean>;
} {
  let state = sessionState.settledDeepThinkingUi.get(uiKey);
  if (!state) {
    state = { doneOpen: false, deepOpen: false, displayedLength: 0, activityOpen: {} };
    sessionState.settledDeepThinkingUi.set(uiKey, state);
  }
  if (!state.activityOpen) {
    state.activityOpen = {};
  }
  return state;
}

/**
 * Settled chrome: always show 「已完成 Xs」 after a generation finishes.
 * Nested activity rows (深度思考 + tools) under the panel — same progressive disclosure.
 */

export function mountSettledDeepThinkingChrome(
  host: HTMLElement,
  reasoningText: string,
  durationSec: number,
  uiKey: string,
  activitySteps?: PreReplyActivityStep[]
): void {
  const steps =
    activitySteps ??
    buildPreReplyActivityTimeline({
      reasoningText,
      steps: undefined,
    });
  const chrome = ensureGenerationChromeOnHost(host, uiKey, 'settled');
  chrome.querySelector('.deep-chat-dt-stream')?.remove();
  chrome.querySelector('.deep-chat-dt-activity-list.is-streaming-list')?.remove();
  chrome.querySelector('#' + INLINE_PENDING_STATUS_ID)?.remove();

  const doc = host.ownerDocument;
  let settled = chrome.querySelector<HTMLElement>('.deep-chat-dt-settled');
  if (!settled) {
    settled = createSettledDeepThinkingDom(doc, uiKey);
    chrome.append(settled);
  }

  // Keep latest model on the node so click handlers stay current after remounts
  settled.dataset.dtFull = reasoningText.trim();
  settled.dataset.dtDuration = String(Math.max(0, Math.round(durationSec)));
  settled.dataset.dtSteps = JSON.stringify(steps);

  applySettledDeepThinkingUi(settled, reasoningText, durationSec, uiKey, steps);
  placeGenerationChromeRoot(host, chrome);
}

export function createSettledDeepThinkingDom(doc: Document, uiKey: string): HTMLElement {
  const settled = doc.createElement('div');
  settled.className = 'deep-chat-dt-settled';

  const doneToggle = doc.createElement('button');
  doneToggle.type = 'button';
  doneToggle.className = 'deep-chat-dt-done-toggle';
  doneToggle.setAttribute('aria-expanded', 'false');
  const doneLabel = doc.createElement('span');
  doneLabel.className = 'deep-chat-dt-done-label';
  doneToggle.append(doneLabel, createChevronIcon(doc));

  const donePanel = doc.createElement('div');
  donePanel.className = 'deep-chat-dt-done-panel';
  donePanel.hidden = true;

  const activityList = doc.createElement('div');
  activityList.className = 'deep-chat-dt-activity-list is-settled-list';
  donePanel.append(activityList);

  const readModel = (): {
    full: string;
    durationSec: number;
    steps: PreReplyActivityStep[];
  } => {
    let steps: PreReplyActivityStep[] = [];
    try {
      steps = JSON.parse(settled.dataset.dtSteps || '[]') as PreReplyActivityStep[];
      if (!Array.isArray(steps)) steps = [];
    } catch {
      steps = [];
    }
    // Backward compat: only reasoning stored as dtFull
    if (!steps.length && (settled.dataset.dtFull || '').trim()) {
      steps = buildPreReplyActivityTimeline({ reasoningText: settled.dataset.dtFull });
    }
    return {
      full: settled.dataset.dtFull ?? '',
      durationSec: Number(settled.dataset.dtDuration ?? '0') || 0,
      steps,
    };
  };

  doneToggle.addEventListener('click', () => {
    const model = readModel();
    // No nested activity → 已完成 is display-only (no expand)
    if (!model.steps.length && !model.full.trim()) {
      return;
    }
    const state = getOrCreateSettledUiState(uiKey);
    state.doneOpen = !state.doneOpen;
    if (!state.doneOpen) {
      state.deepOpen = false;
      state.activityOpen = {};
    }
    applySettledDeepThinkingUi(settled, model.full, model.durationSec, uiKey, model.steps);
  });

  settled.append(doneToggle, donePanel);
  return settled;
}

function resolveSettledActivitySteps(
  fullText: string,
  activitySteps?: PreReplyActivityStep[]
): PreReplyActivityStep[] {
  if (activitySteps && activitySteps.length) return activitySteps;
  return buildPreReplyActivityTimeline({ reasoningText: fullText });
}

function syncSettledDoneChrome(
  doneToggle: HTMLElement,
  doneLabel: HTMLElement,
  durationSec: number,
  hasActivity: boolean
): void {
  const doneLabelText = formatCompletedDurationLabel(durationSec);
  // Only write when changed — avoid childList MutationObserver thrash on remount.
  if (doneLabel.textContent !== doneLabelText) {
    doneLabel.textContent = doneLabelText;
  }
  doneToggle.classList.toggle('is-static', !hasActivity);
  const disabled = hasActivity ? 'false' : 'true';
  if (doneToggle.getAttribute('aria-disabled') !== disabled) {
    doneToggle.setAttribute('aria-disabled', disabled);
  }
}

export function applySettledDeepThinkingUi(
  settled: HTMLElement,
  fullText: string,
  durationSec: number,
  uiKey: string,
  activitySteps?: PreReplyActivityStep[]
): void {
  const state = getOrCreateSettledUiState(uiKey);
  const doneToggle = settled.querySelector<HTMLElement>('.deep-chat-dt-done-toggle');
  const doneLabel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-label');
  const donePanel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-panel');
  const activityList = settled.querySelector<HTMLElement>(
    '.deep-chat-dt-activity-list.is-settled-list'
  );
  if (!doneToggle || !doneLabel || !donePanel || !activityList) {
    return;
  }

  const steps = resolveSettledActivitySteps(fullText, activitySteps);
  const hasActivity = steps.length > 0;
  syncSettledDoneChrome(doneToggle, doneLabel, durationSec, hasActivity);

  // No pre-reply activity: show 「已完成 Xs」 only (non-expandable).
  if (!hasActivity) {
    state.doneOpen = false;
    state.deepOpen = false;
    state.activityOpen = {};
    setToggleExpanded(doneToggle, false);
    donePanel.hidden = true;
    activityList.replaceChildren();
    stopReasoningTypewriter();
    return;
  }

  setToggleExpanded(doneToggle, state.doneOpen);
  // Nested hierarchy: 已完成 collapsed → hide entire panel (all activity rows).
  if (!state.doneOpen) {
    state.deepOpen = false;
    donePanel.hidden = true;
    stopReasoningTypewriter();
    return;
  }

  donePanel.hidden = false;
  stopReasoningTypewriter();
  syncActivityListDom(activityList, steps, {
    getExpanded: id => Boolean(state.activityOpen[id]),
    setExpanded: (id, open) => {
      state.activityOpen = { ...state.activityOpen, [id]: open };
      // Keep legacy deepOpen in sync when toggling reasoning row
      if (id === 'reasoning') {
        state.deepOpen = open;
      }
    },
    showStatusBadge: false,
  });
  state.displayedLength = (fullText || '').length;
}

type ActivityListDomOptions = {
  getExpanded: (id: string) => boolean;
  setExpanded: (id: string, open: boolean) => void;
  showStatusBadge?: boolean;
};

function createActivityRow(
  doc: Document,
  stepId: string,
  options: ActivityListDomOptions
): HTMLElement {
  const row = doc.createElement('div');
  row.className = 'deep-chat-dt-activity';
  row.dataset.stepId = stepId;

  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'deep-chat-dt-toggle';
  toggle.setAttribute('aria-expanded', 'false');

  const label = doc.createElement('span');
  label.className = 'deep-chat-dt-label';
  const meta = doc.createElement('span');
  meta.className = 'deep-chat-dt-activity-meta';
  toggle.append(label, meta, createChevronIcon(doc));

  const body = doc.createElement('div');
  body.className = 'deep-chat-dt-body';
  body.hidden = true;
  const text = doc.createElement('pre');
  text.className = 'deep-chat-dt-text';
  body.append(text);

  toggle.addEventListener('click', () => {
    const id = row.dataset.stepId || '';
    const next = !options.getExpanded(id);
    options.setExpanded(id, next);
    setToggleExpanded(toggle, next);
    body.hidden = !next;
    const bodyNode = row.querySelector<HTMLElement>('.deep-chat-dt-body');
    if (!bodyNode) return;
    if (next) {
      syncDeepChatDtBodyScrollCap(bodyNode);
    } else {
      bodyNode.scrollTop = 0;
    }
  });

  row.append(toggle, body);
  return row;
}

function syncActivityRowMeta(
  row: HTMLElement,
  step: PreReplyActivityStep,
  label: HTMLElement,
  meta: HTMLElement,
  showStatusBadge: boolean
): void {
  if (label.textContent !== step.label) {
    label.textContent = step.label;
  }
  const badge = activityStatusBadge(step.status, showStatusBadge);
  if (meta.textContent !== badge) {
    meta.textContent = badge;
  }
  meta.hidden = !badge;
  row.dataset.status = step.status;
  row.dataset.kind = step.kind;
}

function syncActivityRowExpansion(
  toggle: HTMLElement,
  body: HTMLElement,
  text: HTMLElement,
  step: PreReplyActivityStep,
  options: ActivityListDomOptions
): void {
  const detail = (step.detail || '').trim();
  const expandable = Boolean(detail);
  toggle.classList.toggle('is-static', !expandable);
  if (!expandable) {
    options.setExpanded(step.id, false);
    setToggleExpanded(toggle, false);
    body.hidden = true;
    if (text.textContent) text.textContent = '';
    return;
  }

  const expanded = options.getExpanded(step.id);
  setToggleExpanded(toggle, expanded);
  body.hidden = !expanded;
  if (text.textContent !== detail) {
    text.textContent = detail;
  }
  // Settled activity rows: fit-content + max-height via CSS; stick scroll if long.
  if (expanded) {
    syncDeepChatDtBodyScrollCap(body);
  } else {
    body.scrollTop = 0;
  }
}

function applyActivityRowState(
  row: HTMLElement,
  step: PreReplyActivityStep,
  options: ActivityListDomOptions
): void {
  const toggle = row.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const label = row.querySelector<HTMLElement>('.deep-chat-dt-label');
  const meta = row.querySelector<HTMLElement>('.deep-chat-dt-activity-meta');
  const body = row.querySelector<HTMLElement>('.deep-chat-dt-body');
  const text = row.querySelector<HTMLElement>('.deep-chat-dt-text');
  if (!toggle || !label || !meta || !body || !text) return;

  syncActivityRowMeta(row, step, label, meta, options.showStatusBadge === true);
  syncActivityRowExpansion(toggle, body, text, step, options);
}

/**
 * Render ordered activity rows (depth-thinking style toggles).
 * Reuses rows by data-step-id to limit MutationObserver thrash.
 */
export function syncActivityListDom(
  list: HTMLElement,
  steps: PreReplyActivityStep[],
  options: ActivityListDomOptions
): void {
  const doc = list.ownerDocument;
  const seen = new Set<string>();

  steps.forEach((step, index) => {
    seen.add(step.id);
    let row = list.querySelector<HTMLElement>(
      `:scope > .deep-chat-dt-activity[data-step-id="${cssEscapeAttr(step.id)}"]`
    );
    if (!row) {
      row = createActivityRow(doc, step.id, options);
      list.append(row);
    }

    // Keep DOM order aligned with timeline
    const expected = list.children[index];
    if (expected !== row) {
      list.insertBefore(row, expected ?? null);
    }

    applyActivityRowState(row, step, options);
  });

  // Remove stale rows
  list.querySelectorAll<HTMLElement>(':scope > .deep-chat-dt-activity').forEach(row => {
    const id = row.dataset.stepId || '';
    if (!seen.has(id)) {
      row.remove();
    }
  });
}

function activityStatusBadge(status: PreReplyActivityStep['status'], show: boolean): string {
  if (!show) return '';
  if (status === 'running') return '进行中';
  if (status === 'error') return '失败';
  return '完成';
}

function cssEscapeAttr(value: string): string {
  // Minimal escape for querySelector attribute (ids are call_* / reasoning).
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function readSettledDeepThinkingNodes(settled: HTMLElement): {
  doneToggle: HTMLElement;
  doneLabel: HTMLElement;
  donePanel: HTMLElement;
  deepToggle: HTMLElement;
  deepBody: HTMLElement;
  deepText: HTMLElement;
} | null {
  const doneToggle = settled.querySelector<HTMLElement>('.deep-chat-dt-done-toggle');
  const doneLabel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-label');
  const donePanel = settled.querySelector<HTMLElement>('.deep-chat-dt-done-panel');
  // Legacy single-row nodes may be absent after activity-list refactor.
  const deepToggle =
    settled.querySelector<HTMLElement>(
      '.deep-chat-dt-activity[data-kind="reasoning"] .deep-chat-dt-toggle'
    ) || settled.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const deepBody =
    settled.querySelector<HTMLElement>(
      '.deep-chat-dt-activity[data-kind="reasoning"] .deep-chat-dt-body'
    ) || settled.querySelector<HTMLElement>('.deep-chat-dt-body');
  const deepText =
    settled.querySelector<HTMLElement>(
      '.deep-chat-dt-activity[data-kind="reasoning"] .deep-chat-dt-text'
    ) || settled.querySelector<HTMLElement>('.deep-chat-dt-text');
  if (!doneToggle || !doneLabel || !donePanel || !deepToggle || !deepBody || !deepText) {
    return null;
  }
  return { doneToggle, doneLabel, donePanel, deepToggle, deepBody, deepText };
}

/**
 * Bind MutationObserver to the *current* deep-chat instance.
 * uiHooks.replaceChat() destroys the previous element; without rebind, chrome never remounts
 * after thread switches (已完成 / 深度思考 disappear until refresh).
 */

export function observePendingGenerationChrome(chat: DeepChatElement): void {
  const root = chat.shadowRoot;
  if (!root) {
    return;
  }

  if (sessionState.pendingChromeObserver && sessionState.pendingChromeObservedChat === chat) {
    return;
  }

  disconnectChromeMutationObserver();
  sessionState.pendingChromeObservedChat = chat;
  sessionState.pendingChromeObserver = new MutationObserver(() => {
    const container = getMountedRenderContainer();
    const liveChat = container ? getChat(container) : null;
    // Drop stale callbacks from a replaced deep-chat node
    if (!container || liveChat !== chat || !chat.isConnected || !chat.shadowRoot) {
      return;
    }
    if (shouldSkipChromeRemount(chat.shadowRoot)) {
      return;
    }
    syncAllDeepThinkingChrome(container);
  });
  sessionState.pendingChromeObserver.observe(root, { childList: true, subtree: true });
}

export function scheduleDeepThinkingChromeRetry(container: HTMLElement, attempt = 0): void {
  if (sessionState.pendingChromeRetryRaf !== null) {
    return;
  }
  sessionState.pendingChromeRetryRaf = window.requestAnimationFrame(() => {
    sessionState.pendingChromeRetryRaf = null;
    const chat = getChat(container);
    if (!chat) {
      return;
    }
    // Always attempt remount when hosts exist; also rebind observer to this chat
    if (chat.shadowRoot) {
      observePendingGenerationChrome(chat);
      if (listAiMessageHosts(chat.shadowRoot).length > 0) {
        syncAllDeepThinkingChrome(container);
        return;
      }
    }
    if (attempt + 1 < PENDING_CHROME_MAX_RETRIES) {
      scheduleDeepThinkingChromeRetry(container, attempt + 1);
    }
  });
}

/**
 * After uiHooks.replaceChat / switchThread: force observer rebind + multi-phase remount.
 * deep-chat paints history async; a single sync often races empty shadow DOM.
 */

export function remountDeepThinkingChromeAfterChatReplace(container: HTMLElement): void {
  disconnectChromeMutationObserver();
  clearChromeRetrySchedule();
  syncAllDeepThinkingChrome(container);
  scheduleDeepThinkingChromeRetry(container, 0);
  for (const delayMs of [32, 80, 160, 320]) {
    const id = window.setTimeout(() => {
      sessionState.pendingChromeRetryTimeouts = sessionState.pendingChromeRetryTimeouts.filter(
        t => t !== id
      );
      if (getMountedRenderContainer() !== container) {
        return;
      }
      syncAllDeepThinkingChrome(container);
    }, delayMs);
    sessionState.pendingChromeRetryTimeouts.push(id);
  }
}

export function hideLegacyLightDomGenerationChrome(container: HTMLElement): void {
  const topStatus = container.querySelector<HTMLElement>('#deep-chat-pending-status');
  if (topStatus) {
    topStatus.hidden = true;
  }
  const lightReasoning = container.querySelector<HTMLElement>('#deep-chat-reasoning-stream');
  if (lightReasoning) {
    lightReasoning.hidden = true;
  }
}

/**
 * Completed AI replies get 「已完成」 chrome.
 * Partial (still streaming to disk) does not — unless it already has reasoning metadata.
 */

export function mountSettledChromeForMessage(
  host: HTMLElement,
  threadId: string,
  storedIndex: number,
  message: DeepChatMessage
): void {
  const uiKey = buildSettledDtKey(threadId, storedIndex, message);
  const steps = resolveMessagePreReplySteps(message);
  mountSettledDeepThinkingChrome(
    host,
    message.reasoning ?? '',
    typeof message.reasoningDurationSec === 'number' ? message.reasoningDurationSec : 0,
    uiKey,
    steps
  );
}

/**
 * Align AI DOM hosts to stored AI messages from the end.
 * deep-chat sometimes inserts an extra loading host; head-align would steal the last message.
 */

registerChromeUiHooks({
  syncPendingStatus,
  remountDeepThinkingChromeAfterChatReplace,
  isAssistantMessageRole,
  scheduleDeepThinkingChromeRetry,
  syncAllDeepThinkingChrome,
  paintOrResumeStreamingReasoning,
  resumeStreamingReasoningTypewriter,
  stopReasoningTypewriter,
});
