// src/services/llm/streamParsing.ts
// ================================================================
// 流处理与解析：侧信道收集、工具调用提取、结果构建
// 由 llmService.ts 拆分而来（Level 2 重构）
// ================================================================
import { ApiError } from '@/common/errors';

// 导入统一的 API 响应类型
// 导入类型守卫
import {
  assertStreamPayloadIsOk,
  getChatCompletionsStreamDelta,
  getReasoningStreamDelta,
  getStreamData,
  getStreamDelta,
  parseBufferedJsonCompletion,
  parseStreamPayload,
} from '../llmStreamDelta';
import { chatContentToPlainText } from '../llmTransport';
import {
  extractAnthropicMessagesText,
  extractAnthropicToolUses,
  extractAnthropicUsage,
  extractGeminiFunctionCalls,
  extractGeminiGenerateText,
  extractGeminiUsage,
  extractAssistantTextFromResponsesOrChat,
  extractChatStreamToolCallDeltas,
  extractChatToolCallsFromCompletion,
  extractResponsesFunctionCalls,
  extractResponsesId,
  extractResponsesIdFromStreamEvent,
  extractResponsesReasoningSummary,
  getAnthropicStreamInputJsonDelta,
  getAnthropicStreamToolUseStart,
  getResponsesFailureFromEvent,
  getResponsesRefusalDelta,
  getResponsesStreamTextDeltaDeduped,
  harvestResponsesReasoningIncrement,
  isResponsesTerminalEvent,
  mergeChatStreamToolCallDeltas,
  type ApiSurface,
  type AnthropicToolUse,
  type ChatFunctionToolCall,
  type GeminiFunctionCall,
} from '../modelCapability';

import type {
  ChatContentPart,
  LLMOptions,
  OpenAIStreamLineContext,
  OpenAIStreamOptions,
  OpenAIStreamReadResult,
  OpenAIStreamState,
} from '../llmTypes';
import type { LLMChatCompletionResponse } from '@/types/api';

export { chatContentToPlainText } from '../llmTransport';
export { fetchModelsFromApi } from '../llmModelList';

