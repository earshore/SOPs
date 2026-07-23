import { readThinkingBudgetTokens } from './mappers';
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
    if (key === 'model' || key === 'messages' || key === 'input') {
      continue;
    }
    body[key] = value;
  }
}

/**
 * Ensure max_tokens > thinking.budget_tokens for Anthropic-compatible channels.
 */
function ensureMaxTokensAboveThinkingBudget(body: Record<string, unknown>): void {
  const budget = readThinkingBudgetTokens(body);
  if (budget === undefined) {
    return;
  }
  const minMax = budget + 512;
  const current = typeof body.max_tokens === 'number' ? body.max_tokens : 0;
  if (current < minMax) {
    body.max_tokens = minMax;
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
  ensureMaxTokensAboveThinkingBudget(body);
  return body;
}

/**
 * Full chat/completions body builder used by llmService (and tests).
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

/** Convert chat messages to Responses API `input` (string or message list). */
export function messagesToResponsesInput(
  messages: Array<{ role: string; content: string }>
): unknown {
  if (messages.length === 1 && messages[0]?.role === 'user') {
    return messages[0].content;
  }
  return messages.map(message => ({
    role:
      message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user',
    content: message.content,
  }));
}

/**
 * OpenAI Responses API body builder.
 */
export function buildResponsesBody(args: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: args.model,
    input: messagesToResponsesInput(args.messages),
  };

  if (args.stream) {
    body.stream = true;
  }
  if (args.maxTokens !== undefined) {
    body.max_output_tokens = args.maxTokens;
  }
  if (!args.capability.temperatureIgnored && args.temperature !== undefined) {
    body.temperature = args.temperature;
  }

  if (args.capability.mapRequest) {
    const extra = args.capability.mapRequest({
      enabled: args.reasoning.enabled,
      effort: args.reasoning.enabled ? args.reasoning.effort : 'off',
    });
    if (extra && typeof extra === 'object') {
      mergeMapperFields(body, extra);
    }
  }

  return body;
}

/** Build request body for the resolved API surface. */
export function buildRequestBodyForSurface(args: {
  capability: ResolvedModelCapability;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  serviceTier?: string;
  reasoning: EffectiveReasoningPrefs;
}): {
  surface: ResolvedModelCapability['apiSurface'];
  path: string;
  body: Record<string, unknown>;
} {
  if (args.capability.apiSurface === 'responses') {
    return {
      surface: 'responses',
      path: '/responses',
      body: buildResponsesBody({
        model: args.model,
        messages: args.messages,
        temperature: args.temperature,
        maxTokens: args.maxTokens,
        stream: args.stream,
        capability: args.capability,
        reasoning: args.reasoning,
      }),
    };
  }

  return {
    surface: 'chat_completions',
    path: '/chat/completions',
    body: buildChatCompletionsBody({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      stream: args.stream,
      jsonMode: args.jsonMode,
      serviceTier: args.serviceTier,
      capability: args.capability,
      reasoning: args.reasoning,
    }),
  };
}
