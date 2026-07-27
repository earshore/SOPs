import { getChat, createChevronIcon, setToggleExpanded } from '../session/domHelpers';
import { uiHooks, redactSensitiveError } from '../session/uiHooks';
import {
  getActiveThread,
  renderMountedThreadList,
  saveThreadMessages,
  threadExists,
} from '../session/threadStore';
import {
  bindStopSignal,
  cleanupLifecyclePendingRequest,
  createPendingRequest,
  createRequestController,
  getMountedRenderContainer,
  getRenderContainerForThread,
  getThreadDisplayMessages,
  notifyBackgroundPendingSettled,
  preserveTimedOutPartialResponse,
  saveFailedDeepChatResponse,
  schedulePendingAssistantDisplay,
  syncPendingRequestView,
} from '../session/pendingRuntime';
import { callDeepChatLLM } from './llmCall';
import type { ChatMessage } from '@/services/llmService';
import type { LLMProviderConfig } from '@/types/state';

import { StorageService } from '@/services/storageService';
import { ValidationError } from '@/common/errors/AppError';
import { showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { normalizeApiPathId, resolveModelCapability } from '@/services/modelCapability';

import { normalizeSkillChipDraftText } from '@/modules/app_center/skillDeepChatHandoff';

import { mergeThreadHistoryWithRequest } from '../session/conversationContext';
import {
  getPendingReasoningDurationSec,
  markPendingDeepChatRequestSettled,
  type PendingDeepChatRequest,
} from './lifecycle';
import {
  buildBudgetedDeepChatMessages,
  getDeepChatMessageBudgetError,
  getDeepChatSystemPromptBudgetError,
  resolveDeepChatRequestBudget,
  type DeepChatRequestBudget,
} from './budget';
import {
  DEEP_CHAT_VISION_COPY,
  DEEP_CHAT_VISION_PLACEHOLDER_TEXT,
  resolveDeepChatVisionUserParts,
} from './visionAttachments';
import {
  clearStagedVisionAttachments,
  getStagedVisionFiles,
  setVisionComposerPending,
} from '../composer/visionComposer';
import { findConfigModelsEntry } from '../session/uiHooks';
import { isDeepChatVisionFeatureEnabled } from '@/services/runtimeStrategyService';

import { refreshMessageToolbarStatuses } from '../composer/messageToolbar';

import type {
  DeepChatElement,
  DeepChatMessage,
  DeepChatRequestBody,
  DeepChatSignals,
  DeepChatRequestMessages,
  DeepChatRequestModelConfig,
  PreparedDeepChatRequest,
} from '../types';
import { getFirstModel, normalizeChatMessages } from '../infra/utils';

import { showToast } from '@/common/ui/notifications';

import { sessionState, nativeLoggerConsole } from '../session/sessionState';

function paintSettledGenerationChrome(): void {
  const mount = getMountedRenderContainer();
  if (!mount) return;
  uiHooks.syncAllDeepThinkingChrome(mount);
  refreshMessageToolbarStatuses(getChat(mount), () =>
    getThreadDisplayMessages(getActiveThread())
  );
}

async function reportDeepChatRequestFailure(
  error: unknown,
  pendingThreadId: string | null,
  hadVisionParts: boolean,
  signals: DeepChatSignals
): Promise<void> {
  if (preserveTimedOutPartialResponse(pendingThreadId, error)) {
    return;
  }
  const message = error instanceof Error ? error.message : '模型调用失败';
  const preferPayloadLarge = hadVisionParts && looksLikePayloadTooLarge(error);
  const userFacingMessage = preferPayloadLarge ? DEEP_CHAT_VISION_COPY.payloadLarge : message;
  const responseText = formatDeepChatErrorResponse(userFacingMessage);
  nativeLoggerConsole.error('[Deep Chat] LLM 调用失败:', redactSensitiveError(error));
  if (preferPayloadLarge) {
    showToast(DEEP_CHAT_VISION_COPY.payloadLarge, { type: 'warning' });
  } else {
    showLlmFailureToast(error, { titlePrefix: '模型调用失败: ' });
  }
  saveFailedDeepChatResponse(pendingThreadId, responseText);
  await emitDeepChatResponse(signals, { text: responseText });
}

export async function handleDeepChatRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;
  let pendingThreadId: string | null = null;
  let lifecyclePendingRequest: PendingDeepChatRequest | null = null;
  let hadVisionParts = false;

  try {
    const preparedRequest = await prepareDeepChatRequest(body, signals);
    if (!preparedRequest) return;

    const {
      config,
      model,
      activeThread,
      conversationMessages,
      messages,
      droppedMessageCount,
      visionUserParts,
    } = preparedRequest;

    const userAttachmentMeta =
      visionUserParts && visionUserParts.length > 0
        ? { count: visionUserParts.length }
        : undefined;
    hadVisionParts = Boolean(userAttachmentMeta);

    uiHooks.setConversationActive(container, true);
    signals.onOpen?.();
    requestController = createRequestController();
    pendingThreadId = activeThread.id;

    const pendingRequest = createPendingRequest(
      activeThread.id,
      conversationMessages,
      requestController
    );
    lifecyclePendingRequest = pendingRequest;
    bindStopSignal(signals, pendingRequest);
    sessionState.pendingRequests.set(activeThread.id, pendingRequest);
    // Host staged images consumed for this turn only — clear UI immediately after snapshot.
    if (hadVisionParts) {
      clearStagedVisionAttachments();
    }
    setVisionComposerPending(true);
    // conversationMessages 仅文本；vision base64 永不落盘；count-only meta 可落盘。
    saveThreadMessages(container, conversationMessages, '', {
      threadId: activeThread.id,
      ...(userAttachmentMeta ? { userAttachmentMeta } : {}),
    });
    uiHooks.consumeMountedSkillsAfterSend(container, activeThread.id);
    syncPendingRequestView(activeThread.id);
    renderMountedThreadList();
    notifyContextBudgetApplied(droppedMessageCount);

    const assistantText = await callDeepChatLLM({
      messages,
      config,
      model,
      signals,
      sourceChat: getChat(container),
      controller: requestController,
      pendingRequest,
      visionUserParts,
    });
    if (pendingRequest.abortReason || !threadExists(activeThread.id)) {
      return;
    }
    saveThreadMessages(getMountedRenderContainer(), conversationMessages, assistantText, {
      threadId: activeThread.id,
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      assistantPreReplySteps: pendingRequest.preReplySteps,
      ...(userAttachmentMeta ? { userAttachmentMeta } : {}),
    });
    markPendingDeepChatRequestSettled(pendingRequest);
    paintSettledGenerationChrome();
    notifyBackgroundPendingSettled(activeThread.id);
    schedulePendingAssistantDisplay(activeThread.id);
  } catch (error) {
    if (requestController?.signal.aborted) {
      return;
    }
    await reportDeepChatRequestFailure(error, pendingThreadId, hadVisionParts, signals);
  } finally {
    cleanupLifecyclePendingRequest(pendingThreadId, lifecyclePendingRequest);
    setVisionComposerPending(false);
    signals.onClose?.();
  }
}

