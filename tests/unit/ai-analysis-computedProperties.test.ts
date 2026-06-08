import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComputedProperties } from '@/modules/app_center/views/master_analysis/ai_analysis/components/computedProperties';
import type { AlpineContext } from '@/modules/app_center/views/master_analysis/ai_analysis/types';

const mockAppStoreState = vi.hoisted(() => ({
  scraper: undefined as any
}));

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => mockAppStoreState
  }
}));

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
    useRealData: true,
    dataSource: 'scraper',
    showDataSourceBanner: false,
    availableAsins: [],
    hasData: false,
    canAnalyze: false,
    $nextTick: vi.fn((callback) => callback()),
    _unsubscribes: [],
    ...overrides
  } as AlpineContext;
}

describe('computedProperties - currentProducts', () => {
  beforeEach(() => {
    mockAppStoreState.scraper = undefined;
  });

  it('真实数据模式下产品数据为空时不回退到示例产品', () => {
    const context = createContext({
      selectedAsins: ['B0DNMZ2MLG'],
      useRealData: true,
      dataSource: 'scraper'
    });

    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toEqual([]);
    expect(computed.hasData).toBe(false);
  });

  it('示例数据模式下仍可读取示例产品', () => {
    const context = createContext({
      selectedAsins: ['B0DNMZ2MLG'],
      useRealData: false,
      dataSource: 'sample'
    });

    const computed = createComputedProperties(context);

    expect(computed.currentProducts).toHaveLength(1);
    expect(computed.currentProducts[0].asin).toBe('B0DNMZ2MLG');
    expect(computed.hasData).toBe(true);
  });
});
