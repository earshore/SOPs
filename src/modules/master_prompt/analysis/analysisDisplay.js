// src/modules/master_prompt/analysis/analysisDisplay.js
import BaseModule from "../../../common/BaseModule.js";
import state from "../../../common/state.js";
import { PROVIDERS, LANGUAGE_HEADERS } from "../../../common/constants/constants.js";
import { ANALYSIS_MODULES, DYNAMIC_MASTER_TEMPLATE } from "../../../common/constants/prompts.js";
import { showToast, showProgress } from "../../../common/utils/ui.js";
import { HistoryService } from "../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { AnalysisService } from "./analysisService.js";
import { getFieldTitle } from "../promptlab/promptlabDisplay.js";
import { StorageService, STORAGE_KEYS } from "../../../services/storageService.js";
import { ErrorService } from "../../../services/errorService.js";
import { registerActionsWithLegacy } from "../../../common/utils/actionRegistry.js";
import { renderWidgetCard, renderViewModeHTML, renderEditorForm } from "./analysisRenderer.js";
import eventBus from "../../../common/EventBus.js"; // [NEW] Import EventBus
import { EVENTS } from "../../../common/constants/eventConstants.js";
import { loadGridStack } from "../../../common/utils/lazyLibs.js";

class AnalysisModule extends BaseModule {
  constructor() {
    super('master_prompt_analysis');
    this.grid = null;
    this.originalDataMap = new Map();
    this.editHistoryMap = new Map();
    this.registerGlobalActions();
  }

  async render() {
    // Assume HTML is preloaded.
  }

  async init() {
    console.log("🚀 Analysis Module Initialized (BaseModule)");

    // 1. UI Initialization
    this.setupUI();

    // [NEW] Subscribe to Scraper Events
    this.addDisposable(eventBus.on(EVENTS.SCRAPE_COMPLETE, () => {
      console.log("AnalysisModule received SCRAPE_COMPLETE");
      if (state.scrapedData && state.scrapedData.products) {
        state.selectedAsins = state.scrapedData.products.map((p) => p.asin);
      }
      this.updateAsinSelectList();
    }));

    // [FIX] Initial Load for existing data
    if (state.scrapedData) {
      if (!state.selectedAsins || state.selectedAsins.length === 0) {
        if (state.scrapedData.products) {
          state.selectedAsins = state.scrapedData.products.map((p) => p.asin);
        }
      }
      this.updateAsinSelectList();
    }

    // 2. Bind Events
    const analyzeBtn = document.getElementById("analyze-btn");
    if (analyzeBtn) {
      this.addEventListener(analyzeBtn, "click", () => this.analyzeSelectedAsins());
    }

    const transToggle = document.getElementById("opt-listing");
    if (transToggle) {
      // Source toggles
      this.addEventListener(document.getElementById("opt-listing"), "change", () => {
        this.updateModuleListVisibility();
        this.updatePromptPreview();
      });
      this.addEventListener(document.getElementById("opt-reviews"), "change", () => {
        this.updateModuleListVisibility();
        this.updatePromptPreview();
      });
    }

    // 3. Restore View if report exists
    if (state.analysisReport) {
      this.renderReport();
    }

    // 4. Register Global Actions (Proxies)
    // this.registerGlobalActions(); // Moved to constructor
  }

  onUnmount() {
    console.log("💤 Analysis Module Unmounting...");
    if (this.grid) {
      this.grid.destroy(false); // false: do not remove DOM elements, just events
      this.grid = null;
    }
    // BaseModule handles event listener cleanup
  }

  // ================== UI Setup ==================

  setupUI() {
    this.renderModuleSelector();
    this.renderPromptPreviewArea();
  }

  renderModuleSelector() {
    this.renderSourceToggle();
    this.renderModuleCheckboxes();
    this.updateModuleListVisibility();
    this.updateSourceVisuals();
    // Use arrow function for setTimeout to preserve 'this'
    this.setTimeout(() => this.updatePromptPreview(), 100);
  }

