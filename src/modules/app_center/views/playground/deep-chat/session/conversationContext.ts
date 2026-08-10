import type { ChatMessage } from '@/services/llmService';
import { getRuntimeStrategySettings } from '@/services/runtimeStrategyService';
import { normalizePreReplyActivitySteps } from '../request/preReplyActivity';

export type DeepChatRole = 'user' | 'ai' | 'assistant' | 'system';
/**
 * - stopped: user stopped mid-stream
 * - partial: interrupted recovery (no live request; half-reply kept)
 * Live in-flight progress uses generation chrome (正在生成回复...), not a toolbar status.
 */
export type DeepChatMessageStatus = 'stopped' | 'partial';

/** Display-only honesty for vision turns. Count only — never src/base64/names. */
export interface DeepChatAttachmentMeta {
  /** Number of images attached on the turn that produced this user message (1–4). */
  count: number;
}

export interface DeepChatMessage {
  role?: DeepChatRole;
  text?: string;
  html?: string;
  content?: string;
  /**
   * Optional model reasoning / thinking channel text (display-only).
   * Never used as next-turn chat content.
   */
  reasoning?: string;
  /** Generation wall time in whole seconds (for 「已完成 Xs」). */
  reasoningDurationSec?: number;
  /**
   * Pre-reply timeline (tools / status) under 「已完成」 — display-only.
   * Reasoning is also mirrored here for a single collapsible list.
   */
  preReplySteps?: import('../request/preReplyActivity').PreReplyActivityStep[];
  /**
   * Display-only honesty for vision turns. Never contains src/base64/names.
   * Must not be sent as LLM content.
   */
  attachmentMeta?: DeepChatAttachmentMeta;
  createdAt?: number;
  status?: DeepChatMessageStatus;
  /**
   * Push-only incomplete marker (does not change UI badge semantics).
   * Used when timeout content is retained as final text without status=partial.
   */
  assistantPushBlockReason?: 'partial_timeout';
}

export interface BuildStoredThreadMessagesOptions {
  now?: number;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
  /** Push-only incomplete marker for timeout-retained final text. */
  assistantPushBlockReason?: 'partial_timeout';
  /** Display-only reasoning channel for the new assistant message */
  assistantReasoning?: string;
  /** Whole seconds from request start to settle (「已完成 Xs」). */
  assistantReasoningDurationSec?: number;
  /** Tool / pre-reply activity steps (display-only). */
  assistantPreReplySteps?: import('../request/preReplyActivity').PreReplyActivityStep[];
  /** Count-only vision meta stamped onto the newest user turn. */
  userAttachmentMeta?: DeepChatAttachmentMeta;
  maxMessages?: number;
  maxMessageChars?: number;
}

/** Keep finite count 1–4 only; strip unknown keys (src/names/etc.). */
export function normalizeAttachmentMeta(raw: unknown): DeepChatAttachmentMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const count = (raw as { count?: unknown }).count;
  if (typeof count !== 'number' || !Number.isFinite(count)) return undefined;
  const n = Math.round(count);
  if (n < 1 || n > 4) return undefined;
  return { count: n };
}

/** History honesty line: count only, never image bytes. */
export function formatVisionAttachmentMetaLabel(count: number): string {
  return `附 ${count} 张图片（原图未保存）`;
}

/** Display-only: append history honesty line; does not mutate stored messages. */
export function withVisionAttachmentMetaDisplay(messages: DeepChatMessage[]): DeepChatMessage[] {
  return messages.map(message => {
    if (message.role !== 'user' || !message.attachmentMeta?.count) {
      return message;
    }
    const label = formatVisionAttachmentMetaLabel(message.attachmentMeta.count);
    const base = message.text || '';
    if (base.includes(label)) {
      return message;
    }
    return {
      ...message,
      text: `${base}\n${label}`.trim(),
    };
  });
}

export interface NormalizeStoredThreadMessagesOptions {
  fallbackCreatedAt?: number;
  maxMessages?: number;
  maxMessageChars?: number;
}

export const DEFAULT_MAX_THREAD_MESSAGE_COUNT = 80;

export function mergeThreadHistoryWithRequest(
  threadMessages: DeepChatMessage[],
  requestMessages: ChatMessage[]
): ChatMessage[] {
  if (requestMessages.length === 0) {
    return [];
  }

  const historyMessages = threadMessages
    .map((message): ChatMessage | null => {
      const content = getDeepChatMessageText(message);
      if (!content || message.role === 'system') {
        return null;
      }

      return {
        role: toChatRole(message.role),
        content,
      };
    })
    .filter((message): message is ChatMessage => message !== null);

  if (historyMessages.length === 0 || requestContainsHistory(requestMessages, historyMessages)) {
    return requestMessages;
  }

  return [...historyMessages, ...requestMessages];
}

