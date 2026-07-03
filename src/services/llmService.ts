// src/services/llmService.ts
// ================================================================
// 🎯 大语言模型服务 (TypeScript版本)
// 🛡️ 增强鲁棒性 - 指数退避重试 (Exponential Backoff)
// 🌐 环境适配 - 开发/生产环境自动切换
// 🎯 P0-4: 已迁移到统一错误处理
// 🎯 P0-4.1.8: 在数据边界使用类型守卫
// ================================================================

import { ErrorService } from './errorService';
import { configCenter } from '../common/config/ConfigCenter';
import { EnvConfig } from '../common/config/envConfig';
import { ApiError, NetworkError, SystemError } from '../common/errors';
import { isDangerousEndpoint, getDangerousEndpoints } from '../common/config/apiEndpoints';
import { randomFloat } from '../common/utils/random';
// 导入统一的 API 响应类型
import type { LLMChatCompletionResponse, LLMErrorResponse } from '../types/api';
// 导入类型守卫
import { isLLMChatCompletionResponse } from '../common/guards/typeGuards';

// ========================
// 类型定义
// ========================

/**
 * 聊天消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息对象
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * LLM 调用配置选项
 */
export interface LLMOptions {
  /** 温度参数 (0-2)，越低越确定性 */
  temperature?: number;
  /** 是否强制 JSON 输出格式 */
  jsonMode?: boolean;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 最大输出 token 数 */
  maxTokens?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 初始重试延迟 (ms) */
  retryDelay?: number;
  /** 请求取消信号 */
  signal?: AbortSignal;
  stream?: boolean;
  onFirstResponse?: (metrics: LLMStreamMetrics) => void;
  onStreamUpdate?: (update: LLMStreamUpdate) => void;
}

export interface LLMStreamMetrics {
  elapsedMs: number;
  firstChunkMs?: number;
  chunkCount: number;
}

export interface LLMStreamUpdate extends LLMStreamMetrics {
  delta: string;
  content: string;
}

/**
 * LLM 配置对象 (用于跨模块传递)
 */
export interface LLMConfig {
  /** 厂商标识 (openai, anthropic, deepseek...) */
  provider: string;
  /** API 端点 URL */
  endpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
}

export interface LLMCallRequest extends LLMConfig {
  messages: ChatMessage[];
  options?: LLMOptions;
}

type PositionalLLMCallArgs = [
  messages: ChatMessage[],
  provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  options?: LLMOptions,
];

type LLMCallArgs = PositionalLLMCallArgs | [request: LLMCallRequest];

/**
 * 模型信息对象
 * @deprecated 使用 LLMModel 类型代替
 */
export interface ModelInfo {
  /** 模型 ID */
  id: string;
  /** 上下文窗口大小 */
  context: number;
  /** 支持的特性列表 */
  features: string[];
}

// ========================
// 辅助函数
// ========================

