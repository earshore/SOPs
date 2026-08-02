import { readThinkingBudgetTokens, THINKING_BUDGET_ANSWER_HEADROOM } from './mappers';
import { applyVisionPartsToChatMessages } from './chatVision';
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
 * Always uses max_tokens (never max_completion_tokens) when thinking is present.
 */
function ensureMaxTokensAboveThinkingBudget(body: Record<string, unknown>): void {
  const budget = readThinkingBudgetTokens(body);
  if (budget === undefined) {
    return;
  }
  const minMax = budget + THINKING_BUDGET_ANSWER_HEADROOM;
  delete body.max_completion_tokens;
  const current = typeof body.max_tokens === 'number' ? body.max_tokens : 0;
  if (current < minMax) {
    body.max_tokens = minMax;
  }
}

/**
 * Choose max_completion_tokens vs max_tokens for chat/completions.
 * - Claude / thinking budget → max_tokens only
 * - OpenAI reasoning (temperatureIgnored or feature flag) → max_completion_tokens only
 * - Else legacy max_tokens
 */
export function applyChatMaxOutputTokens(
  body: Record<string, unknown>,
  maxTokens: number | undefined,
  capability: Pick<ResolvedModelCapability, 'temperatureIgnored' | 'features'>
): void {
  if (maxTokens === undefined) {
    return;
  }
  const features = capability.features ?? [];
  const hasThinking = body.thinking != null && typeof body.thinking === 'object';
  if (features.includes('claude') || hasThinking) {
    body.max_tokens = maxTokens;
    delete body.max_completion_tokens;
    ensureMaxTokensAboveThinkingBudget(body);
    return;
  }
  const preferCompletionTokens =
    capability.temperatureIgnored === true || features.includes('max_completion_tokens');
  if (preferCompletionTokens) {
    body.max_completion_tokens = maxTokens;
    delete body.max_tokens;
    return;
  }
  body.max_tokens = maxTokens;
  delete body.max_completion_tokens;
}

/**
 * Merge capability mapper output into a chat/completions body.
 * Never overwrites model/messages. No mapRequest → no reasoning fields.
 */
export function applyReasoningToRequestBody(
  base: ChatCompletionsBodyBase,
  capability: Pick<
    ResolvedModelCapability,
    | 'mapRequest'
    | 'temperatureIgnored'
    | 'supportsReasoning'
    | 'reasoningEfforts'
    | 'defaultEnabled'
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
    allowed: capability.reasoningEfforts,
    defaultEnabled: capability.defaultEnabled,
  });
  if (extra && typeof extra === 'object') {
    mergeMapperFields(body, extra);
  }
  ensureMaxTokensAboveThinkingBudget(body);
  return body;
}

/**
 * Chat Completions structured output: json_schema preferred over json_object.
 * Official shape: response_format.json_schema.{ name, schema, strict?, description? }
 */
function applyChatResponseFormat(
  body: Record<string, unknown>,
  args: {
    jsonMode?: boolean;
    jsonSchema?: ResponsesJsonSchemaFormat;
    capability: Pick<
      ResolvedModelCapability,
      'supportsStructuredOutput' | 'structuredOutputWithReasoning'
    >;
    reasoningEnabled?: boolean;
  }
): void {
  if (args.reasoningEnabled && args.capability.structuredOutputWithReasoning === false) {
    return;
  }
  if (args.jsonSchema?.name && args.jsonSchema.schema && args.capability.supportsStructuredOutput) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: args.jsonSchema.name,
        schema: args.jsonSchema.schema,
        ...(args.jsonSchema.strict !== undefined ? { strict: args.jsonSchema.strict } : {}),
        ...(args.jsonSchema.description ? { description: args.jsonSchema.description } : {}),
      },
    };
    return;
  }
  if (args.jsonMode) {
    body.response_format = { type: 'json_object' };
  }
}

