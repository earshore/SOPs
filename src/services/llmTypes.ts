// src/services/llmTypes.ts
// ================================================================
// LLM service shared types (public API + internal option/context types).
// Extracted from llmService so transport/model-list modules can import
// types without a runtime cycle back into llmService.
// ================================================================

import type {
  ApiPathId,
  ApiSurface,
  ChatFunctionToolCall,
  ModelsListEntry,
  ReasoningUserPrefs,
  ResponsesJsonSchemaFormat,
  ResponsesToolExecutor,
  ResponsesTransportOptions,
  SessionReasoningOverride,
} from './modelCapability';
import type { LLMChatCompletionResponse } from '@/types/api';

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
  /** Deprecated OpenAI user; prefer promptCacheKey / safetyIdentifier */
  user?: string;
  modalities?: string[];
  audio?: Record<string, unknown>;
  prediction?: Record<string, unknown>;
  webSearchOptions?: Record<string, unknown>;
  /**
   * Called with official usage object when present (non-stream body or stream_options.include_usage).
   */
  onUsage?: (usage: Record<string, unknown>) => void;
  /**
   * Called with full chat.completion (or primary choice payload) after parse.
   * Does not replace the string return of callLLM.
   */
  onCompletion?: (completion: Record<string, unknown>) => void;
  /** Responses Create pass-through */
  truncation?: string;
  background?: boolean;
  maxToolCalls?: number;
  include?: string[];
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
  /** Stream chunk usage when gateway emits it (often final chunk only). */
  usage?: Record<string, unknown>;
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

export type PositionalLLMCallArgs = [
  messages: ChatMessage[],
  provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  options?: LLMOptions,
];

export type LLMCallArgs = PositionalLLMCallArgs | [request: LLMCallRequest];

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
/** 流式活动信息：区分「纯推理」与「正文进展」，供超时策略决策 */
export interface StreamActivityInfo {
  /** 本批次仅包含推理内容（正文字符为 0） */
  reasoningOnly: boolean;
  /** 已累计正文字符数 */
  contentChars: number;
}

export type OpenAIStreamOptions = Pick<
  LLMOptions,
  'onFirstResponse' | 'onStreamUpdate' | 'onResponseId' | 'onUsage'
> & {
  onStreamActivity?: (info: StreamActivityInfo) => void;
};

export interface OpenAIStreamState {
  content: string;
  reasoningContent: string;
  firstChunkMs?: number;
  chunkCount: number;
  responseIdReported?: boolean;
  /** 已收到过 output_text.delta 的 item_id（用于去重 done 事件携带的完整文本）。 */
  responsesTextSeenItems?: Set<string>;
  /** Last terminal Responses payload (for tool-call harvest after stream). */
  lastResponsesPayload?: Record<string, unknown>;
  /** Accumulated function_call items seen on stream/completed events. */
  functionCalls?: import('./modelCapability').ResponsesFunctionCall[];
  /** Chat Completions stream tool_calls (merged deltas). */
  chatToolCalls?: ChatFunctionToolCall[];
  /** Last usage object seen on stream (include_usage). */
  usage?: Record<string, unknown>;
  /** Anthropic SSE tool_use accumulation: index → partial call. */
  anthropicToolUses?: Map<number, { id: string; name: string; json: string }>;
  /** Anthropic prompt tokens from message_start (merged into message_delta usage). */
  anthropicPromptTokens?: number;
  /** Gemini stream functionCall parts (converted to chat tool_calls). */
  geminiToolCalls?: ChatFunctionToolCall[];
}

export interface OpenAIStreamLineContext {
  response: Response;
  requestStartedAt: number;
  options: OpenAIStreamOptions;
  state: OpenAIStreamState;
  apiSurface: ApiSurface;
}

export interface OpenAIStreamReadResult {
  content: string;
  fallbackJson: LLMChatCompletionResponse | null;
  firstChunkMs?: number;
  chunkCount: number;
  lastResponsesPayload?: Record<string, unknown>;
  functionCalls?: import('./modelCapability').ResponsesFunctionCall[];
  chatToolCalls?: ChatFunctionToolCall[];
  reasoningContent?: string;
  usage?: Record<string, unknown>;
}
export interface ResolvedLLMOptions {
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
  user?: string;
  modalities?: string[];
  audio?: Record<string, unknown>;
  prediction?: Record<string, unknown>;
  webSearchOptions?: Record<string, unknown>;
  onUsage?: LLMOptions['onUsage'];
  onCompletion?: LLMOptions['onCompletion'];
  truncation?: string;
  background?: boolean;
  maxToolCalls?: number;
  include?: string[];
  /** Internal: function_call_output items for next Responses request */
  followUpInputItems?: Array<Record<string, unknown>>;
}