/**
 * 睡眠函数
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_NEW_API_ENDPOINT = 'https://new.hongecb.store/v1';

function resolveProviderEndpoint(provider: string, endpoint: string): string {
  const trimmedEndpoint = (endpoint || '').trim();

  if (
    provider === 'new_api' &&
    (!trimmedEndpoint || trimmedEndpoint === '/v1' || trimmedEndpoint === '/v1/')
  ) {
    return DEFAULT_NEW_API_ENDPOINT;
  }

  return EnvConfig.api.normalizeEndpoint(trimmedEndpoint);
}

function getStreamDelta(payload: Record<string, unknown>): string {
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const firstChoice = choices[0] as Record<string, unknown>;
  const delta = firstChoice.delta as Record<string, unknown> | undefined;
  const message = firstChoice.message as Record<string, unknown> | undefined;

  const content = delta?.content ?? message?.content;
  return typeof content === 'string' ? content : '';
}

function parseBufferedJsonCompletion(rawText: string): LLMChatCompletionResponse | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as LLMChatCompletionResponse;
  } catch {
    return null;
  }
}

function getLLMErrorMessage(errorText: string, fallback: string): string {
  try {
    const errorJson = JSON.parse(errorText) as LLMErrorResponse;
    return errorJson.error?.message || fallback;
  } catch {
    return fallback;
  }
}

type OpenAIStreamOptions = Pick<LLMOptions, 'onFirstResponse' | 'onStreamUpdate'>;

interface OpenAIStreamState {
  content: string;
  firstChunkMs?: number;
  chunkCount: number;
}

interface OpenAIStreamLineContext {
  response: Response;
  requestStartedAt: number;
  options: OpenAIStreamOptions;
  state: OpenAIStreamState;
}

interface OpenAIStreamReadResult {
  content: string;
  fallbackJson: LLMChatCompletionResponse | null;
  firstChunkMs?: number;
  chunkCount: number;
}

function getCompletionContent(
  completion: LLMChatCompletionResponse | null,
  defaultContent = ''
): string {
  return completion?.choices?.[0]?.message?.content || defaultContent;
}

function getStreamData(line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith('data:')) {
    return '';
  }

  const data = trimmedLine.slice(5).trim();
  return data === '[DONE]' ? '' : data;
}

function parseStreamPayload(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function notifyFirstStreamChunk(context: OpenAIStreamLineContext): void {
  if (context.state.firstChunkMs !== undefined) {
    return;
  }

  context.state.firstChunkMs = Date.now() - context.requestStartedAt;
  context.options.onFirstResponse?.({
    elapsedMs: context.state.firstChunkMs,
    firstChunkMs: context.state.firstChunkMs,
    chunkCount: context.state.chunkCount,
  });
}

function assertStreamPayloadIsOk(
  payload: Record<string, unknown>,
  data: string,
  response: Response
): void {
  const errorPayload = payload.error as { message?: string } | undefined;
  if (!errorPayload?.message) {
    return;
  }

  throw new ApiError(errorPayload.message, 'API_STREAM_ERROR', response.status, data, {
    module: 'LLMService',
    action: 'readOpenAIStream',
  });
}

function processOpenAIStreamLine(line: string, context: OpenAIStreamLineContext): void {
  const data = getStreamData(line);
  if (!data) {
    return;
  }

  context.state.chunkCount++;
  notifyFirstStreamChunk(context);

  const payload = parseStreamPayload(data);
  if (!payload) {
    return;
  }

  assertStreamPayloadIsOk(payload, data, context.response);

  const delta = getStreamDelta(payload);
  if (!delta) {
    return;
  }

  context.state.content += delta;
  context.options.onStreamUpdate?.({
    delta,
    content: context.state.content,
    elapsedMs: Date.now() - context.requestStartedAt,
    firstChunkMs: context.state.firstChunkMs,
    chunkCount: context.state.chunkCount,
  });
}

async function readBufferedOpenAIResponse(response: Response): Promise<OpenAIStreamReadResult> {
  const rawText = await response.text();
  const fallbackJson = parseBufferedJsonCompletion(rawText);
  return {
    content: getCompletionContent(fallbackJson, rawText),
    fallbackJson,
    chunkCount: 0,
  };
}

function processStreamText(text: string, buffer: string, context: OpenAIStreamLineContext): string {
  const lines = `${buffer}${text}`.split(/\r?\n/);
  const nextBuffer = lines.pop() || '';

  for (const line of lines) {
    processOpenAIStreamLine(line, context);
  }

  return nextBuffer;
}

function processRemainingStreamBuffer(buffer: string, context: OpenAIStreamLineContext): void {
  if (!buffer.trim()) {
    return;
  }

  for (const line of buffer.split(/\r?\n/)) {
    processOpenAIStreamLine(line, context);
  }
}

async function readOpenAIStreamBody(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  context: OpenAIStreamLineContext
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const decoded = decoder.decode(value, { stream: true });
    rawText += decoded;
    buffer = processStreamText(decoded, buffer, context);
  }

  const tail = decoder.decode();
  if (tail) {
    rawText += tail;
    buffer = processStreamText(tail, buffer, context);
  }

  processRemainingStreamBuffer(buffer, context);
  return rawText;
}

function createOpenAIStreamResult(
  state: OpenAIStreamState,
  rawText: string
): OpenAIStreamReadResult {
  const fallbackJson = state.content ? null : parseBufferedJsonCompletion(rawText);
  return {
    content: state.content || getCompletionContent(fallbackJson),
    fallbackJson,
    firstChunkMs: state.firstChunkMs,
    chunkCount: state.chunkCount,
  };
}

async function readOpenAIStream(
  response: Response,
  requestStartedAt: number,
  options: OpenAIStreamOptions
): Promise<OpenAIStreamReadResult> {
  const reader = response.body?.getReader();

  if (!reader) {
    return readBufferedOpenAIResponse(response);
  }

  const state: OpenAIStreamState = { content: '', chunkCount: 0 };
  const lineContext: OpenAIStreamLineContext = { response, requestStartedAt, options, state };
  const rawText = await readOpenAIStreamBody(reader, lineContext);
  return createOpenAIStreamResult(state, rawText);
}

interface ResolvedLLMOptions {
  temperature: number;
  jsonMode: boolean;
  timeout: number;
  maxTokens: number | undefined;
  retries: number;
  retryDelay: number;
  signal: AbortSignal | undefined;
  stream: boolean;
  onFirstResponse: LLMOptions['onFirstResponse'];
  onStreamUpdate: LLMOptions['onStreamUpdate'];
}

interface LLMCallContext {
  endpoint: string;
  normalizedEndpoint: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  options: ResolvedLLMOptions;
  requestBody: Record<string, unknown>;
}

interface LLMResponsePayload {
  data: LLMChatCompletionResponse | null;
  content: string;
  streamMetrics?: {
    firstChunkMs?: number;
    chunkCount: number;
  };
}

interface LLMAttemptFailure {
  error: Error;
  shouldRetry: boolean;
}

function resolveLLMOptions(options: LLMOptions): ResolvedLLMOptions {
  return {
    temperature: options.temperature ?? 0.3,
    jsonMode: options.jsonMode ?? false,
    timeout: options.timeout ?? 90000,
    maxTokens: options.maxTokens,
    retries: options.retries ?? 2,
    retryDelay: options.retryDelay ?? 1000,
    signal: options.signal,
    stream: options.stream ?? true,
    onFirstResponse: options.onFirstResponse,
    onStreamUpdate: options.onStreamUpdate,
  };
}

function assertSafeLLMEndpoint(endpoint: string): void {
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
      '- 或联系管理员配置 Cloudflare Workers 代理\n\n' +
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

function createLLMRequestBody(
  messages: ChatMessage[],
  model: string,
  options: ResolvedLLMOptions
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: options.temperature,
    ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
    ...(options.stream && { stream: true }),
    ...(options.jsonMode && { response_format: { type: 'json_object' } }),
  };
}

async function waitBeforeLLMRetry(attempt: number, options: ResolvedLLMOptions): Promise<void> {
  if (attempt === 0) {
    return;
  }

  const delay = options.retryDelay * Math.pow(2, attempt - 1) * (1 + randomFloat() * 0.2);
  await sleep(delay);
}

function createLLMAbortResources(options: ResolvedLLMOptions): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout);
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  return { controller, timeoutId };
}

async function fetchLLMResponse(
  context: LLMCallContext,
  controller: AbortController
): Promise<Response> {
  return fetch(`${context.normalizedEndpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.apiKey}`,
    },
    body: JSON.stringify(context.requestBody),
    signal: controller.signal,
  });
}

function getLLMStatusError(
  status: number,
  errorMsg: string
): { errorCode: string; errorMsg: string } {
  if (status === 401) {
    return {
      errorCode: 'API_INVALID_KEY',
      errorMsg: configCenter.isProduction()
        ? `认证失败: ${errorMsg}\n\n可能的原因:\n1. 未配置访问密码\n2. API Key 格式不正确\n3. API Key 已过期或无效`
        : `API Key 认证失败: ${errorMsg}`,
    };
  }

  if (status === 429) {
    return { errorCode: 'API_RATE_LIMIT', errorMsg };
  }

  if (status === 404) {
    return { errorCode: 'API_NOT_FOUND', errorMsg };
  }

  if (status === 400) {
    return { errorCode: 'API_INVALID_REQUEST', errorMsg };
  }

  return { errorCode: 'API_SERVER_ERROR', errorMsg };
}

async function createLLMResponseError(
  response: Response,
  context: LLMCallContext,
  attempt: number
): Promise<ApiError> {
  const errorText = await response.text();
  const fallbackErrorMsg = `服务器返回错误 ${response.status}`;
  const errorMsg = getLLMErrorMessage(errorText, fallbackErrorMsg);
  const statusError = getLLMStatusError(response.status, errorMsg);

  return new ApiError(statusError.errorMsg, statusError.errorCode, response.status, errorText, {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    attempt: attempt + 1,
  });
}

async function readLLMResponsePayload(
  response: Response,
  context: LLMCallContext,
  requestStartedAt: number
): Promise<LLMResponsePayload> {
  if (!context.options.stream) {
    return { data: await response.json(), content: '' };
  }

  const streamResult = await readOpenAIStream(response, requestStartedAt, {
    onFirstResponse: context.options.onFirstResponse,
    onStreamUpdate: context.options.onStreamUpdate,
  });

  return {
    data: streamResult.fallbackJson,
    content: streamResult.content,
    streamMetrics: {
      firstChunkMs: streamResult.firstChunkMs,
      chunkCount: streamResult.chunkCount,
    },
  };
}

function hasLLMMessage(data: LLMChatCompletionResponse): boolean {
  return !!data.choices?.[0]?.message;
}

function createInvalidLLMResponseError(
  message: string,
  data: unknown,
  response: Response,
  context: LLMCallContext
): ApiError {
  return new ApiError(
    message,
    'API_INVALID_RESPONSE',
    response.status,
    JSON.stringify(data).substring(0, 200),
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      endpoint: context.normalizedEndpoint,
    }
  );
}

function assertValidLLMResponse(
  payload: LLMResponsePayload,
  response: Response,
  context: LLMCallContext
): void {
  const { data } = payload;
  if (!data) {
    return;
  }

  if (!isLLMChatCompletionResponse(data)) {
    throw createInvalidLLMResponseError('LLM API 返回格式异常', data, response, context);
  }

  if (!hasLLMMessage(data)) {
    throw createInvalidLLMResponseError(
      `API 返回格式异常: 缺少 choices 或 message 字段`,
      data,
      response,
      context
    );
  }
}

function getLLMResponseContent(payload: LLMResponsePayload): string {
  return payload.content || getCompletionContent(payload.data);
}

async function executeLLMAttempt(context: LLMCallContext, attempt: number): Promise<string> {
  await waitBeforeLLMRetry(attempt, context.options);

  const { controller, timeoutId } = createLLMAbortResources(context.options);
  const requestStartedAt = Date.now();

  try {
    const response = await fetchLLMResponse(context, controller);

    if (!response.ok) {
      throw await createLLMResponseError(response, context, attempt);
    }

    const payload = await readLLMResponsePayload(response, context, requestStartedAt);
    assertValidLLMResponse(payload, response, context);
    return getLLMResponseContent(payload);
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetryApiError(error: ApiError, context: LLMCallContext, attempt: number): boolean {
  return (
    attempt < context.options.retries &&
    (error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500))
  );
}

function createLLMTimeoutError(
  error: Error,
  context: LLMCallContext,
  attempt: number
): NetworkError {
  return new NetworkError(
    `模型响应超时(${context.options.timeout / 1000}秒)`,
    'LLM_TIMEOUT',
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      timeout: context.options.timeout,
      attempt: attempt + 1,
    },
    error
  );
}

function createLLMNetworkError(
  error: Error,
  context: LLMCallContext,
  attempt: number
): NetworkError {
  return new NetworkError(
    error.message || '网络请求失败',
    'NET_REQUEST_FAILED',
    {
      module: 'LLMService',
      action: 'callLLM',
      model: context.model,
      attempt: attempt + 1,
    },
    error
  );
}

function resolveLLMAttemptFailure(
  errorValue: unknown,
  context: LLMCallContext,
  attempt: number
): LLMAttemptFailure {
  const error = errorValue as Error & { name?: string; status?: number };

  if (error instanceof ApiError) {
    return { error, shouldRetry: shouldRetryApiError(error, context, attempt) };
  }

  if (error.name === 'AbortError') {
    const timeoutError = createLLMTimeoutError(error, context, attempt);
    return { error: timeoutError, shouldRetry: attempt < context.options.retries };
  }

  if (!error.status && attempt < context.options.retries) {
    const networkError = createLLMNetworkError(error, context, attempt);
    return { error: networkError, shouldRetry: true };
  }

  return { error, shouldRetry: false };
}

function createUnknownLLMFailure(context: LLMCallContext): SystemError {
  return new SystemError('LLM 调用失败 (未知原因)', 'LLM_UNKNOWN_FAILURE', {
    module: 'LLMService',
    action: 'callLLM',
    model: context.model,
    endpoint: context.normalizedEndpoint,
    retries: context.options.retries,
  });
}

function normalizeLLMCallArgs(args: LLMCallArgs): LLMCallRequest {
  if (args.length === 1) {
    return { ...args[0], options: args[0].options || {} };
  }

  const [messages, provider, endpoint, apiKey, model, options = {}] = args;
  return { messages, provider, endpoint, apiKey, model, options };
}

// ========================
// 核心 API 函数
// ========================

/**
 * 通用大语言模型调用接口 (带自动重试)
 */
