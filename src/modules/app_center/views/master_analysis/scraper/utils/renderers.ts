/**
 * HTML渲染工具函数
 */

import type { ProductData } from '../types';
import { sanitizeProductData } from './sanitizers';
import { getErrorSummary, getSiteDomain } from './formatters';

/**
 * 渲染星级评分
 */
export function renderStars(rating?: number): string {
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

/**
 * JSON语法高亮
 */
export function syntaxHighlight(json: string): string {
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

/**
 * 渲染产品卡片
 */
export function renderProductCard(
    rawProduct: ProductData, 
    isExpanded: boolean, 
    globalSiteCode: string,
    _onToggle: string,  // 不再使用,通过事件委托处理
    onDelete: string,
    onDeleteReview: string
): string {
    // 安全：清理产品数据，防止XSS
    const p = sanitizeProductData(rawProduct);
    
    let siteKey = globalSiteCode || p.metadata?.marketplace || "US";
    if (siteKey === 'UK') siteKey = 'GB';
    
    const languageFlagMap: Record<string, string> = {
        DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
        SE: '🇸🇪', PL: '🇵🇱', BE: '🇧🇪', IE: '🇮🇪', UK: '🇬🇧', GB: '🇬🇧'
    };
    const flag = languageFlagMap[siteKey] || "🌐";

    const statusConfig: Record<string, { class: string; icon: string; text: string }> = {
        success: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "fa-check-circle", text: "成功" },
        partial: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: "fa-exclamation-circle", text: "部分" },
        failed: { class: "bg-red-100 text-red-700 border-red-200", icon: "fa-times-circle", text: "失败" },
    };
    const status = statusConfig[p.scrape_status || 'partial'] || statusConfig['partial']!;

    return `
        <div id="card-${p.asin}" 
             data-asin="${p.asin}"
             class="asin-card group relative p-5 border rounded-2xl transition-all cursor-pointer hover:shadow-md 
            ${isExpanded ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"}">
            
            <button data-action="delete" data-asin="${p.asin}" @click.stop="${onDelete}" 
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
                            <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.class}">
                                <i class="fas ${status.icon}"></i> ${status.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-brands fa-amazon text-yellow-500"></i>${getSiteDomain(siteKey)}</span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-solid fa-heading"></i></span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fas fa-list-ul text-blue-500"></i> ${(p.feature_bullets || []).length}</span>
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
            
            ${p.error ? `<div class="flex items-start gap-2 text-xs text-red-600 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg"><i class="fas fa-bug mt-0.5"></i><span>${getErrorSummary(p.error)}</span></div>` : ""}
            
            <div id="card-body-${p.asin}" class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in ${isExpanded ? '' : 'hidden'}">
                <div>
                    <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fas fa-list-ul text-blue-500"></i> 五点描述</h5>
                    ${(p.feature_bullets || []).length > 0 ? `
                        <ul class="space-y-2">
                            ${(p.feature_bullets || []).map((b: string, i: number) => `
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
                            ${(p.customer_reviews || []).map((review: unknown, i: number) => `
                                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group/review relative hover:border-purple-200 hover:shadow-md transition-all">
                                    <button data-action="delete-review" data-asin="${p.asin}" data-index="${i}" @click.stop="${onDeleteReview.replace('INDEX', String(i))}" 
                                        class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/review:opacity-100 z-10">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                    <div class="flex flex-wrap justify-between items-start gap-2 mb-2 pr-8">
                                        <div class="flex items-center gap-3">
                                            <span class="text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">#${i + 1}</span>
                                            ${renderStars(review.star_rating)}
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
                    <a href="https://${getSiteDomain(siteKey)}/dp/${p.asin}" target="_blank" class="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors">
                        <span>查看原始页面</span> <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}
