import { beforeEach, expect, it, vi } from 'vitest';
import { createAiAnalysisPanel } from '@/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel';
import * as actions from '@/modules/app_center/views/master_analysis/ai_analysis/components/actions';
import { parseAnalysisReport } from '@/modules/app_center/views/master_analysis/ai_analysis/services/analysisService';
import {
  checkAndLoadScraperData,
  checkLoadedReport,
} from '@/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders';
import { cleanupSubscriptions } from '@/common/utils/stateSync';

const panelMocks = vi.hoisted(() => {
  const storeState = {
    analysis: {
      selectedAsins: ['B001'],
      isAnalyzing: false,
      progress: 12,
      currentStep: '准备中',
      analysisReport: null as unknown,
    },
  };

  const reportResults = [
    {
      targetId: 'selling-points',
      title: '卖点',
      source: 'Listings',
      color: 'blue',
      icon: 'fa-solid fa-bolt',
      stats: [],
      highlights: [{ type: 'success' }, { type: 'warning' }],
      details: [{ label: 'detail' }],
    },
    {
      targetId: 'review-insights',
      title: '评论',
      source: 'Reviews',
      color: 'amber',
      icon: 'fa-solid fa-star',
      stats: [],
      highlights: [{ type: 'danger' }],
      details: [{ label: 'review' }, { label: 'review2' }],
    },
  ];

  return {
    checkAndLoadScraperData: vi.fn(),
    checkLoadedReport: vi.fn(),
    cleanupSubscriptions: vi.fn(),
    createMultipleStateSyncs: vi.fn(
      (
        configs: Array<{
          selector: (state: typeof storeState) => unknown;
          onChange: (value: unknown) => void;
          immediate?: boolean;
        }>
      ) =>
        configs.map(config => {
          if (config.immediate) {
            config.onChange(config.selector(storeState));
          }
          return vi.fn();
        })
    ),
    createPerformanceSettingsPanel: vi.fn(() => ({
      settings: { maxConcurrency: 3, enableCache: true, failureStrategy: 'continue' },
      open: vi.fn(),
    })),
    formatHistoryDate: vi.fn((timestamp: string) => `formatted:${timestamp}`),
    helperGetFormattedTokenCount: vi.fn((targetId: string) => `tokens:${targetId}`),
    helperGetPromptText: vi.fn((targetId: string) => `Prompt for ${targetId}`),
    helperGetPromptTokenCount: vi.fn((targetId: string) => targetId.length),
    helperGetResultColor: vi.fn((targetId: string) =>
      targetId.includes('review') ? 'amber' : 'blue'
    ),
    helperGetResultIcon: vi.fn((targetId: string) => `icon-${targetId}`),
    helperGetTargetColorClass: vi.fn((color: string) => `target-${color}`),
    parseAnalysisReport: vi.fn(() => reportResults),
    reportResults,
    storeState,
    toggleAsin: vi.fn((ctx: Record<string, unknown>, asin: string) => {
      const selected = ctx.selectedAsins as string[];
      ctx.selectedAsins = selected.includes(asin)
        ? selected.filter(item => item !== asin)
        : [...selected, asin];
    }),
    selectAllAsins: vi.fn((ctx: Record<string, unknown>, asins: string[]) => {
      ctx.selectedAsins = [...asins];
    }),
    clearAllAsins: vi.fn((ctx: Record<string, unknown>) => {
      ctx.selectedAsins = [];
    }),
    toggleTarget: vi.fn((ctx: Record<string, unknown>, targetId: string) => {
      const selected = ctx.selectedTargets as string[];
      ctx.selectedTargets = selected.includes(targetId)
        ? selected.filter(item => item !== targetId)
        : [...selected, targetId];
    }),
    selectAllTargets: vi.fn((ctx: Record<string, unknown>) => {
      ctx.selectedTargets = ['selling-points', 'review-insights'];
    }),
    clearAllTargets: vi.fn((ctx: Record<string, unknown>) => {
      ctx.selectedTargets = [];
    }),
    togglePromptPanel: vi.fn((ctx: Record<string, unknown>) => {
      ctx.showPromptPanel = !(ctx.showPromptPanel as boolean);
    }),
    togglePromptItem: vi.fn((ctx: Record<string, unknown>, index: number) => {
      ctx.expandedPromptIndex = ctx.expandedPromptIndex === index ? null : index;
    }),
    toggleJsonViewer: vi.fn((ctx: Record<string, unknown>) => {
      ctx.showJsonViewer = !(ctx.showJsonViewer as boolean);
    }),
    copyPrompt: vi.fn(),
    copyJson: vi.fn(),
    copyMarkdown: vi.fn(),
    downloadJson: vi.fn(),
    navigateToRouteId: vi.fn(async () => true),
    runAnalysisAction: vi.fn(async () => undefined),
  };
});

