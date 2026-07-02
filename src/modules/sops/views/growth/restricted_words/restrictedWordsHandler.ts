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
import * as actionRegistry from '../../../../../common/utils/actionRegistry';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '../../../../../common/infrastructure/AlpineRegistry';

type SearchMode = 'fuzzy' | 'exact' | 'fulltext' | 'regex';
type SiteContext = string;
type RestrictedWord = (typeof RESTRICTED_WORDS_DATABASE)[number];
type RiskLevel = keyof typeof RISK_LEVELS;
type WordCategory = keyof typeof WORD_CATEGORIES;
type LocalizedKeywords = Partial<Record<string, string>>;
type WordDisplay = {
  displayKeyword: string;
  subDisplay: string;
};
type RiskConfig = (typeof RISK_LEVELS)[RiskLevel];
type CategoryConfig = (typeof WORD_CATEGORIES)[WordCategory];

interface ActiveFilters {
  category: string;
  riskLevel: string;
  searchMode: SearchMode;
  searchQuery: string;
}

/**
 * Restricted Words Panel Alpine 组件接口
 */
interface RestrictedWordsPanelComponent {
  searchKeyword: string;
  searchMode: SearchMode;
  selectedCategory: string;
  selectedRiskLevel: string;
  selectedSite: string;
  init(): void;
  performSearch(): void;
  clearFilters(): void;
  viewDetail(wordId: string): void;
  closeDetailModal(): void;
}

let currentResults = [...RESTRICTED_WORDS_DATABASE];
let currentSiteContext: SiteContext = 'ALL';
let removeEventListeners: (() => void) | null = null;
let registeredActions: string[] = [];

let activeFilters: ActiveFilters = {
  category: '',
  riskLevel: '',
  searchMode: 'fuzzy',
  searchQuery: '',
};

// 获取 SafeRenderer 实例
const renderer = SafeRenderer.getInstance();

function clearElement(element: Element): void {
  element.textContent = '';
}

function appendIcon(parent: Element, className: string): HTMLElement {
  const icon = document.createElement('i');
  icon.className = className;
  parent.appendChild(icon);
  return icon;
}

function appendAffectedSites(container: Element, sites: string[]): void {
  const maxDisplay = 4;

  if (sites.includes('EU')) {
    const span = document.createElement('span');
    span.className = 'px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold';
    span.textContent = '🇪🇺 EU ALL';
    container.appendChild(span);
    return;
  }

  sites.slice(0, maxDisplay).forEach(site => {
    const span = document.createElement('span');
    span.className =
      'px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px]';
    span.textContent = site;
    container.appendChild(span);
  });

  if (sites.length > maxDisplay) {
    const more = document.createElement('span');
    more.className = 'text-[10px] text-slate-400 flex items-center';
    more.textContent = `+${sites.length - maxDisplay}`;
    container.appendChild(more);
  }
}

function getRiskLevelConfig(level: number): (typeof RISK_LEVELS)[RiskLevel] {
  return RISK_LEVELS[level as RiskLevel] || RISK_LEVELS[1];
}

function getWordCategoryConfig(category: string): (typeof WORD_CATEGORIES)[WordCategory] {
  return WORD_CATEGORIES[category as WordCategory] || WORD_CATEGORIES.MAT;
}

function getLocalizedKeyword(word: RestrictedWord, site: string): string | undefined {
  return (word.localizedKeywords as LocalizedKeywords | undefined)?.[site];
}

/**
 * 初始化面板
 */
export function initRestrictedWordsPanel(): void {
  cleanupRestrictedWordsPanel();
  populateFilterDropdowns();
  renderResults();
  bindEventListeners();
  registerRestrictedWordsActions();
}

export function cleanupRestrictedWordsPanel(): void {
  removeEventListeners?.();
  removeEventListeners = null;

  if (registeredActions.length > 0 && 'unregisterActions' in actionRegistry) {
    actionRegistry.unregisterActions(registeredActions);
  }
  registeredActions = [];

  delete legacyWindow.showWordDetail;
  delete legacyWindow.closeWordDetail;
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
      .map(level => {
        const risk = getRiskLevelConfig(level);
        return `<option value="${level}">${risk.icon} ${risk.label}</option>`;
      })
      .join('');
    // ✅ 使用 SafeRenderer 渲染静态模板
    renderer.renderTemplate(riskSelect, `<option value="">全部</option>` + options);
  }
}

/**
 * 绑定事件监听
 */
