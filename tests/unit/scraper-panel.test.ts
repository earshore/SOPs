/**
 * scraper-panel.test.ts - ScraperPanel 组件单元测试
 * 测试 Scraper 面板的核心功能和状态管理
 * 
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createScraperPanel } from '@/modules/app_center/views/master_analysis/scraper/components/ScraperPanel';

// Mock dependencies - 使用工厂函数避免初始化顺序问题
vi.mock('@/common/state', () => ({
  default: {
    scraper: {
      selectedSite: 'DE',
      inputAsins: '',
      isScraping: false,
      scrapedData: null,
      expandedAsin: null,
      currentDataTab: 'preview',
      currentHistoryId: null
    },
    analysis: {
      analysisReport: null
    }
  }
}));

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: vi.fn(() => ({ type: 'allorigins' }))
  },
  STORAGE_KEYS: {
    PROXY_CONFIG: 'proxy_config'
  }
}));

vi.mock('@/services/errorService', () => ({
  ErrorService: {
    handle: vi.fn()
  }
}));

vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
  sleep: vi.fn()
}));

vi.mock('@/common/constants/eventConstants', () => ({
  APP_EVENTS: {
    HISTORY_UPDATED: 'history-updated'
  },
  emitAppEvent: vi.fn()
}));

  let panel: ReturnType<typeof createScraperPanel>;
  let mockState: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 获取 mock 的 state
    const stateModule = await import('@/common/state');
    mockState = stateModule.default;

    // 重置 mockState
    mockState.scraper = {
      selectedSite: 'DE',
      inputAsins: '',
      isScraping: false,
      scrapedData: null,
      expandedAsin: null,
      currentDataTab: 'preview',
      currentHistoryId: null
    };
    mockState.analysis = {
      analysisReport: null
    };

    panel = createScraperPanel();
  });

  describe('初始化', () => {
    it('应该创建面板实例', () => {
      expect(panel).toBeDefined();
      expect(panel.selectedSite).toBe('DE');
      expect(panel.inputAsins).toBe('');
      expect(panel.isScraping).toBe(false);
    });

    it('应该初始化站点列表', () => {
      expect(panel.sites).toEqual(['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK']);
    });

    it('应该初始化任务列表为空', () => {
      expect(panel.tasks).toEqual([]);
    });

    it('应该初始化数据标签页为预览', () => {
      expect(panel.currentDataTab).toBe('preview');
    });
  });

  describe('计算属性 - validAsins', () => {
    it('应该提取有效的 ASIN', () => {
      panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';

      expect(panel.validAsins).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
    });

    it('应该过滤无效的 ASIN', () => {
      panel.inputAsins = 'B08N5WRWNW INVALID B0ABCDEFGH';

      expect(panel.validAsins).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
    });

    it('应该处理空输入', () => {
      panel.inputAsins = '';

      expect(panel.validAsins).toEqual([]);
    });

    it('应该处理多行输入', () => {
      panel.inputAsins = 'B08N5WRWNW\nB0ABCDEFGH\nB012345678';

      expect(panel.validAsins).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678']);
    });
  });

  describe('计算属性 - invalidCount', () => {
    it('应该计算无效 ASIN 数量', () => {
      panel.inputAsins = 'B08N5WRWNW INVALID1 B0ABCDEFGH INVALID2';

      expect(panel.invalidCount).toBe(2);
    });

    it('应该在全部有效时返回 0', () => {
      panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';

      expect(panel.invalidCount).toBe(0);
    });

    it('应该在全部无效时返回总数', () => {
      panel.inputAsins = 'INVALID1 INVALID2 INVALID3';

      expect(panel.invalidCount).toBe(3);
    });

    it('应该处理空输入', () => {
      panel.inputAsins = '';

      expect(panel.invalidCount).toBe(0);
    });
  });

  describe('计算属性 - canStart', () => {
    it('应该在有有效 ASIN 且未采集时返回 true', () => {
      panel.inputAsins = 'B08N5WRWNW';
      panel.isScraping = false;

      expect(panel.canStart).toBe(true);
    });

    it('应该在没有有效 ASIN 时返回 false', () => {
      panel.inputAsins = '';
      panel.isScraping = false;

      expect(panel.canStart).toBe(false);
    });

    it('应该在采集中时返回 false', () => {
      panel.inputAsins = 'B08N5WRWNW';
      panel.isScraping = true;

      expect(panel.canStart).toBe(false);
    });

    it('应该在只有无效 ASIN 时返回 false', () => {
      panel.inputAsins = 'INVALID1 INVALID2';
      panel.isScraping = false;

      expect(panel.canStart).toBe(false);
    });
  });

  describe('计算属性 - hasData', () => {
    it('应该在有产品数据时返回 true', () => {
      mockState.scraper.scrapedData = {
        metadata: {
          scrape_timestamp: '2024-01-01T00:00:00Z',
          marketplace: 'DE',
          domain: 'amazon.de',
          language: 'German',
          total_asins: 1
        },
        products: [
          {
            asin: 'B08N5WRWNW',
            url: '',
            language: '',
            productTitle: 'Test',
            feature_bullets: [],
            customer_reviews: [],
            scrape_status: 'success'
          }
        ]
      };

      expect(panel.hasData).toBe(true);
    });

    it('应该在没有数据时返回 false', () => {
      mockState.scraper.scrapedData = null;

      expect(panel.hasData).toBe(false);
    });

    it('应该在产品列表为空时返回 false', () => {
      mockState.scraper.scrapedData = {
        metadata: {
          scrape_timestamp: '2024-01-01T00:00:00Z',
          marketplace: 'DE',
          domain: 'amazon.de',
          language: 'German',
          total_asins: 0
        },
        products: []
      };

      expect(panel.hasData).toBe(false);
    });
  });

  describe('计算属性 - proxyConfigStatus', () => {
    it('应该返回代理配置状态', () => {
      const status = panel.proxyConfigStatus;

      expect(status).toHaveProperty('name');
      expect(status).toHaveProperty('ready');
      expect(status).toHaveProperty('type');
    });

    it('应该识别自动托管代理', () => {
      const status = panel.proxyConfigStatus;

      expect(status.name).toBe('自动托管');
      expect(status.ready).toBe(true);
      expect(status.type).toBe('allorigins');
    });
  });

  describe('selectSite - 选择站点', () => {
    it('应该更新选中的站点', () => {
      panel.selectSite('FR');

      expect(panel.selectedSite).toBe('FR');
    });

    it('应该保存状态', () => {
      const saveSpy = vi.spyOn(panel, 'saveState');
      panel.selectSite('IT');

      expect(saveSpy).toHaveBeenCalled();
    });

    it('应该支持所有站点', () => {
      const sites = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'];

      sites.forEach(site => {
        panel.selectSite(site as any);
        expect(panel.selectedSite).toBe(site);
      });
    });
  });

  describe('clearAsins - 清空 ASIN', () => {
    it('应该清空输入的 ASIN', () => {
      panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';
      panel.clearAsins();

      expect(panel.inputAsins).toBe('');
    });

    it('应该保存状态', () => {
      const saveSpy = vi.spyOn(panel, 'saveState');
      panel.inputAsins = 'B08N5WRWNW';
      panel.clearAsins();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('应该在已经为空时也能调用', () => {
      panel.inputAsins = '';
      panel.clearAsins();

      expect(panel.inputAsins).toBe('');
    });
  });

  describe('switchDataTab - 切换数据标签页', () => {
    it('应该切换到 JSON 视图', () => {
      panel.switchDataTab('json');

      expect(panel.currentDataTab).toBe('json');
    });

    it('应该切换回预览视图', () => {
      panel.switchDataTab('json');
      panel.switchDataTab('preview');

      expect(panel.currentDataTab).toBe('preview');
    });

    it('应该保存状态', () => {
      const saveSpy = vi.spyOn(panel, 'saveState');
      panel.switchDataTab('json');

      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('restoreState - 恢复状态', () => {
    it('应该从 state 恢复站点', () => {
      mockState.scraper.selectedSite = 'FR';
      panel.restoreState();

      expect(panel.selectedSite).toBe('FR');
    });

    it('应该从 state 恢复输入的 ASIN', () => {
      mockState.scraper.inputAsins = 'B08N5WRWNW B0ABCDEFGH';
      panel.restoreState();

      expect(panel.inputAsins).toBe('B08N5WRWNW B0ABCDEFGH');
    });

    it('应该处理空的 state', () => {
      mockState.scraper.selectedSite = undefined as any;
      mockState.scraper.inputAsins = undefined as any;

      panel.restoreState();

      // 应该保持默认值
      expect(panel.selectedSite).toBeDefined();
    });
  });

  describe('saveState - 保存状态', () => {
    it('应该保存站点到 state', () => {
      panel.selectedSite = 'IT';
      panel.saveState();

      expect(mockState.scraper.selectedSite).toBe('IT');
    });

    it('应该保存输入的 ASIN 到 state', () => {
      panel.inputAsins = 'B08N5WRWNW';
      panel.saveState();

      expect(mockState.scraper.inputAsins).toBe('B08N5WRWNW');
    });

    it('应该保存采集状态到 state', () => {
      panel.isScraping = true;
      panel.saveState();

      expect(mockState.scraper.isScraping).toBe(true);
    });

    it('应该只在状态改变时保存', () => {
      // 第一次保存
      panel.selectedSite = 'FR';
      panel.saveState();

      // 第二次保存（没有改变）
      const initialSite = mockState.scraper.selectedSite;
      panel.saveState();

      expect(mockState.scraper.selectedSite).toBe(initialSite);
    });
  });

  describe('triggerImport - 触发导入', () => {
    it('应该触发文件输入点击', () => {
      const mockInput = {
        value: 'old-value',
        click: vi.fn()
      };

      document.getElementById = vi.fn(() => mockInput as any);

      panel.triggerImport();

      expect(mockInput.value).toBe('');
      expect(mockInput.click).toHaveBeenCalled();
    });

    it('应该处理输入元素不存在的情况', () => {
      document.getElementById = vi.fn(() => null);

      // 不应该抛出错误
      expect(() => panel.triggerImport()).not.toThrow();
    });
  });

  describe('分页控制', () => {
    beforeEach(() => {
      // 创建 dataPreview mock
      panel.dataPreview = {
        goToPage: vi.fn(),
        previousPage: vi.fn(),
        nextPage: vi.fn()
      } as any;
    });

    it('应该跳转到指定页码', () => {
      panel.goToPage(2);

      expect(panel.dataPreview?.goToPage).toHaveBeenCalledWith(2);
    });

    it('应该支持上一页', () => {
      panel.previousPage();

      expect(panel.dataPreview?.previousPage).toHaveBeenCalled();
    });

    it('应该支持下一页', () => {
      panel.nextPage();

      expect(panel.dataPreview?.nextPage).toHaveBeenCalled();
    });

    it('应该在 dataPreview 不存在时不报错', () => {
      panel.dataPreview = null;

      expect(() => panel.goToPage(2)).not.toThrow();
      expect(() => panel.previousPage()).not.toThrow();
      expect(() => panel.nextPage()).not.toThrow();
    });
  });

  describe('历史记录操作', () => {
    beforeEach(() => {
      panel.historyPanel = {
        loadHistory: vi.fn(),
        deleteHistoryItem: vi.fn(),
        clearAllHistory: vi.fn(),
        loadHistoryItem: vi.fn(() => true),
        loadAnalysisReport: vi.fn()
      } as any;
    });

    it('应该加载历史记录', () => {
      panel.loadHistory();

      expect(panel.historyPanel?.loadHistory).toHaveBeenCalled();
    });

    it('应该删除历史记录项', () => {
      panel.deleteHistoryItem('hist-001');

      expect(panel.historyPanel?.deleteHistoryItem).toHaveBeenCalledWith('hist-001');
    });

    it('应该清空所有历史', () => {
      panel.clearAllHistory();

      expect(panel.historyPanel?.clearAllHistory).toHaveBeenCalled();
    });

    it('应该在 historyPanel 不存在时不报错', () => {
      panel.historyPanel = null;

      expect(() => panel.loadHistory()).not.toThrow();
      expect(() => panel.deleteHistoryItem('hist-001')).not.toThrow();
      expect(() => panel.clearAllHistory()).not.toThrow();
    });
  });

  describe('工具函数', () => {
    it('应该提供 getFlag 函数', () => {
      expect(panel.getFlag).toBeDefined();
      expect(typeof panel.getFlag).toBe('function');
    });

    it('应该提供 getSiteName 函数', () => {
      expect(panel.getSiteName).toBeDefined();
      expect(typeof panel.getSiteName).toBe('function');
    });

    it('应该提供 formatDate 函数', () => {
      expect(panel.formatDate).toBeDefined();
      expect(typeof panel.formatDate).toBe('function');
    });
  });

  describe('边界条件', () => {
    it('应该处理非常长的 ASIN 输入', () => {
      const longInput = Array.from({ length: 1000 }, (_, i) => 
        `B0TEST${String(i).padStart(4, '0')}`
      ).join('\n');

      panel.inputAsins = longInput;

      expect(panel.validAsins.length).toBeGreaterThan(0);
    });

    it('应该处理混合有效和无效的 ASIN', () => {
      panel.inputAsins = 'B08N5WRWNW INVALID1 B0ABCDEFGH INVALID2 B012345678';

      expect(panel.validAsins).toHaveLength(3);
      expect(panel.invalidCount).toBe(2);
    });

    it('应该处理特殊字符', () => {
      panel.inputAsins = 'B08N5WRWNW, B0ABCDEFGH; B012345678\tB0ZZZZZZZZ';

      expect(panel.validAsins.length).toBeGreaterThan(0);
    });

    it('应该处理重复的 ASIN', () => {
      panel.inputAsins = 'B08N5WRWNW B08N5WRWNW B0ABCDEFGH';

      // 当前实现不去重
      expect(panel.validAsins.length).toBeGreaterThan(0);
    });

    it('应该处理空白字符', () => {
      panel.inputAsins = '   B08N5WRWNW   \n\n   B0ABCDEFGH   ';

      expect(panel.validAsins).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的工作流程', () => {
      // 1. 选择站点
      panel.selectSite('FR');
      expect(panel.selectedSite).toBe('FR');

      // 2. 输入 ASIN
      panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';
      expect(panel.validAsins).toHaveLength(2);

      // 3. 检查是否可以开始
      expect(panel.canStart).toBe(true);

      // 4. 保存状态
      panel.saveState();
      expect(mockState.scraper.selectedSite).toBe('FR');
      expect(mockState.scraper.inputAsins).toBe('B08N5WRWNW B0ABCDEFGH');
    });

    it('应该在采集过程中禁用开始按钮', () => {
      panel.inputAsins = 'B08N5WRWNW';
      expect(panel.canStart).toBe(true);

      panel.isScraping = true;
      expect(panel.canStart).toBe(false);

      panel.isScraping = false;
      expect(panel.canStart).toBe(true);
    });

    it('应该支持清空和重新输入', () => {
      panel.inputAsins = 'B08N5WRWNW B0ABCDEFGH';
      expect(panel.validAsins).toHaveLength(2);

      panel.clearAsins();
      expect(panel.inputAsins).toBe('');
      expect(panel.validAsins).toHaveLength(0);

      panel.inputAsins = 'B012345678';
      expect(panel.validAsins).toHaveLength(1);
    });
  });
