// 高危词库搜索、筛选、渲染逻辑
// 🎯 Phase 4: 迁移 window 全局函数到 ActionRegistry
import {
  RESTRICTED_WORDS_DATABASE,
  RISK_LEVELS,
  WORD_CATEGORIES,
  EU_SITES
} from './constants/restrictedWordsConstants.js';
import { registerActionsWithLegacy } from "../../../../../common/utils/actionRegistry.js";

let currentResults = [...RESTRICTED_WORDS_DATABASE];
let currentSiteContext = 'ALL'; // 当前选中的站点上下文

let activeFilters = {
  category: '',
  riskLevel: '',
  searchMode: 'fuzzy',
  searchQuery: ''
};

// 初始化面板
export function initRestrictedWordsPanel() {
  populateFilterDropdowns();
  renderResults();
  bindEventListeners();
}

// 填充下拉菜单选项
function populateFilterDropdowns() {
  // 分类下拉
  const catSelect = document.getElementById('rw-filter-category');
  if (catSelect) {
    const options = Object.entries(WORD_CATEGORIES).map(([code, cat]) =>
      `<option value="${code}">${cat.label}</option>`
    ).join('');
    catSelect.innerHTML = `<option value="">全部分类</option>` + options;
  }

  // 风险等级下拉
  const riskSelect = document.getElementById('rw-filter-risk');
  if (riskSelect) {
    // 倒序排列，高风险在前
    const options = [5, 4, 3, 2, 1].map(level =>
      `<option value="${level}">${RISK_LEVELS[level].icon} ${RISK_LEVELS[level].label}</option>`
    ).join('');
    riskSelect.innerHTML = `<option value="">全部</option>` + options;
  }
}

// 绑定事件监听
function bindEventListeners() {
  // 搜索输入
  const searchInput = document.getElementById('rw-search-input');
  const searchBtn = document.getElementById('rw-search-btn');
  const clearBtn = document.getElementById('rw-clear-btn');
  const searchModeSelect = document.getElementById('rw-search-mode');

  if (searchBtn) {
    searchBtn.addEventListener('click', executeSearch);
  }
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
    // 可选：实时搜索 (防抖)
    // searchInput.addEventListener('input', debounce(executeSearch, 300));
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', resetFilters);
  }

  // 过滤器变更
  const catFilter = document.getElementById('rw-filter-category');
  const riskFilter = document.getElementById('rw-filter-risk');
  const siteContext = document.getElementById('rw-site-context');

  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      activeFilters.category = e.target.value;
      executeSearch();
    });
  }

  if (riskFilter) {
    riskFilter.addEventListener('change', (e) => {
      activeFilters.riskLevel = e.target.value;
      executeSearch();
    });
  }

  if (siteContext) {
    siteContext.addEventListener('change', (e) => {
      currentSiteContext = e.target.value;
      executeSearch();
    });
  }

  if (searchModeSelect) {
    searchModeSelect.addEventListener('change', (e) => {
      activeFilters.searchMode = e.target.value;
      // 模式切换不自动触发搜索，除非已有输入
      if (document.getElementById('rw-search-input').value.trim()) {
        executeSearch();
      }
    });
  }

  // 模态框关闭 (ESC键)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWordDetail();
  });
}

// 执行综合搜索与筛选
function executeSearch() {
  const query = document.getElementById('rw-search-input').value.trim();
  const searchMode = document.getElementById('rw-search-mode').value;

  activeFilters.searchQuery = query;
  activeFilters.searchMode = searchMode;

  // 1. 站点预筛选
  let filtered = RESTRICTED_WORDS_DATABASE;

  if (currentSiteContext !== 'ALL') {
    filtered = filtered.filter(word =>
      word.affectedSites.includes(currentSiteContext) || word.affectedSites.includes('EU')
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
            word.tips
          ].join(' ').toLowerCase();
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
    filtered = filtered.filter(w => w.riskLevel == activeFilters.riskLevel);
  }

  currentResults = filtered;
  renderResults();
}

