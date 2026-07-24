// src/services/llmService.ts
// ================================================================
// 🎯 大语言模型服务 (TypeScript版本)
// 🛡️ 增强鲁棒性 - 指数退避重试 (Exponential Backoff)
// 🌐 环境适配 - 开发/生产环境自动切换
// 🎯 P0-4: 已迁移到统一错误处理
// 🎯 P0-4.1.8: 在数据边界使用类型守卫
// ================================================================

import { ErrorService } from './errorService';
import { isDangerousEndpoint, getDangerousEndpoints } from '@/common/config/apiEndpoints';
import { configCenter } from '@/common/config/ConfigCenter';
import { EnvConfig } from '@/common/config/envConfig';
import { DEFAULT_LLM_PROVIDER_ID, DEFAULT_NEW_API_ENDPOINT } from '@/common/config/llmProviders';
import { ApiError, NetworkError, SystemError, ValidationError } from '@/common/errors';
import { randomFloat } from '@/common/utils/random';
// 导入统一的 API 响应类型
import type { LLMChatCompletionResponse, LLMErrorResponse } from '@/types/api';
// 导入类型守卫
import { isLLMChatCompletionResponse } from '@/common/guards/typeGuards';
import {
  buildBodyForApiPath,
  buildFullApiUrl,
  extractAnthropicMessagesText,
  extractGeminiGenerateText,
  DEFAULT_MAX_TOOL_ROUNDS,
  appendChatToolRoundMessages,
  describeResponsesEmptyBody,
  extractAssistantTextFromResponsesOrChat,
  extractChatStreamToolCallDeltas,
  extractChatToolCallsFromCompletion,
  extractResponsesFunctionCalls,
  extractResponsesId,
  extractResponsesIdFromStreamEvent,
  extractResponsesReasoningSummary,
  getAnthropicStreamTextDelta,
  getGeminiStreamTextDelta,
  getResponsesReasoningStreamDelta,
  getResponsesStreamTextDelta,
  harvestResponsesReasoningIncrement,
  isResponsesTerminalEvent,
  mergeChatStreamToolCallDeltas,
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  processResponsesToolRound,
  resolveEffectiveReasoning,
  resolveModelCapability,
  type ApiPathId,
  type ApiSurface,
  type ChatFunctionToolCall,
  type ModelsListEntry,
  type ReasoningUserPrefs,
  type ResponsesJsonSchemaFormat,
  type ResponsesToolExecutor,
  type ResponsesTransportOptions,
  type SessionReasoningOverride,
} from './modelCapability';
import { StorageService } from './storageService';

// ========================
// 类型定义
// ========================

/**
 * Official chat roles (Create chat completion).
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'developer';

/** Chat Completions multimodal / text content parts */
export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

export interface ChatToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/**
 * Chat message (official Create shape; content may be string, parts, or null with tool_calls).
 */
export interface ChatMessage {
  role: MessageRole;
  content?: string | ChatContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatToolCall[];
  refusal?: string | null;
}

/**
 * LLM 调用配置选项 — dual-path Create parity extras.
 */
export interface LLMOptions {
  /** 温度参数 (0-2)，越低越确定性 */
  temperature?: number;
  /** 是否强制 JSON 输出格式 */
  jsonMode?: boolean;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 最大输出 token 数 */
  maxTokens?: number;
  /** OpenAI-compatible service tier. Only sent when explicitly configured. */
  serviceTier?: 'auto' | 'default' | 'flex' | 'priority';
  /** 最大重试次数 */
  retries?: number;
  /** 初始重试延迟 (ms) */
  retryDelay?: number;
  /** 请求取消信号 */
  signal?: AbortSignal;
  stream?: boolean;
  onFirstResponse?: (metrics: LLMStreamMetrics) => void;
  onStreamUpdate?: (update: LLMStreamUpdate) => void;
  /**
   * Global or session reasoning prefs (product-level).
   * Applied only when the model capability registry has a mapRequest.
   */
  reasoningPrefs?: ReasoningUserPrefs;
  /** Session override over reasoningPrefs; omit fields to inherit */
  reasoningSessionOverride?: SessionReasoningOverride;
  /** Optional /models list entry for context merge */
  modelsEntry?: ModelsListEntry | string | null;
  /**
   * User-selected API path mode (system settings).
   * Overrides model preferred surface when set.
   */
  apiPath?: ApiPathId;
  /** Multi-turn / tools / vision (chat + responses) */
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  visionUserParts?: ResponsesTransportOptions['visionUserParts'];
  /** Called with Responses response.id when available (for chaining). */
  onResponseId?: (responseId: string) => void;
  /**
   * Execute a function tool when the model returns tool_calls / function_call items.
   * Requires enableToolLoop: true. Works on chat_completions and responses.
   */
  executeTool?: ResponsesToolExecutor;
  /**
   * Explicit opt-in for tool loop on the active path.
   */
  enableToolLoop?: boolean;
  /** Max tool rounds (default 5). */
  maxToolRounds?: number;
  /**
   * Structured Outputs (json_schema). Takes precedence over jsonMode json_object.
   */
  jsonSchema?: ResponsesJsonSchemaFormat;
  /** Official Create sampling / control */
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  seed?: number;
  logitBias?: Record<string, number>;
  logprobs?: boolean;
  topLogprobs?: number;
  metadata?: Record<string, string>;
  promptCacheKey?: string;
  safetyIdentifier?: string;
}

