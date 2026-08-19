// src/services/llm/responseParsing.ts
// ================================================================
// 响应解析、错误构建与重试判定
// 由 llmService.ts 拆分而来（Level 2 重构）
// ================================================================
import { configCenter } from '@/common/config/ConfigCenter';
import { ApiError, NetworkError, SystemError } from '@/common/errors';
import { isLLMChatCompletionResponse } from '@/common/guards/typeGuards';

import { createLLMAbortResources, fetchLLMResponse, waitBeforeLLMRetry } from './callContext';
import {
  anthropicToolUsesToChatToolCalls,
  emitResponsesReasoningFromPayload,
  geminiFunctionCallsToChatToolCalls,
  getAbortError,
  getCompletionContent,
  readOpenAIStream,
} from './streamParsing';
import {
  getChatCompletionFinishReason,
  getLLMErrorMessage,
  isToolCallsFinishReason,
} from '../llmStreamDelta';
import {
  extractAnthropicMessagesText,
  extractAnthropicStopReason,
  extractAnthropicToolUses,
  extractAnthropicUsage,
  extractGeminiFinishDiagnostics,
  extractGeminiFunctionCalls,
  extractGeminiGenerateText,
  extractGeminiUsage,
  describeResponsesEmptyBody,
  extractAssistantTextFromResponsesOrChat,
  extractChatToolCallsFromCompletion,
  extractResponsesFunctionCalls,
  extractResponsesId,
  getResponsesFailureFromPayload,
  type ApiPathId,
} from '../modelCapability';

import type {
  LLMAttemptFailure,
  LLMAttemptState,
  LLMCallContext,
  LLMResponsePayload,
} from './callContext';
import type { LLMChatCompletionResponse } from '@/types/api';

export { chatContentToPlainText } from '../llmTransport';
export { fetchModelsFromApi } from '../llmModelList';

function isReasoningGatewayError(message: string, rawBody: string): boolean {
  const blob = `${message}\n${rawBody}`.toLowerCase();
  return /reasoning_effort|reasoning content|reasoning_content|thinking_effort|enable_thinking|budget_tokens|\bthinking\b|unsupported[^\n]{0,40}reasoning|unknown[^\n]{0,40}reasoning|invalid[^\n]{0,40}reasoning/.test(
    blob
  );
}

/** Non-chat path 404/unsupported → one-shot fallback to chat_completions. */
export function isAlternatePathUnsupportedError(error: ApiError): boolean {
  if (error.statusCode === 404) return true;
  if (error.statusCode !== 400 && error.statusCode !== 404) return false;
  const responseText =
    typeof error.response === 'string' ? error.response : JSON.stringify(error.response ?? '');
  const blob = `${error.message}\n${responseText}`.toLowerCase();
  return /\/responses|\/messages|generatecontent|unknown url|not found|no route|invalid url path|does not exist/.test(
    blob
  );
}

/**
 * 仅 responses → chat_completions 的路径回落守卫（tool loop 流式首请求复用）。
 * 显式限定 apiPath==='responses'：避免 anthropic/gemini 等原生路径被错误强制切到
 * chat_completions（认证头/消息结构按 path 切换，协议不兼容）。
 * 与 callLLMWithRetry 内嵌的回落判定（triedPathFallback）行为一致，各自独立维护。
 */
export function isResponsesPathFallbackEligible(
  errorValue: unknown,
  context: { apiPath?: ApiPathId }
): boolean {
  return (
    context.apiPath === 'responses' &&
    errorValue instanceof ApiError &&
    isAlternatePathUnsupportedError(errorValue)
  );
}

function getLLMStatusError(
  status: number,
  errorMsg: string,
  errorText = ''
): { errorCode: string; errorMsg: string } {
  if (status === 401) {
    return {
      errorCode: 'API_INVALID_KEY',
      errorMsg: configCenter.isProduction()
        ? `认证失败: ${errorMsg}\n\n可能的原因:\n1. 未配置访问密码\n2. API Key 格式不正确\n3. API Key 已过期或无效`
        : `API Key 认证失败: ${errorMsg}`,
    };
  }

  if (status === 429) {
    return { errorCode: 'API_RATE_LIMIT', errorMsg };
  }

  if (status === 404) {
    return { errorCode: 'API_NOT_FOUND', errorMsg };
  }

  if (status === 400) {
    if (isReasoningGatewayError(errorMsg, errorText)) {
      return {
        errorCode: 'API_INVALID_REQUEST',
        errorMsg:
          `${errorMsg}\n\n当前网关可能未透传推理参数（reasoning_effort / thinking / responses.reasoning）。` +
          `可关闭推理后重试，或检查模型 channel 是否支持对应协议字段。`,
      };
    }
    return { errorCode: 'API_INVALID_REQUEST', errorMsg };
  }

  return { errorCode: 'API_SERVER_ERROR', errorMsg };
}

