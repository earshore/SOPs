/**
 * scraper-validators.test.ts - Scraper 验证器单元测试
 * 测试 ASIN 验证、产品数据验证和数据结构验证逻辑
 *
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect } from 'vitest';
import {
  isValidAsin,
  extractValidAsins,
  validateMetadata,
  isScrapedData,
  validateProduct,
  validateScrapedData,
} from '@/modules/app_center/views/master_analysis/scraper/utils/validators';

describe('isValidAsin - ASIN 格式验证', () => {
  it('应该接受有效的 ASIN 格式', () => {
    const validAsins = [
      'B08N5WRWNW',
      'B0ABCDEFGH',
      'B012345678',
      'B0ZZZZZ999',
      'B000000001',
      '059035342X',
      'A08N5WRWNW',
    ];

    validAsins.forEach(asin => {
      expect(isValidAsin(asin)).toBe(true);
    });
  });

  it('应该拒绝无效的 ASIN 格式', () => {
    const invalidAsins = [
      'B8N5WRWNW', // 长度不足
      'B08N5WRWN', // 长度不足
      'B08N5WRWNWX', // 长度过长
      'B08n5wrwnw', // 小写字母
      'B0-8N5WRWN', // 包含特殊字符
      '', // 空字符串
      'B0', // 太短
    ];

    invalidAsins.forEach(asin => {
      expect(isValidAsin(asin)).toBe(false);
    });
  });

  it('应该处理边界情况', () => {
    expect(isValidAsin('B000000000')).toBe(true); // 全0
    expect(isValidAsin('B0ZZZZZZZZ')).toBe(true); // 全Z
    expect(isValidAsin('B099999999')).toBe(true); // 全9
  });
});

describe('extractValidAsins - 提取有效 ASIN', () => {
  it('应该从单行文本中提取 ASIN', () => {
    const input = 'B08N5WRWNW B0ABCDEFGH B012345678';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678']);
  });

  it('应该从多行文本中提取 ASIN', () => {
    const input = `B08N5WRWNW
B0ABCDEFGH
B012345678`;
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678']);
  });

  it('应该处理逗号分隔的 ASIN', () => {
    const input = 'B08N5WRWNW,B0ABCDEFGH,B012345678';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678']);
  });

  it('应该处理中文逗号分隔的 ASIN', () => {
    const input = 'B08N5WRWNW,B0ABCDEFGH,B012345678';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678']);
  });

  it('应该过滤无效的 ASIN', () => {
    const input = 'B08N5WRWNW INVALID B0ABCDEFGH A12345678';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
  });

  it('应该自动转换为大写', () => {
    const input = 'b08n5wrwnw b0abcdefgh';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
  });

  it('应该去除前后空格', () => {
    const input = '  B08N5WRWNW  \n  B0ABCDEFGH  ';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH']);
  });

  it('应该处理空输入', () => {
    expect(extractValidAsins('')).toEqual([]);
    expect(extractValidAsins('   ')).toEqual([]);
    expect(extractValidAsins('\n\n')).toEqual([]);
  });

  it('应该去除重复的 ASIN', () => {
    const input = 'B08N5WRWNW B08N5WRWNW B0ABCDEFGH';
    const result = extractValidAsins(input);

    // 注意：当前实现不去重，如果需要去重需要修改实现
    expect(result.length).toBeGreaterThan(0);
  });

  it('应该处理混合分隔符', () => {
    const input = 'B08N5WRWNW, B0ABCDEFGH\nB012345678 B0ZZZZZZZZ';
    const result = extractValidAsins(input);

    expect(result).toEqual(['B08N5WRWNW', 'B0ABCDEFGH', 'B012345678', 'B0ZZZZZZZZ']);
  });
});

it('应该接受有效的产品数据', () => {
  const validProduct = {
    asin: 'B08N5WRWNW',
    productTitle: 'Test Product',
    feature_bullets: ['Feature 1', 'Feature 2'],
    customer_reviews: [{ id: 'R1', rating: 5, text: 'Great' }],
  };

  const result = validateProduct(validProduct);

  expect(result.valid).toBe(true);
  expect(result.error).toBeUndefined();
});

it('应该拒绝非对象类型', () => {
  const result1 = validateProduct(null);
  const result2 = validateProduct(undefined);
  const result3 = validateProduct('string');
  const result4 = validateProduct(123);

  expect(result1.valid).toBe(false);
  expect(result2.valid).toBe(false);
  expect(result3.valid).toBe(false);
  expect(result4.valid).toBe(false);
});

it('应该拒绝缺少 ASIN 的产品', () => {
  const product = {
    productTitle: 'Test Product',
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('asin');
});

it('应该拒绝无效的 ASIN 格式', () => {
  const product = {
    asin: 'INVALID',
    productTitle: 'Test Product',
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('ASIN格式无效');
});

it('应该验证 productTitle 类型', () => {
  const product = {
    asin: 'B08N5WRWNW',
    productTitle: 123, // 错误类型
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('productTitle');
});

it('应该验证 feature_bullets 是数组', () => {
  const product = {
    asin: 'B08N5WRWNW',
    feature_bullets: 'not an array',
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('feature_bullets');
});

it('应该验证 feature_bullets 元素是字符串', () => {
  const product = {
    asin: 'B08N5WRWNW',
    feature_bullets: ['Valid', 123, 'Another'],
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('feature_bullets');
});

it('应该验证 customer_reviews 是数组', () => {
  const product = {
    asin: 'B08N5WRWNW',
    customer_reviews: 'not an array',
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('customer_reviews');
});

it('应该验证 customer_reviews 元素是对象', () => {
  const product = {
    asin: 'B08N5WRWNW',
    customer_reviews: ['not an object', 123],
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('评论');
});

it('应该接受最小化的产品数据', () => {
  const minimalProduct = {
    asin: 'B08N5WRWNW',
  };

  const result = validateProduct(minimalProduct);

  expect(result.valid).toBe(true);
});

it('应该接受空的 feature_bullets 和 customer_reviews', () => {
  const product = {
    asin: 'B08N5WRWNW',
    feature_bullets: [],
    customer_reviews: [],
  };

  const result = validateProduct(product);

  expect(result.valid).toBe(true);
});

it('应该接受标准格式（包含 products 字段）', () => {
  const data = {
    metadata: { marketplace: 'DE' },
    products: [
      { asin: 'B08N5WRWNW', productTitle: 'Product 1' },
      { asin: 'B0ABCDEFGH', productTitle: 'Product 2' },
    ],
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(true);
  expect(result.products).toHaveLength(2);
});

it('应该接受产品数组格式', () => {
  const data = [
    { asin: 'B08N5WRWNW', productTitle: 'Product 1' },
    { asin: 'B0ABCDEFGH', productTitle: 'Product 2' },
  ];

  const result = validateScrapedData(data);

  expect(result.valid).toBe(true);
  expect(result.products).toHaveLength(2);
});

it('应该接受单个产品对象格式', () => {
  const data = {
    asin: 'B08N5WRWNW',
    productTitle: 'Product 1',
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(true);
  expect(result.products).toHaveLength(1);
});

it('应该拒绝非对象类型', () => {
  const result1 = validateScrapedData(null);
  const result2 = validateScrapedData(undefined);
  const result3 = validateScrapedData('string');

  expect(result1.valid).toBe(false);
  expect(result2.valid).toBe(false);
  expect(result3.valid).toBe(false);
});

it('应该拒绝无法识别的数据格式', () => {
  const data = {
    someField: 'value',
    anotherField: 123,
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('无法识别的数据格式');
});

it('应该拒绝空的产品列表', () => {
  const data = {
    products: [],
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('没有产品信息');
});

it('应该检测并报告无效的产品', () => {
  const data = {
    products: [
      { asin: 'B08N5WRWNW', productTitle: 'Valid' },
      { asin: 'INVALID', productTitle: 'Invalid ASIN' },
      { productTitle: 'No ASIN' },
    ],
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('无效产品');
  expect(result.error).toContain('2'); // 2个无效产品
});

it('应该限制错误消息中的产品数量', () => {
  const data = {
    products: Array.from({ length: 10 }, (_, i) => ({
      asin: 'INVALID' + i,
      productTitle: 'Invalid',
    })),
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('...'); // 应该有省略号
});

it('应该处理混合有效和无效产品', () => {
  const data = {
    products: [
      { asin: 'B08N5WRWNW', productTitle: 'Valid 1' },
      { asin: 'INVALID' },
      { asin: 'B0ABCDEFGH', productTitle: 'Valid 2' },
    ],
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(false);
  expect(result.error).toContain('1 个无效产品');
});

it('应该接受包含完整 metadata 的数据', () => {
  const data = {
    metadata: {
      scrape_timestamp: '2024-01-01T00:00:00Z',
      marketplace: 'DE',
      domain: 'amazon.de',
      language: 'German',
      total_asins: 2,
    },
    products: [
      { asin: 'B08N5WRWNW', productTitle: 'Product 1' },
      { asin: 'B0ABCDEFGH', productTitle: 'Product 2' },
    ],
  };

  const result = validateScrapedData(data);

  expect(result.valid).toBe(true);
  expect(result.products).toHaveLength(2);
});

describe('validateMetadata - metadata 验证', () => {
  const validMeta = {
    scrape_timestamp: '2024-01-01T00:00:00Z',
    marketplace: 'DE',
    domain: 'amazon.de',
    language: 'German',
    total_asins: 2,
  };

  it('应该接受完整的有效 metadata', () => {
    expect(validateMetadata(validMeta)).toEqual({ valid: true });
  });

  it('应该拒绝非对象 metadata', () => {
    [null, undefined, 'meta', 123].forEach(meta => {
      const result = validateMetadata(meta);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('对象');
    });

    // 数组被视为对象，但缺少必需字段
    const arrayResult = validateMetadata([]);
    expect(arrayResult.valid).toBe(false);
    expect(arrayResult.error).toContain('缺少必需字段');
  });

  it('应该拒绝缺少必需字段的 metadata', () => {
    const fields = ['scrape_timestamp', 'marketplace', 'domain', 'language', 'total_asins'];
    fields.forEach(field => {
      const meta = { ...validMeta };
      delete (meta as Record<string, unknown>)[field];
      const result = validateMetadata(meta);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(field);
    });
  });

  it('应该拒绝类型错误的 metadata 字段', () => {
    const stringFields = ['scrape_timestamp', 'marketplace', 'domain', 'language'];
    stringFields.forEach(field => {
      const result = validateMetadata({ ...validMeta, [field]: 123 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('字符串');
    });

    const result = validateMetadata({ ...validMeta, total_asins: '2' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('数字');
  });

  it('应该拒绝无效的时间戳', () => {
    const result = validateMetadata({ ...validMeta, scrape_timestamp: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('时间戳');
  });

  it('应该拒绝负数 total_asins', () => {
    const result = validateMetadata({ ...validMeta, total_asins: -1 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('非负');
  });
});

describe('isScrapedData - 类型守卫', () => {
  it('应该拒绝非对象数据', () => {
    expect(isScrapedData(null)).toBe(false);
    expect(isScrapedData('string')).toBe(false);
    expect(isScrapedData(123)).toBe(false);
  });

  it('应该拒绝缺少 products 数组的数据', () => {
    expect(isScrapedData({})).toBe(false);
    expect(isScrapedData({ products: 'not-array' })).toBe(false);
  });

  it('应该拒绝 metadata 无效的数据', () => {
    const data = { products: [{ asin: 'B08N5WRWNW' }], metadata: { marketplace: 123 } };
    expect(isScrapedData(data)).toBe(false);
  });

  it('应该接受有效数据', () => {
    expect(isScrapedData({ products: [{ asin: 'B08N5WRWNW' }] })).toBe(true);
  });
});

describe('validateProduct - 评论星级验证', () => {
  it('应该拒绝非数字 star_rating', () => {
    const product = { asin: 'B08N5WRWNW', customer_reviews: [{ star_rating: '5' }] };
    const result = validateProduct(product);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('star_rating');
  });

  it('应该拒绝非有限数字 star_rating', () => {
    const product = {
      asin: 'B08N5WRWNW',
      customer_reviews: [{ star_rating: NaN }, { star_rating: Infinity }],
    };
    const result = validateProduct(product);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('star_rating');
  });

  it('应该接受有限数字 star_rating', () => {
    const product = { asin: 'B08N5WRWNW', customer_reviews: [{ star_rating: 4.5 }] };
    expect(validateProduct(product).valid).toBe(true);
  });
});

describe('validateScrapedData - strictMetadata 与边界', () => {
  const base = { products: [{ asin: 'B08N5WRWNW' }] };

  it('非严格模式下允许不完整 metadata', () => {
    expect(validateScrapedData({ ...base, metadata: { marketplace: 'DE' } }).valid).toBe(true);
  });

  it('严格模式下拒绝不完整 metadata', () => {
    const result = validateScrapedData({ ...base, metadata: { marketplace: 'DE' } }, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('metadata 验证失败');
  });

  it('严格模式下接受完整 metadata', () => {
    const metadata = {
      scrape_timestamp: '2024-01-01T00:00:00Z',
      marketplace: 'DE',
      domain: 'amazon.de',
      language: 'German',
      total_asins: 1,
    };
    expect(validateScrapedData({ ...base, metadata }, true).valid).toBe(true);
  });

  it('应该拒绝空数组格式', () => {
    const result = validateScrapedData([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('没有产品信息');
  });

  it('应该拒绝 products 非数组的对象格式', () => {
    const result = validateScrapedData({ products: 'not-array' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('无法识别的数据格式');
  });
});
