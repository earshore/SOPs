/**
 * AI 分析模块 - helpers 单元测试
 * 
 * 测试辅助函数：
 * - getTargetColorClass: 获取目标颜色映射
 * - getMarketLanguage: 获取市场对应的语言代码
 * - getPromptText: 生成提示词文本
 * - getPromptTokenCount: 获取提示词的 token 数量
 * - getFormattedTokenCount: 获取格式化的 token 数量显示
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getTargetColorClass,
  getMarketLanguage,
  getPromptText,
  getPromptTokenCount,
  getFormattedTokenCount
} from '../../src/modules/app_center/views/master_analysis/ai_analysis/components/helpers';
import { Product } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/sampleData';

const mockAppStoreState = vi.hoisted(() => ({
  scraper: undefined as any
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mockAppStoreState
  }
}));

// Mock 依赖
vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/prompts/analysisPrompts', () => ({
  generateAnalysisPrompt: vi.fn((targetId: string, product: Product, language: string) => {
    return `Mock prompt for ${targetId} in ${language}`;
  })
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/utils/dataTransformers', () => ({
  mergeProducts: vi.fn((products: Product[]) => products[0])
}));

vi.mock('../../src/modules/app_center/views/master_analysis/ai_analysis/utils/tokenCounter', () => ({
  estimateTokenCount: vi.fn((text: string) => text.length),
  formatTokenCount: vi.fn((count: number) => `${count} tokens`)
}));

describe('helpers - getTargetColorClass', () => {
  it('应该返回正确的颜色映射', () => {
    expect(getTargetColorClass('blue')).toBe('blue');
    expect(getTargetColorClass('cyan')).toBe('cyan');
    expect(getTargetColorClass('red')).toBe('red');
    expect(getTargetColorClass('amber')).toBe('amber');
    expect(getTargetColorClass('orange')).toBe('orange');
    expect(getTargetColorClass('purple')).toBe('purple');
    expect(getTargetColorClass('teal')).toBe('teal');
    expect(getTargetColorClass('rose')).toBe('rose');
  });
  
  it('应该为未知颜色返回默认值 blue', () => {
    expect(getTargetColorClass('unknown')).toBe('blue');
    expect(getTargetColorClass('invalid')).toBe('blue');
    expect(getTargetColorClass('')).toBe('blue');
  });
});

describe('helpers - getMarketLanguage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该从 Scraper 数据中获取市场语言', () => {
    mockAppStoreState.scraper = {
      scrapedData: {
        products: [],
        metadata: {
          marketplace: 'DE'
        }
      }
    };
    
    const language = getMarketLanguage();
    expect(language).toBe('de');
  });
  
  it('应该在没有 Scraper 数据时返回默认语言 en', () => {
    mockAppStoreState.scraper = undefined;
    
    const language = getMarketLanguage();
    expect(language).toBe('en');
  });
  
  it('应该在没有 metadata 时返回默认语言 en', () => {
    mockAppStoreState.scraper = {
      scrapedData: {
        products: []
      }
    };
    
    const language = getMarketLanguage();
    expect(language).toBe('en');
  });
  
  it('应该在没有 marketplace 时返回默认语言 en', () => {
    mockAppStoreState.scraper = {
      scrapedData: {
        products: [],
        metadata: {}
      }
    };
    
    const language = getMarketLanguage();
    expect(language).toBe('en');
  });
  
  it('应该处理不同的市场代码', () => {
    const testCases = [
      { marketplace: 'US', expected: 'en' },
      { marketplace: 'UK', expected: 'en' },
      { marketplace: 'DE', expected: 'de' },
      { marketplace: 'FR', expected: 'fr' },
      { marketplace: 'ES', expected: 'es' },
      { marketplace: 'IT', expected: 'it' },
      { marketplace: 'JP', expected: 'ja' }
    ];
    
    testCases.forEach(({ marketplace, expected }) => {
      mockAppStoreState.scraper = {
        scrapedData: {
          products: [],
          metadata: { marketplace }
        }
      };
      
      const language = getMarketLanguage();
      expect(language).toBe(expected);
    });
  });
});

describe('helpers - getPromptText', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该为单个产品生成提示词', () => {
    mockAppStoreState.scraper = undefined;
    
    const products: Product[] = [
      {
        asin: 'B001',
        title: 'Test Product',
        bulletPoints: ['Feature 1', 'Feature 2'],
        reviews: []
      }
    ];
    
    const promptText = getPromptText('target1', products);
    expect(promptText).toContain('Mock prompt for target1');
  });
  
  it('应该为多个产品合并后生成提示词', () => {
    mockAppStoreState.scraper = undefined;
    
    const products: Product[] = [
      {
        asin: 'B001',
        title: 'Product 1',
        bulletPoints: ['Feature 1'],
        reviews: []
      },
      {
        asin: 'B002',
        title: 'Product 2',
        bulletPoints: ['Feature 2'],
        reviews: []
      }
    ];
    
    const promptText = getPromptText('target1', products);
    expect(promptText).toContain('Mock prompt for target1');
  });
  
  it('应该在没有产品时返回提示信息', () => {
    mockAppStoreState.scraper = undefined;
    
    const products: Product[] = [];
    
    const promptText = getPromptText('target1', products);
    expect(promptText).toBe('无产品数据');
  });
  

  it('应该在生成提示词失败时返回错误信息', async () => {
    mockAppStoreState.scraper = undefined;
    
    // 动态导入并 mock
    const { generateAnalysisPrompt } = await import('../../src/modules/app_center/views/master_analysis/ai_analysis/prompts/analysisPrompts');
    vi.mocked(generateAnalysisPrompt).mockImplementationOnce(() => {
      throw new Error('Generation failed');
    });
    
    const products: Product[] = [
      {
        asin: 'B001',
        title: 'Test Product',
        bulletPoints: [],
        reviews: []
      }
    ];
    
    const promptText = getPromptText('target1', products);
    expect(promptText).toBe('提示词生成失败');
  });
});

describe('helpers - getPromptTokenCount', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该返回提示词的 token 数量', () => {
    const products: Product[] = [
      {
        asin: 'B001',
        title: 'Test Product',
        bulletPoints: ['Feature 1'],
        reviews: []
      }
    ];
    
    const tokenCount = getPromptTokenCount('target1', products);
    expect(typeof tokenCount).toBe('number');
    expect(tokenCount).toBeGreaterThan(0);
  });
  
  it('应该为空产品列表返回 token 数量', () => {
    const products: Product[] = [];
    
    const tokenCount = getPromptTokenCount('target1', products);
    expect(typeof tokenCount).toBe('number');
  });
});

describe('helpers - getFormattedTokenCount', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('应该返回格式化的 token 数量', () => {
    const products: Product[] = [
      {
        asin: 'B001',
        title: 'Test Product',
        bulletPoints: ['Feature 1'],
        reviews: []
      }
    ];
    
    const formatted = getFormattedTokenCount('target1', products);
    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('tokens');
  });
  
  it('应该为空产品列表返回格式化字符串', () => {
    const products: Product[] = [];
    
    const formatted = getFormattedTokenCount('target1', products);
    expect(typeof formatted).toBe('string');
  });
});
