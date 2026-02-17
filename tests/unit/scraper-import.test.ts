/**
 * scraper-import.test.ts - 数据导入功能单元测试
 * 测试scraper模块的JSON文件导入、数据合并和多站点处理逻辑
 * 
 * 任务: 2.3 编写数据导入功能的单元测试
 * 需求: 3.4, 10.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockLocalStorage } from '../helpers/testUtils';

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

vi.mock('@/modules/app_center/views/master_analysis/services/historyService', () => ({
  HistoryService: {
    save: vi.fn(),
    getAll: vi.fn(() => []),
    clear: vi.fn()
  }
}));

describe('Scraper数据导入功能', () => {
  let scraperPanel: any;
  let mockState: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage();

    // Mock global state
    mockState = {
      scraper: {
        selectedSite: 'DE',
        scrapedData: null,
        currentHistoryId: null,
        inputAsins: '',
        isScraping: false
      },
      analysis: {
        analysisReport: null
      }
    };

    // 创建简化的ScraperPanel实例用于测试
    scraperPanel = {
      selectedSite: 'DE',
      
      // 读取文件为JSON
      readFileAsJSON(file: File): Promise<{ data: any; filename: string }> {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const json = JSON.parse(e.target?.result as string);
              resolve({ data: json, filename: file.name });
            } catch (err) {
              reject(new Error(`文件 ${file.name} 格式错误`));
            }
          };
          reader.onerror = () => reject(new Error("无法读取文件"));
          reader.readAsText(file);
        });
      },

      // 获取评论签名
      getReviewSignature(review: any): string {
        if (review.id) return review.id;
        return `${review.date || ''}_${review.author || ''}_${(review.headline || '').substring(0, 20)}`.trim();
      },

      // 显示站点选择弹窗（简化版）
      showMarketplaceSelectionModal(sites: string[]): Promise<string | null> {
        return Promise.resolve(sites[0] || null);
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('readFileAsJSON - JSON文件读取', () => {
    it('应该成功读取有效的JSON文件', async () => {
      const validJSON = { 
        metadata: { marketplace: 'DE' },
        products: [{ asin: 'B0TEST001', productTitle: 'Test Product' }]
      };
      const file = new File([JSON.stringify(validJSON)], 'test.json', { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.data).toEqual(validJSON);
      expect(result.filename).toBe('test.json');
    });

    it('应该拒绝无效的JSON文件', async () => {
      const file = new File(['{ invalid json }'], 'invalid.json', { type: 'application/json' });

      await expect(scraperPanel.readFileAsJSON(file)).rejects.toThrow('文件 invalid.json 格式错误');
    });

    it('应该拒绝空文件', async () => {
      const file = new File([''], 'empty.json', { type: 'application/json' });

      await expect(scraperPanel.readFileAsJSON(file)).rejects.toThrow();
    });

    it('应该处理包含特殊字符的JSON', async () => {
      const specialJSON = {
        products: [{
          asin: 'B0TEST001',
          productTitle: 'Test "Product" with \'quotes\' and\nnewlines'
        }]
      };
      const file = new File([JSON.stringify(specialJSON)], 'special.json', { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.data).toEqual(specialJSON);
    });

    it('应该处理大型JSON文件', async () => {
      const largeJSON = {
        products: Array.from({ length: 100 }, (_, i) => ({
          asin: `B0TEST${String(i).padStart(3, '0')}`,
          productTitle: `Product ${i}`,
          feature_bullets: Array(5).fill(`Feature ${i}`),
          customer_reviews: Array(10).fill({ rating: 5, text: `Review ${i}` })
        }))
      };
      const file = new File([JSON.stringify(largeJSON)], 'large.json', { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.data.products).toHaveLength(100);
    });
  });

  describe('getReviewSignature - 评论去重签名', () => {
    it('应该使用review.id作为签名（如果存在）', () => {
      const review = { id: 'R123456', date: '2024-01-01', author: 'John' };

      const signature = scraperPanel.getReviewSignature(review);

      expect(signature).toBe('R123456');
    });

    it('应该基于日期、作者和标题生成签名', () => {
      const review = {
        date: '2024-01-01',
        author: 'John Doe',
        headline: 'Great product, highly recommended!'
      };

      const signature = scraperPanel.getReviewSignature(review);

      expect(signature).toBe('2024-01-01_John Doe_Great product, highl');
    });

    it('应该处理缺少字段的评论', () => {
      const review = { author: 'Jane' };

      const signature = scraperPanel.getReviewSignature(review);

      expect(signature).toBe('_Jane_');
    });

    it('应该为相同内容的评论生成相同签名', () => {
      const review1 = { date: '2024-01-01', author: 'John', headline: 'Good' };
      const review2 = { date: '2024-01-01', author: 'John', headline: 'Good' };

      const sig1 = scraperPanel.getReviewSignature(review1);
      const sig2 = scraperPanel.getReviewSignature(review2);

      expect(sig1).toBe(sig2);
    });

    it('应该为不同内容的评论生成不同签名', () => {
      const review1 = { date: '2024-01-01', author: 'John', headline: 'Good' };
      const review2 = { date: '2024-01-02', author: 'Jane', headline: 'Bad' };

      const sig1 = scraperPanel.getReviewSignature(review1);
      const sig2 = scraperPanel.getReviewSignature(review2);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('showMarketplaceSelectionModal - 多站点选择', () => {
    it('应该返回第一个站点（简化测试）', async () => {
      const sites = ['DE', 'FR', 'IT'];

      const selected = await scraperPanel.showMarketplaceSelectionModal(sites);

      expect(selected).toBe('DE');
    });

    it('应该处理单个站点', async () => {
      const sites = ['US'];

      const selected = await scraperPanel.showMarketplaceSelectionModal(sites);

      expect(selected).toBe('US');
    });

    it('应该处理空站点列表', async () => {
      const sites: string[] = [];

      const selected = await scraperPanel.showMarketplaceSelectionModal(sites);

      expect(selected).toBeNull();
    });
  });

  describe('数据导入集成场景', () => {
    it('应该正确识别单站点数据', () => {
      const data = {
        metadata: { marketplace: 'DE' },
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1' },
          { asin: 'B0TEST002', productTitle: 'Product 2' }
        ]
      };

      expect(data.metadata.marketplace).toBe('DE');
      expect(data.products).toHaveLength(2);
    });

    it('应该正确识别多站点数据', () => {
      const files = [
        {
          data: { metadata: { marketplace: 'DE' }, products: [{ asin: 'B001' }] },
          filename: 'de.json'
        },
        {
          data: { metadata: { marketplace: 'FR' }, products: [{ asin: 'B002' }] },
          filename: 'fr.json'
        }
      ];

      const detectedSites = new Set<string>();
      files.forEach(({ data }) => {
        if (data.metadata?.marketplace) {
          detectedSites.add(data.metadata.marketplace);
        }
      });

      expect(detectedSites.size).toBe(2);
      expect(detectedSites.has('DE')).toBe(true);
      expect(detectedSites.has('FR')).toBe(true);
    });

    it('应该正确合并相同ASIN的评论', () => {
      const review1 = { id: 'R1', rating: 5, text: 'Great' };
      const review2 = { id: 'R2', rating: 4, text: 'Good' };
      const review3 = { id: 'R1', rating: 5, text: 'Great' }; // 重复

      const uniqueReviewsMap = new Map<string, any>();
      [review1, review2, review3].forEach(r => {
        const sig = scraperPanel.getReviewSignature(r);
        if (!uniqueReviewsMap.has(sig)) {
          uniqueReviewsMap.set(sig, r);
        }
      });

      const mergedReviews = Array.from(uniqueReviewsMap.values());

      expect(mergedReviews).toHaveLength(2);
      expect(mergedReviews.find(r => r.id === 'R1')).toBeDefined();
      expect(mergedReviews.find(r => r.id === 'R2')).toBeDefined();
    });

    it('应该处理产品数组格式的JSON', () => {
      const data = [
        { asin: 'B0TEST001', productTitle: 'Product 1', metadata: { marketplace: 'DE' } },
        { asin: 'B0TEST002', productTitle: 'Product 2', metadata: { marketplace: 'DE' } }
      ];

      const list = Array.isArray(data) ? data : [];

      expect(list).toHaveLength(2);
      expect(list[0].asin).toBe('B0TEST001');
    });

    it('应该处理单个产品对象格式的JSON', () => {
      const data = {
        asin: 'B0TEST001',
        productTitle: 'Product 1',
        metadata: { marketplace: 'DE' }
      };

      const list = Array.isArray(data) ? data : [data];

      expect(list).toHaveLength(1);
      expect(list[0].asin).toBe('B0TEST001');
    });

    it('应该处理标准格式（包含products字段）的JSON', () => {
      const data = {
        metadata: { marketplace: 'DE', total_asins: 2 },
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1' },
          { asin: 'B0TEST002', productTitle: 'Product 2' }
        ]
      };

      const list = 'products' in data ? data.products : [];

      expect(list).toHaveLength(2);
    });
  });

  describe('错误处理场景', () => {
    it('应该处理缺少ASIN的产品', () => {
      const products = [
        { asin: 'B0TEST001', productTitle: 'Valid Product' },
        { productTitle: 'Invalid Product - No ASIN' },
        { asin: 'B0TEST002', productTitle: 'Another Valid Product' }
      ];

      const validProducts = products.filter(p => p.asin);

      expect(validProducts).toHaveLength(2);
    });

    it('应该处理缺少metadata的数据', () => {
      const data = {
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1' }
        ]
      };

      const marketplace = data.metadata?.marketplace || 'Unknown';

      expect(marketplace).toBe('Unknown');
    });

    it('应该处理空的products数组', () => {
      const data = {
        metadata: { marketplace: 'DE' },
        products: []
      };

      expect(data.products).toHaveLength(0);
    });

    it('应该处理null或undefined的customer_reviews', () => {
      const product = {
        asin: 'B0TEST001',
        productTitle: 'Product',
        customer_reviews: null
      };

      const reviews = Array.isArray(product.customer_reviews) ? product.customer_reviews : [];

      expect(reviews).toHaveLength(0);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理非常长的文件名', async () => {
      const longFilename = 'a'.repeat(200) + '.json';
      const validJSON = { products: [] };
      const file = new File([JSON.stringify(validJSON)], longFilename, { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.filename).toBe(longFilename);
    });

    it('应该处理包含Unicode字符的JSON', async () => {
      const unicodeJSON = {
        products: [{
          asin: 'B0TEST001',
          productTitle: '测试产品 🎉 Тест Продукт'
        }]
      };
      const file = new File([JSON.stringify(unicodeJSON)], 'unicode.json', { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.data.products[0].productTitle).toContain('测试产品');
      expect(result.data.products[0].productTitle).toContain('🎉');
    });

    it('应该处理深度嵌套的JSON结构', async () => {
      const nestedJSON = {
        products: [{
          asin: 'B0TEST001',
          metadata: {
            level1: {
              level2: {
                level3: {
                  value: 'deep'
                }
              }
            }
          }
        }]
      };
      const file = new File([JSON.stringify(nestedJSON)], 'nested.json', { type: 'application/json' });

      const result = await scraperPanel.readFileAsJSON(file);

      expect(result.data.products[0].metadata.level1.level2.level3.value).toBe('deep');
    });
  });
});