async function createLLMResponseError(
  response: Response,
  context: LLMCallContext,
  attempt: number
): Promise<ApiError> {
  const errorText = await response.text();
  const fallbackErrorMsg = `服务器返回错误 ${response.status}`;
  const errorMsg = getLLMErrorMessage(errorText, fallbackErrorMsg);
  const statusError = getLLMStatusError(response.status, errorMsg, errorText);

  return new ApiError(statusError.errorMsg, statusError.errorCode, response.status, errorText, {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    attempt: attempt + 1,
  });
}

/** Non-stream Responses body with status failed → throw; incomplete without text → throw. */
function throwIfResponsesPayloadFailed(
  data: Record<string, unknown>,
  context: LLMCallContext
): void {
  const failure = getResponsesFailureFromPayload(data);
  if (!failure) return;
  // Keep partial text for incomplete bodies; only fail closed when nothing usable.
  if (failure.kind === 'incomplete' && extractAssistantTextFromResponsesOrChat(data).trim()) {
    return;
  }
  throw new ApiError(failure.message, 'API_INVALID_RESPONSE', 200, data, {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    ...(failure.code ? { errorCode: failure.code } : {}),
  });
}

function readAnthropicNonStreamPayload(
  data: Record<string, unknown>,
  context: LLMCallContext
): LLMResponsePayload {
  const usage = extractAnthropicUsage(data);
  if (usage) {
    context.options.onUsage?.({ ...usage });
  }
  const content = extractAnthropicMessagesText(data);
  const toolCalls = anthropicToolUsesToChatToolCalls(extractAnthropicToolUses(data));
  const stopReason = extractAnthropicStopReason(data);
  if (!content.trim() && toolCalls.length === 0 && stopReason === 'max_tokens') {
    throw new ApiError(
      '模型输出已达到 max tokens 上限被截断（stop_reason=max_tokens），请增大输出上限后重试。',
      'API_EMPTY_RESPONSE',
      200,
      data,
      {
        module: 'LLMService',
        action: 'callLLM',
        model: context.model,
        endpoint: context.normalizedEndpoint,
      }
    );
  }
  return {
    data: null,
    content,
    chatToolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

function readGeminiNonStreamPayload(
  data: Record<string, unknown>,
  context: LLMCallContext
): LLMResponsePayload {
  const usage = extractGeminiUsage(data);
  if (usage) {
    context.options.onUsage?.({ ...usage });
  }
  const content = extractGeminiGenerateText(data);
  const toolCalls = geminiFunctionCallsToChatToolCalls(extractGeminiFunctionCalls(data), 0);
  if (!content.trim() && toolCalls.length === 0) {
    const diagnostics = extractGeminiFinishDiagnostics(data);
    if (diagnostics) {
      throw new ApiError(diagnostics.message, 'API_EMPTY_RESPONSE', 200, data, {
        module: 'LLMService',
        action: 'callLLM',
        model: context.model,
        endpoint: context.normalizedEndpoint,
      });
    }
  }
  return {
    data: null,
    content,
    chatToolCalls: toolCalls.length ? toolCalls : undefined,
  };
}

async function readLLMResponsePayload(
  response: Response,
  context: LLMCallContext,
  requestStartedAt: number
): Promise<LLMResponsePayload> {
  if (!context.options.stream) {
    const data = (await response.json()) as Record<string, unknown>;
    if (context.apiSurface === 'responses') {
      const responseId = extractResponsesId(data);
      if (responseId) {
        context.options.onResponseId?.(responseId);
      }
      throwIfResponsesPayloadFailed(data, context);
      // Non-stream / tool-loop: still surface reasoning summary for 深度思考 UI
      emitResponsesReasoningFromPayload(data, context.options.onStreamUpdate, requestStartedAt);
      return {
        data: null,
        content: extractAssistantTextFromResponsesOrChat(data),
        rawResponsesData: data,
      };
    }
    if (context.apiSurface === 'anthropic_messages') {
      return readAnthropicNonStreamPayload(data, context);
    }
    if (context.apiSurface === 'gemini_generate') {
      return readGeminiNonStreamPayload(data, context);
    }
    const usage = data.usage;
    if (usage && typeof usage === 'object') {
      context.options.onUsage?.(usage as Record<string, unknown>);
    }
    context.options.onCompletion?.(data);
    return {
      data: data as unknown as LLMChatCompletionResponse,
      content: '',
      chatToolCalls: extractChatToolCallsFromCompletion(data),
    };
  }

  const streamResult = await readOpenAIStream(
    response,
    requestStartedAt,
    {
      onFirstResponse: context.options.onFirstResponse,
      onStreamActivity: context.options.onStreamActivity,
      onStreamUpdate: context.options.onStreamUpdate,
      onResponseId: context.options.onResponseId,
      onUsage: context.options.onUsage,
    },
    context.apiSurface
  );

  if (streamResult.usage) {
    context.options.onUsage?.(streamResult.usage);
  }
  if (streamResult.fallbackJson) {
    context.options.onCompletion?.(streamResult.fallbackJson as unknown as Record<string, unknown>);
  }

  return {
    data: streamResult.fallbackJson,
    content: streamResult.content,
    rawResponsesData: streamResult.lastResponsesPayload,
    streamFunctionCalls: streamResult.functionCalls,
    chatToolCalls: streamResult.chatToolCalls,
    streamMetrics: {
      firstChunkMs: streamResult.firstChunkMs,
      chunkCount: streamResult.chunkCount,
    },
  };
}

function hasLLMMessage(data: LLMChatCompletionResponse): boolean {
  return !!data.choices?.[0]?.message;
}

function createInvalidLLMResponseError(
  message: string,
  data: unknown,
  response: Response,
  context: LLMCallContext
): ApiError {
  return new ApiError(
    message,
    'API_INVALID_RESPONSE',
    response.status,
    JSON.stringify(data).substring(0, 200),
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      endpoint: context.normalizedEndpoint,
    }
  );
}

/**
 * Coerce gateway quirks before strict validation so tool-loop hops do not
 * fail closed on missing id/object while still rejecting true garbage.
 */
function coerceChatCompletionShape(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const row = data as Record<string, unknown>;
  if (!Array.isArray(row.choices) || row.choices.length === 0) return data;
  return {
    ...row,
    id: typeof row.id === 'string' && row.id ? row.id : 'chatcmpl-coerced',
    object: typeof row.object === 'string' && row.object ? row.object : 'chat.completion',
  };
}

function assertValidLLMResponse(
  payload: LLMResponsePayload,
  response: Response,
  context: LLMCallContext
): void {
  // Non-chat surfaces return typed payloads via content / rawResponsesData — not choices[].
  if (
    context.apiSurface === 'responses' ||
    context.apiSurface === 'anthropic_messages' ||
    context.apiSurface === 'gemini_generate'
  ) {
    return;
  }

  const { data } = payload;
  if (!data) {
    return;
  }

  const coerced = coerceChatCompletionShape(data);
  if (!isLLMChatCompletionResponse(coerced)) {
    // Recoverable: has choices[0].message even if zod rejects extras — extract text path.
    const loose = data as { choices?: Array<{ message?: unknown }> };
    if (loose.choices?.[0]?.message && typeof loose.choices[0].message === 'object') {
      return;
    }
    throw createInvalidLLMResponseError('LLM API 返回格式异常', data, response, context);
  }

  if (!hasLLMMessage(coerced as LLMChatCompletionResponse)) {
    throw createInvalidLLMResponseError(
      `API 返回格式异常: 缺少 choices 或 message 字段`,
      data,
      response,
      context
    );
  }
}

export function getLLMResponseContent(payload: LLMResponsePayload): string {
  return payload.content || getCompletionContent(payload.data);
}

export async function executeLLMAttemptPayload(
  context: LLMCallContext,
  attempt: number,
  state: LLMAttemptState
): Promise<LLMResponsePayload> {
  await waitBeforeLLMRetry(attempt, context.options);

  const {
    clearRequestTimeout,
    controller,
    resetRequestTimeout,
    resetThinkingBudget,
    clearThinkingBudget,
  } = createLLMAbortResources(context.options, state);
  const attemptContext: LLMCallContext = context.options.stream
    ? {
        ...context,
        options: {
          ...context.options,
          // 纯推理活动不重置全量超时（防无限思考），走独立推理预算；正文进展才滑动窗口
          onStreamActivity: activity => {
            if (activity.reasoningOnly) {
              resetThinkingBudget();
            } else {
              clearThinkingBudget();
              resetRequestTimeout();
            }
          },
        },
      }
    : context;
  const requestStartedAt = Date.now();

  try {
    const response = await fetchLLMResponse(attemptContext, controller);

    if (!response.ok) {
      throw await createLLMResponseError(response, attemptContext, attempt);
    }

    const payload = await readLLMResponsePayload(response, attemptContext, requestStartedAt);
    assertValidLLMResponse(payload, response, attemptContext);
    return payload;
  } finally {
    clearRequestTimeout();
  }
}

function hasResponsesToolActivity(payload: LLMResponsePayload): boolean {
  if (payload.streamFunctionCalls?.length) return true;
  if (!payload.rawResponsesData) return false;
  return extractResponsesFunctionCalls(payload.rawResponsesData).length > 0;
}

function throwIfResponsesEmptyBody(
  context: LLMCallContext,
  payload: LLMResponsePayload,
  content: string
): void {
  if (context.apiSurface !== 'responses' || content.trim() || hasResponsesToolActivity(payload)) {
    return;
  }
  const specific = describeResponsesEmptyBody(payload.rawResponsesData ?? null);
  if (!specific) return;
  throw new ApiError(specific, 'API_EMPTY_RESPONSE', 200, payload.rawResponsesData ?? null, {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
  });
}

function throwIfChatEmptyBody(
  context: LLMCallContext,
  payload: LLMResponsePayload,
  content: string
): void {
  if (context.apiSurface !== 'chat_completions' || content.trim()) {
    return;
  }
  const finishReason = getChatCompletionFinishReason(payload.data);
  if (isToolCallsFinishReason(finishReason)) {
    return;
  }
  throw new ApiError(
    '模型返回了空正文。请重试、增大 maxTokens，或检查网关 channel。',
    'API_EMPTY_RESPONSE',
    200,
    payload.data,
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      endpoint: context.normalizedEndpoint,
    }
  );
}

