// src/services/llm/index.ts
// ================================================================
// LLM 调用主入口（callLLM / callLLMWithConfig / createInitialLLMContext）
// 由 llmService.ts 拆分而来（Level 2 重构）
// ================================================================
// 导入类型守卫
import {

  resolveLLMOptions,
} from './callContext';
import {
  callLLMChatStreamFirstThenToolLoop,
  callLLMChatToolLoop,
  callLLMResponsesToolLoop,
  callLLMStreamFirstThenToolLoop,
  assertToolLoopOptions,
  normalizeLLMCallArgs,
  shouldUseChatToolLoop,
  shouldUseResponsesToolLoop,
  callLLMWithRetry,
} from './toolLoop';
import {
  assertSafeLLMEndpoint,
  resolveProviderEndpoint,
} from '../llmTransport';

import type {
ChatMessage,
LLMCallArgs,
LLMCallRequest,
LLMConfig,
LLMOptions,
} from '../llmTypes';


export { chatContentToPlainText } from '../llmTransport';
export { fetchModelsFromApi } from '../llmModelList';


/**
 * 通用大语言模型调用接口 (带自动重试)
 * 双 overload 签名：改善位置参数调用时 LLMOptions 内回调参数（onFirstResponse 等）的类型推断
 */
// eslint-disable-next-line @typescript-eslint/max-params -- public API keeps 6-arg positional shape
export function callLLM(
  messages: ChatMessage[],
  provider: string,
  endpoint: string,
  apiKey: string,
  model: string,
  options?: LLMOptions
): Promise<string>;
// eslint-disable-next-line no-redeclare -- callLLM overload (single request argument)
export function callLLM(request: LLMCallRequest): Promise<string>;
// eslint-disable-next-line no-redeclare -- callLLM overload implementation
export async function callLLM(...args: LLMCallArgs): Promise<string> {
  const request = normalizeLLMCallArgs(args);
  const resolvedOptions = resolveLLMOptions(request.options || {}, request.provider, request.model);
  const normalizedEndpoint = resolveProviderEndpoint(request.provider, request.endpoint);
  assertSafeLLMEndpoint(normalizedEndpoint);
  assertToolLoopOptions(resolvedOptions);

  if (shouldUseResponsesToolLoop(resolvedOptions)) {
    // Stream-first preserves 深度思考 / 已完成 chrome; tool loop only when needed.
    if (resolvedOptions.stream) {
      return callLLMStreamFirstThenToolLoop(request, resolvedOptions, normalizedEndpoint);
    }
    return callLLMResponsesToolLoop(request, resolvedOptions, normalizedEndpoint);
  }

  if (shouldUseChatToolLoop(resolvedOptions)) {
    if (resolvedOptions.stream) {
      return callLLMChatStreamFirstThenToolLoop(request, resolvedOptions, normalizedEndpoint);
    }
    return callLLMChatToolLoop(request, resolvedOptions, normalizedEndpoint);
  }

  return callLLMWithRetry(request, resolvedOptions, normalizedEndpoint);
}

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

// llmTypes 类型导出（供外部模块经 '@/services/llmService' 中转获取）
export type {
  ChatContentPart,
  ChatMessage,
  ChatToolCall,
  LLMCallRequest,
  LLMConfig,
  LLMOptions,
  LLMStreamMetrics,
  LLMStreamUpdate,
  MessageRole,
  ModelInfo,
} from '../llmTypes';

// 子模块全量重导出：保持 '@/services/llmService' 原有导出表面不变
export * from './streamParsing';
export * from './callContext';
export * from './responseParsing';
export * from './toolLoop';

