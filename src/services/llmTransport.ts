// src/services/llmTransport.ts
// ================================================================
// LLM request transport: endpoint resolution, body building, headers.
// Extracted from llmService (no dependency on llmService internals).
// ================================================================

import { configCenter } from '@/common/config/ConfigCenter';
import { EnvConfig } from '@/common/config/envConfig';
import { getDangerousEndpoints, isDangerousEndpoint } from '@/common/config/apiEndpoints';
import { DEFAULT_LLM_PROVIDER_ID, DEFAULT_NEW_API_ENDPOINT } from '@/common/config/llmProviders';
import { SystemError } from '@/common/errors';
import type { ApiPathId, ApiSurface, SessionReasoningOverride } from './modelCapability';
import {
  buildBodyForApiPath,
  buildFullApiUrl,
  resolveEffectiveReasoning,
  resolveModelCapability,
} from './modelCapability';
import type { ChatMessage, ResolvedLLMOptions } from './llmTypes';

export function resolveProviderEndpoint(provider: string, endpoint: string): string {
  const trimmedEndpoint = (endpoint || '').trim();

  if (
    provider === DEFAULT_LLM_PROVIDER_ID &&
    (!trimmedEndpoint || trimmedEndpoint === '/v1' || trimmedEndpoint === '/v1/')
  ) {
    return DEFAULT_NEW_API_ENDPOINT;
  }

  return EnvConfig.api.normalizeEndpoint(trimmedEndpoint);
}
export function assertSafeLLMEndpoint(endpoint: string): void {
  if (!configCenter.isProduction() || !isDangerousEndpoint(endpoint)) {
    return;
  }

  const dangerousEndpoints = getDangerousEndpoints();
  throw new SystemError(
    '⛔ 安全限制: 生产环境禁止直接调用外部API\n\n' +
      '可能的原因:\n' +
      '1. 未配置代理服务器\n' +
      '2. API端点配置错误\n\n' +
      '解决方案:\n' +
      '- 请在设置中配置企业代理\n' +
      '- 或联系管理员配置企业服务端网关\n\n' +
      `检测到的危险端点: ${dangerousEndpoints.join(', ')}\n` +
      '这是为了保护您的API密钥安全。',
    'LLM_DANGEROUS_ENDPOINT',
    {
      module: 'LLMService',
      action: 'callLLM',
      endpoint,
      dangerousEndpoints: dangerousEndpoints.join(', '),
      environment: 'production',
    }
  );
}
/** Flatten official chat content (string | parts | null) to plain text for UI/budget. */
export function chatContentToPlainText(content: ChatMessage['content']): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);
  return content
    .map(part => (part && part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}
export function contentToPlainText(content: ChatMessage['content']): string {
  return chatContentToPlainText(content);
}
/**
 * Chat path: preserve official message shape (parts, tool_calls, tool role).
 * Other paths: flatten to text roles expected by native body builders.
 */
export function normalizeMessagesForTransport(
  messages: ChatMessage[],
  pathId: ApiPathId = 'chat_completions'
): Array<Record<string, unknown>> {
  if (pathId === 'chat_completions') {
    return messages.map(message => {
      const row: Record<string, unknown> = { role: message.role };
      if (message.content !== undefined) {
        row.content = message.content;
      } else if (!message.tool_calls?.length) {
        row.content = '';
      }
      if (message.name) row.name = message.name;
      if (message.tool_call_id) row.tool_call_id = message.tool_call_id;
      if (message.tool_calls?.length) row.tool_calls = message.tool_calls;
      if (message.refusal !== undefined) row.refusal = message.refusal;
      return row;
    });
  }

  return messages.map(message => {
    const role =
      message.role === 'developer'
        ? 'system'
        : message.role === 'tool'
          ? 'user'
          : message.role === 'assistant'
            ? 'assistant'
            : message.role === 'system'
              ? 'system'
              : 'user';
    return {
      role,
      content: contentToPlainText(message.content),
    };
  });
}

function extractOutboundReasoningMarker(body: Record<string, unknown>): string | undefined {
  if (body.reasoning_effort !== undefined) {
    return String(body.reasoning_effort);
  }
  const reasoning = body.reasoning as { effort?: unknown } | undefined;
  if (reasoning?.effort !== undefined) {
    return String(reasoning.effort);
  }
  // Anthropic Messages official: output_config.effort
  const outputConfig = body.output_config as { effort?: unknown } | undefined;
  if (outputConfig?.effort !== undefined) {
    return String(outputConfig.effort);
  }
  const thinking = body.thinking as { budget_tokens?: unknown } | undefined;
  if (thinking?.budget_tokens !== undefined) {
    return `budget:${String(thinking.budget_tokens)}`;
  }
  // Toggle-only / thinking+effort families (Kimi K2.x, DeepSeek, GLM-5.x)
  const thinkingToggle = body.thinking as { type?: unknown } | undefined;
  if (thinkingToggle?.type === 'enabled') {
    return 'thinkingToggle:enabled';
  }
  // Gemini official: generationConfig.thinkingConfig (top-level kept for legacy bodies)
  const generationConfig = body.generationConfig as
    { thinkingConfig?: { thinkingBudget?: unknown } } | undefined;
  const thinkingConfig =
    generationConfig?.thinkingConfig ??
    (body.thinkingConfig as { thinkingBudget?: unknown } | undefined);
  if (thinkingConfig?.thinkingBudget !== undefined) {
    return `geminiBudget:${String(thinkingConfig.thinkingBudget)}`;
  }
  return undefined;
}
function logReasoningTransport(args: {
  model: string;
  surface: ApiSurface;
  body: Record<string, unknown>;
  capabilitySupports: boolean;
  globalEnabled: boolean;
  session: SessionReasoningOverride | undefined;
  /** Pre-clamp intent; logged when demoted vs body/effective. */
  requestedEffort?: string;
  effectiveEffort?: string;
}): void {
  const effort = extractOutboundReasoningMarker(args.body);
  // Production: silent. Dev: console for gateway field verification.
  const isDev =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev) {
    return;
  }
  if (effort !== undefined) {
    const demoted =
      args.requestedEffort &&
      args.effectiveEffort &&
      args.requestedEffort !== 'off' &&
      args.requestedEffort !== args.effectiveEffort;
    const demoteSuffix = demoted ? ` requested=${args.requestedEffort}` : '';
    console.info(
      `[LLM] 请求将发送推理参数 surface=${args.surface} model=${args.model} effort=${effort}${demoteSuffix}`
    );
    return;
  }
  if (args.capabilitySupports) {
    console.info(
      `[LLM] 推理可用但未启用 surface=${args.surface} model=${args.model} ` +
        `globalEnabled=${args.globalEnabled} session=${JSON.stringify(args.session ?? null)}`
    );
  }
}
function resolveTransportPathId(
  options: ResolvedLLMOptions,
  capabilitySupportsStructuredOutput: boolean,
  forcePath?: ApiPathId
): ApiPathId {
  if (forcePath) return forcePath;
  const current = options.apiPath ?? 'chat_completions';
  // jsonMode: keep Gemini/Anthropic native (Anthropic has no response_format — JSON is
  // prompt-constrained; switching path would 404 on native endpoints); keep Responses when
  // structured output (text.format) is supported; otherwise force chat_completions + response_format.
  if (options.jsonMode === true) {
    if (current === 'gemini_generate' || current === 'anthropic_messages') return current;
    if (current === 'responses' && capabilitySupportsStructuredOutput) return 'responses';
    return 'chat_completions';
  }
  return current;
}

