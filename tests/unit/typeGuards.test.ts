// tests/unit/typeGuards.test.ts
// ================================================================
// 类型守卫单元测试
// ================================================================

import { describe, it, expect } from 'vitest';
import {
  isUserProductProfile,
  isScrapedDataItem,
  isPromptHistoryItem,
  isKeywordData,
  isTrackingData,
  isUIState,
  isScraperState,
  isAnalysisState,
  isPromptLabState,
  isLLMProviderConfig,
  isProxyConfig,
  isApiError,
  isApiResponse,
  isLLMMessage,
  isLLMModel,
  isLLMChatCompletionResponse,
  isAmazonProductData,
  isAnalysisSection,
  isAnalysisReportResponse,
  isAnalysisReport,
  isRouteChangedEventPayload,
  isModuleLoadedEventPayload,
  isStateChangedEventPayload,
  isErrorOccurredEventPayload,
  isPerformanceMetricEventPayload,
  isArrayOf,
  isOptional,
  isNullable,
  isOptionalNullable,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray
} from '../../src/common/guards/typeGuards';

describe('基础类型守卫', () => {
  describe('isString', () => {
    it('应该正确识别字符串', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('应该正确识别数字', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('应该正确识别布尔值', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
    });
  });

  describe('isObject', () => {
    it('应该正确识别对象', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject('object')).toBe(false);
    });
  });

  describe('isArray', () => {
    it('应该正确识别数组', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
    });
  });
});

  describe('isUserProductProfile', () => {
    it('应该接受有效的 UserProductProfile', () => {
      const valid = {
        targetMarket: 'English',
        keywordsTier1: 'wireless earbuds',
        keywordsTier2: 'bluetooth, noise cancelling',
        audience: 'Young professionals',
        usps: 'Premium sound quality',
        specs: 'Bluetooth 5.3',
        socialHook: 'Experience studio-quality sound',
        negative: 'cheap plastic',
        tone: 'professional',
        customStrategy: '',
        useRufus: true,
        useEmoji: true,
        useCosmo: true,
        selectedReportSections: ['features', 'benefits'],
        charLimit: 5000
      };

      expect(isUserProductProfile(valid)).toBe(true);
      for (const specsAuthority of ['user-confirmed', 'report-derived', 'unconfirmed']) {
        expect(isUserProductProfile({ ...valid, specsAuthority })).toBe(true);
      }
      expect(isUserProductProfile({ ...valid, specsAuthority: 'invalid' })).toBe(false);
    });

    it('应该拒绝无效的 UserProductProfile', () => {
      expect(isUserProductProfile({})).toBe(false);
      expect(isUserProductProfile(null)).toBe(false);
      expect(isUserProductProfile({ targetMarket: 'English' })).toBe(false);
      expect(isUserProductProfile({ 
        targetMarket: 123, // 错误类型
        keywordsTier1: 'test'
      })).toBe(false);
    });
  });

  describe('isScrapedDataItem', () => {
    it('应该接受有效的 ScrapedDataItem', () => {
      const valid = {
        id: 'B08N5WRWNW',
        title: 'Test Product',
        price: 29.99,
        rating: 4.5,
        reviews: 1000
      };

      expect(isScrapedDataItem(valid)).toBe(true);
    });

    it('应该接受只有必需字段的 ScrapedDataItem', () => {
      const minimal = {
        id: 'B08N5WRWNW',
        title: 'Test Product'
      };

      expect(isScrapedDataItem(minimal)).toBe(true);
    });

    it('应该拒绝无效的 ScrapedDataItem', () => {
      expect(isScrapedDataItem({})).toBe(false);
      expect(isScrapedDataItem({ id: 'test' })).toBe(false);
      expect(isScrapedDataItem({ title: 'test' })).toBe(false);
    });
  });

  describe('isPromptHistoryItem', () => {
    it('应该接受有效的 PromptHistoryItem', () => {
      const valid = {
        id: 'hist-001',
        prompt: 'Generate a product description',
        response: 'Here is the description...',
        timestamp: Date.now(),
        model: 'gpt-4',
        tokens: 500
      };

      expect(isPromptHistoryItem(valid)).toBe(true);
    });

    it('应该接受没有可选字段的 PromptHistoryItem', () => {
      const minimal = {
        id: 'hist-001',
        prompt: 'Test prompt',
        response: 'Test response',
        timestamp: Date.now()
      };

      expect(isPromptHistoryItem(minimal)).toBe(true);
    });
  });

  describe('isKeywordData', () => {
    it('应该接受有效的 KeywordData', () => {
      const valid = {
        keyword: 'wireless earbuds',
        searchVolume: 10000,
        competition: 'high',
        cpc: 1.5,
        trend: [100, 110, 105, 120]
      };

      expect(isKeywordData(valid)).toBe(true);
    });

    it('应该接受只有关键词的 KeywordData', () => {
      const minimal = {
        keyword: 'test keyword'
      };

      expect(isKeywordData(minimal)).toBe(true);
    });
  });

  describe('isUIState', () => {
    it('应该接受有效的 UIState', () => {
      const valid = {
        currentTab: 'promptlab',
        currentDataTab: 'preview',
        currentReportTab: 'overview',
        sidebarCollapsed: false,
        theme: 'dark',
        loading: false
      };

      expect(isUIState(valid)).toBe(true);
    });
  });

  describe('isApiError', () => {
    it('应该接受有效的 ApiError', () => {
      const valid = {
        code: 'ERR_001',
        message: 'Something went wrong',
        details: 'Detailed error message',
        statusCode: 500
      };

      expect(isApiError(valid)).toBe(true);
    });

    it('应该接受只有必需字段的 ApiError', () => {
      const minimal = {
        code: 'ERR_001',
        message: 'Error message'
      };

      expect(isApiError(minimal)).toBe(true);
    });
  });

  describe('isApiResponse', () => {
    it('应该接受成功的 ApiResponse', () => {
      const valid = {
        success: true,
        data: { result: 'test' },
        message: 'Operation successful'
      };

      expect(isApiResponse(valid)).toBe(true);
    });

    it('应该接受失败的 ApiResponse', () => {
      const valid = {
        success: false,
        error: {
          code: 'ERR_001',
          message: 'Error occurred'
        }
      };

      expect(isApiResponse(valid)).toBe(true);
    });

    it('应该支持自定义数据类型守卫', () => {
      const response = {
        success: true,
        data: { id: '123', title: 'Test' }
      };

      const dataGuard = (data: unknown): data is { id: string; title: string } => {
        return isObject(data) && 
               'id' in data && isString(data.id) &&
               'title' in data && isString(data.title);
      };

      expect(isApiResponse(response, dataGuard)).toBe(true);
    });
  });

  describe('isLLMMessage', () => {
    it('应该接受有效的 LLMMessage', () => {
      const valid = {
        role: 'user',
        content: 'Hello, AI!'
      };

      expect(isLLMMessage(valid)).toBe(true);
    });

    it('应该拒绝无效角色的 LLMMessage', () => {
      const invalid = {
        role: 'invalid',
        content: 'Hello'
      };

      expect(isLLMMessage(invalid)).toBe(false);
    });
  });

  describe('isLLMChatCompletionResponse', () => {
    it('应该接受有效的 LLMChatCompletionResponse', () => {
      const valid = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?'
            },
            finish_reason: 'stop'
          }
        ]
      };

      expect(isLLMChatCompletionResponse(valid)).toBe(true);
    });

    it('应该拒绝空 choices 的响应', () => {
      const invalid = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: []
      };

      expect(isLLMChatCompletionResponse(invalid)).toBe(false);
    });
  });

  describe('isAmazonProductData', () => {
    it('应该接受有效的 AmazonProductData', () => {
      const valid = {
        asin: 'B08N5WRWNW',
        title: 'Wireless Earbuds',
        price: 29.99,
        rating: 4.5,
        reviewCount: 1000,
        scrapedAt: Date.now()
      };

      expect(isAmazonProductData(valid)).toBe(true);
    });

    it('应该接受只有必需字段的 AmazonProductData', () => {
      const minimal = {
        asin: 'B08N5WRWNW',
        title: 'Test Product',
        scrapedAt: Date.now()
      };

      expect(isAmazonProductData(minimal)).toBe(true);
    });
  });

  describe('isAnalysisReport', () => {
    it('应该接受有效的 AnalysisReport', () => {
      const valid = {
        marketplace: 'US',
        results: [
          { asin: 'B08N5WRWNW', data: {} }
        ]
      };

      expect(isAnalysisReport(valid)).toBe(true);
    });
  });

