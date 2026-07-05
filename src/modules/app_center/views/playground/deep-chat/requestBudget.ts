import type { ChatMessage } from '@/services/llmService';

export interface PlaygroundRequestBudget {
  maxMessageChars?: number;
  maxSystemPromptChars?: number;
  maxContextChars: number;
  maxOutputTokens: number;
}

export interface BudgetedPlaygroundMessages {
  messages: ChatMessage[];
  droppedMessageCount: number;
}

export const DEFAULT_PLAYGROUND_REQUEST_BUDGET: PlaygroundRequestBudget = {
  maxContextChars: 200000,
  maxOutputTokens: 2000,
};

export function getPlaygroundMessageBudgetError(
  messages: ChatMessage[],
  budget: PlaygroundRequestBudget = DEFAULT_PLAYGROUND_REQUEST_BUDGET
): string | null {
  const maxMessageChars = budget.maxMessageChars;
  if (!hasFiniteBudgetLimit(maxMessageChars)) {
    return null;
  }

  const oversizedMessage = messages.find(message => message.content.length > maxMessageChars);
  if (!oversizedMessage) {
    return null;
  }

  return `单条消息不能超过 ${formatBudgetNumber(maxMessageChars)} 字，请缩短后再发送。`;
}

export function getPlaygroundSystemPromptBudgetError(
  systemPrompt: string,
  budget: PlaygroundRequestBudget = DEFAULT_PLAYGROUND_REQUEST_BUDGET
): string | null {
  const maxSystemPromptChars = budget.maxSystemPromptChars;
  if (!hasFiniteBudgetLimit(maxSystemPromptChars)) {
    return null;
  }

  if (systemPrompt.trim().length <= maxSystemPromptChars) {
    return null;
  }

  return `系统提示词不能超过 ${formatBudgetNumber(maxSystemPromptChars)} 字，请缩短后再发送。`;
}

export function buildBudgetedPlaygroundMessages(
  conversationMessages: ChatMessage[],
  sessionSystemPrompt = '',
  budget: PlaygroundRequestBudget = DEFAULT_PLAYGROUND_REQUEST_BUDGET
): BudgetedPlaygroundMessages {
  const messagesWithSystemPrompt = withSessionSystemPrompt(
    conversationMessages,
    sessionSystemPrompt
  );
  const firstSystemMessage =
    messagesWithSystemPrompt[0]?.role === 'system' ? messagesWithSystemPrompt[0] : null;
  const tailMessages = firstSystemMessage
    ? messagesWithSystemPrompt.slice(1)
    : messagesWithSystemPrompt;
  const tailBudget = Math.max(0, budget.maxContextChars - getMessageCharCount(firstSystemMessage));
  const keptTailMessages = takeNewestMessagesWithinBudget(tailMessages, tailBudget);
  const messages = firstSystemMessage
    ? [firstSystemMessage, ...keptTailMessages]
    : keptTailMessages;

  return {
    messages,
    droppedMessageCount: tailMessages.length - keptTailMessages.length,
  };
}

function withSessionSystemPrompt(
  messages: ChatMessage[],
  sessionSystemPrompt: string
): ChatMessage[] {
  const withoutEmptySystem = messages.filter(
    message => message.role !== 'system' || message.content.trim()
  );
  const systemPrompt = sessionSystemPrompt.trim();

  if (!systemPrompt) {
    return withoutEmptySystem;
  }

  if (withoutEmptySystem[0]?.role === 'system') {
    return [{ role: 'system', content: systemPrompt }, ...withoutEmptySystem.slice(1)];
  }

  return [{ role: 'system', content: systemPrompt }, ...withoutEmptySystem];
}

function takeNewestMessagesWithinBudget(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let usedChars = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    const nextUsedChars = usedChars + getMessageCharCount(message);
    if (kept.length > 0 && nextUsedChars > maxChars) {
      break;
    }

    if (kept.length === 0 || nextUsedChars <= maxChars) {
      kept.unshift(message);
      usedChars = nextUsedChars;
    }
  }

  return kept;
}

function getMessageCharCount(message: ChatMessage | null): number {
  return message ? message.content.length : 0;
}

function hasFiniteBudgetLimit(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatBudgetNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}
