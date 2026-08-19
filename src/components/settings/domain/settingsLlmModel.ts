// TD-SET-01 Phase 1: LLM pure helpers moved verbatim (sections <= 600 lines).
import {
  DEFAULT_LLM_PROVIDER_ID,
  OBSOLETE_PRESET_MODEL_IDS,
  OLD_PRESET_MODEL_IDS,
  getLlmProviderConfig,
  type ModelFeature,
  type ProviderConfig,
} from '@/common/config/llmProviders';
import { ApiError, isAppError } from '@/common/errors/AppError';
import { formatLlmFailureUx, showLlmFailureToast } from '@/common/errors/llmFailureUx';
import { showToast } from '@/common/ui';
import { dedupeModels } from '@/components/modelSelect/modelSelectService';
import {
  normalizeApiPathId,
  normalizeReasoningUserPrefs,
  type ApiPathId,
  type ResolvedModelCapability,
} from '@/services/modelCapability';
import { StorageService } from '@/services/storageService';
import { LLMProviderConfig } from '@/types/state';

import { getModelId, type ModelMetadata, type ModelOption } from '../domain/localDataCopy';
import {
  CapabilityBadge,
  LlmApiFamilyId,
  LlmApiFamilyOption,
  LLMState,
  ModelFeatureBadge,
  SavedLLMConfig,
  SettingsPanelData,
} from '../panelTypes';

export const LLM_API_FAMILY_OPTIONS: readonly LlmApiFamilyOption[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'gemini', label: 'Gemini' },
] as const;
export function apiPathIdForFamily(family: LlmApiFamilyId): ApiPathId {
  if (family === 'anthropic') return 'anthropic_messages';
  if (family === 'gemini') return 'gemini_generate';
  return 'responses';
}

export function apiFamilyFromPathId(pathId: ApiPathId | unknown): LlmApiFamilyId {
  const id = normalizeApiPathId(pathId);
  if (id === 'anthropic_messages') return 'anthropic';
  if (id === 'gemini_generate') return 'gemini';
  // responses + chat_completions both map to OpenAI family
  return 'openai';
}

function pathIdToBadgeLabel(pathId: ApiPathId): string {
  if (pathId === 'responses') return 'Responses';
  if (pathId === 'anthropic_messages') return 'Messages';
  if (pathId === 'gemini_generate') return 'Gemini';
  return 'Chat';
}

/** Soft path/capability copy under API path select (extracted for complexity). */
export function buildApiPathCapabilityHint(
  pathId: ApiPathId,
  registryCap: ResolvedModelCapability
): string {
  if (!registryCap.source.registryMatched) {
    return pathId === 'responses'
      ? '该模型尚未收录在能力目录：若网关没有 /responses，请求会自动回退到通用对话路径，您不必担心「完全连不上」。'
      : '';
  }
  const preferred = registryCap.apiSurface;
  if (pathId === 'responses' && preferred !== 'responses') {
    return `能力目录更常把此模型配在「${preferred}」。您已改选 Responses：请确认中转站已开通该路径；若 404，系统会回退通用对话。`;
  }
  if (pathId === 'chat_completions' && preferred === 'responses') {
    return '此模型目录默认偏好 Responses（推理摘要通道更完整）。Chat Completions 仍支持官方 tools / vision / structured。';
  }
  if (pathId === 'chat_completions') {
    return '当前为 Chat Completions 全量 Create：文本、流式、tools、vision、JSON 结构化均可用。';
  }
  return '';
}

