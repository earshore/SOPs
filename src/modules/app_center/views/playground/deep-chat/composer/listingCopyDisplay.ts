import { isListingPromptContext, sanitizeListingCopy } from './listingCopySanitize';
import { getDeepChatMessageText, type DeepChatMessage } from '../session/conversationContext';

/**
 * 渲染层净化（单条文本）：Listing 工作流下，把模型写进正文开头的自我审查/开场说明
 * （实测 "Ich habe die Briefings ... geprüft." 约 491 字符后才出现 "1. Title"）从展示文本中剥离。
 * 只作用于展示（历史 history / 流式 addMessage 入口），不改存储原文。
 * 非 Listing 上下文，或未命中明确正文起始标记时原样返回（保守，不误伤普通聊天）。
 */
export function resolveListingDisplayText(raw: string, activeContext?: unknown): string {
  if (!isListingPromptContext(activeContext)) return raw;
  const sanitized = sanitizeListingCopy(raw);
  return sanitized === raw ? raw : sanitized;
}

/**
 * 对「展示消息列表」逐条净化：只克隆被净化的 AI 消息（user / reasoning 不动），
 * 其余元素复用原引用；无变化时直接返回原数组，避免普通聊天路径产生无谓分配。
 */
export function withListingDisplaySanitize(
  messages: DeepChatMessage[],
  activeContext?: unknown
): DeepChatMessage[] {
  if (!isListingPromptContext(activeContext)) return messages;
  let changed = false;
  const nextMessages = messages.map(message => {
    if (message.role !== 'ai') return message;
    const raw = getDeepChatMessageText(message);
    const sanitized = resolveListingDisplayText(raw, activeContext);
    if (sanitized === raw) return message;
    changed = true;
    return { ...message, text: sanitized };
  });
  return changed ? nextMessages : messages;
}
