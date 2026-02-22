/**
 * 高危词库搜索、筛选、渲染逻辑
 * Restricted Words Search, Filter, and Rendering Logic
 * Phase 5: 迁移到新架构 (SafeModuleLoader, AlpineRegistry, SafeRenderer)
 */

import {
    RESTRICTED_WORDS_DATABASE,
    RISK_LEVELS,
    WORD_CATEGORIES,
} from './constants/restrictedWordsConstants';
import { registerActionsWithLegacy } from '../../../../../common/utils/actionRegistry';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';

type SearchMode = 'fuzzy' | 'exact' | 'fulltext' | 'regex';
type SiteContext = string;

interface ActiveFilters {
    category: string;
    riskLevel: string;
    searchMode: SearchMode;
    searchQuery: string;
}

let currentResults = [...RESTRICTED_WORDS_DATABASE];
let currentSiteContext: SiteContext = 'ALL';

let activeFilters: ActiveFilters = {
    category: '',
    riskLevel: '',
    searchMode: 'fuzzy',
    searchQuery: '',
};

// 获取 SafeRenderer 实例
const renderer = SafeRenderer.getInstance();

/**
 * 初始化面板
 */
export function initRestrictedWordsPanel(): void {
    populateFilterDropdowns();
    renderResults();
    bindEventListeners();
}

/**
 * 填充下拉菜单选项
 */
function populateFilterDropdowns(): void {
    // 分类下拉
    const catSelect = document.getElementById('rw-filter-category') as HTMLSelectElement | null;
    if (catSelect) {
        const options = Object.entries(WORD_CATEGORIES)
            .map(([code, cat]) => `<option value="${code}">${cat.label}</option>`)
            .join('');
        // ✅ 使用 SafeRenderer 渲染静态模板
        renderer.renderTemplate(catSelect, `<option value="">全部分类</option>` + options);
    }

    // 风险等级下拉
    const riskSelect = document.getElementById('rw-filter-risk') as HTMLSelectElement | null;
    if (riskSelect) {
        // 倒序排列，高风险在前
        const options = [5, 4, 3, 2, 1]
            .map(
                (level) =>
                    `<option value="${level}">${(RISK_LEVELS as any)[level].icon} ${(RISK_LEVELS as any)[level].label}</option>`
            )
            .join('');
        // ✅ 使用 SafeRenderer 渲染静态模板
        renderer.renderTemplate(riskSelect, `<option value="">全部</option>` + options);
    }
}

/**
 * 绑定事件监听
 */
function bindEventListeners(): void {
    // 搜索输入
    const searchInput = document.getElementById('rw-search-input') as HTMLInputElement | null;
    const searchBtn = document.getElementById('rw-search-btn');
    const clearBtn = document.getElementById('rw-clear-btn');
    const searchModeSelect = document.getElementById('rw-search-mode') as HTMLSelectElement | null;

    if (searchBtn) {
        searchBtn.addEventListener('click', executeSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', resetFilters);
    }

    // 过滤器变更
    const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement | null;
    const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement | null;
    const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement | null;

    if (catFilter) {
        catFilter.addEventListener('change', (e) => {
            activeFilters.category = (e.target as HTMLSelectElement).value;
            executeSearch();
        });
    }

    if (riskFilter) {
        riskFilter.addEventListener('change', (e) => {
            activeFilters.riskLevel = (e.target as HTMLSelectElement).value;
            executeSearch();
        });
    }

    if (siteContext) {
        siteContext.addEventListener('change', (e) => {
            currentSiteContext = (e.target as HTMLSelectElement).value;
            executeSearch();
        });
    }

    if (searchModeSelect) {
        searchModeSelect.addEventListener('change', (e) => {
            activeFilters.searchMode = (e.target as HTMLSelectElement).value as SearchMode;
            // 模式切换不自动触发搜索，除非已有输入
            const input = document.getElementById('rw-search-input') as HTMLInputElement | null;
            if (input && input.value.trim()) {
                executeSearch();
            }
        });
    }

    // 模态框关闭 (ESC键)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeWordDetail();
    });
}

