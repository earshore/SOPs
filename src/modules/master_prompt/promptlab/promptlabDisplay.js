// src/ui/promptlabDisplay.js
// 🎯 Phase 4: 迁移 window 全局函数到 ActionRegistry
import { promptlabService } from "./promptlabService.js";
import state from "../../../common/state.js";
import SITE_CONFIGS from "../../../common/constants/constants.js";
import { ANALYSIS_MODULES } from "../../../common/constants/prompts.js";
import { showToast } from "../../../common/utils/ui.js";
import { registerActionsWithLegacy } from "../../../common/utils/actionRegistry.js";

// ================= 辅助：生成语言选项 =================
function generateLanguageOptions() {
  const select = document.getElementById("lab-target-market");
  if (!select) return;

  select.innerHTML =
    '<option value="" disabled selected>选择目标站点/语言...</option>';

  Object.entries(SITE_CONFIGS).forEach(([code, config]) => {
    const option = document.createElement("option");
    option.value = config.name;
    option.textContent = `${config.name} (${config.domain})`;
    option.dataset.locale = config.locale;
    select.appendChild(option);
  });
}

// ================= 核心：按钮状态实时校验 =================
function updateButtonState() {
  const btn = document.getElementById("btn-generate-prompt");
  const btnVisual = document.getElementById("btn-generate-visual");
  const select = document.getElementById("lab-target-market");
  const tier1Input = document.getElementById("lab-keywords-tier1");
  const tier2Input = document.getElementById("lab-keywords-tier2");

  if (!btn) return;

  const hasReport = !!state.analysisReport;
  const hasLanguage = select && select.value !== "";
  const hasTier1 = tier1Input && tier1Input.value.trim().length > 0;
  const hasTier2 = tier2Input && tier2Input.value.trim().length > 0;
  const isReady = hasReport && hasLanguage && hasTier1 && hasTier2;

  // 2. 切换样式
  if (isReady) {
    btn.dataset.disabledState = "false";
    btn.classList.remove("bg-slate-300", "text-slate-500", "cursor-not-allowed", "shadow-none");
    btn.classList.add(
      "bg-gradient-to-r", "from-blue-500", "to-purple-600",
      "hover:from-blue-400", "hover:to-purple-500", "text-white",
      "shadow-md", "transform", "hover:scale-[1.02]", "cursor-pointer"
    );
    btn.innerHTML = '<i class="fas fa-microchip"></i> 生成 Master Prompt';
  } else {
    btn.dataset.disabledState = "true";
    btn.classList.remove(
      "bg-gradient-to-r", "from-blue-500", "to-purple-600",
      "hover:from-blue-400", "hover:to-purple-500", "text-white",
      "shadow-md", "transform", "hover:scale-[1.02]", "cursor-pointer"
    );
    btn.classList.add("bg-slate-300", "text-slate-500", "cursor-not-allowed", "shadow-none");

    if (!hasReport) {
      btn.innerHTML = '<i class="fas fa-lock"></i> 请先生成 Ai 分析报告';
    } else if (!hasLanguage) {
      btn.innerHTML = '<i class="fas fa-globe"></i> 请选择目标站点/语言';
    } else if (!hasTier1) {
      btn.innerHTML = '<i class="fas fa-pen"></i> 请填写 Tier 1 核心词';
    } else if (!hasTier2) {
      btn.innerHTML = '<i class="fas fa-pen"></i> 请填写 Tier 2 长尾词';
    }
  }

  // 3. 视觉剧本按钮样式
  if (btnVisual) {
    if (isReady) {
      btnVisual.disabled = false;
      btnVisual.classList.remove("opacity-50", "cursor-not-allowed");
      btnVisual.classList.add("hover:bg-white/20", "hover:scale-[1.02]", "cursor-pointer");
    } else {
      btnVisual.disabled = true;
      btnVisual.classList.add("opacity-50", "cursor-not-allowed");
      btnVisual.classList.remove("hover:bg-white/20", "hover:scale-[1.02]", "cursor-pointer");
    }
  }
}

