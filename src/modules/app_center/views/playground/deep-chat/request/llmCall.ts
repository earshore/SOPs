import { ValidationError } from '@/common/errors/AppError';
import { callLLM, type ChatMessage } from '@/services/llmService';
import {
  normalizeApiPathId,
  resolveEffectiveReasoning,
  resolveModelCapability,
  type ReasoningEffort,
  type ReasoningEffortLevel,
} from '@/services/modelCapability';
import {
  collapseTextEmittedToolCallsForDisplay,
  describeResponsesEmptyBody,
  textLooksLikeEmittedToolCalls,
} from '@/services/modelCapability';
import { getRuntimeDeepChatOptions } from '@/services/runtimeStrategyService';
import { StorageService } from '@/services/storageService';

import {
  DEEP_CHAT_RECOVERY_MAX_OUTPUT_TOKENS_FLOOR,
  resolveDeepChatMaxOutputTokens,
  resolveDeepChatRequestBudget,
} from './budget';
import {
  createDeepChatBusinessToolExecutor,
  DEEP_CHAT_BUSINESS_TOOLS,
  isDeepChatBusinessToolsEnabled,
} from './businessTools';
import { appendPendingDeepChatReasoningText, type PendingDeepChatRequest } from './lifecycle';
import {
  formatToolActivityLabel,
  formatToolArgsDetail,
  formatToolResultDetail,
  upsertPreReplyActivityStep,
} from './preReplyActivity';
import {
  appendPendingAssistantText,
  emitPendingAssistantDelta,
  getMountedRenderContainer,
  getRenderContainerForThread,
  schedulePendingAssistantDisplay,
} from '../session/pendingRuntime';
import { sessionState } from '../session/sessionState';
import {
  getActiveThread,
  getThreadById,
  updateActiveThreadFields,
  updateThreadFields,
} from '../session/threadStore';
import {
  uiHooks,
  findConfigModelsEntry,
  parseReasoningEffortValue,
  type DeepChatReasoningSessionOverride,
} from '../session/uiHooks';

import type { DeepChatThread } from '../types';
import type { DeepChatElement, DeepChatSignals, DeepChatLLMCallContext } from '../types';
import type { LLMProviderConfig } from '@/types/state';

type DeepChatStreamState = { streamedText: string };

/**
 * 最高推理档位（clamp 后 === 'max'）请求超时放大：min(base×2, 300s)。
 * 仅影响 Deep Chat 请求路径；非 max 档 / 推理关闭 / 恢复路径保持不变。
 */
export const DEEP_CHAT_MAX_EFFORT_TIMEOUT_FACTOR = 2;
export const DEEP_CHAT_MAX_EFFORT_TIMEOUT_CAP_MS = 300_000;

export function resolveDeepChatScaledTimeout(
  baseTimeoutMs: number,
  effectiveEffort: ReasoningEffort | undefined
): number {
  if (effectiveEffort !== 'max') {
    return baseTimeoutMs;
  }
  return Math.min(
    baseTimeoutMs * DEEP_CHAT_MAX_EFFORT_TIMEOUT_FACTOR,
    DEEP_CHAT_MAX_EFFORT_TIMEOUT_CAP_MS
  );
}

/**
 * 与 llmTransport 最终映射一致的生效档位（clamp 后），用于超时放大判定。
 */
function resolveDeepChatEffectiveEffort(
  config: LLMProviderConfig,
  model: string,
  reasoningOptions: ReturnType<typeof prepareDeepChatReasoningCallOptions>
): ReasoningEffort | undefined {
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  const capability = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
    preferredSurface: apiPath,
  });
  return resolveEffectiveReasoning(
    capability,
    reasoningOptions.reasoningPrefs,
    reasoningOptions.reasoningSessionOverride
  ).effort;
}

export function prepareDeepChatReasoningCallOptions(): {
  reasoningPrefs?: { enabled: boolean; effort: ReasoningEffortLevel };
  reasoningSessionOverride?: DeepChatReasoningSessionOverride;
} {
  const mountContainer = getMountedRenderContainer();
  const reasoningSessionOverride = uiHooks.resolveDeepChatReasoningSessionOverride(mountContainer);
  if (reasoningSessionOverride && mountContainer) {
    updateActiveThreadFields(mountContainer, {
      reasoning: {
        enabled: reasoningSessionOverride.enabled,
        ...(reasoningSessionOverride.effort ? { effort: reasoningSessionOverride.effort } : {}),
      },
    });
  }
  // Explicit prefs so hydrate cannot fall back to stale disabled global.
  if (reasoningSessionOverride === undefined) {
    return {};
  }
  return {
    reasoningSessionOverride,
    reasoningPrefs: {
      enabled: reasoningSessionOverride.enabled,
      effort: parseReasoningEffortValue(reasoningSessionOverride.effort),
    },
  };
}