export interface LLMStreamMetrics {
  elapsedMs: number;
  firstChunkMs?: number;
  chunkCount: number;
}

export interface LLMStreamUpdate extends LLMStreamMetrics {
  /** Visible assistant text delta (never includes reasoning channel). */
  delta: string;
  /** Accumulated visible assistant text. */
  content: string;
  /** Optional reasoning / thinking channel delta (display-only; not final answer). */
  reasoningDelta?: string;
  /** Accumulated reasoning channel text for this request. */
  reasoningContent?: string;
}

/**
 * LLM 配置对象 (用于跨模块传递)
 */
export interface LLMConfig {
  /** 厂商标识 (openai, anthropic, deepseek...) */
  provider: string;
  /** API 端点 URL */
  endpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
}

export interface LLMCallRequest extends LLMConfig {
  messages: ChatMessage[];
  options?: LLMOptions;
}

type PositionalLLMCallArgs = [
  messages: ChatMessage[],
  provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  options?: LLMOptions,
];

type LLMCallArgs = PositionalLLMCallArgs | [request: LLMCallRequest];

/**
 * 模型信息对象
 * @deprecated 使用 LLMModel 类型代替
 */
export interface ModelInfo {
  /** 模型 ID */
  id: string;
  /** 上下文窗口大小 */
  context: number;
  /** 支持的特性列表 */
  features: string[];
}

// ========================
// 辅助函数
// ========================

/**
 * 睡眠函数
 */
function getAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error && signal.reason.name === 'AbortError') {
    return signal.reason;
  }

  const error = new Error(signal.reason instanceof Error ? signal.reason.message : 'Aborted');
  error.name = 'AbortError';
  return error;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

function resolveProviderEndpoint(provider: string, endpoint: string): string {
  const trimmedEndpoint = (endpoint || '').trim();

  if (
    provider === DEFAULT_LLM_PROVIDER_ID &&
    (!trimmedEndpoint || trimmedEndpoint === '/v1' || trimmedEndpoint === '/v1/')
  ) {
    return DEFAULT_NEW_API_ENDPOINT;
  }

  return EnvConfig.api.normalizeEndpoint(trimmedEndpoint);
}

function getChatCompletionsStreamDelta(payload: Record<string, unknown>): string {
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const firstChoice = choices[0] as Record<string, unknown>;
  const delta = firstChoice.delta as Record<string, unknown> | undefined;
  const message = firstChoice.message as Record<string, unknown> | undefined;

  const content = delta?.content ?? message?.content;
  return typeof content === 'string' ? content : '';
}

function getChatCompletionsReasoningDelta(payload: Record<string, unknown>): string {
  const choices = payload.choices;
  if (!Array.isArray(choices) || !choices[0]) return '';
  const first = choices[0] as Record<string, unknown>;
  const delta = first.delta as Record<string, unknown> | undefined;
  const message = first.message as Record<string, unknown> | undefined;
  const fromDelta = delta?.reasoning_content;
  const fromMessage = message?.reasoning_content;
  if (typeof fromDelta === 'string') return fromDelta;
  if (typeof fromMessage === 'string') return fromMessage;
  return '';
}

function getAnthropicReasoningDelta(payload: Record<string, unknown>): string {
  if (payload.type !== 'content_block_delta') return '';
  const delta = payload.delta as { type?: string; thinking?: string } | undefined;
  if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
    return delta.thinking;
  }
  return '';
}

function getGeminiReasoningDelta(payload: Record<string, unknown>): string {
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || !candidates[0]) return '';
  const content = (
    candidates[0] as { content?: { parts?: Array<{ text?: string; thought?: boolean }> } }
  ).content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return '';
  const texts: string[] = [];
  for (const part of parts) {
    if (part && part.thought === true && typeof part.text === 'string') {
      texts.push(part.text);
    }
  }
  return texts.join('');
}

/** Reasoning/thinking channel only — never merged into final assistant text. */
function getReasoningStreamDelta(payload: Record<string, unknown>, surface: ApiSurface): string {
  if (surface === 'chat_completions') return getChatCompletionsReasoningDelta(payload);
  if (surface === 'anthropic_messages') return getAnthropicReasoningDelta(payload);
  if (surface === 'gemini_generate') return getGeminiReasoningDelta(payload);
  if (surface === 'responses') {
    return getResponsesReasoningStreamDelta(payload) || getChatCompletionsReasoningDelta(payload);
  }
  return '';
}

/** Notify Deep Chat (etc.) of reasoning summary from a completed non-stream Responses body. */
function emitResponsesReasoningFromPayload(
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
 * Prefer Responses SSE shapes; fall back to chat/completions deltas.
 * Many OpenAI-compatible gateways accept POST /responses but still stream
 * `choices[].delta.content` (new-api channel quirks).
 */
function getStreamDelta(payload: Record<string, unknown>, surface: ApiSurface): string {
  if (surface === 'responses') {
    return getResponsesStreamTextDelta(payload) || getChatCompletionsStreamDelta(payload);
  }
  if (surface === 'anthropic_messages') {
    return getAnthropicStreamTextDelta(payload);
  }
  if (surface === 'gemini_generate') {
    return getGeminiStreamTextDelta(payload);
  }
  return getChatCompletionsStreamDelta(payload);
}

function parseBufferedJsonCompletion(rawText: string): LLMChatCompletionResponse | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as LLMChatCompletionResponse;
  } catch {
    return null;
  }
}

