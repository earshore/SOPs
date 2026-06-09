import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryItem, ScrapedData } from '@/types/modules-business';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';

const mocks = vi.hoisted(() => {
  const mockStore = {
    history: [] as HistoryItem[],
    setScrapeHistory: vi.fn(),
    remove: vi.fn(),
    state: {
      scraper: {
        currentHistoryId: null as HistoryItem['id'] | null,
        selectedSite: 'US'
      },
      setCurrentHistoryId: vi.fn()
    }
  };

  mockStore.setScrapeHistory.mockImplementation((history: HistoryItem[]) => {
    mockStore.history = history;
    return true;
  });
  mockStore.state.setCurrentHistoryId.mockImplementation((id: HistoryItem['id'] | null) => {
    mockStore.state.scraper.currentHistoryId = id;
  });

  return mockStore;
});

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    SCRAPE_HISTORY: 'scrape_history'
  },
  StorageService: {
    getScrapeHistory: vi.fn(() => mocks.history),
    getScrapeHistoryAsync: vi.fn(async () => mocks.history),
    setScrapeHistory: mocks.setScrapeHistory,
    setScrapeHistoryAsync: vi.fn(async (history: HistoryItem[]) => {
      mocks.history = history;
      return true;
    }),
    removeScrapeHistoryAsync: vi.fn(async () => {
      mocks.history = [];
    }),
    remove: mocks.remove
  }
}));

vi.mock('@/common/config/ConfigCenter', () => ({
  configCenter: {
    get: vi.fn((path: string) => (path === 'storage.historyMaxItems' ? 50 : undefined))
  }
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: vi.fn(() => mocks.state)
  }
}));

vi.mock('@/services/loggerService', () => ({
  Logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

function createScrapedData(timestamp: string, asins: string[]): ScrapedData {
  return {
    metadata: {
      scrape_timestamp: timestamp,
      marketplace: 'US',
      domain: 'amazon.com',
      language: 'English',
      total_asins: asins.length
    },
    products: asins.map((asin) => ({
      asin,
      url: '',
      language: 'English',
      productTitle: asin,
      feature_bullets: [],
      customer_reviews: [],
      scrape_status: 'success',
      error: ''
    }))
  };
}

function createHistoryItem(id: HistoryItem['id'], timestamp: string, asins: string[]): HistoryItem {
  return {
    id,
    timestamp,
    site: 'US',
    asins,
    data: createScrapedData(timestamp, asins)
  };
}

describe('HistoryService snapshot storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.history = [];
    mocks.state.scraper.currentHistoryId = null;
    mocks.state.scraper.selectedSite = 'US';
    HistoryService.clear();
  });

  it('creates a new snapshot when scrape timestamp changes', () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]?.id;

    const second = HistoryService.save(createScrapedData('2026-01-01T00:01:00.000Z', ['B000000002']));

    expect(second).toHaveLength(2);
    expect(second[0]?.asins).toEqual(['B000000002']);
    expect(second[1]?.id).toBe(firstId);
  });

  it('updates the current snapshot when scrape timestamp is unchanged', () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]?.id;

    const updated = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001', 'B000000002']));

    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe(firstId);
    expect(updated[0]?.asins).toEqual(['B000000001', 'B000000002']);
  });

  it('keeps the newest 50 snapshots', () => {
    for (let index = 0; index < 55; index += 1) {
      const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
      HistoryService.save(createScrapedData(timestamp, [`B${String(index).padStart(9, '0')}`]));
    }

    expect(mocks.history).toHaveLength(50);
    expect(mocks.history[0]?.timestamp).toBe('2026-01-01T00:54:00.000Z');
    expect(mocks.history[49]?.timestamp).toBe('2026-01-01T00:05:00.000Z');
  });

  it('deletes one snapshot by id', () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]!.id;
    const second = HistoryService.save(createScrapedData('2026-01-01T00:01:00.000Z', ['B000000002']));
    const latestId = second[0]!.id;

    const deleted = HistoryService.deleteById(firstId);

    expect(deleted).toBe(true);
    expect(mocks.history).toEqual([
      expect.objectContaining({ id: latestId })
    ]);
  });

  it('clears current history id when deleting the loaded snapshot', async () => {
    mocks.history = [
      createHistoryItem('hist-001', '2026-01-01T00:00:00.000Z', ['B000000001'])
    ];
    mocks.state.scraper.currentHistoryId = 'hist-001';

    const deleted = await HistoryService.deleteByIdAsync('hist-001');

    expect(deleted).toBe(true);
    expect(mocks.state.scraper.currentHistoryId).toBeNull();
    expect(mocks.state.setCurrentHistoryId).toHaveBeenCalledWith(null);
    expect(mocks.history).toEqual([]);
  });

  it('does not persist when deleting a missing snapshot id', () => {
    HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    mocks.setScrapeHistory.mockClear();

    const deleted = HistoryService.deleteById('missing-id');

    expect(deleted).toBe(false);
    expect(mocks.setScrapeHistory).not.toHaveBeenCalled();
    expect(HistoryService.getAll()).toHaveLength(1);
  });
});
