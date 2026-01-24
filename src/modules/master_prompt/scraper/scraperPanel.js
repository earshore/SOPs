// src/modules/master_prompt/scraper/scraperPanel.js
import BaseModule from "../../../common/BaseModule.js";
import { registerActionsWithLegacy } from "../../../common/utils/actionRegistry.js";
import state from "../../../common/state.js";
import { showToast, showProgress, getErrorSummary, sleep } from "../../../common/utils/ui.js";
import { scrapeAsin } from "./scraperService.js";
import { LANGUAGE_HEADERS, languageFlagMap, SITE_NAME_MAP } from "../../../common/constants/constants.js";
import { renderDataPanel } from "../data_manage/dataDisplay.js";
import { updateAsinSelectList } from "../analysis/analysisDisplay.js";
import { HistoryService } from "../services/historyService.js";
import { saveProxyConfig, renderProxyInputUI, closeSettings } from "../../../components/settings/systemSettings.js";
import { StorageService, STORAGE_KEYS } from "../../../services/storageService.js";
import { ErrorService } from "../../../services/errorService.js";

// ==========================================
// Scraper Module Class
// ==========================================

class ScraperModule extends BaseModule {
    constructor() {
        super('master_prompt_scraper');
        this.HISTORY_STORAGE_KEY = "scrape_history";
        this.registerGlobalActions();
    }

    async render() {
        // Assume HTML is preloaded by viewLoader
    }

    async init() {
        console.log("🚀 Scraper Module Initialized (BaseModule)");
        this.setupUI();
        // this.registerGlobalActions(); // Moved to constructor

        // Restore History View on load
        this.renderHistory();

        // Initial Network UI update
        setTimeout(() => this.updateNetworkUI(), 100);
    }

    onUnmount() {
        // BaseModule auto-removes event listeners
        console.log("💤 Scraper Module Unmounting...");
    }

    // ================== UI Setup ==================

