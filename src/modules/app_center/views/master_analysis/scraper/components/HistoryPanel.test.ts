import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HistoryItem } from '@/types/modules-business';

const mocks = vi.hoisted(() => {
  const state = {
    analysis: {
      analysisReport: null as unknown,
    },
    setCurrentHistoryId: vi.fn(),
    setScrapedData: vi.fn(),
    setUserProductProfile: vi.fn(),
    setAnalysisReport: vi.fn((report: unknown) => {
      state.analysis.analysisReport = report;
    }),
    setTranslatedReport: vi.fn(),
    setSelectedSite: vi.fn(),
  };

  return {
    state,
    getAll: vi.fn(),
    getAllAsync: vi.fn(),
    deleteByIdAsync: vi.fn(),
    clearAsync: vi.fn(),
    updateSnapshotDataAsync: vi.fn(),
    emitHistoryUpdated: vi.fn(),
    getScrapedDataFingerprint: vi.fn(() => 'fingerprint'),
    showToast: vi.fn(),
    navigateToRouteId: vi.fn(),
    eventBusEmit: vi.fn(),
    confirmWithModal: vi.fn(),
  };
});

vi.mock('../../services/historyService', () => ({
  HistoryService: {
    getAll: mocks.getAll,
    getAllAsync: mocks.getAllAsync,
    deleteByIdAsync: mocks.deleteByIdAsync,
    clearAsync: mocks.clearAsync,
    updateSnapshotDataAsync: mocks.updateSnapshotDataAsync,
  },
}));

vi.mock('../../services/historyEvents', () => ({
  emitHistoryUpdated: mocks.emitHistoryUpdated,
}));

vi.mock('../../services/reportIdentity', () => ({
  getScrapedDataFingerprint: mocks.getScrapedDataFingerprint,
}));

vi.mock('../../../../../../common/ui', () => ({
  showToast: mocks.showToast,
}));

vi.mock('../../../../../../common/router/initRouter', () => ({
  navigateToRouteId: mocks.navigateToRouteId,
}));

vi.mock('../../../../../../common/constants/constants', () => ({
  LANGUAGE_HEADERS: {
    US: { domain: 'amazon.com', name: 'English (US)' },
    DE: { domain: 'amazon.de', name: 'German' },
  },
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mocks.state,
  },
}));

vi.mock('../../../../../../common/EventBus', () => ({
  default: {
    emit: mocks.eventBusEmit,
  },
}));

vi.mock('../../../../../../common/constants/eventConstants', () => ({
  MODULE_EVENTS: {
    SCRAPER: {
      SCRAPE_SUCCESS: 'scraper:scrape-success',
    },
  },
}));

vi.mock('../../utils/confirmModal', () => ({
  confirmWithModal: mocks.confirmWithModal,
}));

import { HistoryPanel } from './HistoryPanel';

function createHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    id: 'hist-1',
    timestamp: '2026-07-02T10:00:00Z',
    site: 'US',
    asins: ['B001'],
    data: {
      products: [
        {
          asin: 'B001',
          url: 'https://example.test',
          language: 'English (US)',
          productTitle: 'Desk organizer',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    },
    ...overrides,
  } as HistoryItem;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.navigateToRouteId.mockResolvedValue(true);
  mocks.state.analysis.analysisReport = null;
  mocks.getAll.mockReturnValue([createHistoryItem()]);
  mocks.getAllAsync.mockResolvedValue([]);
  mocks.deleteByIdAsync.mockResolvedValue(true);
  mocks.clearAsync.mockResolvedValue(undefined);
  mocks.updateSnapshotDataAsync.mockResolvedValue(true);
  mocks.confirmWithModal.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HistoryPanel history management', () => {
  it('loads sync and async history snapshots', async () => {
    const panel = new HistoryPanel();
    const nextHistory = [createHistoryItem({ id: 'hist-2' })];
    mocks.getAllAsync.mockResolvedValue(nextHistory);

    expect(panel.getHistory()).toEqual([expect.objectContaining({ id: 'hist-1' })]);
    await expect(panel.loadHistoryAsync()).resolves.toBe(nextHistory);
    expect(panel.getHistory()).toBe(nextHistory);
  });

  it('deletes snapshots after confirmation and handles missing snapshots', async () => {
    const panel = new HistoryPanel();

    await expect(panel.deleteHistoryItem('hist-1')).resolves.toBe(true);

    expect(mocks.deleteByIdAsync).toHaveBeenCalledWith('hist-1');
    expect(mocks.emitHistoryUpdated).toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith('快照已删除', { type: 'success' });

    mocks.deleteByIdAsync.mockResolvedValueOnce(false);
    await expect(panel.deleteHistoryItem('missing')).resolves.toBe(false);
    expect(mocks.showToast).toHaveBeenCalledWith('记录不存在或已删除', { type: 'warning' });
  });

  it('does not delete when confirmation is cancelled and reports delete failures', async () => {
    const panel = new HistoryPanel();

    mocks.confirmWithModal.mockResolvedValueOnce(false);
    await expect(panel.deleteHistoryItem('hist-1')).resolves.toBe(false);
    expect(mocks.deleteByIdAsync).not.toHaveBeenCalled();

    const error = new Error('delete failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.confirmWithModal.mockResolvedValueOnce(true);
    mocks.deleteByIdAsync.mockRejectedValueOnce(error);

    await expect(panel.deleteHistoryItem('hist-1')).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('[Scraper] 删除历史快照失败:', error);
    expect(mocks.showToast).toHaveBeenCalledWith('delete failed', { type: 'error' });
  });

  it('clears all history after confirmation', async () => {
    const panel = new HistoryPanel();

    await panel.clearAllHistory();

    expect(mocks.clearAsync).toHaveBeenCalled();
    expect(mocks.getAllAsync).toHaveBeenCalled();
    expect(mocks.emitHistoryUpdated).toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith('历史已清空', { type: 'success' });

    mocks.confirmWithModal.mockResolvedValueOnce(false);
    await panel.clearAllHistory();
    expect(mocks.clearAsync).toHaveBeenCalledTimes(1);
  });
});

