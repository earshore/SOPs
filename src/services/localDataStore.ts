const nativeLoggerConsole = globalThis.console;
// src/services/localDataStore.ts
// ================================================================
// LocalDataStore
// IndexedDB-backed storage for user data and large cache payloads.
// localStorage remains the small synchronous config/secret layer.
// ================================================================

import { SystemError, ValidationError } from '@/common/errors/AppError';

export type StorageClass = 'config' | 'secret' | 'user-data' | 'cache';
export type LocalDataBucketId =
  | 'config'
  | 'secrets'
  | 'workspace-state'
  | 'scrape-history'
  | 'chat-history'
  | 'keyword-history'
  | 'cache'
  | 'other';

export interface LocalDataRecord<T = unknown> {
  key: string;
  value: T;
  storageClass: StorageClass;
  updatedAt: number;
}

export interface LocalDataExport {
  version: 1;
  /** Explicit export schema version (mirrors `version` for new payloads). */
  schemaVersion: 1;
  /** Present only for partial (bucketed) exports. */
  buckets?: LocalDataBucketId[];
  exportedAt: string;
  localStorage: Record<string, string>;
  indexedDB: Array<LocalDataRecord>;
  metadata: {
    app: 'sops';
    storageVersion: string;
  };
}

export interface LocalDataExportOptions {
  /** When set and non-empty, export only these buckets and record them on the payload. */
  buckets?: LocalDataBucketId[];
}

export interface LocalDataImportOptions {
  mode?: 'merge' | 'replace';
}

export interface LocalDataExportSummary {
  exportedAt: string;
  storageVersion: string;
  localStorageKeys: number;
  indexedDbRecords: number;
  estimatedBytes: number;
  includesSecrets: boolean;
}

export interface LocalDataUsage {
  localStorage: {
    used: number;
    keys: number;
  };
  indexedDB: {
    used: number;
    keys: number;
  };
  total: number;
  buckets: LocalDataBucketUsage[];
}

export interface LocalDataBucketUsage {
  id: LocalDataBucketId;
  localStorage: {
    used: number;
    keys: number;
  };
  indexedDB: {
    used: number;
    keys: number;
  };
  total: number;
  lastUpdatedAt: number | null;
}

const DB_NAME = 'SopsLocalData';
const STORE_NAME = 'records';
const DB_VERSION = 1;
const STORAGE_VERSION = 'local-data-v1';

const CACHE_PREFIXES = ['cache:', 'view_cache_', 'http-cache:', 'ai_analysis_'];
const LOCAL_DATA_BUCKET_IDS: LocalDataBucketId[] = [
  'config',
  'secrets',
  'workspace-state',
  'scrape-history',
  'chat-history',
  'keyword-history',
  'cache',
  'other',
];
const CONFIG_KEYS = new Set([
  'llm_active_provider',
  'tool_strategy_settings',
  'runtime_strategy_settings',
  'ai_analysis_performance_settings',
  'app_theme',
  'app-theme',
  'app_color_mode',
  'app-color-mode',
  'app:animation-settings',
  'performance_metrics',
  'debug_events',
  'developer_diagnostic_settings',
  'enable_legacy_warnings',
]);
const CONFIG_PREFIXES = ['llm_', 'feature_', 'layout_config_', 'modal_ignore_', 'ignore_', 'ppc_'];
const CONFIG_SUFFIXES = ['_owner_v1'];
const LEGACY_LLM_SECRET_PREFIX = 'llm_key_';
const SECRET_KEYS = new Set(['proxy_config', 'proxy_key_map', 'scraper_proxy_config']);
const WORKSPACE_STATE_KEYS = new Set(['app-storage']);
const SCRAPE_HISTORY_KEYS = new Set([
  'scrape_history',
  'user:scrape_history',
  'scrape_history_migrated_to_indexeddb',
  'amzf_search_history',
]);
const CHAT_HISTORY_KEYS = new Set([
  'playground_deep_chat_threads_v1',
  'user:playground_deep_chat_threads_v1',
  'playground_deep_chat_threads_v1_migrated_to_indexeddb',
]);
const KEYWORD_HISTORY_KEYS = new Set([
  'keyword_hunter_snapshots',
  'user:keyword_hunter_snapshots',
  'keyword_hunter_snapshots_migrated_to_indexeddb',
]);