    setupUI() {
        // 1. Initialize Default Settings
        if (!StorageService.get(STORAGE_KEYS.PROXY_CONFIG)) {
            StorageService.set(STORAGE_KEYS.PROXY_CONFIG, { type: "allorigins", customUrl: "" });
            const map = StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP, {});
            if (!map.allorigins) {
                map.allorigins = "";
                StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, map);
            }
        }

        // 2. Setup Proxy Select
        const proxySelect = document.getElementById("proxy-select");
        if (proxySelect) {
            // Clone to remove old listeners if any (though BaseModule handles cleanup, this is safe)
            const newSelect = proxySelect.cloneNode(true);
            proxySelect.parentNode.replaceChild(newSelect, proxySelect);

            this.addEventListener(newSelect, "change", () => {
                renderProxyInputUI(newSelect.value);
            });

            const currentConfig = StorageService.get(STORAGE_KEYS.PROXY_CONFIG);
            if (currentConfig && currentConfig.type) {
                newSelect.value = currentConfig.type;
            }
            renderProxyInputUI(newSelect.value);
        }

        // 3. Setup History Header
        const historyHeaders = document.querySelectorAll("h3");
        historyHeaders.forEach((h) => {
            if (h.innerText.includes("最近任务") || h.innerText.includes("历史快照")) {
                h.innerHTML = `
                    <div class="flex items-center justify-between w-full border-b border-slate-100 pb-3 mb-2">
                        <span class="flex items-center gap-2 text-slate-800 font-bold text-base">
                            <i class="fas fa-history text-indigo-500"></i>
                            历史快照
                        </span>
                        <button id="clear-history-btn" class="text-xs text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50">
                            <i class="fas fa-trash-alt"></i> 清空全部
                        </button>
                    </div>`;
                // Use setTimeout to ensure DOM is ready
                this.setTimeout(() => {
                    const btn = document.getElementById("clear-history-btn");
                    if (btn) this.addEventListener(btn, "click", () => this.clearHistory());
                }, 0);
            }
        });

        // 4. Setup Input & Button
        const inputEl = document.getElementById("asin-input");
        const startBtn = document.getElementById("start-scrape-btn");

        if (inputEl) {
            this.updateButtonState(inputEl.value);
            this.addEventListener(inputEl, "input", () => {
                const { valid, invalid } = this.validateAsins(inputEl.value);
                const countEl = document.getElementById("asin-count");

                if (valid.length > 0) {
                    countEl.innerHTML = `<span class="text-emerald-700 font-bold">已识别 ${valid.length} 个 ASIN</span>`;
                } else {
                    countEl.textContent = "等待输入...";
                }

                const errEl = document.getElementById("asin-error");
                if (invalid.length > 0) {
                    errEl.innerHTML = `<span class="text-rose-500 text-xs font-medium"><i class="fas fa-filter"></i> 自动过滤 ${invalid.length} 个无效项</span>`;
                    errEl.classList.remove("hidden");
                } else {
                    errEl.classList.add("hidden");
                }
                this.updateButtonState(inputEl.value);
            });
        }

        if (startBtn) {
            this.addEventListener(startBtn, "click", () => this.startScraping());
        }

        // 5. Settings Modal Click Outside
        const settingsModal = document.getElementById("settings-modal");
        if (settingsModal) {
            this.addEventListener(settingsModal, "click", (e) => {
                if (e.target === settingsModal) {
                    saveProxyConfig(true);
                    closeSettings();
                }
            });
        }
    }

    updateButtonState(val) {
        const startBtn = document.getElementById("start-scrape-btn");
        if (!startBtn) return;
        const { valid } = this.validateAsins(val || "");

        if (valid.length > 0) {
            startBtn.disabled = false;
            startBtn.classList.remove("opacity-50", "cursor-not-allowed", "grayscale");
            startBtn.classList.add("hover:shadow-xl");
            startBtn.title = "";
        } else {
            startBtn.disabled = true;
            startBtn.classList.add("opacity-50", "cursor-not-allowed", "grayscale");
            startBtn.classList.remove("hover:shadow-xl");
            startBtn.title = "请输入有效的 ASIN 以开始";
        }
    }

    updateNetworkUI() {
        let config;
        try {
            config = StorageService.get(STORAGE_KEYS.PROXY_CONFIG, { type: "allorigins" });
        } catch (e) {
            config = { type: "allorigins" };
        }

        const manualConfigTypes = ["scraperapi", "zenrows", "brightdata", "custom_api", "custom_proxy"];
        const needsConfig = manualConfigTypes.includes(config.type);
        const hasValue = config.customUrl && config.customUrl.trim().length > 0;
        const isReady = !needsConfig || (needsConfig && hasValue);

        const displayName = this.getProxyDisplayName(config.type);
        let statusText = "";

        if (!needsConfig) {
            statusText = "自动托管中";
        } else if (!hasValue) {
            statusText = "未配置 (点击设置)";
        } else {
            const val = config.customUrl;
            const masked = val.length > 8 ? `${val.substring(0, 3)}...${val.substring(val.length - 3)}` : "********";
            statusText = config.type === "custom_proxy" ? masked : `Key: ${masked}`;
        }

        const colorState = isReady
            ? { bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", textTitle: "text-slate-700", textSub: "text-emerald-600", dotPing: "bg-emerald-400", dotSolid: "bg-emerald-500" }
            : { bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100", iconColor: "text-amber-600", textTitle: "text-slate-800", textSub: "text-rose-500 font-bold", dotPing: "bg-rose-500", dotSolid: "bg-rose-600" };

        const targetDiv = document.querySelector("div[onclick*='settings-modal']");

        if (targetDiv) {
            targetDiv.className = `flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border group shadow-sm ${colorState.bg} ${colorState.border}`;
            targetDiv.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${colorState.iconBg} ${colorState.iconColor}">
                        <i class="fas fa-network-wired text-sm"></i>
                    </div>
                    <div class="flex flex-col min-w-0 justify-center">
                        <span class="text-xs font-bold ${colorState.textTitle} truncate mb-0.5">${displayName}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="relative flex h-2 w-2">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorState.dotPing} opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-2 w-2 ${colorState.dotSolid}"></span>
                            </span>
                            <span class="text-[10px] ${colorState.textSub} font-mono truncate">${statusText}</span>
                        </div>
                    </div>
                </div>
                <i class="fas fa-chevron-right text-xs text-slate-400 group-hover:text-slate-600 ml-2"></i>
            `;
        }
    }

    getProxyDisplayName(type) {
        const names = {
            scraperapi: "ScraperAPI (商业)",
            zenrows: "ZenRows (商业)",
            brightdata: "Bright Data",
            custom_api: "自定义 API",
            allorigins: "AllOrigins (免费)",
            custom_proxy: "HTTP 代理",
        };
        return names[type] || "默认直连";
    }

    // ================== Actions ==================

    selectSite(site) {
        state.selectedSite = site;
        document.querySelectorAll(".site-btn").forEach((btn) => {
            const isSel = btn.dataset.site === site;
            btn.classList.toggle("selected", isSel);
            btn.classList.toggle("border-blue-500", isSel);
            btn.classList.toggle("bg-blue-50", isSel);
            btn.classList.toggle("ring-1", isSel);
            btn.classList.toggle("ring-blue-500", isSel);
            btn.classList.toggle("border-slate-200", !isSel);
            btn.classList.toggle("hover:border-blue-300", !isSel);
        });
    }

    clearAsins() {
        const inputEl = document.getElementById("asin-input");
        if (inputEl) {
            inputEl.value = "";
            inputEl.dispatchEvent(new Event("input"));
        }
    }

    validateAsins(input) {
        const asins = input.split(/[,\n\s]+/).map((a) => a.trim().toUpperCase()).filter((a) => a);
        const valid = asins.filter((a) => /^B0[A-Z0-9]{8}$/.test(a));
        return { valid, invalid: asins.filter((a) => !valid.includes(a)) };
    }

    // ================== Scraping Logic ==================

    async startScraping() {
        state.isScraping = true;
        const input = document.getElementById("asin-input").value;
        const { valid: asins } = this.validateAsins(input);

        if (!state.selectedSite) state.selectedSite = "DE";
        const site = state.selectedSite;

        if (!LANGUAGE_HEADERS[site]) {
            showToast(`无效的站点代码: ${site}，请重新选择`, "error");
            return;
        }

        state.scrapedData = null;
        state.analysisReport = null;
        state.translatedReport = null;
        state.currentHistoryId = Date.now();

        document.getElementById("no-data-msg").classList.remove("hidden");
        document.getElementById("data-cards").classList.add("hidden");
        document.getElementById("report-display").classList.add("hidden");
        document.getElementById("no-report-msg").classList.remove("hidden");

        const btn = document.getElementById("start-scrape-btn");
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>正在采集...</span>`;
        btn.classList.add("opacity-80");

        document.getElementById("scrape-status-panel").classList.remove("hidden");
        document.getElementById("scrape-status-list").innerHTML = "";
        document.getElementById("scrape-summary").classList.add("hidden");

        showProgress(true, 5);

        const scrapeReviews = document.getElementById("scrape-reviews").checked;
        let products = [];

        try {
            const scrapePromises = asins.map(async (asin, index) => {
                this.updateScrapeStatus(asin, "pending", "等待...");
                await sleep(index * 300);
                return scrapeAsin(asin, site, scrapeReviews, (a, s, m) => this.updateScrapeStatus(a, s, m));
            });

            products = await Promise.all(scrapePromises);

            products.forEach((p) => {
                if (p.scrape_status === "success") {
                    const bullets = p.feature_bullets?.length || 0;
                    const reviews = p.customer_reviews?.length || 0;
                    const hasTitle = !!p.productTitle;

                    const richMsg = `
                        <div class="grid grid-cols-3 gap-1.5 w-full text-center">
                            <div class="bg-indigo-50 rounded px-1 py-1 border border-indigo-100 flex flex-col justify-center">
                                <div class="text-[10px] text-indigo-400 font-medium">标题</div>
                                <div class="text-xs font-bold ${hasTitle ? "text-indigo-600" : "text-slate-300"}">${hasTitle ? "OK" : "-"}</div>
                            </div>
                            <div class="bg-slate-50 rounded px-1 py-1 border border-slate-100 flex flex-col justify-center">
                                <div class="text-[10px] text-slate-400 font-medium">五点</div>
                                <div class="text-xs font-bold text-slate-700">${bullets}</div>
                            </div>
                            <div class="bg-slate-50 rounded px-1 py-1 border border-slate-100 flex flex-col justify-center">
                                <div class="text-[10px] text-slate-400 font-medium">评论</div>
                                <div class="text-xs font-bold text-slate-700">${reviews}</div>
                            </div>
                        </div>
                    `;
                    this.updateScrapeStatus(p.asin, "success", richMsg);
                }
            });
        } catch (error) {
            ErrorService.handle(error, { action: 'startScraping', module: 'scraper', notify: false });
            showToast("任务异常中断", "error");
        } finally {
            if (!products || products.length === 0) {
                products = asins.map((asin) => ({
                    asin,
                    scrape_status: "failed",
                    error: "System Error",
                    feature_bullets: [],
                    customer_reviews: [],
                }));
            }

            const siteConfig = LANGUAGE_HEADERS[site] || {};

            state.scrapedData = {
                metadata: {
                    scrape_timestamp: new Date().toISOString(),
                    marketplace: site,
                    domain: siteConfig.domain || "unknown",
                    language: siteConfig.name || "unknown",
                    total_asins: asins.length,
                },
                products,
            };

            this.renderScrapeSummary(products);
            HistoryService.save(state.scrapedData, null);

            showProgress(false);
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-rocket"></i> <span>开始采集</span>`;
            btn.classList.remove("opacity-80");

            const inputNow = document.getElementById("asin-input").value;
            if (!inputNow) {
                btn.disabled = true;
                btn.classList.add("opacity-50", "cursor-not-allowed", "grayscale");
            }

            const successCount = products.filter((p) => p.scrape_status === "success").length;
            if (successCount > 0) {
                if (typeof renderDataPanel === "function") renderDataPanel();
                if (typeof updateAsinSelectList === "function") updateAsinSelectList();
            }
            this.renderHistory();

            showToast(`完成: ${successCount} 成功`, successCount > 0 ? "success" : "warning");
            state.isScraping = false;
        }
    }

    updateScrapeStatus(asin, status, message) {
        const list = document.getElementById("scrape-status-list");
        if (!list) return;

        if (!list.classList.contains("grid")) {
            list.className = "grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar";
        }

        let item = list.querySelector(`[data-asin="${asin}"]`);
        const cfg = this.getStatusConfig(status);
        const isRich = message.includes("<");

        const htmlContent = `
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 border-dashed">
                <span class="font-mono font-bold text-base text-slate-800">${asin}</span>
                <div class="w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center">
                    <i class="fas ${cfg.icon} ${cfg.text} text-sm"></i>
                </div>
            </div>
            <div class="text-xs text-slate-600 min-h-[2rem] flex items-center justify-center w-full">
                ${isRich ? message : `<div class="flex items-center gap-1.5 opacity-90 w-full"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span><span class="truncate font-medium w-full" title="${message}">${message}</span></div>`}
            </div>
        `;

        const classes = `p-3.5 rounded-xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md ${cfg.border} ${cfg.shadow}`;

        if (!item) {
            item = document.createElement("div");
            item.dataset.asin = asin;
            item.className = classes;
            item.innerHTML = htmlContent;
            list.appendChild(item);
        } else {
            item.className = classes;
            item.innerHTML = htmlContent;
        }
    }

    getStatusConfig(status) {
        const map = {
            pending: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", icon: "fa-circle", shadow: "" },
            scraping: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", icon: "fa-circle-notch fa-spin", shadow: "shadow-indigo-50" },
            success: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", icon: "fa-check-circle", shadow: "shadow-emerald-50" },
            failed: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", icon: "fa-times-circle", shadow: "shadow-rose-50" },
        };
        return map[status] || map.pending;
    }

    renderScrapeSummary(products) {
        const summary = document.getElementById("scrape-summary");
        if (!summary) return;

        const failed = products.filter((p) => p.scrape_status === "failed");
        if (failed.length > 0) {
            summary.innerHTML = `
                <div class="p-4 bg-rose-50 border border-rose-100 rounded-xl mt-4">
                    <div class="flex items-center gap-2 text-sm font-bold text-rose-700 mb-2">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>异常报告 (${failed.length})</span>
                    </div>
                    <div class="space-y-1.5">
                        ${failed.map((p) => `
                            <div class="flex justify-between items-center text-xs text-rose-600 bg-white/60 px-3 py-1.5 rounded border border-rose-100">
                                <span class="font-mono font-medium">${p.asin}</span>
                                <span class="truncate max-w-[200px] opacity-90">${getErrorSummary(p.error)}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>`;
            summary.classList.remove("hidden");
        } else {
            summary.innerHTML = "";
            summary.classList.add("hidden");
        }
    }

    // ================== History Logic ==================

    renderHistory() {
        const history = HistoryService.getAll();
        const list = document.getElementById("history-list");
        if (!list) return;

        if (history.length === 0) {
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                    <i class="far fa-folder-open text-4xl mb-3 opacity-40"></i>
                    <p class="text-sm font-medium">暂无历史数据</p>
                </div>`;
            return;
        }

        list.innerHTML = history.map((h) => {
            const isActive = state.currentHistoryId === h.id;
            const products = h.data?.products || [];
            const validProducts = products.filter((p) => p.productTitle && p.productTitle.length > 5);
            const successCount = validProducts.length;
            const total = h.asins.length;
            const totalReviews = products.reduce((acc, p) => acc + (p.customer_reviews?.length || 0), 0);

            const date = new Date(h.timestamp);
            const isToday = new Date().toDateString() === date.toDateString();
            const dateStr = isToday
                ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
                : `${date.getMonth() + 1}/${date.getDate()}`;

            const flagKey = h.site === "UK" ? "GB" : h.site;
            const flag = languageFlagMap[flagKey] || "🏳️";
            const cnName = SITE_NAME_MAP[h.site] || h.site;
            const domain = LANGUAGE_HEADERS[h.site]?.domain || "";

            const containerClass = isActive
                ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100"
                : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200";

            const successColor = successCount === total ? "text-emerald-600" : successCount > 0 ? "text-amber-500" : "text-rose-500";

            return `
            <div class="relative p-3 rounded-xl border border-gray-200 bg-white mb-2 group transition-all hover:border-indigo-200 hover:shadow-sm ${containerClass}">
                <div class="flex items-start justify-between mb-2 relative z-10">
                    <div class="flex items-center gap-2">
                        <span class="text-lg flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 shrink-0">${flag}</span>
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1.5">
                                <span class="text-sm font-bold text-gray-800 tracking-tight leading-none">${cnName}站</span>
                                ${h.report ? '<span class="inline-flex items-center px-1.5 py-[1px] rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100"><i class="fas fa-magic mr-1"></i>已分析</span>' : ""}
                            </div>
                            ${domain ? `<span class="text-[10px] text-gray-400 font-medium leading-tight">${domain}</span>` : ""}
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">${dateStr}</span>
                        <button onclick="event.stopPropagation(); window.deleteHistoryItem(${h.id})" 
                            class="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100" title="删除">
                            <i class="fas fa-times text-[10px]"></i>
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-2 relative z-10 pl-0.5">
                    ${h.asins.slice(0, 3).map((asin) => `<span class="text-[10px] font-mono font-medium text-gray-600 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-default">${asin}</span>`).join("")}
                    ${h.asins.length > 3 ? `<span class="text-[10px] text-gray-400 font-medium px-1">+${h.asins.length - 3}</span>` : ""}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div class="flex gap-4">
                        <div class="flex items-center gap-1.5"><span class="text-[9px] text-gray-400">成功</span><span class="text-[11px] font-bold font-mono ${successColor}">${successCount}/${total}</span></div>
                        <div class="flex items-center gap-1.5"><span class="text-[9px] text-gray-400">标题</span><span class="text-[11px] font-bold text-gray-700 font-mono">${validProducts.length}</span></div>
                        <div class="flex items-center gap-1.5"><span class="text-[9px] text-gray-400">评论</span><span class="text-[11px] font-bold text-gray-700 font-mono">${totalReviews}</span></div>
                    </div>
                    <button onclick="window.loadHistory(${h.id})" title="加载数据" class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-white hover:bg-indigo-600 shadow-sm hover:shadow hover:scale-105 transition-all z-20">
                        <i class="fas fa-arrow-right text-[9px]"></i>
                    </button>
                </div>
                ${isActive ? '<div class="absolute left-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-r shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>' : ""}
            </div>`;
        }).join("");
    }

    loadHistory(id) {
        if (state.isScraping) {
            const confirmMsg = "任务正在进行中，加载快照将覆盖当前视图，确定继续？";
            if (!confirm(confirmMsg)) return;
        }

        const item = HistoryService.getById(id);
        if (!item) {
            showToast("未找到指定的历史记录", "error");
            return;
        }

        try {
            state.currentHistoryId = id;
            state.scrapedData = item.data;
            state.analysisReport = item.report;
            state.translatedReport = null;
            state.selectedSite = item.site;

            const asinInput = document.getElementById("asin-input");
            if (asinInput) {
                asinInput.value = Array.isArray(item.asins) ? item.asins.join("\n") : "";
                asinInput.dispatchEvent(new Event("input"));
            }

            this.selectSite(item.site);

            const validCount = item.data?.products?.filter((p) => p.scrape_status === "success").length || 0;
            const dataCards = document.getElementById("data-cards");
            const noDataMsg = document.getElementById("no-data-msg");

            if (validCount > 0) {
                if (typeof renderDataPanel === "function") renderDataPanel();
                if (typeof updateAsinSelectList === "function") updateAsinSelectList();
                dataCards?.classList.remove("hidden");
                noDataMsg?.classList.add("hidden");
            } else {
                dataCards?.classList.add("hidden");
                noDataMsg?.classList.remove("hidden");
            }

            this.renderHistory();

            const reportDisplay = document.getElementById("report-display");
            const noReportMsg = document.getElementById("no-report-msg");

            if (window.renderReport && item.report) {
                window.renderReport();
                reportDisplay?.classList.remove("hidden");
                noReportMsg?.classList.add("hidden");
            } else {
                noReportMsg?.classList.remove("hidden");
                reportDisplay?.classList.add("hidden");
            }

            showToast("历史快照已还原", "success");
        } catch (error) {
            ErrorService.handle(error, { action: 'loadHistory', module: 'scraper' });
        }
    }

    deleteHistoryItem(id) {
        if (!confirm("确定要删除这条历史记录吗？")) return;

        try {
            const history = StorageService.getScrapeHistory();
            const newHistory = history.filter((h) => h.id !== id);
            StorageService.setScrapeHistory(newHistory);

            if (state.currentHistoryId === id) {
                state.scrapedData = null;
                state.analysisReport = null;
                document.getElementById("data-cards").classList.add("hidden");
                document.getElementById("no-data-msg").classList.remove("hidden");
            }

            this.renderHistory();
            showToast("记录已删除", "success");
        } catch (e) {
            ErrorService.handle(e, { action: 'deleteHistoryItem', module: 'scraper' });
        }
    }

    clearHistory() {
        if (!confirm("确定清空所有历史记录？")) return;
        HistoryService.clear();
        state.currentHistoryId = null;
        state.scrapedData = null;
        state.analysisReport = null;
        this.renderHistory();
    }

    registerGlobalActions() {
        registerActionsWithLegacy({
            loadHistory: (id) => this.loadHistory(id),
            deleteHistoryItem: (id) => this.deleteHistoryItem(id),
            selectSite: (s) => this.selectSite(s),
            clearAsins: () => this.clearAsins(),
        });
    }
}

// ================== Export / Bootstrap ==================

const instance = new ScraperModule();

export const initScraperListeners = () => {
    window.addEventListener('app:route-changed', (e) => {
        const { routeId } = e.detail;
        const container = document.getElementById('panel-scraper');

        if (routeId === 'scraper') {
            if (!instance._isMounted && container) instance.mount(container);
        } else {
            if (instance._isMounted) instance.unmount();
        }
    });
};

export const selectSite = (s) => instance.selectSite(s);
export const renderHistory = () => instance.renderHistory();