export function getAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error && signal.reason.name === 'AbortError') {
    return signal.reason;
  }

  const error = new Error(signal.reason instanceof Error ? signal.reason.message : 'Aborted');
  error.name = 'AbortError';
  return error;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  if (signal.aborted) {
    return Promise.reject(getAbortError(signal));
  }

  return new Promise((resolve, reject) => {
    const handleAbort = (): void => {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', handleAbort);
      reject(getAbortError(signal));
    };
    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

/** Notify Deep Chat (etc.) of reasoning summary from a completed non-stream Responses body. */
export function emitResponsesReasoningFromPayload(
  data: Record<string, unknown>,
  onStreamUpdate: LLMOptions['onStreamUpdate'],
  requestStartedAt: number
): void {
  if (!onStreamUpdate) return;
  const reasoning = extractResponsesReasoningSummary(data);
  if (!reasoning.trim()) return;
  onStreamUpdate({
    delta: '',
    content: '',
    reasoningDelta: reasoning,
    reasoningContent: reasoning,
    elapsedMs: Date.now() - requestStartedAt,
    chunkCount: 0,
  });
}

/**
 * Primary-text policy: always use choices[0] for callLLM string return.
 * When n>1, remaining choices are available only via onCompletion payload.
 */
export function getCompletionContent(
  completion: LLMChatCompletionResponse | null,
  defaultContent = ''
): string {
  const raw = completion?.choices?.[0]?.message?.content;
  if (raw == null) {
    return defaultContent;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  // Content parts array (official multimodal shape)
  if (Array.isArray(raw)) {
    return chatContentToPlainText(raw as ChatContentPart[]);
  }
  return defaultContent;
}

function notifyFirstStreamChunk(context: OpenAIStreamLineContext): void {
  if (context.state.firstChunkMs !== undefined) {
    return;
  }

  context.state.firstChunkMs = Date.now() - context.requestStartedAt;
  context.options.onFirstResponse?.({
    elapsedMs: context.state.firstChunkMs,
    firstChunkMs: context.state.firstChunkMs,
    chunkCount: context.state.chunkCount,
  });
}

function reportResponsesStreamIdOnce(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'responses' || context.state.responseIdReported) {
    return;
  }
  const responseId =
    extractResponsesIdFromStreamEvent(payload) ||
    extractResponsesId(payload.response as Record<string, unknown> | undefined);
  if (!responseId) {
    return;
  }
  context.state.responseIdReported = true;
  context.options.onResponseId?.(responseId);
}

function processOpenAIStreamLine(line: string, context: OpenAIStreamLineContext): void {
  const data = getStreamData(line);
  if (!data) {
    return;
  }

  context.state.chunkCount++;
  notifyFirstStreamChunk(context);

  const payload = parseStreamPayload(data);
  if (!payload) {
    return;
  }

  assertStreamPayloadIsOk(payload, data, context.response);
  assertResponsesStreamNotFailed(payload, data, context);
  reportResponsesStreamIdOnce(payload, context);
  harvestResponsesStreamSideChannels(payload, context);
  harvestChatStreamToolCalls(payload, context);
  harvestAnthropicStreamSideChannels(payload, context);
  harvestGeminiStreamSideChannels(payload, context);
  harvestStreamUsage(payload, context);

  const delta = resolveStreamTextDelta(payload, context);
  const reasoningDelta = resolveStreamReasoningDelta(payload, context);
  if (!delta && !reasoningDelta) {
    return;
  }

  emitOpenAIStreamUpdate(context, delta, reasoningDelta);
}

/** Responses SSE terminal failures (response.failed / response.incomplete) → ApiError. */
function assertResponsesStreamNotFailed(
  payload: Record<string, unknown>,
  data: string,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'responses') return;
  const eventType = typeof payload.type === 'string' ? payload.type : '';
  if (!eventType) return;
  const failure = getResponsesFailureFromEvent(eventType, payload);
  if (!failure) return;
  throw new ApiError(failure.message, 'API_STREAM_ERROR', context.response.status, data, {
    module: 'LLMService',
    action: 'readOpenAIStream',
    ...(failure.code ? { errorCode: failure.code } : {}),
  });
}

/** Refusal deltas double as visible text so the user sees the refusal reason. */
function resolveStreamTextDelta(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): string {
  if (context.apiSurface === 'responses') {
    // 带去重：done 事件的完整文本不与 delta 重复拼接（部分网关两者都发）
    return (
      getResponsesStreamTextDeltaDeduped(payload, context.state.responsesTextSeenItems) ||
      getChatCompletionsStreamDelta(payload)
    );
  }
  const delta = getStreamDelta(payload, context.apiSurface);
  if (delta) return delta;
  const eventType = typeof payload.type === 'string' ? payload.type : '';
  if (eventType !== 'response.refusal.delta') return '';
  return getResponsesRefusalDelta(eventType, payload) ?? '';
}

/** Anthropic SSE: usage (message_start/message_delta) + tool_use input accumulation. */
function harvestAnthropicStreamSideChannels(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'anthropic_messages') return;
  const state = context.state;

  const usage = extractAnthropicUsage(payload);
  if (usage) {
    if (payload.type === 'message_start') {
      state.anthropicPromptTokens = usage.prompt_tokens;
    }
    const prompt = Math.max(usage.prompt_tokens, state.anthropicPromptTokens ?? 0);
    state.usage = {
      prompt_tokens: prompt,
      completion_tokens: usage.completion_tokens,
      total_tokens: prompt + usage.completion_tokens,
    };
    context.options.onUsage?.(state.usage);
  }

  const toolStart = getAnthropicStreamToolUseStart(payload);
  if (toolStart) {
    state.anthropicToolUses ??= new Map();
    state.anthropicToolUses.set(toolStart.index, {
      id: toolStart.id,
      name: toolStart.name,
      json: '',
    });
    return;
  }
  const jsonDelta = getAnthropicStreamInputJsonDelta(payload);
  if (jsonDelta) {
    const entry = state.anthropicToolUses?.get(jsonDelta.index);
    if (entry) entry.json += jsonDelta.partialJson;
  }
}

/** Gemini SSE chunks share the generateContent shape: harvest usage + functionCalls. */
function harvestGeminiStreamSideChannels(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'gemini_generate') return;
  const usage = extractGeminiUsage(payload);
  if (usage) {
    context.state.usage = { ...usage };
    context.options.onUsage?.(context.state.usage);
  }
  const calls = extractGeminiFunctionCalls(payload);
  if (calls.length > 0) {
    context.state.geminiToolCalls = [
      ...(context.state.geminiToolCalls ?? []),
      ...geminiFunctionCallsToChatToolCalls(calls, context.state.geminiToolCalls?.length ?? 0),
    ];
  }
}

