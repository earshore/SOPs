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
// 导入统一的 API 响应类型
import type { LLMChatCompletionResponse, LLMErrorResponse } from '../types/api';
// 导入类型守卫
import { isLLMChatCompletionResponse } from '../common/guards/typeGuards';

import { Logger } from './loggerService';
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
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

async function readOpenAIStream(
  response: Response,
  requestStartedAt: number,
  options: Pick<LLMOptions, 'onFirstResponse' | 'onStreamUpdate'>
): Promise<{ content: string; fallbackJson: LLMChatCompletionResponse | null; firstChunkMs?: number; chunkCount: number }> {
  const reader = response.body?.getReader();

  if (!reader) {
    const rawText = await response.text();
    const fallbackJson = parseBufferedJsonCompletion(rawText);
    return {
      content: fallbackJson?.choices?.[0]?.message?.content || rawText,
      fallbackJson,
      chunkCount: 0
    };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';
  let content = '';
  let firstChunkMs: number | undefined;
  let chunkCount = 0;

  const processLine = (line: string): void => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('data:')) {
      return;
    }

    const data = trimmedLine.slice(5).trim();
    if (!data || data === '[DONE]') {
      return;
    }

    chunkCount++;

    if (firstChunkMs === undefined) {
      firstChunkMs = Date.now() - requestStartedAt;
      options.onFirstResponse?.({ elapsedMs: firstChunkMs, firstChunkMs, chunkCount });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    const errorPayload = payload.error as { message?: string } | undefined;
    if (errorPayload?.message) {
      throw new ApiError(
        errorPayload.message,
        'API_STREAM_ERROR',
        response.status,
        data,
        { module: 'LLMService', action: 'readOpenAIStream' }
      );
    }

    const delta = getStreamDelta(payload);
    if (!delta) {
      return;
    }

    content += delta;
    options.onStreamUpdate?.({
      delta,
      content,
      elapsedMs: Date.now() - requestStartedAt,
      firstChunkMs,
      chunkCount
    });
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const decoded = decoder.decode(value, { stream: true });
    rawText += decoded;
    buffer += decoded;

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      processLine(line);
    }
  }

  const tail = decoder.decode();
  if (tail) {
    rawText += tail;
    buffer += tail;
  }

  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      processLine(line);
    }
  }

  const fallbackJson = content ? null : parseBufferedJsonCompletion(rawText);
  return {
    content: content || fallbackJson?.choices?.[0]?.message?.content || '',
    fallbackJson,
    firstChunkMs,
    chunkCount
  };
}

// ========================
// 核心 API 函数
// ========================

/**
 * 通用大语言模型调用接口 (带自动重试)
 */
