/**
 * Static model capability rules.
 *
 * Contract:
 * - Only emit mapRequest for narrow, well-known OpenAI-style reasoning ids.
 * - Unknown / ambiguous ids stay fail-closed (no mapRequest → no UI, no request fields).
 * - Field names assume OpenAI-compatible gateways that pass through `reasoning_effort`.
 * - Re-verify against the project new-api before expanding patterns.
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

function openAiReasoningRule(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  return {
    modelPattern,
    contextWindow,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    mapRequest: mapOpenAiReasoningEffort,
  };
}

/**
 * Narrow allowlist only. Prefer exact ids / tight prefixes over broad globs.
 * DeepSeek-style models are listed as capability tags without mapRequest until gateway-verified.
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

  // Known reasoning models without a verified request mapper yet (UI hidden).
  {
    modelPattern: 'deepseek-r1',
    contextWindow: 128_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    // mapRequest intentionally omitted until new-api field is verified
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
