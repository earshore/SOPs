import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  LocalDataStore,
  precheckLocalDataImportText,
  summarizeLocalDataExport,
} from '@/services/localDataStore';

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await LocalDataStore.clearAll();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('stores, reads, removes, and lists IndexedDB-layer records', async () => {
  await LocalDataStore.set('user:test', { value: 1 }, 'user-data');

  expect(await LocalDataStore.get('user:test')).toEqual({ value: 1 });
  expect(await LocalDataStore.keys('user:')).toEqual(['user:test']);

  await LocalDataStore.remove('user:test');

  expect(await LocalDataStore.get('user:test')).toBeNull();
});

it('clears only cache records and cache-prefixed localStorage keys', async () => {
  await LocalDataStore.set('user:history', ['keep'], 'user-data');
  await LocalDataStore.set('cache:ai-analysis:item', { cached: true }, 'cache');
  localStorage.setItem('cache:view:item', 'cached-view');
  localStorage.setItem('secure_llm_key', 'secret');

  const removed = await LocalDataStore.clearCache();

  expect(removed).toBe(2);
  expect(await LocalDataStore.get('user:history')).toEqual(['keep']);
  expect(await LocalDataStore.get('cache:ai-analysis:item')).toBeNull();
  expect(localStorage.getItem('cache:view:item')).toBeNull();
  expect(localStorage.getItem('secure_llm_key')).toBe('secret');
});

it('reports usage by local data bucket', async () => {
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
  localStorage.setItem('negative_review_owner_v1', JSON.stringify('客服小王'));
  localStorage.setItem('secure_llm_key_new_api', JSON.stringify({ encrypted: true }));
  localStorage.setItem('proxy_key_map', JSON.stringify({ scraperapi: 'scraper-key' }));
  localStorage.setItem(
    'scraper_proxy_config',
    JSON.stringify({ type: 'scraperapi', customUrl: 'scraper-key' })
  );
  localStorage.setItem('cache:view:item', 'cached-view');
  localStorage.setItem(
    'app-storage',
    JSON.stringify({ state: { promptlab: { history: [{ id: 'p1' }] } } })
  );
  localStorage.setItem('external-app-key', 'not-owned');
  await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');
  await LocalDataStore.set('user:playground_deep_chat_threads_v1', { threads: [] }, 'user-data');
  await LocalDataStore.set('user:keyword_hunter_snapshots', [{ id: 'kh1' }], 'user-data');
  await LocalDataStore.set('user:custom-module', { value: 1 }, 'user-data');

  const usage = await LocalDataStore.getUsage();
  const buckets = Object.fromEntries(usage.buckets.map(bucket => [bucket.id, bucket]));

  expect(usage.buckets.map(bucket => bucket.id)).toEqual([
    'config',
    'secrets',
    'workspace-state',
    'scrape-history',
    'chat-history',
    'keyword-history',
    'app-center-history',
    'cache',
    'other',
  ]);
  expect(buckets.config.localStorage.keys).toBe(2);
  expect(buckets.secrets.localStorage.keys).toBe(3);
  expect(buckets['workspace-state'].localStorage.keys).toBe(1);
  expect(buckets.cache.localStorage.keys).toBe(1);
  expect(buckets['scrape-history'].indexedDB.keys).toBe(1);
  expect(buckets['chat-history'].indexedDB.keys).toBe(1);
  expect(buckets['keyword-history'].indexedDB.keys).toBe(1);
  expect(buckets.other.indexedDB.keys).toBe(1);
  expect(buckets['scrape-history'].total).toBeGreaterThan(0);
});

it('preserves non-SOPS origin keys during usage, export, and clear all', async () => {
  localStorage.setItem('app_theme', JSON.stringify('dark'));
  localStorage.setItem('external-app-key', 'keep-me');

  const usage = await LocalDataStore.getUsage();
  const exported = await LocalDataStore.exportAll();

  expect(usage.localStorage.keys).toBe(1);
  expect(exported.localStorage).toEqual({ app_theme: JSON.stringify('dark') });

  await LocalDataStore.clearAll();

  expect(localStorage.getItem('app_theme')).toBeNull();
  expect(localStorage.getItem('external-app-key')).toBe('keep-me');
});

