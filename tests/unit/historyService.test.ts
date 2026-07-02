import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisReport, GeneratedPromptRecord, HistoryItem, ScrapedData } from '@/types/modules-business';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import { StorageService } from '@/services/storageService';
import type { UserProductProfile } from '@/types/state';

const mocks = vi.hoisted(() => {
  const mockStore = {
    history: [] as HistoryItem[],
    setScrapeHistory: vi.fn(),
    remove: vi.fn(),
    state: {
      scraper: {
        currentHistoryId: null as HistoryItem['id'] | null,
        selectedSite: 'US',
        scrapedData: null as ScrapedData | null
      },
      analysis: {
        analysisReport: null as unknown,
        translatedReport: null as unknown
      },
      setCurrentHistoryId: vi.fn(),
      setScrapedData: vi.fn(),
      setAnalysisReport: vi.fn(),
      setTranslatedReport: vi.fn()
    }
  };

  mockStore.setScrapeHistory.mockImplementation((history: HistoryItem[]) => {
    mockStore.history = history;
    return true;
  });
  mockStore.state.setCurrentHistoryId.mockImplementation((id: HistoryItem['id'] | null) => {
    mockStore.state.scraper.currentHistoryId = id;
  });
  mockStore.state.setScrapedData.mockImplementation((data: ScrapedData | null) => {
    mockStore.state.scraper.scrapedData = data;
  });
  mockStore.state.setAnalysisReport.mockImplementation((report: unknown) => {
    mockStore.state.analysis.analysisReport = report;
  });
  mockStore.state.setTranslatedReport.mockImplementation((report: unknown) => {
    mockStore.state.analysis.translatedReport = report;
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

function createPromptRecord(type: GeneratedPromptRecord['type'], prompt: string): GeneratedPromptRecord {
  return {
    id: `${type}-prompt`,
    type,
    prompt,
    generatedAt: '2026-01-01T00:10:00.000Z',
    historyId: null,
    asins: ['B000000001'],
    marketplace: 'US',
    profile: {
      targetMarket: 'English',
      keywordsTier1: 'keyword',
      keywordsTier2: 'longtail'
    }
  };
}

function createUserProductProfile(overrides: Partial<UserProductProfile> = {}): UserProductProfile {
  return {
    targetMarket: 'English',
    keywordsTier1: 'keyword',
    keywordsTier2: 'longtail',
    audience: 'audience',
    usps: 'usp',
    specs: 'spec',
    socialHook: '',
    negative: '',
    tone: 'professional',
    customStrategy: '',
    useCosmo: true,
    useRufus: true,
    useEmoji: true,
    selectedReportSections: [],
    charLimit: 5000,
    ...overrides
  };
}

describe('HistoryService snapshot storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.history = [];
    mocks.state.scraper.currentHistoryId = null;
    mocks.state.scraper.selectedSite = 'US';
    mocks.state.scraper.scrapedData = null;
    mocks.state.analysis.analysisReport = null;
    mocks.state.analysis.translatedReport = null;
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

  it('preserves analysis status and prompt results when current snapshot data is unchanged', () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]!.id;
    const analysisReport = { type: 'analysis', data: 'report' } as AnalysisReport;

    HistoryService.updateAnalysisStatus(firstId, analysisReport);
    HistoryService.updatePromptResult(
      firstId,
      createPromptRecord('listing', 'Listing Prompt')
    );

    const updated = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));

    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe(firstId);
    expect(updated[0]?.analysisStatus?.analysisReport).toBe(analysisReport);
    expect(updated[0]?.promptResults?.listing?.prompt).toBe('Listing Prompt');
  });

  it('clears analysis status and prompt results when current snapshot data changes', () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]!.id;
    const analysisReport = { type: 'analysis', data: 'report' } as AnalysisReport;

    HistoryService.updateAnalysisStatus(firstId, analysisReport);
    HistoryService.updatePromptResult(
      firstId,
      createPromptRecord('listing', 'Listing Prompt')
    );

    const updated = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001', 'B000000002']));

    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe(firstId);
    expect(updated[0]?.analysisStatus).toBeUndefined();
    expect(updated[0]?.promptResults).toBeUndefined();
    expect(updated[0]?.report).toBeUndefined();
  });

  it('persists product DNA profile on a snapshot', async () => {
    mocks.history = [
      createHistoryItem('hist-001', '2026-01-01T00:00:00.000Z', ['B000000001'])
    ];

    const saved = await HistoryService.updateUserProductProfileAsync(
      'hist-001',
      createUserProductProfile({ keywordsTier1: 'snapshot keyword' })
    );

    expect(saved).toBe(true);
    expect(mocks.history[0]?.userProductProfile?.keywordsTier1).toBe('snapshot keyword');
    expect(HistoryService.getUserProductProfileById('hist-001')?.keywordsTier1).toBe('snapshot keyword');
  });

  it('clears product DNA profile when current snapshot data changes', async () => {
    const first = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const firstId = first[0]!.id;

    await HistoryService.updateUserProductProfileAsync(
      firstId,
      createUserProductProfile({ keywordsTier1: 'old snapshot keyword' })
    );

    const updated = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001', 'B000000002']));

    expect(updated[0]?.id).toBe(firstId);
    expect(updated[0]?.userProductProfile).toBeUndefined();
  });

  it('clears prompt results when replacing a snapshot analysis report', () => {
    const [snapshot] = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    const snapshotId = snapshot!.id;

    HistoryService.updateAnalysisStatus(snapshotId, { type: 'analysis', data: 'old report' } as AnalysisReport);
    HistoryService.updatePromptResult(
      snapshotId,
      createPromptRecord('listing', 'Listing Prompt')
    );
    HistoryService.updateAnalysisStatus(snapshotId, { type: 'analysis', data: 'new report' } as AnalysisReport);

    const updated = HistoryService.getById(snapshotId);
    expect(updated?.analysisStatus?.analysisReport).toEqual({ type: 'analysis', data: 'new report' });
    expect(updated?.promptResults).toBeUndefined();
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
    mocks.state.scraper.scrapedData = mocks.history[0]!.data;
    mocks.state.analysis.analysisReport = { type: 'analysis', data: 'report' };
    mocks.state.analysis.translatedReport = { type: 'translated', data: 'report' };

    const deleted = await HistoryService.deleteByIdAsync('hist-001');

    expect(deleted).toBe(true);
    expect(mocks.state.scraper.currentHistoryId).toBeNull();
    expect(mocks.state.scraper.scrapedData).toBeNull();
    expect(mocks.state.analysis.analysisReport).toBeNull();
    expect(mocks.state.analysis.translatedReport).toBeNull();
    expect(mocks.state.setCurrentHistoryId).toHaveBeenCalledWith(null);
    expect(mocks.history).toEqual([]);
  });

  it('clears current snapshot workspace state when clearing all history', async () => {
    mocks.history = [
      createHistoryItem('hist-001', '2026-01-01T00:00:00.000Z', ['B000000001'])
    ];
    mocks.state.scraper.currentHistoryId = 'hist-001';
    mocks.state.scraper.scrapedData = mocks.history[0]!.data;
    mocks.state.analysis.analysisReport = { type: 'analysis', data: 'report' };
    mocks.state.analysis.translatedReport = { type: 'translated', data: 'report' };

    await HistoryService.clearAsync();

    expect(mocks.history).toEqual([]);
    expect(mocks.state.scraper.currentHistoryId).toBeNull();
    expect(mocks.state.scraper.scrapedData).toBeNull();
    expect(mocks.state.analysis.analysisReport).toBeNull();
    expect(mocks.state.analysis.translatedReport).toBeNull();
  });

  it('does not persist when deleting a missing snapshot id', () => {
    HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    mocks.setScrapeHistory.mockClear();

    const deleted = HistoryService.deleteById('missing-id');

    expect(deleted).toBe(false);
    expect(mocks.setScrapeHistory).not.toHaveBeenCalled();
    expect(HistoryService.getAll()).toHaveLength(1);
  });

  it('persists generated prompt results on a snapshot', async () => {
    mocks.history = [
      createHistoryItem('hist-001', '2026-01-01T00:00:00.000Z', ['B000000001'])
    ];

    const savedListing = await HistoryService.updatePromptResultAsync(
      'hist-001',
      createPromptRecord('listing', 'Listing Prompt')
    );
    const savedVisual = await HistoryService.updatePromptResultAsync(
      'hist-001',
      createPromptRecord('visual', 'Visual Prompt')
    );

    expect(savedListing).toBe(true);
    expect(savedVisual).toBe(true);
    expect(mocks.history[0]?.promptResults?.listing?.prompt).toBe('Listing Prompt');
    expect(mocks.history[0]?.promptResults?.visual?.prompt).toBe('Visual Prompt');
    expect(mocks.history[0]?.promptResults?.history).toHaveLength(2);
    expect(mocks.history[0]?.promptResults?.history[0]?.historyId).toBe('hist-001');
  });

  it('deletes generated prompt results from a snapshot', async () => {
    mocks.history = [
      createHistoryItem('hist-001', '2026-01-01T00:00:00.000Z', ['B000000001'])
    ];

    const oldListing = {
      ...createPromptRecord('listing', 'Old Listing Prompt'),
      id: 'listing-old',
      generatedAt: '2026-01-01T00:05:00.000Z'
    };
    const newListing = {
      ...createPromptRecord('listing', 'New Listing Prompt'),
      id: 'listing-new',
      generatedAt: '2026-01-01T00:10:00.000Z'
    };
    const visual = {
      ...createPromptRecord('visual', 'Visual Prompt'),
      id: 'visual-1',
      generatedAt: '2026-01-01T00:11:00.000Z'
    };

    await HistoryService.updatePromptResultAsync('hist-001', oldListing);
    await HistoryService.updatePromptResultAsync('hist-001', newListing);
    await HistoryService.updatePromptResultAsync('hist-001', visual);

    const deleted = await HistoryService.deletePromptResultAsync('listing-new');

    expect(deleted).toBe(true);
    expect(mocks.history[0]?.promptResults?.listing?.id).toBe('listing-old');
    expect(mocks.history[0]?.promptResults?.visual?.id).toBe('visual-1');
    expect(mocks.history[0]?.promptResults?.history.map((item) => item.id)).toEqual([
      'visual-1',
      'listing-old'
    ]);
  });

  it('treats deleting a missing prompt result as idempotent', async () => {
    HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    vi.mocked(StorageService.setScrapeHistoryAsync).mockClear();

    const deleted = await HistoryService.deletePromptResultAsync('missing-prompt');

    expect(deleted).toBe(true);
    expect(StorageService.setScrapeHistoryAsync).not.toHaveBeenCalled();
  });

  it('reports prompt result delete persistence failures', async () => {
    const [snapshot] = HistoryService.save(createScrapedData('2026-01-01T00:00:00.000Z', ['B000000001']));
    await HistoryService.updatePromptResultAsync(snapshot!.id, createPromptRecord('listing', 'Listing Prompt'));
    vi.mocked(StorageService.setScrapeHistoryAsync).mockResolvedValueOnce(false);

    const deleted = await HistoryService.deletePromptResultAsync('listing-prompt');

    expect(deleted).toBe(false);
  });
});