vi.mock('@/stores/useAppStore', () => ({
  appStore: {
    getState: () => panelMocks.storeState,
  },
}));

vi.mock('@/common/utils/stateSync', () => ({
  createMultipleStateSyncs: panelMocks.createMultipleStateSyncs,
  cleanupSubscriptions: panelMocks.cleanupSubscriptions,
}));

vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/components/dataLoaders', () => ({
  checkAndLoadScraperData: panelMocks.checkAndLoadScraperData,
  checkLoadedReport: panelMocks.checkLoadedReport,
  loadHistoricalReport: vi.fn((ctx: Record<string, unknown>, detail: { report: unknown }) => {
    ctx.analysisReport = detail.report;
  }),
}));

vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/services/reportGenerator', () => ({
  formatHistoryDate: panelMocks.formatHistoryDate,
}));

vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/services/analysisService', () => ({
  parseAnalysisReport: panelMocks.parseAnalysisReport,
}));

vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/components/helpers', () => ({
  getFormattedTokenCount: panelMocks.helperGetFormattedTokenCount,
  getPromptText: panelMocks.helperGetPromptText,
  getPromptTokenCount: panelMocks.helperGetPromptTokenCount,
  getResultColor: panelMocks.helperGetResultColor,
  getResultIcon: panelMocks.helperGetResultIcon,
  getTargetColorClass: panelMocks.helperGetTargetColorClass,
}));

vi.mock('@/modules/app_center/views/master_analysis/ai_analysis/components/actions', () => ({
  toggleAsin: panelMocks.toggleAsin,
  selectAllAsins: panelMocks.selectAllAsins,
  clearAllAsins: panelMocks.clearAllAsins,
  toggleTarget: panelMocks.toggleTarget,
  selectAllTargets: panelMocks.selectAllTargets,
  clearAllTargets: panelMocks.clearAllTargets,
  togglePromptPanel: panelMocks.togglePromptPanel,
  togglePromptItem: panelMocks.togglePromptItem,
  toggleJsonViewer: panelMocks.toggleJsonViewer,
  copyPrompt: panelMocks.copyPrompt,
  copyJson: panelMocks.copyJson,
  copyMarkdown: panelMocks.copyMarkdown,
  downloadJson: panelMocks.downloadJson,
  runAnalysisAction: panelMocks.runAnalysisAction,
}));

vi.mock(
  '@/modules/app_center/views/master_analysis/ai_analysis/components/PerformanceSettings',
  () => ({
    createPerformanceSettingsPanel: panelMocks.createPerformanceSettingsPanel,
  })
);

vi.mock('@/common/router/initRouter', () => ({
  navigateToRouteId: panelMocks.navigateToRouteId,
}));

vi.mock(
  '@/modules/app_center/views/master_analysis/ai_analysis/components/computedProperties',
  () => ({
    createComputedProperties: vi.fn(() => ({
      availableAsins: ['B001', 'B002'],
      currentProducts: [{ asin: 'B001', productTitle: 'Product One' }],
      totalTokenCount: 1200,
      hasScraperData: true,
      hasData: true,
      dataSourceMarketplace: 'US',
      dataSourceLabel: 'Scraper',
    })),
  })
);

