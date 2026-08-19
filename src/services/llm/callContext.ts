// src/services/llm/callContext.ts
// ================================================================
// LLM 调用上下文、选项解析与 abort 资源管理
// 由 llmService.ts 拆分而来（Level 2 重构）
// ================================================================
import { randomFloat } from '@/common/utils/random';

import {
  createLLMTimeoutAbortError,

} from './responseParsing';
import {
  sleep,
  getAbortError,

} from './streamParsing';
import {
  buildLLMRequestHeaders,

} from '../llmTransport';
import {
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  type ApiPathId,
  type ApiSurface,
  type ChatFunctionToolCall,
  type ModelsListEntry,

} from '../modelCapability';
import { StorageService } from '../storageService';

import type {

ChatMessage,
LLMOptions,
ResolvedLLMOptions,

} from '../llmTypes';
import type { LLMChatCompletionResponse } from '@/types/api';

export { chatContentToPlainText } from '../llmTransport';
export { fetchModelsFromApi } from '../llmModelList';


export interface LLMCallContext {
  provider: string;
  endpoint: string;
  normalizedEndpoint: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  options: ResolvedLLMOptions;
  requestBody: Record<string, unknown>;
  /** Full request URL (endpoint + path mode). */
  requestUrl: string;
  /** Relative path suffix for logging */
  requestPath: string;
  apiSurface: ApiSurface;
  apiPath: ApiPathId;
}

export interface LLMResponsePayload {
  data: LLMChatCompletionResponse | null;
  content: string;
  /** Full Responses JSON (non-stream) for tool-loop parsing */
  rawResponsesData?: Record<string, unknown>;
  /** Function calls harvested from stream terminal events */
  streamFunctionCalls?: import('../modelCapability').ResponsesFunctionCall[];
  /** Chat Completions tool_calls from stream or non-stream body */
  chatToolCalls?: ChatFunctionToolCall[];
  streamMetrics?: {
    firstChunkMs?: number;
    chunkCount: number;
  };
}

export interface LLMAttemptFailure {
  error: Error;
  shouldRetry: boolean;
}

export interface LLMAttemptState {
  timedOut: boolean;
  externallyAborted: boolean;
}

function findStoredModelsEntry(
  models: Array<string | { id: string }> | undefined,
  modelId: string
): ModelsListEntry | string | undefined {
  if (!models || !modelId) {
    return undefined;
  }
  const found = models.find(item =>
    typeof item === 'string' ? item === modelId : item.id === modelId
  );
  if (!found) {
    return undefined;
  }
  return typeof found === 'string' ? found : found;
}

/**
 * When callers omit reasoningPrefs / modelsEntry, load global defaults from stored provider config.
 * Session override still comes only from explicit options (Deep Chat).
 */
function hydrateReasoningOptionsFromStorage(
  provider: string,
  model: string,
  options: LLMOptions
): Pick<LLMOptions, 'reasoningPrefs' | 'modelsEntry' | 'apiPath'> {
  try {
    const stored = StorageService.getLLMConfig(provider);
    return {
      reasoningPrefs:
        options.reasoningPrefs !== undefined
          ? options.reasoningPrefs
          : normalizeReasoningUserPrefs(stored?.reasoningPrefs),
      modelsEntry:
        options.modelsEntry !== undefined
          ? options.modelsEntry
          : (findStoredModelsEntry(stored?.models, model) ?? model),
      apiPath:
        options.apiPath !== undefined
          ? normalizeApiPathId(options.apiPath)
          : normalizeApiPathId((stored as { apiPath?: unknown } | null | undefined)?.apiPath),
    };
  } catch {
    return {
      reasoningPrefs: options.reasoningPrefs,
      modelsEntry: options.modelsEntry,
      apiPath: normalizeApiPathId(options.apiPath),
    };
  }
}