/** Best-effort: gateway / provider size signals for vision turns. */
function looksLikePayloadTooLarge(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /413|payload|too large|content.?length|request entity|entity too large|context_length|maximum context/i.test(
    msg
  );
}

export async function prepareDeepChatRequest(
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<PreparedDeepChatRequest | null> {
  const { config, model } = await getDeepChatRequestModelConfig();
  if (!config || !config.apiKey || !model) {
    const configError = new ValidationError(
      '请先在系统设置中配置可用的 LLM 模型。',
      'BIZ_NO_MODEL_CONFIGURED',
      undefined,
      undefined,
      { module: 'DeepChat', action: 'prepareDeepChatRequest' }
    );
    // Actionable global toast + in-chat reject text (settings button may be hidden on some shells).
    showLlmFailureToast(configError);
    await rejectDeepChatRequest(signals, configError.message);
    return null;
  }

  // Product gate (default off) + model capability; UI is also hidden when feature off.
  const visionFeatureOn = isDeepChatVisionFeatureEnabled();
  const supportsVision =
    visionFeatureOn && resolveRequestSupportsVision(config, model);
  // When feature is off: no host staged files; body.files (if any) fail closed via supportsVision=false.
  const hostFiles = visionFeatureOn ? getStagedVisionFiles() : [];
  const visionResult = await resolveDeepChatVisionUserParts({
    body,
    supportsVision,
    hostFiles,
  });
  if (!visionResult.ok) {
    showToast(visionResult.error, { type: 'warning' });
    await rejectDeepChatRequest(signals, visionResult.error);
    return null;
  }
  const visionUserParts = visionResult.parts;

  const requestBudget = resolveDeepChatRequestBudget(config, model);
  const { requestMessages, conversationMessages, messages, droppedMessageCount } =
    createDeepChatRequestMessages(body, requestBudget, {
      allowImageOnly: visionUserParts.length > 0,
    });
  if (requestMessages.length === 0) {
    await rejectDeepChatRequest(signals, '请输入要发送的内容。');
    return null;
  }

  const budgetError = getDeepChatRequestBudgetError(requestMessages, requestBudget);
  if (budgetError) {
    await rejectDeepChatRequest(signals, budgetError);
    return null;
  }

  const activeThread = getActiveThread();
  if (sessionState.pendingRequests.has(activeThread.id)) {
    await rejectDeepChatRequest(signals, '当前会话仍在生成回复，请等待完成后再发送。');
    return null;
  }

  return {
    config,
    model,
    activeThread,
    conversationMessages,
    messages,
    droppedMessageCount,
    // 仅当轮请求；thread 持久化路径不持有 base64。
    ...(visionUserParts.length > 0 ? { visionUserParts } : {}),
  };
}

function resolveRequestSupportsVision(config: LLMProviderConfig, model: string): boolean {
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
    preferredSurface: apiPath,
  });
  return Boolean(cap.supportsVision);
}