type AiPanel = ReturnType<typeof createAiAnalysisPanel> & Record<string, any>;

function createPanel(): AiPanel {
  const panel = createAiAnalysisPanel() as AiPanel;
  panel.$watch = vi.fn();
  return panel;
}

beforeEach(() => {
  vi.clearAllMocks();
  panelMocks.storeState.analysis = {
    selectedAsins: ['B001'],
    isAnalyzing: false,
    progress: 12,
    currentStep: '准备中',
    analysisReport: null,
  };
  window.location.hash = '';
});

it('initializes synced state, default targets, loaders, and cleanup hooks', () => {
  const addSpy = vi.spyOn(window, 'addEventListener');
  const removeSpy = vi.spyOn(window, 'removeEventListener');
  const panel = createPanel();

  panel.init();

  expect(panel.selectedAsins).toEqual(['B001']);
  expect(panel.progress).toBe(12);
  expect(panel.currentStep).toBe('准备中');
  expect(panel.selectedTargets.length).toBeGreaterThan(0);
  expect(checkAndLoadScraperData).toHaveBeenCalledWith(panel);
  expect(checkLoadedReport).toHaveBeenCalledWith(panel);
  expect(panel.$watch).toHaveBeenCalledWith('analysisReport', expect.any(Function));
  expect(addSpy).toHaveBeenCalledWith('app:navigate-to-scraper', expect.any(Function));

  window.dispatchEvent(new Event('app:navigate-to-scraper'));
  expect(panelMocks.navigateToRouteId).toHaveBeenCalledWith('scraper');

  panel.destroy();

  expect(cleanupSubscriptions).toHaveBeenCalledWith(expect.any(Array));
  expect(removeSpy).toHaveBeenCalledWith('app:navigate-to-scraper', expect.any(Function));
});

it('computes selection, target, prompt, and visual class branches', () => {
  const panel = createPanel();
  panel.selectedAsins = ['B001'];
  panel.selectedTargets = ['selling-points'];

  expect(panel.selectionPanelButtonClass).toBe('');
  expect(panel.showSelectionSummary).toBe(true);
  panel.toggleSelectionPanel();
  expect(panel.showSelectionPanel).toBe(true);
  expect(panel.selectionPanelButtonClass).toContain('bg-slate-50');
  expect(panel.selectionPanelChevronClass).toContain('up');
  panel.showProductSummaryTooltip();
  expect(panel.productSummaryTooltipVisible).toBe(true);
  panel.hideProductSummaryTooltip();
  expect(panel.productSummaryTooltipVisible).toBe(false);

  expect(panel.getTargetById('selling-points')).toBeDefined();
  expect(panel.getTargetName('missing')).toBe('missing');
  expect(panel.getTargetDescription('missing')).toBe('');
  expect(panel.getPromptNumber(2)).toBe(3);
  expect(panel.getPromptText('selling-points')).toBe('Prompt for selling-points');
  expect(panel.getPromptTokenCount('selling-points')).toBe('selling-points'.length);
  expect(panel.getFormattedTokenCount('selling-points')).toBe('tokens:selling-points');
  expect(panel.getPromptTokenCountText('selling-points')).toBe('14');
  expect(panel.getPromptCharCountText('selling-points')).toBe('25');
  expect(panel.isTargetSelected('selling-points')).toBe(true);
  expect(panel.getAsinOptionClass('B001')).toContain('bg-[var(--color-primary-light)]');
  expect(panel.getAsinOptionClass('B002')).toContain(
    'hover:border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]'
  );
  expect(panel.getListingTargetCardClass('selling-points')).toContain('var(--color-primary)');
  expect(panel.getReviewTargetCardClass('review-insights')).toContain('hover:border-slate-200');
  expect(panel.getListingTargetIconClass('missing')).toContain('fa-circle');
  expect(panel.getTargetCheckClass('selling-points')).toContain('bg-[var(--color-primary)]');
  expect(panel.getTargetColor('blue')).toBe('target-blue');
});

