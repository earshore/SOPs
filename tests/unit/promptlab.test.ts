// tests/unit/promptlab.test.ts
// ================================================================
// Promptlab 模块单元测试
// 测试模块生命周期、Alpine 组件、状态管理和 Prompt 生成功能
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/master_analysis/promptlab/index';
import { createPromptlabPanel } from '@/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel';
import { generateLanguageOptions } from '@/modules/app_center/views/master_analysis/promptlab/components/reportRenderer';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
import { appStore } from '@/stores/useAppStore';
import eventBus from '@/common/EventBus';
import { MODULE_EVENTS, APP_EVENTS } from '@/common/constants/eventConstants';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import { getReportFingerprint } from '@/modules/app_center/views/master_analysis/services/reportIdentity';
import type { UserProductProfile } from '@/types/state';
import type { GeneratedPromptRecord, HistoryItem } from '@/types/modules-business';

// Mock 依赖
vi.mock('@/common/ui', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/modules/app_center/views/master_analysis/services/promptlabService', () => ({
  promptlabService: {
    generateMasterPrompt: vi.fn(() => 'Generated Listing Prompt'),
    generateVisualPrompt: vi.fn(() => 'Generated Visual Prompt'),
  },
}));

const createUsableAnalysisReport = () => ({
  'buyer-profile': {
    demographics: ['Busy parents'],
    usage_scenes: ['Bedroom'],
  },
  _metadata: {
    confidence: {
      'buyer-profile': 0.86,
    },
    overallConfidence: 0.86,
  },
});

const createPromptRecord = (
  id: string,
  type: GeneratedPromptRecord['type'],
  prompt: string,
  historyId: HistoryItem['id']
): GeneratedPromptRecord => ({
  id,
  type,
  prompt,
  generatedAt: '2026-01-01T00:10:00.000Z',
  historyId,
  asins: ['B000000001'],
  marketplace: 'US',
  profile: {
    targetMarket: 'English',
    keywordsTier1: 'keyword',
    keywordsTier2: 'longtail',
  },
});

let container: HTMLElement;
let mockTemplate: string;

beforeEach(() => {
  // 创建测试容器
  container = document.createElement('div');
  container.id = 'promptlab-container';
  document.body.appendChild(container);

  // Mock 模板内容
  mockTemplate = `
      <div id="promptlab-panel" x-data="promptlabPanel">
        <select id="lab-target-market"></select>
        <div id="report-sections-container"></div>
        <div id="lab-analysis-status"></div>
        <textarea id="final-prompt-output"></textarea>
        <div id="console-card-inner"></div>
        <div id="embed-toggle-container"></div>
        <div id="mode-toggle-glider"></div>
        <button id="btn-mode-listing"></button>
        <button id="btn-mode-visual"></button>
        <span id="output-preview-title">Listing Prompt</span>
      </div>
    `;

  // 重置 state（使用 appStore 而不是直接设置）
  appStore.getState().updateAnalysis({ analysisReport: null });
  appStore
    .getState()
    .updateScraper({ scrapedData: null, currentHistoryId: null, selectedSite: '' });
  appStore.getState().updatePromptLab({ currentPrompt: '', history: [] });
  HistoryService.clear();

  // 重置 store
  appStore.getState().setUserProductProfile({
    targetMarket: '',
    keywordsTier1: '',
    keywordsTier2: '',
    audience: '',
    usps: '',
    specs: '',
    socialHook: '',
    negative: '',
    tone: 'professional',
    customStrategy: '',
    useCosmo: false,
    useRufus: false,
    useEmoji: false,
    selectedReportSections: [],
    charLimit: 5000,
  });

  // Mock SafeRenderer
  vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation((el, html) => {
    el.innerHTML = html;
  });

  // Mock AlpineRegistry
  vi.spyOn(AlpineRegistry.getInstance(), 'register').mockImplementation(() => {});
  vi.spyOn(AlpineRegistry.getInstance(), 'unregister').mockImplementation(() => {});
});

afterEach(() => {
  // 清理 DOM
  document.body.removeChild(container);
  vi.clearAllMocks();
});

// ========================================
// 模块生命周期测试
// ========================================

