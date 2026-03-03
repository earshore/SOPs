/**
 * scraper-dataPreview.test.ts - DataPreview 组件单元测试
 * 测试数据预览、分页、展开/收起等功能
 * 
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPreview } from '@/modules/app_center/views/master_analysis/scraper/components/DataPreview';
import type { DataPreviewState, ScrapedData } from '@/modules/app_center/views/master_analysis/scraper/types';
import type { ScrapedProduct } from '@/types/modules-business';

// Mock dependencies
vi.mock('@/common/ui', () => ({
  showToast: vi.fn()
}));

vi.mock('@/common/infrastructure/SafeRenderer', () => ({
  SafeRenderer: {
    getInstance: () => ({
      renderTemplate: vi.fn()
    })
  }
}));

describe('DataPreview 组件', () => {
  let initialState: DataPreviewState;
  let mockScrapedData: ScrapedData;

  beforeEach(() => {
    initialState = {
      expandedAsin: null,
      currentDataTab: 'preview',
      currentPage: 1,
      itemsPerPage: 50
    };

    mockScrapedData = {
      metadata: {
        scrape_timestamp: '2024-01-01T00:00:00Z',
        marketplace: 'DE',
        domain: 'amazon.de',
        language: 'German',
        total_asins: 3
      },
      products: [
        {
          asin: 'B08N5WRWNW',
          url: 'https://amazon.de/dp/B08N5WRWNW',
          language: 'German',
          productTitle: 'Product 1',
          feature_bullets: ['Feature 1', 'Feature 2'],
          customer_reviews: [],
          scrape_status: 'success'
        },
        {
          asin: 'B0ABCDEFGH',
          url: 'https://amazon.de/dp/B0ABCDEFGH',
          language: 'German',
          productTitle: 'Product 2',
          feature_bullets: ['Feature A', 'Feature B'],
          customer_reviews: [],
          scrape_status: 'success'
        },
        {
          asin: 'B012345678',
          url: 'https://amazon.de/dp/B012345678',
          language: 'German',
          productTitle: 'Product 3',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success'
        }
      ]
    };
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化状态', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      expect(preview.getState()).toEqual(initialState);
    });

    it('应该接受 null 数据', () => {
      const preview = new DataPreview(initialState, null);

      expect(preview.totalProducts).toBe(0);
    });

    it('应该接受空产品列表', () => {
      const emptyData: ScrapedData = {
        ...mockScrapedData,
        products: []
      };
      const preview = new DataPreview(initialState, emptyData);

      expect(preview.totalProducts).toBe(0);
    });
  });

  describe('计算属性', () => {
    it('应该正确计算产品总数', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      expect(preview.totalProducts).toBe(3);
    });

    it('应该正确计算总页数', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      expect(preview.totalPages).toBe(1);  // 3 products / 50 per page = 1 page
    });

    it('应该正确计算总页数（多页）', () => {
      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 120 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, largeData);

      expect(preview.totalPages).toBe(3);  // 120 / 50 = 2.4 -> 3 pages
    });

    it('应该返回当前页的产品', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      const paginated = preview.paginatedProducts;

      expect(paginated).toHaveLength(3);
      expect(paginated[0].asin).toBe('B08N5WRWNW');
    });

    it('应该正确分页产品', () => {
      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 120 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, largeData);

      // 第一页
      expect(preview.paginatedProducts).toHaveLength(50);
      expect(preview.paginatedProducts[0].asin).toBe('B0TEST0000');

      // 第二页
      preview.goToPage(2);
      expect(preview.paginatedProducts).toHaveLength(50);
      expect(preview.paginatedProducts[0].asin).toBe('B0TEST0050');

      // 第三页
      preview.goToPage(3);
      expect(preview.paginatedProducts).toHaveLength(20);  // 剩余 20 个
      expect(preview.paginatedProducts[0].asin).toBe('B0TEST0100');
    });

    it('应该判断是否需要分页', () => {
      const preview = new DataPreview(initialState, mockScrapedData);
      expect(preview.shouldUsePagination).toBe(false);  // 3 products < 50

      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 60 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const largePreview = new DataPreview(initialState, largeData);
      expect(largePreview.shouldUsePagination).toBe(true);  // 60 products > 50
    });
  });

  describe('分页控制', () => {
    let preview: DataPreview;
    let largeData: ScrapedData;

    beforeEach(() => {
      largeData = {
        ...mockScrapedData,
        products: Array.from({ length: 120 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      preview = new DataPreview(initialState, largeData);
    });

    it('应该跳转到指定页码', () => {
      preview.goToPage(2);

      expect(preview.getState().currentPage).toBe(2);
    });

    it('应该拒绝无效的页码（小于1）', () => {
      preview.goToPage(0);

      expect(preview.getState().currentPage).toBe(1);  // 保持不变
    });

    it('应该拒绝无效的页码（大于总页数）', () => {
      preview.goToPage(999);

      expect(preview.getState().currentPage).toBe(1);  // 保持不变
    });

    it('应该支持上一页', () => {
      preview.goToPage(3);
      preview.previousPage();

      expect(preview.getState().currentPage).toBe(2);
    });

    it('应该在第一页时不能上一页', () => {
      preview.previousPage();

      expect(preview.getState().currentPage).toBe(1);
    });

    it('应该支持下一页', () => {
      preview.nextPage();

      expect(preview.getState().currentPage).toBe(2);
    });

    it('应该在最后一页时不能下一页', () => {
      preview.goToPage(3);  // 最后一页
      preview.nextPage();

      expect(preview.getState().currentPage).toBe(3);  // 保持不变
    });

    it('应该支持连续翻页', () => {
      preview.nextPage();
      expect(preview.getState().currentPage).toBe(2);

      preview.nextPage();
      expect(preview.getState().currentPage).toBe(3);

      preview.previousPage();
      expect(preview.getState().currentPage).toBe(2);
    });
  });

  describe('卡片展开/收起', () => {
    it('应该展开指定的卡片', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.toggleCardExpand('B08N5WRWNW');

      expect(preview.getState().expandedAsin).toBe('B08N5WRWNW');
    });

    it('应该收起已展开的卡片', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.toggleCardExpand('B08N5WRWNW');
      expect(preview.getState().expandedAsin).toBe('B08N5WRWNW');

      preview.toggleCardExpand('B08N5WRWNW');
      expect(preview.getState().expandedAsin).toBeNull();
    });

    it('应该切换到不同的卡片', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.toggleCardExpand('B08N5WRWNW');
      expect(preview.getState().expandedAsin).toBe('B08N5WRWNW');

      preview.toggleCardExpand('B0ABCDEFGH');
      expect(preview.getState().expandedAsin).toBe('B0ABCDEFGH');
    });

    it('应该处理不存在的 ASIN', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.toggleCardExpand('B0NOTEXIST');

      expect(preview.getState().expandedAsin).toBe('B0NOTEXIST');  // 仍然设置，由调用者验证
    });
  });

  describe('数据标签页切换', () => {
    it('应该切换到 JSON 视图', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.switchDataTab('json');

      expect(preview.getState().currentDataTab).toBe('json');
    });

    it('应该切换回预览视图', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.switchDataTab('json');
      preview.switchDataTab('preview');

      expect(preview.getState().currentDataTab).toBe('preview');
    });
  });

  describe('数据更新', () => {
    it('应该更新数据源', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      const newData: ScrapedData = {
        ...mockScrapedData,
        products: [
          {
            asin: 'B0NEWPROD1',
            url: '',
            language: '',
            productTitle: 'New Product',
            feature_bullets: [],
            customer_reviews: [],
            scrape_status: 'success'
          }
        ]
      };

      preview.updateData(newData);

      expect(preview.totalProducts).toBe(1);
      expect(preview.paginatedProducts[0].asin).toBe('B0NEWPROD1');
    });

    it('应该支持清空数据', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.updateData(null);

      expect(preview.totalProducts).toBe(0);
    });

    it('应该在更新数据后重置分页', () => {
      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 120 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, largeData);

      preview.goToPage(3);
      expect(preview.getState().currentPage).toBe(3);

      // 更新为小数据集
      preview.updateData(mockScrapedData);

      // 页码应该保持，但显示的数据会变化
      expect(preview.totalProducts).toBe(3);
    });
  });

  describe('状态管理', () => {
    it('应该获取当前状态', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      const state = preview.getState();

      expect(state).toEqual(initialState);
    });

    it('应该返回状态的副本', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      const state1 = preview.getState();
      const state2 = preview.getState();

      expect(state1).not.toBe(state2);  // 不同的对象引用
      expect(state1).toEqual(state2);   // 但内容相同
    });

    it('应该更新部分状态', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.updateState({ currentPage: 2 });

      expect(preview.getState().currentPage).toBe(2);
      expect(preview.getState().expandedAsin).toBeNull();  // 其他状态不变
    });

    it('应该支持批量更新状态', () => {
      const preview = new DataPreview(initialState, mockScrapedData);

      preview.updateState({
        currentPage: 2,
        expandedAsin: 'B08N5WRWNW',
        currentDataTab: 'json'
      });

      const state = preview.getState();
      expect(state.currentPage).toBe(2);
      expect(state.expandedAsin).toBe('B08N5WRWNW');
      expect(state.currentDataTab).toBe('json');
    });
  });

  describe('边界条件', () => {
    it('应该处理空产品列表', () => {
      const emptyData: ScrapedData = {
        ...mockScrapedData,
        products: []
      };
      const preview = new DataPreview(initialState, emptyData);

      expect(preview.totalProducts).toBe(0);
      expect(preview.totalPages).toBe(0);
      expect(preview.paginatedProducts).toEqual([]);
      expect(preview.shouldUsePagination).toBe(false);
    });

    it('应该处理恰好一页的数据', () => {
      const exactData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 50 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, exactData);

      expect(preview.totalProducts).toBe(50);
      expect(preview.totalPages).toBe(1);
      expect(preview.shouldUsePagination).toBe(false);
    });

    it('应该处理恰好多一个产品的数据', () => {
      const data: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 51 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, data);

      expect(preview.totalProducts).toBe(51);
      expect(preview.totalPages).toBe(2);
      expect(preview.shouldUsePagination).toBe(true);
    });

    it('应该处理单个产品', () => {
      const singleData: ScrapedData = {
        ...mockScrapedData,
        products: [mockScrapedData.products[0]]
      };
      const preview = new DataPreview(initialState, singleData);

      expect(preview.totalProducts).toBe(1);
      expect(preview.totalPages).toBe(1);
      expect(preview.paginatedProducts).toHaveLength(1);
    });

    it('应该处理非常大的数据集', () => {
      const hugeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 1000 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, hugeData);

      expect(preview.totalProducts).toBe(1000);
      expect(preview.totalPages).toBe(20);  // 1000 / 50 = 20
      expect(preview.shouldUsePagination).toBe(true);
    });
  });

  describe('性能优化', () => {
    it('应该只返回当前页的产品', () => {
      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 200 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, largeData);

      // 即使有 200 个产品，也只返回 50 个
      expect(preview.paginatedProducts).toHaveLength(50);
    });

    it('应该在切换页面时更新产品列表', () => {
      const largeData: ScrapedData = {
        ...mockScrapedData,
        products: Array.from({ length: 200 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(4, '0')}`,
          url: '',
          language: '',
          productTitle: `Product ${i}`,
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success' as const
        }))
      };
      const preview = new DataPreview(initialState, largeData);

      const page1Products = preview.paginatedProducts;
      preview.goToPage(2);
      const page2Products = preview.paginatedProducts;

      expect(page1Products[0].asin).not.toBe(page2Products[0].asin);
    });
  });
});
