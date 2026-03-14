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
import { ModuleState } from '../../src/modules/app_center/views/master_analysis/ai_analysis/state/moduleState';

// Mock showToast
vi.mock('@common/ui/index', () => ({
  showToast: vi.fn()
}));

// Mock state - 使用 vi.hoisted 确保在模块加载前初始化
const mockState = vi.hoisted(() => ({
  scraper: undefined as any,
  analysis: {} as any
}));

vi.mock('@common/state', () => ({
  default: mockState
}));

describe('dataLoaders - checkAndLoadScraperData', () => {
  let mockContext: AlpineContext;
  let mockModuleState: ModuleState;
  
  beforeEach(() => {
    // 创建 mock 上下文
    mockContext = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false,
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
    
    // 创建 mock 模块状态
    mockModuleState = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false
    };
    
    // 重置 mock state
    mockState.scraper = undefined;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该在有 Scraper 数据时自动加载 ASIN', () => {
    // 设置 Scraper 数据
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
    
    mockState.scraper = { scrapedData };
    
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    // 验证 ASIN 已加载
    expect(mockContext.selectedAsins).toEqual(['B001', 'B002', 'B003']);
    expect(mockContext.dataSource).toBe('scraper');
    expect(mockModuleState.selectedAsins).toEqual(['B001', 'B002', 'B003']);
    expect(mockModuleState.dataSource).toBe('scraper');
  });
  
  it('应该过滤掉空的 ASIN', () => {
    const scrapedData: ScraperData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: '', title: 'Product 2' },
        { asin: 'B003', title: 'Product 3' },
        { title: 'Product 4' } // 没有 asin 字段
      ],
      metadata: {}
    };
    
    mockState.scraper = { scrapedData };
    
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    expect(mockContext.selectedAsins).toEqual(['B001', 'B003']);
  });
  
  it('应该在 ASIN 相同时不重复加载', () => {
    const scrapedData: ScraperData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' }
      ],
      metadata: {}
    };
    
    mockState.scraper = { scrapedData };
    mockContext.selectedAsins = ['B001', 'B002'];
    
    const originalAsins = mockContext.selectedAsins;
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    // ASIN 应该保持不变
    expect(mockContext.selectedAsins).toBe(originalAsins);
  });
  
  it('应该自动启用真实数据分析模式', () => {
    const scrapedData: ScraperData = {
      products: [{ asin: 'B001', title: 'Product 1' }],
      metadata: {}
    };
    
    mockState.scraper = { scrapedData };
    mockContext.useRealData = false;
    
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    expect(mockContext.useRealData).toBe(true);
    expect(mockModuleState.useRealData).toBe(true);
  });
  
  it('应该在没有 Scraper 数据时不做任何操作', () => {
    mockState.scraper = undefined;
    
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    expect(mockContext.selectedAsins).toEqual([]);
    expect(mockContext.dataSource).toBe('sample');
  });
  
  it('应该在 Scraper 数据为空时不做任何操作', () => {
    mockState.scraper = { scrapedData: { products: [] } };
    
    checkAndLoadScraperData(mockContext, mockModuleState);
    
    expect(mockContext.selectedAsins).toEqual([]);
  });
});

