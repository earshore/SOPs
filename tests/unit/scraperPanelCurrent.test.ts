import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createScraperPanel } from '@/modules/app_center/views/master_analysis/scraper/components/ScraperPanel';
import { StorageService } from '@/services/storageService';
import { showToast } from '@/common/ui';
import { ErrorService } from '@/services/errorService';
import { startScrape, saveScrapeSnapshot } from '@/modules/app_center/views/master_analysis/scraper/handlers/scrapeHandler';
import {
  deleteProduct as deleteProductCore,
  deleteReview as deleteReviewCore,
} from '@/modules/app_center/views/master_analysis/scraper/handlers/dataOperations';

const scraperMocks = vi.hoisted(() => {
  const appState = {
    scraper: {
      selectedSite: 'DE',
      inputAsins: '',
      isScraping: false,
      scrapedData: null as unknown,
      expandedAsin: null as string | null,
      currentDataTab: 'preview' as 'preview' | 'json',
    },
    updateScraper: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(appState.scraper, patch);
    }),
    setScrapedData: vi.fn((data: unknown) => {
      appState.scraper.scrapedData = data;
    }),
    setAnalysisReport: vi.fn(),
    setSelectedSite: vi.fn((site: string) => {
      appState.scraper.selectedSite = site;
    }),
  };

  class MockDataPreview {
    state = {
      expandedAsin: null as string | null,
      currentDataTab: 'preview' as 'preview' | 'json',
      currentPage: 1,
      itemsPerPage: 50,
    };

    totalProducts = 2;
    totalPages = 3;
    paginatedProducts = [{ asin: 'B08N5WRWNW' }];
    shouldUsePagination = true;
    cleanup = vi.fn();
    checkLargeDataset = vi.fn();
    setupEventDelegation = vi.fn();
    renderDataPanel = vi.fn();
    updateData = vi.fn();
    toggleCardExpand = vi.fn((asin: string) => {
      this.state.expandedAsin = this.state.expandedAsin === asin ? null : asin;
    });
    switchDataTab = vi.fn((tab: 'preview' | 'json') => {
      this.state.currentDataTab = tab;
    });
    goToPage = vi.fn((page: number) => {
      this.state.currentPage = page;
    });
    previousPage = vi.fn();
    nextPage = vi.fn();
    getState = vi.fn(() => this.state);
  }

  class MockHistoryPanel {
    history = [
      {
        id: 'hist-1',
        timestamp: '2026-06-12T08:00:00.000Z',
        site: 'DE',
        asins: ['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678', 'B099999999'],
        data: { products: [] },
        analysisStatus: { isAnalyzed: true, analyzedAt: '2026-06-12T09:00:00.000Z' },
      },
    ];

    loadHistory = vi.fn();
    getHistory = vi.fn(() => this.history);
    loadHistoryAsync = vi.fn(async () => this.history);
    deleteHistoryItem = vi.fn(async () => true);
    clearAllHistory = vi.fn(async () => {
      this.history = [];
    });
    loadHistoryItem = vi.fn(async () => true);
    loadAnalysisReport = vi.fn(async () => undefined);
  }

  return {
    appState,
    deleteProductCore: vi.fn(),
    deleteReviewCore: vi.fn(),
    emitHistoryUpdated: vi.fn(),
    errorHandle: vi.fn(),
    handleScrapeComplete: vi.fn(),
    handleImportFilesCore: vi.fn(),
    MockDataPreview,
    MockHistoryPanel,
    saveScrapeSnapshot: vi.fn(),
    showToast: vi.fn(),
    startScrape: vi.fn(),
    storageGet: vi.fn(),
    updateTask: vi.fn((tasks: Array<{ asin: string; status: string; message: string }>, asin: string, status: string, message: string) => {
      const task = tasks.find((item) => item.asin === asin);
      if (task) Object.assign(task, { status, message });
    }),
  };
});

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => scraperMocks.appState,
  },
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    PROXY_CONFIG: 'proxy_config',
  },
  StorageService: {
    get: scraperMocks.storageGet,
  },
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: scraperMocks.errorHandle,
  },
}));