// ================= 辅助：保存 UI 数据到 State =================
function saveInputsToState() {
  const selectedSections = [];
  document
    .querySelectorAll('input[name="report-section"]:checked')
    .forEach((cb) => {
      selectedSections.push(cb.value);
    });

  state.userProductProfile = {
    targetMarket: document.getElementById("lab-target-market")?.value || "",
    keywordsTier1: document.getElementById("lab-keywords-tier1")?.value || "",
    keywordsTier2: document.getElementById("lab-keywords-tier2")?.value || "",
    audience: document.getElementById("lab-audience")?.value || "",
    usps: document.getElementById("lab-usps")?.value || "",
    specs: document.getElementById("lab-specs")?.value || "",
    socialHook: document.getElementById("lab-social-hook")?.value || "",
    negative: document.getElementById("negative-keywords")?.value || "",

    tone: document.getElementById("lab-tone")?.value || "professional",
    customStrategy: document.getElementById("lab-custom-strategy")?.value || "",
    useCosmo: document.getElementById("opt-cosmo")?.checked || false,
    useRufus: document.getElementById("opt-rufus")?.checked || false,
    useEmoji: document.getElementById("opt-emoji")?.checked || false,

    selectedReportSections: selectedSections,
    charLimit: document.getElementById("lab-char-limit")?.value || 5000,
  };
}

// ================= 辅助：从 State 恢复 UI =================
function restoreInputsFromState() {
  const p = state.userProductProfile;
  if (!p) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };
  const setCheck = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  };

  setVal("lab-usps", p.usps);
  setVal("lab-specs", p.specs);
  setVal("lab-audience", p.audience);
  setVal("lab-target-market", p.targetMarket);
  setVal("lab-keywords-tier1", p.keywordsTier1);
  setVal("lab-keywords-tier2", p.keywordsTier2);
  setVal("lab-social-hook", p.socialHook);
  setVal("negative-keywords", p.negative);
  setVal("lab-tone", p.tone);
  setVal("lab-custom-strategy", p.customStrategy);
  setVal("lab-char-limit", p.charLimit || 5000);

  setCheck("opt-rufus", p.useRufus);
  setCheck("opt-emoji", p.useEmoji);
  setCheck("opt-cosmo", p.useCosmo);

  updateCharCount();
  updateButtonState();
}

