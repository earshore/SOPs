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

import { refreshMessageToolbarStatuses } from '../composer/messageToolbar';

import type { DeepChatElement, DeepChatMessage } from '../types';

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
 * Reading order before formal reply:
 * 1) 深度思考
 * 2) 正在生成回复…
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
  // waiting / generating-without-reasoning never mount streaming chrome — requiring
  // `.is-streaming` here caused infinite MutationObserver remount (page freeze on resend).
  if (!liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning)) {
    return true;
  }
  const selector =
    phase === 'settled'
      ? `:scope > .${GENERATION_CHROME_CLASS}.is-settled`
      : `:scope > .${GENERATION_CHROME_CLASS}.is-streaming`;
  return Boolean(liveHost.querySelector(selector));
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
        mountSettledDeepThinkingChrome(host, pending.reasoningText, durationSec, uiKey);
        return;
      }
      mountStreamingGenerationChrome(host, pending);
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
      (typeof message.reasoningDurationSec === 'number' &&
        Number.isFinite(message.reasoningDurationSec))
    );
  }
  // Finished AI message: always show 已完成 (duration 0 if unknown).
  return true;
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

export function stopReasoningTypewriter(): void {
  if (sessionState.reasoningTypewriterTimer !== null) {
    window.clearTimeout(sessionState.reasoningTypewriterTimer);
    sessionState.reasoningTypewriterTimer = null;
  }
  sessionState.reasoningTypewriterTextEl = null;
}

/**
 * Streaming-only typewriter. Reads full text live each tick so collapse→expand
 * and late reasoning chunks keep advancing (no stale snapshot freeze).
 */