it('treats proxy credentials as secrets', async () => {
  localStorage.setItem('proxy_key_map', JSON.stringify({ scraperapi: 'scraper-key' }));
  localStorage.setItem(
    'scraper_proxy_config',
    JSON.stringify({ type: 'scraperapi', customUrl: 'scraper-key' })
  );
  localStorage.setItem(
    'proxy_config',
    JSON.stringify({ type: 'scraperapi', customUrl: 'scraper-key' })
  );
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));

  const removed = await LocalDataStore.clearBucket('secrets');

  expect(removed).toBe(3);
  expect(localStorage.getItem('proxy_key_map')).toBeNull();
  expect(localStorage.getItem('scraper_proxy_config')).toBeNull();
  expect(localStorage.getItem('proxy_config')).toBeNull();
  expect(localStorage.getItem('llm_active_provider')).toBe(JSON.stringify('new_api'));
});

it('treats legacy plaintext LLM keys as secrets', async () => {
  localStorage.setItem('llm_key_new_api', 'legacy-key');
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));

  const usage = await LocalDataStore.getUsage();
  const buckets = Object.fromEntries(usage.buckets.map(bucket => [bucket.id, bucket]));

  expect(buckets.secrets.localStorage.keys).toBe(1);
  expect(buckets.config.localStorage.keys).toBe(1);

  const exported = await LocalDataStore.exportAll();
  expect(exported.localStorage).toHaveProperty('llm_key_new_api', 'legacy-key');

  const removed = await LocalDataStore.clearBucket('secrets');

  expect(removed).toBe(1);
  expect(localStorage.getItem('llm_key_new_api')).toBeNull();
  expect(localStorage.getItem('llm_active_provider')).toBe(JSON.stringify('new_api'));
});

it('clears only the selected data bucket', async () => {
  localStorage.setItem('scrape_history', JSON.stringify([{ id: 'legacy' }]));
  localStorage.setItem('playground_deep_chat_threads_v1', JSON.stringify({ threads: [] }));
  localStorage.setItem('secure_llm_key_new_api', JSON.stringify({ encrypted: true }));
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
  await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');
  await LocalDataStore.set('user:playground_deep_chat_threads_v1', { threads: [] }, 'user-data');
  await LocalDataStore.set('cache:ai-analysis:item', { cached: true }, 'cache');

  const removed = await LocalDataStore.clearBucket('scrape-history');

  expect(removed).toBe(2);
  expect(localStorage.getItem('scrape_history')).toBeNull();
  expect(await LocalDataStore.get('user:scrape_history')).toBeNull();
  expect(localStorage.getItem('playground_deep_chat_threads_v1')).not.toBeNull();
  expect(localStorage.getItem('secure_llm_key_new_api')).not.toBeNull();
  expect(localStorage.getItem('llm_active_provider')).not.toBeNull();
  expect(await LocalDataStore.get('user:playground_deep_chat_threads_v1')).toEqual({ threads: [] });
  expect(await LocalDataStore.get('cache:ai-analysis:item')).toEqual({ cached: true });
});

it('keeps workspace state out of config cleanup', async () => {
  localStorage.setItem(
    'app-storage',
    JSON.stringify({ state: { promptlab: { history: [{ id: 'p1' }] } } })
  );
  localStorage.setItem('_lru_access_app-storage', '123');
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
  localStorage.setItem('keyword_hunter_snapshots', JSON.stringify([{ id: 'kh1' }]));

  const removed = await LocalDataStore.clearBucket('config');

  expect(removed).toBe(1);
  expect(localStorage.getItem('llm_active_provider')).toBeNull();
  expect(localStorage.getItem('app-storage')).not.toBeNull();
  expect(localStorage.getItem('_lru_access_app-storage')).not.toBeNull();
  expect(localStorage.getItem('keyword_hunter_snapshots')).not.toBeNull();
});