/** Optional Create-chat fields beyond core text (official OpenAI parity). */
export type ChatCompletionsBodyExtras = {
  jsonMode?: boolean;
  jsonSchema?: ResponsesJsonSchemaFormat;
  serviceTier?: string;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  visionUserParts?: Array<Record<string, unknown>>;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  seed?: number;
  logitBias?: Record<string, number>;
  logprobs?: boolean;
  topLogprobs?: number;
  store?: boolean;
  metadata?: Record<string, string>;
  promptCacheKey?: string;
  safetyIdentifier?: string;
  /** Deprecated OpenAI user id; prefer promptCacheKey / safetyIdentifier */
  user?: string;
  /** e.g. ["text","audio"] */
  modalities?: string[];
  /** Audio output config when modalities includes audio */
  audio?: Record<string, unknown>;
  /** Predicted outputs */
  prediction?: Record<string, unknown>;
  /** Built-in web search options (OpenAI) */
  webSearchOptions?: Record<string, unknown>;
  /** GPT-5 text verbosity: 'low' | 'medium' | 'high'; invalid values dropped. */
  verbosity?: string;
};

function setIfDefined(body: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    body[key] = value;
  }
}

/** Official OpenAI service tiers; invalid values are dropped silently. */
const OFFICIAL_SERVICE_TIERS = ['auto', 'default', 'flex', 'scale', 'priority'] as const;

function normalizeServiceTier(value: string | undefined): string | undefined {
  return value && (OFFICIAL_SERVICE_TIERS as readonly string[]).includes(value) ? value : undefined;
}

function normalizeVerbosity(value: string | undefined): 'low' | 'medium' | 'high' | undefined {
  return value === 'low' || value === 'medium' || value === 'high' ? value : undefined;
}

function applyChatSamplingFields(
  body: Record<string, unknown>,
  args: ChatCompletionsBodyExtras
): void {
  setIfDefined(body, 'service_tier', normalizeServiceTier(args.serviceTier));
  setIfDefined(body, 'top_p', args.topP);
  setIfDefined(body, 'frequency_penalty', args.frequencyPenalty);
  setIfDefined(body, 'presence_penalty', args.presencePenalty);
  setIfDefined(body, 'stop', args.stop);
  setIfDefined(body, 'n', args.n);
  setIfDefined(body, 'seed', args.seed);
  setIfDefined(body, 'logit_bias', args.logitBias);
  setIfDefined(body, 'logprobs', args.logprobs);
  setIfDefined(body, 'top_logprobs', args.topLogprobs);
  setIfDefined(body, 'store', args.store);
  setIfDefined(body, 'metadata', args.metadata);
  setIfDefined(body, 'prompt_cache_key', args.promptCacheKey);
  setIfDefined(body, 'safety_identifier', args.safetyIdentifier);
  setIfDefined(body, 'user', args.user);
  setIfDefined(body, 'modalities', args.modalities);
  setIfDefined(body, 'audio', args.audio);
  setIfDefined(body, 'prediction', args.prediction);
  setIfDefined(body, 'web_search_options', args.webSearchOptions);
  setIfDefined(body, 'verbosity', normalizeVerbosity(args.verbosity));
}

function applyChatToolsFields(
  body: Record<string, unknown>,
  args: ChatCompletionsBodyExtras
): void {
  if (!Array.isArray(args.tools) || args.tools.length === 0) {
    return;
  }
  body.tools = args.tools;
  setIfDefined(body, 'tool_choice', args.toolChoice);
  setIfDefined(body, 'parallel_tool_calls', args.parallelToolCalls);
}

function applyChatOptionalCreateFields(
  body: Record<string, unknown>,
  args: ChatCompletionsBodyExtras & {
    capability: Pick<ResolvedModelCapability, 'supportsTools'>;
  }
): void {
  applyChatSamplingFields(body, args);
  applyChatToolsFields(body, args);
}

/**
 * Full chat/completions body builder used by llmService (and tests).
 * Official Create parity: tools, vision, sampling, identity, structured outputs.
 */
