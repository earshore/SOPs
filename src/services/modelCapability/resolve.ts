import { getModelCapabilityRules } from './registry';
import type {
  ModelCapabilityRule,
  ModelsListEntry,
  ResolveModelCapabilityInput,
  ResolvedModelCapability,
  ReasoningEffortLevel,
} from './types';
import { DEFAULT_REASONING_EFFORTS, DEFAULT_UNKNOWN_CONTEXT_WINDOW } from './types';

/** Match model id against pattern with `*` wildcards (glob-style, case-insensitive). */
export function matchModelPattern(pattern: string, modelId: string): boolean {
  if (!pattern) return false;
  const id = modelId.trim();
  const pat = pattern.trim();
  if (!id || !pat) return false;
  if (pat.toLowerCase() === id.toLowerCase()) return true;
  if (!pat.includes('*')) return pat.toLowerCase() === id.toLowerCase();

  const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(id);
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
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readModelsFeatures(entry: ModelsListEntry | undefined): string[] | undefined {
  if (!entry || !Array.isArray(entry.features)) {
    return undefined;
  }
  return entry.features.map(String);
}

function resolveReasoningEfforts(
  rule: ModelCapabilityRule | null,
  supportsReasoning: boolean
): ReasoningEffortLevel[] {
  if (rule?.reasoningEfforts && rule.reasoningEfforts.length > 0) {
    return [...rule.reasoningEfforts];
  }
  return supportsReasoning ? [...DEFAULT_REASONING_EFFORTS] : [];
}

function resolveDefaultEffort(
  rule: ModelCapabilityRule | null,
  reasoningEfforts: ReasoningEffortLevel[]
): ReasoningEffortLevel {
  if (rule?.defaultEffort && reasoningEfforts.includes(rule.defaultEffort)) {
    return rule.defaultEffort;
  }
  if (reasoningEfforts.includes('medium')) {
    return 'medium';
  }
  return reasoningEfforts[0] ?? 'medium';
}

function mergeFeatureLists(
  ruleFeatures: string[] | undefined,
  modelsFeatures: string[] | undefined
): string[] {
  return [...(ruleFeatures ?? []), ...(modelsFeatures ?? [])].filter(
    (feature, index, all) => all.indexOf(feature) === index
  );
}

function buildCapabilitySource(
  registryMatched: boolean,
  modelsContext: number | undefined,
  modelsFeatures: string[] | undefined
): ResolvedModelCapability['source'] {
  const source: ResolvedModelCapability['source'] = { registryMatched };
  if (modelsContext !== undefined) {
    source.modelsContext = modelsContext;
  }
  if (modelsFeatures !== undefined) {
    source.modelsFeatures = modelsFeatures;
  }
  return source;
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
  const modelsFeatures = readModelsFeatures(modelsEntry);
  const registryContext = rule ? positiveFiniteContext(rule.contextWindow) : undefined;
  const supportsReasoning = Boolean(rule?.supportsReasoning);
  const reasoningEfforts = resolveReasoningEfforts(rule, supportsReasoning);

  return {
    modelId,
    provider,
    contextWindow: modelsContext ?? registryContext ?? DEFAULT_UNKNOWN_CONTEXT_WINDOW,
    supportsReasoning,
    reasoningEfforts,
    defaultEffort: resolveDefaultEffort(rule, reasoningEfforts),
    temperatureIgnored: Boolean(rule?.temperatureIgnored),
    features: mergeFeatureLists(rule?.features, modelsFeatures),
    mapRequest: rule?.mapRequest ?? null,
    source: buildCapabilitySource(Boolean(rule), modelsContext, modelsFeatures),
  };
}

/** UI: show controls only when reasoning is supported AND mapper can emit fields. */
export function shouldShowReasoningControls(cap: ResolvedModelCapability): boolean {
  return Boolean(cap.supportsReasoning && cap.mapRequest);
}
