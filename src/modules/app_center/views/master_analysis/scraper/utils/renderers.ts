/**
 * HTML渲染工具函数
 */

import type { ProductData } from '../types';
import { escapeHtml, sanitizeProductData } from './sanitizers';
import { getErrorSummary, getSiteDomain } from './formatters';

const SUPPORTED_SITE_KEYS = new Set([
  'US',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'SE',
  'PL',
  'BE',
  'IE',
  'UK',
  'CA',
  'JP',
]);

const JSON_TOKEN_RE =
  /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

/**
 * 渲染星级评分
 */
export function renderStars(rating?: number): string {
  if (typeof rating !== 'number' || !Number.isFinite(rating)) return '';
  return `<div class="flex items-center gap-0.5 text-sm" title="${rating} 分">
        ${[1, 2, 3, 4, 5]
          .map(star => {
            if (rating >= star) return '<i class="fas fa-star text-amber-400"></i>';
            if (rating >= star - 0.5) return '<i class="fas fa-star-half-alt text-amber-400"></i>';
            return '<i class="far fa-star text-slate-300"></i>';
          })
          .join('')}
        <span class="text-xs text-slate-500 ml-1 font-mono pt-0.5">${rating}</span>
    </div>`;
}

/**
 * JSON语法高亮
 */
export function syntaxHighlight(json: string): string {
  let result = '';
  let previousIndex = 0;

  for (const tokenMatch of json.matchAll(JSON_TOKEN_RE)) {
    const token = tokenMatch[0];
    const index = tokenMatch.index ?? 0;
    result += escapeHtml(json.slice(previousIndex, index));

    let cls = 'json-number';
    if (/^"/.test(token)) {
      cls = /:$/.test(token) ? 'json-key' : 'json-string';
    } else if (/true|false/.test(token)) {
      cls = 'json-boolean';
    }

    result += `<span class="${cls}">${escapeHtml(token)}</span>`;
    previousIndex = index + token.length;
  }

  return result + escapeHtml(json.slice(previousIndex));
}

/**
 * 渲染产品卡片
 */
type StatusBadgeConfig = { className: string; icon: string; text: string };
type ProductCardOptions = {
  rawProduct: ProductData;
  isExpanded: boolean;
  globalSiteCode: string;
  onDelete: string;
  onDeleteReview: string;
};
type ProductCardViewModel = ProductCardOptions & {
  product: ProductData;
  siteKey: string;
  flag: string;
  status: StatusBadgeConfig;
};

const DEFAULT_STATUS: StatusBadgeConfig = {
  className: 'bg-amber-100 text-amber-700 border-amber-200',
  icon: 'fa-exclamation-circle',
  text: '部分',
};
const STATUS_CONFIG: Record<string, StatusBadgeConfig> = {
  success: {
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'fa-check-circle',
    text: '成功',
  },
  partial: DEFAULT_STATUS,
  failed: {
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: 'fa-times-circle',
    text: '失败',
  },
};

function normalizeSiteKey(product: ProductData, globalSiteCode: string): string {
  const candidate = globalSiteCode || product.metadata?.marketplace || 'US';
  const siteKey = typeof candidate === 'string' ? candidate.trim().toUpperCase() : 'US';

  if (!SUPPORTED_SITE_KEYS.has(siteKey)) {
    return 'US';
  }

  return siteKey === 'UK' ? 'GB' : siteKey;
}

function createProductCardViewModel(options: ProductCardOptions): ProductCardViewModel {
  const product = sanitizeProductData(options.rawProduct);
  const siteKey = normalizeSiteKey(product, options.globalSiteCode);

  return {
    ...options,
    product,
    siteKey,
    flag: siteKey,
    status: STATUS_CONFIG[product.scrape_status || 'partial'] || DEFAULT_STATUS,
  };
}

function renderDeleteProductButton({ product, onDelete }: ProductCardViewModel): string {
  return `
            <button type="button" data-action="delete" data-asin="${product.asin}" @click.stop="${onDelete}"
                class="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition duration-200 z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                title="彻底删除该 ASIN"
                aria-label="彻底删除该 ASIN">
                <i class="fas fa-times text-xs"></i>
            </button>`;
}

function renderProductCardHeader(viewModel: ProductCardViewModel): string {
  const { product, isExpanded, siteKey, flag, status } = viewModel;

  return `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span class="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-2 font-mono text-[10px] font-bold text-slate-600 shadow-sm">${flag}</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono text-base font-bold text-slate-800 tracking-tight">${product.asin}</span>
                            <span class="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.className}">
                                <i class="fas ${status.icon}"></i> ${status.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-brands fa-amazon text-yellow-500"></i>${getSiteDomain(siteKey)}</span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fa-solid fa-heading"></i></span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fas fa-list-ul text-primary-500"></i> ${(product.feature_bullets || []).length}</span>
                        <span class="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-100 shadow-sm"><i class="fas fa-comments text-purple-500"></i> ${(product.customer_reviews || []).length}</span>
                    </div>
                    <span class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-primary-100 group-hover:text-primary-500 transition duration-200">
                        <i id="card-icon-${product.asin}" class="fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}"></i>
                    </span>
                </div>
            </div>`;
}

