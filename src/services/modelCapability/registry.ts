/**
 * Flagship model capability catalog (2026-07).
 *
 * Coverage goal: latest / most popular models across major vendors used via
 * OpenAI-compatible gateways (new-api etc.).
 *
 * Tiers:
 * - **control**: supportsReasoning + mapRequest → UI + request fields
 * - **label**: supportsReasoning without mapRequest → no UI, no fields (fail-closed)
 * - unmatched: fail-closed (no UI, no fields)
 *
 * Field contract (control tier): OpenAI-compatible `reasoning_effort` unless noted.
 * Off: mapper returns {} (omit field).
 *
 * Live probe note (project new-api, 2026-07-23, key-scoped catalog):
 * - OK + effort: deepseek-v4-flash, grok-4.5, hy3-preview
 * - Claude sonnet 4.5: plain 200; reasoning_effort / thinking → 400 → label only
 */

import type { ModelCapabilityRule, ReasoningEffort } from './types';

/** OpenAI-compatible reasoning_effort mapper (empty when off). */
export function mapOpenAiReasoningEffort(prefs: {
  enabled: boolean;
  effort: ReasoningEffort;
}): Record<string, unknown> {
  if (!prefs.enabled || prefs.effort === 'off') {
    return {};
  }
  return { reasoning_effort: prefs.effort };
}

type RuleOpts = {
  temperatureIgnored?: boolean;
  /** When false, register as label-only (no UI / no request fields). */
  mapRequest?: boolean;
  features?: string[];
  contextWindow?: number;
};

function rule(
  modelPattern: string,
  contextWindow: number,
  opts: RuleOpts = {}
): ModelCapabilityRule {
  const withMap = opts.mapRequest !== false;
  return {
    modelPattern,
    contextWindow: opts.contextWindow ?? contextWindow,
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: opts.temperatureIgnored ?? true,
    features: opts.features ?? ['reasoning'],
    ...(withMap ? { mapRequest: mapOpenAiReasoningEffort } : {}),
  };
}

/** Control-tier: OpenAI-style effort field (temp ignored — typical for o/gpt-reasoning SKUs). */
function controlReasoning(
  modelPattern: string,
  contextWindow: number,
  opts?: Omit<RuleOpts, 'mapRequest'>
): ModelCapabilityRule {
  return rule(modelPattern, contextWindow, { ...opts, mapRequest: true });
}

/** Control-tier chat-style: effort field, keep temperature. */
function controlChatReasoning(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  return rule(modelPattern, contextWindow, {
    mapRequest: true,
    temperatureIgnored: false,
  });
}

/** Label-tier: known reasoning model; UI/fields stay closed until mapper verified. */
function labelReasoning(
  modelPattern: string,
  contextWindow: number,
  features: string[] = ['reasoning']
): ModelCapabilityRule {
  return rule(modelPattern, contextWindow, {
    mapRequest: false,
    temperatureIgnored: true,
    features,
  });
}

/**
 * Ordered allowlist — first match wins. Prefer exact / tight prefixes.
 * Patterns are matched case-insensitively (see matchModelPattern).
 */
