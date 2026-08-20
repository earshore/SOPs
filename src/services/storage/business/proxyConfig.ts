// src/services/storage/business/proxyConfig.ts
// ================================================================
// 🎯 代理配置域（ProxyConfig + 密钥凭据读写与旧键迁移）
// Level 3 B'：从 storageService.ts 拆分出的代理业务方法
// 语义与原始实现保持 1:1
// ================================================================

import {
  DEFAULT_SCRAPER_PROXY_TYPE,
  SCRAPER_PROXY_CREDENTIAL_TYPES,
} from '@/common/config/scraperProxies';
import { handleSystemError } from '@/common/errors';
import { isProxyConfig } from '@/common/guards/typeGuards';
import {
  getProxyCredentialKey,
  getStorageCore,
  isStringMap,
  STORAGE_KEYS,
  stripProxySecret,
} from '../core';
import { getSecure, setSecure, removeSecure } from '../secure';
import type { ProxyConfig } from '@/types/modules-business';

function proxyReportStorageReadError(action: string, key: string, error: Error): void {
  handleSystemError(
    'SYS_STORAGE_ERROR',
    {
      module: 'StorageService',
      action,
      key,
    },
    error,
    {
      log: true,
      notify: false,
    }
  );
}

/**
 * 获取代理配置
 * 🎯 P0-4.1.8: 在数据边界使用类型守卫
 */
export function getProxyConfig(): ProxyConfig {
  const core = getStorageCore();
  const config =
    core.get<ProxyConfig>(STORAGE_KEYS.PROXY_CONFIG, null) ||
    core.get<ProxyConfig>(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, null);

  // 🎯 数据边界验证：已在 get() 方法中验证
  // 如果验证失败，返回默认配置
  if (!config) {
    return { type: DEFAULT_SCRAPER_PROXY_TYPE, enabled: true };
  }

  return stripProxySecret(config);
}

/**
 * 保存代理配置
 * 🎯 P0-4.1.8: 在数据边界使用类型守卫
 */
export function setProxyConfig(config: ProxyConfig): boolean {
  const core = getStorageCore();
  // 🎯 数据边界验证：保存前验证
  if (!isProxyConfig(config)) {
    return false;
  }

  const safeConfig = stripProxySecret(config);
  return (
    core.set(STORAGE_KEYS.PROXY_CONFIG, safeConfig) &&
    core.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, safeConfig)
  );
}

async function readProxyKeyMap(): Promise<Record<string, string>> {
  const keyMap: Record<string, string> = {};

  for (const type of SCRAPER_PROXY_CREDENTIAL_TYPES) {
    const credential = await getSecure<string>(getProxyCredentialKey(type), '');
    if (credential) {
      keyMap[type] = credential;
    }
  }

  const core = getStorageCore();
  const legacyKeyMap = core.get<Record<string, string>>(STORAGE_KEYS.PROXY_KEY_MAP, {});
  if (isStringMap(legacyKeyMap)) {
    for (const [type, credential] of Object.entries(legacyKeyMap)) {
      if (!keyMap[type]) {
        keyMap[type] = credential;
      }
    }
  }

  return keyMap;
}

function getLegacyProxyConfig(): ProxyConfig | null {
  const core = getStorageCore();
  const proxyConfig = core.get<ProxyConfig>(STORAGE_KEYS.PROXY_CONFIG, null);
  const scraperProxyConfig = core.get<ProxyConfig>(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, null);

  if (proxyConfig?.customUrl) {
    return proxyConfig;
  }

  if (scraperProxyConfig?.customUrl) {
    return scraperProxyConfig;
  }

  return proxyConfig || scraperProxyConfig;
}

async function migrateLegacyProxyKeyMap(
  keyMap: Record<string, string>,
  legacyConfig: ProxyConfig | null
): Promise<void> {
  if (legacyConfig?.customUrl) {
    const legacyType = legacyConfig.type || DEFAULT_SCRAPER_PROXY_TYPE;
    if (!keyMap[legacyType]) {
      keyMap[legacyType] = legacyConfig.customUrl;
    }
  }

  const saved = await setProxyKeyMap(keyMap, false);
  if (!saved) {
    return;
  }

  if (legacyConfig?.customUrl && !setProxyConfig(legacyConfig)) {
    return;
  }

  getStorageCore().remove(STORAGE_KEYS.PROXY_KEY_MAP);
}

export async function getProxyKeyMap(): Promise<Record<string, string>> {
  try {
    const keyMap = await readProxyKeyMap();
    const legacyConfig = getLegacyProxyConfig();

    await migrateLegacyProxyKeyMap(keyMap, legacyConfig);
    return keyMap;
  } catch (e) {
    proxyReportStorageReadError('getProxyKeyMap', STORAGE_KEYS.PROXY_KEY_MAP, e as Error);
    return {};
  }
}

export async function setProxyKeyMap(
  keyMap: Record<string, string>,
  removeLegacyKey: boolean = true
): Promise<boolean> {
  try {
    let saved = true;

    for (const [type, credential] of Object.entries(keyMap)) {
      if (!credential) {
        removeSecure(getProxyCredentialKey(type));
        continue;
      }

      saved = (await setSecure(getProxyCredentialKey(type), credential)) && saved;
    }

    if (saved && removeLegacyKey) {
      getStorageCore().remove(STORAGE_KEYS.PROXY_KEY_MAP);
    }
    return saved;
  } catch (e) {
    proxyReportStorageReadError('setProxyKeyMap', STORAGE_KEYS.PROXY_KEY_MAP, e as Error);
    return false;
  }
}

export function hasProxyCredential(type: string): boolean {
  return getStorageCore().has(`secure_${getProxyCredentialKey(type)}`);
}

export async function getProxyConfigWithCredential(): Promise<ProxyConfig> {
  try {
    const config = getProxyConfig();
    const type = config.type || DEFAULT_SCRAPER_PROXY_TYPE;
    const keyMap = await getProxyKeyMap();
    const customUrl = keyMap[type];

    return customUrl ? { ...config, customUrl } : config;
  } catch (e) {
    proxyReportStorageReadError(
      'getProxyConfigWithCredential',
      STORAGE_KEYS.PROXY_CONFIG,
      e as Error
    );
    return { type: DEFAULT_SCRAPER_PROXY_TYPE, enabled: true };
  }
}

export async function setProxyConfigWithCredential(config: ProxyConfig): Promise<boolean> {
  try {
    const type = config.type || DEFAULT_SCRAPER_PROXY_TYPE;
    const savedConfig = setProxyConfig(config);

    if (!config.customUrl) {
      removeSecure(getProxyCredentialKey(type));
      return savedConfig;
    }

    const savedCredential = await setSecure(getProxyCredentialKey(type), config.customUrl);
    return savedConfig && savedCredential;
  } catch (e) {
    proxyReportStorageReadError(
      'setProxyConfigWithCredential',
      STORAGE_KEYS.PROXY_CONFIG,
      e as Error
    );
    return false;
  }
}
