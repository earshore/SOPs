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
import { GEMINI_THINKING_BUDGET_BY_EFFORT, GEMINI_THINKING_LEVEL_BY_EFFORT } from './mappers';

export type ChatMessageLike = { role: string; content: string };

/** Message whose content may already be structured provider blocks (tool loop). */
export type RichChatMessage = { role: string; content: string | Array<Record<string, unknown>> };

function splitSystemMessages<T extends RichChatMessage>(
  messages: T[]
): { system: string; rest: T[] } {
  const systemParts: string[] = [];
  const rest: T[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      if (typeof m.content === 'string' && m.content.trim()) systemParts.push(m.content);
    } else {
      rest.push(m);
    }
  }
  return { system: systemParts.join('\n\n'), rest };
}

// ---------- shared helpers (tools / vision / sampling) ----------

type FunctionToolShape = { name: string; description?: string; parameters?: unknown };

/** Unwrap OpenAI chat-shape function tools; built-ins / malformed entries are skipped. */
function readFunctionToolShape(tool: unknown): FunctionToolShape | null {
  if (!tool || typeof tool !== 'object') return null;
  const t = tool as Record<string, unknown>;
  const fn = t.function as Record<string, unknown> | undefined;
  if (t.type !== 'function' || !fn || typeof fn.name !== 'string' || !fn.name) return null;
  return {
    name: fn.name,
    ...(typeof fn.description === 'string' ? { description: fn.description } : {}),
    ...(fn.parameters !== undefined ? { parameters: fn.parameters } : {}),
  };
}

function extractFunctionTools(tools: unknown[] | undefined): FunctionToolShape[] {
  const normalized = normalizeToolsForChat(tools);
  if (!normalized?.length) return [];
  const out: FunctionToolShape[] = [];
  for (const tool of normalized) {
    const shape = readFunctionToolShape(tool);
    if (shape) out.push(shape);
  }
  return out;
}

function readToolChoiceFunctionName(toolChoice: unknown): string | undefined {
  if (!toolChoice || typeof toolChoice !== 'object') return undefined;
  const fn = (toolChoice as { function?: { name?: unknown } }).function;
  return typeof fn?.name === 'string' && fn.name ? fn.name : undefined;
}

function parseDataUri(url: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(url);
  const mimeType = match?.[1];
  const data = match?.[2];
  return mimeType && data ? { mimeType, data } : null;
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function readVisionPartImageUrl(part: Record<string, unknown>): string {
  const img = part.image_url;
  if (typeof img === 'string') return img;
  const url = (img as { url?: unknown } | undefined)?.url;
  return typeof url === 'string' ? url : '';
}

function normalizeStopSequences(stop: string | string[] | undefined): string[] | undefined {
  if (stop === undefined) return undefined;
  const list = (Array.isArray(stop) ? stop : [stop]).filter(
    (s): s is string => typeof s === 'string' && s.length > 0
  );
  return list.length > 0 ? list : undefined;
}

// ---------- Anthropic Messages ----------

type AnthropicContentBlock = Record<string, unknown>;
type AnthropicMessage = { role: 'user' | 'assistant'; content: string | AnthropicContentBlock[] };

function toContentBlocks(content: string | AnthropicContentBlock[]): AnthropicContentBlock[] {
  if (Array.isArray(content)) return content;
  return content ? [{ type: 'text', text: content }] : [];
}

function toAnthropicMessages(messages: RichChatMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const m of messages) {
    // role tool → user (tool_result blocks live in user turns per official API)
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content: string | AnthropicContentBlock[] = Array.isArray(m.content)
      ? m.content
      : String(m.content ?? '');
    const last = out[out.length - 1];
    if (last && last.role === role) {
      if (typeof last.content === 'string' && typeof content === 'string') {
        last.content = `${last.content}\n\n${content}`;
      } else {
        last.content = [...toContentBlocks(last.content), ...toContentBlocks(content)];
      }
    } else {
      out.push({ role, content });
    }
  }
  if (out.length === 0) {
    out.push({ role: 'user', content: '' });
  }
  return out;
}