export async function callLLM(...args: LLMCallArgs): Promise<string> {
  const request = normalizeLLMCallArgs(args);
  const resolvedOptions = resolveLLMOptions(request.options || {});
  const normalizedEndpoint = resolveProviderEndpoint(request.provider, request.endpoint);
  assertSafeLLMEndpoint(normalizedEndpoint);

  const context: LLMCallContext = {
    endpoint: request.endpoint,
    normalizedEndpoint,
    apiKey: request.apiKey,
    model: request.model,
    messages: request.messages,
    options: resolvedOptions,
    requestBody: createLLMRequestBody(request.messages, request.model, resolvedOptions),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= resolvedOptions.retries; attempt++) {
    try {
      return await executeLLMAttempt(context, attempt);
    } catch (errorValue) {
      const failure = resolveLLMAttemptFailure(errorValue, context, attempt);
      if (!failure.shouldRetry) {
        throw failure.error;
      }
      lastError = failure.error;
    }
  }

  throw lastError || createUnknownLLMFailure(context);
}

interface FetchModelsContext {
  provider: string;
  endpoint: string;
  normalizedEndpoint: string;
  apiKey: string;
}

interface ModelArrayField {
  key: string;
  value: unknown[];
  length: number;
}

function assertSafeModelsEndpoint(endpoint: string): void {
  if (!configCenter.isProduction() || !isDangerousEndpoint(endpoint)) {
    return;
  }

  throw new SystemError(
    '⛔ 安全限制: 生产环境禁止直接调用外部API\n' + '请配置企业代理或联系管理员',
    'LLM_DANGEROUS_ENDPOINT',
    {
      module: 'LLMService',
      action: 'fetchModelsFromApi',
      endpoint,
      environment: 'production',
    }
  );
}

