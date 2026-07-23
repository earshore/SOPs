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
export const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = [
  // Example shape (disabled until verified) — keep commented for implementers:
  // {
  //   modelPattern: 'o3*',
  //   provider: 'openai',
  //   contextWindow: 200_000,
  //   supportsReasoning: true,
  //   reasoningEfforts: ['low', 'medium', 'high'],
  //   defaultEffort: 'medium',
  //   temperatureIgnored: true,
  //   mapRequest: ({ enabled, effort }) =>
  //     enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
  // },
];

export function getModelCapabilityRules(): readonly ModelCapabilityRule[] {
  return MODEL_CAPABILITY_RULES;
}
