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
  createdAt?: number;
  status?: DeepChatMessageStatus;
}

export interface BuildStoredThreadMessagesOptions {
  now?: number;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
  /** Display-only reasoning channel for the new assistant message */
  assistantReasoning?: string;
  /** Whole seconds from request start to settle (「已完成 Xs」). */
  assistantReasoningDurationSec?: number;
  /** Tool / pre-reply activity steps (display-only). */
  assistantPreReplySteps?: import('../request/preReplyActivity').PreReplyActivityStep[];
  maxMessages?: number;
  maxMessageChars?: number;
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
    const reasoning = options.assistantReasoning?.trim();
    const durationSec = options.assistantReasoningDurationSec;
    const preReplySteps = normalizePreReplyActivitySteps(
      options.assistantPreReplySteps,
      options.maxMessageChars
    );
    storedMessages.push({
      role: 'ai',
      text: truncateStoredMessage(trimmedAssistantText, options.maxMessageChars),
      createdAt: getFiniteTimestamp(options.assistantCreatedAt, now),
      // Only persist incomplete markers; omit status when settled (clears 「未完成」).
      ...(options.assistantStatus === 'stopped' || options.assistantStatus === 'partial'
        ? { status: options.assistantStatus }
        : {}),
      ...(reasoning
        ? { reasoning: truncateStoredMessage(reasoning, options.maxMessageChars) }
        : {}),
      ...(typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0
        ? { reasoningDurationSec: Math.max(0, Math.round(durationSec)) }
        : {}),
      ...(preReplySteps ? { preReplySteps } : {}),
    });
  }

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

function normalizeStoredMessage(
  message: DeepChatMessage,
  options: Required<Pick<NormalizeStoredThreadMessagesOptions, 'fallbackCreatedAt'>> &
    Pick<NormalizeStoredThreadMessagesOptions, 'maxMessageChars'>
): DeepChatMessage | null {
  const text = truncateStoredMessage(getDeepChatMessageText(message), options.maxMessageChars);
  if (!text || message.role === 'system') {
    return null;
  }

  const reasoning = typeof message.reasoning === 'string' ? message.reasoning.trim() : '';
  const durationSec = normalizeReasoningDurationSec(message.reasoningDurationSec);
  const status =
    message.status === 'stopped' || message.status === 'partial' ? message.status : undefined;
  const preReplySteps = normalizePreReplyActivitySteps(
    message.preReplySteps,
    options.maxMessageChars
  );
  return {
    role: message.role === 'user' ? 'user' : 'ai',
    text,
    createdAt: getFiniteTimestamp(message.createdAt, options.fallbackCreatedAt),
    ...(reasoning ? { reasoning: truncateStoredMessage(reasoning, options.maxMessageChars) } : {}),
    ...(durationSec !== undefined ? { reasoningDurationSec: durationSec } : {}),
    ...(status ? { status } : {}),
    ...(preReplySteps ? { preReplySteps } : {}),
  };
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