vi.mock('@/common/ui', () => ({
  showToast: scraperMocks.showToast,
}));

vi.mock('@/common/constants/eventConstants', () => ({
  APP_EVENTS: {
    HISTORY_UPDATED: 'history-updated',
  },
}));

vi.mock('@/modules/app_center/views/master_analysis/scraper/components/DataPreview', () => ({
  DataPreview: scraperMocks.MockDataPreview,
}));

vi.mock('@/modules/app_center/views/master_analysis/scraper/components/HistoryPanel', () => ({
  HistoryPanel: scraperMocks.MockHistoryPanel,
}));

vi.mock('@/modules/app_center/views/master_analysis/scraper/handlers/scrapeHandler', () => ({
  startScrape: scraperMocks.startScrape,
  handleScrapeComplete: scraperMocks.handleScrapeComplete,
  saveScrapeSnapshot: scraperMocks.saveScrapeSnapshot,
  updateTask: scraperMocks.updateTask,
}));

vi.mock('@/modules/app_center/views/master_analysis/scraper/handlers/importHandler', () => ({
  handleImportFiles: scraperMocks.handleImportFilesCore,
}));

vi.mock('@/modules/app_center/views/master_analysis/scraper/handlers/dataOperations', () => ({
  confirmWithModal: vi.fn(),
  deleteProduct: scraperMocks.deleteProductCore,
  deleteReview: scraperMocks.deleteReviewCore,
}));

vi.mock('@/modules/app_center/views/master_analysis/services/historyEvents', () => ({
  emitHistoryUpdated: scraperMocks.emitHistoryUpdated,
}));

type ScraperPanel = ReturnType<typeof createScraperPanel> & Record<string, any>;

function resetAppState(): void {
  scraperMocks.appState.scraper = {
    selectedSite: 'DE',
    inputAsins: '',
    isScraping: false,
    scrapedData: null,
    expandedAsin: null,
    currentDataTab: 'preview',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.navigateTo = vi.fn(async () => undefined);
  resetAppState();
  scraperMocks.storageGet.mockReturnValue({ type: 'scraperapi', customUrl: '' });
  scraperMocks.handleScrapeComplete.mockReturnValue({
    metadata: { marketplace: 'DE' },
    products: [],
    reviews: [],
  });
  scraperMocks.saveScrapeSnapshot.mockResolvedValue(undefined);
  scraperMocks.startScrape.mockResolvedValue([]);
  scraperMocks.deleteProductCore.mockResolvedValue({ success: true, data: { products: [] } });
  scraperMocks.deleteReviewCore.mockResolvedValue({ success: true, data: { products: [] } });
});

