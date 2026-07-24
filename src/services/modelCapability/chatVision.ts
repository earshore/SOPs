/**
 * Map product vision parts onto Chat Completions user message content parts.
 * Official chat shape: { type: "image_url", image_url: { url, detail? } }
 */

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

function isImageDetail(value: unknown): value is 'auto' | 'low' | 'high' {
  return value === 'auto' || value === 'low' || value === 'high';
}

function fromChatShapedImagePart(part: Record<string, unknown>): ChatContentPart | null {
  if (part.type !== 'image_url' || !part.image_url || typeof part.image_url !== 'object') {
    return null;
  }
  const img = part.image_url as { url?: unknown; detail?: unknown };
  if (typeof img.url !== 'string' || !img.url) return null;
  return {
    type: 'image_url',
    image_url: {
      url: img.url,
      ...(isImageDetail(img.detail) ? { detail: img.detail } : {}),
    },
  };
}

function readInputImageUrl(part: Record<string, unknown>): string {
  if (typeof part.image_url === 'string') return part.image_url;
  const nested = part.image_url as { url?: string } | undefined;
  if (typeof nested?.url === 'string') return nested.url;
  if (typeof part.url === 'string') return part.url;
  return '';
}

function fromResponsesInputImage(part: Record<string, unknown>): ChatContentPart | null {
  if (part.type !== 'input_image') return null;
  const url = readInputImageUrl(part);
  if (!url) return null;
  return { type: 'image_url', image_url: { url } };
}

function mapOneVisionPart(part: Record<string, unknown>): ChatContentPart | null {
  return fromChatShapedImagePart(part) ?? fromResponsesInputImage(part);
}

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
    const mapped = mapOneVisionPart(part);
    if (mapped) out.push(mapped);
  }
  return out;
}

function userContentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return '';
  return String(content ?? '');
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
    const text = userContentToText(row.content);
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
