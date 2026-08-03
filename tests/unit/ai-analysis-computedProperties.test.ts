/**
 * computedProperties 单元测试
 * 覆盖 scraper 数据转换、可用 ASIN、分析结果解析、数据源元数据与 token 统计
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComputedProperties } from '@/modules/app_center/views/master_analysis/ai_analysis/components/computedProperties';
import type { AlpineContext } from '@/modules/app_center/views/master_analysis/ai_analysis/types';
import { SAMPLE_ANALYSIS_REPORT } from '@/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';
import type { FullAnalysisReport } from '@/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

const mockAppStoreState = vi.hoisted(() => ({
  scraper: undefined as any,
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mockAppStoreState,
  },
}));

function mountComputed(context: AlpineContext): AlpineContext {
  // 模拟 AlpinePanel 的真实合并方式：getter 定义在组件对象上，this 可访问 selectedTargets 等字段
  const computedProps = createComputedProperties(context);
  const descriptors = Object.getOwnPropertyDescriptors(computedProps);
  Object.defineProperties(context, descriptors);
  return context;
}

function createContext(overrides: Partial<AlpineContext> = {}): AlpineContext {
  return {
    selectedAsins: [],
    selectedTargets: [],
    isAnalyzing: false,
    progress: 0,
    currentStep: '',
    analysisReport: null,
    hasReport: false,
    reportResults: [],
    reportListingsResults: [],
    reportReviewsResults: [],
    reportTotalHighlights: 0,
    reportTotalDetails: 0,
    reportFullData: null,
    reportRenderVersion: 0,
    expandedPromptIndex: null,
    showPromptPanel: false,
    showJsonViewer: false,
    dataSource: 'scraper',
    availableAsins: [],
    hasData: false,
    canAnalyze: false,
    $nextTick: vi.fn(callback => callback()),
    _unsubscribes: [],
    ...overrides,
  } as AlpineContext;
}

function setScraperData(products: unknown[], metadata: Record<string, unknown> = {}) {
  mockAppStoreState.scraper = {
    scrapedData: { products, metadata },
  };
}

describe('computedProperties - currentProducts', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('产品数据为空时不回退到示例产品', () => {
    const context = createContext({
      selectedAsins: ['B0DNMZ2MLG'],
      dataSource: 'scraper',
    });

    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toEqual([]);
    expect(computed.hasData).toBe(false);
  });

  it('即使 ASIN 命中示例产品，也不会读取示例产品', () => {
    const context = createContext({
      selectedAsins: ['B0DNMZ2MLG'],
      dataSource: 'scraper',
    });

    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toEqual([]);
    expect(computed.hasData).toBe(false);
  });

  it('从 scraper 数据按选中 ASIN 转换产品（标准字段）', () => {
    setScraperData([
      {
        asin: 'B0TEST001',
        productTitle: 'Test Product',
        feature_bullets: ['bullet 1', 'bullet 2'],
        customer_reviews: [{ star_rating: 5, headline: 'Great', body: 'Works well' }],
      },
    ]);
    const context = createContext({ selectedAsins: ['B0TEST001'] });
    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toHaveLength(1);
    expect(computed.currentProducts[0]).toMatchObject({
      asin: 'B0TEST001',
      productTitle: 'Test Product',
      feature_bullets: ['bullet 1', 'bullet 2'],
    });
    expect(computed.currentProducts[0].customer_reviews[0]).toMatchObject({
      star_rating: 5,
      headline: 'Great',
      body: 'Works well',
    });
    expect(computed.hasData).toBe(true);
  });

  it('支持别名字段（title/bulletPoints/reviews）与未知字段', () => {
    setScraperData([
      {
        asin: 'B0TEST002',
        title: 'Alias Product',
        bulletPoints: ['alias bullet'],
        reviews: [{ rating: 4, review_text: 'Alias review' }],
        unknownField: 'ignored',
      },
    ]);
    const context = createContext({ selectedAsins: ['B0TEST002'] });
    const computed = createComputedProperties(context);

    expect(computed.currentProducts[0].productTitle).toBe('Alias Product');
    expect(computed.currentProducts[0].feature_bullets).toEqual(['alias bullet']);
    expect(computed.currentProducts[0].customer_reviews[0].body).toBe('Alias review');
  });

  it('无效产品数据返回空数组并保持 hasData=false', () => {
    setScraperData([null, { asin: 123 }]);
    const context = createContext({ selectedAsins: ['B0TEST003'] });
    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toEqual([]);
    expect(computed.hasData).toBe(false);
  });
});

describe('computedProperties - availableAsins 与任务配置', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('返回 scraper 产品的 ASIN 列表并过滤空值', () => {
    setScraperData([{ asin: 'B0TEST001' }, { asin: '' }, { asin: 'B0TEST003' }]);
    const computed = createComputedProperties(createContext());

    expect(computed.availableAsins).toEqual(['B0TEST001', 'B0TEST003']);
    expect(computed.hasNoAvailableAsins).toBe(false);
  });

  it('无 scraper 数据时 availableAsins 为空', () => {
    const computed = createComputedProperties(createContext());
    expect(computed.availableAsins).toEqual([]);
    expect(computed.hasNoAvailableAsins).toBe(true);
  });

  it('按来源过滤分析目标', () => {
    const computed = createComputedProperties(createContext());
    expect(computed.analysisTargets).toHaveLength(8);
    expect(computed.listingAnalysisTargets.every(t => t.source === 'Listings')).toBe(true);
    expect(computed.reviewAnalysisTargets.every(t => t.source === 'Reviews')).toBe(true);
    expect(computed.listingAnalysisTargets.length + computed.reviewAnalysisTargets.length).toBe(8);
  });
});

describe('computedProperties - 分析能力与输入状态', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('canAnalyze 需要目标、数据且未在分析中', () => {
    setScraperData([{ asin: 'B0TEST001', productTitle: 'P' }]);
    const context = createContext({
      selectedAsins: ['B0TEST001'],
      selectedTargets: ['title-keywords'],
      isAnalyzing: false,
    });
    const computed = createComputedProperties(context);

    expect(computed.canAnalyze).toBe(true);

    const analyzing = createComputedProperties(createContext({ ...context, isAnalyzing: true }));
    expect(analyzing.canAnalyze).toBe(false);

    const noTargets = createComputedProperties(createContext({ ...context, selectedTargets: [] }));
    expect(noTargets.canAnalyze).toBe(false);

    const noData = createComputedProperties(
      createContext({ selectedAsins: [], selectedTargets: ['title-keywords'] })
    );
    expect(noData.canAnalyze).toBe(false);
  });

  it('hasSelectedAnalysisInput 与 hasMissingAnalysisInput 反映选中状态', () => {
    setScraperData([{ asin: 'B0TEST001' }]);
    const ready = createComputedProperties(
      createContext({ selectedAsins: ['B0TEST001'], selectedTargets: ['title-keywords'] })
    );
    expect(ready.hasSelectedAnalysisInput).toBe(true);
    expect(ready.hasMissingAnalysisInput).toBe(false);

    const noAsins = createComputedProperties(
      createContext({ selectedAsins: [], selectedTargets: ['title-keywords'] })
    );
    expect(noAsins.hasSelectedAnalysisInput).toBe(false);
    expect(noAsins.hasMissingAnalysisInput).toBe(true);

    const noTargets = createComputedProperties(
      createContext({ selectedAsins: ['B0TEST001'], selectedTargets: [] })
    );
    expect(noTargets.hasSelectedAnalysisInput).toBe(false);
    expect(noTargets.hasMissingAnalysisInput).toBe(true);
  });

  it('任务计数与提示面板文案', () => {
    const computed = createComputedProperties(
      createContext({ selectedTargets: ['a', 'b'], showPromptPanel: true })
    );
    expect(computed.selectedTaskCountText).toBe('2 个任务');
    expect(computed.promptPanelToggleText).toBe('收起 预览');

    const collapsed = createComputedProperties(createContext({ showPromptPanel: false }));
    expect(collapsed.promptPanelToggleText).toBe('展开 预览');
  });
});

describe('computedProperties - 汇总计数与数据源元数据', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('统计 feature bullets 与 customer reviews 总数', () => {
    setScraperData([
      {
        asin: 'B0TEST001',
        feature_bullets: ['a', 'b'],
        customer_reviews: [{ star_rating: 5 }, { star_rating: 4 }],
      },
      {
        asin: 'B0TEST002',
        feature_bullets: ['c'],
        customer_reviews: [{ star_rating: 3 }],
      },
    ]);
    const computed = createComputedProperties(
      createContext({ selectedAsins: ['B0TEST001', 'B0TEST002'] })
    );

    expect(computed.totalFeatureBulletCount).toBe(3);
    expect(computed.totalCustomerReviewCount).toBe(3);
    expect(computed.productSummaryText).toBe('包含 2 个产品，共 3 条评论');
  });

  it('数据源标签、市场与抓取时间透出', () => {
    setScraperData([{ asin: 'B0TEST001' }], {
      marketplace: 'DE',
      scrape_timestamp: '2026-08-01T00:00:00Z',
    });
    const computed = createComputedProperties(createContext());

    expect(computed.hasScraperData).toBe(true);
    expect(computed.dataSourceLabel).toBe('数据采集');
    expect(computed.dataSourceMarketplace).toBe('DE');
    expect(computed.dataSourceTimestamp).toBe('2026-08-01T00:00:00Z');
    expect(computed.dataSourceMetaText).toBe('市场: DE · 抓取时间: 2026-08-01T00:00:00Z');
    expect(computed.hasNoScraperData).toBe(false);
  });

  it('无 scraper 数据时数据源字段回退为未知', () => {
    const computed = createComputedProperties(createContext());
    expect(computed.hasScraperData).toBe(false);
    expect(computed.hasNoScraperData).toBe(true);
    expect(computed.dataSourceMarketplace).toBe('未知');
    expect(computed.dataSourceTimestamp).toBe('未知');
  });
});

describe('computedProperties - 报告结果解析', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('按选中目标解析完整报告并区分来源', () => {
    const context = createContext({
      analysisReport: SAMPLE_ANALYSIS_REPORT,
      selectedTargets: ['title-keywords', 'fatal-flaws', 'wow-moments'],
    });
    const computed = createComputedProperties(context);

    expect(computed.results.map(r => r.targetId)).toEqual([
      'title-keywords',
      'fatal-flaws',
      'wow-moments',
    ]);
    expect(computed.listingsResults.map(r => r.targetId)).toEqual(['title-keywords']);
    expect(computed.reviewsResults.map(r => r.targetId)).toEqual(['fatal-flaws', 'wow-moments']);
    expect(computed.totalHighlights).toBe(
      computed.results.reduce((sum, r) => sum + r.highlights.length, 0)
    );
    expect(computed.totalDetails).toBe(
      computed.results.reduce((sum, r) => sum + r.details.length, 0)
    );
  });

  it('无报告或未选目标时结果为空', () => {
    const empty = createComputedProperties(createContext({ selectedTargets: ['title-keywords'] }));
    expect(empty.results).toEqual([]);

    const noTargets = createComputedProperties(
      createContext({ analysisReport: SAMPLE_ANALYSIS_REPORT })
    );
    expect(noTargets.results).toEqual([]);
  });

  it('报告解析失败时返回空数组', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const context = createContext({
      analysisReport: {
        'title-keywords': { primary_keywords: [null] },
      } as unknown as FullAnalysisReport,
      selectedTargets: ['title-keywords'],
    });
    const computed = createComputedProperties(context);

    expect(computed.results).toEqual([]);
    errorSpy.mockRestore();
  });

  it('fullReportData 汇总报告元数据与产品标题', () => {
    setScraperData([{ asin: 'B0TEST001', productTitle: 'Product A' }]);
    const context = createContext({
      selectedAsins: ['B0TEST001'],
      selectedTargets: ['title-keywords'],
      analysisReport: SAMPLE_ANALYSIS_REPORT,
    });
    const computed = createComputedProperties(context);
    const fullData = computed.fullReportData;

    expect(fullData).not.toBeNull();
    expect(fullData!.metadata.asins).toEqual(['B0TEST001']);
    expect(fullData!.metadata.targets).toEqual(['title-keywords']);
    expect(fullData!.metadata.dataSource).toBe('scraper');
    expect(fullData!.metadata.productTitle).toBe('Product A');
    expect(fullData!.analysisReport).toBe(SAMPLE_ANALYSIS_REPORT);
  });

  it('无报告时 fullReportData 为 null', () => {
    const computed = createComputedProperties(createContext());
    expect(computed.fullReportData).toBeNull();
  });
});

describe('computedProperties - token 统计', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('无目标或无产品时 token 为 0', () => {
    setScraperData([{ asin: 'B0TEST001', productTitle: 'P' }]);
    const computed = mountComputed(createContext({ selectedAsins: ['B0TEST001'] }));
    expect(computed.totalTokenCount).toBe(0);
    expect(computed.formattedTotalTokenCount).toBe('0');
  });

  it('有产品与目标时按提示词估算 token', () => {
    setScraperData([
      {
        asin: 'B0TEST001',
        productTitle: 'Test Product Title',
        feature_bullets: ['feature bullet one', 'feature bullet two'],
        customer_reviews: [{ star_rating: 5, body: 'review body text' }],
      },
    ]);
    const context = createContext({
      selectedAsins: ['B0TEST001'],
      selectedTargets: ['title-keywords'],
    });
    const computed = mountComputed(context);

    expect(computed.totalTokenCount).toBeGreaterThan(0);
    expect(computed.formattedTotalTokenCount).toBe(String(computed.totalTokenCount));
  });
});