// ================= 核心：解析并渲染报告模块 =================
function renderReportAnalysis() {
  const container = document.getElementById("report-sections-container");
  const checkboxMain = document.getElementById("use-analysis-data");
  const statusDiv = document.getElementById("lab-analysis-status");
  const marketSelect = document.getElementById("lab-target-market");

  if (marketSelect && marketSelect.options.length <= 1) {
    generateLanguageOptions();
  }

  if (!container || !checkboxMain) return;

  if (!state.analysisReport) {
    statusDiv.className = "px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1";
    statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告';
    checkboxMain.disabled = true;
    checkboxMain.checked = false;
    container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
    container.className = "mt-3";
    updateButtonState();
    return;
  }

  statusDiv.className = "px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1";
  statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> 分析报告已就绪';
  checkboxMain.disabled = false;
  checkboxMain.checked = true;

  // 全选/清空按钮逻辑
  const headerRow = checkboxMain.parentElement;
  if (headerRow && !document.getElementById("lab-batch-actions")) {
    headerRow.classList.add("flex", "items-center", "w-full");
    const actionSpan = document.createElement("div");
    actionSpan.id = "lab-batch-actions";
    actionSpan.className = "ml-auto flex items-center gap-3 text-xs font-medium select-none";
    actionSpan.innerHTML = `
            <span id="btn-select-all" class="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">全选</span>
            <span class="text-slate-300">|</span>
            <span id="btn-clear-all" class="text-slate-500 cursor-pointer hover:text-slate-700 hover:underline">清空</span>
        `;
    headerRow.appendChild(actionSpan);

    setTimeout(() => {
      document.getElementById("btn-select-all")?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = true));
        saveInputsToState();
        if (showToast) showToast("已全选模块", "success");
      });
      document.getElementById("btn-clear-all")?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = false));
        saveInputsToState();
        if (showToast) showToast("已清空选择", "success");
      });
    }, 0);
  }

  // 自动选择语言
  if (marketSelect && !state.userProductProfile.targetMarket) {
    const reportMarket = state.analysisReport.targetMarket || state.analysisReport.language || "";
    if (reportMarket) {
      const options = Array.from(marketSelect.options);
      const match = options.find((opt) =>
        opt.value.toLowerCase().includes(reportMarket.toLowerCase()) ||
        reportMarket.toLowerCase().includes(opt.value.toLowerCase())
      );
      if (match) {
        marketSelect.value = match.value;
        state.userProductProfile.targetMarket = match.value;
      }
    }
  }

  // 渲染 checkbox
  const ignoreKeys = ["meta", "generatedByModel", "generatedAt", "templateUsed", "templateId", "raw_response"];
  const keys = Object.keys(state.analysisReport).filter((k) => !ignoreKeys.includes(k));

  container.innerHTML = "";
  container.className = "mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3";
  const savedSelection = state.userProductProfile.selectedReportSections || [];
  const isFirstLoad = savedSelection.length === 0;

  keys.forEach((key) => {
    if (key === "target_audience") {
      const audienceInput = document.getElementById("lab-audience");
      if (audienceInput && !audienceInput.value) {
        let val = state.analysisReport[key];
        if (Array.isArray(val)) val = val.join(", ");
        audienceInput.value = val;
        state.userProductProfile.audience = val;
      }
    }

    const label = getFieldTitle(key);
    const moduleConfig = ANALYSIS_MODULES.find((m) => m.id === key);
    const previewText = moduleConfig && moduleConfig.desc_cn ? moduleConfig.desc_cn : getPreviewText(state.analysisReport[key]);
    const isChecked = isFirstLoad ? true : savedSelection.includes(key);

    const div = document.createElement("div");
    div.className = "relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all";
    div.innerHTML = `
            <div class="flex h-5 items-center">
                <input type="checkbox" name="report-section" value="${key}" id="sect-${key}" 
                    class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isChecked ? "checked" : ""}>
            </div>
            <div class="ml-3 text-sm flex-1 min-w-0"> 
                <label for="sect-${key}" class="cursor-pointer select-none w-full block">
                    <span class="font-medium text-slate-700 block mb-0.5 leading-snug">${label}</span>
                    <p class="text-xs text-slate-400 truncate font-normal" title="${previewText}">${previewText}</p>
                </label>
            </div>
        `;
    container.appendChild(div);
  });
  updateButtonState();
}