export function resolveLLMOptions(
  options: LLMOptions,
  provider: string,
  model: string
): ResolvedLLMOptions {
  const hydrated = hydrateReasoningOptionsFromStorage(provider, model, options);
  return {
    temperature: options.temperature ?? 0.3,
    jsonMode: options.jsonMode ?? false,
    timeout: options.timeout ?? 90000,
    maxTokens: options.maxTokens,
    serviceTier: options.serviceTier,
    retries: options.retries ?? 2,
    retryDelay: options.retryDelay ?? 1000,
    signal: options.signal,
    stream: options.stream ?? true,
    onFirstResponse: options.onFirstResponse,
    onStreamActivity: undefined,
    onStreamUpdate: options.onStreamUpdate,
    reasoningPrefs: hydrated.reasoningPrefs,
    reasoningSessionOverride: options.reasoningSessionOverride,
    modelsEntry: hydrated.modelsEntry,
    apiPath: hydrated.apiPath ?? normalizeApiPathId(options.apiPath),
    previousResponseId: options.previousResponseId,
    store: options.store,
    tools: options.tools,
    toolChoice: options.toolChoice,
    parallelToolCalls: options.parallelToolCalls,
    visionUserParts: options.visionUserParts,
    onResponseId: options.onResponseId,
    executeTool: options.executeTool,
    enableToolLoop: options.enableToolLoop,
    maxToolRounds: options.maxToolRounds,
    jsonSchema: options.jsonSchema,
    topP: options.topP,
    frequencyPenalty: options.frequencyPenalty,
    presencePenalty: options.presencePenalty,
    stop: options.stop,
    n: options.n,
    seed: options.seed,
    logitBias: options.logitBias,
    logprobs: options.logprobs,
    topLogprobs: options.topLogprobs,
    metadata: options.metadata,
    promptCacheKey: options.promptCacheKey,
    safetyIdentifier: options.safetyIdentifier,
    user: options.user,
    modalities: options.modalities,
    audio: options.audio,
    prediction: options.prediction,
    webSearchOptions: options.webSearchOptions,
    onUsage: options.onUsage,
    onCompletion: options.onCompletion,
    truncation: options.truncation,
    background: options.background,
    maxToolCalls: options.maxToolCalls,
    include: options.include,
    followUpInputItems: undefined,
  };
}

export async function waitBeforeLLMRetry(attempt: number, options: ResolvedLLMOptions): Promise<void> {
  if (attempt === 0) {
    return;
  }

  const delay = options.retryDelay * Math.pow(2, attempt - 1) * (1 + randomFloat() * 0.2);
  await sleep(delay, options.signal);
}

export function createLLMAbortResources(
  options: ResolvedLLMOptions,
  state: LLMAttemptState
): {
  controller: AbortController;
  clearRequestTimeout: () => void;
  resetRequestTimeout: () => void;
  resetThinkingBudget: () => void;
  clearThinkingBudget: () => void;
} {
  const controller = new AbortController();
  const abortOnTimeout = (): void => {
    if (controller.signal.aborted) return;
    state.timedOut = true;
    // 带 reason abort，避免浏览器默认 “signal is aborted without reason” 噪音
    controller.abort(createLLMTimeoutAbortError(options.timeout));
  };
  const abortOnThinkingTimeout = (): void => {
    if (controller.signal.aborted) return;
    state.timedOut = true;
    // 纯推理流超预算：正文迟迟未出现（网关思考死循环/超大推理流），按超时归类
    controller.abort(createLLMTimeoutAbortError(options.timeout, 'reasoning'));
  };
  const abortFromExternalSignal = (): void => {
    if (controller.signal.aborted) return;
    state.externallyAborted = true;
    // 复用外部 signal 的 reason，错误消息保持友好（如“已停止生成”）
    controller.abort(options.signal ? getAbortError(options.signal) : new Error('Aborted'));
  };
  let timeoutId = setTimeout(abortOnTimeout, options.timeout);
  const clearTimeoutOnly = (): void => clearTimeout(timeoutId);
  const clearRequestTimeout = (): void => {
    clearTimeoutOnly();
    options.signal?.removeEventListener('abort', abortFromExternalSignal);
  };
  const resetRequestTimeout = (): void => {
    clearTimeoutOnly();
    if (!controller.signal.aborted) {
      timeoutId = setTimeout(abortOnTimeout, options.timeout);
    }
  };
  if (options.signal?.aborted) {
    abortFromExternalSignal();
  } else {
    options.signal?.addEventListener('abort', abortFromExternalSignal, { once: true });
  }

  // 推理阶段预算：纯推理流不重置全量超时（否则可无限思考），正文出现后清除；
  // 预算 = max(2×timeout, 120s)，给深度思考留出余量。
  const thinkingBudgetMs = Math.max(options.timeout * 2, 120_000);
  let thinkingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  const clearThinkingBudget = (): void => {
    if (thinkingTimeoutId !== null) {
      clearTimeout(thinkingTimeoutId);
      thinkingTimeoutId = null;
    }
  };
  const resetThinkingBudget = (): void => {
    clearThinkingBudget();
    if (controller.signal.aborted) return;
    thinkingTimeoutId = setTimeout(abortOnThinkingTimeout, thinkingBudgetMs);
  };

  return {
    controller,
    clearRequestTimeout,
    resetRequestTimeout,
    resetThinkingBudget,
    clearThinkingBudget,
  };
}

export async function fetchLLMResponse(
  context: LLMCallContext,
  controller: AbortController
): Promise<Response> {
  return fetch(context.requestUrl, {
    method: 'POST',
    headers: buildLLMRequestHeaders(context.apiPath, context.apiKey),
    body: JSON.stringify(context.requestBody),
    signal: controller.signal,
  });
}