describe('Module Lifecycle', () => {
  it('should mount module successfully', async () => {
    await mount(container);

    expect(SafeRenderer.getInstance().renderTemplate).toHaveBeenCalledWith(
      container,
      expect.stringContaining('x-data="promptlabPanel"')
    );
    expect(container.querySelector('#card-analysis')?.textContent).toContain(
      '未检测到 AI 分析报告'
    );
    expect(container.querySelector('#card-product-dna')?.textContent).not.toContain(
      '未检测到 AI 分析报告'
    );
    expect(AlpineRegistry.getInstance().register).toHaveBeenCalledWith(
      'promptlabPanel',
      createPromptlabPanel
    );
  });

  it('should handle mount errors gracefully', async () => {
    const mockError = new Error('Render failed');

    vi.spyOn(SafeRenderer.getInstance(), 'renderTemplate').mockImplementation(() => {
      throw mockError;
    });

    await expect(mount(container)).rejects.toThrow('Render failed');
    expect(container.textContent).toContain('模块加载失败 (promptlab)');
    expect(container.textContent).toContain('Render failed');
  });

  it('should unmount module successfully', () => {
    unmount();

    expect(AlpineRegistry.getInstance().unregister).toHaveBeenCalledWith('promptlabPanel');
  });

  it('should handle unmount errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Unregister failed');

    await mount(container);
    vi.spyOn(AlpineRegistry.getInstance(), 'unregister').mockImplementation(() => {
      throw mockError;
    });

    expect(() => unmount()).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ========================================
// Alpine 组件初始化测试
// ========================================

describe('Alpine Component Initialization', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should initialize with default state', () => {
    expect(component.currentConsoleMode).toBe('listing');
    expect(component.listingPromptCache).toBe('');
    expect(component.visualPromptCache).toBe('');
    expect(component.lastMarketplace).toBe('');
    expect(component.profile.targetMarket).toBe('');
    expect(component.profile.tone).toBe('professional');
    expect(component.profile.charLimit).toBe(5000);
  });

  it('should restore state from store on init', () => {
    const report = createUsableAnalysisReport();
    const savedProfile: UserProductProfile = {
      targetMarket: 'English',
      keywordsTier1: 'test keyword',
      keywordsTier2: 'test longtail',
      audience: 'test audience',
      usps: 'test usps',
      specs: 'test specs',
      socialHook: '',
      negative: '',
      tone: 'exciting',
      customStrategy: '',
      useCosmo: true,
      useRufus: false,
      useEmoji: true,
      selectedReportSections: ['section1', 'section2'],
      reportFingerprint: getReportFingerprint(report) ?? undefined,
      charLimit: 3000,
    };

    appStore.getState().updateAnalysis({ analysisReport: report as any });
    appStore.getState().setUserProductProfile(savedProfile);

    component.restoreState();

    expect(component.profile.targetMarket).toBe('English');
    expect(component.profile.keywordsTier1).toBe('test keyword');
    expect(component.profile.tone).toBe('exciting');
    expect(component.profile.useCosmo).toBe(true);
    expect(component.profile.charLimit).toBe(3000);
  });
});

