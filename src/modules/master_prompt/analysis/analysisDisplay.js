// src/ui/analysisDisplay.js
import state from "../../../common/state.js";
import { PROVIDERS, LANGUAGE_HEADERS } from "../../../common/constants/constants.js";
import { ANALYSIS_MODULES, DYNAMIC_MASTER_TEMPLATE } from "../../../common/constants/prompts.js"; // 导入新配置
import { showToast, showProgress } from "../../../common/utils/ui.js";
import { HistoryService } from "../../../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { AnalysisService } from "./analysisService.js";
import { getFieldTitle } from "../promptlab/promptlabDisplay.js";

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

// 渲染左侧配置区
function renderModuleSelector() {
  const container = document.getElementById("asin-select-list")?.parentElement;
  let selectorDiv = document.getElementById("template-selector-container");

  if (!selectorDiv) {
    selectorDiv = document.createElement("div");
    selectorDiv.id = "template-selector-container";
    // 稍微调整间距
    selectorDiv.className = "mb-4";
    const analyzeBtn = document.getElementById("analyze-btn");
    if (analyzeBtn) container.insertBefore(selectorDiv, analyzeBtn);
  }

  // ✅ 渲染逻辑更新：
  // 1. 去掉“分析数据源”标题
  selectorDiv.innerHTML = `
    <div class="flex gap-3 mb-5">
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
  </div>
    <div id="modules-container" class="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar mb-4">
    </div>
  `;

  // 绑定事件 (保持原有逻辑，用于联动模块显示)
  document.getElementById("opt-listing").addEventListener("change", () => {
    updateModuleListVisibility();
    updatePromptPreview();
  });
  document.getElementById("opt-reviews").addEventListener("change", () => {
    updateModuleListVisibility();
    updatePromptPreview();
  });

  renderModuleCheckboxes();
  updateModuleListVisibility();

  // ✅ 初始化视觉状态
  window.updateSourceVisuals();

  setTimeout(updatePromptPreview, 100);
}

