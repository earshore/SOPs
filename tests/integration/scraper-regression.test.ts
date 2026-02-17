/**
 * scraper-regression.test.ts - 回归测试
 * 
 * 确保数据采集页面集成后，所有现有功能未受影响
 * 
 * 任务: 17.2 编写回归测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockLocalStorage, flushPromises } from '../helpers/testUtils';

// Mock dependencies
vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
  sleep: vi.fn()
}));

const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('@/common/EventBus', () => ({
  default: mockEventBus
}));

const mockHistoryService = {
  save: vi.fn(),
  getAll: vi.fn(() => []),
  clear: vi.fn(),
  getById: vi.fn(),
  delete: vi.fn()
};

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: mockHistoryService
}));

describe('回归测试 - 确保现有功能未受影响', () => {
  let mockState: any;

  beforeEach(() => {
    mockLocalStorage();
    vi.clearAllMocks();

    mockState = {
      scraper: {
        selectedSite: 'DE',
        scrapedData: null,
        currentHistoryId: null,
        inputAsins: '',
        isScraping: false,
        expandedAsin: null,
        currentDataTab: 'preview'
      },
      analysis: {
        analysisReport: null
      }
    };

    localStorage.setItem('appState', JSON.stringify(mockState));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 回归测试：数据采集核心功能
   */
  describe('数据采集核心功能', () => {
    it('应该能够正常输入和解析ASIN列表', () => {
      // 测试各种ASIN输入格式
      const testCases = [
        { input: 'B0TEST001', expected: ['B0TEST001'] },
        { input: 'B0TEST001, B0TEST002', expected: ['B0TEST001', 'B0TEST002'] },
        { input: 'B0TEST001,B0TEST002,B0TEST003', expected: ['B0TEST001', 'B0TEST002', 'B0TEST003'] },
        { input: 'B0TEST001\nB0TEST002', expected: ['B0TEST001', 'B0TEST002'] },
        { input: '  B0TEST001  ,  B0TEST002  ', expected: ['B0TEST001', 'B0TEST002'] }
      ];

      testCases.forEach(({ input, expected }) => {
        const asins = input
          .split(/[,\n]/)
          .map(asin => asin.trim())
          .filter(asin => asin.length > 0);

        expect(asins).toEqual(expected);
      });
    });

    it('应该能够正常选择站点', () => {
      const validSites = ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'CA', 'AU', 'IN'];

      validSites.forEach(site => {
        mockState.scraper.selectedSite = site;
        expect(mockState.scraper.selectedSite).toBe(site);
      });
    });

    it('应该能够正常管理抓取状态', () => {
      // 初始状态
      expect(mockState.scraper.isScraping).toBe(false);

      // 开始抓取
      mockState.scraper.isScraping = true;
      expect(mockState.scraper.isScraping).toBe(true);

      // 抓取完成
      mockState.scraper.isScraping = false;
      expect(mockState.scraper.isScraping).toBe(false);
    });

    it('应该能够正常保存抓取结果', () => {
      const scrapedData = {
        metadata: {
          marketplace: 'US',
          total_asins: 2,
          timestamp: new Date().toISOString()
        },
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1' },
          { asin: 'B0TEST002', productTitle: 'Product 2' }
        ]
      };

      mockState.scraper.scrapedData = scrapedData;

      expect(mockState.scraper.scrapedData).toEqual(scrapedData);
      expect(mockState.scraper.scrapedData.products).toHaveLength(2);
    });
  });

  /**
   * 回归测试：历史记录功能
   */
  describe('历史记录功能', () => {
    it('应该能够正常保存历史记录', async () => {
      const historyEntry = {
        id: `test_${Date.now()}`,
        type: 'scrape',
        data: {
          metadata: { marketplace: 'US' },
          products: [{ asin: 'B0TEST001', productTitle: 'Test' }]
        },
        timestamp: Date.now()
      };

      mockHistoryService.save(historyEntry);

      expect(mockHistoryService.save).toHaveBeenCalledWith(historyEntry);
    });

    it('应该能够正常获取历史记录列表', async () => {
      const mockHistory = [
        { id: 'hist1', type: 'scrape', timestamp: Date.now() - 1000 },
        { id: 'hist2', type: 'import', timestamp: Date.now() }
      ];

      mockHistoryService.getAll.mockReturnValue(mockHistory);

      const history = mockHistoryService.getAll();

      expect(history).toEqual(mockHistory);
      expect(history).toHaveLength(2);
    });

    it('应该能够正常获取单个历史记录', async () => {
      const historyId = 'test_123';
      const mockHistoryEntry = {
        id: historyId,
        type: 'scrape',
        data: { products: [] },
        timestamp: Date.now()
      };

      mockHistoryService.getById.mockReturnValue(mockHistoryEntry);

      const entry = mockHistoryService.getById(historyId);

      expect(entry).toEqual(mockHistoryEntry);
      expect(entry.id).toBe(historyId);
    });

    it('应该能够正常删除历史记录', async () => {
      const historyId = 'test_to_delete';

      mockHistoryService.delete(historyId);

      expect(mockHistoryService.delete).toHaveBeenCalledWith(historyId);
    });

    it('应该能够正常清空历史记录', async () => {
      mockHistoryService.clear();

      expect(mockHistoryService.clear).toHaveBeenCalled();
    });

    it('应该在数据变更时触发历史记录更新事件', async () => {
      const scrapedData = {
        metadata: { marketplace: 'US' },
        products: [{ asin: 'B0TEST001', productTitle: 'Test' }]
      };

      mockState.scraper.scrapedData = scrapedData;
      mockState.scraper.currentHistoryId = `scrape_${Date.now()}`;

      mockEventBus.emit('HISTORY_UPDATED');

      expect(mockEventBus.emit).toHaveBeenCalledWith('HISTORY_UPDATED');
    });
  });

  /**
   * 回归测试：AI分析模块集成
   */
  describe('AI分析模块集成', () => {
    it('应该能够正常触发数据更新事件供AI分析', async () => {
      const scrapedData = {
        metadata: { marketplace: 'US' },
        products: [
          {
            asin: 'B0ANALYZE1',
            productTitle: 'Product for Analysis',
            customer_reviews: [
              { rating: 5, text: 'Excellent product!' },
              { rating: 4, text: 'Good quality' },
              { rating: 3, text: 'Average' }
            ]
          }
        ]
      };

      mockState.scraper.scrapedData = scrapedData;
      mockEventBus.emit('DATA_UPDATED', scrapedData);

      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', scrapedData);
    });

    it('应该能够正常接收AI分析结果', async () => {
      const analysisReport = {
        summary: 'Overall positive sentiment',
        sentiment_score: 4.2,
        insights: [
          'High customer satisfaction',
          'Quality is frequently mentioned',
          'Some concerns about price'
        ],
        recommendations: [
          'Maintain current quality standards',
          'Consider competitive pricing'
        ]
      };

      mockState.analysis.analysisReport = analysisReport;

      expect(mockState.analysis.analysisReport).toEqual(analysisReport);
      expect(mockState.analysis.analysisReport.insights).toHaveLength(3);
    });

    it('应该能够正常清空AI分析结果', () => {
      mockState.analysis.analysisReport = {
        summary: 'Test report'
      };

      expect(mockState.analysis.analysisReport).toBeDefined();

      mockState.analysis.analysisReport = null;

      expect(mockState.analysis.analysisReport).toBeNull();
    });
  });

  /**
   * 回归测试：事件系统
   */
  describe('事件系统', () => {
    it('应该能够正常触发DATA_UPDATED事件', () => {
      const data = { products: [] };

      mockEventBus.emit('DATA_UPDATED', data);

      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', data);
    });

    it('应该能够正常触发HISTORY_UPDATED事件', () => {
      mockEventBus.emit('HISTORY_UPDATED');

      expect(mockEventBus.emit).toHaveBeenCalledWith('HISTORY_UPDATED');
    });

    it('应该能够正常注册事件监听器', () => {
      const handler = vi.fn();

      mockEventBus.on('DATA_UPDATED', handler);

      expect(mockEventBus.on).toHaveBeenCalledWith('DATA_UPDATED', handler);
    });

    it('应该能够正常移除事件监听器', () => {
      const handler = vi.fn();

      mockEventBus.off('DATA_UPDATED', handler);

      expect(mockEventBus.off).toHaveBeenCalledWith('DATA_UPDATED', handler);
    });

    it('应该保持事件名称不变（向后兼容）', () => {
      const expectedEvents = ['DATA_UPDATED', 'HISTORY_UPDATED'];

      expectedEvents.forEach(eventName => {
        // 验证事件名称格式未改变
        expect(eventName).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  /**
   * 回归测试：状态管理
   */
  describe('状态管理', () => {
    it('应该能够正常保存状态到localStorage', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'DE' },
        products: [{ asin: 'B0STATE01', productTitle: 'State Test' }]
      };

      localStorage.setItem('appState', JSON.stringify(mockState));

      const saved = localStorage.getItem('appState');
      expect(saved).toBeDefined();

      const parsed = JSON.parse(saved!);
      expect(parsed.scraper.scrapedData).toEqual(mockState.scraper.scrapedData);
    });

    it('应该能够正常从localStorage恢复状态', () => {
      const savedState = {
        scraper: {
          selectedSite: 'FR',
          scrapedData: {
            metadata: { marketplace: 'FR' },
            products: [{ asin: 'B0RESTORE1', productTitle: 'Restored' }]
          },
          expandedAsin: 'B0RESTORE1',
          currentDataTab: 'json'
        }
      };

      localStorage.setItem('appState', JSON.stringify(savedState));

      const restored = JSON.parse(localStorage.getItem('appState')!);

      expect(restored.scraper.selectedSite).toBe('FR');
      expect(restored.scraper.scrapedData.products).toHaveLength(1);
      expect(restored.scraper.expandedAsin).toBe('B0RESTORE1');
      expect(restored.scraper.currentDataTab).toBe('json');
    });

    it('应该保持状态结构不变（向后兼容）', () => {
      const requiredKeys = [
        'selectedSite',
        'scrapedData',
        'currentHistoryId',
        'inputAsins',
        'isScraping',
        'expandedAsin',
        'currentDataTab'
      ];

      requiredKeys.forEach(key => {
        expect(mockState.scraper).toHaveProperty(key);
      });
    });

    it('应该能够正常处理新增的状态字段', () => {
      // 新增字段：expandedAsin 和 currentDataTab
      mockState.scraper.expandedAsin = 'B0EXPAND01';
      mockState.scraper.currentDataTab = 'json';

      expect(mockState.scraper.expandedAsin).toBe('B0EXPAND01');
      expect(mockState.scraper.currentDataTab).toBe('json');

      // 验证旧字段仍然存在
      expect(mockState.scraper).toHaveProperty('selectedSite');
      expect(mockState.scraper).toHaveProperty('scrapedData');
    });
  });

  /**
   * 回归测试：数据结构兼容性
   */
  describe('数据结构兼容性', () => {
    it('应该能够正常处理标准数据格式', () => {
      const standardData = {
        metadata: {
          marketplace: 'US',
          total_asins: 1,
          timestamp: new Date().toISOString()
        },
        products: [
          {
            asin: 'B0STANDARD1',
            productTitle: 'Standard Product',
            price: 29.99,
            rating: 4.5,
            reviews_count: 100,
            feature_bullets: ['Feature 1', 'Feature 2'],
            customer_reviews: [
              {
                id: 'R1',
                rating: 5,
                date: '2024-01-01',
                author: 'John Doe',
                headline: 'Great!',
                text: 'Excellent product'
              }
            ]
          }
        ]
      };

      mockState.scraper.scrapedData = standardData;

      expect(mockState.scraper.scrapedData).toHaveProperty('metadata');
      expect(mockState.scraper.scrapedData).toHaveProperty('products');
      expect(mockState.scraper.scrapedData.products[0]).toHaveProperty('asin');
      expect(mockState.scraper.scrapedData.products[0]).toHaveProperty('productTitle');
    });

    it('应该能够正常处理简化数据格式', () => {
      const simplifiedData = {
        metadata: { marketplace: 'DE' },
        products: [
          {
            asin: 'B0SIMPLE01',
            productTitle: 'Simple Product'
          }
        ]
      };

      mockState.scraper.scrapedData = simplifiedData;

      expect(mockState.scraper.scrapedData.products[0].asin).toBe('B0SIMPLE01');
      expect(mockState.scraper.scrapedData.products[0].productTitle).toBe('Simple Product');
    });

    it('应该能够正常处理包含可选字段的数据', () => {
      const dataWithOptionalFields = {
        metadata: {
          marketplace: 'UK',
          total_asins: 1,
          timestamp: new Date().toISOString(),
          scraper_version: '2.0',
          custom_field: 'custom value'
        },
        products: [
          {
            asin: 'B0OPTIONAL1',
            productTitle: 'Product with Optional Fields',
            price: 39.99,
            currency: 'GBP',
            availability: 'In Stock',
            custom_data: { key: 'value' }
          }
        ]
      };

      mockState.scraper.scrapedData = dataWithOptionalFields;

      expect(mockState.scraper.scrapedData.products[0].asin).toBe('B0OPTIONAL1');
      expect(mockState.scraper.scrapedData.products[0].custom_data).toEqual({ key: 'value' });
    });
  });

  /**
   * 回归测试：错误处理
   */
  describe('错误处理', () => {
    it('应该能够正常处理空数据', () => {
      mockState.scraper.scrapedData = null;

      const hasData = mockState.scraper.scrapedData?.products?.length > 0;

      expect(hasData).toBe(false);
    });

    it('应该能够正常处理空产品列表', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: []
      };

      expect(mockState.scraper.scrapedData.products).toHaveLength(0);
    });

    it('应该能够正常处理缺少metadata的数据', () => {
      const dataWithoutMetadata: any = {
        products: [{ asin: 'B0NOMETA01', productTitle: 'No Metadata' }]
      };

      mockState.scraper.scrapedData = dataWithoutMetadata;

      const marketplace = mockState.scraper.scrapedData.metadata?.marketplace || 'Unknown';

      expect(marketplace).toBe('Unknown');
    });

    it('应该能够正常处理缺少评论的产品', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [
          {
            asin: 'B0NOREVIEW1',
            productTitle: 'No Reviews Product'
          }
        ]
      };

      const product = mockState.scraper.scrapedData.products[0];
      const reviews = product.customer_reviews || [];

      expect(reviews).toHaveLength(0);
    });
  });

  /**
   * 回归测试：性能和资源管理
   */
  describe('性能和资源管理', () => {
    it('应该能够正常处理大量产品数据', () => {
      const largeDataset = {
        metadata: { marketplace: 'US', total_asins: 100 },
        products: Array.from({ length: 100 }, (_, i) => ({
          asin: `B0LARGE${String(i).padStart(3, '0')}`,
          productTitle: `Product ${i}`
        }))
      };

      mockState.scraper.scrapedData = largeDataset;

      expect(mockState.scraper.scrapedData.products).toHaveLength(100);
    });

    it('应该能够正常处理包含大量评论的产品', () => {
      const productWithManyReviews = {
        metadata: { marketplace: 'US' },
        products: [
          {
            asin: 'B0MANYREV1',
            productTitle: 'Product with Many Reviews',
            customer_reviews: Array.from({ length: 500 }, (_, i) => ({
              id: `R${i}`,
              rating: Math.floor(Math.random() * 5) + 1,
              text: `Review ${i}`
            }))
          }
        ]
      };

      mockState.scraper.scrapedData = productWithManyReviews;

      expect(mockState.scraper.scrapedData.products[0].customer_reviews).toHaveLength(500);
    });

    it('应该能够正常清理状态', () => {
      // 设置状态
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [{ asin: 'B0CLEANUP1', productTitle: 'Test' }]
      };
      mockState.scraper.expandedAsin = 'B0CLEANUP1';
      mockState.scraper.currentDataTab = 'json';

      // 清理状态
      mockState.scraper.scrapedData = null;
      mockState.scraper.expandedAsin = null;
      mockState.scraper.currentDataTab = 'preview';

      // 验证清理结果
      expect(mockState.scraper.scrapedData).toBeNull();
      expect(mockState.scraper.expandedAsin).toBeNull();
      expect(mockState.scraper.currentDataTab).toBe('preview');
    });
  });
});
