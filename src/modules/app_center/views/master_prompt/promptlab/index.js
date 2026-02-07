/**
 * Promptlab 子模块
 * 负责 Prompt 生成功能
 * 
 * 架构说明：
 * - 状态保存到 state.masterPrompt.promptlab 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { escapeHtml } from '@/common/utils/security.js';
import { loadTemplate } from '../../../../../common/utils/viewLoader.js';
import eventBus from '../../../../../common/EventBus.js';
import state from '../../../../../common/state.js';
import { promptlabService } from '../services/promptlabService.js';
import SITE_CONFIGS from '../../../../../common/constants/constants.js';
import { ANALYSIS_MODULES } from '../constants/prompts.js';
import { showToast } from '../../../../../common/utils/ui.js';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry.js';

// ========================================== 
// Module State
// ========================================== 

let currentConsoleMode = "listing";
let eventListeners = []; // 用于清理事件监听器
let timeouts = []; // 用于清理定时器
let registeredActions = []; // 用于清理已注册的动作
let listingPromptCache = ""; // 缓存 Listing Prompt
let visualPromptCache = ""; // 缓存 Visual Prompt

// ========================================== 
// Helper Functions
// ========================================== 

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    timeouts.push(id);
    return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup() {
    // 清理事件监听器
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];

    // 清理定时器
    timeouts.forEach(id => clearTimeout(id));
    timeouts = [];
    
    // 清理已注册的动作
    if (registeredActions.length > 0) {
        import('../../../../../common/utils/actionRegistry.js').then(({ unregisterActions }) => {
            unregisterActions(registeredActions);
            console.log(`[Promptlab] 已清理 ${registeredActions.length} 个动作`);
            registeredActions = [];
        }).catch(err => {
            console.warn('[Promptlab] 清理动作失败:', err);
        });
    }
}

/**
 * 获取字段标题
 */
