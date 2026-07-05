import type { ChatMessage } from '@/services/llmService';

export type DeepChatRole = 'user' | 'ai' | 'assistant' | 'system';
export type DeepChatMessageStatus = 'stopped';

export interface DeepChatMessage {
  role?: DeepChatRole;
  text?: string;
  html?: string;
  content?: string;
  createdAt?: number;
  status?: DeepChatMessageStatus;
}

export interface BuildStoredThreadMessagesOptions {
  now?: number;
  assistantCreatedAt?: number;
  assistantStatus?: DeepChatMessageStatus;
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
      const text = truncateStoredMessage(message.content, options.maxMessageChars);
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
    storedMessages.push({
      role: 'ai',
      text: truncateStoredMessage(trimmedAssistantText, options.maxMessageChars),
      createdAt: getFiniteTimestamp(options.assistantCreatedAt, now),
      status: options.assistantStatus,
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

function normalizeStoredMessage(
  message: DeepChatMessage,
  options: Required<Pick<NormalizeStoredThreadMessagesOptions, 'fallbackCreatedAt'>> &
    Pick<NormalizeStoredThreadMessagesOptions, 'maxMessageChars'>
): DeepChatMessage | null {
  const text = truncateStoredMessage(getDeepChatMessageText(message), options.maxMessageChars);
  if (!text || message.role === 'system') {
    return null;
  }

  return {
    role: message.role === 'user' ? 'user' : 'ai',
    text,
    createdAt: getFiniteTimestamp(message.createdAt, options.fallbackCreatedAt),
    ...(message.status === 'stopped' && { status: 'stopped' as const }),
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
  maxMessages = DEFAULT_MAX_THREAD_MESSAGE_COUNT
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
