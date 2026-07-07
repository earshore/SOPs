import type { LLMProviderConfig } from '../types/state';
import { StorageService, STORAGE_KEYS } from './storageService';

export const TOOL_STRATEGY_TARGETS = [
  {
    id: 'master-analysis-ai-analysis',
    label: 'Master Analysis - AI智能分析',
    description: '用于 Master Analysis 的 AI智能分析报告生成。',
    modelHint: '报告质量',
  },
  {
    id: 'playground-deep-chat',
    label: 'Playground - Deep Chat',
    description: '用于 Deep Chat 的交互式对话与 Prompt 试验。',
    modelHint: '响应速度',
  },
  {
    id: 'keyword-hunter-seo-process',
    label: 'Keyword Hunter - SEO 处理',
    description: '用于 SEO 处理页的 AI 逐行翻译。',
    modelHint: '批量翻译',
  },
  {
    id: 'keyword-hunter-listing-review',
    label: 'Keyword Hunter - Listing 评审',
    description: '用于 Listing 评审页的 AI 评审报告。',
    modelHint: '审查质量',
  },
  {
    id: 'ppc-tools-ppc-search-terms',
    label: 'PPC Tools - PPC 搜索词分析器',
    description: '用于 PPC 搜索词分析器的语义模型复核。',
    modelHint: '稳定复核',
  },
] as const;

const LEGACY_TARGET_ALIASES = {
  'ai-analysis': 'master-analysis-ai-analysis',
  'deep-chat': 'playground-deep-chat',
  'keyword-hunter': 'keyword-hunter-seo-process',
  'ppc-search-terms': 'ppc-tools-ppc-search-terms',
} as const;

const LEGACY_TARGET_FANOUT: Record<string, ToolStrategyTargetId[]> = {
  'keyword-hunter': ['keyword-hunter-seo-process', 'keyword-hunter-listing-review'],
};

export type ToolStrategyTargetId = (typeof TOOL_STRATEGY_TARGETS)[number]['id'];
export type ToolStrategyModuleId = ToolStrategyTargetId;

export interface ToolStrategyTargetSettings {
  defaultModelsByProvider: Record<string, string>;
}

export interface ToolStrategySettings {
  version: 2;
  targets: Record<ToolStrategyTargetId, ToolStrategyTargetSettings>;
}

type ModelOption = NonNullable<LLMProviderConfig['models']>[number];

const TOOL_STRATEGY_VERSION = 2;

function createDefaultToolStrategySettings(): ToolStrategySettings {
  const targets = TOOL_STRATEGY_TARGETS.reduce(
    (acc, target) => {
      acc[target.id] = { defaultModelsByProvider: {} };
      return acc;
    },
    {} as Record<ToolStrategyTargetId, ToolStrategyTargetSettings>
  );

  return {
    version: TOOL_STRATEGY_VERSION,
    targets,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeProviderModels(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce(
    (acc, [provider, model]) => {
      if (typeof model === 'string') {
        acc[provider] = model;
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

function normalizeTargetSettings(value: unknown): ToolStrategyTargetSettings {
  return {
    defaultModelsByProvider: normalizeProviderModels(
      isRecord(value) ? value.defaultModelsByProvider : undefined
    ),
  };
}

function copyTargetSettings(
  settings: ToolStrategySettings,
  targetId: ToolStrategyTargetId,
  value: unknown
): void {
  settings.targets[targetId] = normalizeTargetSettings(value);
}

function getCanonicalTargetId(targetId: string): ToolStrategyTargetId | null {
  if (TOOL_STRATEGY_TARGETS.some(target => target.id === targetId)) {
    return targetId as ToolStrategyTargetId;
  }

  return LEGACY_TARGET_ALIASES[targetId as keyof typeof LEGACY_TARGET_ALIASES] || null;
}

function migrateLegacyModules(
  settings: ToolStrategySettings,
  rawModules: Record<string, unknown>
): void {
  Object.entries(rawModules).forEach(([moduleId, rawModule]) => {
    const fanoutTargets = LEGACY_TARGET_FANOUT[moduleId];
    if (fanoutTargets) {
      fanoutTargets.forEach(targetId => copyTargetSettings(settings, targetId, rawModule));
      return;
    }

    const targetId = getCanonicalTargetId(moduleId);
    if (targetId) {
      copyTargetSettings(settings, targetId, rawModule);
    }
  });
}

function normalizeToolStrategySettings(value: unknown): ToolStrategySettings {
  const defaults = createDefaultToolStrategySettings();
  if (!isRecord(value)) return defaults;

  const rawTargets = isRecord(value.targets) ? value.targets : {};
  TOOL_STRATEGY_TARGETS.forEach(target => {
    const rawTarget = rawTargets[target.id];
    if (isRecord(rawTarget)) {
      copyTargetSettings(defaults, target.id, rawTarget);
    }
  });

  const rawModules = isRecord(value.modules) ? value.modules : {};
  migrateLegacyModules(defaults, rawModules);

  return defaults;
}

function getModelId(model: ModelOption): string {
  return typeof model === 'string' ? model : model.id;
}

function hasModel(models: LLMProviderConfig['models'] | undefined, model: string): boolean {
  if (!model) return false;
  if (!models || models.length === 0) return true;
  return models.some(item => getModelId(item) === model);
}

function getFirstModel(models: LLMProviderConfig['models'] | undefined): string {
  const first = models?.[0];
  return first ? getModelId(first) : '';
}

export function getToolStrategySettings(): ToolStrategySettings {
  return normalizeToolStrategySettings(StorageService.get(STORAGE_KEYS.TOOL_STRATEGY_SETTINGS));
}

export function saveToolStrategySettings(settings: ToolStrategySettings): void {
  StorageService.set(STORAGE_KEYS.TOOL_STRATEGY_SETTINGS, normalizeToolStrategySettings(settings));
}

export function getToolTargetDefaultModel(
  targetId: ToolStrategyTargetId,
  provider: string | undefined
): string {
  if (!provider) return '';
  return getToolStrategySettings().targets[targetId]?.defaultModelsByProvider[provider] || '';
}

export function setToolTargetDefaultModel(
  targetId: ToolStrategyTargetId,
  provider: string,
  model: string
): void {
  const settings = getToolStrategySettings();
  const targetSettings = settings.targets[targetId] || { defaultModelsByProvider: {} };

  if (model) {
    targetSettings.defaultModelsByProvider[provider] = model;
  } else {
    delete targetSettings.defaultModelsByProvider[provider];
  }

  settings.targets[targetId] = targetSettings;
  saveToolStrategySettings(settings);
}

export function resolveToolTargetModel(
  targetId: ToolStrategyTargetId,
  config: Partial<LLMProviderConfig> | null
): string {
  if (!config) return '';

  const provider =
    config.provider ||
    (StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null) ||
    '';
  const targetModel = getToolTargetDefaultModel(targetId, provider);

  if (hasModel(config.models, targetModel)) return targetModel;
  if (config.model) return config.model;
  return getFirstModel(config.models);
}

export function applyToolTargetModel<T extends Partial<LLMProviderConfig>>(
  targetId: ToolStrategyTargetId,
  config: T | null
): T | null {
  if (!config) return null;

  const model = resolveToolTargetModel(targetId, config);
  return {
    ...config,
    model,
  };
}

export const TOOL_STRATEGY_MODULES = TOOL_STRATEGY_TARGETS;
export const getToolModuleDefaultModel = getToolTargetDefaultModel;
export const setToolModuleDefaultModel = setToolTargetDefaultModel;
export const resolveToolModuleModel = resolveToolTargetModel;
export const applyToolModuleModel = applyToolTargetModel;