type DeepChatChainOptions = {
  apiPath?: ReturnType<typeof normalizeApiPathId>;
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  executeTool?: ReturnType<typeof createDeepChatBusinessToolExecutor>;
  enableToolLoop?: boolean;
  maxToolRounds?: number;
};

function getPendingForThread(threadId: string): PendingDeepChatRequest | undefined {
  return sessionState.pendingRequests.get(threadId);
}

/** Fail-closed snapshot when origin thread was deleted mid-generation. */
function emptyThreadSnapshot(threadId: string): DeepChatThread {
  return {
    id: threadId,
    title: '',
    messages: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function recordToolActivityStart(
  name: string,
  argsJson: string,
  callId: string,
  threadId: string
): void {
  const pending = getPendingForThread(threadId);
  if (!pending) return;
  const steps = pending.preReplySteps ?? [];
  pending.preReplySteps = upsertPreReplyActivityStep(steps, {
    id: callId || `tool_${steps.length + 1}`,
    kind: 'tool',
    label: formatToolActivityLabel(name),
    detail: formatToolArgsDetail(argsJson),
    status: 'running',
    order: steps.length,
  });
  pending.updatedAt = Date.now();
  const container = getMountedRenderContainer();
  if (container) uiHooks.syncPendingStatus(container);
}

function recordToolActivityEnd(
  name: string,
  callId: string,
  output: string,
  status: 'done' | 'error',
  threadId: string
): void {
  const pending = getPendingForThread(threadId);
  if (!pending) return;
  const steps = pending.preReplySteps ?? [];
  const existing = steps.find(s => s.id === callId);
  pending.preReplySteps = upsertPreReplyActivityStep(steps, {
    id: callId || `tool_${steps.length + 1}`,
    kind: 'tool',
    label: existing?.label || formatToolActivityLabel(name),
    detail: formatToolResultDetail(output),
    status,
    order: existing?.order ?? steps.length,
  });
  pending.updatedAt = Date.now();
  const container = getMountedRenderContainer();
  if (container) uiHooks.syncPendingStatus(container);
}

function buildDeepChatToolOptions(
  config: LLMProviderConfig,
  model: string,
  supportsTools: boolean,
  toolPrefs?: { enableBusinessTools?: boolean },
  threadId?: string
): Pick<DeepChatChainOptions, 'tools' | 'executeTool' | 'enableToolLoop' | 'maxToolRounds'> {
  if (!supportsTools || !isDeepChatBusinessToolsEnabled(toolPrefs)) {
    return {};
  }
  const originThreadId = threadId;
  const baseExecute = createDeepChatBusinessToolExecutor({
    // Production: never fall back to active thread (cross-session leak).
    getThread: () =>
      originThreadId
        ? (getThreadById(originThreadId) ?? emptyThreadSnapshot(originThreadId))
        : getActiveThread(),
    getModel: () => model,
    getProvider: () => config.provider,
  });
  return {
    tools: DEEP_CHAT_BUSINESS_TOOLS,
    executeTool: async call => {
      const callId = call.callId || `tool_${Date.now()}`;
      const activityThreadId = originThreadId || getActiveThread().id;
      recordToolActivityStart(call.name, call.arguments, callId, activityThreadId);
      try {
        const output = await baseExecute({ ...call, callId });
        recordToolActivityEnd(call.name, callId, String(output ?? ''), 'done', activityThreadId);
        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        recordToolActivityEnd(
          call.name,
          callId,
          JSON.stringify({ error: message }),
          'error',
          activityThreadId
        );
        throw error;
      }
    },
    enableToolLoop: true,
    // Keep short: models often loop tools; last round forces tool_choice=none.
    maxToolRounds: 3,
  };
}

function resolveResponsesChainFlags(
  model: string,
  cap: ReturnType<typeof resolveModelCapability>,
  threadId?: string
): Pick<DeepChatChainOptions, 'previousResponseId' | 'store'> {
  const thread = threadId ? getThreadById(threadId) : getActiveThread();
  if (!thread) {
    return { store: false };
  }
  const previousResponseId =
    thread.lastResponseModel === model && thread.lastResponseId ? thread.lastResponseId : undefined;
  const canChain =
    Boolean(previousResponseId) &&
    cap.supportsPreviousResponseId === true &&
    cap.supportsStore === true;
  return canChain ? { previousResponseId, store: true } : { store: false };
}

export function resolveDeepChatResponsesChainOptions(
  config: LLMProviderConfig,
  model: string,
  /** Optional tool prefs override (tests / explicit callers). Runtime default is fail-closed. */
  toolPrefs?: { enableBusinessTools?: boolean },
  /** Origin thread for chain + tools; omit only for legacy/test paths. */
  threadId?: string
): DeepChatChainOptions {
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );

  // Dual-path Create parity: tools on chat_completions and responses (not responses-only).
  if (apiPath !== 'responses' && apiPath !== 'chat_completions') {
    return { apiPath };
  }

  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    preferredSurface: apiPath,
  });
  const toolOptions = buildDeepChatToolOptions(
    config,
    model,
    cap.supportsTools,
    toolPrefs,
    threadId
  );

  if (apiPath === 'chat_completions') {
    return { apiPath, ...toolOptions };
  }

  return {
    apiPath,
    ...resolveResponsesChainFlags(model, cap, threadId),
    ...toolOptions,
  };
}

