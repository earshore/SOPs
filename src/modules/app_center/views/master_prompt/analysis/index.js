/**
 * Analysis 子模块
 * 负责 AI 分析功能
 * 
 * 架构说明：
 * - 继承 BaseModule 实现生命周期管理
 * - 状态保存到 state.analysis 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 职责分离：PromptBuilder、GridManager、EditManager
 */

import { escapeHtml } from '@/common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import BaseModule from "../../../../../common/BaseModule";
import state from "../../../../../common/state";
import { PROVIDERS, LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { ANALYSIS_MODULES } from '../constants/prompts.ts';
import { showToast } from '../../../../../common/ui';
import { HistoryService } from '../services/historyService.ts';
import { renderHistory } from '../scraper/index.ts';
import { AnalysisService } from '../services/analysisService.ts';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService.ts';
import { ErrorService } from '../../../../../services/errorService';
import { renderWidgetCard, renderViewModeHTML, renderSkeleton } from './renderer.js';
import eventBus from '../../../../../common/EventBus.ts';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants';

// 导入管理器
import { PromptBuilder } from './promptBuilder.js';
import { GridManager } from './gridManager.js';
import { EditManager } from './editManager.js';

import '../master_prompt_style.css';

// ========================================== 
// Analysis Module Class
// ========================================== 

class AnalysisModule extends BaseModule {
  constructor(container) {
    super('master_prompt_analysis');
    this.container = container;
    
    // 初始化管理器
    this.promptBuilder = new PromptBuilder(this);
    this.gridManager = new GridManager(this);
    this.editManager = new EditManager(this);
    
    this.registerGlobalActions();
  }

  async render() {
    // render() 方法�?BaseModule 要求实现
    // 但在这个模块中，HTML 已经�?mount() 函数中加�?
  }

  async init() {
    console.log("🚀 Analysis Module Initialized (BaseModule)");

    // 1. UI Initialization
    this.setupUI();

    // 订阅 Scraper 事件
    this.addDisposable(eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
      console.log("AnalysisModule received SCRAPE_SUCCESS");
      if (state.scraper.scrapedData && state.scraper.scrapedData.products) {
        state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p) => p.asin);
      }
      this.updateAsinSelectList();
    }));

    // 初始加载现有数据
    if (state.scraper.scrapedData) {
      if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
        if (state.scraper.scrapedData.products) {
          state.analysis.selectedAsins = state.scraper.scrapedData.products.map((p) => p.asin);
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
      this.addEventListener(document.getElementById("opt-listing"), "change", () => {
        this.updateSourceVisuals();
        this.updateModuleListVisibility();
        this.promptBuilder.updatePromptPreview();
      });
      this.addEventListener(document.getElementById("opt-reviews"), "change", () => {
        this.updateSourceVisuals();
        this.updateModuleListVisibility();
        this.promptBuilder.updatePromptPreview();
      });
    }

    // 3. 恢复视图（如果报告存在）
    if (state.analysis.analysisReport) {
      this.renderReport();
    }
  }

  onUnmount() {
    console.log("💤 Analysis Module Unmounting...");
    if (this.gridManager) {
      this.gridManager.destroy();
    }
    if (this.editManager) {
      this.editManager.cleanup();
    }
    // BaseModule 自动处理事件监听器清理
  }


  // ================== UI Setup ==================

  setupUI() {
    this.renderModuleSelector();
    this.promptBuilder.renderPromptPreviewArea();
  }

  renderModuleSelector() {
    this.renderSourceToggle();
    this.renderModuleCheckboxes();
    this.updateModuleListVisibility();
    this.updateSourceVisuals();
    this.setTimeout(() => this.promptBuilder.updatePromptPreview(), 100);
  }

  renderSourceToggle() {
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

  updateSourceVisuals() {
    const updateStyle = (inputId, labelId) => {
      const input = document.getElementById(inputId);
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


  renderModuleCheckboxes() {
    const container = document.getElementById("modules-container");
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = ANALYSIS_MODULES.map(
      (mod) => `
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
      this.addEventListener(checkbox, 'change', () => {
        this.promptBuilder.updatePromptPreview();
      });
    });
  }

  updateModuleListVisibility() {
    const showListing = document.getElementById("opt-listing")?.checked;
    const showReviews = document.getElementById("opt-reviews")?.checked;
    const items = document.querySelectorAll(".module-item");

    items.forEach((item) => {
      const cat = item.dataset.category;
      let visible = false;

      if (cat === "listing" && showListing) visible = true;
      if (cat === "reviews" && showReviews) visible = true;
      if (cat === "cross" && showListing && showReviews) visible = true;

      if (visible) {
        item.classList.remove("hidden");
      } else {
        item.classList.add("hidden");
        const checkbox = item.querySelector("input");
        if (checkbox) checkbox.checked = false;
      }
    });
  }

  toggleAllModules(checked) {
    const inputs = document.querySelectorAll('#modules-container input[type="checkbox"]');
    inputs.forEach((input) => {
      if (!input.closest(".module-item").classList.contains("hidden")) {
        input.checked = checked;
      }
    });
    this.promptBuilder.updatePromptPreview();
  }


  updateAsinSelectList() {
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
    container.innerHTML = state.scraper.scrapedData.products.map((p) => {
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
      this.addEventListener(checkbox, 'change', (e) => {
        const asin = e.target.value;
        if (e.target.checked) {
          if (!state.analysis.selectedAsins.includes(asin)) {
            state.analysis.selectedAsins.push(asin);
          }
        } else {
          state.analysis.selectedAsins = state.analysis.selectedAsins.filter(a => a !== asin);
        }
      });
    });
  }

  selectAllAsins() {
    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products) return;
    state.analysis.selectedAsins = state.scraper.scrapedData.products.map(p => p.asin);
    this.updateAsinSelectList();
  }

  // ================== Core Analysis Logic ==================

  async analyzeSelectedAsins() {
    if (!state.analysis.selectedAsins || state.analysis.selectedAsins.length === 0) {
      showToast("请先选择要分析的 ASIN", "warning");
      return;
    }

    const currentPrompt = this.promptBuilder.buildDynamicPrompt();
    if (!currentPrompt) {
      showToast("请至少勾选一个分析目标", "warning");
      return;
    }

    const isListingSelected = document.getElementById("opt-listing")?.checked;
    const isReviewsSelected = document.getElementById("opt-reviews")?.checked;

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

    const btn = document.getElementById("analyze-btn");
    btn.disabled = true;
    // ✅ 安全: 静态HTML模板，无用户输入
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中..';

    // 渲染骨架屏状�?
    const loadingReport = {};
    const selectedCheckboxes = document.querySelectorAll('input[name="analysis_module"]:checked');
    selectedCheckboxes.forEach((cb) => {
      loadingReport[cb.value] = '__LOADING__';
    });

    loadingReport.meta = {
      targetMarket: "Analyze...",
      generatedByModel: config.model,
      generatedAt: "Pending...",
      templateUsed: "Dynamic Analysis",
    };

    state.analysis.analysisReport = loadingReport;
    this.renderReport();

    const selectedProducts = state.scraper.scrapedData.products.filter((p) => state.analysis.selectedAsins.includes(p.asin));
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
    } catch (e) {
      // 确保错误对象有 message 属性
      const errorMessage = e?.message || e?.toString() || '未知错误';
      const error = new Error(errorMessage);
      
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


  renderReport() {
    const report = state.analysis.analysisReport;
    if (!report) {
      const noReportMsg = document.getElementById("no-report-msg");
      if (noReportMsg) noReportMsg.classList.remove("hidden");
      
      const display = document.getElementById("report-display");
      if (display) display.classList.add("hidden");
      
      return;
    }

    if (!state.analysis.translatedReport) state.analysis.showTranslation = false;

    document.getElementById("no-report-msg").classList.add("hidden");
    const display = document.getElementById("report-display");
    display.classList.remove("hidden");
    const jsonDisplay = document.getElementById("report-json-display");
    if (jsonDisplay && jsonDisplay.parentElement)
      jsonDisplay.parentElement.classList.add("hidden");

    if (report.parse_error) {
      display.innerHTML = `<div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-sm whitespace-pre-wrap"><i class="fas fa-bug mr-2"></i> ⚠️ 解析错误，原始数据：\n${escapeHtml(report.raw_response)}</div>`;
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
              </button>
            </div>
          </div>
        </div>
        
        <div class="grid-stack"></div>
      </div>`;

    // ✅ 安全: 静态HTML模板，无用户输入
    display.innerHTML = toolbarHtml;

    this.populateTranslationModels();

    const toggleBtn = document.getElementById("toggle-trans-view-btn");
    if (toggleBtn) this.addEventListener(toggleBtn, "click", () => this.toggleTranslationView());

    this.gridManager.initGridStack(report);
  }

  populateTranslationModels() {
    const select = document.getElementById("translation-model-select");
    if (!select) return;

    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    const providerConfig = activeProvider ? PROVIDERS[activeProvider] : null;

    let options = "";

    if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
      providerConfig.models.forEach(modelObj => {
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
      } else if (select.options.length > 0 && !select.options[0].disabled) {
        select.value = select.options[0].value;
        state.analysis.lastTranslationModel = select.value;
      }
    } else if (select.options.length > 0 && !select.options[0].disabled) {
      select.value = select.options[0].value;
    }

    select.onchange = (e) => {
      state.analysis.lastTranslationModel = e.target.value;
    };
  }


  handleGlobalClick(e) {
    // 如果点击的是调整按钮、调整手柄或拖拽手柄,不处理
    if (e.target.closest(".ui-resizable-handle") || 
        e.target.closest(".btn-resize") ||
        e.target.closest(".drag-handle") ||
        e.target.closest("[data-action='toggleCardResize']")) {
      return;
    }
    
    // 处理调整模式
    const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
    if (resizingCard && !resizingCard.contains(e.target)) {
      // 点击了卡片外部,退出调整模式
      const key = resizingCard.getAttribute("gs-id");
      if (key) {
        this.gridManager.toggleCardResize(key, false);
      }
    }
    
    // 处理编辑模式
    // 查找所有处于编辑模式的卡片
    const editingCards = document.querySelectorAll('.widget-card-container .edit-controls:not(.hidden)');
    editingCards.forEach(editControls => {
      const card = editControls.closest('.widget-card-container');
      if (card && !card.contains(e.target)) {
        // 点击了卡片外部,自动保存并退出编辑
        const cardId = card.id.replace('widget-card-', '');
        if (cardId) {
          this.editManager.saveLocalEdit(cardId);
        }
      }
    });
  }

  renderWidgetContent(key, report, transReport) {
    const origVal = report[key];
    const showTrans = state.analysis.showTranslation;
    const transVal = showTrans && transReport ? transReport[key] : undefined;

    if (origVal === '__LOADING__') {
      return renderSkeleton();
    }

    const displayVal = this.getDisplayValue(origVal, transVal);

    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    const title = moduleConfig ? moduleConfig.label_cn : key;

    let style = {
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

    return renderWidgetCard(key, title, style, showTrans, renderViewModeHTML(displayVal, style));
  }

  getDisplayValue(orig, trans) {
    return state.analysis.showTranslation && trans !== undefined && trans !== null ? trans : orig;
  }

  // ================== Actions / Methods ==================

  toggleTranslationView() {
    state.analysis.showTranslation = !state.analysis.showTranslation;
    this.renderReport();
  }

  async translateReport() {
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

    const select = document.getElementById("translation-model-select");
    const selectedModel = select?.value || config.model;

    const btn = document.getElementById("quick-translate-btn");
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
    } catch (e) {
      ErrorService.handle(e, { action: 'translateReport', module: 'analysis' });
    } finally {
      if (btn) {
        btn.disabled = false;
        // ✅ 安全: 静态HTML模板，无用户输入
        btn.innerHTML = '<i class="fas fa-language"></i> 翻译';
      }
    }
  }

  copyReportMarkdown() {
    if (!state.analysis.analysisReport) {
      showToast("暂无报告", "warning");
      return;
    }

    let md = `# Analysis Report\n\n`;
    md += this.generateDynamicMarkdown(state.analysis.analysisReport);
    navigator.clipboard.writeText(md);
    showToast("Markdown 已复制", "success");
  }

  generateDynamicMarkdown(data, depth = 1) {
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

  exportReport() {
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

  // ================== Grid 功能委托 ==================
  
  toggleCardResize(key, forceState) {
    this.gridManager.toggleCardResize(key, forceState);
  }

  // ================== Global Actions Registration ==================

  registerGlobalActions() {
    const actions = {
      toggleAllModules: (params) => {
        const checked = params.checked === 'true';
        this.toggleAllModules(checked);
      },
      selectAllAsins: () => this.selectAllAsins(),
      copyPromptText: () => this.promptBuilder.copyPromptText(),
      translateReport: () => this.translateReport(),
      copyReportMarkdown: () => this.copyReportMarkdown(),
      exportReport: () => this.exportReport(),
      toggleCardResize: (params) => {
        const key = params.key;
        if (key) this.gridManager.toggleCardResize(key, true);
      },
    };

    // 使用 BaseModule 的 registerActions 方法，自动在卸载时清理
    this.registerActions(actions);
    
    // 注册编辑相关的全局函数，并添加到清理列表
    const globalFunctions = {
      startLocalEdit: (key) => this.startLocalEdit(key),
      saveLocalEdit: (key) => this.saveLocalEdit(key),
      undoLocalEdit: (key) => this.undoLocalEdit(key),
      pushEditSnapshot: (key) => this.pushEditSnapshot(key),
      deleteRowItem: (btn, key) => this.deleteRowItem(btn, key),
      addListItem: (key) => this.addListItem(key),
      addObjItem: (key) => this.addObjItem(key),
    };
    
    // 将全局函数挂载到 window，并注册清理函数
    Object.entries(globalFunctions).forEach(([name, fn]) => {
      window[name] = fn;
    });
    
    // 添加清理函数，在卸载时移除全局函数
    this.addDisposable(() => {
      Object.keys(globalFunctions).forEach(name => {
        delete window[name];
      });
    });
  }

  // ================== 编辑功能委托 ==================
  // 这些方法委托给 EditManager 处理
  
  startLocalEdit(key) {
    this.editManager.startLocalEdit(key);
  }

  saveLocalEdit(key) {
    this.editManager.saveLocalEdit(key);
  }

  undoLocalEdit(key) {
    this.editManager.undoLocalEdit(key);
  }

  pushEditSnapshot(key) {
    this.editManager.pushEditSnapshot(key);
  }

  deleteRowItem(btn, key) {
    this.editManager.deleteRowItem(btn, key);
  }

  addListItem(key) {
    this.editManager.addListItem(key);
  }

  addObjItem(key) {
    this.editManager.addObjItem(key);
  }
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

let moduleInstance = null;

/**
 * 挂载子模�?
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
  console.log('[Analysis] 🔧 开始挂载子模块');

  try {
    // 1. 加载模板
    const html = await loadTemplate('src/modules/app_center/views/master_prompt/analysis/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;

    // 2. 创建模块实例
    moduleInstance = new AnalysisModule(container);
    
    // 3. 初始化模块
    await moduleInstance.render();
    await moduleInstance.init();

    console.log('[Analysis] ✅ 子模块挂载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块挂载失败', error);
    throw error;
  }
}

/**
 * 卸载子模块
 */
export function unmount() {
  console.log('[Analysis] 🔄 开始卸载子模块');

  try {
    if (moduleInstance) {
      moduleInstance.onUnmount();
      // BaseModule 的 unmount() 方法会自动处理清理
      // 不需要手动调用 cleanup()
      moduleInstance = null;
    }

    console.log('[Analysis] ✅ 子模块卸载成功');
  } catch (error) {
    console.error('[Analysis] ❌ 子模块卸载失败', error);
  }
}