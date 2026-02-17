﻿/**
 * Scraper 子模块
 * 负责亚马逊数据采集功能
 * 
 * 架构说明：
 * - 使用 Alpine.js 进行响应式 UI 管理
 * - 状态保存到 state.scraper 命名空间
 * - 通过 EventBus 与其他模块通信
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import eventBus from '../../../../../common/EventBus';
import state from "../../../../../common/state";
import { scrapeAsin } from '../services/scraperService';
import { LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { HistoryService } from '../services/historyService';
import { StorageService, STORAGE_KEYS } from '../../../../../services/storageService';
import { ErrorService } from '../../../../../services/errorService';
import { showToast, sleep } from '../../../../../common/ui';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../common/constants/eventConstants';

import '../master_prompt_style.css';

// 类型定义
interface Task {
    asin: string;
    status: 'pending' | 'scraping' | 'success' | 'failed';
    message: string;
    richMsg?: string;
}

interface ProxyConfig {
    type: string;
    customUrl?: string;
}

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
    tasks: [] as Task[],
    history: [] as any[],

    // 数据预览状态
    expandedAsin: null as string | null,
    currentDataTab: 'preview' as 'preview' | 'json',
    
    // ✅ 性能优化：分页状态
    currentPage: 1,
    itemsPerPage: 50,

    // Constants for View
    sites: ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'],

    // ========== Computed Properties ==========
    
    get validAsins(): string[] {
        if (!this.inputAsins) return [];
        return this.inputAsins
            .split(/[,,\n\s]+/)
            .map(a => a.trim().toUpperCase())
            .filter(a => /^B0[A-Z0-9]{8}$/.test(a));
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
    
    // ✅ 性能优化：分页计算属性
    get totalProducts(): number {
        return state.scraper.scrapedData?.products?.length || 0;
    },
    
    get totalPages(): number {
        return Math.ceil(this.totalProducts / this.itemsPerPage);
    },
    
    get paginatedProducts(): any[] {
        if (!state.scraper.scrapedData?.products) return [];
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return state.scraper.scrapedData.products.slice(start, end);
    },
    
    get shouldUsePagination(): boolean {
        return this.totalProducts > this.itemsPerPage;
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

    // ========== Lifecycle ==========
    
    init() {
        console.log("[Scraper] 🚀 Alpine 组件初始化");
        
        // 从 state 恢复状态
        this.restoreState();
        
        // 加载历史记录
        this.loadHistory();

        // 监听外部历史更新事件
        window.addEventListener(APP_EVENTS.HISTORY_UPDATED, () => this.loadHistory());
        
        // ✅ 新增：监听自定义历史更新事件（来自 AI 分析模块）
        window.addEventListener('history-updated', () => {
            console.log('[Scraper] 收到历史更新事件，重新加载历史记录');
            this.loadHistory();
        });

        // ✅ 如果有数据则渲染预览
        if (this.hasData) {
            // 使用 setTimeout 确保 DOM 完全渲染后再更新内容
            setTimeout(() => {
                // ✅ 性能优化：检查大数据集
                this.checkLargeDataset();
                this.renderDataPanel();
                // ✅ 性能优化：设置事件委托
                this.setupEventDelegation();
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
        
        // 恢复输入的 ASIN（如果有保存的话）
        if (state.scraper.inputAsins) {
            this.inputAsins = state.scraper.inputAsins;
        }
        
        // 恢复数据预览状态
        if (state.scraper.expandedAsin !== undefined) {
            this.expandedAsin = state.scraper.expandedAsin;
        }
        
        if (state.scraper.currentDataTab) {
            this.currentDataTab = state.scraper.currentDataTab;
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
        state.scraper.expandedAsin = this.expandedAsin;
        state.scraper.currentDataTab = this.currentDataTab;
        
        console.log("[Scraper] 💾 状态已保存");
    },
    
    // ========== 性能优化：事件委托 ==========
    
    /**
     * 设置事件委托（性能优化）
     * 使用单个监听器处理所有卡片的点击事件，避免为每个卡片单独绑定
     */
    setupEventDelegation(): void {
        const cardsContainer = document.getElementById('data-cards');
        if (!cardsContainer) return;
        
        // 移除旧的监听器（如果存在）
        if (this._cardClickHandler) {
            cardsContainer.removeEventListener('click', this._cardClickHandler);
        }
        
        // 创建新的事件处理器
        this._cardClickHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            
            // 查找最近的卡片元素
            const card = target.closest('.asin-card');
            if (card && card.id && card.id.startsWith('card-')) {
                const asin = card.id.replace('card-', '');
                
                // 检查是否点击了删除按钮
                const deleteBtn = target.closest('button[title*="删除"]');
                if (deleteBtn) {
                    e.stopPropagation();
                    return; // 删除按钮由 Alpine 的 @click 处理
                }
                
                // 展开/收起卡片
                this.toggleCardExpand(asin);
            }
        };
        
        // 添加事件监听器
        cardsContainer.addEventListener('click', this._cardClickHandler);
        
        console.log('[Scraper] ✅ 事件委托已设置');
    },
    
    // 存储事件处理器引用，用于清理
    _cardClickHandler: null as ((e: Event) => void) | null,
    
    // ========== 性能优化：内存管理 ==========
    
    /**
     * 清理旧的DOM元素（性能优化）
     * 在重新渲染前清理旧元素，避免内存泄漏
     */
    cleanupOldDOMElements(container: HTMLElement): void {
        if (!container) return;
        
        // 移除所有子元素的事件监听器（如果有的话）
        const oldCards = container.querySelectorAll('.asin-card');
        oldCards.forEach(card => {
            // 移除所有按钮的事件监听器
            const buttons = card.querySelectorAll('button');
            buttons.forEach(btn => {
                const clone = btn.cloneNode(true);
                btn.parentNode?.replaceChild(clone, btn);
            });
        });
        
        // 清空容器内容
        container.innerHTML = '';
    },
    
    /**
     * 检查并警告大数据集（性能优化）
     */
    checkLargeDataset(): void {
        const productCount = this.totalProducts;
        
        if (productCount > 100) {
            console.warn(`[Scraper] ⚠️ 检测到大数据集: ${productCount} 个产品`);
            showToast(`⚠️ 数据集较大 (${productCount} 个产品)，已启用分页显示以优化性能`, "info");
        }
        
        if (productCount > 500) {
            console.warn(`[Scraper] ⚠️ 数据集非常大: ${productCount} 个产品，建议清理历史记录`);
            showToast(`⚠️ 数据集非常大 (${productCount} 个产品)，建议定期清理历史记录以释放内存`, "warning");
        }
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
        this.history = HistoryService.getAll();
    },

    deleteHistoryItem(id: string) {
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

    loadHistoryItem(item: any) {
        if (this.isScraping) {
            if (!confirm("任务进行中，确定覆盖？")) return;
        }

        // 恢复本地状态
        this.inputAsins = Array.isArray(item.asins) ? item.asins.join('\n') : '';
        this.selectedSite = item.site;

        // 🔐 确保历史数据的 metadata 结构完整
        if (item.data && !item.data.metadata) {
            item.data.metadata = {
                scrape_timestamp: item.timestamp || new Date().toISOString(),
                marketplace: item.site || 'US',
                domain: LANGUAGE_HEADERS[item.site]?.domain || 'amazon.com',
                language: LANGUAGE_HEADERS[item.site]?.name || 'English (US)',
                total_asins: item.asins?.length || 0,
            };
        } else if (item.data && item.data.metadata && !item.data.metadata.marketplace) {
            // 如果 metadata 存在但缺少 marketplace 字段
            item.data.metadata.marketplace = item.site || 'US';
        }

        // 恢复全局状态（供所有页面使用）
        state.scraper.currentHistoryId = item.id;
        state.scraper.scrapedData = item.data;
        
        // ✅ 优先加载"AI智能分析"的报告，如果不存在则回退到旧的"AI分析"报告
        if (item.analysisStatus?.isAnalyzed && item.analysisStatus?.analysisReport) {
            state.analysis.analysisReport = item.analysisStatus.analysisReport;
            console.log('[Scraper] 已加载"AI智能分析"报告到全局状态');
        } else if (item.report) {
            state.analysis.analysisReport = item.report;
            console.log('[Scraper] 已加载旧版"AI分析"报告到全局状态');
        } else {
            state.analysis.analysisReport = null;
            console.log('[Scraper] 该快照无分析报告');
        }
        
        state.analysis.translatedReport = null;
        state.scraper.selectedSite = item.site as any;

        // 通知其他模块数据已更新
        eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, item.data);

        // 显示加载成功提示
        const hasReport = item.analysisStatus?.isAnalyzed || item.report;
        const message = hasReport 
            ? `历史快照已加载（包含分析报告）` 
            : `历史快照已加载`;
        showToast(message, "success");
        
        this.saveState();
    },

    /**
     * 从历史快照载入分析报告（跳转到AI智能分析页面查看）
     */
    async loadAnalysisReport(item: any) {
        if (!item.analysisStatus || !item.analysisStatus.isAnalyzed) {
            showToast("该快照没有分析报告", "warning");
            return;
        }

        try {
            // 1. 先加载历史快照数据到全局状态
            this.loadHistoryItem(item);

            // 2. 确保报告数据已正确加载到全局状态
            if (!state.analysis.analysisReport) {
                throw new Error('报告数据加载失败');
            }

            console.log('[Scraper] 📊 已将"AI智能分析"报告加载到全局状态');

            // 3. 等待状态更新
            await new Promise(resolve => setTimeout(resolve, 100));

            // 4. 跳转到 AI智能分析页面查看报告
            if (window.switchTab) {
                await window.switchTab('ai_analysis', true);
            }

            showToast("已跳转到 AI智能分析查看报告", "success");
        } catch (error) {
            console.error('[Scraper] 载入分析报告失败:', error);
            showToast("载入分析报告失败", "error");
        }
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
        let products: any[] = [];

        try {
            const promises = this.validAsins.map(async (asin, index) => {
                // 更新任务状态为采集中
                this.updateTask(asin, 'scraping', '正在采集...');

                // 错开请求时间
                if (index > 0) await sleep(index * 800);

                return scrapeAsin(asin, site as any, scrapeReviews, (a: string, status: string, msg: string) => {
                    this.updateTask(a, status as any, msg);
                });
            });

            products = await Promise.all(promises);

        } catch (e) {
            ErrorService.handle(e as Error, { action: 'startScrape', module: 'scraper' });
            showToast("采集任务异常中断", "error");
        } finally {
            // 完成采集
            this.handleScrapeComplete(products);
            this.isScraping = false;
            this.saveState();
        }
    },

    updateTask(asin: string, status: Task['status'], message: string) {
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

    handleScrapeComplete(products: any[]) {
        // 处理失败或空结果
        if (!products || products.length === 0) {
            products = this.validAsins.map(asin => ({
                asin, scrape_status: 'failed', error: 'Unknown Error'
            }));
        }

        const siteConfig = (LANGUAGE_HEADERS as any)[this.selectedSite] || {};

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
        HistoryService.save(scrapedData);
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
        
        // ✅ 渲染数据预览
        // ✅ 性能优化：检查大数据集
        this.checkLargeDataset();
        this.renderDataPanel();
        
        this.saveState();
    },

    // ========== 安全防护：XSS防护 ==========
    
    /**
     * HTML转义函数 - 防止XSS攻击
     * 将特殊字符转换为HTML实体
     */
    escapeHtml(unsafe: string): string {
        if (!unsafe || typeof unsafe !== 'string') {
            return '';
        }
        
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    /**
     * 清理和验证URL - 防止JavaScript伪协议注入
     */
    sanitizeUrl(url: string): string {
        if (!url || typeof url !== 'string') {
            return '#';
        }
        
        // 移除前后空格
        url = url.trim();
        
        // 只允许http和https协议
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // 如果没有协议，默认添加https
        if (!url.includes('://')) {
            return 'https://' + url;
        }
        
        // 拒绝危险的协议（javascript:, data:, vbscript:等）
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
        const lowerUrl = url.toLowerCase();
        for (const protocol of dangerousProtocols) {
            if (lowerUrl.startsWith(protocol)) {
                console.warn('[Scraper] 检测到危险URL协议:', url);
                return '#';
            }
        }
        
        return url;
    },
    
    /**
     * 清理产品数据 - 对所有用户可控的字段进行HTML转义
     */
    sanitizeProductData(product: any): any {
        if (!product || typeof product !== 'object') {
            return product;
        }
        
        const sanitized = { ...product };
        
        // 转义产品标题
        if (sanitized.productTitle) {
            sanitized.productTitle = this.escapeHtml(sanitized.productTitle);
        }
        
        // 转义五点描述
        if (Array.isArray(sanitized.feature_bullets)) {
            sanitized.feature_bullets = sanitized.feature_bullets.map((bullet: string) => 
                this.escapeHtml(bullet)
            );
        }
        
        // 转义评论内容
        if (Array.isArray(sanitized.customer_reviews)) {
            sanitized.customer_reviews = sanitized.customer_reviews.map((review: any) => ({
                ...review,
                headline: review.headline ? this.escapeHtml(review.headline) : '',
                body: review.body ? this.escapeHtml(review.body) : '',
                author: review.author ? this.escapeHtml(review.author) : ''
            }));
        }
        
        // 清理URL
        if (sanitized.url) {
            sanitized.url = this.sanitizeUrl(sanitized.url);
        }
        
        // 转义错误信息
        if (sanitized.error) {
            sanitized.error = this.escapeHtml(sanitized.error);
        }
        
        return sanitized;
    },
    
    // ========== 数据导入功能 ==========
    
    /**
     * 触发文件选择对话框
     */
    triggerImport(): void {
        const input = document.getElementById("import-file-input") as HTMLInputElement;
        if (input) {
            input.value = "";
            input.click();
        }
    },

    /**
     * 处理文件导入
     */
    async handleImportFiles(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (files.length === 0) return;

        const inputEl = target;
        
        // ✅ 验证文件类型
        const invalidFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));
        if (invalidFiles.length > 0) {
            console.error('[Scraper] 文件类型错误:', invalidFiles.map(f => f.name));
            showToast(`❌ 只支持JSON文件，以下文件被忽略: ${invalidFiles.map(f => f.name).join(', ')}`, "error");
            inputEl.value = '';
            return;
        }
        
        // ✅ 验证文件大小（最大10MB）
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            console.error('[Scraper] 文件过大:', oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            showToast(`❌ 文件大小不能超过10MB，以下文件被忽略: ${oversizedFiles.map(f => f.name).join(', ')}`, "error");
            inputEl.value = '';
            return;
        }
        
        // ✅ 性能优化：大文件警告（5MB以上）
        const LARGE_FILE_SIZE = 5 * 1024 * 1024;
        const largeFiles = files.filter(f => f.size > LARGE_FILE_SIZE && f.size <= MAX_FILE_SIZE);
        if (largeFiles.length > 0) {
            console.warn('[Scraper] 检测到大文件:', largeFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`));
            showToast(`⚠️ 检测到大文件 (${largeFiles.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)}MB`).join(', ')})，处理可能需要较长时间`, "warning");
        }
        
        // ✅ 检查空文件
        const emptyFiles = files.filter(f => f.size === 0);
        if (emptyFiles.length > 0) {
            console.error('[Scraper] 空文件:', emptyFiles.map(f => f.name));
            showToast(`❌ 文件内容为空: ${emptyFiles.map(f => f.name).join(', ')}`, "error");
            inputEl.value = '';
            return;
        }

        showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

        try {
            const fileContents = await Promise.all(files.map(f => this.readFileAsJSON(f)));
            const productPool = new Map<string, any[]>();
            const detectedSites = new Set<string>();

            fileContents.forEach(({ data, filename }) => {
                if (!data) {
                    console.warn(`[Scraper] 文件 ${filename} 数据为空，跳过`);
                    return;
                }
                
                // ✅ 验证数据结构
                const validation = this.validateScrapedData(data);
                if (!validation.valid) {
                    console.error(`[Scraper] 文件 ${filename} 数据验证失败:`, validation.error);
                    throw new Error(`文件 ${filename} 数据验证失败: ${validation.error}`);
                }
                
                let fileSite: string | null = null;
                
                // 类型守卫: 检查是否是包含products的对象
                if (!Array.isArray(data) && 'products' in data) {
                    const dataWithMeta = data as { products: any[]; metadata?: { marketplace?: string } };
                    fileSite = dataWithMeta.metadata?.marketplace || null;
                } else if (!Array.isArray(data) && 'metadata' in data) {
                    // 单个产品对象
                    fileSite = (data as any).metadata?.marketplace || null;
                } else if (Array.isArray(data) && data.length > 0 && data[0]) {
                    // 产品数组
                    fileSite = data[0].metadata?.marketplace || null;
                }

                const site = fileSite || "Unknown";
                if (fileSite) detectedSites.add(fileSite);

                // 使用验证后的产品列表
                const list: any[] = validation.products || [];

                list.forEach((p: any) => {
                    if (!p.asin) return;
                    if (!productPool.has(p.asin)) {
                        productPool.set(p.asin, []);
                    }
                    productPool.get(p.asin)!.push({
                        ...p,
                        _source_site: site,
                        _filename: filename
                    });
                });
            });

            if (productPool.size === 0) throw new Error("未找到有效的产品数据");

            let targetMarketplace: string = state.scraper.selectedSite || '';
            const hasExistingData = state.scraper.scrapedData && state.scraper.scrapedData.products && state.scraper.scrapedData.products.length > 0;

            if (!hasExistingData && detectedSites.size > 1) {
                const selected = await this.showMarketplaceSelectionModal([...detectedSites]);
                if (!selected) {
                    showToast("用户取消导入", "info");
                    return;
                }
                targetMarketplace = selected;
            } else if (!hasExistingData && detectedSites.size === 1) {
                targetMarketplace = [...detectedSites][0] || '';
            } else if (hasExistingData && state.scraper.scrapedData) {
                targetMarketplace = state.scraper.scrapedData.metadata?.marketplace || '';
            }

            const finalProducts: any[] = [];
            const currentProductsMap = new Map((state.scraper.scrapedData?.products || []).map((p: any) => [p.asin, p]));

            for (const [asin, versions] of productPool.entries()) {
                const masterVersion = versions.find(v => v._source_site === targetMarketplace);
                const existingVersion = currentProductsMap.get(asin);
                const baseProduct = existingVersion || masterVersion || versions[0];

                if (!baseProduct) continue;

                const mergedProduct: any = JSON.parse(JSON.stringify(baseProduct));
                if (!mergedProduct.metadata) mergedProduct.metadata = {};

                const allReviewSources: any[] = [];
                if (existingVersion) allReviewSources.push(existingVersion);
                allReviewSources.push(...versions);

                const uniqueReviewsMap = new Map<string, any>();

                allReviewSources.forEach(ver => {
                    if (Array.isArray(ver.customer_reviews)) {
                        ver.customer_reviews.forEach((r: any) => {
                            const sig = this.getReviewSignature(r);
                            if (!uniqueReviewsMap.has(sig)) {
                                if (ver._source_site && ver._source_site !== "Unknown") {
                                    r._origin_site = ver._source_site;
                                }
                                uniqueReviewsMap.set(sig, r);
                            }
                        });
                    }
                });

                mergedProduct.customer_reviews = Array.from(uniqueReviewsMap.values());
                delete mergedProduct._source_site;
                delete mergedProduct._filename;
                finalProducts.push(mergedProduct);
            }

            if (!hasExistingData) {
                state.scraper.selectedSite = targetMarketplace as any;
                this.selectedSite = targetMarketplace;
            }

            state.scraper.scrapedData = {
                metadata: {
                    marketplace: targetMarketplace,
                    scrape_timestamp: new Date().toISOString(),
                    total_asins: finalProducts.length,
                    last_action: "multi_site_import_merge",
                    domain: (LANGUAGE_HEADERS as any)[targetMarketplace]?.domain || "unknown",
                    language: (LANGUAGE_HEADERS as any)[targetMarketplace]?.name || "unknown"
                },
                products: finalProducts
            };

            state.analysis.analysisReport = null;
            HistoryService.save(state.scraper.scrapedData);
            this.loadHistory();

            // 触发事件通知其他模块更新
            eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, state.scraper.scrapedData);
            eventBus.emit(APP_EVENTS.DATA_UPDATED);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));

            showToast(`✅ 成功导入并合并 ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`, "success");
            
            // ✅ 性能优化：检查大数据集并渲染
            this.checkLargeDataset();
            this.renderDataPanel();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Scraper] 导入失败:', {
                error: error,
                errorMessage: errorMessage,
                filesCount: files.length,
                fileNames: files.map(f => f.name)
            });
            
            // ✅ 根据错误类型提供友好的错误提示
            let userMessage = "❌ 导入出错";
            if (errorMessage.includes('格式错误') || errorMessage.includes('JSON')) {
                userMessage = `❌ JSON格式错误: ${errorMessage}`;
            } else if (errorMessage.includes('读取文件')) {
                userMessage = `❌ 文件读取失败: ${errorMessage}`;
            } else if (errorMessage.includes('未找到有效')) {
                userMessage = `❌ ${errorMessage}`;
            } else {
                userMessage = `❌ 导入出错: ${errorMessage}`;
            }
            
            showToast(userMessage, "error");
        } finally {
            inputEl.value = '';
        }
    },

    /**
     * 读取文件为JSON
     */
    readFileAsJSON(file: File): Promise<{ data: any; filename: string }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    
                    // ✅ 验证内容不为空
                    if (!content || content.trim().length === 0) {
                        reject(new Error(`文件 ${file.name} 内容为空`));
                        return;
                    }
                    
                    // ✅ 尝试解析JSON
                    let json;
                    try {
                        json = JSON.parse(content);
                    } catch (parseError) {
                        reject(new Error(`文件 ${file.name} 不是有效的JSON格式: ${parseError instanceof Error ? parseError.message : String(parseError)}`));
                        return;
                    }
                    
                    // ✅ 验证JSON不为null或undefined
                    if (json === null || json === undefined) {
                        reject(new Error(`文件 ${file.name} JSON内容无效`));
                        return;
                    }
                    
                    resolve({ data: json, filename: file.name });
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    console.error(`[Scraper] 解析文件 ${file.name} 失败:`, err);
                    reject(new Error(`文件 ${file.name} 解析失败: ${errorMsg}`));
                }
            };
            
            reader.onerror = () => {
                const errorMsg = reader.error?.message || '未知错误';
                console.error(`[Scraper] 读取文件 ${file.name} 失败:`, reader.error);
                reject(new Error(`无法读取文件 ${file.name}: ${errorMsg}`));
            };
            
            reader.readAsText(file);
        });
    },

    /**
     * 获取评论签名（用于去重）
     */
    getReviewSignature(review: any): string {
        if (review.id) return review.id;
        return `${review.date || ''}_${review.author || ''}_${(review.headline || '').substring(0, 20)}`.trim();
    },

    /**
     * 验证产品数据结构
     */
    validateProduct(product: any): { valid: boolean; error?: string } {
        if (!product || typeof product !== 'object') {
            return { valid: false, error: '产品数据不是有效对象' };
        }

        // 验证必需字段：ASIN
        if (!product.asin || typeof product.asin !== 'string') {
            return { valid: false, error: '缺少必需字段: asin' };
        }

        // 验证ASIN格式
        if (!/^B0[A-Z0-9]{8}$/.test(product.asin)) {
            return { valid: false, error: `ASIN格式无效: ${product.asin}` };
        }

        // 验证产品标题
        if (product.productTitle && typeof product.productTitle !== 'string') {
            return { valid: false, error: 'productTitle必须是字符串' };
        }

        // 验证五点描述
        if (product.feature_bullets) {
            if (!Array.isArray(product.feature_bullets)) {
                return { valid: false, error: 'feature_bullets必须是数组' };
            }
            if (!product.feature_bullets.every((b: any) => typeof b === 'string')) {
                return { valid: false, error: 'feature_bullets中的元素必须是字符串' };
            }
        }

        // 验证评论数据
        if (product.customer_reviews) {
            if (!Array.isArray(product.customer_reviews)) {
                return { valid: false, error: 'customer_reviews必须是数组' };
            }
            // 验证每个评论的基本结构
            for (let i = 0; i < product.customer_reviews.length; i++) {
                const review = product.customer_reviews[i];
                if (!review || typeof review !== 'object') {
                    return { valid: false, error: `评论[${i}]不是有效对象` };
                }
            }
        }

        return { valid: true };
    },

    /**
     * 验证导入的数据结构
     */
    validateScrapedData(data: any): { valid: boolean; error?: string; products?: any[] } {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: '数据不是有效对象' };
        }

        let products: any[] = [];

        // 处理不同的数据格式
        if (Array.isArray(data)) {
            // 格式1: 直接是产品数组
            products = data;
        } else if ('products' in data && Array.isArray(data.products)) {
            // 格式2: 包含products字段的对象
            products = data.products;
        } else if ('asin' in data) {
            // 格式3: 单个产品对象
            products = [data];
        } else {
            return { valid: false, error: '无法识别的数据格式，需要包含products数组或单个产品对象' };
        }

        // 验证至少有一个产品
        if (products.length === 0) {
            return { valid: false, error: '数据中没有产品信息' };
        }

        // 验证每个产品
        const invalidProducts: string[] = [];
        for (let i = 0; i < products.length; i++) {
            const validation = this.validateProduct(products[i]);
            if (!validation.valid) {
                invalidProducts.push(`产品[${i}] ${products[i]?.asin || '未知'}: ${validation.error}`);
            }
        }

        if (invalidProducts.length > 0) {
            return { 
                valid: false, 
                error: `发现 ${invalidProducts.length} 个无效产品:\n${invalidProducts.slice(0, 3).join('\n')}${invalidProducts.length > 3 ? '\n...' : ''}` 
            };
        }

        return { valid: true, products };
    },

    /**
     * 显示站点选择弹窗
     */
    showMarketplaceSelectionModal(sites: string[]): Promise<string | null> {
        return new Promise((resolve) => {
            const modalId = 'site-select-modal-' + Date.now();
            const backdrop = document.createElement('div');
            backdrop.id = modalId;
            backdrop.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in";

            const SITE_NAME_MAP: Record<string, string> = {
                DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
                SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
            };

            const content = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
                        <h3 class="text-lg font-bold flex items-center gap-2">
                            <i class="fas fa-globe"></i> 检测到多站点数据
                        </h3>
                        <p class="text-blue-100 text-xs mt-1">您导入的文件包含多个市场的数据 (${sites.join(", ")})</p>
                    </div>
                    
                    <div class="p-6">
                        <p class="text-slate-600 text-sm mb-4 font-medium">
                            请选择一个<span class="text-blue-600 font-bold">主站点</span>：
                            <br/><span class="text-xs text-slate-400 font-normal">我们将保留主站点的标题、五点描述、Review，并自动合并其他站点的Review。</span>
                        </p>
                        
                        <div class="space-y-3 mb-6">
                            ${sites.map((site, index) => `
                                <label class="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                    <input type="radio" name="site_choice" value="${site}" ${index === 0 ? 'checked' : ''} 
                                        class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                    <span class="ml-3 font-bold text-slate-700 group-hover:text-blue-700"> ${SITE_NAME_MAP[site] || site} - ${site} </span>
                                    <span class="ml-auto text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                        ${this.getFlag(site)}
                                    </span>
                                </label>
                            `).join('')}
                        </div>

                        <div class="flex justify-end gap-3">
                            <button id="btn-cancel-${modalId}" class="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                                取消导入
                            </button>
                            <button id="btn-confirm-${modalId}" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:scale-95">
                                确认合并
                            </button>
                        </div>
                    </div>
                </div>
            `;

            backdrop.innerHTML = content;
            document.body.appendChild(backdrop);

            const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement;
            const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement;

            let resolved = false;

            const cleanup = () => {
                if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
                if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
                
                try {
                    if (backdrop && document.body.contains(backdrop)) {
                        document.body.removeChild(backdrop);
                    }
                } catch (error) {
                    console.error('[Scraper] 清理弹窗失败:', error);
                }
            };

            const handleConfirm = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return;
                resolved = true;
                
                const selectedInput = backdrop.querySelector('input[name="site_choice"]:checked') as HTMLInputElement;
                const selected = selectedInput ? selectedInput.value : null;
                
                cleanup();
                setTimeout(() => resolve(selected), 0);
            };

            const handleCancel = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return;
                resolved = true;
                
                cleanup();
                setTimeout(() => resolve(null), 0);
            };

            btnConfirm.addEventListener('click', handleConfirm, { once: true });
            btnCancel.addEventListener('click', handleCancel, { once: true });
        });
    },

    // ========== 数据预览功能 ==========
    
    /**
     * 渲染数据预览面板
     * ✅ 性能优化：支持大数据集分页渲染
     * ✅ 安全防护：对所有用户数据进行HTML转义
     */
    renderDataPanel(): void {
        if (!state.scraper.scrapedData) return;

        const noDataMsg = document.getElementById("no-data-msg");
        const cardsEl = document.getElementById("data-cards");

        // 如果 DOM 元素还不存在,延迟渲染
        if (!cardsEl) {
            console.warn('[Scraper] DOM 元素尚未就绪,延迟渲染');
            return;
        }

        if (!state.scraper.scrapedData.products || state.scraper.scrapedData.products.length === 0) {
            if (noDataMsg) noDataMsg.classList.remove("hidden");
            if (cardsEl) cardsEl.classList.add("hidden");
            return;
        }

        if (noDataMsg) noDataMsg.classList.add("hidden");
        if (cardsEl) cardsEl.classList.remove("hidden");

        // ✅ 性能优化：使用分页数据而不是全部数据
        const productsToRender = this.shouldUsePagination ? this.paginatedProducts : state.scraper.scrapedData.products;
        
        console.log(`[Scraper] 渲染 ${productsToRender.length}/${this.totalProducts} 个产品 (页码: ${this.currentPage}/${this.totalPages})`);
        
        // ✅ 性能优化：清理旧的DOM元素，释放内存
        this.cleanupOldDOMElements(cardsEl);

        const globalSiteCode = state.scraper.scrapedData.metadata?.marketplace || state.scraper.selectedSite;

        // 站点域名映射
        const SITE_DOMAIN_MAP: Record<string, string> = {
            DE: 'amazon.de', FR: 'amazon.fr', IT: 'amazon.it', ES: 'amazon.es',
            NL: 'amazon.nl', SE: 'amazon.se', PL: 'amazon.pl', BE: 'amazon.com.be',
            IE: 'amazon.ie', UK: 'amazon.co.uk', GB: 'amazon.co.uk'
        };

        // 语言标志映射
        const languageFlagMap: Record<string, string> = {
            DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
            SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧', GB: '🇬🇧'
        };

        // 错误摘要提取函数
        const getErrorSummary = (error: string): string => {
            if (error.includes('timeout')) return '请求超时';
            if (error.includes('404')) return '页面不存在';
            if (error.includes('403')) return '访问被拒绝';
            if (error.includes('network')) return '网络错误';
            return error;
        };

        // ✅ 安全防护：对每个产品数据进行清理
        // ✅ 性能优化：只渲染当前页的产品
        cardsEl.innerHTML = productsToRender.map((rawProduct: any) => {
            // ✅ 安全：清理产品数据，防止XSS
            const p = this.sanitizeProductData(rawProduct);
            
            const isExpanded = this.expandedAsin === p.asin;
            let siteKey = globalSiteCode || p.language || "US";
            if (siteKey === 'UK') siteKey = 'GB';
            const flag = languageFlagMap[siteKey] || "🌐";

            const statusConfig: Record<string, { class: string; icon: string; text: string }> = {
                success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
                partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
                failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
            };
            const status = statusConfig[p.scrape_status] || statusConfig['partial']!;
            const statusClass = status.class;
            const statusIcon = status.icon;
            const statusText = status.text;

            return `
                <div id="card-${p.asin}" 
                     class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md 
                    ${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}" 
                    @click="toggleCardExpand('${p.asin}')">
                    
                    <button @click.stop="deleteProduct('${p.asin}')" 
                        class="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all z-30"
                        title="彻底删除该 ASIN">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                    
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-black-500 to-white-600 rounded-xl shadow-md">${flag}</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono text-base font-bold text-slate-800 tracking-tight">${p.asin}</span>
                                    <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${statusClass}">
                                        <i class="fas ${statusIcon}"></i> ${statusText}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3 text-xs font-medium text-slate-500">
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-brands fa-amazon text-yellow-500"></i>${SITE_DOMAIN_MAP[siteKey]}</span>
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-solid fa-heading"></i></span>
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fas fa-list-ul text-blue-500"></i> ${p.feature_bullets.length}</span>
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fas fa-comments text-purple-500"></i> ${(p.customer_reviews || []).length}</span>
                            </div>
                            <span class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                                <i id="card-icon-${p.asin}" class="fas fa-chevron-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}"></i>
                            </span>
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-heading"></i> 标题</h5>
                        <h4 class="text-sm font-medium text-slate-700 leading-relaxed ${isExpanded ? "" : "line-clamp-1"}">
                            ${p.productTitle || "<span class='text-slate-400 italic'>(无标题)</span>"}
                        </h4>
                    </div>
                    
                    ${p.error ? `<div class="flex items-start gap-2 text-xs text-red-600 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg"><i class="fas fa-bug mt-0.5"></i><span>${getErrorSummary(p.error) || p.error}</span></div>` : ""}
                    
                    <div id="card-body-${p.asin}" class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in ${isExpanded ? '' : 'hidden'}" @click.stop>
                        <div>
                            <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fas fa-list-ul text-blue-500"></i> 五点描述</h5>
                            ${p.feature_bullets.length > 0 ? `
                                <ul class="space-y-2">
                                    ${p.feature_bullets.map((b: string, i: number) => `
                                        <li class="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex gap-3 hover:border-blue-200 transition-colors">
                                            <span class="text-blue-500 font-bold font-mono text-xs mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded h-fit">${i + 1}</span> 
                                            <span class="leading-relaxed">${b}</span>
                                        </li>
                                    `).join("")}
                                </ul>
                            ` : '<p class="text-sm text-slate-400 italic pl-6">无五点描述</p>'} 
                        </div>
                        <div>
                            <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <i class="fas fa-comments text-purple-500"></i> 评论内容 
                                <span class="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">TOP ${(p.customer_reviews || []).length}</span>
                            </h5>
                            ${(p.customer_reviews || []).length > 0 ? `
                                <div class="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                    ${(p.customer_reviews || []).map((review: any, i: number) => `
                                        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group/review relative hover:border-purple-200 hover:shadow-md transition-all">
                                            <button @click.stop="deleteReview('${p.asin}', ${i})" 
                                                class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/review:opacity-100 z-10">
                                                <i class="fas fa-trash-alt text-xs"></i>
                                            </button>
                                            <div class="flex flex-wrap justify-between items-start gap-2 mb-2 pr-8">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">#${i + 1}</span>
                                                    ${this.renderStars(review.star_rating)}
                                                </div>
                                                ${(review.is_verified || review.isVerified) ? `<span class="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full"><i class="fas fa-check-circle"></i> Verified Purchase</span>` : ""}
                                            </div>
                                            ${review.headline ? `<h6 class="text-sm font-bold text-slate-800 mb-1.5">${review.headline}</h6>` : ""}
                                            <p class="text-sm text-slate-600 leading-relaxed text-justify">${review.body}</p>
                                        </div>
                                    `).join("")}
                                </div>
                            ` : '<p class="text-sm text-slate-400 italic pl-6">无评论数据</p>'} 
                        </div>
                        <div class="pt-3 flex justify-end">
                            <a href="https://${SITE_DOMAIN_MAP[siteKey]}/dp/${p.asin}" target="_blank" class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">
                                <span>查看原始页面</span> <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        const jsonDisplay = document.getElementById("json-display");
        if (jsonDisplay) {
            // ✅ 安全: 静态HTML模板，无用户输入
            jsonDisplay.innerHTML = this.syntaxHighlight(JSON.stringify(state.scraper.scrapedData, null, 2));
        }
    },

    /**
     * 渲染星级评分
     */
    renderStars(rating?: number): string {
        if (!rating) return "";
        return `<div class="flex items-center gap-0.5 text-sm" title="${rating} 分">
            ${[1, 2, 3, 4, 5].map((star) => {
            if (rating >= star) return '<i class="fas fa-star text-amber-400"></i>';
            if (rating >= star - 0.5) return '<i class="fas fa-star-half-alt text-amber-400"></i>';
            return '<i class="far fa-star text-slate-300"></i>';
        }).join("")}
            <span class="text-xs text-slate-500 ml-1 font-mono pt-0.5">${rating}</span>
        </div>`;
    },

    /**
     * JSON语法高亮
     */
    syntaxHighlight(json: string): string {
        return json.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
            (match) => {
                let cls = "json-number";
                if (/^"/.test(match)) {
                    cls = /:$/.test(match) ? "json-key" : "json-string";
                } else if (/true|false/.test(match)) {
                    cls = "json-boolean";
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );
    },

    /**
     * 切换卡片展开/收起状态
     */
    toggleCardExpand(asin: string): void {
        this.expandedAsin = this.expandedAsin === asin ? null : asin;
        this.saveState();
        this.renderDataPanel();
    },

    /**
     * 切换数据标签页
     */
    switchDataTab(tab: 'preview' | 'json'): void {
        this.currentDataTab = tab;
        this.saveState();
    },
    
    // ========== 性能优化：分页控制方法 ==========
    
    /**
     * 跳转到指定页码
     */
    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderDataPanel();
        
        // 滚动到顶部
        const cardsEl = document.getElementById("data-cards");
        if (cardsEl) {
            cardsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },
    
    /**
     * 上一页
     */
    previousPage(): void {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    },
    
    /**
     * 下一页
     */
    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    },

    /**
     * 删除产品
     */
    async deleteProduct(asin: string): Promise<void> {
        // ✅ 保存原始数据用于回滚
        const originalData = state.scraper.scrapedData ? JSON.parse(JSON.stringify(state.scraper.scrapedData)) : null;
        
        try {
            // ✅ 验证ASIN参数
            if (!asin || typeof asin !== 'string') {
                throw new Error('无效的ASIN参数');
            }

            const confirmed = await this.confirmWithModal(
                `删除产品`,
                `确定删除 ASIN: <span class="font-bold text-red-600 bg-red-50 px-1 rounded">${asin}</span> 及其所有数据吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>`,
                "ignore_del_prod_confirm"
            );

            if (!confirmed) {
                console.log('[Scraper] 用户取消删除产品操作');
                return;
            }

            // ✅ 验证数据状态
            if (!state.scraper.scrapedData) {
                throw new Error('数据状态异常：scrapedData为空');
            }

            if (!state.scraper.scrapedData.products || !Array.isArray(state.scraper.scrapedData.products)) {
                throw new Error('数据状态异常：products不是有效数组');
            }

            // ✅ 验证产品是否存在
            const productExists = state.scraper.scrapedData.products.some((p: any) => p.asin === asin);
            if (!productExists) {
                throw new Error(`产品不存在：${asin}`);
            }

            // 从数据集中移除产品
            const beforeCount = state.scraper.scrapedData.products.length;
            state.scraper.scrapedData.products = 
                state.scraper.scrapedData.products.filter((p: any) => p.asin !== asin);
            const afterCount = state.scraper.scrapedData.products.length;

            // ✅ 验证删除是否成功
            if (beforeCount === afterCount) {
                throw new Error(`删除失败：产品数量未变化`);
            }

            // 更新元数据
            if (state.scraper.scrapedData.metadata) {
                state.scraper.scrapedData.metadata.total_asins = afterCount;
            }

            // 保存到历史记录
            try {
                HistoryService.save(state.scraper.scrapedData);
                this.loadHistory();
            } catch (saveError) {
                console.error('[Scraper] 保存历史记录失败:', saveError);
                throw new Error('保存历史记录失败');
            }

            // 重新渲染
            try {
                this.renderDataPanel();
            } catch (renderError) {
                console.error('[Scraper] 渲染失败:', renderError);
                // 渲染失败不影响数据删除，只记录错误
            }

            // 触发事件通知其他模块
            try {
                eventBus.emit(APP_EVENTS.DATA_UPDATED);
                window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
            } catch (eventError) {
                console.error('[Scraper] 触发事件失败:', eventError);
                // 事件触发失败不影响数据删除，只记录错误
            }

            showToast(`ASIN ${asin} 已移除`, "info");
            console.log(`[Scraper] 成功删除产品: ${asin}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Scraper] 删除产品失败:', {
                error: error,
                errorMessage: errorMessage,
                asin: asin,
                hasOriginalData: !!originalData
            });
            
            // ✅ 回滚数据
            if (originalData && state.scraper.scrapedData) {
                console.warn('[Scraper] 正在回滚数据...');
                state.scraper.scrapedData = originalData;
                try {
                    this.renderDataPanel();
                } catch (rollbackError) {
                    console.error('[Scraper] 回滚渲染失败:', rollbackError);
                }
            }
            
            showToast(`删除操作失败: ${errorMessage}`, 'error');
        }
    },

    /**
     * 删除评论
     */
    async deleteReview(asin: string, index: number): Promise<void> {
        // ✅ 保存原始数据用于回滚
        const originalData = state.scraper.scrapedData ? JSON.parse(JSON.stringify(state.scraper.scrapedData)) : null;
        
        try {
            // ✅ 验证参数
            if (!asin || typeof asin !== 'string') {
                throw new Error('无效的ASIN参数');
            }
            
            if (typeof index !== 'number' || index < 0) {
                throw new Error('无效的评论索引');
            }

            const confirmed = await this.confirmWithModal(
                `删除评论`,
                `确定删除该评论吗？<br/><span class="text-xs text-slate-400 mt-1 block">此操作无法撤销</span>`,
                "ignore_del_review_confirm"
            );

            if (!confirmed) {
                console.log('[Scraper] 用户取消删除评论操作');
                return;
            }

            // ✅ 验证数据状态
            if (!state.scraper.scrapedData) {
                throw new Error('数据状态异常：scrapedData为空');
            }

            if (!state.scraper.scrapedData.products || !Array.isArray(state.scraper.scrapedData.products)) {
                throw new Error('数据状态异常：products不是有效数组');
            }

            // 找到产品
            const product = state.scraper.scrapedData.products.find((p: any) => p.asin === asin);
            if (!product) {
                throw new Error(`产品不存在：${asin}`);
            }

            // ✅ 验证评论数组
            if (!product.customer_reviews || !Array.isArray(product.customer_reviews)) {
                throw new Error('产品的评论数据无效');
            }

            // ✅ 验证索引范围
            if (index >= product.customer_reviews.length) {
                throw new Error(`评论索引超出范围：${index} >= ${product.customer_reviews.length}`);
            }

            // 删除评论
            const beforeCount = product.customer_reviews.length;
            product.customer_reviews.splice(index, 1);
            const afterCount = product.customer_reviews.length;

            // ✅ 验证删除是否成功
            if (beforeCount === afterCount) {
                throw new Error('删除失败：评论数量未变化');
            }

            // 保存到历史记录
            try {
                HistoryService.save(state.scraper.scrapedData);
                this.loadHistory();
            } catch (saveError) {
                console.error('[Scraper] 保存历史记录失败:', saveError);
                throw new Error('保存历史记录失败');
            }

            // 重新渲染
            try {
                this.renderDataPanel();
            } catch (renderError) {
                console.error('[Scraper] 渲染失败:', renderError);
                // 渲染失败不影响数据删除，只记录错误
            }

            // 触发事件通知其他模块
            try {
                eventBus.emit(APP_EVENTS.DATA_UPDATED);
                window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
            } catch (eventError) {
                console.error('[Scraper] 触发事件失败:', eventError);
                // 事件触发失败不影响数据删除，只记录错误
            }

            showToast('评论已删除', 'info');
            console.log(`[Scraper] 成功删除评论: ASIN=${asin}, index=${index}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Scraper] 删除评论失败:', {
                error: error,
                errorMessage: errorMessage,
                asin: asin,
                index: index,
                hasOriginalData: !!originalData
            });
            
            // ✅ 回滚数据
            if (originalData && state.scraper.scrapedData) {
                console.warn('[Scraper] 正在回滚数据...');
                state.scraper.scrapedData = originalData;
                try {
                    this.renderDataPanel();
                } catch (rollbackError) {
                    console.error('[Scraper] 回滚渲染失败:', rollbackError);
                }
            }
            
            showToast(`删除操作失败: ${errorMessage}`, 'error');
        }
    },

    /**
     * 显示确认对话框
     */
    confirmWithModal(title: string, content: string, storageKey: string): Promise<boolean> {
        return new Promise((resolve) => {
            // 检查是否已经选择"不再提示"
            const ignoreKey = `modal_ignore_${storageKey}`;
            const ignored = StorageService.get(ignoreKey);
            if (ignored === true) {
                resolve(true);
                return;
            }

            const modalId = 'confirm-modal-' + Date.now();
            const backdrop = document.createElement('div');
            backdrop.id = modalId;
            backdrop.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in";

            const modalContent = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                    <div class="bg-gradient-to-r from-red-600 to-orange-600 p-5 text-white">
                        <h3 class="text-lg font-bold flex items-center gap-2">
                            <i class="fas fa-exclamation-triangle"></i> ${title}
                        </h3>
                    </div>
                    
                    <div class="p-6">
                        <p class="text-slate-600 text-sm mb-4">${content}</p>
                        
                        <label class="flex items-center gap-2 text-xs text-slate-500 mb-4 cursor-pointer">
                            <input type="checkbox" id="dont-ask-again-${modalId}" class="rounded border-slate-300">
                            <span>不再提示</span>
                        </label>

                        <div class="flex justify-end gap-3">
                            <button id="btn-cancel-${modalId}" class="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm transition-colors">
                                取消
                            </button>
                            <button id="btn-confirm-${modalId}" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:scale-95">
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            `;

            backdrop.innerHTML = modalContent;
            document.body.appendChild(backdrop);

            const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement;
            const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement;
            const dontAskCheckbox = document.getElementById(`dont-ask-again-${modalId}`) as HTMLInputElement;

            let resolved = false;

            const cleanup = () => {
                if (btnConfirm) btnConfirm.removeEventListener('click', handleConfirm);
                if (btnCancel) btnCancel.removeEventListener('click', handleCancel);
                
                try {
                    if (backdrop && document.body.contains(backdrop)) {
                        document.body.removeChild(backdrop);
                    }
                } catch (error) {
                    console.error('[Scraper] 清理确认对话框失败:', error);
                }
            };

            const handleConfirm = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return;
                resolved = true;

                // 保存"不再提示"选项
                if (dontAskCheckbox && dontAskCheckbox.checked) {
                    StorageService.set(ignoreKey, true);
                }
                
                cleanup();
                setTimeout(() => resolve(true), 0);
            };

            const handleCancel = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return;
                resolved = true;
                
                cleanup();
                setTimeout(() => resolve(false), 0);
            };

            btnConfirm.addEventListener('click', handleConfirm, { once: true });
            btnCancel.addEventListener('click', handleCancel, { once: true });
        });
    },

    // ========== Helpers ==========
    
    getFlag(site: string): string {
        const map: Record<string, string> = {
            DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
            SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧', GB: '🇬🇧'
        };
        return map[site] || '🏳️';
    },

    getSiteName(site: string): string {
        const map: Record<string, string> = {
            DE: '德国', FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰',
            SE: '瑞典', PL: '波兰', BE: '比利时', IE: '爱尔兰', UK: '英国'
        };
        return map[site] || site;
    },

    formatDate(ts: string): string {
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
 * @param container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
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
export function unmount(): void {
    console.log('[Scraper] 🔄 开始卸载子模块');

    try {
        // 1. 保存状态到 state
        // Alpine 组件的状态已经在操作过程中保存到 state
        // 这里不需要额外操作

        // 2. ✅ 性能优化：清理事件监听器
        const cardsContainer = document.getElementById('data-cards');
        if (cardsContainer) {
            // 获取 Alpine 组件实例
            const alpineData = (window as any).Alpine?.$data(cardsContainer.closest('[x-data="scraperPanel"]'));
            if (alpineData && alpineData._cardClickHandler) {
                cardsContainer.removeEventListener('click', alpineData._cardClickHandler);
                alpineData._cardClickHandler = null;
                console.log('[Scraper] ✅ 事件委托已清理');
            }
        }

        console.log('[Scraper] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Scraper] ❌ 子模块卸载失败:', error);
    }
}

// ========================================== 
// Legacy Bridges (向后兼容)
// ========================================== 

/**
 * 获取 Alpine 组件实例的辅助函数
 */
function getScraperPanelInstance(): any {
    const element = document.querySelector('[x-data="scraperPanel"]');
    if (!element) {
        console.warn('[Scraper] Alpine 组件实例未找到');
        return null;
    }
    return (window as any).Alpine?.$data(element);
}

/**
 * 初始化 Alpine Scraper 组件（向后兼容）
 */
export function initAlpineScraper(): void {
    if (window.Alpine) {
        window.Alpine.data('scraperPanel', ScraperPanel);
    }
}

/**
 * 渲染历史记录（向后兼容）
 */
export const renderHistory = (): void => {
    window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
};

/**
 * 初始化 Scraper 监听器（向后兼容）
 */
export const initScraperListeners = (): void => {
    // No-op，由 Alpine 处理
};

/**
 * 选择站点（向后兼容）
 */
export const selectSite = (): void => {
    // No-op，由 Alpine 处理
};

/**
 * 渲染数据面板（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 */
export const renderDataPanel = (): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.renderDataPanel === 'function') {
        panel.renderDataPanel();
    } else {
        console.warn('[Scraper] renderDataPanel 方法不可用');
    }
};

/**
 * 触发文件导入（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 */
export const triggerImport = (): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.triggerImport === 'function') {
        panel.triggerImport();
    } else {
        console.warn('[Scraper] triggerImport 方法不可用');
    }
};

/**
 * 切换数据标签页（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 * @param tab - 标签页名称 ('preview' | 'json')
 */
export const switchDataTab = (tab: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.switchDataTab === 'function') {
        panel.switchDataTab(tab as 'preview' | 'json');
    } else {
        console.warn('[Scraper] switchDataTab 方法不可用');
    }
};

/**
 * 处理文件导入（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 * @param e - 文件输入事件
 */
export const handleImportFiles = (e: Event): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.handleImportFiles === 'function') {
        panel.handleImportFiles(e);
    } else {
        console.warn('[Scraper] handleImportFiles 方法不可用');
    }
};

/**
 * 切换卡片展开状态（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 * @param asin - 产品 ASIN
 */
export const toggleCardExpand = (asin: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.toggleCardExpand === 'function') {
        panel.toggleCardExpand(asin);
    } else {
        console.warn('[Scraper] toggleCardExpand 方法不可用');
    }
};

/**
 * 删除产品（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 * @param asin - 产品 ASIN
 */
export const deleteProduct = (asin: string): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.deleteProduct === 'function') {
        panel.deleteProduct(asin);
    } else {
        console.warn('[Scraper] deleteProduct 方法不可用');
    }
};

/**
 * 删除评论（向后兼容）
 * 用于替代 rawdata 模块的同名导出
 * @param asin - 产品 ASIN
 * @param index - 评论索引
 */
export const deleteReview = (asin: string, index: number): void => {
    const panel = getScraperPanelInstance();
    if (panel && typeof panel.deleteReview === 'function') {
        panel.deleteReview(asin, index);
    } else {
        console.warn('[Scraper] deleteReview 方法不可用');
    }
};