async function fetchModelsRawText(context: FetchModelsContext): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(`${context.normalizedEndpoint}/models`, {
    headers: {
      Authorization: `Bearer ${context.apiKey}`,
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
      'LLM_API_ERROR',
      response.status,
      errorText,
      {
        module: 'LLMService',
        action: 'fetchModelsFromApi',
        provider: context.provider,
        endpoint: context.endpoint,
      }
    );
  }

  const rawText = await response.text();
  return rawText;
}

function parseModelsJson(rawText: string, context: FetchModelsContext): unknown {
  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    throw new ApiError(
      `API返回的不是有效的JSON格式`,
      'LLM_JSON_PARSE_ERROR',
      undefined,
      rawText.substring(0, 100),
      {
        module: 'LLMService',
        action: 'fetchModelsFromApi',
        provider: context.provider,
        endpoint: context.endpoint,
      },
      parseError instanceof Error ? parseError : undefined
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNamedModelList(dataObj: Record<string, unknown>): ModelArrayField | null {
  if (Array.isArray(dataObj.data)) {
    return { key: 'data', value: dataObj.data, length: dataObj.data.length };
  }

  if (Array.isArray(dataObj.models)) {
    return { key: 'models', value: dataObj.models, length: dataObj.models.length };
  }

  return null;
}

function getArrayFields(dataObj: Record<string, unknown>): ModelArrayField[] {
  return Object.entries(dataObj)
    .filter(([_key, value]) => Array.isArray(value))
    .map(([key, value]) => {
      const values = value as unknown[];
      return { key, value: values, length: values.length };
    });
}

function getLongestArrayField(fields: ModelArrayField[]): ModelArrayField | null {
  if (fields.length === 0) {
    return null;
  }

  return fields.reduce((a, b) => (a.length > b.length ? a : b));
}

function extractModelList(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  const namedList = getNamedModelList(data);
  if (namedList) {
    return namedList.value;
  }

  const possibleArrays = getArrayFields(data);

  const longest = getLongestArrayField(possibleArrays);
  if (!longest) {
    return [];
  }

  return longest.value;
}

function assertModelListNotEmpty(
  list: unknown[],
  data: unknown,
  context: FetchModelsContext
): void {
  if (list.length > 0) {
    return;
  }

  throw new ApiError(
    'API返回的模型列表为空，请检查API配置是否正确',
    'API_EMPTY_MODEL_LIST',
    undefined,
    JSON.stringify(data),
    {
      module: 'LLMService',
      action: 'fetchModelsFromApi',
      provider: context.provider,
      endpoint: context.normalizedEndpoint,
    }
  );
}

function normalizeModelInfo(model: unknown): ModelInfo | null {
  if (typeof model === 'string') {
    return { id: model, context: 128000, features: [] };
  }

  if (isRecord(model)) {
    const id = model.id || model.model || model.name;
    if (!id) {
      return null;
    }

    const context =
      typeof model.context === 'number' && Number.isFinite(model.context) ? model.context : 128000;
    const features = Array.isArray(model.features) ? model.features.map(String) : [];

    return {
      id: String(id),
      context,
      features,
    };
  }

  return null;
}

function normalizeModelList(list: unknown[]): ModelInfo[] {
  const models = list
    .map(normalizeModelInfo)
    .filter((model): model is ModelInfo => model !== null)
    .sort((a, b) => a.id.localeCompare(b.id));

  return models;
}

function handleFetchModelsFailure(error: unknown): never {
  ErrorService.handle(error as Error, {
    action: 'fetchModelsFromApi',
    module: 'llm',
    notify: false,
  });
  throw error;
}

/**
 * 获取模型列表
 */
export async function fetchModelsFromApi(
  provider: string,
  endpoint: string,
  apiKey: string
): Promise<ModelInfo[]> {
  try {
    const normalizedEndpoint = resolveProviderEndpoint(provider, endpoint);
    assertSafeModelsEndpoint(normalizedEndpoint);
    const context: FetchModelsContext = { provider, endpoint, normalizedEndpoint, apiKey };

    const rawText = await fetchModelsRawText(context);
    const data = parseModelsJson(rawText, context);
    const list = extractModelList(data);
    assertModelListNotEmpty(list, data, context);
    return normalizeModelList(list);
  } catch (error) {
    handleFetchModelsFailure(error);
  }
}

// ========================
// 便捷包装函数
// ========================

/**
 * 使用 LLMConfig 对象调用 LLM (简化参数传递)
 */
export async function callLLMWithConfig(
  messages: ChatMessage[],
  config: LLMConfig,
  options: LLMOptions = {}
): Promise<string> {
  return callLLM(messages, config.provider, config.endpoint, config.apiKey, config.model, options);
}