it('clears workspace state with its LRU metadata', async () => {
  localStorage.setItem(
    'app-storage',
    JSON.stringify({ state: { promptlab: { history: [{ id: 'p1' }] } } })
  );
  localStorage.setItem('_lru_access_app-storage', '123');
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));

  const removed = await LocalDataStore.clearBucket('workspace-state');

  expect(removed).toBe(1);
  expect(localStorage.getItem('app-storage')).toBeNull();
  expect(localStorage.getItem('_lru_access_app-storage')).toBeNull();
  expect(localStorage.getItem('llm_active_provider')).not.toBeNull();
});

it('clears keyword history without clearing workspace state', async () => {
  localStorage.setItem(
    'app-storage',
    JSON.stringify({ state: { keywordTracker: { keywords: ['keep'] } } })
  );
  localStorage.setItem('keyword_hunter_snapshots', JSON.stringify([{ id: 'legacy' }]));
  await LocalDataStore.set('user:keyword_hunter_snapshots', [{ id: 'kh1' }], 'user-data');

  const removed = await LocalDataStore.clearBucket('keyword-history');

  expect(removed).toBe(2);
  expect(localStorage.getItem('keyword_hunter_snapshots')).toBeNull();
  expect(await LocalDataStore.get('user:keyword_hunter_snapshots')).toBeNull();
  expect(localStorage.getItem('app-storage')).not.toBeNull();
});

it('removes LRU metadata when clearing cache keys', async () => {
  localStorage.setItem('cache:view:item', 'cached-view');
  localStorage.setItem('_lru_access_cache:view:item', '123');

  const removed = await LocalDataStore.clearCache();

  expect(removed).toBe(1);
  expect(localStorage.getItem('cache:view:item')).toBeNull();
  expect(localStorage.getItem('_lru_access_cache:view:item')).toBeNull();
});

it('classifies and clears app center history as its own bucket', async () => {
  localStorage.setItem(
    'app_center_work_items_v1',
    JSON.stringify([{ id: 'w1', status: 'done' }])
  );
  localStorage.setItem(
    'app_center_artifact_envelopes_v1',
    JSON.stringify([{ id: 'a1', type: 'analysis_report' }])
  );
  localStorage.setItem(
    'app_center_recent_queue_prefs_v1',
    JSON.stringify({ pinnedIds: [], dismissedIds: ['a1'] })
  );
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));

  const removed = await LocalDataStore.clearBucket('app-center-history');

  expect(removed).toBe(3);
  expect(localStorage.getItem('app_center_work_items_v1')).toBeNull();
  expect(localStorage.getItem('app_center_artifact_envelopes_v1')).toBeNull();
  expect(localStorage.getItem('app_center_recent_queue_prefs_v1')).toBeNull();
  expect(localStorage.getItem('llm_active_provider')).not.toBeNull();
});

it('includes app center history in full export but not in other buckets', async () => {
  localStorage.setItem(
    'app_center_artifact_envelopes_v1',
    JSON.stringify([{ id: 'a1', type: 'analysis_report' }])
  );
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
  localStorage.setItem('cache:view:item', 'cached-view');

  const full = await LocalDataStore.exportAll();
  expect(full.localStorage).toHaveProperty('app_center_artifact_envelopes_v1');

  const cacheOnly = await LocalDataStore.exportAll({ buckets: ['cache'] });
  expect(cacheOnly.localStorage).not.toHaveProperty('app_center_artifact_envelopes_v1');
  expect(cacheOnly.localStorage).toHaveProperty('cache:view:item');
});

