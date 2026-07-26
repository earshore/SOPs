/**
 * Multi-protocol flagship model capability catalog (2026-07).
 *
 * No label-only "fake" reasoning: if supportsReasoning on a surface, that surface
 * MUST provide mapRequest. UI shows only when resolved surface has mapRequest.
 *
 * Surfaces:
 * - chat_completions: /v1/chat/completions
 * - responses: /v1/responses (OpenAI Responses API; live on project new-api)
 */

import {
  mapAnthropicOutputEffort,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
} from './mappers';
import type {
  ApiSurface,
  EffortControlKind,
  ModelCapabilityRule,
  ReasoningEffortLevel,
  SurfaceCapability,
} from './types';
import { DEFAULT_REASONING_EFFORTS } from './types';

/** Per-surface effort profile — product keeps 5 tiers; each model lists what it can send. */
type EffortProfile = {
  temperatureIgnored?: boolean;
  reasoningEfforts?: readonly ReasoningEffortLevel[];
  defaultEffort?: ReasoningEffortLevel;
};

/** xAI grok-4.5 official: low|medium|high (default high); no xhigh/max/none. */
const GROK_45_EFFORTS: readonly ReasoningEffortLevel[] = ['low', 'medium', 'high'];
/** xAI multi-agent: low|medium|high|xhigh (agent count, not depth). */
const GROK_MULTI_AGENT_EFFORTS: readonly ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
];
/** OpenAI-compatible effort triad (conservative default for non-flagship chat models). */
const OPENAI_TRIAD_EFFORTS: readonly ReasoningEffortLevel[] = ['low', 'medium', 'high'];
/**
 * OpenAI flagship reasoning (GPT-5.x / o-series): docs allow high + xhigh + max
 * (plus lower tiers). Product L1 still uses low…max without none/minimal this release.
 */
const OPENAI_FLAGSHIP_EFFORTS: readonly ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

function resolveEffortFields(opts?: EffortProfile): {
  reasoningEfforts: ReasoningEffortLevel[];
  defaultEffort: ReasoningEffortLevel;
} {
  const reasoningEfforts = [...(opts?.reasoningEfforts ?? OPENAI_TRIAD_EFFORTS)];
  const preferred = opts?.defaultEffort;
  const defaultEffort =
    preferred && reasoningEfforts.includes(preferred)
      ? preferred
      : reasoningEfforts.includes('medium')
        ? 'medium'
        : (reasoningEfforts[0] ?? 'medium');
  return { reasoningEfforts, defaultEffort };
}

function surfaceOpenAiEffort(opts?: EffortProfile): SurfaceCapability {
  const { reasoningEfforts, defaultEffort } = resolveEffortFields(opts);
  return {
    supportsReasoning: true,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: opts?.temperatureIgnored ?? true,
    effortControlKind: 'openai_reasoning_effort' satisfies EffortControlKind,
    mapRequest: mapOpenAiReasoningEffort,
    // Official Chat Completions Create parity: structured + tools + vision
    supportsStructuredOutput: true,
    supportsTools: true,
    supportsVision: true,
  };
}

function surfaceResponses(opts?: EffortProfile): SurfaceCapability {
  const { reasoningEfforts, defaultEffort } = resolveEffortFields(opts);
  return {
    supportsReasoning: true,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: opts?.temperatureIgnored ?? true,
    effortControlKind: 'openai_responses_reasoning' satisfies EffortControlKind,
    mapRequest: mapResponsesReasoning,
    // OpenAI Responses capability matrix (text-first SOPs subset + declared parity flags)
    supportsStructuredOutput: true,
    supportsTools: true,
    supportsVision: true,
    // Fail-closed: many OpenAI-compatible gateways reject store/previous_response_id (400).
    // Opt-in only when a gateway probe or explicit rule enables them.
    supportsPreviousResponseId: false,
    supportsStore: false,
    supportsBuiltInTools: true,
    supportsReasoningSummary: true,
  };
}

/**
 * Claude official effort string API (adaptive thinking era).
 * Wire: output_config.effort = low|medium|high|xhigh|max (NOT "extra").
 * Default high matches Anthropic docs.
 */
function surfaceAnthropicOutputEffort(opts?: EffortProfile): SurfaceCapability {
  const { reasoningEfforts, defaultEffort } = resolveEffortFields({
    reasoningEfforts: DEFAULT_REASONING_EFFORTS,
    defaultEffort: 'high',
    ...opts,
  });
  return {
    supportsReasoning: true,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: true,
    effortControlKind: 'anthropic_output_effort',
    mapRequest: mapAnthropicOutputEffort,
    supportsStructuredOutput: true,
    supportsTools: true,
    supportsVision: true,
  };
}