describe('Alpine Component Snapshot DNA Restoration', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should restore product DNA from the loaded snapshot before global profile', () => {
    const report = createUsableAnalysisReport();
    const [snapshot] = HistoryService.save({
      metadata: {
        scrape_timestamp: '2026-01-01T00:00:00.000Z',
        marketplace: 'US',
        domain: 'amazon.com',
        language: 'English',
        total_asins: 1,
      },
      products: [
        {
          asin: 'B000000001',
          url: '',
          language: 'English',
          productTitle: 'Snapshot Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    });
    const snapshotProfile: UserProductProfile = {
      targetMarket: 'English',
      keywordsTier1: 'snapshot keyword',
      keywordsTier2: 'snapshot longtail',
      audience: 'snapshot audience',
      usps: 'snapshot usps',
      specs: 'snapshot specs',
      socialHook: '',
      negative: '',
      tone: 'professional',
      customStrategy: '',
      useCosmo: true,
      useRufus: true,
      useEmoji: true,
      selectedReportSections: [],
      reportFingerprint: getReportFingerprint(report) ?? undefined,
      charLimit: 5000,
    };

    appStore.getState().updateAnalysis({ analysisReport: report as any });
    appStore.getState().setUserProductProfile({
      ...snapshotProfile,
      keywordsTier1: 'global keyword',
    });
    HistoryService.updateUserProductProfile(snapshot!.id, snapshotProfile);

    component.restoreState();

    expect(component.profile.keywordsTier1).toBe('snapshot keyword');
    expect(component.profile.audience).toBe('snapshot audience');
  });
});

describe('Alpine Component Report DNA Restoration', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should clear report-bound DNA when the saved profile belongs to another report', () => {
    const oldReport = createUsableAnalysisReport();
    const nextReport = {
      ...createUsableAnalysisReport(),
      'selling-points': {
        overall_strategy: {
          primary_differentiation: 'New report USP',
        },
      },
    };
    const savedProfile: UserProductProfile = {
      targetMarket: 'English',
      keywordsTier1: 'old keyword',
      keywordsTier2: 'old longtail',
      audience: 'old audience',
      usps: 'old usps',
      specs: 'old specs',
      socialHook: 'old hook',
      negative: 'old negative',
      tone: 'exciting',
      customStrategy: 'keep strategy',
      useCosmo: true,
      useRufus: false,
      useEmoji: true,
      selectedReportSections: ['buyer-profile'],
      reportFingerprint: getReportFingerprint(oldReport) ?? undefined,
      charLimit: 3000,
    };

    appStore.getState().updateAnalysis({ analysisReport: nextReport as any });
    appStore.getState().setUserProductProfile(savedProfile);

    component.restoreState();

    expect(component.profile.keywordsTier1).toBe('');
    expect(component.profile.keywordsTier2).toBe('');
    expect(component.profile.audience).toBe('');
    expect(component.profile.usps).toBe('');
    expect(component.profile.specs).toBe('');
    expect(component.profile.negative).toBe('');
    expect(component.profile.selectedReportSections).toEqual([]);
    expect(component.profile.reportFingerprint).toBe(getReportFingerprint(nextReport));
    expect(component.profile.tone).toBe('exciting');
    expect(component.profile.customStrategy).toBe('keep strategy');
  });

  it('should restore manually entered product DNA fields without a usable analysis report', () => {
    const savedProfile: UserProductProfile = {
      targetMarket: 'English',
      keywordsTier1: 'persisted keyword',
      keywordsTier2: 'persisted longtail',
      audience: 'persisted audience',
      usps: 'persisted usps',
      specs: 'persisted specs',
      socialHook: 'persisted hook',
      negative: 'persisted negative',
      tone: 'exciting',
      customStrategy: 'keep strategy',
      useCosmo: true,
      useRufus: false,
      useEmoji: true,
      selectedReportSections: ['buyer-profile'],
      charLimit: 3000,
    };

    appStore.getState().updateAnalysis({ analysisReport: null });
    appStore.getState().setUserProductProfile(savedProfile);

    component.restoreState();

    expect(component.profile.targetMarket).toBe('English');
    expect(component.profile.keywordsTier1).toBe('persisted keyword');
    expect(component.profile.keywordsTier2).toBe('persisted longtail');
    expect(component.profile.audience).toBe('persisted audience');
    expect(component.profile.usps).toBe('persisted usps');
    expect(component.profile.specs).toBe('persisted specs');
    expect(component.profile.socialHook).toBe('persisted hook');
    expect(component.profile.negative).toBe('persisted negative');
    expect(component.profile.selectedReportSections).toEqual(['buyer-profile']);
    expect(component.profile.tone).toBe('exciting');
    expect(component.profile.customStrategy).toBe('keep strategy');
    expect(component.profile.useCosmo).toBe(true);
    expect(component.profile.charLimit).toBe(3000);
  });
});

