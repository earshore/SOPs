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
 * Anthropic Messages API — official adaptive-era control:
 * `output_config.effort` ∈ low|medium|high|xhigh|max
 * (docs: platform.claude.com effort / Messages output_config).
 * Prefer this for Claude 4.5+ models that list effort support; do NOT invent "extra".
 */
export function mapAnthropicOutputEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return {
    output_config: {
      effort: prefs.effort,
    },
  };
}

/**
 * Anthropic extended thinking (legacy / pre-adaptive models).
 * Maps product effort → thinking.budget_tokens.
 * Callers must ensure max_tokens > budget_tokens (see applyToRequest).
 * Still used on Claude 4.5-and-earlier thinking-only models and some gateways.
 */
export function mapAnthropicThinking(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  const budgetByEffort: Record<Exclude<ReasoningEffort, 'off'>, number> = {
    low: 1_024,
    medium: 5_000,
    high: 10_000,
    xhigh: 16_000,
    max: 32_000,
  };
  const budget = budgetByEffort[prefs.effort] ?? 5_000;
  return {
    thinking: {
      type: 'enabled',
      budget_tokens: budget,
    },
  };
}

/** Shared Gemini thinking budget ladder (product L1 → official thinkingBudget). */
export const GEMINI_THINKING_BUDGET_BY_EFFORT: Record<Exclude<ReasoningEffort, 'off'>, number> = {
  low: 1_024,
  medium: 4_096,
  high: 8_192,
  xhigh: 16_384,
  max: 32_768,
};

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
  const budget = GEMINI_THINKING_BUDGET_BY_EFFORT[prefs.effort] ?? 4_096;
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