export function persistDeepChatResponseId(
  model: string,
  responseId: string,
  threadId?: string
): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  const fields = {
    lastResponseId: responseId,
    lastResponseModel: model,
  };
  if (threadId) {
    updateThreadFields(container, threadId, fields);
    return;
  }
  updateActiveThreadFields(container, fields);
}

export function isResponsesChainUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const blob =
    `${error.message} ${JSON.stringify((error as { response?: unknown }).response ?? '')}`.toLowerCase();
  return (
    /previous_response_id|stored responses are not supported|store.*not supported|not support.*store/.test(
      blob
    ) ||
    ((error as { statusCode?: number }).statusCode === 400 && /previous_response|store/.test(blob))
  );
}

export function clearDeepChatResponseChain(threadId?: string): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  const fields = {
    lastResponseId: undefined,
    lastResponseModel: undefined,
  };
  if (threadId) {
    updateThreadFields(container, threadId, fields);
    return;
  }
  updateActiveThreadFields(container, fields);
}

export function stripResponsesChainForRetry(
  chain: ReturnType<typeof resolveDeepChatResponsesChainOptions>
): ReturnType<typeof resolveDeepChatResponsesChainOptions> {
  return {
    apiPath: 'responses',
    store: false,
    ...(chain.tools
      ? {
          tools: chain.tools,
          executeTool: chain.executeTool,
          enableToolLoop: chain.enableToolLoop,
          maxToolRounds: chain.maxToolRounds,
        }
      : {}),
  };
}

export function createDeepChatStreamHandler(
  pendingRequest: PendingDeepChatRequest,
  signals: DeepChatSignals,
  sourceChat: DeepChatElement | null,
  state: DeepChatStreamState
): (update: { delta: string; reasoningDelta?: string }) => void {
  return update => {
    if (pendingRequest.abortReason) return;
    if (update.reasoningDelta) {
      appendPendingDeepChatReasoningText(pendingRequest, update.reasoningDelta);
    }
    state.streamedText += update.delta;
    if (update.delta) {
      appendPendingAssistantText(pendingRequest, update.delta);
      void emitPendingAssistantDelta(signals, pendingRequest, sourceChat, update.delta);
    } else if (update.reasoningDelta) {
      // Only paint chrome for *this* request's thread (not whatever is currently mounted).
      // Background reasoning must keep accumulating without thrashing another session's UI.
      const container = getRenderContainerForThread(pendingRequest.threadId);
      if (container) {
        uiHooks.syncPendingStatus(container);
      }
    }
  };
}

