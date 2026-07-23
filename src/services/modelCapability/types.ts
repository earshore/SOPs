/**
 * Model capability registry types (multi-protocol surfaces + reasoning).
 * Spec: docs/superpowers/specs/2026-07-23-model-reasoning-capability-design.md
 * Multi-protocol: docs/superpowers/specs/2026-07-23-multi-protocol-llm-design.md
 * Responses parity: docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md
 */

/** Product-side thinking intensity; 'off' means disabled (not listed in efforts). */
export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export type ReasoningEffortLevel = Exclude<ReasoningEffort, 'off'>;

/**
 * Transport surface / API path mode for LLM calls.
 * - chat_completions: POST {base}/chat/completions
 * - responses: POST {base}/responses
 * - anthropic_messages: POST {base}/messages
 * - gemini_generate: POST {origin}/v1beta/models/{model}:generateContent
 */
export type ApiSurface =
  | 'chat_completions'
  | 'responses'
  | 'anthropic_messages'
  | 'gemini_generate';

/**
 * Extended surface flags beyond reasoning (OpenAI Responses capability matrix).
 * Fail-closed defaults: unset = false / unsupported on that surface.
 */
export interface SurfaceCapabilityFlags {
  /** Structured Outputs: chat uses response_format; responses uses text.format */
  supportsStructuredOutput?: boolean;
  /** Function / custom tools on this surface */
  supportsTools?: boolean;
  /** Multimodal image input parts */
  supportsVision?: boolean;
  /** previous_response_id multi-turn chaining (Responses) */
  supportsPreviousResponseId?: boolean;
  /** store:true stateful responses (Responses); BYOK default is false */
  supportsStore?: boolean;
  /** Built-in tools: web_search, file_search, code_interpreter, etc. */
  supportsBuiltInTools?: boolean;
  /** Reasoning summary channel in stream/output */
  supportsReasoningSummary?: boolean;
}

export interface SurfaceCapability extends SurfaceCapabilityFlags {
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
  /** Extended flags for the resolved surface (fail-closed). */
  supportsStructuredOutput: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsPreviousResponseId: boolean;
  supportsStore: boolean;
  supportsBuiltInTools: boolean;
  supportsReasoningSummary: boolean;
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

/** Optional Responses multi-turn / tools / vision args (callLLM options). */
export interface ResponsesTransportOptions {
  /** previous_response_id for chaining (when surface supports it) */
  previousResponseId?: string;
  /** Explicit store override; default false for BYOK privacy */
  store?: boolean;
  /** OpenAI-compatible tools array (function tools or built-in shorthand) */
  tools?: unknown[];
  /** tool_choice when tools present */
  toolChoice?: unknown;
  /**
   * Multimodal input parts for the last user turn (vision).
   * When set, replaces string content of the last user message in Responses input.
   */
  visionUserParts?: Array<Record<string, unknown>>;
}

export const DEFAULT_UNKNOWN_CONTEXT_WINDOW = 32_768;

export const DEFAULT_REASONING_PREFS: ReasoningUserPrefs = {
  enabled: false,
  effort: 'medium',
};

export const DEFAULT_REASONING_EFFORTS: ReasoningEffortLevel[] = ['low', 'medium', 'high'];

export const DEFAULT_API_SURFACE: ApiSurface = 'chat_completions';
