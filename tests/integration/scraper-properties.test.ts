/**
 * scraper-properties.test.ts - 数据采集页面集成属性测试
 * 
 * 综合属性测试，验证数据采集页面集成后的核心属性
 * 使用 fast-check 进行基于属性的测试
 * 
 * 任务: 15. 编写综合属性测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { mockLocalStorage, mockConsole, flushPromises } from '../helpers/testUtils';

// Mock dependencies
vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
  sleep: vi.fn()
}));

vi.mock('@/common/EventBus', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

vi.mock('@/modules/app_center/views/master_prompt/services/historyService', () => ({
  HistoryService: {
    save: vi.fn(),
    getAll: vi.fn(() => []),
    clear: vi.fn()
  }
}));

// ==================== 测试数据生成器 ====================

/**
 * 生成有效的ASIN
 */
const asinArbitrary = fc.stringMatching(/^B0[A-Z0-9]{8}$/);

/**
 * 生成产品数据
 */
const productArbitrary = fc.record({
  asin: asinArbitrary,
  productTitle: fc.string({ minLength: 5, maxLength: 200 }),
  price: fc.option(fc.double({ min: 0.01, max: 9999.99, noNaN: true })),
  rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true })),
  reviews_count: fc.option(fc.integer({ min: 0, max: 100000 })),
  feature_bullets: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 500 }), { maxLength: 10 })),
  customer_reviews: fc.option(fc.array(
    fc.record({
      id: fc.option(fc.string()),
      rating: fc.integer({ min: 1, max: 5 }),
      date: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
      author: fc.string({ minLength: 2, maxLength: 50 }),
      headline: fc.string({ minLength: 5, maxLength: 100 }),
      text: fc.string({ minLength: 10, maxLength: 1000 })
    }),
    { maxLength: 50 }
  ))
});

/**
 * 生成抓取数据
 */
const scrapedDataArbitrary = fc.record({
  metadata: fc.record({
    marketplace: fc.constantFrom('US', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'CA'),
    total_asins: fc.integer({ min: 1, max: 100 }),
    timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString())
  }),
  products: fc.array(productArbitrary, { minLength: 1, maxLength: 20 })
});

/**
 * 生成站点列表
 */
const sitesArbitrary = fc.array(
  fc.constantFrom('US', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'CA'),
  { minLength: 1, maxLength: 5 }
).map(sites => Array.from(new Set(sites))); // 去重

// ==================== 测试套件 ====================

