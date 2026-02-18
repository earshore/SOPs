/**
 * Scraper Panel Alpine.js 组件核心逻辑
 */

import type { Task, ProxyConfig, DataTab } from '../types';
import state from '../../../../../../common/state';
import { StorageService, STORAGE_KEYS } from '../../../../../../services/storageService';
import { ErrorService } from '../../../../../../services/errorService';
import { showToast } from '../../../../../../common/ui';
import { APP_EVENTS } from '../../../../../../common/constants/eventConstants';
import { extractValidAsins } from '../utils/validators';
import { getFlag, getSiteName, formatDate } from '../utils/formatters';
import { startScrape, handleScrapeComplete, updateTask } from '../handlers/scrapeHandler';
import { handleImportFiles as handleImportFilesCore } from '../handlers/importHandler';
import { deleteProduct as deleteProductCore, deleteReview as deleteReviewCore, confirmWithModal } from '../handlers/dataOperations';
import { DataPreview, DataPreviewState } from './DataPreview';
import { HistoryPanel } from './HistoryPanel';

/**
 * 创建 Scraper Panel Alpine 组件
 */
export function createScraperPanel() {
    return {
        // ========== State ==========
        inputAsins: '',
        selectedSite: 'DE',
        scrapeReviews: true,
        isScraping: false,
        currentDataTab: 'preview' as DataTab, // 添加直接的状态属性

        // UI State
        tasks: [] as Task[],

        // 数据预览组件
        dataPreview: null as DataPreview | null,

        // 历史记录组件
        historyPanel: null as HistoryPanel | null,

        // Constants for View
        sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'],

        // ========== Computed Properties ==========

        get validAsins(): string[] {
            return extractValidAsins(this.inputAsins);
        },

        get invalidCount(): number {
            const raw = this.inputAsins.split(/[,,\n\s]+/).filter(a => a.trim());
            return raw.length - this.validAsins.length;
        },

        get canStart(): boolean {
            return this.validAsins.length > 0 && !this.isScraping;
        },

        get hasData(): boolean {
            return state.scraper.scrapedData?.products?.length > 0;
        },

        get proxyConfigStatus(): { name: string; ready: boolean; type: string } {
            const config = StorageService.get(STORAGE_KEYS.PROXY_CONFIG) as ProxyConfig || { type: 'allorigins' };
            const map: Record<string, string> = {
                scraperapi: 'ScraperAPI', zenrows: 'ZenRows', brightdata: 'Bright Data',
                custom_api: 'Custom API', allorigins: '自动托管', custom_proxy: 'HTTP 代理'
            };
            const name = map[config.type] || '自动';
            const ready = config.type === 'allorigins' || !!config.customUrl;
            return { name, ready, type: config.type };
        },

        // 数据预览相关计算属性
        get totalProducts(): number {
            return this.dataPreview?.totalProducts || 0;
        },

        get totalPages(): number {
            return this.dataPreview?.totalPages || 0;
        },

        get paginatedProducts(): any[] {
            return this.dataPreview?.paginatedProducts || [];
        },

        get shouldUsePagination(): boolean {
            return this.dataPreview?.shouldUsePagination || false;
        },

        get currentPage(): number {
            return this.dataPreview?.getState().currentPage || 1;
        },

        get expandedAsin(): string | null {
            return this.dataPreview?.getState().expandedAsin || null;
        },

        // 历史记录相关计算属性
        get history(): any[] {
            return this.historyPanel?.getHistory() || [];
        },

        // ========== Lifecycle ==========

        init() {
            console.log("[Scraper] 🚀 Alpine 组件初始化");

            // 从 state 初始化 currentDataTab
            this.currentDataTab = state.scraper.currentDataTab || 'preview';

            // 初始化数据预览组件
            const previewState: DataPreviewState = {
                expandedAsin: state.scraper.expandedAsin || null,
                currentDataTab: this.currentDataTab,
                currentPage: 1,
                itemsPerPage: 50
            };
            this.dataPreview = new DataPreview(previewState, state.scraper.scrapedData);

            // 初始化历史记录组件
            this.historyPanel = new HistoryPanel();

            // 从 state 恢复状态
            this.restoreState();

            // 监听外部历史更新事件
            window.addEventListener(APP_EVENTS.HISTORY_UPDATED, () => this.loadHistory());

            // 监听自定义历史更新事件（来自 AI 分析模块）
            window.addEventListener('history-updated', () => {
                console.log('[Scraper] 收到历史更新事件，重新加载历史记录');
                this.loadHistory();
            });

            // 如果有数据则渲染预览
            if (this.hasData && this.dataPreview) {
                setTimeout(() => {
                    this.dataPreview!.checkLargeDataset();
                    this.renderDataPanel();
                    this.dataPreview!.setupEventDelegation((asin) => this.toggleCardExpand(asin));
                }, 100);
            }
        },

        // ========== State Management ==========

        /**
         * 从 state 恢复状态
         */
        restoreState() {
            if (state.scraper.selectedSite) {
                this.selectedSite = state.scraper.selectedSite;
            }

            if (state.scraper.inputAsins) {
                this.inputAsins = state.scraper.inputAsins;
            }

            console.log("[Scraper] ✅ 状态已恢复");
        },

        /**
         * 保存状态到 state
         */
        saveState() {
            state.scraper.selectedSite = this.selectedSite as any;
            state.scraper.inputAsins = this.inputAsins;
            state.scraper.isScraping = this.isScraping;

            if (this.dataPreview) {
                const previewState = this.dataPreview.getState();
                state.scraper.expandedAsin = previewState.expandedAsin;
                state.scraper.currentDataTab = previewState.currentDataTab;
            }

            console.log("[Scraper] 💾 状态已保存");
        },

        // ========== Actions ==========

        selectSite(site: string) {
            this.selectedSite = site as any;
            this.saveState();
        },

        clearAsins() {
            this.inputAsins = '';
            this.saveState();
        },

        loadHistory() {
            this.historyPanel?.loadHistory();
        },

        deleteHistoryItem(id: string) {
            this.historyPanel?.deleteHistoryItem(id);
        },

        clearAllHistory() {
            this.historyPanel?.clearAllHistory();
        },

        loadHistoryItem(item: any) {
            const success = this.historyPanel?.loadHistoryItem(item, this.isScraping);
            if (success) {
                // 恢复本地状态
                this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
                this.selectedSite = item.site;

                // 更新数据预览
                if (this.dataPreview) {
                    this.dataPreview.updateData(state.scraper.scrapedData);
                    this.dataPreview.checkLargeDataset();
                    this.renderDataPanel();
                }

                this.saveState();
            }
        },

        async loadAnalysisReport(item: any) {
            await this.historyPanel?.loadAnalysisReport(item);
        },

        // ========== Scraping Logic ==========

        async startScrape() {
            if (!this.canStart) return;

            console.log('[Scraper] 开始采集流程', {
                asins: this.validAsins,
                site: this.selectedSite,
                scrapeReviews: this.scrapeReviews
            });

            this.isScraping = true;
            this.tasks = []; // 清空之前的任务

            // 初始化任务 UI
            this.validAsins.forEach(asin => {
                this.tasks.push({ asin, status: 'pending', message: '等待中...' });
            });

            const site = this.selectedSite;
            const scrapeReviews = this.scrapeReviews;
            let products: any[] = [];

            try {
                console.log('[Scraper] 调用 startScrape 函数');
                products = await startScrape(
                    this.validAsins,
                    site,
                    scrapeReviews,
                    this.tasks,
                    (asin, status, msg) => updateTask(this.tasks, asin, status, msg)
                );
                console.log('[Scraper] startScrape 完成', { productsCount: products.length, products });
            } catch (e) {
                console.error('[Scraper] startScrape 异常:', e);
                ErrorService.handle(e as Error, { action: 'startScrape', module: 'scraper' });
                showToast("采集任务异常中断", "error");
            } finally {
                console.log('[Scraper] 进入 finally 块', { productsCount: products.length });
                // 完成采集
                const scrapedData = handleScrapeComplete(products, this.validAsins, this.selectedSite);
                console.log('[Scraper] handleScrapeComplete 完成', scrapedData);

                // 更新全局状态
                state.scraper.scrapedData = scrapedData;
                state.analysis.analysisReport = null; // 重置分析报告

                const successCount = products.filter(p => p.scrape_status === 'success').length;
                if (successCount > 0) {
                    showToast(`采集完成: ${successCount} 成功`, "success");
                } else {
                    showToast("采集完成，但全部失败", "error");
                }

                // 更新数据预览
                if (this.dataPreview) {
                    this.dataPreview.updateData(scrapedData);
                    this.dataPreview.checkLargeDataset();
                    this.renderDataPanel();
                }

                // 重新加载历史记录
                this.loadHistory();

                this.isScraping = false;
                this.saveState();
            }
        },

        // ========== 数据导入功能 ==========

        triggerImport(): void {
            const input = document.getElementById("import-file-input") as HTMLInputElement;
            if (input) {
                input.value = "";
                input.click();
            }
        },

        async handleImportFiles(event: Event): Promise<void> {
            const target = event.target as HTMLInputElement;
            const files = Array.from(target.files || []);
            if (files.length === 0) return;

            try {
                const result = await handleImportFilesCore(
                    files,
                    state.scraper.scrapedData,
                    this.selectedSite
                );

                if (result.success && result.data) {
                    // 更新全局状态
                    state.scraper.scrapedData = result.data;
                    state.analysis.analysisReport = null;

                    // 如果没有现有数据，更新选中的站点
                    if (!state.scraper.scrapedData || !state.scraper.scrapedData.products || state.scraper.scrapedData.products.length === 0) {
                        const marketplace = result.data.metadata?.marketplace || 'DE';
                        state.scraper.selectedSite = marketplace as any;
                        this.selectedSite = marketplace;
                    }

                    // 更新数据预览
                    if (this.dataPreview) {
                        this.dataPreview.updateData(result.data);
                        this.dataPreview.checkLargeDataset();
                        this.renderDataPanel();
                    }

                    // 重新加载历史记录
                    this.loadHistory();
                }
            } finally {
                target.value = '';
            }
        },

        // ========== 数据预览功能 ==========

        renderDataPanel(): void {
            if (!this.dataPreview) return;

            this.dataPreview.renderDataPanel(
                (asin) => this.toggleCardExpand(asin),
                (asin) => this.deleteProduct(asin),
                (asin, index) => this.deleteReview(asin, index)
            );
        },

        toggleCardExpand(asin: string): void {
            if (!this.dataPreview) return;
            this.dataPreview.toggleCardExpand(asin);
            this.saveState();
            this.renderDataPanel();
        },

        switchDataTab(tab: 'preview' | 'json'): void {
            this.currentDataTab = tab;
            if (this.dataPreview) {
                this.dataPreview.switchDataTab(tab);
            }
            this.saveState();
        },

        goToPage(page: number): void {
            if (!this.dataPreview) return;
            this.dataPreview.goToPage(page);
            this.renderDataPanel();
        },

        previousPage(): void {
            if (!this.dataPreview) return;
            this.dataPreview.previousPage();
            this.renderDataPanel();
        },

        nextPage(): void {
            if (!this.dataPreview) return;
            this.dataPreview.nextPage();
            this.renderDataPanel();
        },

        async deleteProduct(asin: string): Promise<void> {
            const result = await deleteProductCore(
                asin,
                state.scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.dataPreview.updateData(result.data);
                    this.renderDataPanel();
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.dataPreview.updateData(result.data);
                    this.renderDataPanel();
                }
            }
        },

        async deleteReview(asin: string, index: number): Promise<void> {
            const result = await deleteReviewCore(
                asin,
                index,
                state.scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.dataPreview.updateData(result.data);
                    this.renderDataPanel();
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.dataPreview.updateData(result.data);
                    this.renderDataPanel();
                }
            }
        },

        // ========== Helpers ==========

        getFlag,
        getSiteName,
        formatDate
    };
}