function buildAssistantStoredMessage(
  assistantText: string,
  now: number,
  options: BuildStoredThreadMessagesOptions
): DeepChatMessage {
  const reasoning = options.assistantReasoning?.trim();
  const durationSec = options.assistantReasoningDurationSec;
  const preReplySteps = normalizePreReplyActivitySteps(
    options.assistantPreReplySteps,
    options.maxMessageChars
  );
  return {
    role: 'ai',
    text: truncateStoredMessage(assistantText, options.maxMessageChars),
    createdAt: getFiniteTimestamp(options.assistantCreatedAt, now),
    // Only persist incomplete markers; omit status when settled (clears 「未完成」).
    ...(options.assistantStatus === 'stopped' || options.assistantStatus === 'partial'
      ? { status: options.assistantStatus }
      : {}),
    ...(options.assistantPushBlockReason === 'partial_timeout'
      ? { assistantPushBlockReason: 'partial_timeout' as const }
      : {}),
    ...(reasoning ? { reasoning: truncateStoredMessage(reasoning, options.maxMessageChars) } : {}),
    ...(typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0
      ? { reasoningDurationSec: Math.max(0, Math.round(durationSec)) }
      : {}),
    ...(preReplySteps ? { preReplySteps } : {}),
  };
}

function stampUserAttachmentMeta(
  storedMessages: DeepChatMessage[],
  userAttachmentMeta: DeepChatAttachmentMeta | undefined
): void {
  if (!userAttachmentMeta) return;
  for (let i = storedMessages.length - 1; i >= 0; i--) {
    const msg = storedMessages[i];
    if (msg?.role === 'user') {
      storedMessages[i] = { ...msg, attachmentMeta: userAttachmentMeta };
      return;
    }
  }
}

export function buildStoredThreadMessages(
  existingMessages: DeepChatMessage[],
  conversationMessages: ChatMessage[],
  assistantText = '',
  options: BuildStoredThreadMessagesOptions = {}
): DeepChatMessage[] {
  const now = getFiniteTimestamp(options.now, Date.now());
  const usedExistingIndexes = new Set<number>();
  const storedMessages: DeepChatMessage[] = conversationMessages
    .filter(message => message.role !== 'system')
    .map((message): DeepChatMessage => {
      const role = fromChatRole(message.role);
      const text = truncateStoredMessage(
        typeof message.content === 'string' ? message.content : '',
        options.maxMessageChars
      );
      const existingMessage = findExistingStoredMessage(
        existingMessages,
        role,
        text,
        usedExistingIndexes,
        options.maxMessageChars
      );

      if (existingMessage) {
        const normalizedExistingMessage = normalizeStoredMessage(existingMessage, {
          fallbackCreatedAt: now,
          maxMessageChars: options.maxMessageChars,
        });
        if (normalizedExistingMessage) {
          return normalizedExistingMessage;
        }
      }

      return {
        role,
        text,
        createdAt: now,
      };
    });

  const trimmedAssistantText = assistantText.trim();
  if (trimmedAssistantText) {
    storedMessages.push(buildAssistantStoredMessage(trimmedAssistantText, now, options));
  }

  // Carry over persisted system notices (model-switch hints) so they survive
  // every save and stay in display order with user/AI turns.
  const carriedNotices = carryOverSystemDisplayMessages(existingMessages, options.maxMessageChars);
  if (carriedNotices.length > 0) {
    storedMessages.push(...carriedNotices);
    storedMessages.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }

  // Stamp count-only meta onto newest user turn (never image bytes / names).
  stampUserAttachmentMeta(storedMessages, normalizeAttachmentMeta(options.userAttachmentMeta));

  return limitStoredMessages(storedMessages, options.maxMessages);
}

export function normalizeStoredThreadMessages(
  messages: DeepChatMessage[],
  options: NormalizeStoredThreadMessagesOptions = {}
): DeepChatMessage[] {
  const fallbackCreatedAt = getFiniteTimestamp(options.fallbackCreatedAt, Date.now());
  const normalizedMessages = messages
    .map(message =>
      normalizeStoredMessage(message, {
        fallbackCreatedAt,
        maxMessageChars: options.maxMessageChars,
      })
    )
    .filter((message): message is DeepChatMessage => message !== null);

  return limitStoredMessages(normalizedMessages, options.maxMessages);
}

export function getDeepChatMessageText(message: DeepChatMessage): string {
  const content = message.text || message.content || message.html || '';
  return typeof content === 'string' ? content.trim() : '';
}

function normalizeReasoningDurationSec(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.max(0, Math.round(value));
}

function normalizeAssistantPushBlockReason(
  value: DeepChatMessage['assistantPushBlockReason']
): 'partial_timeout' | undefined {
  return value === 'partial_timeout' ? 'partial_timeout' : undefined;
}

function normalizeStoredMessageStatus(
  value: DeepChatMessage['status']
): DeepChatMessageStatus | undefined {
  return value === 'stopped' || value === 'partial' ? value : undefined;
}

