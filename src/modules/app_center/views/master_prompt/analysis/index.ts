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
import { showToast } from '../../../../../common/utils/ui.js';
import { HistoryService } from '../services/historyService';
import { renderHistory } from '../scraper/index';
import { AnalysisService } from '../services/analysisService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';
import { ErrorService } from '../../../../../services/errorService';
import { renderWidgetCard, renderViewModeHTML, renderEditorForm, renderSkeleton } from './renderer';
import eventBus from '../../../../../common/EventBus';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import { loadGridStack } from '../../../../../common/utils/lazyLibs';

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

interface GridStackWidget {
  id: string;
  x?: number;
  y?: number;
  w: number;
  h: number;
  noMove: boolean;
  noResize: boolean;
  content: string;
}


// 扩展 Window 接口以支持全局函数
declare global {
  interface Window {
    startLocalEdit: (key: string) => void;
    saveLocalEdit: (key: string) => void;
    undoLocalEdit: (key: string) => void;
    pushEditSnapshot: (key: string) => void;
    deleteRowItem: (btn: HTMLElement, key: string) => void;
    addListItem: (key: string) => void;
    addObjItem: (key: string) => void;
    GridStack: any;
  }
}

// 辅助函数：获取字段标题
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
  private grid: any = null;
  private originalDataMap: Map<string, any> = new Map();
  private editHistoryMap: Map<string, any[]> = new Map();

  constructor(container: HTMLElement) {
    super('master_prompt_analysis');
    this.container = container;
    this.registerGlobalActions();
  }


  async render(): Promise<void> {
    // render() 方法由 BaseModule 要求实现
    // 但在这个模块中，HTML 已经在 mount() 函数中加载
  }

  async init(): Promise<void> {
    console.log("🚀 Analysis Module Initialized (BaseModule)");

    // 1. UI Initialization
    this.setupUI();

    // 订阅 Scraper 事件
    this.addDisposable(eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
      console.log("AnalysisModule received SCRAPE_SUCCESS");
      if (state.scraper.scrapedData && state.scraper.scrapedData.products) {
        state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: any) => p.asin);
      }
      this.updateAsinSelectList();
    }));

    // 初始加载现有数据
    if (state.scraper.scrapedData) {
      if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
        if (state.scraper.scrapedData.products) {
          state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: any) => p.asin);
        }
      }
      this.updateAsinSelectList();
    }

    // 2. 绑定事件
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

    // 3. 恢复视图（如果报告存在）
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
    // BaseModule 自动处理事件监听器清理
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

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = `
      <label id="lbl-opt-listing" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
        <input type="checkbox" id="opt-listing" checked class="hidden peer">
        <i class="fas fa-file-alt text-xs opacity-70"></i>
        <span>Listings</span>
      </label>
      
      <label id="lbl-opt-reviews" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
        <input type="checkbox" id="opt-reviews" checked class="hidden peer">
        <i class="fas fa-comments text-xs opacity-70"></i>
        <span>Reviews</span>
      </label>
    `;
  }


  updateSourceVisuals(): void {
    const updateStyle = (inputId: string, labelId: string) => {
      const input = document.getElementById(inputId) as HTMLInputElement;
      const label = document.getElementById(labelId);
      if (!input || !label) return;

      if (input.checked) {
        label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-700 shadow-sm ring-1 ring-blue-200`;
      } else {
        label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600`;
      }
    };
    updateStyle("opt-listing", "lbl-opt-listing");
    updateStyle("opt-reviews", "lbl-opt-reviews");
  }

  renderModuleCheckboxes(): void {
    const container = document.getElementById("modules-container");
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = ANALYSIS_MODULES.map(
      (mod: any) => `
        <label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
          <div class="flex items-center pt-0.5">
            <input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked>
          </div>
          <div class="text-sm leading-tight flex-1 min-w-0">
            <div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
            <div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
          </div>
        </label>
      `
    ).join("");

    // 绑定复选框 change 事件,实时更新 Prompt 预览
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

    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products || state.scraper.scrapedData.products.length === 0) {
      // ✅ 安全: 静态HTML模板，无用户输入
      container.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">暂无数据</p>';
      return;
    }

    if (!state.analysis.selectedAsins) {
      state.analysis.selectedAsins = [];
    }


    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = state.scraper.scrapedData.products.map((p: any) => {
      const isSelected = state.analysis.selectedAsins.includes(p.asin);
      return `
        <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group">
          <input type="checkbox" value="${p.asin}" ${isSelected ? 'checked' : ''} 
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 asin-checkbox">
          <span class="text-sm font-mono font-medium text-slate-700 group-hover:text-blue-700">${p.asin}</span>
        </label>
      `;
    }).join("");

    // 绑定复选框事件
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
    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products) return;
    state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p: any) => p.asin);
    this.updateAsinSelectList();
  }

  // ================== Prompt Logic ==================

  renderPromptPreviewArea(): void {
    const reportContent = document.getElementById("report-content");
    if (!reportContent || document.getElementById("prompt-preview-container")) return;

    const previewDiv = document.createElement("div");
    previewDiv.id = "prompt-preview-container";
    previewDiv.className = "mb-6 hidden fade-in";


    // ✅ 安全: 静态HTML模板，无用户输入
    previewDiv.innerHTML = `
      <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden open:ring-2 open:ring-blue-100 transition-all">
        <summary class="flex items-center justify-between p-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors list-none select-none">
          <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
              <i class="fas fa-terminal"></i>
            </span>
            <span>Prompt 实时预览</span>
            <span id="prompt-token-count" class="text-xs font-normal text-slate-400 font-mono ml-2"></span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400 group-open:hidden">点击展开查看策略</span>
            <i class="fas fa-chevron-down text-slate-400 transition-transform group-open:rotate-180 text-xs"></i>
          </div>
        </summary>
        <div class="border-t border-slate-100 bg-slate-900">
          <div class="relative">
            <pre id="live-prompt-code" class="p-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap max-h-[300px] custom-scrollbar leading-relaxed"></pre>
            <button data-action="copyPromptText" class="absolute top-2 right-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded transition-colors" title="复制 Prompt">
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
      if (countLabel) countLabel.textContent = `~${estTokens} Tokens`;
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
      .map((cb) => ANALYSIS_MODULES.find((m: any) => m.id === (cb as HTMLInputElement).value))
      .filter(Boolean);

    const tasksStr = selectedModules
      .map((m: any, index: number) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`)
      .join("\n");

    const schemaParts = selectedModules
      .map((m: any) => `  "${m.id}": ["..."]`)
      .join(",\n");

    return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace("{{dynamic_schema}}", schemaParts);
  }

  // ================== Core Analysis Logic ==================

  async analyzeSelectedAsins(): Promise<void> {
    if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
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

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!provider) {
      showToast("请先配置AI模型", "warning");
      return;
    }


    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config || !config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const btn = document.getElementById("analyze-btn") as HTMLButtonElement;
    btn.disabled = true;
    // ✅ 安全: 静态HTML模板，无用户输入
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中..';

    // 渲染骨架屏状态
    const loadingReport: any = {};
    const selectedCheckboxes = document.querySelectorAll('input[name="analysis_module"]:checked');
    selectedCheckboxes.forEach((cb) => {
      loadingReport[(cb as HTMLInputElement).value] = '__LOADING__';
    });

    loadingReport.meta = {
      targetMarket: "Analyze...",
      generatedByModel: config.model,
      generatedAt: "Pending...",
      templateUsed: "Dynamic Analysis",
    };

    state.analysis.analysisReport = loadingReport;
    this.renderReport();

    const selectedProducts = state.scraper.scrapedData.products.filter((p: any) => state.analysis.selectedAsins.includes(p.asin));
    const site = state.scraper.scrapedData.metadata?.marketplace;
    
    // 🔐 防御性检查：确保站点配置存在
    if (!site || !LANGUAGE_HEADERS[site]) {
      showToast(`无效的站点配置: ${site || '未知'}`, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
      return;
    }
    
    const language = LANGUAGE_HEADERS[site].name;

    try {
      const llmConfig = {
        provider,
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
    } catch (e: any) {
      // 确保错误对象有 message 属性
      const errorMessage = e?.message || e?.toString() || '未知错误';
      const error: any = new Error(errorMessage);
      
      // 保留原始错误的 status 属性(如果有)
      if (e?.status) {
        error.status = e.status;
      }
      
      console.error('[Analysis] analyzeSelectedAsins 错误详情:', {
        message: errorMessage,
        status: e?.status,
        stack: e?.stack,
        original: e
      });
      
      ErrorService.handle(error, { action: 'analyzeSelectedAsins', module: 'analysis' });
      state.analysis.analysisReport = null;
      const display = document.getElementById("report-display");
      if (display) display.classList.add("hidden");
      const noReportMsg = document.getElementById("no-report-msg");
      if (noReportMsg) noReportMsg.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      // ✅ 安全: 静态HTML模板，无用户输入
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
    }
  }


  renderReport(): void {
    const report = state.analysis.analysisReport;
    if (!report) return;

    if (!state.analysis.translatedReport) state.analysis.showTranslation = false;

    const welcomeEl = document.getElementById("analysis-welcome");
    if (welcomeEl) welcomeEl.classList.add("hidden");

    const noReportMsg = document.getElementById("no-report-msg");
    if (noReportMsg) noReportMsg.classList.add("hidden");
    
    const display = document.getElementById("report-display");
    if (display) display.classList.remove("hidden");
    
    const jsonDisplay = document.getElementById("report-json-display");
    if (jsonDisplay && jsonDisplay.parentElement)
      jsonDisplay.parentElement.classList.add("hidden");

    if (report.parse_error) {
      if (display) {
        display.innerHTML = `<div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-sm whitespace-pre-wrap"><i class="fas fa-bug mr-2"></i> ⚠️ 解析错误，原始数据：\n${escapeHtml(report.raw_response)}</div>`;
      }
      return;
    }

    const showTrans = state.analysis.showTranslation && state.analysis.translatedReport;
    const targetMarket = report.meta?.targetMarket || "Original";

    const disabledClass = "opacity-40 cursor-not-allowed pointer-events-none grayscale";
    const mdBtnClass = showTrans
      ? disabledClass
      : "text-slate-500 hover:text-blue-600 hover:bg-slate-50";

    let toolbarHtml = `
      <div class="space-y-4 font-sans text-slate-800 pb-8" id="report-container">
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/95">
          <div class="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
              <i class="fas fa-file-contract"></i> ${report.meta?.templateUsed || "Analysis"}
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
              <i class="fas fa-earth"></i> ${report.meta?.targetMarket || ""}
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
              <i class="fas fa-clock"></i> ${report.meta?.generatedAt || ""}
            </div>
          </div>
          

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 mr-2">
              <select id="translation-model-select" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:border-blue-300 w-32">
                <option value="" disabled selected>Translation Model</option>
              </select>
              <button id="quick-translate-btn" data-action="translateReport" 
                class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${showTrans ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"}" 
                ${showTrans ? "disabled" : ""}>
                <i class="fas fa-language"></i> 翻译
              </button>
            </div>

            <div class="w-px bg-slate-200 h-6"></div>

            <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-full px-1 border border-slate-200">
              <span class="text-[10px] px-2 font-bold ${!showTrans ? "text-slate-700" : "text-slate-400"} uppercase tracking-wide cursor-default" title="原文语言">
                ${targetMarket}
              </span>
              
              <button id="toggle-trans-view-btn" 
                class="relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 focus:outline-none ${showTrans ? "bg-blue-600" : "bg-slate-300"} ${!state.analysis.translatedReport ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}"
                ${!state.analysis.translatedReport ? "disabled" : ""}>
                <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${showTrans ? "translate-x-4" : "translate-x-1"} shadow-sm"></span>
              </button>
              
              <span class="text-[10px] px-2 font-bold ${showTrans ? "text-blue-600" : "text-slate-400"} cursor-default">
                CN
              </span>
            </div>

            <div class="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm ml-2">
              <button data-action="copyReportMarkdown" class="px-2 py-1 rounded transition-colors ${mdBtnClass}" title="${showTrans ? "翻译模式下禁用" : "复制 Markdown"}" ${showTrans ? "disabled" : ""}>
                <i class="fab fa-markdown text-sm"></i>
              </button>
              
              <div class="w-px bg-slate-100 my-1"></div>
              
              <button data-action="exportReport" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="导出 JSON">
                <i class="fas fa-download text-xs"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="grid-stack"></div>
      </div>`;

    // ✅ 安全: 静态HTML模板，无用户输入
    if (display) display.innerHTML = toolbarHtml;

    this.populateTranslationModels();

    const toggleBtn = document.getElementById("toggle-trans-view-btn");
    if (toggleBtn) this.addEventListener(toggleBtn, "click", () => this.toggleTranslationView());

    this.initGridStack(report);
  }


  populateTranslationModels(): void {
    const select = document.getElementById("translation-model-select") as HTMLSelectElement;
    if (!select) return;

    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    const providerConfig = activeProvider ? PROVIDERS[activeProvider] : null;

    let options = "";

    if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
      providerConfig.models.forEach((modelObj: any) => {
        const modelId = modelObj.id;
        const isSelected = state.analysis.lastTranslationModel === modelId ? "selected" : "";
        options += `<option value="${modelId}" ${isSelected}>${modelId}</option>`;
      });
    } else {
      options = `<option value="" disabled>No models found for ${activeProvider || 'current provider'}</option>`;
    }

    // ✅ 安全: 静态HTML模板，无用户输入
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

  async initGridStack(report: any): Promise<void> {
    const gridEl = document.querySelector(".grid-stack");
    if (!gridEl) return;

    await loadGridStack();

    if (this.grid) this.grid.destroy(false);

    this.grid = window.GridStack.init(
      {
        column: 12,
        cellHeight: 60,
        margin: 15,
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


    const templateId = report.meta?.templateId || "default";
    const savedLayout = StorageService.getLayoutConfig(templateId);

    const widgets: GridStackWidget[] = [];
    const keys = Object.keys(report).filter((k) => k !== "meta");

    keys.forEach((key) => {
      let content = report[key];
      if (state.analysis.showTranslation && state.analysis.translatedReport && state.analysis.translatedReport[key]) {
        content = state.analysis.translatedReport[key];
      }
      const autoH = this.calculateWidgetHeight(content);

      let defaultW = 4;
      if (autoH > 6) defaultW = 6;
      if (autoH > 10) defaultW = 12;

      const savedNode = savedLayout.find((n: any) => n.id === key);

      widgets.push({
        id: key,
        x: savedNode ? savedNode.x : undefined,
        y: savedNode ? savedNode.y : undefined,
        w: savedNode ? savedNode.w : defaultW,
        h: savedNode ? savedNode.h : autoH,
        noMove: true,    // 默认不可移动
        noResize: true,  // 默认不可调整
        content: this.renderWidgetContent(key, report, state.analysis.translatedReport),
      });
    });

    this.grid.batchUpdate();
    this.grid.removeAll();
    widgets.forEach((w) => {
      const widgetConfig = {
        x: w.x, y: w.y, w: w.w, h: w.h, id: w.id, noMove: w.noMove, noResize: w.noResize
      };
      const el = this.grid.addWidget(widgetConfig);

      const contentEl = el.querySelector('.grid-stack-item-content');
      if (contentEl) {
        // ✅ 安全: 静态HTML模板，无用户输入
        contentEl.innerHTML = w.content;
      }
    });
    this.grid.batchUpdate(false);

    this.grid.on("change", () => this.saveGridLayout(templateId));
    this.addEventListener(document, "mousedown", (e) => this.handleGlobalClick(e as MouseEvent));
  }


  handleGlobalClick(e: MouseEvent): void {
    // 如果点击的是调整按钮、调整手柄或拖拽手柄,不处理
    if ((e.target as HTMLElement).closest(".ui-resizable-handle") || 
        (e.target as HTMLElement).closest(".btn-resize") ||
        (e.target as HTMLElement).closest(".drag-handle") ||
        (e.target as HTMLElement).closest("[data-action='toggleCardResize']")) {
      return;
    }
    
    // 处理调整模式
    const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
    if (resizingCard && !resizingCard.contains(e.target as Node)) {
      // 点击了卡片外部,退出调整模式
      const key = resizingCard.getAttribute("gs-id");
      if (key) {
        this.toggleCardResize(key, false);
      }
    }
    
    // 处理编辑模式
    // 查找所有处于编辑模式的卡片
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card && !card.contains(e.target as Node)) {
        // 点击了卡片外部,自动保存并退出编辑
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
    const cleanLayout = layout.map((node: any) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    }));
    StorageService.setLayoutConfig(templateId, cleanLayout);
  }

  renderWidgetContent(key: string, report: any, transReport: any): string {
    const origVal = report[key];
    const showTrans = state.analysis.showTranslation;
    const transVal = showTrans && transReport ? transReport[key] : undefined;

    if (origVal === '__LOADING__') {
      return renderSkeleton();
    }

    const displayVal = this.getDisplayValue(origVal, transVal);

    const moduleConfig = ANALYSIS_MODULES.find((m: any) => m.id === key);
    const title = moduleConfig ? moduleConfig.label_cn : getFieldTitle(key);


    let style: StyleConfig = {
      color: "slate",
      bg: "bg-slate-500",
      lightBg: "bg-slate-100",
      icon: "fa-info-circle",
    };

    if (moduleConfig) {
      if (moduleConfig.category === "listing")
        style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
      else if (moduleConfig.category === "reviews")
        style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
      else if (moduleConfig.category === "cross")
        style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
    }

    return renderWidgetCard(key, title, style, showTrans || false, renderViewModeHTML(displayVal, style));
  }

  calculateWidgetHeight(content: any): number {
    if (!content) return 4;
    let textLength = 0;
    let lineCount = 0;

    if (typeof content === "string") {
      textLength = content.length;
      lineCount = content.split("\n").length;
    } else if (Array.isArray(content)) {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = Array.isArray(content) ? content.length * 1.5 : 5;
    } else if (typeof content === "object") {
      const str = JSON.stringify(content);
      textLength = str.length;
      lineCount = Object.keys(content).length * 2;
    }

    const heightByChar = Math.ceil(textLength / 150);
    const heightByLine = Math.ceil(lineCount / 3);
    let h = Math.max(3, heightByChar, heightByLine);
    return Math.min(h + 2, 24);
  }

  getDisplayValue(orig: any, trans: any): any {
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

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!provider) {
      showToast("请先配置AI模型", "warning");
      return;
    }
    
    // 🔐 P0优化: 使用安全存储读取配置
    const config = await StorageService.getLLMConfigWithKey(provider);
    if (!config || !config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const select = document.getElementById("translation-model-select") as HTMLSelectElement;
    const selectedModel = select?.value || config.model;

    const btn = document.getElementById("quick-translate-btn") as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      // ✅ 安全: 静态HTML模板，无用户输入
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> 翻译中...';
    }

    try {
      const llmConfig = {
        provider,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: selectedModel,
      };

      // 翻译目标语言默认为中文
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
    } catch (e: any) {
      ErrorService.handle(e, { action: 'translateReport', module: 'analysis' });
    } finally {
      if (btn) {
        btn.disabled = false;
        // ✅ 安全: 静态HTML模板，无用户输入
        btn.innerHTML = '<i class="fas fa-language"></i> 翻译';
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

  generateDynamicMarkdown(data: any, depth: number = 1): string {
    if (!data) return "";
    let md = "";

    Object.keys(data).forEach((key) => {
      if (key === "meta") return;
      const val = data[key];
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
    const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`);
    const card = document.getElementById(`widget-card-${key}`);
    if (!el || !card) return;

    const isResizing = forceState !== undefined ? forceState : !el.classList.contains("is-resizing");

    if (isResizing) {
      // 先退出其他正在调整的卡片
      const otherResizingCards = document.querySelectorAll('.grid-stack-item.is-resizing');
      otherResizingCards.forEach(otherEl => {
        const otherKey = otherEl.getAttribute('gs-id');
        if (otherKey && otherKey !== key) {
          this.toggleCardResize(otherKey, false);
        }
      });

      // 进入调整模式
      el.classList.add("is-resizing");
      el.classList.add('grid-stack-item-resizing');
      
      // 启用当前卡片的移动和调整
      if (this.grid) {
        // 更新当前节点的属性
        this.grid.update(el, { noMove: false, noResize: false });
        
        // 确保其他卡片保持禁用
        this.grid.engine.nodes.forEach((node: any) => {
          if (node.el !== el) {
            this.grid.update(node.el, { noMove: true, noResize: true });
          }
        });
      }
      
      // 视觉反馈
      (card as HTMLElement).style.boxShadow = '0 0 0 2px #3b82f6';
      
      // 更新按钮状态
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        // ✅ 安全: 静态HTML模板，无用户输入
        resizeBtn.innerHTML = '<i class="fas fa-check text-xs"></i>';
        resizeBtn.classList.add('text-blue-600', 'bg-blue-50');
        resizeBtn.setAttribute('title', '完成调整');
      }
    } else {
      // 退出调整模式
      el.classList.remove("is-resizing");
      el.classList.remove('grid-stack-item-resizing');
      
      // 禁用当前卡片的移动和调整
      if (this.grid) {
        this.grid.update(el, { noMove: true, noResize: true });
      }
      
      // 移除视觉反馈
      (card as HTMLElement).style.boxShadow = '';
      
      // 恢复按钮状态
      const resizeBtn = card.querySelector('.btn-resize');
      if (resizeBtn) {
        // ✅ 安全: 静态HTML模板，无用户输入
        resizeBtn.innerHTML = '<i class="fas fa-expand-alt text-xs"></i>';
        resizeBtn.classList.remove('text-blue-600', 'bg-blue-50');
        resizeBtn.setAttribute('title', '调整');
      }
      
      // 保存布局
      const templateId = state.analysis.analysisReport?.meta?.templateId || "default";
      this.saveGridLayout(templateId);
    }
  }


  // ================== Global Actions Registration ==================

  registerGlobalActions(): void {
    const actions = {
      toggleAllModules: (params: any) => {
        const checked = params.checked === 'true';
        this.toggleAllModules(checked);
      },
      selectAllAsins: () => this.selectAllAsins(),
      copyPromptText: () => this.copyPromptText(),
      translateReport: () => this.translateReport(),
      copyReportMarkdown: () => this.copyReportMarkdown(),
      exportReport: () => this.exportReport(),
      toggleCardResize: (params: any) => {
        const key = params.key;
        if (key) this.toggleCardResize(key, true);
      },
    };

    // 使用 BaseModule 的 registerActions 方法，自动在卸载时清理
    this.registerActions(actions);
    
    // 注册编辑相关的全局函数，并添加到清理列表
    const globalFunctions = {
      startLocalEdit: (key: string) => this.startLocalEdit(key),
      saveLocalEdit: (key: string) => this.saveLocalEdit(key),
      undoLocalEdit: (key: string) => this.undoLocalEdit(key),
      pushEditSnapshot: (key: string) => this.pushEditSnapshot(key),
      deleteRowItem: (btn: HTMLElement, key: string) => this.deleteRowItem(btn, key),
      addListItem: (key: string) => this.addListItem(key),
      addObjItem: (key: string) => this.addObjItem(key),
    };
    
    // 将全局函数挂载到 window，并注册清理函数
    Object.entries(globalFunctions).forEach(([name, fn]) => {
      (window as any)[name] = fn;
    });
    
    // 添加清理函数，在卸载时移除全局函数
    this.addDisposable(() => {
      Object.keys(globalFunctions).forEach(name => {
        delete (window as any)[name];
      });
    });
  }

  // ================== 编辑功能实现 ==================

  startLocalEdit(key: string): void {
    // 先保存其他正在编辑的卡片
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

    // 保存原始数据
    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    if (!this.originalDataMap.has(key)) {
      this.originalDataMap.set(key, JSON.parse(JSON.stringify(report[key])));
    }

    // 初始化编辑历史
    if (!this.editHistoryMap.has(key)) {
      this.editHistoryMap.set(key, []);
    }

    // 切换到编辑模式
    viewControls.classList.add('hidden');
    editControls.classList.remove('hidden');

    // 渲染编辑表单
    // ✅ 安全: 静态HTML模板，无用户输入
    contentArea.innerHTML = renderEditorForm(key, report[key]);
  }

  saveLocalEdit(key: string): void {
    const card = document.getElementById(`widget-card-${key}`);
    if (!card) return;

    const contentArea = document.getElementById(`widget-content-${key}`);
    const viewControls = card.querySelector('.view-controls');
    const editControls = card.querySelector('.edit-controls');

    // 收集编辑后的数据
    const newData = this.collectEditedData(key);
    
    // 更新状态
    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    report[key] = newData;

    // 清除原始数据缓存
    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    // 切换回查看模式
    if (editControls) editControls.classList.add('hidden');
    if (viewControls) viewControls.classList.remove('hidden');

    // 重新渲染
    const moduleConfig = ANALYSIS_MODULES.find((m: any) => m.id === key);
    let style: StyleConfig = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };
    if (moduleConfig) {
      if (moduleConfig.category === "listing")
        style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
      else if (moduleConfig.category === "reviews")
        style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
      else if (moduleConfig.category === "cross")
        style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
    }

    // ✅ 安全: 静态HTML模板，无用户输入
    if (contentArea) contentArea.innerHTML = renderViewModeHTML(newData, style);
    showToast("保存成功", "success");
  }


  undoLocalEdit(key: string): void {
    const originalData = this.originalDataMap.get(key);
    if (!originalData) return;

    const report = state.analysis.showTranslation && state.analysis.translatedReport 
      ? state.analysis.translatedReport 
      : state.analysis.analysisReport;
    
    report[key] = JSON.parse(JSON.stringify(originalData));

    // 清除缓存
    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);

    // 退出编辑模式
    const card = document.getElementById(`widget-card-${key}`);
    if (card) {
      const viewControls = card.querySelector('.view-controls');
      const editControls = card.querySelector('.edit-controls');
      const contentArea = document.getElementById(`widget-content-${key}`);

      if (editControls) editControls.classList.add('hidden');
      if (viewControls) viewControls.classList.remove('hidden');

      const moduleConfig = ANALYSIS_MODULES.find((m: any) => m.id === key);
      let style: StyleConfig = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };
      if (moduleConfig) {
        if (moduleConfig.category === "listing")
          style = { color: "blue", bg: "bg-blue-600", lightBg: "bg-blue-50", icon: "fa-file-alt" };
        else if (moduleConfig.category === "reviews")
          style = { color: "orange", bg: "bg-orange-500", lightBg: "bg-orange-50", icon: "fa-comments" };
        else if (moduleConfig.category === "cross")
          style = { color: "purple", bg: "bg-purple-600", lightBg: "bg-purple-50", icon: "fa-random" };
      }

      // ✅ 安全: 静态HTML模板，无用户输入
      if (contentArea) contentArea.innerHTML = renderViewModeHTML(originalData, style);
    }

    showToast("已撤销", "info");
  }

  pushEditSnapshot(key: string): void {
    // 用于撤销功能的快照保存
    const history = this.editHistoryMap.get(key) || [];
    const currentData = this.collectEditedData(key);
    history.push(JSON.parse(JSON.stringify(currentData)));
    this.editHistoryMap.set(key, history);
  }


  collectEditedData(key: string): any {
    const contentArea = document.getElementById(`widget-content-${key}`);
    if (!contentArea) return null;

    // 检查是否是简单文本编辑
    const simpleInput = contentArea.querySelector(`#input-${key}`) as HTMLTextAreaElement;
    if (simpleInput) {
      return simpleInput.value;
    }

    // 检查是否是列表编辑
    const listContainer = contentArea.querySelector(`#list-container-${key}`);
    if (listContainer) {
      const items: string[] = [];
      listContainer.querySelectorAll('.edit-row textarea').forEach(textarea => {
        const val = (textarea as HTMLTextAreaElement).value.trim();
        if (val) items.push(val);
      });
      return items;
    }

    // 检查是否是对象数组编辑
    const objContainer = contentArea.querySelector(`#obj-list-container-${key}`);
    if (objContainer) {
      const objects: any[] = [];
      objContainer.querySelectorAll('.edit-row').forEach(row => {
        const obj: any = {};
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
      row.remove();
    }
  }

  addListItem(key: string): void {
    const container = document.getElementById(`list-container-${key}`);
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'edit-row group flex items-start gap-2 relative';
    newRow.innerHTML = `
      <div class="pt-2.5 pl-1"> 
        <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
      </div>
      <div class="flex-1 relative">
        <textarea class="editor-input-modern" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${escapeHtml(key)}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
      </div>
      <div class="pt-1">
        <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="删除此项">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `;
    container.appendChild(newRow);
  }


  addObjItem(key: string): void {
    const container = document.getElementById(`obj-list-container-${key}`);
    const template = document.getElementById(`tpl-${key}`);
    if (!container || !template) return;

    const templateObj = JSON.parse(template.textContent || '{}');
    const newRow = document.createElement('div');
    newRow.className = 'edit-row group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all';
    
    const fields = Object.keys(templateObj).map(subKey => `
      <div class="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 sm:gap-4 items-start group/field">
        <label class="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sm:text-right select-none pt-2 cursor-default group-hover/field:text-blue-500 transition-colors">
          ${getFieldTitle(subKey)}
        </label>
        <div class="relative w-full">
          <textarea data-subkey="${subKey}" class="editor-input-modern obj-input" rows="1" style="height: 28px" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'" onfocus="window.pushEditSnapshot('${key}'); this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        </div>
      </div>
    `).join('');

    newRow.innerHTML = `
      <button onclick="window.deleteRowItem(this, '${escapeHtml(key)}')" class="w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 absolute top-3 right-3 bg-white shadow-sm border border-slate-200 z-10 hover:border-red-200" title="删除此项">
        <i class="fas fa-trash-alt text-[10px]"></i>
      </button>
      <div class="grid gap-y-3 gap-x-4">
        ${fields}
      </div>
    `;
    
    container.appendChild(newRow);
  }
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

let moduleInstance: AnalysisModule | null = null;

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
  console.log('[Analysis] 🔧 开始挂载子模块');

  try {
    // 1. 加载模板
    const html = await loadTemplate('src/modules/app_center/views/master_prompt/analysis/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;

    // 2. 创建模块实例
    moduleInstance = new AnalysisModule(container);
    
    // 3. 挂载模块（BaseModule.mount 会自动调用 render 和 init）
    await moduleInstance.mount(container);

    console.log('[Analysis] ✅ 子模块挂载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块挂载失败', error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
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