/** R7 badges for settings model row (effective path + capability flags). */
export function buildModelCapabilityBadges(
  pathId: ApiPathId,
  cap: ResolvedModelCapability
): CapabilityBadge[] {
  return [
    {
      id: 'path',
      label: pathIdToBadgeLabel(pathId),
      active: true,
      title: `当前请求路径：${pathId}`,
    },
    {
      id: 'reasoning',
      label: '推理',
      active: Boolean(cap.supportsReasoning && cap.mapRequest),
      title: cap.supportsReasoning
        ? `支持推理（档位：${cap.reasoningEfforts.join('/') || '—'}）`
        : '当前路径不支持推理字段',
    },
    {
      id: 'structured',
      label: '结构化',
      active: cap.supportsStructuredOutput,
      title: cap.supportsStructuredOutput
        ? '支持 Structured Outputs（response_format / text.format）'
        : '当前路径无结构化输出能力',
    },
    {
      id: 'tools',
      label: 'Tools',
      active: cap.supportsTools,
      title: cap.supportsTools ? '支持 function / tools 请求' : '当前路径不声明 tools',
    },
    {
      id: 'vision',
      label: 'Vision',
      active: cap.supportsVision,
      title: cap.supportsVision ? '支持多模态图片输入' : '当前路径不声明 vision',
    },
    {
      id: 'chain',
      label: '多轮链',
      active: cap.supportsPreviousResponseId,
      title: cap.supportsPreviousResponseId
        ? '支持 previous_response_id 多轮（Deep Chat 可链式）'
        : '当前路径不支持 previous_response_id（网关 fail-closed，默认禁用；多轮改发完整 transcript / tool item 回放）',
    },
    {
      id: 'builtin',
      label: '内置工具',
      active: cap.supportsBuiltInTools,
      title: cap.supportsBuiltInTools
        ? '支持 web_search 等 built-in tools 透传'
        : '当前路径不声明 built-in tools',
    },
  ];
}
const MODEL_FEATURE_LABELS: Record<ModelFeature, string> = {
  chat: '对话',
  vision: '视觉',
  audio: '音频',
  video: '视频',
  function: '函数调用',
  structured: '结构化输出',
  streaming: '流式输出',
  reasoning: '推理',
  code: '代码',
  'long-context': '长上下文',
};
const MODEL_FEATURE_ICONS: Record<ModelFeature, string> = {
  chat: 'fa-comments',
  vision: 'fa-eye',
  audio: 'fa-volume-high',
  video: 'fa-video',
  function: 'fa-plug',
  structured: 'fa-table-cells-large',
  streaming: 'fa-bolt',
  reasoning: 'fa-brain',
  code: 'fa-code',
  'long-context': 'fa-expand-alt',
};

export const LLM_TEST_CONNECTION_MAX_TOKENS = 32;
export function buildAutoSaveLlmConfig(
  llm: LLMState,
  previous: Partial<LLMProviderConfig> | null
): LLMProviderConfig {
  const serviceTier = llm.serviceTier || previous?.serviceTier;
  return {
    provider: llm.provider,
    endpoint: llm.endpoint || previous?.endpoint || '',
    model: llm.model || previous?.model || '',
    models: llm.models?.length ? llm.models : previous?.models,
    ...(serviceTier ? { serviceTier } : {}),
    reasoningPrefs: normalizeReasoningUserPrefs(llm.reasoningPrefs),
    apiPath: normalizeApiPathId(llm.apiPath || previous?.apiPath),
    enabled: true,
    apiKey: '',
  };
}

// 收敛：实现与共享组件 modelSelectService.dedupeModels 完全重复（P2 归一化），
// 此处 re-export 组件实现，保持导出名/签名/行为兼容。
export { dedupeModels };
export function resolveProviderEndpoint(
  provider: string,
  config: ProviderConfig,
  savedEndpoint: string
): string {
  const shouldUseNewApiDefault =
    provider === DEFAULT_LLM_PROVIDER_ID &&
    (!savedEndpoint || savedEndpoint === '/v1' || savedEndpoint === '/v1/');
  return shouldUseNewApiDefault ? config.endpoint : savedEndpoint || config.endpoint || '';
}

export async function loadProviderApiKey(
  provider: string,
  savedConfig: SavedLLMConfig
): Promise<string> {
  try {
    const key = await StorageService.getSecure(`llm_key_${provider}`, '');
    return key || '';
  } catch {
    return savedConfig && 'apiKey' in savedConfig ? savedConfig.apiKey || '' : '';
  }
}
export function getRawProviderModels(
  savedConfig: SavedLLMConfig,
  config: ProviderConfig
): ModelOption[] {
  const savedModels = savedConfig?.models as ModelOption[] | undefined;
  if (!savedModels || savedModels.length === 0) return config.models;

  const savedModelIds = savedModels.map(getModelId);
  const isObsoletePreset =
    savedModelIds.some(id => OBSOLETE_PRESET_MODEL_IDS.has(id)) &&
    savedModelIds.every(id => OLD_PRESET_MODEL_IDS.has(id));
  return isObsoletePreset ? config.models : savedModels;
}

export function getInitialModel(savedModel: string | undefined, models: ModelOption[]): string {
  if (savedModel) return savedModel;
  const first = models[0];
  return first ? getModelId(first) : '';
}

export function findPresetModelInfo(provider: string, modelId: string): ModelMetadata | null {
  const config = getLlmProviderConfig(provider);
  if (!config) return null;
  return config.models.find(model => model.id === modelId) || null;
}

export function mergeModelMetadata(
  model: ModelMetadata | null,
  preset: ModelMetadata | null
): ModelMetadata | null {
  if (!model) return preset;
  if (!preset) return model;
  return {
    ...model,
    context: preset.context || model.context,
    features: preset.features && preset.features.length > 0 ? preset.features : model.features,
  };
}

export function formatModelContext(context: number): string {
  if (!Number.isFinite(context) || context <= 0) return '';
  if (context >= 1000000) {
    return `${Number((context / 1000000).toFixed(2))}M`;
  }
  return `${Number((context / 1000).toFixed(1))}K`;
}

