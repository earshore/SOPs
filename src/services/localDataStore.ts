// src/services/localDataStore.ts
// ================================================================
// LocalDataStore
// IndexedDB-backed storage for user data and large cache payloads.
// localStorage remains the small synchronous config/secret layer.
// ================================================================

export type StorageClass = 'config' | 'secret' | 'user-data' | 'cache';

export interface LocalDataRecord<T = unknown> {
  key: string;
  value: T;
  storageClass: StorageClass;
  updatedAt: number;
}

export interface LocalDataExport {
  version: 1;
  exportedAt: string;
  localStorage: Record<string, string>;
  indexedDB: Array<LocalDataRecord>;
  metadata: {
    app: 'sops';
    storageVersion: string;
  };
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
}

const DB_NAME = 'SopsLocalData';
const STORE_NAME = 'records';
const DB_VERSION = 1;
const STORAGE_VERSION = 'local-data-v1';

const CACHE_PREFIXES = ['cache:', 'view_cache_', 'http-cache:', 'ai_analysis_'];

function isCacheKey(key: string): boolean {
  return CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
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

    return new Promise((resolve) => {
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

    await new Promise<void>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('[LocalDataStore] 删除 IndexedDB 记录失败:', request.error || undefined);
        resolve();
      };
    });
  }

  async keys(prefix?: string): Promise<string[]> {
    const records = await this.getAllRecords();
    const keys = records.map((record) => record.key);
    return prefix ? keys.filter((key) => key.startsWith(prefix)) : keys;
  }

  async clearCache(): Promise<number> {
    let removed = 0;

    const indexedRecords = await this.getAllRecords();
    for (const record of indexedRecords) {
      if (record.storageClass === 'cache' || isCacheKey(record.key)) {
        await this.remove(record.key);
        removed += 1;
      }
    }

    const localKeys = this.getLocalStorageKeys();
    const storage = getBrowserLocalStorage();
    for (const key of localKeys) {
      if (isCacheKey(key)) {
        storage.removeItem(key);
        removed += 1;
      }
    }

    return removed;
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    const storage = getBrowserLocalStorage();
    if (!db) {
      this.memoryStore.clear();
      storage.clear();
      return;
    }

    await new Promise<void>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn('[LocalDataStore] 清空 IndexedDB 失败:', request.error || undefined);
        resolve();
      };
    });

    storage.clear();
  }

  async exportAll(): Promise<LocalDataExport> {
    const localStorageData: Record<string, string> = {};
    const storage = getBrowserLocalStorage();
    for (const key of this.getLocalStorageKeys()) {
      const value = storage.getItem(key);
      if (value !== null) {
        localStorageData[key] = value;
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      localStorage: localStorageData,
      indexedDB: await this.getAllRecords(),
      metadata: {
        app: 'sops',
        storageVersion: STORAGE_VERSION,
      },
    };
  }

  async importAll(data: LocalDataExport): Promise<void> {
    if (!data || data.version !== 1) {
      throw new Error('不支持的本地数据备份格式');
    }

    const storage = getBrowserLocalStorage();
    for (const [key, value] of Object.entries(data.localStorage || {})) {
      storage.setItem(key, value);
    }

    const records = Array.isArray(data.indexedDB) ? data.indexedDB : [];
    for (const record of records) {
      if (record && typeof record.key === 'string') {
        await this.set(record.key, record.value, record.storageClass || 'user-data');
      }
    }
  }

  async getUsage(): Promise<LocalDataUsage> {
    let localStorageUsed = 0;
    let localStorageKeys = 0;
    const storage = getBrowserLocalStorage();
    for (const key of this.getLocalStorageKeys()) {
      const value = storage.getItem(key) || '';
      localStorageUsed += (key.length + value.length) * 2;
      localStorageKeys += 1;
    }

    const records = await this.getAllRecords();
    const indexedUsed = records.reduce((total, record) => total + estimateBytes(record), 0);

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
      console.warn(`[LocalDataStore] 迁移 localStorage 键失败: ${localStorageKey}`, error);
      return null;
    }
  }

  private async getRecord<T = unknown>(key: string): Promise<LocalDataRecord<T> | null> {
    const db = await this.getDb();
    if (!db) {
      return (this.memoryStore.get(key) as LocalDataRecord<T> | undefined) || null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as LocalDataRecord<T>) || null);
      request.onerror = () => {
        console.warn('[LocalDataStore] 读取 IndexedDB 记录失败:', request.error || undefined);
        resolve(null);
      };
    });
  }

  private async getAllRecords(): Promise<Array<LocalDataRecord>> {
    const db = await this.getDb();
    if (!db) {
      return Array.from(this.memoryStore.values());
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as Array<LocalDataRecord>) || []);
      request.onerror = () => {
        console.warn('[LocalDataStore] 列出 IndexedDB 记录失败:', request.error || undefined);
        resolve([]);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
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
          console.warn('[LocalDataStore] IndexedDB 不可用，降级为内存存储:', request.error || undefined);
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
}

export const LocalDataStore = new LocalDataStoreClass();
export default LocalDataStore;
