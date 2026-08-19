// src/services/llm/toolLoop.ts
// ================================================================
// 工具调用循环（tool loop）全链路（含上下文初始化与重试）
// 由 llmService.ts 拆分而来（Level 2 重构）
// ================================================================
import { ApiError, ValidationError } from '@/common/errors';

import { resolveLLMOptions } from './callContext';
import {
  executeLLMAttemptPayload,
  getLLMResponseContent,
  executeLLMAttempt,
  isAlternatePathUnsupportedError,
  resolveLLMAttemptFailure,
  createUnknownLLMFailure,
  isResponsesPathFallbackEligible,
} from './responseParsing';
import { isResponsesLikePayload } from './streamParsing';
import {
  assertSafeLLMEndpoint,
  createLLMTransport,
  normalizeMessagesForTransport,
  resolveProviderEndpoint,
} from '../llmTransport';
import {
  DEFAULT_MAX_TOOL_ROUNDS,
  appendChatToolRoundMessages,
  extractAssistantTextFromResponsesOrChat,
  extractChatToolCallsFromCompletion,
  extractResponsesFunctionCalls,
  extractResponsesId,
  buildModelToolSynthesisUserMessage,
  isResponsesInProgressEmpty,
  parseTextEmittedToolCalls,
  processResponsesToolRound,
  resolveModelCapability,
  synthesizeAnswerFromToolOutputs,
  textEmittedToChatToolCalls,
  textLooksLikeEmittedToolCalls,
  type ApiPathId,
  type ChatFunctionToolCall,
  type CollectedToolOutput,
  type ResponsesToolExecutor,
} from '../modelCapability';

import type { LLMAttemptState, LLMCallContext, LLMResponsePayload } from './callContext';
import type { ChatMessage, LLMCallArgs, LLMCallRequest, ResolvedLLMOptions } from '../llmTypes';

export { chatContentToPlainText } from '../llmTransport';
export { fetchModelsFromApi } from '../llmModelList';

export function normalizeLLMCallArgs(args: LLMCallArgs): LLMCallRequest {
  if (args.length === 1) {
    return { ...args[0], options: args[0].options || {} };
  }

  const [messages, provider, endpoint, apiKey, model, options = {}] = args;
  return { messages, provider, endpoint, apiKey, model, options };
}

// ========================
// 核心 API 函数
// ========================

function hasToolLoopPrerequisites(options: ResolvedLLMOptions): boolean {
  return (
    options.enableToolLoop === true &&
    typeof options.executeTool === 'function' &&
    Array.isArray(options.tools) &&
    options.tools.length > 0
  );
}

export function shouldUseResponsesToolLoop(options: ResolvedLLMOptions): boolean {
  return hasToolLoopPrerequisites(options) && options.apiPath === 'responses';
}

/** Official Chat Completions tools multi-round (messages + tool_calls). Native
 * Anthropic/Gemini paths reuse the same loop: their tool calls are normalized to
 * ChatFunctionToolCall and tool results are replayed as plain-text rounds. */
export function shouldUseChatToolLoop(options: ResolvedLLMOptions): boolean {
  const path = options.apiPath ?? 'chat_completions';
  return (
    hasToolLoopPrerequisites(options) &&
    (path === 'chat_completions' || path === 'anthropic_messages' || path === 'gemini_generate')
  );
}

/** Fail closed when enableToolLoop is set without executor/tools. */
export function assertToolLoopOptions(options: ResolvedLLMOptions): void {
  if (!options.enableToolLoop) {
    return;
  }
  if (typeof options.executeTool !== 'function') {
    throw new ValidationError(
      'enableToolLoop 需要提供 executeTool 回调。',
      'LLM_TOOL_LOOP_MISSING_EXECUTOR',
      'executeTool',
      undefined,
      { module: 'LLMService', action: 'callLLM' }
    );
  }
  if (!Array.isArray(options.tools) || options.tools.length === 0) {
    throw new ValidationError(
      'enableToolLoop 需要非空 tools 数组。',
      'LLM_TOOL_LOOP_MISSING_TOOLS',
      'tools',
      options.tools,
      { module: 'LLMService', action: 'callLLM' }
    );
  }
}