describe('Alpine Component Prompt Cache Restoration', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should not restore generated prompt caches from store history', () => {
    appStore.getState().updatePromptLab({
      history: [
        {
          id: 'visual-1',
          prompt: 'Saved Visual Prompt',
          response: '',
          timestamp: 1770000000001,
          promptType: 'visual',
        },
        {
          id: 'listing-1',
          prompt: 'Saved Listing Prompt',
          response: '',
          timestamp: 1770000000000,
          promptType: 'listing',
        },
      ],
    });

    component.restoreState();

    expect(component.listingPromptCache).toBe('');
    expect(component.visualPromptCache).toBe('');
    expect(appStore.getState().promptlab.history).toHaveLength(2);
  });

  it('should restore generated prompt caches from the loaded snapshot', () => {
    const [snapshot] = HistoryService.save({
      metadata: {
        scrape_timestamp: '2026-01-01T00:00:00.000Z',
        marketplace: 'US',
        domain: 'amazon.com',
        language: 'English',
        total_asins: 1,
      },
      products: [
        {
          asin: 'B000000001',
          url: '',
          language: 'English',
          productTitle: 'Snapshot Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    });
    const snapshotId = snapshot!.id;

    HistoryService.updatePromptResult(
      snapshotId,
      createPromptRecord('listing-1', 'listing', 'Snapshot Listing Prompt', snapshotId)
    );
    HistoryService.updatePromptResult(
      snapshotId,
      createPromptRecord('visual-1', 'visual', 'Snapshot Visual Prompt', snapshotId)
    );

    appStore.getState().updateAnalysis({ analysisReport: createUsableAnalysisReport() as any });
    component.restoreState();

    expect(appStore.getState().scraper.currentHistoryId).toBe(snapshotId);
    expect(component.listingPromptCache).toBe('Snapshot Listing Prompt');
    expect(component.visualPromptCache).toBe('Snapshot Visual Prompt');
  });
});

describe('Alpine Component Prompt Cache Clearing', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should not restore snapshot prompt caches without a current report', () => {
    const [snapshot] = HistoryService.save({
      metadata: {
        scrape_timestamp: '2026-01-01T00:00:00.000Z',
        marketplace: 'US',
        domain: 'amazon.com',
        language: 'English',
        total_asins: 1,
      },
      products: [
        {
          asin: 'B000000001',
          url: '',
          language: 'English',
          productTitle: 'Snapshot Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    });
    const snapshotId = snapshot!.id;

    HistoryService.updatePromptResult(
      snapshotId,
      createPromptRecord('listing-1', 'listing', 'Snapshot Listing Prompt', snapshotId)
    );

    appStore.getState().updateAnalysis({ analysisReport: null });
    component.restoreState();

    expect(component.listingPromptCache).toBe('');
    expect(component.visualPromptCache).toBe('');
  });

  it('should clear generated prompt caches when the loaded snapshot has no prompt results', () => {
    HistoryService.save({
      metadata: {
        scrape_timestamp: '2026-01-01T00:00:00.000Z',
        marketplace: 'US',
        domain: 'amazon.com',
        language: 'English',
        total_asins: 1,
      },
      products: [
        {
          asin: 'B000000001',
          url: '',
          language: 'English',
          productTitle: 'Snapshot Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    });
    component.listingPromptCache = 'Stale Listing Prompt';
    component.visualPromptCache = 'Stale Visual Prompt';

    component.restoreState();

    expect(component.listingPromptCache).toBe('');
    expect(component.visualPromptCache).toBe('');
  });

  it('should clear generated prompt caches when no snapshot is selected', () => {
    component.listingPromptCache = 'Stale Listing Prompt';
    component.visualPromptCache = 'Stale Visual Prompt';
    appStore.getState().setCurrentHistoryId(null);

    component.restorePromptCachesFromCurrentSnapshot();

    expect(component.listingPromptCache).toBe('');
    expect(component.visualPromptCache).toBe('');
  });
});

describe('Alpine Component State Persistence', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();

    // 添加必要的 DOM 元素
    container.innerHTML = mockTemplate;
  });

  it('should save state to store', () => {
    component.profile.targetMarket = 'German';
    component.profile.keywordsTier1 = 'new keyword';

    component.saveState();

    const savedProfile = appStore.getState().promptlab.userProductProfile;
    expect(savedProfile?.targetMarket).toBe('German');
    expect(savedProfile?.keywordsTier1).toBe('new keyword');
  });

  it('should persist saved state to the current snapshot', () => {
    const [snapshot] = HistoryService.save({
      metadata: {
        scrape_timestamp: '2026-01-01T00:00:00.000Z',
        marketplace: 'US',
        domain: 'amazon.com',
        language: 'English',
        total_asins: 1,
      },
      products: [
        {
          asin: 'B000000001',
          url: '',
          language: 'English',
          productTitle: 'Snapshot Product',
          feature_bullets: [],
          customer_reviews: [],
          scrape_status: 'success',
          error: '',
        },
      ],
    });
    const persistSpy = vi
      .spyOn(HistoryService, 'updateUserProductProfileAsync')
      .mockResolvedValue(true);

    component.profile.targetMarket = 'German';
    component.profile.keywordsTier1 = 'saved to snapshot';

    component.saveState();

    expect(persistSpy).toHaveBeenCalledWith(
      snapshot!.id,
      expect.objectContaining({
        targetMarket: 'German',
        keywordsTier1: 'saved to snapshot',
      })
    );

    persistSpy.mockRestore();
  });
});

// ========================================
// Computed Properties 测试
// ========================================

describe('Computed Properties', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should compute hasReport correctly', () => {
    expect(component.hasReport).toBe(false);

    appStore.getState().updateAnalysis({ analysisReport: {} as any });
    expect(component.hasReport).toBe(false);

    appStore.getState().updateAnalysis({ analysisReport: { marketplace: 'US' } as any });
    expect(component.hasReport).toBe(false);

    appStore
      .getState()
      .updateAnalysis({
        analysisReport: { metadata: { marketplace: 'US' }, analysisReport: {} } as any,
      });
    expect(component.hasReport).toBe(false);

    appStore
      .getState()
      .updateAnalysis({
        analysisReport: { marketplace: 'US', results: [{ title: 'Placeholder' }] } as any,
      });
    expect(component.hasReport).toBe(false);

    appStore
      .getState()
      .updateAnalysis({ analysisReport: { marketplace: 'US', analysisReport: 'raw text' } as any });
    expect(component.hasReport).toBe(false);

    appStore.getState().updateAnalysis({ analysisReport: createUsableAnalysisReport() as any });
    expect(component.hasReport).toBe(true);

    appStore.getState().updateAnalysis({
      analysisReport: {
        metadata: { marketplace: 'US' },
        analysisReport: createUsableAnalysisReport(),
      } as any,
    });
    expect(component.hasReport).toBe(true);

    appStore.getState().updateAnalysis({
      analysisReport: {
        marketplace: 'US',
        target_audience: 'Young professionals',
      } as any,
    });
    expect(component.hasReport).toBe(true);

    appStore.getState().updateAnalysis({
      analysisReport: {
        title_seo_roots: {
          primary_keywords: [{ keyword: 'waterproof bag' }],
        },
      } as any,
    });
    expect(component.hasReport).toBe(true);
  });
});

describe('Computed Prompt State', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should compute isReady correctly', () => {
    expect(component.isReady).toBe(false);

    appStore.getState().updateAnalysis({ analysisReport: createUsableAnalysisReport() as any });
    component.profile.targetMarket = 'English';
    component.profile.keywordsTier1 = 'keyword1';
    component.profile.keywordsTier2 = 'keyword2';

    expect(component.isReady).toBe(true);
  });

  it('should compute currentPrompt based on mode', () => {
    component.listingPromptCache = 'Listing Prompt Content';
    component.visualPromptCache = 'Visual Prompt Content';

    component.currentConsoleMode = 'listing';
    expect(component.currentPrompt).toBe('Listing Prompt Content');

    component.currentConsoleMode = 'visual';
    expect(component.currentPrompt).toBe('Visual Prompt Content');
  });

  it('should compute tokenCount correctly', () => {
    component.listingPromptCache = 'Test';
    component.currentConsoleMode = 'listing';

    expect(component.tokenCount).toBeGreaterThan(0);
  });

  it('should compute isOverLimit correctly', () => {
    component.profile.charLimit = 10;
    component.listingPromptCache = 'Short';
    component.currentConsoleMode = 'listing';

    expect(component.isOverLimit).toBe(false);

    component.profile.charLimit = 1;
    component.listingPromptCache = 'This is a very long text';
    expect(component.isOverLimit).toBe(true);
  });
});