function getFieldTitle(key) {
    const module = ANALYSIS_MODULES.find((m) => m.id === key);
    if (module) return module.label_cn;
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ========================================== 
// State Management
// ========================================== 

/**
 * 保存输入到 state
 */
function saveInputsToState() {
    const selectedSections = [];
    document.querySelectorAll('input[name="report-section"]:checked').forEach((cb) => {
        selectedSections.push(cb.value);
    });

    state.masterPrompt.promptlab = {
        userProductProfile: {
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
        }
    };
}

/**
 * 从 state 恢复输入
 */
function restoreInputsFromState() {
    const p = state.masterPrompt.promptlab?.userProductProfile;
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

// ========================================== 
// UI Functions
// ========================================== 

/**
 * 生成语言选项
 */
function generateLanguageOptions() {
    const select = document.getElementById("lab-target-market");
    if (!select) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    select.innerHTML = '<option value="" disabled selected>选择目标站点/语言...</option>';

    Object.entries(SITE_CONFIGS).forEach(([code, config]) => {
        const option = document.createElement("option");
        option.value = config.name;
        option.textContent = `${config.name} (${config.domain})`;
        option.dataset.locale = config.locale;
        select.appendChild(option);
    });
}

/**
 * 更新按钮状态
 */
function updateButtonState() {
    const btn = document.getElementById("btn-generate-prompt");
    const btnVisual = document.getElementById("btn-generate-visual");
    const select = document.getElementById("lab-target-market");
    const tier1Input = document.getElementById("lab-keywords-tier1");
    const tier2Input = document.getElementById("lab-keywords-tier2");

    if (!btn) return;

    const hasReport = !!state.analysis.analysisReport;
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
        // ✅ 安全: 静态HTML模板，无用户输入
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
            // ✅ 安全: 静态HTML模板，无用户输入
            btn.innerHTML = '<i class="fas fa-lock"></i> 请先生成 Ai 分析报告';
        } else if (!hasLanguage) {
            // ✅ 安全: 静态HTML模板，无用户输入
            btn.innerHTML = '<i class="fas fa-globe"></i> 请选择目标站点/语言';
        } else if (!hasTier1) {
            // ✅ 安全: 静态HTML模板，无用户输入
            btn.innerHTML = '<i class="fas fa-pen"></i> 请填写 Tier 1 核心词';
        } else if (!hasTier2) {
            // ✅ 安全: 静态HTML模板，无用户输入
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

/**
 * 更新字符计数
 */
function updateCharCount() {
    const outEl = document.getElementById("final-prompt-output");
    const countEl = document.getElementById("prompt-word-count");
    const limitInput = document.getElementById("lab-char-limit");
    if (!outEl || !countEl || !limitInput) return;

    const currentLen = outEl.value.length;
    const limit = parseInt(limitInput.value) || 5000;
    countEl.innerText = `${currentLen}`;

    if (currentLen > limit) {
        countEl.className = "font-medium text-red-600 animate-pulse";
        outEl.classList.add("border-red-300", "focus:ring-red-500");
    } else {
        countEl.className = "font-medium text-slate-600";
        outEl.classList.remove("border-red-300", "focus:ring-red-500");
    }
}

/**
 * 渲染报告分析
 */
function renderReportAnalysis() {
    const container = document.getElementById("report-sections-container");
    const checkboxMain = document.getElementById("use-analysis-data");
    const statusDiv = document.getElementById("lab-analysis-status");
    const marketSelect = document.getElementById("lab-target-market");

    if (marketSelect && marketSelect.options.length <= 1) {
        generateLanguageOptions();
    }

    if (!container || !checkboxMain) return;

    if (!state.analysis.analysisReport) {
        statusDiv.className = "px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1";
        // ✅ 安全: 静态HTML模板，无用户输入
        statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告';
        checkboxMain.disabled = true;
        checkboxMain.checked = false;
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
        container.className = "mt-3";
        updateButtonState();
        return;
    }

    statusDiv.className = "px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1";
    // ✅ 安全: 静态HTML模板，无用户输入
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
        // ✅ 安全: 静态HTML模板，无用户输入
        actionSpan.innerHTML = `
            <span id="btn-select-all" class="text-blue-600 cursor-pointer hover:text-blue-800 hover:underline">全选</span>
            <span class="text-slate-300">|</span>
            <span id="btn-clear-all" class="text-slate-500 cursor-pointer hover:text-slate-700 hover:underline">清空</span>
        `;
        headerRow.appendChild(actionSpan);

        addTimeout(() => {
            const selBtn = document.getElementById("btn-select-all");
            if (selBtn) addEventListener(selBtn, 'click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = true));
                saveInputsToState();
                showToast("已全选模块", "success");
            });
            const clrBtn = document.getElementById("btn-clear-all");
            if (clrBtn) addEventListener(clrBtn, 'click', (e) => {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll('input[name="report-section"]').forEach((cb) => (cb.checked = false));
                saveInputsToState();
                showToast("已清空选择", "success");
            });
        }, 0);
    }

    // Auto-select language
    if (marketSelect && !state.masterPrompt.promptlab?.userProductProfile?.targetMarket) {
        const reportMarket = state.analysis.analysisReport.targetMarket || state.analysis.analysisReport.language || "";
        if (reportMarket) {
            const options = Array.from(marketSelect.options);
            const match = options.find((opt) =>
                opt.value.toLowerCase().includes(reportMarket.toLowerCase()) ||
                reportMarket.toLowerCase().includes(opt.value.toLowerCase())
            );
            if (match) {
                marketSelect.value = match.value;
                if (!state.masterPrompt.promptlab) state.masterPrompt.promptlab = { userProductProfile: {} };
                state.masterPrompt.promptlab.userProductProfile.targetMarket = match.value;
            }
        }
    }

    const ignoreKeys = ["meta", "generatedByModel", "generatedAt", "templateUsed", "templateId", "raw_response"];
    const keys = Object.keys(state.analysis.analysisReport).filter((k) => !ignoreKeys.includes(k));

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = "";
    container.className = "mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3";
    const savedSelection = state.masterPrompt.promptlab?.userProductProfile?.selectedReportSections || [];
    const isFirstLoad = savedSelection.length === 0;

    keys.forEach((key) => {
        if (key === "target_audience") {
            const audienceInput = document.getElementById("lab-audience");
            if (audienceInput && !audienceInput.value) {
                let val = state.analysis.analysisReport[key];
                if (Array.isArray(val)) val = val.join(", ");
                audienceInput.value = val;
                if (!state.masterPrompt.promptlab) state.masterPrompt.promptlab = { userProductProfile: {} };
                state.masterPrompt.promptlab.userProductProfile.audience = val;
            }
        }

        const label = getFieldTitle(key);
        const previewText = getPreviewText(state.analysis.analysisReport[key]);
        const isChecked = isFirstLoad ? true : savedSelection.includes(key);

        const div = document.createElement("div");
        div.className = "relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all";
        div.innerHTML = `
            <div class="flex h-5 items-center">
                <input type="checkbox" name="report-section" value="${escapeHtml(key)}" id="sect-${escapeHtml(key)}" 
                    class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${escapeHtml(isChecked ? "checked" : "")}>
            </div>
            <div class="ml-3 text-sm flex-1 min-w-0"> 
                <label for="sect-${escapeHtml(key)}" class="cursor-pointer select-none w-full block">
                    <span class="font-medium text-slate-700 block mb-0.5 leading-snug">${escapeHtml(label)}</span>
                    <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">${escapeHtml(previewText)}</p>
                </label>
            </div>
        `;
        container.appendChild(div);
    });
    updateButtonState();
}

/**
 * 获取预览文本
 */
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
        return JSON.stringify(val).substring(0, 60) + "...";
    } catch (e) { return "Data..."; }
}

