/**
 * Native request body builders for each API path.
 */

import type { EffectiveReasoningPrefs, ResolvedModelCapability } from './types';
import {
  buildChatCompletionsBody,
  buildResponsesBody,
  type ResponsesJsonSchemaFormat,
} from './applyToRequest';
import type { ApiPathId } from './apiPaths';
import { normalizeToolsForChat } from './chatTools';
import { normalizeToolsForResponses } from './responsesTools';

export type ChatMessageLike = { role: string; content: string };

function splitSystemMessages(messages: ChatMessageLike[]): {
  system: string;
  rest: ChatMessageLike[];
} {
  const systemParts: string[] = [];
  const rest: ChatMessageLike[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      if (m.content.trim()) systemParts.push(m.content);
    } else {
      rest.push(m);
    }
  }
  return { system: systemParts.join('\n\n'), rest };
}

function toAnthropicMessages(
  messages: ChatMessageLike[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      out.push({ role, content: m.content });
    }
  }
  if (out.length === 0) {
    out.push({ role: 'user', content: '' });
  }
  return out;
}

function applyThinkingBudgetFloor(body: Record<string, unknown>): void {
  const thinking = body.thinking as { budget_tokens?: number } | undefined;
  const budget = thinking?.budget_tokens;
  if (typeof budget !== 'number') return;
  const min = budget + 512;
  if (typeof body.max_tokens !== 'number' || body.max_tokens < min) {
    body.max_tokens = min;
  }
}

function mergeCapabilityMapper(
  body: Record<string, unknown>,
  capability: ResolvedModelCapability,
  reasoning: EffectiveReasoningPrefs
): void {
  if (!capability.mapRequest) return;
  const extra = capability.mapRequest({
    enabled: reasoning.enabled,
    effort: reasoning.enabled ? reasoning.effort : 'off',
  });
  if (!extra || typeof extra !== 'object') return;
  for (const [k, v] of Object.entries(extra)) {
    if (k === 'model' || k === 'messages') continue;
    body[k] = v;
  }
  applyThinkingBudgetFloor(body);
}

/** Anthropic Messages API body. */
export function buildAnthropicMessagesBody(args: {
  model: string;
  messages: ChatMessageLike[];
  maxTokens?: number;
  stream?: boolean;
  temperature?: number;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const { system, rest } = splitSystemMessages(args.messages);
  const body: Record<string, unknown> = {
    model: args.model,
    messages: toAnthropicMessages(rest),
    max_tokens: args.maxTokens ?? 4096,
  };
  if (system) body.system = system;
  if (args.stream) body.stream = true;
  if (!args.capability.temperatureIgnored && args.temperature !== undefined) {
    body.temperature = args.temperature;
  }
  mergeCapabilityMapper(body, args.capability, args.reasoning);
  return body;
}

function toGeminiContents(
  messages: ChatMessageLike[]
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: '' }] });
  }
  return contents;
}