function optionalStoredMessageFields(
  message: DeepChatMessage,
  maxMessageChars: number | undefined
): Partial<DeepChatMessage> {
  const reasoning = typeof message.reasoning === 'string' ? message.reasoning.trim() : '';
  const durationSec = normalizeReasoningDurationSec(message.reasoningDurationSec);
  const status = normalizeStoredMessageStatus(message.status);
  const pushBlock = normalizeAssistantPushBlockReason(message.assistantPushBlockReason);
  const preReplySteps = normalizePreReplyActivitySteps(message.preReplySteps, maxMessageChars);
  const attachmentMeta = normalizeAttachmentMeta(message.attachmentMeta);
  return {
    ...(reasoning ? { reasoning: truncateStoredMessage(reasoning, maxMessageChars) } : {}),
    ...(durationSec !== undefined ? { reasoningDurationSec: durationSec } : {}),
    ...(status ? { status } : {}),
    ...(pushBlock ? { assistantPushBlockReason: pushBlock } : {}),
    ...(preReplySteps ? { preReplySteps } : {}),
    ...(attachmentMeta ? { attachmentMeta } : {}),
  };
}

function normalizeStoredMessage(
  message: DeepChatMessage,
  options: Required<Pick<NormalizeStoredThreadMessagesOptions, 'fallbackCreatedAt'>> &
    Pick<NormalizeStoredThreadMessagesOptions, 'maxMessageChars'>
): DeepChatMessage | null {
  const text = truncateStoredMessage(getDeepChatMessageText(message), options.maxMessageChars);
  if (!text) {
    return null;
  }

  return {
    role: message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'ai',
    text,
    createdAt: getFiniteTimestamp(message.createdAt, options.fallbackCreatedAt),
    ...optionalStoredMessageFields(message, options.maxMessageChars),
  };
}

/**
 * 存量 system 通知（模型切换提示等）跨保存透传：从 existingMessages 过滤角色为
 * system 且文本非空的展示性消息，按 createdAt 与当轮消息稳定合并排序。
 * 通知仅展示不发送：mergeThreadHistoryWithRequest 仍丢弃 system 角色。
 */
export function carryOverSystemDisplayMessages(
  existingMessages: DeepChatMessage[],
  maxMessageChars?: number
): DeepChatMessage[] {
  const carried: DeepChatMessage[] = [];
  for (const message of existingMessages) {
    if (message.role !== 'system') {
      continue;
    }
    const normalized = normalizeStoredMessage(message, {
      fallbackCreatedAt: 0,
      maxMessageChars,
    });
    if (normalized) {
      carried.push(normalized);
    }
  }
  return carried.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

function findExistingStoredMessage(
  existingMessages: DeepChatMessage[],
  role: DeepChatMessage['role'],
  text: string,
  usedExistingIndexes: Set<number>,
  maxMessageChars: number | undefined
): DeepChatMessage | null {
  const normalizedText = truncateStoredMessage(text, maxMessageChars);

  for (let index = 0; index < existingMessages.length; index++) {
    if (usedExistingIndexes.has(index)) {
      continue;
    }

    const existingMessage = existingMessages[index];
    if (!existingMessage) {
      continue;
    }

    const existingRole = existingMessage.role === 'user' ? 'user' : 'ai';
    const existingText = truncateStoredMessage(
      getDeepChatMessageText(existingMessage),
      maxMessageChars
    );
    if (existingRole === role && existingText === normalizedText) {
      usedExistingIndexes.add(index);
      return existingMessage;
    }
  }

  return null;
}

function fromChatRole(role: ChatMessage['role']): DeepChatMessage['role'] {
  return role === 'user' ? 'user' : 'ai';
}

function truncateStoredMessage(value: string, maxMessageChars?: number): string {
  const normalizedValue = value.trim();
  if (!hasFiniteMessageLimit(maxMessageChars)) {
    return normalizedValue;
  }

  if (normalizedValue.length <= maxMessageChars) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxMessageChars).trimEnd()}\n\n[内容已截断，仅保留前 ${maxMessageChars.toLocaleString('zh-CN')} 字]`;
}

function hasFiniteMessageLimit(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function limitStoredMessages(
  messages: DeepChatMessage[],
  maxMessages = getRuntimeStrategySettings().deepChat.maxThreadMessageCount
): DeepChatMessage[] {
  return maxMessages > 0 ? messages.slice(-maxMessages) : messages;
}

function getFiniteTimestamp(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function requestContainsHistory(
  requestMessages: ChatMessage[],
  historyMessages: ChatMessage[]
): boolean {
  if (requestMessages.length < historyMessages.length) {
    return false;
  }

  return historyMessages.every((historyMessage, index) => {
    const requestMessage = requestMessages[index];
    return Boolean(
      requestMessage &&
      requestMessage.role === historyMessage.role &&
      requestMessage.content === historyMessage.content
    );
  });
}

function toChatRole(role: DeepChatRole | undefined): ChatMessage['role'] {
  if (role === 'system') {
    return 'system';
  }

  if (role === 'user') {
    return 'user';
  }

  return 'assistant';
}
