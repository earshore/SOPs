/**
 * scraper-historyPanel.test.ts - HistoryPanel 组件单元测试
 * 测试历史记录加载、删除、清空等功能
 * 
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryPanel } from '@/modules/app_center/views/master_analysis/scraper/components/HistoryPanel';
import type { HistoryItem } from '@/types/modules-business';

// Mock dependencies - 使用工厂函数避免初始化顺序问题
vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    save: vi.fn(),
    getAll: vi.fn(() => []),
    getAllAsync: vi.fn(async () => []),
    deleteByIdAsync: vi.fn(async () => true),
    clear: vi.fn(),
    clearAsync: vi.fn(async () => undefined),
    updateSnapshotDataAsync: vi.fn(async () => true)
  }
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    setScrapeHistory: vi.fn()
  }
}));

vi.mock('@/common/ui', () => ({
  showToast: vi.fn()
}));

vi.mock('@/common/EventBus', () => ({
  default: {
    emit: vi.fn()
  }
}));

vi.mock('@/common/state', () => ({
  default: {
    scraper: {
      currentHistoryId: null,
      scrapedData: null,
      selectedSite: 'DE'
    },
    analysis: {
      analysisReport: null,
      translatedReport: null
    }
  }
}));

vi.mock('@/common/constants/constants', () => ({
  LANGUAGE_HEADERS: {
    DE: { domain: 'amazon.de', name: 'German' },
    FR: { domain: 'amazon.fr', name: 'French' },
    UK: { domain: 'amazon.co.uk', name: 'English (UK)' }
  }
}));

vi.mock('@/common/constants/eventConstants', () => ({
  APP_EVENTS: {
    HISTORY_UPDATED: 'history-updated'
  },
  MODULE_EVENTS: {
    SCRAPER: {
      SCRAPE_SUCCESS: 'scraper:scrape-success'
    }
  },
  emitAppEvent: vi.fn()
}));

  let historyPanel: HistoryPanel;
  let mockHistory: HistoryItem[];
  let mockHistoryService: any;
  let mockStorageService: any;
  let mockShowToast: any;
  let mockEventBus: any;
  let mockState: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 获取 mock 的模块
    const historyServiceModule = await import('@/modules/app_center/views/master_analysis/services/historyService');
    const storageServiceModule = await import('@/services/storageService');
    const uiModule = await import('@/common/ui');
    const eventBusModule = await import('@/common/EventBus');
    const stateModule = await import('@/common/state');

    mockHistoryService = historyServiceModule.HistoryService;
    mockStorageService = storageServiceModule.StorageService;
    mockShowToast = uiModule.showToast;
    mockEventBus = eventBusModule.default;
    mockState = stateModule.default;

    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    // Mock window.switchTab
    (global as any).switchTab = vi.fn();

    mockHistory = [
      {
        id: 'hist-001',
        timestamp: '2024-01-01T10:00:00Z',
        site: 'DE',
        asins: ['B08N5WRWNW', 'B0ABCDEFGH'],
        data: {
          metadata: {
            scrape_timestamp: '2024-01-01T10:00:00Z',
            marketplace: 'DE',
            domain: 'amazon.de',
            language: 'German',
            total_asins: 2
          },
          products: [
            {
              asin: 'B08N5WRWNW',
              url: '',
              language: '',
              productTitle: 'Product 1',
              feature_bullets: [],
              customer_reviews: [],
              scrape_status: 'success'
            }
          ]
        }
      },
      {
        id: 'hist-002',
        timestamp: '2024-01-02T10:00:00Z',
        site: 'FR',
        asins: ['B012345678'],
        data: {
          metadata: {
            scrape_timestamp: '2024-01-02T10:00:00Z',
            marketplace: 'FR',
            domain: 'amazon.fr',
            language: 'French',
            total_asins: 1
          },
          products: [
            {
              asin: 'B012345678',
              url: '',
              language: '',
              productTitle: 'Product 2',
              feature_bullets: [],
              customer_reviews: [],
              scrape_status: 'success'
            }
          ]
        }
      }
    ];

    mockHistoryService.getAll.mockReturnValue(mockHistory);
    historyPanel = new HistoryPanel();
  });

  describe('构造函数和初始化', () => {
    it('应该在构造时加载历史记录', () => {
      expect(mockHistoryService.getAll).toHaveBeenCalled();
      expect(historyPanel.getHistory()).toEqual(mockHistory);
    });

    it('应该处理空历史记录', () => {
      mockHistoryService.getAll.mockReturnValue([]);
      const emptyPanel = new HistoryPanel();

      expect(emptyPanel.getHistory()).toEqual([]);
    });
  });

  describe('loadHistory - 加载历史记录', () => {
    it('应该重新加载历史记录', () => {
      const newHistory: HistoryItem[] = [
        {
          id: 'hist-003',
          timestamp: '2024-01-03T10:00:00Z',
          site: 'UK',
          asins: ['B0NEWPROD1'],
          data: {
            metadata: {
              scrape_timestamp: '2024-01-03T10:00:00Z',
              marketplace: 'UK',
              domain: 'amazon.co.uk',
              language: 'English (UK)',
              total_asins: 1
            },
            products: []
          }
        }
      ];

      mockHistoryService.getAll.mockReturnValue(newHistory);
      historyPanel.loadHistory();

      expect(historyPanel.getHistory()).toEqual(newHistory);
    });

    it('应该调用 HistoryService.getAll', () => {
      mockHistoryService.getAll.mockClear();
      historyPanel.loadHistory();

      expect(mockHistoryService.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistory - 获取历史记录', () => {
    it('应该返回当前历史记录列表', () => {
      const history = historyPanel.getHistory();

      expect(history).toEqual(mockHistory);
      expect(history).toHaveLength(2);
    });

    it('应该返回历史记录的引用', () => {
      const history1 = historyPanel.getHistory();
      const history2 = historyPanel.getHistory();

      expect(history1).toBe(history2);
    });
  });

  describe('deleteHistoryItem - 删除历史记录项', () => {
    it('应该删除指定的历史记录', () => {
      historyPanel.deleteHistoryItem('hist-001');

      expect(mockStorageService.setScrapeHistory).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'hist-002' })
        ])
      );
    });

    it('应该在删除后重新加载历史', () => {
      const loadSpy = vi.spyOn(historyPanel, 'loadHistory');
      historyPanel.deleteHistoryItem('hist-001');

      expect(loadSpy).toHaveBeenCalled();
    });

    it('应该显示成功提示', () => {
      historyPanel.deleteHistoryItem('hist-001');

      expect(mockShowToast).toHaveBeenCalledWith('记录已删除', 'success');
    });

    it('应该在用户取消时不删除', () => {
      global.confirm = vi.fn(() => false);

      historyPanel.deleteHistoryItem('hist-001');

      expect(mockStorageService.setScrapeHistory).not.toHaveBeenCalled();
    });

    it('应该处理不存在的 ID', () => {
      historyPanel.deleteHistoryItem('non-existent');

      // 应该过滤掉不存在的项（实际上没有变化）
      expect(mockStorageService.setScrapeHistory).toHaveBeenCalled();
    });
  });

  describe('clearAllHistory - 清空所有历史', () => {
    it('应该清空所有历史记录', () => {
      historyPanel.clearAllHistory();

      expect(mockHistoryService.clear).toHaveBeenCalled();
    });

    it('应该在清空后重新加载历史', () => {
      const loadSpy = vi.spyOn(historyPanel, 'loadHistory');
      historyPanel.clearAllHistory();

      expect(loadSpy).toHaveBeenCalled();
    });

    it('应该显示成功提示', () => {
      historyPanel.clearAllHistory();

      expect(mockShowToast).toHaveBeenCalledWith('历史已清空', 'success');
    });

    it('应该在用户取消时不清空', () => {
      global.confirm = vi.fn(() => false);

      historyPanel.clearAllHistory();

      expect(mockHistoryService.clear).not.toHaveBeenCalled();
    });
  });

    it('应该加载历史快照到全局状态', () => {
      const item = mockHistory[0];
      const result = historyPanel.loadHistoryItem(item, false);

      expect(result).toBe(true);
      expect(mockState.scraper.currentHistoryId).toBe('hist-001');
      expect(mockState.scraper.scrapedData).toEqual(item.data);
      expect(mockState.scraper.selectedSite).toBe('DE');
    });

    it('应该在采集中时请求确认', () => {
      global.confirm = vi.fn(() => false);

      const item = mockHistory[0];
      const result = historyPanel.loadHistoryItem(item, true);

      expect(result).toBe(false);
      expect(global.confirm).toHaveBeenCalledWith('任务进行中，确定覆盖？');
    });

    it('应该在用户确认后加载', () => {
      global.confirm = vi.fn(() => true);

      const item = mockHistory[0];
      const result = historyPanel.loadHistoryItem(item, true);

      expect(result).toBe(true);
      expect(mockState.scraper.scrapedData).toEqual(item.data);
    });

    it('应该加载包含分析报告的快照', () => {
      const itemWithReport: HistoryItem = {
        ...mockHistory[0],
        report: { type: 'analysis', data: 'test report' }
      };

      historyPanel.loadHistoryItem(itemWithReport, false);

      expect(mockState.analysis.analysisReport).toEqual(itemWithReport.report);
    });

    it('应该优先加载 AI 智能分析报告', () => {
      const itemWithBothReports: HistoryItem = {
        ...mockHistory[0],
        report: { type: 'old', data: 'old report' },
        analysisStatus: {
          isAnalyzed: true,
          analyzedAt: '2024-01-01T12:00:00Z',
          analysisReport: { type: 'new', data: 'new report' }
        }
      };

      historyPanel.loadHistoryItem(itemWithBothReports, false);

      expect(mockState.analysis.analysisReport).toEqual(itemWithBothReports.analysisStatus?.analysisReport);
    });

    it('应该在没有报告时清空分析报告', () => {
      mockState.analysis.analysisReport = { type: 'old', data: 'old' };

      const itemWithoutReport = mockHistory[0];
      historyPanel.loadHistoryItem(itemWithoutReport, false);

      expect(mockState.analysis.analysisReport).toBeNull();
    });

    it('应该发送事件通知其他模块', () => {
      const item = mockHistory[0];
      historyPanel.loadHistoryItem(item, false);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'scraper:scrape-success',
        item.data
      );
    });

    it('应该显示成功提示', () => {
      const item = mockHistory[0];
      historyPanel.loadHistoryItem(item, false);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('历史快照已加载'),
        'success'
      );
    });

    it('应该在有报告时显示特殊提示', () => {
      const itemWithReport: HistoryItem = {
        ...mockHistory[0],
        report: { type: 'analysis', data: 'test' }
      };

      historyPanel.loadHistoryItem(itemWithReport, false);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('包含分析报告'),
        'success'
      );
    });

    it('应该补全缺失的 metadata', () => {
      const itemWithoutMetadata: HistoryItem = {
        ...mockHistory[0],
        data: {
          ...mockHistory[0].data,
          metadata: undefined as any
        }
      };

      historyPanel.loadHistoryItem(itemWithoutMetadata, false);

      expect(mockState.scraper.scrapedData?.metadata).toBeDefined();
      expect(mockState.scraper.scrapedData?.metadata?.marketplace).toBe('DE');
    });

    it('应该补全缺失的 marketplace 字段', () => {
      const itemWithIncompleteMetadata: HistoryItem = {
        ...mockHistory[0],
        data: {
          ...mockHistory[0].data,
          metadata: {
            scrape_timestamp: '2024-01-01T10:00:00Z',
            domain: 'amazon.de',
            language: 'German',
            total_asins: 1
          } as any
        }
      };

      historyPanel.loadHistoryItem(itemWithIncompleteMetadata, false);

      expect(mockState.scraper.scrapedData?.metadata?.marketplace).toBe('DE');
    });

  describe('loadAnalysisReport - 加载分析报告', () => {
    it('应该加载分析报告并跳转', async () => {
      const itemWithReport: HistoryItem = {
        ...mockHistory[0],
        analysisStatus: {
          isAnalyzed: true,
          analyzedAt: '2024-01-01T12:00:00Z',
          analysisReport: { type: 'analysis', data: 'test' }
        }
      };

      await historyPanel.loadAnalysisReport(itemWithReport);

      expect(mockState.analysis.analysisReport).toEqual(itemWithReport.analysisStatus?.analysisReport);
      expect((global as any).switchTab).toHaveBeenCalledWith('ai_analysis', true);
    });

    it('应该在没有报告时显示警告', async () => {
      const itemWithoutReport = mockHistory[0];

      await historyPanel.loadAnalysisReport(itemWithoutReport);

      expect(mockShowToast).toHaveBeenCalledWith('该快照没有分析报告', 'warning');
      expect((global as any).switchTab).not.toHaveBeenCalled();
    });

    it('应该处理加载失败', async () => {
      const itemWithReport: HistoryItem = {
        ...mockHistory[0],
        analysisStatus: {
          isAnalyzed: true,
          analysisReport: null as any  // 无效的报告
        }
      };

      await historyPanel.loadAnalysisReport(itemWithReport);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('失败'),
        'error'
      );
    });

    it('应该显示成功提示', async () => {
      const itemWithReport: HistoryItem = {
        ...mockHistory[0],
        analysisStatus: {
          isAnalyzed: true,
          analysisReport: { type: 'analysis', data: 'test' }
        }
      };

      await historyPanel.loadAnalysisReport(itemWithReport);

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('已跳转'),
        'success'
      );
    });
  });

  describe('边界条件', () => {
    it('应该处理空的 asins 数组', () => {
      const itemWithEmptyAsins: HistoryItem = {
        ...mockHistory[0],
        asins: []
      };

      const result = historyPanel.loadHistoryItem(itemWithEmptyAsins, false);

      expect(result).toBe(true);
      expect(mockState.scraper.scrapedData).toEqual(itemWithEmptyAsins.data);
    });

    it('应该处理缺失的 timestamp', () => {
      const itemWithoutTimestamp: HistoryItem = {
        ...mockHistory[0],
        timestamp: undefined as any
      };

      historyPanel.loadHistoryItem(itemWithoutTimestamp, false);

      expect(mockState.scraper.scrapedData?.metadata?.scrape_timestamp).toBeDefined();
    });

    it('应该处理未知的站点代码', () => {
      const itemWithUnknownSite: HistoryItem = {
        ...mockHistory[0],
        site: 'UNKNOWN'
      };

      historyPanel.loadHistoryItem(itemWithUnknownSite, false);

      expect(mockState.scraper.selectedSite).toBe('UNKNOWN');
    });
  });
