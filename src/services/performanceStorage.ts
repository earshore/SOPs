// src/services/performanceStorage.ts
// ================================================================
// 🎯 P2-11: 性能数据持久化服务
// 使用IndexedDB存储性能数据
// ================================================================

import { Logger } from './loggerService';

/**
 * 性能数据记录
 */
export interface PerformanceRecord {
  id: string;
  timestamp: number;
  type: 'webvitals' | 'memory' | 'custom';
  data: Record<string, any>;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  dbName: string;
  storeName: string;
  version: number;
  retentionDays: number;
  maxRecords: number;
}

/**
 * 性能数据存储服务
 */
export class PerformanceStorage {
  private static instance: PerformanceStorage;
  private config: StorageConfig;
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      dbName: 'PerformanceDB',
      storeName: 'performance_records',
      version: 1,
      retentionDays: 7,
      maxRecords: 10000
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PerformanceStorage {
    if (!PerformanceStorage.instance) {
      PerformanceStorage.instance = new PerformanceStorage();
    }
    return PerformanceStorage.instance;
  }

  /**
   * 初始化数据库
   */
  async init(config?: Partial<StorageConfig>): Promise<void> {
    if (this.isInitialized) {
      Logger.warn('PerformanceStorage already initialized', {}, 'PerformanceStorage');
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 检查IndexedDB支持
    if (!window.indexedDB) {
      Logger.error('IndexedDB not supported', {}, 'PerformanceStorage');
      return;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      Logger.info('✅ PerformanceStorage initialized', this.config as unknown as Record<string, unknown>, 'PerformanceStorage');

      // 清理过期数据
      await this.cleanupOldRecords();
    } catch (error) {
      Logger.error('Failed to initialize PerformanceStorage', { error }, 'PerformanceStorage');
      throw error;
    }
  }

  /**
   * 打开数据库
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(this.config.storeName, {
            keyPath: 'id',
            autoIncrement: false
          });

          // 创建索引
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  /**
   * 保存性能记录
   */
  async save(record: Omit<PerformanceRecord, 'id'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = this.generateId();
    const fullRecord: PerformanceRecord = {
      id,
      ...record
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.add(fullRecord);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = () => {
        reject(new Error('Failed to save record'));
      };
    });
  }

  /**
   * 批量保存
   */
  async saveBatch(records: Array<Omit<PerformanceRecord, 'id'>>): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const ids: string[] = [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);

      records.forEach(record => {
        const id = this.generateId();
        const fullRecord: PerformanceRecord = { id, ...record };
        objectStore.add(fullRecord);
        ids.push(id);
      });

      transaction.oncomplete = () => {
        resolve(ids);
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save batch'));
      };
    });
  }

  /**
   * 获取记录
   */
  async get(id: string): Promise<PerformanceRecord | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get record'));
      };
    });
  }

  /**
   * 获取所有记录
   */
  async getAll(options?: {
    type?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<PerformanceRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.config.storeName);
      
      let request: IDBRequest;

      if (options?.type) {
        const index = objectStore.index('type');
        request = index.getAll(options.type);
      } else {
        request = objectStore.getAll();
      }

      request.onsuccess = () => {
        let records = request.result as PerformanceRecord[];

        // 过滤时间范围
        if (options?.startTime || options?.endTime) {
          records = records.filter(record => {
            if (options.startTime && record.timestamp < options.startTime) return false;
            if (options.endTime && record.timestamp > options.endTime) return false;
            return true;
          });
        }

        // 限制数量
        if (options?.limit) {
          records = records.slice(0, options.limit);
        }

        resolve(records);
      };

      request.onerror = () => {
        reject(new Error('Failed to get records'));
      };
    });
  }

  /**
   * 获取最近的记录
   */
  async getRecent(count: number = 100, type?: string): Promise<PerformanceRecord[]> {
    const records = await this.getAll({ type });
    return records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete record'));
      };
    });
  }

  /**
   * 清空所有记录
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        Logger.info('All performance records cleared', {}, 'PerformanceStorage');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear records'));
      };
    });
  }

  /**
   * 清理过期记录
   */
  async cleanupOldRecords(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        if (deletedCount > 0) {
          Logger.info(`Cleaned up ${deletedCount} old records`, {}, 'PerformanceStorage');
        }
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        reject(new Error('Failed to cleanup old records'));
      };
    });
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalRecords: number;
    byType: Record<string, number>;
    oldestRecord: number;
    newestRecord: number;
    estimatedSize: number;
  }> {
    const records = await this.getAll();

    const byType = records.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timestamps = records.map(r => r.timestamp);
    const oldestRecord = Math.min(...timestamps);
    const newestRecord = Math.max(...timestamps);

    // 估算大小(粗略)
    const estimatedSize = JSON.stringify(records).length;

    return {
      totalRecords: records.length,
      byType,
      oldestRecord,
      newestRecord,
      estimatedSize
    };
  }

  /**
   * 导出数据
   */
  async export(): Promise<string> {
    const records = await this.getAll();
    return JSON.stringify(records, null, 2);
  }

  /**
   * 导入数据
   */
  async import(data: string): Promise<number> {
    try {
      const records = JSON.parse(data) as PerformanceRecord[];
      await this.saveBatch(records.map(({ id, ...rest }) => rest));
      return records.length;
    } catch (error) {
      Logger.error('Failed to import data', { error }, 'PerformanceStorage');
      throw error;
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
    Logger.info('PerformanceStorage config updated', this.config as unknown as Record<string, unknown>, 'PerformanceStorage');
  }

  /**
   * 销毁存储服务
   */
  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
    Logger.info('PerformanceStorage destroyed', {}, 'PerformanceStorage');
  }
}

// 创建全局实例
export const performanceStorage = PerformanceStorage.getInstance();

// 默认导出
export default performanceStorage;
