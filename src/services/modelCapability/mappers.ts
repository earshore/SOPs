/**
 * Request-field mappers for multi-protocol reasoning.
 * Each mapper is surface-aware in the registry (which surface attaches it).
 */

import { isReasoningEffortLevel } from './types';
import type { ReasoningEffort, ReasoningEffortLevel } from './types';

/**
 * OpenAI `reasoning_effort` / `reasoning.effort` values are model-dependent:
 * official docs allow none|minimal|low|medium|high|xhigh|max (flagship tiers).
 * Pass through tiers the model allowlist declares; clamp only values outside
 * it (e.g. o-series official enum caps at high — see registry allowlists).
 */
const OPENAI_EFFORT_BY_PRODUCT_EFFORT: Record<string, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'high',
  max: 'high',
};

function clampOpenAiEffort(effort: ReasoningEffort): string {
  return OPENAI_EFFORT_BY_PRODUCT_EFFORT[effort] ?? 'high';
}

/**
 * Wire effort for OpenAI surfaces: allowlisted tiers pass through verbatim
 * (e.g. gpt-5.x xhigh/max), anything outside the allowlist clamps to high.
 */
function resolveOpenAiWireEffort(
  effort: ReasoningEffort,
  allowed?: readonly ReasoningEffortLevel[]
): string {
  if (isReasoningEffortLevel(effort) && allowed?.includes(effort)) {
    return effort;
  }
  return clampOpenAiEffort(effort);
}

export function mapOpenAiReasoningEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
  allowed?: readonly ReasoningEffortLevel[];
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return { reasoning_effort: resolveOpenAiWireEffort(prefs.effort, prefs.allowed) };
}

/**
 * OpenAI Responses API reasoning control.
 * `summary: 'auto'` is required for reasoning_summary_text stream/output (深度思考 UI).
 * Without it, many gateways run internal reasoning but never emit a summary channel.
 */
export function mapResponsesReasoning(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
  allowed?: readonly ReasoningEffortLevel[];
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    // Explicit off: omit leaves the vendor default ON on thinking-by-default
    // gateways (deepseek-v4 etc), turning “关闭推理” into a no-op. Send none.
    return { reasoning: { effort: 'none' } };
  }
  return {
    reasoning: {
      effort: resolveOpenAiWireEffort(prefs.effort, prefs.allowed),
      summary: 'auto',
    },
  };
}

/**
 * Anthropic-style thinking.type toggle on OpenAI-compatible surfaces
 * (Kimi K2.x: thinking.type enabled/disabled).
 *
 * On = thinking.type enabled. Off = thinking.type disabled — these families
 * ship with thinking ON by default (capability.defaultEnabled), so an explicit
 * off must send the vendor disable field instead of omitting (omitting would
 * leave the vendor default intact and make the toggle a no-op).
 */
export function mapOpenAiThinkingToggle(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
  defaultEnabled?: boolean;
}): Record<string, unknown> {
  if (!prefs.enabled && prefs.defaultEnabled === false) {
    // Default-off family (e.g. deepseek-chat): omit keeps the vendor default.
    return {};
  }
  return { thinking: { type: prefs.enabled ? 'enabled' : 'disabled' } };
}

/**
 * Thinking toggle + OpenAI reasoning_effort on OpenAI-compatible surfaces
 * (DeepSeek V4 low|high|max; GLM-5.x max|xhigh|high|medium|low).
 *
 * DeepSeek/GLM ship with thinking ON by default — off omits the fields so the
 * vendor default is preserved (same precedent as grok-4.5 cannot-disable).
 * On = force thinking + send the allowlisted effort tier.
 */
export function mapThinkingPlusEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
  allowed?: readonly ReasoningEffortLevel[];
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return {
    thinking: { type: 'enabled' },
    reasoning_effort: resolveOpenAiWireEffort(prefs.effort, prefs.allowed),
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
 * Anthropic 4.7+ variant: thinking.display defaults to "omitted" there (thinking
 * blocks stream with EMPTY text), so the 深度思考 UI would show nothing. Opt into
 * "summarized" — the Anthropic analogue of mapResponsesReasoning's summary:'auto'.
 * Not for 4.6: display arrived with 4.7, and 4.6 already defaults to summarized.
 */
export function mapAnthropicOutputEffortSummarized(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  const base = mapAnthropicOutputEffort(prefs);
  if (!('thinking' in base)) {
    return base;
  }
  return { ...base, thinking: { type: 'adaptive', display: 'summarized' } };
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
 * Gemini 3+ official thinkingLevel enum ladder.
 * Product 5-tier clamps onto the official enum: xhigh/max → 'high'.
 */
export const GEMINI_THINKING_LEVEL_BY_EFFORT: Record<
  Exclude<ReasoningEffort, 'off'>,
  'minimal' | 'low' | 'medium' | 'high'
> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'high',
  max: 'high',
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
    // Official thinkingLevel enum caps at high; the budget ladder carries low…max.
    reasoning_effort: GEMINI_THINKING_LEVEL_BY_EFFORT[prefs.effort],
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