export async function callDeepChatLLM(context: DeepChatLLMCallContext): Promise<string> {
  const {
    messages,
    config,
    model,
    signals,
    sourceChat,
    controller,
    pendingRequest,
    visionUserParts,
  } = context;
  const streamState: DeepChatStreamState = { streamedText: '' };
  const originThreadId = pendingRequest.threadId;
  const reasoningOptions = prepareDeepChatReasoningCallOptions();
  let responsesChain = resolveDeepChatResponsesChainOptions(
    config,
    model,
    undefined,
    originThreadId
  );
  const onStreamUpdate = createDeepChatStreamHandler(
    pendingRequest,
    signals,
    sourceChat,
    streamState
  );

  const reasoningEnabled = Boolean(reasoningOptions.reasoningPrefs?.enabled);
  // Align with prepare-time budget (includes context clamp / fail-closed effective output).
  const maxTokens = resolveDeepChatRequestBudget(config, model, reasoningEnabled).maxOutputTokens;
  // 仅当轮透传；不进 thread 持久化。
  const visionOptions = visionUserParts && visionUserParts.length > 0 ? { visionUserParts } : {};

  const run = (chain: typeof responsesChain) => {
    const baseTimeoutMs = getRuntimeDeepChatOptions().timeout;
    return callLLM(messages, config.provider, config.endpoint, config.apiKey, model, {
      temperature: sessionState.sessionTemperature,
      maxTokens,
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
      ...reasoningOptions,
      ...chain,
      ...visionOptions,
      modelsEntry: findConfigModelsEntry(config, model),
      retries: 0,
      ...getRuntimeDeepChatOptions(),
      // max 档推理放大超时（min(base×2, 300s)）；非 max 档/推理关闭保持原值
      timeout: resolveDeepChatScaledTimeout(
        baseTimeoutMs,
        resolveDeepChatEffectiveEffort(config, model, reasoningOptions)
      ),
      signal: controller.signal,
      stream: true,
      onResponseId: (responseId: string) =>
        persistDeepChatResponseId(model, responseId, originThreadId),
      onStreamUpdate,
    });
  };

  let finalText: string;
  try {
    finalText = await run(responsesChain);
  } catch (error) {
    if (!isResponsesChainUnsupportedError(error) || responsesChain.apiPath !== 'responses') {
      throw error;
    }
    clearDeepChatResponseChain(originThreadId);
    responsesChain = stripResponsesChainForRetry(responsesChain);
    streamState.streamedText = '';
    finalText = await run(responsesChain);
  }

  if (pendingRequest.abortReason) {
    const container = getMountedRenderContainer();
    if (container) uiHooks.syncPendingStatus(container);
    return pendingRequest.assistantText.trim();
  }

  return finalizeDeepChatAssistantText({
    finalText,
    streamState,
    pendingRequest,
    messages,
    config,
    model,
    controller,
    signals,
    sourceChat,
    apiPath: responsesChain.apiPath,
    maxTokens,
  });
}

async function finalizeDeepChatAssistantText(args: {
  finalText: string;
  streamState: DeepChatStreamState;
  pendingRequest: PendingDeepChatRequest;
  messages: ChatMessage[];
  config: LLMProviderConfig;
  model: string;
  controller: AbortController;
  signals: DeepChatSignals;
  sourceChat: DeepChatElement | null;
  apiPath?: ReturnType<typeof normalizeApiPathId>;
  maxTokens: number;
}): Promise<string> {
  // Prefer tool-loop final text over streamed tool-syntax dumps.
  let assistantText = (args.finalText || args.streamState.streamedText).trim();
  if (textLooksLikeEmittedToolCalls(assistantText)) {
    assistantText = collapseTextEmittedToolCallsForDisplay(assistantText);
  }

  // Gateway/model often finishes reasoning with empty visible body — one recovery hop.
  if (!assistantText && args.pendingRequest.reasoningText.trim()) {
    const recovered = await recoverDeepChatAfterReasoningOnly({
      messages: args.messages,
      config: args.config,
      model: args.model,
      controller: args.controller,
      pendingRequest: args.pendingRequest,
      signals: args.signals,
      sourceChat: args.sourceChat,
      apiPath: args.apiPath,
      priorMaxTokens: args.maxTokens,
    });
    if (recovered.trim()) {
      assistantText = recovered.trim();
      args.streamState.streamedText = '';
    }
  }

  // Tool-loop / non-stream follow-ups return one blob. Do NOT one-shot onResponse
  // (that flashes the full answer). Typewrite via pending display drain instead.
  if (shouldTypewriteFinalAssistantText(args.streamState.streamedText, assistantText)) {
    revealAssistantTextWithTypewriter(args.pendingRequest, assistantText);
  }

  syncMountedDeepThinkingChrome();
  assertDeepChatAssistantText(assistantText, args.pendingRequest);
  return assistantText;
}

/** Follow-up user turn used when the model only emitted reasoning. */
export const DEEP_CHAT_REASONING_ONLY_RECOVERY_PROMPT =
  '你刚才完成了推理但没有输出可见的最终回答。请现在直接输出完整最终答案（不要只输出思考过程，不要输出工具调用标记）。';

export function buildReasoningOnlyRecoveryMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages, { role: 'user', content: DEEP_CHAT_REASONING_ONLY_RECOVERY_PROMPT }];
}

/**
 * One-shot recovery: disable reasoning + tools, raise max tokens, ask for visible answer.
 * Returns empty string if recovery also fails (caller keeps original error path).
 */
