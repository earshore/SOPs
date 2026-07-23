/**
 * Model capability registry types (reasoning / context / request mappers).
 * Spec: docs/superpowers/specs/2026-07-23-model-reasoning-capability-design.md
 */

/** Product-side thinking intensity; 'off' means disabled (not listed in efforts). */
export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export type ReasoningEffortLevel = Exclude<ReasoningEffort, 'off'>;

export interface ModelCapabilityRule {
  /** Exact id or simple glob with `*` wildcards (matched case-insensitively). */
  modelPattern: string;
  /** Empty / omit = any provider */
  provider?: string;
  contextWindow: number;
  supportsReasoning: boolean;
  reasoningEfforts?: ReasoningEffortLevel[];
  defaultEffort?: ReasoningEffortLevel;
  temperatureIgnored?: boolean;
  features?: string[];
  /**
   * Map product prefs to chat/completions top-level fields.
   * When enabled=false or effort=off, return {} or explicit off fields (gateway-dependent).
   */
  mapRequest?: (prefs: { enabled: boolean; effort: ReasoningEffort }) => Record<string, unknown>;
}

export interface ModelsListEntry {
  id: string;
  name?: string;
  context?: number;
  features?: string[];
}

export interface ResolveModelCapabilityInput {
  provider: string;
  modelId: string;
  modelsEntry?: ModelsListEntry | string | null;
}

export interface ResolvedModelCapability {
  modelId: string;
  provider: string;
  contextWindow: number;
  supportsReasoning: boolean;
  reasoningEfforts: ReasoningEffortLevel[];
  defaultEffort: ReasoningEffortLevel;
  temperatureIgnored: boolean;
  features: string[];
  /** null when no mapRequest — never write reasoning fields */
  mapRequest: ModelCapabilityRule['mapRequest'] | null;
  source: {
    registryMatched: boolean;
    modelsContext?: number;
    modelsFeatures?: string[];
  };
}

/** Global (or session) user preference for reasoning. */
export interface ReasoningUserPrefs {
  enabled: boolean;
  effort: ReasoningEffortLevel;
}

/** Session override: missing fields inherit global. */
export type SessionReasoningOverride = Partial<ReasoningUserPrefs>;

export interface EffectiveReasoningPrefs {
  enabled: boolean;
  /** 'off' when disabled */
  effort: ReasoningEffort;
}

export const DEFAULT_UNKNOWN_CONTEXT_WINDOW = 32_768;

export const DEFAULT_REASONING_PREFS: ReasoningUserPrefs = {
  enabled: false,
  effort: 'medium',
};

export const DEFAULT_REASONING_EFFORTS: ReasoningEffortLevel[] = ['low', 'medium', 'high'];
