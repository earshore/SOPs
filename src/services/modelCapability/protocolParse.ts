/**
 * Parse non-stream / stream payloads for Anthropic Messages and Gemini generateContent.
 */

import { extractResponsesOutputText, getResponsesStreamTextDelta } from './responsesParse';

function extractOpenAiCompatContent(data: Record<string, unknown>): string {
  const choices = data.choices;
  if (!Array.isArray(choices) || !choices[0]) return '';
  const msg = (choices[0] as { message?: { content?: string } }).message;
  return typeof msg?.content === 'string' ? msg.content : '';
}

export function extractAnthropicMessagesText(data: Record<string, unknown> | null): string {
  if (!data) return '';
  const content = data.content;
  if (!Array.isArray(content)) {
    return extractOpenAiCompatContent(data);
  }
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts.join('');
}

/** Anthropic SSE: content_block_delta with text_delta */
export function getAnthropicStreamTextDelta(payload: Record<string, unknown>): string {
  if (payload.type === 'content_block_delta') {
    const delta = payload.delta as { type?: string; text?: string } | undefined;
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
      return delta.text;
    }
  }
  const choices = payload.choices;
  if (Array.isArray(choices) && choices[0]) {
    const d = (choices[0] as { delta?: { content?: string } }).delta;
    if (typeof d?.content === 'string') return d.content;
  }
  return '';
}

export function extractGeminiGenerateText(data: Record<string, unknown> | null): string {
  if (!data) return '';
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || !candidates[0]) return '';
  const content = (
    candidates[0] as { content?: { parts?: Array<{ text?: string; thought?: boolean }> } }
  ).content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return '';
  const texts: string[] = [];
  for (const p of parts) {
    if (p && typeof p.text === 'string' && !p.thought) {
      texts.push(p.text);
    }
  }
  return texts.join('');
}

export function getGeminiStreamTextDelta(payload: Record<string, unknown>): string {
  return extractGeminiGenerateText(payload);
}

// ---------------------------------------------------------------------------
// Usage / tool-call / finish-reason parsing (official Anthropic & Gemini shapes)
// ---------------------------------------------------------------------------

/** OpenAI-style normalized token usage. */
export interface NormalizedUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AnthropicToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiFinishDiagnostics {
  blockReason?: string;
  finishReason?: string;
  /** 中文诊断消息，总是存在。 */
  message: string;
}

export interface AnthropicStreamToolUseStart {
  index: number;
  id: string;
  name: string;
}

export interface AnthropicStreamInputJsonDelta {
  index: number;
  partialJson: string;
}

function readTokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeAnthropicUsage(usage: Record<string, unknown>): NormalizedUsage | null {
  const input = readTokenCount(usage.input_tokens);
  const output = readTokenCount(usage.output_tokens);
  if (input === null && output === null) return null;
  // Anthropic reports cache tokens separately from input_tokens; fold them
  // into prompt_tokens so the normalized total reflects real prompt cost.
  const cacheCreation = readTokenCount(usage.cache_creation_input_tokens) ?? 0;
  const cacheRead = readTokenCount(usage.cache_read_input_tokens) ?? 0;
  const prompt = (input ?? 0) + cacheCreation + cacheRead;
  const completion = output ?? 0;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
  };
}

function readUsageObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Normalize Anthropic usage from any of the three official shapes:
 * - non-stream body: `{ usage: { input_tokens, output_tokens, ... } }`
 * - stream `message_start`: `{ message: { usage: {...} } }`
 * - stream `message_delta`: `{ usage: { output_tokens } }` (prompt_tokens = 0)
 */
export function extractAnthropicUsage(
  data: Record<string, unknown> | null | undefined
): NormalizedUsage | null {
  if (!data || typeof data !== 'object') return null;
  const direct = readUsageObject(data.usage);
  if (direct) return normalizeAnthropicUsage(direct);
  const message = data.message;
  if (message && typeof message === 'object') {
    const nested = readUsageObject((message as Record<string, unknown>).usage);
    if (nested) return normalizeAnthropicUsage(nested);
  }
  return null;
}

