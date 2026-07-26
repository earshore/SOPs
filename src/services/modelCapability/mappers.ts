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
 * Anthropic modern path: THINKING and EFFORT are different API controls.
 *
 * - `thinking: { type: "adaptive" }` — enables adaptive thinking mode (not a depth scale).
 * - `output_config.effort` — behavioral token/thoroughness signal (low…max); affects text,
 *   tools, AND thinking depth when thinking is active. Does NOT require inventing "extra".
 *
 * Official migration pairs both fields. Sending only effort omits adaptive thinking;
 * sending only budget is the legacy extended-thinking path (mapAnthropicThinking).
 *
 * @see https://platform.claude.com/docs/en/build-with-claude/effort
 */
export function mapAnthropicOutputEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return {
    thinking: { type: 'adaptive' },
    output_config: {
      effort: prefs.effort,
    },
  };
}

/**
 * Anthropic legacy extended thinking ONLY (no output_config.effort).
 * Product effort ladder → `thinking.budget_tokens` hard budget.
 * Orthogonal concept from adaptive-era `output_config.effort`.
 * Callers must ensure max_tokens > budget_tokens (see applyToRequest).
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

/**
 * Answer-text headroom kept above thinking.budget_tokens when clamping max_tokens.
 * 512 proved too tight: a fully-used budget left almost no visible answer tokens.
 */
export const THINKING_BUDGET_ANSWER_HEADROOM = 4_096;

/** Extract thinking budget from a body fragment (for max_tokens clamp). */
export function readThinkingBudgetTokens(extra: Record<string, unknown>): number | undefined {
  const thinking = extra.thinking as { budget_tokens?: unknown } | undefined;
  if (typeof thinking?.budget_tokens === 'number' && thinking.budget_tokens > 0) {
    return thinking.budget_tokens;
  }
  return undefined;
}