export function scheduleReasoningTypewriter(
  textEl: HTMLElement,
  getFullText: () => string,
  getDisplayed: () => number,
  setDisplayed: (n: number) => void,
  isActive: () => boolean
): void {
  stopReasoningTypewriter();
  sessionState.reasoningTypewriterTextEl = textEl;

  const run = (): void => {
    if (!isActive() || sessionState.reasoningTypewriterTextEl !== textEl || !textEl.isConnected) {
      sessionState.reasoningTypewriterTimer = null;
      if (sessionState.reasoningTypewriterTextEl === textEl) {
        sessionState.reasoningTypewriterTextEl = null;
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
      textEl.scrollTop = textEl.scrollHeight;
      // Stay armed: more reasoning may still arrive while expanded.
      // Next uiHooks.ensureStreamingDeepThinkingBlock / resume will restart if full grows.
      sessionState.reasoningTypewriterTimer = null;
      return;
    }
    displayed = Math.min(full.length, displayed + REASONING_TYPEWRITER_CHARS);
    setDisplayed(displayed);
    textEl.textContent = full.slice(0, displayed);
    textEl.scrollTop = textEl.scrollHeight;
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
  // Already driving this live `<pre>`: each tick re-reads pending.reasoningText.
  // Skip restart on every reasoning chunk (avoids jank). Remounted nodes rebind.
  if (
    sessionState.reasoningTypewriterTimer !== null &&
    sessionState.reasoningTypewriterTextEl === textEl &&
    textEl.isConnected &&
    isStreamingReasoningTypewriterActive(pending)
  ) {
    return;
  }
  scheduleReasoningTypewriter(
    textEl,
    () => pending.reasoningText,
    () => pending.reasoningDisplayedLength ?? 0,
    n => {
      pending.reasoningDisplayedLength = n;
    },
    () => isStreamingReasoningTypewriterActive(pending)
  );
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
  if (prefersInstantReasoningText()) {
    textEl.textContent = full;
    pending.reasoningDisplayedLength = full.length;
    stopReasoningTypewriter();
    return;
  }

  const displayed = pending.reasoningDisplayedLength ?? 0;
  if (displayed >= full.length) {
    if (textEl.textContent !== full) {
      textEl.textContent = full;
    }
    pending.reasoningDisplayedLength = full.length;
    return;
  }

  // New chunks or re-expand with remaining text → keep typewriter running.
  resumeStreamingReasoningTypewriter(textEl, pending);
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
 * Live status for toolbar end — waiting / generating only.
 * Once 深度思考 starts (phase === reasoning), hide 「思考中… / 等待模型响应…」
 * so waiting copy does not sit next to the reasoning chrome as visual noise.
 */

export function getActiveLiveGenerationStatusLabel(): string | null {
  const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
  if (!pending || pending.isSettled) {
    return null;
  }
  const phase = getDeepChatGenerationPhase(pending);
  if (phase === 'waiting') {
    return getWaitingStatusLabel(pending);
  }
  if (phase === 'generating') {
    return getGeneratingStatusLabel(pending);
  }
  // reasoning | settled: no toolbar live status (深度思考 / 已完成 own the UI)
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

export function mountStreamingGenerationChrome(
  host: HTMLElement,
  pending: PendingDeepChatRequest
): void {
  const phase = getDeepChatGenerationPhase(pending);
  const hasReasoning = Boolean(pending.reasoningText.trim());

  if (phase === 'waiting') {
    // Do not touch bubble chrome DOM — toolbar owns waiting status.
    ensureWaitingStatusRotateTimer();
    refreshLiveGenerationToolbarStatus();
    return;
  }

  clearWaitingStatusRotateTimer();

  if (!liveGenerationPhaseNeedsBubbleChrome(phase, hasReasoning)) {
    // generating without reasoning: drop stray empty streaming chrome once, idempotently
    const existing = getChromeOnHost(host);
    if (
      existing?.classList.contains('is-streaming') &&
      !existing.querySelector('.deep-chat-dt-stream') &&
      !existing.querySelector('.deep-chat-dt-settled')
    ) {
      existing.remove();
    }
    refreshLiveGenerationToolbarStatus();
    return;
  }

  const chrome = ensureGenerationChromeOnHost(host, STREAMING_DT_KEY, 'streaming');
  // Drop settled nodes only on this generating host (history 已完成 stays on earlier hosts)
  chrome.querySelector('.deep-chat-dt-settled')?.remove();
  // Status line no longer sits above the bubble — toolbar end owns it.
  hideStatusInChrome(chrome);

  if (phase === 'reasoning' || hasReasoning) {
    uiHooks.ensureStreamingDeepThinkingBlock(chrome, pending.reasoningText, pending);
    placeGenerationChromeRoot(host, chrome);
  }
  refreshLiveGenerationToolbarStatus();
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
} {
  let state = sessionState.settledDeepThinkingUi.get(uiKey);
  if (!state) {
    state = { doneOpen: false, deepOpen: false, displayedLength: 0 };
    sessionState.settledDeepThinkingUi.set(uiKey, state);
  }
  return state;
}

/**
 * Settled chrome: always show 「已完成 Xs」 after a generation finishes.
 * Nested 「深度思考」 only when reasoning text is non-empty.
 */

export function mountSettledDeepThinkingChrome(
  host: HTMLElement,
  reasoningText: string,
  durationSec: number,
  uiKey: string
): void {
  const full = reasoningText.trim();
  const chrome = ensureGenerationChromeOnHost(host, uiKey, 'settled');
  chrome.querySelector('.deep-chat-dt-stream')?.remove();
  chrome.querySelector('#' + INLINE_PENDING_STATUS_ID)?.remove();

  const doc = host.ownerDocument;
  let settled = chrome.querySelector<HTMLElement>('.deep-chat-dt-settled');
  if (!settled) {
    settled = createSettledDeepThinkingDom(doc, uiKey);
    chrome.append(settled);
  }

  // Keep latest text/duration on the node so click handlers stay current after remounts
  settled.dataset.dtFull = full;
  settled.dataset.dtDuration = String(Math.max(0, Math.round(durationSec)));

  applySettledDeepThinkingUi(settled, full, durationSec, uiKey);
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

  const deepToggle = doc.createElement('button');
  deepToggle.type = 'button';
  deepToggle.className = 'deep-chat-dt-toggle';
  deepToggle.setAttribute('aria-expanded', 'false');
  const deepLabel = doc.createElement('span');
  deepLabel.className = 'deep-chat-dt-label';
  deepLabel.textContent = '深度思考';
  deepToggle.append(deepLabel, createChevronIcon(doc));

  const deepBody = doc.createElement('div');
  deepBody.className = 'deep-chat-dt-body';
  deepBody.hidden = true;
  const deepText = doc.createElement('pre');
  deepText.className = 'deep-chat-dt-text';
  deepBody.append(deepText);

  const readModel = (): { full: string; durationSec: number } => ({
    full: settled.dataset.dtFull ?? '',
    durationSec: Number(settled.dataset.dtDuration ?? '0') || 0,
  });

  doneToggle.addEventListener('click', () => {
    const model = readModel();
    // No nested 深度思考 → 已完成 is display-only (no expand)
    if (!model.full.trim()) {
      return;
    }
    const state = getOrCreateSettledUiState(uiKey);
    state.doneOpen = !state.doneOpen;
    if (!state.doneOpen) {
      state.deepOpen = false;
    }
    applySettledDeepThinkingUi(settled, model.full, model.durationSec, uiKey);
  });

  deepToggle.addEventListener('click', () => {
    const model = readModel();
    if (!model.full.trim()) {
      return;
    }
    const state = getOrCreateSettledUiState(uiKey);
    state.deepOpen = !state.deepOpen;
    applySettledDeepThinkingUi(settled, model.full, model.durationSec, uiKey);
  });

  donePanel.append(deepToggle, deepBody);
  settled.append(doneToggle, donePanel);
  return settled;
}

export function applySettledDeepThinkingUi(
  settled: HTMLElement,
  fullText: string,
  durationSec: number,
  uiKey: string
): void {
  const state = getOrCreateSettledUiState(uiKey);
  const nodes = readSettledDeepThinkingNodes(settled);
  if (!nodes) {
    return;
  }

  const full = fullText.trim();
  const doneLabelText = formatCompletedDurationLabel(durationSec);
  // Only write when changed — avoid childList MutationObserver thrash on remount.
  if (nodes.doneLabel.textContent !== doneLabelText) {
    nodes.doneLabel.textContent = doneLabelText;
  }
  nodes.doneToggle.classList.toggle('is-static', !full);
  const disabled = full ? 'false' : 'true';
  if (nodes.doneToggle.getAttribute('aria-disabled') !== disabled) {
    nodes.doneToggle.setAttribute('aria-disabled', disabled);
  }

  // No reasoning channel: show 「已完成 Xs」 only (non-expandable).
  if (!full) {
    state.doneOpen = false;
    state.deepOpen = false;
    setToggleExpanded(nodes.doneToggle, false);
    nodes.donePanel.hidden = true;
    nodes.deepToggle.hidden = true;
    nodes.deepBody.hidden = true;
    stopReasoningTypewriter();
    return;
  }

  nodes.deepToggle.hidden = false;
  setToggleExpanded(nodes.doneToggle, state.doneOpen);
  // Nested hierarchy: 已完成 collapsed → hide entire panel (深度思考 + body).
  // Only after 已完成 expands can user toggle 深度思考.
  if (!state.doneOpen) {
    state.deepOpen = false;
    nodes.donePanel.hidden = true;
    setToggleExpanded(nodes.deepToggle, false);
    nodes.deepBody.hidden = true;
    stopReasoningTypewriter();
    return;
  }

  nodes.donePanel.hidden = false;
  setToggleExpanded(nodes.deepToggle, state.deepOpen);
  nodes.deepBody.hidden = !state.deepOpen;

  if (!state.deepOpen) {
    stopReasoningTypewriter();
    return;
  }

  // Settled: content is final — always show full text immediately (no typewriter).
  stopReasoningTypewriter();
  nodes.deepText.textContent = full;
  state.displayedLength = full.length;
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
  const deepToggle = settled.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const deepBody = settled.querySelector<HTMLElement>('.deep-chat-dt-body');
  const deepText = settled.querySelector<HTMLElement>('.deep-chat-dt-text');
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
  mountSettledDeepThinkingChrome(
    host,
    message.reasoning ?? '',
    typeof message.reasoningDurationSec === 'number' ? message.reasoningDurationSec : 0,
    uiKey
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