/**
 * Normalize Gemini `usageMetadata` (same shape for stream chunks and non-stream).
 * completion_tokens = candidatesTokenCount + thoughtsTokenCount (when present).
 */
export function extractGeminiUsage(
  data: Record<string, unknown> | null | undefined
): NormalizedUsage | null {
  if (!data || typeof data !== 'object') return null;
  const m = readUsageObject(data.usageMetadata);
  if (!m) return null;
  const prompt = readTokenCount(m.promptTokenCount);
  const candidates = readTokenCount(m.candidatesTokenCount);
  const thoughts = readTokenCount(m.thoughtsTokenCount) ?? 0;
  if (prompt === null && candidates === null) return null;
  const promptTokens = prompt ?? 0;
  const completionTokens = (candidates ?? 0) + thoughts;
  const total = readTokenCount(m.totalTokenCount) ?? promptTokens + completionTokens;
  return { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: total };
}

function readAnthropicToolUse(block: unknown): AnthropicToolUse | null {
  if (!block || typeof block !== 'object') return null;
  const b = block as Record<string, unknown>;
  if (b.type !== 'tool_use') return null;
  if (typeof b.id !== 'string' || typeof b.name !== 'string' || !b.name) return null;
  const input = readUsageObject(b.input) ?? {};
  return { id: b.id, name: b.name, input };
}

/** Tool-use blocks from a non-stream Anthropic Messages body (`content[]`, type=tool_use). */
export function extractAnthropicToolUses(
  data: Record<string, unknown> | null | undefined
): AnthropicToolUse[] {
  if (!data || typeof data !== 'object') return [];
  const content = data.content;
  if (!Array.isArray(content)) return [];
  const calls: AnthropicToolUse[] = [];
  for (const block of content) {
    const call = readAnthropicToolUse(block);
    if (call) calls.push(call);
  }
  return calls;
}

function readGeminiCandidateParts(data: Record<string, unknown>): unknown[] {
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return [];
  const content = (candidates[0] as Record<string, unknown>).content;
  if (!content || typeof content !== 'object') return [];
  const parts = (content as Record<string, unknown>).parts;
  return Array.isArray(parts) ? parts : [];
}

function readGeminiFunctionCall(part: unknown): GeminiFunctionCall | null {
  if (!part || typeof part !== 'object') return null;
  const f = readUsageObject((part as Record<string, unknown>).functionCall);
  if (!f || typeof f.name !== 'string' || !f.name) return null;
  const args = readUsageObject(f.args) ?? {};
  return { name: f.name, args };
}

/** Function calls from `candidates[0].content.parts[].functionCall` (Gemini). */
export function extractGeminiFunctionCalls(
  data: Record<string, unknown> | null | undefined
): GeminiFunctionCall[] {
  if (!data || typeof data !== 'object') return [];
  const calls: GeminiFunctionCall[] = [];
  for (const part of readGeminiCandidateParts(data)) {
    const call = readGeminiFunctionCall(part);
    if (call) calls.push(call);
  }
  return calls;
}

const GEMINI_BLOCK_MESSAGES: Record<string, string> = {
  SAFETY: '请求被 Gemini 安全策略拦截（SAFETY），请调整提示词后重试。',
  PROHIBITED_CONTENT: '请求包含被禁止的内容（PROHIBITED_CONTENT），请调整提示词后重试。',
  BLOCKLIST: '请求命中术语屏蔽列表（BLOCKLIST），请调整提示词后重试。',
};

