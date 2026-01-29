// src/modules/master_prompt/promptlab/promptlabDisplay.js
import BaseModule from "../../../../common/BaseModule.js";
import { promptlabService } from "./promptlabService.js";
import state from "../../../../common/state.js";
import SITE_CONFIGS from "../../../../common/constants/constants.js";
import { ANALYSIS_MODULES } from "../../../../common/constants/prompts.js";
import { showToast } from "../../../../common/utils/ui.js";
import { registerActionsWithLegacy } from "../../../../common/utils/actionRegistry.js";

class PromptlabModule extends BaseModule {
    constructor() {
        super('master_prompt_promptlab');
        this.currentConsoleMode = "listing";
        this.registerGlobalActions();
    }

    async render() {
        // HTML is preloaded
    }

    async init() {
        console.log("🚀 Prompt Lab Module Initialized (BaseModule)");
        this.setupEventListeners();
        this.restoreInputsFromState();
        this.renderReportAnalysis();
        this.updateButtonState();
    }

    onUnmount() {
        console.log("💤 Prompt Lab Module Unmounting...");
    }

    setupEventListeners() {
        if (!this.container) return;

        this.addEventListener(this.container, "change", (e) => {
            this.saveInputsToState();
            if (e.target.id === "lab-char-limit") this.updateCharCount();
            this.updateButtonState();
        });

        // Bind input listeners for Tier 1 & Tier 2
        ["lab-keywords-tier1", "lab-keywords-tier2"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) this.addEventListener(el, "input", () => this.updateButtonState());
        });

        // Bind output character count
        const outEl = document.getElementById("final-prompt-output");
        if (outEl) this.addEventListener(outEl, "input", () => this.updateCharCount());
    }

    // ================= 辅助：生成语言选项 =================
    generateLanguageOptions() {
        const select = document.getElementById("lab-target-market");
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>选择目标站点/语言...</option>';

        Object.entries(SITE_CONFIGS).forEach(([code, config]) => {
            const option = document.createElement("option");
            option.value = config.name;
            option.textContent = `${config.name} (${config.domain})`;
            option.dataset.locale = config.locale;
            select.appendChild(option);
        });
    }

    // ================= 核心：按钮状态实时校验 =================
    updateButtonState() {
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

    saveInputsToState() {
        const selectedSections = [];
        document.querySelectorAll('input[name="report-section"]:checked').forEach((cb) => {
            selectedSections.push(cb.value);
        });

        state.promptlab.userProductProfile = {
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

    restoreInputsFromState() {
        const p = state.promptlab.userProductProfile;
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

        this.updateCharCount();
        this.updateButtonState();
    }

    renderReportAnalysis() {
        const container = document.getElementById("report-sections-container");
        const checkboxMain = document.getElementById("use-analysis-data");
        const statusDiv = document.getElementById("lab-analysis-status");
        const marketSelect = document.getElementById("lab-target-market");

        if (marketSelect && marketSelect.options.length <= 1) {
            this.generateLanguageOptions();
        }

        if (!container || !checkboxMain) return;

        if (!state.analysis.analysisReport) {
            statusDiv.className = "px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1";
            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告';
            checkboxMain.disabled = true;
            checkboxMain.checked = false;
            container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
            container.className = "mt-3";
            this.updateButtonState();
            return;
        }

        statusDiv.className = "px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1";
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> 分析报告已就绪';
        checkboxMain.disabled = false;
        checkboxMain.checked = true;

        // Batch Actions
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

            this.setTimeout(() => {
                const selBtn = document.getElementById("btn-select-all");
                if (selBtn) this.addEventListener(selBtn, 'click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = true));
                    this.saveInputsToState();
                    showToast("已全选模块", "success");
                });
                const clrBtn = document.getElementById("btn-clear-all");
                if (clrBtn) this.addEventListener(clrBtn, 'click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = false));
                    this.saveInputsToState();
                    showToast("已清空选择", "success");
                });
            }, 0);
        }

        // Auto-select language
        if (marketSelect && !state.promptlab.userProductProfile.targetMarket) {
            const reportMarket = state.analysis.analysisReport.targetMarket || state.analysis.analysisReport.language || "";
            if (reportMarket) {
                const options = Array.from(marketSelect.options);
                const match = options.find((opt) =>
                    opt.value.toLowerCase().includes(reportMarket.toLowerCase()) ||
                    reportMarket.toLowerCase().includes(opt.value.toLowerCase())
                );
                if (match) {
                    marketSelect.value = match.value;
                    state.promptlab.userProductProfile.targetMarket = match.value;
                }
            }
        }

        const ignoreKeys = ["meta", "generatedByModel", "generatedAt", "templateUsed", "templateId", "raw_response"];
        const keys = Object.keys(state.analysis.analysisReport).filter((k) => !ignoreKeys.includes(k));

        container.innerHTML = "";
        container.className = "mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3";
        const savedSelection = state.promptlab.userProductProfile.selectedReportSections || [];
        const isFirstLoad = savedSelection.length === 0;

        keys.forEach((key) => {
            if (key === "target_audience") {
                const audienceInput = document.getElementById("lab-audience");
                if (audienceInput && !audienceInput.value) {
                    let val = state.analysis.analysisReport[key];
                    if (Array.isArray(val)) val = val.join(", ");
                    audienceInput.value = val;
                    state.promptlab.userProductProfile.audience = val;
                }
            }

            const label = this.getFieldTitle(key);
            const previewText = this.getPreviewText(state.analysis.analysisReport[key]);
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
        this.updateButtonState();
    }

    getPreviewText(val) {
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
            return JSON.stringify(val).substring(0, 60) + "...";
        } catch (e) { return "Data..."; }
    }

    updateCharCount() {
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

    generateMasterPrompt() {
        const btn = document.getElementById("btn-generate-prompt");
        const select = document.getElementById("lab-target-market");
        const t1 = document.getElementById("lab-keywords-tier1")?.value.trim();
        const t2 = document.getElementById("lab-keywords-tier2")?.value.trim();

        if (btn && btn.dataset.disabledState === "true") {
            let msg = "未就绪";
            if (!state.analysis.analysisReport) msg = "请先前往 [AI 分析] 模块生成竞品报告";
            else if (!select || select.value === "") msg = "请先选择目标站点/语言 (Card 1)";
            else if (!t1) msg = "Tier 1 核心大词不能为空";
            else if (!t2) msg = "Tier 2 长尾词不能为空";
            showToast(msg, "warning");
            return;
        }

        this.saveInputsToState();
        const inputs = {
            ...state.promptlab.userProductProfile,
            useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
        };
        const outEl = document.getElementById("final-prompt-output");
        if (!outEl) return;

        const result = promptlabService.generateMasterPrompt(inputs, state.analysis.analysisReport);
        outEl.value = result;
        this.updateCharCount();
        outEl.classList.add("bg-green-50");
        this.setTimeout(() => outEl.classList.remove("bg-green-50"), 300);
        showToast("Master Prompt 已生成", "success");
    }

    generateVisualPrompt() {
        if (!state.analysis.analysisReport) {
            showToast("请先生成 Ai 分析报告以获取视觉灵感", "warning");
            return;
        }
        this.saveInputsToState();
        const inputs = {
            ...state.promptlab.userProductProfile,
            useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
        };
        const outEl = document.getElementById("final-prompt-output");
        if (!outEl) return;

        const result = promptlabService.generateVisualPrompt(inputs, state.analysis.analysisReport);
        outEl.value = result;
        this.updateCharCount();
        outEl.classList.add("bg-pink-50");
        this.setTimeout(() => outEl.classList.remove("bg-pink-50"), 300);
        showToast("视觉转化剧本已生成", "success");
    }

    toggleConsoleMode(mode) {
        if (this.currentConsoleMode === mode) return;
        this.currentConsoleMode = mode;
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
        this.updateButtonState();
    }

    clearPromptInputs() {
        if (confirm("确定要清空所有输入框吗？")) {
            document.querySelectorAll('#panel-promptlab input[type="text"], #panel-promptlab textarea')
                .forEach((el) => (el.value = ""));
            const select = document.getElementById("lab-target-market");
            if (select) select.value = "";
            this.saveInputsToState();
            this.updateButtonState();
            showToast("已清空", "success");
        }
    }

    registerGlobalActions() {
        registerActionsWithLegacy({
            amz_generateMasterPrompt: () => this.generateMasterPrompt(),
            amz_generateVisualPrompt: () => this.generateVisualPrompt(),
            amz_toggleConsoleMode: (m) => this.toggleConsoleMode(m),
            amz_copyMasterPrompt: () => {
                const copyText = document.getElementById("final-prompt-output");
                if (copyText && copyText.value.length > 10) {
                    copyText.select();
                    document.execCommand("copy");
                    showToast("Prompt 已复制", "success");
                }
            },
            amz_clearPromptInputs: () => this.clearPromptInputs(),
        });
    }

    // Helper to access the standalone function from within the class if needed
    getFieldTitle(key) {
        return getFieldTitle(key);
    }
}

const instance = new PromptlabModule();

export function initPromptlabModule() {
    window.addEventListener("app:route-changed", (e) => {
        const { routeId } = e.detail;
        const container = document.getElementById("panel-promptlab");
        if (routeId === "promptlab") {
            if (!instance._isMounted && container) instance.mount(container);
        } else {
            if (instance._isMounted) instance.unmount();
        }
    });
}

export function getFieldTitle(key) {
    const module = ANALYSIS_MODULES.find((m) => m.id === key);
    if (module) return module.label_cn;
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}