// 重置
function resetFilters() {
  document.getElementById('rw-search-input').value = '';
  document.getElementById('rw-filter-category').value = '';
  document.getElementById('rw-filter-risk').value = '';
  document.getElementById('rw-site-context').value = 'ALL';

  activeFilters = {
    category: '',
    riskLevel: '',
    searchMode: 'fuzzy',
    searchQuery: ''
  };
  currentSiteContext = 'ALL';
  currentResults = [...RESTRICTED_WORDS_DATABASE];

  executeSearch();
}

// 渲染结果
function renderResults() {
  const tbody = document.getElementById('rw-results-tbody');
  const statsDisplay = document.getElementById('rw-stats-display');

  if (statsDisplay) {
    statsDisplay.textContent = `显示 ${currentResults.length} 条结果`;
  }

  if (!tbody) return;

  if (currentResults.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-400">
          <div class="flex flex-col items-center">
            <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
            <p>没有找到相关高危词条</p>
            <p class="text-xs mt-1">尝试切换搜索模式或清除筛选条件</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = currentResults.map(word => {
    const risk = RISK_LEVELS[word.riskLevel];
    const category = WORD_CATEGORIES[word.category];

    // 智能显示关键词：如果有选中站点且有对应的本地化词，优先显示本地化词
    let displayKeyword = word.keyword;
    let subDisplay = word.variants.slice(0, 3).join(', ');

    if (currentSiteContext !== 'ALL' && word.localizedKeywords && word.localizedKeywords[currentSiteContext]) {
      const localWord = word.localizedKeywords[currentSiteContext];
      displayKeyword = localWord;
      // 在副标显示英文原词
      if (localWord !== word.keyword) {
        subDisplay = `${word.keyword}${subDisplay ? ', ' + subDisplay : ''}`;
      }
    }

    return `
      <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
        <td class="px-4 py-3 align-top">
          <div class="font-bold text-slate-800 text-base mb-0.5 break-all">${displayKeyword}</div>
          <div class="text-xs text-slate-500 line-clamp-2">${subDisplay || '-'}</div>
        </td>
        <td class="px-4 py-3 align-top">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100">
            <i class="fas ${category.icon}"></i> ${category.label}
          </span>
          ${word.subCategory ? `<div class="text-[10px] text-slate-400 mt-1 pl-1">${word.subCategory}</div>` : ''}
        </td>
        <td class="px-4 py-3 align-top text-center">
          <div class="flex flex-col items-center">
            <span class="text-xl mb-0.5" title="${risk.label}">${risk.icon}</span>
            <span class="px-1.5 text-[10px] font-bold rounded bg-${risk.color}-100 text-${risk.color}-700">
              ${word.riskLevel}级
            </span>
          </div>
        </td>
        <td class="px-4 py-3 align-top">
          <div class="flex flex-wrap gap-1">
            ${renderAffectedSites(word.affectedSites)}
          </div>
        </td>
        <td class="px-4 py-3 align-top text-xs text-slate-600">
          <div class="line-clamp-2" title="${word.commonProducts.join(', ')}">
            ${word.commonProducts.join(', ')}
          </div>
        </td>
        <td class="px-4 py-3 align-top text-center">
          <button 
            onclick="showWordDetail('${word.id}')"
            class="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-md text-xs font-medium transition-all shadow-sm">
            详情
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 渲染站点标签
function renderAffectedSites(sites) {
  // 如果包含了所有主要站点，显示 EU 标志
  // 但这里简单处理，遍历显示
  const maxDisplay = 4;

  if (sites.includes('EU')) {
    return `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">🇪🇺 EU ALL</span>`;
  }

  let html = sites.slice(0, maxDisplay).map(site =>
    `<span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px]">${site}</span>`
  ).join('');

  if (sites.length > maxDisplay) {
    html += `<span class="text-[10px] text-slate-400 flex items-center">+${sites.length - maxDisplay}</span>`;
  }

  return html;
}

// 显示详情
function showWordDetail(wordId) {
  const word = RESTRICTED_WORDS_DATABASE.find(w => w.id === wordId);
  if (!word) return;

  const modal = document.getElementById('rw-detail-modal');
  const header = document.getElementById('rw-modal-header');
  const content = document.getElementById('rw-detail-content');

  if (!modal || !header || !content) return;

  const risk = RISK_LEVELS[word.riskLevel];
  const category = WORD_CATEGORIES[word.category];

  // 渲染 Header
  header.innerHTML = `
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-lg bg-${risk.color}-100 flex items-center justify-center text-2xl">
        ${risk.icon}
      </div>
      <div>
        <h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
          ${word.keyword}
          <span class="text-xs font-normal text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ID: ${word.id}</span>
        </h3>
        <div class="flex items-center gap-2 mt-1">
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-100">
            ${category.label}
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-${risk.color}-50 text-${risk.color}-700 border border-${risk.color}-100">
            风险等级 ${word.riskLevel}: ${risk.label}
          </span>
        </div>
      </div>
    </div>
  `;

  // 渲染 Content
  content.innerHTML = `
    <div class="space-y-6">
      
      <!-- 变体与本地化 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">站点本地化写法</h4>
          <div class="space-y-1">
            ${Object.entries(word.localizedKeywords || {}).map(([site, localKw]) => `
              <div class="flex justify-between text-sm">
                <span class="font-medium text-slate-600">${site}:</span>
                <span class="text-slate-800 font-bold">${localKw}</span>
              </div>
            `).join('') || '<span class="text-slate-400 text-sm">无特定本地化差异</span>'}
          </div>
        </div>
        
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-100">
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">其他搜索变体</h4>
          <p class="text-sm text-slate-800 font-mono leading-relaxed">
            ${word.variants.length ? word.variants.join(', ') : '<span class="text-slate-400">无</span>'}
          </p>
        </div>
      </div>

      <!-- 核心风险描述 -->
      <div class="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
        <h4 class="font-bold text-red-800 mb-1 flex items-center gap-2">
          <i class="fas fa-triangle-exclamation"></i> 风险解读
        </h4>
        <p class="text-sm text-red-900 leading-relaxed">${word.riskDescription}</p>
        
        <div class="mt-3 pt-3 border-t border-red-100 flex items-start gap-2">
           <i class="fas fa-gavel text-red-400 mt-0.5 text-xs"></i>
           <div>
             <span class="text-xs font-bold text-red-800">法规依据:</span>
             <span class="text-xs text-red-700 italic">${word.legalBasis}</span>
           </div>
        </div>
      </div>

      <!-- 替代方案 & 场景 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <i class="fas fa-check-circle text-green-500"></i> 安全替代方案
          </h4>
          <ul class="space-y-2">
            ${word.alternatives.map(alt => `
              <li class="flex items-start gap-2 text-sm bg-green-50 text-green-800 px-3 py-2 rounded border border-green-100">
                <i class="fas fa-check mt-0.5 text-xs"></i>
                <span>${alt}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div>
           <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <i class="fas fa-bullseye text-blue-500"></i> 常见触雷场景
          </h4>
          <div class="flex flex-wrap gap-2">
            ${word.commonProducts.map(prod => `
              <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs border border-slate-200">
                ${prod}
              </span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 运营 Tips -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 class="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <i class="fas fa-lightbulb text-amber-500"></i> 资深运营小贴士
        </h4>
        <p class="text-sm text-amber-900">
          ${word.tips}
        </p>
      </div>
    </div>
  `;

  // 显示动画
  modal.classList.remove('hidden');
  // 强制重绘以触发 transition
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
}

// 关闭详情
function closeWordDetail() {
  const modal = document.getElementById('rw-detail-modal');
  if (!modal) return;

  modal.classList.remove('show');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200); // 等待动画结束
}

// 暴露给 window 以兼容 onclick (Legacy)
window.showWordDetail = showWordDetail;
window.closeWordDetail = closeWordDetail;

// ================================================================
// 🎯 Phase 4: 集中注册所有动作到 ActionRegistry
// ================================================================

const restrictedWordsActions = {
  showWordDetail: showWordDetail,
  closeWordDetail: closeWordDetail,
};

registerActionsWithLegacy(restrictedWordsActions);

console.log("✅ [restrictedWordsHandler] 已注册 " + Object.keys(restrictedWordsActions).length + " 个动作到 ActionRegistry");