// ========================================
// UI 渲染测试
// ========================================

describe('UI Rendering', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should render empty state when no report', () => {
    appStore.getState().updateAnalysis({ analysisReport: null });

    component.renderReportAnalysis();

    const statusDiv = document.getElementById('lab-analysis-status');
    const reportContainer = document.getElementById('report-sections-container');

    expect(statusDiv?.textContent).toContain('未检测到分析报告');
    expect(statusDiv?.getAttribute('role')).toBe('status');
    expect(statusDiv?.getAttribute('aria-live')).toBe('polite');
    expect(reportContainer?.textContent).toContain('还没有报告维度');
    expect(reportContainer?.textContent).toContain('推荐操作：');
    expect(reportContainer?.querySelector('[role="status"]')).not.toBeNull();
  });

  it('should render report ready state', () => {
    appStore.getState().updateAnalysis({
      analysisReport: createUsableAnalysisReport() as any,
    });

    component.renderReportAnalysis();

    const statusDiv = document.getElementById('lab-analysis-status');
    expect(statusDiv?.textContent).toContain('分析报告已就绪');
    expect(statusDiv?.getAttribute('role')).toBe('status');
    expect(statusDiv?.getAttribute('aria-atomic')).toBe('true');
  });

  it('should generate language options', () => {
    const select = document.getElementById('lab-target-market') as HTMLSelectElement;

    generateLanguageOptions();

    expect(select.options.length).toBeGreaterThan(0);
    expect(select.options[0].value).toBe('');
  });
});

