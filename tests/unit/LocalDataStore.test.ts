import { beforeEach, describe, expect, it } from 'vitest';
import { LocalDataStore } from '@/services/localDataStore';

describe('LocalDataStore', () => {
  beforeEach(async () => {
    await LocalDataStore.clearAll();
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
    localStorage.setItem('secure_llm_key_new_api', JSON.stringify({ encrypted: true }));
    localStorage.setItem('cache:view:item', 'cached-view');
    await LocalDataStore.set('user:scrape_history', [{ id: 1 }], 'user-data');
    await LocalDataStore.set('user:playground_deep_chat_threads_v1', { threads: [] }, 'user-data');
    await LocalDataStore.set('user:custom-module', { value: 1 }, 'user-data');

    const usage = await LocalDataStore.getUsage();
    const buckets = Object.fromEntries(usage.buckets.map(bucket => [bucket.id, bucket]));

    expect(usage.buckets.map(bucket => bucket.id)).toEqual([
      'config',
      'secrets',
      'scrape-history',
      'chat-history',
      'cache',
      'other',
    ]);
    expect(buckets.config.localStorage.keys).toBe(1);
    expect(buckets.secrets.localStorage.keys).toBe(1);
    expect(buckets.cache.localStorage.keys).toBe(1);
    expect(buckets['scrape-history'].indexedDB.keys).toBe(1);
    expect(buckets['chat-history'].indexedDB.keys).toBe(1);
    expect(buckets.other.indexedDB.keys).toBe(1);
    expect(buckets['scrape-history'].total).toBeGreaterThan(0);
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

  it('removes LRU metadata when clearing cache keys', async () => {
    localStorage.setItem('cache:view:item', 'cached-view');
    localStorage.setItem('_lru_access_cache:view:item', '123');

    const removed = await LocalDataStore.clearCache();

    expect(removed).toBe(1);
    expect(localStorage.getItem('cache:view:item')).toBeNull();
    expect(localStorage.getItem('_lru_access_cache:view:item')).toBeNull();
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
});
