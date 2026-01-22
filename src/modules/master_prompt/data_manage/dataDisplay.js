// src/ui/dataDisplay.js
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService
// ================================================================

import state from "../../../common/state.js";
import { getErrorSummary, showToast, switchTab } from "../../../common/utils/ui.js";
import { HistoryService } from "../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { updateAsinSelectList } from "../analysis/analysisDisplay.js";
import { StorageService } from "../../../services/storageService.js";

import { languageFlagMap } from "../../../common/constants/constants.js";
// ==========================================
// 1. 基础 UI 交互
// ==========================================

// 优化后的 toggleCardExpand
export function toggleCardExpand(asin) {
    // 1. 获取当前点击的元素
    const cardBody = document.getElementById(`card-body-${asin}`);
    const cardIcon = document.getElementById(`card-icon-${asin}`);
    const cardContainer = document.getElementById(`card-${asin}`);

    if (!cardBody) return;

    // 2. 判断当前是否已展开（这里用 DOM 状态判断更直接）
    // 注意：这里假设 'hidden' 类存在即为收起
    const isCurrentlyHidden = cardBody.classList.contains("hidden");

    // 3. 核心逻辑：如果是要展开，先关闭之前所有打开的（手风琴模式）
    if (isCurrentlyHidden) {
        // --- 关闭上一个 (如果有) ---
        if (state.expandedAsin && state.expandedAsin !== asin) {
            const prevBody = document.getElementById(`card-body-${state.expandedAsin}`);
            const prevIcon = document.getElementById(`card-icon-${state.expandedAsin}`);
            const prevContainer = document.getElementById(`card-${state.expandedAsin}`);

            if (prevBody) prevBody.classList.add("hidden");
            if (prevIcon) prevIcon.classList.remove("rotate-180");
            if (prevContainer) prevContainer.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
        }

        // --- 展开当前 ---
        cardBody.classList.remove("hidden");
        cardBody.classList.add("fade-in");
        cardContainer.classList.add("ring-1", "ring-blue-500", "bg-blue-50/30");
        if (cardIcon) cardIcon.classList.add("rotate-180");

        // 更新状态
        state.expandedAsin = asin;

    } else {
        // --- 收起当前 ---
        cardBody.classList.add("hidden");
        cardContainer.classList.remove("ring-1", "ring-blue-500", "bg-blue-50/30");
        if (cardIcon) cardIcon.classList.remove("rotate-180");

        // 更新状态
        state.expandedAsin = null;
    }
}

export function triggerImport() {
    // 重置并触发文件选择
    const input = document.getElementById("import-file-input");
    if (input) {
        input.value = "";
        input.click();
    }
}

// ==========================================
// 2. 核心渲染函数
// ==========================================

