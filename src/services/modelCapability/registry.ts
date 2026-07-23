/**
 * Static model capability rules.
 *
 * Contract:
 * - Only emit mapRequest for narrow, well-known ids verified (or OpenAI o-series contract).
 * - Unknown / ambiguous ids stay fail-closed (no mapRequest → no UI, no request fields).
 * - Field names: OpenAI-compatible `reasoning_effort` (live-probed on project new-api 2026-07-23).
 * - Off: omit fields (mapper returns {}).
 * - Stream: gateway emits `delta.reasoning_content` (isolated from final content in llmService).
 *
 * Important: clients only send `reasoning_effort` when product prefs.enabled === true.
 * Default prefs are enabled:false — gateway logs will NOT show the field until the user enables reasoning.
 */

import type { ModelCapabilityRule, ReasoningEffort } from './types';

/** Shared OpenAI-compatible reasoning_effort mapper (empty when off). */
export function mapOpenAiReasoningEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return { reasoning_effort: prefs.effort };
}

function openAiReasoningRule(
  modelPattern: string,
  contextWindow: number,
  options?: { temperatureIgnored?: boolean }
): ModelCapabilityRule {
  return {
    modelPattern,
    contextWindow,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    // o-series typically ignore temperature; chat-style reasoning models should not.
    temperatureIgnored: options?.temperatureIgnored ?? true,
    features: ['reasoning'],
    mapRequest: mapOpenAiReasoningEffort,
  };
}

/**
 * Narrow allowlist only. Prefer exact ids / tight prefixes over broad globs.
 *
 * Live probe (2026-07-23, new.hongecb.store, key-scoped model list):
 * - deepseek-v4-flash: 200 with/without reasoning_effort; stream deltas include reasoning_content
 * - grok-4.5: same field accepted; reasoning_tokens increase with effort
 * - o-series: not on that token's /models list; keep OpenAI-compatible mapRequest for when catalog includes them
 * - deepseek-r1 / deepseek-reasoner: not on catalog; no mapRequest (UI hidden) until ids appear
 */
export const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = [
  // OpenAI o-series (common new-api / OpenAI-compatible names)
  openAiReasoningRule('o1', 200_000),
  openAiReasoningRule('o1-mini', 128_000),
  openAiReasoningRule('o1-preview', 128_000),
  openAiReasoningRule('o1-pro', 200_000),
  openAiReasoningRule('o3', 200_000),
  openAiReasoningRule('o3-mini', 200_000),
  openAiReasoningRule('o3-pro', 200_000),
  // Tight prefix for dated variants e.g. o3-mini-2025-01-31 — still o3-mini* not o3*
  openAiReasoningRule('o1-mini-*', 128_000),
  openAiReasoningRule('o3-mini-*', 200_000),

  // Gateway-verified chat-style reasoning models (keep temperature)
  openAiReasoningRule('deepseek-v4-flash', 128_000, { temperatureIgnored: false }),
  openAiReasoningRule('deepseek-v4-flash-*', 128_000, { temperatureIgnored: false }),
  openAiReasoningRule('grok-4.5', 256_000, { temperatureIgnored: false }),
  openAiReasoningRule('grok-4.5-*', 256_000, { temperatureIgnored: false }),

  // Known reasoning labels without catalog presence / live mapRequest on this gateway yet
  {
    modelPattern: 'deepseek-r1',
    contextWindow: 128_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    // mapRequest omitted until model id appears on project gateway and is re-probed
  },
  {
    modelPattern: 'deepseek-reasoner',
    contextWindow: 128_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
  },
];

export function getModelCapabilityRules(): readonly ModelCapabilityRule[] {
  return MODEL_CAPABILITY_RULES;
}
