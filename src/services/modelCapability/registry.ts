/**
 * Static model capability rules.
 * mapRequest field names are provisional until verified against the project gateway (new-api).
 * Prefer empty / fail-closed until Task 4 probes real models.
 */

import type { ModelCapabilityRule } from './types';

/**
 * Production patterns with mapRequest should only be added after gateway verification.
 * Placeholder patterns may set supportsReasoning with mapRequest: null to hide send fields.
 */
/**
 * Provisional mappers for common OpenAI-compatible reasoning models.
 * Field names assume gateway pass-through of `reasoning_effort`.
 * Re-verify against the project new-api before treating as production contract.
 */
export const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = [
  {
    modelPattern: 'o3*',
    contextWindow: 200_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    mapRequest: ({ enabled, effort }) =>
      enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
  },
  {
    modelPattern: 'o1*',
    contextWindow: 200_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    mapRequest: ({ enabled, effort }) =>
      enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
  },
  {
    modelPattern: '*r1*',
    contextWindow: 128_000,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    features: ['reasoning'],
    // Some gateways use enable_thinking; prefer reasoning_effort when OpenAI-shaped.
    mapRequest: ({ enabled, effort }) =>
      enabled && effort !== 'off'
        ? { enable_thinking: true, reasoning_effort: effort }
        : { enable_thinking: false },
  },
];

export function getModelCapabilityRules(): readonly ModelCapabilityRule[] {
  return MODEL_CAPABILITY_RULES;
}
