// src/modules/master_prompt/analysis/analysisDisplay.js
// ================================================================
// 🎯 Phase 3: 已迁移使用 StorageService
// ================================================================

import state from "../../../common/state.js";
import { PROVIDERS, LANGUAGE_HEADERS } from "../../../common/constants/constants.js";
import { ANALYSIS_MODULES, DYNAMIC_MASTER_TEMPLATE } from "../../../common/constants/prompts.js";
import { showToast, showProgress } from "../../../common/utils/ui.js";
import { HistoryService } from "../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { AnalysisService } from "./analysisService.js";
import { getFieldTitle } from "../promptlab/promptlabDisplay.js";
import { StorageService, STORAGE_KEYS } from "../../../services/storageService.js";

// ✅ 引入新的渲染器 (关键改动)
import { renderWidgetCard, renderViewModeHTML, renderEditorForm } from "./analysisRenderer.js";

// Gridstack 实例
let grid = null;

// ==========================================
// 1. UI 初始化
// ==========================================

export function initAnalysisPanel() {
  renderModuleSelector();
  // 初始化右侧预览区域
  renderPromptPreviewArea();

  const analyzeBtn = document.getElementById("analyze-btn");
  if (analyzeBtn) {
    analyzeBtn.onclick = null;
    analyzeBtn.addEventListener("click", analyzeSelectedAsins);
  }
}

// 渲染配置区 (适配新布局)
function renderModuleSelector() {
  // 渲染数据来源切换按钮
  renderSourceToggle();
  // 渲染分析模块复选框
  renderModuleCheckboxes();
  // 更新模块可见性
  updateModuleListVisibility();
  // 更新视觉状态
  window.updateSourceVisuals();
  // 延迟更新Prompt预览
  setTimeout(updatePromptPreview, 100);
}

// 渲染数据来源切换按钮
function renderSourceToggle() {
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

  document.getElementById("opt-listing")?.addEventListener("change", () => {
    updateModuleListVisibility();
    updatePromptPreview();
  });
  document.getElementById("opt-reviews")?.addEventListener("change", () => {
    updateModuleListVisibility();
    updatePromptPreview();
  });
}


window.updateSourceVisuals = function () {
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
};

function renderModuleCheckboxes() {
  const container = document.getElementById("modules-container");
  if (!container) return;

  container.innerHTML = ANALYSIS_MODULES.map(
    (mod) => `
        <label class="module-item group relative flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition-all bg-white" data-category="${mod.category}">
            <div class="flex items-center pt-0.5">
                <input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" onchange="window.updatePromptPreview()">
            </div>
            <div class="text-sm leading-tight flex-1 min-w-0">
                <div class="font-medium text-slate-700 group-hover:text-blue-700 truncate">${mod.label_cn}</div>
                <div class="text-slate-400 text-[11px] mt-0.5 group-hover:text-slate-500 line-clamp-2">${mod.desc_cn}</div>
            </div>
        </label>
    `
  ).join("");
}

