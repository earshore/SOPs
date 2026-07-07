import type { ChatMessage } from '@/services/llmService';
import { getRuntimeStrategySettings } from '@/services/runtimeStrategyService';
import type { LLMProviderConfig } from '@/types/state';

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
  maxMessageChars: 153600,
  maxSystemPromptChars: 102400,
  maxContextChars: 128000,
  maxOutputTokens: 2000,
};

export function getPlaygroundRequestBudgetDefaults(): PlaygroundRequestBudget {
  const settings = getRuntimeStrategySettings().deepChat;
  return {
    maxMessageChars: settings.maxMessageChars,
    maxSystemPromptChars: settings.maxSystemPromptChars,
    maxContextChars: settings.maxContextChars,
    maxOutputTokens: settings.maxOutputTokens,
  };
}

const DEFAULT_CONTEXT_WINDOW_TOKENS = 128000;
const MIN_INPUT_CONTEXT_TOKENS = 12000;
const MAX_INPUT_CONTEXT_TOKENS = 32000;
const CONTEXT_TARGET_RATIO = 0.35;
const CONTEXT_SAFETY_TOKENS = 1000;
const APPROX_CHARS_PER_TOKEN = 4;
const SINGLE_MESSAGE_OVERFLOW_RATIO = 1.2;
const SYSTEM_PROMPT_CONTEXT_RATIO = 0.8;

export function resolvePlaygroundRequestBudget(
  config: LLMProviderConfig | null,
  model: string
): PlaygroundRequestBudget {
  const configuredBudget = getPlaygroundRequestBudgetDefaults();
  const contextTokens = getModelContextTokens(config, model) || DEFAULT_CONTEXT_WINDOW_TOKENS;
  const availableInputTokens = Math.max(
    1000,
    contextTokens - configuredBudget.maxOutputTokens - CONTEXT_SAFETY_TOKENS
  );
  const targetInputTokens = Math.min(
    availableInputTokens,
    Math.max(MIN_INPUT_CONTEXT_TOKENS, Math.floor(contextTokens * CONTEXT_TARGET_RATIO)),
    MAX_INPUT_CONTEXT_TOKENS
  );
  const maxContextChars = Math.min(
    configuredBudget.maxContextChars,
    Math.max(4000, targetInputTokens * APPROX_CHARS_PER_TOKEN)
  );

  return {
    maxContextChars,
    maxMessageChars: Math.min(
      configuredBudget.maxMessageChars || Number.MAX_SAFE_INTEGER,
      Math.floor(maxContextChars * SINGLE_MESSAGE_OVERFLOW_RATIO)
    ),
    maxSystemPromptChars: Math.min(
      configuredBudget.maxSystemPromptChars || Number.MAX_SAFE_INTEGER,
      Math.floor(maxContextChars * SYSTEM_PROMPT_CONTEXT_RATIO)
    ),
    maxOutputTokens: configuredBudget.maxOutputTokens,
  };
}

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

function getModelContextTokens(config: LLMProviderConfig | null, model: string): number | null {
  const modelConfig = config?.models?.find(item => {
    return typeof item === 'object' && item.id === model;
  });

  if (!modelConfig || typeof modelConfig === 'string') {
    return null;
  }

  return Number.isFinite(modelConfig.context) && modelConfig.context
    ? Math.max(1, Math.floor(modelConfig.context))
    : null;
}
