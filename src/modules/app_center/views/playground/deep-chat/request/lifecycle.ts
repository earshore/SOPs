import type { ChatMessage } from '@/services/llmService';
import type { PreReplyActivityStep } from './preReplyActivity';

export type DeepChatPendingAbortReason = 'stopped' | 'deleted' | 'cleared';

/**
 * Streaming UI phases:
 * - waiting: before any reasoning/content (思考中 / 等待模型响应)
 * - reasoning: reasoning channel active; hide waiting status
 * - generating: formal reply tokens flowing (正在生成回复 · 已收到 N 字)
 * - settled: reply finished; chrome becomes 已完成 Xs only
 */
export type DeepChatGenerationPhase = 'waiting' | 'reasoning' | 'generating' | 'settled';

export interface PendingDeepChatRequest {
  threadId: string;
  conversationMessages: ChatMessage[];
  assistantText: string;
  /** Display-only reasoning channel (not part of assistantText / next-turn context). */
  reasoningText: string;
  /** Streaming UI: 深度思考 expanded */
  reasoningUiExpanded?: boolean;
  /**
   * Snapshot of reasoningUiExpanded at settle time (before stream flag is cleared).
   * Used by settle chrome handoff so O1 expand inheritance still works after mark.
   */
  reasoningExpandedAtSettle?: boolean;
  /** Streaming typewriter cursor into reasoningText */
  reasoningDisplayedLength?: number;
  /**
   * Pre-reply tool/status steps (display-only timeline under 已完成).
   * Reasoning is merged at paint time; tools are appended as they run.
   */
  preReplySteps?: PreReplyActivityStep[];
  /** Which activity row ids are expanded while streaming */
  activityUiExpanded?: Record<string, boolean>;
  displayedAssistantText: string;
  startedAt: number;
  updatedAt: number;
  controller: AbortController;
  abortReason?: DeepChatPendingAbortReason;
  isSettled?: boolean;
  /** Wall-clock settle time (ms) for 「已完成 Xs」 */
  settledAt?: number;
  /** 最近一次 partial 落盘时的 assistantText 长度 */
  lastPersistedAssistantLength?: number;
  /** 最近一次 partial 落盘时间戳 */
  lastPersistedAt?: number;
}

export function getDeepChatGenerationPhase(
  pending: Pick<PendingDeepChatRequest, 'isSettled' | 'assistantText' | 'reasoningText'>
): DeepChatGenerationPhase {
  if (pending.isSettled) {
    return 'settled';
  }
  if (pending.assistantText.trim().length > 0) {
    return 'generating';
  }
  if (pending.reasoningText.trim().length > 0) {
    return 'reasoning';
  }
  return 'waiting';
}

/**
 * Whether the live (last) AI host needs above-bubble generation chrome.
 * waiting / generating-without-reasoning use toolbar end status only —
 * requiring streaming chrome there causes MutationObserver remount thrash (page freeze).
 */
export function liveGenerationPhaseNeedsBubbleChrome(
  phase: DeepChatGenerationPhase,
  hasReasoningText: boolean,
  hasPreReplyActivity = false
): boolean {
  if (phase === 'settled' || phase === 'reasoning') {
    return true;
  }
  // Tool activity before first token still needs chrome (timeline above bubble).
  if (hasPreReplyActivity) {
    return true;
  }
  if (phase === 'generating' && hasReasoningText) {
    return true;
  }
  return false;
}

interface CreatePendingDeepChatRequestOptions {
  now?: number;
  controller?: AbortController;
}

export function createPendingDeepChatRequest(
  threadId: string,
  conversationMessages: ChatMessage[],
  options: CreatePendingDeepChatRequestOptions = {}
): PendingDeepChatRequest {
  const now = options.now ?? Date.now();

  return {
    threadId,
    conversationMessages: [...conversationMessages],
    assistantText: '',
    reasoningText: '',
    preReplySteps: [],
    activityUiExpanded: {},
    displayedAssistantText: '',
    startedAt: now,
    updatedAt: now,
    controller: options.controller || new AbortController(),
  };
}

export function appendPendingDeepChatAssistantText(
  pendingRequest: PendingDeepChatRequest,
  delta: string,
  now = Date.now()
): void {
  pendingRequest.assistantText += delta;
  pendingRequest.updatedAt = now;
}

export function appendPendingDeepChatReasoningText(
  pendingRequest: PendingDeepChatRequest,
  delta: string,
  now = Date.now()
): void {
  if (!delta) return;
  const wasEmpty = !pendingRequest.reasoningText.trim();
  pendingRequest.reasoningText += delta;
  pendingRequest.updatedAt = now;
  // First reasoning chunk: auto-expand so 深度思考 body is visible while streaming.
  if (wasEmpty && pendingRequest.reasoningUiExpanded === undefined) {
    pendingRequest.reasoningUiExpanded = true;
  }
}