// ========================================
// Prompt 生成测试
// ========================================

describe('Prompt Generation', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(async () => {
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;

    // 设置就绪状态
    appStore.getState().updateAnalysis({ analysisReport: createUsableAnalysisReport() as any });
    component.profile.targetMarket = 'English';
    component.profile.keywordsTier1 = 'test keyword';
    component.profile.keywordsTier2 = 'test longtail';
  });

  it('should generate listing prompt when ready', async () => {
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    component.generateListingPrompt();

    expect(promptlabService.generateMasterPrompt).toHaveBeenCalled();
    expect(component.listingPromptCache).toBe('Generated Listing Prompt');
    expect(appStore.getState().promptlab.currentPrompt).toBe('Generated Listing Prompt');
    expect(appStore.getState().promptlab.history?.[0]).toEqual(
      expect.objectContaining({
        prompt: 'Generated Listing Prompt',
        promptType: 'listing',
        response: '',
        historyId: null,
      })
    );
  });

  it('should generate listing prompt from manual DNA without an analysis report', async () => {
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    appStore.getState().updateAnalysis({ analysisReport: null });
    component.profile.targetMarket = 'English';
    component.profile.keywordsTier1 = 'manual keyword';
    component.profile.keywordsTier2 = 'manual longtail';

    expect(component.generateButtonDisabled).toBe(false);

    component.generateListingPrompt();

    expect(promptlabService.generateMasterPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        targetMarket: 'English',
        keywordsTier1: 'manual keyword',
        keywordsTier2: 'manual longtail',
        useAnalysisData: true,
      }),
      null
    );
    expect(component.listingPromptCache).toBe('Generated Listing Prompt');
  });

  it('should not generate listing prompt when not ready', async () => {
    const { showToast } = await import('@/common/ui');
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    component.profile.keywordsTier1 = '';
    component.generateListingPrompt();

    expect(promptlabService.generateMasterPrompt).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('不能为空'), {
      type: 'warning',
    });
  });
});

describe('Visual Prompt Generation', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(async () => {
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;

    // 设置就绪状态
    appStore.getState().updateAnalysis({ analysisReport: createUsableAnalysisReport() as any });
    component.profile.targetMarket = 'English';
    component.profile.keywordsTier1 = 'test keyword';
    component.profile.keywordsTier2 = 'test longtail';
  });

  it('should generate visual prompt when ready', async () => {
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    component.generateVisualPrompt();

    expect(promptlabService.generateVisualPrompt).toHaveBeenCalled();
    expect(component.visualPromptCache).toBe('Generated Visual Prompt');
    expect(appStore.getState().promptlab.currentPrompt).toBe('Generated Visual Prompt');
    expect(appStore.getState().promptlab.history?.[0]).toEqual(
      expect.objectContaining({
        prompt: 'Generated Visual Prompt',
        promptType: 'visual',
        response: '',
        historyId: null,
      })
    );
  });

  it('should not generate visual prompt without report', async () => {
    const { showToast } = await import('@/common/ui');
    const { promptlabService } =
      await import('@/modules/app_center/views/master_analysis/services/promptlabService');

    appStore.getState().updateAnalysis({ analysisReport: null });
    component.generateVisualPrompt();

    expect(promptlabService.generateVisualPrompt).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('分析报告'), {
      type: 'warning',
    });
  });
});

// ========================================
// 控制台模式切换测试
// ========================================

