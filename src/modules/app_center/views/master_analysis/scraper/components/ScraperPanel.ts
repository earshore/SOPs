/**
 * Scraper Panel Alpine.js 组件核心逻辑
 */

import type {
  Task,
  ProxyConfig,
  DataTab,
  ProxyConfigStatus,
  ImportResult,
  DeleteResult,
} from '../types';
import type { ScraperSite } from '@/types/modules-business';
import type { ScraperState } from '@/types/state';
import { appStore } from '@/stores/useAppStore';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { showToast } from '@/common/ui';
import { openFilePicker } from '@/common/utils/filePicker';
import { ErrorService } from '@/services/errorService';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { extractValidAsins } from '../utils/validators';
import { getFlag, getSiteName, getSiteUrl, formatDate } from '../utils/formatters';
import {
  DEFAULT_SCRAPER_PROXY_TYPE,
  getScraperProxyDisplayName,
  getScraperProxyProvider,
} from '@/common/config/scraperProxies';
import {
  startScrape,
  handleScrapeComplete,
  saveScrapeSnapshot,
  updateTask,
} from '../handlers/scrapeHandler';
import { handleImportFiles as handleImportFilesCore } from '../handlers/importHandler';
import {
  deleteProduct as deleteProductCore,
  deleteReview as deleteReviewCore,
  confirmWithModal,
} from '../handlers/dataOperations';
import type { ScrapedData, ScrapedProduct, HistoryItem } from '@/types/modules-business';
import { DataPreview, DataPreviewState } from './DataPreview';
import { HistoryPanel } from './HistoryPanel';
import { emitHistoryUpdated } from '../../services/historyEvents';

type ScraperPanelState = {
  inputAsins: string;
  selectedSite: ScraperSite;
  scrapeReviews: boolean;
  isScraping: boolean;
  currentDataTab: DataTab;
  configExpanded: boolean;
  importStatus: string;
  importStatusTone: 'status' | 'error';
  tasks: Task[];
  dataPreview: DataPreview | null;
  historyPanel: HistoryPanel | null;
  historyItems: HistoryItem[];
  historyLoading: boolean;
  historyLoadError: string;
  _isRendering: boolean;
  _historyLoadSeq: number;
  _unsubscribers: Array<() => void>;
  sites: ScraperSite[];
};

type ScraperPanelThis = ScraperPanelState & {
  validAsins: string[];
  invalidCount: number;
  canStart: boolean;
  hasData: boolean;
  hasValidAsins: boolean;
  history: HistoryItem[];
  successfulTaskCount: number;
  completedTaskCount: number;
  isSelectedSite(site: ScraperSite): boolean;
  loadHistory(): void;
  restoreState(): void;
  saveState(): void;
  renderInitialData(): void;
  updateDataPreview(data: ScrapedData | null): void;
  renderDataPanel(): void;
  toggleCardExpand(asin: string): void;
  handleDeleteResult(result: DeleteResult): void;
  deleteProduct(asin: string): Promise<void>;
  deleteReview(asin: string, index: number): Promise<void>;
};

type ScraperPanelBehavior = Record<string, unknown> & ThisType<ScraperPanelThis>;

function createScraperPanelState(): ScraperPanelState {
  return {
    inputAsins: '',
    selectedSite: 'DE' as ScraperSite,
    scrapeReviews: true,
    isScraping: false,
    currentDataTab: 'preview' as DataTab,
    configExpanded: false,
    importStatus: '',
    importStatusTone: 'status',
    tasks: [] as Task[],
    dataPreview: null,
    historyPanel: null,
    historyItems: [] as HistoryItem[],
    historyLoading: false,
    historyLoadError: '',
    _isRendering: false,
    _historyLoadSeq: 0,
    _unsubscribers: [] as Array<() => void>,
    sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'] as ScraperSite[],
  };
}

function clearDerivedAnalysisStateAfterDataChange(data: ScrapedData): void {
  const state = appStore.getState();
  const availableAsins = new Set(
    (data.products || []).map(product => product.asin).filter(Boolean)
  );
  const selectedAsins = (state.analysis?.selectedAsins || []).filter(asin =>
    availableAsins.has(asin)
  );

  state.setAnalysisReport(null);
  state.setTranslatedReport?.(null);
  state.setSelectedAsins?.(selectedAsins);
  state.setCurrentPrompt?.('');
}

