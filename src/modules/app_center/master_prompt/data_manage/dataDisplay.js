// src/modules/master_prompt/data_manage/dataDisplay.js
import BaseModule from "../../../../common/BaseModule.js";
import state from "../../../../common/state.js";
import { getErrorSummary, showToast, switchTab } from "../../../../common/utils/ui.js";
import { HistoryService } from "../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { updateAsinSelectList } from "../analysis/analysisDisplay.js";
import { StorageService } from "../../../../services/storageService.js";
import { languageFlagMap, SITE_NAME_MAP, SITE_DOMAIN_MAP } from "../../../../common/constants/constants.js";
import { registerActionsWithLegacy } from "../../../../common/utils/actionRegistry.js";
import eventBus from "../../../../common/EventBus.js"; // [NEW] Import EventBus
import { EVENTS } from "../../../../common/constants/eventConstants.js";

class DataModule extends BaseModule {
    constructor() {
        super('master_prompt_data');
        this.registerGlobalActions();
    }

    async render() {
        // Assume HTML is preloaded
    }

    async init() {
        console.log("🚀 Data Module Initialized (BaseModule)");
        this.setupEventListeners();

        // [NEW] Subscribe to Scraper Events
        this.addDisposable(eventBus.on(EVENTS.SCRAPE_COMPLETE, (data) => {
            console.log("DataModule received SCRAPE_COMPLETE");
            this.renderDataPanel();
        }));

        if (state.scrapedData) {
            this.renderDataPanel();
        }
    }

    onUnmount() {
        console.log("💤 Data Module Unmounting...");
    }

    setupEventListeners() {
        // Import input change
        const importInput = document.getElementById("import-file-input");
        if (importInput) {
            this.addEventListener(importInput, "change", (e) => this.handleImportFiles(e));
        }
    }

    // ================== Logic Methods ==================

    toggleCardExpand(asin) {
        const cardBody = document.getElementById(`card-body-${asin}`);
        const cardIcon = document.getElementById(`card-icon-${asin}`);
        const cardContainer = document.getElementById(`card-${asin}`);

        if (!cardBody) return;

        const isCurrentlyHidden = cardBody.classList.contains("hidden");

        if (isCurrentlyHidden) {
            if (state.expandedAsin && state.expandedAsin !== asin) {
                const prevBody = document.getElementById(`card-body-${state.expandedAsin}`);
                const prevIcon = document.getElementById(`card-icon-${state.expandedAsin}`);
                const prevContainer = document.getElementById(`card-${state.expandedAsin}`);

                if (prevBody) prevBody.classList.add("hidden");
                if (prevIcon) prevIcon.classList.remove("rotate-180");
                if (prevContainer) prevContainer.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
            }

            cardBody.classList.remove("hidden");
            cardBody.classList.add("fade-in");
            cardContainer.classList.add("ring-1", "ring-blue-500", "bg-blue-50/30");
            if (cardIcon) cardIcon.classList.add("rotate-180");

            state.expandedAsin = asin;
        } else {
            cardBody.classList.add("hidden");
            cardContainer.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
            if (cardIcon) cardIcon.classList.remove("rotate-180");

            state.expandedAsin = null;
        }
    }

    triggerImport() {
        const input = document.getElementById("import-file-input");
        if (input) {
            input.value = "";
            input.click();
        }
    }

