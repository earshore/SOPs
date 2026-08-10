import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/services/llmService';
import type { LLMProviderConfig } from '@/types/state';
import {
  DEFAULT_DEEP_CHAT_REQUEST_BUDGET,
  DEEP_CHAT_REASONING_MAX_OUTPUT_TOKENS_FLOOR,
  buildBudgetedDeepChatMessages,
  getDeepChatMessageBudgetError,
  getDeepChatSystemPromptBudgetError,
  resolveDeepChatMaxOutputTokens,
  resolveDeepChatRequestBudget,
  type DeepChatRequestBudget,
} from './budget';

const smallBudget: DeepChatRequestBudget = {
  maxMessageChars: 12,
  maxSystemPromptChars: 10,
  maxContextChars: 30,
  maxOutputTokens: 100,
};

describe('Playground request budget', () => {
  it('raises max_output_tokens when reasoning is enabled vs default off', () => {
    const off = resolveDeepChatMaxOutputTokens(
      DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxOutputTokens,
      false
    );
    const on = resolveDeepChatMaxOutputTokens(
      DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxOutputTokens,
      true
    );
    expect(off).toBe(DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxOutputTokens);
    expect(on).toBeGreaterThan(off);
    expect(on).toBe(DEEP_CHAT_REASONING_MAX_OUTPUT_TOKENS_FLOOR);
    expect(DEEP_CHAT_REASONING_MAX_OUTPUT_TOKENS_FLOOR).toBeGreaterThanOrEqual(8192);
    // Already-high base is preserved (not reduced).
    expect(resolveDeepChatMaxOutputTokens(20000, true)).toBe(20000);
  });

  it('keeps long prompt inputs sendable under the default dynamic budget', () => {
    const longMessages: ChatMessage[] = [{ role: 'user', content: 'x'.repeat(80000) }];

    expect(DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxMessageChars).toBe(153600);
    expect(DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxSystemPromptChars).toBe(102400);
    expect(DEFAULT_DEEP_CHAT_REQUEST_BUDGET.maxContextChars).toBe(128000);
    expect(getDeepChatMessageBudgetError(longMessages)).toBeNull();
    expect(getDeepChatSystemPromptBudgetError('system'.repeat(10000))).toBeNull();
  });

  it('derives a smaller context budget for small-context models', () => {
    const smallModelBudget = resolveDeepChatRequestBudget(
      {
        provider: 'new_api',
        endpoint: 'https://example.com/v1',
        apiKey: 'test',
        model: 'small-model',
        models: [{ id: 'small-model', context: 16000 }],
        enabled: true,
      },
      'small-model'
    );
    const largeModelBudget = resolveDeepChatRequestBudget(
      {
        provider: 'new_api',
        endpoint: 'https://example.com/v1',
        apiKey: 'test',
        model: 'large-model',
        models: [{ id: 'large-model', context: 128000 }],
        enabled: true,
      },
      'large-model'
    );

    expect(smallModelBudget.maxContextChars).toBe(48000);
    expect(smallModelBudget.maxMessageChars).toBe(57600);
    expect(largeModelBudget.maxContextChars).toBe(128000);
  });

  it('tightens input budget when reasoning raises max_output_tokens on small context', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.com/v1',
      apiKey: 'test',
      model: 'small-model',
      models: [{ id: 'small-model', context: 16000 }],
      enabled: true,
    } as LLMProviderConfig;

    const off = resolveDeepChatRequestBudget(config, 'small-model', false);
    const on = resolveDeepChatRequestBudget(config, 'small-model', true);

    expect(off.maxContextChars).toBe(48000);
    expect(on.maxContextChars).toBeLessThan(off.maxContextChars);
    // effective output must be reflected (clamped to leave room in context)
    expect(on.maxOutputTokens).toBeGreaterThan(off.maxOutputTokens);
    expect(on.maxOutputTokens).toBeLessThanOrEqual(16000 - 1000 - 1);

    const longListing = 'x'.repeat(off.maxContextChars);
    expect(
      getDeepChatMessageBudgetError([{ role: 'user', content: longListing }], on)
    ).not.toBeNull();
  });

  it('fail-closes when reasoning output floor would exhaust the context window', () => {
    const config = {
      provider: 'new_api',
      endpoint: 'https://example.com/v1',
      apiKey: 'test',
      model: 'tiny',
      models: [{ id: 'tiny', context: 8000 }],
      enabled: true,
    } as LLMProviderConfig;

    const budget = resolveDeepChatRequestBudget(config, 'tiny', true);
    // Cannot invent 1000 free input tokens when output already fills the window
    expect(budget.maxContextChars).toBeLessThanOrEqual(4000);
    expect(budget.maxOutputTokens + 1000).toBeLessThanOrEqual(8000);
  });

  it('rejects messages and system prompts when an explicit budget limit is configured', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'this message is too long' }];

    expect(getDeepChatMessageBudgetError(messages, smallBudget)).toContain('12');
    expect(getDeepChatSystemPromptBudgetError('system prompt too long', smallBudget)).toContain(
      '10'
    );
  });

  it('replaces an existing system prompt with the current session prompt', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'old system' },
      { role: 'user', content: 'question' },
    ];

    const result = buildBudgetedDeepChatMessages(messages, 'new system', {
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

    const result = buildBudgetedDeepChatMessages(messages, '', smallBudget);

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

    const result = buildBudgetedDeepChatMessages(messages, 'system', {
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