/** Claude legacy extended thinking: thinking.budget_tokens ladder. */
function surfaceAnthropicBudget(opts?: EffortProfile): SurfaceCapability {
  const { reasoningEfforts, defaultEffort } = resolveEffortFields({
    reasoningEfforts: DEFAULT_REASONING_EFFORTS,
    defaultEffort: 'medium',
    ...opts,
  });
  return {
    supportsReasoning: true,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: true,
    effortControlKind: 'anthropic_budget_tokens',
    mapRequest: mapAnthropicThinking,
    supportsStructuredOutput: true,
    supportsTools: true,
    supportsVision: true,
  };
}

function surfaceGemini(opts?: EffortProfile): SurfaceCapability {
  // Budget mapper supports full product scale (low…max).
  const { reasoningEfforts, defaultEffort } = resolveEffortFields({
    reasoningEfforts: DEFAULT_REASONING_EFFORTS,
    defaultEffort: 'medium',
    ...opts,
  });
  return {
    supportsReasoning: true,
    reasoningEfforts,
    defaultEffort,
    temperatureIgnored: false,
    effortControlKind: 'gemini_thinking_budget',
    mapRequest: mapGeminiThinking,
    supportsStructuredOutput: true,
    supportsTools: true,
    supportsVision: true,
  };
}

function entry(
  modelPattern: string,
  contextWindow: number,
  preferredSurface: ApiSurface,
  surfaces: ModelCapabilityRule['surfaces'],
  features: string[] = ['reasoning']
): ModelCapabilityRule {
  return {
    modelPattern,
    contextWindow,
    preferredSurface,
    surfaces,
    features,
  };
}

/** OpenAI o/gpt reasoning: prefer responses when available, completions as fallback. */
function openaiReasoning(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const profile: EffortProfile = {
    temperatureIgnored: true,
    reasoningEfforts: OPENAI_FLAGSHIP_EFFORTS,
    defaultEffort: 'medium',
  };
  return entry(
    modelPattern,
    contextWindow,
    'responses',
    {
      responses: surfaceResponses(profile),
      chat_completions: surfaceOpenAiEffort(profile),
    },
    ['reasoning', 'max_completion_tokens']
  );
}

/** Chat-style models verified on completions (Grok / DeepSeek / Hy3). */
function chatEffort(
  modelPattern: string,
  contextWindow: number,
  preferred: ApiSurface = 'chat_completions',
  effort?: Pick<EffortProfile, 'reasoningEfforts' | 'defaultEffort'>
): ModelCapabilityRule {
  const profile: EffortProfile = {
    temperatureIgnored: false,
    reasoningEfforts: effort?.reasoningEfforts ?? OPENAI_TRIAD_EFFORTS,
    defaultEffort: effort?.defaultEffort,
  };
  return entry(modelPattern, contextWindow, preferred, {
    chat_completions: surfaceOpenAiEffort(profile),
    responses: surfaceResponses(profile),
  });
}

/** Claude with official output_config.effort (4.5+/4.6+ effort-capable models). */
function claudeOutputEffort(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const surface = surfaceAnthropicOutputEffort();
  return entry(
    modelPattern,
    contextWindow,
    'anthropic_messages',
    {
      anthropic_messages: surface,
      // OpenAI-compatible gateways: still send output_config when channel is Claude.
      chat_completions: surface,
      responses: surfaceResponses({ temperatureIgnored: true }),
    },
    ['reasoning', 'claude', 'anthropic_output_effort']
  );
}

/** Claude legacy thinking.budget_tokens (3.x / thinking-only 4.x). */
function claudeBudgetThinking(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const surface = surfaceAnthropicBudget();
  return entry(
    modelPattern,
    contextWindow,
    'anthropic_messages',
    {
      anthropic_messages: surface,
      chat_completions: surface,
      responses: surfaceResponses({ temperatureIgnored: true }),
    },
    ['reasoning', 'claude', 'anthropic_budget_tokens']
  );
}

function geminiThinking(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const geminiSurface: SurfaceCapability = surfaceGemini();
  return entry(
    modelPattern,
    contextWindow,
    'gemini_generate',
    {
      gemini_generate: {
        ...geminiSurface,
        // Native Gemini body uses thinkingConfig (built in protocolBodies)
        mapRequest: geminiSurface.mapRequest,
      },
      chat_completions: surfaceGemini(),
      responses: surfaceResponses({ temperatureIgnored: false }),
    },
    ['reasoning', 'gemini']
  );
}

