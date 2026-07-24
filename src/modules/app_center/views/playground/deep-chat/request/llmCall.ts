import {
  uiHooks,
  findConfigModelsEntry,
  parseReasoningEffortValue,
  type DeepChatReasoningSessionOverride,
} from '../session/uiHooks';
import { getActiveThread, updateActiveThreadFields } from '../session/threadStore';
import {
  appendPendingAssistantText,
  emitPendingAssistantDelta,
  getMountedRenderContainer,
  getRenderContainerForThread,
} from '../session/pendingRuntime';

import { callLLM } from '@/services/llmService';
import { normalizeApiPathId, resolveModelCapability } from '@/services/modelCapability';
import {
  createDeepChatBusinessToolExecutor,
  DEEP_CHAT_BUSINESS_TOOLS,
  isDeepChatBusinessToolsEnabled,
} from './businessTools';
import { StorageService } from '@/services/storageService';
import { getRuntimeDeepChatOptions } from '@/services/runtimeStrategyService';
import { describeResponsesEmptyBody } from '@/services/modelCapability';

import type { LLMProviderConfig } from '@/types/state';

import { appendPendingDeepChatReasoningText, type PendingDeepChatRequest } from './lifecycle';
import { getDeepChatRequestBudgetDefaults, resolveDeepChatMaxOutputTokens } from './budget';

import type { DeepChatElement, DeepChatSignals, DeepChatLLMCallContext } from '../types';

import { ValidationError } from '@/common/errors/AppError';

import { sessionState } from '../session/sessionState';

type DeepChatStreamState = { streamedText: string };

export function prepareDeepChatReasoningCallOptions(): {
  reasoningPrefs?: { enabled: boolean; effort: 'low' | 'medium' | 'high' };
  reasoningSessionOverride?: DeepChatReasoningSessionOverride;
} {
  const mountContainer = getMountedRenderContainer();
  const reasoningSessionOverride = uiHooks.resolveDeepChatReasoningSessionOverride(mountContainer);
  if (reasoningSessionOverride && mountContainer) {
    updateActiveThreadFields(mountContainer, {
      reasoning: {
        enabled: reasoningSessionOverride.enabled,
        ...(reasoningSessionOverride.effort ? { effort: reasoningSessionOverride.effort } : {}),
      },
    });
  }
  // Explicit prefs so hydrate cannot fall back to stale disabled global.
  if (reasoningSessionOverride === undefined) {
    return {};
  }
  return {
    reasoningSessionOverride,
    reasoningPrefs: {
      enabled: reasoningSessionOverride.enabled,
      effort: parseReasoningEffortValue(reasoningSessionOverride.effort),
    },
  };
}

export function resolveDeepChatResponsesChainOptions(
  config: LLMProviderConfig,
  model: string,
  /** Optional tool prefs override (tests / explicit callers). Runtime default is fail-closed. */
  toolPrefs?: { enableBusinessTools?: boolean }
): {
  apiPath?: ReturnType<typeof normalizeApiPathId>;
  previousResponseId?: string;
  store?: boolean;
  tools?: unknown[];
  executeTool?: ReturnType<typeof createDeepChatBusinessToolExecutor>;
  enableToolLoop?: boolean;
  maxToolRounds?: number;
} {
  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  if (apiPath !== 'responses') {
    return { apiPath };
  }

  const thread = getActiveThread();
  const previousResponseId =
    thread.lastResponseModel === model && thread.lastResponseId ? thread.lastResponseId : undefined;

  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    preferredSurface: 'responses',
  });

  // Fail-closed product rule: tools only when capability supports them AND opt-in enabled.
  // callLLM uses stream-first + tool-loop fallback so 深度思考 chrome is preserved when on.
  const toolOptions =
    cap.supportsTools && isDeepChatBusinessToolsEnabled(toolPrefs)
      ? {
          tools: DEEP_CHAT_BUSINESS_TOOLS,
          executeTool: createDeepChatBusinessToolExecutor({
            getThread: () => getActiveThread(),
            getModel: () => model,
            getProvider: () => config.provider,
          }),
          enableToolLoop: true,
          maxToolRounds: 4,
        }
      : {};

  // Only request store/previous_id when capability allows (fail-closed registry + gateway).
  const canChain =
    Boolean(previousResponseId) &&
    cap.supportsPreviousResponseId === true &&
    cap.supportsStore === true;
  return {
    apiPath,
    ...(canChain ? { previousResponseId, store: true } : { store: false }),
    ...toolOptions,
  };
}

export function persistDeepChatResponseId(model: string, responseId: string): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  updateActiveThreadFields(container, {
    lastResponseId: responseId,
    lastResponseModel: model,
  });
}

export function isResponsesChainUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const blob =
    `${error.message} ${JSON.stringify((error as { response?: unknown }).response ?? '')}`.toLowerCase();
  return (
    /previous_response_id|stored responses are not supported|store.*not supported|not support.*store/.test(
      blob
    ) ||
    ((error as { statusCode?: number }).statusCode === 400 && /previous_response|store/.test(blob))
  );
}

export function clearDeepChatResponseChain(): void {
  const container = getMountedRenderContainer();
  if (!container) return;
  updateActiveThreadFields(container, {
    lastResponseId: undefined,
    lastResponseModel: undefined,
  });
}

