// src/modules/amz_hub/views/marketing_calendar/index.js

import { amzf_countries, amzf_months, amzf_events } from "../../services/amz_hub_constants.js";

// ==================== AMZF State ====================
let amzf_currentView = 'country';
let amzf_selectedCountry = 'ALL';
let amzf_searchTerm = '';
let amzf_expandedSections = new Set();
let amzf_debounceTimer = null; // 用于搜索防抖

// ==================== 核心算法：评分与过滤 ====================

/**
 * 计算搜索相关度分数
 * @param {Object} event - 活动对象
 * @param {Array} terms - 分词后的搜索关键词数组
 * @returns {Number} - 分数 (0表示不匹配)
 */
function amzf_calculateScore(event, terms) {
    let score = 0;
    
    // 预处理搜索字段 (转小写，拼接相关字段方便比对)
    const textFields = {
        title: (event.name + ' ' + event.nameEn).toLowerCase(),
        // 将策略、标签合并为核心内容字段
        core: (event.strategy + ' ' + (event.tags || []).join(' ')).toLowerCase(),
        // 将描述、日期合并为描述字段
        desc: (event.description + ' ' + event.date).toLowerCase()
    };

    // 遍历每一个搜索词 (实现 AND 逻辑：必须包含所有词)
    for (const term of terms) {
        let termMatched = false;

        // 1. 标题匹配 (权重最高: 100)
        if (textFields.title.includes(term)) {
            score += 100;
            termMatched = true;
        }
        
        // 2. 核心策略与标签匹配 (权重中等: 50)
        // 注意：这里用 += 累加，如果标题和标签都命中了，分数更高
        if (textFields.core.includes(term)) {
            score += 50;
            termMatched = true;
        }

        // 3. 描述与日期匹配 (权重较低: 10)
        if (textFields.desc.includes(term)) {
            score += 10;
            termMatched = true;
        }

        // 如果当前这个词在任何地方都没找到，则判定为不匹配 (AND逻辑)
        if (!termMatched) return 0;
    }

    return score;
}

/**
 * 获取过滤并排序后的活动列表
 */
function amzf_getFilteredEvents() {
    // 1. 先进行国家维度的硬过滤 (性能优化，先减少数据量)
    let candidates = amzf_events.filter(event => 
        amzf_selectedCountry === 'ALL' || event.countries.includes(amzf_selectedCountry)
    );

    // 2. 如果没有搜索词，直接返回筛选后的结果 (保持默认时间顺序)
    if (!amzf_searchTerm || amzf_searchTerm.trim() === '') {
        return candidates; 
    }

    // 3. 处理搜索词：去空格、转小写、分词
    const terms = amzf_searchTerm.trim().toLowerCase().split(/\s+/);

    // 4. 映射分数并排序
    return candidates
        .map(event => ({
            event,
            score: amzf_calculateScore(event, terms) // 计算分数
        }))
        .filter(item => item.score > 0) // 过滤掉无匹配项
        .sort((a, b) => b.score - a.score) // 按分数降序排列 (高分在前)
        .map(item => item.event); // 还原为纯对象数组
}

// ==================== AMZF Controller Functions ====================

function amzf_init() {
    amzf_renderCountryTabs();
    amzf_renderStats();
    amzf_renderContent();
    amzf_bindSearch();
}

/**
 * 绑定搜索事件 (含防抖)
 */
function amzf_bindSearch() {
    const input = document.getElementById('amzf_search');
    const clearBtn = document.getElementById('amzf_clear');
    
    if (!input) return;

    // 输入事件监听
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        
        // 1. UI 状态立即响应 (控制清除按钮显隐)
        if (clearBtn) {
            clearBtn.classList.toggle('amzf_visible', val.length > 0);
        }
        
        // 2. 搜索逻辑延迟执行 (防抖 300ms)
        if (amzf_debounceTimer) clearTimeout(amzf_debounceTimer);
        
        amzf_debounceTimer = setTimeout(() => {
            amzf_searchTerm = val.toLowerCase();
            amzf_renderStats();
            amzf_renderContent();
        }, 300);
    });

    // 清除按钮点击事件 (也可以在 HTML onclick 中绑定，这里做双重保障)
    if (clearBtn) {
        clearBtn.onclick = amzf_clearSearch;
    }
}

function amzf_clearSearch() {
    const input = document.getElementById('amzf_search');
    const clearBtn = document.getElementById('amzf_clear');
    
    if (input) {
        input.value = '';
        input.focus(); // 清除后让焦点回到输入框
    }
    
    if (clearBtn) {
        clearBtn.classList.remove('amzf_visible');
    }

    amzf_searchTerm = '';
    amzf_renderStats();
    amzf_renderContent();
}