  renderSourceToggle() {
    const container = document.getElementById("source-toggle-container");
    if (!container) return;

    container.innerHTML = `
            <label id="lbl-opt-listing" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
                <input type="checkbox" id="opt-listing" checked class="hidden peer" onchange="window.updateSourceVisuals()">
                <i class="fas fa-file-alt text-xs opacity-70"></i>
                <span>Listings</span>
            </label>
            
            <label id="lbl-opt-reviews" class="flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-medium text-slate-500 border-slate-200 bg-white hover:border-blue-300">
                <input type="checkbox" id="opt-reviews" checked class="hidden peer" onchange="window.updateSourceVisuals()">
                <i class="fas fa-comments text-xs opacity-70"></i>
                <span>Reviews</span>
            </label>
        `;
    // Events are bound in init() or via global proxies for onchange="window.xxx"
  }

  updateSourceVisuals() {
    const updateStyle = (inputId, labelId) => {
      const input = document.getElementById(inputId);
      const label = document.getElementById(labelId);
      if (!input || !label) return;

      if (input.checked) {
        label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-regular bg-blue-50/50 border-blue-200 text-blue-700 shadow-sm`;
      } else {
        label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-regular bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300`;
      }
    };
    updateStyle("opt-listing", "lbl-opt-listing");
    updateStyle("opt-reviews", "lbl-opt-reviews");
  }

  renderModuleCheckboxes() {
    const container = document.getElementById("modules-container");
    if (!container) return;

    container.innerHTML = ANALYSIS_MODULES.map(
      (mod) => `
            <label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
                <div class="flex items-center pt-0.5">
                    <input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked onchange="window.updatePromptPreview()">
                </div>
                <div class="text-sm leading-tight flex-1 min-w-0">
                    <div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
                    <div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
                </div>
            </label>
        `
    ).join("");
  }

  updateModuleListVisibility() {
    const showListing = document.getElementById("opt-listing").checked;
    const showReviews = document.getElementById("opt-reviews").checked;
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
    this.updatePromptPreview();
  }

  openPromptModal() {
    const dynamicPrompt = this.buildDynamicPrompt();
    if (!dynamicPrompt) {
      showToast("请至少选择一个分析模块", "warning");
      return;
    }

    if (typeof window.renderPromptModal === 'function') {
      window.renderPromptModal();
    }

    const textarea = document.getElementById("current-prompt-display");
    if (textarea) textarea.value = dynamicPrompt;
  }

  // ================== Prompt Logic ==================

  renderPromptPreviewArea() {
    const reportContent = document.getElementById("report-content");
    if (!reportContent || document.getElementById("prompt-preview-container")) return;

    const previewDiv = document.createElement("div");
    previewDiv.id = "prompt-preview-container";
    previewDiv.className = "mb-6 hidden fade-in";

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
                        <button onclick="window.copyPromptText()" class="absolute top-2 right-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded transition-colors" title="复制 Prompt">
                            <i class="fas fa-copy text-xs"></i>
                        </button>
                    </div>
                </div>
            </details>
        `;

    reportContent.insertBefore(previewDiv, reportContent.firstChild);
  }

  updatePromptPreview() {
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

  copyPromptText() {
    const text = document.getElementById("live-prompt-code")?.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      showToast("Prompt 已复制", "success");
    }
  }

  buildDynamicPrompt() {
    const selectedCheckboxes = document.querySelectorAll('input[name="analysis_module"]:checked');
    if (selectedCheckboxes.length === 0) return null;

    const selectedModules = Array.from(selectedCheckboxes)
      .map((cb) => ANALYSIS_MODULES.find((m) => m.id === cb.value))
      .filter(Boolean);

    const tasksStr = selectedModules
      .map((m, index) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`)
      .join("\n");

    const schemaParts = selectedModules
      .map((m) => `  "${m.id}": ["..."]`)
      .join(",\n");