export async function callLLM(
  messages: ChatMessage[],
  _provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  options: LLMOptions = {}
): Promise<string> {
  const {
    temperature = 0.3,
    jsonMode = false,
    timeout = 90000,
    retries = 2,
    retryDelay = 1000,
    signal,
    stream = true,
    onFirstResponse,
    onStreamUpdate,
  } = options;

  // 🔒 P0修复: 生产环境安全检查
  if (configCenter.isProduction() && isDangerousEndpoint(endpoint)) {
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
        environment: 'production'
      }
    );
  }

  // 标准化 endpoint (开发/生产环境自动适配)
  const normalizedEndpoint = resolveProviderEndpoint(_provider, endpoint);

  // 🔍 调试：始终输出配置信息（用于诊断生产环境问题）
  if (!(callLLM as any)._configLogged) {
    Logger.debug(`🌐 [LLM] 环境: ${configCenter.get('environment')}`);
    Logger.debug(`🌐 [LLM] 原始 Endpoint: ${endpoint}`);
    Logger.debug(`🌐 [LLM] api.baseUrl: ${configCenter.get('api.baseUrl')}`);
    Logger.debug(`🌐 [LLM] 标准化 Endpoint: ${normalizedEndpoint}`);
    Logger.debug(`🌐 [LLM] 最终请求 URL: ${normalizedEndpoint}/chat/completions`);
    (callLLM as any)._configLogged = true;
  }

  const requestBody: Record<string, unknown> = {
    model: model,
    messages: messages,
    temperature: temperature,
    ...(stream && { stream: true }),
    // 只有部分模型支持 response_format
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };

  let lastError: Error | null = null;

  // 重试循环
  for (let attempt = 0; attempt <= retries; attempt++) {
    // 支持外部取消信号
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 如果提供了外部 signal，监听其 abort 事件
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      // 首次之后的重试需要等待
      if (attempt > 0) {
        // 指数退避: 1s, 2s, 4s... 加少量 jitter 防止惊群
        const delay = retryDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.2);
        Logger.debug(`⏳ LLM 调用重试 [${attempt}/${retries}]，等待 ${Math.round(delay)}ms...`);
        await sleep(delay);
      }

      const requestStartedAt = Date.now();
      const response = await fetch(`${normalizedEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const headersDurationMs = Date.now() - requestStartedAt;

      // 处理非 200 响应
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `服务器返回错误 ${response.status}`;
        let errorCode = 'API_SERVER_ERROR';
        let shouldRetry = false;

        try {
          const errorJson: LLMErrorResponse = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.message) {
            errorMsg = errorJson.error.message;
          }
        } catch (e) {
          // 解析失败，使用原始文本
        }

        // 根据状态码确定错误类型和是否重试
        if (response.status === 401) {
          errorCode = 'API_INVALID_KEY';
          errorMsg = configCenter.isProduction()
            ? `认证失败: ${errorMsg}\n\n可能的原因:\n1. 未配置访问密码\n2. API Key 格式不正确\n3. API Key 已过期或无效`
            : `API Key 认证失败: ${errorMsg}`;
        } else if (response.status === 429) {
          errorCode = 'API_RATE_LIMIT';
          shouldRetry = true;
        } else if (response.status === 404) {
          errorCode = 'API_NOT_FOUND';
        } else if (response.status >= 500) {
          errorCode = 'API_SERVER_ERROR';
          shouldRetry = true;
        } else if (response.status === 400) {
          errorCode = 'API_INVALID_REQUEST';
        }

        // 创建统一的API错误
        const error = new ApiError(
          errorMsg,
          errorCode,
          response.status,
          errorText,
          {
            module: 'LLMService',
            action: 'callLLM',
            model,
            endpoint: normalizedEndpoint,
            attempt: attempt + 1
          }
        );

        if (shouldRetry && attempt < retries) {
          lastError = error;
          Logger.warn(`⚠️ LLM 调用失败 (${response.status})，准备重试:`, errorMsg);
          continue;
        } else {
          throw error;
        }
      }

      let data: LLMChatCompletionResponse | null = null;
      let responseContent = '';
      let streamMetrics: { firstChunkMs?: number; chunkCount: number } | undefined;

      if (stream) {
        const streamResult = await readOpenAIStream(response, requestStartedAt, {
          onFirstResponse,
          onStreamUpdate
        });
        data = streamResult.fallbackJson;
        responseContent = streamResult.content;
        streamMetrics = {
          firstChunkMs: streamResult.firstChunkMs,
          chunkCount: streamResult.chunkCount
        };
      } else {
        data = await response.json();
      }

      clearTimeout(timeoutId);
      const requestDurationMs = Date.now() - requestStartedAt;

      // 🎯 数据边界验证：验证 LLM 响应格式
      if (data && !isLLMChatCompletionResponse(data)) {
        throw new ApiError(
          'LLM API 返回格式异常',
          'API_INVALID_RESPONSE',
          response.status,
          JSON.stringify(data).substring(0, 200),
          {
            module: 'LLMService',
            action: 'callLLM',
            model,
            endpoint: normalizedEndpoint
          }
        );
      }

      // 兼容性检查：某些非标准 API 可能返回结构不同
      if (data && (!data.choices || !data.choices[0] || !data.choices[0].message)) {
        throw new ApiError(
          `API 返回格式异常: 缺少 choices 或 message 字段`,
          'API_INVALID_RESPONSE',
          response.status,
          JSON.stringify(data).substring(0, 200),
          {
            module: 'LLMService',
            action: 'callLLM',
            model,
            endpoint: normalizedEndpoint
          }
        );
      }

      Logger.debug('[LLM] 调用完成', {
        status: response.status,
        model,
        attempt: attempt + 1,
        headersDurationMs,
        durationMs: requestDurationMs,
        stream,
        firstChunkMs: streamMetrics?.firstChunkMs,
        streamChunks: streamMetrics?.chunkCount,
        cacheStatus: response.headers.get('X-Cache-Status') || undefined,
        upstreamDurationMs: response.headers.get('X-Upstream-Duration-Ms') || undefined,
        functionDurationMs: response.headers.get('X-Function-Duration-Ms') || undefined
      });

      return responseContent || data?.choices?.[0]?.message?.content || '';
    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e as Error;
      const error = e as Error & { name?: string; status?: number };

      // 如果已经是ApiError,直接处理
      if (error instanceof ApiError) {
        if (attempt < retries && (error.statusCode === 429 || (error.statusCode && error.statusCode >= 500))) {
          Logger.warn(`⚠️ LLM 调用失败，准备重试...`);
          continue;
        }
        throw error;
      }

      // 超时错误
      if (error.name === 'AbortError') {
        const timeoutError = new NetworkError(
          `模型响应超时(${timeout / 1000}秒)`,
          'LLM_TIMEOUT',
          {
            module: 'LLMService',
            action: 'callLLM',
            model,
            timeout,
            attempt: attempt + 1
          },
          error
        );

        if (attempt < retries) {
          lastError = timeoutError;
          Logger.warn(`⚠️ LLM 超时，准备重试...`);
          continue;
        }
        throw timeoutError;
      }

      // 网络错误
      if (!error.status && attempt < retries) {
        lastError = new NetworkError(
          error.message || '网络请求失败',
          'NET_REQUEST_FAILED',
          {
            module: 'LLMService',
            action: 'callLLM',
            model,
            attempt: attempt + 1
          },
          error
        );
        Logger.warn(`⚠️ 网络错误，准备重试:`, error.message);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new SystemError(
    'LLM 调用失败 (未知原因)',
    'LLM_UNKNOWN_FAILURE',
    {
      module: 'LLMService',
      action: 'callLLM',
      model,
      endpoint: normalizedEndpoint,
      retries
    }
  );
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
    // 🔒 P0修复: 生产环境安全检查
    if (configCenter.isProduction() && isDangerousEndpoint(endpoint)) {
      throw new SystemError(
        '⛔ 安全限制: 生产环境禁止直接调用外部API\n' +
        '请配置企业代理或联系管理员',
        'LLM_DANGEROUS_ENDPOINT',
        {
          module: 'LLMService',
          action: 'fetchModelsFromApi',
          endpoint,
          environment: 'production'
        }
      );
    }

    // 标准化 endpoint (开发/生产环境自动适配)
    const normalizedEndpoint = resolveProviderEndpoint(provider, endpoint);

    // 🔍 调试：始终输出配置信息（用于诊断生产环境问题）
    if (!(fetchModelsFromApi as any)._configLogged) {
      Logger.debug(`🌐 [Models] 环境: ${configCenter.get('environment')}`);
      Logger.debug(`🌐 [Models] 原始 Endpoint: ${endpoint}`);
      Logger.debug(`🌐 [Models] api.baseUrl: ${configCenter.get('api.baseUrl')}`);
      Logger.debug(`🌐 [Models] 标准化 Endpoint: ${normalizedEndpoint}`);
      Logger.debug(`🌐 [Models] 最终请求 URL: ${normalizedEndpoint}/models`);
      (fetchModelsFromApi as any)._configLogged = true;
    }

    // 设置 10秒 超时，避免获取列表卡死
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    Logger.debug(`🔄 正在从 ${normalizedEndpoint}/models 获取模型列表...`);
    Logger.debug(`📋 请求详情: Provider=${provider}`);

    const res = await fetch(`${normalizedEndpoint}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    Logger.debug(`📡 API响应状态: ${res.status} ${res.statusText}`);
    Logger.debug(`📡 响应头:`, Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      Logger.error(`❌ API返回错误: ${res.status}`, errorText);
      throw new ApiError(
        `HTTP ${res.status}: ${errorText.substring(0, 200)}`,
        'LLM_API_ERROR',
        res.status,
        errorText,
        { module: 'LLMService', action: 'fetchModelsFromApi', provider, endpoint }
      );
    }

    const rawText = await res.text();
    Logger.debug(`📦 API返回原始数据 (前500字符):`, rawText.substring(0, 500));

    let data: unknown;
    try {
      data = JSON.parse(rawText);
      Logger.debug(`📦 解析后的数据结构:`, JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (parseError) {
      Logger.error(`❌ JSON解析失败:`, parseError);
      throw new ApiError(
        `API返回的不是有效的JSON格式`,
        'LLM_JSON_PARSE_ERROR',
        undefined,
        rawText.substring(0, 100),
        { module: 'LLMService', action: 'fetchModelsFromApi', provider, endpoint },
        parseError instanceof Error ? parseError : undefined
      );
    }

    // 兼容不同厂商的数据结构
    let list: Array<{ id: string; name?: string;[key: string]: unknown }> = [];
    const dataObj = data as Record<string, unknown>;

    if (Array.isArray(data)) {
      list = data;
      Logger.debug(`✅ 数据是数组格式，包含 ${list.length} 个元素`);
    } else if (dataObj.data && Array.isArray(dataObj.data)) {
      list = dataObj.data as Array<{ id: string; name?: string;[key: string]: unknown }>;
      Logger.debug(`✅ 数据在 .data 字段中，包含 ${list.length} 个元素`);
    } else if (dataObj.models && Array.isArray(dataObj.models)) {
      list = dataObj.models as Array<{ id: string; name?: string;[key: string]: unknown }>;
      Logger.debug(`✅ 数据在 .models 字段中，包含 ${list.length} 个元素`);
    } else if (typeof data === 'object' && data !== null) {
      Logger.warn(`⚠️ 未识别的数据结构，对象键:`, Object.keys(data));
      // 尝试从对象中提取可能的模型列表
      const possibleArrays = Object.entries(data)
        .filter(([_key, value]) => Array.isArray(value))
        .map(([key, value]) => ({ key, value: value as any[], length: (value as any[]).length }));

      Logger.debug(
        `🔍 找到的数组字段:`,
        possibleArrays.map((p) => `${p.key}(${p.length})`)
      );

      if (possibleArrays.length > 0) {
        // 选择最长的数组，通常是模型列表
        const longest = possibleArrays.reduce((a, b) => (a.length > b.length ? a : b));
        list = longest.value;
        Logger.debug(`✅ 使用字段 "${longest.key}"，包含 ${list.length} 个元素`);
      }
    }

    if (list.length === 0) {
      Logger.warn(`⚠️ 模型列表为空，完整响应:`, JSON.stringify(data));
      throw new ApiError(
        'API返回的模型列表为空，请检查API配置是否正确',
        'API_EMPTY_MODEL_LIST',
        undefined,
        JSON.stringify(data),
        {
          module: 'LLMService',
          action: 'fetchModelsFromApi',
          provider,
          endpoint: normalizedEndpoint
        }
      );
    }

    Logger.debug(`📋 原始列表前3个元素:`, list.slice(0, 3));

    // 处理模型数据，兼容不同的字段名
    const models = list
      .map((m: unknown, index: number): ModelInfo | null => {
        // 如果是字符串，直接使用
        if (typeof m === 'string') {
          return { id: m, context: 128000, features: [] };
        }

        // 如果是对象，尝试提取ID
        if (typeof m === 'object' && m !== null) {
          const modelObj = m as Record<string, unknown>;
          const id = modelObj.id || modelObj.model || modelObj.name;
          if (!id) {
            Logger.warn(`⚠️ 跳过无效模型 [${index}]:`, m);
            return null;
          }

          // 🎯 数据边界验证：验证模型对象基本结构
          const modelInfo: ModelInfo = {
            id: String(id),
            context: 128000,
            features: []
          };

          return modelInfo;
        }

        // 其他类型，尝试转换为字符串
        Logger.warn(`⚠️ 未知模型类型 [${index}]:`, { type: typeof m, value: m });
        return null;
      })
      .filter((m): m is ModelInfo => m !== null)
      .sort((a, b) => a.id.localeCompare(b.id));

    Logger.debug(`✅ 成功解析 ${models.length} 个模型`);
    Logger.debug(
      `📋 前5个模型:`,
      models.slice(0, 5).map((m) => m.id)
    );

    return models;
  } catch (error) {
    Logger.error(`❌ fetchModelsFromApi 失败:`, error);
    Logger.error(`❌ 错误堆栈:`, (error as Error).stack);
    ErrorService.handle(error as Error, {
      action: 'fetchModelsFromApi',
      module: 'llm',
      notify: false,
    });
    throw error; // 抛出错误而不是返回空数组，让调用方知道失败了
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