function buildToolLoopContext(
  request: LLMCallRequest,
  roundOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): LLMCallContext {
  const transport = createLLMTransport({
    messages: request.messages,
    model: request.model,
    options: roundOptions,
    provider: request.provider,
    endpoint: normalizedEndpoint,
    forcePath: 'responses',
  });
  return {
    provider: request.provider,
    endpoint: request.endpoint,
    normalizedEndpoint,
    apiKey: request.apiKey,
    model: request.model,
    messages: request.messages,
    options: roundOptions,
    requestBody: transport.body,
    requestUrl: transport.requestUrl,
    requestPath: transport.path,
    apiSurface: transport.apiSurface,
    apiPath: transport.apiPath,
  };
}

function resolveResponsesToolCapability(
  request: LLMCallRequest,
  options: ResolvedLLMOptions
): { supportsPreviousResponseId: boolean; supportsStore: boolean } {
  const cap = resolveModelCapability({
    provider: request.provider,
    modelId: request.model,
    modelsEntry: options.modelsEntry,
    preferredSurface: 'responses',
  });
  return {
    supportsPreviousResponseId: cap.supportsPreviousResponseId,
    supportsStore: cap.supportsStore,
  };
}

function synthesizeResponsesDataFromFunctionCalls(
  calls: import('../modelCapability').ResponsesFunctionCall[],
  responseId?: string
): Record<string, unknown> {
  return {
    ...(responseId ? { id: responseId } : {}),
    output: calls.map(c => ({
      type: 'function_call',
      call_id: c.callId,
      name: c.name,
      arguments: c.arguments,
      ...(c.itemId ? { id: c.itemId } : {}),
    })),
  };
}

async function processToolRoundFromPayload(args: {
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  raw: Record<string, unknown>;
  executeTool: ResponsesToolExecutor;
  previousResponseId?: string;
}): Promise<{
  lastText: string;
  done: boolean;
  previousResponseId?: string;
  followUpInputItems?: Array<Record<string, unknown>>;
}> {
  const cap = resolveResponsesToolCapability(args.request, args.baseOptions);
  const canUsePrevious =
    cap.supportsPreviousResponseId &&
    Boolean(args.previousResponseId || extractResponsesId(args.raw));
  const roundResult = await processResponsesToolRound({
    responseData: args.raw,
    executeTool: args.executeTool,
    useStatefulFollowUp: canUsePrevious,
  });
  let previousResponseId = args.previousResponseId;
  if (roundResult.responseId) {
    args.baseOptions.onResponseId?.(roundResult.responseId);
    previousResponseId = roundResult.responseId;
  }
  if (roundResult.done) {
    return {
      lastText: roundResult.text,
      done: true,
      previousResponseId: canUsePrevious ? previousResponseId : undefined,
    };
  }
  return {
    lastText: roundResult.text,
    done: false,
    // Only keep previous id when capability allows stateful follow-up.
    previousResponseId: canUsePrevious ? previousResponseId : undefined,
    followUpInputItems: roundResult.nextInputItems,
  };
}

function resolveToolRoundStoreFlag(args: {
  hasFollowUp: boolean;
  usePrevious: boolean;
  supportsStore: boolean;
  baseStore?: boolean;
}): boolean {
  if (!args.supportsStore) {
    return false;
  }
  if (args.hasFollowUp && args.usePrevious) {
    return true;
  }
  return args.baseStore === true;
}

function buildToolRoundOptions(
  baseOptions: ResolvedLLMOptions,
  args: {
    previousResponseId?: string;
    followUpInputItems?: Array<Record<string, unknown>>;
    usePrevious: boolean;
    supportsStore: boolean;
  }
): ResolvedLLMOptions {
  return {
    ...baseOptions,
    stream: false,
    previousResponseId: args.usePrevious ? args.previousResponseId : undefined,
    followUpInputItems: args.followUpInputItems,
    store: resolveToolRoundStoreFlag({
      hasFollowUp: Boolean(args.followUpInputItems?.length),
      usePrevious: args.usePrevious,
      supportsStore: args.supportsStore,
      baseStore: baseOptions.store,
    }),
  };
}

