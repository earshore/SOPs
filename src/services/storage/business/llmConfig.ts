// src/services/storage/business/llmConfig.ts
// ================================================================
// 🎯 LLM 配置域（LLMProviderConfig 读写 + 旧明文密钥迁移）
// Level 3 B'：从 storageService.ts 拆分出的 LLM 业务方法
// 语义与原始实现保持 1:1
// ================================================================

import { handleSystemError } from '@/common/errors';
import { isLLMProviderConfig } from '@/common/guards/typeGuards';

import {
  getLLMCredentialKey,
  parseLegacyPlainSecret,
  STORAGE_KEYS,
  StorageService,
  getStorageCore,
  stripLLMSecret,
} from '../core';
import { getSecure, setSecure } from '../secure';

import type { LLMProviderConfig } from '@/types/state';

/**
 * 获取 LLM 配置（包含加密的API密钥）
 * 🎯 P0-4.1.8: 在数据边界使用类型守卫
 */
export async function getLLMConfigWithKey(
  provider: string | null = null
): Promise<LLMProviderConfig | null> {
  const core = getStorageCore();
  const activeProvider = provider || core.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
  if (!activeProvider) return null;

  const config = getLLMConfig(activeProvider);
  if (!config) return null;

  try {
    const endpoint = config.endpoint || '';
    const storedApiKey =
      (await getSecure<string>(getLLMCredentialKey(activeProvider), '')) ||
      (await migrateLegacyPlainLLMKey(activeProvider));
    const apiKey = storedApiKey;
    const fullConfig = { ...config, endpoint, apiKey } as LLMProviderConfig;

    // 🎯 数据边界验证：验证完整配置
    if (!isLLMProviderConfig(fullConfig)) {
      return null;
    }

    return fullConfig;
  } catch (error) {
    handleSystemError(
      'SYS_STORAGE_ERROR',
      {
        module: 'StorageService',
        action: 'getLLMConfigWithKey',
        key: getLLMCredentialKey(activeProvider),
      },
      error as Error,
      {
        log: true,
        notify: false,
      }
    );
    return {
      ...config,
      endpoint: config.endpoint || '',
      apiKey: '',
    } as LLMProviderConfig;
  }
}

/**
 * 获取 LLM 配置
 * 🎯 P0-4.1.8: 在数据边界使用类型守卫
 */
export function getLLMConfig(provider: string | null = null): Partial<LLMProviderConfig> | null {
  const core = getStorageCore();
  const activeProvider = provider || core.get<string>(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
  if (!activeProvider) return null;

  const config = core.get<LLMProviderConfig>(
    `${STORAGE_KEYS.LLM_CONFIG_PREFIX}${activeProvider}`,
    {} as LLMProviderConfig
  );

  // 🎯 数据边界验证：已在 get() 方法中验证
  if (!config) return null;

  // 🔐 安全: 移除敏感的 apiKey,返回部分配置
  if (config && 'apiKey' in config) {
    const { apiKey: _apiKey, ...safeConfig } = config;
    return safeConfig;
  }

  return config;
}

/**
 * 保存 LLM 配置
 */
export function setLLMConfig(provider: string, config: LLMProviderConfig): void {
  const core = getStorageCore();
  core.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, stripLLMSecret(config));
  core.set(STORAGE_KEYS.LLM_ACTIVE_PROVIDER, provider);
}

/** Updates a provider catalog without changing the active system provider. */
export function setLLMModelCatalog(provider: string, config: LLMProviderConfig): void {
  const core = getStorageCore();
  core.set(`${STORAGE_KEYS.LLM_CONFIG_PREFIX}${provider}`, stripLLMSecret(config));
}

async function migrateLegacyPlainLLMKey(provider: string): Promise<string> {
  const legacyKey = getLLMCredentialKey(provider);
  const raw = localStorage.getItem(legacyKey);
  if (raw === null) {
    return '';
  }

  const apiKey = parseLegacyPlainSecret(raw);
  if (apiKey && (await setSecure(legacyKey, apiKey))) {
    localStorage.removeItem(legacyKey);
    StorageService.remove(`_lru_access_${legacyKey}`);
  }
  return apiKey;
}