export function stripResponsesChainForRetry(
  chain: ReturnType<typeof resolveDeepChatResponsesChainOptions>
): ReturnType<typeof resolveDeepChatResponsesChainOptions> {
  return {
    apiPath: 'responses',
    store: false,
    ...(chain.tools
      ? {
          tools: chain.tools,
          executeTool: chain.executeTool,
          enableToolLoop: chain.enableToolLoop,
          maxToolRounds: chain.maxToolRounds,
        }
      : {}),
  };
}

export function createDeepChatStreamHandler(
  pendingRequest: PendingDeepChatRequest,
  signals: DeepChatSignals,
  sourceChat: DeepChatElement | null,
  state: DeepChatStreamState
): (update: { delta: string; reasoningDelta?: string }) => void {
  return update => {
    if (pendingRequest.abortReason) return;
    if (update.reasoningDelta) {
      appendPendingDeepChatReasoningText(pendingRequest, update.reasoningDelta);
    }
    state.streamedText += update.delta;
    if (update.delta) {
      appendPendingAssistantText(pendingRequest, update.delta);
      void emitPendingAssistantDelta(signals, pendingRequest, sourceChat, update.delta);
    } else if (update.reasoningDelta) {
      // Only paint chrome for *this* request's thread (not whatever is currently mounted).
      // Background reasoning must keep accumulating without thrashing another session's UI.
      const container = getRenderContainerForThread(pendingRequest.threadId);
      if (container) {
        uiHooks.syncPendingStatus(container);
      }
    }
  };
}

export async function callDeepChatLLM(context: DeepChatLLMCallContext): Promise<string> {
  const { messages, config, model, signals, sourceChat, controller, pendingRequest } = context;
  const streamState: DeepChatStreamState = { streamedText: '' };
  const reasoningOptions = prepareDeepChatReasoningCallOptions();
  let responsesChain = resolveDeepChatResponsesChainOptions(config, model);
  const onStreamUpdate = createDeepChatStreamHandler(
    pendingRequest,
    signals,
    sourceChat,
    streamState
  );

  const reasoningEnabled = Boolean(reasoningOptions.reasoningPrefs?.enabled);
  const maxTokens = resolveDeepChatMaxOutputTokens(
    getDeepChatRequestBudgetDefaults().maxOutputTokens,
    reasoningEnabled
  );

  const run = (chain: typeof responsesChain) =>
    callLLM(messages, config.provider, config.endpoint, config.apiKey, model, {
      temperature: sessionState.sessionTemperature,
      maxTokens,
      ...(config.serviceTier && { serviceTier: config.serviceTier }),
      ...reasoningOptions,
      ...chain,
      modelsEntry: findConfigModelsEntry(config, model),
      retries: 0,
      ...getRuntimeDeepChatOptions(),
      signal: controller.signal,
      stream: true,
      onResponseId: (responseId: string) => persistDeepChatResponseId(model, responseId),
      onStreamUpdate,
    });

  let finalText: string;
  try {
    finalText = await run(responsesChain);
  } catch (error) {
    if (!isResponsesChainUnsupportedError(error) || responsesChain.apiPath !== 'responses') {
      throw error;
    }
    clearDeepChatResponseChain();
    responsesChain = stripResponsesChainForRetry(responsesChain);
    streamState.streamedText = '';
    finalText = await run(responsesChain);
  }

  if (pendingRequest.abortReason) {
    const container = getMountedRenderContainer();
    if (container) uiHooks.syncPendingStatus(container);
    return pendingRequest.assistantText.trim();
  }

  if (!streamState.streamedText && finalText) {
    appendPendingAssistantText(pendingRequest, finalText);
    await emitPendingAssistantDelta(signals, pendingRequest, sourceChat, finalText);
  }

  syncMountedDeepThinkingChrome();

  const assistantText = (finalText || streamState.streamedText).trim();
  assertDeepChatAssistantText(assistantText, pendingRequest);
  return assistantText;
}

function assertDeepChatAssistantText(
  assistantText: string,
  pendingRequest: PendingDeepChatRequest
): void {
  if (assistantText) return;
  const hadReasoning = Boolean(pendingRequest.reasoningText?.trim());
  const specific =
    describeResponsesEmptyBody(null, { hadStreamedReasoning: hadReasoning }) ||
    (hadReasoning
      ? '模型完成了推理但未返回可见正文（常见原因：max_output_tokens 过小、网关只推 reasoning、或 /responses 返回了非标准正文格式）。请增大输出上限、关闭推理后重试，或在系统设置将路径改为 chat/completions。'
      : '模型没有返回任何内容，请稍后重试或检查模型/上下文配置。');
  throw new ValidationError(specific, 'DEEP_CHAT_001', 'assistantText', assistantText, {
    module: 'deep-chat',
    action: 'resolveAssistantText',
  });
}

/** Map Responses empty payloads (including incomplete) for Deep Chat / diagnostics. */
export function mapDeepChatEmptyResponsesMessage(
  data: Record<string, unknown> | null | undefined,
  options?: { hadStreamedReasoning?: boolean }
): string {
  return (
    describeResponsesEmptyBody(data, options) ||
    '模型没有返回任何内容，请稍后重试或检查模型/上下文配置。'
  );
}

export function syncMountedDeepThinkingChrome(): void {
  const container = getMountedRenderContainer();
  if (container) uiHooks.syncPendingStatus(container);
}

export { findConfigModelsEntry } from '../session/uiHooks';

export { parseReasoningEffortValue } from '../session/uiHooks';