async function runOneResponsesToolRound(args: {
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  normalizedEndpoint: string;
  previousResponseId?: string;
  followUpInputItems?: Array<Record<string, unknown>>;
  executeTool: ResponsesToolExecutor;
}): Promise<{
  lastText: string;
  done: boolean;
  previousResponseId?: string;
  followUpInputItems?: Array<Record<string, unknown>>;
}> {
  const cap = resolveResponsesToolCapability(args.request, args.baseOptions);
  const usePrevious = cap.supportsPreviousResponseId && Boolean(args.previousResponseId?.trim());
  const roundOptions = buildToolRoundOptions(args.baseOptions, {
    previousResponseId: args.previousResponseId,
    followUpInputItems: args.followUpInputItems,
    usePrevious,
    supportsStore: cap.supportsStore,
  });
  const context = buildToolLoopContext(args.request, roundOptions, args.normalizedEndpoint);
  const payload = await executeLLMAttemptPayload(context, 0, {
    timedOut: false,
    externallyAborted: false,
  });
  const lastText = getLLMResponseContent(payload);
  const raw = payload.rawResponsesData;
  if (!raw) {
    return {
      lastText,
      done: true,
      previousResponseId: usePrevious ? args.previousResponseId : undefined,
    };
  }

  const roundResult = await processToolRoundFromPayload({
    request: args.request,
    baseOptions: args.baseOptions,
    raw,
    executeTool: args.executeTool,
    previousResponseId: extractResponsesId(raw) || args.previousResponseId,
  });
  return {
    lastText: roundResult.lastText || lastText,
    done: roundResult.done,
    previousResponseId: roundResult.previousResponseId,
    followUpInputItems: roundResult.followUpInputItems,
  };
}

/**
 * Responses agent tool loop: non-stream rounds until no function_call items.
 * Last round forces tool_choice=none; empty text synthesizes from tool outputs.
 */
/**
 * Enterprise finalization after tool rounds: model text → one synthesis hop → local fallback.
 * Synthesis never enables tools (TF-O4).
 */
async function tryModelSynthesizeFromToolOutputs(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string,
  collected: CollectedToolOutput[]
): Promise<string> {
  if (!collected.length) return '';
  const synthesisMessages: ChatMessage[] = [
    ...request.messages,
    { role: 'user', content: buildModelToolSynthesisUserMessage(collected) },
  ];
  const maxTokens = Math.max(
    typeof baseOptions.maxTokens === 'number' && Number.isFinite(baseOptions.maxTokens)
      ? Math.floor(baseOptions.maxTokens)
      : 0,
    2048
  );
  try {
    return (
      await callLLMWithRetry(
        { ...request, messages: synthesisMessages },
        {
          ...baseOptions,
          stream: false,
          enableToolLoop: false,
          tools: undefined,
          executeTool: undefined,
          toolChoice: undefined,
          maxToolRounds: undefined,
          previousResponseId: undefined,
          reasoningPrefs: { enabled: false, effort: 'medium' },
          reasoningSessionOverride: { enabled: false },
          maxTokens,
          retries: 0,
        },
        normalizedEndpoint
      )
    ).trim();
  } catch {
    return '';
  }
}

async function resolveToolLoopFinalAnswer(args: {
  lastText: string;
  collected: CollectedToolOutput[];
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  normalizedEndpoint: string;
}): Promise<string> {
  const trimmed = args.lastText.trim();
  if (trimmed) return trimmed;
  if (!args.collected.length) return '';
  const synthesized = await tryModelSynthesizeFromToolOutputs(
    args.request,
    args.baseOptions,
    args.normalizedEndpoint,
    args.collected
  );
  if (synthesized) return synthesized;
  return synthesizeAnswerFromToolOutputs(args.collected);
}

