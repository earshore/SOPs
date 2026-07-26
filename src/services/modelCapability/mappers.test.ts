import { describe, expect, it } from 'vitest';
import {
  mapAnthropicOutputEffort,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
  readThinkingBudgetTokens,
} from './mappers';

describe('multi-protocol mappers', () => {
  it('openai effort omits when off', () => {
    expect(mapOpenAiReasoningEffort({ enabled: false, effort: 'high' })).toEqual({});
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'high' })).toEqual({
      reasoning_effort: 'high',
    });
  });

  it('responses reasoning object requests summary channel for UI', () => {
    expect(mapResponsesReasoning({ enabled: true, effort: 'low' })).toEqual({
      reasoning: { effort: 'low', summary: 'auto' },
    });
    expect(mapResponsesReasoning({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('anthropic official output_config.effort (not extra)', () => {
    expect(mapAnthropicOutputEffort({ enabled: true, effort: 'xhigh' })).toEqual({
      output_config: { effort: 'xhigh' },
    });
    expect(mapAnthropicOutputEffort({ enabled: true, effort: 'max' })).toEqual({
      output_config: { effort: 'max' },
    });
    expect(mapAnthropicOutputEffort({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('anthropic thinking budgets by effort (legacy)', () => {
    expect(mapAnthropicThinking({ enabled: true, effort: 'low' })).toEqual({
      thinking: { type: 'enabled', budget_tokens: 1_024 },
    });
    expect(mapAnthropicThinking({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'enabled', budget_tokens: 10_000 },
    });
    expect(mapAnthropicThinking({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('gemini thinking dual fields', () => {
    const body = mapGeminiThinking({ enabled: true, effort: 'medium' });
    expect(body.reasoning_effort).toBe('medium');
    expect(body.extra_body).toMatchObject({
      google: { thinking_config: { thinking_budget: 4_096, include_thoughts: true } },
    });
  });

  it('reads anthropic budget for max_tokens clamp', () => {
    expect(
      readThinkingBudgetTokens({
        thinking: { type: 'enabled', budget_tokens: 2000 },
      })
    ).toBe(2000);
  });
});
