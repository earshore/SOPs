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
  mapAnthropicOutputEffortSummarized,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapOpenAiThinkingToggle,
  mapResponsesReasoning,
  mapThinkingPlusEffort,
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
 * OpenAI flagship reasoning (GPT-5.x): official docs are model-dependent and
 * this generation can include xhigh/max. Product L1 keeps low…max (no
 * none/minimal on the product axis this release).
 */
const OPENAI_FLAGSHIP_EFFORTS: readonly ReasoningEffortLevel[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];
/**
 * OpenAI o-series: official reasoning_effort enum is minimal|low|medium|high —
 * xhigh/max are not supported there, so the product axis caps at high.
 */
const OPENAI_O_SERIES_EFFORTS: readonly ReasoningEffortLevel[] = ['low', 'medium', 'high'];
/** Claude 4.6 generation: low|medium|high|max — xhigh arrived with Opus 4.7. */
const CLAUDE_46_EFFORTS: readonly ReasoningEffortLevel[] = ['low', 'medium', 'high', 'max'];

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
 * summarizedDisplay: 4.7+ defaults thinking.display to "omitted" (empty thinking
 * text on the stream) — opt into "summarized" so the 深度思考 UI gets content.
 * 4.6 must NOT send display (param arrived with 4.7; 4.6 already summarizes).
 */