export async function recoverDeepChatAfterReasoningOnly(args: {
  messages: ChatMessage[];
  config: LLMProviderConfig;
  model: string;
  controller: AbortController;
  pendingRequest: PendingDeepChatRequest;
  signals: DeepChatSignals;
  sourceChat: DeepChatElement | null;
  apiPath?: ReturnType<typeof normalizeApiPathId>;
  priorMaxTokens: number;
}): Promise<string> {
  if (args.controller.signal.aborted || args.pendingRequest.abortReason) {
    return '';
  }
  const recoveryState: DeepChatStreamState = { streamedText: '' };
  const onStreamUpdate = createDeepChatStreamHandler(
    args.pendingRequest,
    args.signals,
    args.sourceChat,
    recoveryState
  );
  const recoveryMax = Math.max(
    args.priorMaxTokens,
    DEEP_CHAT_RECOVERY_MAX_OUTPUT_TOKENS_FLOOR,
    resolveDeepChatMaxOutputTokens(args.priorMaxTokens, true)
  );
  try {
    const text = await callLLM(
      buildReasoningOnlyRecoveryMessages(args.messages),
      args.config.provider,
      args.config.endpoint,
      args.config.apiKey,
      args.model,
      {
        temperature: sessionState.sessionTemperature,
        maxTokens: recoveryMax,
        ...(args.config.serviceTier && { serviceTier: args.config.serviceTier }),
        // Force visible answer path: no reasoning channel, no tools.
        reasoningPrefs: { enabled: false, effort: 'medium' },
        reasoningSessionOverride: { enabled: false },
        apiPath: args.apiPath,
        store: false,
        tools: undefined,
        executeTool: undefined,
        enableToolLoop: false,
        toolChoice: undefined,
        modelsEntry: findConfigModelsEntry(args.config, args.model),
        retries: 0,
        ...getRuntimeDeepChatOptions(),
        signal: args.controller.signal,
        stream: true,
        onStreamUpdate,
      }
    );
    return (text || recoveryState.streamedText || args.pendingRequest.assistantText || '').trim();
  } catch {
    return (recoveryState.streamedText || args.pendingRequest.assistantText || '').trim();
  }
}

/**
 * True when the visible answer was not already token-streamed into the bubble.
 * Typical after tools: first hop only streams reasoning/tool_calls; final text
 * arrives as one non-stream string.
 */
export function shouldTypewriteFinalAssistantText(
  streamedText: string,
  finalAssistantText: string
): boolean {
  const final = finalAssistantText.trim();
  if (!final) return false;
  const streamed = streamedText.trim();
  if (!streamed) return true;
  if (streamed !== final) return true;
  if (textLooksLikeEmittedToolCalls(streamed)) return true;
  return false;
}

/** Restart pending typewriter so a post-tool final answer animates in. */
export function revealAssistantTextWithTypewriter(
  pendingRequest: PendingDeepChatRequest,
  text: string
): void {
  pendingRequest.assistantText = text.trim();
  pendingRequest.displayedAssistantText = '';
  schedulePendingAssistantDisplay(pendingRequest.threadId);
}

function assertDeepChatAssistantText(
  assistantText: string,
  pendingRequest: PendingDeepChatRequest
): void {
  if (assistantText) return;
  const hadReasoning = Boolean(pendingRequest.reasoningText?.trim());
  const specific =
    describeResponsesEmptyBody(null, { hadStreamedReasoning: hadReasoning }) ||
    (hadReasoning
      ? '模型完成了推理但未返回可见正文（常见原因：max_output_tokens 过小、网关只推 reasoning、或 /responses 返回了非标准正文格式）。请增大输出上限、关闭推理后重试，或在系统设置将路径改为 chat/completions。'
      : '模型没有返回任何内容，请稍后重试或检查模型/上下文配置。');
  throw new ValidationError(specific, 'DEEP_CHAT_001', 'assistantText', assistantText, {
    module: 'deep-chat',
    action: 'resolveAssistantText',
  });
}

/** Map Responses empty payloads (including incomplete) for Deep Chat / diagnostics. */
export function mapDeepChatEmptyResponsesMessage(
  data: Record<string, unknown> | null | undefined,
  options?: { hadStreamedReasoning?: boolean }
): string {
  return (
    describeResponsesEmptyBody(data, options) ||
    '模型没有返回任何内容，请稍后重试或检查模型/上下文配置。'
  );
}

export function syncMountedDeepThinkingChrome(): void {
  const container = getMountedRenderContainer();
  if (container) uiHooks.syncPendingStatus(container);
}

export { findConfigModelsEntry } from '../session/uiHooks';

export { parseReasoningEffortValue } from '../session/uiHooks';
