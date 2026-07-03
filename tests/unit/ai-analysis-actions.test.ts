/**
 * AI 分析模块 - actions 单元测试
 * 
 * 测试用户动作处理函数：
 * - toggleAsin: 切换 ASIN 选择
 * - selectAllAsins/clearAllAsins: 全选/清空 ASIN
 * - toggleTarget: 切换分析目标
 * - selectAllTargets/clearAllTargets: 全选/清空分析目标
 * - togglePromptPanel/toggleJsonViewer: 切换面板显示
 * - copyPrompt/copyJson/copyMarkdown: 复制功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  toggleAsin,
  selectAllAsins,
  clearAllAsins,
  toggleTarget,
  selectAllTargets,
  clearAllTargets,
  togglePromptPanel,
  togglePromptItem,
  toggleJsonViewer,
  copyPrompt,
  copyJson,
  copyMarkdown,
  downloadJson,
  runAnalysisAction
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/components/actions';
import { AlpineContext } from '../../src/modules/app_center/views/master_analysis/ai_analysis/types';
import type { Product } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/sampleData';

// Mock 依赖
vi.mock('@common/ui/index', () => ({
  showToast: vi.fn()
}));

const mockAppStoreState = vi.hoisted(() => ({
  setSelectedAsins: vi.fn(),
  setAnalysisReport: vi.fn(),
  updateAnalysis: vi.fn(),
  scraper: undefined as any
}));

const mockRunParallelAIAnalysis = vi.hoisted(() => vi.fn());
const mockGetCachedAnalysisResults = vi.hoisted(() => vi.fn());
const mockResolveAnalysisSchedulePlan = vi.hoisted(() => vi.fn());

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mockAppStoreState
  }
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/prompts/analysisPrompts', () => ({
  generateAnalysisPrompt: vi.fn(() => 'Mock prompt text')
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/services/reportGenerator', () => ({
  generateMarkdownReport: vi.fn(() => '# Mock Markdown Report'),
  generateJsonReportData: vi.fn(() => ({ mock: 'data' }))
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/utils/dataTransformers', () => ({
  mergeProducts: vi.fn((products: Product[]) => products[0]),
  getProductsByAsins: vi.fn((_scrapedData, _asins) => [
    {
      asin: 'B001',
      title: 'Test Product',
      bulletPoints: ['Feature 1'],
      reviews: []
    }
  ])
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService', () => ({
  getCachedAnalysisResults: mockGetCachedAnalysisResults,
  runParallelAIAnalysis: mockRunParallelAIAnalysis
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/services/analysisScheduler', () => ({
  resolveAnalysisSchedulePlan: mockResolveAnalysisSchedulePlan
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/components/PerformanceSettings', () => ({
  getPerformanceSettings: vi.fn(() => ({
    schedulingPreference: 'reliability',
    maxConcurrency: 2,
    enableCache: true,
    failureStrategy: 'continue'
  }))
}));

describe('actions - ASIN 选择操作', () => {
  let mockContext: AlpineContext;
  
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
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('toggleAsin', () => {
    it('应该添加未选中的 ASIN', () => {
      toggleAsin(mockContext, 'B001');
      
      expect(mockContext.selectedAsins).toContain('B001');
      expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(['B001']);
    });
    
    it('应该移除已选中的 ASIN', () => {
      mockContext.selectedAsins = ['B001', 'B002'];
      
      toggleAsin(mockContext, 'B001');
      
      expect(mockContext.selectedAsins).not.toContain('B001');
      expect(mockContext.selectedAsins).toContain('B002');
      expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(['B002']);
    });
    
    it('应该同步状态到应用 store', () => {
      toggleAsin(mockContext, 'B001');
      
      expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(mockContext.selectedAsins);
    });
  });
  
  describe('selectAllAsins', () => {
    it('应该选中所有可用的 ASIN', () => {
      const availableAsins = ['B001', 'B002', 'B003'];
      
      selectAllAsins(mockContext, availableAsins);
      
      expect(mockContext.selectedAsins).toEqual(availableAsins);
      expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith(availableAsins);
    });
    
    it('应该替换现有的选择', () => {
      mockContext.selectedAsins = ['B001'];
      const availableAsins = ['B002', 'B003'];
      
      selectAllAsins(mockContext, availableAsins);
      
      expect(mockContext.selectedAsins).toEqual(availableAsins);
    });
  });
  
  describe('clearAllAsins', () => {
    it('应该清空所有选中的 ASIN', () => {
      mockContext.selectedAsins = ['B001', 'B002', 'B003'];
      
      clearAllAsins(mockContext);
      
      expect(mockContext.selectedAsins).toEqual([]);
      expect(mockAppStoreState.setSelectedAsins).toHaveBeenCalledWith([]);
    });
  });
});

describe('actions - 分析目标选择操作', () => {
  let mockContext: AlpineContext;
  
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
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('toggleTarget', () => {
    it('应该添加未选中的目标', () => {
      toggleTarget(mockContext, 'target1');
      
      expect(mockContext.selectedTargets).toContain('target1');
    });
    
    it('应该移除已选中的目标', () => {
      mockContext.selectedTargets = ['target1', 'target2'];
      
      toggleTarget(mockContext, 'target1');
      
      expect(mockContext.selectedTargets).not.toContain('target1');
      expect(mockContext.selectedTargets).toContain('target2');
    });
  });
  
  describe('selectAllTargets', () => {
    it('应该选中所有分析目标', () => {
      selectAllTargets(mockContext);
      
      expect(mockContext.selectedTargets.length).toBeGreaterThan(0);
    });
  });
  
  describe('clearAllTargets', () => {
    it('应该清空所有选中的目标', () => {
      mockContext.selectedTargets = ['target1', 'target2'];
      
      clearAllTargets(mockContext);
      
      expect(mockContext.selectedTargets).toEqual([]);
    });
  });
});

describe('actions - UI 面板切换操作', () => {
  let mockContext: AlpineContext;
  
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
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('togglePromptPanel', () => {
    it('应该切换提示词面板显示状态', () => {
      expect(mockContext.showPromptPanel).toBe(false);
      
      togglePromptPanel(mockContext);
      expect(mockContext.showPromptPanel).toBe(true);
      
      togglePromptPanel(mockContext);
      expect(mockContext.showPromptPanel).toBe(false);
    });
    
    it('应该只更新当前上下文状态', () => {
      togglePromptPanel(mockContext);

      expect(mockContext.showPromptPanel).toBe(true);
    });
  });
  
  describe('togglePromptItem', () => {
    it('应该展开指定的提示词项', () => {
      togglePromptItem(mockContext, 0);
      
      expect(mockContext.expandedPromptIndex).toBe(0);
    });
    
    it('应该折叠已展开的提示词项', () => {
      mockContext.expandedPromptIndex = 0;
      
      togglePromptItem(mockContext, 0);
      
      expect(mockContext.expandedPromptIndex).toBe(null);
    });
    
    it('应该切换到不同的提示词项', () => {
      mockContext.expandedPromptIndex = 0;
      
      togglePromptItem(mockContext, 1);
      
      expect(mockContext.expandedPromptIndex).toBe(1);
    });
  });
  
  describe('toggleJsonViewer', () => {
    it('应该切换 JSON 查看器显示状态', () => {
      expect(mockContext.showJsonViewer).toBe(false);
      
      toggleJsonViewer(mockContext);
      expect(mockContext.showJsonViewer).toBe(true);
      
      toggleJsonViewer(mockContext);
      expect(mockContext.showJsonViewer).toBe(false);
    });
  });
  
});

describe('actions - 复制操作', () => {
  let mockContext: AlpineContext;
  let mockProducts: Product[];
  
  beforeEach(() => {
    mockContext = {
      selectedAsins: ['B001'],
      selectedTargets: ['target1', 'target2'],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [
        {
          targetId: 'target1',
          title: 'Test Result',
          source: 'Listings',
          icon: 'icon',
          color: 'blue',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      analysisReport: { data: 'test' },
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
    
    mockProducts = [
      {
        asin: 'B001',
        title: 'Test Product',
        bulletPoints: ['Feature 1'],
        reviews: []
      }
    ];
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('copyPrompt', () => {
    it('应该复制指定索引的提示词', async () => {
      copyPrompt(mockContext, mockProducts, 0);
      
      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Mock prompt text');
      });
    });
    
    it('应该在没有产品时不执行复制', () => {
      copyPrompt(mockContext, [], 0);
      
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
    
    it('应该在索引无效时不执行复制', () => {
      copyPrompt(mockContext, mockProducts, 999);
      
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });
  
  describe('copyJson', () => {
    it('应该复制 JSON 报告', async () => {
      copyJson(mockContext, 'US');
      
      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        const callArg = (navigator.clipboard.writeText as any).mock.calls[0][0];
        expect(callArg).toContain('"mock"');
      });
    });
    
    it('应该在没有报告时不执行复制', () => {
      mockContext.analysisReport = null;
      
      copyJson(mockContext, 'US');
      
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });
});

describe('actions - Markdown 复制操作', () => {
  let mockContext: AlpineContext;

  beforeEach(() => {
    mockContext = {
      selectedAsins: ['B001'],
      selectedTargets: ['target1', 'target2'],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [
        {
          targetId: 'target1',
          title: 'Test Result',
          source: 'Listings',
          icon: 'icon',
          color: 'blue',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      analysisReport: { data: 'test' },
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('copyMarkdown', () => {
    it('应该复制 Markdown 报告', async () => {
      copyMarkdown(mockContext, 'US', '数据采集');
      
      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Mock Markdown Report');
      });
    });
    
    it('应该在没有报告时不执行复制', () => {
      mockContext.analysisReport = null;
      
      copyMarkdown(mockContext, 'US', '数据采集');
      
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });
});

describe('actions - 下载操作', () => {
  let mockContext: AlpineContext;

  beforeEach(() => {
    mockContext = {
      selectedAsins: ['B001'],
      selectedTargets: ['target1', 'target2'],
      isAnalyzing: false,
      progress: 0,
      currentStep: '',
      results: [
        {
          targetId: 'target1',
          title: 'Test Result',
          source: 'Listings',
          icon: 'icon',
          color: 'blue',
          stats: [],
          highlights: [],
          details: []
        }
      ],
      analysisReport: { data: 'test' },
      expandedPromptIndex: null,
      showPromptPanel: false,
      showJsonViewer: false,
      dataSource: 'scraper',
      availableAsins: [],
      hasData: false,
      canAnalyze: false,
      syncFromModuleState: vi.fn(),
      syncToModuleState: vi.fn(),
      $nextTick: vi.fn((cb) => cb())
    } as AlpineContext;
  });
  
  describe('downloadJson', () => {
    let mockCreateElement: any;
    let mockAppendChild: any;
    let mockRemoveChild: any;
    
    beforeEach(() => {
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
      
      // Mock URL API
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });
    
    afterEach(() => {
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      vi.clearAllMocks();
    });
    
    it('应该下载 JSON 报告', () => {
      downloadJson(mockContext, 'US');
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
    
    it('应该在没有报告时不执行下载', () => {
      mockContext.analysisReport = null;
      
      downloadJson(mockContext, 'US');
      
      expect(mockCreateElement).not.toHaveBeenCalled();
    });
  });
});

function createRunAnalysisActionTestState(): { mockContext: AlpineContext; mockProducts: Product[] } {
  const mockContext = {
    selectedAsins: ['B001'],
    selectedTargets: ['selling-points'],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    analysisReport: null,
    hasReport: false,
    reportResults: [],
    reportListingsResults: [],
    reportReviewsResults: [],
    reportTotalHighlights: 0,
    reportTotalDetails: 0,
    reportFullData: null,
    reportRenderVersion: 0,
    expandedPromptIndex: null,
    showPromptPanel: false,
    showJsonViewer: false,
    dataSource: 'scraper',
    availableAsins: ['B001'],
    hasData: true,
    canAnalyze: true,
    $nextTick: vi.fn((cb) => cb()),
    _unsubscribes: []
  } as AlpineContext;

  const mockProducts = [
    {
      asin: 'B001',
      title: 'Test Product',
      bulletPoints: ['Feature 1'],
      reviews: []
    }
  ];

  mockAppStoreState.scraper = {
    scrapedData: { products: mockProducts },
    currentHistoryId: null
  };
  mockGetCachedAnalysisResults.mockResolvedValue({
    'selling-points': { details: [] }
  });
  mockResolveAnalysisSchedulePlan.mockReturnValue({
    taskOrder: ['selling-points'],
    maxConcurrency: 1,
    failureStrategy: 'abort',
    retryBudget: 2,
    failureMode: 'complete_required',
    streamMode: 'final_only'
  });
  mockRunParallelAIAnalysis.mockImplementation(async (_targets, _product, onProgress, _language, options) => {
    const partialReport = { 'selling-points': { details: [] } };
    onProgress(45, '正在分析: selling-points...');
    options.onTaskComplete?.({ report: partialReport });
    return partialReport;
  });

  return { mockContext, mockProducts };
}

describe('actions - 执行分析', () => {

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该把分析进度和当前步骤同步到应用 store', async () => {
    const { mockContext, mockProducts } = createRunAnalysisActionTestState();

    await runAnalysisAction(mockContext, mockProducts);

    expect(mockAppStoreState.updateAnalysis).toHaveBeenCalledWith({
      progress: 0,
      currentStep: '正在准备分析...'
    });
    expect(mockAppStoreState.updateAnalysis).toHaveBeenCalledWith({
      progress: 45,
      currentStep: '正在分析: selling-points...'
    });
    expect(mockAppStoreState.updateAnalysis).toHaveBeenCalledWith({
      progress: 100,
      currentStep: '分析完成'
    });
    expect(mockAppStoreState.updateAnalysis).toHaveBeenCalledWith({ isAnalyzing: false });
    expect(mockContext.progress).toBe(100);
    expect(mockContext.currentStep).toBe('分析完成');
  });

  it('应该使用调度计划执行分析', async () => {
    const { mockContext, mockProducts } = createRunAnalysisActionTestState();

    await runAnalysisAction(mockContext, mockProducts);

    expect(mockGetCachedAnalysisResults).toHaveBeenCalledWith(
      ['selling-points'],
      expect.objectContaining({ asin: 'B001' }),
      expect.any(String),
      true
    );
    expect(mockResolveAnalysisSchedulePlan).toHaveBeenCalledWith(expect.objectContaining({
      preference: 'reliability',
      targetIds: ['selling-points'],
      cachedTargetIds: ['selling-points'],
      enableCache: true
    }));
    expect(mockRunParallelAIAnalysis).toHaveBeenCalledWith(
      ['selling-points'],
      expect.objectContaining({ asin: 'B001' }),
      expect.any(Function),
      expect.any(String),
      expect.objectContaining({
        maxConcurrency: 1,
        enableCache: true,
        streamResults: false,
        failureStrategy: 'abort',
        preloadedCachedResults: {
          'selling-points': { details: [] }
        },
        retryBudget: 2,
        stopOnFailure: true,
        onTaskComplete: undefined
      })
    );
  });
});