export function markPendingDeepChatAssistantTextDisplayed(
  pendingRequest: PendingDeepChatRequest,
  displayedText: string,
  now = Date.now()
): void {
  pendingRequest.displayedAssistantText = displayedText.slice(
    0,
    pendingRequest.assistantText.length
  );
  pendingRequest.updatedAt = now;
}

export function markPendingDeepChatRequestSettled(
  pendingRequest: PendingDeepChatRequest,
  now = Date.now()
): void {
  // Capture expand state before clearing — settle chrome handoff reads this (spec O1/A1).
  pendingRequest.reasoningExpandedAtSettle = pendingRequest.reasoningUiExpanded === true;
  pendingRequest.isSettled = true;
  pendingRequest.settledAt = now;
  pendingRequest.updatedAt = now;
  // Collapse live stream toggle; settled UI uses doneOpen/activityOpen via handoff.
  pendingRequest.reasoningUiExpanded = false;
}

export function getPendingReasoningDurationSec(
  pendingRequest: Pick<PendingDeepChatRequest, 'startedAt' | 'settledAt' | 'updatedAt'>,
  now = Date.now()
): number {
  const end = pendingRequest.settledAt ?? now;
  return Math.max(0, Math.round((end - pendingRequest.startedAt) / 1000));
}

export function isPendingDeepChatDisplayComplete(pendingRequest: PendingDeepChatRequest): boolean {
  return pendingRequest.displayedAssistantText.length >= pendingRequest.assistantText.length;
}

/**
 * 推送门禁纯判定：生成完全结束且正文已完整落 DOM 才允许推送。
 * - 无 pending → 就绪（无进行中请求）
 * - 未 settle → 未就绪（流式 / waiting / reasoning）
 * - settle 后 displayed < full → 未就绪（打字机重放未完成）
 */
export function isPendingPushReady(
  pendingRequest: PendingDeepChatRequest | undefined
): boolean {
  if (!pendingRequest) return true;
  if (!pendingRequest.isSettled) return false;
  return isPendingDeepChatDisplayComplete(pendingRequest);
}

export function abortPendingDeepChatRequest(
  pendingRequest: PendingDeepChatRequest,
  reason: DeepChatPendingAbortReason
): void {
  pendingRequest.abortReason ||= reason;
  if (!pendingRequest.controller.signal.aborted) {
    // 带 reason abort，避免浏览器默认 “signal is aborted without reason” 噪音（同 llmModelList 约定）
    const reasonError = new Error(reason === 'stopped' ? '已停止生成' : '请求已取消');
    reasonError.name = 'AbortError';
    pendingRequest.controller.abort(reasonError);
  }
}

export function shouldPreserveStoppedResponse(pendingRequest: PendingDeepChatRequest): boolean {
  return pendingRequest.abortReason === 'stopped' && pendingRequest.assistantText.trim().length > 0;
}

export interface PersistPendingDeepChatPartialOptions {
  minChars?: number;
  minIntervalMs?: number;
  now?: number;
  force?: boolean;
}

function isPendingDeepChatPartialEligible(pendingRequest: PendingDeepChatRequest): boolean {
  return (
    !pendingRequest.isSettled &&
    !pendingRequest.abortReason &&
    pendingRequest.assistantText.trim().length > 0
  );
}

function shouldPersistDeepChatPartialGrowth(
  pendingRequest: PendingDeepChatRequest,
  options: PersistPendingDeepChatPartialOptions
): boolean {
  const text = pendingRequest.assistantText;
  const minChars = options.minChars ?? 120;
  const minIntervalMs = options.minIntervalMs ?? 2000;
  const now = options.now ?? Date.now();
  const lastLen = pendingRequest.lastPersistedAssistantLength ?? 0;
  const lastAt = pendingRequest.lastPersistedAt ?? 0;

  if (text.length === lastLen) {
    return false;
  }

  if (lastLen === 0) {
    return text.length >= minChars || now - pendingRequest.startedAt >= minIntervalMs;
  }

  return text.length - lastLen >= minChars || now - lastAt >= minIntervalMs;
}

/** 流式生成中是否应把已收文本 partial 落盘（刷新后可恢复半截回复） */
export function shouldPersistPendingDeepChatPartial(
  pendingRequest: PendingDeepChatRequest,
  options: PersistPendingDeepChatPartialOptions = {}
): boolean {
  if (!isPendingDeepChatPartialEligible(pendingRequest)) {
    return false;
  }
  if (options.force) {
    return true;
  }
  return shouldPersistDeepChatPartialGrowth(pendingRequest, options);
}

export function markPendingDeepChatPartialPersisted(
  pendingRequest: PendingDeepChatRequest,
  now = Date.now()
): void {
  pendingRequest.lastPersistedAssistantLength = pendingRequest.assistantText.length;
  pendingRequest.lastPersistedAt = now;
}
