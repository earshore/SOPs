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
import type { ModelInfo } from '@/services/llmTypes';
import { StorageService } from '@/services/storageService';
import {
  getToolTargetDefaultModel,
  setToolTargetDefaultModel,
  type ToolStrategyTargetId,
} from '@/services/toolStrategyService';
import type { LLMProviderConfig } from '@/types/state';
import type { ModelOption, ModelSelectHooks, ModelSelectSource } from './types';

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
 * 选项构建唯一公式：configured + preset 合并，再并入 strategyModel / fallbackModel
 * （若不在列表内，保证选中项可见），最后按 id 去重保序。
 */
export function buildModelOptions(input: {
  configured: ModelOption[] | undefined;
  preset: ModelOption[] | undefined;
  strategyModel: string;
  fallbackModel: string;
}): ModelOption[] {
  const { configured = [], preset = [], strategyModel, fallbackModel } = input;
  const merged: ModelOption[] = [...configured, ...preset];

  const ensureVisible = (modelId: string): void => {
    if (!modelId) return;
    if (merged.some(model => getModelId(model) === modelId)) return;
    merged.push(modelId);
  };
  ensureVisible(strategyModel);
  ensureVisible(fallbackModel);

  return dedupeModels(merged);
}

/** 选中优先级：strategyModel > configModel > models[0]。 */
export function resolveSelectedModel(input: {
  strategyModel: string;
  configModel: string;
  models: ModelOption[];
}): string {
  if (input.strategyModel) return input.strategyModel;
  if (input.configModel) return input.configModel;
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
 * 刷新核心：真正调用 `/models`（fetchModelsFromApi），归一化结果并写回
 * provider config（apiKey 留空串，密钥走 secure 存储）+ 工具策略默认模型。
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

  // 写回 provider config（密钥走 secure 存储，此处仅存空串占位）
  StorageService.setLLMConfig(provider, {
    ...config,
    provider,
    endpoint: config.endpoint,
    apiKey: '',
    model: nextModel,
    models,
    enabled: true,
  });

  if (targetId !== 'llm-global') {
    setToolTargetDefaultModel(targetId as ToolStrategyTargetId, provider, nextModel);
  }

  return { models, nextModel };
}

/**
 * 选中模型持久化：
 * - targetId !== 'llm-global'：立即写工具策略默认模型（'dirty' 模式同样写入，工具目标没有宿主表单兜底）；
 * - persist 'strategy'（默认）：额外写回 provider config.model（'dirty' 时不写，由宿主表单保存）。
 */
export function persistSelectedModel(
  source: ModelSelectSource,
  model: string,
  persist: ModelSelectHooks['persist'] = 'strategy'
): void {
  const { targetId, provider } = source;
  if (!provider || !model) return;

  // 'none'：宿主自行处理会话/页面级持久化，组件不写任何全局存储。
  if (persist === 'none') return;

  if (targetId !== 'llm-global') {
    setToolTargetDefaultModel(targetId as ToolStrategyTargetId, provider, model);
  }

  if (persist !== 'strategy') return;

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