/**
 * 执行综合搜索与筛选
 */
function executeSearch(): void {
    const input = document.getElementById('rw-search-input') as HTMLInputElement | null;
    const modeSelect = document.getElementById('rw-search-mode') as HTMLSelectElement | null;
    
    const query = input?.value.trim() || '';
    const searchMode = (modeSelect?.value as SearchMode) || 'fuzzy';

    activeFilters.searchQuery = query;
    activeFilters.searchMode = searchMode;

    // 1. 站点预筛选
    let filtered = RESTRICTED_WORDS_DATABASE;

    if (currentSiteContext !== 'ALL') {
        filtered = filtered.filter(
            (word) =>
                word.affectedSites.includes(currentSiteContext) || word.affectedSites.includes('EU')
        );
    }

    // 2. 关键词搜索
    if (query) {
        const lowerQuery = query.toLowerCase();

        filtered = filtered.filter((word) => {
            const mainKw = word.keyword.toLowerCase();
            // 获取当前所有相关文本用于搜索
            const variants = (word.variants || []).map((v) => v.toLowerCase());
            const localKws = Object.values(word.localizedKeywords || {}).map((v) => v.toLowerCase());
            const allKeywords = [mainKw, ...variants, ...localKws];

            switch (searchMode) {
                case 'exact':
                    return allKeywords.includes(lowerQuery);

                case 'fuzzy':
                    return allKeywords.some((k) => k.includes(lowerQuery));

                case 'fulltext': {
                    const fullText = [
                        ...allKeywords,
                        word.riskDescription,
                        word.legalBasis,
                        (word.alternatives || []).join(' '),
                        word.tips,
                    ]
                        .join(' ')
                        .toLowerCase();
                    return fullText.includes(lowerQuery);
                }

                case 'regex':
                    try {
                        const regex = new RegExp(query, 'i');
                        return regex.test(word.keyword) || variants.some((v) => regex.test(v));
                    } catch (e) {
                        return false;
                    }

                default:
                    return false;
            }
        });
    }

    // 3. 属性筛选
    if (activeFilters.category) {
        filtered = filtered.filter((w) => w.category === activeFilters.category);
    }

    if (activeFilters.riskLevel) {
        // 转换成数字比较
        const targetLevel = parseInt(activeFilters.riskLevel);
        filtered = filtered.filter((w) => w.riskLevel === targetLevel);
    }

    currentResults = filtered;
    renderResults();
}

/**
 * 重置筛选
 */
function resetFilters(): void {
    const searchInput = document.getElementById('rw-search-input') as HTMLInputElement | null;
    const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement | null;
    const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement | null;
    const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement | null;

    if (searchInput) searchInput.value = '';
    if (catFilter) catFilter.value = '';
    if (riskFilter) riskFilter.value = '';
    if (siteContext) siteContext.value = 'ALL';

    activeFilters = {
        category: '',
        riskLevel: '',
        searchMode: 'fuzzy',
        searchQuery: '',
    };
    currentSiteContext = 'ALL';
    currentResults = [...RESTRICTED_WORDS_DATABASE];

    executeSearch();
}

/**
 * 渲染结果
 */
