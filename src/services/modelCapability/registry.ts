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
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
} from './mappers';
import type { ApiSurface, ModelCapabilityRule, SurfaceCapability } from './types';

function surfaceOpenAiEffort(opts?: { temperatureIgnored?: boolean }): SurfaceCapability {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: opts?.temperatureIgnored ?? true,
    mapRequest: mapOpenAiReasoningEffort,
  };
}

function surfaceResponses(opts?: { temperatureIgnored?: boolean }): SurfaceCapability {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: opts?.temperatureIgnored ?? true,
    mapRequest: mapResponsesReasoning,
  };
}

function surfaceAnthropic(): SurfaceCapability {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: true,
    mapRequest: mapAnthropicThinking,
  };
}

function surfaceGemini(): SurfaceCapability {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: false,
    mapRequest: mapGeminiThinking,
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
  return entry(modelPattern, contextWindow, 'responses', {
    responses: surfaceResponses({ temperatureIgnored: true }),
    chat_completions: surfaceOpenAiEffort({ temperatureIgnored: true }),
  });
}

/** Chat-style models verified on completions (Grok / DeepSeek / Hy3). */
function chatEffort(
  modelPattern: string,
  contextWindow: number,
  preferred: ApiSurface = 'chat_completions'
): ModelCapabilityRule {
  return entry(modelPattern, contextWindow, preferred, {
    chat_completions: surfaceOpenAiEffort({ temperatureIgnored: false }),
    responses: surfaceResponses({ temperatureIgnored: false }),
  });
}

function claudeThinking(modelPattern: string, contextWindow: number): ModelCapabilityRule {
  return entry(
    modelPattern,
    contextWindow,
    'anthropic_messages',
    {
      anthropic_messages: surfaceAnthropic(),
      chat_completions: surfaceAnthropic(),
      responses: surfaceResponses({ temperatureIgnored: true }),
    },
    ['reasoning', 'claude']
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

  // xAI Grok — completions verified; responses also live on new-api
  chatEffort('grok-4.5', 256_000, 'chat_completions'),
  chatEffort('grok-4.5-*', 256_000),
  chatEffort('grok-4*', 256_000),
  chatEffort('grok-3-mini', 128_000),
  chatEffort('grok-3-mini-*', 128_000),
  chatEffort('grok-3', 128_000),
  chatEffort('grok-3-*', 128_000),

  // DeepSeek
  chatEffort('deepseek-v4-flash', 128_000),
  chatEffort('deepseek-v4-flash-*', 128_000),
  chatEffort('deepseek-v4-*', 128_000),
  chatEffort('deepseek-reasoner', 128_000),
  chatEffort('deepseek-r1', 128_000),
  chatEffort('deepseek-r1-*', 128_000),

  chatEffort('hy3-preview', 128_000),
  chatEffort('hy3-*', 128_000),

  // Anthropic Claude — real thinking mapper (not label-only)
  claudeThinking('claude-opus-4', 200_000),
  claudeThinking('claude-opus-4-*', 200_000),
  claudeThinking('claude-opus-4.5', 200_000),
  claudeThinking('claude-opus-4.5-*', 200_000),
  claudeThinking('claude-sonnet-4', 200_000),
  claudeThinking('claude-sonnet-4-*', 200_000),
  claudeThinking('claude-sonnet-4.5', 200_000),
  claudeThinking('claude-sonnet-4.5-*', 200_000),
  claudeThinking('claude-sonnet-4-5-*', 200_000),
  claudeThinking('claude-haiku-4', 200_000),
  claudeThinking('claude-haiku-4-*', 200_000),
  claudeThinking('claude-4-opus*', 200_000),
  claudeThinking('claude-4-sonnet*', 200_000),
  claudeThinking('claude-3-7-sonnet*', 200_000),
  claudeThinking('claude-3-5-sonnet*', 200_000),

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
  asOf: '2026-07-23',
  surfaces: ['chat_completions', 'responses'] as const,
  controlFieldBySurface: {
    chat_completions: 'reasoning_effort | thinking | extra_body.google.thinking_config',
    responses: 'reasoning.effort',
  },
  liveProbeGateway: 'https://new.hongecb.store/v1',
} as const;

// Re-export mappers for tests / diagnostics
export {
  mapAnthropicThinking,
  mapGeminiThinking,
  mapOpenAiReasoningEffort,
  mapResponsesReasoning,
} from './mappers';
