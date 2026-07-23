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

export { extractResponsesOutputText, getResponsesStreamTextDelta };