export function buildChatCompletionsBody(
  args: {
    model: string;
    messages: unknown;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    capability: ResolvedModelCapability;
    reasoning: EffectiveReasoningPrefs;
  } & ChatCompletionsBodyExtras
): Record<string, unknown> {
  let messages = args.messages;
  if (Array.isArray(messages) && args.visionUserParts?.length) {
    messages = applyVisionPartsToChatMessages(
      messages as Array<Record<string, unknown>>,
      args.visionUserParts
    );
  }

  const base: ChatCompletionsBodyBase = {
    model: args.model,
    messages,
  };

  if (args.stream) {
    base.stream = true;
    base.stream_options = { include_usage: true };
  }
  applyChatResponseFormat(base, { ...args, reasoningEnabled: args.reasoning.enabled });
  applyChatOptionalCreateFields(base, args);

  const body = applyReasoningToRequestBody(base, args.capability, args.reasoning, {
    temperature: args.temperature,
  });
  applyChatMaxOutputTokens(body, args.maxTokens, args.capability);
  return body;
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
  parallelToolCalls?: boolean;
  /** Replace last user message content with multimodal parts. */
  visionUserParts?: Array<Record<string, unknown>>;
  /**
   * Tool-loop follow-up items (function_call_output). When set with previousResponseId,
   * becomes the sole `input` for the next Responses request.
   */
  followUpInputItems?: Array<Record<string, unknown>>;
  /** Official Create pass-through (when set). */
  topP?: number;
  topLogprobs?: number;
  metadata?: Record<string, string>;
  promptCacheKey?: string;
  safetyIdentifier?: string;
  user?: string;
  truncation?: string;
  background?: boolean;
  maxToolCalls?: number;
  include?: string[];
  /** GPT-5 text verbosity: 'low' | 'medium' | 'high'; invalid values dropped. */
  verbosity?: string;
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
  // BYOK default: store false. Never emit store:true when unsupported.
  if (!supportsStore) {
    body.store = false;
    return;
  }
  body.store = store === true;
}