function amzf_renderCountryTabs() {
    const container = document.getElementById('amzf_country_tabs');
    if(!container) return;

    let html = `<button class="amzf_country_tab amzf_active" onclick="amzf_selectCountry('ALL')">
        <span class="amzf_country_flag">🌍</span> 全部
    </button>`;
    
    amzf_countries.forEach(c => {
        html += `<button class="amzf_country_tab" onclick="amzf_selectCountry('${c.code}')">
            <span class="amzf_country_flag">${c.flag}</span> ${c.name}
        </button>`;
    });
    
    container.innerHTML = html;
}

function amzf_selectCountry(code) {
    amzf_selectedCountry = code;
    
    // 更新 Tab 样式
    document.querySelectorAll('.amzf_country_tab').forEach(tab => {
        tab.classList.remove('amzf_active');
        // 简单的文本匹配判断选中状态
        const tabText = tab.innerText || tab.textContent;
        const targetName = code === 'ALL' ? '全部' : amzf_countries.find(c => c.code === code)?.name;
        if (tabText.includes(targetName)) {
            tab.classList.add('amzf_active');
        }
    });
    
    amzf_renderStats();
    amzf_renderContent();
}

function amzf_switchView(view) {
    amzf_currentView = view;
    document.getElementById('amzf_btn_country').classList.toggle('amzf_active', view === 'country');
    document.getElementById('amzf_btn_event').classList.toggle('amzf_active', view === 'event');
    
    amzf_expandedSections.clear(); // 切换视图时重置展开状态
    amzf_renderContent();
}

function amzf_toggleSection(id) {
    // 1. DOM 操作：直接切换类名，触发 CSS 动画
    const element = document.getElementById(id);
    if (element) {
        element.classList.toggle('amzf_expanded');
    }

    // 2. 状态同步
    if (amzf_expandedSections.has(id)) {
        amzf_expandedSections.delete(id);
    } else {
        amzf_expandedSections.add(id);
    }
}

// ==================== Rendering Functions ====================

function amzf_renderStats() {
    const filtered = amzf_getFilteredEvents(); // 使用新的过滤逻辑
    const container = document.getElementById('amzf_stats');
    // 注意：原本 HTML 里有两个 id="amzf_stats" (header里一个，下面一个)，这会导致 querySelector 只选第一个
    // 建议：在 HTML 里保留 Header 里的那个作为主要展示，或者给它们不同的 ID。
    // 这里假设我们要渲染到 Header 里的那个 stats 容器（根据你的 CSS 它是 z-index:2 的）
    if(!container) return;
    
    const holidays = filtered.filter(e => e.type === 'holiday').length;
    const shopping = filtered.filter(e => e.type === 'shopping').length;
    
    container.innerHTML = `
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_blue">📊</div>
            <div>
                <div class="amzf_stat_value">${filtered.length}</div>
                <div class="amzf_stat_label">营销节点</div>
            </div>
        </div>
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_green">🎉</div>
            <div>
                <div class="amzf_stat_value">${holidays}</div>
                <div class="amzf_stat_label">重要节日</div>
            </div>
        </div>
        <div class="amzf_stat_item">
            <div class="amzf_stat_icon amzf_orange">🛒</div>
            <div>
                <div class="amzf_stat_value">${shopping}</div>
                <div class="amzf_stat_label">电商大促</div>
            </div>
        </div>
    `;
}