describe('Console Mode Toggle', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should toggle to visual mode', () => {
    const cardInner = document.getElementById('console-card-inner') as HTMLElement;
    const glider = document.getElementById('mode-toggle-glider') as HTMLElement;

    component.toggleConsoleMode('visual');

    expect(component.currentConsoleMode).toBe('visual');
    expect(cardInner.style.transform).toBe('rotateY(180deg)');
    expect(glider.style.transform).toBe('translateX(100%)');
  });

  it('should toggle back to listing mode', () => {
    const cardInner = document.getElementById('console-card-inner') as HTMLElement;
    const glider = document.getElementById('mode-toggle-glider') as HTMLElement;

    component.toggleConsoleMode('visual');
    component.toggleConsoleMode('listing');

    expect(component.currentConsoleMode).toBe('listing');
    expect(cardInner.style.transform).toBe('rotateY(0deg)');
    expect(glider.style.transform).toBe('translateX(0)');
  });

  it('should not toggle if already in target mode', () => {
    component.currentConsoleMode = 'listing';
    const initialMode = component.currentConsoleMode;

    component.toggleConsoleMode('listing');

    expect(component.currentConsoleMode).toBe(initialMode);
  });
});

// ========================================
// 事件处理测试
// ========================================

describe('Event Handlers', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should handle report section change', () => {
    const checkbox1 = document.createElement('input');
    checkbox1.type = 'checkbox';
    checkbox1.name = 'report-section';
    checkbox1.value = 'section1';
    checkbox1.checked = true;

    const checkbox2 = document.createElement('input');
    checkbox2.type = 'checkbox';
    checkbox2.name = 'report-section';
    checkbox2.value = 'section2';
    checkbox2.checked = true;

    container.appendChild(checkbox1);
    container.appendChild(checkbox2);

    component.onReportSectionChange();

    expect(component.profile.selectedReportSections).toEqual(['section1', 'section2']);
  });

  it('should save state on input change', () => {
    const saveSpy = vi.spyOn(component, 'saveState');

    component.onInputChange();

    expect(saveSpy).toHaveBeenCalled();
  });

  it('should listen to scraper success event', () => {
    const renderSpy = vi.spyOn(component, 'renderReportAnalysis');

    component.init();
    eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS);

    expect(renderSpy).toHaveBeenCalled();
  });

  it('should listen to history updated event', () => {
    const renderSpy = vi.spyOn(component, 'renderReportAnalysis');

    component.init();
    window.dispatchEvent(new Event(APP_EVENTS.HISTORY_UPDATED));

    expect(renderSpy).toHaveBeenCalled();
  });
});

// ========================================
// 操作功能测试
// ========================================

describe('Action Functions', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should copy prompt to clipboard', async () => {
    const textarea = document.getElementById('final-prompt-output') as HTMLTextAreaElement;
    textarea.value = 'Test prompt content';

    // Mock execCommand
    document.execCommand = vi.fn().mockReturnValue(true);
    const execCommandSpy = vi.spyOn(document, 'execCommand');
    const { showToast } = await import('@/common/ui');

    component.copyPrompt();

    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    expect(showToast).toHaveBeenCalledWith('Prompt 已复制', { type: 'success' });

    execCommandSpy.mockRestore();
  });

  it('should not copy empty prompt', () => {
    const textarea = document.getElementById('final-prompt-output') as HTMLTextAreaElement;
    textarea.value = 'short';

    // Mock execCommand
    document.execCommand = vi.fn();
    const execCommandSpy = vi.spyOn(document, 'execCommand');

    component.copyPrompt();

    expect(execCommandSpy).not.toHaveBeenCalled();

    execCommandSpy.mockRestore();
  });

  it('should clear inputs with confirmation', async () => {
    component.profile.targetMarket = 'English';
    component.profile.keywordsTier1 = 'test';

    const clearPromise = component.clearInputs();
    document.querySelector<HTMLButtonElement>('[id^="btn-confirm-confirm-modal-"]')?.click();
    await clearPromise;

    expect(component.profile.targetMarket).toBe('');
    expect(component.profile.keywordsTier1).toBe('');
  });

  it('should not clear inputs without confirmation', async () => {
    component.profile.targetMarket = 'English';

    const clearPromise = component.clearInputs();
    document.querySelector<HTMLButtonElement>('[id^="btn-cancel-confirm-modal-"]')?.click();
    await clearPromise;

    expect(component.profile.targetMarket).toBe('English');
  });

  it('should select all report sections', () => {
    appStore.getState().updateAnalysis({
      analysisReport: {
        'title-keywords': { primary_keywords: ['alpha'] },
        'selling-points': { bullet_analysis: ['beta'] },
        _metadata: { marketplace: 'US' },
      } as any,
    });

    component.selectAllReportSections();

    expect(component.profile.selectedReportSections).toEqual(['title-keywords', 'selling-points']);
  });

  it('should clear report sections', () => {
    component.profile.selectedReportSections = ['title-keywords'];

    component.clearReportSections();

    expect(component.profile.selectedReportSections).toEqual([]);
  });
});

