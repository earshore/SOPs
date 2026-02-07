/**
 * Scraper 子模块
 * 负责亚马逊数据采集功能
 * 
 * 架构说明：
 * - 使用 Alpine.js 进行响应式 UI 管理
 * - 状态保存到 state.scraper 命名空间
 * - 通过 EventBus 与其他模块通信
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader.js';
import eventBus from '../../../../../common/EventBus.js';
import state from '../../../../../common/state.js';
import { scrapeAsin } from '../services/scraperService.js';
import { LANGUAGE_HEADERS } from '../../../../../common/constants/constants.js';
import { HistoryService } from '../services/historyService.js';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService.js';
import { ErrorService } from '../../../../../services/errorService.js';
import { showToast, sleep } from '../../../../../common/utils/ui.js';
import { MODULE_EVENTS } from '../../../../../common/constants/eventConstants.js';

// ========================================== 
// Alpine Component Logic
// ========================================== 

/**
 * Scraper Panel Alpine.js 组件
 * 提供数据采集的完整功能
 */
const ScraperPanel = () => ({
    // ========== State ==========
    inputAsins: '',
    selectedSite: 'DE',
    scrapeReviews: true,
    isScraping: false,

    // UI State
    tasks: [], // { asin, status: 'pending'|'scraping'|'success'|'failed', message: '', richMsg: '' }
    history: [],

    // Constants for View
    sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'],

    // ========== Computed Properties ==========
    
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

    // ========== Lifecycle ==========
    
    init() {
        console.log("[Scraper] 🚀 Alpine 组件初始化");
        
        // 从 state 恢复状态
        this.restoreState();
        
        // 加载历史记录
        this.loadHistory();

        // 监听外部历史更新事件
        window.addEventListener('history-updated', () => this.loadHistory());
    },

    // ========== State Management ==========
    
    /**
     * 从 state 恢复状态
     */
    restoreState() {
        if (state.scraper.selectedSite) {
            this.selectedSite = state.scraper.selectedSite;
        }
        
        // 恢复输入的 ASIN（如果有保存的话）
        if (state.scraper.inputAsins) {
            this.inputAsins = state.scraper.inputAsins;
        }
        
        console.log("[Scraper] ✅ 状态已恢复");
    },

    /**
     * 保存状态到 state
     */
    saveState() {
        state.scraper.selectedSite = this.selectedSite;
        state.scraper.inputAsins = this.inputAsins;
        state.scraper.isScraping = this.isScraping;
        
        console.log("[Scraper] 💾 状态已保存");
    },

    // ========== Actions ==========

    selectSite(site) {
        this.selectedSite = site;
        this.saveState();
    },

    clearAsins() {
        this.inputAsins = '';
        this.saveState();
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

        // 恢复本地状态
        this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
        this.selectedSite = item.site;

        // 恢复全局状态
        state.scraper.currentHistoryId = item.id;
        state.scraper.scrapedData = item.data;
        state.analysis.analysisReport = item.report;
        state.analysis.translatedReport = null;
        state.scraper.selectedSite = item.site;

        // 通知其他模块
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

        showToast("历史快照已加载", "success");
        
        this.saveState();
    },

    // ========== Scraping Logic ==========

    async startScrape() {
        if (!this.canStart) return;

        this.isScraping = true;
        this.tasks = []; // 清空之前的任务

        // 初始化任务 UI
        this.validAsins.forEach(asin => {
            this.tasks.push({ asin, status: 'pending', message: '等待中...' });
        });

        const site = this.selectedSite;
        const scrapeReviews = this.scrapeReviews;
        let products = [];

        try {
            const promises = this.validAsins.map(async (asin, index) => {
                // 更新任务状态为采集中
                this.updateTask(asin, 'scraping', '正在采集...');

                // 错开请求时间
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
            // 完成采集
            this.handleScrapeComplete(products);
            this.isScraping = false;
            this.saveState();
        }
    },

    updateTask(asin, status, message) {
        const task = this.tasks.find(t => t.asin === asin);
        if (task) {
            task.status = status;
            task.message = message;
            // 富文本消息用于成功状态
            if (status === 'success' && message.includes('<div')) {
                task.richMsg = message;
            }
        }
    },

    handleScrapeComplete(products) {
        // 处理失败或空结果
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

        // 保存历史记录
        HistoryService.save(scrapedData, null);
        this.loadHistory();

        // 更新全局状态
        state.scraper.scrapedData = scrapedData;
        state.analysis.analysisReport = null; // 重置分析报告

        const successCount = products.filter(p => p.scrape_status === 'success').length;
        if (successCount > 0) {
            eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, scrapedData);
            showToast(`采集完成: ${successCount} 成功`, "success");
        } else {
            showToast("采集完成，但全部失败", "error");
        }
        
        this.saveState();
    },

    // ========== Helpers ==========
    
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
// Module Exports (统一架构接口)
// ========================================== 

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container) {
    console.log('[Scraper] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/master_prompt/scraper/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;

        // 2. 初始化 Alpine.js 组件
        if (window.Alpine) {
            // 注册 Alpine 组件（如果尚未注册）
            window.Alpine.data('scraperPanel', ScraperPanel);
        } else {
            console.warn('[Scraper] ⚠️ Alpine.js 未加载');
        }

        console.log('[Scraper] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Scraper] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount() {
    console.log('[Scraper] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        // Alpine 组件的状态已经在操作过程中保存到 state
        // 这里不需要额外操作

        // 2. 清理事件监听器
        // Alpine 会自动清理其内部的事件监听器
        // 我们只需要清理手动添加的全局监听器
        // 注意：window.addEventListener('history-updated') 在 Alpine init 中添加
        // 由于 Alpine 组件会被销毁，这个监听器也会失效

        console.log('[Scraper] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Scraper] ❌ 子模块卸载失败:', error);
    }
}

// ========================================== 
// Legacy Bridges (向后兼容)
// ========================================== 

/**
 * 初始化 Alpine Scraper 组件（向后兼容）
 */
export function initAlpineScraper() {
    if (window.Alpine) {
        window.Alpine.data('scraperPanel', ScraperPanel);
    }
}

/**
 * 渲染历史记录（向后兼容）
 */
export const renderHistory = () => {
    window.dispatchEvent(new CustomEvent('history-updated'));
};

/**
 * 初始化 Scraper 监听器（向后兼容）
 */
export const initScraperListeners = () => {
    // No-op，由 Alpine 处理
};

/**
 * 选择站点（向后兼容）
 */
export const selectSite = () => {
    // No-op，由 Alpine 处理
};
