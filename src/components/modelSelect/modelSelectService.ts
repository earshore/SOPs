// src/components/modelSelect/modelSelectService.ts
// ================================================================
// ModelSelect 数据层：选项构建 + 模型列表刷新 + 持久化。
// 本文件是组件内唯一允许 import 服务（llmModelList / toolStrategyService /
// storageService / llmFailureUx）的文件。
// ================================================================

import { getLlmProviderConfig } from '@/common/config/llmProviders';
import { ValidationError } from '@/common/errors/AppError';
import { getModelId } from '@/common/utils/modelOptions';
import { fetchModelsFromApi } from '@/services/llmModelList';
import { StorageService } from '@/services/storageService';
import {
  getToolTargetDefaultModel,
  setToolTargetDefaultModel,
  type ToolStrategyTargetId,
} from '@/services/toolStrategyService';

import type { ModelOption, ModelSelectHooks, ModelSelectSource } from './types';
import type { ModelInfo } from '@/services/llmTypes';
import type { LLMProviderConfig } from '@/types/state';

// ========================
// 模型选项助手（纯函数）
// ========================

export { getModelId } from '@/common/utils/modelOptions';

export function getModelLabel(model: ModelOption): string {
  if (typeof model === 'string') return model;
  return model.name || model.id;
}

/** 按 id 去重并保持首次出现顺序。 */
export function dedupeModels(models: ModelOption[]): ModelOption[] {
  const seen = new Set<string>();
  return models.filter(model => {
    const id = getModelId(model);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * 选项构建唯一公式：configured + preset 合并并按 id 去重保序。
 * 失效的策略/系统模型不回插为可选项，交由统一回退选择器处理。
 */
export function buildModelOptions(input: {
  configured: ModelOption[] | undefined;
  preset: ModelOption[] | undefined;
  strategyModel: string;
  fallbackModel: string;
}): ModelOption[] {
  const { configured = [], preset = [] } = input;
  const merged: ModelOption[] = [...configured, ...preset];

  return dedupeModels(merged);
}

/** 选中优先级：有效 strategyModel > 有效 configModel > models[0]。 */
export function resolveSelectedModel(input: {
  strategyModel: string;
  configModel: string;
  models: ModelOption[];
}): string {
  if (input.models.some(model => getModelId(model) === input.strategyModel)) {
    return input.strategyModel;
  }
  if (input.models.some(model => getModelId(model) === input.configModel)) {
    return input.configModel;
  }
  const first = input.models[0];
  return first ? getModelId(first) : '';
}

// ========================
// 数据加载 / 刷新 / 持久化
// ========================

export interface ModelSourceData {
  config: LLMProviderConfig | null;
  preset: ModelOption[];
  strategyModel: string;
}

/**
 * 读取 provider 的本地数据：已存配置（含 key）、预设模型、工具策略默认模型。
 * @param targetId 用于查工具策略默认模型；'llm-global' 时 strategyModel 返回 ''。
 */
export async function loadModelSourceData(
  provider: string,
  targetId: string
): Promise<ModelSourceData> {
  const config = await StorageService.getLLMConfigWithKey(provider);
  const preset = getLlmProviderConfig(provider)?.models ?? [];
  const strategyModel =
    targetId === 'llm-global'
      ? ''
      : getToolTargetDefaultModel(targetId as ToolStrategyTargetId, provider);
  return { config, preset, strategyModel };
}

/**
 * nextModel 计算：原 strategyModel（仍在新列表中）> config.model（仍在列表中）> 列表第一个。
 */
function pickNextModel(models: ModelOption[], strategyModel: string, configModel: string): string {
  if (strategyModel && models.some(model => getModelId(model) === strategyModel)) {
    return strategyModel;
  }
  if (configModel && models.some(model => getModelId(model) === configModel)) {
    return configModel;
  }
  const first = models[0];
  return first ? getModelId(first) : '';
}

/**
 * 刷新核心：真正调用 `/models`（fetchModelsFromApi），归一化结果并仅写回
 * provider catalog。刷新不得改写系统 fallback、active provider 或工具目标默认模型。
 */
export async function refreshModelCatalog(
  source: ModelSelectSource
): Promise<{ models: ModelOption[]; nextModel: string }> {
  const { targetId, provider } = source;

  if (!provider) {
    throw new ValidationError('请先在系统设置中选择 LLM 提供商', 'ERR_LLM_PROVIDER_NOT_SELECTED');
  }

  const config = await StorageService.getLLMConfigWithKey(provider);
  if (!config || !config.endpoint) {
    throw new ValidationError('请先在设置中配置 API 端点', 'BIZ_NO_MODEL_CONFIGURED');
  }
  if (!config.apiKey) {
    throw new ValidationError('所选提供商未配置 API Key', 'ERR_LLM_API_KEY_MISSING');
  }

  const fetched: ModelInfo[] = await fetchModelsFromApi(provider, config.endpoint, config.apiKey);
  const models: ModelOption[] = fetched.map(model => ({
    id: model.id,
    context: model.context,
    features: model.features,
  }));

  const strategyModel =
    targetId === 'llm-global'
      ? ''
      : getToolTargetDefaultModel(targetId as ToolStrategyTargetId, provider);
  const nextModel = pickNextModel(models, strategyModel, config.model);

  // 写回 provider catalog（密钥走 secure 存储，此处仅存空串占位）。
  // 保留原系统 fallback，避免应用刷新越权切换全局 provider/model。
  StorageService.setLLMModelCatalog(provider, {
    ...config,
    provider,
    endpoint: config.endpoint,
    apiKey: '',
    models,
    enabled: true,
  });

  return { models, nextModel };
}

/**
 * 选中模型持久化：
 * - persist 'app'：仅写当前工具策略目标；
 * - persist 'system'：仅写 provider config.model；
 * - persist 'none'（默认）：不写任何存储。
 */
export function persistSelectedModel(
  source: ModelSelectSource,
  model: string,
  persist: ModelSelectHooks['persist'] = 'none'
): void {
  const { targetId, provider } = source;
  if (!provider || !model) return;

  // 'none'：宿主自行处理会话/页面级持久化，组件不写任何全局存储。
  if (persist === 'none') return;

  if (persist === 'app' && targetId !== 'llm-global') {
    setToolTargetDefaultModel(targetId as ToolStrategyTargetId, provider, model);
  }

  if (persist !== 'system') return;

  const config = StorageService.getLLMConfig(provider);
  if (!config) return;
  StorageService.setLLMConfig(provider, {
    provider,
    endpoint: config.endpoint || '',
    apiKey: '',
    model,
    models: config.models,
    enabled: config.enabled ?? true,
  });
}