export const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = [
  // OpenAI o-series + GPT-5 flagship
  openaiReasoning('o1', 200_000),
  openaiReasoning('o1-mini', 128_000),
  openaiReasoning('o1-preview', 128_000),
  openaiReasoning('o1-pro', 200_000),
  openaiReasoning('o1-mini-*', 128_000),
  openaiReasoning('o1-pro-*', 200_000),
  openaiReasoning('o3', 200_000),
  openaiReasoning('o3-mini', 200_000),
  openaiReasoning('o3-pro', 200_000),
  openaiReasoning('o3-mini-*', 200_000),
  openaiReasoning('o3-pro-*', 200_000),
  openaiReasoning('o4-mini', 200_000),
  openaiReasoning('o4-mini-*', 200_000),
  openaiReasoning('gpt-5', 256_000),
  openaiReasoning('gpt-5-mini', 128_000),
  openaiReasoning('gpt-5-nano', 128_000),
  openaiReasoning('gpt-5-pro', 256_000),
  openaiReasoning('gpt-5.1', 256_000),
  openaiReasoning('gpt-5.1-*', 256_000),
  openaiReasoning('gpt-5.2', 256_000),
  openaiReasoning('gpt-5.2-*', 256_000),
  openaiReasoning('gpt-5.5', 256_000),
  openaiReasoning('gpt-5.5-*', 256_000),
  openaiReasoning('gpt-5.6', 256_000),
  openaiReasoning('gpt-5.6-*', 256_000),
  openaiReasoning('gpt-5-*', 256_000),

  // xAI Grok — efforts from docs.x.ai (model-scoped; product still has low…max)
  // grok-4.5: low|medium|high default high; cannot disable; no xhigh/max
  chatEffort('grok-4.5', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_45_EFFORTS,
    defaultEffort: 'high',
  }),
  chatEffort('grok-4.5-*', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_45_EFFORTS,
    defaultEffort: 'high',
  }),
  // multi-agent: effort controls agent count; includes xhigh
  chatEffort('grok-4.20-multi-agent', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_MULTI_AGENT_EFFORTS,
    defaultEffort: 'medium',
  }),
  chatEffort('grok-4.20-multi-agent-*', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_MULTI_AGENT_EFFORTS,
    defaultEffort: 'medium',
  }),
  // grok-4.3 chat: none|low|medium|high — product "none" = prefs.enabled false
  chatEffort('grok-4.3', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_45_EFFORTS,
    defaultEffort: 'low',
  }),
  chatEffort('grok-4.3-*', 256_000, 'chat_completions', {
    reasoningEfforts: GROK_45_EFFORTS,
    defaultEffort: 'low',
  }),
  // remaining grok-4* (e.g. grok-4-0709 aliases): triad, default medium
  chatEffort('grok-4*', 256_000, 'chat_completions', {
    reasoningEfforts: OPENAI_TRIAD_EFFORTS,
    defaultEffort: 'medium',
  }),
  chatEffort('grok-3-mini', 128_000, 'chat_completions', {
    reasoningEfforts: OPENAI_TRIAD_EFFORTS,
    defaultEffort: 'medium',
  }),
  chatEffort('grok-3-mini-*', 128_000, 'chat_completions', {
    reasoningEfforts: OPENAI_TRIAD_EFFORTS,
    defaultEffort: 'medium',
  }),
  chatEffort('grok-3', 128_000, 'chat_completions', {
    reasoningEfforts: OPENAI_TRIAD_EFFORTS,
    defaultEffort: 'medium',
  }),
  chatEffort('grok-3-*', 128_000, 'chat_completions', {
    reasoningEfforts: OPENAI_TRIAD_EFFORTS,
    defaultEffort: 'medium',
  }),

  // DeepSeek
  chatEffort('deepseek-v4-flash', 128_000),
  chatEffort('deepseek-v4-flash-*', 128_000),
  chatEffort('deepseek-v4-*', 128_000),
  chatEffort('deepseek-reasoner', 128_000),
  chatEffort('deepseek-r1', 128_000),
  chatEffort('deepseek-r1-*', 128_000),

  chatEffort('hy3-preview', 128_000),
  chatEffort('hy3-*', 128_000),

  // Anthropic Claude — order: more specific + newer effort API first, then legacy budget.
  // Official effort string: low|medium|high|xhigh|max (no "extra"). See Effort docs.
  claudeOutputEffort('claude-opus-4.8', 200_000),
  claudeOutputEffort('claude-opus-4.8-*', 200_000),
  claudeOutputEffort('claude-opus-4.7', 200_000),
  claudeOutputEffort('claude-opus-4.7-*', 200_000),
  claudeOutputEffort('claude-opus-4.6', 200_000),
  claudeOutputEffort('claude-opus-4.6-*', 200_000),
  claudeOutputEffort('claude-opus-4.5', 200_000),
  claudeOutputEffort('claude-opus-4.5-*', 200_000),
  claudeOutputEffort('claude-opus-4-5-*', 200_000),
  claudeOutputEffort('claude-opus-5', 200_000),
  claudeOutputEffort('claude-opus-5-*', 200_000),
  claudeOutputEffort('claude-sonnet-5', 200_000),
  claudeOutputEffort('claude-sonnet-5-*', 200_000),
  claudeOutputEffort('claude-sonnet-4.6', 200_000),
  claudeOutputEffort('claude-sonnet-4.6-*', 200_000),
  claudeOutputEffort('claude-sonnet-4-6-*', 200_000),
  // Legacy budget_tokens (thinking-only / pre-effort generations)
  claudeBudgetThinking('claude-sonnet-4.5', 200_000),
  claudeBudgetThinking('claude-sonnet-4.5-*', 200_000),
  claudeBudgetThinking('claude-sonnet-4-5-*', 200_000),
  claudeBudgetThinking('claude-sonnet-4', 200_000),
  claudeBudgetThinking('claude-sonnet-4-*', 200_000),
  claudeBudgetThinking('claude-opus-4', 200_000),
  claudeBudgetThinking('claude-opus-4-*', 200_000),
  claudeBudgetThinking('claude-haiku-4', 200_000),
  claudeBudgetThinking('claude-haiku-4-*', 200_000),
  claudeBudgetThinking('claude-4-opus*', 200_000),
  claudeBudgetThinking('claude-4-sonnet*', 200_000),
  claudeBudgetThinking('claude-3-7-sonnet*', 200_000),
  claudeBudgetThinking('claude-3-5-sonnet*', 200_000),

  // Google Gemini — real thinking mapper
  geminiThinking('gemini-3.6-flash', 1_000_000),
  geminiThinking('gemini-3.6-flash-*', 1_000_000),
  geminiThinking('gemini-3.6-pro', 1_000_000),
  geminiThinking('gemini-3.6-pro-*', 1_000_000),
  geminiThinking('gemini-3.5-flash', 1_000_000),
  geminiThinking('gemini-3.5-flash-*', 1_000_000),
  geminiThinking('gemini-3.5-pro', 1_000_000),
  geminiThinking('gemini-3.5-pro-*', 1_000_000),
  geminiThinking('gemini-3-flash*', 1_000_000),
  geminiThinking('gemini-3-pro*', 1_000_000),
  geminiThinking('gemini-2.5-flash', 1_000_000),
  geminiThinking('gemini-2.5-flash-*', 1_000_000),
  geminiThinking('gemini-2.5-pro', 1_000_000),
  geminiThinking('gemini-2.5-pro-*', 1_000_000),

  // CN popular reasoning lines — OpenAI effort on completions + responses
  chatEffort('kimi-k2*', 128_000),
  chatEffort('moonshot-v1-thinking*', 128_000),
  chatEffort('qwen3*', 128_000),
  chatEffort('qwen-qwq*', 128_000),
  chatEffort('qwq*', 128_000),
  chatEffort('glm-4.5*', 128_000),
  chatEffort('glm-z1*', 128_000),
];

export function getModelCapabilityRules(): readonly ModelCapabilityRule[] {
  return MODEL_CAPABILITY_RULES;
}

export const MODEL_CAPABILITY_CATALOG_META = {
  asOf: '2026-07-26',
  surfaces: ['chat_completions', 'responses'] as const,
  /** Product UI scale (filter per model via reasoningEfforts). */
  productReasoningEfforts: DEFAULT_REASONING_EFFORTS,
  controlFieldBySurface: {
    chat_completions: 'reasoning_effort | thinking | extra_body.google.thinking_config',
    responses: 'reasoning.effort',
  },
  liveProbeGateway: 'https://new.hongecb.store/v1',
} as const;

// Re-export mappers for tests / diagnostics
export {
  mapAnthropicOutputEffort,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
} from './mappers';
