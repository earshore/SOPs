// 高危词库搜索、筛选、渲染逻辑
import {
    RESTRICTED_WORDS_DATABASE,
    RISK_LEVELS,
    WORD_CATEGORIES,
    EU_SITES
} from './constants/restrictedWordsConstants.js';

let currentResults = [...RESTRICTED_WORDS_DATABASE];
let activeFilters = {
    categories: [],
    riskLevels: [],
    sites: []
};

// 初始化面板
export function initRestrictedWordsPanel() {
    renderFilterButtons();
    renderResults(currentResults);
    bindEventListeners();
    updateStats();
}

// 绑定事件监听
function bindEventListeners() {
    // 搜索输入
    const searchInput = document.getElementById('rw-search-input');
    const searchBtn = document.getElementById('rw-search-btn');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // 清除搜索
    const clearBtn = document.getElementById('rw-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            activeFilters = { categories: [], riskLevels: [], sites: [] };
            currentResults = [...RESTRICTED_WORDS_DATABASE];
            renderResults(currentResults);
            updateStats();
            // 重置筛选按钮状态
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        });
    }
}

// 处理搜索
function handleSearch() {
    const query = document.getElementById('rw-search-input').value.trim();
    const mode = document.getElementById('rw-search-mode').value;

    if (!query) {
        currentResults = applyFilters(RESTRICTED_WORDS_DATABASE);
    } else {
        currentResults = searchWords(query, mode);
        currentResults = applyFilters(currentResults);
    }

    renderResults(currentResults);
    updateStats();
}

// 搜索词条（四种模式）
function searchWords(query, mode) {
    const lowerQuery = query.toLowerCase();

    return RESTRICTED_WORDS_DATABASE.filter(word => {
        switch (mode) {
            case 'exact':
                // 精确匹配
                return word.keyword.toLowerCase() === lowerQuery ||
                    word.variants.some(v => v.toLowerCase() === lowerQuery);

            case 'fuzzy':
                // 模糊搜索（包含）
                return word.keyword.toLowerCase().includes(lowerQuery) ||
                    word.variants.some(v => v.toLowerCase().includes(lowerQuery));

            case 'fulltext':
                // 全文检索
                const searchableText = [
                    word.keyword,
                    ...word.variants,
                    word.riskDescription,
                    word.legalBasis,
                    ...word.alternatives,
                    ...word.commonProducts,
                    word.tips
                ].join(' ').toLowerCase();
                return searchableText.includes(lowerQuery);

            case 'regex':
                // 正则表达式
                try {
                    const regex = new RegExp(query, 'i');
                    return regex.test(word.keyword) ||
                        word.variants.some(v => regex.test(v));
                } catch (e) {
                    console.error('Invalid regex:', e);
                    return false;
                }

            default:
                return false;
        }
    });
}

// 应用筛选器
function applyFilters(results) {
    let filtered = results;

    // 分类筛选
    if (activeFilters.categories.length > 0) {
        filtered = filtered.filter(w => activeFilters.categories.includes(w.category));
    }

    // 风险等级筛选
    if (activeFilters.riskLevels.length > 0) {
        filtered = filtered.filter(w => activeFilters.riskLevels.includes(w.riskLevel));
    }

    // 站点筛选
    if (activeFilters.sites.length > 0) {
        filtered = filtered.filter(w =>
            w.affectedSites.some(site => activeFilters.sites.includes(site))
        );
    }

    return filtered;
}

// 渲染筛选按钮
function renderFilterButtons() {
    // 渲染分类筛选
    const categoryContainer = document.getElementById('rw-category-filters');
    if (categoryContainer) {
        categoryContainer.innerHTML = Object.entries(WORD_CATEGORIES)
            .map(([code, cat]) => `
        <button class="filter-btn filter-cat-${cat.color}" data-filter="category" data-value="${code}">
          <i class="fas ${cat.icon}"></i> ${cat.label}
        </button>
      `).join('');

        categoryContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleFilter('categories', btn.dataset.value, btn));
        });
    }

    // 渲染风险等级筛选
    const riskContainer = document.getElementById('rw-risk-filters');
    if (riskContainer) {
        riskContainer.innerHTML = [5, 4, 3, 2, 1]
            .map(level => {
                const risk = RISK_LEVELS[level];
                return `
          <button class="filter-btn filter-risk-${risk.color}" data-filter="risk" data-value="${level}">
            ${risk.icon} ${risk.label}
          </button>
        `;
            }).join('');

        riskContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => toggleFilter('riskLevels', parseInt(btn.dataset.value), btn));
        });
    }
}