it('computes hero, progress, report, JSON, and confidence branches', () => {
  const panel = createPanel();
  panel.selectedAsins = ['B001'];
  panel.selectedTargets = ['selling-points'];
  panel.analysisReport = {
    _metadata: {
      analyzedAt: '2026-06-12T08:00:00.000Z',
      confidence: { 'selling-points': 0.74, 'review-insights': 0.49 },
      overallConfidence: 0.82,
    },
  };
  panel.hasReport = true;
  panel.reportResults = panelMocks.reportResults;
  panel.reportListingsResults = [panelMocks.reportResults[0]];
  panel.reportReviewsResults = [panelMocks.reportResults[1]];
  panel.reportFullData = { hello: 'world' };
  panel.progress = 72;

  expect(panel.analysisHeroIsComplete).toBe(true);
  expect(panel.analysisHeroIsStrong).toBe(false);
  expect(panel.analysisHeroIsCompact).toBe(true);
  expect(panel.analysisHeroCardClass).toContain('bg-white');
  expect(panel.analysisHeroBackdropClass).toBe('bg-white');
  expect(panel.analysisHeroIconClass).toBe('fa-solid fa-circle-check');
  expect(panel.isAnalysisComplete).toBe(true);
  expect(panel.isAnalysisRunning).toBe(false);
  expect(panel.isAnalysisIdle).toBe(false);
  expect(panel.hasAnalysisSelection).toBe(true);
  expect(panel.canRunAnalysis).toBe(true);
  expect(panel.runAnalysisDisabled).toBe(false);
  expect(panel.runAnalysisButtonClass).toContain('bg-[var(--color-primary)]');
  expect(panel.performanceSummaryText).toBe('并发 3 · 缓存开 · 失败继续');
  expect(panel.runAnalysisNotRunningLabel).toBe('重新分析');
  expect(panel.runAnalysisNotRunningIconClass).toContain('rotate-right');
  expect(panel.showRunDisabledHint).toBe(false);
  expect(panel.progressText).toBe('72%');
  expect(panel.progressAriaValue).toBe(72);
  expect(panel.progressStyle).toBe('width: 72%');
  expect(panel.progressInsightStepClass).toBe('text-white/80');
  expect(panel.reportStatusText).toBe('分析结果');
  expect(panel.reportStatusBadgeText).toBe('已完成');
  expect(panel.reportStatusIconClass).toContain('circle-check');
  expect(panel.jsonViewerChevronClass).toContain('down');
  expect(panel.selectedAsinsJsonText).toBe('"B001"');
  expect(panel.hasReportWithResults).toBe(true);
  expect(panel.getListingsResultCountText()).toBe('1 项');
  expect(panel.getReviewsResultCountText()).toBe('1 项');
  expect(panel.showTargetConfidence('selling-points')).toBe(true);
  expect(panel.getTargetConfidenceText('selling-points')).toBe('74%');
  expect(panel.getConfidenceColorClass('selling-points')).toContain('confidence-high');
  expect(panel.getConfidenceBgAlphaClass(49)).toContain('low');
  expect(panel.getConfidenceTextLightClass(50)).toContain('medium');
  expect(panel.getConfidenceTextBorderClass(70)).toContain('high');
  expect(panel.getConfidenceLevel(49)).toBe('低');
  expect(panel.getConfidenceLevel(50)).toBe('中');
  expect(panel.getConfidenceLevel(70)).toBe('高');
  expect(panel.getConfidenceAriaLabel(82)).toBe('置信度: 82%, 等级: 高');
  expect(panel.overallConfidencePercent).toBe(82);
  expect(panel.overallConfidenceAriaLabel).toBe('整体置信度 82%');
  expect(panel.overallConfidenceLevelText).toBe('置信度等级: 高');
  expect(panel.getReportJsonText()).toContain('"hello"');
  expect(panel.getReportJsonCharText()).not.toBe('');
  expect(panel.getResultColorEnd('review-insights')).toBe('orange');
  expect(panel.getListingResultHeaderClass('selling-points')).toContain('bg-blue-50');
  expect(panel.getReviewResultHeaderClass('review-insights')).toContain('bg-amber-50');
  expect(panel.getResultIconWrapClass('missing')).toContain('bg-blue-100');
  expect(panel.getResultIconDisplayClass('selling-points')).toContain('icon-selling-points');
  expect(panel.getResultCategoryClass('review-insights')).toContain('text-amber-700');
  expect(panel.getHighlightClass('danger')).toHaveProperty(
    'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200',
    true
  );
  expect(panel.getHighlightIconClass('info')).toHaveProperty('fa-circle-info text-blue-500', true);

  panel.isAnalyzing = true;
  expect(panel.analysisHeroIsStrong).toBe(true);
  expect(panel.isAnalysisRunning).toBe(true);
  expect(panel.runAnalysisButtonClass).toContain('cursor-wait');

  panel.selectedAsins = [];
  panel.selectedTargets = [];
  expect(panel.isMissingAsinAndTarget).toBe(true);
  panel.selectedTargets = ['selling-points'];
  expect(panel.isMissingAsinOnly).toBe(true);
  panel.selectedAsins = ['B001'];
  panel.selectedTargets = [];
  expect(panel.isMissingTargetOnly).toBe(true);
});