function toAnthropicVisionBlock(part: Record<string, unknown>): AnthropicContentBlock | null {
  if (part.type === 'text' && typeof part.text === 'string') {
    return { type: 'text', text: part.text };
  }
  if (part.type !== 'image_url') return null;
  const url = readVisionPartImageUrl(part);
  if (!url) return null;
  const dataUri = parseDataUri(url);
  if (dataUri) {
    return {
      type: 'image',
      source: { type: 'base64', media_type: dataUri.mimeType, data: dataUri.data },
    };
  }
  return isHttpUrl(url) ? { type: 'image', source: { type: 'url', url } } : null;
}

function toAnthropicVisionBlocks(
  visionUserParts: Array<Record<string, unknown>> | undefined
): AnthropicContentBlock[] {
  if (!visionUserParts?.length) return [];
  const out: AnthropicContentBlock[] = [];
  for (const part of visionUserParts) {
    if (!part || typeof part !== 'object') continue;
    const block = toAnthropicVisionBlock(part);
    if (block) out.push(block);
  }
  return out;
}

function appendAnthropicVisionBlocks(
  messages: AnthropicMessage[],
  visionUserParts: Array<Record<string, unknown>> | undefined
): void {
  const blocks = toAnthropicVisionBlocks(visionUserParts);
  if (blocks.length === 0) return;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== 'user') continue;
    msg.content = [...toContentBlocks(msg.content), ...blocks];
    return;
  }
  messages.push({ role: 'user', content: blocks });
}

function toAnthropicTools(
  tools: unknown[] | undefined
): Array<Record<string, unknown>> | undefined {
  const fns = extractFunctionTools(tools);
  if (fns.length === 0) return undefined;
  return fns.map(fn => ({
    name: fn.name,
    ...(fn.description ? { description: fn.description } : {}),
    input_schema: fn.parameters ?? { type: 'object', properties: {} },
  }));
}

function toAnthropicToolChoice(
  toolChoice: unknown,
  parallelToolCalls: boolean | undefined
): Record<string, unknown> | undefined {
  let choice: Record<string, unknown> | undefined;
  if (toolChoice === 'auto') choice = { type: 'auto' };
  else if (toolChoice === 'none') choice = { type: 'none' };
  else if (toolChoice === 'required') choice = { type: 'any' };
  else {
    const name = readToolChoiceFunctionName(toolChoice);
    if (name) choice = { type: 'tool', name };
  }
  // Official field lives on tool_choice; default mode is auto.
  if (!choice && parallelToolCalls === false) choice = { type: 'auto' };
  if (choice && parallelToolCalls === false && choice.type !== 'none') {
    choice.disable_parallel_tool_use = true;
  }
  return choice;
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
  messages: RichChatMessage[];
  maxTokens?: number;
  stream?: boolean;
  temperature?: number;
  topP?: number;
  stop?: string | string[];
  tools?: unknown[];
  toolChoice?: unknown;
  parallelToolCalls?: boolean;
  visionUserParts?: Array<Record<string, unknown>>;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const { system, rest } = splitSystemMessages(args.messages);
  const messages = toAnthropicMessages(rest);
  appendAnthropicVisionBlocks(messages, args.visionUserParts);
  const body: Record<string, unknown> = {
    model: args.model,
    messages,
    max_tokens: args.maxTokens ?? 4096,
  };
  if (system) body.system = system;
  if (args.stream) body.stream = true;
  if (!args.capability.temperatureIgnored && args.temperature !== undefined) {
    body.temperature = args.temperature;
  }
  if (args.topP !== undefined) body.top_p = args.topP;
  const stopSequences = normalizeStopSequences(args.stop);
  if (stopSequences) body.stop_sequences = stopSequences;
  const tools = toAnthropicTools(args.tools);
  if (tools) {
    body.tools = tools;
    const toolChoice = toAnthropicToolChoice(args.toolChoice, args.parallelToolCalls);
    if (toolChoice) body.tool_choice = toolChoice;
  }
  mergeCapabilityMapper(body, args.capability, args.reasoning);
  return body;
}