it('UT-P2-03 summarizes backup metadata including keys and secret detection', () => {
  const summary = summarizeLocalDataExport({
    version: 1,
    schemaVersion: 1,
    exportedAt: '2026-07-20T12:00:00.000Z',
    localStorage: {
      app_theme: JSON.stringify('dark'),
      secure_llm_key_new_api: JSON.stringify({ encrypted: true }),
    },
    indexedDB: [
      {
        key: 'user:scrape_history',
        value: [{ id: 1 }],
        storageClass: 'user-data',
        updatedAt: Date.now(),
      },
    ],
    metadata: {
      app: 'sops',
      storageVersion: 'local-data-v1',
    },
  });

  expect(summary).toMatchObject({
    exportedAt: '2026-07-20T12:00:00.000Z',
    storageVersion: 'local-data-v1',
    localStorageKeys: 2,
    indexedDbRecords: 1,
    includesSecrets: true,
  });
  expect(summary.estimatedBytes).toBeGreaterThan(0);
});

it('UT-P2-01 exports only selected buckets and includes schemaVersion', async () => {
  localStorage.setItem('cache:view:item', 'cached-view');
  localStorage.setItem('llm_active_provider', JSON.stringify('new_api'));
  localStorage.setItem('secure_llm_key_new_api', JSON.stringify({ encrypted: true }));
  await LocalDataStore.set('cache:ai-analysis:item', { cached: true }, 'cache');
  await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');

  const exported = await LocalDataStore.exportAll({ buckets: ['cache'] });

  expect(exported.schemaVersion).toBe(1);
  expect(exported.version).toBe(1);
  expect(exported.buckets).toEqual(['cache']);
  expect(exported.localStorage).toEqual({ 'cache:view:item': 'cached-view' });
  expect(exported.indexedDB.map(record => record.key)).toEqual(['cache:ai-analysis:item']);
  expect(exported.metadata).toEqual({
    app: 'sops',
    storageVersion: 'local-data-v1',
  });
});

it('full export always includes schemaVersion and omits buckets', async () => {
  localStorage.setItem('app_theme', JSON.stringify('dark'));

  const exported = await LocalDataStore.exportAll();

  expect(exported.schemaVersion).toBe(1);
  expect(exported.buckets).toBeUndefined();
  expect(exported.localStorage).toHaveProperty('app_theme');
});

it('rejects unsupported backup payloads when summarizing', () => {
  expect(() =>
    summarizeLocalDataExport({
      version: 1,
      exportedAt: new Date().toISOString(),
      localStorage: {},
      indexedDB: [],
      metadata: { app: 'other', storageVersion: 'local-data-v1' },
    })
  ).toThrow('不支持的本地数据备份格式');
});

it('precheck rejects invalid JSON and missing version before import use', () => {
  expect(() => precheckLocalDataImportText('{not-json')).toThrow('不是有效的 JSON');
  expect(() =>
    precheckLocalDataImportText(
      JSON.stringify({
        exportedAt: new Date().toISOString(),
        localStorage: {},
        indexedDB: [],
        metadata: { app: 'sops', storageVersion: 'local-data-v1' },
      })
    )
  ).toThrow('缺少 schemaVersion / version');
});

it('exports and imports localStorage and IndexedDB-layer data', async () => {
  localStorage.setItem('app_theme', JSON.stringify('dark'));
  await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');

  const exported = await LocalDataStore.exportAll();
  await LocalDataStore.clearAll();

  expect(localStorage.getItem('app_theme')).toBeNull();
  expect(await LocalDataStore.get('user:scrape_history')).toBeNull();

  await LocalDataStore.importAll(exported);

  expect(localStorage.getItem('app_theme')).toBe(JSON.stringify('dark'));
  expect(await LocalDataStore.get('user:scrape_history')).toEqual([{ id: 1 }]);
});