function getLLMErrorMessage(errorText: string, fallback: string): string {
  try {
    const errorJson = JSON.parse(errorText) as LLMErrorResponse;
    return errorJson.error?.message || fallback;
  } catch {
    return fallback;
  }
}

type OpenAIStreamOptions = Pick<
  LLMOptions,
  'onFirstResponse' | 'onStreamUpdate' | 'onResponseId'
> & {
  onStreamActivity?: () => void;
};

interface OpenAIStreamState {
  content: string;
  reasoningContent: string;
  firstChunkMs?: number;
  chunkCount: number;
  responseIdReported?: boolean;
  /** Last terminal Responses payload (for tool-call harvest after stream). */
  lastResponsesPayload?: Record<string, unknown>;
  /** Accumulated function_call items seen on stream/completed events. */
  functionCalls?: import('./modelCapability').ResponsesFunctionCall[];
  /** Chat Completions stream tool_calls (merged deltas). */
  chatToolCalls?: ChatFunctionToolCall[];
}

interface OpenAIStreamLineContext {
  response: Response;
  requestStartedAt: number;
  options: OpenAIStreamOptions;
  state: OpenAIStreamState;
  apiSurface: ApiSurface;
}

interface OpenAIStreamReadResult {
  content: string;
  fallbackJson: LLMChatCompletionResponse | null;
  firstChunkMs?: number;
  chunkCount: number;
  lastResponsesPayload?: Record<string, unknown>;
  functionCalls?: import('./modelCapability').ResponsesFunctionCall[];
  chatToolCalls?: ChatFunctionToolCall[];
  reasoningContent?: string;
}

function getCompletionContent(
  completion: LLMChatCompletionResponse | null,
  defaultContent = ''
): string {
  const raw = completion?.choices?.[0]?.message?.content;
  if (raw == null) {
    return defaultContent;
  }
  return typeof raw === 'string' ? raw : defaultContent;
}

function getChatCompletionFinishReason(
  completion: LLMChatCompletionResponse | null | undefined
): string | null | undefined {
  return completion?.choices?.[0]?.finish_reason;
}

function isToolCallsFinishReason(reason: string | null | undefined): boolean {
  return reason === 'tool_calls' || reason === 'function_call';
}

function getStreamData(line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith('data:')) {
    return '';
  }

  const data = trimmedLine.slice(5).trim();
  return data === '[DONE]' ? '' : data;
}