export function renderDataPanel() {
    // 1. 安全检查：如果没有数据，直接返回
    if (!state.scrapedData) return;

    const noDataMsg = document.getElementById("no-data-msg");
    const cardsEl = document.getElementById("data-cards");

    // 2. 无数据界面处理
    if (!state.scrapedData.products || state.scrapedData.products.length === 0) {
        if (noDataMsg) noDataMsg.classList.remove("hidden");
        if (cardsEl) cardsEl.classList.add("hidden");
        return;
    }

    if (noDataMsg) noDataMsg.classList.add("hidden");
    if (cardsEl) cardsEl.classList.remove("hidden");

    // 3. 获取全局站点代码
    const globalSiteCode = state.scrapedData.metadata?.marketplace || state.selectedSite;

    // 4. 生成 HTML 列表
    cardsEl.innerHTML = state.scrapedData.products
        .map((p) => {
            const isExpanded = state.expandedAsin === p.asin;

            // --- 内部逻辑：计算国旗 ---
            let siteKey = globalSiteCode || p.language || "US";
            if (siteKey === 'UK') siteKey = 'GB';
            const flag = languageFlagMap[siteKey] || "🌐";

            // --- 内部逻辑：渲染星星 (完整版) ---
            const renderStars = (rating) => {
                if (!rating) return "";
                return `<div class="flex items-center gap-0.5 text-sm" title="${rating} 星">
                    ${[1, 2, 3, 4, 5].map((star) => {
                    if (rating >= star) return '<i class="fas fa-star text-amber-400"></i>';
                    if (rating >= star - 0.5) return '<i class="fas fa-star-half-alt text-amber-400"></i>';
                    return '<i class="far fa-star text-slate-300"></i>';
                }).join("")}
                    <span class="text-xs text-slate-500 ml-1 font-mono pt-0.5">${rating}</span>
                </div>`;
            };

            // --- 内部逻辑：状态配置 (完整版) ---
            const statusConfig = {
                success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
                partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
                failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
            };
            // 这里加了防御性编程：如果没有 scrape_status，默认视为 partial
            const status = statusConfig[p.scrape_status] || statusConfig.partial;

            return `
        <div id="card-${p.asin}" 
             class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md 
            ${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}" 
            onclick="toggleCardExpand('${p.asin}')">
            
            <button onclick="event.stopPropagation(); window.deleteProduct('${p.asin}')" 
                class="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all z-30"
                title="彻底删除该 ASIN">
                <i class="fas fa-times text-xs"></i>
            </button>
            
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span class="text-2xl w-10 h-10 bg-gradient-to-br from-black-500 to-white-600 rounded-xl flex items-center justify-center shadow-md">${flag}</span>
                    
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
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm">
                            <i class="fa-brands fa-font-awesome text-yellow-500"></i> 
                        </span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm">
                            <i class="fas fa-list-ul text-blue-500"></i> ${p.feature_bullets.length}
                        </span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm">
                            <i class="fas fa-comments text-purple-500"></i> ${(p.customer_reviews || []).length}
                        </span>
                    </div>
                    <span class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                        <i id="card-icon-${p.asin}" class="fas fa-chevron-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}"></i>
                    </span>
                </div>
            </div>
            
            <div class="mb-2">
                <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <i class="fa-brands fa-font-awesome text-yellow-500"></i> 标题
                </h5>
                <h4 class="text-sm font-medium text-slate-700 leading-relaxed ${isExpanded ? "" : "line-clamp-1"}">
                    ${p.productTitle || "<span class='text-slate-400 italic'>(无标题)</span>"}
                </h4>
            </div>
            
            ${p.error ? `
                <div class="flex items-start gap-2 text-xs text-red-600 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <i class="fas fa-bug mt-0.5"></i>
                    <span>${getErrorSummary(p.error) || p.error}</span>
                </div>` : ""
                }
            
            <div id="card-body-${p.asin}" 
                 class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in ${isExpanded ? '' : 'hidden'}" 
                 onclick="event.stopPropagation()">
                    <div>
                        <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-list-ul text-blue-500"></i> 五点描述
                        </h5>
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
                                                ${renderStars(review.star_rating)}
                                            </div>
                                            ${(review.is_verified || review.isVerified) ? `
                                                <span class="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                                                    <i class="fas fa-check-circle"></i> Verified Purchase
                                                </span>` : ""
                    }
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

    // 5. 同步更新 JSON 视图
    const jsonDisplay = document.getElementById("json-display");
    if (jsonDisplay) {
        jsonDisplay.innerHTML = syntaxHighlight(JSON.stringify(state.scrapedData, null, 2));
    }
}

function syntaxHighlight(json) {
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
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

// ==========================================
// 3. 删除逻辑 (带弹窗 & 关闭图标)
// ==========================================

export async function deleteProduct(asin) {
    const confirmed = await confirmWithModal(
        "确定删除",
        `ASIN: <span class="font-bold text-red-500">${asin}</span> 及其所有数据吗？`,
        "ignore_del_prod_confirm"
    );

    if (!confirmed) return;

    state.scrapedData.products = state.scrapedData.products.filter(p => p.asin !== asin);
    state.scrapedData.metadata.total_asins = state.scrapedData.products.length;

    HistoryService.save(state.scrapedData, state.analysisReport);

    renderDataPanel();
    updateAsinSelectList();
    renderHistory();

    showToast(`ASIN ${asin} 已移除`, "info");
}

export async function deleteReview(asin, index) {
    const confirmed = await confirmWithModal(
        "确定要移除这条评论吗？",
        '',
        "ignore_del_review_confirm"
    );

    if (!confirmed) return;

    const product = state.scrapedData.products.find((p) => p.asin === asin);
    if (product && product.customer_reviews) {
        product.customer_reviews.splice(index, 1);

        HistoryService.save(state.scrapedData, state.analysisReport);

        renderDataPanel();
        renderHistory();

        showToast("评论已删除", "success");
    }
}

/**
 * 通用删除确认逻辑 (支持"不再提醒" + ✅ 右上角关闭图标)
 */
function confirmWithModal(title, content, storageKey) {
    return new Promise((resolve) => {
        // 使用 StorageService 检查“不再提醒”设置
        if (storageKey && StorageService.get(storageKey) === true) {
            resolve(true);
            return;
        }

        const modal = document.getElementById('delete-confirm-modal');
        const titleEl = document.getElementById('del-modal-title');
        const descEl = document.getElementById('del-modal-desc');
        const checkbox = document.getElementById('del-dont-ask');
        const confirmBtn = document.getElementById('btn-del-confirm');
        const cancelBtn = document.getElementById('btn-del-cancel');

        titleEl.textContent = title;
        descEl.innerHTML = content;
        checkbox.checked = false;

        modal.classList.remove('hidden');

        // ✅ 新增：处理右上角关闭图标
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            if (closeIconBtn) closeIconBtn.onclick = null;
        };

        // 动态查找或注入关闭图标
        let contentContainer = modal.querySelector('.bg-white') || modal.firstElementChild;
        let closeIconBtn = contentContainer.querySelector('.js-modal-close-icon');

        if (!closeIconBtn && contentContainer) {
            closeIconBtn = document.createElement('button');
            closeIconBtn.className = 'js-modal-close-icon absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 z-50';
            closeIconBtn.innerHTML = '<i class="fas fa-times"></i>';
            const style = window.getComputedStyle(contentContainer);
            if (style.position === 'static') contentContainer.style.position = 'relative';
            contentContainer.appendChild(closeIconBtn);
        }

        if (closeIconBtn) {
            closeIconBtn.onclick = () => {
                cleanup();
                resolve(false);
            }
        }

        confirmBtn.onclick = () => {
            if (storageKey && checkbox.checked) {
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

// ==========================================
// 4. 导入与合并逻辑 (Import Logic)
// ==========================================

// 辅助：评论去重签名
function getReviewSignature(review) {
    if (review.id) return review.id;
    // 如果没有ID，用 内容+作者+日期 生成一个哈希指纹
    return `${review.date || ''}_${review.author || ''}_${(review.headline || '').substring(0, 20)}`.trim();
}

/**
 * 🔥 新增：多站点冲突选择模态框
 * 动态生成 HTML 插入页面，用户选择后返回 Promise
 */
function showMarketplaceSelectionModal(sites) {
    return new Promise((resolve) => {
        // 1. 创建临时的 Modal DOM
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
                        请选择一个 <span class="text-blue-600 font-bold">主站点</span>。
                        <br/><span class="text-xs text-slate-400 font-normal">我们将保留该站点的标题和描述，并自动合并其他站点的评论。</span>
                    </p>
                    
                    <div class="space-y-3 mb-6">
                        ${sites.map((site, index) => `
                            <label class="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <input type="radio" name="site_choice" value="${site}" ${index === 0 ? 'checked' : ''} 
                                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                                <span class="ml-3 font-bold text-slate-700 group-hover:text-blue-700">${site}</span>
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

        // 2. 绑定事件
        const btnConfirm = document.getElementById(`btn-confirm-${modalId}`);
        const btnCancel = document.getElementById(`btn-cancel-${modalId}`);

        btnConfirm.onclick = () => {
            const selected = backdrop.querySelector('input[name="site_choice"]:checked').value;
            cleanup();
            resolve(selected);
        };

        btnCancel.onclick = () => {
            cleanup();
            resolve(null);
        };

        function cleanup() {
            document.body.removeChild(backdrop);
        }
    });
}