function amzf_renderContent() {
    const container = document.getElementById('amzf_main');
    if(!container) return;

    const filtered = amzf_getFilteredEvents();
    
    // 空状态处理
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="amzf_empty amzf_animate">
                <div class="amzf_empty_icon">🔍</div>
                <div class="amzf_empty_text">未找到匹配的活动，请尝试关键词如 "圣诞"、"Prime" 或 "德国"</div>
            </div>
        `;
        return;
    }
    
    if (amzf_currentView === 'country') {
        amzf_renderCountryView(filtered);
    } else {
        amzf_renderEventView(filtered);
    }
}

function amzf_renderCountryView(events) {
    const container = document.getElementById('amzf_main');
    container.classList.add('amzf_list_entering');
    
    const byMonth = {};
    events.forEach(event => {
        if (!byMonth[event.month]) byMonth[event.month] = [];
        byMonth[event.month].push(event);
    });
    
    let html = '<div class="amzf_timeline">';
    
    // 如果是搜索模式，我们希望默认展开所有包含结果的月份，提升体验
    const isSearchActive = amzf_searchTerm && amzf_searchTerm.length > 0;

    for (let m = 1; m <= 12; m++) {
        if (!byMonth[m]) continue;
        
        const monthEvents = byMonth[m];
        const sectionId = `amzf_group_month_${m}`; 
        
        // 搜索模式下默认全部展开，否则读取记忆状态
        const isExpanded = isSearchActive || amzf_expandedSections.has(sectionId);
        
        html += `
            <div id="${sectionId}" class="amzf_month_section ${isExpanded ? 'amzf_expanded' : ''}" style="animation-delay: ${(m-1)*0.03}s">
                <div class="amzf_month_header" onclick="amzf_toggleSection('${sectionId}')"> 
                    <div class="amzf_month_info">
                        <span class="amzf_month_name">${amzf_months[m-1]}</span>
                        <span class="amzf_month_badge">${monthEvents.length} 个活动</span>
                    </div>
                    <div class="amzf_month_toggle">▼</div>
                </div>
                <div class="amzf_month_content">
                    <div class="amzf_events_grid">
                        ${monthEvents.map(e => amzf_renderEventCard(e)).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    setTimeout(() => container.classList.remove('amzf_list_entering'), 500);
}

function amzf_renderEventView(events) {
    const container = document.getElementById('amzf_main');
    container.classList.add('amzf_list_entering');
    
    const eventGroups = {};
    events.forEach(event => {
        // 分组键标准化
        let groupKey = event.nameEn.replace(/ (UK|IT|ES|FR|PL|EU)$/i, '').trim();
        if (!eventGroups[groupKey]) {
            eventGroups[groupKey] = { emoji: event.emoji, events: [] };
        }
        eventGroups[groupKey].events.push(event);
    });
    
    let html = '<div class="amzf_event_view">';
    const isSearchActive = amzf_searchTerm && amzf_searchTerm.length > 0;
    
    Object.keys(eventGroups).forEach((key, idx) => {
        const group = eventGroups[key];
        const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_'); // 更安全的 ID 生成
        const sectionId = `amzf_group_event_${safeKey}`;
        
        const isExpanded = isSearchActive || amzf_expandedSections.has(sectionId);
        
        html += `
            <div id="${sectionId}" class="amzf_event_comparison ${isExpanded ? 'amzf_expanded' : ''}" style="animation-delay: ${idx*0.03}s">
                <div class="amzf_comparison_header" onclick="amzf_toggleSection('${sectionId}')">
                    <div class="amzf_comparison_title">
                        <span>${group.emoji}</span>
                        <span>${key}</span>
                        <span class="amzf_month_badge">${group.events.length} 个站点</span>
                    </div>
                    <div class="amzf_month_toggle">▼</div>
                </div>
                <div class="amzf_comparison_content">
                    <div class="amzf_country_list">
                        ${group.events.map(e => amzf_renderCountryEvent(e)).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    setTimeout(() => container.classList.remove('amzf_list_entering'), 500);
}

function amzf_renderEventCard(event) {
    const typeClass = `amzf_type_${event.type}`;
    const countryBadges = event.countries.map(code => {
        const c = amzf_countries.find(x => x.code === code);
        return `<span class="amzf_country_badge" title="${c?.name}">${c?.flag}</span>`;
    }).join('');
    
    return `
        <div class="amzf_event_card ${typeClass}">
            <div class="amzf_event_header">
                <div class="amzf_event_title_wrapper">
                    <span class="amzf_event_emoji">${event.emoji}</span>
                    <div>
                        <span class="amzf_event_title">${event.name}</span>
                        <div style="font-size:0.8rem; color:#666; margin-top:2px;">${event.description}</div>
                    </div>
                </div>
                <span class="amzf_event_date">📅 ${event.date}</span>
            </div>
            <div class="amzf_event_countries">${countryBadges}</div>
            <div class="amzf_event_strategy">
                <div class="amzf_strategy_title">💡 电商切入策略</div>
                <div class="amzf_strategy_content">${event.strategy}</div>
                <div class="amzf_strategy_tags">
                    ${(event.tags || []).map(t => `<span class="amzf_tag">#${t}</span>`).join('')}
                </div>
            </div> 
        </div>
    `;
}

function amzf_renderCountryEvent(event) {
    const flags = event.countries.map(code => {
        const c = amzf_countries.find(x => x.code === code);
        return `<span title="${c?.name}">${c?.flag}</span>`;
    }).join(' ');
    
    return `
        <div class="amzf_country_event">
            <div class="amzf_country_info">
                <span style="font-size:1.3rem">${flags}</span>
            </div>
            <div class="amzf_country_date">
                <strong>📅 ${event.date}</strong>
            </div>
            <div class="amzf_country_strategy_brief">
                <div style="margin-bottom:4px;font-weight:600;">${event.name}</div>
                💡 ${event.strategy}
            </div>
        </div>
    `;
}

// ==================== Module Exports ====================

export async function mount(container) {
    // 1. 加载 Template
    const response = await fetch('src/modules/amz_hub/views/marketing_calendar/template.html');
    const html = await response.text();
    container.innerHTML = html;

    // 2. 将内联函数挂载到 window，以便 HTML 里的 onclick 能找到它们
    window.amzf_selectCountry = amzf_selectCountry;
    window.amzf_switchView = amzf_switchView;
    window.amzf_clearSearch = amzf_clearSearch;
    window.amzf_toggleSection = amzf_toggleSection;

    // 3. 初始化
    amzf_init();
    
    console.log("✅ Marketing Calendar Loaded");
}

export function unmount() {
    // 清理 window 上的全局函数，防止污染
    delete window.amzf_selectCountry;
    delete window.amzf_switchView;
    delete window.amzf_clearSearch;
    delete window.amzf_toggleSection;
    
    console.log("❌ Marketing Calendar Unmounted");
}