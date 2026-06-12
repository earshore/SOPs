/**
 * scraper-handlers.test.ts - Scraper 处理器单元测试
 * 测试采集流程处理、任务状态更新和数据处理逻辑
 * 
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { showToast } from '@/common/ui';
import { updateTask, handleScrapeComplete, saveScrapeSnapshot } from '@/modules/app_center/views/master_analysis/scraper/handlers/scrapeHandler';
import { deleteProduct, deleteReview } from '@/modules/app_center/views/master_analysis/scraper/handlers/dataOperations';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import type { Task } from '@/modules/app_center/views/master_analysis/scraper/types';
import type { CustomerReview, ScrapedData, ScrapedProduct, ScraperSite } from '@/types/modules-business';

// Mock dependencies
vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    save: vi.fn(),
    saveAsync: vi.fn(() => Promise.resolve()),
    getAll: vi.fn(() => []),
    clear: vi.fn()
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

vi.mock('@/common/constants/constants', () => ({
  APP_VERSION: 'test',
  LANGUAGE_HEADERS: {
    DE: { domain: 'amazon.de', name: 'German' },
    FR: { domain: 'amazon.fr', name: 'French' },
    IT: { domain: 'amazon.it', name: 'Italian' },
    ES: { domain: 'amazon.es', name: 'Spanish' },
    UK: { domain: 'amazon.co.uk', name: 'English (UK)' }
  }
}));

function createReview(id: string): CustomerReview {
  return {
    id,
    author: 'Tester',
    headline: `Review ${id}`,
    body: `Review body ${id}`,
    star_rating: 5,
    is_verified: true,
    review_date: '2026-01-01'
  };
}

function createScrapedData(): ScrapedData {
  return {
    metadata: {
      scrape_timestamp: '2026-01-01T00:00:00.000Z',
      marketplace: 'US',
      domain: 'amazon.com',
      language: 'English',
      total_asins: 2
    },
    products: [
      {
        asin: 'B000000001',
        url: '',
        language: 'English',
        productTitle: 'Product 1',
        feature_bullets: [],
        customer_reviews: [createReview('R1'), createReview('R2')],
        scrape_status: 'success',
        error: ''
      },
      {
        asin: 'B000000002',
        url: '',
        language: 'English',
        productTitle: 'Product 2',
        feature_bullets: [],
        customer_reviews: [createReview('R3')],
        scrape_status: 'success',
        error: ''
      }
    ]
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(HistoryService.saveAsync).mockResolvedValue([]);
});

describe('Scraper 处理器', () => {
  describe('updateTask - 更新任务状态', () => {
    let tasks: Task[];

    beforeEach(() => {
      tasks = [
        { asin: 'B08N5WRWNW', status: 'pending', message: '等待中...' },
        { asin: 'B0ABCDEFGH', status: 'pending', message: '等待中...' },
        { asin: 'B012345678', status: 'pending', message: '等待中...' }
      ];
    });

    it('应该更新指定 ASIN 的任务状态', () => {
      updateTask(tasks, 'B08N5WRWNW', 'scraping', '正在采集...');

      expect(tasks[0].status).toBe('scraping');
      expect(tasks[0].message).toBe('正在采集...');
    });

    it('应该只更新匹配的任务', () => {
      updateTask(tasks, 'B0ABCDEFGH', 'success', '采集成功');

      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('success');
      expect(tasks[2].status).toBe('pending');
    });

    it('应该处理失败状态', () => {
      updateTask(tasks, 'B012345678', 'failed', '采集失败: 404');

      expect(tasks[2].status).toBe('failed');
      expect(tasks[2].message).toBe('采集失败: 404');
    });

    it('应该为成功状态设置富文本消息', () => {
      const richMessage = '<div class="success">采集成功</div>';
      updateTask(tasks, 'B08N5WRWNW', 'success', richMessage);

      expect(tasks[0].status).toBe('success');
      expect(tasks[0].richMsg).toBe(richMessage);
    });

    it('应该处理不存在的 ASIN', () => {
      const originalTasks = [...tasks];
      updateTask(tasks, 'B0NOTEXIST', 'success', '成功');

      // 任务列表不应该改变
      expect(tasks).toEqual(originalTasks);
    });

    it('应该处理空任务列表', () => {
      const emptyTasks: Task[] = [];
      updateTask(emptyTasks, 'B08N5WRWNW', 'success', '成功');

      expect(emptyTasks).toHaveLength(0);
    });

    it('应该支持所有任务状态', () => {
      const statuses: Task['status'][] = ['pending', 'scraping', 'success', 'failed'];

      statuses.forEach((status, index) => {
        if (tasks[index]) {
          updateTask(tasks, tasks[index].asin, status, `状态: ${status}`);
          expect(tasks[index].status).toBe(status);
        }
      });
    });

    it('应该覆盖之前的消息', () => {
      updateTask(tasks, 'B08N5WRWNW', 'scraping', '第一条消息');
      expect(tasks[0].message).toBe('第一条消息');

      updateTask(tasks, 'B08N5WRWNW', 'success', '第二条消息');
      expect(tasks[0].message).toBe('第二条消息');
    });
  });

  describe('handleScrapeComplete - 处理采集完成', () => {
    it('应该创建有效的 ScrapedData 结构', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: 'https://amazon.de/dp/B08N5WRWNW',
          language: 'German',
          productTitle: 'Test Product 1',
          feature_bullets: ['Feature 1', 'Feature 2'],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW'];
      const selectedSite: ScraperSite = 'DE';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('products');
      expect(result.metadata.marketplace).toBe('DE');
      expect(result.metadata.domain).toBe('amazon.de');
      expect(result.metadata.language).toBe('German');
      expect(result.metadata.total_asins).toBe(1);
      expect(result.products).toHaveLength(1);
    });

    it('应该包含时间戳', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Test',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW'];
      const selectedSite: ScraperSite = 'DE';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.metadata.scrape_timestamp).toBeDefined();
      expect(new Date(result.metadata.scrape_timestamp).getTime()).toBeGreaterThan(0);
    });

    it('应该处理空产品列表', () => {
      const products: ScrapedProduct[] = [];
      const validAsins = ['B08N5WRWNW', 'B0ABCDEFGH'];
      const selectedSite: ScraperSite = 'FR';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].scrape_status).toBe('failed');
      expect(result.products[0].error).toBe('Unknown Error');
      expect(result.products[1].scrape_status).toBe('failed');
    });

    it('应该处理 null 产品列表', () => {
      const products = null as any;
      const validAsins = ['B08N5WRWNW'];
      const selectedSite: ScraperSite = 'IT';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].scrape_status).toBe('failed');
    });

    it('应该处理多个产品', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Product 1',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        },
        {
          asin: 'B0ABCDEFGH',
          url: '',
          language: '',
          productTitle: 'Product 2',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW', 'B0ABCDEFGH'];
      const selectedSite: ScraperSite = 'ES';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.products).toHaveLength(2);
      expect(result.metadata.total_asins).toBe(2);
    });

    it('应该处理混合成功和失败的产品', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Success Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        },
        {
          asin: 'B0ABCDEFGH',
          url: '',
          language: '',
          productTitle: '',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'failed',
          error: '404 Not Found'
        }
      ];
      const validAsins = ['B08N5WRWNW', 'B0ABCDEFGH'];
      const selectedSite: ScraperSite = 'UK';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.products).toHaveLength(2);
      expect(result.products[0].scrape_status).toBe('success');
      expect(result.products[1].scrape_status).toBe('failed');
    });

    it('应该为不同站点设置正确的 metadata', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Test',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW'];

      const sites: ScraperSite[] = ['DE', 'FR', 'IT', 'ES', 'UK'];
      const expectedDomains = ['amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.co.uk'];

      sites.forEach((site, index) => {
        const result = handleScrapeComplete(products, validAsins, site);
        expect(result.metadata.marketplace).toBe(site);
        expect(result.metadata.domain).toBe(expectedDomains[index]);
      });
    });

    it('应该处理未知站点', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Test',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW'];
      const selectedSite = 'UNKNOWN' as ScraperSite;

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      expect(result.metadata.marketplace).toBe('UNKNOWN');
      expect(result.metadata.domain).toBe('unknown');
      expect(result.metadata.language).toBe('unknown');
    });

    it('应该保持产品数据完整性', () => {
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: 'https://amazon.de/dp/B08N5WRWNW',
          language: 'German',
          productTitle: 'Complete Product',
          feature_bullets: ['Feature 1', 'Feature 2', 'Feature 3'],
          customer_reviews: [
            { 
              id: 'R1', 
              headline: 'Great', 
              body: 'Great product',
              star_rating: 5,
              is_verified: true,
              review_date: '2024-01-01',
              author: 'John'
            }
          ],
          scrape_status: 'success',
          error: ''
        }
      ];
      const validAsins = ['B08N5WRWNW'];
      const selectedSite: ScraperSite = 'DE';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      const product = result.products[0];
      expect(product.asin).toBe('B08N5WRWNW');
      expect(product.productTitle).toBe('Complete Product');
      expect(product.feature_bullets).toHaveLength(3);
      expect(product.customer_reviews).toHaveLength(1);
    });

    it('应该为失败的产品创建最小化结构', () => {
      const products: ScrapedProduct[] = [];
      const validAsins = ['B08N5WRWNW'];
      const selectedSite: ScraperSite = 'DE';

      const result = handleScrapeComplete(products, validAsins, selectedSite);

      const product = result.products[0];
      expect(product.asin).toBe('B08N5WRWNW');
      expect(product.url).toBe('');
      expect(product.language).toBe('');
      expect(product.productTitle).toBe('');
      expect(product.feature_bullets).toEqual([]);
      expect(product.customer_reviews).toEqual([]);
      expect(product.scrape_status).toBe('failed');
      expect(product.error).toBe('Unknown Error');
    });
  });

  describe('采集流程集成测试', () => {
    it('应该正确处理完整的采集流程', () => {
      // 1. 初始化任务
      const tasks: Task[] = [
        { asin: 'B08N5WRWNW', status: 'pending', message: '等待中...' },
        { asin: 'B0ABCDEFGH', status: 'pending', message: '等待中...' }
      ];

      // 2. 更新任务状态为采集中
      updateTask(tasks, 'B08N5WRWNW', 'scraping', '正在采集...');
      updateTask(tasks, 'B0ABCDEFGH', 'scraping', '正在采集...');

      expect(tasks[0].status).toBe('scraping');
      expect(tasks[1].status).toBe('scraping');

      // 3. 模拟采集完成
      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Product 1',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        },
        {
          asin: 'B0ABCDEFGH',
          url: '',
          language: '',
          productTitle: 'Product 2',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        }
      ];

      // 4. 更新任务状态为成功
      updateTask(tasks, 'B08N5WRWNW', 'success', '采集成功');
      updateTask(tasks, 'B0ABCDEFGH', 'success', '采集成功');

      expect(tasks[0].status).toBe('success');
      expect(tasks[1].status).toBe('success');

      // 5. 处理采集结果
      const result = handleScrapeComplete(products, ['B08N5WRWNW', 'B0ABCDEFGH'], 'DE');

      expect(result.products).toHaveLength(2);
      expect(result.metadata.total_asins).toBe(2);
    });

    it('应该处理部分失败的采集流程', () => {
      const tasks: Task[] = [
        { asin: 'B08N5WRWNW', status: 'pending', message: '等待中...' },
        { asin: 'B0ABCDEFGH', status: 'pending', message: '等待中...' }
      ];

      // 第一个成功，第二个失败
      updateTask(tasks, 'B08N5WRWNW', 'success', '采集成功');
      updateTask(tasks, 'B0ABCDEFGH', 'failed', '采集失败: 404');

      const products: ScrapedProduct[] = [
        {
          asin: 'B08N5WRWNW',
          url: '',
          language: '',
          productTitle: 'Success',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: ''
        },
        {
          asin: 'B0ABCDEFGH',
          url: '',
          language: '',
          productTitle: '',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'failed',
          error: '404'
        }
      ];

      const result = handleScrapeComplete(products, ['B08N5WRWNW', 'B0ABCDEFGH'], 'FR');

      expect(result.products[0].scrape_status).toBe('success');
      expect(result.products[1].scrape_status).toBe('failed');
      expect(tasks[0].status).toBe('success');
      expect(tasks[1].status).toBe('failed');
    });
  });

  describe('saveScrapeSnapshot - 保存采集快照', () => {
    it('应该等待异步历史保存完成', async () => {
      const data = createScrapedData();

      await saveScrapeSnapshot(data);

      expect(HistoryService.saveAsync).toHaveBeenCalledWith(data);
      expect(HistoryService.save).not.toHaveBeenCalled();
    });

    it('异步保存失败时应该回退到同步保存', async () => {
      const data = createScrapedData();
      vi.mocked(HistoryService.saveAsync).mockRejectedValueOnce(new Error('indexeddb failed'));

      await saveScrapeSnapshot(data);

      expect(HistoryService.saveAsync).toHaveBeenCalledWith(data);
      expect(HistoryService.save).toHaveBeenCalledWith(data);
    });
  });

  describe('deleteProduct - 删除产品', () => {
    it('应该删除产品、更新元数据并保存历史记录', async () => {
      const data = createScrapedData();
      const confirmModal = vi.fn().mockResolvedValue(true);

      const result = await deleteProduct('B000000001', data, confirmModal);

      expect(result.success).toBe(true);
      expect(result.data?.products.map((product) => product.asin)).toEqual(['B000000002']);
      expect(result.data?.metadata?.total_asins).toBe(1);
      expect(HistoryService.saveAsync).toHaveBeenCalledWith(data);
      expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.DATA_UPDATED);
      expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.HISTORY_UPDATED);
      expect(showToast).toHaveBeenCalledWith('ASIN B000000001 已移除', { type: 'info' });
    });

    it('用户取消时不应该修改数据或保存历史记录', async () => {
      const data = createScrapedData();
      const originalData = JSON.stringify(data);
      const confirmModal = vi.fn().mockResolvedValue(false);

      const result = await deleteProduct('B000000001', data, confirmModal);

      expect(result).toEqual({ success: false });
      expect(JSON.stringify(data)).toBe(originalData);
      expect(HistoryService.saveAsync).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('保存失败时应该返回原始数据用于回滚', async () => {
      const data = createScrapedData();
      const confirmModal = vi.fn().mockResolvedValue(true);
      vi.mocked(HistoryService.saveAsync).mockRejectedValueOnce(new Error('disk full'));

      const result = await deleteProduct('B000000001', data, confirmModal);

      expect(result.success).toBe(false);
      expect(result.error).toBe('保存历史记录失败');
      expect(result.data?.products.map((product) => product.asin)).toEqual(['B000000001', 'B000000002']);
      expect(showToast).toHaveBeenCalledWith('删除操作失败: 保存历史记录失败', { type: 'error' });
    });
  });

  describe('deleteReview - 删除评论', () => {
    it('应该删除指定评论并保存历史记录', async () => {
      const data = createScrapedData();
      const confirmModal = vi.fn().mockResolvedValue(true);

      const result = await deleteReview('B000000001', 0, data, confirmModal);

      expect(result.success).toBe(true);
      expect(result.data?.products[0].customer_reviews.map((review) => review.id)).toEqual(['R2']);
      expect(HistoryService.saveAsync).toHaveBeenCalledWith(data);
      expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.DATA_UPDATED);
      expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.HISTORY_UPDATED);
      expect(showToast).toHaveBeenCalledWith('评论已删除', { type: 'info' });
    });

    it('评论索引越界时应该返回原始数据用于回滚', async () => {
      const data = createScrapedData();
      const confirmModal = vi.fn().mockResolvedValue(true);

      const result = await deleteReview('B000000001', 5, data, confirmModal);

      expect(result.success).toBe(false);
      expect(result.error).toBe('评论索引超出范围：5 >= 2');
      expect(result.data?.products[0].customer_reviews.map((review) => review.id)).toEqual(['R1', 'R2']);
      expect(HistoryService.saveAsync).not.toHaveBeenCalled();
    });
  });
});
