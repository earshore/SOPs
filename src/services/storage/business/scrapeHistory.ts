// src/services/storage/business/scrapeHistory.ts
// ================================================================
// 🎯 采集历史域（localStorage 同步键 + IndexedDB 双写）
// Level 3 B'：从 storageService.ts 拆分出的采集历史业务方法
// 语义与原始实现保持 1:1
// ================================================================

import { LocalDataStore } from '../../localDataStore';
import { getRuntimeStorageStrategyOptions, getStorageCore, STORAGE_KEYS } from '../core';

import type { HistoryItem } from '@/types/modules-business';

/**
 * 获取采集历史
 */
export function getScrapeHistory(): HistoryItem[] {
  return getStorageCore().get<HistoryItem[]>(STORAGE_KEYS.SCRAPE_HISTORY, []) || [];
}

/**
 * 保存采集历史（localStorage 同步键）
 */
export function setScrapeHistory(history: HistoryItem[]): boolean {
  const maxItems = getRuntimeStorageStrategyOptions().historyMaxItems;
  const trimmed = history.slice(0, maxItems);
  const saved = getStorageCore().set(STORAGE_KEYS.SCRAPE_HISTORY, trimmed);
  if (saved) {
    // 镜像到 IndexedDB：同步/异步两条读路径保持同源（失败静默，异步读仍可回退 localStorage）
    LocalDataStore.set(`user:${STORAGE_KEYS.SCRAPE_HISTORY}`, trimmed, 'user-data').catch(
      () => undefined
    );
  }
  return saved;
}

/**
 * 获取采集历史（IndexedDB，大对象层）
 * 兼容迁移旧 localStorage 数据，迁移后会保留旧键作为安全备份。
 */
export async function getScrapeHistoryAsync(): Promise<HistoryItem[]> {
  try {
    const indexedKey = `user:${STORAGE_KEYS.SCRAPE_HISTORY}`;
    const migrated = await LocalDataStore.migrateLocalStorageKey<HistoryItem[]>(
      STORAGE_KEYS.SCRAPE_HISTORY,
      indexedKey,
      'user-data'
    );

    if (migrated) {
      return migrated;
    }

    return (await LocalDataStore.get<HistoryItem[]>(indexedKey, [])) || [];
  } catch (e) {
    // 与源实现一致：降级为同步 localStorage 读路径
    return getScrapeHistory();
  }
}

/**
 * 保存采集历史（IndexedDB，大对象层）
 */
export async function setScrapeHistoryAsync(history: HistoryItem[]): Promise<boolean> {
  const maxItems = getRuntimeStorageStrategyOptions().historyMaxItems;
  const trimmed = history.slice(0, maxItems);

  try {
    const saved = await LocalDataStore.set(
      `user:${STORAGE_KEYS.SCRAPE_HISTORY}`,
      trimmed,
      'user-data'
    );
    if (saved) {
      // IDB 为权威：成功后同步镜像 localStorage，让同步读路径（getScrapeHistory / getById 等）见到最新值
      getStorageCore().set(STORAGE_KEYS.SCRAPE_HISTORY, trimmed);
    }
    return saved;
  } catch (e) {
    // 与源实现一致：降级为同步写路径
    return setScrapeHistory(trimmed);
  }
}

export async function removeScrapeHistoryAsync(): Promise<void> {
  try {
    await LocalDataStore.remove(`user:${STORAGE_KEYS.SCRAPE_HISTORY}`);
  } catch {
    // 静默失败（与源实现一致）
  }

  getStorageCore().remove(STORAGE_KEYS.SCRAPE_HISTORY);
  // 同步清理迁移标记，避免下次 migrate 时误读其状态
  getStorageCore().remove(`${STORAGE_KEYS.SCRAPE_HISTORY}_migrated_to_indexeddb`);
}