// ========================================
// 智能市场选择测试
// ========================================

describe('Auto Market Selection', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should auto-select market on first load', () => {
    const select = document.getElementById('lab-target-market') as HTMLSelectElement;
    const option = document.createElement('option');
    option.value = 'English (US)';
    option.textContent = 'English (US) (amazon.com)';
    select.appendChild(option);

    appStore.getState().updateAnalysis({
      analysisReport: { marketplace: 'US' } as any,
    });

    component.autoSelectMarket(select);

    expect(component.profile.targetMarket).toBe('English (US)');
    expect(component.lastMarketplace).toBe('US');
  });

  it('should auto-select market when marketplace changes', () => {
    const select = document.getElementById('lab-target-market') as HTMLSelectElement;
    const option = document.createElement('option');
    option.value = 'German';
    option.textContent = 'German (amazon.de)';
    select.appendChild(option);

    component.lastMarketplace = 'US';
    component.profile.targetMarket = 'English';

    appStore.getState().updateAnalysis({ analysisReport: { marketplace: 'DE' } as any });

    component.autoSelectMarket(select);

    expect(component.profile.targetMarket).toBe('German');
    expect(component.lastMarketplace).toBe('DE');
  });

  it('should not auto-select if marketplace unchanged', () => {
    const select = document.getElementById('lab-target-market') as HTMLSelectElement;

    component.lastMarketplace = 'US';
    component.profile.targetMarket = 'English';

    appStore.getState().updateAnalysis({ analysisReport: { marketplace: 'US' } as any });

    const initialMarket = component.profile.targetMarket;
    component.autoSelectMarket(select);

    expect(component.profile.targetMarket).toBe(initialMarket);
  });
});

// ========================================
// 报告格式兼容性测试
// ========================================

describe('Report Format Compatibility', () => {
  let component: ReturnType<typeof createPromptlabPanel>;

  beforeEach(() => {
    component = createPromptlabPanel();
    container.innerHTML = mockTemplate;
  });

  it('should handle new format report (AI智能分析)', () => {
    appStore.getState().updateAnalysis({
      analysisReport: {
        _metadata: { marketplace: 'US' },
        'title-keywords': {
          primary_keywords: ['waterproof bag'],
          optimization_suggestions: ['Lead with durability'],
        },
      } as any,
    });

    component.renderReportAnalysis();

    const container = document.getElementById('report-sections-container');
    expect(container?.innerHTML).toContain('标题核心词根');
    expect(container?.innerHTML).toContain('核心关键词');
    expect(container?.querySelector('i.fa-solid.fa-font')).toBeTruthy();
    expect(container?.textContent ?? '').not.toMatch(
      /(?:\u{1F511}|\u{1F48E}|\u26A0\uFE0F?|\u2728|\u{1F914}|\u{1F464}|\u{1F4DD}|\u{1F3AF})/u
    );
  });

  it('should handle legacy format report (旧版AI分析)', () => {
    appStore.getState().updateAnalysis({
      analysisReport: {
        marketplace: 'US',
        target_audience: 'Test Audience',
        key_features: ['Feature 1', 'Feature 2'],
      } as any,
    });

    component.renderReportAnalysis();

    const reportContainer = document.getElementById('report-sections-container');
    expect(reportContainer).toBeTruthy();
  });

  it('should auto-fill audience from legacy report', () => {
    appStore.getState().updateAnalysis({
      analysisReport: {
        marketplace: 'US',
        target_audience: 'Young professionals',
      } as any,
    });

    component.profile.audience = '';
    component.renderReportAnalysis();

    expect(component.profile.audience).toBe('Young professionals');
  });
});
