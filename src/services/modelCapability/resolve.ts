import { getModelCapabilityRules } from './registry';
import type {
  ApiSurface,
  ModelCapabilityRule,
  ModelsListEntry,
  ResolveModelCapabilityInput,
  ResolvedModelCapability,
  ReasoningEffortLevel,
  SurfaceCapability,
} from './types';
import {
  DEFAULT_API_SURFACE,
  DEFAULT_REASONING_EFFORTS,
  DEFAULT_UNKNOWN_CONTEXT_WINDOW,
} from './types';

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

function mergeFeatureLists(
  ruleFeatures: string[] | undefined,
  modelsFeatures: string[] | undefined
): string[] {
  return [...(ruleFeatures ?? []), ...(modelsFeatures ?? [])].filter(
    (feature, index, all) => all.indexOf(feature) === index
  );
}

function pickSurface(
  rule: ModelCapabilityRule | null,
  preferred?: ApiSurface
): { surface: ApiSurface; capability: SurfaceCapability | null } {
  if (!rule) {
    return { surface: preferred ?? DEFAULT_API_SURFACE, capability: null };
  }

  const order: ApiSurface[] = [];
  if (preferred) order.push(preferred);
  if (!order.includes(rule.preferredSurface)) order.push(rule.preferredSurface);
  if (!order.includes('chat_completions')) order.push('chat_completions');
  if (!order.includes('responses')) order.push('responses');

  for (const surface of order) {
    const capability = rule.surfaces[surface];
    if (capability) {
      return { surface, capability };
    }
  }

  return { surface: rule.preferredSurface, capability: null };
}

function resolveReasoningEfforts(surface: SurfaceCapability | null): ReasoningEffortLevel[] {
  if (surface?.reasoningEfforts && surface.reasoningEfforts.length > 0) {
    return [...surface.reasoningEfforts];
  }
  if (surface?.supportsReasoning) {
    return [...DEFAULT_REASONING_EFFORTS];
  }
  return [];
}

function resolveDefaultEffort(
  surface: SurfaceCapability | null,
  reasoningEfforts: ReasoningEffortLevel[]
): ReasoningEffortLevel {
  if (surface?.defaultEffort && reasoningEfforts.includes(surface.defaultEffort)) {
    return surface.defaultEffort;
  }
  if (reasoningEfforts.includes('medium')) {
    return 'medium';
  }
  return reasoningEfforts[0] ?? 'medium';
}

function buildResolvedCapability(args: {
  modelId: string;
  provider: string;
  rule: ModelCapabilityRule | null;
  modelsEntry: ModelsListEntry | undefined;
  preferredSurface?: ApiSurface;
}): ResolvedModelCapability {
  const modelsContext = positiveFiniteContext(args.modelsEntry?.context);
  const modelsFeatures = readModelsFeatures(args.modelsEntry);
  const registryContext = args.rule ? positiveFiniteContext(args.rule.contextWindow) : undefined;
  const { surface, capability } = pickSurface(args.rule, args.preferredSurface);
  const supportsReasoning = Boolean(capability?.supportsReasoning && capability.mapRequest);
  const reasoningEfforts = resolveReasoningEfforts(capability);

  return {
    modelId: args.modelId,
    provider: args.provider,
    contextWindow: modelsContext ?? registryContext ?? DEFAULT_UNKNOWN_CONTEXT_WINDOW,
    apiSurface: surface,
    supportsReasoning,
    reasoningEfforts,
    defaultEffort: resolveDefaultEffort(capability, reasoningEfforts),
    temperatureIgnored: Boolean(capability?.temperatureIgnored),
    features: mergeFeatureLists(args.rule?.features, modelsFeatures),
    mapRequest: capability?.mapRequest ?? null,
    source: {
      registryMatched: Boolean(args.rule),
      preferredSurface: surface,
      ...(modelsContext !== undefined ? { modelsContext } : {}),
      ...(modelsFeatures !== undefined ? { modelsFeatures } : {}),
    },
  };
}

/**
 * Merge registry + optional /models entry. Fail-closed for reasoning when unmatched.
 * Picks an API surface with a real mapRequest when possible.
 */
export function resolveModelCapability(
  input: ResolveModelCapabilityInput,
  rules: readonly ModelCapabilityRule[] = getModelCapabilityRules()
): ResolvedModelCapability {
  const modelId = (input.modelId || '').trim();
  const provider = (input.provider || '').trim() || 'unknown';
  const modelsEntry = normalizeModelsEntry(input.modelsEntry);
  const rule = modelId ? findMatchingRule(provider, modelId, rules) : null;
  return buildResolvedCapability({
    modelId,
    provider,
    rule,
    modelsEntry,
    preferredSurface: input.preferredSurface,
  });
}

/** UI: show controls only when this surface can emit reasoning fields. */
export function shouldShowReasoningControls(cap: ResolvedModelCapability): boolean {
  return Boolean(cap.supportsReasoning && cap.mapRequest);
}