// ========================================== 
// Action Functions
// ========================================== 

/**
 * 生成 Master Prompt
 */
function generateMasterPrompt() {
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

    saveInputsToState();
    const inputs = {
        ...state.masterPrompt.promptlab.userProductProfile,
        useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
    };
    const outEl = document.getElementById("final-prompt-output");
    if (!outEl) return;

    const result = promptlabService.generateMasterPrompt(inputs, state.analysis.analysisReport);
    listingPromptCache = result; // 缓存到模块状态
    outEl.value = result;
    updateCharCount();
    outEl.classList.add("bg-green-50");
    addTimeout(() => outEl.classList.remove("bg-green-50"), 300);
    showToast("Master Prompt 已生成", "success");
}

/**
 * 生成视觉 Prompt
 */
function generateVisualPrompt() {
    if (!state.analysis.analysisReport) {
        showToast("请先生成 Ai 分析报告以获取视觉灵感", "warning");
        return;
    }
    saveInputsToState();
    const inputs = {
        ...state.masterPrompt.promptlab.userProductProfile,
        useAnalysisData: document.getElementById("use-analysis-data")?.checked || false,
    };
    const outEl = document.getElementById("final-prompt-output");
    if (!outEl) return;

    const result = promptlabService.generateVisualPrompt(inputs, state.analysis.analysisReport);
    visualPromptCache = result; // 缓存到模块状态
    outEl.value = result;
    updateCharCount();
    outEl.classList.add("bg-pink-50");
    addTimeout(() => outEl.classList.remove("bg-pink-50"), 300);
    showToast("视觉转化剧本已生成", "success");
}

/**
 * 切换控制台模式
 */
function toggleConsoleMode(mode) {
    if (currentConsoleMode === mode) return;
    currentConsoleMode = mode;
    const cardInner = document.getElementById("console-card-inner");
    const toggleContainer = document.getElementById("embed-toggle-container");
    const glider = document.getElementById("mode-toggle-glider");
    const btnListing = document.getElementById("btn-mode-listing");
    const btnVisual = document.getElementById("btn-mode-visual");
    const outputArea = document.getElementById("final-prompt-output");
    const outputTitle = document.querySelector("#output-preview-title");

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
            // 切换到 Visual 模式时，显示缓存的 Visual Prompt
            outputArea.value = visualPromptCache;
        }
        if (outputTitle) {
            outputTitle.textContent = "Visual Prompt";
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
            // 切换到 Listing 模式时，显示缓存的 Listing Prompt
            outputArea.value = listingPromptCache;
        }
        if (outputTitle) {
            outputTitle.textContent = "Listing Prompt";
        }
    }
    updateCharCount();
    updateButtonState();
}

/**
 * 切换 Prompt 放大视图
 */