function isCacheKey(key: string): boolean {
  return CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
}

function isLruAccessKey(key: string): boolean {
  return key.startsWith('_lru_access_');
}

function getLruTargetKey(key: string): string | null {
  return isLruAccessKey(key) ? key.slice('_lru_access_'.length) || null : null;
}

function isCacheBucketKey(key: string, storageClass?: StorageClass): boolean {
  return storageClass === 'cache' || isCacheKey(key);
}

function isSecretBucketKey(key: string, storageClass?: StorageClass): boolean {
  return (
    storageClass === 'secret' ||
    key.startsWith('secure_') ||
    key.startsWith(LEGACY_LLM_SECRET_PREFIX) ||
    SECRET_KEYS.has(key)
  );
}

function isConfigBucketKey(key: string, storageClass?: StorageClass): boolean {
  return (
    storageClass === 'config' ||
    CONFIG_KEYS.has(key) ||
    CONFIG_PREFIXES.some(prefix => key.startsWith(prefix)) ||
    CONFIG_SUFFIXES.some(suffix => key.endsWith(suffix))
  );
}

function isWorkspaceStateBucketKey(key: string): boolean {
  return WORKSPACE_STATE_KEYS.has(key);
}

function classifyKey(key: string, storageClass?: StorageClass): LocalDataBucketId {
  const lruTargetKey = getLruTargetKey(key);
  if (lruTargetKey) return classifyKey(lruTargetKey, storageClass);
  if (isCacheBucketKey(key, storageClass)) return 'cache';
  if (isSecretBucketKey(key, storageClass)) return 'secrets';
  if (isWorkspaceStateBucketKey(key)) return 'workspace-state';
  if (SCRAPE_HISTORY_KEYS.has(key)) return 'scrape-history';
  if (CHAT_HISTORY_KEYS.has(key)) return 'chat-history';
  if (KEYWORD_HISTORY_KEYS.has(key)) return 'keyword-history';
  if (isConfigBucketKey(key, storageClass)) return 'config';
  return 'other';
}

function classifyLocalStorageKey(key: string): LocalDataBucketId | null {
  const lruTargetKey = getLruTargetKey(key);
  if (lruTargetKey) return classifyLocalStorageKey(lruTargetKey);

  const bucketId = classifyKey(key);
  if (bucketId !== 'other') return bucketId;

  return key.startsWith('user:') || key.startsWith('sops:') || key.startsWith('sops_')
    ? 'other'
    : null;
}

export function isSopsManagedLocalStorageKey(key: string): boolean {
  if (classifyLocalStorageKey(key) !== null || isLruAccessKey(key)) {
    return true;
  }

  return getBrowserLocalStorage().getItem(`_lru_access_${key}`) !== null;
}

function normalizeStorageClass(storageClass: unknown): StorageClass {
  return storageClass === 'config' ||
    storageClass === 'secret' ||
    storageClass === 'user-data' ||
    storageClass === 'cache'
    ? storageClass
    : 'user-data';
}

function createUsageBuckets(): Record<LocalDataBucketId, LocalDataBucketUsage> {
  return LOCAL_DATA_BUCKET_IDS.reduce(
    (buckets, id) => {
      buckets[id] = {
        id,
        localStorage: {
          used: 0,
          keys: 0,
        },
        indexedDB: {
          used: 0,
          keys: 0,
        },
        total: 0,
        lastUpdatedAt: null,
      };
      return buckets;
    },
    {} as Record<LocalDataBucketId, LocalDataBucketUsage>
  );
}

