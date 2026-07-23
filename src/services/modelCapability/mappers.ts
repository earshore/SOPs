/**
 * Request-field mappers for multi-protocol reasoning.
 * Each mapper is surface-aware in the registry (which surface attaches it).
 */

import type { ReasoningEffort } from './types';

export function mapOpenAiReasoningEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return { reasoning_effort: prefs.effort };
}

/**
 * OpenAI Responses API reasoning control.
 * `summary: 'auto'` is required for reasoning_summary_text stream/output (深度思考 UI).
 * Without it, many gateways run internal reasoning but never emit a summary channel.
 */
export function mapResponsesReasoning(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return {
    reasoning: {
      effort: prefs.effort,
      summary: 'auto',
    },
  };
}

/**
 * Anthropic extended thinking via OpenAI-compatible chat/completions.
 * Maps product effort → thinking.budget_tokens (common new-api / Claude channel shape).
 * Callers must ensure max_tokens > budget_tokens (see applyToRequest).
 */
export function mapAnthropicThinking(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  const budget = prefs.effort === 'low' ? 1_024 : prefs.effort === 'high' ? 10_000 : 5_000;
  return {
    thinking: {
      type: 'enabled',
      budget_tokens: budget,
    },
  };
}

/**
 * Gemini thinking via OpenAI-compatible chat/completions.
 * Uses reasoning_effort when gateways map it; also sets google thinking_config
 * for channels that read extra_body.google.
 */
export function mapGeminiThinking(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  const budget = prefs.effort === 'low' ? 1_024 : prefs.effort === 'high' ? 8_192 : 4_096;
  return {
    reasoning_effort: prefs.effort,
    extra_body: {
      google: {
        thinking_config: {
          thinking_budget: budget,
          include_thoughts: true,
        },
      },
    },
  };
}

/** Extract thinking budget from a body fragment (for max_tokens clamp). */
export function readThinkingBudgetTokens(extra: Record<string, unknown>): number | undefined {
  const thinking = extra.thinking as { budget_tokens?: unknown } | undefined;
  if (typeof thinking?.budget_tokens === 'number' && thinking.budget_tokens > 0) {
    return thinking.budget_tokens;
  }
  return undefined;
}