export async function callLLMResponsesToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const executeTool = baseOptions.executeTool;
  if (!executeTool) return '';

  const maxRounds = baseOptions.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  let previousResponseId = baseOptions.previousResponseId;
  let followUpInputItems: Array<Record<string, unknown>> | undefined;
  let lastText = '';
  const collected: CollectedToolOutput[] = [];

  for (let round = 0; round < maxRounds; round++) {
    const isLastRound = round >= maxRounds - 1;
    const result = await runOneResponsesToolRound({
      request,
      baseOptions: isLastRound
        ? { ...baseOptions, toolChoice: 'none', enableToolLoop: true }
        : baseOptions,
      normalizedEndpoint,
      previousResponseId,
      followUpInputItems,
      executeTool: async call => {
        const output = await executeTool(call);
        collected.push({
          name: call.name,
          callId: call.callId,
          output: String(output ?? ''),
        });
        return output;
      },
    });
    lastText = result.lastText;
    previousResponseId = result.previousResponseId;
    followUpInputItems = isLastRound ? undefined : result.followUpInputItems;
    if (result.done || isLastRound) {
      return resolveToolLoopFinalAnswer({
        lastText,
        collected,
        request,
        baseOptions,
        normalizedEndpoint,
      });
    }
  }

  return resolveToolLoopFinalAnswer({
    lastText,
    collected,
    request,
    baseOptions,
    normalizedEndpoint,
  });
}

/**
 * Continue tool loop after a first hop already returned function_call items
 * (stream-first hybrid or non-stream seed payload).
 */
function createTrackingToolExecutor(
  executeTool: ResponsesToolExecutor,
  collected: CollectedToolOutput[]
): ResponsesToolExecutor {
  return async call => {
    const output = await executeTool(call);
    collected.push({
      name: call.name,
      callId: call.callId,
      output: String(output ?? ''),
    });
    return output;
  };
}

async function runResponsesToolFollowUpRounds(args: {
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  normalizedEndpoint: string;
  previousResponseId: string | undefined;
  followUpInputItems: Array<Record<string, unknown>> | undefined;
  lastText: string;
  maxRounds: number;
  trackingExecutor: ResponsesToolExecutor;
  collected: CollectedToolOutput[];
}): Promise<string> {
  let { previousResponseId, followUpInputItems, lastText } = args;
  for (let round = 1; round < args.maxRounds; round++) {
    const isLastRound = round >= args.maxRounds - 1;
    const result = await runOneResponsesToolRound({
      request: args.request,
      baseOptions: {
        ...args.baseOptions,
        stream: false,
        enableToolLoop: true,
        ...(isLastRound ? { toolChoice: 'none' as const } : {}),
      },
      normalizedEndpoint: args.normalizedEndpoint,
      previousResponseId,
      followUpInputItems,
      executeTool: args.trackingExecutor,
    });
    lastText = result.lastText || lastText;
    previousResponseId = result.previousResponseId;
    followUpInputItems = isLastRound ? undefined : result.followUpInputItems;
    if (result.done || isLastRound) {
      return resolveToolLoopFinalAnswer({
        lastText,
        collected: args.collected,
        request: args.request,
        baseOptions: args.baseOptions,
        normalizedEndpoint: args.normalizedEndpoint,
      });
    }
  }
  return resolveToolLoopFinalAnswer({
    lastText,
    collected: args.collected,
    request: args.request,
    baseOptions: args.baseOptions,
    normalizedEndpoint: args.normalizedEndpoint,
  });
}