export async function executeLLMAttempt(
  context: LLMCallContext,
  attempt: number,
  state: LLMAttemptState
): Promise<string> {
  const payload = await executeLLMAttemptPayload(context, attempt, state);
  const content = getLLMResponseContent(payload);
  throwIfResponsesEmptyBody(context, payload, content);
  throwIfChatEmptyBody(context, payload, content);
  return content;
}

function shouldRetryApiError(error: ApiError, context: LLMCallContext, attempt: number): boolean {
  return (
    attempt < context.options.retries &&
    (error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500))
  );
}

function createLLMTimeoutError(
  error: Error,
  context: LLMCallContext,
  attempt: number
): NetworkError {
  return new NetworkError(
    `模型响应超时(${context.options.timeout / 1000}秒)`,
    'LLM_TIMEOUT',
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      timeout: context.options.timeout,
      attempt: attempt + 1,
    },
    error
  );
}

function createLLMNetworkError(
  error: Error,
  context: LLMCallContext,
  attempt: number
): NetworkError {
  return new NetworkError(
    error.message || '网络请求失败',
    'NET_REQUEST_FAILED',
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      attempt: attempt + 1,
    },
    error
  );
}

export function resolveLLMAttemptFailure(
  errorValue: unknown,
  context: LLMCallContext,
  attempt: number,
  state: LLMAttemptState
): LLMAttemptFailure {
  const error = errorValue as Error & { name?: string; status?: number };

  if (state.externallyAborted && context.options.signal) {
    return { error: getAbortError(context.options.signal), shouldRetry: false };
  }

  if (error instanceof ApiError) {
    return { error, shouldRetry: shouldRetryApiError(error, context, attempt) };
  }

  if (error.name === 'AbortError') {
    if (!state.timedOut) {
      return { error, shouldRetry: false };
    }

    const timeoutError = createLLMTimeoutError(error, context, attempt);
    return { error: timeoutError, shouldRetry: attempt < context.options.retries };
  }

  if (!error.status && attempt < context.options.retries) {
    const networkError = createLLMNetworkError(error, context, attempt);
    return { error: networkError, shouldRetry: true };
  }

  return { error, shouldRetry: false };
}

export function createUnknownLLMFailure(context: LLMCallContext): SystemError {
  return new SystemError('LLM 调用失败 (未知原因)', 'LLM_UNKNOWN_FAILURE', {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    retries: context.options.retries,
  });
}