it('exposes CSP-safe Math helpers for Alpine expressions', () => {
  const panel = createPanel();

  expect(panel.Math).not.toBe(Math);
  expect(panel.Math.round(72.4)).toBe(72);
  expect(panel.Math.ceil(72.1)).toBe(73);
  expect(panel.Math.floor(72.9)).toBe(72);
  expect(panel.Math.min(72, 73)).toBe(72);
  expect(panel.Math.max(72, 73)).toBe(73);
});

it('computes idle, disabled, fallback, and confidence edge branches', () => {
  const panel = createPanel();

  expect(panel.showSelectionSummary).toBe(false);
  expect(panel.promptPanelChevronClass).toContain('up');
  panel.showPromptPanel = false;
  expect(panel.promptPanelChevronClass).toContain('down');
  panel.showPromptPanel = true;
  expect(panel.promptPanelChevronClass).toContain('up');
  expect(panel.getPromptItemChevronClass(0)).toContain('down');
  panel.expandedPromptIndex = 0;
  expect(panel.getPromptItemChevronClass(0)).toContain('up');

  panel.selectedAsins = ['B001'];
  panel.selectedTargets = ['review-insights'];
  expect(panel.getAsinTextClass('B001')).toBe(
    'text-[var(--color-primary-dark,var(--color-primary))]'
  );
  expect(panel.getAsinTextClass('B002')).toBe('text-slate-700');
  expect(panel.getListingTargetCardClass('selling-points')).toContain('hover:border-slate-200');
  expect(panel.getReviewTargetCardClass('review-insights')).toContain('border-amber-300');
  expect(panel.getListingTargetIconWrapClass('selling-points')).toContain(
    'group-hover:bg-slate-200'
  );
  expect(panel.getReviewTargetIconWrapClass('review-insights')).toContain('bg-amber-50');
  expect(panel.getReviewTargetIconClass('missing')).toContain('fa-circle');
  expect(panel.getTargetCheckClass('selling-points')).toContain('group-hover:border-slate-400');

  panel.hasScraperData = false;
  panel.hasData = false;
  panel.hasReport = false;
  panel.isAnalyzing = false;
  expect(panel.showMissingRealDataNotice).toBe(true);
  expect(panel.hasNoAnalysisData).toBe(true);
  expect(panel.isMissingLoadedData).toBe(true);
  expect(panel.showRunDisabledHint).toBe(true);
  expect(panel.runAnalysisDisabled).toBe(true);
  expect(panel.runAnalysisButtonClass).toContain('cursor-not-allowed');
  expect(panel.analysisHeroAmbientClass).toBe('opacity-0');
  expect(panel.analysisHeroPatternClass).toBe('opacity-0');
  expect(panel.analysisHeroTextClass).toBe('text-slate-800');
  expect(panel.analysisHeroSubtextClass).toBe('text-slate-500');
  expect(panel.analysisHeroMetricPillClass).toContain('bg-slate-100');
  expect(panel.analysisPerfButtonClass).toContain('bg-slate-50');
  expect(panel.analysisHeroIconWrapClass).toContain('bg-slate-100');
  expect(panel.analysisHeroIconClass).toBe('fa-solid fa-bolt');
  expect(panel.analysisHeroBodyClass).toBe('p-8');
  expect(panel.analysisHeroTitleClass).toBe('text-2xl');
  expect(panel.needsAnalysisSelection).toBe(false);
  expect(panel.analysisNotRunning).toBe(true);
  expect(panel.jsonViewerCollapsed).toBe(true);
  panel.showJsonViewer = true;
  expect(panel.jsonViewerCollapsed).toBe(false);

  panel.progress = -1;
  expect(panel.progressDataStepClass).toBe('');
  panel.progress = 100;
  expect(panel.progressDoneStepClass).toBe('text-white/80');
  panel.isAnalyzing = true;
  expect(panel.reportStatusText).toContain('实时更新');
  expect(panel.reportStatusBadgeClass).toContain('bg-blue-50');
  expect(panel.reportStatusIconClass).toContain('animate-pulse');
  expect(panel.reportStatusBadgeText).toBe('实时生成');
  panel.perfSettings.settings.enableCache = false;
  panel.perfSettings.settings.failureStrategy = 'stop';
  expect(panel.performanceSummaryText).toBe('并发 3 · 缓存关 · 失败中止');

  panel.analysisReport = null;
  expect(panel.reportConfidence).toBeNull();
  expect(panel.overallConfidence).toBe(0);
  panel.analysisReport = 'raw report';
  expect(panel.reportConfidence).toBeNull();
  expect(panel.overallConfidence).toBe(0);
  panel.analysisReport = {};
  expect(panel.reportConfidence).toBeNull();
  expect(panel.overallConfidence).toBe(0);
  panel.analysisReport = { _metadata: {} };
  expect(panel.reportConfidence).toBeNull();
  expect(panel.overallConfidence).toBe(0);
  expect(panel.getTargetConfidence('missing')).toBe(0);
  expect(panel.getConfidenceColorClass('missing')).toContain('confidence-low');
  panel.analysisReport = { _metadata: { confidence: { medium: 0.5 } } };
  expect(panel.getConfidenceColorClass('medium')).toContain('confidence-medium');
  expect(panel.getConfidenceBgAlphaClass(70)).toBe('confidence-high-bg-alpha');
  expect(panel.getConfidenceBgAlphaClass(50)).toBe('confidence-medium-bg-alpha');
  expect(panel.getConfidenceTextLightClass(70)).toBe('confidence-high-text');
  expect(panel.getConfidenceTextLightClass(49)).toBe('confidence-low-text');
  expect(panel.getConfidenceTextBorderClass(50)).toContain('confidence-medium-border');
  expect(panel.getConfidenceTextBorderClass(49)).toContain('confidence-low-border');

  panelMocks.helperGetResultColor.mockReturnValueOnce('violet');
  expect(panel.getListingResultHeaderClass('unknown')).toBe('bg-blue-50 border-b border-blue-100');
  panelMocks.helperGetResultColor.mockReturnValueOnce('violet');
  expect(panel.getReviewResultHeaderClass('unknown')).toBe('bg-amber-50 border-b border-amber-100');
  panelMocks.helperGetResultColor.mockReturnValueOnce('violet');
  expect(panel.getResultCategoryClass('unknown')).toBe(
    'bg-blue-50 text-blue-700 border border-blue-100'
  );
  panelMocks.helperGetResultColor.mockReturnValueOnce('violet');
  expect(panel.getResultColorEnd('unknown')).toBe('indigo');
});

