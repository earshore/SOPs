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
import { appStore } from '@/stores/useAppStore';
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
        configExpanded: false,
        refineGuideOpen: false,
        tasks: [] as Task[],

        // 数据预览组件
        dataPreview: null as DataPreview | null,

        // 历史记录组件
        historyPanel: null as HistoryPanel | null,
        historyItems: [] as HistoryItem[],
        historyLoading: false,
        historyLoadError: '',

        // 渲染防抖标志
        _isRendering: false,
        _historyLoadSeq: 0,

        // 清理函数数组
        _unsubscribers: [] as Array<() => void>,

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
            return (appStore.getState().scraper.scrapedData?.products?.length ?? 0) > 0;
        },

        get hasValidAsins(): boolean {
            return this.validAsins.length > 0;
        },

        get hasNoValidAsins(): boolean {
            return !this.hasValidAsins;
        },

        get hasInvalidAsins(): boolean {
            return this.invalidCount > 0;
        },

        get startDisabled(): boolean {
            return !this.canStart;
        },

        get hasTasks(): boolean {
            return this.tasks.length > 0;
        },

        get validAsinStatusClass(): string {
            return this.hasValidAsins ? 'text-emerald-600' : 'text-slate-400';
        },

        get hasInputAsins(): boolean {
            return this.inputAsins.length > 0;
        },

        get scrapingIconClass(): string {
            return this.isScraping ? 'fa-circle-notch fa-spin' : 'fa-rocket';
        },

        get scrapingButtonText(): string {
            return this.isScraping ? '正在采集中...' : '开始采集';
        },

        get showStartCount(): boolean {
            return !this.isScraping && this.hasValidAsins;
        },

        get startCountText(): string {
            return `${this.validAsins.length} 项`;
        },

        get successfulTaskCount(): number {
            return this.tasks.filter(task => task.status === 'success').length;
        },

        get hasSuccessfulTasks(): boolean {
            return this.successfulTaskCount > 0;
        },

        get completedTaskCount(): number {
            return this.tasks.filter(task => task.status === 'success' || task.status === 'failed').length;
        },

        get taskProgressStyle(): string {
            const percent = this.tasks.length > 0 ? (this.completedTaskCount / this.tasks.length) * 100 : 0;
            return `width: ${percent}%`;
        },

        get showHistoryClear(): boolean {
            return this.history.length > 0 && !this.historyLoading;
        },

        get showHistoryLoadingEmpty(): boolean {
            return this.historyLoading && this.history.length === 0;
        },

        get showHistoryEmpty(): boolean {
            return !this.historyLoading && this.history.length === 0;
        },

        get configChevronClass(): string {
            return this.configExpanded ? 'rotate-180' : '';
        },

        get refineGuideChevronClass(): string {
            return this.refineGuideOpen ? 'rotate-180' : '';
        },

        get scrapeReviewsToggleClass(): string {
            return this.scrapeReviews ? 'active' : '';
        },

        get configExpandedState(): boolean {
            return this.configExpanded;
        },

        getDataTabButtonClass(tab: DataTab): string {
            return this.currentDataTab === tab ? 'active text-blue-600' : 'text-slate-400 hover:text-slate-600';
        },

        getDataTabIconWrapClass(tab: DataTab): string {
            return this.currentDataTab === tab ? 'bg-blue-50' : 'bg-slate-100';
        },

        getDataTabIconClass(tab: DataTab): string {
            return this.currentDataTab === tab ? 'text-blue-500' : 'text-slate-400';
        },

        isDataTab(tab: DataTab): boolean {
            return this.currentDataTab === tab;
        },

        isSelectedSite(site: ScraperSite): boolean {
            return this.selectedSite === site;
        },

        getSiteButtonClass(site: ScraperSite): string {
            return this.isSelectedSite(site)
                ? 'selected border-blue-500 bg-gradient-to-b from-blue-50 to-white ring-2 ring-blue-500/20 shadow-sm shadow-blue-100'
                : 'border-slate-150 bg-white hover:border-blue-300 hover:bg-blue-50/30';
        },

        getSiteNameClass(site: ScraperSite): string {
            return this.isSelectedSite(site) ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700';
        },

        getAnimationDelayStyle(index: number, stepMs: number): string {
            return `animation-delay: ${index * stepMs}ms`;
        },

        getTaskCardClass(task: Task): Record<string, boolean> {
            return {
                'border-slate-150 bg-slate-50/50': task.status === 'pending',
                'border-blue-200 bg-gradient-to-br from-blue-50/80 to-white shadow-sm shadow-blue-100/50 scraping-shimmer': task.status === 'scraping',
                'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm shadow-emerald-100/50': task.status === 'success',
                'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white shadow-sm shadow-rose-100/50': task.status === 'failed'
            };
        },

        getTaskIconWrapperClass(task: Task): Record<string, boolean> {
            return {
                'bg-slate-100 text-slate-400': task.status === 'pending',
                'bg-blue-100 text-blue-600': task.status === 'scraping',
                'bg-emerald-100 text-emerald-600': task.status === 'success',
                'bg-rose-100 text-rose-600': task.status === 'failed'
            };
        },

        getTaskIconClass(task: Task): Record<string, boolean> {
            return {
                'fa-hourglass-half': task.status === 'pending',
                'fa-circle-notch fa-spin': task.status === 'scraping',
                'fa-check': task.status === 'success',
                'fa-exclamation': task.status === 'failed'
            };
        },

        getTaskMessageClass(task: Task): Record<string, boolean> {
            return {
                'text-slate-400': task.status === 'pending',
                'text-blue-600': task.status === 'scraping',
                'text-emerald-600': task.status === 'success',
                'text-rose-500': task.status === 'failed'
            };
        },

        isTaskSuccess(task: Task): boolean {
            return task.status === 'success';
        },

        isTaskNotSuccess(task: Task): boolean {
            return task.status !== 'success';
        },

        getHistoryCardClass(item: HistoryItem): string {
            return item.analysisStatus?.isAnalyzed
                ? 'analyzed border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white'
                : 'border-slate-150';
        },

        isHistoryAnalyzed(item: HistoryItem): boolean {
            return !!item.analysisStatus?.isAnalyzed;
        },

        showHistoryAnalysisTime(item: HistoryItem): boolean {
            return !!(item.analysisStatus?.isAnalyzed && item.analysisStatus?.analyzedAt);
        },

        getHistorySiteText(site: string): string {
            return `${getSiteName(site as ScraperSite)}站`;
        },

        hasMoreHistoryAsins(item: HistoryItem): boolean {
            return item.asins.length > 3;
        },

        getHistoryOverflowCountText(item: HistoryItem): string {
            return `+${item.asins.length - 3}`;
        },

        toggleConfigExpanded(): void {
            this.configExpanded = !this.configExpanded;
        },

        toggleScrapeReviews(): void {
            this.scrapeReviews = !this.scrapeReviews;
        },

        get proxyConfigStatus(): ProxyConfigStatus {
            const config = StorageService.get(STORAGE_KEYS.PROXY_CONFIG) as ProxyConfig | null || { type: 'scraperapi' as const };
            const map: Record<string, string> = {
                scraperapi: 'ScraperAPI', zenrows: 'ZenRows', brightdata: 'Bright Data',
                custom_api: 'Custom API', custom_proxy: 'HTTP 代理'
            };
            const name = map[config.type] || '自动';
            const ready = !!config.customUrl;
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
            return this.historyItems;
        },

        // ========== Lifecycle ==========

        init() {
            console.log("[Scraper] 🚀 Alpine 组件初始化");

            // 从 state 初始化 currentDataTab
            this.currentDataTab = appStore.getState().scraper.currentDataTab || 'preview';

            // 初始化数据预览组件
            const previewState: DataPreviewState = {
                expandedAsin: appStore.getState().scraper.expandedAsin || null,
                currentDataTab: this.currentDataTab,
                currentPage: 1,
                itemsPerPage: 50
            };
            this.dataPreview = new DataPreview(previewState, appStore.getState().scraper.scrapedData);

            // 初始化历史记录组件
            this.historyPanel = new HistoryPanel();
            this.loadHistory();

            // 从 state 恢复状态
            this.restoreState();

            // 保存事件处理函数引用
            const historyUpdatedHandler = () => {
                console.log('[Scraper] 收到标准历史更新事件');
                this.loadHistory();
            };
            
            const customHistoryHandler = () => {
                console.log('[Scraper] 收到自定义历史更新事件');
                this.loadHistory();
            };
            
            // 添加事件监听器
            window.addEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler);
            window.addEventListener('history-updated', customHistoryHandler);
            
            // 保存清理函数
            this._unsubscribers.push(
                () => window.removeEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler),
                () => window.removeEventListener('history-updated', customHistoryHandler)
            );

            console.log('[Scraper] ✅ Alpine 组件初始化完成');
        },

        // 组件销毁时清理资源
        destroy() {
            console.log('[Scraper] 🔄 清理事件监听器');
            this._historyLoadSeq += 1;
            this.dataPreview?.cleanup();
            this._unsubscribers.forEach(unsub => {
                try {
                    unsub();
                } catch (error) {
                    console.warn('[Scraper] 清理订阅时出错:', error);
                }
            });
            this._unsubscribers = [];
            console.log('[Scraper] ✅ 资源清理完成');
        },

        // 如果有数据则渲染预览（这部分代码应该在 init 方法内）
        _renderInitialData() {
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
            const currentState = appStore.getState();
            if (currentState.scraper.selectedSite) {
                this.selectedSite = currentState.scraper.selectedSite;
            }

            if (currentState.scraper.inputAsins) {
                this.inputAsins = currentState.scraper.inputAsins;
            }

            console.log("[Scraper] ✅ 状态已恢复");
        },

        /**
         * 保存状态到 state
         */
        saveState() {
            // 只在状态真正改变时才保存，避免触发不必要的响应式更新
            let hasChanges = false;

            if (appStore.getState().scraper.selectedSite !== this.selectedSite) {
                appStore.getState().scraper.selectedSite = this.selectedSite;
                hasChanges = true;
            }

            if (appStore.getState().scraper.inputAsins !== this.inputAsins) {
                appStore.getState().scraper.inputAsins = this.inputAsins;
                hasChanges = true;
            }

            if (appStore.getState().scraper.isScraping !== this.isScraping) {
                appStore.getState().scraper.isScraping = this.isScraping;
                hasChanges = true;
            }

            if (this.dataPreview) {
                const previewState = this.dataPreview.getState();

                if (appStore.getState().scraper.expandedAsin !== previewState.expandedAsin) {
                    appStore.getState().scraper.expandedAsin = previewState.expandedAsin;
                    hasChanges = true;
                }

                if (appStore.getState().scraper.currentDataTab !== previewState.currentDataTab) {
                    appStore.getState().scraper.currentDataTab = previewState.currentDataTab;
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

        setInputAsins(event: Event) {
            this.inputAsins = (event.target as HTMLTextAreaElement).value;
            this.saveState();
        },

        toggleRefineGuide() {
            this.refineGuideOpen = !this.refineGuideOpen;
        },

        clearAsins() {
            this.inputAsins = '';
            this.saveState();
        },

        loadHistory(): void {
            if (!this.historyPanel) return;

            this.historyPanel.loadHistory();
            this.historyItems = [...this.historyPanel.getHistory()];
            this.historyLoading = true;
            this.historyLoadError = '';
            const loadSeq = ++this._historyLoadSeq;

            void this.historyPanel.loadHistoryAsync()
                .then((history) => {
                    if (loadSeq !== this._historyLoadSeq) return;
                    this.historyItems = [...history];
                })
                .catch((error) => {
                    if (loadSeq !== this._historyLoadSeq) return;
                    console.error('[Scraper] 加载历史记录失败:', error);
                    this.historyLoadError = '历史记录加载失败';
                    this.historyItems = [...(this.historyPanel?.getHistory() || [])];
                })
                .finally(() => {
                    if (loadSeq !== this._historyLoadSeq) return;
                    this.historyLoading = false;
                });
        },

        async deleteHistoryItem(id: string) {
            await this.historyPanel?.deleteHistoryItem(id);
            this.loadHistory();
        },

        async clearAllHistory() {
            await this.historyPanel?.clearAllHistory();
            this.loadHistory();
        },

        loadHistoryItem(item: HistoryItem) {
            const success = this.historyPanel?.loadHistoryItem(item, this.isScraping);
            if (success) {
                // 恢复本地状态
                this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
                this.selectedSite = item.site as ScraperSite;

                // 更新数据预览
                if (this.dataPreview) {
                    this.updateDataPreview(appStore.getState().scraper.scrapedData);
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
            let products: unknown[] = [];

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
                showToast("采集任务异常中断", { type: 'error' });
            } finally {
                console.log('[Scraper] 进入 finally 块', { productsCount: products.length });
                // 完成采集
                const scrapedData = handleScrapeComplete(products as ScrapedProduct[], this.validAsins, this.selectedSite);
                console.log('[Scraper] handleScrapeComplete 完成', scrapedData);

                // 更新全局状态
                appStore.getState().setScrapedData(scrapedData);
                appStore.getState().setAnalysisReport(null); // 重置分析报告

                const successCount = products.filter((p: unknown) => (p as ScrapedProduct).scrape_status === 'success').length;
                if (successCount > 0) {
                    showToast(`采集完成: ${successCount} 成功`, { type: 'success' });
                } else {
                    showToast("采集完成，但全部失败", { type: 'error' });
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

        downloadPlugin(): void {
            console.log('[Scraper] 🔽 下载插件按钮被点击');
            const url = 'https://github.com/earshore/Amazon-Scraper/releases';
            try {
                console.log('[Scraper] 🌐 尝试打开 URL:', url);
                const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                if (newWindow) {
                    console.log('[Scraper] ✅ 窗口打开成功');
                } else {
                    console.warn('[Scraper] ⚠️ 窗口被浏览器拦截，请检查弹窗设置');
                    showToast('请允许浏览器弹窗以打开下载页面', { type: 'warning' });
                }
            } catch (error) {
                console.error('[Scraper] ❌ 打开窗口失败:', error);
                showToast('打开下载页面失败', { type: 'error' });
            }
        },

        async handleImportFiles(event: Event): Promise<void> {
            const target = event.target as HTMLInputElement;
            const files = Array.from(target.files || []);
            if (files.length === 0) return;

            try {
                const result: ImportResult = await handleImportFilesCore(
                    files,
                    appStore.getState().scraper.scrapedData,
                    this.selectedSite
                );

                if (result.success && result.data) {
                    // 更新全局状态
                    appStore.getState().setScrapedData(result.data);
                    appStore.getState().setAnalysisReport(null);

                    // 根据新导入的数据更新选中的站点
                    const marketplace = result.data.metadata?.marketplace || 'DE';
                    appStore.getState().scraper.selectedSite = marketplace as ScraperSite;
                    this.selectedSite = marketplace as ScraperSite;

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
                appStore.getState().scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                appStore.getState().setScrapedData(result.data);
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                appStore.getState().setScrapedData(result.data);
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
            }
        },

        async deleteReview(asin: string, index: number): Promise<void> {
            const result: DeleteResult = await deleteReviewCore(
                asin,
                index,
                appStore.getState().scraper.scrapedData,
                confirmWithModal
            );

            if (result.success && result.data) {
                appStore.getState().setScrapedData(result.data);
                if (this.dataPreview) {
                    this.updateDataPreview(result.data);
                }
                this.loadHistory();
            } else if (result.data) {
                // 回滚
                appStore.getState().setScrapedData(result.data);
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