export async function rejectDeepChatRequest(
  signals: DeepChatSignals,
  error: string
): Promise<void> {
  await emitDeepChatResponse(signals, {
    text: formatDeepChatErrorResponse(error),
  });
}

export function formatDeepChatErrorResponse(error: string): string {
  return `请求失败：${error}`;
}

export async function getDeepChatRequestModelConfig(): Promise<DeepChatRequestModelConfig> {
  const config = sessionState.currentConfig || (await StorageService.getLLMConfigWithKey());
  const model = sessionState.selectedModel || config?.model || getFirstModel(config);
  return { config, model };
}

export function createDeepChatRequestMessages(
  body: DeepChatRequestBody | DeepChatMessage[],
  budget: DeepChatRequestBudget,
  options: { allowImageOnly?: boolean } = {}
): DeepChatRequestMessages {
  let requestMessages = normalizeRequestSkillChipMessages(normalizeChatMessages(body));
  // 纯图片回合：normalize 会丢空文本，补占位以保留本轮用户消息（不落盘图片本身）。
  if (requestMessages.length === 0 && options.allowImageOnly) {
    requestMessages = [{ role: 'user', content: DEEP_CHAT_VISION_PLACEHOLDER_TEXT }];
  }
  const conversationMessages = mergeThreadHistoryWithRequest(
    getActiveThread().messages,
    requestMessages
  );
  const budgetedMessages = buildBudgetedDeepChatMessages(
    conversationMessages,
    sessionState.sessionSystemPrompt,
    budget
  );

  return {
    requestMessages,
    conversationMessages,
    messages: budgetedMessages.messages,
    droppedMessageCount: budgetedMessages.droppedMessageCount,
  };
}

/** 将 Deep Chat 可能回写的可见 Chip 文本还原为稳定的 raw marker，再持久化/发送。 */

export function normalizeRequestSkillChipMessages(messages: ChatMessage[]): ChatMessage[] {
  const contexts = getActiveThread().skillContexts || [];
  if (contexts.length === 0) {
    return messages;
  }

  return messages.map(message =>
    message.role === 'user'
      ? {
          ...message,
          content: normalizeSkillChipDraftText(
            typeof message.content === 'string' ? message.content : '',
            contexts
          ),
        }
      : message
  );
}

