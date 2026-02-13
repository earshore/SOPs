/**
 * Promptlab 子模块
 * 负责 Prompt 拼接生成功能
 * 
 * 架构说明：
 * - 状态保存到 state.masterPrompt.promptlab 命名空间
 * - 通过 EventBus 与其他模块通信
 * - 使用 registerActionsWithLegacy 注册全局操作
 */

import { escapeHtml } from '@/common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import state from "../../../../../common/state";
import { promptlabService } from '../services/promptlabService';
import SITE_CONFIGS from '../../../../../common/constants/constants';
import { ANALYSIS_MODULES } from '../constants/prompts';
import { showToast } from '../../../../../common/ui';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../common/constants/eventConstants';
import type { AnalysisReport } from '../../../../../types/modules-business';
import eventBus from '../../../../../common/EventBus';

import '../master_prompt_style.css';

// ========================================== 
// Types
// ========================================== 

interface EventListenerRecord {
    element: HTMLElement | Document;
    event: string;
    handler: EventListenerOrEventListenerObject;
}

interface UserProductProfile {
    targetMarket: string;
    keywordsTier1: string;
    keywordsTier2: string;
    audience: string;
    usps: string;
    specs: string;
    socialHook: string;
    negative: string;
    tone: string;
    customStrategy: string;
    useCosmo: boolean;
    useRufus: boolean;
    useEmoji: boolean;
    selectedReportSections: string[];
    charLimit: number;
}

interface PromptInputs extends UserProductProfile {
    useAnalysisData: boolean;
}

// ========================================== 
// Module State
// ========================================== 

let currentConsoleMode: "listing" | "visual" = "listing";
let eventListeners: EventListenerRecord[] = []; // 用于清理事件监听器
let timeouts: number[] = []; // 用于清理定时器
let registeredActions: string[] = []; // 用于清理已注册的动作
let listingPromptCache = ""; // 缓存 Listing Prompt
let visualPromptCache = ""; // 缓存 Visual Prompt
let dataUpdateHandler: (() => void) | null = null; // 用于清理 EventBus 监听器
let lastMarketplace = ""; // 跟踪上次的 marketplace，用于检测数据源变化

// ========================================== 
// Helper Functions
// ========================================== 

/**
 * 添加事件监听器（带自动清理）
 */
function addEventListener(element: HTMLElement | Document, event: string, handler: EventListenerOrEventListenerObject): void {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

/**
 * 添加定时器（带自动清理）
 */
function addTimeout(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    timeouts.push(id);
    return id;
}

/**
 * 清理所有事件监听器和定时器
 */
function cleanup(): void {
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
        unregisterActions(registeredActions);
        console.log(`[Promptlab] 已清理 ${registeredActions.length} 个动作`);
        registeredActions = [];
    }
}

/**
 * 获取字段标题
 */