function getFeatureLabel(feature: string): string {
  return MODEL_FEATURE_LABELS[feature as ModelFeature] || feature;
}

function getFeatureIcon(feature: string): string {
  return MODEL_FEATURE_ICONS[feature as ModelFeature] || 'fa-star';
}

export function formatModelFeatures(features: unknown): string {
  if (!Array.isArray(features) || features.length === 0) return '基础';
  return features.map(feature => getFeatureLabel(String(feature))).join('、');
}

export function getModelFeatureBadges(features: unknown): ModelFeatureBadge[] {
  if (!Array.isArray(features) || features.length === 0) {
    return [{ key: 'basic', label: '基础能力', icon: 'fa-message' }];
  }

  return features.map(feature => {
    const key = String(feature);
    return {
      key,
      label: getFeatureLabel(key),
      icon: getFeatureIcon(key),
    };
  });
}

export function validateModelFetchInput(llm: LLMState): string | null {
  if (!llm.endpoint) return '请先输入API端点地址';
  if (isLLMApiKeyRequired(llm) && !llm.apiKey) return '请先输入 API Key';
  return null;
}

export function isLLMApiKeyRequired(llm: LLMState): boolean {
  return Boolean(llm.endpoint);
}

export function assertFetchedModels(models: ModelOption[], provider: string): void {
  if (models.length > 0) return;
  throw new ApiError('未能获取到有效模型列表，请检查API配置和网络连接', 'SETTINGS_001', {
    context: { module: 'SystemSettings', action: 'fetchModels', provider },
  });
}

type PanelWithReasoningClamp = SettingsPanelData & {
  clampReasoningPrefsToActiveModel?: (options?: {
    announce?: boolean;
    persist?: boolean;
  }) => boolean;
};

export function applyFetchedModels(panel: PanelWithReasoningClamp, models: ModelOption[]): void {
  panel.llm.models = dedupeModels(models);

  const currentModelExists = panel.llm.models.some(model => getModelId(model) === panel.llm.model);
  if (currentModelExists) return;

  const firstModel = panel.llm.models[0];
  if (firstModel) {
    panel.llm.model = getModelId(firstModel);
    // Model id changed — re-clamp effort to the new allowlist (AC3 closed loop).
    panel.clampReasoningPrefsToActiveModel?.({ announce: true, persist: true });
  }
}

const MODEL_FETCH_ERROR_RULES: ReadonlyArray<{ test: (message: string) => boolean; text: string }> =
  [
    {
      test: message => message.includes('HTTP 401') || message.includes('Unauthorized'),
      text: 'API Key 无效或已过期，请检查配置',
    },
    {
      test: message => message.includes('HTTP 403') || message.includes('Forbidden'),
      text: 'API Key 没有访问权限，请检查配置',
    },
    {
      test: message => message.includes('HTTP 429') || /rate limit/i.test(message),
      text: '请求过于频繁，请稍后再试',
    },
    {
      test: message => message.includes('HTTP 404'),
      text: 'API端点地址不正确，请检查配置',
    },
    {
      test: message => message.includes('Failed to fetch') || message.includes('NetworkError'),
      text: '网络连接失败，请检查网络或端点地址',
    },
    {
      test: message => message.includes('timeout') || message.includes('AbortError'),
      text: '请求超时，请检查网络连接',
    },
  ];

function getModelFetchErrorMessage(error: Error): string {
  const message = error.message;
  return MODEL_FETCH_ERROR_RULES.find(rule => rule.test(message))?.text ?? message;
}

export function notifyModelFetchFailure(error: Error): void {
  const mapped = getModelFetchErrorMessage(error);
  const signal = `${mapped} ${error.message}`;
  // Prefer unified actionable UX for known auth/rate/timeout; keep prefix for other failures.
  if (/401|Unauthorized|API Key 无效|API_INVALID_KEY/i.test(signal)) {
    const payload = isAppError(error)
      ? error
      : Object.assign(new Error(mapped), { code: 'API_INVALID_KEY' });
    showLlmFailureToast(payload);
    return;
  }
  if (/429|rate limit|过于频繁|API_RATE_LIMIT/i.test(signal)) {
    const payload = isAppError(error)
      ? error
      : Object.assign(new Error(mapped), { code: 'API_RATE_LIMIT' });
    showLlmFailureToast(payload);
    return;
  }
  const ux = formatLlmFailureUx(error);
  if (
    ux.code === 'LLM_TIMEOUT' ||
    ux.code === 'NET_TIMEOUT' ||
    /超时|timeout|AbortError/i.test(signal)
  ) {
    showLlmFailureToast(error, { titlePrefix: '获取模型失败: ' });
    return;
  }
  showToast(`获取模型失败: ${mapped}`, { type: 'error' });
}
