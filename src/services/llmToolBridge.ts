import { ValidationError } from '@/common/errors/AppError';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { applyToolTargetModel, type ToolStrategyTargetId } from '@/services/toolStrategyService';

import type { LLMOptions } from '@/services/llmService';

export interface ResolvedToolLlmConfig {
  provider: string;
  endpoint: string;
  apiKey: string;
  model: string;
  serviceTier?: LLMOptions['serviceTier'];
}

export interface ToolLlmPublicConfig {
  provider: string;
  endpoint: string;
  model: string;
  serviceTier?: LLMOptions['serviceTier'];
}

function resolveActiveProvider(module: string): string {
  const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
  if (!activeProvider || typeof activeProvider !== 'string') {
    throw new ValidationError(
      '请先在系统设置中选择 LLM 提供商',
      'ERR_LLM_PROVIDER_NOT_SELECTED',
      undefined,
      undefined,
      { module, action: 'resolveToolLlmConfig' }
    );
  }
  return activeProvider;
}

function requireModel(model: string | undefined, provider: string, module: string): string {
  if (!model) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module, action: 'resolveToolLlmConfig', provider }
    );
  }
  return model;
}

export async function resolveToolLlmConfig(
  targetId: ToolStrategyTargetId,
  options?: { module?: string }
): Promise<ResolvedToolLlmConfig> {
  const module = options?.module ?? 'llmToolBridge';
  const activeProvider = resolveActiveProvider(module);
  const config = await StorageService.getLLMConfigWithKey(activeProvider);

  if (!config || !config.apiKey) {
    throw new ValidationError(
      '所选提供商未配置 API Key',
      'ERR_LLM_API_KEY_MISSING',
      undefined,
      undefined,
      { module, action: 'resolveToolLlmConfig', provider: activeProvider }
    );
  }

  const strategyConfig = applyToolTargetModel(targetId, {
    ...config,
    provider: activeProvider,
  });
  const model = requireModel(strategyConfig?.model, activeProvider, module);

  return {
    provider: activeProvider,
    endpoint: strategyConfig?.endpoint || '',
    apiKey: strategyConfig?.apiKey || config.apiKey,
    model,
    serviceTier: strategyConfig?.serviceTier,
  };
}

export function resolveToolLlmPublicConfig(
  targetId: ToolStrategyTargetId,
  options?: { module?: string }
): ToolLlmPublicConfig {
  const module = options?.module ?? 'llmToolBridge';
  const activeProvider = resolveActiveProvider(module);
  const config = StorageService.getLLMConfig(activeProvider);

  if (!config) {
    throw new ValidationError(
      '未选择模型，请在设置中同步或选择模型',
      'ERR_LLM_MODEL_NOT_SELECTED',
      undefined,
      undefined,
      { module, action: 'resolveToolLlmPublicConfig', provider: activeProvider }
    );
  }

  const strategyConfig = applyToolTargetModel(targetId, {
    ...config,
    provider: activeProvider,
  });
  const model = requireModel(strategyConfig?.model, activeProvider, module);

  return {
    provider: activeProvider,
    endpoint: strategyConfig?.endpoint || '',
    model,
    serviceTier: strategyConfig?.serviceTier,
  };
}