describe('HistoryPanel snapshot loading', () => {
  it('loads snapshots into app state and normalizes missing metadata', async () => {
    const panel = new HistoryPanel();
    const report = { summary: 'analysis report' };
    const item = createHistoryItem({
      analysisStatus: {
        isAnalyzed: true,
        analysisReport: report,
        sourceDataFingerprint: 'fingerprint',
      },
      userProductProfile: {
        targetMarket: 'English',
        keywordsTier1: 'desk organizer',
        keywordsTier2: 'office storage',
        audience: 'office users',
        usps: 'Keeps supplies organized',
        specs: 'Desktop organizer',
        socialHook: 'Tidy your workspace',
        negative: '',
        tone: 'professional',
        customStrategy: '',
        useRufus: true,
        useEmoji: false,
        useCosmo: true,
        selectedReportSections: [],
        charLimit: 5000,
      },
    });

    await expect(panel.loadHistoryItem(item, false)).resolves.toBe(true);
    await Promise.resolve();

    expect(item.data.metadata).toMatchObject({
      marketplace: 'US',
      domain: 'amazon.com',
      language: 'English (US)',
      total_asins: 1,
    });
    expect(mocks.updateSnapshotDataAsync).toHaveBeenCalledWith('hist-1', item.data);
    expect(mocks.state.setCurrentHistoryId).toHaveBeenCalledWith('hist-1');
    expect(mocks.state.setScrapedData).toHaveBeenCalledWith(item.data);
    expect(mocks.state.setAnalysisReport).toHaveBeenCalledWith(report);
    expect(mocks.state.setTranslatedReport).toHaveBeenCalledWith(null);
    expect(mocks.eventBusEmit).toHaveBeenCalledWith('scraper:scrape-success', item.data);
    expect(mocks.showToast).toHaveBeenCalledWith('历史快照已加载（包含分析报告）', {
      type: 'success',
    });
  });

  it('cancels snapshot loading while scraping when overwrite is rejected', async () => {
    const panel = new HistoryPanel();
    mocks.confirmWithModal.mockResolvedValueOnce(false);

    await expect(panel.loadHistoryItem(createHistoryItem(), true)).resolves.toBe(false);

    expect(mocks.state.setScrapedData).not.toHaveBeenCalled();
    expect(mocks.eventBusEmit).not.toHaveBeenCalled();
  });
});

describe('HistoryPanel analysis reports', () => {
  it('loads analysis reports and navigates to the AI analysis route', async () => {
    const panel = new HistoryPanel();
    const report = { summary: 'analysis report' };
    const item = createHistoryItem({
      dataFingerprint: 'fingerprint',
      analysisStatus: {
        isAnalyzed: true,
        analysisReport: report,
        sourceDataFingerprint: 'fingerprint',
      },
    });

    await panel.loadAnalysisReport(item);

    expect(mocks.navigateToRouteId).toHaveBeenCalledWith('ai_analysis');
    expect(mocks.showToast).toHaveBeenCalledWith('已跳转到 AI智能分析查看报告', {
      type: 'success',
    });
  });

  it('warns when a snapshot has no matching analysis report and reports navigation failures', async () => {
    const panel = new HistoryPanel();

    await panel.loadAnalysisReport(createHistoryItem());
    expect(mocks.showToast).toHaveBeenCalledWith('该快照没有分析报告', { type: 'warning' });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const navigationError = new Error('route failed');
    mocks.navigateToRouteId.mockRejectedValueOnce(navigationError);

    await panel.loadAnalysisReport(
      createHistoryItem({
        dataFingerprint: 'fingerprint',
        analysisStatus: {
          isAnalyzed: true,
          analysisReport: { summary: 'analysis report' },
          sourceDataFingerprint: 'fingerprint',
        },
      })
    );

    expect(errorSpy).toHaveBeenCalledWith('[Scraper] 载入分析报告失败:', navigationError);
    expect(mocks.showToast).toHaveBeenCalledWith('载入分析报告失败', { type: 'error' });
  });
});