// 切换筛选器
function toggleFilter(filterType, value, btnElement) {
    const index = activeFilters[filterType].indexOf(value);

    if (index > -1) {
        activeFilters[filterType].splice(index, 1);
        btnElement.classList.remove('active');
    } else {
        activeFilters[filterType].push(value);
        btnElement.classList.add('active');
    }

    handleSearch();
}

// 渲染结果表格
function renderResults(results) {
    const tbody = document.getElementById('rw-results-tbody');

    if (!tbody) return;

    if (results.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-500">
          <i class="fas fa-search text-4xl mb-2"></i>
          <p>未找到匹配的词条</p>
        </td>
      </tr>
    `;
        return;
    }

    tbody.innerHTML = results.map(word => {
        const risk = RISK_LEVELS[word.riskLevel];
        const category = WORD_CATEGORIES[word.category];

        return `
      <tr class="hover:bg-slate-50 border-b border-slate-100">
        <td class="px-3 py-3">
          <div class="font-bold text-slate-800">${word.keyword}</div>
          <div class="text-xs text-slate-500">${word.variants.slice(0, 2).join(', ')}</div>
        </td>
        <td class="px-3 py-3">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs bg-${category.color}-100 text-${category.color}-700">
            <i class="fas ${category.icon} mr-1"></i> ${category.label}
          </span>
        </td>
        <td class="px-3 py-3 text-center">
          <span class="text-lg">${risk.icon}</span>
          <div class="text-xs text-${risk.color}-600">${risk.label}</div>
        </td>
        <td class="px-3 py-3">
          <div class="flex flex-wrap gap-1">
            ${word.affectedSites.slice(0, 3).map(site => `
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">${site}</span>
            `).join('')}
            ${word.affectedSites.length > 3 ? `<span class="text-xs text-slate-500">+${word.affectedSites.length - 3}</span>` : ''}
          </div>
        </td>
        <td class="px-3 py-3 text-xs text-slate-600">
          ${word.commonProducts.slice(0, 2).join(', ')}
        </td>
        <td class="px-3 py-3">
          <button 
            onclick="showWordDetail('${word.id}')"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
            详情
          </button>
        </td>
      </tr>
    `;
    }).join('');
}

// 显示词条详情
window.showWordDetail = function (wordId) {
    const word = RESTRICTED_WORDS_DATABASE.find(w => w.id === wordId);
    if (!word) return;

    const modal = document.getElementById('rw-detail-modal');
    const content = document.getElementById('rw-detail-content');

    if (!modal || !content) return;

    const risk = RISK_LEVELS[word.riskLevel];
    const category = WORD_CATEGORIES[word.category];

    content.innerHTML = `
    <div class="mb-4 pb-4 border-b">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-2xl font-bold text-slate-800">${word.keyword}</h3>
        <span class="text-3xl">${risk.icon}</span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="px-3 py-1 rounded bg-${category.color}-100 text-${category.color}-700">
          <i class="fas ${category.icon}"></i> ${category.label}
        </span>
        <span class="text-slate-600">ID: ${word.id}</span>
      </div>
    </div>
    
    <div class="space-y-4 text-sm">
      <div>
        <h4 class="font-bold text-slate-700 mb-1">变体写法</h4>
        <p class="text-slate-600">${word.variants.join(' / ')}</p>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">风险解读</h4>
        <p class="text-slate-600">${word.riskDescription}</p>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">法规依据</h4>
        <p class="text-slate-600">${word.legalBasis}</p>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">受影响站点</h4>
        <div class="flex flex-wrap gap-2">
          ${word.affectedSites.map(site => `
            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded">${site}</span>
          `).join('')}
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">常见触雷产品</h4>
        <p class="text-slate-600">${word.commonProducts.join(', ')}</p>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">安全替代词</h4>
        <div class="bg-green-50 p-3 rounded">
          ${word.alternatives.map(alt => `<div class="text-green-700">✓ ${alt}</div>`).join('')}
        </div>
      </div>
      
      <div>
        <h4 class="font-bold text-slate-700 mb-1">💡 运营小贴士</h4>
        <p class="text-amber-700 bg-amber-50 p-3 rounded">${word.tips}</p>
      </div>
    </div>
  `;

    modal.classList.remove('hidden');
};

// 关闭详情弹窗
window.closeWordDetail = function () {
    const modal = document.getElementById('rw-detail-modal');
    if (modal) modal.classList.add('hidden');
};

// 更新统计信息
function updateStats() {
    const statsEl = document.getElementById('rw-stats');
    if (statsEl) {
        statsEl.textContent = `共 ${currentResults.length} 条结果`;
    }
}