// ---------- Gemini generateContent ----------

type GeminiPart = Record<string, unknown>;
type GeminiContent = { role: string; parts: GeminiPart[] };

function toGeminiContents(messages: ChatMessageLike[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
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

function toGeminiVisionPart(part: Record<string, unknown>): GeminiPart | null {
  if (part.type === 'text' && typeof part.text === 'string') {
    return { text: part.text };
  }
  if (part.type !== 'image_url') return null;
  const url = readVisionPartImageUrl(part);
  if (!url) return null;
  const dataUri = parseDataUri(url);
  if (dataUri) {
    return { inlineData: { mimeType: dataUri.mimeType, data: dataUri.data } };
  }
  return isHttpUrl(url) ? { fileData: { fileUri: url } } : null;
}

function toGeminiVisionParts(
  visionUserParts: Array<Record<string, unknown>> | undefined
): GeminiPart[] {
  if (!visionUserParts?.length) return [];
  const out: GeminiPart[] = [];
  for (const part of visionUserParts) {
    if (!part || typeof part !== 'object') continue;
    const mapped = toGeminiVisionPart(part);
    if (mapped) out.push(mapped);
  }
  return out;
}

function appendGeminiVisionParts(
  contents: GeminiContent[],
  visionUserParts: Array<Record<string, unknown>> | undefined
): void {
  const parts = toGeminiVisionParts(visionUserParts);
  if (parts.length === 0) return;
  for (let i = contents.length - 1; i >= 0; i--) {
    const entry = contents[i];
    if (!entry || entry.role !== 'user') continue;
    entry.parts.push(...parts);
    return;
  }
  contents.push({ role: 'user', parts });
}

/** Gemini function declarations reject "$schema"; other JSON-schema keys pass through. */
function stripJsonSchemaMeta(parameters: unknown): unknown {
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return parameters;
  }
  const { $schema: _schema, ...rest } = parameters as Record<string, unknown>;
  return rest;
}

function toGeminiTools(tools: unknown[] | undefined): Array<Record<string, unknown>> | undefined {
  const fns = extractFunctionTools(tools);
  if (fns.length === 0) return undefined;
  return [
    {
      functionDeclarations: fns.map(fn => ({
        name: fn.name,
        ...(fn.description ? { description: fn.description } : {}),
        ...(fn.parameters !== undefined ? { parameters: stripJsonSchemaMeta(fn.parameters) } : {}),
      })),
    },
  ];
}

function toGeminiToolConfig(toolChoice: unknown): Record<string, unknown> | undefined {
  if (toolChoice === 'auto') return { functionCallingConfig: { mode: 'AUTO' } };
  if (toolChoice === 'none') return { functionCallingConfig: { mode: 'NONE' } };
  if (toolChoice === 'required') return { functionCallingConfig: { mode: 'ANY' } };
  const name = readToolChoiceFunctionName(toolChoice);
  if (name) {
    return { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [name] } };
  }
  return undefined;
}

