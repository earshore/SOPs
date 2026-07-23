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

/** OpenAI Responses text.format json_schema (strict structured outputs). */
export interface ResponsesJsonSchemaFormat {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
  description?: string;
}

export type ResponsesBodyExtras = {
  /** OpenAI Responses structured outputs (json_object when no jsonSchema). */
  jsonMode?: boolean;
  /** Prefer over jsonMode: text.format type=json_schema */
  jsonSchema?: ResponsesJsonSchemaFormat;
  serviceTier?: string;
  /** previous_response_id multi-turn (when capability allows). */
  previousResponseId?: string;
  /** store override; default false for BYOK; chain/tool-follow-up default true. */
  store?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  /** Replace last user message content with multimodal parts. */
  visionUserParts?: Array<Record<string, unknown>>;
  /**
   * Tool-loop follow-up items (function_call_output). When set with previousResponseId,
   * becomes the sole `input` for the next Responses request.
   */
  followUpInputItems?: Array<Record<string, unknown>>;
};

/**
 * R4: With previous_response_id, only the latest user turn is sent as input so the
 * server retains prior reasoning items / tool state (OpenAI multi-turn guidance).
 */
export function extractLatestUserInputForResponsesChain(
  messages: Array<{ role: string; content: string }>
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user') {
      return typeof m.content === 'string' ? m.content : String(m.content ?? '');
    }
  }
  return '';
}

function userContentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return '';
  return String(content ?? '');
}

function buildUserVisionContent(
  text: string,
  visionUserParts: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  if (text.trim()) {
    parts.push({ type: 'input_text', text });
  }
  parts.push(...visionUserParts);
  return parts;
}

/**
 * Apply vision parts to Responses input (last user message only).
 */
export function applyVisionPartsToResponsesInput(
  input: unknown,
  visionUserParts: Array<Record<string, unknown>> | undefined
): unknown {
  if (!visionUserParts || visionUserParts.length === 0) {
    return input;
  }
  if (typeof input === 'string') {
    return [
      {
        role: 'user',
        content: buildUserVisionContent(input, visionUserParts),
      },
    ];
  }
  if (!Array.isArray(input) || input.length === 0) {
    return [{ role: 'user', content: visionUserParts }];
  }
  const next = input.map(item =>
    item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item
  );
  for (let i = next.length - 1; i >= 0; i--) {
    const row = next[i] as { role?: string; content?: unknown };
    if (row?.role === 'user') {
      next[i] = {
        ...row,
        content: buildUserVisionContent(userContentToText(row.content), visionUserParts),
      };
      break;
    }
  }
  return next;
}

function applyResponsesStoreField(
  body: Record<string, unknown>,
  store: boolean | undefined,
  supportsStore: boolean
): void {
  if (store === true && supportsStore) {
    body.store = true;
    return;
  }
  if (store === false) {
    body.store = false;
  }
}

function applyResponsesToolsFields(
  body: Record<string, unknown>,
  tools: unknown[] | undefined,
  toolChoice: unknown,
  supportsTools: boolean
): void {
  if (!tools || tools.length === 0 || !supportsTools) return;
  body.tools = tools;
  if (toolChoice !== undefined) {
    body.tool_choice = toolChoice;
  }
}

function applyResponsesTextFormat(
  body: Record<string, unknown>,
  args: {
    capability: ResolvedModelCapability;
    jsonMode?: boolean;
    jsonSchema?: ResponsesJsonSchemaFormat;
  }
): void {
  if (!args.capability.supportsStructuredOutput) return;

  if (args.jsonSchema?.name && args.jsonSchema.schema) {
    body.text = {
      format: {
        type: 'json_schema',
        name: args.jsonSchema.name,
        schema: args.jsonSchema.schema,
        ...(args.jsonSchema.strict !== undefined
          ? { strict: args.jsonSchema.strict }
          : { strict: true }),
        ...(args.jsonSchema.description ? { description: args.jsonSchema.description } : {}),
      },
    };
    return;
  }

  if (args.jsonMode) {
    body.text = { format: { type: 'json_object' } };
  }
}

