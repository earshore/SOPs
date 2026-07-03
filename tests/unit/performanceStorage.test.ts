import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PerformanceStorage, createPerformanceStorage } from '@/services/performanceStorage';
import { SystemError } from '@/common/errors/AppError';
import type { ILoggerService } from '@/types/services';

type RequestHandler = ((event?: { target: FakeRequest<unknown> }) => void) | null;

class FakeRequest<T = unknown> {
  result!: T;
  error: Error | null = null;
  onsuccess: RequestHandler = null;
  onerror: RequestHandler = null;
  onupgradeneeded: RequestHandler = null;
}

class FakeStoreDefinition {
  readonly indexes = new Set<string>();

  createIndex(name: string): void {
    this.indexes.add(name);
  }
}

class FakeIDBCursor {
  constructor(
    private readonly records: Array<{ id: string; timestamp: number }>,
    private readonly store: Map<string, unknown>,
    private readonly request: FakeRequest<FakeIDBCursor | null>,
    private readonly transaction: FakeTransaction,
    private index = 0
  ) {}

  delete(): void {
    this.store.delete(this.records[this.index].id);
  }

  continue(): void {
    this.index += 1;
    queueMicrotask(() => this.emit());
  }

  emit(): void {
    if (this.index >= this.records.length) {
      this.request.result = null;
      this.request.onsuccess?.({ target: this.request });
      this.transaction.finishAsyncOperation();
      return;
    }

    this.request.result = this;
    this.request.onsuccess?.({ target: this.request });
  }
}

class FakeIndex {
  constructor(
    private readonly name: string,
    private readonly store: Map<string, unknown>,
    private readonly transaction: FakeTransaction
  ) {}

  getAll(value: string): FakeRequest<unknown[]> {
    return this.transaction.completeWith(
      Array.from(this.store.values()).filter(record => (
        typeof record === 'object' &&
        record !== null &&
        (record as Record<string, unknown>)[this.name] === value
      ))
    );
  }

  openCursor(range: { upper: number }): FakeRequest<FakeIDBCursor | null> {
    const request = new FakeRequest<FakeIDBCursor | null>();
    const records = Array.from(this.store.values())
      .filter((record): record is { id: string; timestamp: number } => (
        typeof record === 'object' &&
        record !== null &&
        typeof (record as { id?: unknown }).id === 'string' &&
        typeof (record as { timestamp?: unknown }).timestamp === 'number' &&
        (record as { timestamp: number }).timestamp <= range.upper
      ));

    this.transaction.startAsyncOperation();
    queueMicrotask(() => new FakeIDBCursor(records, this.store, request, this.transaction).emit());
    return request;
  }
}

class FakeObjectStore {
  constructor(
    private readonly records: Map<string, unknown>,
    private readonly transaction: FakeTransaction
  ) {}

  add(record: { id: string }): FakeRequest<string> {
    this.records.set(record.id, record);
    return this.transaction.completeWith(record.id);
  }

  get(id: string): FakeRequest<unknown> {
    return this.transaction.completeWith(this.records.get(id) ?? undefined);
  }

  getAll(): FakeRequest<unknown[]> {
    return this.transaction.completeWith(Array.from(this.records.values()));
  }

  delete(id: string): FakeRequest<void> {
    this.records.delete(id);
    return this.transaction.completeWith(undefined);
  }

  clear(): FakeRequest<void> {
    this.records.clear();
    return this.transaction.completeWith(undefined);
  }

  index(name: string): FakeIndex {
    return new FakeIndex(name, this.records, this.transaction);
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private pendingOperations = 0;

  constructor(private readonly records: Map<string, unknown>) {}

  objectStore(): FakeObjectStore {
    return new FakeObjectStore(this.records, this);
  }

  completeWith<T>(result: T): FakeRequest<T> {
    const request = new FakeRequest<T>();
    this.startAsyncOperation();
    queueMicrotask(() => {
      request.result = result;
      request.onsuccess?.({ target: request as FakeRequest<unknown> });
      this.finishAsyncOperation();
    });
    return request;
  }

  startAsyncOperation(): void {
    this.pendingOperations += 1;
  }

  finishAsyncOperation(): void {
    this.pendingOperations -= 1;
    if (this.pendingOperations === 0) {
      queueMicrotask(() => this.oncomplete?.());
    }
  }
}

class FakeDatabase {
  readonly records = new Map<string, unknown>();
  readonly definitions = new Map<string, FakeStoreDefinition>();
  readonly close = vi.fn();
  readonly objectStoreNames = {
    contains: (name: string) => this.definitions.has(name),
  };

  createObjectStore(name: string): FakeStoreDefinition {
    const store = new FakeStoreDefinition();
    this.definitions.set(name, store);
    return store;
  }

  transaction(): FakeTransaction {
    return new FakeTransaction(this.records);
  }
}

class FakeIndexedDB {
  readonly db = new FakeDatabase();