it('refreshes report view for empty, success, and parse-failure states', () => {
  const panel = createPanel();
  panel.refreshReportView();
  expect(panel.reportResults).toEqual([]);
  expect(panel.reportFullData).toBeNull();

  panel.selectedAsins = ['B001'];
  panel.selectedTargets = ['selling-points', 'review-insights'];
  panel.analysisReport = { _metadata: { overallConfidence: 0.7 } };
  panel.refreshReportView();

  expect(parseAnalysisReport).toHaveBeenCalledWith(panel.analysisReport, panel.selectedTargets);
  expect(panel.reportResults).toEqual(panelMocks.reportResults);
  expect(panel.reportListingsResults).toEqual([panelMocks.reportResults[0]]);
  expect(panel.reportReviewsResults).toEqual([panelMocks.reportResults[1]]);
  expect(panel.reportTotalHighlights).toBe(3);
  expect(panel.reportTotalDetails).toBe(3);
  expect(panel.reportFullData.metadata.asins).toEqual(['B001']);
  expect(panel.reportFullData.metadata.marketplace).toBe('US');
  expect(panel.reportFullData.metadata.productTitle).toBe('Product One');

  panelMocks.parseAnalysisReport.mockImplementationOnce(() => {
    throw new Error('bad report');
  });
  panel.refreshReportView();

  expect(panel.reportResults).toEqual([]);
  expect(panel.reportFullData).toBeNull();
});

