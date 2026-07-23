/**
 * Parse OpenAI Responses API non-stream and stream payloads into assistant text.
 * Reasoning / summary channels are intentionally excluded from final content.
 */

function collectOutputTextFromMessageItem(item: Record<string, unknown>): string[] {
  if (item.type !== 'message') {
    return [];
  }
  const content = item.content;
  if (!Array.isArray(content)) {
    return [];
  }
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if ((b.type === 'output_text' || b.type === 'text') && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts;
}

function collectOutputTextFromItems(output: unknown): string {
  if (!Array.isArray(output)) {
    return '';
  }
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    parts.push(...collectOutputTextFromMessageItem(item as Record<string, unknown>));
  }
  return parts.join('');
}

function readRefusalString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

/** Extract refusal text if present (Responses incomplete / policy). */
export function extractResponsesRefusal(data: Record<string, unknown> | null | undefined): string {
  if (!data || typeof data !== 'object') return '';
  const top = readRefusalString(data.refusal);
  if (top) return top;
  const output = data.output;
  if (!Array.isArray(output)) return '';
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.type === 'message') {
      const refusal = readRefusalString(row.refusal);
      if (refusal) return refusal;
    }
  }
  return '';
}

export function extractResponsesOutputText(
  data: Record<string, unknown> | null | undefined
): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  const fromItems = collectOutputTextFromItems(data.output);
  if (fromItems) return fromItems;

  // Fall back to refusal so callers surface a non-empty error path
  return extractResponsesRefusal(data);
}

/** Response id for previous_response_id chaining. */
export function extractResponsesId(
  data: Record<string, unknown> | null | undefined
): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  return typeof data.id === 'string' && data.id.trim() ? data.id.trim() : undefined;
}

/**
 * Extract visible text delta from a Responses SSE data payload.
 * Ignores reasoning_summary / reasoning item events for final answer text.
 */
function isResponsesTextDeltaType(type: string): boolean {
  return (
    type === 'response.output_text.delta' ||
    type === 'response.content_part.delta' ||
    type === 'response.output_item.delta' ||
    type.endsWith('output_text.delta')
  );
}

function readDeltaTextPayload(delta: unknown): string {
  if (typeof delta === 'string') return delta;
  if (!delta || typeof delta !== 'object') return '';
  const deltaObj = delta as { text?: unknown; content?: unknown };
  if (typeof deltaObj.text === 'string') return deltaObj.text;
  if (!Array.isArray(deltaObj.content)) return '';
  const texts: string[] = [];
  for (const part of deltaObj.content) {
    if (part && typeof part === 'object' && typeof (part as { text?: string }).text === 'string') {
      texts.push((part as { text: string }).text);
    }
  }
  return texts.join('');
}

export function getResponsesStreamTextDelta(payload: Record<string, unknown>): string {
  const type = typeof payload.type === 'string' ? payload.type : '';
  if (!isResponsesTextDeltaType(type)) {
    return '';
  }
  return readDeltaTextPayload(payload.delta);
}

function readReasoningDeltaField(delta: unknown): string {
  if (typeof delta === 'string') return delta;
  if (!delta || typeof delta !== 'object') return '';
  const obj = delta as { text?: unknown; content?: unknown };
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.content === 'string') return obj.content;
  return '';
}

/** Reasoning summary stream deltas (display-only). */
export function getResponsesReasoningStreamDelta(payload: Record<string, unknown>): string {
  const type = typeof payload.type === 'string' ? payload.type : '';
  if (
    type === 'response.reasoning_summary_text.delta' ||
    type === 'response.reasoning_summary_part.delta' ||
    type === 'response.reasoning_text.delta' ||
    type.endsWith('reasoning_summary_text.delta') ||
    type.endsWith('reasoning_summary_part.delta') ||
    type.endsWith('reasoning_text.delta') ||
    type.endsWith('reasoning.delta')
  ) {
    return readReasoningDeltaField(payload.delta);
  }
  return '';
}

function collectReasoningCandidatesFromEvent(payload: Record<string, unknown>): string[] {
  const candidates: string[] = [];
  const nested = payload.response;
  if (nested && typeof nested === 'object') {
    candidates.push(extractResponsesReasoningSummary(nested as Record<string, unknown>));
  }
  candidates.push(extractResponsesReasoningSummary(payload));
  const item = payload.item;
  if (item && typeof item === 'object') {
    candidates.push(readReasoningItemText(item as Record<string, unknown>).join(''));
  }
  return candidates.filter(Boolean);
}

function suffixNotAlreadyHave(best: string, alreadyHave: string): string {
  if (!alreadyHave) return best;
  if (best.startsWith(alreadyHave)) return best.slice(alreadyHave.length);
  if (alreadyHave.includes(best)) return '';
  if (best.length > alreadyHave.length) return best.slice(alreadyHave.length);
  return '';
}

/**
 * Incremental reasoning text from non-delta stream events
 * (response.completed, output_item.done with reasoning item, etc.).
 * Returns only the suffix not already present in `alreadyHave`.
 */
export function harvestResponsesReasoningIncrement(
  payload: Record<string, unknown>,
  alreadyHave = ''
): string {
  const best = collectReasoningCandidatesFromEvent(payload).reduce(
    (a, b) => (b.length > a.length ? b : a),
    ''
  );
  return best ? suffixNotAlreadyHave(best, alreadyHave) : '';
}

function readSummaryTextBlocks(summary: unknown): string[] {
  if (!Array.isArray(summary)) return [];
  const parts: string[] = [];
  for (const block of summary) {
    if (!block || typeof block !== 'object') continue;
    const text = (block as { text?: unknown }).text;
    if (typeof text === 'string' && text) parts.push(text);
  }
  return parts;
}

function readReasoningItemText(item: Record<string, unknown>): string[] {
  if (item.type !== 'reasoning') return [];
  const parts = readSummaryTextBlocks(item.summary);
  // Some gateways put plain text on the reasoning item
  if (typeof item.content === 'string' && item.content.trim()) {
    parts.push(item.content);
  }
  return parts;
}

/**
 * Collect reasoning summary text from a completed Responses payload (non-stream).
 * Shape: output[] items type=reasoning with summary[] { type: summary_text, text }.
 */
export function extractResponsesReasoningSummary(
  data: Record<string, unknown> | null | undefined
): string {
  if (!data || typeof data !== 'object' || !Array.isArray(data.output)) {
    return '';
  }
  const parts: string[] = [];
  for (const item of data.output) {
    if (item && typeof item === 'object') {
      parts.push(...readReasoningItemText(item as Record<string, unknown>));
    }
  }
  return parts.join('');
}

/** response.completed / response.failed terminal events */
export function isResponsesTerminalEvent(payload: Record<string, unknown>): boolean {
  const type = typeof payload.type === 'string' ? payload.type : '';
  return (
    type === 'response.completed' ||
    type === 'response.failed' ||
    type === 'response.incomplete' ||
    type === 'response.done'
  );
}

export function extractResponsesIdFromStreamEvent(
  payload: Record<string, unknown>
): string | undefined {
  const response = payload.response as { id?: unknown } | undefined;
  if (response && typeof response.id === 'string' && response.id.trim()) {
    return response.id.trim();
  }
  // response.created / response.completed often put id on the event root
  const type = typeof payload.type === 'string' ? payload.type : '';
  if (
    (type === 'response.created' ||
      type === 'response.completed' ||
      type === 'response.in_progress') &&
    typeof payload.id === 'string' &&
    payload.id.trim()
  ) {
    return payload.id.trim();
  }
  return undefined;
}
