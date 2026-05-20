import type { ChatMessage } from '@/services/llmService';

export type DeepChatRole = 'user' | 'ai' | 'assistant' | 'system';

export interface DeepChatMessage {
  role?: DeepChatRole;
  text?: string;
  html?: string;
  content?: string;
}

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

function getDeepChatMessageText(message: DeepChatMessage): string {
  const content = message.text || message.content || message.html || '';
  return typeof content === 'string' ? content.trim() : '';
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
