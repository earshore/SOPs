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

import { StorageService } from '@/services/storageService';

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

export async function handleDeepChatRequest(
  container: HTMLElement,
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<void> {
  let requestController: AbortController | null = null;
  let pendingThreadId: string | null = null;
  let lifecyclePendingRequest: PendingDeepChatRequest | null = null;

  try {
    const preparedRequest = await prepareDeepChatRequest(body, signals);
    if (!preparedRequest) return;

    const { config, model, activeThread, conversationMessages, messages, droppedMessageCount } =
      preparedRequest;

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
    saveThreadMessages(container, conversationMessages, '', {
      threadId: activeThread.id,
    });
    // 本请求的 messages 已烘焙 skill 系统提示；立即卸挂载（单次执行）
    uiHooks.consumeMountedSkillsAfterSend(container, activeThread.id);
    syncPendingRequestView(activeThread.id);
    // 仅在进入生成态时刷新列表（勿在每个 stream token 重绘，否则无法点选其他会话）
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
    });
    if (pendingRequest.abortReason || !threadExists(activeThread.id)) {
      return;
    }
    saveThreadMessages(getMountedRenderContainer(), conversationMessages, assistantText, {
      threadId: activeThread.id,
      assistantReasoning: pendingRequest.reasoningText,
      assistantReasoningDurationSec: getPendingReasoningDurationSec(pendingRequest),
      // Explicitly omit assistantStatus so partial 「未完成」 is cleared in store.
    });
    markPendingDeepChatRequestSettled(pendingRequest);
    // Paint 「已完成」 immediately (before body typewriter finishes draining).
    {
      const mount = getMountedRenderContainer();
      if (mount) {
        uiHooks.syncAllDeepThinkingChrome(mount);
        // Clear toolbar 「未完成」 without waiting for thread switch / refresh.
        refreshMessageToolbarStatuses(getChat(mount), () =>
          getThreadDisplayMessages(getActiveThread())
        );
      }
    }
    // 后台会话：LLM 一完成就标未读并刷新列表（不等打字机 drain）
    notifyBackgroundPendingSettled(activeThread.id);
    schedulePendingAssistantDisplay(activeThread.id);
  } catch (error) {
    if (requestController?.signal.aborted) {
      return;
    }
    if (preserveTimedOutPartialResponse(pendingThreadId, error)) {
      return;
    }
    const message = error instanceof Error ? error.message : '模型调用失败';
    const responseText = formatDeepChatErrorResponse(message);
    nativeLoggerConsole.error('[Deep Chat] LLM 调用失败:', redactSensitiveError(error));
    saveFailedDeepChatResponse(pendingThreadId, responseText);
    await emitDeepChatResponse(signals, { text: responseText });
  } finally {
    cleanupLifecyclePendingRequest(pendingThreadId, lifecyclePendingRequest);
    signals.onClose?.();
  }
}

export async function prepareDeepChatRequest(
  body: DeepChatRequestBody | DeepChatMessage[],
  signals: DeepChatSignals
): Promise<PreparedDeepChatRequest | null> {
  const { config, model } = await getDeepChatRequestModelConfig();
  if (!config || !config.apiKey || !model) {
    await rejectDeepChatRequest(signals, '请先在系统设置中配置可用的 LLM 模型。');
    return null;
  }

  const requestBudget = resolveDeepChatRequestBudget(config, model);
  const { requestMessages, conversationMessages, messages, droppedMessageCount } =
    createDeepChatRequestMessages(body, requestBudget);
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
  };
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
  budget: DeepChatRequestBudget
): DeepChatRequestMessages {
  const requestMessages = normalizeRequestSkillChipMessages(normalizeChatMessages(body));
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
      ? { ...message, content: normalizeSkillChipDraftText(message.content, contexts) }
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
    return;
  }

  uiHooks.paintOrResumeStreamingReasoning(text, pending, full);
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
