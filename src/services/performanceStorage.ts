// src/services/performanceStorage.ts
// ================================================================
// 🎯 P2-11: 性能数据持久化服务
// 使用IndexedDB存储性能数据
// ================================================================

import type { ILoggerService } from '../types/services';
import { SystemError } from '../common/errors/AppError';
import { createRandomId } from '../common/utils/random';

/**
 * 性能数据记录
 */
export interface PerformanceRecord {
  id: string;
  timestamp: number;
  type: 'webvitals' | 'memory' | 'custom';
  data: Record<string, unknown>;
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
 * 🎯 DI改造：支持依赖注入Logger
 */
export class PerformanceStorage {
  private static instance: PerformanceStorage;
  private config: StorageConfig;
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;
  private logger: ILoggerService | null = null;

  private constructor(logger?: ILoggerService) {
    this.config = {
      dbName: 'PerformanceDB',
      storeName: 'performance_records',
      version: 1,
      retentionDays: 7,
      maxRecords: 10000,
    };
    this.logger = logger || null;
  }

  static create(logger?: ILoggerService): PerformanceStorage {
    return new PerformanceStorage(logger);
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
   * 记录日志（使用注入的Logger或console）
   */
  private _log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    if (this.logger) {
      this.logger[level](message, data, 'PerformanceStorage');
    } else {
      console[level](`[PerformanceStorage] ${message}`, data);
    }
  }

  /**
   * 初始化数据库
   */
  async init(config?: Partial<StorageConfig>): Promise<void> {
    if (this.isInitialized) {
      this._log('warn', 'PerformanceStorage already initialized', {});
      return;
    }

    // 合并配置
    this.config = { ...this.config, ...config };

    // 检查IndexedDB支持
    if (!window.indexedDB) {
      this._log('error', 'IndexedDB not supported', {});
      return;
    }

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      this._log(
        'info',
        '✅ PerformanceStorage initialized',
        this.config as unknown as Record<string, unknown>
      );

      // 清理过期数据
      await this.cleanupOldRecords();
    } catch (error) {
      this._log('error', 'Failed to initialize PerformanceStorage', {
        error: (error as Error).message,
      });
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

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(this.config.storeName, {
            keyPath: 'id',
            autoIncrement: false,
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_001', {
        module: 'PerformanceStorage',
        action: 'save',
      });
    }

    const id = this.generateId();
    const fullRecord: PerformanceRecord = {
      id,
      ...record,
    };

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readwrite');
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_002', {
        module: 'PerformanceStorage',
        action: 'saveBatch',
      });
    }

    const ids: string[] = [];

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readwrite');
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_003', {
        module: 'PerformanceStorage',
        action: 'get',
        id,
      });
    }

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readonly');
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_004', {
        module: 'PerformanceStorage',
        action: 'getAll',
        options,
      });
    }

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readonly');
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
    return records.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new SystemError('Database not initialized', 'PERF_STORAGE_005', {
        module: 'PerformanceStorage',
        action: 'delete',
        id,
      });
    }

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readwrite');
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_006', {
        module: 'PerformanceStorage',
        action: 'clear',
      });
    }

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        this._log('info', 'All performance records cleared', {});
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
      throw new SystemError('Database not initialized', 'PERF_STORAGE_007', {
        module: 'PerformanceStorage',
        action: 'cleanupOldRecords',
      });
    }

    const cutoffTime = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const db = this.db;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.config.storeName);
      const index = objectStore.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        if (deletedCount > 0) {
          this._log('info', `Cleaned up ${deletedCount} old records`, {});
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

    const byType = records.reduce(
      (acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

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
      estimatedSize,
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
      await this.saveBatch(records.map(({ id: _id, ...rest }) => rest));
      return records.length;
    } catch (error) {
      this._log('error', 'Failed to import data', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return createRandomId('perf');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
    this._log(
      'info',
      'PerformanceStorage config updated',
      this.config as unknown as Record<string, unknown>
    );
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
    this._log('info', 'PerformanceStorage destroyed', {});
  }
}

// 创建全局实例（向后兼容）
/** @deprecated 请使用 container.resolve('performanceStorage') 获取PerformanceStorage实例 */
export const performanceStorage = PerformanceStorage.getInstance();

// 默认导出
export default performanceStorage;

// ================================================================
// 🎯 DI容器工厂函数
// ================================================================

/**
 * 创建PerformanceStorage实例的工厂函数
 * @param logger - LoggerService实例（可选）
 * @returns PerformanceStorage实例
 */
export function createPerformanceStorage(logger?: ILoggerService): PerformanceStorage {
  return PerformanceStorage.create(logger);
}
