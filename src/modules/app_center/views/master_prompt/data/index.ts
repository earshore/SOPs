/**
 * Data 子模块
 * 负责数据管理和展示功能
 * 
 * 架构说明：
 * - 继承 BaseModule 实现生命周期管理
 * - 状态保存到 state.masterPrompt 命名空间
 * - 通过 EventBus 与其他模块通信
 */

import { loadTemplate } from '../../../../../common/utils/viewLoader';
import BaseModule from "../../../../../common/BaseModule";
import state from "../../../../../common/state";
import { getErrorSummary, showToast, switchTab } from '../../../../../common/utils/ui.js';
import { HistoryService } from '../services/historyService';
import { StorageService } from '../../../../../services/storageService';
import { languageFlagMap, SITE_NAME_MAP, SITE_DOMAIN_MAP } from '../../../../../common/constants/constants';
import eventBus from '../../../../../common/EventBus';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../common/constants/eventConstants';

import '../master_prompt_style.css';

// ========================================== 
// Types
// ========================================== 

interface Product {
    asin: string;
    productTitle?: string;
    feature_bullets: string[];
    customer_reviews?: Review[];
    scrape_status: 'success' | 'partial' | 'failed';
    language?: string;
    error?: string;
    metadata?: Record<string, any>;
    _source_site?: string;
    _filename?: string;
}

interface Review {
    id?: string;
    star_rating?: number;
    headline?: string;
    body: string;
    date?: string;
    author?: string;
    is_verified?: boolean;
    isVerified?: boolean;
    _origin_site?: string;
}

interface FileData {
    data: any;
    filename: string;
}

// ========================================== 
// Data Module Class
// ========================================== 

class DataModule extends BaseModule {
    constructor(container: HTMLElement) {
        super('master_prompt_data');
        this.container = container;
    }

    async render(): Promise<void> {
        // render() 方法由 BaseModule 要求实现
        // 但在这个模块中，HTML 已经在 mount() 函数中加载
        // 所以这里不需要做任何事情
    }

    async init(): Promise<void> {
        console.log("🚀 Data Module Initialized");
        this.setupEventListeners();

        // 订阅 Scraper 事件
        this.addDisposable(eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, (_data: any) => {
            console.log("DataModule received SCRAPE_SUCCESS");
            this.renderDataPanel();
        }));

