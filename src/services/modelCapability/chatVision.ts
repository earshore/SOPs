/**
 * Map product vision parts onto Chat Completions user message content parts.
 * Official chat shape: { type: "image_url", image_url: { url, detail? } }
 */

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

/**
 * Convert Responses-style or generic vision parts to chat image_url parts.
 */
export function toChatImageUrlParts(
  visionUserParts: Array<Record<string, unknown>> | undefined
): ChatContentPart[] {
  if (!visionUserParts?.length) return [];
  const out: ChatContentPart[] = [];
  for (const part of visionUserParts) {
    if (!part || typeof part !== 'object') continue;
    // Already chat-shaped
    if (part.type === 'image_url' && part.image_url && typeof part.image_url === 'object') {
      const img = part.image_url as { url?: unknown; detail?: unknown };
      if (typeof img.url === 'string' && img.url) {
        out.push({
          type: 'image_url',
          image_url: {
            url: img.url,
            ...(img.detail === 'auto' || img.detail === 'low' || img.detail === 'high'
              ? { detail: img.detail }
              : {}),
          },
        });
      }
      continue;
    }
    // Responses-style input_image
    if (part.type === 'input_image') {
      const url =
        typeof part.image_url === 'string'
          ? part.image_url
          : typeof (part as { image_url?: { url?: string } }).image_url?.url === 'string'
            ? (part as { image_url: { url: string } }).image_url.url
            : typeof part.url === 'string'
              ? part.url
              : '';
      if (url) {
        out.push({ type: 'image_url', image_url: { url } });
      }
    }
  }
  return out;
}

/**
 * Apply vision parts to the last user message in a chat messages array.
 * Replaces string content with [text?, ...image_url parts].
 */
export function applyVisionPartsToChatMessages(
  messages: Array<Record<string, unknown>>,
  visionUserParts: Array<Record<string, unknown>> | undefined
): Array<Record<string, unknown>> {
  const imageParts = toChatImageUrlParts(visionUserParts);
  if (imageParts.length === 0) return messages;

  const next = messages.map(m => ({ ...m }));
  for (let i = next.length - 1; i >= 0; i--) {
    const row = next[i];
    if (row?.role !== 'user') continue;
    const text =
      typeof row.content === 'string'
        ? row.content
        : Array.isArray(row.content)
          ? ''
          : String(row.content ?? '');
    const parts: ChatContentPart[] = [];
    if (text.trim()) {
      parts.push({ type: 'text', text });
    }
    parts.push(...imageParts);
    next[i] = { ...row, content: parts };
    break;
  }
  return next;
}
