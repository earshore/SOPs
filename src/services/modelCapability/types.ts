/**
 * Model capability registry types (multi-protocol surfaces + reasoning).
 * Spec: docs/superpowers/specs/2026-07-23-model-reasoning-capability-design.md
 * Multi-protocol: docs/superpowers/specs/2026-07-23-multi-protocol-llm-design.md
 */

/** Product-side thinking intensity; 'off' means disabled (not listed in efforts). */
export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export type ReasoningEffortLevel = Exclude<ReasoningEffort, 'off'>;

/**
 * Transport surface for LLM calls.
 * - chat_completions: POST {base}/chat/completions
 * - responses: POST {base}/responses (OpenAI Responses API)
 */
export type ApiSurface = 'chat_completions' | 'responses';

export interface SurfaceCapability {
  supportsReasoning: boolean;
  reasoningEfforts?: ReasoningEffortLevel[];
  defaultEffort?: ReasoningEffortLevel;
  temperatureIgnored?: boolean;
  /**
   * Map product prefs → request body fragment for THIS surface only.
   * enabled=false / effort=off → {} (omit fields).
   */
  mapRequest?: (prefs: { enabled: boolean; effort: ReasoningEffort }) => Record<string, unknown>;
}

export interface ModelCapabilityRule {
  /** Exact id or simple glob with `*` (matched case-insensitively). */
  modelPattern: string;
  provider?: string;
  contextWindow: number;
  features?: string[];
  /** Default transport when caller does not force a surface. */
  preferredSurface: ApiSurface;
  /** Per-surface capability. Missing surface = unsupported on that path. */
  surfaces: Partial<Record<ApiSurface, SurfaceCapability>>;
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
  /** Force a surface; otherwise use rule.preferredSurface (or chat_completions). */
  preferredSurface?: ApiSurface;
}

export interface ResolvedModelCapability {
  modelId: string;
  provider: string;
  contextWindow: number;
  apiSurface: ApiSurface;
  supportsReasoning: boolean;
  reasoningEfforts: ReasoningEffortLevel[];
  defaultEffort: ReasoningEffortLevel;
  temperatureIgnored: boolean;
  features: string[];
  /** null when this surface has no mapRequest — never write reasoning fields */
  mapRequest: SurfaceCapability['mapRequest'] | null;
  source: {
    registryMatched: boolean;
    modelsContext?: number;
    modelsFeatures?: string[];
    preferredSurface: ApiSurface;
  };
}

export interface ReasoningUserPrefs {
  enabled: boolean;
  effort: ReasoningEffortLevel;
}

export type SessionReasoningOverride = Partial<ReasoningUserPrefs>;

export interface EffectiveReasoningPrefs {
  enabled: boolean;
  effort: ReasoningEffort;
}

export const DEFAULT_UNKNOWN_CONTEXT_WINDOW = 32_768;

export const DEFAULT_REASONING_PREFS: ReasoningUserPrefs = {
  enabled: false,
  effort: 'medium',
};

export const DEFAULT_REASONING_EFFORTS: ReasoningEffortLevel[] = ['low', 'medium', 'high'];

export const DEFAULT_API_SURFACE: ApiSurface = 'chat_completions';