function mergeProducts(oldP, newP) {
    const merged = {
        ...oldP,
        ...newP,
        scrape_status: newP.scrape_status || oldP.scrape_status,
        metadata: { ...oldP.metadata, ...newP.metadata }
    };

    const oldReviews = Array.isArray(oldP.customer_reviews) ? oldP.customer_reviews : [];
    const newReviews = Array.isArray(newP.customer_reviews) ? newP.customer_reviews : [];

    const reviewMap = new Map();
    oldReviews.forEach(r => reviewMap.set(getReviewSignature(r), r));
    newReviews.forEach(r => reviewMap.set(getReviewSignature(r), r));

    merged.customer_reviews = Array.from(reviewMap.values());
    return merged;
}

function confirmConflictResolution(count) {
    return new Promise((resolve) => {
        const modal = document.getElementById('import-conflict-modal');
        const countSpan = document.getElementById('conflict-count');
        countSpan.innerText = count;
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
        };

        document.getElementById('btn-resolve-merge').onclick = () => { cleanup(); resolve('merge'); };
        document.getElementById('btn-resolve-overwrite').onclick = () => { cleanup(); resolve('overwrite'); };
        document.getElementById('btn-resolve-skip').onclick = () => { cleanup(); resolve('skip'); };
    });
}

/**
 * 弹出简单的警告/确认框 (复用删除模态框的UI结构)
 * 用于站点不匹配时的阻断提示
 */