function togglePromptZoom() {
    const modal = document.getElementById('prompt-zoom-modal');
    const zoomContent = document.getElementById('prompt-zoom-content');
    const zoomIcon = document.getElementById('zoom-icon');
    const zoomedContainer = document.getElementById('zoomed-cards-container');
    
    if (!modal || !zoomContent || !zoomedContainer) return;
    
    const isZoomed = modal.style.display !== 'none' && modal.style.display !== '';
    
    if (isZoomed) {
        // 关闭放大视图 - 将元素移回原位
        zoomContent.classList.remove('scale-100', 'opacity-100');
        zoomContent.classList.add('scale-95', 'opacity-0');
        
        addTimeout(() => {
            const consoleCard = document.querySelector('.zoomed-console-card');
            const outputCard = document.querySelector('.zoomed-output-card');
            
            // 移回翻转卡片
            if (consoleCard) {
                const originalParent = document.querySelector('.lg\\:col-span-4 .sticky');
                if (originalParent) {
                    // 移除放大视图的类
                    consoleCard.classList.remove('zoomed-console-card');
                    // 插入到第一个位置
                    originalParent.insertBefore(consoleCard, originalParent.firstChild);
                }
            }
            
            // 移回输出卡片
            if (outputCard) {
                const originalParent = document.querySelector('.lg\\:col-span-4 .sticky');
                if (originalParent) {
                    // 移除放大视图的类
                    outputCard.classList.remove('zoomed-output-card');
                    // 插入到最后
                    originalParent.appendChild(outputCard);
                }
            }
            
            modal.style.display = 'none';
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            
            // 恢复图标和提示
            zoomIcon.className = 'fas fa-expand text-sm';
            zoomIcon.parentElement.title = '放大视图';
        }, 300);
    } else {
        // 打开放大视图 - 移动原始元素
        modal.style.display = 'flex';
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        // 清空容器
        zoomedContainer.innerHTML = '';
        
        // 移动翻转卡片容器（包含切换按钮）
        const consoleCardWrapper = document.querySelector('.lg\\:col-span-4 .sticky > div:first-child');
        if (consoleCardWrapper) {
            consoleCardWrapper.classList.add('zoomed-console-card');
            zoomedContainer.appendChild(consoleCardWrapper);
        }
        
        // 移动输出卡片
        const outputCard = document.getElementById('prompt-output-card');
        if (outputCard) {
            outputCard.classList.add('zoomed-output-card');
            zoomedContainer.appendChild(outputCard);
        }
        
        // 触发动画
        requestAnimationFrame(() => {
            zoomContent.classList.remove('scale-95', 'opacity-0');
            zoomContent.classList.add('scale-100', 'opacity-100');
        });
        
        // 更改图标和提示
        zoomIcon.className = 'fas fa-compress text-sm';
        zoomIcon.parentElement.title = '恢复视图';
    }
}

/**
 * 复制 Master Prompt
 */
function copyMasterPrompt() {
    const copyText = document.getElementById("final-prompt-output");
    if (copyText && copyText.value.length > 10) {
        copyText.select();
        document.execCommand("copy");
        showToast("Prompt 已复制", "success");
    }
}

/**
 * 清空 Prompt 输入
 */
function clearPromptInputs() {
    if (confirm("确定要清空所有输入框吗？")) {
        document.querySelectorAll('input[type="text"], textarea')
            .forEach((el) => (el.value = ""));
        const select = document.getElementById("lab-target-market");
        if (select) select.value = "";
        saveInputsToState();
        updateButtonState();
        showToast("已清空", "success");
    }
}

// ========================================== 
// Event Listeners Setup
// ========================================== 

/**
 * 设置事件监听器
 */
function setupEventListeners(container) {
    if (!container) return;

    addEventListener(container, "change", (e) => {
        saveInputsToState();
        if (e.target.id === "lab-char-limit") updateCharCount();
        updateButtonState();
    });

    // Bind input listeners for Tier 1 & Tier 2
    ["lab-keywords-tier1", "lab-keywords-tier2"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) addEventListener(el, "input", () => updateButtonState());
    });

    // Bind output character count
    const outEl = document.getElementById("final-prompt-output");
    if (outEl) addEventListener(outEl, "input", () => updateCharCount());
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
    console.log('[Promptlab] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/master_prompt/promptlab/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;

        // 2. 注册全局操作
        const actionNames = registerActionsWithLegacy({
            amz_generateMasterPrompt: () => generateMasterPrompt(),
            amz_generateVisualPrompt: () => generateVisualPrompt(),
            amz_toggleConsoleMode: (params) => toggleConsoleMode(params.param),
            amz_copyMasterPrompt: () => copyMasterPrompt(),
            amz_clearPromptInputs: () => clearPromptInputs(),
            amz_togglePromptZoom: () => togglePromptZoom(),
        });
        
        // 保存已注册的动作名称，用于卸载时清理
        registeredActions = actionNames;

        // 3. 设置事件监听器
        setupEventListeners(container);
        
        // 3.1 设置放大模态框点击背景关闭
        const modal = document.getElementById('prompt-zoom-modal');
        if (modal) {
            addEventListener(modal, 'click', (e) => {
                if (e.target === modal) {
                    togglePromptZoom();
                }
            });
        }

        // 4. 从 state 恢复状态
        restoreInputsFromState();

        // 5. 渲染报告分析
        renderReportAnalysis();

        // 6. 更新按钮状态
        updateButtonState();

        console.log('[Promptlab] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Promptlab] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount() {
    console.log('[Promptlab] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveInputsToState();

        // 2. 清理事件监听器和定时器
        cleanup();

        // 3. 重置模块状态
        currentConsoleMode = "listing";
        listingPromptCache = "";
        visualPromptCache = "";

        console.log('[Promptlab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Promptlab] ❌ 子模块卸载失败:', error);
    }
}
