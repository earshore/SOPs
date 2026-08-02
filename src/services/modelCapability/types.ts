/**
 * Model capability registry types (multi-protocol surfaces + reasoning).
 * Spec: docs/superpowers/specs/2026-07-23-model-reasoning-capability-design.md
 * Multi-protocol: docs/superpowers/specs/2026-07-23-multi-protocol-llm-design.md
 * Responses parity: docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md
 */

/** Product-side thinking intensity; 'off' means disabled (not listed in efforts). */
export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type ReasoningEffortLevel = Exclude<ReasoningEffort, 'off'>;

export const REASONING_EFFORT_LEVELS: readonly ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

export function isReasoningEffortLevel(value: unknown): value is ReasoningEffortLevel {
  return (
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh' ||
    value === 'max'
  );
}

/**
 * Transport surface / API path mode for LLM calls.
 * - chat_completions: POST {base}/chat/completions
 * - responses: POST {base}/responses
 * - anthropic_messages: POST {base}/messages
 * - gemini_generate: POST {origin}/v1beta/models/{model}:generateContent
 */
export type ApiSurface =
  'chat_completions' | 'responses' | 'anthropic_messages' | 'gemini_generate';

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

/**
 * How product effort maps onto the wire for this surface/model generation.
 * Registry must set this explicitly so vendor API upgrades are data changes,
 * not scattered if/else in UI or llmService.
 *
 * Evolution: add a new kind + mapper; assign by modelPattern; never invent
 * fields for an unknown kind (fail-closed via missing mapRequest).
 */
export type EffortControlKind =
  /** OpenAI Chat Completions: top-level reasoning_effort */
  | 'openai_reasoning_effort'
  /** OpenAI Responses: reasoning.effort (+ optional summary) */
  | 'openai_responses_reasoning'
  /** Anthropic Messages: output_config.effort (adaptive thinking era) */
  | 'anthropic_output_effort'
  /** Anthropic legacy: thinking.type=enabled + budget_tokens */
  | 'anthropic_budget_tokens'
  /** Gemini generateContent / gateway: thinking budget (+ optional effort string) */
  | 'gemini_thinking_budget'
  /**
   * Anthropic-style thinking.type toggle on OpenAI-compatible surfaces
   * (Kimi K2.x): thinking.type enabled/disabled; product has no effort tiers.
   */
  | 'openai_thinking_toggle'
  /**
   * Thinking toggle + OpenAI reasoning_effort on OpenAI-compatible surfaces
   * (DeepSeek V4 low|high|max; GLM-5.x max|xhigh|high|medium|low).
   */
  | 'openai_thinking_plus_effort'
  | 'none';

export interface SurfaceCapability extends SurfaceCapabilityFlags {
  supportsReasoning: boolean;
  reasoningEfforts?: ReasoningEffortLevel[];
  defaultEffort?: ReasoningEffortLevel;
  /**
   * Product default for the reasoning toggle when the user has no stored
   * preference. Mirrors the vendor default (e.g. GLM-4.7 / Qwen3 ship with
   * thinking ON; DeepSeek V4 on this gateway ships OFF). Off (explicit) then
   * sends the vendor disable field instead of omitting.
   */
  defaultEnabled?: boolean;
  temperatureIgnored?: boolean;
  /**
   * Official control channel for this surface generation.
   * Used for diagnostics, docs, and future dual-path gateways.
   */
  effortControlKind?: EffortControlKind;
  /**
   * Map product prefs → request body fragment for THIS surface only.
   * enabled=false / effort=off → {} (omit fields).
   * llowed is the resolved model allowlist on this surface: mappers must
   * pass through allowlisted tiers and clamp only values outside it (wire
   * enums can be narrower than the product axis, e.g. o-series caps at high).
   */
  mapRequest?: (prefs: {
    enabled: boolean;
    effort: ReasoningEffort;
    allowed?: readonly ReasoningEffortLevel[];
    /**
     * Capability default for the toggle; lets mappers decide whether an
     * explicit off must send the vendor disable field (default-on families)
     * or can omit (default-off families).
     */
    defaultEnabled?: boolean;
  }) => Record<string, unknown>;
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
  defaultEnabled: boolean;
  temperatureIgnored: boolean;
  features: string[];
  /** null when this surface has no mapRequest — never write reasoning fields */
  mapRequest: SurfaceCapability['mapRequest'] | null;
  /** Wire control kind from registry (SSOT for vendor API alignment). */
  effortControlKind: EffortControlKind;
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
  /**
   * Effort applied on the wire when enabled; `off` when reasoning is disabled
   * or capability fail-closes.
   */
  effort: ReasoningEffort;
  /**
   * Pre-clamp user/session intent (L1). When demoted to fit the model allowlist,
   * this differs from `effort` (e.g. requested=max, effort=high on grok-4.5).
   */
  requestedEffort: ReasoningEffort;
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

export const DEFAULT_REASONING_EFFORTS: ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

export const DEFAULT_API_SURFACE: ApiSurface = 'chat_completions';