export function createLLMTransport(args: {
  messages: ChatMessage[];
  model: string;
  options: ResolvedLLMOptions;
  provider: string;
  endpoint: string;
  forcePath?: ApiPathId;
}): {
  body: Record<string, unknown>;
  path: string;
  requestUrl: string;
  apiSurface: ApiSurface;
  apiPath: ApiPathId;
} {
  const preferredPath = args.forcePath ?? args.options.apiPath ?? 'chat_completions';
  const probeCapability = resolveModelCapability({
    provider: args.provider,
    modelId: args.model,
    modelsEntry: args.options.modelsEntry,
    preferredSurface: preferredPath,
  });
  const pathId = resolveTransportPathId(
    args.options,
    probeCapability.supportsStructuredOutput,
    args.forcePath
  );
  const capability = resolveModelCapability({
    provider: args.provider,
    modelId: args.model,
    modelsEntry: args.options.modelsEntry,
    preferredSurface: pathId,
  });
  const reasoning = resolveEffectiveReasoning(
    capability,
    args.options.reasoningPrefs,
    args.options.reasoningSessionOverride
  );

  const body = buildBodyForApiPath({
    pathId,
    model: args.model,
    messages: normalizeMessagesForTransport(args.messages, pathId),
    temperature: args.options.temperature,
    maxTokens: args.options.maxTokens,
    stream: args.options.stream,
    jsonMode: args.options.jsonMode,
    serviceTier: args.options.serviceTier,
    capability,
    reasoning,
    previousResponseId: args.options.previousResponseId,
    store: args.options.store,
    tools: args.options.tools,
    toolChoice: args.options.toolChoice,
    parallelToolCalls: args.options.parallelToolCalls,
    visionUserParts: args.options.visionUserParts,
    followUpInputItems: args.options.followUpInputItems,
    jsonSchema: args.options.jsonSchema,
    topP: args.options.topP,
    frequencyPenalty: args.options.frequencyPenalty,
    presencePenalty: args.options.presencePenalty,
    stop: args.options.stop,
    n: args.options.n,
    seed: args.options.seed,
    logitBias: args.options.logitBias,
    logprobs: args.options.logprobs,
    topLogprobs: args.options.topLogprobs,
    metadata: args.options.metadata,
    promptCacheKey: args.options.promptCacheKey,
    safetyIdentifier: args.options.safetyIdentifier,
    user: args.options.user,
    modalities: args.options.modalities,
    audio: args.options.audio,
    prediction: args.options.prediction,
    webSearchOptions: args.options.webSearchOptions,
    truncation: args.options.truncation,
    background: args.options.background,
    maxToolCalls: args.options.maxToolCalls,
    include: args.options.include,
  });

  const { fullUrl, pathSuffix } = buildFullApiUrl(args.endpoint, pathId, args.model, {
    stream: args.options.stream === true,
  });

  logReasoningTransport({
    model: args.model,
    surface: pathId,
    body,
    capabilitySupports: Boolean(capability.supportsReasoning && capability.mapRequest),
    globalEnabled: Boolean(args.options.reasoningPrefs?.enabled),
    session: args.options.reasoningSessionOverride,
    requestedEffort: String(reasoning.requestedEffort),
    effectiveEffort: String(reasoning.effort),
  });

  return {
    body,
    path: pathSuffix,
    requestUrl: fullUrl,
    apiSurface: pathId,
    apiPath: pathId,
  };
}
/**
 * Build request headers for the selected API path.
 * Always sets Content-Type + Bearer when key present (new-api / OpenAI-compatible).
 * Anthropic path also sets anthropic-version + x-api-key (native Anthropic / dual-auth gateways).
 * Gemini path also sets x-goog-api-key (Google AI Studio style).
 *
 * 设计意图(勿"修复"):BYOK 网关依赖 Authorization: Bearer,原生 Anthropic/Gemini 端点
 * 只读各自的 x-api-key / x-goog-api-key 并忽略多余头。双认证头同时下发是刻意兼容策略,
 * 移除 Bearer 会导致网关 401。
 */

export function buildLLMRequestHeaders(
  apiPath: ApiPathId,
  apiKey: string | undefined
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!apiKey) {
    return headers;
  }
  headers.Authorization = `Bearer ${apiKey}`;
  if (apiPath === 'anthropic_messages') {
    headers['anthropic-version'] = '2023-06-01';
    headers['x-api-key'] = apiKey;
  }
  if (apiPath === 'gemini_generate') {
    headers['x-goog-api-key'] = apiKey;
  }
  return headers;
}