describe('Event 类型守卫', () => {
  describe('isModuleLoadedEventPayload', () => {
    it('应该接受有效的 ModuleLoadedEventPayload', () => {
      const valid = {
        moduleId: 'promptlab',
        moduleName: 'PromptLab',
        timestamp: Date.now(),
        duration: 150,
        success: true
      };

      expect(isModuleLoadedEventPayload(valid)).toBe(true);
    });
  });

  describe('isStateChangedEventPayload', () => {
    it('应该接受有效的 StateChangedEventPayload', () => {
      const valid = {
        path: 'ui.currentTab',
        newValue: 'promptlab',
        oldValue: 'scraper',
        timestamp: Date.now()
      };

      expect(isStateChangedEventPayload(valid)).toBe(true);
    });

    it('应该支持自定义值类型守卫', () => {
      const payload = {
        path: 'ui.currentTab',
        newValue: 'promptlab',
        oldValue: 'scraper',
        timestamp: Date.now()
      };

      expect(isStateChangedEventPayload(payload, isString)).toBe(true);
    });
  });

  describe('isErrorOccurredEventPayload', () => {
    it('应该接受有效的 ErrorOccurredEventPayload', () => {
      const valid = {
        error: new Error('Test error'),
        module: 'promptlab',
        action: 'generate',
        timestamp: Date.now()
      };

      expect(isErrorOccurredEventPayload(valid)).toBe(true);
    });
  });

  describe('isPerformanceMetricEventPayload', () => {
    it('应该接受有效的 PerformanceMetricEventPayload', () => {
      const valid = {
        name: 'module-load',
        duration: 150,
        timestamp: Date.now(),
        type: 'module-load'
      };

      expect(isPerformanceMetricEventPayload(valid)).toBe(true);
    });
  });
});