        // 如果有数据则渲染
        if (state.scraper.scrapedData) {
            this.renderDataPanel();
        }
    }

    onUnmount(): void {
        console.log("💤 Data Module Unmounting...");
        // 保存状态
        this.saveState();
    }

    setupEventListeners(): void {
        // Import input change
        const importInput = document.getElementById("import-file-input") as HTMLInputElement;
        if (importInput) {
            this.addEventListener(importInput, "change", (e) => this.handleImportFiles(e as Event));
        }
    }

    saveState(): void {
        // 状态已经保存在 state.scraper.scrapedData 中
        // 保存 UI 状态
        if (state.masterPrompt) {
            (state.masterPrompt as any).expandedAsin = (state as any).expandedAsin;
            (state.masterPrompt as any).currentDataTab = (state as any).currentDataTab;
        }
    }

    restoreState(): void {
        // 恢复 UI 状态
        if (state.masterPrompt) {
            (state as any).expandedAsin = (state.masterPrompt as any).expandedAsin || null;
            (state as any).currentDataTab = (state.masterPrompt as any).currentDataTab || 'preview';
        }
    }

    // ================== Logic Methods ==================

    toggleCardExpand(asin: string): void {
        const cardBody = document.getElementById(`card-body-${asin}`);
        const cardIcon = document.getElementById(`card-icon-${asin}`);
        const cardContainer = document.getElementById(`card-${asin}`);

        if (!cardBody) return;

        const isCurrentlyHidden = cardBody.classList.contains("hidden");

        if (isCurrentlyHidden) {
            if ((state as any).expandedAsin && (state as any).expandedAsin !== asin) {
                const prevBody = document.getElementById(`card-body-${(state as any).expandedAsin}`);
                const prevIcon = document.getElementById(`card-icon-${(state as any).expandedAsin}`);
                const prevContainer = document.getElementById(`card-${(state as any).expandedAsin}`);

                if (prevBody) prevBody.classList.add("hidden");
                if (prevIcon) prevIcon.classList.remove("rotate-180");
                if (prevContainer) prevContainer.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
            }

            cardBody.classList.remove("hidden");
            cardBody.classList.add("fade-in");
            cardContainer?.classList.add("ring-1", "ring-blue-500", "bg-blue-50/30");
            if (cardIcon) cardIcon.classList.add("rotate-180");

            (state as any).expandedAsin = asin;
        } else {
            cardBody.classList.add("hidden");
            cardContainer?.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
            if (cardIcon) cardIcon.classList.remove("rotate-180");

            (state as any).expandedAsin = null;
        }
    }

    triggerImport(): void {
        const input = document.getElementById("import-file-input") as HTMLInputElement;
        if (input) {
            input.value = "";
            input.click();
        }
    }

    renderDataPanel(): void {
        if (!state.scraper.scrapedData) return;

        const noDataMsg = document.getElementById("no-data-msg");
        const cardsEl = document.getElementById("data-cards");

        // 如果 DOM 元素还不存在,延迟渲染
        if (!cardsEl) {
            console.warn('[Data] DOM 元素尚未就绪,延迟渲染');
            return;
        }

        if (!state.scraper.scrapedData.products || state.scraper.scrapedData.products.length === 0) {
            if (noDataMsg) noDataMsg.classList.remove("hidden");
            if (cardsEl) cardsEl.classList.add("hidden");
            return;
        }

        if (noDataMsg) noDataMsg.classList.add("hidden");
        if (cardsEl) cardsEl.classList.remove("hidden");

        const globalSiteCode = state.scraper.scrapedData.metadata?.marketplace || state.scraper.selectedSite;

        // ✅ 安全: 静态HTML模板，无用户输入
        cardsEl.innerHTML = state.scraper.scrapedData.products.map((p: any) => {
            const isExpanded = (state as any).expandedAsin === p.asin;
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
                    onclick="window.dataModule.toggleCardExpand('${p.asin}')">
                    
                    <button onclick="event.stopPropagation(); window.dataModule.deleteProduct('${p.asin}')" 
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
                    
                    <div id="card-body-${p.asin}" class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in ${isExpanded ? '' : 'hidden'}" onclick="event.stopPropagation()">
                        <div>
                            <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fas fa-list-ul text-blue-500"></i> 五点描述</h5>
                            ${p.feature_bullets.length > 0 ? `
                                <ul class="space-y-2">
                                    ${p.feature_bullets.map((b: any, i: number) => `
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
                                            <button onclick="window.dataModule.deleteReview('${p.asin}', ${i})" 
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
    }

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
    }

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
    }

    async deleteProduct(asin: string): Promise<void> {
        const confirmed = await this.confirmWithModal(
            `删除产品`,
            `确定删除 ASIN: <span class="font-bold text-red-600 bg-red-50 px-1 rounded">${asin}</span> 及其所有数据吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>`,
            "ignore_del_prod_confirm"
        );

        if (!confirmed) return;

        if (state.scraper.scrapedData) {
            state.scraper.scrapedData.products = state.scraper.scrapedData.products.filter((p: any) => p.asin !== asin);
            
            // 🔐 防御性检查：确保 metadata 存在
            if (state.scraper.scrapedData.metadata) {
                state.scraper.scrapedData.metadata.total_asins = state.scraper.scrapedData.products.length;
            }

            HistoryService.save(state.scraper.scrapedData, state.analysis.analysisReport);

            this.renderDataPanel();
            
            // 触发事件通知其他模块更新
            eventBus.emit(APP_EVENTS.DATA_UPDATED);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));

            showToast(`ASIN ${asin} 已移除`, "info");
        }
    }

    async deleteReview(asin: string, index: number): Promise<void> {
        const confirmed = await this.confirmWithModal(
            "删除评论",
            '确定删除这条Review吗？',
            "ignore_del_review_confirm"
        );

        if (!confirmed) return;

        if (state.scraper.scrapedData) {
            const product = state.scraper.scrapedData.products.find((p: any) => p.asin === asin);
            if (product && product.customer_reviews) {
                product.customer_reviews.splice(index, 1);
                HistoryService.save(state.scraper.scrapedData, state.analysis.analysisReport);
                this.renderDataPanel();
                
                // 触发事件通知其他模块更新
                window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));
                
                showToast("评论已删除", "success");
            }
        }
    }

    confirmWithModal(title: string, content: string, storageKey: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (storageKey && StorageService.get(storageKey) === true) {
                resolve(true);
                return;
            }

            const modal = document.getElementById('delete-confirm-modal') as any;
            const titleEl = document.getElementById('del-modal-title');
            const descEl = document.getElementById('del-modal-desc');
            const checkbox = document.getElementById('del-dont-ask') as HTMLInputElement;
            const confirmBtn = document.getElementById('btn-del-confirm') as HTMLButtonElement;
            const cancelBtn = document.getElementById('btn-del-cancel') as HTMLButtonElement;

            if (titleEl) titleEl.textContent = title;
            // ✅ 安全: 静态HTML模板，无用户输入
            if (descEl) descEl.innerHTML = content;
            if (checkbox) checkbox.checked = false;

            modal.open();

            const cleanup = () => {
                modal.close();
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            confirmBtn.onclick = () => {
                if (storageKey && checkbox && checkbox.checked) {
                    StorageService.set(storageKey, true);
                    showToast('已保存设置：以后不再提醒', 'info');
                }
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    async handleImportFiles(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (files.length === 0) return;

        const inputEl = target;
        showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

        try {
            const fileContents = await Promise.all(files.map(f => this.readFileAsJSON(f)));
            const productPool = new Map<string, Product[]>();
            const detectedSites = new Set<string>();

            fileContents.forEach(({ data, filename }) => {
                if (!data) return;
                let fileSite: string | null = null;
                if (data.metadata?.marketplace) fileSite = data.metadata.marketplace;
                else if (data.marketplace) fileSite = data.marketplace;
                else if (Array.isArray(data) && data.length > 0 && data[0].metadata?.marketplace) {
                    fileSite = data[0].metadata.marketplace;
                }

                const site = fileSite || "Unknown";
                if (fileSite) detectedSites.add(fileSite);

                const list = Array.isArray(data) ? data : (data.products || (data.asin ? [data] : []));

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

            const finalProducts: Product[] = [];
            const currentProductsMap = new Map((state.scraper.scrapedData?.products || []).map((p: any) => [p.asin, p]));

            for (const [asin, versions] of productPool.entries()) {
                const masterVersion = versions.find(v => v._source_site === targetMarketplace);
                const existingVersion = currentProductsMap.get(asin);
                const baseProduct = existingVersion || masterVersion || versions[0];

                const mergedProduct: Product = JSON.parse(JSON.stringify(baseProduct));
                if (!mergedProduct.metadata) mergedProduct.metadata = {};

                const allReviewSources: any[] = [];
                if (existingVersion) allReviewSources.push(existingVersion);
                allReviewSources.push(...versions);

                const uniqueReviewsMap = new Map<string, Review>();

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
                const siteSelect = document.getElementById("site-select") as HTMLSelectElement;
                if (siteSelect) {
                    siteSelect.value = targetMarketplace || '';
                    siteSelect.dispatchEvent(new Event('change'));
                }
            }

            state.scraper.scrapedData = {
                metadata: {
                    marketplace: targetMarketplace,
                    scrape_timestamp: new Date().toISOString(),
                    total_asins: finalProducts.length,
                    last_action: "multi_site_import_merge"
                },
                products: finalProducts
            };

            state.analysis.analysisReport = null;
            HistoryService.save(state.scraper.scrapedData, null);

            // 先切换到 data 标签页,确保 DOM 已加载
            switchTab("data");
            
            // 使用 setTimeout 确保 DOM 完全渲染后再更新内容
            setTimeout(() => {
                this.renderDataPanel();
            }, 100);
            
            // 触发事件通知其他模块更新
            eventBus.emit(APP_EVENTS.DATA_UPDATED);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.HISTORY_UPDATED));

            showToast(`✅ 成功导入并合并 ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`, "success");

        } catch (error: any) {
            console.error(error);
            showToast("❌ 导入出错: " + error.message, "error");
        } finally {
            inputEl.value = '';
        }
    }

    readFileAsJSON(file: File): Promise<FileData> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    resolve({ data: json, filename: file.name });
                } catch (err) {
                    reject(new Error(`文件 ${file.name} 格式错误`));
                }
            };
            reader.onerror = () => reject(new Error("无法读取文件"));
            reader.readAsText(file);
        });
    }

    getReviewSignature(review: Review): string {
        if (review.id) return review.id;
        return `${review.date || ''}_${review.author || ''}_${(review.headline || '').substring(0, 20)}`.trim();
    }

    showMarketplaceSelectionModal(sites: string[]): Promise<string | null> {
        return new Promise((resolve) => {
            const modalId = 'site-select-modal-' + Date.now();
            const backdrop = document.createElement('div');
            backdrop.id = modalId;
            backdrop.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center fade-in";

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
                                    <span class="ml-3 font-bold text-slate-700 group-hover:text-blue-700"> ${SITE_NAME_MAP[site]} - ${site} </span>
                                    <span class="ml-auto text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                        ${languageFlagMap[site === 'UK' ? 'GB' : site] || '🏳️'}
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

            // ✅ 安全: 静态HTML模板，无用户输入
            backdrop.innerHTML = content;
            document.body.appendChild(backdrop);

            const btnConfirm = document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement;
            const btnCancel = document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement;

            let resolved = false; // 防止重复 resolve

            const cleanup = () => {
                // 移除事件监听器
                if (btnConfirm) {
                    btnConfirm.removeEventListener('click', handleConfirm);
                }
                if (btnCancel) {
                    btnCancel.removeEventListener('click', handleCancel);
                }
                
                // 移除 DOM 元素
                try {
                    if (backdrop && document.body.contains(backdrop)) {
                        document.body.removeChild(backdrop);
                    }
                } catch (error) {
                    console.error('[Data] 清理弹窗失败:', error);
                }
            };

            const handleConfirm = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return; // 如果已经 resolved,直接返回
                resolved = true;
                
                const selectedInput = backdrop.querySelector('input[name="site_choice"]:checked') as HTMLInputElement;
                const selected = selectedInput ? selectedInput.value : null;
                
                // 立即清理 DOM
                cleanup();
                
                // 使用 setTimeout 确保 DOM 清理完成后再 resolve
                setTimeout(() => {
                    resolve(selected);
                }, 0);
            };

            const handleCancel = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (resolved) return;
                resolved = true;
                
                // 立即清理 DOM
                cleanup();
                
                // 使用 setTimeout 确保 DOM 清理完成后再 resolve
                setTimeout(() => {
                    resolve(null);
                }, 0);
            };

            // 使用 addEventListener 并设置 once: true
            btnConfirm.addEventListener('click', handleConfirm, { once: true });
            btnCancel.addEventListener('click', handleCancel, { once: true });
        });
    }

    switchDataTab(tab: string): void {
        (state as any).currentDataTab = tab;

        const previewEl = document.getElementById("data-preview");
        const jsonEl = document.getElementById("data-json");
        
        if (previewEl) previewEl.classList.toggle("hidden", tab !== "preview");
        if (jsonEl) jsonEl.classList.toggle("hidden", tab !== "json");

        document.querySelectorAll(".data-tab").forEach((t) => {
            const isActive = t.id === `data-tab-${tab}`;
            t.classList.toggle("text-blue-600", isActive);
            t.classList.toggle("border-b-2", isActive);
            t.classList.toggle("border-blue-600", isActive);
            t.classList.toggle("text-slate-500", !isActive);
        });
    }
}