export function geminiFunctionCallsToChatToolCalls(
  calls: GeminiFunctionCall[],
  startIndex: number
): ChatFunctionToolCall[] {
  return calls.map((call, i) => ({
    id: `gemini_call_${startIndex + i + 1}`,
    type: 'function' as const,
    function: { name: call.name, arguments: JSON.stringify(call.args) },
  }));
}

export function anthropicToolUsesToChatToolCalls(
  toolUses: AnthropicToolUse[]
): ChatFunctionToolCall[] {
  return toolUses.map(use => ({
    id: use.id,
    type: 'function' as const,
    function: { name: use.name, arguments: JSON.stringify(use.input) },
  }));
}

function anthropicStreamToolUsesToChatToolCalls(
  map: Map<number, { id: string; name: string; json: string }> | undefined
): ChatFunctionToolCall[] {
  if (!map?.size) return [];
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, entry]) => ({
      id: entry.id,
      type: 'function' as const,
      function: { name: entry.name, arguments: entry.json || '{}' },
    }));
}

function harvestStreamUsage(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  // Anthropic / Gemini usage is normalized + reported in their surface harvesters.
  if (context.apiSurface === 'anthropic_messages' || context.apiSurface === 'gemini_generate') {
    return;
  }
  const usage = payload.usage;
  if (!usage || typeof usage !== 'object') return;
  context.state.usage = usage as Record<string, unknown>;
  context.options.onUsage?.(context.state.usage);
}

function harvestChatStreamToolCalls(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'chat_completions') return;
  const deltas = extractChatStreamToolCallDeltas(payload);
  if (deltas.length === 0) return;
  context.state.chatToolCalls = mergeChatStreamToolCallDeltas(context.state.chatToolCalls, deltas);
}

function collectStreamFunctionCalls(
  payload: Record<string, unknown>
): import('../modelCapability').ResponsesFunctionCall[] {
  const fromPayload = extractResponsesFunctionCalls(payload);
  const fromNested =
    payload.response && typeof payload.response === 'object'
      ? extractResponsesFunctionCalls(payload.response as Record<string, unknown>)
      : [];
  const item = payload.item;
  const fromItem =
    item && typeof item === 'object' ? extractResponsesFunctionCalls({ output: [item] }) : [];
  return [...fromPayload, ...fromNested, ...fromItem];
}

function mergeStreamFunctionCalls(
  existing: import('../modelCapability').ResponsesFunctionCall[] | undefined,
  incoming: import('../modelCapability').ResponsesFunctionCall[]
): import('../modelCapability').ResponsesFunctionCall[] | undefined {
  if (incoming.length === 0) return existing;
  const next = existing ? [...existing] : [];
  const seen = new Set(next.map(c => c.callId));
  for (const call of incoming) {
    if (!seen.has(call.callId)) {
      next.push(call);
      seen.add(call.callId);
    }
  }
  return next;
}

/** Capture completed Responses payload + function_call items for post-stream tool loop. */
function harvestResponsesStreamSideChannels(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'responses') return;

  if (isResponsesTerminalEvent(payload)) {
    const nested = payload.response;
    context.state.lastResponsesPayload =
      nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : payload;
  }

  context.state.functionCalls = mergeStreamFunctionCalls(
    context.state.functionCalls,
    collectStreamFunctionCalls(payload)
  );
}

function resolveStreamReasoningDelta(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): string {
  const direct = getReasoningStreamDelta(payload, context.apiSurface);
  if (direct) return direct;
  // Many gateways only attach summary on completed / output_item events.
  if (context.apiSurface !== 'responses') return '';
  return harvestResponsesReasoningIncrement(payload, context.state.reasoningContent);
}

function emitOpenAIStreamUpdate(
  context: OpenAIStreamLineContext,
  delta: string,
  reasoningDelta: string
): void {
  if (delta) {
    context.state.content += delta;
  }
  if (reasoningDelta) {
    context.state.reasoningContent += reasoningDelta;
  }
  context.options.onStreamUpdate?.({
    delta,
    content: context.state.content,
    ...(reasoningDelta
      ? {
          reasoningDelta,
          reasoningContent: context.state.reasoningContent,
        }
      : context.state.reasoningContent
        ? { reasoningContent: context.state.reasoningContent }
        : {}),
    elapsedMs: Date.now() - context.requestStartedAt,
    firstChunkMs: context.state.firstChunkMs,
    chunkCount: context.state.chunkCount,
  });
}