it('delegates actions and data-loading helpers to collaborator modules', async () => {
  const panel = createPanel();

  panel.toggleAsin('B002');
  panel.selectAllAsins();
  panel.clearAllAsins();
  panel.toggleTarget('selling-points');
  panel.selectAllTargets();
  panel.clearAllTargets();
  panel.togglePromptPanel();
  panel.togglePromptItem(1);
  panel.toggleJsonViewer();
  panel.copyPrompt(0);
  panel.copyJson();
  panel.copyMarkdown();
  panel.downloadJson();
  await panel.runAnalysis();
  panel.loadHistoricalReport({ report: { ok: true }, timestamp: 'now' });

  expect(actions.toggleAsin).toHaveBeenCalledWith(panel, 'B002');
  expect(actions.selectAllAsins).toHaveBeenCalledWith(panel, ['B001', 'B002']);
  expect(actions.clearAllAsins).toHaveBeenCalledWith(panel);
  expect(actions.toggleTarget).toHaveBeenCalledWith(panel, 'selling-points');
  expect(actions.selectAllTargets).toHaveBeenCalledWith(panel);
  expect(actions.clearAllTargets).toHaveBeenCalledWith(panel);
  expect(actions.togglePromptPanel).toHaveBeenCalledWith(panel);
  expect(actions.togglePromptItem).toHaveBeenCalledWith(panel, 1);
  expect(actions.toggleJsonViewer).toHaveBeenCalledWith(panel);
  expect(actions.copyPrompt).toHaveBeenCalled();
  expect(actions.copyJson).toHaveBeenCalled();
  expect(actions.copyMarkdown).toHaveBeenCalled();
  expect(actions.downloadJson).toHaveBeenCalled();
  expect(actions.runAnalysisAction).toHaveBeenCalledWith(panel, panel.currentProducts);
  expect(panel.analysisReport).toEqual({ ok: true });
  expect(panel.formatHistoryDate('2026')).toBe('formatted:2026');
});