function renderProductTitle(product: ProductData, isExpanded: boolean): string {
  return `
            <div class="mb-2">
                <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-heading"></i> 标题</h5>
                <h4 class="text-sm font-medium text-slate-700 leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}">
                    ${product.productTitle || "<span class='text-slate-400 italic'>(无标题)</span>"}
                </h4>
            </div>`;
}

function renderProductError(product: ProductData): string {
  return product.error
    ? `<div class="flex items-start gap-2 text-xs text-red-600 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg"><i class="fas fa-bug mt-0.5"></i><span>${getErrorSummary(product.error)}</span></div>`
    : '';
}

function renderFeatureBullets(product: ProductData): string {
  const bullets = product.feature_bullets || [];
  const bulletsHtml = bullets
    .map(
      (bullet: string, index: number) => `
                                <li class="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex gap-3 hover:border-primary-100 transition-colors">
                                    <span class="text-primary-500 font-bold font-mono text-xs mt-0.5 bg-primary-100 px-1.5 py-0.5 rounded h-fit">${index + 1}</span> 
                                    <span class="leading-relaxed">${bullet}</span>
                                </li>
                            `
    )
    .join('');

  return `
                <div>
                    <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fas fa-list-ul text-primary-500"></i> 五点描述</h5>
                    ${bullets.length > 0 ? `<ul class="space-y-2">${bulletsHtml}</ul>` : '<p class="text-sm text-slate-400 italic pl-6">无五点描述</p>'} 
                </div>`;
}

function renderReviewCard(review: unknown, index: number, viewModel: ProductCardViewModel): string {
  if (!review || typeof review !== 'object') return '';

  const { product, onDeleteReview } = viewModel;
  const reviewObj = review as Record<string, unknown>;
  const verifiedBadge =
    reviewObj.is_verified || reviewObj.isVerified
      ? `<span class="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full"><i class="fas fa-check-circle"></i> Verified Purchase</span>`
      : '';
  const headline = reviewObj.headline
    ? `<h6 class="text-sm font-bold text-slate-800 mb-1.5">${String(reviewObj.headline)}</h6>`
    : '';

  return `
                                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group/review relative hover:border-purple-200 hover:shadow-md transition duration-200">
                                    <button type="button" data-action="delete-review" data-asin="${product.asin}" data-index="${index}" @click.stop="${onDeleteReview.replace('INDEX', String(index))}"
                                        class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition duration-200 opacity-0 group-hover/review:opacity-100 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                                        aria-label="删除评论">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                    <div class="flex flex-wrap justify-between items-start gap-2 mb-2 pr-8">
                                        <div class="flex items-center gap-3">
                                            <span class="text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">#${index + 1}</span>
                                            ${renderStars(reviewObj.star_rating as number)}
                                        </div>
                                        ${verifiedBadge}
                                    </div>
                                    ${headline}
                                    <p class="text-sm text-slate-600 leading-relaxed text-justify">${String(reviewObj.body || '')}</p>
                                </div>
                            `;
}

function renderReviewSection(viewModel: ProductCardViewModel): string {
  const reviews = viewModel.product.customer_reviews || [];
  const reviewsHtml = reviews
    .map((review: unknown, index: number) => renderReviewCard(review, index, viewModel))
    .join('');

  return `
                <div>
                    <h5 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-comments text-purple-500"></i> 评论内容 
                        <span class="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">TOP ${reviews.length}</span>
                    </h5>
                    ${reviews.length > 0 ? `<div class="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">${reviewsHtml}</div>` : '<p class="text-sm text-slate-400 italic pl-6">无评论数据</p>'} 
                </div>`;
}

function renderOriginalPageLink({ product, siteKey }: ProductCardViewModel): string {
  return `
                <div class="pt-3 flex justify-end">
                    <a href="https://${getSiteDomain(siteKey)}/dp/${product.asin}" target="_blank" class="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary-light)] rounded-lg transition-colors">
                        <span>查看原始页面</span> <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>`;
}

function renderProductCardBody(viewModel: ProductCardViewModel): string {
  return `
            <div id="card-body-${viewModel.product.asin}" class="mt-4 pt-4 border-t border-slate-200/60 space-y-6 fade-in ${viewModel.isExpanded ? '' : 'hidden'}">
                ${renderFeatureBullets(viewModel.product)}
                ${renderReviewSection(viewModel)}
                ${renderOriginalPageLink(viewModel)}
            </div>`;
}

export function renderProductCard(options: ProductCardOptions): string {
  const viewModel = createProductCardViewModel(options);
  const expandedClass = viewModel.isExpanded ? 'asin-card--expanded' : 'asin-card--collapsed';

  return `
        <div id="card-${viewModel.product.asin}" 
             data-asin="${viewModel.product.asin}"
             class="asin-card group relative p-5 border rounded-2xl transition duration-200 cursor-pointer hover:shadow-md
            ${expandedClass}">
            ${renderDeleteProductButton(viewModel)}
            ${renderProductCardHeader(viewModel)}
            ${renderProductTitle(viewModel.product, viewModel.isExpanded)}
            ${renderProductError(viewModel.product)}
            ${renderProductCardBody(viewModel)}
        </div>
    `;
}