async function continueResponsesToolLoopFromRaw(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string,
  raw: Record<string, unknown>
): Promise<string> {
  const executeTool = baseOptions.executeTool;
  if (!executeTool) {
    return extractAssistantTextFromResponsesOrChat(raw);
  }

  if (isResponsesInProgressEmpty(raw)) {
    // deepseek-style stuck body: fall back to plain (no tools) stream once.
    return callLLMWithRetry(
      request,
      {
        ...baseOptions,
        stream: true,
        enableToolLoop: false,
        tools: undefined,
        executeTool: undefined,
        toolChoice: undefined,
      },
      normalizedEndpoint
    );
  }

  const maxRounds = baseOptions.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  let previousResponseId = extractResponsesId(raw) || baseOptions.previousResponseId;
  let followUpInputItems: Array<Record<string, unknown>> | undefined;
  let lastText = extractAssistantTextFromResponsesOrChat(raw);
  const collected: CollectedToolOutput[] = [];
  const trackingExecutor = createTrackingToolExecutor(executeTool, collected);

  const first = await processToolRoundFromPayload({
    request,
    baseOptions,
    raw,
    executeTool: trackingExecutor,
    previousResponseId,
  });
  if (first.done) {
    return resolveToolLoopFinalAnswer({
      lastText: first.lastText || lastText,
      collected,
      request,
      baseOptions,
      normalizedEndpoint,
    });
  }
  previousResponseId = first.previousResponseId;
  followUpInputItems = first.followUpInputItems;
  lastText = first.lastText || lastText;

  return runResponsesToolFollowUpRounds({
    request,
    baseOptions,
    normalizedEndpoint,
    previousResponseId,
    followUpInputItems,
    lastText,
    maxRounds,
    trackingExecutor,
    collected,
  });
}

function resolveRawFromStreamFirstPayload(
  payload: LLMResponsePayload
): Record<string, unknown> | undefined {
  if (payload.rawResponsesData) {
    return payload.rawResponsesData;
  }
  if (payload.streamFunctionCalls?.length) {
    return synthesizeResponsesDataFromFunctionCalls(payload.streamFunctionCalls);
  }
  const data = payload.data as unknown as Record<string, unknown> | null;
  if (data && isResponsesLikePayload(data)) {
    return data;
  }
  return undefined;
}

function resolveFunctionCallsFromStreamFirstPayload(
  payload: LLMResponsePayload,
  raw: Record<string, unknown> | undefined
): import('../modelCapability').ResponsesFunctionCall[] {
  if (payload.streamFunctionCalls?.length) {
    return payload.streamFunctionCalls;
  }
  return raw ? extractResponsesFunctionCalls(raw) : [];
}

/**
 * Stream-first tool path: keep reasoning/text SSE for Deep Chat UX; if the model
 * only emitted function_call items (empty assistant text), continue tool loop
 * from the first payload (or cold-start non-stream loop when nothing was captured).
 * Also recovers when models dump tool calls as plain text (XML / JSON arrays).
 */
function plainStreamNoToolsOptions(baseOptions: ResolvedLLMOptions): ResolvedLLMOptions {
  return {
    ...baseOptions,
    stream: true,
    enableToolLoop: false,
    tools: undefined,
    executeTool: undefined,
    toolChoice: undefined,
  };
}

async function tryRecoverResponsesTextTools(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  toolOptions: ResolvedLLMOptions,
  normalizedEndpoint: string,
  streamed: string
): Promise<string | null> {
  if (!baseOptions.executeTool || !textLooksLikeEmittedToolCalls(streamed)) return null;
  return recoverResponsesFromTextToolCalls(request, toolOptions, normalizedEndpoint, streamed);
}

function textFromStreamOrRaw(streamed: string, raw: Record<string, unknown> | undefined): string {
  if (streamed.trim()) return streamed;
  // Terminal SSE payload may carry output_text without per-token deltas or tool calls.
  if (!raw) return '';
  return extractAssistantTextFromResponsesOrChat(raw).trim();
}

async function resolveStreamFirstResponsesResult(args: {
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  toolOptions: ResolvedLLMOptions;
  normalizedEndpoint: string;
  streamed: string;
  raw: Record<string, unknown> | undefined;
  functionCalls: import('../modelCapability').ResponsesFunctionCall[];
}): Promise<string> {
  const { request, baseOptions, toolOptions, normalizedEndpoint, streamed, raw, functionCalls } =
    args;

  if (raw && isResponsesInProgressEmpty(raw)) {
    // Tools unsupported / stuck gateway: plain completion without tools.
    return callLLMWithRetry(request, plainStreamNoToolsOptions(baseOptions), normalizedEndpoint);
  }

  if (raw && functionCalls.length > 0) {
    return continueResponsesToolLoopFromRaw(request, toolOptions, normalizedEndpoint, raw);
  }

  // Text-as-tool recovery (responses): model wrote <tool_call> / JSON tools as content.
  const recovered = await tryRecoverResponsesTextTools(
    request,
    baseOptions,
    toolOptions,
    normalizedEndpoint,
    streamed
  );
  if (recovered !== null) return recovered;

  const text = textFromStreamOrRaw(streamed, raw);
  if (text) return text;
  return callLLMResponsesToolLoop(request, toolOptions, normalizedEndpoint);
}

export async function callLLMStreamFirstThenToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const streamOptions: ResolvedLLMOptions = {
    ...baseOptions,
    stream: true,
    enableToolLoop: false,
  };
  const firstAttemptState: LLMAttemptState = {
    timedOut: false,
    externallyAborted: false,
  };
  const context = createInitialLLMContext(request, streamOptions, normalizedEndpoint);
  let firstPayload: LLMResponsePayload;
  try {
    firstPayload = await executeLLMAttemptPayload(context, 0, firstAttemptState);
  } catch (errorValue) {
    if (!isResponsesPathFallbackEligible(errorValue, context)) {
      throw errorValue;
    }
    // responses 不可用（404/400 unsupported）→ 平级切 chat tool loop：tools/executeTool
    // 保留（chat 机器原生处理 tool_calls），store 剥离（chat 无链式语义）。
    // 只包首请求：tool loop 中途轮次错误原样抛出，避免已执行工具轮次被重放。
    try {
      return await callLLMChatStreamFirstThenToolLoop(
        request,
        { ...streamOptions, apiPath: 'chat_completions', store: undefined },
        normalizedEndpoint
      );
    } catch (fallbackError) {
      const detail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      if (fallbackError instanceof ApiError) {
        throw new ApiError(
          `已尝试从 /responses 回落 Chat Completions 仍失败：${detail}`,
          fallbackError.code,
          fallbackError.statusCode,
          fallbackError.response,
          { ...fallbackError.context, fallbackFrom: 'responses' },
          fallbackError
        );
      }
      const wrapped = new Error(`已尝试从 /responses 回落 Chat Completions 仍失败：${detail}`);
      if (fallbackError instanceof Error) {
        wrapped.name = fallbackError.name;
      }
      throw wrapped;
    }
  }
  const streamed = getLLMResponseContent(firstPayload);
  const raw = resolveRawFromStreamFirstPayload(firstPayload);
  const functionCalls = resolveFunctionCallsFromStreamFirstPayload(firstPayload, raw);
  const toolOptions: ResolvedLLMOptions = {
    ...baseOptions,
    stream: false,
    enableToolLoop: true,
  };

  return resolveStreamFirstResponsesResult({
    request,
    baseOptions,
    toolOptions,
    normalizedEndpoint,
    streamed,
    raw,
    functionCalls,
  });
}

/**
 * When the model dumps tool calls as assistant text, synthesize function_call
 * items and continue the Responses tool loop (stateless replay).
 */
async function recoverResponsesFromTextToolCalls(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string,
  streamed: string
): Promise<string | null> {
  if (!baseOptions.executeTool) return null;
  const textCalls = parseTextEmittedToolCalls(streamed);
  if (!textCalls.length) return null;

  const raw: Record<string, unknown> = {
    output: textCalls.map((c, i) => ({
      type: 'function_call',
      call_id: `text_call_${i + 1}`,
      name: c.name,
      arguments: c.arguments || '{}',
    })),
  };
  return continueResponsesToolLoopFromRaw(request, baseOptions, normalizedEndpoint, raw);
}

/**
 * Chat Completions tool loop: messages → tool_calls → role=tool → next round.
 * Last round forces tool_choice=none so models cannot infinite-loop tools.
 * Empty final text falls back to synthesized tool-result summary.
 */
async function executeChatToolCalls(
  toolCalls: ChatFunctionToolCall[],
  executeTool: ResponsesToolExecutor,
  collected: CollectedToolOutput[]
): Promise<Array<{ callId: string; output: string }>> {
  const results: Array<{ callId: string; output: string }> = [];
  for (const call of toolCalls) {
    try {
      const output = await executeTool({
        name: call.function.name,
        arguments: call.function.arguments,
        callId: call.id,
      });
      const out = String(output ?? '');
      results.push({ callId: call.id, output: out });
      collected.push({ name: call.function.name, callId: call.id, output: out });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const out = JSON.stringify({ error: message });
      results.push({ callId: call.id, output: out });
      collected.push({ name: call.function.name, callId: call.id, output: out });
    }
  }
  return results;
}

