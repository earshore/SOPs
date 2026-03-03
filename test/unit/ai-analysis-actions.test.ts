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
  toggleDataSource,
  copyPrompt,
  copyJson,
  copyMarkdown,
  downloadJson
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/components/actions';
import { AlpineContext } from '../../src/modules/app_center/views/master_analysis/ai_analysis/types';
import { ModuleState } from '../../src/modules/app_center/views/master_analysis/ai_analysis/state/moduleState';
import { Product } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/sampleData';

// Mock 依赖
vi.mock('@common/ui/index', () => ({
  showToast: vi.fn()
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/prompts/analysisPrompts', () => ({
  generateAnalysisPrompt: vi.fn(() => 'Mock prompt text')
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/services/reportGenerator', () => ({
  generateMarkdownReport: vi.fn(() => '# Mock Markdown Report'),
  generateJsonReportData: vi.fn(() => ({ mock: 'data' }))
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/utils/dataTransformers', () => ({
  mergeProducts: vi.fn((products: Product[]) => products[0])
}));

describe('actions - ASIN 选择操作', () => {
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
  
  describe('toggleAsin', () => {
    it('应该添加未选中的 ASIN', () => {
      toggleAsin(mockContext, mockModuleState, 'B001');
      
      expect(mockContext.selectedAsins).toContain('B001');
      expect(mockModuleState.selectedAsins).toContain('B001');
    });
    
    it('应该移除已选中的 ASIN', () => {
      mockContext.selectedAsins = ['B001', 'B002'];
      
      toggleAsin(mockContext, mockModuleState, 'B001');
      
      expect(mockContext.selectedAsins).not.toContain('B001');
      expect(mockContext.selectedAsins).toContain('B002');
    });
    
    it('应该同步状态到模块状态', () => {
      toggleAsin(mockContext, mockModuleState, 'B001');
      
      expect(mockModuleState.selectedAsins).toEqual(mockContext.selectedAsins);
    });
  });
  
  describe('selectAllAsins', () => {
    it('应该选中所有可用的 ASIN', () => {
      const availableAsins = ['B001', 'B002', 'B003'];
      
      selectAllAsins(mockContext, mockModuleState, availableAsins);
      
      expect(mockContext.selectedAsins).toEqual(availableAsins);
      expect(mockModuleState.selectedAsins).toEqual(availableAsins);
    });
    
    it('应该替换现有的选择', () => {
      mockContext.selectedAsins = ['B001'];
      const availableAsins = ['B002', 'B003'];
      
      selectAllAsins(mockContext, mockModuleState, availableAsins);
      
      expect(mockContext.selectedAsins).toEqual(availableAsins);
    });
  });
  
  describe('clearAllAsins', () => {
    it('应该清空所有选中的 ASIN', () => {
      mockContext.selectedAsins = ['B001', 'B002', 'B003'];
      
      clearAllAsins(mockContext, mockModuleState);
      
      expect(mockContext.selectedAsins).toEqual([]);
      expect(mockModuleState.selectedAsins).toEqual([]);
    });
  });
});

describe('actions - 分析目标选择操作', () => {
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
  
  describe('toggleTarget', () => {
    it('应该添加未选中的目标', () => {
      toggleTarget(mockContext, mockModuleState, 'target1');
      
      expect(mockContext.selectedTargets).toContain('target1');
      expect(mockModuleState.selectedTargets).toContain('target1');
    });
    
    it('应该移除已选中的目标', () => {
      mockContext.selectedTargets = ['target1', 'target2'];
      
      toggleTarget(mockContext, mockModuleState, 'target1');
      
      expect(mockContext.selectedTargets).not.toContain('target1');
      expect(mockContext.selectedTargets).toContain('target2');
    });
  });
  
  describe('selectAllTargets', () => {
    it('应该选中所有分析目标', () => {
      selectAllTargets(mockContext, mockModuleState);
      
      expect(mockContext.selectedTargets.length).toBeGreaterThan(0);
      expect(mockModuleState.selectedTargets).toEqual(mockContext.selectedTargets);
    });
  });
  
  describe('clearAllTargets', () => {
    it('应该清空所有选中的目标', () => {
      mockContext.selectedTargets = ['target1', 'target2'];
      
      clearAllTargets(mockContext, mockModuleState);
      
      expect(mockContext.selectedTargets).toEqual([]);
      expect(mockModuleState.selectedTargets).toEqual([]);
    });
  });
});