function updateModuleListVisibility() {
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

window.toggleAllModules = function (checked) {
  const inputs = document.querySelectorAll(
    '#modules-container input[type="checkbox"]'
  );
  inputs.forEach((input) => {
    if (!input.closest(".module-item").classList.contains("hidden")) {
      input.checked = checked;
    }
  });
  updatePromptPreview();
};

window.openPromptModal = function () {
  const dynamicPrompt = buildDynamicPrompt();
  if (!dynamicPrompt) {
    showToast("请至少选择一个分析模块", "warning");
    return;
  }
  if (!document.getElementById("prompt-modal")) renderPromptModal();

  const textarea = document.getElementById("current-prompt-display");
  if (textarea) textarea.value = dynamicPrompt;

  const modal = document.getElementById("prompt-modal");
  const backdrop = document.getElementById("prompt-modal-backdrop");
  const panel = document.getElementById("prompt-modal-panel");
  if (!modal) return;
  modal.classList.remove("hidden");
  requestAnimationFrame(() => {
    backdrop.classList.remove("opacity-0");
    panel.classList.remove("opacity-0", "scale-95");
    panel.classList.add("opacity-100", "scale-100");
  });
};

// ==========================================
// 2. Prompt 预览逻辑
// ==========================================

function renderPromptPreviewArea() {
  // 新布局：将预览区域插入到报告内容区域开头
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

window.updatePromptPreview = function () {
  const prompt = buildDynamicPrompt();
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
};

window.copyPromptText = function () {
  const text = document.getElementById("live-prompt-code")?.textContent;
  if (text) {
    navigator.clipboard.writeText(text);
    showToast("Prompt 已复制", "success");
  }
};

function buildDynamicPrompt() {
  const selectedCheckboxes = document.querySelectorAll(
    'input[name="analysis_module"]:checked'
  );
  if (selectedCheckboxes.length === 0) return null;

  const selectedModules = Array.from(selectedCheckboxes)
    .map((cb) => {
      return ANALYSIS_MODULES.find((m) => m.id === cb.value);
    })
    .filter(Boolean);

  const tasksStr = selectedModules
    .map(
      (m, index) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`
    )
    .join("\n");

  const schemaParts = selectedModules
    .map((m) => `  "${m.id}": ["..."]`)
    .join(",\n");

  return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace(
    "{{dynamic_schema}}",
    schemaParts
  );
}

// ==========================================
// 3. 核心分析逻辑
// ==========================================

export async function analyzeSelectedAsins() {
  if (state.selectedAsins.length === 0) {
    showToast("请先选择要分析的 ASIN", "warning");
    return;
  }

  const currentPrompt = buildDynamicPrompt();
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

  const selectedProducts = state.scrapedData.products.filter((p) =>
    state.selectedAsins.includes(p.asin)
  );
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
    renderHistory();
    renderReport();

    showProgress(false);
    showToast("分析完成", "success");
  } catch (e) {
    console.error(e);
    showToast("分析失败: " + e.message, "error");
    showProgress(false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-brain mr-2"></i> 分析ASIN';
  }
}

export function renderReport() {    //scraperPanel.js有调用
  const report = state.analysisReport;
  if (!report) return;

  if (!state.translatedReport) state.showTranslation = false;

  // 隐藏欢迎区域，显示报告
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
  const mdBtnAttr = showTrans ? "disabled" : 'onclick="copyReportMarkdown()"';

  let toolbarHtml = `
        <div class="space-y-4 font-sans text-slate-800 pb-8" id="report-container">
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/95">
                <div class="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                        <i class="fas fa-file-contract"></i> ${report.meta?.templateUsed || "Analysis"}
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
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
                        
                        <button onclick="exportReport()" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors" title="导出 JSON">
                            <i class="fas fa-download text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="grid-stack"></div>
        </div>`;

  display.innerHTML = toolbarHtml;

  const toggleBtn = document.getElementById("toggle-trans-view-btn");
  if (toggleBtn) toggleBtn.addEventListener("click", toggleTranslationView);

  initGridStack(report);
}

function initGridStack(report) {
  const gridEl = document.querySelector(".grid-stack");
  if (!gridEl) return;

  if (grid) grid.destroy(false);

  grid = GridStack.init(
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
    const autoH = calculateWidgetHeight(content);

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
      content: renderWidgetContent(key, report, state.translatedReport),
    });
  });

  grid.batchUpdate();
  grid.removeAll();
  widgets.forEach((w) => grid.addWidget(w));
  grid.batchUpdate(false);

  grid.on("change", () => saveGridLayout(templateId));
  document.addEventListener("mousedown", handleGlobalClickForResize);
}

function handleGlobalClickForResize(e) {
  if (e.target.closest(".ui-resizable-handle") || e.target.closest(".btn-resize"))
    return;
  const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
  if (resizingCard && !resizingCard.contains(e.target)) {
    const key = resizingCard.getAttribute("gs-id");
    window.toggleCardResize(key, false);
  }
}

function saveGridLayout(templateId) {
  if (!grid) return;
  const layout = grid.save(false);
  const cleanLayout = layout.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
  }));
  StorageService.setLayoutConfig(templateId, cleanLayout);
}

// ==========================================
// 5. Widget 内容渲染 (核心重构点)
// ==========================================

function renderWidgetContent(key, report, transReport) {
  const origVal = report[key];
  const showTrans = state.showTranslation;
  const transVal = showTrans && transReport ? transReport[key] : undefined;

  // 1. 获取显示数据
  const displayVal = getDisplayValue(origVal, transVal);

  // 2. 准备配置数据
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

  // 3. 生成内部 View HTML
  const contentHtml = renderViewModeHTML(displayVal, style);

  // 4. 调用 Renderer 生成完整卡片
  return renderWidgetCard(key, title, style, showTrans, contentHtml);
}

function calculateWidgetHeight(content) {
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

// ==========================================
// 6. 辅助工具与导出
// ==========================================

function getDisplayValue(orig, trans) {
  return state.showTranslation && trans !== undefined && trans !== null ? trans : orig;
}

function generateDynamicMarkdown(data, depth = 1) {
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

// ==========================================
// 6. Public Exports
// ==========================================

function refreshWidgetUI(fullPath) {
  if (!grid) return;
  const rootKey = fullPath.split(".")[0];
  const gridItem = document.querySelector(`.grid-stack-item[gs-id="${rootKey}"]`);
  if (!gridItem) return;

  const newContentHTML = renderWidgetContent(rootKey, state.analysisReport, state.translatedReport);

  // Gridstack 的 content 有时是包裹的，为了安全，直接替换 grid-stack-item-content
  const oldContent = gridItem.querySelector(".grid-stack-item-content");
  if (oldContent) {
    oldContent.outerHTML = newContentHTML;
  } else {
    gridItem.innerHTML = newContentHTML;
  }
}

window.toggleTranslationView = function () {
  state.showTranslation = !state.showTranslation;
  renderReport();
};

window.toggleTranslation = function () {
  state.showTranslation = document.getElementById("enable-translation").checked;
  document.getElementById("translate-btn").disabled = !state.showTranslation;
};

window.translateReport = async function () {
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

  const btn = document.getElementById("translate-btn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> 翻译中...';

  try {
    const site = state.scrapedData.metadata.marketplace;
    const language = LANGUAGE_HEADERS[site].name;
    const llmConfig = {
      provider,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      model: config.model,
    };

    const result = await AnalysisService.translateReport(
      state.analysisReport,
      language,
      llmConfig
    );

    state.translatedReport = result;
    state.showTranslation = true;
    renderReport();
    showToast("翻译完成", "success");
  } catch (e) {
    console.error(e);
    showToast("翻译失败: " + e.message, "error");
    state.showTranslation = false;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-language mr-1"></i> 翻译报告';
    }
  }
};

window.copyReportMarkdown = function () {
  if (!state.analysisReport) {
    showToast("暂无报告", "warning");
    return;
  }
  if (state.showTranslation) return;
  let md = `# ${state.analysisReport.meta?.templateUsed || "竞品分析报告"}\n\n`;
  md += `> 市场: ${state.analysisReport.meta?.targetMarket} | 模型: ${state.analysisReport.meta?.generatedByModel}\n\n`;
  md += generateDynamicMarkdown(state.analysisReport);
  navigator.clipboard.writeText(md);
  showToast("Markdown 已复制", "success");
};

window.copyReportJSON = function () {
  const report =
    state.showTranslation && state.translatedReport
      ? state.translatedReport
      : state.analysisReport;
  if (!report) return;
  navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  showToast("JSON已复制", "success");
};

window.exportReport = function () {
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
};

window.addArrayItem = function (path) {
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
    if (state.translatedReport) clearNestedValue(state.translatedReport, path);
    refreshWidgetUI(path);
  }
};

window.removeArrayItem = function (path, index) {
  const parts = path.split(".");
  let target = state.analysisReport;
  for (let i = 0; i < parts.length; i++) {
    target = target[parts[i]];
  }
  if (Array.isArray(target)) {
    target.splice(index, 1);
    state.editHistory.push(JSON.stringify(state.analysisReport));
    if (state.translatedReport) clearNestedValue(state.translatedReport, path);
    refreshWidgetUI(path);
  }
};

export function updateAsinSelectList() {
  const list = document.getElementById("asin-select-list");
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
  updateAnalyzeButton();
  updateTranslationModels();
}

window.toggleAsinSelection = function (asin) {
  const idx = state.selectedAsins.indexOf(asin);
  if (idx === -1) state.selectedAsins.push(asin);
  else state.selectedAsins.splice(idx, 1);
  updateAsinSelectList();
};

window.selectAllAsins = function () {
  if (!state.scrapedData?.products) return;
  state.selectedAsins = state.scrapedData.products.map((p) => p.asin);
  updateAsinSelectList();
};

function updateAnalyzeButton() {
  const btn = document.getElementById("analyze-btn");
  if (btn) btn.disabled = state.selectedAsins.length === 0;
}

function updateTranslationModels() {
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

// ==========================================
// 7. 局部编辑与 Resize 逻辑
// ==========================================

const originalDataMap = new Map();
const editHistoryMap = new Map();

window.toggleCardResize = function (key, forceState) {
  const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`);
  const card = document.getElementById(`widget-card-${key}`);
  const btn = card.querySelector(".btn-resize");

  if (!el || !grid) return;

  const isResizing = forceState !== undefined ? forceState : !el.classList.contains("is-resizing");

  const activeCardClasses = [
    "is-resizing", "border-2", "border-dashed", "border-gray-300",
    "bg-gray-50/30", "transition-all", "duration-300",
  ];
  const activeBtnClasses = ["text-gray-900", "bg-gray-100"];

  if (isResizing) {
    el.classList.add(...activeCardClasses);
    grid.resizable(el, true);
    if (btn) btn.classList.add(...activeBtnClasses);
  } else {
    el.classList.remove(...activeCardClasses);
    grid.resizable(el, false);
    if (btn) btn.classList.remove(...activeBtnClasses);
    const templateId = state.analysisReport.meta?.templateId || "default";
    saveGridLayout(templateId);
  }
};

function captureFormData(key) {
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

function pushEditSnapshot(key) {
  const currentData = captureFormData(key);
  if (currentData === null) return;
  if (!editHistoryMap.has(key)) {
    editHistoryMap.set(key, []);
  }
  const stack = editHistoryMap.get(key);
  stack.push(JSON.parse(JSON.stringify(currentData)));
  updateUndoButtonState(key);
}

function updateUndoButtonState(key) {
  const card = document.getElementById(`widget-card-${key}`);
  const undoBtn = card?.querySelector(".btn-undo");
  const stack = editHistoryMap.get(key);

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

// --- 1. 开始编辑 ---
window.startLocalEdit = function (key) {
  const card = document.getElementById(`widget-card-${key}`);
  const contentDiv = document.getElementById(`widget-content-${key}`);
  if (!card || !contentDiv) return;

  card.classList.add("is-editing");
  card.querySelector(".view-controls").classList.add("hidden");
  card.querySelector(".view-controls").classList.remove("flex");
  card.querySelector(".edit-controls").classList.remove("hidden");
  card.querySelector(".edit-controls").classList.add("flex");

  const gridItem = card.closest(".grid-stack-item");
  if (grid && gridItem) grid.movable(gridItem, false);

  const currentData =
    state.showTranslation && state.translatedReport && state.translatedReport[key]
      ? state.translatedReport[key]
      : state.analysisReport[key];

  originalDataMap.set(key, JSON.parse(JSON.stringify(currentData || "")));
  editHistoryMap.set(key, []);

  // ✅ 使用 Renderer 生成表单 (关键调用)
  contentDiv.innerHTML = renderEditorForm(key, currentData);

  updateUndoButtonState(key);
};

// --- 2. 动态添加条目 (带快照) ---
window.addListItem = function (key) {
  pushEditSnapshot(key);

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
                  onfocus="pushEditSnapshot('${key}')"
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
  }
};

window.deleteRowItem = function (btn, key) {
  pushEditSnapshot(key);
  btn.closest(".edit-row").remove();
};

window.addObjItem = function (key) {
  pushEditSnapshot(key);
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
};

// --- 4. 步骤级撤销逻辑 (Undo) ---
window.undoLocalEdit = function (key) {
  const stack = editHistoryMap.get(key);
  if (!stack || stack.length === 0) {
    showToast("没有更多可撤销的操作", "info");
    return;
  }
  const prevState = stack.pop();
  const contentDiv = document.getElementById(`widget-content-${key}`);

  // ✅ 重新渲染旧状态
  contentDiv.innerHTML = renderEditorForm(key, prevState);

  updateUndoButtonState(key);
  showToast("已撤销", "info");
};

// --- 5. 完成/保存逻辑 ---
window.saveLocalEdit = function (key) {
  const newData = captureFormData(key);
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
  exitEditMode(key);
};

function exitEditMode(key) {
  const card = document.getElementById(`widget-card-${key}`);
  const contentDiv = document.getElementById(`widget-content-${key}`);
  if (!card) return;

  card.classList.remove("is-editing");
  card.querySelector(".view-controls").classList.remove("hidden");
  card.querySelector(".view-controls").classList.add("flex");
  card.querySelector(".edit-controls").classList.add("hidden");
  card.querySelector(".edit-controls").classList.remove("flex");

  const gridItem = card.closest(".grid-stack-item");
  if (grid && gridItem) grid.movable(gridItem, true);

  const currentData =
    state.showTranslation && state.translatedReport && state.translatedReport[key]
      ? state.translatedReport[key]
      : state.analysisReport[key];

  // 重新渲染为视图模式
  // 需重新获取样式配置 (这里为了不重复代码，可以稍微冗余一点，或者把style获取也封装，但为了简单直接写)
  const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
  let style = { color: "slate", bg: "bg-slate-500", lightBg: "bg-slate-100", icon: "fa-info-circle" };
  if (moduleConfig) {
    // 这里的 style 其实只影响外框，renderViewModeHTML 内部不使用 style
    // 但如果 ViewModeHTML 未来需要，可以传入
  }

  // ✅ 使用 Renderer 恢复视图
  contentDiv.innerHTML = renderViewModeHTML(currentData, style);

  originalDataMap.delete(key);
  editHistoryMap.delete(key);
}

function setNestedValue(obj, path, value) {
  // 原代码中有，但似乎未被直接调用，为了兼容性保留
  const parts = path.split(".");
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
}

function clearNestedValue(obj, path) {
  const parts = path.split(".");
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) return;
    target = target[parts[i]];
  }
  delete target[parts[parts.length - 1]];
}