const GEMINI_FINISH_MESSAGES: Record<string, string> = {
  SAFETY: '模型输出被安全策略终止（SAFETY），请调整提示词后重试。',
  MAX_TOKENS: '模型输出已达到 max tokens 上限被截断（MAX_TOKENS），请增大输出上限后重试。',
  RECITATION: '模型输出因疑似复述受版权内容被终止（RECITATION），请调整提示词后重试。',
  PROHIBITED_CONTENT: '模型输出包含被禁止的内容（PROHIBITED_CONTENT），请调整提示词后重试。',
  BLOCKLIST: '模型输出命中术语屏蔽列表（BLOCKLIST），请调整提示词后重试。',
};

function readGeminiBlockReason(data: Record<string, unknown>): string {
  const feedback = data.promptFeedback;
  if (!feedback || typeof feedback !== 'object') return '';
  const br = (feedback as Record<string, unknown>).blockReason;
  return typeof br === 'string' ? br : '';
}

function readGeminiFinishReason(data: Record<string, unknown>): string {
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return '';
  const fr = (candidates[0] as Record<string, unknown>).finishReason;
  return typeof fr === 'string' ? fr : '';
}

/**
 * Diagnose abnormal Gemini termination from `promptFeedback.blockReason`
 * and `candidates[0].finishReason`. Returns null for a normal STOP.
 */
export function extractGeminiFinishDiagnostics(
  data: Record<string, unknown> | null | undefined
): GeminiFinishDiagnostics | null {
  if (!data || typeof data !== 'object') return null;
  const blockReason = readGeminiBlockReason(data);
  const finishReason = readGeminiFinishReason(data);
  if (blockReason) {
    const message =
      GEMINI_BLOCK_MESSAGES[blockReason] ??
      `请求被 Gemini 拦截（${blockReason}），请调整提示词后重试。`;
    return { blockReason, ...(finishReason ? { finishReason } : {}), message };
  }
  if (!finishReason || finishReason === 'STOP') return null;
  const message =
    GEMINI_FINISH_MESSAGES[finishReason] ??
    `模型输出异常终止（${finishReason}），请稍后重试或调整请求参数。`;
  return { finishReason, message };
}

/**
 * Anthropic stop reason from a non-stream body (`stop_reason`) or a stream
 * `message_delta` event (`delta.stop_reason`).
 * Values: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'refusal'.
 */
export function extractAnthropicStopReason(
  data: Record<string, unknown> | null | undefined
): string | null {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.stop_reason === 'string' && data.stop_reason) return data.stop_reason;
  if (data.type === 'message_delta' && data.delta && typeof data.delta === 'object') {
    const sr = (data.delta as Record<string, unknown>).stop_reason;
    if (typeof sr === 'string' && sr) return sr;
  }
  return null;
}

/** Anthropic SSE: content_block_start opening a tool_use block. */
export function getAnthropicStreamToolUseStart(
  payload: Record<string, unknown>
): AnthropicStreamToolUseStart | null {
  if (payload.type !== 'content_block_start') return null;
  const index = readTokenCount(payload.index);
  const block = payload.content_block;
  if (index === null || !block || typeof block !== 'object') return null;
  const b = block as Record<string, unknown>;
  if (b.type !== 'tool_use') return null;
  if (typeof b.id !== 'string' || typeof b.name !== 'string' || !b.name) return null;
  return { index, id: b.id, name: b.name };
}

/**
 * Anthropic SSE: content_block_delta carrying input_json_delta (`partial_json`).
 * Returns null for text_delta / signature_delta / thinking_delta (no throw).
 */
export function getAnthropicStreamInputJsonDelta(
  payload: Record<string, unknown>
): AnthropicStreamInputJsonDelta | null {
  if (payload.type !== 'content_block_delta') return null;
  const index = readTokenCount(payload.index);
  const delta = payload.delta;
  if (index === null || !delta || typeof delta !== 'object') return null;
  const d = delta as Record<string, unknown>;
  if (d.type !== 'input_json_delta' || typeof d.partial_json !== 'string') return null;
  return { index, partialJson: d.partial_json };
}

export { extractResponsesOutputText, getResponsesStreamTextDelta };