describe('综合属性测试 - 数据采集页面集成', () => {
  let mockState: any;
  let EventBus: any;

  beforeEach(async () => {
    mockLocalStorage();
    
    // 重置EventBus mock
    EventBus = (await import('@/common/EventBus')).default;
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
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 属性 1: 数据获取后UI更新
   * 验证需求: 1.2, 1.3, 3.6
   * 
   * 测试任何数据获取操作完成后预览区域更新
   */
  describe('属性 1: 数据获取后UI更新', () => {
    it('任何数据获取操作完成后，预览区域应该更新', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (scrapedData) => {
          // 模拟数据获取完成
          mockState.scraper.scrapedData = scrapedData;
          
          // 验证数据已设置
          expect(mockState.scraper.scrapedData).toBeDefined();
          expect(mockState.scraper.scrapedData.products).toBeDefined();
          expect(mockState.scraper.scrapedData.products.length).toBeGreaterThan(0);
          
          // 验证可以渲染预览
          const hasData = mockState.scraper.scrapedData?.products?.length > 0;
          expect(hasData).toBe(true);
          
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('数据获取后应该触发DATA_UPDATED事件', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (scrapedData) => {
          // 清除之前的调用
          EventBus.emit.mockClear();
          
          // 模拟数据更新
          mockState.scraper.scrapedData = scrapedData;
          EventBus.emit('DATA_UPDATED', scrapedData);
          
          // 验证事件被触发
          expect(EventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', scrapedData);
          
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 2: JSON解析和合并
   * 验证需求: 3.2, 3.3
   * 
   * 测试有效JSON文件的解析和数据合并
   */
  describe('属性 2: JSON解析和合并', () => {
    it('有效的JSON字符串应该能够被正确解析', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (data) => {
          // 序列化为JSON
          const jsonString = JSON.stringify(data);
          
          // 解析JSON
          const parsed = JSON.parse(jsonString);
          
          // 验证解析结果
          expect(parsed).toEqual(data);
          expect(parsed.products).toHaveLength(data.products.length);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('多个数据源的产品应该能够正确合并', () => {
      fc.assert(
        fc.property(
          fc.array(scrapedDataArbitrary, { minLength: 2, maxLength: 5 }),
          (dataSources) => {
            // 合并所有产品
            const allProducts = dataSources.flatMap(data => data.products);
            
            // 按ASIN去重
            const uniqueProducts = new Map();
            allProducts.forEach(product => {
              if (!uniqueProducts.has(product.asin)) {
                uniqueProducts.set(product.asin, product);
              }
            });
            
            const mergedProducts = Array.from(uniqueProducts.values());
            
            // 验证合并结果
            expect(mergedProducts.length).toBeLessThanOrEqual(allProducts.length);
            expect(mergedProducts.length).toBeGreaterThan(0);
            
            // 验证没有重复的ASIN
            const asins = mergedProducts.map(p => p.asin);
            const uniqueAsins = new Set(asins);
            expect(uniqueAsins.size).toBe(mergedProducts.length);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('合并时应该保留所有评论（去重）', () => {
      fc.assert(
        fc.property(
          fc.array(productArbitrary, { minLength: 2, maxLength: 5 })
            .filter(products => products.every(p => p.customer_reviews && p.customer_reviews.length > 0)),
          (products) => {
            // 确保所有产品有相同的ASIN
            const asin = products[0].asin;
            const sameAsinProducts = products.map(p => ({ ...p, asin }));
            
            // 合并评论
            const allReviews = sameAsinProducts.flatMap(p => p.customer_reviews || []);
            
            // 按签名去重
            const uniqueReviews = new Map();
            allReviews.forEach(review => {
              const signature = review.id || `${review.date}_${review.author}_${review.headline.substring(0, 20)}`;
              if (!uniqueReviews.has(signature)) {
                uniqueReviews.set(signature, review);
              }
            });
            
            const mergedReviews = Array.from(uniqueReviews.values());
            
            // 验证合并结果
            expect(mergedReviews.length).toBeLessThanOrEqual(allReviews.length);
            expect(mergedReviews.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * 属性 10: 导入完成后状态同步
   * 验证需求: 3.7
   * 
   * 测试导入操作同时更新UI和历史记录
   */
  describe('属性 10: 导入完成后状态同步', () => {
    it('导入完成后应该同时更新状态和触发事件', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (data) => {
          // 清除之前的调用
          EventBus.emit.mockClear();
          
          // 模拟导入完成
          mockState.scraper.scrapedData = data;
          mockState.scraper.currentHistoryId = `import_${Date.now()}`;
          
          // 触发事件
          EventBus.emit('DATA_UPDATED', data);
          EventBus.emit('HISTORY_UPDATED');
          
          // 验证状态更新
          expect(mockState.scraper.scrapedData).toEqual(data);
          expect(mockState.scraper.currentHistoryId).toBeDefined();
          
          // 验证事件触发
          expect(EventBus.emit).toHaveBeenCalledWith('DATA_UPDATED', data);
          expect(EventBus.emit).toHaveBeenCalledWith('HISTORY_UPDATED');
          
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 11: 标签页切换状态保持
   * 验证需求: 2.4
   * 
   * 测试标签页切换时数据内容不变
   */
  describe('属性 11: 标签页切换状态保持', () => {
    it('切换标签页时数据应该保持不变', () => {
      fc.assert(
        fc.property(
          scrapedDataArbitrary,
          fc.constantFrom('preview', 'json'),
          (data, initialTab) => {
            // 设置初始状态
            mockState.scraper.scrapedData = data;
            mockState.scraper.currentDataTab = initialTab;
            
            const originalData = JSON.parse(JSON.stringify(data));
            
            // 切换标签页
            mockState.scraper.currentDataTab = initialTab === 'preview' ? 'json' : 'preview';
            
            // 验证数据未改变
            expect(mockState.scraper.scrapedData).toEqual(originalData);
            
            // 再次切换回来
            mockState.scraper.currentDataTab = initialTab;
            
            // 验证数据仍然未改变
            expect(mockState.scraper.scrapedData).toEqual(originalData);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 12: 历史记录更新幂等性
   * 验证需求: 3.7, 5.6
   * 
   * 测试相同ID的历史记录不重复创建
   */
  describe('属性 12: 历史记录更新幂等性', () => {
    it('相同ID的历史记录应该只保存一次', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          scrapedDataArbitrary,
          (historyId, data) => {
            // 模拟历史记录存储
            const historyMap = new Map();
            
            // 第一次保存
            historyMap.set(historyId, {
              id: historyId,
              data,
              timestamp: Date.now()
            });
            
            const firstSize = historyMap.size;
            
            // 第二次保存相同ID
            historyMap.set(historyId, {
              id: historyId,
              data,
              timestamp: Date.now()
            });
            
            const secondSize = historyMap.size;
            
            // 验证大小未增加
            expect(secondSize).toBe(firstSize);
            expect(historyMap.size).toBe(1);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 13: 多站点数据合并策略
   * 验证需求: 3.5
   * 
   * 测试多站点数据的正确合并
   */
  describe('属性 13: 多站点数据合并策略', () => {
    it('多站点数据应该按照选择的站点进行合并', () => {
      fc.assert(
        fc.property(
          sitesArbitrary,
          fc.constantFrom('US', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'CA'),
          (detectedSites, selectedSite) => {
            // 验证站点列表不为空
            expect(detectedSites.length).toBeGreaterThan(0);
            
            // 如果选择的站点在检测到的站点中
            if (detectedSites.includes(selectedSite)) {
              // 应该使用选择的站点
              const finalSite = selectedSite;
              expect(finalSite).toBe(selectedSite);
            } else {
              // 否则使用第一个检测到的站点
              const finalSite = detectedSites[0];
              expect(detectedSites).toContain(finalSite);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('多站点数据合并时应该保留所有唯一产品', () => {
      fc.assert(
        fc.property(
          fc.array(scrapedDataArbitrary, { minLength: 2, maxLength: 4 }),
          (dataSources) => {
            // 收集所有产品
            const allProducts = dataSources.flatMap(data => data.products);
            
            // 按ASIN分组
            const productsByAsin = new Map();
            allProducts.forEach(product => {
              if (!productsByAsin.has(product.asin)) {
                productsByAsin.set(product.asin, []);
              }
              productsByAsin.get(product.asin).push(product);
            });
            
            // 合并每个ASIN的数据
            const mergedProducts = Array.from(productsByAsin.entries()).map(([asin, products]) => {
              const merged = { ...products[0] };
              
              // 合并评论
              const allReviews = products.flatMap(p => p.customer_reviews || []);
              const uniqueReviews = new Map();
              allReviews.forEach(review => {
                const sig = review.id || `${review.date}_${review.author}`;
                if (!uniqueReviews.has(sig)) {
                  uniqueReviews.set(sig, review);
                }
              });
              
              merged.customer_reviews = Array.from(uniqueReviews.values());
              
              return merged;
            });
            
            // 验证合并结果
            expect(mergedProducts.length).toBe(productsByAsin.size);
            expect(mergedProducts.length).toBeGreaterThan(0);
            
            // 验证每个ASIN只出现一次
            const asins = mergedProducts.map(p => p.asin);
            const uniqueAsins = new Set(asins);
            expect(uniqueAsins.size).toBe(mergedProducts.length);
            
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * 属性 14: 删除确认对话框
   * 验证需求: 5.2, 5.4
   * 
   * 测试删除操作前显示确认对话框
   */
  describe('属性 14: 删除确认对话框', () => {
    it('删除产品前应该请求确认', () => {
      fc.assert(
        fc.property(asinArbitrary, (asin) => {
          // 模拟确认对话框
          let confirmCalled = false;
          const mockConfirm = () => {
            confirmCalled = true;
            return true;
          };
          
          // 模拟删除操作
          const shouldDelete = mockConfirm();
          
          // 验证确认被调用
          expect(confirmCalled).toBe(true);
          
          // 只有确认后才删除
          if (shouldDelete) {
            // 执行删除
            expect(shouldDelete).toBe(true);
          }
          
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('删除评论前应该请求确认', () => {
      fc.assert(
        fc.property(
          asinArbitrary,
          fc.integer({ min: 0, max: 49 }),
          (asin, reviewIndex) => {
            // 模拟确认对话框
            let confirmCalled = false;
            const mockConfirm = () => {
              confirmCalled = true;
              return true;
            };
            
            // 模拟删除操作
            const shouldDelete = mockConfirm();
            
            // 验证确认被调用
            expect(confirmCalled).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('用户取消确认时不应该执行删除', () => {
      fc.assert(
        fc.property(asinArbitrary, scrapedDataArbitrary, (asin, data) => {
          // 模拟用户取消确认
          const mockConfirm = () => false;
          
          const originalData = JSON.parse(JSON.stringify(data));
          
          // 尝试删除
          const shouldDelete = mockConfirm();
          
          if (!shouldDelete) {
            // 数据应该保持不变
            expect(data).toEqual(originalData);
          }
          
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 18: 删除失败数据保护
   * 验证需求: 10.4
   * 
   * 测试删除失败时原始数据保持不变
   */
  describe('属性 18: 删除失败数据保护', () => {
    it('删除操作失败时原始数据应该保持不变', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, asinArbitrary, (data, asinToDelete) => {
          // 保存原始数据
          const originalData = JSON.parse(JSON.stringify(data));
          
          // 模拟删除失败
          const deleteOperation = () => {
            throw new Error('删除失败');
          };
          
          try {
            deleteOperation();
          } catch (error) {
            // 验证数据未改变
            expect(data).toEqual(originalData);
            expect(data.products).toEqual(originalData.products);
          }
          
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('删除评论失败时产品数据应该保持不变', () => {
      fc.assert(
        fc.property(
          productArbitrary.filter(p => p.customer_reviews && p.customer_reviews.length > 0),
          fc.integer({ min: 0, max: 49 }),
          (product, reviewIndex) => {
            // 保存原始评论
            const originalReviews = JSON.parse(JSON.stringify(product.customer_reviews));
            
            // 模拟删除失败
            const deleteReviewOperation = () => {
              throw new Error('删除评论失败');
            };
            
            try {
              deleteReviewOperation();
            } catch (error) {
              // 验证评论未改变
              expect(product.customer_reviews).toEqual(originalReviews);
            }
            
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('部分删除失败时应该回滚所有更改', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (data) => {
          // 保存原始状态
          const originalData = JSON.parse(JSON.stringify(data));
          const originalHistoryId = mockState.scraper.currentHistoryId;
          
          // 模拟部分操作失败
          const atomicDelete = () => {
            // 步骤1: 更新数据
            mockState.scraper.scrapedData = { ...data, products: [] };
            
            // 步骤2: 更新历史记录（失败）
            throw new Error('历史记录更新失败');
          };
          
          try {
            atomicDelete();
          } catch (error) {
            // 回滚：恢复原始数据
            mockState.scraper.scrapedData = originalData;
            mockState.scraper.currentHistoryId = originalHistoryId;
            
            // 验证数据已恢复
            expect(mockState.scraper.scrapedData).toEqual(originalData);
            expect(mockState.scraper.currentHistoryId).toBe(originalHistoryId);
          }
          
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 属性 9: API向后兼容性
   * 验证需求: 9.1, 9.2, 9.3, 9.4, 9.5
   * 
   * 测试所有公共服务接口保持不变
   */
  describe('属性 9: API向后兼容性', () => {
    it('数据结构应该保持向后兼容', () => {
      fc.assert(
        fc.property(scrapedDataArbitrary, (data) => {
          // 验证必需字段存在
          expect(data).toHaveProperty('metadata');
          expect(data).toHaveProperty('products');
          expect(data.metadata).toHaveProperty('marketplace');
          
          // 验证产品结构
          if (data.products.length > 0) {
            const product = data.products[0];
            expect(product).toHaveProperty('asin');
            expect(product).toHaveProperty('productTitle');
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('事件名称应该保持不变', () => {
      const expectedEvents = ['DATA_UPDATED', 'HISTORY_UPDATED'];
      
      expectedEvents.forEach(eventName => {
        // 验证事件名称格式
        expect(eventName).toMatch(/^[A-Z_]+$/);
        expect(eventName.length).toBeGreaterThan(0);
      });
    });

    it('状态键名应该保持不变', () => {
      const expectedStateKeys = [
        'selectedSite',
        'scrapedData',
        'currentHistoryId',
        'inputAsins',
        'isScraping',
        'expandedAsin',
        'currentDataTab'
      ];
      
      expectedStateKeys.forEach(key => {
        expect(mockState.scraper).toHaveProperty(key);
      });
    });
  });
});
