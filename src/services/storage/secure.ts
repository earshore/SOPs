// src/services/storage/secure.ts
// ================================================================
// 🎯 加密存储适配层（委托 @/common/utils/secureStorage）
// Level 3 B'：从 storageService.ts 拆分出的安全存储方法
// 语义与原始实现保持 1:1
// ================================================================

import { handleSystemError } from '@/common/errors';

import { StorageService } from './core';

function secureReportStorageReadError(action: string, key: string, error: Error): void {
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
 * 安全存储敏感数据
 */
export async function setSecure(key: string, value: unknown): Promise<boolean> {
  try {
    const { SecureStorage } = await import('@/common/utils/secureStorage');
    return await SecureStorage.setSecure(key, value);
  } catch (e) {
    secureReportStorageReadError('setSecure', key, e as Error);
    return false;
  }
}

/**
 * 读取安全存储的数据
 */
export async function getSecure<T = unknown>(
  key: string,
  defaultValue: T | null = null
): Promise<T | null> {
  try {
    const { SecureStorage } = await import('@/common/utils/secureStorage');
    return await SecureStorage.getSecure(key, defaultValue);
  } catch (e) {
    secureReportStorageReadError('getSecure', key, e as Error);
    return defaultValue;
  }
}

/**
 * 删除安全存储的数据
 */
export function removeSecure(key: string): void {
  StorageService.remove(`secure_${key}`);
}