describe('ScraperPanel current factory', () => {
  it('computes input, task, site, and history branch states', () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.inputAsins = 'B08N5WRWNW invalid B0ABCDEFGH';
    panel.tasks = [
      { asin: 'B08N5WRWNW', status: 'pending', message: '等待中' },
      { asin: 'B0ABCDEFGH', status: 'scraping', message: '采集中' },
      { asin: 'B012345678', status: 'success', message: '成功' },
      { asin: 'B099999999', status: 'failed', message: '失败' },
    ];
    panel.historyItems = [
      {
        id: 'hist-1',
        timestamp: '2026-06-12T08:00:00.000Z',
        site: 'DE',
        asins: ['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678', 'B099999999'],
        data: { products: [] },
        analysisStatus: { isAnalyzed: true, analyzedAt: '2026-06-12T09:00:00.000Z' },
      },
    ];

    expect(panel.validAsins).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
    expect(panel.invalidCount).toBe(1);
    expect(panel.canStart).toBe(true);
    expect(panel.hasValidAsins).toBe(true);
    expect(panel.hasNoValidAsins).toBe(false);
    expect(panel.hasInvalidAsins).toBe(true);
    expect(panel.startDisabled).toBe(false);
    expect(panel.showStartCount).toBe(true);
    expect(panel.startCountText).toBe('2 项');
    expect(panel.scrapingIconClass).toBe('fa-rocket');
    expect(panel.scrapingButtonText).toBe('开始采集');
    expect(panel.successfulTaskCount).toBe(1);
    expect(panel.completedTaskCount).toBe(2);
    expect(panel.taskProgressStyle).toBe('width: 50%');
    expect(panel.getTaskCardClass(panel.tasks[0])['border-slate-200 bg-slate-50/60']).toBe(true);
    expect(panel.getTaskCardClass(panel.tasks[1])['border-blue-200 bg-blue-50/60 scraping-shimmer']).toBe(true);
    expect(panel.getTaskCardClass(panel.tasks[2])['border-emerald-200 bg-emerald-50/60']).toBe(true);
    expect(panel.getTaskCardClass(panel.tasks[3])['border-rose-200 bg-rose-50/60']).toBe(true);
    expect(panel.getTaskIconClass(panel.tasks[1])['fa-circle-notch fa-spin']).toBe(true);
    expect(panel.getTaskMessageClass(panel.tasks[3])['text-rose-500']).toBe(true);
    expect(panel.isTaskSuccess(panel.tasks[2])).toBe(true);
    expect(panel.isTaskNotSuccess(panel.tasks[0])).toBe(true);
    expect(panel.getSiteButtonClass('DE')).toContain('selected');
    expect(panel.getSiteButtonClass('FR')).toContain('hover:border-blue-300');
    expect(panel.getSiteNameClass('DE')).toBe('text-blue-700');
    expect(panel.getAnimationDelayStyle(3, 40)).toBe('animation-delay: 120ms');
    expect(panel.getDataTabButtonClass('preview')).toContain('active');
    expect(panel.getDataTabButtonClass('json')).toContain('hover:text-slate-600');
    expect(panel.showHistoryClear).toBe(true);
    expect(panel.showHistoryLoadingEmpty).toBe(false);
    expect(panel.showHistoryEmpty).toBe(false);
    expect(panel.getHistoryCardClass(panel.historyItems[0])).toContain('analyzed');
    expect(panel.isHistoryAnalyzed(panel.historyItems[0])).toBe(true);
    expect(panel.showHistoryAnalysisTime(panel.historyItems[0])).toBe(true);
    expect(panel.getHistoryOverflowCountText(panel.historyItems[0])).toBe('+1');

    panel.inputAsins = '';
    panel.tasks = [];
    panel.isScraping = true;
    panel.historyItems = [];
    panel.historyLoading = true;
    expect(panel.canStart).toBe(false);
    expect(panel.hasNoValidAsins).toBe(true);
    expect(panel.startDisabled).toBe(true);
    expect(panel.hasTasks).toBe(false);
    expect(panel.hasSuccessfulTasks).toBe(false);
    expect(panel.taskProgressStyle).toBe('width: 0%');
    expect(panel.scrapingIconClass).toBe('fa-circle-notch fa-spin');
    expect(panel.scrapingButtonText).toBe('正在采集中...');
    expect(panel.showStartCount).toBe(false);
    expect(panel.showHistoryClear).toBe(false);
    expect(panel.showHistoryLoadingEmpty).toBe(true);
    panel.historyLoading = false;
    expect(panel.showHistoryEmpty).toBe(true);
    expect(panel.getDataTabIconWrapClass('json')).toBe('bg-slate-100');
    expect(panel.getDataTabIconClass('json')).toBe('text-slate-400');
  });

  it('reads proxy, preview, and store-backed state branches', () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.dataPreview = new scraperMocks.MockDataPreview();
    scraperMocks.appState.scraper.scrapedData = { products: [{ asin: 'B08N5WRWNW' }] };

    expect(panel.hasData).toBe(true);
    expect(panel.totalProducts).toBe(2);
    expect(panel.totalPages).toBe(3);
    expect(panel.paginatedProducts).toEqual([{ asin: 'B08N5WRWNW' }]);
    expect(panel.shouldUsePagination).toBe(true);
    expect(panel.currentPage).toBe(1);
    expect(panel.expandedAsin).toBeNull();

    scraperMocks.storageGet.mockReturnValueOnce({ type: 'custom_proxy', customUrl: 'http://proxy.test' });
    expect(panel.proxyConfigStatus).toEqual({
      name: 'HTTP 代理',
      ready: true,
      type: 'custom_proxy',
    });

    scraperMocks.storageGet.mockReturnValueOnce({ type: 'unknown' });
    expect(panel.proxyConfigStatus).toEqual({
      name: '自动',
      ready: false,
      type: 'unknown',
    });
  });

  it('restores, saves, switches, and renders preview state', () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.dataPreview = new scraperMocks.MockDataPreview();
    scraperMocks.appState.scraper.selectedSite = 'FR';
    scraperMocks.appState.scraper.inputAsins = 'B08N5WRWNW';

    panel.restoreState();
    expect(panel.selectedSite).toBe('FR');
    expect(panel.inputAsins).toBe('B08N5WRWNW');

    panel.selectSite('IT');
    panel.setInputAsins({ target: { value: 'B0ABCDEFGH' } } as unknown as Event);
    panel.switchDataTab('json');
    panel.toggleConfigExpanded();
    panel.toggleScrapeReviews();
    panel.saveState();

    expect(scraperMocks.appState.updateScraper).toHaveBeenCalled();
    expect(panel.currentDataTab).toBe('json');
    expect(panel.configChevronClass).toBe('rotate-180');
    expect(panel.scrapeReviewsToggleClass).toBe('');

    panel.updateDataPreview({ products: [] });
    expect(panel.dataPreview.updateData).toHaveBeenCalledWith({ products: [] });
    expect(panel.dataPreview.setupEventDelegation).toHaveBeenCalled();

    panel.toggleCardExpand('B08N5WRWNW');
    expect(panel.dataPreview.toggleCardExpand).toHaveBeenCalledWith('B08N5WRWNW');

    panel.goToPage(2);
    panel.previousPage();
    panel.nextPage();
    expect(panel.dataPreview.goToPage).toHaveBeenCalledWith(2);
    expect(panel.dataPreview.previousPage).toHaveBeenCalled();
    expect(panel.dataPreview.nextPage).toHaveBeenCalled();

    panel._isRendering = true;
    expect(() => panel.renderDataPanel()).not.toThrow();
    panel._isRendering = false;
    panel.dataPreview.renderDataPanel.mockImplementationOnce(() => {
      throw new Error('render failed');
    });
    expect(() => panel.renderDataPanel()).not.toThrow();

    panel.dataPreview = null;
    expect(() => panel.updateDataPreview(null)).not.toThrow();
    expect(() => panel.toggleCardExpand('B08N5WRWNW')).not.toThrow();
    expect(() => panel.goToPage(3)).not.toThrow();
    expect(() => panel.previousPage()).not.toThrow();
    expect(() => panel.nextPage()).not.toThrow();
    expect(() => panel.renderDataPanel()).not.toThrow();
  });

  it('initializes and cleans up history and event subscriptions', async () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.init();
    await vi.waitFor(() => {
      expect(panel.historyLoading).toBe(false);
    });

    expect(panel.dataPreview).not.toBeNull();
    expect(panel.historyPanel).not.toBeNull();
    expect(panel.historyItems.length).toBeGreaterThan(0);

    const loaded = await panel.loadHistoryItem(panel.historyItems[0]);
    expect(loaded).toBeUndefined();
    expect(scraperMocks.appState.updateScraper).toHaveBeenCalled();

    await expect(panel.deleteHistoryItem('hist-1')).resolves.toBe(true);
    await panel.clearAllHistory();
    await panel.loadAnalysisReport(panel.historyItems[0]);
    panel.destroy();

    expect(panel._unsubscribers).toEqual([]);
    expect(panel.dataPreview.cleanup).toHaveBeenCalled();
  });

  it('imports files, deletes data, and handles delete results', async () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.dataPreview = new scraperMocks.MockDataPreview();
    panel.historyPanel = new scraperMocks.MockHistoryPanel();
    const importedData = {
      metadata: { marketplace: 'UK' },
      products: [{ asin: 'B08N5WRWNW' }],
      reviews: [],
    };
    scraperMocks.handleImportFilesCore.mockResolvedValueOnce({ success: true, data: importedData });

    const input = document.createElement('input');
    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });
    input.value = 'C:\\fakepath\\data.json';

    await panel.handleImportFiles({ target: input } as unknown as Event);

    expect(scraperMocks.appState.setScrapedData).toHaveBeenCalledWith(importedData);
    expect(scraperMocks.appState.setAnalysisReport).toHaveBeenCalledWith(null);
    expect(scraperMocks.appState.setSelectedSite).toHaveBeenCalledWith('UK');
    expect(input.value).toBe('');

    await panel.deleteProduct('B08N5WRWNW');
    await panel.deleteReview('B08N5WRWNW', 0);

    expect(deleteProductCore).toHaveBeenCalled();
    expect(deleteReviewCore).toHaveBeenCalled();
    expect(scraperMocks.appState.setScrapedData).toHaveBeenCalledWith({ products: [] });

    panel.handleDeleteResult({ success: false });
    expect(panel.dataPreview.updateData).toHaveBeenCalled();
  });

  it('handles import/download edge branches without data changes', async () => {
    const panel = createScraperPanel() as ScraperPanel;
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [],
    });

    await panel.handleImportFiles({ target: input } as unknown as Event);
    expect(scraperMocks.handleImportFilesCore).not.toHaveBeenCalled();

    const fileInput = document.createElement('input');
    fileInput.id = 'import-file-input';
    fileInput.value = 'old';
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => undefined);
    document.body.appendChild(fileInput);
    panel.triggerImport();
    expect(fileInput.value).toBe('');
    expect(clickSpy).toHaveBeenCalled();
    fileInput.remove();
    expect(() => panel.triggerImport()).not.toThrow();

    const openSpy = vi.spyOn(window, 'open').mockReturnValueOnce(null);
    panel.downloadPlugin();
    expect(showToast).toHaveBeenCalledWith('请允许浏览器弹窗以打开下载页面', { type: 'warning' });

    openSpy.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    panel.downloadPlugin();
    expect(showToast).toHaveBeenCalledWith('打开下载页面失败', { type: 'error' });
    openSpy.mockRestore();
  });

  it('runs scrape success and failure paths', async () => {
    const panel = createScraperPanel() as ScraperPanel;
    panel.dataPreview = new scraperMocks.MockDataPreview();

    await panel.startScrape();
    expect(scraperMocks.startScrape).not.toHaveBeenCalled();

    panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';
    scraperMocks.startScrape.mockResolvedValueOnce([
      { asin: 'B08N5WRWNW', scrape_status: 'success' },
      { asin: 'B0ABCDEFGH', scrape_status: 'failed' },
    ]);
    scraperMocks.handleScrapeComplete.mockReturnValueOnce({
      metadata: { marketplace: 'DE' },
      products: [{ asin: 'B08N5WRWNW', scrape_status: 'success' }],
      reviews: [],
    });

    await panel.startScrape();

    expect(startScrape).toHaveBeenCalledWith(
      ['B08N5WRWNW', 'B0ABCDEFGH'],
      'DE',
      true,
      expect.any(Array),
      expect.any(Function),
    );
    expect(saveScrapeSnapshot).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('采集完成: 1 成功', { type: 'success' });
    expect(panel.isScraping).toBe(false);

    scraperMocks.startScrape.mockRejectedValueOnce(new Error('network'));
    scraperMocks.saveScrapeSnapshot.mockRejectedValueOnce(new Error('quota'));
    scraperMocks.handleScrapeComplete.mockReturnValueOnce({
      metadata: { marketplace: 'DE' },
      products: [],
      reviews: [],
    });

    await panel.startScrape();

    expect(ErrorService.handle).toHaveBeenCalledWith(expect.any(Error), {
      action: 'startScrape',
      module: 'scraper',
    });
    expect(showToast).toHaveBeenCalledWith('采集任务异常中断', { type: 'error' });
    expect(showToast).toHaveBeenCalledWith('采集完成，但全部失败', { type: 'error' });
  });
});
