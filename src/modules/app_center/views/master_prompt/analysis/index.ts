/**
 * Analysis 子模块
 * 负责 AI 分析功能
 * 
 * 架构说明：
 * - 继承 BaseModule 实现生命周期管理
 * - 状态保存到 state.analysis 命名空间
 * - 通过 EventBus 与其他模块通信
 */

import { escapeHtml } from '@/common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import BaseModule from "../../../../../common/BaseModule";
import state from "../../../../../common/state";
import { PROVIDERS, LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { ANALYSIS_MODULES, DYNAMIC_MASTER_TEMPLATE } from '../constants/prompts';
import { showToast } from '../../../../../common/ui';
import { HistoryService } from '../services/historyService';
import { renderHistory } from '../scraper/index';
import { AnalysisService } from '../services/analysisService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';
import { ErrorService } from '../../../../../services/errorService';
import { renderWidgetCard, renderViewModeHTML, renderEditorForm, renderSkeleton } from './renderer';
import eventBus from '../../../../../common/EventBus';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import { loadGridStack } from '../../../../../common/utils/lazyLibs';
import type { 
  AnalysisReport, 
  AnalysisModuleConfig, 
  GridStackInstance, 
  GridStackNode,
  GridStackWidget,
  ScrapedProduct 
} from '@/types/modules-business';

import '../master_prompt_style.css';

// ========================================== 
// Types
// ========================================== 

interface StyleConfig {
  color: string;
  bg: string;
  lightBg: string;
  icon: string;
}

declare global {
  interface Window {
    startLocalEdit: (key: string) => void;
    saveLocalEdit: (key: string) => void;
    undoLocalEdit: (key: string) => void;
    pushEditSnapshot: (key: string) => void;
    deleteRowItem: (btn: HTMLElement, key: string) => void;
    addListItem: (key: string) => void;
    addObjItem: (key: string) => void;
    GridStack: unknown;
  }
}

// 分类样式映射表（消除重复的 if-else 链）
const CATEGORY_STYLES: Record<string, StyleConfig> = {
  listing: { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" },
  reviews: { color: "amber", bg: "bg-amber-500", lightBg: "bg-amber-50", icon: "fa-comments" },
  cross:   { color: "violet", bg: "bg-violet-600", lightBg: "bg-violet-50", icon: "fa-shuffle" },
};

const DEFAULT_STYLE: StyleConfig = {
  color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle",
};

function getStyleForCategory(category?: string): StyleConfig {
  return (category && CATEGORY_STYLES[category]) || DEFAULT_STYLE;
}

function getFieldTitle(key: string): string {
  const titleMap: Record<string, string> = {
    'target_market': '目标市场',
    'keywords_tier1': '一级关键词',
    'keywords_tier2': '二级关键词',
    'product_category': '产品类别',
    'product_features': '产品特点',
    'product_benefits': '产品优势',
    'target_audience': '目标受众',
    'pain_points': '痛点',
    'unique_selling_points': 'USP',
    'competitive_advantages': '竞争优势',
    'product_positioning': '产品定位',
    'brand_tone': '品牌调性',
    'emotional_triggers': '情感触发',
    'call_to_action': '行动号召',
    'seasonal_relevance': '季节相关性'
  };
  return titleMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ========================================== 
// Analysis Module Class
// ========================================== 

class AnalysisModule extends BaseModule {
  private grid: GridStackInstance | null = null;
  private originalDataMap: Map<string, unknown> = new Map();
  private editHistoryMap: Map<string, unknown[]> = new Map();

  constructor(container: HTMLElement) {
    super('master_prompt_analysis');
    this.container = container;
    this.registerGlobalActions();
  }

  async render(): Promise<void> {
    // render() 由 BaseModule 要求实现
    // HTML 已在 mount() 中通过 loadTemplate 加载
  }

  async init(): Promise<void> {
    console.log("🚀 Analysis Module Initialized (BaseModule)");

    this.setupUI();

    this.addDisposable(eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
      console.log("AnalysisModule received SCRAPE_SUCCESS");
      if (state.scraper.scrapedData?.products) {
        state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: ScrapedProduct) => p.asin);
      }
      this.updateAsinSelectList();
    }));

    if (state.scraper.scrapedData) {
      if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
        if (state.scraper.scrapedData.products) {
          state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: ScrapedProduct) => p.asin);
        }
      }
      this.updateAsinSelectList();
    }

    const analyzeBtn = document.getElementById("analyze-btn");
    if (analyzeBtn) {
      this.addEventListener(analyzeBtn, "click", () => this.analyzeSelectedAsins());
    }

    const transToggle = document.getElementById("opt-listing");
    if (transToggle) {
      this.addEventListener(document.getElementById("opt-listing")!, "change", () => {
        this.updateSourceVisuals();
        this.updateModuleListVisibility();
        this.updatePromptPreview();
      });
      this.addEventListener(document.getElementById("opt-reviews")!, "change", () => {
        this.updateSourceVisuals();
        this.updateModuleListVisibility();
        this.updatePromptPreview();
      });
    }

    if (state.analysis.analysisReport) {
      this.renderReport();
    }
  }

  onUnmount(): void {
    console.log("💤 Analysis Module Unmounting...");
    if (this.grid) {
      this.grid.destroy(false);
      this.grid = null;
    }
  }

  // ================== UI Setup ==================

  setupUI(): void {
    this.renderModuleSelector();
    this.renderPromptPreviewArea();
  }

  renderModuleSelector(): void {
    this.renderSourceToggle();
    this.renderModuleCheckboxes();
    this.updateModuleListVisibility();
    this.updateSourceVisuals();
    this.setTimeout(() => this.updatePromptPreview(), 100);
  }

  renderSourceToggle(): void {
    const container = document.getElementById("source-toggle-container");
    if (!container) return;

    container.innerHTML = `
      <label id="lbl-opt-listing" class="source-toggle-label flex-1 group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none text-sm font-semibold border-slate-200/60 bg-white hover:border-blue-300 hover:shadow-md">
        <input type="checkbox" id="opt-listing" checked class="hidden peer">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center transition-all duration-300">
          <i class="fas fa-file-alt text-blue-500 text-sm"></i>
        </span>
        <span class="tracking-wide">Listings</span>
      </label>
      
      <label id="lbl-opt-reviews" class="source-toggle-label flex-1 group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none text-sm font-semibold border-slate-200/60 bg-white hover:border-amber-300 hover:shadow-md">
        <input type="checkbox" id="opt-reviews" checked class="hidden peer">
        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center transition-all duration-300">
          <i class="fas fa-comments text-amber-500 text-sm"></i>
        </span>
        <span class="tracking-wide">Reviews</span>
      </label>
    `;
  }

  updateSourceVisuals(): void {
    const updateStyle = (inputId: string, labelId: string, accentColor: string) => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      const label = document.getElementById(labelId);
      if (!input || !label) return;

      if (input.checked) {
        label.className = `source-toggle-label flex-1 group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none text-sm font-semibold bg-gradient-to-br from-${accentColor}-50/80 to-${accentColor}-100/50 border-${accentColor}-300 text-${accentColor}-700 shadow-lg shadow-${accentColor}-100/50 ring-1 ring-${accentColor}-200/50`;
      } else {
        label.className = `source-toggle-label flex-1 group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none text-sm font-semibold bg-white border-slate-200/60 text-slate-400 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-500`;
      }
    };
    updateStyle("opt-listing", "lbl-opt-listing", "blue");
    updateStyle("opt-reviews", "lbl-opt-reviews", "amber");
  }

  renderModuleCheckboxes(): void {
    const container = document.getElementById("modules-container");
    if (!container) return;

    container.innerHTML = ANALYSIS_MODULES.map(
      (mod: AnalysisModuleConfig) => {
        const style = getStyleForCategory(mod.category);
        return `
          <label class="module-item group relative flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:border-${style.color}-200 hover:bg-gradient-to-r hover:from-${style.color}-50/30 hover:to-transparent cursor-pointer transition-all duration-200 bg-white" data-category="${mod.category}">
            <div class="flex items-center pt-0.5">
              <input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded-md border-slate-300 text-${style.color}-600 focus:ring-${style.color}-500 transition-colors" checked>
            </div>
            <div class="text-sm leading-tight flex-1 min-w-0">
              <div class="font-semibold text-slate-700 group-hover:text-${style.color}-700 truncate transition-colors">${mod.label_cn}</div>
              <div class="text-slate-400 text-[11px] mt-1 group-hover:text-slate-500 line-clamp-2 leading-relaxed">${mod.desc_cn}</div>
            </div>
            <span class="w-1.5 h-1.5 rounded-full bg-${style.color}-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2 mr-1 shrink-0"></span>
          </label>
        `;
      }
    ).join("");

    container.querySelectorAll('input[name="analysis_module"]').forEach(checkbox => {
      this.addEventListener(checkbox as HTMLElement, 'change', () => {
        this.updatePromptPreview();
      });
    });
  }

  updateModuleListVisibility(): void {
    const showListing = (document.getElementById("opt-listing") as HTMLInputElement)?.checked;
    const showReviews = (document.getElementById("opt-reviews") as HTMLInputElement)?.checked;
    const items = document.querySelectorAll(".module-item");

    items.forEach((item) => {
      const cat = (item as HTMLElement).dataset.category;
      let visible = false;

      if (cat === "listing" && showListing) visible = true;
      if (cat === "reviews" && showReviews) visible = true;
      if (cat === "cross" && showListing && showReviews) visible = true;

      if (visible) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
        const checkbox = item.querySelector("input") as HTMLInputElement;
        if (checkbox) checkbox.checked = false;
      }
    });
  }

  toggleAllModules(checked: boolean): void {
    const inputs = document.querySelectorAll('#modules-container input[type="checkbox"]');
    inputs.forEach((input) => {
      const moduleItem = (input as HTMLElement).closest(".module-item");
      if (moduleItem && !moduleItem.classList.contains("hidden")) {
        (input as HTMLInputElement).checked = checked;
      }
    });
    this.updatePromptPreview();
  }

  updateAsinSelectList(): void {
    const container = document.getElementById("asin-select-list");
    if (!container) return;

    if (!state.scraper.scrapedData?.products?.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 gap-2">
          <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
            <i class="fas fa-inbox text-slate-300 text-lg"></i>
          </div>
          <p class="text-sm text-slate-400 font-medium">暂无数据</p>
          <p class="text-xs text-slate-300">请先抓取产品信息</p>
        </div>
      `;
      return;
    }

    if (!state.analysis.selectedAsins) {
      state.analysis.selectedAsins = [];
    }

    container.innerHTML = state.scraper.scrapedData.products.map((p: ScrapedProduct) => {
      const isSelected = state.analysis.selectedAsins.includes(p.asin);
      return `
        <label class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/60 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-blue-50/40' : ''}">
          <input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''} 
            class="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox transition-colors">
          <span class="text-sm font-mono font-semibold text-slate-600 group-hover:text-blue-700 tracking-wide transition-colors">${p.asin}</span>
          ${isSelected ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>' : ''}
        </label>
      `;
    }).join("");

    container.querySelectorAll('.asin-checkbox').forEach(checkbox => {
      this.addEventListener(checkbox as HTMLElement, 'change', (e) => {
        const target = e.target as HTMLInputElement;
        const asin = target.value;
        if (target.checked) {
          if (!state.analysis.selectedAsins.includes(asin)) {
            state.analysis.selectedAsins.push(asin);
          }
        } else {
          state.analysis.selectedAsins = state.analysis.selectedAsins.filter((a: string) => a !== asin);
        }
      });
    });
  }

  selectAllAsins(): void {
    if (!state.scraper.scrapedData?.products) return;
    state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: ScrapedProduct) => p.asin);
    this.updateAsinSelectList();
  }

  // ================== Prompt Logic ==================

  renderPromptPreviewArea(): void {
    const reportContent = document.getElementById("report-content");
    if (!reportContent || document.getElementById("prompt-preview-container")) return;

    const previewDiv = document.createElement("div");
    previewDiv.id = "prompt-preview-container";
    previewDiv.className = "mb-6 hidden fade-in";

    previewDiv.innerHTML = `
      <details class="group bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden open:ring-2 open:ring-blue-100/80 open:shadow-lg transition-all duration-300">
        <summary class="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-slate-50/80 to-white hover:from-slate-50 transition-all duration-200 list-none select-none">
          <div class="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <span class="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center text-xs shadow-sm">
              <i class="fas fa-terminal"></i>
            </span>
            <span>Prompt 实时预览</span>
            <span id="prompt-token-count" class="text-xs font-normal text-slate-400 font-mono ml-2 px-2 py-0.5 bg-slate-100 rounded-full"></span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400 group-open:hidden font-medium">点击展开</span>
            <i class="fas fa-chevron-down text-slate-400 transition-transform duration-300 group-open:rotate-180 text-xs"></i>
          </div>
        </summary>
        <div class="border-t border-slate-100 bg-gradient-to-b from-slate-900 to-slate-950">
          <div class="relative">
            <pre id="live-prompt-code" class="p-5 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-[320px] custom-scrollbar leading-relaxed selection:bg-emerald-900/50"></pre>
            <button data-action="copyPromptText" class="absolute top-3 right-3 text-slate-500 hover:text-white bg-slate-800/60 hover:bg-slate-700 p-2 rounded-xl transition-all duration-200 backdrop-blur-sm hover:scale-105" title="复制 Prompt">
              <i class="fas fa-copy text-xs"></i>
            </button>
          </div>
        </div>
      </details>
    `;

    reportContent.insertBefore(previewDiv, reportContent.firstChild);
  }

  updatePromptPreview(): void {
    const prompt = this.buildDynamicPrompt();
    const container = document.getElementById("prompt-preview-container");
    const codeBlock = document.getElementById("live-prompt-code");
    const countLabel = document.getElementById("prompt-token-count");

    if (!container || !codeBlock) return;

    if (!prompt) {
      container.classList.add("hidden");
    } else {
      container.classList.remove("hidden");
      codeBlock.textContent = prompt;
      const estTokens = Math.ceil(prompt.length / 4);
      if (countLabel) countLabel.textContent = `~${estTokens.toLocaleString()} Tokens`;
    }
  }

  copyPromptText(): void {
    const text = document.getElementById("live-prompt-code")?.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      showToast("Prompt 已复制", "success");
    }
  }

  buildDynamicPrompt(): string | null {
    const selectedCheckboxes = document.querySelectorAll('input[name="analysis_module"]:checked');
    if (selectedCheckboxes.length === 0) return null;

    const selectedModules = Array.from(selectedCheckboxes)
      .map((cb) => ANALYSIS_MODULES.find((m: AnalysisModuleConfig) => m.id === (cb as HTMLInputElement).value))
      .filter(Boolean) as AnalysisModuleConfig[];

    const tasksStr = selectedModules
      .map((m: AnalysisModuleConfig, index: number) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`)
      .join("\n");

    const schemaParts = selectedModules
      .map((m: AnalysisModuleConfig) => `  "${m.id}": ["..."]`)
      .join(",\n");

    return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace("{{dynamic_schema}}", schemaParts);
  }

  // ================== Core Analysis Logic ==================

  async analyzeSelectedAsins(): Promise<void> {
    if (!state.analysis.selectedAsins?.length) {
      showToast("请先选择要分析的 ASIN", "warning");
      return;
    }

    const currentPrompt = this.buildDynamicPrompt();
    if (!currentPrompt) {
      showToast("请至少勾选一个分析目标", "warning");
      return;
    }

    const isListingSelected = (document.getElementById("opt-listing") as HTMLInputElement)?.checked;
    const isReviewsSelected = (document.getElementById("opt-reviews") as HTMLInputElement)?.checked;

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
    if (!provider || typeof provider !== 'string') {
      showToast("请先配置AI模型", "warning");
      return;
    }

    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config?.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const btn = document.getElementById("analyze-btn") as HTMLButtonElement;
    btn.disabled = true;
    btn.innerHTML = `
      <span class="flex items-center gap-2">
        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        <span>分析中...</span>
      </span>
    `;

    // 渲染骨架屏
    const loadingReport: Partial<AnalysisReport> = {};
    const selectedCheckboxes = document.querySelectorAll('input[name="analysis_module"]:checked');
    selectedCheckboxes.forEach((cb) => {
      loadingReport[(cb as HTMLInputElement).value] = '__LOADING__';
    });

    loadingReport.meta = {
      targetMarket: "Analyzing...",
      generatedByModel: config.model,
      generatedAt: "Pending...",
      templateUsed: "Dynamic Analysis",
    };

    state.analysis.analysisReport = loadingReport;
    this.renderReport();

    const selectedProducts = state.scraper.scrapedData.products.filter((p: ScrapedProduct) => state.analysis.selectedAsins.includes(p.asin));
    const site = state.scraper.scrapedData.metadata?.marketplace;
    
    if (!site || !LANGUAGE_HEADERS[site]) {
      showToast(`无效的站点配置: ${site || '未知'}`, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
      return;
    }
    
    const language = LANGUAGE_HEADERS[site].name;

    try {
      const llmConfig = {
        provider: provider as string,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: config.model,
      };

      const dataOptions = {
        includeTitle: isListingSelected,
        includeBullets: isListingSelected,
        includeReviews: isReviewsSelected,
      };

      const report = await AnalysisService.generateReport(
        selectedProducts,
        currentPrompt,
        language,
        llmConfig,
        dataOptions
      );

      report.meta = {
        targetMarket: language,
        analyzedASINs: state.analysis.selectedAsins,
        generatedByModel: config.model,
        generatedAt: new Date().toISOString(),
        templateUsed: "Dynamic Analysis",
        dataScope: [
          isListingSelected ? "Listing" : "",
          isReviewsSelected ? "Reviews" : "",
        ].filter(Boolean),
      };

      state.analysis.analysisReport = report;
      state.analysis.translatedReport = null;
      state.analysis.showTranslation = false;
      state.analysis.editHistory = [JSON.stringify(report)];
      state.analysis.isEditing = false;

      HistoryService.save(state.scraper.scrapedData, report);
      renderHistory();
      this.renderReport();

      showToast("分析完成", "success");
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      const errorMessage = error.message || '未知错误';
      const errorWithStatus = error as Error & { status?: number };
      if (typeof e === 'object' && e !== null && 'status' in e) {
        errorWithStatus.status = (e as { status: number }).status;
      }
      
      console.error('[Analysis] analyzeSelectedAsins 错误详情:', {
        message: errorMessage,
        status: errorWithStatus.status,
        stack: error.stack,
        original: e
      });
      
      ErrorService.handle(errorWithStatus, { action: 'analyzeSelectedAsins', module: 'analysis' });
      state.analysis.analysisReport = null;
      const display = document.getElementById("report-display");
      if (display) display.classList.add("hidden");
      const noReportMsg = document.getElementById("no-report-msg");
      if (noReportMsg) noReportMsg.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
    }
  }

  renderReport(): void {
    const report = state.analysis.analysisReport;
    if (!report) return;
    
    if (typeof report === 'string') {
      console.warn('[Analysis] analysisReport 是字符串类型,跳过渲染');
      return;
    }

    if (!state.analysis.translatedReport) state.analysis.showTranslation = false;

    const welcomeEl = document.getElementById("analysis-welcome");
    if (welcomeEl) welcomeEl.classList.add("hidden");

    const noReportMsg = document.getElementById("no-report-msg");
    if (noReportMsg) noReportMsg.classList.add("hidden");
    
    const display = document.getElementById("report-display");
    if (display) display.classList.remove("hidden");
    
    const jsonDisplay = document.getElementById("report-json-display");
    if (jsonDisplay?.parentElement)
      jsonDisplay.parentElement.classList.add("hidden");

    if (report.parse_error) {
      if (display) {
        display.innerHTML = `
          <div class="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-mono text-sm whitespace-pre-wrap">
            <div class="flex items-center gap-2 mb-3 font-sans font-semibold text-red-800">
              <i class="fas fa-exclamation-triangle"></i>
              <span>解析错误</span>
            </div>
            <div class="text-red-600/80">${escapeHtml(report.raw_response || '')}</div>
          </div>
        `;
      }
      return;
    }

    const showTrans = state.analysis.showTranslation && state.analysis.translatedReport;
    const targetMarket = report.meta?.targetMarket || "Original";

    const disabledClass = "opacity-40 cursor-not-allowed pointer-events-none grayscale";
    const mdBtnClass = showTrans
      ? disabledClass
      : "text-slate-500 hover:text-blue-600 hover:bg-blue-50";

    const toolbarHtml = `
      <div class="space-y-5 font-sans text-slate-800 pb-8" id="report-container">
        <!-- 顶部工具栏 -->
        <div class="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-sm border border-slate-200/60 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
          
          <!-- 元信息标签 -->
          <div class="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            <div class="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-600 rounded-xl border border-slate-200/60">
              <i class="fas fa-file-contract text-slate-400"></i>
              <span>${report.meta?.templateUsed || "Analysis"}</span>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 text-blue-600 rounded-xl border border-blue-200/40">
              <i class="fas fa-globe text-blue-400"></i>
              <span>${report.meta?.targetMarket || ""}</span>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-500 rounded-xl border border-slate-200/60">
              <i class="fas fa-clock text-slate-400"></i>
              <span>${report.meta?.generatedAt || ""}</span>
            </div>
          </div>
          
          <!-- 操作区域 -->
          <div class="flex items-center gap-3">
            
            <!-- 翻译控制 -->
            <div class="flex items-center gap-2 bg-slate-50/80 rounded-xl p-1.5 border border-slate-200/50">
              <select id="translation-model-select" class="text-xs border-0 bg-transparent rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-0 w-32 cursor-pointer">
                <option value="" disabled selected>Translation Model</option>
              </select>
              <button id="quick-translate-btn" data-action="translateReport" 
                class="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 ${showTrans ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60" : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm hover:shadow cursor-pointer"}" 
                ${showTrans ? "disabled" : ""}>
                <i class="fas fa-language"></i>
                <span>翻译</span>
              </button>
            </div>

            <!-- 分割线 -->
            <div class="w-px bg-slate-200 h-7 mx-1"></div>

            <!-- 语言切换器 -->
            <div class="flex items-center gap-2 bg-slate-100/80 p-1 rounded-full px-2 border border-slate-200/50">
              <span class="text-[10px] px-2 py-0.5 font-bold ${!showTrans ? "text-slate-700 bg-white rounded-full shadow-sm" : "text-slate-400"} uppercase tracking-wider cursor-default transition-all duration-200" title="原文语言">
                ${targetMarket}
              </span>
              
              <button id="toggle-trans-view-btn" 
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 ${showTrans ? "bg-blue-500" : "bg-slate-300"} ${!state.analysis.translatedReport ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"}"
                ${!state.analysis.translatedReport ? "disabled" : ""}>
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${showTrans ? "translate-x-[18px]" : "translate-x-[3px]"} shadow-sm"></span>
              </button>
              
              <span class="text-[10px] px-2 py-0.5 font-bold ${showTrans ? "text-blue-600 bg-blue-50 rounded-full" : "text-slate-400"} cursor-default transition-all duration-200">
                CN
              </span>
            </div>

            <!-- 工具按钮组 -->
            <div class="flex bg-white border border-slate-200/60 rounded-xl p-1 shadow-sm gap-0.5">
              <button data-action="copyReportMarkdown" class="px-2.5 py-1.5 rounded-lg transition-all duration-200 ${mdBtnClass}" title="${showTrans ? "翻译模式下禁用" : "复制 Markdown"}" ${showTrans ? "disabled" : ""}>
                <i class="fab fa-markdown text-sm"></i>
              </button>
              
              <div class="w-px bg-slate-100 my-1"></div>
              
              <button data-action="exportReport" class="px-2.5 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" title="导出 JSON">
                <i class="fas fa-download text-xs"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 网格容器 -->
        <div class="grid-stack"></div>
      </div>
    `;

    if (display) display.innerHTML = toolbarHtml;

    this.populateTranslationModels();

    const toggleBtn = document.getElementById("toggle-trans-view-btn");
    if (toggleBtn) this.addEventListener(toggleBtn, "click", () => this.toggleTranslationView());

    this.initGridStack(report);
  }

  populateTranslationModels(): void {
    const select = document.getElementById("translation-model-select") as HTMLSelectElement;
    if (!select) return;

    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
    const providerConfig = (activeProvider && typeof activeProvider === 'string' && activeProvider in PROVIDERS) 
      ? PROVIDERS[activeProvider as keyof typeof PROVIDERS] 
      : null;

    let options = "";

    if (providerConfig?.models?.length) {
      providerConfig.models.forEach((modelObj: string | { id: string; name?: string; context?: number }) => {
        const modelId = typeof modelObj === 'string' ? modelObj : modelObj.id;
        const isSelected = state.analysis.lastTranslationModel === modelId ? "selected" : "";
        options += `<option value="${modelId}" ${isSelected}>${modelId}</option>`;
      });
    } else {
      options = `<option value="" disabled>No models found for ${activeProvider || 'current provider'}</option>`;
    }

    select.innerHTML = options;

    if (state.analysis.lastTranslationModel) {
      const exists = Array.from(select.options).some(opt => opt.value === state.analysis.lastTranslationModel);
      if (exists) {
        select.value = state.analysis.lastTranslationModel;
      } else if (select.options.length > 0 && select.options[0] && !select.options[0].disabled) {
        select.value = select.options[0].value;
        state.analysis.lastTranslationModel = select.value;
      }
    } else if (select.options.length > 0 && select.options[0] && !select.options[0].disabled) {
      select.value = select.options[0].value;
    }

    select.onchange = (e) => {
      state.analysis.lastTranslationModel = (e.target as HTMLSelectElement).value;
    };
  }

  async initGridStack(report: AnalysisReport): Promise<void> {
    const gridEl = document.querySelector(".grid-stack");
    if (!gridEl) return;

    await loadGridStack();

    if (this.grid) this.grid.destroy(false);

    this.grid = (window.GridStack as any).init(
      {
        column: 12,
        cellHeight: 60,
        margin: 16,
        animate: true,
        float: false,
        disableOneColumnMode: false,
        staticGrid: false,
        handle: ".drag-handle",
        resizable: { 
          handles: "se",
          autoHide: false
        },
      },
      gridEl
    );

    const savedTemplateId = (report.meta?.templateId as string | undefined) || "default";
    const savedLayout = StorageService.getLayoutConfig(savedTemplateId);

    const widgets: GridStackWidget[] = [];
    const keys = Object.keys(report).filter((k) => k !== "meta");

    keys.forEach((key) => {
      let content = report[key];
      if (state.analysis.showTranslation && state.analysis.translatedReport?.[key]) {
        content = state.analysis.translatedReport[key];
      }
      const autoH = this.calculateWidgetHeight(content);

      let defaultW = 4;
      if (autoH > 6) defaultW = 6;
      if (autoH > 10) defaultW = 12;

      const savedNode = savedLayout.find((n: GridStackNode) => n.id === key);

      widgets.push({
        id: key,
        x: savedNode ? savedNode.x : undefined,
        y: savedNode ? savedNode.y : undefined,
        w: savedNode ? savedNode.w : defaultW,
        h: savedNode ? savedNode.h : autoH,
        noMove: true,
        noResize: true,
        content: this.renderWidgetContent(key, report, state.analysis.translatedReport),
      });
    });

    if (!this.grid) return;

    this.grid.batchUpdate();
    this.grid.removeAll();
    widgets.forEach((w) => {
      if (!this.grid) return;
      const widgetConfig: GridStackWidget = {
        x: w.x, y: w.y, w: w.w, h: w.h, id: w.id, 
        noMove: w.noMove, noResize: w.noResize,
        content: w.content
      };
      const el = this.grid.addWidget(widgetConfig);

      const contentEl = el.querySelector('.grid-stack-item-content');
      if (contentEl) {
        contentEl.innerHTML = w.content;
      }
    });
    this.grid.batchUpdate();

    const templateId = report?.templateId || report?.meta?.templateId || "default";
    this.grid.on("change", () => this.saveGridLayout(templateId as string));
    this.addEventListener(document, "mousedown", (e) => this.handleGlobalClick(e as MouseEvent));
  }

  handleGlobalClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest(".ui-resizable-handle") || 
        (e.target as HTMLElement).closest(".btn-resize") ||
        (e.target as HTMLElement).closest(".drag-handle") ||
        (e.target as HTMLElement).closest("[data-action='toggleCardResize']")) {
      return;
    }
    
    const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
    if (resizingCard && !resizingCard.contains(e.target as Node)) {
      const key = resizingCard.getAttribute("gs-id");
      if (key) {
        this.toggleCardResize(key, false);
      }
    }
    
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card && !card.contains(e.target as Node)) {
        const cardId = card.id.replace('widget-card-', '');
        if (cardId) {
          this.saveLocalEdit(cardId);
        }
      }
    });
  }

  saveGridLayout(templateId: string): void {
    if (!this.grid) return;
    const layout = this.grid.save(false);
    const cleanLayout = layout.map((node: GridStackNode) => ({
      id: node.id || '',
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    }));
    StorageService.setLayoutConfig(templateId, cleanLayout);
  }

  renderWidgetContent(key: string, report: AnalysisReport, transReport: AnalysisReport | null | undefined): string {
    const origVal = report[key];
    const showTrans = state.analysis.showTranslation;
    const transVal = showTrans && transReport ? transReport[key] : undefined;

    if (origVal === '__LOADING__') {
      return renderSkeleton();
    }

    const displayVal = this.getDisplayValue(origVal, transVal);

    const moduleConfig = ANALYSIS_MODULES.find((m: AnalysisModuleConfig) => m.id === key);
    const title = moduleConfig ? moduleConfig.label_cn : getFieldTitle(key);
    const style = getStyleForCategory(moduleConfig?.category);

    return renderWidgetCard(key, title, style, showTrans || false, renderViewModeHTML(displayVal, style));
  }

  calculateWidgetHeight(content: unknown): number {
    if (!content) return 4;
    let textLength = 0;
    let lineCount = 0;

    if (typeof content === "string") {
      textLength = content.length;
      lineCount = content.split("\n").length;
    } else if (Array.isArray(content)) {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = content.length * 1.5;
    } else if (typeof content === "object") {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = Object.keys(content as object).length * 2;
    }

    const heightByChar = Math.ceil(textLength / 150);
    const heightByLine = Math.ceil(lineCount / 3);
    let h = Math.max(3, heightByChar, heightByLine);
    return Math.min(h + 2, 24);
  }

  getDisplayValue(orig: unknown, trans: unknown): unknown {
    return state.analysis.showTranslation && trans !== undefined && trans !== null ? trans : orig;
  }

  // ================== Actions / Methods ==================

  toggleTranslationView(): void {
    state.analysis.showTranslation = !state.analysis.showTranslation;
    this.renderReport();
  }

  async translateReport(): Promise<void> {
    if (state.analysis.showTranslation && state.analysis.translatedReport) return;
    if (!state.analysis.analysisReport) return;
    
    if (typeof state.analysis.analysisReport === 'string') {
      showToast("报告格式错误", "error");
      return;
    }

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER) as string | null;
    if (!provider || typeof provider !== 'string') {
      showToast("请先配置AI模型", "warning");
      return;
    }
    
    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config?.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const select = document.getElementById("translation-model-select") as HTMLSelectElement;
    const selectedModel = select?.value || config.model;

    const btn = document.getElementById("quick-translate-btn") as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="flex items-center gap-1.5">
          <span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>翻译中...</span>
        </span>
      `;
    }

    try {
      const llmConfig = {
        provider: provider as string,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: selectedModel,
      };

      const targetLanguage = "Chinese";

      const translated = await AnalysisService.translateReport(
        state.analysis.analysisReport,
        targetLanguage,
        llmConfig
      );

      state.analysis.translatedReport = translated;
      state.analysis.showTranslation = true;
      this.renderReport();
      showToast("翻译完成", "success");
    } catch (e: unknown) {
      ErrorService.handle(e, { action: 'translateReport', module: 'analysis' });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-language"></i> <span>翻译</span>';
      }
    }
  }

  copyReportMarkdown(): void {
    if (!state.analysis.analysisReport) {
      showToast("暂无报告", "warning");
      return;
    }

    let md = `# Analysis Report\n\n`;
    md += this.generateDynamicMarkdown(state.analysis.analysisReport);
    navigator.clipboard.writeText(md);
    showToast("Markdown 已复制", "success");
  }

  generateDynamicMarkdown(data: unknown, depth: number = 1): string {
    if (!data || typeof data !== 'object') return "";
    let md = "";

    const dataObj = data as Record<string, unknown>;
    Object.keys(dataObj).forEach((key) => {
      if (key === "meta") return;
      const val = dataObj[key];
      const heading = "#".repeat(Math.min(depth + 1, 6));
      md += `${heading} ${key}\n\n`;

      if (typeof val === "string") {
        md += `${val}\n\n`;
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === "string") {
            md += `- ${item}\n`;
          } else {
            md += `- ${JSON.stringify(item)}\n`;
          }
        });
        md += "\n";
      }
    });

    return md;
  }

  exportReport(): void {
    if (!state.analysis.analysisReport) return;
    const blob = new Blob([JSON.stringify(state.analysis.analysisReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleCardResize(key: string, forceState?: boolean): void {
    const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`) as HTMLElement | null;
    const card = document.getElementById(`widget-card-${key}`);
    if (!el || !card) return;

    const isResizing = forceState !== undefined ? forceState : !el.classList.contains("is-resizing");

    if (isResizing) {
      const otherResizingCards = document.querySelectorAll('.grid-stack-item.is-resizing');
      otherResizingCards.forEach(otherEl => {
        const otherKey = otherEl.getAttribute('gs-id');
        if (otherKey && otherKey !== key) {
          this.toggleCardResize(otherKey, false);
        }
      });

      el.classList.add("is-resizing", "grid-stack-item-resizing");
      
      if (this.grid) {
        this.grid.update(el, { noMove: false, noResize: false });
        this.grid.engine.nodes.forEach((node: GridStackNode) => {
          if (node.el && node.el !== el) {
            this.grid!.update(node.el, { noMove: true, noResize: true });
          }
        });
      }
      
      (card as HTMLElement).style.boxShadow = '0 0 0 2px #3b82f6, 0 8px 25px -5px rgba(59, 130, 246, 0.15)';
      (card as HTMLElement).style.borderColor = '#93c5fd';
      
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        resizeBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';
        resizeBtn.classList.add('text-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
        resizeBtn.setAttribute('title', '完成调整');
      }
    } else {
      el.classList.remove("is-resizing", "grid-stack-item-resizing");
      
      if (this.grid && el) {
        this.grid.update(el, { noMove: true, noResize: true });
      }
      
      (card as HTMLElement).style.boxShadow = '';
      (card as HTMLElement).style.borderColor = '';
      
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        resizeBtn.innerHTML = '<i class="fas fa-expand-alt text-xs"></i>';
        resizeBtn.classList.remove('text-blue-600', 'bg-blue-50', 'ring-1', 'ring-blue-200');
        resizeBtn.setAttribute('title', '调整');
      }
      
      const report = state.analysis.analysisReport as AnalysisReport;
      const templateId = report?.templateId || report?.meta?.templateId || "default";
      this.saveGridLayout(templateId as string);
    }
  }

  // ================== Global Actions Registration ==================

  registerGlobalActions(): void {
    const actions = {
      toggleAllModules: (params: unknown) => {
        const typedParams = params as { checked: string };
        const checked = typedParams.checked === 'true';
        this.toggleAllModules(checked);
      },
      selectAllAsins: () => this.selectAllAsins(),
      copyPromptText: () => this.copyPromptText(),
      translateReport: () => this.translateReport(),
      copyReportMarkdown: () => this.copyReportMarkdown(),
      exportReport: () => this.exportReport(),
      toggleCardResize: (params: unknown) => {
        const typedParams = params as { key: string };
        const key = typedParams.key;
        if (key) this.toggleCardResize(key, true);
      },
    };

    this.registerActions(actions);
    
    const globalFunctions = {
      startLocalEdit: (key: string) => this.startLocalEdit(key),
      saveLocalEdit: (key: string) => this.saveLocalEdit(key),
      undoLocalEdit: (key: string) => this.undoLocalEdit(key),
      pushEditSnapshot: (key: string) => this.pushEditSnapshot(key),
      deleteRowItem: (btn: HTMLElement, key: string) => this.deleteRowItem(btn, key),
      addListItem: (key: string) => this.addListItem(key),
      addObjItem: (key: string) => this.addObjItem(key),
    };
    
    Object.entries(globalFunctions).forEach(([name, fn]) => {
      (window as unknown as Record<string, unknown>)[name] = fn;
    });
    
    this.addDisposable(() => {
      Object.keys(globalFunctions).forEach(name => {
        delete (window as unknown as Record<string, unknown>)[name];
      });
    });
  }

  // ================== 编辑功能实现 ==================

  startLocalEdit(key: string): void {
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card) {
        const cardId = card.id.replace('widget-card-', '');
        if (cardId && cardId !== key) {
          this.saveLocalEdit(cardId);
        }
      }
    });

    const card = document.getElementById(`widget-card-${key}`);
    if (!card) return;

    const contentArea = document.getElementById(`widget-content-${key}`);
    const viewControls = card.querySelector('.view-controls');
    const editControls = card.querySelector('.edit-controls');

    if (!contentArea || !viewControls || !editControls) return;

    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    if (!report || typeof report === 'string') return;
    
    if (!this.originalDataMap.has(key)) {
      const value = (report as Record<string, unknown>)[key];
      this.originalDataMap.set(key, JSON.parse(JSON.stringify(value)));
    }

    if (!this.editHistoryMap.has(key)) {
      this.editHistoryMap.set(key, []);
    }

    viewControls.classList.add('hidden');
    editControls.classList.remove('hidden');

    const value = (report as Record<string, unknown>)[key];
    contentArea.innerHTML = renderEditorForm(key, value);
  }

  saveLocalEdit(key: string): void {
    const card = document.getElementById(`widget-card-${key}`);
    if (!card) return;

    const contentArea = document.getElementById(`widget-content-${key}`);
    const viewControls = card.querySelector('.view-controls');
    const editControls = card.querySelector('.edit-controls');

    const newData = this.collectEditedData(key);
    
    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    if (!report || typeof report === 'string') return;
    
    report[key] = newData;

    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    if (editControls) editControls.classList.add('hidden');
    if (viewControls) viewControls.classList.remove('hidden');

    const moduleConfig = ANALYSIS_MODULES.find((m: AnalysisModuleConfig) => m.id === key);
    const style = getStyleForCategory(moduleConfig?.category);

    if (contentArea) contentArea.innerHTML = renderViewModeHTML(newData, style);
    showToast("保存成功", "success");
  }

  undoLocalEdit(key: string): void {
    const originalData = this.originalDataMap.get(key);
    if (!originalData) return;

    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    if (!report || typeof report === 'string') return;
    
    report[key] = JSON.parse(JSON.stringify(originalData));

    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    const card = document.getElementById(`widget-card-${key}`);
    if (card) {
      const viewControls = card.querySelector('.view-controls');
      const editControls = card.querySelector('.edit-controls');
      const contentArea = document.getElementById(`widget-content-${key}`);

      if (editControls) editControls.classList.add('hidden');
      if (viewControls) viewControls.classList.remove('hidden');

      const moduleConfig = ANALYSIS_MODULES.find((m: AnalysisModuleConfig) => m.id === key);
      const style = getStyleForCategory(moduleConfig?.category);

      if (contentArea) contentArea.innerHTML = renderViewModeHTML(originalData, style);
    }

    showToast("已撤销", "info");
  }

  pushEditSnapshot(key: string): void {
    const history = this.editHistoryMap.get(key) || [];
    const currentData = this.collectEditedData(key);
    history.push(JSON.parse(JSON.stringify(currentData)));
    this.editHistoryMap.set(key, history);
  }

  collectEditedData(key: string): unknown {
    const contentArea = document.getElementById(`widget-content-${key}`);
    if (!contentArea) return null;

    const simpleInput = contentArea.querySelector(`#input-${key}`) as HTMLTextAreaElement;
    if (simpleInput) {
      return simpleInput.value;
    }

    const listContainer = contentArea.querySelector(`#list-container-${key}`);
    if (listContainer) {
      const items: string[] = [];
      listContainer.querySelectorAll('.edit-row textarea').forEach(textarea => {
        const val = (textarea as HTMLTextAreaElement).value.trim();
        if (val) items.push(val);
      });
      return items;
    }

    const objContainer = contentArea.querySelector(`#obj-list-container-${key}`);
    if (objContainer) {
      const objects: Record<string, string>[] = [];
      objContainer.querySelectorAll('.edit-row').forEach(row => {
        const obj: Record<string, string> = {};
        row.querySelectorAll('.obj-input').forEach(input => {
          const subKey = (input as HTMLElement).dataset.subkey;
          if (subKey) {
            obj[subKey] = (input as HTMLTextAreaElement).value;
          }
        });
        objects.push(obj);
      });
      return objects;
    }

    return null;
  }

  deleteRowItem(btn: HTMLElement, _key: string): void {
    const row = btn.closest('.edit-row');
    if (row) {
      row.classList.add('opacity-0', 'scale-95', '-translate-x-2');
      row.classList.add('transition-all', 'duration-200');
      setTimeout(() => row.remove(), 200);
    }
  }

  addListItem(key: string): void {
    const container = document.getElementById(`list-container-${key}`);
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'edit-row group flex items-start gap-2.5 relative opacity-0 scale-95 transition-all duration-200';
    newRow.innerHTML = `
      <div class="pt-2.5 pl-1"> 
        <div class="w-2 h-2 rounded-full bg-blue-400/60 group-hover:bg-blue-500 transition-colors ring-2 ring-blue-100"></div>
      </div>
      <div class="flex-1 relative">
        <textarea class="editor-input-modern" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      </div>
      <div class="pt-1">
        <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100" title="删除此项">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;
    container.appendChild(newRow);
    
    // 触发入场动画
    requestAnimationFrame(() => {
      newRow.classList.remove('opacity-0', 'scale-95');
    });
    
    // 聚焦到新输入框
    const textarea = newRow.querySelector('textarea');
    if (textarea) textarea.focus();
  }

  addObjItem(key: string): void {
    const container = document.getElementById(`obj-list-container-${key}`);
    const template = document.getElementById(`tpl-${key}`);
    if (!container || !template) return;

    const templateObj = JSON.parse(template.textContent || '{}');
    const newRow = document.createElement('div');
    newRow.className = 'edit-row group relative bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-md transition-all duration-300 opacity-0 scale-95';
    
    const fields = Object.keys(templateObj).map(subKey => `
      <div class="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-4 items-start group/field">
        <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-2.5 cursor-default group-hover/field:text-blue-500 transition-colors">
          ${getFieldTitle(subKey)}
        </label>
        <div class="relative w-full">
          <textarea data-subkey="${subKey}" class="editor-input-modern obj-input" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${key}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        </div>
      </div>
    `).join('');

    newRow.innerHTML = `
      <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 absolute top-4 right-4 bg-white shadow-sm border border-slate-200/60 z-10 hover:border-red-200" title="删除此项">
        <i class="fas fa-trash-alt text-[10px]"></i>
      </button>
      <div class="grid gap-y-4 gap-x-4">
        ${fields}
      </div>
    `;
    
    container.appendChild(newRow);
    
    // 触发入场动画
    requestAnimationFrame(() => {
      newRow.classList.remove('opacity-0', 'scale-95');
    });
  }
}

// ========================================== 
// Module Exports
// ========================================== 

let moduleInstance: AnalysisModule | null = null;

export async function mount(container: HTMLElement): Promise<void> {
  console.log('[Analysis] 🔧 开始挂载子模块');

  try {
    const html = await loadTemplate('src/modules/app_center/views/master_prompt/analysis/template.html');
    container.innerHTML = html;

    moduleInstance = new AnalysisModule(container);
    await moduleInstance.mount(container);

    console.log('[Analysis] ✅ 子模块挂载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块挂载失败', error);
    throw error;
  }
}

export function unmount(): void {
  console.log('[Analysis] 🔄 开始卸载子模块');

  try {
    if (moduleInstance) {
      moduleInstance.unmount();
      moduleInstance = null;
    }

    console.log('[Analysis] ✅ 子模块卸载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块卸载失败', error);
  }
}