import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/services/llmService';
import {
  DEFAULT_PLAYGROUND_REQUEST_BUDGET,
  buildBudgetedPlaygroundMessages,
  getPlaygroundMessageBudgetError,
  getPlaygroundSystemPromptBudgetError,
  type PlaygroundRequestBudget,
} from './requestBudget';

const smallBudget: PlaygroundRequestBudget = {
  maxMessageChars: 12,
  maxSystemPromptChars: 10,
  maxContextChars: 30,
  maxOutputTokens: 100,
};

describe('Playground request budget', () => {
  it('uses the raised default request budget for playground chat', () => {
    expect(DEFAULT_PLAYGROUND_REQUEST_BUDGET.maxMessageChars).toBe(24000);
    expect(DEFAULT_PLAYGROUND_REQUEST_BUDGET.maxContextChars).toBe(64000);
  });

  it('rejects messages and system prompts that exceed configured limits', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'this message is too long' }];

    expect(getPlaygroundMessageBudgetError(messages, smallBudget)).toContain('12');
    expect(getPlaygroundSystemPromptBudgetError('system prompt too long', smallBudget)).toContain(
      '10'
    );
  });

  it('replaces an existing system prompt with the current session prompt', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'old system' },
      { role: 'user', content: 'question' },
    ];

    const result = buildBudgetedPlaygroundMessages(messages, 'new system', {
      ...smallBudget,
      maxContextChars: 100,
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'new system' },
      { role: 'user', content: 'question' },
    ]);
    expect(result.droppedMessageCount).toBe(0);
  });

  it('keeps the newest conversation messages within the total context budget', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'old question' },
      { role: 'assistant', content: 'old answer' },
      { role: 'user', content: 'latest question' },
      { role: 'assistant', content: 'latest answer' },
    ];

    const result = buildBudgetedPlaygroundMessages(messages, '', smallBudget);

    expect(result.messages).toEqual([
      { role: 'user', content: 'latest question' },
      { role: 'assistant', content: 'latest answer' },
    ]);
    expect(result.droppedMessageCount).toBe(2);
  });

  it('preserves the newest message even when it alone exceeds the remaining context budget', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'old' },
      { role: 'user', content: 'latest question is long' },
    ];

    const result = buildBudgetedPlaygroundMessages(messages, 'system', {
      ...smallBudget,
      maxMessageChars: 100,
      maxContextChars: 8,
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'latest question is long' },
    ]);
    expect(result.droppedMessageCount).toBe(1);
  });
});