// ✅ 新增：控制数据源按钮的视觉状态 (稍微高亮一点点)
window.updateSourceVisuals = function () {
  const updateStyle = (inputId, labelId, activeColorClass) => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (!input || !label) return;

    if (input.checked) {
      // 选中状态：淡蓝色背景，蓝色边框，深色文字
      label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-regular bg-blue-50/50 border-blue-200 text-blue-700 shadow-sm`;
    } else {
      // 未选中状态：白色背景，灰色边框，灰色文字
      label.className = `flex-1 group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all select-none text-sm font-regular bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300`;
    }
  };

  updateStyle("opt-listing", "lbl-opt-listing");
  updateStyle("opt-reviews", "lbl-opt-reviews");
};

// ✅ 优化：使用 label_cn 和 desc_cn 渲染 UI
function renderModuleCheckboxes() {
  const container = document.getElementById("modules-container");
  if (!container) return;

  // 使用 label_cn 和 desc_cn 渲染 UI
  container.innerHTML = ANALYSIS_MODULES.map(
    (mod) => `
        <label class="module-item group relative flex items-start gap-3 p-2 rounded-lg border border-slate-100 hover:bg-blue-50/50 hover:border-blue-100 cursor-pointer transition-all" data-category="${mod.category}">
            <div class="flex h-5 items-center">
                <input type="checkbox" name="analysis_module" value="${mod.id}" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" onchange="window.updatePromptPreview()">
            </div>
            <div class="text-sm leading-tight w-full">
                <div class="flex justify-between items-center">
                    <div class="font-medium text-slate-700 group-hover:text-blue-700">${mod.label_cn}</div>
                    <span class="text-[9px] font-mono px-1 py-0.5 bg-slate-50 text-slate-400 rounded uppercase opacity-0 group-hover:opacity-100 transition-opacity">${mod.category}</span>
                </div>
                <div class="text-slate-400 text-xs mt-0.5 group-hover:text-slate-500 pr-2">${mod.desc_cn}</div>
            </div>
        </label>
    `
  ).join("");
}

// ✅ 新增：根据数据源过滤模块显示
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

// ✅ 新增：全局全选/反选功能
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
  // 1. 先生成当前的 Prompt
  const dynamicPrompt = buildDynamicPrompt();
  if (!dynamicPrompt) {
    showToast("请至少选择一个分析模块", "warning");
    return;
  }

  // 渲染 Modal
  // ... (保持原有的 DOM 创建逻辑，但在显示前赋值) ...
  if (!document.getElementById("prompt-modal")) renderPromptModal(); // 确保DOM存在

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
// 2. Prompt 预览逻辑 (右侧折叠面板)
// ==========================================

function renderPromptPreviewArea() {
  const rightPanel = document.querySelector(".lg\\:col-span-3"); // 获取右侧列
  // 防止重复渲染
  if (!rightPanel || document.getElementById("prompt-preview-container"))
    return;

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

  rightPanel.insertBefore(previewDiv, rightPanel.firstChild);
}
// ✅ 新增：更新 Prompt 预览内容
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
    // 简单估算 Token
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

// 核心 Prompt 构建函数 (使用英文)
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

  // 1. Tasks: Label(EN) : Desc(EN)
  const tasksStr = selectedModules
    .map(
      (m, index) => `${index + 1}. ${m.label_en}: ${m.extraction_instruction}`
    )
    .join("\n");

  // 2. Schema
  const schemaParts = selectedModules
    .map((m) => `  "${m.id}": ["..."]`)
    .join(",\n");

  return DYNAMIC_MASTER_TEMPLATE.replace("{{dynamic_tasks}}", tasksStr).replace(
    "{{dynamic_schema}}",
    schemaParts
  );
}

window.handleTemplateChange = function () {
  const select = document.getElementById("analysis-template-select");
  const tpl = PROMPT_TEMPLATES.find((t) => t.id === select.value);
  const textarea = document.getElementById("current-prompt-display");
  if (tpl && textarea) {
    textarea.value = tpl.content;
    if (state.analysisReport) renderReport();
  }
};

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

  const provider = localStorage.getItem("llm_active_provider");
  if (!provider) {
    showToast("请先配置AI模型", "warning");
    return;
  }
  const config = JSON.parse(localStorage.getItem(`llm_${provider}`) || "{}");
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

export function renderReport() {
  const report = state.analysisReport;
  if (!report) return;

  if (!state.translatedReport) state.showTranslation = false;

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

  // ✅ 逻辑变更：定义禁用状态的样式和属性
  const disabledClass =
    "opacity-40 cursor-not-allowed pointer-events-none grayscale";
  // 如果显示译文，则禁用 MD 复制 (防止复制空内容或错乱)
  const mdBtnClass = showTrans
    ? disabledClass
    : "text-slate-500 hover:text-blue-600 hover:bg-slate-50";
  const mdBtnAttr = showTrans ? "disabled" : 'onclick="copyReportMarkdown()"';

  // 同样，如果处于翻译视图，建议也暂时冻结 JSON 复制，或者您可以选择保留 JSON 复制（如果那是允许的）
  // 这里按照您的要求，主要冻结 MD，为了交互一致性，建议让整个“复制区”在翻译模式下不可用，或者仅 MD 不可用。
  // 下面代码仅冻结 MD 按钮。

  let toolbarHtml = `
        <div class="space-y-4 font-sans text-slate-800 pb-8" id="report-container">
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/95">
                <div class="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                        <i class="fas fa-file-contract"></i> ${
                          report.meta?.templateUsed || "Analysis"
                        }
                    </div>
                </div>
                
                <div class="flex items-center gap-3">
                    
                    <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-full px-1 border border-slate-200">
                        <span class="text-[10px] px-2 font-bold ${
                          !showTrans ? "text-slate-700" : "text-slate-400"
                        } uppercase tracking-wide cursor-default" title="原文语言">
                            ${targetMarket}
                        </span>
                        
                        <button id="toggle-trans-view-btn" 
                                class="relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                                  showTrans ? "bg-blue-600" : "bg-slate-300"
                                } ${
    !state.translatedReport ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
  }"
                                ${!state.translatedReport ? "disabled" : ""}>
                            <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                              showTrans ? "translate-x-4" : "translate-x-1"
                            } shadow-sm"></span>
                        </button>
                        
                        <span class="text-[10px] px-2 font-bold ${
                          showTrans ? "text-blue-600" : "text-slate-400"
                        } cursor-default">
                            CN
                        </span>
                    </div>

                    <div class="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm ml-2">
                        <button ${mdBtnAttr} class="px-2 py-1 rounded transition-colors ${mdBtnClass}" title="${
    showTrans ? "翻译模式下禁用" : "复制 Markdown"
  }">
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
      disableOneColumnMode: false, // 移动端保持布局
      staticGrid: false, // 允许拖拽
      disableResize: true, // ✅ 核心：默认禁止所有调整大小，点击按钮才开启
      handle: ".drag-handle",
      // resizable 配置在 enableResize 开启时生效
      resizable: { handles: "se" }, // 只允许右下角
    },
    gridEl
  );

  const templateId = report.meta?.templateId || "default";
  const savedLayout = JSON.parse(
    localStorage.getItem(`layout_config_${templateId}`) || "[]"
  );

  const widgets = [];
  const keys = Object.keys(report).filter((k) => k !== "meta");

  keys.forEach((key) => {
    let content = report[key];
    if (
      state.showTranslation &&
      state.translatedReport &&
      state.translatedReport[key]
    ) {
      content = state.translatedReport[key];
    }
    // 使用之前的 calculateWidgetHeight
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

  // ✅ 绑定全局点击事件：点击空白处退出 Resize 模式
  document.addEventListener("mousedown", handleGlobalClickForResize);
}

// 全局点击监听：用于退出 Resize 模式
function handleGlobalClickForResize(e) {
  // 如果点击的是 resize handle 或 resize 按钮，忽略
  if (
    e.target.closest(".ui-resizable-handle") ||
    e.target.closest(".btn-resize")
  )
    return;

  // 查找当前处于 resizing 状态的卡片
  const resizingCard = document.querySelector(".grid-stack-item.is-resizing");
  if (resizingCard && !resizingCard.contains(e.target)) {
    // 如果点击到了卡片外部，关闭 resize
    const key = resizingCard.getAttribute("gs-id");
    window.toggleCardResize(key, false); // 强制关闭
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
  localStorage.setItem(
    `layout_config_${templateId}`,
    JSON.stringify(cleanLayout)
  );
}

// ==========================================
// 5. Widget 内容渲染 (视觉优化版)
// ==========================================

function renderWidgetContent(key, report, transReport) {
  const origVal = report[key];
  const showTrans = state.showTranslation;
  const transVal = showTrans && transReport ? transReport[key] : undefined;
  const displayVal = getDisplayValue(origVal, transVal);

  const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
  const title = moduleConfig ? moduleConfig.label_cn : getFieldTitle(key);

  // 样式定义：微调颜色饱和度，使其更高级
  let style = {
    color: "slate",
    bg: "bg-slate-500",
    lightBg: "bg-slate-100",
    icon: "fa-info-circle",
    border: "border-slate-200",
  };
  if (moduleConfig) {
    if (moduleConfig.category === "listing")
      style = {
        color: "blue",
        bg: "bg-blue-600",
        lightBg: "bg-blue-50",
        icon: "fa-file-alt",
        border: "border-blue-100",
      };
    else if (moduleConfig.category === "reviews")
      style = {
        color: "orange",
        bg: "bg-orange-500",
        lightBg: "bg-orange-50",
        icon: "fa-comments",
        border: "border-orange-100",
      };
    else if (moduleConfig.category === "cross")
      style = {
        color: "purple",
        bg: "bg-purple-600",
        lightBg: "bg-purple-50",
        icon: "fa-random",
        border: "border-purple-100",
      };
  }

  const editBtnState = showTrans ? "disabled" : "";
  const editBtnClass = showTrans
    ? "text-slate-300 cursor-not-allowed opacity-50"
    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer";

  // 视觉优化点：
  // 1. shadow-sm -> shadow-sm hover:shadow-lg (更明显的悬浮深度)
  // 2. border-slate-200 -> border-slate-200/60 (更轻盈的边框)
  // 3. 头部去掉 border-b，改用 padding 区分
  // 替换原有的 wrapperStart 定义
  const wrapperStart = `
        <div id="widget-card-${key}" class="analysis-widget-card widget-card-container group/card">
            
            <div class="flex-shrink-0 flex justify-between items-center px-5 pt-5 pb-2 bg-white select-none drag-handle cursor-move">
                <h3 class="text-[15px] font-bold text-slate-800 flex items-center gap-2.5 pointer-events-none truncate mr-2">
                    <span class="w-8 h-8 rounded-xl ${style.lightBg} text-${
                      style.color
                    }-600 flex items-center justify-center text-xs flex-shrink-0 shadow-sm transition-transform group-hover/card:scale-105">
                        <i class="fas ${style.icon}"></i>
                    </span>
                    <span class="truncate tracking-tight" title="${title}">${title}</span>
                </h3>
                
                <div class="flex items-center gap-1 bg-white pl-2">
                    
                    <div class="view-controls flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-x-2 group-hover/card:translate-x-0">
                        <button onclick="window.toggleCardResize('${key}', true)" class="btn-resize w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="调整大小">
                            <i class="fas fa-expand-alt text-xs"></i>
                        </button>
                        
                        <button onclick="${
                          showTrans ? "" : `window.startLocalEdit('${key}')`
                        }" 
                                ${editBtnState}
                                class="btn-edit w-8 h-8 flex items-center justify-center rounded-lg transition-all ${editBtnClass}" 
                                title="${
                                  showTrans ? "翻译模式不可编辑" : "编辑内容"
                                }">
                            <i class="fas fa-pen text-xs"></i>
                        </button>
                    </div>

                    <div class="edit-controls hidden flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <button onclick="window.undoLocalEdit('${key}')" class="btn-undo w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200" title="撤销">
                            <i class="fas fa-undo text-xs"></i>
                        </button>
                        <button onclick="window.saveLocalEdit('${key}')" class="btn-save px-3 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all text-xs font-medium" title="完成">
                            <i class="fas fa-check"></i> <span>完成</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div id="widget-content-${key}" class="flex-1 px-5 pb-5 pt-2 overflow-y-auto custom-scrollbar relative leading-relaxed widget-content-area">
    `;

  let contentHtml = renderViewModeHTML(displayVal, style);
  return wrapperStart + contentHtml + `</div></div>`;
}

// ==========================================
// 辅助：生成查看模式的 HTML (拆分重构版)
// ==========================================
function renderViewModeHTML(val, style) {
  // 0. 空状态
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    (Array.isArray(val) && val.length === 0)
  ) {
    return _renderEmptyState();
  }

  // 1. 纯文本
  if (typeof val === "string") {
    return `<div class="text-[13px] leading-relaxed text-slate-700 font-sans tracking-wide whitespace-pre-wrap selection:bg-blue-100/50 selection:text-blue-900">${val}</div>`;
  }

  // 2. 数组处理
  if (Array.isArray(val)) {
    if (typeof val[0] === "string") return _renderStringArray(val);
    if (typeof val[0] === "object") return _renderObjectArray(val);
  }

  // 3. 兜底
  return `<div class="text-xs text-slate-400 font-mono">${JSON.stringify(
    val
  )}</div>`;
}

// 🏠 私有辅助函数：渲染空状态
function _renderEmptyState() {
  return `
      <div class="h-24 flex flex-col items-center justify-center text-slate-300/60 select-none">
        <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <i class="fas fa-minus text-xs"></i>
        </div>
        <span class="text-[11px] font-medium tracking-wide">暂无数据</span>
      </div>`;
}

// 🏷️ 私有辅助函数：渲染字符串数组 (标签/路径)
function _renderStringArray(val) {
  const isPath = val.some((s) => s.includes(" + "));

  if (isPath) {
    return `
      <div class="flex flex-col gap-2 mt-1">
        ${val
          .map(
            (item) => `
          <div class="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-600 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100 hover:border-blue-100 transition-colors">
             ${item
               .split(" + ")
               .map(
                 (part, idx, arr) => `
                <span class="font-medium ${
                  idx === arr.length - 1 ? "text-slate-800" : "text-slate-500"
                }">${part.trim()}</span>
                ${
                  idx < arr.length - 1
                    ? `<i class="fas fa-chevron-right text-[9px] text-slate-300 mx-1"></i>`
                    : ""
                }
             `
               )
               .join("")}
          </div>
        `
          )
          .join("")}
      </div>`;
  }

  return `
    <div class="flex flex-wrap gap-2 pt-1">
      ${val
        .map(
          (item) => `
        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-50 text-slate-700 border border-slate-200/60 hover:bg-white hover:shadow-sm hover:text-blue-600 hover:border-blue-200 transition-all cursor-default select-all">
           ${item}
        </span>
      `
        )
        .join("")}
    </div>`;
}

// 📋 私有辅助函数：渲染对象数组 (KV列表)
function _renderObjectArray(val) {
  return `
    <div class="flex flex-col gap-3">
        ${val
          .map(
            (obj) => `
            <div class="relative group/card bg-white rounded-xl border border-slate-100 p-3 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all duration-300">
                <div class="absolute left-0 top-3 bottom-3 w-0.5 bg-blue-500 rounded-r opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div class="grid gap-y-2 gap-x-4">
                ${Object.keys(obj)
                  .map(
                    (subKey) => `
                    <div class="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-1 sm:gap-4 items-baseline">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left sm:text-right select-none pt-0.5">
                            ${getFieldTitle(subKey)}
                        </div>
                        <div class="text-[13px] text-slate-700 leading-6 font-medium break-words">
                            ${
                              typeof obj[subKey] === "object"
                                ? JSON.stringify(obj[subKey])
                                : obj[subKey] ||
                                  '<span class="text-slate-300">-</span>'
                            }
                        </div>
                    </div>`
                  )
                  .join("")}
                </div>
            </div>`
          )
          .join("")}
    </div>`;
}

// ✅ 新增：根据内容计算 GridStack 高度单元 (Auto-height)
function calculateWidgetHeight(content) {
  if (!content) return 4;
  let textLength = 0;
  let lineCount = 0;

  // 简单估算文本量
  if (typeof content === "string") {
    textLength = content.length;
    lineCount = content.split("\n").length;
  } else if (Array.isArray(content)) {
    // 针对数组/对象类型的估算
    const str = JSON.stringify(content);
    textLength = str.length;
    lineCount = Array.isArray(content) ? content.length * 1.5 : 5;
  } else if (typeof content === "object") {
    const str = JSON.stringify(content);
    textLength = str.length;
    lineCount = Object.keys(content).length * 2;
  }

  // GridStack 的 1个h unit 大约是 cellHeight + margin (默认约 60-80px)
  // 假设 1个单位高度能容纳约 150 个字符 或 4 行文本
  const heightByChar = Math.ceil(textLength / 150);
  const heightByLine = Math.ceil(lineCount / 3);

  // 基础高度 3，最大高度限制 20 (防止过长)，取两者最大值
  let h = Math.max(3, heightByChar, heightByLine);
  // 稍微增加一点缓冲
  return Math.min(h + 2, 24);
}

// ==========================================
// 6. 辅助工具与导出
// ==========================================

function getDisplayValue(orig, trans) {
  return state.showTranslation && trans !== undefined && trans !== null
    ? trans
    : orig;
}
function getUntranslatedBadge(orig, trans) {
  return state.showTranslation && (trans === undefined || trans === null)
    ? `<span class="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium border border-red-100 flex items-center gap-1"><i class="fas fa-language"></i> 未翻译</span>`
    : "";
}

// ✅ 状态更新优化：互斥显示顶部编辑按钮和底部状态栏
function updateToolbarState(isFrozen) {
  const editBtn = document.getElementById("edit-mode-btn");
  const copyMdBtn = document.getElementById("copy-markdown-btn");
  const translateBtn = document.getElementById("translate-btn");
  const editStatusBar = document.getElementById("edit-status-bar");

  if (isFrozen) {
    if (editBtn) {
      editBtn.classList.remove("hidden");
      editBtn.disabled = true;
      editBtn.innerHTML = '<i class="fas fa-lock mr-1"></i> 锁定';
      editBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
    if (editStatusBar) editStatusBar.classList.add("hidden");
    if (copyMdBtn) copyMdBtn.classList.add("opacity-50", "pointer-events-none");
    if (translateBtn)
      translateBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    if (editBtn) {
      editBtn.disabled = false;
      editBtn.classList.remove("opacity-50", "cursor-not-allowed");

      if (state.isEditing) {
        editBtn.classList.add("hidden"); // 编辑时隐藏顶部按钮
        if (editStatusBar) editStatusBar.classList.remove("hidden");
      } else {
        editBtn.classList.remove("hidden");
        editBtn.innerHTML = '<i class="fas fa-pen mr-1"></i> 编辑内容';
        if (editStatusBar) editStatusBar.classList.add("hidden");
      }
    }

    if (copyMdBtn)
      copyMdBtn.classList.remove("opacity-50", "pointer-events-none");

    if (translateBtn) {
      translateBtn.disabled = state.isEditing;
      translateBtn.classList.toggle("opacity-50", state.isEditing);
      translateBtn.classList.toggle("cursor-not-allowed", state.isEditing);
    }
  }
}

function setNestedValue(obj, path, value) {
  const parts = path.split(".");
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  if (target[lastKey] !== value) {
    target[lastKey] = value;
    return true;
  }
  return false;
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

function generateDynamicMarkdown(data, depth = 1) {
  if (!data) return "";
  let md = "";
  Object.keys(data)
    .filter((k) => k !== "meta")
    .forEach((key) => {
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
// 6. Public Exports (Exports for Main/Window)
// ==========================================

// 刷新单个卡片 (防止全量刷新)
function refreshWidgetUI(fullPath) {
  if (!grid) return;
  const rootKey = fullPath.split(".")[0];
  const gridItem = document.querySelector(
    `.grid-stack-item[gs-id="${rootKey}"]`
  );
  if (!gridItem) return;

  const newContentHTML = renderWidgetContent(
    rootKey,
    state.analysisReport,
    state.translatedReport
  );
  const oldContent = gridItem.querySelector(".grid-stack-item-content");
  if (oldContent) {
    oldContent.outerHTML = newContentHTML;
  } else {
    gridItem.innerHTML = newContentHTML;
  }

  const newContentEl = gridItem.querySelector(".grid-stack-item-content");
  if (newContentEl) setupAutoSave(newContentEl);
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

  const provider = localStorage.getItem("llm_active_provider");
  if (!provider) {
    showToast("请先配置AI模型", "warning");
    return;
  }
  const config = JSON.parse(localStorage.getItem(`llm_${provider}`) || "{}");
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

// 导出 updateAsinSelectList 供 main.js 或 scraperPanel 调用
export function updateAsinSelectList() {
  const list = document.getElementById("asin-select-list");
  if (!state.scrapedData?.products?.length) {
    list.innerHTML =
      '<p class="text-sm text-slate-400 text-center py-4">暂无数据</p>';
    return;
  }
  list.innerHTML = state.scrapedData.products
    .map(
      (p) => `
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
          state.selectedAsins.includes(p.asin)
            ? "bg-blue-50 border border-blue-100"
            : "border border-transparent"
        }">
            <input type="checkbox" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" ${
              state.selectedAsins.includes(p.asin) ? "checked" : ""
            } onchange="window.toggleAsinSelection('${p.asin}')">
            <span class="font-mono text-sm text-slate-700">${p.asin}</span>
            <span class="status-dot ${
              p.scrape_status === "success"
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
    const config = JSON.parse(localStorage.getItem(`llm_${key}`) || "{}");
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

// 暂存原始数据的 Map (用于最终放弃编辑时的恢复)
const originalDataMap = new Map();
// ✅ 新增：编辑步骤历史栈 (用于精细化撤销)
const editHistoryMap = new Map();

window.toggleCardResize = function (key, forceState) {
  const el = document.querySelector(`.grid-stack-item[gs-id="${key}"]`);
  const card = document.getElementById(`widget-card-${key}`);
  const btn = card.querySelector(".btn-resize");

  if (!el || !grid) return;

  // 判断当前状态
  const isResizing =
    forceState !== undefined
      ? forceState
      : !el.classList.contains("is-resizing");

  // 极简风样式定义：
  // 1. 卡片：使用灰色虚线边框 (Dashed Border) 暗示“结构可变”，去除背景干扰
  const activeCardClasses = [
    "is-resizing",
    "border-2",
    "border-dashed",
    "border-gray-300",
    "bg-gray-50/30",
    "transition-all",
    "duration-300",
  ];

  // 2. 按钮：仅加深颜色或轻微底色，保持克制，不做强强调
  const activeBtnClasses = ["text-gray-900", "bg-gray-100"];

  if (isResizing) {
    // ------------------------------------------------------
    // 开启：进入“蓝图”编辑态
    // ------------------------------------------------------

    // 视觉：添加虚线边框，给予极淡的背景区分，暗示这是“草稿/编辑”状态
    el.classList.add(...activeCardClasses);

    // 逻辑
    grid.resizable(el, true);

    // 按钮：轻微的反馈，表示“按下”
    if (btn) btn.classList.add(...activeBtnClasses);
  } else {
    // ------------------------------------------------------
    // 关闭：回归“展示”沉浸态
    // ------------------------------------------------------

    // 视觉：移除所有辅助线，回归干净的卡片
    el.classList.remove(...activeCardClasses);

    // 逻辑
    grid.resizable(el, false);

    // 按钮：恢复默认（通常是浅灰色或透明）
    if (btn) btn.classList.remove(...activeBtnClasses);

    // 自动保存布局
    const templateId = state.analysisReport.meta?.templateId || "default";
    saveGridLayout(templateId);
  }
};

// ==========================================
// 辅助：生成表单 HTML (大手术重构版：无缝编辑体验)
// ==========================================
function renderEditorForm(key, data) {
  // 自动高度脚本
  const autoResizeJS =
    "this.style.height='auto';this.style.height=this.scrollHeight+'px'";

  // 初始高度计算 (更精确)
  const calcHeight = (val) => {
    if (!val) return "28px";
    const lines = val.toString().split("\n").length;
    return Math.max(lines, 1) * 24 + 4 + "px";
  };

  // 样式系统：无边框、沉浸式
  // inputStyle: 移除默认边框，聚焦时仅改变背景色，模拟 Notion 风格
  // 样式系统：使用 CSS 类替代长字符串
  const inputStyle = "editor-input-modern";
  // 按钮样式
  const deleteBtnStyle =
    "w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100";
  const addBtnStyle =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all mt-2 cursor-pointer select-none";

  // 1. String -> 纯文本编辑器
  if (typeof data === "string") {
    return `<div class="py-1 group relative">
              <textarea id="input-${key}" 
                class="${inputStyle} min-h-[80px]" 
                style="height: ${calcHeight(data)}"
                oninput="${autoResizeJS}"
                onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}" 
                placeholder="在此输入内容..."
              >${data}</textarea>
              <div class="absolute right-0 top-0 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Shift+Enter 换行
              </div>
            </div>`;
  }

  // 2. Array<String> -> 列表编辑器
  if (Array.isArray(data) && typeof data[0] === "string") {
    return `
            <div id="list-container-${key}" class="flex flex-col gap-2">
                ${data
                  .map(
                    (item) => `
                    <div class="edit-row group flex items-start gap-2 relative">
                        <div class="pt-2.5 pl-1"> 
                            <div class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
                        </div>
                        <div class="flex-1 relative">
                            <textarea class="${inputStyle}" 
                                      rows="1" 
                                      style="height: ${calcHeight(item)}"
                                      oninput="${autoResizeJS}"
                                      onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}"
                            >${item}</textarea>
                        </div>
                        <div class="pt-1">
                            <button onclick="window.deleteRowItem(this, '${key}')" class="${deleteBtnStyle}" title="删除此项">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <button onclick="window.addListItem('${key}')" class="${addBtnStyle}">
                <i class="fas fa-plus text-[10px]"></i> <span>添加条目</span>
            </button>
        `;
  }

  // 3. Array<Object> -> 结构化编辑器 (Bug 修复 + 布局对齐)
  if (Array.isArray(data) && typeof data[0] === "object") {
    return `
            <div id="obj-list-container-${key}" class="flex flex-col gap-3">
                ${data
                  .map(
                    (obj) => `
                    <div class="edit-row group relative bg-slate-50/30 rounded-xl border border-slate-100 p-3 hover:border-blue-200/50 hover:bg-slate-50/80 transition-all">
                        
                        <button onclick="window.deleteRowItem(this, '${key}')" class="${deleteBtnStyle} absolute top-2 right-2 bg-white shadow-sm border border-slate-100 z-10">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>

                        <div class="grid gap-y-2 gap-x-4">
                            ${Object.keys(obj)
                              .map(
                                (subKey) => `
                                <div class="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-1 sm:gap-4 items-start group/field">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left sm:text-right select-none pt-2 cursor-default group-hover/field:text-blue-400 transition-colors">
                                      ${getFieldTitle(subKey)}
                                    </label>
                                    
                                    <div class="relative w-full">
                                        <textarea data-subkey="${subKey}" 
                                                  class="${inputStyle} obj-input" 
                                                  rows="1" 
                                                  style="height: ${calcHeight(
                                                    typeof obj[subKey] ===
                                                      "object"
                                                      ? JSON.stringify(
                                                          obj[subKey]
                                                        )
                                                      : obj[subKey]
                                                  )}"
                                                  oninput="${autoResizeJS}"
                                                  onfocus="pushEditSnapshot('${key}'); ${autoResizeJS}"
                                        >${
                                          typeof obj[subKey] === "object"
                                            ? JSON.stringify(obj[subKey])
                                            : obj[subKey]
                                        }</textarea>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            
            <button onclick="window.addObjItem('${key}')" class="${addBtnStyle}">
                <i class="fas fa-plus"></i> <span>添加数据组</span>
            </button>
            <script id="tpl-${key}" type="application/json">${JSON.stringify(
      data[0] || {}
    )}</script>
        `;
  }

  return `<div class="py-8 text-center text-slate-300 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">暂不支持编辑此类型数据</div>`;
}

// --- 辅助函数：采集当前表单数据 ---
function captureFormData(key) {
  const textInput = document.getElementById(`input-${key}`);
  const listContainer = document.getElementById(`list-container-${key}`);
  const objContainer = document.getElementById(`obj-list-container-${key}`);

  if (textInput) {
    return textInput.value; // String
  } else if (listContainer) {
    // String Array
    return Array.from(listContainer.querySelectorAll("textarea")).map(
      (el) => el.value
    );
  } else if (objContainer) {
    // Object Array
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

// --- 辅助函数：保存快照到历史栈 ---
function pushEditSnapshot(key) {
  const currentData = captureFormData(key);
  if (currentData === null) return;

  if (!editHistoryMap.has(key)) {
    editHistoryMap.set(key, []);
  }
  const stack = editHistoryMap.get(key);
  // 深拷贝存入栈
  stack.push(JSON.parse(JSON.stringify(currentData)));

  // 更新 UI 按钮状态 (有历史则显示撤销)
  updateUndoButtonState(key);
}

function updateUndoButtonState(key) {
  const card = document.getElementById(`widget-card-${key}`);
  const undoBtn = card?.querySelector(".btn-undo"); // 假设您给撤销按钮加了这个类
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

  // UI 切换
  card.classList.add("is-editing");
  card.querySelector(".view-controls").classList.add("hidden");
  card.querySelector(".view-controls").classList.remove("flex");
  card.querySelector(".edit-controls").classList.remove("hidden");
  card.querySelector(".edit-controls").classList.add("flex");

  // 禁用拖拽
  const gridItem = card.closest(".grid-stack-item");
  if (grid && gridItem) grid.movable(gridItem, false);

  // 获取当前数据源
  const currentData =
    state.showTranslation &&
    state.translatedReport &&
    state.translatedReport[key]
      ? state.translatedReport[key]
      : state.analysisReport[key];

  // 初始化：存入原始数据用于“取消”
  originalDataMap.set(key, JSON.parse(JSON.stringify(currentData || "")));
  // 初始化：清空历史栈
  editHistoryMap.set(key, []);

  // 渲染表单
  contentDiv.innerHTML = renderEditorForm(key, currentData);

  // 初始化撤销按钮状态
  updateUndoButtonState(key);
};

// --- 2. 动态添加条目 (样式对齐) ---
window.addListItem = function (key) {
  pushEditSnapshot(key);

  const container = document.getElementById(`list-container-${key}`);
  const div = document.createElement("div");

  // 更新为 CSS 类引用
  div.className =
    "editor-row-item edit-row group animate-in fade-in slide-in-from-bottom-1";

  // 更新 innerHTML 中的 class
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

// --- 3. 动态删除条目 (带快照) ---
window.deleteRowItem = function (btn, key) {
  // 动作前：保存快照
  pushEditSnapshot(key);
  btn.closest(".edit-row").remove();
};

// 兼容 Object 类型的添加
window.addObjItem = function (key) {
  pushEditSnapshot(key); // 快照

  const container = document.getElementById(`obj-list-container-${key}`);
  const tplContent = document.getElementById(`tpl-${key}`)?.textContent || "{}";
  const templateObj = JSON.parse(tplContent);
  Object.keys(templateObj).forEach((k) => (templateObj[k] = "")); // 清空模板值

  const div = document.createElement("div");
  div.className =
    "edit-row p-3 bg-slate-50 border border-slate-200 rounded relative group animate-in fade-in slide-in-from-bottom-2";
  div.innerHTML = `
        <button onclick="window.deleteRowItem(this, '${key}')" class="btn-delete-row absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all">
            <i class="fas fa-times"></i>
        </button>
        ${Object.keys(templateObj)
          .map(
            (subKey) => `
            <div class="mb-2">
                <label class="text-[10px] font-bold text-slate-400 uppercase">${getFieldTitle(
                  subKey
                )}</label>
                <textarea data-subkey="${subKey}" class="obj-input edit-textarea w-full min-h-[30px] resize-none" rows="1"></textarea>
            </div>
        `
          )
          .join("")}
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

  // 弹出上一个状态
  const prevState = stack.pop();
  const contentDiv = document.getElementById(`widget-content-${key}`);

  // 重新渲染表单为旧状态
  contentDiv.innerHTML = renderEditorForm(key, prevState);

  // 更新按钮状态
  updateUndoButtonState(key);
  showToast("已撤销", "info");
};

// --- 5. 完成/保存逻辑 ---
window.saveLocalEdit = function (key) {
  // 获取最终数据
  const newData = captureFormData(key);

  if (newData !== null) {
    // 更新 State
    if (state.showTranslation && state.translatedReport) {
      state.translatedReport[key] = newData;
    } else {
      state.analysisReport[key] = newData;
      if (state.translatedReport) delete state.translatedReport[key];
    }

    // 持久化
    HistoryService.save(state.scrapedData, state.analysisReport);
    showToast("内容已更新", "success");
  }

  exitEditMode(key);
};

function exitEditMode(key) {
  const card = document.getElementById(`widget-card-${key}`);
  const contentDiv = document.getElementById(`widget-content-${key}`);
  if (!card) return;

  // 恢复 UI
  card.classList.remove("is-editing");
  card.querySelector(".view-controls").classList.remove("hidden");
  card.querySelector(".view-controls").classList.add("flex");
  card.querySelector(".edit-controls").classList.add("hidden");
  card.querySelector(".edit-controls").classList.remove("flex");

  const gridItem = card.closest(".grid-stack-item");
  if (grid && gridItem) grid.movable(gridItem, true);

  // 渲染视图模式
  const currentData =
    state.showTranslation &&
    state.translatedReport &&
    state.translatedReport[key]
      ? state.translatedReport[key]
      : state.analysisReport[key];

  // 重新获取样式配置 (保持原逻辑)
  const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
  let style = {
    color: "slate",
    bg: "bg-slate-500",
    lightBg: "bg-slate-50",
    icon: "fa-info-circle",
  };
  if (moduleConfig) {
    if (moduleConfig.category === "listing")
      style = {
        color: "blue",
        bg: "bg-blue-500",
        lightBg: "bg-blue-50",
        icon: "fa-file-alt",
      };
    else if (moduleConfig.category === "reviews")
      style = {
        color: "orange",
        bg: "bg-orange-500",
        lightBg: "bg-orange-50",
        icon: "fa-comments",
      };
    else if (moduleConfig.category === "cross")
      style = {
        color: "purple",
        bg: "bg-purple-500",
        lightBg: "bg-purple-50",
        icon: "fa-random",
      };
  }

  contentDiv.innerHTML = renderViewModeHTML(currentData, style);

  // 清理内存
  originalDataMap.delete(key);
  editHistoryMap.delete(key);
}