function parseStreamPayload(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
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

function assertStreamPayloadIsOk(
  payload: Record<string, unknown>,
  data: string,
  response: Response
): void {
  const errorPayload = payload.error as { message?: string } | undefined;
  if (!errorPayload?.message) {
    return;
  }

  throw new ApiError(errorPayload.message, 'API_STREAM_ERROR', response.status, data, {
    module: 'LLMService',
    action: 'readOpenAIStream',
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
  reportResponsesStreamIdOnce(payload, context);
  harvestResponsesStreamSideChannels(payload, context);
  harvestChatStreamToolCalls(payload, context);

  const delta = getStreamDelta(payload, context.apiSurface);
  const reasoningDelta = resolveStreamReasoningDelta(payload, context);
  if (!delta && !reasoningDelta) {
    return;
  }

  emitOpenAIStreamUpdate(context, delta, reasoningDelta);
}

function harvestChatStreamToolCalls(
  payload: Record<string, unknown>,
  context: OpenAIStreamLineContext
): void {
  if (context.apiSurface !== 'chat_completions') return;
  const deltas = extractChatStreamToolCallDeltas(payload);
  if (deltas.length === 0) return;
  context.state.chatToolCalls = mergeChatStreamToolCallDeltas(
    context.state.chatToolCalls,
    deltas
  );
}

function collectStreamFunctionCalls(
  payload: Record<string, unknown>
): import('./modelCapability').ResponsesFunctionCall[] {
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
  existing: import('./modelCapability').ResponsesFunctionCall[] | undefined,
  incoming: import('./modelCapability').ResponsesFunctionCall[]
): import('./modelCapability').ResponsesFunctionCall[] | undefined {
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

    context.options.onStreamActivity?.();
    const decoded = decoder.decode(value, { stream: true });
    rawText += decoded;
    buffer = processStreamText(decoded, buffer, context);
  }

  const tail = decoder.decode();
  if (tail) {
    rawText += tail;
    buffer = processStreamText(tail, buffer, context);
  }

  processRemainingStreamBuffer(buffer, context);
  return rawText;
}

function isResponsesLikePayload(data: Record<string, unknown> | null | undefined): boolean {
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

  // Prefer streamed tool_calls; fall back to non-stream shaped buffered JSON.
  let chatToolCalls = state.chatToolCalls;
  if ((!chatToolCalls || chatToolCalls.length === 0) && fallbackRecord) {
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
  };
}

async function readOpenAIStream(
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

interface ResolvedLLMOptions {
  temperature: number;
  jsonMode: boolean;
  timeout: number;
  maxTokens: number | undefined;
  serviceTier: LLMOptions['serviceTier'];
  retries: number;
  retryDelay: number;
  signal: AbortSignal | undefined;
  stream: boolean;
  onFirstResponse: LLMOptions['onFirstResponse'];
  onStreamActivity: OpenAIStreamOptions['onStreamActivity'];
  onStreamUpdate: LLMOptions['onStreamUpdate'];
  reasoningPrefs: ReasoningUserPrefs | undefined;
  reasoningSessionOverride: SessionReasoningOverride | undefined;
  modelsEntry: ModelsListEntry | string | null | undefined;
  apiPath: ApiPathId;
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  visionUserParts?: ResponsesTransportOptions['visionUserParts'];
  onResponseId?: LLMOptions['onResponseId'];
  executeTool?: ResponsesToolExecutor;
  enableToolLoop?: boolean;
  maxToolRounds?: number;
  jsonSchema?: ResponsesJsonSchemaFormat;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  seed?: number;
  logitBias?: Record<string, number>;
  logprobs?: boolean;
  topLogprobs?: number;
  metadata?: Record<string, string>;
  promptCacheKey?: string;
  safetyIdentifier?: string;
  /** Internal: function_call_output items for next Responses request */
  followUpInputItems?: Array<Record<string, unknown>>;
}

interface LLMCallContext {
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

interface LLMResponsePayload {
  data: LLMChatCompletionResponse | null;
  content: string;
  /** Full Responses JSON (non-stream) for tool-loop parsing */
  rawResponsesData?: Record<string, unknown>;
  /** Function calls harvested from stream terminal events */
  streamFunctionCalls?: import('./modelCapability').ResponsesFunctionCall[];
  /** Chat Completions tool_calls from stream or non-stream body */
  chatToolCalls?: ChatFunctionToolCall[];
  streamMetrics?: {
    firstChunkMs?: number;
    chunkCount: number;
  };
}

interface LLMAttemptFailure {
  error: Error;
  shouldRetry: boolean;
}

interface LLMAttemptState {
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

function resolveLLMOptions(
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
    followUpInputItems: undefined,
  };
}

function assertSafeLLMEndpoint(endpoint: string): void {
  if (!configCenter.isProduction() || !isDangerousEndpoint(endpoint)) {
    return;
  }

  const dangerousEndpoints = getDangerousEndpoints();
  throw new SystemError(
    '⛔ 安全限制: 生产环境禁止直接调用外部API\n\n' +
      '可能的原因:\n' +
      '1. 未配置代理服务器\n' +
      '2. API端点配置错误\n\n' +
      '解决方案:\n' +
      '- 请在设置中配置企业代理\n' +
      '- 或联系管理员配置企业服务端网关\n\n' +
      `检测到的危险端点: ${dangerousEndpoints.join(', ')}\n` +
      '这是为了保护您的API密钥安全。',
    'LLM_DANGEROUS_ENDPOINT',
    {
      module: 'LLMService',
      action: 'callLLM',
      endpoint,
      dangerousEndpoints: dangerousEndpoints.join(', '),
      environment: 'production',
    }
  );
}

/** Flatten official chat content (string | parts | null) to plain text for UI/budget. */
export function chatContentToPlainText(content: ChatMessage['content']): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);
  return content
    .map(part => (part && part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

function contentToPlainText(content: ChatMessage['content']): string {
  return chatContentToPlainText(content);
}

/**
 * Chat path: preserve official message shape (parts, tool_calls, tool role).
 * Other paths: flatten to text roles expected by native body builders.
 */
function normalizeMessagesForTransport(
  messages: ChatMessage[],
  pathId: ApiPathId = 'chat_completions'
): Array<Record<string, unknown>> {
  if (pathId === 'chat_completions') {
    return messages.map(message => {
      const row: Record<string, unknown> = { role: message.role };
      if (message.content !== undefined) {
        row.content = message.content;
      } else if (!message.tool_calls?.length) {
        row.content = '';
      }
      if (message.name) row.name = message.name;
      if (message.tool_call_id) row.tool_call_id = message.tool_call_id;
      if (message.tool_calls?.length) row.tool_calls = message.tool_calls;
      if (message.refusal !== undefined) row.refusal = message.refusal;
      return row;
    });
  }

  return messages.map(message => {
    const role =
      message.role === 'developer'
        ? 'system'
        : message.role === 'tool'
          ? 'user'
          : message.role === 'assistant'
            ? 'assistant'
            : message.role === 'system'
              ? 'system'
              : 'user';
    return {
      role,
      content: contentToPlainText(message.content),
    };
  });
}

function extractOutboundReasoningMarker(body: Record<string, unknown>): string | undefined {
  if (body.reasoning_effort !== undefined) {
    return String(body.reasoning_effort);
  }
  const reasoning = body.reasoning as { effort?: unknown } | undefined;
  if (reasoning?.effort !== undefined) {
    return String(reasoning.effort);
  }
  const thinking = body.thinking as { budget_tokens?: unknown } | undefined;
  if (thinking?.budget_tokens !== undefined) {
    return `budget:${String(thinking.budget_tokens)}`;
  }
  const thinkingConfig = body.thinkingConfig as { thinkingBudget?: unknown } | undefined;
  if (thinkingConfig?.thinkingBudget !== undefined) {
    return `geminiBudget:${String(thinkingConfig.thinkingBudget)}`;
  }
  return undefined;
}

function logReasoningTransport(args: {
  model: string;
  surface: ApiSurface;
  body: Record<string, unknown>;
  capabilitySupports: boolean;
  globalEnabled: boolean;
  session: SessionReasoningOverride | undefined;
}): void {
  const effort = extractOutboundReasoningMarker(args.body);
  // Production: silent. Dev: console for gateway field verification.
  const isDev =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev) {
    return;
  }
  if (effort !== undefined) {
    console.info(
      `[LLM] 请求将发送推理参数 surface=${args.surface} model=${args.model} effort=${effort}`
    );
    return;
  }
  if (args.capabilitySupports) {
    console.info(
      `[LLM] 推理可用但未启用 surface=${args.surface} model=${args.model} ` +
        `globalEnabled=${args.globalEnabled} session=${JSON.stringify(args.session ?? null)}`
    );
  }
}

function resolveTransportPathId(
  options: ResolvedLLMOptions,
  capabilitySupportsStructuredOutput: boolean,
  forcePath?: ApiPathId
): ApiPathId {
  if (forcePath) return forcePath;
  const current = options.apiPath ?? 'chat_completions';
  // jsonMode: keep Gemini native; keep Responses when structured output (text.format) is supported;
  // otherwise force chat_completions + response_format.
  if (options.jsonMode === true) {
    if (current === 'gemini_generate') return 'gemini_generate';
    if (current === 'responses' && capabilitySupportsStructuredOutput) return 'responses';
    return 'chat_completions';
  }
  return current;
}

function createLLMTransport(args: {
  messages: ChatMessage[];
  model: string;
  options: ResolvedLLMOptions;
  provider: string;
  endpoint: string;
  forcePath?: ApiPathId;
}): {
  body: Record<string, unknown>;
  path: string;
  requestUrl: string;
  apiSurface: ApiSurface;
  apiPath: ApiPathId;
} {
  const preferredPath = args.forcePath ?? args.options.apiPath ?? 'chat_completions';
  const probeCapability = resolveModelCapability({
    provider: args.provider,
    modelId: args.model,
    modelsEntry: args.options.modelsEntry,
    preferredSurface: preferredPath,
  });
  const pathId = resolveTransportPathId(
    args.options,
    probeCapability.supportsStructuredOutput,
    args.forcePath
  );
  const capability = resolveModelCapability({
    provider: args.provider,
    modelId: args.model,
    modelsEntry: args.options.modelsEntry,
    preferredSurface: pathId,
  });
  const globalPrefs = normalizeReasoningUserPrefs(args.options.reasoningPrefs);
  const reasoning = resolveEffectiveReasoning(
    capability,
    globalPrefs,
    args.options.reasoningSessionOverride
  );

  const body = buildBodyForApiPath({
    pathId,
    model: args.model,
    messages: normalizeMessagesForTransport(args.messages, pathId),
    temperature: args.options.temperature,
    maxTokens: args.options.maxTokens,
    stream: args.options.stream,
    jsonMode: args.options.jsonMode,
    serviceTier: args.options.serviceTier,
    capability,
    reasoning,
    previousResponseId: args.options.previousResponseId,
    store: args.options.store,
    tools: args.options.tools,
    toolChoice: args.options.toolChoice,
    parallelToolCalls: args.options.parallelToolCalls,
    visionUserParts: args.options.visionUserParts,
    followUpInputItems: args.options.followUpInputItems,
    jsonSchema: args.options.jsonSchema,
    topP: args.options.topP,
    frequencyPenalty: args.options.frequencyPenalty,
    presencePenalty: args.options.presencePenalty,
    stop: args.options.stop,
    n: args.options.n,
    seed: args.options.seed,
    logitBias: args.options.logitBias,
    logprobs: args.options.logprobs,
    topLogprobs: args.options.topLogprobs,
    metadata: args.options.metadata,
    promptCacheKey: args.options.promptCacheKey,
    safetyIdentifier: args.options.safetyIdentifier,
  });

  const { fullUrl, pathSuffix } = buildFullApiUrl(args.endpoint, pathId, args.model);

  logReasoningTransport({
    model: args.model,
    surface: pathId,
    body,
    capabilitySupports: Boolean(capability.supportsReasoning && capability.mapRequest),
    globalEnabled: globalPrefs.enabled,
    session: args.options.reasoningSessionOverride,
  });

  return {
    body,
    path: pathSuffix,
    requestUrl: fullUrl,
    apiSurface: pathId,
    apiPath: pathId,
  };
}

async function waitBeforeLLMRetry(attempt: number, options: ResolvedLLMOptions): Promise<void> {
  if (attempt === 0) {
    return;
  }

  const delay = options.retryDelay * Math.pow(2, attempt - 1) * (1 + randomFloat() * 0.2);
  await sleep(delay, options.signal);
}

function createLLMAbortResources(
  options: ResolvedLLMOptions,
  state: LLMAttemptState
): {
  controller: AbortController;
  clearRequestTimeout: () => void;
  resetRequestTimeout: () => void;
} {
  const controller = new AbortController();
  const abortOnTimeout = (): void => {
    if (controller.signal.aborted) return;
    state.timedOut = true;
    controller.abort();
  };
  const abortFromExternalSignal = (): void => {
    if (controller.signal.aborted) return;
    state.externallyAborted = true;
    controller.abort();
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
  return { controller, clearRequestTimeout, resetRequestTimeout };
}

/**
 * Build request headers for the selected API path.
 * Always sets Content-Type + Bearer when key present (new-api / OpenAI-compatible).
 * Anthropic path also sets anthropic-version + x-api-key (native Anthropic / dual-auth gateways).
 * Gemini path also sets x-goog-api-key (Google AI Studio style).
 */
function buildLLMRequestHeaders(
  apiPath: ApiPathId,
  apiKey: string | undefined
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!apiKey) {
    return headers;
  }
  headers.Authorization = `Bearer ${apiKey}`;
  if (apiPath === 'anthropic_messages') {
    headers['anthropic-version'] = '2023-06-01';
    headers['x-api-key'] = apiKey;
  }
  if (apiPath === 'gemini_generate') {
    headers['x-goog-api-key'] = apiKey;
  }
  return headers;
}

async function fetchLLMResponse(
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

function isReasoningGatewayError(message: string, rawBody: string): boolean {
  const blob = `${message}\n${rawBody}`.toLowerCase();
  return /reasoning_effort|reasoning content|reasoning_content|thinking_effort|enable_thinking|budget_tokens|\bthinking\b|unsupported[^\n]{0,40}reasoning|unknown[^\n]{0,40}reasoning|invalid[^\n]{0,40}reasoning/.test(
    blob
  );
}

/** Non-chat path 404/unsupported → one-shot fallback to chat_completions. */
function isAlternatePathUnsupportedError(error: ApiError): boolean {
  if (error.statusCode === 404) return true;
  if (error.statusCode !== 400 && error.statusCode !== 404) return false;
  const responseText =
    typeof error.response === 'string' ? error.response : JSON.stringify(error.response ?? '');
  const blob = `${error.message}\n${responseText}`.toLowerCase();
  return /\/responses|\/messages|generatecontent|unknown url|not found|no route|invalid url path|does not exist/.test(
    blob
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
      // Non-stream / tool-loop: still surface reasoning summary for 深度思考 UI
      emitResponsesReasoningFromPayload(data, context.options.onStreamUpdate, requestStartedAt);
      return {
        data: null,
        content: extractAssistantTextFromResponsesOrChat(data),
        rawResponsesData: data,
      };
    }
    if (context.apiSurface === 'anthropic_messages') {
      return { data: null, content: extractAnthropicMessagesText(data) };
    }
    if (context.apiSurface === 'gemini_generate') {
      return { data: null, content: extractGeminiGenerateText(data) };
    }
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
    },
    context.apiSurface
  );

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

  if (!isLLMChatCompletionResponse(data)) {
    throw createInvalidLLMResponseError('LLM API 返回格式异常', data, response, context);
  }

  if (!hasLLMMessage(data)) {
    throw createInvalidLLMResponseError(
      `API 返回格式异常: 缺少 choices 或 message 字段`,
      data,
      response,
      context
    );
  }
}

function getLLMResponseContent(payload: LLMResponsePayload): string {
  return payload.content || getCompletionContent(payload.data);
}

async function executeLLMAttemptPayload(
  context: LLMCallContext,
  attempt: number,
  state: LLMAttemptState
): Promise<LLMResponsePayload> {
  await waitBeforeLLMRetry(attempt, context.options);

  const { clearRequestTimeout, controller, resetRequestTimeout } = createLLMAbortResources(
    context.options,
    state
  );
  const attemptContext: LLMCallContext = context.options.stream
    ? {
        ...context,
        options: {
          ...context.options,
          onStreamActivity: resetRequestTimeout,
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

async function executeLLMAttempt(
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

function resolveLLMAttemptFailure(
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

function createUnknownLLMFailure(context: LLMCallContext): SystemError {
  return new SystemError('LLM 调用失败 (未知原因)', 'LLM_UNKNOWN_FAILURE', {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    retries: context.options.retries,
  });
}

function normalizeLLMCallArgs(args: LLMCallArgs): LLMCallRequest {
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

function shouldUseResponsesToolLoop(options: ResolvedLLMOptions): boolean {
  return hasToolLoopPrerequisites(options) && options.apiPath === 'responses';
}

/** Official Chat Completions tools multi-round (messages + tool_calls). */
function shouldUseChatToolLoop(options: ResolvedLLMOptions): boolean {
  const path = options.apiPath ?? 'chat_completions';
  return hasToolLoopPrerequisites(options) && path === 'chat_completions';
}

/** Fail closed when enableToolLoop is set without executor/tools. */
function assertToolLoopOptions(options: ResolvedLLMOptions): void {
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
  calls: import('./modelCapability').ResponsesFunctionCall[],
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
 */
async function callLLMResponsesToolLoop(
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

  for (let round = 0; round < maxRounds; round++) {
    const result = await runOneResponsesToolRound({
      request,
      baseOptions,
      normalizedEndpoint,
      previousResponseId,
      followUpInputItems,
      executeTool,
    });
    lastText = result.lastText;
    previousResponseId = result.previousResponseId;
    followUpInputItems = result.followUpInputItems;
    if (result.done) return lastText;
  }

  return lastText;
}

/**
 * Continue tool loop after a first hop already returned function_call items
 * (stream-first hybrid or non-stream seed payload).
 */
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

  const maxRounds = baseOptions.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  let previousResponseId = extractResponsesId(raw) || baseOptions.previousResponseId;
  let followUpInputItems: Array<Record<string, unknown>> | undefined;
  let lastText = extractAssistantTextFromResponsesOrChat(raw);

  const first = await processToolRoundFromPayload({
    request,
    baseOptions,
    raw,
    executeTool,
    previousResponseId,
  });
  if (first.done) {
    return first.lastText || lastText;
  }
  previousResponseId = first.previousResponseId;
  followUpInputItems = first.followUpInputItems;
  lastText = first.lastText || lastText;

  for (let round = 1; round < maxRounds; round++) {
    const result = await runOneResponsesToolRound({
      request,
      baseOptions: { ...baseOptions, stream: false, enableToolLoop: true },
      normalizedEndpoint,
      previousResponseId,
      followUpInputItems,
      executeTool,
    });
    lastText = result.lastText || lastText;
    previousResponseId = result.previousResponseId;
    followUpInputItems = result.followUpInputItems;
    if (result.done) return lastText;
  }

  return lastText;
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
): import('./modelCapability').ResponsesFunctionCall[] {
  if (payload.streamFunctionCalls?.length) {
    return payload.streamFunctionCalls;
  }
  return raw ? extractResponsesFunctionCalls(raw) : [];
}

/**
 * Stream-first tool path: keep reasoning/text SSE for Deep Chat UX; if the model
 * only emitted function_call items (empty assistant text), continue tool loop
 * from the first payload (or cold-start non-stream loop when nothing was captured).
 */
async function callLLMStreamFirstThenToolLoop(
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
  const raw = resolveRawFromStreamFirstPayload(firstPayload);
  const functionCalls = resolveFunctionCallsFromStreamFirstPayload(firstPayload, raw);
  const toolOptions: ResolvedLLMOptions = {
    ...baseOptions,
    stream: false,
    enableToolLoop: true,
  };

  if (raw && functionCalls.length > 0) {
    return continueResponsesToolLoopFromRaw(request, toolOptions, normalizedEndpoint, raw);
  }
  if (streamed.trim()) {
    return streamed;
  }
  // Terminal SSE payload may carry output_text without per-token deltas or tool calls.
  if (raw) {
    const fromRaw = extractAssistantTextFromResponsesOrChat(raw).trim();
    if (fromRaw) return fromRaw;
  }
  return callLLMResponsesToolLoop(request, toolOptions, normalizedEndpoint);
}

/**
 * Chat Completions tool loop: messages → tool_calls → role=tool → next round.
 */
async function callLLMChatToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const executeTool = baseOptions.executeTool;
  if (!executeTool) return '';

  const maxRounds = baseOptions.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  let messages: ChatMessage[] = [...request.messages];
  let lastText = '';

  for (let round = 0; round < maxRounds; round++) {
    const roundOptions: ResolvedLLMOptions = {
      ...baseOptions,
      stream: false,
      enableToolLoop: false,
    };
    const roundRequest: LLMCallRequest = { ...request, messages, options: roundOptions };
    const context = createInitialLLMContext(roundRequest, roundOptions, normalizedEndpoint);
    const payload = await executeLLMAttemptPayload(context, 0, {
      timedOut: false,
      externallyAborted: false,
    });
    lastText = getLLMResponseContent(payload);
    const toolCalls =
      payload.chatToolCalls?.length
        ? payload.chatToolCalls
        : extractChatToolCallsFromCompletion(
            payload.data as unknown as Record<string, unknown> | null
          );
    if (!toolCalls.length) {
      return lastText;
    }

    const results: Array<{ callId: string; output: string }> = [];
    for (const call of toolCalls) {
      try {
        const output = await executeTool({
          name: call.function.name,
          arguments: call.function.arguments,
          callId: call.id,
        });
        results.push({ callId: call.id, output: String(output ?? '') });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          callId: call.id,
          output: JSON.stringify({ error: message }),
        });
      }
    }

    const transportMessages = normalizeMessagesForTransport(messages, 'chat_completions');
    const nextRecords = appendChatToolRoundMessages(transportMessages, toolCalls, results);
    messages = nextRecords as unknown as ChatMessage[];
  }

  return lastText;
}

/**
 * Stream-first chat hop: if tool_calls appear, continue non-stream tool loop.
 */
async function callLLMChatStreamFirstThenToolLoop(
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
  const toolCalls =
    firstPayload.chatToolCalls?.length
      ? firstPayload.chatToolCalls
      : extractChatToolCallsFromCompletion(
          firstPayload.data as unknown as Record<string, unknown> | null
        );

  if (toolCalls.length > 0) {
    // Seed assistant tool_calls into messages then run remaining non-stream rounds.
    const executeTool = baseOptions.executeTool;
    if (!executeTool) {
      return streamed;
    }
    const results: Array<{ callId: string; output: string }> = [];
    for (const call of toolCalls) {
      try {
        const output = await executeTool({
          name: call.function.name,
          arguments: call.function.arguments,
          callId: call.id,
        });
        results.push({ callId: call.id, output: String(output ?? '') });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ callId: call.id, output: JSON.stringify({ error: message }) });
      }
    }
    const transportMessages = normalizeMessagesForTransport(
      request.messages,
      'chat_completions'
    );
    const nextMessages = appendChatToolRoundMessages(
      transportMessages,
      toolCalls,
      results
    ) as unknown as ChatMessage[];
    return callLLMChatToolLoop(
      { ...request, messages: nextMessages },
      { ...baseOptions, stream: false, enableToolLoop: true },
      normalizedEndpoint
    );
  }

  return streamed;
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

function createInitialLLMContext(
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

async function callLLMWithRetry(
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

interface FetchModelsContext {
  provider: string;
  endpoint: string;
  normalizedEndpoint: string;
  apiKey: string;
}

interface ModelArrayField {
  key: string;
  value: unknown[];
  length: number;
}

function assertSafeModelsEndpoint(endpoint: string): void {
  if (!configCenter.isProduction() || !isDangerousEndpoint(endpoint)) {
    return;
  }

  throw new SystemError(
    '⛔ 安全限制: 生产环境禁止直接调用外部API\n' + '请配置企业代理或联系管理员',
    'LLM_DANGEROUS_ENDPOINT',
    {
      module: 'LLMService',
      action: 'fetchModelsFromApi',
      endpoint,
      environment: 'production',
    }
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function createModelsFetchTimeoutError(): Error {
  const error = new Error('Request timeout');
  error.name = 'AbortError';
  return error;
}

async function fetchModelsRawText(context: FetchModelsContext): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    // 带 reason，避免浏览器默认 “signal is aborted without reason” 噪音
    controller.abort(createModelsFetchTimeoutError());
  }, 10000);
  const headers: Record<string, string> = {};

  if (context.apiKey) {
    headers.Authorization = `Bearer ${context.apiKey}`;
  }

  try {
    const response = await fetch(`${context.normalizedEndpoint}/models`, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        'LLM_API_ERROR',
        response.status,
        errorText,
        {
          module: 'LLMService',
          action: 'fetchModelsFromApi',
          provider: context.provider,
          endpoint: context.endpoint,
        }
      );
    }

    return await response.text();
  } catch (error) {
    if (timedOut || isAbortError(error)) {
      throw createModelsFetchTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseModelsJson(rawText: string, context: FetchModelsContext): unknown {
  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    throw new ApiError(
      `API返回的不是有效的JSON格式`,
      'LLM_JSON_PARSE_ERROR',
      undefined,
      rawText.substring(0, 100),
      {
        module: 'LLMService',
        action: 'fetchModelsFromApi',
        provider: context.provider,
        endpoint: context.endpoint,
      },
      parseError instanceof Error ? parseError : undefined
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNamedModelList(dataObj: Record<string, unknown>): ModelArrayField | null {
  if (Array.isArray(dataObj.data)) {
    return { key: 'data', value: dataObj.data, length: dataObj.data.length };
  }

  if (Array.isArray(dataObj.models)) {
    return { key: 'models', value: dataObj.models, length: dataObj.models.length };
  }

  return null;
}

function getArrayFields(dataObj: Record<string, unknown>): ModelArrayField[] {
  return Object.entries(dataObj)
    .filter(([_key, value]) => Array.isArray(value))
    .map(([key, value]) => {
      const values = value as unknown[];
      return { key, value: values, length: values.length };
    });
}

function getLongestArrayField(fields: ModelArrayField[]): ModelArrayField | null {
  if (fields.length === 0) {
    return null;
  }

  return fields.reduce((a, b) => (a.length > b.length ? a : b));
}

function extractModelList(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  const namedList = getNamedModelList(data);
  if (namedList) {
    return namedList.value;
  }

  const possibleArrays = getArrayFields(data);

  const longest = getLongestArrayField(possibleArrays);
  if (!longest) {
    return [];
  }

  return longest.value;
}

function assertModelListNotEmpty(
  list: unknown[],
  data: unknown,
  context: FetchModelsContext
): void {
  if (list.length > 0) {
    return;
  }

  throw new ApiError(
    'API返回的模型列表为空，请检查API配置是否正确',
    'API_EMPTY_MODEL_LIST',
    undefined,
    JSON.stringify(data),
    {
      module: 'LLMService',
      action: 'fetchModelsFromApi',
      provider: context.provider,
      endpoint: context.normalizedEndpoint,
    }
  );
}

function normalizeModelInfo(model: unknown): ModelInfo | null {
  // Align unknown-model fallback with capability registry (32_768).
  const defaultContext = 32_768;
  if (typeof model === 'string') {
    return { id: model, context: defaultContext, features: [] };
  }

  if (isRecord(model)) {
    const id = model.id || model.model || model.name;
    if (!id) {
      return null;
    }

    const context =
      typeof model.context === 'number' && Number.isFinite(model.context) && model.context > 0
        ? model.context
        : defaultContext;
    const features = Array.isArray(model.features) ? model.features.map(String) : [];

    return {
      id: String(id),
      context,
      features,
    };
  }

  return null;
}

function normalizeModelList(list: unknown[]): ModelInfo[] {
  const models = list
    .map(normalizeModelInfo)
    .filter((model): model is ModelInfo => model !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  return models;
}

function handleFetchModelsFailure(error: unknown): never {
  // 超时/取消是预期控制流，不上报 ErrorTracker（避免 high 级 “aborted without reason” 噪音）
  if (!isAbortError(error)) {
    ErrorService.handle(error as Error, {
      action: 'fetchModelsFromApi',
      module: 'llm',
      notify: false,
    });
  }
  throw error;
}

/**
 * 获取模型列表
 */
export async function fetchModelsFromApi(
  provider: string,
  endpoint: string,
  apiKey: string
): Promise<ModelInfo[]> {
  try {
    const normalizedEndpoint = resolveProviderEndpoint(provider, endpoint);
    assertSafeModelsEndpoint(normalizedEndpoint);
    const context: FetchModelsContext = { provider, endpoint, normalizedEndpoint, apiKey };

    const rawText = await fetchModelsRawText(context);
    const data = parseModelsJson(rawText, context);
    const list = extractModelList(data);
    assertModelListNotEmpty(list, data, context);
    return normalizeModelList(list);
  } catch (error) {
    handleFetchModelsFailure(error);
  }
}

// ========================
// 便捷包装函数
// ========================

/**
 * 使用 LLMConfig 对象调用 LLM (简化参数传递)
 */
export async function callLLMWithConfig(
  messages: ChatMessage[],
  config: LLMConfig,
  options: LLMOptions = {}
): Promise<string> {
  return callLLM(messages, config.provider, config.endpoint, config.apiKey, config.model, options);
}
