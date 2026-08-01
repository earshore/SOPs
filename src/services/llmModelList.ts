// src/services/llmModelList.ts
// ================================================================
// LLM /models endpoint client: fetch, parse, normalize model lists.
// Extracted from llmService (no dependency on llmService internals).
// ================================================================

import { configCenter } from '@/common/config/ConfigCenter';
import { isDangerousEndpoint } from '@/common/config/apiEndpoints';
import { ApiError, SystemError } from '@/common/errors';
import { ErrorService } from './errorService';
import { resolveProviderEndpoint } from './llmTransport';
import type { ModelInfo } from './llmTypes';

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

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function createModelsFetchTimeoutError(): Error {
  const error = new Error('Request timeout');
  error.name = 'AbortError';
  return error;
}

async function fetchModelsRawText(context: FetchModelsContext): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    // 带 reason，避免浏览器默认 “signal is aborted without reason” 噪音
    controller.abort(createModelsFetchTimeoutError());
  }, 10000);
  const headers: Record<string, string> = {};

  if (context.apiKey) {
    headers.Authorization = `Bearer ${context.apiKey}`;
  }

  try {
    const response = await fetch(`${context.normalizedEndpoint}/models`, {
      headers,
      signal: controller.signal,
    });

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

    return await response.text();
  } catch (error) {
    if (timedOut || isAbortError(error)) {
      throw createModelsFetchTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

export function isRecord(value: unknown): value is Record<string, unknown> {
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
  // Align unknown-model fallback with capability registry (32_768).
  const defaultContext = 32_768;
  if (typeof model === 'string') {
    return { id: model, context: defaultContext, features: [] };
  }

  if (isRecord(model)) {
    const id = model.id || model.model || model.name;
    if (!id) {
      return null;
    }

    const context =
      typeof model.context === 'number' && Number.isFinite(model.context) && model.context > 0
        ? model.context
        : defaultContext;
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
  // 超时/取消是预期控制流，不上报 ErrorTracker（避免 high 级 “aborted without reason” 噪音）
  if (!isAbortError(error)) {
    ErrorService.handle(error as Error, {
      action: 'fetchModelsFromApi',
      module: 'llm',
      notify: false,
    });
  }
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