function resolveChatToolCallsFromPayload(
  payload: LLMResponsePayload,
  isLastRound: boolean
): ChatFunctionToolCall[] {
  if (isLastRound) return [];
  if (payload.chatToolCalls?.length) return payload.chatToolCalls;
  return extractChatToolCallsFromCompletion(
    payload.data as unknown as Record<string, unknown> | null
  );
}

export async function callLLMChatToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const executeTool = baseOptions.executeTool;
  if (!executeTool) return '';

  const maxRounds = baseOptions.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  let messages: ChatMessage[] = [...request.messages];
  let lastText = '';
  const collected: CollectedToolOutput[] = [];

  for (let round = 0; round < maxRounds; round++) {
    const isLastRound = round >= maxRounds - 1;
    const roundOptions: ResolvedLLMOptions = {
      ...baseOptions,
      stream: false,
      enableToolLoop: false,
      // Force a visible answer instead of endless tool_calls.
      ...(isLastRound ? { toolChoice: 'none' as const, tools: baseOptions.tools } : {}),
    };
    const roundRequest: LLMCallRequest = { ...request, messages, options: roundOptions };
    const context = createInitialLLMContext(roundRequest, roundOptions, normalizedEndpoint);
    const payload = await executeLLMAttemptPayload(context, 0, {
      timedOut: false,
      externallyAborted: false,
    });
    lastText = getLLMResponseContent(payload);
    const toolCalls = resolveChatToolCallsFromPayload(payload, isLastRound);
    if (!toolCalls.length) {
      return resolveToolLoopFinalAnswer({
        lastText,
        collected,
        request,
        baseOptions,
        normalizedEndpoint,
      });
    }

    const results = await executeChatToolCalls(toolCalls, executeTool, collected);
    const transportMessages = normalizeMessagesForTransport(messages, 'chat_completions');
    const nextRecords = appendChatToolRoundMessages(transportMessages, toolCalls, results);
    messages = nextRecords as unknown as ChatMessage[];
  }

  return resolveToolLoopFinalAnswer({
    lastText,
    collected,
    request,
    baseOptions,
    normalizedEndpoint,
  });
}

/**
 * Stream-first chat hop: if tool_calls appear, continue non-stream tool loop.
 * Also recovers text-emitted tool dumps (JSON / XML) when native tool_calls are empty.
 */
export async function callLLMChatStreamFirstThenToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const streamOptions: ResolvedLLMOptions = {
    ...baseOptions,
    stream: true,
    enableToolLoop: false,
  };
  const context = createInitialLLMContext(request, streamOptions, normalizedEndpoint);
  const firstPayload = await executeLLMAttemptPayload(context, 0, {
    timedOut: false,
    externallyAborted: false,
  });
  const streamed = getLLMResponseContent(firstPayload);
  let toolCalls = firstPayload.chatToolCalls?.length
    ? firstPayload.chatToolCalls
    : extractChatToolCallsFromCompletion(
        firstPayload.data as unknown as Record<string, unknown> | null
      );

  // Text-as-tool recovery: models sometimes dump tool JSON/XML as content.
  if (!toolCalls.length && baseOptions.executeTool && textLooksLikeEmittedToolCalls(streamed)) {
    toolCalls = textEmittedToChatToolCalls(parseTextEmittedToolCalls(streamed));
  }

  if (toolCalls.length === 0) return streamed;

  // Seed assistant tool_calls into messages then run remaining non-stream rounds.
  const executeTool = baseOptions.executeTool;
  if (!executeTool) return streamed;

  const seedCollected: CollectedToolOutput[] = [];
  const results = await executeChatToolCalls(toolCalls, executeTool, seedCollected);
  const transportMessages = normalizeMessagesForTransport(request.messages, 'chat_completions');
  const nextMessages = appendChatToolRoundMessages(
    transportMessages,
    toolCalls,
    results
  ) as unknown as ChatMessage[];
  const finalText = await callLLMChatToolLoop(
    { ...request, messages: nextMessages },
    { ...baseOptions, stream: false, enableToolLoop: true },
    normalizedEndpoint
  );
  // callLLMChatToolLoop already runs resolveToolLoopFinalAnswer; re-run only if empty
  // but seedCollected may hold first-hop tools not passed into nested loop.
  const nested = finalText.trim();
  if (nested) return nested;
  return resolveToolLoopFinalAnswer({
    lastText: '',
    collected: seedCollected,
    request: { ...request, messages: nextMessages },
    baseOptions: { ...baseOptions, stream: false, enableToolLoop: false },
    normalizedEndpoint,
  });
}