function surfaceAnthropicOutputEffort(
  opts?: EffortProfile & { summarizedDisplay?: boolean }
): SurfaceCapability {
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
    mapRequest:
      opts?.summarizedDisplay === false
        ? mapAnthropicOutputEffort
        : mapAnthropicOutputEffortSummarized,
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

/**
 * OpenAI o/gpt reasoning: prefer responses when available, completions as fallback.
 * Pass an effort profile to scope the allowlist (o-series caps at high).
 */
function openaiReasoning(
  modelPattern: string,
  contextWindow: number,
  effort?: Pick<EffortProfile, 'reasoningEfforts' | 'defaultEffort'>
): ModelCapabilityRule {
  const profile: EffortProfile = {
    temperatureIgnored: true,
    reasoningEfforts: effort?.reasoningEfforts ?? OPENAI_FLAGSHIP_EFFORTS,
    defaultEffort: effort?.defaultEffort,
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

/** o-series: official enum minimal|low|medium|high — product axis caps at high. */
function openaiOSeries(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  return openaiReasoning(modelPattern, contextWindow, {
    reasoningEfforts: OPENAI_O_SERIES_EFFORTS,
    defaultEffort: 'medium',
  });
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

/**
 * DeepSeek V4 (deepseek-v4-flash/pro): official Thinking Mode — toggle
 * thinking.type (extra_body) + reasoning_effort low|high|max (no medium),
 * thinking ON by default with default effort high.
 * Responses API: reasoning.effort none|low|high|max.
 */
function deepseekEffort(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const profile: EffortProfile = {
    temperatureIgnored: true,
    reasoningEfforts: ['low', 'high', 'max'],
    defaultEffort: 'high',
  };
  return entry(
    modelPattern,
    contextWindow,
    'chat_completions',
    {
      chat_completions: {
        supportsReasoning: true,
        reasoningEfforts: ['low', 'high', 'max'],
        defaultEffort: 'high',
        temperatureIgnored: true,
        effortControlKind: 'openai_thinking_plus_effort',
        mapRequest: mapThinkingPlusEffort,
        supportsStructuredOutput: true,
        supportsTools: true,
        supportsVision: true,
      },
      responses: surfaceResponses(profile),
    },
    ['reasoning', 'deepseek', 'thinking_effort']
  );
}

/**
 * GLM-5.x (Zhipu): 深度思考 — thinking.type + reasoning_effort (GLM-5.2+;
 * official enum max|xhigh|high|medium|low|minimal|none; low/medium map to
 * high and xhigh maps to max server-side). Default thinking ON, effort max.
 * GLM-4.5/4.6/4.7 and GLM-Z1 have no effort tier — fail-closed (no rule).
 */
function glmEffort(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  const profile: EffortProfile = {
    temperatureIgnored: false,
    reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffort: 'max',
  };
  return entry(
    modelPattern,
    contextWindow,
    'chat_completions',
    {
      chat_completions: {
        supportsReasoning: true,
        reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
        defaultEffort: 'max',
        temperatureIgnored: false,
        effortControlKind: 'openai_thinking_plus_effort',
        mapRequest: mapThinkingPlusEffort,
        supportsStructuredOutput: true,
        supportsTools: true,
        supportsVision: true,
      },
      responses: surfaceResponses(profile),
    },
    ['reasoning', 'glm', 'thinking_effort']
  );
}

/**
 * Kimi K2.x thinking toggle (thinking.type enabled/disabled; K2.x ships with
 * thinking ON by default — off omits the field so vendor default applies).
 * K3 is a separate effort family (low|high|max) via chatEffort below.
 */
function kimiThinkingToggle(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  return entry(
    modelPattern,
    contextWindow,
    'chat_completions',
    {
      chat_completions: {
        supportsReasoning: true,
        reasoningEfforts: [],
        defaultEffort: 'medium',
        temperatureIgnored: false,
        effortControlKind: 'openai_thinking_toggle',
        mapRequest: mapOpenAiThinkingToggle,
        supportsStructuredOutput: true,
        supportsTools: true,
        supportsVision: true,
      },
    },
    ['reasoning', 'kimi', 'thinking_toggle']
  );
}

/** Claude with official output_config.effort (adaptive-thinking generations, 4.6+). */
function claudeOutputEffort(
  modelPattern: string,
  contextWindow: number,
  effort?: Pick<EffortProfile, 'reasoningEfforts' | 'defaultEffort'> & {
    summarizedDisplay?: boolean;
  }
): ModelCapabilityRule {
  const surface = surfaceAnthropicOutputEffort(effort);
  return entry(
    modelPattern,
    contextWindow,
    'anthropic_messages',
    {
      anthropic_messages: surface,
      // OpenAI-compatible gateways: still send output_config when channel is Claude.
      chat_completions: surface,
      responses: surfaceResponses({ temperatureIgnored: true, ...effort }),
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
  openaiOSeries('o1', 200_000),
  openaiOSeries('o1-mini', 128_000),
  openaiOSeries('o1-preview', 128_000),
  openaiOSeries('o1-pro', 200_000),
  openaiOSeries('o1-mini-*', 128_000),
  openaiOSeries('o1-pro-*', 200_000),
  openaiOSeries('o3', 200_000),
  openaiOSeries('o3-mini', 200_000),
  openaiOSeries('o3-pro', 200_000),
  openaiOSeries('o3-mini-*', 200_000),
  openaiOSeries('o3-pro-*', 200_000),
  openaiOSeries('o4-mini', 200_000),
  openaiOSeries('o4-mini-*', 200_000),
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

  // grok-3 / 其余 grok-4 别名（grok-4-0709 等）未在官方文档确认 effort 参数，
  // 保持 fail-closed（无规则），待 gateway probe 后再收录。

  // DeepSeek V4 — official Thinking Mode: thinking.type + reasoning_effort
  // low|high|max（无 medium）。deepseek-reasoner/r1 无 effort 参数 → fail-closed。
  deepseekEffort('deepseek-v4-flash', 128_000),
  deepseekEffort('deepseek-v4-flash-*', 128_000),
  deepseekEffort('deepseek-v4-*', 128_000),

  // hy3-*（Tencent Hunyuan 通道）未在官方文档确认推理控制字段 → fail-closed，
  // 待 probe 后再收录。

  // Anthropic Claude — official ids are hyphenated (claude-opus-4-8); dotted
  // gateway aliases normalize to hyphens before matching (normalizeModelId).
  // Order: newer effort API first, then 4.6 (no xhigh), then legacy budget.
  // Claude 5 line + 4.7/4.8: adaptive thinking + output_config.effort low…max.
  claudeOutputEffort('claude-opus-4-8', 200_000),
  claudeOutputEffort('claude-opus-4-8-*', 200_000),
  claudeOutputEffort('claude-opus-4-7', 200_000),
  claudeOutputEffort('claude-opus-4-7-*', 200_000),
  claudeOutputEffort('claude-opus-5', 200_000),
  claudeOutputEffort('claude-opus-5-*', 200_000),
  claudeOutputEffort('claude-sonnet-5', 200_000),
  claudeOutputEffort('claude-sonnet-5-*', 200_000),
  claudeOutputEffort('claude-fable-5', 1_000_000),
  claudeOutputEffort('claude-fable-5-*', 1_000_000),
  claudeOutputEffort('claude-mythos-5', 1_000_000),
  claudeOutputEffort('claude-mythos-5-*', 1_000_000),
  // Claude 4.6 generation: adaptive + effort, but xhigh only arrived with 4.7,
  // and thinking.display did too — 4.6 defaults to summarized, never send display.
  claudeOutputEffort('claude-opus-4-6', 200_000, {
    reasoningEfforts: CLAUDE_46_EFFORTS,
    summarizedDisplay: false,
  }),
  claudeOutputEffort('claude-opus-4-6-*', 200_000, {
    reasoningEfforts: CLAUDE_46_EFFORTS,
    summarizedDisplay: false,
  }),
  claudeOutputEffort('claude-sonnet-4-6', 200_000, {
    reasoningEfforts: CLAUDE_46_EFFORTS,
    summarizedDisplay: false,
  }),
  claudeOutputEffort('claude-sonnet-4-6-*', 200_000, {
    reasoningEfforts: CLAUDE_46_EFFORTS,
    summarizedDisplay: false,
  }),
  // Legacy budget_tokens: 4.5 and older only support thinking.enabled + budget;
  // adaptive thinking / output_config.effort are 4.6+ parameters (400 earlier).
  claudeBudgetThinking('claude-opus-4-5', 200_000),
  claudeBudgetThinking('claude-opus-4-5-*', 200_000),
  claudeBudgetThinking('claude-sonnet-4-5', 200_000),
  claudeBudgetThinking('claude-sonnet-4-5-*', 200_000),
  claudeBudgetThinking('claude-sonnet-4', 200_000),
  claudeBudgetThinking('claude-sonnet-4-*', 200_000),
  claudeBudgetThinking('claude-opus-4', 200_000),
  claudeBudgetThinking('claude-opus-4-*', 200_000),
  claudeBudgetThinking('claude-haiku-4', 200_000),
  claudeBudgetThinking('claude-haiku-4-*', 200_000),
  claudeBudgetThinking('claude-4-opus*', 200_000),
  claudeBudgetThinking('claude-4-sonnet*', 200_000),
  // 3.7 Sonnet introduced extended thinking; 3.5 never supported it (no rule).
  claudeBudgetThinking('claude-3-7-sonnet*', 200_000),

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

  // Kimi — K3: reasoning_effort low|high|max（默认 max，始终推理）。
  // K2.x: thinking.type 开关（默认开；off 省略字段保持厂商默认）。
  // kimi-k2.7-code 不接受 thinking 参数 → fail-closed。
  chatEffort('kimi-k3*', 128_000, 'chat_completions', {
    reasoningEfforts: ['low', 'high', 'max'],
    defaultEffort: 'max',
  }),
  kimiThinkingToggle('kimi-k2', 128_000),
  kimiThinkingToggle('kimi-k2.5', 128_000),
  kimiThinkingToggle('kimi-k2.5-*', 128_000),
  kimiThinkingToggle('kimi-k2.6', 128_000),
  kimiThinkingToggle('kimi-k2.6-*', 128_000),
  // moonshot-v1-thinking / qwen3 / qwq：官方无 OpenAI 兼容 effort 依据
  // （qwen3 原生为 enable_thinking，OpenAI 兼容端未验证）→ fail-closed，待 probe。

  // GLM — 5.x: thinking.type + reasoning_effort（GLM-5.2+ 官方档位）。
  // GLM-4.5/4.6/4.7 与 GLM-Z1 无档位参数（默认行为各异）→ fail-closed。
  glmEffort('glm-5*', 128_000),
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
  mapAnthropicOutputEffortSummarized,
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapOpenAiThinkingToggle,
  mapResponsesReasoning,
  mapThinkingPlusEffort,
} from './mappers';