function getPreviewText(val) {
  if (!val) return "";
  if (typeof val === "string") return val.length > 50 ? val.substring(0, 50) + "..." : val;
  try {
    if (Array.isArray(val)) {
      const texts = val.map((item) => {
        if (typeof item === "object" && item !== null) return Object.values(item).join(" ");
        return String(item || "");
      });
      const str = texts.filter((t) => t.trim()).join(" | ");
      return str.length > 60 ? str.substring(0, 60) + "..." : str;
    }
    if (typeof val === "object") {
      const str = Object.values(val).join(", ");
      return str.length > 60 ? str.substring(0, 60) + "..." : str;
    }
    let rawStr = JSON.stringify(val).replace(/[[\]{}"']/g, "").replace(/,/g, ", ");
    return rawStr.length > 60 ? rawStr.substring(0, 60) + "..." : rawStr;
  } catch (e) {
    return "Complex Data...";
  }
}

function updateCharCount() {
  const outEl = document.getElementById("final-prompt-output");
  const countEl = document.getElementById("prompt-word-count");
  const limitInput = document.getElementById("lab-char-limit");
  if (!outEl || !countEl || !limitInput) return;

  const currentLen = outEl.value.length;
  const limit = parseInt(limitInput.value) || 5000;
  countEl.innerText = `${currentLen} / ${limit} chars`;

  if (currentLen > limit) {
    countEl.className = "text-xs font-bold text-red-600 animate-pulse";
    outEl.classList.add("border-red-300", "focus:ring-red-500");
  } else {
    countEl.className = "text-xs text-slate-400";
    outEl.classList.remove("border-red-300", "focus:ring-red-500");
  }
}

// ================= Global Functions =================

window.amz_generateMasterPrompt = function () {
  const btn = document.getElementById("btn-generate-prompt");
  const select = document.getElementById("lab-target-market");

  // ✅ 修复 1：在这里正确获取 t1, t2 的值，否则下面判断会报错
  const t1 = document.getElementById("lab-keywords-tier1")?.value.trim();
  const t2 = document.getElementById("lab-keywords-tier2")?.value.trim();

  if (btn && btn.dataset.disabledState === "true") {
    let msg = "未就绪";
    if (!state.analysisReport) msg = "请先前往 [AI 分析] 模块生成竞品报告";
    else if (!select || select.value === "") msg = "请先选择目标站点/语言 (Card 1)";
    else if (!t1) msg = "Tier 1 核心大词不能为空";
    else if (!t2) msg = "Tier 2 长尾词不能为空";

    if (showToast) showToast(msg, "warning");
    return;
  }

  saveInputsToState();
  const inputs = {
    ...state.userProductProfile,
    useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
  };
  const outEl = document.getElementById("final-prompt-output");
  if (!outEl) return;

  const result = promptlabService.generateMasterPrompt(inputs, state.analysisReport);
  outEl.value = result;
  updateCharCount();
  outEl.classList.add("bg-green-50");
  setTimeout(() => outEl.classList.remove("bg-green-50"), 300);
  if (showToast) showToast("Master Prompt 已生成!", "success");
};

window.amz_generateVisualPrompt = function () {
  const btn = document.getElementById("btn-generate-visual");
  if (!state.analysisReport) {
    if (showToast) showToast("请先生成 Ai 分析报告以获取视觉灵感", "warning");
    return;
  }
  saveInputsToState();
  const inputs = {
    ...state.userProductProfile,
    useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
  };
  const outEl = document.getElementById("final-prompt-output");
  if (!outEl) return;

  const result = promptlabService.generateVisualPrompt(inputs, state.analysisReport);
  outEl.value = result;
  updateCharCount();
  outEl.classList.add("bg-pink-50");
  setTimeout(() => outEl.classList.remove("bg-pink-50"), 300);
  if (showToast) showToast(" 视觉转化剧本 (Visual Blueprint) 已生成!", "success");
};

// ================= 3D 翻转交互逻辑 =================
let currentConsoleMode = "listing";

window.amz_toggleConsoleMode = function (mode) {
  if (currentConsoleMode === mode) return;
  currentConsoleMode = mode;
  const cardInner = document.getElementById("console-card-inner");
  const toggleContainer = document.getElementById("embed-toggle-container");
  const glider = document.getElementById("mode-toggle-glider");
  const btnListing = document.getElementById("btn-mode-listing");
  const btnVisual = document.getElementById("btn-mode-visual");
  const outputArea = document.getElementById("final-prompt-output");

  if (!cardInner || !glider) return;

  if (mode === "visual") {
    cardInner.style.transform = "rotateY(180deg)";
    glider.style.transform = "translateX(100%)";
    glider.classList.add("bg-pink-500", "text-white");
    glider.classList.remove("bg-white");
    toggleContainer.classList.add("bg-pink-900/30", "border-pink-500/30");
    toggleContainer.classList.remove("bg-white/20", "border-white/10");
    btnListing.classList.replace("text-blue-600", "text-pink-200");
    btnListing.classList.add("opacity-60");
    btnVisual.classList.replace("text-slate-500", "text-white");
    btnVisual.classList.remove("hover:text-pink-600");
    if (outputArea) {
      outputArea.classList.add("bg-pink-50/30");
      outputArea.placeholder = "// 等待生成视觉转化剧本...";
    }
  } else {
    cardInner.style.transform = "rotateY(0deg)";
    glider.style.transform = "translateX(0)";
    glider.classList.remove("bg-pink-500", "text-white");
    glider.classList.add("bg-white");
    toggleContainer.classList.remove("bg-pink-900/30", "border-pink-500/30");
    toggleContainer.classList.add("bg-white/20", "border-white/10");
    btnVisual.classList.replace("text-white", "text-slate-500");
    btnVisual.classList.add("hover:text-pink-600");
    btnListing.classList.replace("text-pink-200", "text-blue-600");
    btnListing.classList.remove("opacity-60");
    if (outputArea) {
      outputArea.classList.remove("bg-pink-50/30");
      outputArea.placeholder = "// 1. 填写左侧信息\n// 2. 点击生成按钮...";
    }
  }
  updateButtonState();
};

window.amz_copyMasterPrompt = function () {
  const copyText = document.getElementById("final-prompt-output");
  if (copyText && copyText.value.length > 10) {
    copyText.select();
    document.execCommand("copy");
    if (showToast) showToast("Prompt 已复制到剪贴板", "success");
  }
};

window.amz_clearPromptInputs = function () {
  if (confirm("确定要清空所有输入框吗？")) {
    document.querySelectorAll('#panel-promptlab input[type="text"], #panel-promptlab textarea')
      .forEach((el) => (el.value = ""));
    const select = document.getElementById("lab-target-market");
    if (select) select.value = "";
    saveInputsToState();
    updateButtonState();
    if (showToast) showToast("已清空", "success");
  }
};

// ================= Initialization =================
export function initPromptlabModule() {
  console.log("🚀 Prompt Lab (Clean UX v5.0) Init...");

  const panel = document.getElementById("panel-promptlab");
  if (panel) {
    panel.addEventListener("change", (e) => {
      saveInputsToState();
      if (e.target.id === "lab-char-limit") updateCharCount();
      updateButtonState();
      ["lab-keywords-tier1", "lab-keywords-tier2"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateButtonState);
      });
    });
    const outEl = document.getElementById("final-prompt-output");
    if (outEl) outEl.addEventListener("input", updateCharCount);
  }

  // ✅ 修复 2：使用事件监听替代 Monkey Patch
  // 监听路由切换事件
  window.addEventListener("app:route-changed", (e) => {
    const { routeId } = e.detail;
    if (routeId === "promptlab") {
      const myPanel = document.getElementById("panel-promptlab");
      if (myPanel) {
        myPanel.classList.add("fade-in");
        restoreInputsFromState(); // 恢复数据
        renderReportAnalysis();   // 渲染复选框 (包含下拉框生成)
      }
    }
  });

  // 如果当前已经是 promptlab (例如刷新页面后)，立即初始化
  if (state.currentTab === "promptlab") {
    restoreInputsFromState();
    renderReportAnalysis();
  }
}

export function getFieldTitle(key) {
  const module = ANALYSIS_MODULES.find((m) => m.id === key);
  if (module) return module.label_cn;
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ================================================================
// 🎯 Phase 4: 集中注册所有动作到 ActionRegistry
// ================================================================

const promptlabActions = {
  amz_generateMasterPrompt: window.amz_generateMasterPrompt,
  amz_generateVisualPrompt: window.amz_generateVisualPrompt,
  amz_toggleConsoleMode: window.amz_toggleConsoleMode,
  amz_copyMasterPrompt: window.amz_copyMasterPrompt,
  amz_clearPromptInputs: window.amz_clearPromptInputs,
};

registerActionsWithLegacy(promptlabActions);

console.log("✅ [promptlabDisplay] 已注册 " + Object.keys(promptlabActions).length + " 个动作到 ActionRegistry");