function confirmSimple(title, content) {
    return new Promise((resolve) => {
        const modal = document.getElementById('delete-confirm-modal');
        const titleEl = document.getElementById('del-modal-title');
        const descEl = document.getElementById('del-modal-desc');
        const checkboxContainer = document.getElementById('del-dont-ask').parentNode;
        const confirmBtn = document.getElementById('btn-del-confirm');
        const cancelBtn = document.getElementById('btn-del-cancel');

        titleEl.textContent = title;
        descEl.innerHTML = content;

        checkboxContainer.classList.add('hidden');
        confirmBtn.textContent = "确认继续";

        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            checkboxContainer.classList.remove('hidden');
            confirmBtn.textContent = "确认删除";
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
}

// ==========================================
// 🔥 核心升级：跨站点智能合并导入逻辑
// ==========================================

export async function handleImportFiles(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const inputEl = event.target;
    showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

    try {
        // 1. 读取所有文件内容
        const fileContents = await Promise.all(files.map(f => readFileAsJSON(f)));

        // 2. 预处理：将所有文件打平为“待处理产品池”
        //    结构：Map<ASIN, Array<ProductObject>>
        const productPool = new Map();
        const detectedSites = new Set();

        fileContents.forEach(({ data, filename }) => {
            if (!data) return;

            // 提取站点信息
            let fileSite = null;
            if (data.metadata?.marketplace) fileSite = data.metadata.marketplace;
            else if (data.marketplace) fileSite = data.marketplace;
            else if (Array.isArray(data) && data.length > 0 && data[0].metadata?.marketplace) {
                fileSite = data[0].metadata.marketplace;
            }

            // 默认归类为 "Unknown" 以便处理
            const site = fileSite || "Unknown";
            if (fileSite) detectedSites.add(fileSite);

            // 提取产品数组
            const list = Array.isArray(data) ? data : (data.products || (data.asin ? [data] : []));

            list.forEach(p => {
                if (!p.asin) return;
                if (!productPool.has(p.asin)) {
                    productPool.set(p.asin, []);
                }
                // 给每个产品对象打上来源标记，方便后续合并
                productPool.get(p.asin).push({
                    ...p,
                    _source_site: site,
                    _filename: filename
                });
            });
        });

        if (productPool.size === 0) throw new Error("未找到有效的产品数据");

        // 3. 决策阶段：确定“主站点” (Master Marketplace)
        let targetMarketplace = state.selectedSite; // 默认为当前选择
        const hasExistingData = state.scrapedData && state.scrapedData.products && state.scrapedData.products.length > 0;

        // 场景 A: 项目为空，且导入了多个站点的数据 -> 让用户选
        if (!hasExistingData && detectedSites.size > 1) {
            targetMarketplace = await showMarketplaceSelectionModal([...detectedSites]);
            if (!targetMarketplace) {
                showToast("用户取消导入", "info");
                return; // 用户点击了取消
            }
        }
        // 场景 B: 项目为空，只有一个站点 -> 自动使用该站点
        else if (!hasExistingData && detectedSites.size === 1) {
            targetMarketplace = [...detectedSites][0];
        }
        // 场景 C: 项目已有数据 -> 强制使用项目原有站点 (保持一致性)
        else if (hasExistingData) {
            targetMarketplace = state.scrapedData.metadata.marketplace;
        }

        console.log(`[Import] Strategy: Merging content based on Master Site: ${targetMarketplace}`);

        // 4. 执行合并 (Merging Phase)
        const finalProducts = [];
        const currentProductsMap = new Map((state.scrapedData?.products || []).map(p => [p.asin, p]));

        for (const [asin, versions] of productPool.entries()) {
            // 4.1 找出“主版本” (用来定标题、五点、图片)
            // 优先找 targetMarketplace 的版本，找不到则找现有项目里的版本，再找不到就取第一个
            let masterVersion = versions.find(v => v._source_site === targetMarketplace);
            const existingVersion = currentProductsMap.get(asin);

            // 如果已有数据存在，通常以已有数据为主（避免覆盖用户修改），除非我们要实现“更新”逻辑
            // 这里逻辑：如果项目里有，以项目里为基准；如果项目里没有，以导入的主站点为基准；如果都没有，取第一个做兜底。
            let baseProduct = existingVersion || masterVersion || versions[0];

            // 4.2 深度克隆一个基础对象，准备缝合
            const mergedProduct = JSON.parse(JSON.stringify(baseProduct));

            // 确保 metadata 存在
            if (!mergedProduct.metadata) mergedProduct.metadata = {};

            // 4.3 评论大一统 (Review Aggregation)
            // 收集所有版本（包括现有的、导入的各个站点的）的所有评论
            const allReviewSources = [];
            if (existingVersion) allReviewSources.push(existingVersion);
            allReviewSources.push(...versions);

            const uniqueReviewsMap = new Map();

            allReviewSources.forEach(ver => {
                if (Array.isArray(ver.customer_reviews)) {
                    ver.customer_reviews.forEach(r => {
                        // 生成唯一签名防止重复
                        const sig = getReviewSignature(r);
                        // 如果 Map 里没有，或者 Map 里的是旧的/短的，可以考虑替换（这里简单处理：有就不加）
                        if (!uniqueReviewsMap.has(sig)) {
                            // 可选：给评论标记来源站点
                            if (ver._source_site && ver._source_site !== "Unknown") {
                                r._origin_site = ver._source_site;
                            }
                            uniqueReviewsMap.set(sig, r);
                        }
                    });
                }
            });

            mergedProduct.customer_reviews = Array.from(uniqueReviewsMap.values());

            // 清理临时字段
            delete mergedProduct._source_site;
            delete mergedProduct._filename;

            finalProducts.push(mergedProduct);
        }

        // 5. 保存并更新状态
        // 如果是空项目，更新全局站点设置
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

        state.analysisReport = null; // 数据变了，清空旧报告

        // 持久化
        HistoryService.save(state.scrapedData, null);

        // 渲染
        renderDataPanel();
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
function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // 返回 filename 方便调试
                resolve({ data: json, filename: file.name });
            } catch (err) {
                reject(new Error(`文件 ${file.name} 格式错误`));
            }
        };
        reader.onerror = () => reject(new Error("无法读取文件"));
        reader.readAsText(file);
    });
}

// 切换数据视图标签
export function switchDataTab(tab) {
    state.currentDataTab = tab;

    document
        .getElementById("data-preview")
        .classList.toggle("hidden", tab !== "preview");
    document
        .getElementById("data-json")
        .classList.toggle("hidden", tab !== "json");

    document.querySelectorAll(".data-tab").forEach((t) => {
        const isActive = t.id === `data-tab-${tab}`;
        t.classList.toggle("text-blue-600", isActive);
        t.classList.toggle("border-b-2", isActive);
        t.classList.toggle("border-blue-600", isActive);
        t.classList.toggle("text-slate-500", !isActive);
    });
}