async function readBufferedOpenAIResponse(response: Response): Promise<OpenAIStreamReadResult> {
  const rawText = await response.text();
  const fallbackJson = parseBufferedJsonCompletion(rawText);
  return {
    content: getCompletionContent(fallbackJson, rawText),
    fallbackJson,
    chunkCount: 0,
  };
}

function processStreamText(text: string, buffer: string, context: OpenAIStreamLineContext): string {
  const lines = `${buffer}${text}`.split(/\r?\n/);
  const nextBuffer = lines.pop() || '';

  for (const line of lines) {
    processOpenAIStreamLine(line, context);
  }

  return nextBuffer;
}

function processRemainingStreamBuffer(buffer: string, context: OpenAIStreamLineContext): void {
  if (!buffer.trim()) {
    return;
  }

  for (const line of buffer.split(/\r?\n/)) {
    processOpenAIStreamLine(line, context);
  }
}

async function readOpenAIStreamBody(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: OpenAIStreamLineContext
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const decoded = decoder.decode(value, { stream: true });
    rawText += decoded;
    // 先解析再上报活动：区分「纯推理」与「正文进展」，供超时策略决策
    const contentBefore = context.state.content.length;
    buffer = processStreamText(decoded, buffer, context);
    context.options.onStreamActivity?.({
      reasoningOnly: context.state.content.length === contentBefore,
      contentChars: context.state.content.length,
    });
  }

  const tail = decoder.decode();
  if (tail) {
    rawText += tail;
    buffer = processStreamText(tail, buffer, context);
  }

  processRemainingStreamBuffer(buffer, context);
  return rawText;
}

export function isResponsesLikePayload(data: Record<string, unknown> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.object === 'response') return true;
  if (typeof data.output_text === 'string') return true;
  if (Array.isArray(data.output)) return true;
  return false;
}

/** Gateways sometimes ignore stream:true and return a full Responses JSON body. */
function tryBufferedResponsesStreamResult(
  state: OpenAIStreamState,
  fallbackRecord: Record<string, unknown> | null,
  apiSurface: ApiSurface
): OpenAIStreamReadResult | null {
  if (apiSurface !== 'responses' || state.content || !fallbackRecord) {
    return null;
  }
  if (!isResponsesLikePayload(fallbackRecord)) {
    return null;
  }

  const content = extractAssistantTextFromResponsesOrChat(fallbackRecord);
  const functionCalls = mergeStreamFunctionCalls(
    state.functionCalls,
    extractResponsesFunctionCalls(fallbackRecord)
  );
  const responseId = extractResponsesId(fallbackRecord);
  if (responseId && !state.responseIdReported) {
    state.responseIdReported = true;
  }
  return {
    content,
    // Do not feed Responses JSON into Chat Completions validators.
    fallbackJson: null,
    firstChunkMs: state.firstChunkMs,
    chunkCount: state.chunkCount,
    lastResponsesPayload: state.lastResponsesPayload ?? fallbackRecord,
    functionCalls,
    reasoningContent: state.reasoningContent,
  };
}

/**
 * Prefer streamed deltas; fall back to terminal payload when gateways only put
 * final message text on response.completed (no output_text.delta), or when the
 * body is chat/completions-shaped on a /responses URL.
 */
function resolveStreamResultContent(
  state: OpenAIStreamState,
  fallbackJson: LLMChatCompletionResponse | null,
  apiSurface: ApiSurface
): string {
  const fromStream = state.content || getCompletionContent(fallbackJson);
  if (fromStream.trim()) return fromStream;
  if (apiSurface !== 'responses') return fromStream;
  if (state.lastResponsesPayload) {
    const fromTerminal = extractAssistantTextFromResponsesOrChat(state.lastResponsesPayload);
    if (fromTerminal.trim()) return fromTerminal;
  }
  return fromStream;
}

