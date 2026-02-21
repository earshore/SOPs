// tests/unit/promptlab.test.ts
// ================================================================
// Promptlab 模块单元测试
// 测试模块生命周期、Alpine 组件、状态管理和 Prompt 生成功能
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount } from '@/modules/app_center/views/master_analysis/promptlab/index';
import { createPromptlabPanel } from '@/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel';
import { SafeModuleLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
import { appStore } from '@/stores/useAppStore';
import state from '@/common/state';
import eventBus from '@/common/EventBus';
import { MODULE_EVENTS, APP_EVENTS } from '@/common/constants/eventConstants';
import type { UserProductProfile } from '@/types/state';

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

describe('Promptlab Module', () => {
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

    // Mock SafeModuleLoader
    vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockResolvedValue(mockTemplate);

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

      expect(SafeModuleLoader.getInstance().loadTemplate).toHaveBeenCalledWith(
        'src/modules/app_center/views/master_analysis/promptlab/template.html',
        expect.any(Object)
      );
      expect(SafeRenderer.getInstance().renderTemplate).toHaveBeenCalledWith(
        container,
        mockTemplate
      );
      expect(AlpineRegistry.getInstance().register).toHaveBeenCalledWith(
        'promptlabPanel',
        createPromptlabPanel
      );
    });

    it('should handle mount errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Template load failed');
      
      vi.spyOn(SafeModuleLoader.getInstance(), 'loadTemplate').mockRejectedValue(mockError);

      await expect(mount(container)).rejects.toThrow('Template load failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Promptlab]'),
        mockError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should unmount module successfully', () => {
      unmount();

      expect(AlpineRegistry.getInstance().unregister).toHaveBeenCalledWith('promptlabPanel');
    });

    it('should handle unmount errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Unregister failed');
      
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
        charLimit: 3000,
      };

      appStore.getState().setUserProductProfile(savedProfile);
      
      component.restoreState();

      expect(component.profile.targetMarket).toBe('English');
      expect(component.profile.keywordsTier1).toBe('test keyword');
      expect(component.profile.tone).toBe('exciting');
      expect(component.profile.useCosmo).toBe(true);
      expect(component.profile.charLimit).toBe(3000);
    });

    it('should save state to store', () => {
      component.profile.targetMarket = 'German';
      component.profile.keywordsTier1 = 'new keyword';
      
      component.saveState();

      const savedProfile = appStore.getState().promptlab.userProductProfile;
      expect(savedProfile?.targetMarket).toBe('German');
      expect(savedProfile?.keywordsTier1).toBe('new keyword');
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

      state.analysis.analysisReport = { marketplace: 'US', results: [] } as any;
      expect(component.hasReport).toBe(true);
    });

    it('should compute isReady correctly', () => {
      expect(component.isReady).toBe(false);

      state.analysis.analysisReport = { marketplace: 'US' } as any;
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

    it('should compute charCount correctly', () => {
      component.listingPromptCache = 'Test';
      component.currentConsoleMode = 'listing';
      
      expect(component.charCount).toBe(4);
    });

    it('should compute isOverLimit correctly', () => {
      component.profile.charLimit = 10;
      component.listingPromptCache = 'Short';
      component.currentConsoleMode = 'listing';
      
      expect(component.isOverLimit).toBe(false);

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
      state.analysis.analysisReport = null;
      
      component.renderReportAnalysis();

      const statusDiv = document.getElementById('lab-analysis-status');
      const reportContainer = document.getElementById('report-sections-container');

      expect(statusDiv?.textContent).toContain('未检测到分析报告');
      expect(reportContainer?.textContent).toContain('暂无可用数据');
    });

    it('should render report ready state', () => {
      state.analysis.analysisReport = {
        marketplace: 'US',
        results: [
          {
            targetId: 'test-section',
            title: 'Test Section',
            highlights: [{ text: 'Test highlight' }],
            details: [{ category: 'Test', items: ['Item 1'] }],
          },
        ],
      } as any;

      component.renderReportAnalysis();

      const statusDiv = document.getElementById('lab-analysis-status');
      expect(statusDiv?.textContent).toContain('分析报告已就绪');
    });

    it('should generate language options', () => {
      const select = document.getElementById('lab-target-market') as HTMLSelectElement;
      
      component.generateLanguageOptions();

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
      const { promptlabService } = await import('@/modules/app_center/views/master_analysis/services/promptlabService');
      
      component = createPromptlabPanel();
      container.innerHTML = mockTemplate;

      // 设置就绪状态
      state.analysis.analysisReport = { marketplace: 'US' } as any;
      component.profile.targetMarket = 'English';
      component.profile.keywordsTier1 = 'test keyword';
      component.profile.keywordsTier2 = 'test longtail';
    });

    it('should generate listing prompt when ready', async () => {
      const { promptlabService } = await import('@/modules/app_center/views/master_analysis/services/promptlabService');
      
      component.generateListingPrompt();

      expect(promptlabService.generateMasterPrompt).toHaveBeenCalled();
      expect(component.listingPromptCache).toBe('Generated Listing Prompt');
    });

    it('should not generate listing prompt when not ready', async () => {
      const { showToast } = await import('@/common/ui');
      const { promptlabService } = await import('@/modules/app_center/views/master_analysis/services/promptlabService');
      
      component.profile.keywordsTier1 = '';
      component.generateListingPrompt();

      expect(promptlabService.generateMasterPrompt).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('不能为空'),
        'warning'
      );
    });

    it('should generate visual prompt when ready', async () => {
      const { promptlabService } = await import('@/modules/app_center/views/master_analysis/services/promptlabService');
      
      component.generateVisualPrompt();

      expect(promptlabService.generateVisualPrompt).toHaveBeenCalled();
      expect(component.visualPromptCache).toBe('Generated Visual Prompt');
    });

    it('should not generate visual prompt without report', async () => {
      const { showToast } = await import('@/common/ui');
      const { promptlabService } = await import('@/modules/app_center/views/master_analysis/services/promptlabService');
      
      appStore.getState().updateAnalysis({ analysisReport: null });
      component.generateVisualPrompt();

      expect(promptlabService.generateVisualPrompt).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('分析报告'),
        'warning'
      );
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
      expect(showToast).toHaveBeenCalledWith('Prompt 已复制', 'success');

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

    it('should clear inputs with confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      component.profile.targetMarket = 'English';
      component.profile.keywordsTier1 = 'test';
      
      component.clearInputs();

      expect(component.profile.targetMarket).toBe('');
      expect(component.profile.keywordsTier1).toBe('');

      confirmSpy.mockRestore();
    });

    it('should not clear inputs without confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      component.profile.targetMarket = 'English';
      
      component.clearInputs();

      expect(component.profile.targetMarket).toBe('English');

      confirmSpy.mockRestore();
    });

    it('should select all report sections', () => {
      const checkbox1 = document.createElement('input');
      checkbox1.type = 'checkbox';
      checkbox1.name = 'report-section';
      checkbox1.value = 'section1';

      const checkbox2 = document.createElement('input');
      checkbox2.type = 'checkbox';
      checkbox2.name = 'report-section';
      checkbox2.value = 'section2';

      container.appendChild(checkbox1);
      container.appendChild(checkbox2);

      component.selectAllReportSections();

      expect(checkbox1.checked).toBe(true);
      expect(checkbox2.checked).toBe(true);
    });

    it('should clear report sections', () => {
      const checkbox1 = document.createElement('input');
      checkbox1.type = 'checkbox';
      checkbox1.name = 'report-section';
      checkbox1.value = 'section1';
      checkbox1.checked = true;

      container.appendChild(checkbox1);

      component.clearReportSections();

      expect(checkbox1.checked).toBe(false);
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
      option.value = 'English (US)';  // 修正：应该是 "English (US)" 而不是 "English"
      option.textContent = 'English (US) (amazon.com)';
      select.appendChild(option);

      // Mock state.masterPrompt 为 true（通过 Object.defineProperty）
      Object.defineProperty(state, 'masterPrompt', {
        get: () => true,
        configurable: true
      });

      appStore.getState().updateAnalysis({ 
        analysisReport: { marketplace: 'US' } as any 
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
      
      state.analysis.analysisReport = { marketplace: 'DE' } as any;
      
      component.autoSelectMarket(select);

      expect(component.profile.targetMarket).toBe('German');
      expect(component.lastMarketplace).toBe('DE');
    });

    it('should not auto-select if marketplace unchanged', () => {
      const select = document.getElementById('lab-target-market') as HTMLSelectElement;
      
      component.lastMarketplace = 'US';
      component.profile.targetMarket = 'English';
      
      state.analysis.analysisReport = { marketplace: 'US' } as any;
      
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
      state.analysis.analysisReport = {
        marketplace: 'US',
        results: [
          {
            targetId: 'test-id',
            title: 'Test Title',
            highlights: [{ text: 'Highlight 1' }],
            details: [{ category: 'Category 1', items: ['Item 1', 'Item 2'] }],
          },
        ],
      } as any;

      component.renderReportAnalysis();

      const container = document.getElementById('report-sections-container');
      expect(container?.innerHTML).toContain('Test Title');
    });

    it('should handle legacy format report (旧版AI分析)', () => {
      state.analysis.analysisReport = {
        marketplace: 'US',
        target_audience: 'Test Audience',
        key_features: ['Feature 1', 'Feature 2'],
      } as any;

      component.renderReportAnalysis();

      const reportContainer = document.getElementById('report-sections-container');
      expect(reportContainer).toBeTruthy();
    });

    it('should auto-fill audience from legacy report', () => {
      state.analysis.analysisReport = {
        marketplace: 'US',
        target_audience: 'Young professionals',
      } as any;

      component.profile.audience = '';
      component.renderReportAnalysis();

      expect(component.profile.audience).toBe('Young professionals');
    });
  });
});
