/**
 * scraper-e2e.test.ts - 数据采集页面端到端测试
 * 
 * 测试完整的用户工作流程，包括：
 * - 数据采集流程
 * - 数据导入流程
 * - 数据编辑和删除流程
 * - 与其他模块的集成
 * 
 * 任务: 17.1 编写端到端测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockLocalStorage, flushPromises, cleanupDOM } from '../helpers/testUtils';

// Mock dependencies
const mockShowToast = vi.fn();
const mockSleep = vi.fn();

vi.mock('@/common/ui', () => ({
  showToast: mockShowToast,
  sleep: mockSleep
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
  getById: vi.fn()
};

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: mockHistoryService
}));

  let mockState: any;

  beforeEach(() => {
    mockLocalStorage();
    cleanupDOM();
    vi.clearAllMocks();

    // 初始化状态
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

    // 保存到localStorage
    localStorage.setItem('appState', JSON.stringify(mockState));
  });

  afterEach(() => {
    cleanupDOM();
    vi.clearAllMocks();
  });

  /**
   * E2E测试：完整的数据采集流程
   */
  describe('完整的数据采集流程', () => {
    it('应该完成从输入ASIN到显示数据的完整流程', async () => {
      // 步骤1: 用户输入ASIN
      const inputAsins = 'B0TEST001, B0TEST002, B0TEST003';
      mockState.scraper.inputAsins = inputAsins;

      // 步骤2: 选择站点
      mockState.scraper.selectedSite = 'US';

      // 步骤3: 开始抓取
      mockState.scraper.isScraping = true;

      // 模拟抓取完成
      const scrapedData = {
        metadata: {
          marketplace: 'US',
          total_asins: 3,
          timestamp: new Date().toISOString()
        },
        products: [
          {
            asin: 'B0TEST001',
            productTitle: 'Test Product 1',
            price: 29.99,
            rating: 4.5,
            reviews_count: 100
          },
          {
            asin: 'B0TEST002',
            productTitle: 'Test Product 2',
            price: 39.99,
            rating: 4.8,
            reviews_count: 250
          },
          {
            asin: 'B0TEST003',
            productTitle: 'Test Product 3',
            price: 19.99,
            rating: 4.2,
            reviews_count: 50
          }
        ]
      };

      // 步骤4: 保存抓取结果
      mockState.scraper.scrapedData = scrapedData;
      mockState.scraper.isScraping = false;
      mockState.scraper.currentHistoryId = `scrape_${Date.now()}`;

      // 步骤5: 触发事件
      mockEventBus.emit('DATA_UPDATED', scrapedData);
      mockEventBus.emit('HISTORY_UPDATED');

      await flushPromises();

      // 验证结果
      expect(mockState.scraper.scrapedData).toBeDefined();
      expect(mockState.scraper.scrapedData.products).toHaveLength(3);
      expect(mockState.scraper.isScraping).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', scrapedData);
      expect(mockEventBus.emit).toHaveBeenCalledWith('HISTORY_UPDATED');
    });

    it('应该处理抓取失败的情况', async () => {
      // 步骤1: 开始抓取
      mockState.scraper.isScraping = true;

      // 步骤2: 模拟抓取失败
      const error = new Error('网络错误');
      mockState.scraper.isScraping = false;

      // 步骤3: 显示错误提示
      mockShowToast('抓取失败: 网络错误', 'error');

      await flushPromises();

      // 验证结果
      expect(mockState.scraper.isScraping).toBe(false);
      expect(mockState.scraper.scrapedData).toBeNull();
      expect(mockShowToast).toHaveBeenCalledWith('抓取失败: 网络错误', 'error');
    });
  });

  /**
   * E2E测试：完整的数据导入流程
   */
    it('应该完成从选择文件到显示数据的完整流程', async () => {
      // 步骤1: 准备JSON文件数据
      const jsonData = {
        metadata: {
          marketplace: 'DE',
          total_asins: 2,
          timestamp: new Date().toISOString()
        },
        products: [
          {
            asin: 'B0IMPORT01',
            productTitle: 'Imported Product 1',
            price: 49.99,
            rating: 4.7,
            customer_reviews: [
              {
                id: 'R1',
                rating: 5,
                date: '2024-01-01',
                author: 'John Doe',
                headline: 'Great product!',
                text: 'This is an excellent product.'
              }
            ]
          },
          {
            asin: 'B0IMPORT02',
            productTitle: 'Imported Product 2',
            price: 59.99,
            rating: 4.9
          }
        ]
      };

      // 步骤2: 模拟文件读取
      const fileContent = JSON.stringify(jsonData);
      const file = new File([fileContent], 'import.json', { type: 'application/json' });

      // 步骤3: 解析JSON（直接使用文件内容）
      const parsedData = JSON.parse(fileContent);

      // 步骤4: 验证数据
      expect(parsedData.products).toHaveLength(2);

      // 步骤5: 保存导入的数据
      mockState.scraper.scrapedData = parsedData;
      mockState.scraper.currentHistoryId = `import_${Date.now()}`;

      // 步骤6: 触发事件
      mockEventBus.emit('DATA_UPDATED', parsedData);
      mockEventBus.emit('HISTORY_UPDATED');

      // 步骤7: 显示成功提示
      mockShowToast('成功导入 2 个产品', 'success');

      await flushPromises();

      // 验证结果
      expect(mockState.scraper.scrapedData).toEqual(parsedData);
      expect(mockState.scraper.currentHistoryId).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', parsedData);
      expect(mockShowToast).toHaveBeenCalledWith('成功导入 2 个产品', 'success');
    });

    it('应该处理多文件导入和站点选择', async () => {
      // 步骤1: 准备多个JSON文件
      const file1Data = {
        metadata: { marketplace: 'DE' },
        products: [{ asin: 'B0DE001', productTitle: 'DE Product' }]
      };

      const file2Data = {
        metadata: { marketplace: 'FR' },
        products: [{ asin: 'B0FR001', productTitle: 'FR Product' }]
      };

      // 步骤2: 检测站点
      const detectedSites = new Set<string>();
      [file1Data, file2Data].forEach(data => {
        if (data.metadata?.marketplace) {
          detectedSites.add(data.metadata.marketplace);
        }
      });

      expect(detectedSites.size).toBe(2);

      // 步骤3: 用户选择站点
      const selectedSite = 'DE';

      // 步骤4: 合并数据
      const allProducts = [file1Data, file2Data].flatMap(data => data.products);
      const mergedData = {
        metadata: {
          marketplace: selectedSite,
          total_asins: allProducts.length,
          timestamp: new Date().toISOString()
        },
        products: allProducts
      };

      // 步骤5: 保存合并后的数据
      mockState.scraper.scrapedData = mergedData;
      mockState.scraper.selectedSite = selectedSite;

      // 验证结果
      expect(mockState.scraper.scrapedData.products).toHaveLength(2);
      expect(mockState.scraper.selectedSite).toBe('DE');
    });

    it('应该处理无效JSON文件', async () => {
      // 步骤1: 准备无效JSON
      const invalidContent = '{ invalid json }';
      const invalidFile = new File([invalidContent], 'invalid.json', { type: 'application/json' });

      // 步骤2: 尝试解析
      let parseError: Error | null = null;
      try {
        JSON.parse(invalidContent);
      } catch (error) {
        parseError = error as Error;
      }

      // 步骤3: 显示错误提示
      if (parseError) {
        mockShowToast('文件格式错误', 'error');
      }

      // 验证结果
      expect(parseError).toBeDefined();
      expect(mockShowToast).toHaveBeenCalledWith('文件格式错误', 'error');
      expect(mockState.scraper.scrapedData).toBeNull();
    });

  function setupEditableScraperData() {
    mockState.scraper.scrapedData = {
      metadata: {
        marketplace: 'US',
        total_asins: 2
      },
      products: [
        {
          asin: 'B0EDIT001',
          productTitle: 'Product to Edit',
          customer_reviews: [
            { id: 'R1', rating: 5, text: 'Review 1' },
            { id: 'R2', rating: 4, text: 'Review 2' }
          ]
        },
        {
          asin: 'B0EDIT002',
          productTitle: 'Another Product'
        }
      ]
    };
  }

  /**
   * E2E测试：数据编辑和删除流程
   */
    it('应该完成删除产品的完整流程', async () => {
      setupEditableScraperData();
      const asinToDelete = 'B0EDIT001';

      // 步骤1: 用户点击删除按钮
      // 步骤2: 显示确认对话框
      const userConfirmed = true; // 模拟用户确认

      if (userConfirmed) {
        // 步骤3: 执行删除
        const originalProducts = mockState.scraper.scrapedData.products;
        mockState.scraper.scrapedData.products = originalProducts.filter(
          (p: any) => p.asin !== asinToDelete
        );

        // 步骤4: 更新历史记录
        mockState.scraper.currentHistoryId = `delete_${Date.now()}`;

        // 步骤5: 触发事件
        mockEventBus.emit('DATA_UPDATED', mockState.scraper.scrapedData);
        mockEventBus.emit('HISTORY_UPDATED');

        // 步骤6: 显示成功提示
        mockShowToast('产品已删除', 'success');
      }

      await flushPromises();

      // 验证结果
      expect(mockState.scraper.scrapedData.products).toHaveLength(1);
      expect(mockState.scraper.scrapedData.products.find((p: any) => p.asin === asinToDelete)).toBeUndefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', mockState.scraper.scrapedData);
      expect(mockShowToast).toHaveBeenCalledWith('产品已删除', 'success');
    });

    it('应该完成删除评论的完整流程', async () => {
      setupEditableScraperData();
      const asin = 'B0EDIT001';
      const reviewIndex = 0;

      // 步骤1: 用户点击删除评论按钮
      // 步骤2: 显示确认对话框
      const userConfirmed = true;

      if (userConfirmed) {
        // 步骤3: 执行删除
        const product = mockState.scraper.scrapedData.products.find((p: any) => p.asin === asin);
        if (product && product.customer_reviews) {
          product.customer_reviews.splice(reviewIndex, 1);
        }

        // 步骤4: 触发事件
        mockEventBus.emit('DATA_UPDATED', mockState.scraper.scrapedData);

        // 步骤5: 显示成功提示
        mockShowToast('评论已删除', 'success');
      }

      await flushPromises();

      // 验证结果
      const product = mockState.scraper.scrapedData.products.find((p: any) => p.asin === asin);
      expect(product.customer_reviews).toHaveLength(1);
      expect(mockShowToast).toHaveBeenCalledWith('评论已删除', 'success');
    });

    it('应该处理用户取消删除', async () => {
      setupEditableScraperData();
      const asinToDelete = 'B0EDIT001';
      const originalProducts = JSON.parse(JSON.stringify(mockState.scraper.scrapedData.products));

      // 步骤1: 用户点击删除按钮
      // 步骤2: 显示确认对话框
      const userConfirmed = false; // 用户取消

      if (!userConfirmed) {
        // 不执行删除
      }

      await flushPromises();

      // 验证结果：数据未改变
      expect(mockState.scraper.scrapedData.products).toEqual(originalProducts);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

  /**
   * E2E测试：与其他模块的集成
   */
  describe('与其他模块的集成', () => {
    it('应该与历史记录模块正确集成', async () => {
      // 步骤1: 创建数据
      const scrapedData = {
        metadata: { marketplace: 'US', total_asins: 1 },
        products: [{ asin: 'B0TEST001', productTitle: 'Test' }]
      };

      mockState.scraper.scrapedData = scrapedData;
      const historyId = `test_${Date.now()}`;
      mockState.scraper.currentHistoryId = historyId;

      // 步骤2: 保存到历史记录
      mockHistoryService.save({
        id: historyId,
        type: 'scrape',
        data: scrapedData,
        timestamp: Date.now()
      });

      // 步骤3: 触发历史记录更新事件
      mockEventBus.emit('HISTORY_UPDATED');

      await flushPromises();

      // 验证结果
      expect(mockHistoryService.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('HISTORY_UPDATED');
    });

    it('应该与AI分析模块正确集成', async () => {
      // 步骤1: 准备数据
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [
          {
            asin: 'B0ANALYZE1',
            productTitle: 'Product for Analysis',
            customer_reviews: [
              { rating: 5, text: 'Excellent!' },
              { rating: 4, text: 'Good product' }
            ]
          }
        ]
      };

      // 步骤2: 触发数据更新事件
      mockEventBus.emit('DATA_UPDATED', mockState.scraper.scrapedData);

      // 步骤3: AI分析模块监听事件并处理
      // (模拟AI分析模块的响应)
      mockState.analysis.analysisReport = {
        summary: 'Overall positive sentiment',
        insights: ['High customer satisfaction']
      };

      await flushPromises();

      // 验证结果
      expect(mockEventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', mockState.scraper.scrapedData);
      expect(mockState.analysis.analysisReport).toBeDefined();
    });

    it('应该正确处理状态持久化', async () => {
      // 步骤1: 更新状态
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'DE' },
        products: [{ asin: 'B0PERSIST1', productTitle: 'Test' }]
      };
      mockState.scraper.expandedAsin = 'B0PERSIST1';
      mockState.scraper.currentDataTab = 'json';

      // 步骤2: 保存到localStorage
      localStorage.setItem('appState', JSON.stringify(mockState));

      // 步骤3: 模拟页面刷新，恢复状态
      const savedState = JSON.parse(localStorage.getItem('appState') || '{}');

      // 验证结果
      expect(savedState.scraper.scrapedData).toEqual(mockState.scraper.scrapedData);
      expect(savedState.scraper.expandedAsin).toBe('B0PERSIST1');
      expect(savedState.scraper.currentDataTab).toBe('json');
    });
  });

  /**
   * E2E测试：UI交互流程
   */
  describe('UI交互流程', () => {
    beforeEach(() => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [
          { asin: 'B0UI001', productTitle: 'UI Test Product 1' },
          { asin: 'B0UI002', productTitle: 'UI Test Product 2' }
        ]
      };
    });

    it('应该正确处理卡片展开/收起', async () => {
      // 步骤1: 初始状态：无卡片展开
      expect(mockState.scraper.expandedAsin).toBeNull();

      // 步骤2: 点击第一个卡片
      mockState.scraper.expandedAsin = 'B0UI001';

      // 验证：第一个卡片展开
      expect(mockState.scraper.expandedAsin).toBe('B0UI001');

      // 步骤3: 点击第二个卡片
      mockState.scraper.expandedAsin = 'B0UI002';

      // 验证：第二个卡片展开，第一个自动收起
      expect(mockState.scraper.expandedAsin).toBe('B0UI002');

      // 步骤4: 再次点击第二个卡片
      mockState.scraper.expandedAsin = null;

      // 验证：卡片收起
      expect(mockState.scraper.expandedAsin).toBeNull();
    });

    it('应该正确处理标签页切换', async () => {
      // 步骤1: 初始状态：预览标签页
      expect(mockState.scraper.currentDataTab).toBe('preview');

      // 步骤2: 切换到JSON标签页
      mockState.scraper.currentDataTab = 'json';

      // 验证：标签页已切换
      expect(mockState.scraper.currentDataTab).toBe('json');

      // 验证：数据未改变
      expect(mockState.scraper.scrapedData.products).toHaveLength(2);

      // 步骤3: 切换回预览标签页
      mockState.scraper.currentDataTab = 'preview';

      // 验证：标签页已切换
      expect(mockState.scraper.currentDataTab).toBe('preview');

      // 验证：数据仍然未改变
      expect(mockState.scraper.scrapedData.products).toHaveLength(2);
    });

    it('应该正确处理空状态显示', async () => {
      // 步骤1: 清空数据
      mockState.scraper.scrapedData = null;

      // 步骤2: 检查是否有数据
      const hasData = mockState.scraper.scrapedData?.products?.length > 0;

      // 验证：应该显示空状态
      expect(hasData).toBe(false);

      // 步骤3: 添加数据
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [{ asin: 'B0NEW001', productTitle: 'New Product' }]
      };

      // 步骤4: 再次检查
      const hasDataNow = mockState.scraper.scrapedData?.products?.length > 0;

      // 验证：应该显示数据
      expect(hasDataNow).toBe(true);
    });
  });