it('can replace current data during import', async () => {
  localStorage.setItem('app_theme', JSON.stringify('stale'));
  localStorage.setItem('external-app-key', 'keep-me');
  await LocalDataStore.set('user:stale', { stale: true }, 'user-data');

  const backup = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    localStorage: {
      app_theme: JSON.stringify('restored'),
      'external-import-key': 'skip-me',
    },
    indexedDB: [
      {
        key: 'user:restored',
        value: { ok: true },
        storageClass: 'user-data' as const,
        updatedAt: Date.now(),
      },
    ],
    metadata: {
      app: 'sops' as const,
      storageVersion: 'local-data-v1',
    },
  };

  await LocalDataStore.importAll(backup, { mode: 'replace' });

  expect(localStorage.getItem('app_theme')).toBe(JSON.stringify('restored'));
  expect(localStorage.getItem('external-app-key')).toBe('keep-me');
  expect(localStorage.getItem('external-import-key')).toBeNull();
  expect(await LocalDataStore.get('user:stale')).toBeNull();
  expect(await LocalDataStore.get('user:restored')).toEqual({ ok: true });
});

it('rejects non-SOPS backup files before replacing current data', async () => {
  localStorage.setItem('app_theme', JSON.stringify('old'));
  await LocalDataStore.set('user:stale', { stale: true }, 'user-data');
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: {
      app_theme: JSON.stringify('new'),
    },
    indexedDB: [],
    metadata: {
      app: 'external-tool',
      storageVersion: 'local-data-v1',
    },
  } as unknown as Parameters<typeof LocalDataStore.importAll>[0];

  await expect(LocalDataStore.importAll(backup, { mode: 'replace' })).rejects.toThrow(
    '不支持的本地数据备份格式'
  );

  expect(localStorage.getItem('app_theme')).toBe(JSON.stringify('old'));
  expect(await LocalDataStore.get('user:stale')).toEqual({ stale: true });
});

it('rejects malformed localStorage values before replacing current data', async () => {
  localStorage.setItem('app_theme', JSON.stringify('old'));
  await LocalDataStore.set('user:stale', { stale: true }, 'user-data');
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: {
      app_theme: { value: 'not-a-storage-string' },
    },
    indexedDB: [],
    metadata: {
      app: 'sops',
      storageVersion: 'local-data-v1',
    },
  } as unknown as Parameters<typeof LocalDataStore.importAll>[0];

  await expect(LocalDataStore.importAll(backup, { mode: 'replace' })).rejects.toThrow(
    '本地数据备份中包含无效的 localStorage 值'
  );

  expect(localStorage.getItem('app_theme')).toBe(JSON.stringify('old'));
  expect(await LocalDataStore.get('user:stale')).toEqual({ stale: true });
});

it('rolls back replace imports when writing prepared localStorage data fails', async () => {
  localStorage.setItem('app_theme', JSON.stringify('old'));
  await LocalDataStore.set('user:stale', { stale: true }, 'user-data');
  const originalSetItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(
    key: string,
    value: string
  ) {
    if (key === 'app_theme' && value === JSON.stringify('new')) {
      throw new Error('quota exceeded');
    }
    return originalSetItem.call(this, key, value);
  });

  await expect(
    LocalDataStore.importAll(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        localStorage: {
          app_theme: JSON.stringify('new'),
        },
        indexedDB: [],
        metadata: {
          app: 'sops',
          storageVersion: 'local-data-v1',
        },
      },
      { mode: 'replace' }
    )
  ).rejects.toThrow('quota exceeded');

  expect(localStorage.getItem('app_theme')).toBe(JSON.stringify('old'));
  expect(await LocalDataStore.get('user:stale')).toEqual({ stale: true });
});

it('migrates a legacy localStorage key without deleting the source', async () => {
  localStorage.setItem('scrape_history', JSON.stringify([{ id: 'legacy' }]));

  const migrated = await LocalDataStore.migrateLocalStorageKey(
    'scrape_history',
    'user:scrape_history',
    'user-data'
  );

  expect(migrated).toEqual([{ id: 'legacy' }]);
  expect(await LocalDataStore.get('user:scrape_history')).toEqual([{ id: 'legacy' }]);
  expect(localStorage.getItem('scrape_history')).toBe(JSON.stringify([{ id: 'legacy' }]));
});