  open(): FakeRequest<FakeDatabase> {
    const request = new FakeRequest<FakeDatabase>();
    request.result = this.db;

    queueMicrotask(() => {
      request.onupgradeneeded?.({ target: request as FakeRequest<unknown> });
      request.onsuccess?.({ target: request as FakeRequest<unknown> });
    });

    return request;
  }
}

const createLogger = (): ILoggerService => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  getLogs: vi.fn(() => []),
  getErrors: vi.fn(() => []),
  clear: vi.fn(),
  download: vi.fn(),
});

  let originalIndexedDB: IDBFactory | undefined;
  let originalWindowIndexedDB: IDBFactory | undefined;
  let originalIDBKeyRange: typeof IDBKeyRange | undefined;

  beforeEach(() => {
    originalIndexedDB = globalThis.indexedDB;
    originalWindowIndexedDB = window.indexedDB;
    originalIDBKeyRange = globalThis.IDBKeyRange;
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    let randomCall = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      randomCall += 1;
      return randomCall / 100;
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: originalIndexedDB,
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: originalWindowIndexedDB,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      configurable: true,
      value: originalIDBKeyRange,
    });
    vi.restoreAllMocks();
  });

  it('exposes singleton and injected factory entry points', () => {
    const logger = createLogger();
    const created = createPerformanceStorage(logger);

    expect(created).toBeInstanceOf(PerformanceStorage);
    expect(PerformanceStorage.getInstance()).toBe(PerformanceStorage.getInstance());
  });

  it('throws structured errors before the database is initialized', async () => {
    const storage = PerformanceStorage.create(createLogger());

    await expect(storage.save({ timestamp: 1, type: 'custom', data: {} }))
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_001' });
    await expect(storage.saveBatch([]))
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_002' });
    await expect(storage.get('missing'))
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_003' });
    await expect(storage.getAll())
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_004' });
    await expect(storage.delete('missing'))
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_005' });
    await expect(storage.clear())
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_006' });
    await expect(storage.cleanupOldRecords())
      .rejects.toMatchObject<SystemError>({ code: 'PERF_STORAGE_007' });
  });

  it('logs and stays uninitialized when IndexedDB is unavailable', async () => {
    const logger = createLogger();
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined,
    });

    const storage = PerformanceStorage.create(logger);
    await storage.init();

    expect(logger.error).toHaveBeenCalledWith(
      'IndexedDB not supported',
      {},
      'PerformanceStorage'
    );
    await expect(storage.getAll()).rejects.toMatchObject({ code: 'PERF_STORAGE_004' });
  });

  it('stores, queries, summarizes, exports, imports, and clears records', async () => {
    const fakeIndexedDB = new FakeIndexedDB();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDB,
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDB,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      configurable: true,
      value: { upperBound: (upper: number) => ({ upper }) },
    });

    const logger = createLogger();
    const storage = PerformanceStorage.create(logger);
    await storage.init({ retentionDays: 1 });
    await storage.init();

    expect(logger.warn).toHaveBeenCalledWith(
      'PerformanceStorage already initialized',
      {},
      'PerformanceStorage'
    );

    const firstId = await storage.save({
      timestamp: 1_700_000_000_000,
      type: 'webvitals',
      data: { name: 'LCP', value: 1200 },
    });
    const batchIds = await storage.saveBatch([
      { timestamp: 1_700_000_000_100, type: 'memory', data: { used: 42 } },
      { timestamp: 1_700_000_000_200, type: 'custom', data: { feature: 'search' } },
    ]);

    expect(firstId).toMatch(/^perf_1700000000000_/);
    expect(batchIds).toHaveLength(2);
    expect(await storage.get(firstId)).toMatchObject({
      id: firstId,
      type: 'webvitals',
      data: { name: 'LCP', value: 1200 },
    });
    expect(await storage.get('missing')).toBeNull();
    expect(await storage.getAll({ type: 'memory' })).toHaveLength(1);
    expect(await storage.getAll({ startTime: 1_700_000_000_050, endTime: 1_700_000_000_150 }))
      .toHaveLength(1);
    expect(await storage.getAll({ limit: 2 })).toHaveLength(2);
    expect((await storage.getRecent(1))[0].type).toBe('custom');

    const stats = await storage.getStats();
    expect(stats).toMatchObject({
      totalRecords: 3,
      byType: {
        webvitals: 1,
        memory: 1,
        custom: 1,
      },
      oldestRecord: 1_700_000_000_000,
      newestRecord: 1_700_000_000_200,
    });
    expect(stats.estimatedSize).toBeGreaterThan(0);

    const exported = await storage.export();
    await storage.clear();
    expect(await storage.getAll()).toEqual([]);

    await expect(storage.import(exported)).resolves.toBe(3);
    await expect(storage.import('not json')).rejects.toThrow();
    await storage.delete(firstId);
    expect(await storage.get(firstId)).toBeNull();

    storage.updateConfig({ retentionDays: 3, maxRecords: 10 });
    storage.destroy();

    expect(fakeIndexedDB.db.close).toHaveBeenCalledTimes(1);
  });

  it('cleans up records older than the retention window', async () => {
    const fakeIndexedDB = new FakeIndexedDB();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDB,
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDB,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      configurable: true,
      value: { upperBound: (upper: number) => ({ upper }) },
    });

    const storage = PerformanceStorage.create(createLogger());
    await storage.init({ retentionDays: 7 });
    await storage.saveBatch([
      { timestamp: 1_700_000_000_000 - 8 * 24 * 60 * 60 * 1000, type: 'custom', data: { stale: true } },
      { timestamp: 1_700_000_000_000, type: 'custom', data: { fresh: true } },
    ]);

    await expect(storage.cleanupOldRecords()).resolves.toBe(1);

    const remaining = await storage.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].data).toEqual({ fresh: true });
  });