export const MODEL_CAPABILITY_RULES: readonly ModelCapabilityRule[] = [
  // ---------------------------------------------------------------------------
  // OpenAI — o-series (reasoning API contract: reasoning_effort)
  // ---------------------------------------------------------------------------
  controlReasoning('o1', 200_000),
  controlReasoning('o1-mini', 128_000),
  controlReasoning('o1-preview', 128_000),
  controlReasoning('o1-pro', 200_000),
  controlReasoning('o1-mini-*', 128_000),
  controlReasoning('o1-pro-*', 200_000),
  controlReasoning('o3', 200_000),
  controlReasoning('o3-mini', 200_000),
  controlReasoning('o3-pro', 200_000),
  controlReasoning('o3-mini-*', 200_000),
  controlReasoning('o3-pro-*', 200_000),
  controlReasoning('o4-mini', 200_000),
  controlReasoning('o4-mini-*', 200_000),

  // OpenAI — GPT-5 family (flagship 2025–2026; OpenAI-compatible gateways pass reasoning_effort)
  controlReasoning('gpt-5', 256_000),
  controlReasoning('gpt-5-mini', 128_000),
  controlReasoning('gpt-5-nano', 128_000),
  controlReasoning('gpt-5-pro', 256_000),
  controlReasoning('gpt-5.1', 256_000),
  controlReasoning('gpt-5.1-*', 256_000),
  controlReasoning('gpt-5.2', 256_000),
  controlReasoning('gpt-5.2-*', 256_000),
  controlReasoning('gpt-5.5', 256_000),
  controlReasoning('gpt-5.5-*', 256_000),
  controlReasoning('gpt-5.6', 256_000),
  controlReasoning('gpt-5.6-*', 256_000),
  controlReasoning('gpt-5-*', 256_000),

  // ---------------------------------------------------------------------------
  // xAI Grok (live: grok-4.5 + reasoning_effort 200)
  // ---------------------------------------------------------------------------
  controlChatReasoning('grok-4.5', 256_000),
  controlChatReasoning('grok-4.5-*', 256_000),
  controlChatReasoning('grok-4*', 256_000),
  controlChatReasoning('grok-3-mini', 128_000),
  controlChatReasoning('grok-3-mini-*', 128_000),
  // Non-mini Grok 3: often reasoning-capable on gateways
  controlChatReasoning('grok-3', 128_000),
  controlChatReasoning('grok-3-*', 128_000),

  // ---------------------------------------------------------------------------
  // DeepSeek (live: deepseek-v4-flash + reasoning_effort 200)
  // ---------------------------------------------------------------------------
  controlChatReasoning('deepseek-v4-flash', 128_000),
  controlChatReasoning('deepseek-v4-flash-*', 128_000),
  controlChatReasoning('deepseek-v4-*', 128_000),
  controlChatReasoning('deepseek-reasoner', 128_000),
  // R1 family: popular; many gateways accept effort — keep control; probe if 400 then demote
  controlChatReasoning('deepseek-r1', 128_000),
  controlChatReasoning('deepseek-r1-*', 128_000),

  // ---------------------------------------------------------------------------
  // Other gateway-verified / common reasoning SKUs
  // ---------------------------------------------------------------------------
  controlChatReasoning('hy3-preview', 128_000),
  controlChatReasoning('hy3-*', 128_000),

  // ---------------------------------------------------------------------------
  // Anthropic Claude — flagship (label only on this new-api: effort/thinking → 400)
  // User-facing ids often: claude-opus-4-*, claude-sonnet-4-*, claude-haiku-*, dated tags
  // ---------------------------------------------------------------------------
  labelReasoning('claude-opus-4', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-opus-4-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-opus-4.5', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-opus-4.5-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-sonnet-4', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-sonnet-4-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-sonnet-4.5', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-sonnet-4.5-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-sonnet-4-5-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-haiku-4', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-haiku-4-*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-4-opus*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-4-sonnet*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-3-7-sonnet*', 200_000, ['reasoning', 'claude']),
  labelReasoning('claude-3-5-sonnet*', 200_000, ['reasoning', 'claude']),

  // ---------------------------------------------------------------------------
  // Google Gemini — flagship thinking models (label: field names differ by channel)
  // ---------------------------------------------------------------------------
  labelReasoning('gemini-3.6-flash', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.6-flash-*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.6-pro', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.6-pro-*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.5-flash', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.5-flash-*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.5-pro', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3.5-pro-*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3-flash*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-3-pro*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-2.5-flash', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-2.5-flash-*', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-2.5-pro', 1_000_000, ['reasoning', 'gemini']),
  labelReasoning('gemini-2.5-pro-*', 1_000_000, ['reasoning', 'gemini']),

  // ---------------------------------------------------------------------------
  // Popular CN / multi-vendor reasoning (label unless OpenAI-compat effort confirmed)
  // ---------------------------------------------------------------------------
  labelReasoning('kimi-k2*', 128_000, ['reasoning']),
  labelReasoning('moonshot-v1-thinking*', 128_000, ['reasoning']),
  labelReasoning('qwen3*', 128_000, ['reasoning']),
  labelReasoning('qwen-qwq*', 128_000, ['reasoning']),
  labelReasoning('qwq*', 128_000, ['reasoning']),
  labelReasoning('glm-4.5*', 128_000, ['reasoning']),
  labelReasoning('glm-z1*', 128_000, ['reasoning']),
];

export function getModelCapabilityRules(): readonly ModelCapabilityRule[] {
  return MODEL_CAPABILITY_RULES;
}

/** Human-readable catalog meta for docs / diagnostics (not used in hot path). */
export const MODEL_CAPABILITY_CATALOG_META = {
  asOf: '2026-07-23',
  vendors: [
    'openai',
    'xai',
    'deepseek',
    'anthropic',
    'google',
    'moonshot',
    'alibaba-qwen',
    'zhipu',
  ] as const,
  controlField: 'reasoning_effort',
  liveProbeGateway: 'https://new.hongecb.store/v1',
} as const;
