// src/ui/dataDisplay.js
import state from "../../../common/state.js";
import { getErrorSummary, showToast, switchTab } from "../../../common/utils/ui.js";
import { HistoryService } from "../../../services/historyService.js";
import { renderHistory } from "../scraper/scraperPanel.js";
import { updateAsinSelectList } from "../analysis/analysisDisplay.js";

import { languageFlagMap } from "../../../common/constants/constants.js";
// ==========================================
// 1. 基础 UI 交互
// ==========================================

function toggleCardExpand(asin) {
    state.expandedAsin = state.expandedAsin === asin ? null : asin;
    renderDataPanel();
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
    if (!state.scrapedData) return;

    const noDataMsg = document.getElementById("no-data-msg");
    const cardsEl = document.getElementById("data-cards");

    // 无数据状态处理
    if (!state.scrapedData.products || state.scrapedData.products.length === 0) {
        if (noDataMsg) noDataMsg.classList.remove("hidden");
        if (cardsEl) cardsEl.classList.add("hidden");
        return;
    }

    if (noDataMsg) noDataMsg.classList.add("hidden");
    if (cardsEl) cardsEl.classList.remove("hidden");

    // ✅ 修复：优先从 metadata 获取全局站点代码 (如 "DE", "US")
    const globalSiteCode = state.scrapedData.metadata?.marketplace || state.selectedSite;

    cardsEl.innerHTML = state.scrapedData.products
        .map((p) => {
            const isExpanded = state.expandedAsin === p.asin;

            // ✅ 修复：计算国旗逻辑
            // 1. 优先使用全局站点代码，其次尝试产品自带的 language，最后回退
            let siteKey = globalSiteCode || p.language || "US";
            // 2. 修正 UK -> GB 映射
            if (siteKey === 'UK') siteKey = 'GB';
            // 3. 查表
            const flag = languageFlagMap[siteKey] || "🌐";


            // 内部组件：星星渲染
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

            const statusConfig = {
                success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
                partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
                failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
            };
            const status = statusConfig[p.scrape_status] || statusConfig.partial;

            return `
        <div class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md 
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
                        <i class="fas fa-chevron-down transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}"></i>
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
            
            ${isExpanded ? `
                <div class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in" onclick="event.stopPropagation()">
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
            ` : ""}
        </div>
    `;
        }).join("");

    // 同步更新 JSON 视图
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

async function deleteProduct(asin) {
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

async function deleteReview(asin, index) {
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
        if (storageKey && localStorage.getItem(storageKey) === 'true') {
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
                localStorage.setItem(storageKey, 'true');
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

function getReviewSignature(review) {
    if (review.id) return review.id;
    return `${review.date || ''}_${review.author || ''}_${review.headline || ''}`.trim();
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
// 🔥 核心修复：强力导入与校验逻辑
// ==========================================

async function handleImportFiles(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const inputEl = event.target;
    showToast(`📂 正在解析 ${files.length} 个文件...`, "info");

    try {
        const fileContents = await Promise.all(files.map(f => readFileAsJSON(f)));
        
        let incomingProducts = [];
        // 记录本次导入检测到的所有站点（Set去重）
        const detectedSites = new Set();

        // 1. 遍历文件，暴力提取数据和站点信息
        fileContents.forEach(content => {
            const json = content.data;
            if (!json) return;

            // 🔥 暴力读取：穷举所有可能存放 marketplace 的位置
            let fileSite = null;
            
            // 路径1: 标准结构 { metadata: { marketplace: "US" } }
            if (json.metadata && json.metadata.marketplace) fileSite = json.metadata.marketplace;
            // 路径2: 根节点 { marketplace: "US" }
            else if (json.marketplace) fileSite = json.marketplace;
            // 路径3: 根节点别名 { site: "US" }
            else if (json.site) fileSite = json.site;
            // 路径4: 如果是数组，尝试读取第一个元素的 metadata
            else if (Array.isArray(json) && json.length > 0 && json[0].metadata?.marketplace) {
                fileSite = json[0].metadata.marketplace;
            }

            // 调试日志：在控制台打印读取结果，方便排查
            console.log(`[Import] File: ${content.filename}, Detected Site: ${fileSite}`);

            if (fileSite) detectedSites.add(fileSite);

            // 归一化产品列表
            const list = Array.isArray(json) ? json : (json.products || (json.asin ? [json] : []));
            
            incomingProducts.push(...list.map(p => ({
                ...p,
                _temp_source_marketplace: fileSite, // 将站点标记挂载到临时字段
                feature_bullets: Array.isArray(p.feature_bullets) ? p.feature_bullets : [],
                customer_reviews: Array.isArray(p.customer_reviews) ? p.customer_reviews : []
            })));
        });

        if (incomingProducts.length === 0) throw new Error("文件未包含有效产品数据");

        // 2. 判定当前项目的“主权站点”
        const currentProducts = state.scrapedData?.products || [];
        const hasExistingData = currentProducts.length > 0;
        
        // 关键逻辑：
        // 如果项目有数据 -> 必须以项目现有站点为准
        // 如果项目为空 -> 必须以 UI 当前选中的站点为准 (防止空项目被错误污染)
        const projectMarketplace = hasExistingData 
            ? state.scrapedData.metadata.marketplace 
            : state.selectedSite;

        console.log(`[Import] Project Status: ${hasExistingData ? 'Has Data' : 'Empty'}, Target Site: ${projectMarketplace}`);

        // 3. 执行严格校验
        const currentMap = new Map(currentProducts.map(p => [p.asin, p]));
        const conflicts = []; 
        const newEntries = []; 
        const invalidEntries = []; 

        // 如果检测到了站点，且跟当前不一致，且当前项目是空的 -> 提示用户是否切换
        // (处理“我在DE界面，导入了US数据”的情况)
        let autoSwitchSite = null;
        if (!hasExistingData && detectedSites.size === 1) {
            const importSite = [...detectedSites][0];
            if (importSite && importSite !== projectMarketplace) {
                // 标记需要切换，但在下面循环中暂时以 importSite 为准进行通过
                autoSwitchSite = importSite; 
                console.log(`[Import] Empty project mismatch. Will auto-switch to: ${autoSwitchSite}`);
            }
        }

        // 确定用于校验的基准站点 (如果是空项目且准备自动切换，就用新站点校验，否则用原站点)
        const validationTargetSite = autoSwitchSite || projectMarketplace;

        incomingProducts.forEach(p => {
            const exists = currentMap.has(p.asin);
            const pSite = p._temp_source_marketplace;
            
            // 校验逻辑：
            // 1. 如果文件没写站点 (pSite为null)，也就是读取失败，暂时放行（此时无法显示站点）
            // 2. 如果文件有站点，必须等于 validationTargetSite
            // 3. 或者是已存在的 ASIN (合并例外)
            
            const isMatch = !pSite || (pSite === validationTargetSite);

            if (isMatch) {
                if (exists) conflicts.push(p);
                else newEntries.push(p);
            } else {
                // 站点不匹配
                if (exists) {
                    conflicts.push(p); // 允许：已存在的ASIN，允许合并跨站点数据
                } else {
                    invalidEntries.push(p); // 拒绝：站点不对的新ASIN
                }
            }
            delete p._temp_source_marketplace;
        });

        // 4. 阻断警告 (站点不一致)
        if (invalidEntries.length > 0) {
            console.warn(`[Import] Blocked ${invalidEntries.length} items due to site mismatch.`);
            
            const confirmed = await confirmWithModal( // 复用通用的 confirmWithModal
                "站点不匹配警告",
                `<div class="text-slate-600 text-sm">
                    检测到 <strong>${invalidEntries.length}</strong> 个商品来自不同站点。
                    <br/>当前项目/界面站点：<span class="font-bold text-blue-600">${validationTargetSite}</span>。
                    <br/><br/>
                    由于站点隔离原则，这些不匹配的新商品将被 <span class="text-red-500 font-bold">忽略</span>。
                    <br/>是否继续？
                </div>`,
                null
            );
            
            if (!confirmed) {
                showToast("已取消导入", "info");
                return;
            }
            // 用户确认继续，则丢弃 invalidEntries，只处理剩下的
        }

        // 5. 处理重复冲突
        if (conflicts.length > 0) {
            const strategy = await confirmConflictResolution(conflicts.length);
            if (strategy === 'merge') {
                conflicts.forEach(newP => {
                    const oldP = currentMap.get(newP.asin);
                    const mergedP = mergeProducts(oldP, newP);
                    currentMap.set(newP.asin, mergedP);
                });
                showToast(`已智能合并 ${conflicts.length} 条数据`, "success");
            } else if (strategy === 'overwrite') {
                conflicts.forEach(newP => currentMap.set(newP.asin, newP));
                showToast(`已覆盖 ${conflicts.length} 条数据`, "warning");
            } else {
                showToast(`已跳过 ${conflicts.length} 条重复数据`, "info");
            }
        } else {
            if (newEntries.length > 0) showToast(`成功导入 ${newEntries.length} 条新数据`, "success");
        }

        // 6. 保存数据并刷新状态
        newEntries.forEach(p => currentMap.set(p.asin, p));
        const finalProducts = Array.from(currentMap.values());

        // 🔥 关键：如果是空项目且检测到了新站点，强制切换 UI 和 State
        const finalMarketplace = (finalProducts.length > 0) ? (autoSwitchSite || projectMarketplace) : state.selectedSite;

        if (autoSwitchSite) {
            console.log(`[Import] Switching global state to: ${finalMarketplace}`);
            state.selectedSite = finalMarketplace;
            
            // 强制刷新 UI 下拉框 (假设ID是 site-select)
            const siteSelect = document.getElementById("site-select");
            if (siteSelect) {
                siteSelect.value = finalMarketplace;
                // 手动触发 change 事件通知其他组件
                siteSelect.dispatchEvent(new Event('change'));
            }
            showToast(`已自动切换至 ${finalMarketplace} 站点`, "success");
        }

        state.scrapedData = {
            metadata: {
                marketplace: finalMarketplace, // 确保存储了正确的站点
                scrape_timestamp: new Date().toISOString(),
                total_asins: finalProducts.length,
                last_action: "import_merge"
            },
            products: finalProducts
        };

        state.analysisReport = null;
        
        // 保存历史
        HistoryService.save(state.scrapedData, null);

        // 渲染
        renderDataPanel();
        updateAsinSelectList();
        renderHistory();
        switchTab("data");

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