describe('dataLoaders - checkLoadedReport', () => {
  let mockContext: AlpineContext;
  let mockModuleState: ModuleState;
  
  beforeEach(() => {
    mockContext = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false,
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
    
    mockModuleState = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false
    };
    
    // 重置 mock state
    mockState.analysis = {};
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该加载有效的历史报告', () => {
    const mockReport = {
      results: [
        {
          targetId: 'target1',
          title: 'Test Result',
          source: 'Listings' as const,
          icon: 'icon',
          color: 'blue',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      targets: ['target1', 'target2'],
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    mockState.analysis = { analysisReport: mockReport };
    
    checkLoadedReport(mockContext, mockModuleState);
    
    expect(mockContext.results).toEqual(mockReport.results);
    expect(mockContext.selectedTargets).toEqual(mockReport.targets);
    expect(mockContext.analysisReport).toEqual(mockReport);
  });
  
  it('应该在报告为 null 时不做任何操作', () => {
    mockState.analysis = { analysisReport: null };
    
    checkLoadedReport(mockContext, mockModuleState);
    
    expect(mockContext.results).toEqual([]);
    expect(mockContext.selectedTargets).toEqual([]);
  });
  
  it('应该在报告为字符串时不做任何操作', () => {
    mockState.analysis = { analysisReport: 'invalid report' };
    
    checkLoadedReport(mockContext, mockModuleState);
    
    expect(mockContext.results).toEqual([]);
  });
  
  it('应该在报告没有 results 字段时不做任何操作', () => {
    mockState.analysis = {
      analysisReport: {
        targets: ['target1'],
        timestamp: '2024-01-01T00:00:00Z'
      }
    };
    
    checkLoadedReport(mockContext, mockModuleState);
    
    expect(mockContext.results).toEqual([]);
  });
  
  it('应该在报告 results 不是数组时不做任何操作', () => {
    mockState.analysis = {
      analysisReport: {
        results: 'not an array',
        targets: ['target1']
      }
    };
    
    checkLoadedReport(mockContext, mockModuleState);
    
    expect(mockContext.results).toEqual([]);
  });
});

describe('dataLoaders - loadHistoricalReport', () => {
  let mockContext: AlpineContext;
  let mockModuleState: ModuleState;
  
  beforeEach(() => {
    mockContext = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false,
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
    
    mockModuleState = {
      selectedAsins: [],
      selectedTargets: [],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [],
      analysisReport: null,
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      useRealData: false,
      dataSource: 'sample',
      showDataSourceBanner: false
    };
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该成功加载历史报告', () => {
    const mockReport = {
      results: [
        {
          targetId: 'target1',
          title: 'Historical Result',
          source: 'Reviews' as const,
          icon: 'icon',
          color: 'red',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      targets: ['target1', 'target2', 'target3'],
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    const detail: HistoricalReportDetail = {
      report: mockReport,
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    loadHistoricalReport(mockContext, mockModuleState, detail);
    
    expect(mockContext.results).toEqual(mockReport.results);
    expect(mockContext.selectedTargets).toEqual(mockReport.targets);
    expect(mockContext.analysisReport).toEqual(mockReport);
    expect(mockModuleState.results).toEqual(mockReport.results);
    expect(mockModuleState.selectedTargets).toEqual(mockReport.targets);
  });
  
  it('应该处理空的 results 数组', () => {
    const mockReport = {
      results: [],
      targets: ['target1'],
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    const detail: HistoricalReportDetail = {
      report: mockReport,
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    loadHistoricalReport(mockContext, mockModuleState, detail);
    
    expect(mockContext.results).toEqual([]);
    expect(mockContext.selectedTargets).toEqual(['target1']);
  });
  
  it('应该处理缺少 targets 字段的报告', () => {
    const mockReport = {
      results: [
        {
          targetId: 'target1',
          title: 'Test',
          source: 'Listings' as const,
          icon: 'icon',
          color: 'blue',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    const detail: HistoricalReportDetail = {
      report: mockReport,
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    loadHistoricalReport(mockContext, mockModuleState, detail);
    
    expect(mockContext.results).toEqual(mockReport.results);
    expect(mockContext.selectedTargets).toEqual([]);
  });
  
  it('应该在 detail 为 null 时不抛出错误', () => {
    expect(() => {
      loadHistoricalReport(mockContext, mockModuleState, null as any);
    }).not.toThrow();
    
    expect(mockContext.results).toEqual([]);
  });
  
  it('应该在 detail.report 为 null 时不抛出错误', () => {
    const detail: HistoricalReportDetail = {
      report: null,
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    expect(() => {
      loadHistoricalReport(mockContext, mockModuleState, detail);
    }).not.toThrow();
    
    expect(mockContext.results).toEqual([]);
  });
  
  it('应该在报告数据格式错误时捕获异常', () => {
    const detail: HistoricalReportDetail = {
      report: 'invalid data',
      timestamp: '2024-01-01T00:00:00Z'
    };
    
    // 应该不抛出错误
    expect(() => {
      loadHistoricalReport(mockContext, mockModuleState, detail);
    }).not.toThrow();
  });
});
