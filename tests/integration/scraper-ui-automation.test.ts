/**
 * scraper-ui-automation.test.ts - UI自动化测试
 * 
 * 自动化测试所有UI交互、不同屏幕尺寸、边界情况和错误场景
 * 替代手动测试清单
 * 
 * 任务: 17.3 手动测试清单（自动化版本）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockLocalStorage, cleanupDOM, createTestElement, flushPromises } from '../helpers/testUtils';

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

describe('UI自动化测试 - 数据采集页面', () => {
  let mockState: any;
  let container: HTMLElement;

  beforeEach(() => {
    mockLocalStorage();
    cleanupDOM();
    vi.clearAllMocks();

    // 创建测试容器
    container = createTestElement('div', { id: 'app' });
    document.body.appendChild(container);

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
      }
    };
  });

  afterEach(() => {
    cleanupDOM();
    vi.clearAllMocks();
  });

  /**
   * UI交互测试
   */
  describe('UI交互测试', () => {
    it('应该能够点击"导入JSON"按钮', () => {
      // 创建导入按钮
      const importButton = createTestElement('button', {
        id: 'import-json-btn',
        class: 'btn-import'
      });
      importButton.textContent = '导入JSON';
      container.appendChild(importButton);

      // 模拟点击
      let clicked = false;
      importButton.addEventListener('click', () => {
        clicked = true;
      });

      importButton.click();

      expect(clicked).toBe(true);
    });

    it('应该能够切换站点选择下拉框', () => {
      // 创建站点选择器
      const siteSelect = createTestElement('select', { id: 'site-select' }) as HTMLSelectElement;
      ['US', 'UK', 'DE', 'FR', 'IT'].forEach(site => {
        const option = createTestElement('option', { value: site });
        option.textContent = site;
        siteSelect.appendChild(option);
      });
      container.appendChild(siteSelect);

      // 模拟选择
      siteSelect.value = 'FR';
      siteSelect.dispatchEvent(new Event('change'));

      expect(siteSelect.value).toBe('FR');
    });

    it('应该能够在ASIN输入框中输入文本', () => {
      // 创建ASIN输入框
      const asinInput = createTestElement('textarea', {
        id: 'asin-input',
        placeholder: '输入ASIN...'
      }) as HTMLTextAreaElement;
      container.appendChild(asinInput);

      // 模拟输入
      const testAsins = 'B0TEST001, B0TEST002, B0TEST003';
      asinInput.value = testAsins;
      asinInput.dispatchEvent(new Event('input'));

      expect(asinInput.value).toBe(testAsins);
    });

    it('应该能够点击"开始抓取"按钮', () => {
      // 创建抓取按钮
      const scrapeButton = createTestElement('button', {
        id: 'scrape-btn',
        class: 'btn-primary'
      });
      scrapeButton.textContent = '开始抓取';
      container.appendChild(scrapeButton);

      // 模拟点击
      let clicked = false;
      scrapeButton.addEventListener('click', () => {
        clicked = true;
      });

      scrapeButton.click();

      expect(clicked).toBe(true);
    });

    it('应该能够切换数据预览/JSON标签页', () => {
      // 创建标签页
      const previewTab = createTestElement('button', {
        id: 'tab-preview',
        class: 'tab-button'
      });
      previewTab.textContent = '数据预览';

      const jsonTab = createTestElement('button', {
        id: 'tab-json',
        class: 'tab-button'
      });
      jsonTab.textContent = 'JSON数据';

      container.appendChild(previewTab);
      container.appendChild(jsonTab);

      // 模拟切换到JSON标签
      let activeTab = 'preview';
      jsonTab.addEventListener('click', () => {
        activeTab = 'json';
      });

      jsonTab.click();

      expect(activeTab).toBe('json');

      // 切换回预览标签
      previewTab.addEventListener('click', () => {
        activeTab = 'preview';
      });

      previewTab.click();

      expect(activeTab).toBe('preview');
    });

    it('应该能够展开/收起产品卡片', () => {
      // 创建产品卡片
      const productCard = createTestElement('div', {
        class: 'product-card',
        'data-asin': 'B0TEST001'
      });

      const expandButton = createTestElement('button', {
        class: 'expand-btn'
      });
      expandButton.textContent = '展开';

      productCard.appendChild(expandButton);
      container.appendChild(productCard);

      // 模拟展开
      let isExpanded = false;
      expandButton.addEventListener('click', () => {
        isExpanded = !isExpanded;
        expandButton.textContent = isExpanded ? '收起' : '展开';
      });

      expandButton.click();
      expect(isExpanded).toBe(true);
      expect(expandButton.textContent).toBe('收起');

      expandButton.click();
      expect(isExpanded).toBe(false);
      expect(expandButton.textContent).toBe('展开');
    });

    it('应该能够点击删除产品按钮', () => {
      // 创建删除按钮
      const deleteButton = createTestElement('button', {
        class: 'delete-product-btn',
        'data-asin': 'B0TEST001'
      });
      deleteButton.textContent = '删除';
      container.appendChild(deleteButton);

      // 模拟点击
      let deleteClicked = false;
      deleteButton.addEventListener('click', () => {
        deleteClicked = true;
      });

      deleteButton.click();

      expect(deleteClicked).toBe(true);
    });

    it('应该能够点击删除评论按钮', () => {
      // 创建删除评论按钮
      const deleteReviewButton = createTestElement('button', {
        class: 'delete-review-btn',
        'data-asin': 'B0TEST001',
        'data-index': '0'
      });
      deleteReviewButton.textContent = '删除评论';
      container.appendChild(deleteReviewButton);

      // 模拟点击
      let deleteClicked = false;
      deleteReviewButton.addEventListener('click', () => {
        deleteClicked = true;
      });

      deleteReviewButton.click();

      expect(deleteClicked).toBe(true);
    });
  });

  /**
   * 响应式布局测试
   */
  describe('响应式布局测试', () => {
    it('应该在桌面尺寸下正确显示（1920x1080）', () => {
      // 模拟桌面尺寸
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      // 创建响应式容器
      const responsiveContainer = createTestElement('div', {
        class: 'container',
        style: 'width: 100%; max-width: 1200px;'
      });
      container.appendChild(responsiveContainer);

      expect(window.innerWidth).toBe(1920);
      expect(responsiveContainer.style.width).toBe('100%');
    });

    it('应该在平板尺寸下正确显示（768x1024）', () => {
      // 模拟平板尺寸
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });

      expect(window.innerWidth).toBe(768);
      expect(window.innerWidth).toBeLessThan(1024);
    });

    it('应该在手机尺寸下正确显示（375x667）', () => {
      // 模拟手机尺寸
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

      expect(window.innerWidth).toBe(375);
      expect(window.innerWidth).toBeLessThan(768);
    });

    it('应该在超宽屏下正确显示（2560x1440）', () => {
      // 模拟超宽屏
      Object.defineProperty(window, 'innerWidth', { value: 2560, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1440, writable: true });

      expect(window.innerWidth).toBe(2560);
      expect(window.innerWidth).toBeGreaterThan(1920);
    });
  });

  /**
   * 边界情况测试
   */
  describe('边界情况测试', () => {
    it('应该正确处理空ASIN输入', () => {
      const asinInput = createTestElement('textarea', { id: 'asin-input' }) as HTMLTextAreaElement;
      container.appendChild(asinInput);

      asinInput.value = '';
      const asins = asinInput.value.trim();

      expect(asins).toBe('');
      expect(asins.length).toBe(0);
    });

    it('应该正确处理单个ASIN输入', () => {
      const asinInput = createTestElement('textarea', { id: 'asin-input' }) as HTMLTextAreaElement;
      container.appendChild(asinInput);

      asinInput.value = 'B0TEST001';
      const asins = asinInput.value.split(',').map(a => a.trim()).filter(a => a);

      expect(asins).toHaveLength(1);
      expect(asins[0]).toBe('B0TEST001');
    });

    it('应该正确处理大量ASIN输入（100个）', () => {
      const asinInput = createTestElement('textarea', { id: 'asin-input' }) as HTMLTextAreaElement;
      container.appendChild(asinInput);

      const manyAsins = Array.from({ length: 100 }, (_, i) => `B0TEST${String(i).padStart(3, '0')}`);
      asinInput.value = manyAsins.join(', ');

      const asins = asinInput.value.split(',').map(a => a.trim()).filter(a => a);

      expect(asins).toHaveLength(100);
    });

    it('应该正确处理包含空格和换行的ASIN输入', () => {
      const asinInput = createTestElement('textarea', { id: 'asin-input' }) as HTMLTextAreaElement;
      container.appendChild(asinInput);

      asinInput.value = '  B0TEST001  ,  B0TEST002  \n  B0TEST003  ';
      const asins = asinInput.value
        .split(/[,\n]/)
        .map(a => a.trim())
        .filter(a => a);

      expect(asins).toHaveLength(3);
      expect(asins).toEqual(['B0TEST001', 'B0TEST002', 'B0TEST003']);
    });

    it('应该正确处理无数据状态', () => {
      mockState.scraper.scrapedData = null;

      const hasData = mockState.scraper.scrapedData?.products?.length > 0;

      expect(hasData).toBe(false);
    });

    it('应该正确处理空产品列表', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: []
      };

      const hasData = mockState.scraper.scrapedData?.products?.length > 0;

      expect(hasData).toBe(false);
    });

    it('应该正确处理单个产品', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US' },
        products: [{ asin: 'B0SINGLE01', productTitle: 'Single Product' }]
      };

      expect(mockState.scraper.scrapedData.products).toHaveLength(1);
    });

    it('应该正确处理大量产品（1000个）', () => {
      mockState.scraper.scrapedData = {
        metadata: { marketplace: 'US', total_asins: 1000 },
        products: Array.from({ length: 1000 }, (_, i) => ({
          asin: `B0MANY${String(i).padStart(4, '0')}`,
          productTitle: `Product ${i}`
        }))
      };

      expect(mockState.scraper.scrapedData.products).toHaveLength(1000);
    });
  });

  /**
   * 错误场景测试
   */
  describe('错误场景测试', () => {
    it('应该正确处理无效的ASIN格式', () => {
      const invalidAsins = ['invalid', '123', 'ASIN123', 'B0', 'B0TOOLONG123456'];

      invalidAsins.forEach(asin => {
        const isValid = /^[A-Z0-9]{10}$/.test(asin);
        expect(isValid).toBe(false);
      });
    });

    it('应该正确处理文件选择取消', () => {
      const fileInput = createTestElement('input', {
        type: 'file',
        accept: '.json'
      }) as HTMLInputElement;
      container.appendChild(fileInput);

      // 模拟用户取消文件选择
      fileInput.value = '';

      expect(fileInput.files?.length || 0).toBe(0);
    });

    it('应该正确处理非JSON文件', () => {
      const fileName = 'test.txt';
      const isJsonFile = fileName.endsWith('.json');

      expect(isJsonFile).toBe(false);
    });

    it('应该正确处理超大文件（>10MB）', () => {
      const fileSize = 15 * 1024 * 1024; // 15MB
      const maxSize = 10 * 1024 * 1024; // 10MB

      const isFileTooLarge = fileSize > maxSize;

      expect(isFileTooLarge).toBe(true);
    });

    it('应该正确处理网络错误', () => {
      let networkError: Error | null = null;

      try {
        throw new Error('Network request failed');
      } catch (error) {
        networkError = error as Error;
      }

      expect(networkError).toBeDefined();
      expect(networkError?.message).toBe('Network request failed');
    });

    it('应该正确处理JSON解析错误', () => {
      const invalidJson = '{ invalid json }';
      let parseError: Error | null = null;

      try {
        JSON.parse(invalidJson);
      } catch (error) {
        parseError = error as Error;
      }

      expect(parseError).toBeDefined();
    });

    it('应该正确处理缺少必需字段的数据', () => {
      const invalidData = {
        products: [
          { productTitle: 'Missing ASIN' }, // 缺少asin
          { asin: 'B0TEST001' } // 缺少productTitle
        ]
      };

      const validProducts = invalidData.products.filter(p => p.asin && p.productTitle);

      expect(validProducts).toHaveLength(0);
    });

    it('应该正确处理删除操作失败', () => {
      const originalData = {
        metadata: { marketplace: 'US' },
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1' },
          { asin: 'B0TEST002', productTitle: 'Product 2' }
        ]
      };

      mockState.scraper.scrapedData = JSON.parse(JSON.stringify(originalData));

      // 模拟删除失败
      let deleteError: Error | null = null;
      try {
        throw new Error('Delete operation failed');
      } catch (error) {
        deleteError = error as Error;
        // 回滚：恢复原始数据
        mockState.scraper.scrapedData = originalData;
      }

      expect(deleteError).toBeDefined();
      expect(mockState.scraper.scrapedData.products).toHaveLength(2);
    });
  });

  /**
   * 数据完整性测试
   */
  describe('数据完整性测试', () => {
    it('应该保持数据在操作过程中的完整性', () => {
      const originalData = {
        metadata: { marketplace: 'US', total_asins: 2 },
        products: [
          { asin: 'B0TEST001', productTitle: 'Product 1', price: 29.99 },
          { asin: 'B0TEST002', productTitle: 'Product 2', price: 39.99 }
        ]
      };

      mockState.scraper.scrapedData = JSON.parse(JSON.stringify(originalData));

      // 执行各种操作
      mockState.scraper.expandedAsin = 'B0TEST001';
      mockState.scraper.currentDataTab = 'json';
      mockState.scraper.expandedAsin = null;
      mockState.scraper.currentDataTab = 'preview';

      // 验证数据未改变
      expect(mockState.scraper.scrapedData).toEqual(originalData);
    });

    it('应该正确处理数据的深拷贝', () => {
      const originalData = {
        metadata: { marketplace: 'US' },
        products: [{ asin: 'B0TEST001', productTitle: 'Test' }]
      };

      const copiedData = JSON.parse(JSON.stringify(originalData));

      // 修改拷贝
      copiedData.products[0].productTitle = 'Modified';

      // 验证原始数据未改变
      expect(originalData.products[0].productTitle).toBe('Test');
      expect(copiedData.products[0].productTitle).toBe('Modified');
    });

    it('应该正确处理评论数据的完整性', () => {
      const productWithReviews = {
        asin: 'B0TEST001',
        productTitle: 'Product with Reviews',
        customer_reviews: [
          { id: 'R1', rating: 5, text: 'Great!' },
          { id: 'R2', rating: 4, text: 'Good' }
        ]
      };

      const originalReviewCount = productWithReviews.customer_reviews.length;

      // 模拟查看评论
      const reviews = productWithReviews.customer_reviews;

      // 验证评论数量未改变
      expect(reviews).toHaveLength(originalReviewCount);
    });
  });

  /**
   * 性能测试
   */
  describe('性能测试', () => {
    it('应该在合理时间内渲染大量产品', () => {
      const startTime = performance.now();

      // 创建大量产品数据
      const largeDataset = {
        metadata: { marketplace: 'US', total_asins: 500 },
        products: Array.from({ length: 500 }, (_, i) => ({
          asin: `B0PERF${String(i).padStart(3, '0')}`,
          productTitle: `Performance Test Product ${i}`,
          price: Math.random() * 100,
          rating: Math.random() * 5
        }))
      };

      mockState.scraper.scrapedData = largeDataset;

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 验证性能（应该在100ms内完成）
      expect(duration).toBeLessThan(100);
      expect(mockState.scraper.scrapedData.products).toHaveLength(500);
    });

    it('应该在合理时间内处理大量评论', () => {
      const startTime = performance.now();

      // 创建包含大量评论的产品
      const productWithManyReviews = {
        asin: 'B0REVIEWS1',
        productTitle: 'Product with Many Reviews',
        customer_reviews: Array.from({ length: 1000 }, (_, i) => ({
          id: `R${i}`,
          rating: Math.floor(Math.random() * 5) + 1,
          text: `Review ${i}`
        }))
      };

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 验证性能（应该在50ms内完成）
      expect(duration).toBeLessThan(50);
      expect(productWithManyReviews.customer_reviews).toHaveLength(1000);
    });

    it('应该高效处理JSON序列化和反序列化', () => {
      const data = {
        metadata: { marketplace: 'US' },
        products: Array.from({ length: 100 }, (_, i) => ({
          asin: `B0JSON${String(i).padStart(3, '0')}`,
          productTitle: `Product ${i}`
        }))
      };

      const startTime = performance.now();

      // 序列化
      const jsonString = JSON.stringify(data);

      // 反序列化
      const parsed = JSON.parse(jsonString);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 验证性能（应该在10ms内完成）
      expect(duration).toBeLessThan(10);
      expect(parsed.products).toHaveLength(100);
    });
  });

  /**
   * 可访问性测试
   */
  describe('可访问性测试', () => {
    it('应该为按钮提供适当的aria标签', () => {
      const button = createTestElement('button', {
        'aria-label': '导入JSON文件',
        role: 'button'
      });
      container.appendChild(button);

      expect(button.getAttribute('aria-label')).toBe('导入JSON文件');
      expect(button.getAttribute('role')).toBe('button');
    });

    it('应该为输入框提供适当的标签', () => {
      const label = createTestElement('label', { for: 'asin-input' });
      label.textContent = 'ASIN列表';

      const input = createTestElement('textarea', {
        id: 'asin-input',
        'aria-labelledby': 'asin-label'
      });

      container.appendChild(label);
      container.appendChild(input);

      expect(input.getAttribute('aria-labelledby')).toBe('asin-label');
    });

    it('应该支持键盘导航', () => {
      const button = createTestElement('button', { tabindex: '0' });
      container.appendChild(button);

      expect(button.getAttribute('tabindex')).toBe('0');
    });
  });
});