export function getDeepChatRequestBudgetError(
  requestMessages: ChatMessage[],
  budget: DeepChatRequestBudget
): string | null {
  return (
    getDeepChatMessageBudgetError(requestMessages, budget) ||
    getDeepChatSystemPromptBudgetError(sessionState.sessionSystemPrompt, budget)
  );
}

export function notifyContextBudgetApplied(droppedMessageCount: number): void {
  if (droppedMessageCount <= 0) {
    return;
  }

  showToast(`已自动省略 ${droppedMessageCount} 条较早上下文，以避免超过模型上下文限制。`, {
    type: 'warning',
  });
}

export function ensureStreamingDeepThinkingBlock(
  chrome: HTMLElement,
  reasoningText: string,
  pending: PendingDeepChatRequest
): void {
  const doc = chrome.ownerDocument;
  let block = chrome.querySelector<HTMLElement>('.deep-chat-dt-stream');
  if (!block) {
    block = doc.createElement('div');
    block.className = 'deep-chat-dt-stream';

    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'deep-chat-dt-toggle';
    toggle.setAttribute('aria-expanded', 'false');

    const label = doc.createElement('span');
    label.className = 'deep-chat-dt-label';
    label.textContent = '深度思考';
    toggle.append(label, createChevronIcon(doc));

    const body = doc.createElement('div');
    body.className = 'deep-chat-dt-body';
    body.hidden = true;
    const text = doc.createElement('pre');
    text.className = 'deep-chat-dt-text';
    body.append(text);

    toggle.addEventListener('click', () => {
      const next = !pending.reasoningUiExpanded;
      pending.reasoningUiExpanded = next;
      setToggleExpanded(toggle, next);
      body.hidden = !next;
      if (next) {
        // Resume from displayed cursor; live full text so output does not freeze.
        uiHooks.resumeStreamingReasoningTypewriter(text, pending);
      } else {
        // Pause only — keep reasoningDisplayedLength so re-expand continues.
        uiHooks.stopReasoningTypewriter();
      }
    });

    block.append(toggle, body);
    chrome.append(block);
  }

  const toggle = block.querySelector<HTMLElement>('.deep-chat-dt-toggle');
  const body = block.querySelector<HTMLElement>('.deep-chat-dt-body');
  const text = block.querySelector<HTMLElement>('.deep-chat-dt-text');
  if (!toggle || !body || !text) {
    return;
  }

  const expanded = Boolean(pending.reasoningUiExpanded);
  setToggleExpanded(toggle, expanded);
  body.hidden = !expanded;

  const full = reasoningText;
  if (!full.trim()) {
    block.hidden = true;
    return;
  }
  block.hidden = false;

  // Collapsed: keep cursor; do not drive the typewriter timer.
  if (!expanded) {
    body.scrollTop = 0;
    return;
  }

  uiHooks.paintOrResumeStreamingReasoning(text, pending, full);
  // After expand, re-measure scroll cap once layout is visible (hidden body → 0 height).
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      if (!body.isConnected || !pending.reasoningUiExpanded) return;
      uiHooks.paintOrResumeStreamingReasoning(text, pending, pending.reasoningText);
    });
  }
}

export function isCurrentResponseTarget(
  threadId: string,
  sourceChat: DeepChatElement | null
): boolean {
  const container = getRenderContainerForThread(threadId);
  return Boolean(container && sourceChat && getChat(container) === sourceChat);
}

export async function emitDeepChatResponse(
  signals: DeepChatSignals,
  response: { text?: string; error?: string }
): Promise<boolean> {
  try {
    await signals.onResponse?.(response);
    return true;
  } catch (error) {
    nativeLoggerConsole.warn('[Deep Chat] 忽略已卸载会话的响应更新:', error);
    return false;
  }
}

import { registerRequestUiHooks } from '../session/uiHooks';
registerRequestUiHooks({
  emitDeepChatResponse,
  isCurrentResponseTarget,
  ensureStreamingDeepThinkingBlock,
});
