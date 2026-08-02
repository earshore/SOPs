import { describe, expect, it } from 'vitest';
import {
  GEMINI_THINKING_LEVEL_BY_EFFORT,
  mapAnthropicOutputEffort,
  mapAnthropicOutputEffortSummarized,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapOpenAiThinkingToggle,
  mapResponsesReasoning,
  mapThinkingPlusEffort,
  readThinkingBudgetTokens,
} from './mappers';

describe('multi-protocol mappers', () => {
  it('openai effort omits when off', () => {
    expect(mapOpenAiReasoningEffort({ enabled: false, effort: 'high' })).toEqual({});
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'high' })).toEqual({
      reasoning_effort: 'high',
    });
  });

  it('openai effort passes through allowlisted tiers, clamps the rest to high', () => {
    // No allowlist passed (defensive): unknown tiers clamp to the official high cap.
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'xhigh' })).toEqual({
      reasoning_effort: 'high',
    });
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'max' })).toEqual({
      reasoning_effort: 'high',
    });
    // Flagship allowlist (gpt-5.x) includes xhigh/max — pass through verbatim.
    const flagship = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'xhigh', allowed: flagship })).toEqual(
      {
        reasoning_effort: 'xhigh',
      }
    );
    expect(mapOpenAiReasoningEffort({ enabled: true, effort: 'max', allowed: flagship })).toEqual({
      reasoning_effort: 'max',
    });
    expect(mapResponsesReasoning({ enabled: true, effort: 'max', allowed: flagship })).toEqual({
      reasoning: { effort: 'max', summary: 'auto' },
    });
    // Triad allowlist (o-series official enum caps at high) still clamps.
    const triad = ['low', 'medium', 'high'] as const;
    expect(mapResponsesReasoning({ enabled: true, effort: 'max', allowed: triad })).toEqual({
      reasoning: { effort: 'high', summary: 'auto' },
    });
  });

  it('responses reasoning object requests summary channel for UI', () => {
    expect(mapResponsesReasoning({ enabled: true, effort: 'low' })).toEqual({
      reasoning: { effort: 'low', summary: 'auto' },
    });
    expect(mapResponsesReasoning({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('openai thinking toggle emits thinking.type enabled only when on', () => {
    expect(mapOpenAiThinkingToggle({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'enabled' },
    });
    expect(mapOpenAiThinkingToggle({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('thinking + effort mapper pairs toggle with allowlisted effort (DeepSeek/GLM)', () => {
    const deepseek = ['low', 'high', 'max'] as const;
    expect(mapThinkingPlusEffort({ enabled: true, effort: 'max', allowed: deepseek })).toEqual({
      thinking: { type: 'enabled' },
      reasoning_effort: 'max',
    });
    // Allowlist enforcement lives in prefs.clampEffort before the mapper runs;
    // the mapper only collapses values outside the OpenAI wire enum (xhigh/max).
    expect(mapThinkingPlusEffort({ enabled: true, effort: 'xhigh', allowed: deepseek })).toEqual({
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
    });
    expect(mapThinkingPlusEffort({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('anthropic adaptive thinking + output_config.effort are paired (not effort alone)', () => {
    // effort ≠ thinking: both fields required on modern Claude path
    expect(mapAnthropicOutputEffort({ enabled: true, effort: 'xhigh' })).toEqual({
      thinking: { type: 'adaptive' },
      output_config: { effort: 'xhigh' },
    });
    expect(mapAnthropicOutputEffort({ enabled: true, effort: 'max' })).toEqual({
      thinking: { type: 'adaptive' },
      output_config: { effort: 'max' },
    });
    expect(mapAnthropicOutputEffort({ enabled: false, effort: 'high' })).toEqual({});
  });

  it('anthropic 4.7+ variant opts into summarized thinking display', () => {
    expect(mapAnthropicOutputEffortSummarized({ enabled: true, effort: 'high' })).toEqual({
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'high' },
    });
    expect(mapAnthropicOutputEffortSummarized({ enabled: false, effort: 'high' })).toEqual({});
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

  it('gemini reasoning_effort uses official enum (xhigh/max → high), budget carries scale', () => {
    const body = mapGeminiThinking({ enabled: true, effort: 'max' });
    expect(body.reasoning_effort).toBe('high');
    expect(body.extra_body).toMatchObject({
      google: { thinking_config: { thinking_budget: 32_768 } },
    });
  });

  it('reads anthropic budget for max_tokens clamp', () => {
    expect(
      readThinkingBudgetTokens({
        thinking: { type: 'enabled', budget_tokens: 2000 },
      })
    ).toBe(2000);
  });

  it('gemini thinkingLevel ladder clamps xhigh/max to high', () => {
    expect(GEMINI_THINKING_LEVEL_BY_EFFORT).toEqual({
      low: 'low',
      medium: 'medium',
      high: 'high',
      xhigh: 'high',
      max: 'high',
    });
  });
});
