// tests/helpers/testFactory.ts
// ================================================================
// 测试数据工厂
// 提供可复用的测试数据生成函数
// ================================================================

import type { 
  UIState, 
  ScraperState, 
  AnalysisState, 
  PromptLabState, 
  KeywordTrackerState 
} from '@/types/state';
import type { Route, RouteConfig } from '@/types/config';
import { ErrorLevel, ErrorCategory, type ErrorContext } from '@/common/errors/AppError';

/**
 * 创建测试用的UI状态
 */
export function createTestUIState(overrides?: Partial<UIState>): UIState {
  return {
    currentTab: 'home',
    currentDataTab: 'preview',
    currentReportTab: 'report',
    sidebarCollapsed: false,
    theme: 'light',
    loading: false,
    ...overrides
  };
}

/**
 * 创建测试用的Scraper状态
 */
export function createTestScraperState(overrides?: Partial<ScraperState>): ScraperState {
  return {
    isScraping: false,
    status: 'idle',
    selectedSite: '',
    scrapedData: null,
    currentHistoryId: null,
    ...overrides
  };
}

/**
 * 创建测试用的Analysis状态
 */
export function createTestAnalysisState(overrides?: Partial<AnalysisState>): AnalysisState {
  return {
    selectedAsins: [],
    reportData: null,
    analysisReport: null,
    translatedReport: null,
    expandedAsin: null,
    isEditing: false,
    showTranslation: false,
    editHistory: [],
    lastTranslationModel: null,
    isAnalyzing: false,
    ...overrides
  };
}

/**
 * 创建测试用的PromptLab状态
 */
export function createTestPromptLabState(overrides?: Partial<PromptLabState>): PromptLabState {
  return {
    currentPrompt: '',
    history: [],
    userProductProfile: undefined,
    selectedModel: '',
    temperature: 0.7,
    maxTokens: 2000,
    ...overrides
  };
}

/**
 * 创建测试用的KeywordTracker状态
 */
export function createTestKeywordTrackerState(overrides?: Partial<KeywordTrackerState>): KeywordTrackerState {
  return {
    keywords: [],
    processedCopy: '',
    formattedCopy: '',
    matchedKeywords: [],
    unmatchedKeywords: [],
    wordFrequency: [],
    paragraphs: [],
    translationMode: false,
    keywordLocationIndex: {},
    settings: {
      matchPlural: true,
      matchStem: true,
      matchCase: false,
      matchPartial: false
    },
    isWindowMinimized: false,
    trackingData: null,
    isTracking: false,
    ...overrides
  };
}

/**
 * 创建测试用的路由配置
 */
export function createTestRouteConfig(overrides?: Partial<RouteConfig>): RouteConfig {
  return {
    title: 'Test Route',
    icon: 'test-icon',
    view: 'test-view',
    meta: {},
    ...overrides
  };
}

/**
 * 创建测试用的路由对象
 */
export function createTestRoute(path: string = 'test', overrides?: Partial<Route>): Route {
  return {
    path,
    config: createTestRouteConfig(),
    state: {},
    ...overrides
  };
}

/**
 * 创建测试用的错误上下文
 */
export function createTestErrorContext(overrides?: Partial<ErrorContext>): ErrorContext {
  return {
    module: 'TestModule',
    action: 'testAction',
    ...overrides
  };
}

/**
 * 创建测试用的HTTP响应
 */
export function createTestResponse(data: any = { data: 'test' }, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'content-type': 'application/json'
    })
  };
}

/**
 * 创建测试用的抓取数据
 */
export function createTestScrapedData(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    asin: `B${String(i + 1).padStart(3, '0')}`,
    title: `Product ${i + 1}`,
    price: (Math.random() * 100).toFixed(2),
    rating: (Math.random() * 2 + 3).toFixed(1),
    reviews: Math.floor(Math.random() * 1000)
  }));
}

/**
 * 创建测试用的分析报告
 */
export function createTestAnalysisReport(asins: string[] = ['B001', 'B002']) {
  return {
    summary: 'Test analysis complete',
    timestamp: Date.now(),
    details: asins.reduce((acc, asin) => {
      acc[asin] = {
        score: Math.floor(Math.random() * 100),
        recommendation: 'Good',
        insights: ['Insight 1', 'Insight 2']
      };
      return acc;
    }, {} as Record<string, any>)
  };
}

/**
 * 创建测试用的关键词列表
 */
export function createTestKeywords(count: number = 5): string[] {
  return Array.from({ length: count }, (_, i) => `keyword${i + 1}`);
}

/**
 * 创建测试用的Prompt历史
 */
export function createTestPromptHistory(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `prompt-${i + 1}`,
    prompt: `Test prompt ${i + 1}`,
    response: `Test response ${i + 1}`,
    timestamp: Date.now() - (count - i) * 60000,
    model: 'gpt-4'
  }));
}

/**
 * 创建批量测试数据
 */
export function createBulkTestData<T>(
  factory: (index: number) => T,
  count: number
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}

/**
 * 延迟函数(用于模拟异步操作)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建Mock函数并记录调用
 */
export function createMockWithHistory<T extends (...args: any[]) => any>() {
  const calls: Array<{ args: Parameters<T>; result?: ReturnType<T>; error?: Error }> = [];
  
  const mock = (...args: Parameters<T>) => {
    const call = { args } as any;
    calls.push(call);
    return undefined as ReturnType<T>;
  };

  return {
    mock,
    calls,
    getCallCount: () => calls.length,
    getLastCall: () => calls[calls.length - 1],
    reset: () => calls.length = 0
  };
}

/**
 * 等待条件满足
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await delay(interval);
  }
}

/**
 * 创建测试用的缓存条目
 */
export function createTestCacheEntry(url: string, data: any = { data: 'cached' }) {
  return {
    url,
    data,
    timestamp: Date.now(),
    ttl: 60000
  };
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * 生成随机数字
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机布尔值
 */
export function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

/**
 * 从数组中随机选择元素
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 创建测试用的事件数据
 */
export function createTestEvent(type: string, data: any = {}) {
  return {
    type,
    data,
    timestamp: Date.now()
  };
}
