import type { EffectiveReasoningPrefs, ResolvedModelCapability } from './types';

export type ChatCompletionsBodyBase = Record<string, unknown> & {
  model: string;
  messages: unknown;
};

function applyTemperatureToBody(
  body: Record<string, unknown>,
  temperatureIgnored: boolean,
  temperature: number | undefined
): void {
  if (temperatureIgnored) {
    delete body.temperature;
    return;
  }
  if (temperature !== undefined && body.temperature === undefined) {
    body.temperature = temperature;
  }
}

function mergeMapperFields(body: Record<string, unknown>, extra: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(extra)) {
    if (key === 'model' || key === 'messages') {
      continue;
    }
    body[key] = value;
  }
}

/**
 * Merge capability mapper output into a chat/completions body.
 * Never overwrites model/messages. No mapRequest → no reasoning fields.
 */
export function applyReasoningToRequestBody(
  base: ChatCompletionsBodyBase,
  capability: Pick<
    ResolvedModelCapability,
    'mapRequest' | 'temperatureIgnored' | 'supportsReasoning'
  >,
  reasoning: EffectiveReasoningPrefs,
  options?: { temperature?: number }
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...base };
  applyTemperatureToBody(body, capability.temperatureIgnored, options?.temperature);

  if (!capability.mapRequest) {
    return body;
  }

  const extra = capability.mapRequest({
    enabled: reasoning.enabled,
    effort: reasoning.enabled ? reasoning.effort : 'off',
  });
  if (extra && typeof extra === 'object') {
    mergeMapperFields(body, extra);
  }
  return body;
}

/**
 * Full body builder used by llmService (and tests).
 */
export function buildChatCompletionsBody(args: {
  model: string;
  messages: unknown;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  serviceTier?: string;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const base: ChatCompletionsBodyBase = {
    model: args.model,
    messages: args.messages,
  };

  if (args.stream) {
    base.stream = true;
  }
  if (args.maxTokens !== undefined) {
    base.max_tokens = args.maxTokens;
  }
  if (args.jsonMode) {
    base.response_format = { type: 'json_object' };
  }
  if (args.serviceTier) {
    base.service_tier = args.serviceTier;
  }

  return applyReasoningToRequestBody(base, args.capability, args.reasoning, {
    temperature: args.temperature,
  });
}