function bindEventListeners(): void {
  removeEventListeners?.();
  const cleanupFns: Array<() => void> = [];
  const addListener = (target: EventTarget | null, type: string, listener: EventListener): void => {
    if (!target) return;
    target.addEventListener(type, listener);
    cleanupFns.push(() => target.removeEventListener(type, listener));
  };

  // 搜索输入
  const searchInput = document.getElementById('rw-search-input') as HTMLInputElement | null;
  const searchBtn = document.getElementById('rw-search-btn');
  const clearBtn = document.getElementById('rw-clear-btn');
  const searchModeSelect = document.getElementById('rw-search-mode') as HTMLSelectElement | null;

  addListener(searchBtn, 'click', () => executeSearch());
  addListener(searchInput, 'keypress', e => {
    if ((e as KeyboardEvent).key === 'Enter') executeSearch();
  });
  addListener(clearBtn, 'click', () => resetFilters());

  // 过滤器变更
  const catFilter = document.getElementById('rw-filter-category') as HTMLSelectElement | null;
  const riskFilter = document.getElementById('rw-filter-risk') as HTMLSelectElement | null;
  const siteContext = document.getElementById('rw-site-context') as HTMLSelectElement | null;

  addListener(catFilter, 'change', e => {
    activeFilters.category = (e.target as HTMLSelectElement).value;
    executeSearch();
  });

  addListener(riskFilter, 'change', e => {
    activeFilters.riskLevel = (e.target as HTMLSelectElement).value;
    executeSearch();
  });

  addListener(siteContext, 'change', e => {
    currentSiteContext = (e.target as HTMLSelectElement).value;
    executeSearch();
  });

  addListener(searchModeSelect, 'change', e => {
    activeFilters.searchMode = (e.target as HTMLSelectElement).value as SearchMode;
    // 模式切换不自动触发搜索，除非已有输入
    const input = document.getElementById('rw-search-input') as HTMLInputElement | null;
    if (input && input.value.trim()) {
      executeSearch();
    }
  });

  // 模态框关闭 (ESC键)
  addListener(document, 'keydown', e => {
    if ((e as KeyboardEvent).key === 'Escape') closeWordDetail();
  });

  removeEventListeners = () => {
    cleanupFns.forEach(cleanup => cleanup());
    removeEventListeners = null;
  };
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
      word => word.affectedSites.includes(currentSiteContext) || word.affectedSites.includes('EU')
    );
  }

  // 2. 关键词搜索
  if (query) {
    const lowerQuery = query.toLowerCase();

    filtered = filtered.filter(word => {
      const mainKw = word.keyword.toLowerCase();
      // 获取当前所有相关文本用于搜索
      const variants = (word.variants || []).map(v => v.toLowerCase());
      const localKws = Object.values(word.localizedKeywords || {}).map(v => v.toLowerCase());
      const allKeywords = [mainKw, ...variants, ...localKws];

      switch (searchMode) {
        case 'exact':
          return allKeywords.includes(lowerQuery);

        case 'fuzzy':
          return allKeywords.some(k => k.includes(lowerQuery));

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
            return regex.test(word.keyword) || variants.some(v => regex.test(v));
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
    filtered = filtered.filter(w => w.category === activeFilters.category);
  }

  if (activeFilters.riskLevel) {
    // 转换成数字比较
    const targetLevel = parseInt(activeFilters.riskLevel);
    filtered = filtered.filter(w => w.riskLevel === targetLevel);
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

function renderEmptyResults(tbody: HTMLElement): void {
  renderer.renderTemplate(
    tbody,
    `
        <tr>
            <td colspan="6" class="text-center py-12 text-slate-400">
                <div class="flex flex-col items-center">
                    <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
                    <p>没有找到相关高危词条</p>
                    <p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
                </div>
            </td>
        </tr>
    `
  );
}

function getWordDisplay(word: RestrictedWord): WordDisplay {
  const localWord =
    currentSiteContext !== 'ALL' ? getLocalizedKeyword(word, currentSiteContext) : undefined;
  const baseSubDisplay = word.variants.slice(0, 3).join(', ');

  if (!localWord) {
    return { displayKeyword: word.keyword, subDisplay: baseSubDisplay };
  }

  return {
    displayKeyword: localWord,
    subDisplay:
      localWord !== word.keyword
        ? `${word.keyword}${baseSubDisplay ? ', ' + baseSubDisplay : ''}`
        : baseSubDisplay,
  };
}

function createKeywordCell(word: RestrictedWord): HTMLTableCellElement {
  const { displayKeyword, subDisplay } = getWordDisplay(word);
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
  return keywordTd;
}

function createCategoryCell(word: RestrictedWord): HTMLTableCellElement {
  const category = getWordCategoryConfig(word.category);
  const categoryTd = document.createElement('td');
  categoryTd.className = 'px-4 py-3 align-top';

  const categorySpan = document.createElement('span');
  categorySpan.className = `inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100`;
  appendIcon(categorySpan, `fas ${category.icon}`);
  categorySpan.appendChild(document.createTextNode(' ' + category.label));
  categoryTd.appendChild(categorySpan);

  if (word.subCategory) {
    const subCatDiv = document.createElement('div');
    subCatDiv.className = 'text-[10px] text-slate-400 mt-1 pl-1';
    subCatDiv.textContent = word.subCategory;
    categoryTd.appendChild(subCatDiv);
  }

  return categoryTd;
}

function createRiskCell(word: RestrictedWord): HTMLTableCellElement {
  const risk = getRiskLevelConfig(word.riskLevel);
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
  return riskTd;
}

function createSitesCell(word: RestrictedWord): HTMLTableCellElement {
  const sitesTd = document.createElement('td');
  sitesTd.className = 'px-4 py-3 align-top';
  const sitesDiv = document.createElement('div');
  sitesDiv.className = 'flex flex-wrap gap-1';
  appendAffectedSites(sitesDiv, word.affectedSites);
  sitesTd.appendChild(sitesDiv);
  return sitesTd;
}

function createProductsCell(word: RestrictedWord): HTMLTableCellElement {
  const productsTd = document.createElement('td');
  productsTd.className = 'px-4 py-3 align-top text-xs text-slate-600';
  const productsDiv = document.createElement('div');
  productsDiv.className = 'line-clamp-2';
  productsDiv.textContent = word.commonProducts.join(', ');
  productsDiv.title = word.commonProducts.join(', ');
  productsTd.appendChild(productsDiv);
  return productsTd;
}

function createActionCell(word: RestrictedWord): HTMLTableCellElement {
  const actionTd = document.createElement('td');
  actionTd.className = 'px-4 py-3 align-top text-center';
  const detailBtn = document.createElement('button');
  detailBtn.className =
    'px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-md text-xs font-medium transition-all shadow-sm';
  detailBtn.textContent = '详情';
  detailBtn.addEventListener('click', () => showWordDetail(word.id));
  actionTd.appendChild(detailBtn);
  return actionTd;
}

function createResultRow(word: RestrictedWord): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-50 border-b border-slate-100 transition-colors';
  tr.appendChild(createKeywordCell(word));
  tr.appendChild(createCategoryCell(word));
  tr.appendChild(createRiskCell(word));
  tr.appendChild(createSitesCell(word));
  tr.appendChild(createProductsCell(word));
  tr.appendChild(createActionCell(word));
  return tr;
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
    renderEmptyResults(tbody);
    return;
  }

  const rows = currentResults.map(createResultRow);
  clearElement(tbody);
  rows.forEach(row => tbody.appendChild(row));
}

function createDetailBadge(text: string, className: string): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function createWordDetailHeader(
  word: RestrictedWord,
  risk: RiskConfig,
  category: CategoryConfig
): HTMLDivElement {
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center gap-4';

  const iconDiv = document.createElement('div');
  iconDiv.className = `w-12 h-12 rounded-lg bg-${risk.color}-100 flex items-center justify-center text-2xl`;
  iconDiv.textContent = risk.icon;

  const infoDiv = document.createElement('div');
  const h3 = document.createElement('h3');
  h3.className = 'text-xl font-bold text-slate-800 flex items-center gap-3';
  h3.textContent = word.keyword;
  h3.appendChild(
    createDetailBadge(
      `ID: ${word.id}`,
      'text-xs font-normal text-slate-400 border border-slate-200 rounded px-1.5 py-0.5'
    )
  );

  const badgesDiv = document.createElement('div');
  badgesDiv.className = 'flex items-center gap-2 mt-1';
  badgesDiv.appendChild(
    createDetailBadge(
      category.label,
      `px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100`
    )
  );
  badgesDiv.appendChild(
    createDetailBadge(
      `风险等级 ${word.riskLevel}: ${risk.label}`,
      `px-2 py-0.5 rounded text-xs font-medium bg-${risk.color}-50 text-${risk.color}-700 border border-${risk.color}-100`
    )
  );

  infoDiv.appendChild(h3);
  infoDiv.appendChild(badgesDiv);
  headerDiv.appendChild(iconDiv);
  headerDiv.appendChild(infoDiv);
  return headerDiv;
}

function createLocalizedKeywordsSection(word: RestrictedWord): HTMLDivElement {
  const localizedDiv = document.createElement('div');
  localizedDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-100';

  const localizedTitle = document.createElement('h4');
  localizedTitle.className = 'text-xs font-bold text-slate-500 uppercase mb-2';
  localizedTitle.textContent = '站点本地化写法';
  localizedDiv.appendChild(localizedTitle);

  const localizedContent = document.createElement('div');
  localizedContent.className = 'space-y-1';
  const localizedEntries = Object.entries(word.localizedKeywords || {});

  if (localizedEntries.length === 0) {
    localizedContent.appendChild(createDetailBadge('无特定本地化差异', 'text-slate-400 text-sm'));
  }

  localizedEntries.forEach(([site, localKw]) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'flex justify-between text-sm';
    entryDiv.appendChild(createDetailBadge(`${site}:`, 'font-medium text-slate-600'));
    entryDiv.appendChild(createDetailBadge(String(localKw), 'text-slate-800 font-bold'));
    localizedContent.appendChild(entryDiv);
  });

  localizedDiv.appendChild(localizedContent);
  return localizedDiv;
}

function createVariantsSection(word: RestrictedWord): HTMLDivElement {
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
  return variantsDiv;
}

function createVariantsGrid(word: RestrictedWord): HTMLDivElement {
  const variantsGrid = document.createElement('div');
  variantsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
  variantsGrid.appendChild(createLocalizedKeywordsSection(word));
  variantsGrid.appendChild(createVariantsSection(word));
  return variantsGrid;
}

function createRiskDescriptionSection(word: RestrictedWord): HTMLDivElement {
  const riskDiv = document.createElement('div');
  riskDiv.className = 'content-callout content-callout--danger p-4';

  const riskTitle = document.createElement('h4');
  riskTitle.className = 'font-bold text-red-800 mb-1 flex items-center gap-2';
  appendIcon(riskTitle, 'fas fa-triangle-exclamation');
  riskTitle.appendChild(document.createTextNode(' 风险解读'));
  riskDiv.appendChild(riskTitle);

  const riskDesc = document.createElement('p');
  riskDesc.className = 'text-sm text-red-900 leading-relaxed';
  riskDesc.textContent = word.riskDescription;
  riskDiv.appendChild(riskDesc);

  const legalDiv = document.createElement('div');
  legalDiv.className = 'mt-3 pt-3 border-t border-red-100 flex items-start gap-2';
  appendIcon(legalDiv, 'fas fa-gavel text-red-400 mt-0.5 text-xs');
  const legalContent = document.createElement('div');
  legalContent.appendChild(createDetailBadge('法规依据:', 'text-xs font-bold text-red-800'));
  legalContent.appendChild(document.createTextNode(' '));
  legalContent.appendChild(createDetailBadge(word.legalBasis, 'text-xs text-red-700 italic'));
  legalDiv.appendChild(legalContent);
  riskDiv.appendChild(legalDiv);
  return riskDiv;
}

function createAlternativesSection(word: RestrictedWord): HTMLDivElement {
  const alternativesDiv = document.createElement('div');
  const altTitle = document.createElement('h4');
  altTitle.className = 'font-bold text-slate-800 mb-3 flex items-center gap-2';
  appendIcon(altTitle, 'fas fa-check-circle text-green-500');
  altTitle.appendChild(document.createTextNode(' 安全替代方案'));
  alternativesDiv.appendChild(altTitle);

  const altList = document.createElement('ul');
  altList.className = 'space-y-2';
  word.alternatives.forEach(alt => {
    const li = document.createElement('li');
    li.className =
      'flex items-start gap-2 text-sm bg-green-50 text-green-800 px-3 py-2 rounded border border-green-100';
    appendIcon(li, 'fas fa-check mt-0.5 text-xs');
    li.appendChild(createDetailBadge(alt, ''));
    altList.appendChild(li);
  });
  alternativesDiv.appendChild(altList);
  return alternativesDiv;
}

function createProductsSection(word: RestrictedWord): HTMLDivElement {
  const productsDiv = document.createElement('div');
  const prodTitle = document.createElement('h4');
  prodTitle.className = 'font-bold text-slate-800 mb-3 flex items-center gap-2';
  appendIcon(prodTitle, 'fas fa-bullseye text-blue-500');
  prodTitle.appendChild(document.createTextNode(' 常见触雷场景'));
  productsDiv.appendChild(prodTitle);

  const prodContainer = document.createElement('div');
  prodContainer.className = 'flex flex-wrap gap-2';
  word.commonProducts.forEach(prod => {
    prodContainer.appendChild(
      createDetailBadge(
        prod,
        'px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200'
      )
    );
  });
  productsDiv.appendChild(prodContainer);
  return productsDiv;
}

function createSolutionsGrid(word: RestrictedWord): HTMLDivElement {
  const solutionsGrid = document.createElement('div');
  solutionsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
  solutionsGrid.appendChild(createAlternativesSection(word));
  solutionsGrid.appendChild(createProductsSection(word));
  return solutionsGrid;
}

function createTipsSection(word: RestrictedWord): HTMLDivElement {
  const tipsDiv = document.createElement('div');
  tipsDiv.className = 'bg-amber-50 border border-amber-200 rounded-lg p-4';

  const tipsTitle = document.createElement('h4');
  tipsTitle.className = 'font-bold text-amber-800 mb-2 flex items-center gap-2';
  appendIcon(tipsTitle, 'fas fa-lightbulb text-amber-500');
  tipsTitle.appendChild(document.createTextNode(' 资深运营小贴士'));
  tipsDiv.appendChild(tipsTitle);

  const tipsP = document.createElement('p');
  tipsP.className = 'text-sm text-amber-900';
  tipsP.textContent = word.tips;
  tipsDiv.appendChild(tipsP);
  return tipsDiv;
}

function createWordDetailContent(word: RestrictedWord): HTMLDivElement {
  const contentContainer = document.createElement('div');
  contentContainer.className = 'space-y-6';
  contentContainer.appendChild(createVariantsGrid(word));
  contentContainer.appendChild(createRiskDescriptionSection(word));
  contentContainer.appendChild(createSolutionsGrid(word));
  contentContainer.appendChild(createTipsSection(word));
  return contentContainer;
}

function openWordDetailModal(modal: HTMLElement): void {
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
}

/**
 * 显示详情
 */
function showWordDetail(wordId: string): void {
  const word = RESTRICTED_WORDS_DATABASE.find(w => w.id === wordId);
  if (!word) return;

  const modal = document.getElementById('rw-detail-modal');
  const header = document.getElementById('rw-modal-header');
  const content = document.getElementById('rw-detail-content');

  if (!modal || !header || !content) return;

  clearElement(header);
  header.appendChild(
    createWordDetailHeader(
      word,
      getRiskLevelConfig(word.riskLevel),
      getWordCategoryConfig(word.category)
    )
  );

  clearElement(content);
  content.appendChild(createWordDetailContent(word));
  openWordDetailModal(modal);
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

// 暴露给 window 以兼容旧模板调用 (Legacy)
const legacyWindow = window as Window & {
  showWordDetail?: (wordId: string) => void;
  closeWordDetail?: () => void;
};

// ================================================================
// Phase 4: 集中注册所有动作到 ActionRegistry
// ================================================================

const restrictedWordsActions: Record<string, (...args: unknown[]) => void> = {
  showWordDetail: wordId => {
    if (typeof wordId === 'string') showWordDetail(wordId);
  },
  closeWordDetail: () => closeWordDetail(),
};

function registerRestrictedWordsActions(): void {
  if (registeredActions.length > 0) return;

  // 暴露给 window 以兼容旧模板调用 (Legacy)
  legacyWindow.showWordDetail = showWordDetail;
  legacyWindow.closeWordDetail = closeWordDetail;

  const actionNames = actionRegistry.registerActionsWithLegacy(restrictedWordsActions);
  registeredActions = Array.isArray(actionNames)
    ? actionNames
    : Object.keys(restrictedWordsActions);
}

// ================================================================
// Phase 5: 使用 AlpineRegistry 注册组件
// ================================================================

const registry = AlpineRegistry.getInstance();

// 注册 Restricted Words 面板组件
registry.register(
  'restrictedWordsPanel',
  (): RestrictedWordsPanelComponent => ({
    // 初始化
    init() {
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
    performSearch(this: RestrictedWordsPanelComponent) {
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
    clearFilters(this: RestrictedWordsPanelComponent) {
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
    },
  })
);