function getFieldTitle(key: string): string {
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
function saveInputsToState(): void {
    const selectedSections: string[] = [];
    document.querySelectorAll<HTMLInputElement>('input[name="report-section"]:checked').forEach((cb) => {
        selectedSections.push(cb.value);
    });

    if (!state.masterPrompt) {
        state.masterPrompt = {} as any;
    }
    
    if (!state.masterPrompt) return; // Type guard

    state.masterPrompt.promptlab = {
        userProductProfile: {
            targetMarket: (document.getElementById("lab-target-market") as HTMLSelectElement)?.value || "",
            keywordsTier1: (document.getElementById("lab-keywords-tier1") as HTMLInputElement)?.value || "",
            keywordsTier2: (document.getElementById("lab-keywords-tier2") as HTMLTextAreaElement)?.value || "",
            audience: (document.getElementById("lab-audience") as HTMLInputElement)?.value || "",
            usps: (document.getElementById("lab-usps") as HTMLTextAreaElement)?.value || "",
            specs: (document.getElementById("lab-specs") as HTMLTextAreaElement)?.value || "",
            socialHook: (document.getElementById("lab-social-hook") as HTMLInputElement)?.value || "",
            negative: (document.getElementById("negative-keywords") as HTMLInputElement)?.value || "",
            tone: (document.getElementById("lab-tone") as HTMLSelectElement)?.value || "professional",
            customStrategy: (document.getElementById("lab-custom-strategy") as HTMLTextAreaElement)?.value || "",
            useCosmo: (document.getElementById("opt-cosmo") as HTMLInputElement)?.checked || false,
            useRufus: (document.getElementById("opt-rufus") as HTMLInputElement)?.checked || false,
            useEmoji: (document.getElementById("opt-emoji") as HTMLInputElement)?.checked || false,
            selectedReportSections: selectedSections,
            charLimit: parseInt((document.getElementById("lab-char-limit") as HTMLInputElement)?.value) || 5000,
        }
    };
}

/**
 * 从 state 恢复输入
 */
function restoreInputsFromState(): void {
    if (!state.masterPrompt) return;
    const p = state.masterPrompt.promptlab?.userProductProfile;
    if (!p) return;

    const setVal = (id: string, val: string | number | undefined): void => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (el && val !== undefined) el.value = String(val);
    };
    const setCheck = (id: string, val: boolean | undefined): void => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el && val !== undefined) el.checked = val;
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
function generateLanguageOptions(): void {
    const select = document.getElementById("lab-target-market") as HTMLSelectElement;
    if (!select) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    select.innerHTML = '<option value="" disabled selected>选择目标站点/语言...</option>';

    Object.entries(SITE_CONFIGS).forEach(([_code, config]) => {
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
function updateButtonState(): void {
    const btn = document.getElementById("btn-generate-prompt") as HTMLButtonElement;
    const btnVisual = document.getElementById("btn-generate-visual") as HTMLButtonElement;
    const select = document.getElementById("lab-target-market") as HTMLSelectElement;
    const tier1Input = document.getElementById("lab-keywords-tier1") as HTMLInputElement;
    const tier2Input = document.getElementById("lab-keywords-tier2") as HTMLTextAreaElement;

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
function updateCharCount(): void {
    const outEl = document.getElementById("final-prompt-output") as HTMLTextAreaElement;
    const countEl = document.getElementById("prompt-word-count");
    const limitInput = document.getElementById("lab-char-limit") as HTMLInputElement;
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
function renderReportAnalysis(): void {
    const container = document.getElementById("report-sections-container");
    const checkboxMain = document.getElementById("use-analysis-data") as HTMLInputElement;
    const statusDiv = document.getElementById("lab-analysis-status");
    const marketSelect = document.getElementById("lab-target-market") as HTMLSelectElement;

    if (marketSelect && marketSelect.options.length <= 1) {
        generateLanguageOptions();
    }

    if (!container || !checkboxMain) return;

    if (!state.analysis.analysisReport) {
        if (statusDiv) {
            statusDiv.className = "px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs flex items-center gap-1";
            // ✅ 安全: 静态HTML模板，无用户输入
            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未检测到分析报告';
        }
        checkboxMain.disabled = true;
        checkboxMain.checked = false;
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = `<p class="text-xs text-slate-400 italic p-2">暂无可用数据...</p>`;
        container.className = "mt-3";
        updateButtonState();
        return;
    }

    if (statusDiv) {
        statusDiv.className = "px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1";
        // ✅ 安全: 静态HTML模板，无用户输入
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> 分析报告已就绪';
    }
    checkboxMain.disabled = false;
    checkboxMain.checked = true;

    // ✅ 智能自动选择语言：检测数据源变化
    if (marketSelect && state.masterPrompt) {
        // 1. 获取当前数据源的 marketplace
        let currentMarketplace = '';
        
        // 优先从分析报告的 marketplace 字段获取
        const analysisReport = state.analysis.analysisReport as any;
        if (analysisReport && analysisReport.marketplace) {
            currentMarketplace = analysisReport.marketplace;
        }
        
        // 如果没有，尝试从 scraper 数据获取 marketplace
        if (!currentMarketplace) {
            const scrapedData = state.scraper?.scrapedData;
            if (scrapedData && scrapedData.metadata && scrapedData.metadata.marketplace) {
                currentMarketplace = scrapedData.metadata.marketplace;
            }
        }
        
        // 如果还没有，尝试从旧版报告格式获取（向后兼容）
        if (!currentMarketplace && analysisReport) {
            currentMarketplace = analysisReport.targetMarket || analysisReport.language || "";
        }
        
        // 2. 检测是否需要自动更新
        const isFirstLoad = !state.masterPrompt.promptlab?.userProductProfile?.targetMarket;
        const isMarketplaceChanged = currentMarketplace && currentMarketplace !== lastMarketplace;
        
        // 3. 只在首次加载或数据源变化时自动更新
        if (currentMarketplace && (isFirstLoad || isMarketplaceChanged)) {
            console.log('[Promptlab] 检测到市场变化:', lastMarketplace, '→', currentMarketplace);
            
            // 通过站点代码（如 "FR"）查找对应的站点名称（如 "French"）
            const siteConfig = SITE_CONFIGS[currentMarketplace];
            if (siteConfig) {
                const targetName = siteConfig.name; // 例如："French"
                
                // 在下拉框中查找匹配的选项
                const options = Array.from(marketSelect.options);
                const match = options.find((opt) => opt.value === targetName);
                
                if (match) {
                    marketSelect.value = match.value;
                    if (!state.masterPrompt.promptlab) state.masterPrompt.promptlab = { userProductProfile: {} as UserProductProfile };
                    if (state.masterPrompt.promptlab?.userProductProfile) {
                        state.masterPrompt.promptlab.userProductProfile.targetMarket = match.value;
                    }
                    
                    // 更新跟踪的 marketplace
                    lastMarketplace = currentMarketplace;
                    console.log('[Promptlab] 已自动选择市场:', match.value, `(${currentMarketplace})`);
                } else {
                    console.warn('[Promptlab] 未找到匹配的下拉框选项:', targetName);
                }
            } else {
                console.warn('[Promptlab] 未找到站点配置:', currentMarketplace);
            }
        } else if (currentMarketplace) {
            // 数据源未变化，但需要更新跟踪值（防止首次加载后的误判）
            lastMarketplace = currentMarketplace;
        }
    }

    // ✅ 检测报告格式：AI智能分析 vs 旧版AI分析
    const report = state.analysis.analysisReport as any;
    const isNewFormat = report.results && Array.isArray(report.results);
    
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = "";
    container.className = "mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3";
    const savedSelection = state.masterPrompt?.promptlab?.userProductProfile?.selectedReportSections || [];
    const isFirstLoad = savedSelection.length === 0;

    if (isNewFormat) {
        // 处理"AI智能分析"的新格式报告
        const results = report.results as Array<{
            targetId: string;
            title: string;
            source: string;
            highlights: Array<{ text: string }>;
            details: Array<{ category: string; items: string[] }>;
        }>;

        results.forEach((result) => {
            const key = result.targetId;
            const label = result.title;
            
            // 生成预览文本：从 highlights 和 details 提取
            let previewParts: string[] = [];
            if (result.highlights && result.highlights.length > 0 && result.highlights[0]) {
                previewParts.push(result.highlights[0].text);
            }
            if (result.details && result.details.length > 0 && result.details[0] && result.details[0].items.length > 0 && result.details[0].items[0]) {
                previewParts.push(result.details[0].items[0]);
            }
            const previewText = previewParts.join(' | ').substring(0, 80) + (previewParts.join(' | ').length > 80 ? '...' : '');
            
            const isChecked = isFirstLoad ? true : savedSelection.includes(key);

            const div = document.createElement("div");
            div.className = "relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all";
            div.innerHTML = `
                <div class="flex h-5 items-center">
                    <input type="checkbox" name="report-section" value="${escapeHtml(key)}" id="sect-${escapeHtml(key)}" 
                        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isChecked ? "checked" : ""}>
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
    } else {
        // 处理旧版"AI分析"的报告格式（向后兼容）
        const ignoreKeys = ["meta", "generatedByModel", "generatedAt", "templateUsed", "templateId", "raw_response"];
        const keys = Object.keys(report).filter((k) => !ignoreKeys.includes(k));

        keys.forEach((key) => {
            if (key === "target_audience") {
                const audienceInput = document.getElementById("lab-audience") as HTMLInputElement;
                if (audienceInput && !audienceInput.value) {
                    let val = report[key];
                    if (Array.isArray(val)) val = val.join(", ");
                    audienceInput.value = val;
                    if (!state.masterPrompt) state.masterPrompt = {} as any;
                    if (!state.masterPrompt) return; // Type guard
                    if (!state.masterPrompt.promptlab) state.masterPrompt.promptlab = { userProductProfile: {} as UserProductProfile };
                    if (state.masterPrompt && state.masterPrompt.promptlab?.userProductProfile) {
                        state.masterPrompt.promptlab.userProductProfile.audience = val;
                    }
                }
            }

            const label = getFieldTitle(key);
            const previewText = getPreviewText(report[key]);
            const isChecked = isFirstLoad ? true : savedSelection.includes(key);

            const div = document.createElement("div");
            div.className = "relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all";
            div.innerHTML = `
                <div class="flex h-5 items-center">
                    <input type="checkbox" name="report-section" value="${escapeHtml(key)}" id="sect-${escapeHtml(key)}" 
                        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isChecked ? "checked" : ""}>
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
    }
    
    updateButtonState();
}

/**
 * 获取预览文本
 */
function getPreviewText(val: any): string {
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
function generateMasterPrompt(): void {
    const btn = document.getElementById("btn-generate-prompt") as HTMLButtonElement;
    const select = document.getElementById("lab-target-market") as HTMLSelectElement;
    const t1 = (document.getElementById("lab-keywords-tier1") as HTMLInputElement)?.value.trim();
    const t2 = (document.getElementById("lab-keywords-tier2") as HTMLTextAreaElement)?.value.trim();

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
    if (!state.masterPrompt?.promptlab?.userProductProfile) {
        showToast("配置信息不完整", "warning");
        return;
    }
    const inputs: Partial<PromptInputs> = {
        ...state.masterPrompt.promptlab.userProductProfile,
        useAnalysisData: (document.getElementById("use-analysis-data") as HTMLInputElement)?.checked || false,
    };
    const outEl = document.getElementById("final-prompt-output") as HTMLTextAreaElement;
    if (!outEl) return;

    // 🔐 类型守卫: 确保 analysisReport 是对象类型或 null
    const analysisReport = state.analysis.analysisReport;
    const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;
    
    const result = promptlabService.generateMasterPrompt(inputs as any, reportToUse);
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
function generateVisualPrompt(): void {
    if (!state.analysis.analysisReport) {
        showToast("请先生成 Ai 分析报告以获取视觉灵感", "warning");
        return;
    }
    saveInputsToState();
    if (!state.masterPrompt?.promptlab?.userProductProfile) {
        showToast("配置信息不完整", "warning");
        return;
    }
    const inputs: Partial<PromptInputs> = {
        ...state.masterPrompt.promptlab.userProductProfile,
        useAnalysisData: (document.getElementById("use-analysis-data") as HTMLInputElement)?.checked || false,
    };
    const outEl = document.getElementById("final-prompt-output") as HTMLTextAreaElement;
    if (!outEl) return;

    // 🔐 类型守卫: 确保 analysisReport 是对象类型或 null
    const analysisReport = state.analysis.analysisReport;
    const reportToUse: AnalysisReport | null = (typeof analysisReport === 'string' || !analysisReport) ? null : analysisReport;
    
    const result = promptlabService.generateVisualPrompt(inputs as any, reportToUse);
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
function toggleConsoleMode(mode: "listing" | "visual"): void {
    if (currentConsoleMode === mode) return;
    currentConsoleMode = mode;
    const cardInner = document.getElementById("console-card-inner");
    const toggleContainer = document.getElementById("embed-toggle-container");
    const glider = document.getElementById("mode-toggle-glider");
    const btnListing = document.getElementById("btn-mode-listing");
    const btnVisual = document.getElementById("btn-mode-visual");
    const outputArea = document.getElementById("final-prompt-output") as HTMLTextAreaElement;
    const outputTitle = document.querySelector("#output-preview-title");

    if (!cardInner || !glider) return;

    if (mode === "visual") {
        cardInner.style.transform = "rotateY(180deg)";
        glider.style.transform = "translateX(100%)";
        glider.classList.add("bg-pink-500", "text-white");
        glider.classList.remove("bg-white");
        toggleContainer?.classList.add("bg-pink-900/30", "border-pink-500/30");
        toggleContainer?.classList.remove("bg-white/20", "border-white/10");
        btnListing?.classList.replace("text-blue-600", "text-pink-200");
        btnListing?.classList.add("opacity-60");
        btnVisual?.classList.replace("text-slate-500", "text-white");
        btnVisual?.classList.remove("hover:text-pink-600");
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
        toggleContainer?.classList.remove("bg-pink-900/30", "border-pink-500/30");
        toggleContainer?.classList.add("bg-white/20", "border-white/10");
        btnVisual?.classList.replace("text-white", "text-slate-500");
        btnVisual?.classList.add("hover:text-pink-600");
        btnListing?.classList.replace("text-pink-200", "text-blue-600");
        btnListing?.classList.remove("opacity-60");
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
function togglePromptZoom(): void {
    const modal = document.getElementById('prompt-zoom-modal');
    const zoomContent = document.getElementById('prompt-zoom-content');
    const zoomIcon = document.getElementById('zoom-icon');
    const zoomedContainer = document.getElementById('zoomed-cards-container');
    
    if (!modal || !zoomContent || !zoomedContainer) return;
    
    const isZoomed = modal.style.display !== 'none' && modal.style.display !== '';
    
    if (isZoomed) {
        // 关闭放大视图 - 缩小动画
        zoomContent.classList.remove('scale-100', 'opacity-100');
        zoomContent.classList.add('scale-95', 'opacity-0');
        modal.style.opacity = '0';
        
        addTimeout(() => {
            const consoleCard = document.querySelector('.zoomed-console-card');
            const outputCard = document.querySelector('.zoomed-output-card');
            
            // 移回翻转卡片
            if (consoleCard) {
                const originalParent = document.querySelector('.lg\\:col-span-4 .sticky');
                if (originalParent) {
                    consoleCard.classList.remove('zoomed-console-card');
                    originalParent.insertBefore(consoleCard, originalParent.firstChild);
                }
            }
            
            // 移回输出卡片
            if (outputCard) {
                const originalParent = document.querySelector('.lg\\:col-span-4 .sticky');
                if (originalParent) {
                    outputCard.classList.remove('zoomed-output-card');
                    originalParent.appendChild(outputCard);
                }
            }
            
            modal.style.display = 'none';
            modal.classList.remove('flex');
            modal.style.opacity = '';
            document.body.style.overflow = '';
            
            // 恢复图标和提示
            if (zoomIcon) {
                zoomIcon.className = 'fas fa-expand text-sm';
                const parent = zoomIcon.parentElement;
                if (parent) parent.title = '放大视图';
            }
        }, 300);
    } else {
        // 打开放大视图 - 放大动画
        const consoleCardWrapper = document.querySelector('.lg\\:col-span-4 .sticky > div:first-child');
        const outputCard = document.getElementById('prompt-output-card');
        
        if (!consoleCardWrapper || !outputCard) {
            console.error('[Promptlab] 未找到卡片元素');
            return;
        }
        
        // 显示模态框
        modal.style.display = 'flex';
        modal.classList.add('flex');
        modal.style.opacity = '0';
        document.body.style.overflow = 'hidden';
        
        // 清空容器
        zoomedContainer.innerHTML = '';
        
        // 移动元素到模态框
        (consoleCardWrapper as HTMLElement).classList.add('zoomed-console-card');
        (outputCard as HTMLElement).classList.add('zoomed-output-card');
        zoomedContainer.appendChild(consoleCardWrapper);
        zoomedContainer.appendChild(outputCard);
        
        // 触发动画
        requestAnimationFrame(() => {
            modal.style.transition = 'opacity 0.3s ease-in';
            modal.style.opacity = '1';
            zoomContent.classList.remove('scale-95', 'opacity-0');
            zoomContent.classList.add('scale-100', 'opacity-100');
        });
        
        // 更改图标和提示
        if (zoomIcon) {
            zoomIcon.className = 'fas fa-compress text-sm';
            const parent = zoomIcon.parentElement;
            if (parent) parent.title = '恢复视图';
        }
    }
}

/**
 * 复制 Master Prompt
 */
function copyMasterPrompt(): void {
    const copyText = document.getElementById("final-prompt-output") as HTMLTextAreaElement;
    if (copyText && copyText.value.length > 10) {
        copyText.select();
        document.execCommand("copy");
        showToast("Prompt 已复制", "success");
    }
}

/**
 * 清空 Prompt 输入
 */
function clearPromptInputs(): void {
    if (confirm("确定要清空所有输入框吗？")) {
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[type="text"], textarea')
            .forEach((el) => (el.value = ""));
        const select = document.getElementById("lab-target-market") as HTMLSelectElement;
        if (select) select.value = "";
        saveInputsToState();
        updateButtonState();
        showToast("已清空", "success");
    }
}

/**
 * 全选报告分析模块
 */
function selectAllReportSections(): void {
    document.querySelectorAll<HTMLInputElement>('input[name="report-section"]').forEach((cb) => {
        cb.checked = true;
    });
    saveInputsToState();
    showToast("已全选模块", "success");
}

/**
 * 清空报告分析模块选择
 */
function clearReportSections(): void {
    document.querySelectorAll<HTMLInputElement>('input[name="report-section"]').forEach((cb) => {
        cb.checked = false;
    });
    saveInputsToState();
    showToast("已清空选择", "success");
}

// ========================================== 
// Event Listeners Setup
// ========================================== 

/**
 * 设置事件监听器
 */
function setupEventListeners(container: HTMLElement): void {
    if (!container) return;

    addEventListener(container, "change", ((e: Event) => {
        saveInputsToState();
        if ((e.target as HTMLElement).id === "lab-char-limit") updateCharCount();
        updateButtonState();
    }) as EventListenerOrEventListenerObject);

    // Bind input listeners for Tier 1 & Tier 2
    ["lab-keywords-tier1", "lab-keywords-tier2"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) addEventListener(el as HTMLElement, "input", (() => updateButtonState()) as EventListenerOrEventListenerObject);
    });

    // Bind output character count
    const outEl = document.getElementById("final-prompt-output");
    if (outEl) addEventListener(outEl as HTMLElement, "input", (() => updateCharCount()) as EventListenerOrEventListenerObject);
}

// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
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
            amz_toggleConsoleMode: (params: Record<string, any>) => toggleConsoleMode(params.param as "listing" | "visual"),
            amz_copyMasterPrompt: () => copyMasterPrompt(),
            amz_clearPromptInputs: () => clearPromptInputs(),
            amz_togglePromptZoom: () => togglePromptZoom(),
            amz_selectAllReportSections: () => selectAllReportSections(),
            amz_clearReportSections: () => clearReportSections(),
        });
        
        // 保存已注册的动作名称，用于卸载时清理
        registeredActions = actionNames;

        // 3. 设置事件监听器
        setupEventListeners(container);
        
        // 3.1 设置放大模态框点击背景关闭
        const modal = document.getElementById('prompt-zoom-modal');
        if (modal) {
            addEventListener(modal as HTMLElement, 'click', ((e: Event) => {
                if (e.target === modal) {
                    togglePromptZoom();
                }
            }) as EventListenerOrEventListenerObject);
        }

        // 4. 从 state 恢复状态
        restoreInputsFromState();

        // 5. 渲染报告分析
        renderReportAnalysis();

        // 6. 监听数据更新事件，自动重新渲染
        dataUpdateHandler = () => {
            console.log('[Promptlab] 检测到数据更新，重新渲染报告分析');
            renderReportAnalysis();
        };
        
        // 使用 EventBus 监听 Scraper 数据更新事件
        eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);
        
        // 使用 window 监听历史记录更新事件（因为这个事件是通过 window.dispatchEvent 触发的）
        window.addEventListener(APP_EVENTS.HISTORY_UPDATED, dataUpdateHandler);
        eventListeners.push({ element: window as any, event: APP_EVENTS.HISTORY_UPDATED, handler: dataUpdateHandler });

        // 7. 更新按钮状态
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
export function unmount(): void {
    console.log('[Promptlab] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        saveInputsToState();

        // 2. 清理 EventBus 监听器
        if (dataUpdateHandler) {
            eventBus.off(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, dataUpdateHandler);
            dataUpdateHandler = null;
        }

        // 3. 清理事件监听器和定时器
        cleanup();

        // 4. 重置模块状态
        currentConsoleMode = "listing";
        listingPromptCache = "";
        visualPromptCache = "";
        lastMarketplace = "";

        console.log('[Promptlab] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Promptlab] ❌ 子模块卸载失败:', error);
    }
}
