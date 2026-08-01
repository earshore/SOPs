// src/services/llmStreamDelta.ts
// ================================================================
// Pure SSE payload parsing helpers extracted from llmService.
// No dependency on llmService internal state; only types and the
// modelCapability protocol parsers.
// ================================================================

import { ApiError } from '@/common/errors';
import type { LLMChatCompletionResponse, LLMErrorResponse } from '@/types/api';
import {
  getResponsesReasoningStreamDelta,
  getResponsesStreamTextDelta,
  getAnthropicStreamTextDelta,
  getGeminiStreamTextDelta,
  type ApiSurface,
} from './modelCapability';

export function getChatCompletionsStreamDelta(payload: Record<string, unknown>): string {
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
export function getChatCompletionsReasoningDelta(payload: Record<string, unknown>): string {
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
export function getAnthropicReasoningDelta(payload: Record<string, unknown>): string {
  if (payload.type !== 'content_block_delta') return '';
  const delta = payload.delta as { type?: string; thinking?: string } | undefined;
  if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
    return delta.thinking;
  }
  return '';
}
export function getGeminiReasoningDelta(payload: Record<string, unknown>): string {
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
export function getReasoningStreamDelta(
  payload: Record<string, unknown>,
  surface: ApiSurface
): string {
  if (surface === 'chat_completions') return getChatCompletionsReasoningDelta(payload);
  if (surface === 'anthropic_messages') return getAnthropicReasoningDelta(payload);
  if (surface === 'gemini_generate') return getGeminiReasoningDelta(payload);
  if (surface === 'responses') {
    return getResponsesReasoningStreamDelta(payload) || getChatCompletionsReasoningDelta(payload);
  }
  return '';
}
/**
 * Prefer Responses SSE shapes; fall back to chat/completions deltas.
 * Many OpenAI-compatible gateways accept POST /responses but still stream
 * `choices[].delta.content` (new-api channel quirks).
 */
export function getStreamDelta(payload: Record<string, unknown>, surface: ApiSurface): string {
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
export function parseBufferedJsonCompletion(rawText: string): LLMChatCompletionResponse | null {
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
export function getLLMErrorMessage(errorText: string, fallback: string): string {
  try {
    const errorJson = JSON.parse(errorText) as LLMErrorResponse;
    return errorJson.error?.message || fallback;
  } catch {
    return fallback;
  }
}
export function getChatCompletionFinishReason(
  completion: LLMChatCompletionResponse | null | undefined
): string | null | undefined {
  return completion?.choices?.[0]?.finish_reason;
}
export function isToolCallsFinishReason(reason: string | null | undefined): boolean {
  return reason === 'tool_calls' || reason === 'function_call';
}
export function getStreamData(line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith('data:')) {
    return '';
  }

  const data = trimmedLine.slice(5).trim();
  return data === '[DONE]' ? '' : data;
}
export function parseStreamPayload(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}
export function assertStreamPayloadIsOk(
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