function addToBucket(
  buckets: Record<LocalDataBucketId, LocalDataBucketUsage>,
  id: LocalDataBucketId,
  layer: 'localStorage' | 'indexedDB',
  bytes: number,
  updatedAt: number | null = null
): void {
  const bucket = buckets[id];
  bucket[layer].used += bytes;
  bucket[layer].keys += 1;
  bucket.total += bytes;
  if (updatedAt !== null) {
    bucket.lastUpdatedAt = Math.max(bucket.lastUpdatedAt || 0, updatedAt);
  }
}

function estimateBytes(value: unknown): number {
  try {
    return JSON.stringify(value).length * 2;
  } catch (_error) {
    return String(value).length * 2;
  }
}

function getBrowserLocalStorage(): Storage {
  return globalThis.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface PreparedLocalDataImport {
  localStorageEntries: Array<[string, string]>;
  indexedRecords: Array<LocalDataRecord>;
}

/**
 * Resolve schema version from new (`schemaVersion`) or legacy (`version`) fields.
 * Returns null when neither field is a number (missing / invalid).
 */
export function resolveLocalDataExportSchemaVersion(data: unknown): number | null {
  if (!isRecord(data)) return null;
  if (typeof data.schemaVersion === 'number') return data.schemaVersion;
  if (typeof data.version === 'number') return data.version;
  return null;
}

function normalizeExportBucketFilter(
  buckets: LocalDataBucketId[] | undefined
): LocalDataBucketId[] | null {
  if (!buckets || buckets.length === 0) {
    return null;
  }
  const unique = Array.from(new Set(buckets));
  for (const id of unique) {
    if (!LOCAL_DATA_BUCKET_IDS.includes(id)) {
      throw new ValidationError('不支持的本地数据分类', 'LOCAL_DATA_003', 'buckets', id, {
        module: 'LocalDataStore',
        action: 'normalizeExportBucketFilter',
      });
    }
  }
  return unique;
}

function assertSupportedLocalDataExport(data: unknown): asserts data is LocalDataExport {
  if (!isRecord(data)) {
    throw new ValidationError('不支持的本地数据备份格式', 'LOCAL_DATA_001', 'export', data, {
      module: 'LocalDataStore',
      action: 'assertSupportedLocalDataExport',
    });
  }

  const schemaVersion = resolveLocalDataExportSchemaVersion(data);
  const metadata = isRecord(data.metadata) ? data.metadata : null;

  if (
    schemaVersion !== 1 ||
    metadata?.app !== 'sops' ||
    metadata?.storageVersion !== STORAGE_VERSION ||
    !isRecord(data.localStorage) ||
    !Array.isArray(data.indexedDB)
  ) {
    throw new ValidationError('不支持的本地数据备份格式', 'LOCAL_DATA_001', 'export', data, {
      module: 'LocalDataStore',
      action: 'assertSupportedLocalDataExport',
    });
  }
}

function exportIncludesSecrets(data: LocalDataExport): boolean {
  for (const key of Object.keys(data.localStorage)) {
    if (isSecretBucketKey(key)) {
      return true;
    }
  }

  for (const record of data.indexedDB) {
    if (
      record &&
      typeof record.key === 'string' &&
      isSecretBucketKey(record.key, record.storageClass)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a backup payload and return a human-readable import summary.
 */
export function summarizeLocalDataExport(data: unknown): LocalDataExportSummary {
  assertSupportedLocalDataExport(data);
  const localStorageKeys = Object.keys(data.localStorage).length;
  const indexedDbRecords = data.indexedDB.length;
  let estimatedBytes = 0;

  try {
    estimatedBytes = JSON.stringify(data).length * 2;
  } catch {
    estimatedBytes = localStorageKeys * 32 + indexedDbRecords * 64;
  }

  return {
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '未知时间',
    storageVersion: data.metadata.storageVersion,
    localStorageKeys,
    indexedDbRecords,
    estimatedBytes,
    includesSecrets: exportIncludesSecrets(data),
  };
}

/**
 * Parse raw backup text and validate before importAll.
 * Rejects non-JSON and missing/unsupported schema version.
 */
export function precheckLocalDataImportText(text: string): {
  data: LocalDataExport;
  summary: LocalDataExportSummary;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ValidationError(
      '备份文件不是有效的 JSON，无法导入',
      'LOCAL_DATA_005',
      'text',
      text.slice(0, 120),
      {
        module: 'LocalDataStore',
        action: 'precheckLocalDataImportText',
      }
    );
  }

  if (resolveLocalDataExportSchemaVersion(parsed) === null) {
    throw new ValidationError(
      '备份文件缺少 schemaVersion / version，无法导入',
      'LOCAL_DATA_006',
      'schemaVersion',
      parsed,
      {
        module: 'LocalDataStore',
        action: 'precheckLocalDataImportText',
      }
    );
  }

  const summary = summarizeLocalDataExport(parsed);
  return { data: parsed as LocalDataExport, summary };
}

function collectImportLocalStorageEntries(
  localStorageData: LocalDataExport['localStorage']
): Array<[string, string]> {
  const localStorageEntries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(localStorageData)) {
    if (typeof value !== 'string') {
      throw new ValidationError(
        '本地数据备份中包含无效的 localStorage 值',
        'LOCAL_DATA_002',
        key,
        value,
        {
          module: 'LocalDataStore',
          action: 'collectImportLocalStorageEntries',
        }
      );
    }
    if (classifyLocalStorageKey(key) !== null) {
      localStorageEntries.push([key, value]);
    }
  }

  return localStorageEntries;
}

function normalizeImportIndexedRecords(
  indexedDB: LocalDataExport['indexedDB']
): Array<LocalDataRecord> {
  return indexedDB
    .filter((record): record is LocalDataRecord => !!record && typeof record.key === 'string')
    .map(record => ({
      key: record.key,
      value: record.value,
      storageClass: normalizeStorageClass(record.storageClass),
      updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : Date.now(),
    }));
}

function prepareLocalDataImport(data: LocalDataExport): PreparedLocalDataImport {
  assertSupportedLocalDataExport(data);

  return {
    localStorageEntries: collectImportLocalStorageEntries(data.localStorage),
    indexedRecords: normalizeImportIndexedRecords(data.indexedDB),
  };
}

class LocalDataStoreClass {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryStore = new Map<string, LocalDataRecord>();

  async get<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const record = await this.getRecord<T>(key);
    return record ? record.value : defaultValue;
  }

  async set<T = unknown>(
    key: string,
    value: T,
    storageClass: StorageClass = key.startsWith('cache:') ? 'cache' : 'user-data'
  ): Promise<boolean> {
    const record: LocalDataRecord<T> = {
      key,
      value,
      storageClass,
      updatedAt: Date.now(),
    };

    const db = await this.getDb();
    if (!db) {
      this.memoryStore.set(key, record);
      return true;
    }

    return new Promise(resolve => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('[LocalDataStore] 写入 IndexedDB 失败:', request.error || undefined);
        resolve(false);
      };
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryStore.delete(key);
      return;
    }

    await new Promise<void>(resolve => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        nativeLoggerConsole.warn(
          '[LocalDataStore] 删除 IndexedDB 记录失败:',
          request.error || undefined
        );
        resolve();
      };
    });
  }

  async keys(prefix?: string): Promise<string[]> {
    const records = await this.getAllRecords();
    const keys = records.map(record => record.key);
    return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
  }

  async clearCache(): Promise<number> {
    return this.clearBucket('cache');
  }

  async clearBucket(bucketId: LocalDataBucketId): Promise<number> {
    if (!LOCAL_DATA_BUCKET_IDS.includes(bucketId)) {
      throw new ValidationError('不支持的本地数据分类', 'LOCAL_DATA_003', 'bucketId', bucketId, {
        module: 'LocalDataStore',
        action: 'clearBucket',
      });
    }

    let removed = 0;

    const indexedRecords = await this.getAllRecords();
    for (const record of indexedRecords) {
      if (classifyKey(record.key, record.storageClass) === bucketId) {
        await this.remove(record.key);
        removed += 1;
      }
    }

    const storage = getBrowserLocalStorage();
    for (const key of this.getLocalStorageKeys()) {
      const lruTargetKey = getLruTargetKey(key);
      if (lruTargetKey && storage.getItem(lruTargetKey) !== null) {
        continue;
      }
      if (classifyLocalStorageKey(key) === bucketId && this.removeLocalStorageKey(key)) {
        removed += 1;
      }
    }

    return removed;
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryStore.clear();
      this.clearAppLocalStorageKeys();
      return;
    }

    await new Promise<void>(resolve => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => {
        nativeLoggerConsole.warn(
          '[LocalDataStore] 清空 IndexedDB 失败:',
          request.error || undefined
        );
        resolve();
      };
    });

    this.clearAppLocalStorageKeys();
  }

  async exportAll(options: LocalDataExportOptions = {}): Promise<LocalDataExport> {
    const bucketFilter = normalizeExportBucketFilter(options.buckets);
    const bucketSet = bucketFilter ? new Set(bucketFilter) : null;
    const localStorageData: Record<string, string> = {};
    const storage = getBrowserLocalStorage();
    for (const key of this.getLocalStorageKeys()) {
      const bucketId = classifyLocalStorageKey(key);
      if (bucketId === null) {
        continue;
      }
      if (bucketSet && !bucketSet.has(bucketId)) {
        continue;
      }
      const value = storage.getItem(key);
      if (value !== null) {
        localStorageData[key] = value;
      }
    }

    const indexedRecords = await this.getAllRecords();
    const indexedDB = bucketSet
      ? indexedRecords.filter(record => bucketSet.has(classifyKey(record.key, record.storageClass)))
      : indexedRecords;

    const payload: LocalDataExport = {
      version: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      localStorage: localStorageData,
      indexedDB,
      metadata: {
        app: 'sops',
        storageVersion: STORAGE_VERSION,
      },
    };

    if (bucketFilter) {
      payload.buckets = bucketFilter;
    }

    return payload;
  }

  async importAll(data: LocalDataExport, options: LocalDataImportOptions = {}): Promise<void> {
    const prepared = prepareLocalDataImport(data);
    const previousData = options.mode === 'replace' ? await this.exportAll() : null;

    try {
      if (options.mode === 'replace') {
        await this.clearAll();
      }

      await this.writePreparedImport(prepared);
    } catch (error) {
      if (previousData) {
        await this.rollbackImport(previousData);
      }
      throw error;
    }
  }

  private async writePreparedImport(prepared: PreparedLocalDataImport): Promise<void> {
    const storage = getBrowserLocalStorage();
    for (const [key, value] of prepared.localStorageEntries) {
      storage.setItem(key, value);
    }

    for (const record of prepared.indexedRecords) {
      const saved = await this.set(record.key, record.value, record.storageClass);
      if (!saved) {
        throw new SystemError(`导入 IndexedDB 记录失败: ${record.key}`, 'LOCAL_DATA_004', {
          module: 'LocalDataStore',
          action: 'writePreparedImport',
          key: record.key,
        });
      }
    }
  }

  private async rollbackImport(data: LocalDataExport): Promise<void> {
    try {
      await this.clearAll();
      await this.writePreparedImport(prepareLocalDataImport(data));
    } catch (rollbackError) {
      nativeLoggerConsole.warn('[LocalDataStore] 导入失败后回滚本地数据失败:', rollbackError);
    }
  }

  async getUsage(): Promise<LocalDataUsage> {
    let localStorageUsed = 0;
    let localStorageKeys = 0;
    const buckets = createUsageBuckets();
    const storage = getBrowserLocalStorage();
    for (const key of this.getLocalStorageKeys()) {
      const bucketId = classifyLocalStorageKey(key);
      if (bucketId === null) {
        continue;
      }
      const value = storage.getItem(key) || '';
      const bytes = (key.length + value.length) * 2;
      localStorageUsed += bytes;
      localStorageKeys += 1;
      addToBucket(buckets, bucketId, 'localStorage', bytes);
    }

    const records = await this.getAllRecords();
    const indexedUsed = records.reduce((total, record) => {
      const bytes = estimateBytes(record);
      addToBucket(
        buckets,
        classifyKey(record.key, record.storageClass),
        'indexedDB',
        bytes,
        Number.isFinite(record.updatedAt) ? record.updatedAt : null
      );
      return total + bytes;
    }, 0);

    return {
      localStorage: {
        used: localStorageUsed,
        keys: localStorageKeys,
      },
      indexedDB: {
        used: indexedUsed,
        keys: records.length,
      },
      total: localStorageUsed + indexedUsed,
      buckets: LOCAL_DATA_BUCKET_IDS.map(id => buckets[id]),
    };
  }

  async migrateLocalStorageKey<T = unknown>(
    localStorageKey: string,
    indexedDBKey: string,
    storageClass: StorageClass
  ): Promise<T | null> {
    const existing = await this.get<T>(indexedDBKey, null);
    if (existing !== null) {
      return existing;
    }

    const storage = getBrowserLocalStorage();
    const raw = storage.getItem(localStorageKey);
    if (raw === null) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as T;
      const saved = await this.set(indexedDBKey, parsed, storageClass);
      if (saved) {
        storage.setItem(`${localStorageKey}_migrated_to_indexeddb`, new Date().toISOString());
      }
      return parsed;
    } catch (error) {
      nativeLoggerConsole.warn(
        `[LocalDataStore] 迁移 localStorage 键失败: ${localStorageKey}`,
        error
      );
      return null;
    }
  }

  private async getRecord<T = unknown>(key: string): Promise<LocalDataRecord<T> | null> {
    const db = await this.getDb();
    if (!db) {
      return (this.memoryStore.get(key) as LocalDataRecord<T> | undefined) || null;
    }

    return new Promise(resolve => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as LocalDataRecord<T>) || null);
      request.onerror = () => {
        nativeLoggerConsole.warn(
          '[LocalDataStore] 读取 IndexedDB 记录失败:',
          request.error || undefined
        );
        resolve(null);
      };
    });
  }

  private async getAllRecords(): Promise<Array<LocalDataRecord>> {
    const db = await this.getDb();
    if (!db) {
      return Array.from(this.memoryStore.values());
    }

    return new Promise(resolve => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as Array<LocalDataRecord>) || []);
      request.onerror = () => {
        nativeLoggerConsole.warn(
          '[LocalDataStore] 列出 IndexedDB 记录失败:',
          request.error || undefined
        );
        resolve([]);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise(resolve => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('storageClass', 'storageClass', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          nativeLoggerConsole.warn(
            '[LocalDataStore] IndexedDB 不可用，降级为内存存储:',
            request.error || undefined
          );
          resolve(null);
        };
      });
    }

    return this.dbPromise;
  }

  private getLocalStorageKeys(): string[] {
    const storage = getBrowserLocalStorage();
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  private removeLocalStorageKey(key: string): boolean {
    const storage = getBrowserLocalStorage();
    const existed = storage.getItem(key) !== null;
    storage.removeItem(key);

    if (!isLruAccessKey(key)) {
      storage.removeItem(`_lru_access_${key}`);
    }

    return existed;
  }

  clearAppLocalStorageKeys(): number {
    let removed = 0;
    for (const key of this.getLocalStorageKeys()) {
      if (isSopsManagedLocalStorageKey(key) && this.removeLocalStorageKey(key)) {
        removed += 1;
      }
    }
    return removed;
  }
}

export const LocalDataStore = new LocalDataStoreClass();
export default LocalDataStore;
