// TD-SET-01 Phase 3: SettingsDomain facade ? single write/read path for strategy partitions.
// UI (sections/shell) must not touch StorageService directly; use these helpers instead.
import { DEFAULT_LLM_PROVIDER_ID } from '@/common/config/llmProviders';
import { scraperProxyNeedsInput } from '@/common/config/scraperProxies';
import {
  getRuntimeStrategySettings,
  saveRuntimeStrategySettings,
  type RuntimeStrategySettings,
} from '@/services/runtimeStrategyService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  getToolStrategySettings,
  saveToolStrategySettings,
  type ToolStrategySettings,
} from '@/services/toolStrategyService';

import {
  diffSettingsPartitions,
  snapshotSettingsPartitions,
  type SettingsDirtyPartition,
  type SettingsDirtySnapshot,
} from './settingsDirty';
import { isRuntimeRawInvalid } from './settingsHealth';

import type { ProxyConfig } from '@/types/modules-business';
import type { LLMProviderConfig } from '@/types/state';

export type SettingsDomainPartition = 'llm' | 'toolStrategy' | 'runtime' | 'proxy';

export interface SettingsDomainLlmWrite {
  provider: string;
  config: LLMProviderConfig;
  /** undefined = secure key untouched; '' = remove; non-empty = write */
  apiKey?: string;
}

export interface SettingsDomainProxyWrite {
  type: ProxyConfig['type'];
  customUrl: string;
  keyMap: Record<string, string>;
}

export type SettingsDomainWrite =
  | SettingsDomainLlmWrite
  | { settings: ToolStrategySettings }
  | { settings: RuntimeStrategySettings }
  | SettingsDomainProxyWrite;

export interface SettingsDomainState {
  llm: { provider: string; config: Partial<LLMProviderConfig> | null };
  toolStrategy: ToolStrategySettings;
  runtimeStrategy: RuntimeStrategySettings;
  proxy: ProxyConfig;
}

export interface SettingsDomainValidation {
  valid: boolean;
  errors: string[];
}

/** Read all strategy partitions from storage (authoritative state). */
export function loadSettingsDomainState(): SettingsDomainState {
  const provider = StorageService.get<string>(
    STORAGE_KEYS.LLM_ACTIVE_PROVIDER,
    DEFAULT_LLM_PROVIDER_ID
  );
  return {
    llm: {
      provider: provider ?? DEFAULT_LLM_PROVIDER_ID,
      config: StorageService.getLLMConfig(provider),
    },
    toolStrategy: getToolStrategySettings(),
    runtimeStrategy: getRuntimeStrategySettings(),
    proxy: StorageService.getProxyConfig() ?? { type: 'scraperapi' },
  };
}

/** Write one strategy partition through its canonical storage path. */
export async function saveSettingsDomainPartition(
  partition: SettingsDomainPartition,
  write: SettingsDomainWrite
): Promise<void> {
  if (partition === 'llm') {
    const llm = write as SettingsDomainLlmWrite;
    if (llm.apiKey !== undefined) {
      if (llm.apiKey) {
        await StorageService.setSecure(`llm_key_${llm.provider}`, llm.apiKey);
      } else {
        StorageService.removeSecure(`llm_key_${llm.provider}`);
      }
    }
    StorageService.setLLMConfig(llm.provider, llm.config);
    return;
  }
  if (partition === 'toolStrategy') {
    saveToolStrategySettings((write as { settings: ToolStrategySettings }).settings);
    return;
  }
  if (partition === 'runtime') {
    saveRuntimeStrategySettings((write as { settings: RuntimeStrategySettings }).settings);
    return;
  }
  const proxy = write as SettingsDomainProxyWrite;
  await StorageService.setProxyKeyMap(proxy.keyMap);
  await StorageService.setProxyConfigWithCredential({
    type: proxy.type,
    customUrl: proxy.customUrl,
  });
}

/** Which partitions differ between two snapshots. */
export function diffSettingsDomain(
  baseline: SettingsDirtySnapshot,
  current: SettingsDirtySnapshot
): SettingsDirtyPartition[] {
  return diffSettingsPartitions(baseline, current);
}

/** Stable snapshot of one partition set (dirty detection input). */
export function snapshotSettingsDomain(input: {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
}): SettingsDirtySnapshot {
  return snapshotSettingsPartitions(input);
}

function validateLlmWrite(write: SettingsDomainLlmWrite): string[] {
  const errors: string[] = [];
  if (!write.config.endpoint?.trim()) errors.push('????API????');
  if (!write.config.model?.trim()) errors.push('????????');
  return errors;
}

function validateProxyWrite(write: SettingsDomainProxyWrite): string[] {
  const errors: string[] = [];
  if (write.type && scraperProxyNeedsInput(write.type) && !write.customUrl.trim()) {
    errors.push('???? API Key ?????');
  }
  return errors;
}

function validateRuntimeWrite(write: { settings: RuntimeStrategySettings }): string[] {
  const errors: string[] = [];
  if (isRuntimeRawInvalid(write.settings)) errors.push('?????????');
  return errors;
}

function validateToolStrategyWrite(write: { settings: ToolStrategySettings }): string[] {
  const errors: string[] = [];
  if (!write.settings || typeof write.settings !== 'object') errors.push('????????');
  return errors;
}

export function validateSettingsDomainPartition(
  partition: SettingsDomainPartition,
  write: SettingsDomainWrite
): SettingsDomainValidation {
  if (partition === 'llm') {
    const errors = validateLlmWrite(write as SettingsDomainLlmWrite);
    return { valid: errors.length === 0, errors };
  }
  if (partition === 'proxy') {
    const errors = validateProxyWrite(write as SettingsDomainProxyWrite);
    return { valid: errors.length === 0, errors };
  }
  if (partition === 'runtime') {
    const errors = validateRuntimeWrite(write as { settings: RuntimeStrategySettings });
    return { valid: errors.length === 0, errors };
  }
  const errors = validateToolStrategyWrite(write as { settings: ToolStrategySettings });
  return { valid: errors.length === 0, errors };
}