describe('组合类型守卫', () => {
  describe('isArrayOf', () => {
    it('应该正确验证数组元素类型', () => {
      expect(isArrayOf(['a', 'b', 'c'], isString)).toBe(true);
      expect(isArrayOf([1, 2, 3], isNumber)).toBe(true);
      expect(isArrayOf([1, 'a', 3], isNumber)).toBe(false);
      expect(isArrayOf([], isString)).toBe(true);
    });
  });

  describe('isOptional', () => {
    it('应该接受 undefined 或符合守卫的值', () => {
      expect(isOptional(undefined, isString)).toBe(true);
      expect(isOptional('test', isString)).toBe(true);
      expect(isOptional(123, isString)).toBe(false);
      expect(isOptional(null, isString)).toBe(false);
    });
  });

  describe('isNullable', () => {
    it('应该接受 null 或符合守卫的值', () => {
      expect(isNullable(null, isString)).toBe(true);
      expect(isNullable('test', isString)).toBe(true);
      expect(isNullable(123, isString)).toBe(false);
      expect(isNullable(undefined, isString)).toBe(false);
    });
  });

  describe('isOptionalNullable', () => {
    it('应该接受 undefined、null 或符合守卫的值', () => {
      expect(isOptionalNullable(undefined, isString)).toBe(true);
      expect(isOptionalNullable(null, isString)).toBe(true);
      expect(isOptionalNullable('test', isString)).toBe(true);
      expect(isOptionalNullable(123, isString)).toBe(false);
    });
  });
});

describe('复杂场景测试', () => {
  it('应该正确验证嵌套对象', () => {
    const trackingData = {
      asin: 'B08N5WRWNW',
      keywords: [
        { keyword: 'wireless earbuds', searchVolume: 10000 },
        { keyword: 'bluetooth headphones', searchVolume: 8000 }
      ],
      lastUpdated: Date.now(),
      coverage: 85
    };

    expect(isTrackingData(trackingData)).toBe(true);
  });

  it('应该正确验证包含数组的状态', () => {
    const analysisState = {
      selectedAsins: ['B08N5WRWNW', 'B07XJ8C8F5']
    };

    expect(isAnalysisState(analysisState)).toBe(true);
  });

  it('应该正确验证包含可选字段的对象', () => {
    const promptLabState = {
      currentPrompt: 'Generate a product description',
      history: [
        {
          id: 'hist-001',
          prompt: 'Test',
          response: 'Response',
          timestamp: Date.now()
        }
      ]
    };

    expect(isPromptLabState(promptLabState)).toBe(true);
  });
});