function setImportStatus(
  panel: ScraperPanelThis,
  target: HTMLInputElement,
  message: string,
  tone: ScraperPanelState['importStatusTone']
): void {
  panel.importStatus = message;
  panel.importStatusTone = tone;

  if (tone === 'error') {
    target.setAttribute('aria-invalid', 'true');
    return;
  }

  target.removeAttribute('aria-invalid');
}

function applyImportedData(panel: ScraperPanelThis, data: ScrapedData): void {
  appStore.getState().setScrapedData(data);
  clearDerivedAnalysisStateAfterDataChange(data);

  const marketplace = data.metadata?.marketplace || 'DE';
  appStore.getState().setSelectedSite(marketplace as ScraperSite);
  panel.selectedSite = marketplace as ScraperSite;

  if (panel.dataPreview) {
    panel.updateDataPreview(data);
  }

  panel.loadHistory();
}

function getImportResultStatus(result: ImportResult): {
  message: string;
  tone: ScraperPanelState['importStatusTone'];
} {
  if (result.error) {
    return {
      message: `导入失败：${result.error}`,
      tone: 'error',
    };
  }

  return {
    message: '导入已取消。',
    tone: 'status',
  };
}

function attachScraperPanelBehavior(
  panel: ScraperPanelState
): ScraperPanelState & Record<string, unknown> {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(scraperPanelBehavior));
  return panel;
}

/**
 * Scraper Panel 行为。
 * 通过 descriptor 挂载，保留 getter 语义。
 */