function applyResponsesOptionalFields(
  body: Record<string, unknown>,
  args: {
    capability: ResolvedModelCapability;
    jsonMode?: boolean;
    jsonSchema?: ResponsesJsonSchemaFormat;
    serviceTier?: string;
    previousResponseId?: string;
    store?: boolean;
    tools?: unknown[];
    toolChoice?: unknown;
  }
): void {
  if (args.serviceTier) {
    body.service_tier = args.serviceTier;
  }
  applyResponsesTextFormat(body, args);
  const prev = args.previousResponseId?.trim();
  if (prev && args.capability.supportsPreviousResponseId) {
    body.previous_response_id = prev;
  }
  applyResponsesStoreField(body, args.store, args.capability.supportsStore);
  applyResponsesToolsFields(body, args.tools, args.toolChoice, args.capability.supportsTools);
}

/**
 * OpenAI Responses API body builder.
 * Subset + expanding parity: text.format, store, previous_response_id, tools, vision parts.
 */
export function buildResponsesBody(
  args: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    capability: ResolvedModelCapability;
    reasoning: EffectiveReasoningPrefs;
  } & ResponsesBodyExtras
): Record<string, unknown> {
  const prevId = args.previousResponseId?.trim();
  const useFollowUp =
    Boolean(args.followUpInputItems?.length) &&
    Boolean(prevId) &&
    args.capability.supportsPreviousResponseId;
  /** R4: conversational chain — server keeps reasoning items via previous_response_id */
  const useConversationChain =
    !useFollowUp && Boolean(prevId) && args.capability.supportsPreviousResponseId;

  const body = createResponsesBodyBase(args, {
    useFollowUp,
    useConversationChain,
  });
  applyResponsesOptionalFields(body, args);
  applyResponsesReasoningMapper(body, args.capability, args.reasoning);
  return body;
}

function resolveResponsesInput(
  args: {
    messages: Array<{ role: string; content: string }>;
    visionUserParts?: Array<Record<string, unknown>>;
    followUpInputItems?: Array<Record<string, unknown>>;
  },
  mode: { useFollowUp: boolean; useConversationChain: boolean },
  baseInput: unknown
): unknown {
  if (mode.useFollowUp) {
    return args.followUpInputItems;
  }
  if (mode.useConversationChain) {
    const latestUser = extractLatestUserInputForResponsesChain(args.messages);
    return applyVisionPartsToResponsesInput(latestUser, args.visionUserParts);
  }
  return applyVisionPartsToResponsesInput(baseInput, args.visionUserParts);
}

function createResponsesBodyBase(
  args: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    capability: ResolvedModelCapability;
    visionUserParts?: Array<Record<string, unknown>>;
    followUpInputItems?: Array<Record<string, unknown>>;
  },
  mode: { useFollowUp: boolean; useConversationChain: boolean }
): Record<string, unknown> {
  const { instructions, input: baseInput } = splitMessagesForResponses(args.messages);
  const input = resolveResponsesInput(args, mode, baseInput);
  const body: Record<string, unknown> = {
    model: args.model,
    input,
    store: mode.useFollowUp || mode.useConversationChain,
  };
  // First turn only: system → instructions. Chain turns omit (kept server-side).
  if (!mode.useFollowUp && !mode.useConversationChain && instructions) {
    body.instructions = instructions;
  }
  if (args.stream) body.stream = true;
  if (args.maxTokens !== undefined) body.max_output_tokens = args.maxTokens;
  if (!args.capability.temperatureIgnored && args.temperature !== undefined) {
    body.temperature = args.temperature;
  }
  return body;
}

function applyResponsesReasoningMapper(
  body: Record<string, unknown>,
  capability: ResolvedModelCapability,
  reasoning: EffectiveReasoningPrefs
): void {
  if (!capability.mapRequest) return;
  const extra = capability.mapRequest({
    enabled: reasoning.enabled,
    effort: reasoning.enabled ? reasoning.effort : 'off',
  });
  if (extra && typeof extra === 'object') {
    mergeMapperFields(body, extra);
  }
}

/**
 * Force chat/completions for jsonMode only when the resolved surface cannot do
 * structured outputs natively (Responses uses text.format when supported).
 */
export function shouldForceChatCompletionsForJsonMode(
  jsonMode: boolean | undefined,
  surface: ResolvedModelCapability['apiSurface'],
  supportsStructuredOutput?: boolean
): boolean {
  if (!jsonMode) return false;
  if (surface === 'responses' && supportsStructuredOutput) return false;
  if (surface === 'gemini_generate') return false;
  return surface === 'responses' && !supportsStructuredOutput;
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
    shouldForceChatCompletionsForJsonMode(
      args.jsonMode,
      args.capability.apiSurface,
      args.capability.supportsStructuredOutput
    );

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
        jsonMode: args.jsonMode,
        serviceTier: args.serviceTier,
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