function createOpenAIStreamResult(
  state: OpenAIStreamState,
  rawText: string,
  apiSurface: ApiSurface
): OpenAIStreamReadResult {
  const fallbackJson = state.content ? null : parseBufferedJsonCompletion(rawText);
  const fallbackRecord = fallbackJson as unknown as Record<string, unknown> | null;

  const bufferedResponses = tryBufferedResponsesStreamResult(state, fallbackRecord, apiSurface);
  if (bufferedResponses) {
    return bufferedResponses;
  }

  const bufferedNative = tryBufferedNativeStreamResult(state, fallbackRecord, apiSurface);
  if (bufferedNative) {
    return bufferedNative;
  }

  // Prefer streamed tool_calls; fall back to non-stream shaped buffered JSON.
  let chatToolCalls = state.chatToolCalls;
  if (apiSurface === 'anthropic_messages') {
    chatToolCalls = anthropicStreamToolUsesToChatToolCalls(state.anthropicToolUses);
  } else if (apiSurface === 'gemini_generate') {
    chatToolCalls = state.geminiToolCalls;
  } else if ((!chatToolCalls || chatToolCalls.length === 0) && fallbackRecord) {
    chatToolCalls = extractChatToolCallsFromCompletion(fallbackRecord);
  }

  return {
    content: resolveStreamResultContent(state, fallbackJson, apiSurface),
    fallbackJson,
    firstChunkMs: state.firstChunkMs,
    chunkCount: state.chunkCount,
    lastResponsesPayload: state.lastResponsesPayload,
    functionCalls: state.functionCalls,
    chatToolCalls: chatToolCalls?.length ? chatToolCalls : undefined,
    reasoningContent: state.reasoningContent,
    usage: state.usage,
  };
}

/**
 * Gateways may ignore stream:true and return one whole native JSON body
 * (Anthropic Messages / Gemini generateContent shape) on the streaming URL.
 */
function tryBufferedNativeStreamResult(
  state: OpenAIStreamState,
  fallbackRecord: Record<string, unknown> | null,
  apiSurface: ApiSurface
): OpenAIStreamReadResult | null {
  if (state.content || !fallbackRecord) return null;
  if (apiSurface === 'anthropic_messages') {
    const toolCalls = anthropicToolUsesToChatToolCalls(extractAnthropicToolUses(fallbackRecord));
    return {
      content: extractAnthropicMessagesText(fallbackRecord),
      fallbackJson: null,
      firstChunkMs: state.firstChunkMs,
      chunkCount: state.chunkCount,
      chatToolCalls: toolCalls.length ? toolCalls : undefined,
      reasoningContent: state.reasoningContent,
      usage: toUsageRecord(extractAnthropicUsage(fallbackRecord)) ?? state.usage,
    };
  }
  if (apiSurface === 'gemini_generate') {
    const toolCalls = geminiFunctionCallsToChatToolCalls(
      extractGeminiFunctionCalls(fallbackRecord),
      0
    );
    return {
      content: extractGeminiGenerateText(fallbackRecord),
      fallbackJson: null,
      firstChunkMs: state.firstChunkMs,
      chunkCount: state.chunkCount,
      chatToolCalls: toolCalls.length ? toolCalls : undefined,
      reasoningContent: state.reasoningContent,
      usage: toUsageRecord(extractGeminiUsage(fallbackRecord)) ?? state.usage,
    };
  }
  return null;
}

export function toUsageRecord(
  usage: import('../modelCapability').NormalizedUsage | null
): Record<string, unknown> | undefined {
  return usage ? { ...usage } : undefined;
}

export async function readOpenAIStream(
  response: Response,
  requestStartedAt: number,
  options: OpenAIStreamOptions,
  apiSurface: ApiSurface = 'chat_completions'
): Promise<OpenAIStreamReadResult> {
  const reader = response.body?.getReader();

  if (!reader) {
    const buffered = await readBufferedOpenAIResponse(response);
    if (apiSurface === 'responses' && buffered.fallbackJson) {
      return createOpenAIStreamResult(
        {
          content: '',
          reasoningContent: '',
          chunkCount: 0,
          responseIdReported: false,
        },
        JSON.stringify(buffered.fallbackJson),
        apiSurface
      );
    }
    return buffered;
  }

  const state: OpenAIStreamState = {
    content: '',
    reasoningContent: '',
    chunkCount: 0,
    responseIdReported: false,
    responsesTextSeenItems: new Set(),
  };
  const lineContext: OpenAIStreamLineContext = {
    response,
    requestStartedAt,
    options,
    state,
    apiSurface,
  };
  const rawText = await readOpenAIStreamBody(reader, lineContext);
  const result = createOpenAIStreamResult(state, rawText, apiSurface);
  // Buffered Responses JSON (non-SSE) may carry id without stream events.
  if (apiSurface === 'responses' && result.lastResponsesPayload && !state.responseIdReported) {
    const responseId = extractResponsesId(result.lastResponsesPayload);
    if (responseId) {
      options.onResponseId?.(responseId);
    }
  }
  return result;
}
