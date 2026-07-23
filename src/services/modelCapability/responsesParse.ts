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
    if (b.type === 'output_text' && typeof b.text === 'string') {
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

export function extractResponsesOutputText(
  data: Record<string, unknown> | null | undefined
): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  return collectOutputTextFromItems(data.output);
}

/**
 * Extract visible text delta from a Responses SSE data payload.
 * Ignores reasoning_summary / reasoning item events.
 */
export function getResponsesStreamTextDelta(payload: Record<string, unknown>): string {
  const type = typeof payload.type === 'string' ? payload.type : '';

  const isTextDelta =
    type === 'response.output_text.delta' ||
    type === 'response.content_part.delta' ||
    type.endsWith('output_text.delta');

  if (!isTextDelta) {
    return '';
  }

  if (typeof payload.delta === 'string') {
    return payload.delta;
  }
  const deltaObj = payload.delta as { text?: unknown } | undefined;
  if (deltaObj && typeof deltaObj.text === 'string') {
    return deltaObj.text;
  }
  return '';
}
