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

/**
 * Split system messages into Responses `instructions` + non-system `input`.
 */
export function splitMessagesForResponses(messages: Array<{ role: string; content: string }>): {
  instructions?: string;
  input: unknown;
} {
  const systemParts: string[] = [];
  const rest: Array<{ role: string; content: string }> = [];
  for (const message of messages) {
    if (message.role === 'system') {
      if (message.content.trim()) systemParts.push(message.content);
      continue;
    }
    rest.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    });
  }

  const instructions = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  if (rest.length === 1 && rest[0]?.role === 'user') {
    return { instructions, input: rest[0].content };
  }
  if (rest.length === 0) {
    return { instructions, input: '' };
  }
  return { instructions, input: rest };
}

/** Convert chat messages to Responses API `input` (legacy helper). */
export function messagesToResponsesInput(
  messages: Array<{ role: string; content: string }>
): unknown {
  return splitMessagesForResponses(messages).input;
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
  const { instructions, input } = splitMessagesForResponses(args.messages);
  const body: Record<string, unknown> = {
    model: args.model,
    input,
  };
  if (instructions) {
    body.instructions = instructions;
  }

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

/**
 * Reliability rule (verified 2026-07-23):
 * Analysis passes jsonMode:true and parses with parseLlmJson (prompt + repair).
 * That often still works WITHOUT response_format — so production may not "explode".
 * Forcing chat_completions when jsonMode is set applies response_format for reliability.
 */
export function shouldForceChatCompletionsForJsonMode(
  jsonMode: boolean | undefined,
  surface: ResolvedModelCapability['apiSurface']
): boolean {
  return Boolean(jsonMode) && surface === 'responses';
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
  /**
   * When true, use chat_completions even if capability preferred responses.
   * Caller must pass a capability resolved for chat_completions mapRequest.
   */
  forceChatCompletions?: boolean;
}): {
  surface: ResolvedModelCapability['apiSurface'];
  path: string;
  body: Record<string, unknown>;
} {
  const forceCompletions =
    args.forceChatCompletions === true ||
    shouldForceChatCompletionsForJsonMode(args.jsonMode, args.capability.apiSurface);

  const useResponses = !forceCompletions && args.capability.apiSurface === 'responses';

  if (useResponses) {
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
