/**
 * Scraper Panel Alpine.js 组件核心逻辑
 */

import type { 
    Task, 
    ProxyConfig, 
    DataTab, 
    ProxyConfigStatus,
    ImportResult,
    DeleteResult
} from '../types';
import type { ScraperSite } from '@/types/modules-business';
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
import type { ScrapedData, ScrapedProduct, HistoryItem } from '@/types/modules-business';
import { DataPreview, DataPreviewState } from './DataPreview';
import { HistoryPanel } from './HistoryPanel';

/**
 * 创建 Scraper Panel Alpine 组件
 */
export function createScraperPanel() {
    return {
        // ========== State ==========
        inputAsins: '',
        selectedSite: 'DE' as ScraperSite,
        scrapeReviews: true,
        isScraping: false,
        currentDataTab: 'preview' as DataTab, // 添加直接的状态属性

        // UI State
        tasks: [] as Task[],

        // 数据预览组件
        dataPreview: null as DataPreview | null,

        // 历史记录组件
        historyPanel: null as HistoryPanel | null,

        // 渲染防抖标志
        _isRendering: false,

        // Constants for View
        sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'] as ScraperSite[],

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
            return (state.scraper.scrapedData?.products?.length ?? 0) > 0;
        },

        get proxyConfigStatus(): ProxyConfigStatus {
            const config = StorageService.get(STORAGE_KEYS.PROXY_CONFIG) as ProxyConfig | null || { type: 'allorigins' as const };
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

        get paginatedProducts(): ScrapedProduct[] {
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
        get history(): Array<{
            id: string | number;
            timestamp: string;
            site: string;
            asins: string[];
            data: ScrapedData;
            report?: unknown;
            analysisStatus?: {
                isAnalyzed: boolean;
                analyzedAt?: string;
                analysisReport?: unknown;
            };
        }> {
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
                console.log('[Scraper] 📦 检测到数据，准备初始化渲染');
                console.log('[Scraper] 📊 检查大数据集');
                this.dataPreview.checkLargeDataset();
                
                console.log('[Scraper] 🎯 设置事件委托');
                this.dataPreview.setupEventDelegation((asin) => {
                    console.log('[Scraper] 🖱️ 事件委托触发，ASIN:', asin);
                    this.toggleCardExpand(asin);
                });
                
                console.log('[Scraper] 🎨 执行初始渲染');
                this.renderDataPanel();
                console.log('[Scraper] ✅ 初始化渲染完成');
            } else {
                console.log('[Scraper] ℹ️ 无数据或 dataPreview 不存在，跳过初始渲染', {
                    hasData: this.hasData,
                    hasDataPreview: !!this.dataPreview
                });
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
            // 只在状态真正改变时才保存，避免触发不必要的响应式更新
            let hasChanges = false;
            
            if (state.scraper.selectedSite !== this.selectedSite) {
                state.scraper.selectedSite = this.selectedSite;
                hasChanges = true;
            }
            
            if (state.scraper.inputAsins !== this.inputAsins) {
                state.scraper.inputAsins = this.inputAsins;
                hasChanges = true;
            }
            
            if (state.scraper.isScraping !== this.isScraping) {
                state.scraper.isScraping = this.isScraping;
                hasChanges = true;
            }

            if (this.dataPreview) {
                const previewState = this.dataPreview.getState();
                
                if (state.scraper.expandedAsin !== previewState.expandedAsin) {
                    state.scraper.expandedAsin = previewState.expandedAsin;
                    hasChanges = true;
                }
                
                if (state.scraper.currentDataTab !== previewState.currentDataTab) {
                    state.scraper.currentDataTab = previewState.currentDataTab;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                console.log("[Scraper] 💾 状态已保存");
            }
        },

        // ========== Actions ==========

        selectSite(site: ScraperSite) {
            this.selectedSite = site;
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

        loadHistoryItem(item: HistoryItem) {
            const success = this.historyPanel?.loadHistoryItem(item, this.isScraping);
            if (success) {
                // 恢复本地状态
                this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
                this.selectedSite = item.site as ScraperSite;

                // 更新数据预览
                if (this.dataPreview) {
                    this.updateDataPreview(state.scraper.scrapedData);
                }

                this.saveState();
            }
        },

        async loadAnalysisReport(item: HistoryItem) {
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
                    this.updateDataPreview(scrapedData);
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
                const result: ImportResult = await handleImportFilesCore(
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
                        state.scraper.selectedSite = marketplace as ScraperSite;
                        this.selectedSite = marketplace as ScraperSite;
                    }

                    // 更新数据预览
                    if (this.dataPreview) {
                        this.updateDataPreview(result.data);
                    }

                    // 重新加载历史记录
                    this.loadHistory();
                }
            } finally {
                target.value = '';
            }
        },

        // ========== 数据预览功能 ==========

        /**
         * 更新数据并重新设置事件委托
         */
        updateDataPreview(data: ScrapedData | null): void {
            if (!this.dataPreview) return;
            
            console.log('[Scraper] 🔄 更新数据预览');
            this.dataPreview.updateData(data);
            this.dataPreview.checkLargeDataset();
            
            // 重新设置事件委托
            console.log('[Scraper] 🎯 重新设置事件委托');
            this.dataPreview.setupEventDelegation((asin) => {
                console.log('[Scraper] 🖱️ 事件委托触发，ASIN:', asin);
                this.toggleCardExpand(asin);
            });
            
            this.renderDataPanel();
        },

        renderDataPanel(): void {
            console.log('[Scraper] 🎨 renderDataPanel 被调用');
            
            if (!this.dataPreview) {
                console.warn('[Scraper] ⚠️ dataPreview 不存在，无法渲染');
                return;
            }
            
            // 防止重复渲染
            if (this._isRendering) {
                console.warn('[Scraper] ⚠️ 渲染已在进行中，跳过本次调用');
                return;
            }
            
            this._isRendering = true;
            console.log('[Scraper] 🔒 设置渲染锁');
            
            try {
                console.log('[Scraper] 📝 开始渲染数据面板');
                this.dataPreview.renderDataPanel(
                    (asin) => this.toggleCardExpand(asin),
                    (asin) => this.deleteProduct(asin),
                    (asin, index) => this.deleteReview(asin, index)
                );
                console.log('[Scraper] ✅ 数据面板渲染完成');
            } catch (error) {
                console.error('[Scraper] ❌ 渲染失败:', error);
            } finally {
                this._isRendering = false;
                console.log('[Scraper] 🔓 释放渲染锁');
            }
        },

        toggleCardExpand(asin: string): void {
            console.log('[Scraper] 🔄 toggleCardExpand 被调用:', asin);
            
            if (!this.dataPreview) {
                console.warn('[Scraper] ⚠️ dataPreview 不存在');
                return;
            }
            
            const oldExpandedAsin = this.dataPreview.getState().expandedAsin;
            console.log('[Scraper] 📊 当前展开的 ASIN:', oldExpandedAsin);
            
            // 切换展开状态
            this.dataPreview.toggleCardExpand(asin);
            
            const newExpandedAsin = this.dataPreview.getState().expandedAsin;
            console.log('[Scraper] 📊 新的展开 ASIN:', newExpandedAsin);
            
            // 重新渲染以更新UI
            console.log('[Scraper] 🎨 重新渲染数据面板');
            this.renderDataPanel();
            this.saveState();
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
            const result: DeleteResult = await deleteProductCore(
                asin,
                state.scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
            }
        },

        async deleteReview(asin: string, index: number): Promise<void> {
            const result: DeleteResult = await deleteReviewCore(
                asin,
                index,
                state.scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                state.scraper.scrapedData = result.data;
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
            }
        },

        // ========== Helpers ==========

        getFlag,
        getSiteName,
        formatDate
    };
}
