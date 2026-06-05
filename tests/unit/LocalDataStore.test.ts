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