/**
 * 通用大语言模型调用接口 (带自动重试)
 */
export async function callLLM(...args: LLMCallArgs): Promise<string> {
  const request = normalizeLLMCallArgs(args);
  const resolvedOptions = resolveLLMOptions(request.options || {}, request.provider, request.model);
  const normalizedEndpoint = resolveProviderEndpoint(request.provider, request.endpoint);
  assertSafeLLMEndpoint(normalizedEndpoint);
  assertToolLoopOptions(resolvedOptions);

  if (shouldUseResponsesToolLoop(resolvedOptions)) {
    // Stream-first preserves 深度思考 / 已完成 chrome; tool loop only when needed.
    if (resolvedOptions.stream) {
      return callLLMStreamFirstThenToolLoop(request, resolvedOptions, normalizedEndpoint);
    }
    return callLLMResponsesToolLoop(request, resolvedOptions, normalizedEndpoint);
  }

  if (shouldUseChatToolLoop(resolvedOptions)) {
    if (resolvedOptions.stream) {
      return callLLMChatStreamFirstThenToolLoop(request, resolvedOptions, normalizedEndpoint);
    }
    return callLLMChatToolLoop(request, resolvedOptions, normalizedEndpoint);
  }

  return callLLMWithRetry(request, resolvedOptions, normalizedEndpoint);
}

export function createInitialLLMContext(
  request: LLMCallRequest,
  resolvedOptions: ResolvedLLMOptions,
  normalizedEndpoint: string,
  forcePath?: ApiPathId
): LLMCallContext {
  const transport = createLLMTransport({
    messages: request.messages,
    model: request.model,
    options: resolvedOptions,
    provider: request.provider,
    endpoint: normalizedEndpoint,
    forcePath,
  });
  return {
    provider: request.provider,
    endpoint: request.endpoint,
    normalizedEndpoint,
    apiKey: request.apiKey,
    model: request.model,
    messages: request.messages,
    options: resolvedOptions,
    requestBody: transport.body,
    requestUrl: transport.requestUrl,
    requestPath: transport.path,
    apiSurface: transport.apiSurface,
    apiPath: transport.apiPath,
  };
}

export async function callLLMWithRetry(
  request: LLMCallRequest,
  resolvedOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  let context = createInitialLLMContext(request, resolvedOptions, normalizedEndpoint);
  let lastError: Error | null = null;
  let triedPathFallback = false;

  for (let attempt = 0; attempt <= resolvedOptions.retries; attempt++) {
    const attemptState: LLMAttemptState = {
      timedOut: false,
      externallyAborted: false,
    };
    try {
      return await executeLLMAttempt(context, attempt, attemptState);
    } catch (errorValue) {
      if (
        !triedPathFallback &&
        context.apiPath !== 'chat_completions' &&
        errorValue instanceof ApiError &&
        isAlternatePathUnsupportedError(errorValue)
      ) {
        triedPathFallback = true;
        context = createInitialLLMContext(
          request,
          resolvedOptions,
          normalizedEndpoint,
          'chat_completions'
        );
        attempt -= 1;
        continue;
      }

      const failure = resolveLLMAttemptFailure(errorValue, context, attempt, attemptState);
      if (!failure.shouldRetry) {
        throw failure.error;
      }
      lastError = failure.error;
    }
  }

  throw lastError || createUnknownLLMFailure(context);
}