/** Gemini generateContent body. Streaming is URL-based; never put `stream` here. */
export function buildGeminiGenerateBody(args: {
  messages: ChatMessageLike[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  jsonSchema?: ResponsesJsonSchemaFormat;
  tools?: unknown[];
  toolChoice?: unknown;
  visionUserParts?: Array<Record<string, unknown>>;
  topP?: number;
  seed?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  n?: number;
  capability: ResolvedModelCapability;
  reasoning: EffectiveReasoningPrefs;
}): Record<string, unknown> {
  const { system, rest } = splitSystemMessages(args.messages);
  const contents = toGeminiContents(rest);
  appendGeminiVisionParts(contents, args.visionUserParts);
  const body: Record<string, unknown> = { contents };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
  const tools = toGeminiTools(args.tools);
  if (tools) {
    body.tools = tools;
    const toolConfig = toGeminiToolConfig(args.toolChoice);
    if (toolConfig) body.toolConfig = toolConfig;
  }
  const generationConfig = buildGeminiGenerationConfig({
    ...args,
    temperature: args.capability.temperatureIgnored ? undefined : args.temperature,
  });
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
  jsonSchema?: ResponsesJsonSchemaFormat;
  topP?: number;
  seed?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  n?: number;
}): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {};
  const setIf = (key: string, value: unknown): void => {
    if (value !== undefined) generationConfig[key] = value;
  };
  setIf('temperature', args.temperature);
  setIf('maxOutputTokens', args.maxTokens);
  setIf('topP', args.topP);
  setIf('seed', args.seed);
  setIf('frequencyPenalty', args.frequencyPenalty);
  setIf('presencePenalty', args.presencePenalty);
  setIf('candidateCount', args.n);
  setIf('stopSequences', normalizeStopSequences(args.stop));
  if (args.jsonSchema) {
    generationConfig.responseJsonSchema = args.jsonSchema.schema;
    generationConfig.responseMimeType = 'application/json';
  } else if (args.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }
  return generationConfig;
}

/** Gemini 3+ officially prefers thinkingLevel enum; 2.5 keeps thinkingBudget. */
function geminiUsesThinkingLevel(modelId: string | undefined): boolean {
  return typeof modelId === 'string' && modelId.toLowerCase().startsWith('gemini-3');
}

function applyGeminiThinkingConfig(
  body: Record<string, unknown>,
  capability: ResolvedModelCapability,
  reasoning: EffectiveReasoningPrefs
): void {
  if (!capability.mapRequest || !reasoning.enabled || reasoning.effort === 'off') return;
  const thinkingConfig: Record<string, unknown> = geminiUsesThinkingLevel(capability.modelId)
    ? {
        thinkingLevel: GEMINI_THINKING_LEVEL_BY_EFFORT[reasoning.effort] ?? 'medium',
        includeThoughts: true,
      }
    : {
        thinkingBudget: GEMINI_THINKING_BUDGET_BY_EFFORT[reasoning.effort] ?? 4_096,
        includeThoughts: true,
      };
  // Official placement: generationConfig.thinkingConfig (not top-level).
  const generationConfig = (body.generationConfig as Record<string, unknown> | undefined) ?? {};
  generationConfig.thinkingConfig = thinkingConfig;
  body.generationConfig = generationConfig;
}

// ---------- dispatch ----------

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
  verbosity?: string;
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
    verbosity: args.verbosity,
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
    verbosity: args.verbosity,
    modalities: args.modalities,
    audio: args.audio,
    prediction: args.prediction,
    webSearchOptions: args.webSearchOptions,
  });
}

export function buildBodyForApiPath(args: BuildBodyForApiPathArgs): Record<string, unknown> {
  if (args.pathId === 'responses') {
    return buildResponsesBodyFromPathArgs(args);
  }
  if (args.pathId === 'anthropic_messages') {
    return buildAnthropicMessagesBody({
      model: args.model,
      messages: args.messages as RichChatMessage[],
      maxTokens: args.maxTokens,
      stream: args.stream,
      temperature: args.temperature,
      topP: args.topP,
      stop: args.stop,
      tools: args.tools,
      toolChoice: args.toolChoice,
      parallelToolCalls: args.parallelToolCalls,
      visionUserParts: args.visionUserParts,
      capability: args.capability,
      reasoning: args.reasoning,
    });
  }
  if (args.pathId === 'gemini_generate') {
    return buildGeminiGenerateBody({
      messages: args.messages as ChatMessageLike[],
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      jsonMode: args.jsonMode,
      jsonSchema: args.jsonSchema,
      tools: args.tools,
      toolChoice: args.toolChoice,
      visionUserParts: args.visionUserParts,
      topP: args.topP,
      seed: args.seed,
      stop: args.stop,
      frequencyPenalty: args.frequencyPenalty,
      presencePenalty: args.presencePenalty,
      n: args.n,
      capability: args.capability,
      reasoning: args.reasoning,
    });
  }
  return buildChatBodyFromPathArgs(args);
}