    return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace("{{dynamic_schema}}", schemaParts);
  }

  // ================== Core Analysis Logic ==================

  async analyzeSelectedAsins() {
    if (state.selectedAsins.length === 0) {
      showToast("请先选择要分析的 ASIN", "warning");
      return;
    }

    const currentPrompt = this.buildDynamicPrompt();
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
    const config = StorageService.getLLMConfig(provider) || {};
    if (!config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const btn = document.getElementById("analyze-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中...';
    showProgress(true, 30);

    const selectedProducts = state.scrapedData.products.filter((p) => state.selectedAsins.includes(p.asin));
    const site = state.scrapedData.metadata.marketplace;
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

      showProgress(true, 80);

      report.meta = {
        targetMarket: language,
        analyzedASINs: state.selectedAsins,
        generatedByModel: config.model,
        generatedAt: new Date().toISOString(),
        templateUsed: "Dynamic Analysis",
        dataScope: [
          isListingSelected ? "Listing" : "",
          isReviewsSelected ? "Reviews" : "",
        ].filter(Boolean),
      };

      state.analysisReport = report;
      state.translatedReport = null;
      state.showTranslation = false;
      state.editHistory = [JSON.stringify(report)];
      state.isEditing = false;

      HistoryService.save(state.scrapedData, report);
      renderHistory(); // Assuming renderHistory is imported
      this.renderReport();

      showProgress(false);
      showToast("分析完成", "success");
    } catch (e) {
      ErrorService.handle(e, { action: 'analyzeSelectedAsins', module: 'analysis' });
      showProgress(false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
    }
  }

  renderReport() {
    const report = state.analysisReport;
    if (!report) return;

    if (!state.translatedReport) state.showTranslation = false;

    const welcomeEl = document.getElementById("analysis-welcome");
    if (welcomeEl) welcomeEl.classList.add("hidden");

    document.getElementById("no-report-msg").classList.add("hidden");
    const display = document.getElementById("report-display");
    display.classList.remove("hidden");
    const jsonDisplay = document.getElementById("report-json-display");
    if (jsonDisplay && jsonDisplay.parentElement)
      jsonDisplay.parentElement.classList.add("hidden");

    if (report.parse_error) {
      display.innerHTML = `<div class="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-sm whitespace-pre-wrap"><i class="fas fa-bug mr-2"></i> ⚠️ 解析错误，原始数据：\n${report.raw_response}</div>`;
      return;
    }

    const showTrans = state.showTranslation && state.translatedReport;
    const targetMarket = report.meta?.targetMarket || "Original";

    const disabledClass = "opacity-40 cursor-not-allowed pointer-events-none grayscale";
    const mdBtnClass = showTrans
      ? disabledClass
      : "text-slate-500 hover:text-blue-600 hover:bg-slate-50";
    const mdBtnAttr = showTrans ? "disabled" : 'onclick="window.copyReportMarkdown()"';

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
                        <!-- Translation Controls -->
                        <div class="flex items-center gap-2 mr-2">
                             <select id="translation-model-select" class="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:border-blue-300 w-32">
                                <option value="" disabled selected>Translation Model</option>
                             </select>
                             <button id="quick-translate-btn" onclick="window.translateReport()" 
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
                                    class="relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 focus:outline-none ${showTrans ? "bg-blue-600" : "bg-slate-300"} ${!state.translatedReport ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}"
                                    ${!state.translatedReport ? "disabled" : ""}>
                                <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${showTrans ? "translate-x-4" : "translate-x-1"} shadow-sm"></span>
                            </button>
                            
                            <span class="text-[10px] px-2 font-bold ${showTrans ? "text-blue-600" : "text-slate-400"} cursor-default">
                                CN
                            </span>
                        </div>

                        <div class="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm ml-2">
                            <button ${mdBtnAttr} class="px-2 py-1 rounded transition-colors ${mdBtnClass}" title="${showTrans ? "翻译模式下禁用" : "复制 Markdown"}">
                                <i class="fab fa-markdown text-sm"></i>
                            </button>
                            
                            <div class="w-px bg-slate-100 my-1"></div>
                            
                            <button onclick="window.exportReport()" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="导出 JSON">
                                <i class="fas fa-download text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="grid-stack"></div>
            </div>`;

    display.innerHTML = toolbarHtml;

    // Populate Models
    this.populateTranslationModels();

    const toggleBtn = document.getElementById("toggle-trans-view-btn");
    if (toggleBtn) this.addEventListener(toggleBtn, "click", () => this.toggleTranslationView());

    this.initGridStack(report);
  }

  // [NEW] Populate translation models from constants
  populateTranslationModels() {
    const select = document.getElementById("translation-model-select");
    if (!select) return;

    // 1. Get active provider
    const activeProvider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);

    // 2. Get provider config
    const providerConfig = activeProvider ? PROVIDERS[activeProvider] : null;

    let options = "";

    if (providerConfig && providerConfig.models && providerConfig.models.length > 0) {
      // 3. Generate options from provider models
      providerConfig.models.forEach(modelObj => {
        const modelId = modelObj.id;
        const isSelected = state.lastTranslationModel === modelId ? "selected" : "";
        options += `<option value="${modelId}" ${isSelected}>${modelId}</option>`;
      });
    } else {
      // Fallback if no provider or models found
      options = `<option value="" disabled>No models found for ${activeProvider || 'current provider'}</option>`;
    }

    select.innerHTML = options;

    // Set initial value if state exists and is valid for current provider
    if (state.lastTranslationModel) {
      // Check if the last model is actually in the current list
      const exists = Array.from(select.options).some(opt => opt.value === state.lastTranslationModel);
      if (exists) {
        select.value = state.lastTranslationModel;
      } else if (select.options.length > 0 && !select.options[0].disabled) {
        // Default to first if last used is invalid
        select.value = select.options[0].value;
        state.lastTranslationModel = select.value;
      }
    } else if (select.options.length > 0 && !select.options[0].disabled) {
      // Default to first available
      select.value = select.options[0].value;
    }

    // Bind change event to store preference
    select.onchange = (e) => {
      state.lastTranslationModel = e.target.value;
    };
  }


  async initGridStack(report) {
    const gridEl = document.querySelector(".grid-stack");
    if (!gridEl) return;

    await loadGridStack();

    if (this.grid) this.grid.destroy(false);

    // @ts-ignore
    this.grid = GridStack.init(
      {
        column: 12,
        cellHeight: 60,
        margin: 15,
        animate: true,
        float: false,
        disableOneColumnMode: false,
        staticGrid: false,
        disableResize: true,
        handle: ".drag-handle",
        resizable: { handles: "se" },
      },
      gridEl
    );

    const templateId = report.meta?.templateId || "default";
    const savedLayout = StorageService.getLayoutConfig(templateId);

    const widgets = [];
    const keys = Object.keys(report).filter((k) => k !== "meta");

    keys.forEach((key) => {
      let content = report[key];
      if (state.showTranslation && state.translatedReport && state.translatedReport[key]) {
        content = state.translatedReport[key];
      }
      const autoH = this.calculateWidgetHeight(content);

      let defaultW = 4;
      if (autoH > 6) defaultW = 6;
      if (autoH > 10) defaultW = 12;

      const savedNode = savedLayout.find((n) => n.id === key);

      widgets.push({
        id: key,
        x: savedNode ? savedNode.x : undefined,
        y: savedNode ? savedNode.y : undefined,
        w: savedNode ? savedNode.w : defaultW,
        h: savedNode ? savedNode.h : autoH,
        content: this.renderWidgetContent(key, report, state.translatedReport),
      });
    });

    this.grid.batchUpdate();
    this.grid.removeAll();
    widgets.forEach((w) => {
      // [FIX] Manually create widget element to ensure content is treated as HTML
      // GridStack 默认可能转义 content，或者版本差异导致的问题
      // 我们改为让 addWidget 生成 widget，然后手动设置 innerHTML
      const widgetConfig = {
        x: w.x, y: w.y, w: w.w, h: w.h, id: w.id
      };
      const el = this.grid.addWidget(widgetConfig);

      // Find the content container that GridStack created
      const contentEl = el.querySelector('.grid-stack-item-content');
      if (contentEl) {
        contentEl.innerHTML = w.content; // Force innerHTML assignment
      }
    });
    this.grid.batchUpdate(false);

    this.grid.on("change", () => this.saveGridLayout(templateId));
    this.addEventListener(document, "mousedown", (e) => this.handleGlobalClickForResize(e));
  }

  handleGlobalClickForResize(e) {
    if (e.target.closest(".ui-resizable-handle") || e.target.closest(".btn-resize"))
      return;
    const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
    if (resizingCard && !resizingCard.contains(e.target)) {
      const key = resizingCard.getAttribute("gs-id");
      this.toggleCardResize(key, false);
    }
  }

  saveGridLayout(templateId) {
    if (!this.grid) return;
    const layout = this.grid.save(false);
    const cleanLayout = layout.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
    }));
    StorageService.setLayoutConfig(templateId, cleanLayout);
  }

  renderWidgetContent(key, report, transReport) {
    const origVal = report[key];
    const showTrans = state.showTranslation;
    const transVal = showTrans && transReport ? transReport[key] : undefined;

    const displayVal = this.getDisplayValue(origVal, transVal);

    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    const title = moduleConfig ? moduleConfig.label_cn : getFieldTitle(key);

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

  calculateWidgetHeight(content) {
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

  getDisplayValue(orig, trans) {
    return state.showTranslation && trans !== undefined && trans !== null ? trans : orig;
  }

  refreshWidgetUI(fullPath) {
    if (!this.grid) return;
    const rootKey = fullPath.split(".")[0];
    const gridItem = document.querySelector(`.grid-stack-item[gs-id="${rootKey}"]`);
    if (!gridItem) return;

    const newContentHTML = this.renderWidgetContent(rootKey, state.analysisReport, state.translatedReport);

    const oldContent = gridItem.querySelector(".grid-stack-item-content");
    if (oldContent) {
      oldContent.outerHTML = newContentHTML;
    } else {
      gridItem.innerHTML = newContentHTML;
    }
  }

  // ================== Actions / Methods ==================

  toggleTranslationView() {
    state.showTranslation = !state.showTranslation;
    this.renderReport();
  }

  toggleTranslation() {
    state.showTranslation = document.getElementById("enable-translation").checked;
    document.getElementById("translate-btn").disabled = !state.showTranslation;
  }

  async translateReport() {
    if (state.showTranslation && state.translatedReport) return;
    if (!state.analysisReport) return;

    const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
    if (!provider) {
      showToast("请先配置AI模型", "warning");
      return;
    }
    const config = StorageService.getLLMConfig(provider) || {};
    if (!config.apiKey) {
      showToast("API Key 未配置", "warning");
      return;
    }

    const btn = document.getElementById("quick-translate-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> 翻译中...';
    }

    try {
      const site = state.scrapedData.metadata.marketplace;
      const language = LANGUAGE_HEADERS[site].name;

      // Read model from the new select or state
      const modelSelect = document.getElementById("translation-model-select");
      const selectedModel = modelSelect ? modelSelect.value : state.lastTranslationModel;

      // If no specific model selected, fall back to current provider config
      const modelToUse = selectedModel || config.model;

      const llmConfig = {
        provider,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        model: modelToUse,
      };

      const result = await AnalysisService.translateReport(
        state.analysisReport,
        language,
        llmConfig
      );

      state.translatedReport = result;
      state.showTranslation = true;
      this.renderReport();
      showToast("翻译完成", "success");
    } catch (e) {
      ErrorService.handle(e, { action: 'translateReport', module: 'analysis' });
      state.showTranslation = false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-language mr-1"></i> 翻译';
      }
    }
  }

  copyReportMarkdown() {
    if (!state.analysisReport) {
      showToast("暂无报告", "warning");
      return;
    }
    if (state.showTranslation) return;
    let md = `# ${state.analysisReport.meta?.templateUsed || "竞品分析报告"}\n\n`;
    md += `> 市场: ${state.analysisReport.meta?.targetMarket} | 模型: ${state.analysisReport.meta?.generatedByModel}\n\n`;
    md += this.generateDynamicMarkdown(state.analysisReport);
    navigator.clipboard.writeText(md);
    showToast("Markdown 已复制", "success");
  }

  generateDynamicMarkdown(data, depth = 1) {
    if (!data) return "";
    let md = "";
    Object.keys(data).filter((k) => k !== "meta").forEach((key) => {
      const val = data[key];
      const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
      const title = moduleConfig ? moduleConfig.label_cn : getFieldTitle(key);

      const headerPrefix = "#".repeat(depth + 1);
      if (val === null || val === undefined) return;

      if (typeof val === "string") {
        md += `${headerPrefix} ${title}\n\n${val}\n\n`;
      } else if (Array.isArray(val)) {
        md += `${headerPrefix} ${title}\n\n`;
        val.forEach((item) => {
          md += `- ${typeof item === "object" ? JSON.stringify(item) : item}\n`;
        });
        md += `\n`;
      }
    });
    return md;
  }

  copyReportJSON() {
    const report =
      state.showTranslation && state.translatedReport
        ? state.translatedReport
        : state.analysisReport;
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    showToast("JSON已复制", "success");
  }

  exportReport() {
    if (!state.analysisReport) return;
    const blob = new Blob([JSON.stringify(state.analysisReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("已导出", "success");
  }

  addArrayItem(path) {
    const parts = path.split(".");
    let target = state.analysisReport;
    for (let i = 0; i < parts.length; i++) {
      if (!target[parts[i]]) target[parts[i]] = i === parts.length - 1 ? [] : {};
      target = target[parts[i]];
    }
    if (Array.isArray(target)) {
      let newItem = "New Item";
      if (target.length > 0 && typeof target[0] === "object") {
        newItem = {};
        Object.keys(target[0]).forEach((k) => (newItem[k] = "Edit me..."));
      }
      target.push(newItem);
      state.editHistory.push(JSON.stringify(state.analysisReport));
      if (state.translatedReport) this.clearNestedValue(state.translatedReport, path);
      this.refreshWidgetUI(path);
    }
  }

  removeArrayItem(path, index) {
    const parts = path.split(".");
    let target = state.analysisReport;
    for (let i = 0; i < parts.length; i++) {
      target = target[parts[i]];
    }
    if (Array.isArray(target)) {
      target.splice(index, 1);
      state.editHistory.push(JSON.stringify(state.analysisReport));
      if (state.translatedReport) this.clearNestedValue(state.translatedReport, path);
      this.refreshWidgetUI(path);
    }
  }

  clearNestedValue(obj, path) {
    const parts = path.split(".");
    let target = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) return;
      target = target[parts[i]];
    }
    delete target[parts[parts.length - 1]];
  }

  updateAsinSelectList() {
    const list = document.getElementById("asin-select-list");
    if (!list) return;

    if (!state.scrapedData?.products?.length) {
      list.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">暂无数据</p>';
      return;
    }
    list.innerHTML = state.scrapedData.products
      .map(
        (p) => `
            <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${state.selectedAsins.includes(p.asin)
            ? "bg-blue-50 border border-blue-100"
            : "border border-transparent"
          }">
                <input type="checkbox" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" ${state.selectedAsins.includes(p.asin) ? "checked" : ""
          } onchange="window.toggleAsinSelection('${p.asin}')">
                <span class="font-mono text-sm text-slate-700">${p.asin}</span>
                <span class="status-dot ${p.scrape_status === "success"
            ? "status-success"
            : p.scrape_status === "partial"
              ? "status-pending"
              : "status-error"
          } ml-auto"></span>
            </label>`
      )
      .join("");
    this.updateAnalyzeButton();
    this.updateTranslationModels();
  }

  toggleAsinSelection(asin) {
    const idx = state.selectedAsins.indexOf(asin);
    if (idx === -1) state.selectedAsins.push(asin);
    else state.selectedAsins.splice(idx, 1);
    this.updateAsinSelectList();
  }

  selectAllAsins() {
    if (!state.scrapedData?.products) return;
    state.selectedAsins = state.scrapedData.products.map((p) => p.asin);
    this.updateAsinSelectList();
  }

  updateAnalyzeButton() {
    const btn = document.getElementById("analyze-btn");
    if (btn) btn.disabled = state.selectedAsins.length === 0;
  }

  updateTranslationModels() {
    const select = document.getElementById("translation-model");
    if (!select) return;
    select.innerHTML = '<option value="">选择翻译模型</option>';
    Object.keys(PROVIDERS).forEach((key) => {
      const config = StorageService.getLLMConfig(key) || {};
      if (config.apiKey && config.model) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `${PROVIDERS[key].name}: ${config.model}`;
        select.appendChild(opt);
      }
    });
  }

  // ================== Local Edit Logic ==================

  toggleCardResize(key, forceState) {
    const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`);
    const card = document.getElementById(`widget-card-${key}`);
    const btn = card.querySelector(".btn-resize");

    if (!el || !this.grid) return;

    const isResizing = forceState !== undefined ? forceState : !el.classList.contains("is-resizing");

    const activeCardClasses = [
      "is-resizing", "border-2", "border-dashed", "border-gray-300",
      "bg-gray-50/30", "transition-all", "duration-300",
    ];
    const activeBtnClasses = ["text-gray-900", "bg-gray-100"];

    if (isResizing) {
      el.classList.add(...activeCardClasses);
      this.grid.resizable(el, true);
      if (btn) btn.classList.add(...activeBtnClasses);
    } else {
      el.classList.remove(...activeCardClasses);
      this.grid.resizable(el, false);
      if (btn) btn.classList.remove(...activeBtnClasses);
      const templateId = state.analysisReport.meta?.templateId || "default";
      this.saveGridLayout(templateId);
    }
  }

  captureFormData(key) {
    const textInput = document.getElementById(`input-${key}`);
    const listContainer = document.getElementById(`list-container-${key}`);
    const objContainer = document.getElementById(`obj-list-container-${key}`);

    if (textInput) {
      return textInput.value;
    } else if (listContainer) {
      return Array.from(listContainer.querySelectorAll("textarea")).map((el) => el.value);
    } else if (objContainer) {
      return Array.from(objContainer.querySelectorAll(".edit-row")).map((row) => {
        const obj = {};
        row.querySelectorAll(".obj-input").forEach((input) => {
          obj[input.dataset.subkey] = input.value;
        });
        return obj;
      });
    }
    return null;
  }

  pushEditSnapshot(key) {
    const currentData = this.captureFormData(key);
    if (currentData === null) return;
    if (!this.editHistoryMap.has(key)) {
      this.editHistoryMap.set(key, []);
    }
    const stack = this.editHistoryMap.get(key);
    stack.push(JSON.parse(JSON.stringify(currentData)));
    this.updateUndoButtonState(key);
  }

  updateUndoButtonState(key) {
    const card = document.getElementById(`widget-card-${key}`);
    const undoBtn = card?.querySelector(".btn-undo");
    const stack = this.editHistoryMap.get(key);

    if (undoBtn) {
      if (stack && stack.length > 0) {
        undoBtn.classList.remove("opacity-30", "cursor-not-allowed");
        undoBtn.disabled = false;
      } else {
        undoBtn.classList.add("opacity-30", "cursor-not-allowed");
        undoBtn.disabled = true;
      }
    }
  }

  startLocalEdit(key) {
    const card = document.getElementById(`widget-card-${key}`);
    const contentDiv = document.getElementById(`widget-content-${key}`);
    if (!card || !contentDiv) return;

    card.classList.add("is-editing");
    card.querySelector(".view-controls").classList.add("hidden");
    card.querySelector(".view-controls").classList.remove("flex");
    card.querySelector(".edit-controls").classList.remove("hidden");
    card.querySelector(".edit-controls").classList.add("flex");

    const gridItem = card.closest(".grid-stack-item");
    if (this.grid && gridItem) this.grid.movable(gridItem, false);

    const currentData =
      state.showTranslation && state.translatedReport && state.translatedReport[key]
        ? state.translatedReport[key]
        : state.analysisReport[key];

    this.originalDataMap.set(key, JSON.parse(JSON.stringify(currentData || "")));
    this.editHistoryMap.set(key, []);

    contentDiv.innerHTML = renderEditorForm(key, currentData);

    this.updateUndoButtonState(key);
  }

  addListItem(key) {
    this.pushEditSnapshot(key);

    const container = document.getElementById(`list-container-${key}`);
    const div = document.createElement("div");
    div.className = "editor-row-item edit-row group animate-in fade-in slide-in-from-bottom-1";

    div.innerHTML = `
            <div class="pt-[11px]">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 opacity-80"></div>
            </div>
            
            <textarea class="editor-input-modern" 
                      rows="1" 
                      placeholder="输入内容..."
                      oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
                      onfocus="window.pushEditSnapshot('${key}')"
            ></textarea>
            
            <div class="absolute right-0 top-1.5">
                <button onclick="window.deleteRowItem(this, '${key}')" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0" title="删除">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `;

    container.appendChild(div);
    const textarea = div.querySelector("textarea");
    if (textarea) {
      textarea.focus();
      textarea.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Re-bind focus because innerHTML destroyed the closure? 
      // Actually inline onclick="window.pushEditSnapshot" refers to global proxy
    }
  }

  deleteRowItem(btn, key) {
    this.pushEditSnapshot(key);
    btn.closest(".edit-row").remove();
  }

  addObjItem(key) {
    this.pushEditSnapshot(key);
    const container = document.getElementById(`obj-list-container-${key}`);
    const tplContent = document.getElementById(`tpl-${key}`)?.textContent || "{}";
    const templateObj = JSON.parse(tplContent);
    Object.keys(templateObj).forEach((k) => (templateObj[k] = ""));

    const div = document.createElement("div");
    div.className = "edit-row p-3 bg-slate-50 border border-slate-200 rounded relative group animate-in fade-in slide-in-from-bottom-2";
    div.innerHTML = `
            <button onclick="window.deleteRowItem(this, '${key}')" class="btn-delete-row absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all">
                <i class="fas fa-times"></i>
            </button>
            ${Object.keys(templateObj).map((subKey) => `
                <div class="mb-2">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">${getFieldTitle(subKey)}</label>
                    <textarea data-subkey="${subKey}" class="obj-input edit-textarea w-full min-h-[30px] resize-none" rows="1"></textarea>
                </div>
            `).join("")}
        `;
    container.appendChild(div);
  }

  undoLocalEdit(key) {
    const stack = this.editHistoryMap.get(key);
    if (!stack || stack.length === 0) {
      showToast("没有更多可撤销的操作", "info");
      return;
    }
    const prevState = stack.pop();
    const contentDiv = document.getElementById(`widget-content-${key}`);

    contentDiv.innerHTML = renderEditorForm(key, prevState);

    this.updateUndoButtonState(key);
    showToast("已撤销", "info");
  }

  saveLocalEdit(key) {
    const newData = this.captureFormData(key);
    if (newData !== null) {
      if (state.showTranslation && state.translatedReport) {
        state.translatedReport[key] = newData;
      } else {
        state.analysisReport[key] = newData;
        if (state.translatedReport) delete state.translatedReport[key];
      }
      HistoryService.save(state.scrapedData, state.analysisReport);
      showToast("内容已更新", "success");
    }
    this.exitEditMode(key);
  }

  exitEditMode(key) {
    const card = document.getElementById(`widget-card-${key}`);
    const contentDiv = document.getElementById(`widget-content-${key}`);
    if (!card) return;

    card.classList.remove("is-editing");
    card.querySelector(".view-controls").classList.remove("hidden");
    card.querySelector(".view-controls").classList.add("flex");
    card.querySelector(".edit-controls").classList.add("hidden");
    card.querySelector(".edit-controls").classList.remove("flex");

    const gridItem = card.closest(".grid-stack-item");
    if (this.grid && gridItem) this.grid.movable(gridItem, true);

    const currentData =
      state.showTranslation && state.translatedReport && state.translatedReport[key]
        ? state.translatedReport[key]
        : state.analysisReport[key];

    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    let style = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };

    contentDiv.innerHTML = renderViewModeHTML(currentData, style);

    this.originalDataMap.delete(key);
    this.editHistoryMap.delete(key);
  }

  // ================== Registry & Export ==================

  registerGlobalActions() {
    const actions = {
      updateSourceVisuals: () => this.updateSourceVisuals(),
      toggleAllModules: (c) => this.toggleAllModules(c),
      openPromptModal: () => this.openPromptModal(),
      updatePromptPreview: () => this.updatePromptPreview(),
      copyPromptText: () => this.copyPromptText(),

      toggleTranslationView: () => this.toggleTranslationView(),
      toggleTranslation: () => this.toggleTranslation(),
      translateReport: () => this.translateReport(),

      copyReportMarkdown: () => this.copyReportMarkdown(),
      copyReportJSON: () => this.copyReportJSON(),
      exportReport: () => this.exportReport(),

      addArrayItem: (p) => this.addArrayItem(p),
      removeArrayItem: (p, i) => this.removeArrayItem(p, i),

      toggleAsinSelection: (a) => this.toggleAsinSelection(a),
      selectAllAsins: () => this.selectAllAsins(),

      toggleCardResize: (k, f) => this.toggleCardResize(k, f),
      startLocalEdit: (k) => this.startLocalEdit(k),
      addListItem: (k) => this.addListItem(k),
      deleteRowItem: (b, k) => this.deleteRowItem(b, k),
      addObjItem: (k) => this.addObjItem(k),
      undoLocalEdit: (k) => this.undoLocalEdit(k),
      saveLocalEdit: (k) => this.saveLocalEdit(k),
      pushEditSnapshot: (k) => this.pushEditSnapshot(k), // Used in generated HTML onclick
    };
    registerActionsWithLegacy(actions);
  }
}

// 导出必要的函数，保持 API 兼容
const instance = new AnalysisModule();

export const initAnalysisPanel = () => {
  // 监听路由，自动挂载
  window.addEventListener('app:route-changed', (e) => {
    const { routeId } = e.detail;
    const container = document.getElementById('panel-analysis');

    if (routeId === 'analysis') {
      if (!instance._isMounted && container) instance.mount(container);
    } else {
      if (instance._isMounted) instance.unmount();
    }
  });
};

export const updateAsinSelectList = () => instance.updateAsinSelectList();
export const analyzeSelectedAsins = () => instance.analyzeSelectedAsins();
export const renderReport = () => instance.renderReport();