function renderResults(): void {
    const tbody = document.getElementById('rw-results-tbody');
    const statsDisplay = document.getElementById('rw-stats-display');

    if (statsDisplay) {
        statsDisplay.textContent = `显示 ${currentResults.length} 条结果`;
    }

    if (!tbody) return;

    if (currentResults.length === 0) {
        // ✅ 使用 SafeRenderer 渲染静态模板
        renderer.renderTemplate(tbody, `
            <tr>
                <td colspan="6" class="text-center py-12 text-slate-400">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
                        <p>没有找到相关高危词条</p>
                        <p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
                    </div>
                </td>
            </tr>
        `);
        return;
    }

    // ✅ 使用 SafeRenderer 渲染列表
    const rows = currentResults.map((word) => {
        const risk = (RISK_LEVELS as any)[word.riskLevel];
        const category = (WORD_CATEGORIES as any)[word.category];

        // 智能显示关键词：如果有选中站点且有对应的本地化词，优先显示本地化词
        let displayKeyword = word.keyword;
        let subDisplay = word.variants.slice(0, 3).join(', ');

        if (
            currentSiteContext !== 'ALL' &&
            word.localizedKeywords &&
            (word.localizedKeywords as any)[currentSiteContext]
        ) {
            const localWord = (word.localizedKeywords as any)[currentSiteContext];
            displayKeyword = localWord;
            // 在副标显示英文原词
            if (localWord !== word.keyword) {
                subDisplay = `${word.keyword}${subDisplay ? ', ' + subDisplay : ''}`;
            }
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-100 transition-colors';

        // 关键词列
        const keywordTd = document.createElement('td');
        keywordTd.className = 'px-4 py-3 align-top';
        const keywordDiv = document.createElement('div');
        keywordDiv.className = 'font-bold text-slate-800 text-base mb-0.5 break-all';
        keywordDiv.textContent = displayKeyword;
        const subDiv = document.createElement('div');
        subDiv.className = 'text-xs text-slate-500 line-clamp-2';
        subDiv.textContent = subDisplay || '-';
        keywordTd.appendChild(keywordDiv);
        keywordTd.appendChild(subDiv);

        // 分类列
        const categoryTd = document.createElement('td');
        categoryTd.className = 'px-4 py-3 align-top';
        const categorySpan = document.createElement('span');
        categorySpan.className = `inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100`;
        categorySpan.innerHTML = `<i class="fas ${category.icon}"></i>`;
        const categoryText = document.createTextNode(' ' + category.label);
        categorySpan.appendChild(categoryText);
        categoryTd.appendChild(categorySpan);
        if (word.subCategory) {
            const subCatDiv = document.createElement('div');
            subCatDiv.className = 'text-[10px] text-slate-400 mt-1 pl-1';
            subCatDiv.textContent = word.subCategory;
            categoryTd.appendChild(subCatDiv);
        }

        // 风险等级列
        const riskTd = document.createElement('td');
        riskTd.className = 'px-4 py-3 align-top text-center';
        const riskDiv = document.createElement('div');
        riskDiv.className = 'flex flex-col items-center';
        const riskIcon = document.createElement('span');
        riskIcon.className = 'text-xl mb-0.5';
        riskIcon.title = risk.label;
        riskIcon.textContent = risk.icon;
        const riskBadge = document.createElement('span');
        riskBadge.className = `px-1.5 text-[10px] font-bold rounded bg-${risk.color}-100 text-${risk.color}-700`;
        riskBadge.textContent = `${word.riskLevel}级`;
        riskDiv.appendChild(riskIcon);
        riskDiv.appendChild(riskBadge);
        riskTd.appendChild(riskDiv);

        // 受影响站点列
        const sitesTd = document.createElement('td');
        sitesTd.className = 'px-4 py-3 align-top';
        const sitesDiv = document.createElement('div');
        sitesDiv.className = 'flex flex-wrap gap-1';
        sitesDiv.innerHTML = renderAffectedSites(word.affectedSites);
        sitesTd.appendChild(sitesDiv);

        // 常见产品列
        const productsTd = document.createElement('td');
        productsTd.className = 'px-4 py-3 align-top text-xs text-slate-600';
        const productsDiv = document.createElement('div');
        productsDiv.className = 'line-clamp-2';
        productsDiv.textContent = word.commonProducts.join(', ');
        productsDiv.title = word.commonProducts.join(', ');
        productsTd.appendChild(productsDiv);

        // 操作列
        const actionTd = document.createElement('td');
        actionTd.className = 'px-4 py-3 align-top text-center';
        const detailBtn = document.createElement('button');
        detailBtn.className = 'px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-md text-xs font-medium transition-all shadow-sm';
        detailBtn.textContent = '详情';
        detailBtn.onclick = () => showWordDetail(word.id);
        actionTd.appendChild(detailBtn);

        tr.appendChild(keywordTd);
        tr.appendChild(categoryTd);
        tr.appendChild(riskTd);
        tr.appendChild(sitesTd);
        tr.appendChild(productsTd);
        tr.appendChild(actionTd);

        return tr;
    });

    // 清空并添加所有行
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * 渲染站点标签
 */
function renderAffectedSites(sites: string[]): string {
    const maxDisplay = 4;

    if (sites.includes('EU')) {
        return `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">🇪🇺 EU ALL</span>`;
    }

    let html = sites
        .slice(0, maxDisplay)
        .map(
            (site) =>
                `<span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px]">${site}</span>`
        )
        .join('');

    if (sites.length > maxDisplay) {
        html += `<span class="text-[10px] text-slate-400 flex items-center">+${sites.length - maxDisplay}</span>`;
    }

    return html;
}

/**
 * 显示详情
 */
function showWordDetail(wordId: string): void {
    const word = RESTRICTED_WORDS_DATABASE.find((w) => w.id === wordId);
    if (!word) return;

    const modal = document.getElementById('rw-detail-modal');
    const header = document.getElementById('rw-modal-header');
    const content = document.getElementById('rw-detail-content');

    if (!modal || !header || !content) return;

    const risk = (RISK_LEVELS as any)[word.riskLevel];
    const category = (WORD_CATEGORIES as any)[word.category];

    // 渲染 Header - 使用 DOM 操作
    header.innerHTML = '';
    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center gap-4';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = `w-12 h-12 rounded-lg bg-${risk.color}-100 flex items-center justify-center text-2xl`;
    iconDiv.textContent = risk.icon;
    
    const infoDiv = document.createElement('div');
    
    const h3 = document.createElement('h3');
    h3.className = 'text-xl font-bold text-slate-800 flex items-center gap-3';
    h3.textContent = word.keyword;
    
    const idSpan = document.createElement('span');
    idSpan.className = 'text-xs font-normal text-slate-400 border border-slate-200 rounded px-1.5 py-0.5';
    idSpan.textContent = `ID: ${word.id}`;
    h3.appendChild(idSpan);
    
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'flex items-center gap-2 mt-1';
    
    const categoryBadge = document.createElement('span');
    categoryBadge.className = `px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100`;
    categoryBadge.textContent = category.label;
    
    const riskBadge = document.createElement('span');
    riskBadge.className = `px-2 py-0.5 rounded text-xs font-medium bg-${risk.color}-50 text-${risk.color}-700 border border-${risk.color}-100`;
    riskBadge.textContent = `风险等级 ${word.riskLevel}: ${risk.label}`;
    
    badgesDiv.appendChild(categoryBadge);
    badgesDiv.appendChild(riskBadge);
    infoDiv.appendChild(h3);
    infoDiv.appendChild(badgesDiv);
    headerDiv.appendChild(iconDiv);
    headerDiv.appendChild(infoDiv);
    header.appendChild(headerDiv);

    // 渲染 Content - 使用 DOM 操作
    content.innerHTML = '';
    const contentContainer = document.createElement('div');
    contentContainer.className = 'space-y-6';
    
    // 变体与本地化部分
    const variantsGrid = document.createElement('div');
    variantsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    
    // 本地化部分
    const localizedDiv = document.createElement('div');
    localizedDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-100';
    const localizedTitle = document.createElement('h4');
    localizedTitle.className = 'text-xs font-bold text-slate-500 uppercase mb-2';
    localizedTitle.textContent = '站点本地化写法';
    localizedDiv.appendChild(localizedTitle);
    
    const localizedContent = document.createElement('div');
    localizedContent.className = 'space-y-1';
    const localizedEntries = Object.entries(word.localizedKeywords || {});
    if (localizedEntries.length > 0) {
        localizedEntries.forEach(([site, localKw]) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'flex justify-between text-sm';
            const siteSpan = document.createElement('span');
            siteSpan.className = 'font-medium text-slate-600';
            siteSpan.textContent = `${site}:`;
            const kwSpan = document.createElement('span');
            kwSpan.className = 'text-slate-800 font-bold';
            kwSpan.textContent = localKw as string;
            entryDiv.appendChild(siteSpan);
            entryDiv.appendChild(kwSpan);
            localizedContent.appendChild(entryDiv);
        });
    } else {
        const noDataSpan = document.createElement('span');
        noDataSpan.className = 'text-slate-400 text-sm';
        noDataSpan.textContent = '无特定本地化差异';
        localizedContent.appendChild(noDataSpan);
    }
    localizedDiv.appendChild(localizedContent);
    
    // 变体部分
    const variantsDiv = document.createElement('div');
    variantsDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-100';
    const variantsTitle = document.createElement('h4');
    variantsTitle.className = 'text-xs font-bold text-slate-500 uppercase mb-2';
    variantsTitle.textContent = '其他搜索变体';
    variantsDiv.appendChild(variantsTitle);
    const variantsP = document.createElement('p');
    variantsP.className = 'text-sm text-slate-800 font-mono leading-relaxed';
    variantsP.textContent = word.variants.length ? word.variants.join(', ') : '无';
    variantsDiv.appendChild(variantsP);
    
    variantsGrid.appendChild(localizedDiv);
    variantsGrid.appendChild(variantsDiv);
    contentContainer.appendChild(variantsGrid);
    
    // 风险描述部分
    const riskDiv = document.createElement('div');
    riskDiv.className = 'border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg';
    const riskTitle = document.createElement('h4');
    riskTitle.className = 'font-bold text-red-800 mb-1 flex items-center gap-2';
    riskTitle.innerHTML = '<i class="fas fa-triangle-exclamation"></i> 风险解读';
    riskDiv.appendChild(riskTitle);
    const riskDesc = document.createElement('p');
    riskDesc.className = 'text-sm text-red-900 leading-relaxed';
    riskDesc.textContent = word.riskDescription;
    riskDiv.appendChild(riskDesc);
    
    const legalDiv = document.createElement('div');
    legalDiv.className = 'mt-3 pt-3 border-t border-red-100 flex items-start gap-2';
    legalDiv.innerHTML = '<i class="fas fa-gavel text-red-400 mt-0.5 text-xs"></i>';
    const legalContent = document.createElement('div');
    const legalLabel = document.createElement('span');
    legalLabel.className = 'text-xs font-bold text-red-800';
    legalLabel.textContent = '法规依据:';
    const legalText = document.createElement('span');
    legalText.className = 'text-xs text-red-700 italic';
    legalText.textContent = word.legalBasis;
    legalContent.appendChild(legalLabel);
    legalContent.appendChild(document.createTextNode(' '));
    legalContent.appendChild(legalText);
    legalDiv.appendChild(legalContent);
    riskDiv.appendChild(legalDiv);
    contentContainer.appendChild(riskDiv);
    
    // 替代方案和场景部分
    const solutionsGrid = document.createElement('div');
    solutionsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
    
    // 替代方案
    const alternativesDiv = document.createElement('div');
    const altTitle = document.createElement('h4');
    altTitle.className = 'font-bold text-slate-800 mb-3 flex items-center gap-2';
    altTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i> 安全替代方案';
    alternativesDiv.appendChild(altTitle);
    const altList = document.createElement('ul');
    altList.className = 'space-y-2';
    word.alternatives.forEach(alt => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2 text-sm bg-green-50 text-green-800 px-3 py-2 rounded border border-green-100';
        li.innerHTML = '<i class="fas fa-check mt-0.5 text-xs"></i>';
        const span = document.createElement('span');
        span.textContent = alt;
        li.appendChild(span);
        altList.appendChild(li);
    });
    alternativesDiv.appendChild(altList);
    
    // 常见场景
    const productsDiv = document.createElement('div');
    const prodTitle = document.createElement('h4');
    prodTitle.className = 'font-bold text-slate-800 mb-3 flex items-center gap-2';
    prodTitle.innerHTML = '<i class="fas fa-bullseye text-blue-500"></i> 常见触雷场景';
    productsDiv.appendChild(prodTitle);
    const prodContainer = document.createElement('div');
    prodContainer.className = 'flex flex-wrap gap-2';
    word.commonProducts.forEach(prod => {
        const span = document.createElement('span');
        span.className = 'px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200';
        span.textContent = prod;
        prodContainer.appendChild(span);
    });
    productsDiv.appendChild(prodContainer);
    
    solutionsGrid.appendChild(alternativesDiv);
    solutionsGrid.appendChild(productsDiv);
    contentContainer.appendChild(solutionsGrid);
    
    // Tips部分
    const tipsDiv = document.createElement('div');
    tipsDiv.className = 'bg-amber-50 border border-amber-200 rounded-lg p-4';
    const tipsTitle = document.createElement('h4');
    tipsTitle.className = 'font-bold text-amber-800 mb-2 flex items-center gap-2';
    tipsTitle.innerHTML = '<i class="fas fa-lightbulb text-amber-500"></i> 资深运营小贴士';
    tipsDiv.appendChild(tipsTitle);
    const tipsP = document.createElement('p');
    tipsP.className = 'text-sm text-amber-900';
    tipsP.textContent = word.tips;
    tipsDiv.appendChild(tipsP);
    contentContainer.appendChild(tipsDiv);
    
    content.appendChild(contentContainer);

    // 显示动画
    modal.classList.remove('hidden');
    // 强制重绘以触发 transition
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
}