describe('actions - UI 面板切换操作', () => {
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
  
  describe('togglePromptPanel', () => {
    it('应该切换提示词面板显示状态', () => {
      expect(mockContext.showPromptPanel).toBe(false);
      
      togglePromptPanel(mockContext, mockModuleState);
      expect(mockContext.showPromptPanel).toBe(true);
      
      togglePromptPanel(mockContext, mockModuleState);
      expect(mockContext.showPromptPanel).toBe(false);
    });
    
    it('应该同步状态到模块状态', () => {
      togglePromptPanel(mockContext, mockModuleState);
      
      expect(mockModuleState.showPromptPanel).toBe(mockContext.showPromptPanel);
    });
  });
  
  describe('togglePromptItem', () => {
    it('应该展开指定的提示词项', () => {
      togglePromptItem(mockContext, mockModuleState, 0);
      
      expect(mockContext.expandedPromptIndex).toBe(0);
      expect(mockModuleState.expandedPromptIndex).toBe(0);
    });
    
    it('应该折叠已展开的提示词项', () => {
      mockContext.expandedPromptIndex = 0;
      
      togglePromptItem(mockContext, mockModuleState, 0);
      
      expect(mockContext.expandedPromptIndex).toBe(null);
    });
    
    it('应该切换到不同的提示词项', () => {
      mockContext.expandedPromptIndex = 0;
      
      togglePromptItem(mockContext, mockModuleState, 1);
      
      expect(mockContext.expandedPromptIndex).toBe(1);
    });
  });
  
  describe('toggleJsonViewer', () => {
    it('应该切换 JSON 查看器显示状态', () => {
      expect(mockContext.showJsonViewer).toBe(false);
      
      toggleJsonViewer(mockContext, mockModuleState);
      expect(mockContext.showJsonViewer).toBe(true);
      
      toggleJsonViewer(mockContext, mockModuleState);
      expect(mockContext.showJsonViewer).toBe(false);
    });
  });
  
  describe('toggleDataSource', () => {
    it('应该切换数据源模式', () => {
      expect(mockContext.useRealData).toBe(false);
      
      toggleDataSource(mockContext, mockModuleState);
      expect(mockContext.useRealData).toBe(true);
      
      toggleDataSource(mockContext, mockModuleState);
      expect(mockContext.useRealData).toBe(false);
    });
    
    it('应该清空之前的分析结果', () => {
      mockContext.results = [{ targetId: 'test' } as any];
      mockContext.analysisReport = { data: 'test' };
      
      toggleDataSource(mockContext, mockModuleState);
      
      expect(mockContext.results).toEqual([]);
      expect(mockContext.analysisReport).toBe(null);
      expect(mockModuleState.results).toEqual([]);
      expect(mockModuleState.analysisReport).toBe(null);
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
      useRealData: false,
      dataSource: 'scraper',
      showDataSourceBanner: false,
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
  
  describe('copyMarkdown', () => {
    it('应该复制 Markdown 报告', async () => {
      copyMarkdown(mockContext, 'US', '数据采集');
      
      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Mock Markdown Report');
      });
    });
    
    it('应该在没有结果时不执行复制', () => {
      mockContext.results = [];
      
      copyMarkdown(mockContext, 'US', '数据采集');
      
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
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
    
    it('应该在没有结果时不执行下载', () => {
      mockContext.results = [];
      
      downloadJson(mockContext, 'US');
      
      expect(mockCreateElement).not.toHaveBeenCalled();
    });
  });
});