function applyResponsesToolsFields(
  body: Record<string, unknown>,
  tools: unknown[] | undefined,
  toolChoice: unknown,
  supportsTools: boolean,
  parallelToolCalls?: boolean
): void {
  if (!tools || tools.length === 0 || !supportsTools) return;
  body.tools = tools;
  if (toolChoice !== undefined) {
    body.tool_choice = toolChoice;
  }
  if (parallelToolCalls !== undefined) {
    body.parallel_tool_calls = parallelToolCalls;
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

/** Set text.verbosity, merging with any text.format already applied. */
function applyResponsesTextVerbosity(
  body: Record<string, unknown>,
  verbosity: string | undefined
): void {
  const v = normalizeVerbosity(verbosity);
  if (!v) return;
  const text =
    body.text && typeof body.text === 'object' ? (body.text as Record<string, unknown>) : {};
  body.text = { ...text, verbosity: v };
}

function applyResponsesCreatePassThrough(
  body: Record<string, unknown>,
  args: {
    serviceTier?: string;
    topP?: number;
    topLogprobs?: number;
    metadata?: Record<string, string>;
    promptCacheKey?: string;
    safetyIdentifier?: string;
    user?: string;
    truncation?: string;
    background?: boolean;
    maxToolCalls?: number;
    include?: string[];
  }
): void {
  setIfDefined(body, 'service_tier', normalizeServiceTier(args.serviceTier));
  setIfDefined(body, 'top_p', args.topP);
  setIfDefined(body, 'top_logprobs', args.topLogprobs);
  setIfDefined(body, 'metadata', args.metadata);
  setIfDefined(body, 'prompt_cache_key', args.promptCacheKey);
  setIfDefined(body, 'safety_identifier', args.safetyIdentifier);
  setIfDefined(body, 'user', args.user);
  setIfDefined(body, 'truncation', args.truncation);
  setIfDefined(body, 'background', args.background);
  setIfDefined(body, 'max_tool_calls', args.maxToolCalls);
  setIfDefined(body, 'include', args.include);
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
    parallelToolCalls?: boolean;
    topP?: number;
    topLogprobs?: number;
    metadata?: Record<string, string>;
    promptCacheKey?: string;
    safetyIdentifier?: string;
    user?: string;
    truncation?: string;
    background?: boolean;
    maxToolCalls?: number;
    include?: string[];
    verbosity?: string;
  }
): void {
  applyResponsesCreatePassThrough(body, args);
  applyResponsesTextFormat(body, args);
  applyResponsesTextVerbosity(body, args.verbosity);
  const prev = args.previousResponseId?.trim();
  if (prev && args.capability.supportsPreviousResponseId) {
    body.previous_response_id = prev;
  }
  applyResponsesStoreField(body, args.store, args.capability.supportsStore);
  applyResponsesToolsFields(
    body,
    args.tools,
    args.toolChoice,
    args.capability.supportsTools,
    args.parallelToolCalls
  );
}

type ResponsesBodyMode = {
  /** Stateful tool follow-up: input = function_call_output only + previous_response_id */
  useFollowUpStateful: boolean;
  /** Stateless tool follow-up: conversation input + function_call(+output) items */
  useFollowUpStateless: boolean;
  /** Conversational chain: latest user only + previous_response_id */
  useConversationChain: boolean;
};

function resolveResponsesBodyMode(args: {
  previousResponseId?: string;
  followUpInputItems?: Array<Record<string, unknown>>;
  capability: ResolvedModelCapability;
}): ResponsesBodyMode {
  const prevId = args.previousResponseId?.trim();
  const canChain = Boolean(prevId) && args.capability.supportsPreviousResponseId === true;
  const hasFollowUp = Boolean(args.followUpInputItems?.length);
  return {
    useFollowUpStateful: hasFollowUp && canChain,
    useFollowUpStateless: hasFollowUp && !canChain,
    useConversationChain: !hasFollowUp && canChain,
  };
}

/** Resolve store flag: never true when unsupported; chain may request store when allowed. */
function resolveResponsesStoreOption(
  store: boolean | undefined,
  mode: ResponsesBodyMode,
  supportsStore: boolean
): boolean | undefined {
  if (!supportsStore) {
    return false;
  }
  if (store === true || store === false) {
    return store;
  }
  if (mode.useFollowUpStateful || mode.useConversationChain) {
    return true;
  }
  return store;
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
  const mode = resolveResponsesBodyMode(args);
  const body = createResponsesBodyBase(args, mode);
  applyResponsesOptionalFields(body, {
    ...args,
    store: resolveResponsesStoreOption(args.store, mode, args.capability.supportsStore),
  });
  applyResponsesReasoningMapper(body, args.capability, args.reasoning);
  return body;
}

function normalizeResponsesInputToArray(input: unknown): Array<Record<string, unknown>> {
  if (input === undefined || input === null || input === '') {
    return [];
  }
  if (typeof input === 'string') {
    return [{ role: 'user', content: input }];
  }
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .filter(item => item && typeof item === 'object')
    .map(item => ({ ...(item as Record<string, unknown>) }));
}

function resolveResponsesInput(
  args: {
    messages: Array<{ role: string; content: string }>;
    visionUserParts?: Array<Record<string, unknown>>;
    followUpInputItems?: Array<Record<string, unknown>>;
  },
  mode: ResponsesBodyMode,
  baseInput: unknown
): unknown {
  if (mode.useFollowUpStateful) {
    return args.followUpInputItems;
  }
  if (mode.useFollowUpStateless) {
    const conversation = normalizeResponsesInputToArray(
      applyVisionPartsToResponsesInput(baseInput, args.visionUserParts)
    );
    const followUp = Array.isArray(args.followUpInputItems) ? args.followUpInputItems : [];
    return [...conversation, ...followUp];
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
  mode: ResponsesBodyMode
): Record<string, unknown> {
  const { instructions, input: baseInput } = splitMessagesForResponses(args.messages);
  const input = resolveResponsesInput(args, mode, baseInput);
  const body: Record<string, unknown> = {
    model: args.model,
    input,
  };
  // Official multi-turn rule: previous_response_id does NOT carry top-level instructions —
  // resend stable instructions on chain turns. Stateful tool follow-up only sends outputs.
  if (instructions && !mode.useFollowUpStateful) {
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
    allowed: capability.reasoningEfforts,
    defaultEnabled: capability.defaultEnabled,
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
