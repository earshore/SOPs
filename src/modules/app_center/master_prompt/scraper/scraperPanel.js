// src/modules/master_prompt/scraper/scraperPanel.js
// ================================================= ================ 
// 🎯 Phase 3.2: Alpine.js Refactor - Scraper Panel
// ================================================= ================ 

import { scrapeAsin } from "./scraperService.js";
import { LANGUAGE_HEADERS, languageFlagMap, SITE_NAME_MAP } from "../../../../common/constants/constants.js";
import { HistoryService } from "../services/historyService.js";
import { StorageService, STORAGE_KEYS } from "../../../../services/storageService.js";
import { ErrorService } from "../../../../services/errorService.js";
import { showToast, sleep, getErrorSummary } from "../../../../common/utils/ui.js";
import eventBus from "../../../../common/EventBus.js";
import { MODULE_EVENTS } from "../../../../common/constants/eventConstants.js";

// ========================================== 
// Alpine Component Logic
// ========================================== 

const ScraperPanel = () => ({
    // State
    inputAsins: '',
    selectedSite: 'DE',
    scrapeReviews: true,
    isScraping: false,

    // UI State
    tasks: [], // { asin, status: 'pending'|'scraping'|'success'|'failed', message: '', richMsg: '' }
    history: [],

    // Constants for View
    sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'],

    // Computed
    get validAsins() {
        if (!this.inputAsins) return [];
        return this.inputAsins
            .split(/[,,\n\s]+/)
            .map(a => a.trim().toUpperCase())
            .filter(a => /^B0[A-Z0-9]{8}$/.test(a));
    },

    get invalidCount() {
        const raw = this.inputAsins.split(/[,,\n\s]+/).filter(a => a.trim());
        return raw.length - this.validAsins.length;
    },

    get canStart() {
        return this.validAsins.length > 0 && !this.isScraping;
    },

    get proxyConfigStatus() {
        const config = StorageService.get(STORAGE_KEYS.PROXY_CONFIG) || { type: 'allorigins' };
        const map = {
            scraperapi: 'ScraperAPI', zenrows: 'ZenRows', brightdata: 'Bright Data',
            custom_api: 'Custom API', allorigins: '自动托管', custom_proxy: 'HTTP 代理'
        };
        const name = map[config.type] || '自动';
        const ready = config.type === 'allorigins' || !!config.customUrl;
        return { name, ready, type: config.type };
    },

    // Lifecycle
    init() {
        console.log("🚀 Scraper Panel (Alpine) Initialized");
        this.loadHistory();

        // Listen for external history updates (e.g. from Analysis module saving history)
        // We use a window event listener for simplicity or EventBus bridge
        window.addEventListener('history-updated', () => this.loadHistory());
    },

    // --- Actions ---

    selectSite(site) {
        this.selectedSite = site;
    },

    clearAsins() {
        this.inputAsins = '';
    },

    loadHistory() {
        this.history = HistoryService.getAll();
    },

    deleteHistoryItem(id) {
        if (!confirm("确定要删除这条历史记录吗？")) return;

        const newHistory = this.history.filter(h => h.id !== id);
        StorageService.setScrapeHistory(newHistory);
        this.loadHistory();
        showToast("记录已删除", "success");
    },

    clearAllHistory() {
        if (!confirm("确定清空所有历史记录？")) return;
        HistoryService.clear();
        this.loadHistory();
        showToast("历史已清空", "success");
    },

    loadHistoryItem(item) {
        if (this.isScraping) {
            if (!confirm("任务进行中，确定覆盖？")) return;
        }

        // Restore State
        this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
        this.selectedSite = item.site;

        // Restore Global State (for Analysis Module)
        // Ideally Analysis Module should listen to an event, but direct state manipulation is current pattern
        // We will emit an event instead of touching state directly if possible, but for compatibility:
        import("../../../../common/state.js").then(({ default: state }) => {
            state.currentHistoryId = item.id;
            state.scrapedData = item.data;
            state.analysisReport = item.report;
            state.translatedReport = null;
            state.selectedSite = item.site;

            // Notify other modules
            eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

            // If report exists, we might want to switch tab? 
            // For now, just load data. User can click Analysis tab.
            if (item.report) {
                // Bridge to trigger render in Analysis (if it listens)
                // AnalysisModule listens to 'app:route-changed' or checks state on render.
            }

            showToast("历史快照已加载", "success");
        });
    },

    // --- Scraping Logic ---

    async startScrape() {
        if (!this.canStart) return;

        this.isScraping = true;
        this.tasks = []; // Clear previous tasks

        // Initialize Tasks UI
        this.validAsins.forEach(asin => {
            this.tasks.push({ asin, status: 'pending', message: '等待中...' });
        });

        const site = this.selectedSite;
        const scrapeReviews = this.scrapeReviews;
        let products = [];

        try {
            const promises = this.validAsins.map(async (asin, index) => {
                // Update task to scraping
                this.updateTask(asin, 'scraping', '正在采集...');

                // Stagger requests
                if (index > 0) await sleep(index * 800);

                return scrapeAsin(asin, site, scrapeReviews, (a, status, msg) => {
                    this.updateTask(a, status, msg);
                });
            });

            products = await Promise.all(promises);

        } catch (e) {
            ErrorService.handle(e, { action: 'startScrape', module: 'scraper' });
            showToast("采集任务异常中断", "error");
        } finally {
            // Finalize
            this.handleScrapeComplete(products);
            this.isScraping = false;
        }
    },

    updateTask(asin, status, message) {
        const task = this.tasks.find(t => t.asin === asin);
        if (task) {
            task.status = status;
            task.message = message;
            // Rich message for success
            if (status === 'success' && message.includes('<div')) {
                task.richMsg = message; // Store rich HTML separately if needed, or just put in message
            }
        }
    },

    handleScrapeComplete(products) {
        // Fallback for failed/empty
        if (!products || products.length === 0) {
            products = this.validAsins.map(asin => ({
                asin, scrape_status: 'failed', error: 'Unknown Error'
            }));
        }

        const siteConfig = LANGUAGE_HEADERS[this.selectedSite] || {};

        const scrapedData = {
            metadata: {
                scrape_timestamp: new Date().toISOString(),
                marketplace: this.selectedSite,
                domain: siteConfig.domain || "unknown",
                language: siteConfig.name || "unknown",
                total_asins: this.validAsins.length,
            },
            products,
        };

        // Save History
        HistoryService.save(scrapedData, null);
        this.loadHistory(); // Refresh list

        // Update Global State
        import("../../../../common/state.js").then(({ default: state }) => {
            state.scrapedData = scrapedData;
            state.analysisReport = null; // Reset analysis

            const successCount = products.filter(p => p.scrape_status === 'success').length;
            if (successCount > 0) {
                eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, scrapedData);
                showToast(`采集完成: ${successCount} 成功`, "success");
            } else {
                showToast("采集完成，但全部失败", "error");
            }
        });
    },

    // --- Helpers ---
    getFlag(site) {
        const map = {
            DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
            SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧', GB: '🇬🇧'
        };
        return map[site] || '🏳️';
    },

    getSiteName(site) {
        const map = {
            DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
            SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
        };
        return map[site] || site;
    },

    formatDate(ts) {
        const date = new Date(ts);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
});

// ========================================== 
// Initialization & Exports
// ========================================== 

export function initAlpineScraper() {
    if (window.Alpine) {
        window.Alpine.data('scraperPanel', ScraperPanel);
    }
}

// Legacy Bridges
export const renderHistory = () => {
    // Dispatch event to update Alpine component
    window.dispatchEvent(new CustomEvent('history-updated'));
};

export const initScraperListeners = () => {
    // No-op for listeners, handled by Alpine
};

export const selectSite = () => { }; // Handled by Alpine