/**
 * 关闭详情
 */
function closeWordDetail(): void {
    const modal = document.getElementById('rw-detail-modal');
    if (!modal) return;

    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200); // 等待动画结束
}

// 暴露给 window 以兼容 onclick (Legacy)
(window as any).showWordDetail = showWordDetail;
(window as any).closeWordDetail = closeWordDetail;

// ================================================================
// Phase 4: 集中注册所有动作到 ActionRegistry
// ================================================================

const restrictedWordsActions: Record<string, (...args: any[]) => void> = {
    showWordDetail: showWordDetail as any,
    closeWordDetail: closeWordDetail as any,
};

registerActionsWithLegacy(restrictedWordsActions);

console.log(
    '✅ [restrictedWordsHandler] 已注册 ' +
        Object.keys(restrictedWordsActions).length +
        ' 个动作到 ActionRegistry'
);

// ================================================================
// Phase 5: 使用 AlpineRegistry 注册组件
// ================================================================

const registry = AlpineRegistry.getInstance();

// 注册 Restricted Words 面板组件
registry.register('restrictedWordsPanel', () => ({
    // 初始化
    init() {
        console.log('✅ [Alpine] Restricted Words 面板组件已初始化');
        initRestrictedWordsPanel();
    },
    
    // 搜索关键词
    searchKeyword: '',
    
    // 搜索模式
    searchMode: 'fuzzy' as SearchMode,
    
    // 选中的分类
    selectedCategory: '',
    
    // 选中的风险等级
    selectedRiskLevel: '',
    
    // 选中的站点
    selectedSite: 'ALL',
    
    // 执行搜索
    performSearch() {
        const input = document.getElementById('rw-search-input') as HTMLInputElement;
        if (input) {
            input.value = this.searchKeyword;
        }
        
        const searchBtn = document.getElementById('rw-search-btn') as HTMLButtonElement;
        if (searchBtn) {
            searchBtn.click();
        }
    },
    
    // 清空搜索
    clearFilters() {
        this.searchKeyword = '';
        this.selectedCategory = '';
        this.selectedRiskLevel = '';
        this.selectedSite = 'ALL';
        
        const clearBtn = document.getElementById('rw-clear-btn') as HTMLButtonElement;
        if (clearBtn) {
            clearBtn.click();
        }
    },
    
    // 查看详情
    viewDetail(wordId: string) {
        showWordDetail(wordId);
    },
    
    // 关闭详情
    closeDetailModal() {
        closeWordDetail();
    }
}));

console.log('✅ [restrictedWordsHandler] Restricted Words 组件已注册到 AlpineRegistry');