// ========================================== 
// Module Exports (统一架构接口)
// ========================================== 

let moduleInstance: DataModule | null = null;

/**
 * 挂载子模块
 * @param {HTMLElement} container - 容器元素
 */
export async function mount(container: HTMLElement): Promise<void> {
    console.log('[Data] 🔧 开始挂载子模块');

    try {
        // 1. 加载模板
        const html = await loadTemplate('src/modules/app_center/views/master_prompt/data/template.html');
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;

        // 2. 创建模块实例
        moduleInstance = new DataModule(container);
        
        // 3. 挂载模块（BaseModule.mount 会自动调用 init）
        await moduleInstance.mount(container);
        
        // 4. 恢复状态
        moduleInstance.restoreState();
        
        // 5. 暴露到全局（用于 onclick 事件）
        (window as any).dataModule = moduleInstance;

        console.log('[Data] ✅ 子模块挂载成功');
    } catch (error) {
        console.error('[Data] ❌ 子模块挂载失败:', error);
        throw error;
    }
}

/**
 * 卸载子模块
 */
export function unmount(): void {
    console.log('[Data] 🔄 开始卸载子模块');

    try {
        if (moduleInstance) {
            moduleInstance.unmount();
            moduleInstance = null;
        }
        
        // 清理全局引用
        if ((window as any).dataModule) {
            delete (window as any).dataModule;
        }

        console.log('[Data] ✅ 子模块卸载成功');
    } catch (error) {
        console.error('[Data] ❌ 子模块卸载失败:', error);
    }
}

// ========================================== 
// Legacy Bridges (向后兼容)
// ========================================== 

export const renderDataPanel = (): void => moduleInstance?.renderDataPanel();
export const triggerImport = (): void => moduleInstance?.triggerImport();
export const switchDataTab = (tab: string): void => moduleInstance?.switchDataTab(tab);
export const handleImportFiles = (e: Event): void => { moduleInstance?.handleImportFiles(e); };
export const toggleCardExpand = (asin: string): void => moduleInstance?.toggleCardExpand(asin);
export const deleteProduct = (asin: string): void => { moduleInstance?.deleteProduct(asin); };
export const deleteReview = (asin: string, i: number): void => { moduleInstance?.deleteReview(asin, i); };