    renderDataPanel() {
        if (!state.scrapedData) return;

        const noDataMsg = document.getElementById("no-data-msg");
        const cardsEl = document.getElementById("data-cards");

        if (!state.scrapedData.products || state.scrapedData.products.length === 0) {
            if (noDataMsg) noDataMsg.classList.remove("hidden");
            if (cardsEl) cardsEl.classList.add("hidden");
            return;
        }

        if (noDataMsg) noDataMsg.classList.add("hidden");
        if (cardsEl) cardsEl.classList.remove("hidden");

        const globalSiteCode = state.scrapedData.metadata?.marketplace || state.selectedSite;

        cardsEl.innerHTML = state.scrapedData.products.map((p) => {
            const isExpanded = state.expandedAsin === p.asin;
            let siteKey = globalSiteCode || p.language || "US";
            if (siteKey === 'UK') siteKey = 'GB';
            const flag = languageFlagMap[siteKey] || "🌐";

            // const domain = SITE_DOMAIN_MAP[siteKey] || "";

            const statusConfig = {
                success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
                partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
                failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
            };
            const status = statusConfig[p.scrape_status] || statusConfig.partial;
            /* <span class="text-2xl w-10 h-10 bg-gradient-to-br from-black-500 to-white-600 rounded-xl flex items-center justify-center shadow-md">${flag}</span> */
            return `
                <div id="card-${p.asin}" 
                     class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md 
                    ${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}" 
                    onclick="window.toggleCardExpand('${p.asin}')">
                    
                    <button onclick="event.stopPropagation(); window.deleteProduct('${p.asin}')" 
                        class="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all z-30"
                        title="彻底删除该 ASIN">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                    
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-black-500 to-white-600 rounded-xl flex items-center justify-center shadow-md">${flag}</span>
                            
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-mono text-base font-bold text-slate-800 tracking-tight">${p.asin}</span>
                                    <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.class}">
                                        <i class="fas ${status.icon}"></i> ${status.text}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3 text-xs font-medium text-slate-500">
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-brands fa-amazon text-yellow-500"></i>${SITE_DOMAIN_MAP[siteKey]}</span>
                                <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-solid fa-heading"></i> </span>
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
                                    ${p.feature_bullets.map((b, i) => `
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
                                    ${(p.customer_reviews || []).map((review, i) => `
                                        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group/review relative hover:border-purple-200 hover:shadow-md transition-all">
                                            <button onclick="window.deleteReview('${p.asin}', ${i})" 
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
                            <a href="${p.url}" target="_blank" class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">
                                <span>查看原始页面</span> <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        const jsonDisplay = document.getElementById("json-display");
        if (jsonDisplay) {
            jsonDisplay.innerHTML = this.syntaxHighlight(JSON.stringify(state.scrapedData, null, 2));
        }
    }

    renderStars(rating) {
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

    syntaxHighlight(json) {
        return json.replace(
            /("(\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
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

    async deleteProduct(asin) {
        // [MODIFIED] 使用更清晰的HTML结构
        const confirmed = await this.confirmWithModal(
            `删除产品`,
            `确定删除 ASIN: <span class="font-bold text-red-600 bg-red-50 px-1 rounded">${asin}</span> 及其所有数据吗？<br/><span class="text-xs text-red-400 mt-1 block">此操作无法撤销</span>`,
            "ignore_del_prod_confirm"
        );

        if (!confirmed) return;

        state.scrapedData.products = state.scrapedData.products.filter(p => p.asin !== asin);
        state.scrapedData.metadata.total_asins = state.scrapedData.products.length;

        HistoryService.save(state.scrapedData, state.analysisReport);

        this.renderDataPanel();
        updateAsinSelectList();
        renderHistory();

        showToast(`ASIN ${asin} 已移除`, "info");
    }

    async deleteReview(asin, index) {
        // [MODIFIED] 微调提示文案
        const confirmed = await this.confirmWithModal(
            "删除评论",
            '确定删除这条Review吗？',
            "ignore_del_review_confirm"
        );

        if (!confirmed) return;

        const product = state.scrapedData.products.find((p) => p.asin === asin);
        if (product && product.customer_reviews) {
            product.customer_reviews.splice(index, 1);
            HistoryService.save(state.scrapedData, state.analysisReport);
            this.renderDataPanel();
            renderHistory();
            showToast("评论已删除", "success");
        }
    }

    confirmWithModal(title, content, storageKey) {
        return new Promise((resolve) => {
            if (storageKey && StorageService.get(storageKey) === true) {
                resolve(true);
                return;
            }

            const modal = document.getElementById('delete-confirm-modal');

            // [MODIFIED] 由于使用了 no-header 模式，我们需要手动设置 Body 内部的 Title 元素
            const titleEl = document.getElementById('del-modal-title');
            const descEl = document.getElementById('del-modal-desc');

            const checkbox = document.getElementById('del-dont-ask');
            const confirmBtn = document.getElementById('btn-del-confirm');
            const cancelBtn = document.getElementById('btn-del-cancel');

            // 设置标题和内容
            if (titleEl) titleEl.textContent = title;
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

    async handleImportFiles(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const inputEl = event.target;
        showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

        try {
            const fileContents = await Promise.all(files.map(f => this.readFileAsJSON(f)));
            const productPool = new Map();
            const detectedSites = new Set();

            fileContents.forEach(({ data, filename }) => {
                if (!data) return;
                let fileSite = null;
                if (data.metadata?.marketplace) fileSite = data.metadata.marketplace;
                else if (data.marketplace) fileSite = data.marketplace;
                else if (Array.isArray(data) && data.length > 0 && data[0].metadata?.marketplace) {
                    fileSite = data[0].metadata.marketplace;
                }

                const site = fileSite || "Unknown";
                if (fileSite) detectedSites.add(fileSite);

                const list = Array.isArray(data) ? data : (data.products || (data.asin ? [data] : []));

                list.forEach(p => {
                    if (!p.asin) return;
                    if (!productPool.has(p.asin)) {
                        productPool.set(p.asin, []);
                    }
                    productPool.get(p.asin).push({
                        ...p,
                        _source_site: site,
                        _filename: filename
                    });
                });
            });

            if (productPool.size === 0) throw new Error("未找到有效的产品数据");

            let targetMarketplace = state.selectedSite;
            const hasExistingData = state.scrapedData && state.scrapedData.products && state.scrapedData.products.length > 0;

            if (!hasExistingData && detectedSites.size > 1) {
                targetMarketplace = await this.showMarketplaceSelectionModal([...detectedSites]);
                if (!targetMarketplace) {
                    showToast("用户取消导入", "info");
                    return;
                }
            } else if (!hasExistingData && detectedSites.size === 1) {
                targetMarketplace = [...detectedSites][0];
            } else if (hasExistingData) {
                targetMarketplace = state.scrapedData.metadata.marketplace;
            }

            const finalProducts = [];
            const currentProductsMap = new Map((state.scrapedData?.products || []).map(p => [p.asin, p]));

            for (const [asin, versions] of productPool.entries()) {
                let masterVersion = versions.find(v => v._source_site === targetMarketplace);
                const existingVersion = currentProductsMap.get(asin);
                let baseProduct = existingVersion || masterVersion || versions[0];

                const mergedProduct = JSON.parse(JSON.stringify(baseProduct));
                if (!mergedProduct.metadata) mergedProduct.metadata = {};

                const allReviewSources = [];
                if (existingVersion) allReviewSources.push(existingVersion);
                allReviewSources.push(...versions);

                const uniqueReviewsMap = new Map();

                allReviewSources.forEach(ver => {
                    if (Array.isArray(ver.customer_reviews)) {
                        ver.customer_reviews.forEach(r => {
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
                state.selectedSite = targetMarketplace;
                const siteSelect = document.getElementById("site-select");
                if (siteSelect) {
                    siteSelect.value = targetMarketplace;
                    siteSelect.dispatchEvent(new Event('change'));
                }
            }

            state.scrapedData = {
                metadata: {
                    marketplace: targetMarketplace,
                    scrape_timestamp: new Date().toISOString(),
                    total_asins: finalProducts.length,
                    last_action: "multi_site_import_merge"
                },
                products: finalProducts
            };

            state.analysisReport = null;
            HistoryService.save(state.scrapedData, null);

            this.renderDataPanel();
            updateAsinSelectList();
            renderHistory();
            switchTab("data");

            showToast(`✅ 成功导入并合并 ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`, "success");

        } catch (error) {
            console.error(error);
            showToast("❌ 导入出错: " + error.message, "error");
        } finally {
            inputEl.value = '';
        }
    }

    readFileAsJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    resolve({ data: json, filename: file.name });
                } catch (err) {
                    reject(new Error(`文件 ${file.name} 格式错误`));
                }
            };
            reader.onerror = () => reject(new Error("无法读取文件"));
            reader.readAsText(file);
        });
    }

    getReviewSignature(review) {
        if (review.id) return review.id;
        return `${review.date || ''}_${review.author || ''}_${(review.headline || '').substring(0, 20)}`.trim();
    }

    showMarketplaceSelectionModal(sites) {
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

            backdrop.innerHTML = content;
            document.body.appendChild(backdrop);

            const btnConfirm = document.getElementById(`btn-confirm-${modalId}`);
            const btnCancel = document.getElementById(`btn-cancel-${modalId}`);

            btnConfirm.onclick = () => {
                try {
                    const selectedInput = backdrop.querySelector('input[name="site_choice"]:checked');
                    const selected = selectedInput ? selectedInput.value : null;

                    // 1. Force cleanup immediately to ensure modal closes
                    cleanup();

                    if (selected) {
                        // 2. Use setTimeout to allow UI to repaint (close modal) before resolving
                        // which might trigger heavy processing in the main loop
                        setTimeout(() => {
                            resolve(selected);
                        }, 10);
                    } else {
                        console.warn("No site selected");
                        // If nothing selected, maybe we should not resolve or resolve null?
                        // But for now, let's just log. If we resolved null, it would cancel import.
                        // Given one radio is always checked (index 0), this is edge case.
                        // We choose to abort if something is weirdly wrong.
                        resolve(null);
                    }
                } catch (e) {
                    console.error("Error in modal confirm:", e);
                    cleanup();
                    resolve(null);
                }
            };

            btnCancel.onclick = () => {
                cleanup();
                resolve(null);
            };

            function cleanup() {
                // Ensure we only try to remove if it's still attached
                if (backdrop && backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }
            }
        });
    }

    switchDataTab(tab) {
        state.currentDataTab = tab;

        document.getElementById("data-preview").classList.toggle("hidden", tab !== "preview");
        document.getElementById("data-json").classList.toggle("hidden", tab !== "json");

        document.querySelectorAll(".data-tab").forEach((t) => {
            const isActive = t.id === `data-tab-${tab}`;
            t.classList.toggle("text-blue-600", isActive);
            t.classList.toggle("border-b-2", isActive);
            t.classList.toggle("border-blue-600", isActive);
            t.classList.toggle("text-slate-500", !isActive);
        });
    }

    registerGlobalActions() {
        registerActionsWithLegacy({
            toggleCardExpand: (asin) => this.toggleCardExpand(asin),
            triggerImport: () => this.triggerImport(),
            handleImportFiles: (e) => this.handleImportFiles(e),
            deleteReview: (asin, i) => this.deleteReview(asin, i),
            renderDataPanel: () => this.renderDataPanel(),
            deleteProduct: (asin) => this.deleteProduct(asin),
            switchDataTab: (tab) => this.switchDataTab(tab),
        });
    }
}

const instance = new DataModule();

// ================== Bootstrap ==================

window.addEventListener('app:route-changed', (e) => {
    const { routeId } = e.detail;
    const container = document.getElementById('panel-data');

    if (routeId === 'data') {
        if (!instance._isMounted && container) instance.mount(container);
    } else {
        if (instance._isMounted) instance.unmount();
    }
});

// ================== Exports ==================

export const renderDataPanel = () => instance.renderDataPanel();
export const triggerImport = () => instance.triggerImport();
export const switchDataTab = (tab) => instance.switchDataTab(tab);
export const handleImportFiles = (e) => instance.handleImportFiles(e);
export const toggleCardExpand = (asin) => instance.toggleCardExpand(asin);
export const deleteProduct = (asin) => instance.deleteProduct(asin);
export const deleteReview = (asin, i) => instance.deleteReview(asin, i);