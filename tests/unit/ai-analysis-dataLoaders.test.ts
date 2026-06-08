/**
 * AI 分析模块 - dataLoaders 单元测试
 *
 * 测试数据加载器的功能：
 * - checkAndLoadScraperData: 检查并加载 Scraper 数据
 * - checkLoadedReport: 检查已加载的历史报告
 * - loadHistoricalReport: 加载历史分析报告
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkAndLoadScraperData,
  checkLoadedReport,
  loadHistoricalReport
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders';
import { AlpineContext, ScraperData, HistoricalReportDetail } from '../../src/modules/app_center/views/master_analysis/ai_analysis/types';

const mockAppStoreState = vi.hoisted(() => ({
  scraper: undefined as any,
  analysis: {} as any,
  setSelectedAsins: vi.fn(),
  setAnalysisReport: vi.fn()
}));

// Mock showToast
vi.mock('@common/ui/index', () => ({
  showToast: vi.fn()
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mockAppStoreState
  }
}));

function createContext(overrides: Partial<AlpineContext> = {}): AlpineContext {
  return {
    selectedAsins: [],
    selectedTargets: [],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    analysisReport: null,
    hasReport: false,
    expandedPromptIndex: null,
    showPromptPanel: false,
    showJsonViewer: false,
    dataSource: 'scraper',
    availableAsins: [],
    hasData: false,
    canAnalyze: false,
    $nextTick: vi.fn((cb) => cb()),
    _unsubscribes: [],
    ...overrides
  } as AlpineContext;
}

describe('dataLoaders - checkAndLoadScraperData', () => {
  let mockContext: AlpineContext;

  beforeEach(() => {
    mockContext = createContext();
    mockAppStoreState.scraper = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该在有 Scraper 数据时自动加载 ASIN', () => {
    const scrapedData: ScraperData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' },
        { asin: 'B003', title: 'Product 3' }
      ],
      metadata: {
        marketplace: 'US',
        scrape_timestamp: '2024-01-01T00:00:00Z'
      }
    };

    mockAppStoreState.scraper = { scrapedData };

    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toEqual(['B001', 'B002', 'B003']);
    expect(mockContext.dataSource).toBe('scraper');
    expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(['B001', 'B002', 'B003']);
  });

  it('应该过滤掉空的 ASIN', () => {
    const scrapedData: ScraperData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: '', title: 'Product 2' },
        { asin: 'B003', title: 'Product 3' },
        { title: 'Product 4' } as any
      ],
      metadata: {}
    };

    mockAppStoreState.scraper = { scrapedData };

    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toEqual(['B001', 'B003']);
    expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(['B001', 'B003']);
  });

  it('应该在 ASIN 相同时不重复加载', () => {
    const scrapedData: ScraperData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' }
      ],
      metadata: {}
    };

    mockAppStoreState.scraper = { scrapedData };
    mockContext.selectedAsins = ['B001', 'B002'];

    const originalAsins = mockContext.selectedAsins;
    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toBe(originalAsins);
    expect(mockAppStoreState.setSelectedAsins).not.toHaveBeenCalled();
  });

  it('应该在没有 Scraper 数据时不做任何操作', () => {
    mockAppStoreState.scraper = undefined;

    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toEqual([]);
    expect(mockContext.dataSource).toBe('scraper');
    expect(mockAppStoreState.setSelectedAsins).not.toHaveBeenCalled();
  });

  it('应该在 Scraper 数据为空时不做任何操作', () => {
    mockAppStoreState.scraper = { scrapedData: { products: [] } };

    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toEqual([]);
    expect(mockAppStoreState.setSelectedAsins).not.toHaveBeenCalled();
  });

  it('应该在产品为空时清理过期 ASIN', () => {
    mockAppStoreState.scraper = { scrapedData: { products: [] } };
    mockContext.dataSource = 'scraper';
    mockContext.selectedAsins = ['B001'];

    checkAndLoadScraperData(mockContext);

    expect(mockContext.selectedAsins).toEqual([]);
    expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith([]);
  });

  it('应该在产品为空时清理过期分析报告', () => {
    const staleReport = { 'title-keywords': { title: 'Old Report' } };
    mockAppStoreState.scraper = { scrapedData: { products: [] } };
    mockAppStoreState.analysis = { analysisReport: staleReport };
    mockContext.dataSource = 'scraper';
    mockContext.analysisReport = staleReport;
    mockContext.hasReport = true;

    checkAndLoadScraperData(mockContext);

    expect(mockContext.analysisReport).toBe(null);
    expect(mockContext.hasReport).toBe(false);
    expect(mockAppStoreState.setAnalysisReport).toHaveBeenCalledWith(null);
  });
});

describe('dataLoaders - checkLoadedReport', () => {
  let mockContext: AlpineContext;

  beforeEach(() => {
    mockContext = createContext();
    mockAppStoreState.analysis = {};
    mockAppStoreState.scraper = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该加载有效的历史报告', () => {
    const mockReport = {
      'title-keywords': {
        title: 'Test Result'
      }
    };

    mockAppStoreState.scraper = {
      scrapedData: {
        products: [{ asin: 'B001', title: 'Product 1' }]
      }
    };
    mockAppStoreState.analysis = { analysisReport: mockReport };

    checkLoadedReport(mockContext);

    expect(mockContext.analysisReport).toEqual(mockReport);
    expect(mockContext.hasReport).toBe(true);
  });

  it('应该在当前产品数据为空时不加载历史报告', () => {
    const mockReport = {
      'title-keywords': {
        title: 'Test Result'
      }
    };

    mockAppStoreState.scraper = { scrapedData: { products: [] } };
    mockAppStoreState.analysis = { analysisReport: mockReport };

    checkLoadedReport(mockContext);

    expect(mockContext.analysisReport).toBe(null);
    expect(mockContext.hasReport).toBe(false);
  });

  it('应该在报告为 null 时不做任何操作', () => {
    mockAppStoreState.analysis = { analysisReport: null };

    checkLoadedReport(mockContext);

    expect(mockContext.analysisReport).toBe(null);
    expect(mockContext.hasReport).toBe(false);
  });

  it('应该在报告为字符串时不做任何操作', () => {
    mockAppStoreState.analysis = { analysisReport: 'invalid report' };

    checkLoadedReport(mockContext);

    expect(mockContext.analysisReport).toBe(null);
  });

  it('应该在报告不包含分析目标字段时不做任何操作', () => {
    mockAppStoreState.analysis = {
      analysisReport: {
        targets: ['target1'],
        timestamp: '2024-01-01T00:00:00Z'
      }
    };

    checkLoadedReport(mockContext);

    expect(mockContext.analysisReport).toBe(null);
    expect(mockContext.hasReport).toBe(false);
  });
});

describe('dataLoaders - loadHistoricalReport', () => {
  let mockContext: AlpineContext;

  beforeEach(() => {
    mockContext = createContext();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功加载历史报告', () => {
    const mockReport = {
      'selling-points': {
        title: 'Historical Result'
      }
    };

    const detail: HistoricalReportDetail = {
      report: mockReport,
      timestamp: '2024-01-01T00:00:00Z'
    };

    loadHistoricalReport(mockContext, detail);

    expect(mockContext.analysisReport).toEqual(mockReport);
    expect(mockContext.hasReport).toBe(true);
    expect(mockAppStoreState.setAnalysisReport).toHaveBeenCalledWith(mockReport);
  });

  it('应该按原始历史报告加载未知格式数据', () => {
    const detail: HistoricalReportDetail = {
      report: 'invalid data',
      timestamp: '2024-01-01T00:00:00Z'
    };

    loadHistoricalReport(mockContext, detail);

    expect(mockContext.analysisReport).toBe('invalid data');
    expect(mockContext.hasReport).toBe(true);
    expect(mockAppStoreState.setAnalysisReport).toHaveBeenCalledWith('invalid data');
  });

  it('应该在 detail 为 null 时不抛出错误', () => {
    expect(() => {
      loadHistoricalReport(mockContext, null as any);
    }).not.toThrow();

    expect(mockContext.analysisReport).toBe(null);
    expect(mockAppStoreState.setAnalysisReport).not.toHaveBeenCalled();
  });

  it('应该在 detail.report 为 null 时不抛出错误', () => {
    const detail: HistoricalReportDetail = {
      report: null,
      timestamp: '2024-01-01T00:00:00Z'
    };

    expect(() => {
      loadHistoricalReport(mockContext, detail);
    }).not.toThrow();

    expect(mockContext.analysisReport).toBe(null);
    expect(mockAppStoreState.setAnalysisReport).not.toHaveBeenCalled();
  });
});