/** Gemini generateContent body. */
export function buildGeminiGenerateBody(args: {
  messages: ChatMessageLike[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const { system, rest } = splitSystemMessages(args.messages);
  const generationConfig = buildGeminiGenerationConfig(args);
  const body: Record<string, unknown> = { contents: toGeminiContents(rest) };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }
  applyGeminiThinkingConfig(body, args.capability, args.reasoning);
  return body;
}

function buildGeminiGenerationConfig(args: {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {};
  if (args.temperature !== undefined) generationConfig.temperature = args.temperature;
  if (args.maxTokens !== undefined) generationConfig.maxOutputTokens = args.maxTokens;
  if (args.jsonMode) generationConfig.responseMimeType = 'application/json';
  return generationConfig;
}

function applyGeminiThinkingConfig(
  body: Record<string, unknown>,
  capability: ResolvedModelCapability,
  reasoning: EffectiveReasoningPrefs
): void {
  if (!capability.mapRequest || !reasoning.enabled || reasoning.effort === 'off') return;
  const effort = reasoning.effort;
  const budget = effort === 'low' ? 1024 : effort === 'high' ? 8192 : 4096;
  body.thinkingConfig = { thinkingBudget: budget, includeThoughts: true };
}

export type BuildBodyForApiPathArgs = {
  pathId: ApiPathId;
  model: string;
  messages: ChatMessageLike[] | Array<Record<string, unknown>>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
  serviceTier?: string;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  visionUserParts?: Array<Record<string, unknown>>;
  followUpInputItems?: Array<Record<string, unknown>>;
  jsonSchema?: ResponsesJsonSchemaFormat;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  n?: number;
  seed?: number;
  logitBias?: Record<string, number>;
  logprobs?: boolean;
  topLogprobs?: number;
  metadata?: Record<string, string>;
  promptCacheKey?: string;
  safetyIdentifier?: string;
  user?: string;
  modalities?: string[];
  audio?: Record<string, unknown>;
  prediction?: Record<string, unknown>;
  webSearchOptions?: Record<string, unknown>;
  truncation?: string;
  background?: boolean;
  maxToolCalls?: number;
  include?: string[];
};

function buildResponsesBodyFromPathArgs(args: BuildBodyForApiPathArgs): Record<string, unknown> {
  return buildResponsesBody({
    model: args.model,
    messages: args.messages as ChatMessageLike[],
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    stream: args.stream,
    jsonMode: args.jsonMode,
    jsonSchema: args.jsonSchema,
    serviceTier: args.serviceTier,
    capability: args.capability,
    reasoning: args.reasoning,
    previousResponseId: args.previousResponseId,
    store: args.store,
    tools: normalizeToolsForResponses(args.tools),
    toolChoice: args.toolChoice,
    parallelToolCalls: args.parallelToolCalls,
    visionUserParts: args.visionUserParts,
    followUpInputItems: args.followUpInputItems,
    topP: args.topP,
    topLogprobs: args.topLogprobs,
    metadata: args.metadata,
    promptCacheKey: args.promptCacheKey,
    safetyIdentifier: args.safetyIdentifier,
    user: args.user,
    truncation: args.truncation,
    background: args.background,
    maxToolCalls: args.maxToolCalls,
    include: args.include,
  });
}

function buildChatBodyFromPathArgs(args: BuildBodyForApiPathArgs): Record<string, unknown> {
  return buildChatCompletionsBody({
    model: args.model,
    messages: args.messages,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    stream: args.stream,
    jsonMode: args.jsonMode,
    jsonSchema: args.jsonSchema,
    serviceTier: args.serviceTier,
    capability: args.capability,
    reasoning: args.reasoning,
    tools: normalizeToolsForChat(args.tools),
    toolChoice: args.toolChoice,
    parallelToolCalls: args.parallelToolCalls,
    visionUserParts: args.visionUserParts,
    topP: args.topP,
    frequencyPenalty: args.frequencyPenalty,
    presencePenalty: args.presencePenalty,
    stop: args.stop,
    n: args.n,
    seed: args.seed,
    logitBias: args.logitBias,
    logprobs: args.logprobs,
    topLogprobs: args.topLogprobs,
    store: args.store,
    metadata: args.metadata,
    promptCacheKey: args.promptCacheKey,
    safetyIdentifier: args.safetyIdentifier,
    user: args.user,
    modalities: args.modalities,
    audio: args.audio,
    prediction: args.prediction,
    webSearchOptions: args.webSearchOptions,
  });
}

export function buildBodyForApiPath(args: BuildBodyForApiPathArgs): Record<string, unknown> {
  const textMessages = args.messages as ChatMessageLike[];
  if (args.pathId === 'responses') {
    return buildResponsesBodyFromPathArgs(args);
  }
  if (args.pathId === 'anthropic_messages') {
    return buildAnthropicMessagesBody({
      model: args.model,
      messages: textMessages,
      maxTokens: args.maxTokens,
      stream: args.stream,
      temperature: args.temperature,
      capability: args.capability,
      reasoning: args.reasoning,
    });
  }
  if (args.pathId === 'gemini_generate') {
    return buildGeminiGenerateBody({
      messages: textMessages,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      jsonMode: args.jsonMode,
      capability: args.capability,
      reasoning: args.reasoning,
    });
  }
  return buildChatBodyFromPathArgs(args);
}
