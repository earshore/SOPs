import { getModelCapabilityRules } from './registry';
import type {
  ModelCapabilityRule,
  ModelsListEntry,
  ResolveModelCapabilityInput,
  ResolvedModelCapability,
  ReasoningEffortLevel,
} from './types';
import {
  DEFAULT_REASONING_EFFORTS,
  DEFAULT_UNKNOWN_CONTEXT_WINDOW,
} from './types';

/** Match model id against pattern with `*` wildcards (glob-style). */
export function matchModelPattern(pattern: string, modelId: string): boolean {
  if (!pattern) return false;
  if (pattern === modelId) return true;
  if (!pattern.includes('*')) return pattern === modelId;

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(modelId);
}

function normalizeModelsEntry(
  entry: ResolveModelCapabilityInput['modelsEntry']
): ModelsListEntry | undefined {
  if (entry == null) return undefined;
  if (typeof entry === 'string') {
    return entry.trim() ? { id: entry.trim() } : undefined;
  }
  if (!entry.id?.trim()) return undefined;
  return entry;
}

function findMatchingRule(
  provider: string,
  modelId: string,
  rules: readonly ModelCapabilityRule[]
): ModelCapabilityRule | null {
  for (const rule of rules) {
    if (rule.provider && rule.provider !== provider) {
      continue;
    }
    if (matchModelPattern(rule.modelPattern, modelId)) {
      return rule;
    }
  }
  return null;
}

function positiveFiniteContext(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Merge registry + optional /models entry. Fail-closed for reasoning when unmatched.
 */
export function resolveModelCapability(
  input: ResolveModelCapabilityInput,
  rules: readonly ModelCapabilityRule[] = getModelCapabilityRules()
): ResolvedModelCapability {
  const modelId = (input.modelId || '').trim();
  const provider = (input.provider || '').trim() || 'unknown';
  const modelsEntry = normalizeModelsEntry(input.modelsEntry);
  const rule = modelId ? findMatchingRule(provider, modelId, rules) : null;

  const modelsContext = positiveFiniteContext(modelsEntry?.context);
  const modelsFeatures = Array.isArray(modelsEntry?.features)
    ? modelsEntry!.features!.map(String)
    : undefined;

  const registryContext = rule ? positiveFiniteContext(rule.contextWindow) : undefined;
  const contextWindow =
    modelsContext ?? registryContext ?? DEFAULT_UNKNOWN_CONTEXT_WINDOW;

  const supportsReasoning = Boolean(rule?.supportsReasoning);
  const mapRequest = rule?.mapRequest ?? null;
  // Sending requires mapRequest; UI may still see supportsReasoning only when both true via helper
  const reasoningEfforts: ReasoningEffortLevel[] =
    rule?.reasoningEfforts && rule.reasoningEfforts.length > 0
      ? [...rule.reasoningEfforts]
      : supportsReasoning
        ? [...DEFAULT_REASONING_EFFORTS]
        : [];

  const defaultEffort: ReasoningEffortLevel =
    rule?.defaultEffort && reasoningEfforts.includes(rule.defaultEffort)
      ? rule.defaultEffort
      : reasoningEfforts.includes('medium')
        ? 'medium'
        : (reasoningEfforts[0] ?? 'medium');

  const features = [
    ...(rule?.features ?? []),
    ...(modelsFeatures ?? []),
  ].filter((f, i, arr) => arr.indexOf(f) === i);

  return {
    modelId,
    provider,
    contextWindow,
    supportsReasoning,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: Boolean(rule?.temperatureIgnored),
    features,
    mapRequest,
    source: {
      registryMatched: Boolean(rule),
      ...(modelsContext !== undefined ? { modelsContext } : {}),
      ...(modelsFeatures !== undefined ? { modelsFeatures } : {}),
    },
  };
}

/** UI: show controls only when reasoning is supported AND mapper can emit fields. */
export function shouldShowReasoningControls(cap: ResolvedModelCapability): boolean {
  return Boolean(cap.supportsReasoning && cap.mapRequest);
}
