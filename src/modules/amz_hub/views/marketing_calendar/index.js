import { amzf_countries, amzf_months, amzf_events } from "../../services/amz_hub_constants.js";

// ==================== AMZF State (移植) ====================
let amzf_currentView = 'country';
let amzf_selectedCountry = 'ALL';
let amzf_searchTerm = '';
let amzf_expandedSections = new Set();

// ==================== AMZF Functions (移植) ====================

function amzf_init() {
    amzf_renderCountryTabs();
    amzf_renderStats();
    amzf_renderContent();
    amzf_bindSearch();
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
    document.querySelectorAll('.amzf_country_tab').forEach(tab => {
        tab.classList.remove('amzf_active');
        if (tab.textContent.includes(code === 'ALL' ? '全部' : amzf_countries.find(c => c.code === code)?.name)) {
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
    amzf_expandedSections.clear();
    amzf_renderContent();
}

function amzf_bindSearch() {
    const input = document.getElementById('amzf_search');
    const clear = document.getElementById('amzf_clear');
    
    if(input) {
        input.addEventListener('input', (e) => {
            amzf_searchTerm = e.target.value.toLowerCase();
            clear.classList.toggle('amzf_visible', amzf_searchTerm.length > 0);
            amzf_renderStats();
            amzf_renderContent();
        });
    }
}

function amzf_clearSearch() {
    document.getElementById('amzf_search').value = '';
    document.getElementById('amzf_clear').classList.remove('amzf_visible');
    amzf_searchTerm = '';
    amzf_renderStats();
    amzf_renderContent();
}

function amzf_getFilteredEvents() {
    return amzf_events.filter(event => {
        const countryMatch = amzf_selectedCountry === 'ALL' || event.countries.includes(amzf_selectedCountry);
        const searchMatch = !amzf_searchTerm || 
            event.name.toLowerCase().includes(amzf_searchTerm) ||
            event.nameEn.toLowerCase().includes(amzf_searchTerm) ||
            event.strategy.toLowerCase().includes(amzf_searchTerm) ||
            event.tags.some(t => t.toLowerCase().includes(amzf_searchTerm));
        return countryMatch && searchMatch;
    });
}

function amzf_renderStats() {
    const filtered = amzf_getFilteredEvents();
    const container = document.getElementById('amzf_stats');
    if(!container) return;
    
    const holidays = filtered.filter(e => e.type === 'holiday').length;
    const shopping = filtered.filter(e => e.type === 'shopping').length;
    // const cultural = filtered.filter(e => e.type === 'cultural' || e.type === 'season').length;
    
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
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="amzf_empty amzf_animate">
                <div class="amzf_empty_icon">🔍</div>
                <div class="amzf_empty_text">未找到匹配的活动，请调整搜索条件</div>
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
    // 添加标记类，触发进场动画
    container.classList.add('amzf_list_entering');
    const byMonth = {};
    
    events.forEach(event => {
        if (!byMonth[event.month]) byMonth[event.month] = [];
        byMonth[event.month].push(event);
    });
    
    let html = '<div class="amzf_timeline">';
    
    for (let m = 1; m <= 12; m++) {
        if (!byMonth[m]) continue;
        const monthEvents = byMonth[m];
        // 注意：这里仍然读取 Set 状态来决定初始 HTML 是否包含 expanded 类
        // 但我们在 ID 上做了手脚，方便后续查找
        const sectionId = `amzf_group_month_${m}`; 
        const isExpanded = amzf_expandedSections.has(sectionId);
        
        // 关键改动：添加 id="${sectionId}"
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
    // 动画播放完后移除 class，防止干扰后续操作
    setTimeout(() => container.classList.remove('amzf_list_entering'), 1000);
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
                    <span class="amzf_event_title">${event.name}</span>
                    <span class="amzf_event_subtitle"> | ${event.description}</span>
                </div>
                <span class="amzf_event_date">📅 ${event.date}</span>
            </div>
            <div class="amzf_event_countries">${countryBadges}</div>
            <div class="amzf_event_strategy">
                <div class="amzf_strategy_title">💡 电商切入策略</div>
                <div class="amzf_strategy_content">${event.strategy}</div>
                <div class="amzf_strategy_tags">
                    ${event.tags.map(t => `<span class="amzf_tag">#${t}</span>`).join('')}
                </div>
            </div> 
        </div>
    `;
    // <div class="amzf_event_description">${event.description}</div>
}

function amzf_renderEventView(events) {
    const container = document.getElementById('amzf_main');
    container.classList.add('amzf_list_entering');
    // Group similar events by name pattern
    const eventGroups = {};
    events.forEach(event => {
        // Normalize event names for grouping
        let groupKey = event.nameEn.replace(/ (UK|IT|ES|FR|PL|EU)$/i, '').trim();
        if (!eventGroups[groupKey]) {
            eventGroups[groupKey] = { emoji: event.emoji, events: [] };
        }
        eventGroups[groupKey].events.push(event);
    });
    
    let html = '<div class="amzf_event_view">';
    
    Object.keys(eventGroups).forEach((key, idx) => {
        const group = eventGroups[key];
        // 生成唯一 ID，注意 key 可能包含空格，建议处理一下
        const safeKey = key.replace(/\s+/g, '_');
        const sectionId = `amzf_group_event_${safeKey}`;
        const isExpanded = amzf_expandedSections.has(sectionId);
        
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
    setTimeout(() => container.classList.remove('amzf_list_entering'), 1000);
}

// src/modules/amz_hub/views/marketing_calendar/index.js

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
                💡 ${event.strategy}
            </div>
        </div>
    `;
}

function amzf_toggleSection(id) {
    // 1. DOM 操作：直接切换类名，触发平滑过渡
    const element = document.getElementById(id);
    if (element) {
        element.classList.toggle('amzf_expanded');
    } else {
        console.warn('Element not found:', id);
    }

    // 2. 状态同步：仅在内存中更新，不触发重绘
    if (amzf_expandedSections.has(id)) {
        amzf_expandedSections.delete(id);
    } else {
        amzf_expandedSections.add(id);
    }
}
// ==================== Module Exports (核心集成点) ====================

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