const scraperPanelBehavior: ScraperPanelBehavior = {
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

  get taskProgressClass(): string {
    const percent = this.tasks.length > 0 ? (this.completedTaskCount / this.tasks.length) * 100 : 0;
    const normalizedPercent = Math.max(0, Math.min(100, Math.round(percent / 5) * 5));
    return `progress-bar-fill--${normalizedPercent}`;
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

  get scrapeReviewsToggleClass(): string {
    return this.scrapeReviews ? 'active' : '';
  },

  get importStatusRole(): string {
    return this.importStatusTone === 'error' ? 'alert' : 'status';
  },

  get importStatusLive(): string {
    return this.importStatusTone === 'error' ? 'assertive' : 'polite';
  },

  get importStatusClass(): string {
    return this.importStatusTone === 'error' ? 'text-rose-600' : 'text-slate-500';
  },

  get configExpandedState(): boolean {
    return this.configExpanded;
  },

  getDataTabButtonClass(tab: DataTab): string {
    return this.currentDataTab === tab
      ? 'active text-blue-600'
      : 'text-slate-400 hover:text-slate-600';
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
    return this.isSelectedSite(site)
      ? 'text-blue-700'
      : 'text-slate-500 group-hover:text-slate-700';
  },

  getTaskCardClass(task: Task): Record<string, boolean> {
    return {
      'border-slate-200 bg-slate-50/60': task.status === 'pending',
      'border-blue-200 bg-blue-50/60 scraping-shimmer': task.status === 'scraping',
      'border-emerald-200 bg-emerald-50/60': task.status === 'success',
      'border-rose-200 bg-rose-50/60': task.status === 'failed',
    };
  },

  getTaskIconWrapperClass(task: Task): Record<string, boolean> {
    return {
      'bg-slate-100 text-slate-400': task.status === 'pending',
      'bg-blue-100 text-blue-600 ring-1 ring-blue-200/70': task.status === 'scraping',
      'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/70': task.status === 'success',
      'bg-rose-100 text-rose-600 ring-1 ring-rose-200/70': task.status === 'failed',
    };
  },

  getTaskIconClass(task: Task): Record<string, boolean> {
    return {
      'fa-hourglass-half': task.status === 'pending',
      'fa-circle-notch fa-spin': task.status === 'scraping',
      'fa-check': task.status === 'success',
      'fa-exclamation': task.status === 'failed',
    };
  },

  getTaskMessageClass(task: Task): Record<string, boolean> {
    return {
      'text-slate-400': task.status === 'pending',
      'text-blue-600': task.status === 'scraping',
      'text-emerald-600': task.status === 'success',
      'text-rose-500': task.status === 'failed',
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
    const config = (StorageService.get(STORAGE_KEYS.PROXY_CONFIG) as ProxyConfig | null) || {
      type: DEFAULT_SCRAPER_PROXY_TYPE,
    };
    const type = config.type || DEFAULT_SCRAPER_PROXY_TYPE;
    const name = getScraperProxyProvider(type) ? getScraperProxyDisplayName(type) : '自动';
    const ready = !!config.customUrl || StorageService.hasProxyCredential(type);
    return { name, ready, type };
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
    // 从 state 初始化 currentDataTab
    this.currentDataTab = appStore.getState().scraper.currentDataTab || 'preview';

    // 初始化数据预览组件
    const previewState: DataPreviewState = {
      expandedAsin: appStore.getState().scraper.expandedAsin || null,
      currentDataTab: this.currentDataTab,
      currentPage: 1,
      itemsPerPage: 50,
    };
    this.dataPreview = new DataPreview(previewState, appStore.getState().scraper.scrapedData);

    // 初始化历史记录组件
    this.historyPanel = new HistoryPanel();
    this.loadHistory();

    // 从 state 恢复状态
    this.restoreState();
    this.renderInitialData();

    // 保存事件处理函数引用
    const historyUpdatedHandler = () => {
      this.loadHistory();
    };

    // 添加事件监听器
    window.addEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler);

    // 保存清理函数
    this._unsubscribers.push(() =>
      window.removeEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler)
    );
  },

  // 组件销毁时清理资源
  destroy() {
    this._historyLoadSeq += 1;
    this.dataPreview?.cleanup();
    this._unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch {
        // Ignore individual cleanup failures so remaining unsubscribers still run.
      }
    });
    this._unsubscribers = [];
  },

  // 如果有数据则渲染预览（这部分代码应该在 init 方法内）
  renderInitialData() {
    if (this.hasData && this.dataPreview) {
      this.dataPreview.checkLargeDataset();

      this.dataPreview.setupEventDelegation(asin => {
        this.toggleCardExpand(asin);
      });

      this.renderDataPanel();
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
  },

  /**
   * 保存状态到 state
   */
  saveState() {
    // 只在状态真正改变时才保存，避免触发不必要的响应式更新
    const state = appStore.getState();
    const scraperUpdates: Partial<ScraperState> = {};

    if (state.scraper.selectedSite !== this.selectedSite) {
      scraperUpdates.selectedSite = this.selectedSite;
    }

    if (state.scraper.inputAsins !== this.inputAsins) {
      scraperUpdates.inputAsins = this.inputAsins;
    }

    if (state.scraper.isScraping !== this.isScraping) {
      scraperUpdates.isScraping = this.isScraping;
    }

    if (this.dataPreview) {
      const previewState = this.dataPreview.getState();

      if (state.scraper.expandedAsin !== previewState.expandedAsin) {
        scraperUpdates.expandedAsin = previewState.expandedAsin;
      }

      if (state.scraper.currentDataTab !== previewState.currentDataTab) {
        scraperUpdates.currentDataTab = previewState.currentDataTab;
      }
    }

    if (Object.keys(scraperUpdates).length > 0) {
      state.updateScraper(scraperUpdates);
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

    void this.historyPanel
      .loadHistoryAsync()
      .then(history => {
        if (loadSeq !== this._historyLoadSeq) return;
        this.historyItems = [...history];
      })
      .catch(error => {
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

  async deleteHistoryItem(id: HistoryItem['id']) {
    const deleted = await this.historyPanel?.deleteHistoryItem(id);
    this.historyItems = [...(this.historyPanel?.getHistory() || [])];
    return !!deleted;
  },

  async clearAllHistory() {
    await this.historyPanel?.clearAllHistory();
    this.loadHistory();
  },

  async loadHistoryItem(item: HistoryItem) {
    const success = await this.historyPanel?.loadHistoryItem(item, this.isScraping);
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

    this.isScraping = true;
    this.tasks = []; // 清空之前的任务

    // 初始化任务 UI
    this.validAsins.forEach(asin => {
      this.tasks.push({ asin, status: 'pending', message: '等待中...' });
    });

    const site = this.selectedSite;
    const scrapeReviews = this.scrapeReviews;
    let products: unknown[] = [];
    let scrapeInterrupted = false;

    try {
      products = await startScrape(
        this.validAsins,
        site,
        scrapeReviews,
        this.tasks,
        (asin, status, msg) => updateTask(this.tasks, asin, status, msg)
      );
    } catch (e) {
      console.error('[Scraper] startScrape 异常:', e);
      ErrorService.handle(e as Error, { action: 'startScrape', module: 'scraper' });
      showToast('采集任务异常中断', { type: 'error' });
      scrapeInterrupted = true;
    } finally {
      if (scrapeInterrupted) {
        this.isScraping = false;
        this.saveState();
      } else {
        // 完成采集
        const scrapedData = handleScrapeComplete(
          products as ScrapedProduct[],
          this.validAsins,
          this.selectedSite
        );

        // 更新全局状态
        appStore.getState().setScrapedData(scrapedData);
        clearDerivedAnalysisStateAfterDataChange(scrapedData);

        try {
          await saveScrapeSnapshot(scrapedData);
          emitHistoryUpdated();
        } catch (saveError) {
          console.error('[Scraper] 保存历史快照失败:', saveError);
          showToast('采集结果已生成，但保存历史快照失败', { type: 'error' });
        }

        const successCount = products.filter(
          (p: unknown) => (p as ScrapedProduct).scrape_status === 'success'
        ).length;
        if (successCount > 0) {
          showToast(`采集完成: ${successCount} 成功`, { type: 'success' });
        } else {
          showToast('采集完成，但全部失败', { type: 'error' });
        }

        // 更新数据预览
        if (this.dataPreview) {
          this.updateDataPreview(scrapedData);
        }

        this.isScraping = false;
        this.saveState();
      }
    }
  },

  // ========== 数据导入功能 ==========

  triggerImport(): void {
    const input = document.getElementById('import-file-input') as HTMLInputElement | null;
    if (!openFilePicker(input)) {
      showToast('无法打开文件选择器', {
        type: 'error',
        description: '请刷新页面后重试，或重新进入数据采集页面。',
      });
    }
  },

  downloadPlugin(): void {
    const url = 'https://github.com/earshore/Amazon-Scraper/releases';
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
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

    setImportStatus(this, target, `正在导入 ${files.length} 个 JSON 文件...`, 'status');

    try {
      const result: ImportResult = await handleImportFilesCore(
        files,
        appStore.getState().scraper.scrapedData,
        this.selectedSite
      );

      if (result.success && result.data) {
        applyImportedData(this, result.data);
        setImportStatus(
          this,
          target,
          `导入完成：${result.data.products?.length || 0} 个 ASIN 已更新。`,
          'status'
        );
        return;
      }

      const status = getImportResultStatus(result);
      setImportStatus(this, target, status.message, status.tone);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportStatus(this, target, `导入失败：${message}`, 'error');
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

    this.dataPreview.updateData(data);
    this.dataPreview.checkLargeDataset();

    // 重新设置事件委托
    this.dataPreview.setupEventDelegation(asin => {
      this.toggleCardExpand(asin);
    });

    this.renderDataPanel();
  },

  renderDataPanel(): void {
    if (!this.dataPreview) {
      return;
    }

    // 防止重复渲染
    if (this._isRendering) {
      return;
    }

    this._isRendering = true;

    try {
      this.dataPreview.renderDataPanel(
        asin => this.toggleCardExpand(asin),
        asin => this.deleteProduct(asin),
        (asin, index) => this.deleteReview(asin, index)
      );
    } catch (error) {
      console.error('[Scraper] ❌ 渲染失败:', error);
    } finally {
      this._isRendering = false;
    }
  },

  toggleCardExpand(asin: string): void {
    if (!this.dataPreview) {
      return;
    }

    // 切换展开状态
    this.dataPreview.toggleCardExpand(asin);

    // 重新渲染以更新UI
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

    this.handleDeleteResult(result);
  },

  async deleteReview(asin: string, index: number): Promise<void> {
    const result: DeleteResult = await deleteReviewCore(
      asin,
      index,
      appStore.getState().scraper.scrapedData,
      confirmWithModal
    );

    this.handleDeleteResult(result);
  },

  handleDeleteResult(result: DeleteResult): void {
    if (!result.data) return;

    appStore.getState().setScrapedData(result.data);
    clearDerivedAnalysisStateAfterDataChange(result.data);
    if (this.dataPreview) {
      this.updateDataPreview(result.data);
    }

    if (result.success) {
      this.loadHistory();
    }
  },

  // ========== Helpers ==========

  getFlag,
  getSiteName,
  getSiteUrl,
  formatDate,
};

/**
 * 创建 Scraper Panel Alpine 组件
 */
export function createScraperPanel() {
  return attachScraperPanelBehavior(createScraperPanelState());
}
