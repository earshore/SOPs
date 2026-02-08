// src/modules/amz_hub/views/practice/marketing_calendar/index.js
// ================================================================
// 🎯 Phase 4: 已迁移使用 StorageService + BaseModule
// ================================================================

import { escapeHtml } from '@/common/utils/security';
import BaseModule from "../../../../../common/BaseModule.js";
import { amzf_countries, amzf_months, amzf_events } from "../../../constants/amz_hub_constants.js";
import { StorageService, STORAGE_KEYS } from "../../../../../services/storageService.ts";
import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { registerActionsWithLegacy } from "../../../../../common/utils/actionRegistry";

const AMZF_HISTORY_KEY = 'amzf_search_history'; // 使用 StorageService 键
const AMZF_MAX_HISTORY = 10; // 最大历史记录数
const AMZF_QUICK_TAGS = ['圣诞', 'Prime Day', '黑五', '复活节', '情人节', '母亲节']; // 快捷搜索标签

class MarketingCalendarModule extends BaseModule {
    constructor() {
        super('amz_marketing_calendar');

        // State Initialization
        this.state = {
            currentView: 'country',
            selectedCountry: 'ALL',
            searchTerm: '',
            expandedSections: new Set(),
            searchHistory: []
        };

        this.debounceTimer = null;
    }

    async render() {
        // ✅ 安全: 静态HTML模板，无用户输入
        this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/practice/marketing_calendar/template.html');
    }

    async init() {
        // 1. 挂载全局代理函数 (因为 HTML 模板里用了 onclick="amzf_xxx")
        this.bindGlobalProxies();

        // 2. 初始化逻辑
        this.loadSearchHistory();
        this.renderCountryTabs();
        this.renderStats();
        this.renderContent();
        this.bindSearchEvents();

        console.log("✅ Marketing Calendar Loaded");
    }

    onUnmount() {
        // 清理全局代理
        this.unbindGlobalProxies();
        console.log("❌ Marketing Calendar Unmounted");
    }

    // ==================== Global Proxies (Bridge for HTML onclicks) ====================

    bindGlobalProxies() {
        // Register actions with ActionRegistry (handles data-param correctly)
        registerActionsWithLegacy({
            amzf_selectCountry: (params) => {
                // Handle both direct calls (legacy) and data-action calls
                const code = typeof params === 'string' ? params : params.param;
                this.selectCountry(code);
            },
            amzf_switchView: (params) => {
                // Handle both direct calls (legacy) and data-action calls
                const view = typeof params === 'string' ? params : params.param;
                this.switchView(view);
            },
            amzf_clearSearch: () => this.clearSearch(),
            amzf_toggleSection: (params) => {
                const id = typeof params === 'string' ? params : params.param;
                this.toggleSection(id);
            },
            amzf_selectHistoryItem: (params) => {
                const term = typeof params === 'string' ? params : params.param;
                this.selectHistoryItem(term);
            },
            amzf_deleteHistoryItem: (params) => {
                const idx = typeof params === 'number' ? params : parseInt(params.param);
                this.deleteHistoryItem(idx);
            },
            amzf_clearAllHistory: () => this.clearAllHistory(),
        });
    }

    unbindGlobalProxies() {
        delete window.amzf_selectCountry;
        delete window.amzf_switchView;
        delete window.amzf_clearSearch;
        delete window.amzf_toggleSection;
        delete window.amzf_selectHistoryItem;
        delete window.amzf_deleteHistoryItem;
        delete window.amzf_clearAllHistory;
    }

    // ==================== Core Logic ====================

    loadSearchHistory() {
        try {
            const saved = StorageService.get(AMZF_HISTORY_KEY, []);
            this.state.searchHistory = saved;
        } catch (e) {
            console.warn('Failed to load search history:', e);
            this.state.searchHistory = [];
        }
    }

    saveSearchHistory() {
        try {
            StorageService.set(AMZF_HISTORY_KEY, this.state.searchHistory);
        } catch (e) {
            console.warn('Failed to save search history:', e);
        }
    }

    addToHistory(term) {
        if (!term || term.trim().length < 2) return;
        const normalizedTerm = term.trim();

        // 去重并添加到头部
        this.state.searchHistory = this.state.searchHistory.filter(
            item => item.toLowerCase() !== normalizedTerm.toLowerCase()
        );
        this.state.searchHistory.unshift(normalizedTerm);

        if (this.state.searchHistory.length > AMZF_MAX_HISTORY) {
            this.state.searchHistory = this.state.searchHistory.slice(0, AMZF_MAX_HISTORY);
        }
        this.saveSearchHistory();
    }

    calculateScore(event, terms) {
        let score = 0;
        const textFields = {
            title: (event.name + ' ' + event.nameEn).toLowerCase(),
            core: (event.strategy + ' ' + (event.tags || []).join(' ')).toLowerCase(),
            desc: (event.description + ' ' + event.date).toLowerCase()
        };

        for (const term of terms) {
            let termMatched = false;
            if (textFields.title.includes(term)) { score += 100; termMatched = true; }
            if (textFields.core.includes(term)) { score += 50; termMatched = true; }
            if (textFields.desc.includes(term)) { score += 10; termMatched = true; }
            if (!termMatched) return 0;
        }
        return score;
    }

    getFilteredEvents() {
        let candidates = amzf_events.filter(event =>
            this.state.selectedCountry === 'ALL' || event.countries.includes(this.state.selectedCountry)
        );

        if (!this.state.searchTerm || this.state.searchTerm.trim() === '') {
            return candidates;
        }

        const terms = this.state.searchTerm.trim().toLowerCase().split(/\s+/);
        return candidates
            .map(event => ({ event, score: this.calculateScore(event, terms) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.event);
    }

    // ==================== Actions ====================

    selectCountry(code) {
        this.state.selectedCountry = code;

        // Update Tabs UI
        const tabs = this.container.querySelectorAll('.amzf_country_tab');
        tabs.forEach(tab => {
            tab.classList.remove('amzf_active');
            const tabText = tab.innerText || tab.textContent;
            const targetName = code === 'ALL' ? '全部' : amzf_countries.find(c => c.code === code)?.name;
            if (tabText.includes(targetName)) {
                tab.classList.add('amzf_active');
            }
        });

        this.renderStats();
        this.renderContent();
    }

    switchView(view) {
        this.state.currentView = view;
        document.getElementById('amzf_btn_country')?.classList.toggle('amzf_active', view === 'country');
        document.getElementById('amzf_btn_event')?.classList.toggle('amzf_active', view === 'event');

        this.state.expandedSections.clear();
        this.renderContent();
    }

    toggleSection(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.toggle('amzf_expanded');
        }
        if (this.state.expandedSections.has(id)) {
            this.state.expandedSections.delete(id);
        } else {
            this.state.expandedSections.add(id);
        }
    }

    clearSearch() {
        const input = document.getElementById('amzf_search');
        const clearBtn = document.getElementById('amzf_clear');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (clearBtn) clearBtn.classList.remove('amzf_visible');

        this.state.searchTerm = '';
        this.renderStats();
        this.renderContent();
    }

    // ==================== Search History Actions ====================

    selectHistoryItem(term) {
        const input = document.getElementById('amzf_search');
        const clearBtn = document.getElementById('amzf_clear');

        if (input) {
            input.value = term;
            input.focus();
        }
        if (clearBtn) clearBtn.classList.add('amzf_visible');

        this.state.searchTerm = term.toLowerCase();
        this.hideSearchHistory();
        this.renderStats();
        this.renderContent();
    }

    deleteHistoryItem(index) {
        this.state.searchHistory.splice(index, 1);
        this.saveSearchHistory();
        this.renderSearchHistory();
    }

    clearAllHistory() {
        this.state.searchHistory = [];
        this.saveSearchHistory();
        this.renderSearchHistory();
    }

    showSearchHistory() {
        const container = document.getElementById('amzf_search_history');
        if (container) {
            this.renderSearchHistory();
            container.classList.add('amzf_show');
        }
    }

    hideSearchHistory() {
        const container = document.getElementById('amzf_search_history');
        if (container) {
            container.classList.remove('amzf_show');
        }
    }

    // ==================== Event Binding ====================

    bindSearchEvents() {
        const input = document.getElementById('amzf_search');
        const clearBtn = document.getElementById('amzf_clear');
        const searchBox = document.getElementById('amzf_search_box');
        const searchWrapper = document.querySelector('.amzf_search_wrapper');

        if (!input) return;

        // BaseModule.addEventListener handles cleanup automatically
        this.addEventListener(input, 'focus', () => this.showSearchHistory());

        if (searchBox) {
            this.addEventListener(searchBox, 'click', () => input.focus());
        }

        this.addEventListener(document, 'click', (e) => {
            if (searchWrapper && !searchWrapper.contains(e.target)) {
                this.hideSearchHistory();
            }
        });

        this.addEventListener(input, 'input', (e) => {
            const val = e.target.value;
            if (clearBtn) {
                clearBtn.classList.toggle('amzf_visible', val.length > 0);
            }

            // 使用 BaseModule 的 setTimeout 实现自动清理的防抖
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = this.setTimeout(() => {
                this.state.searchTerm = val.toLowerCase();
                this.renderStats();
                this.renderContent();
            }, 300);
        });

        this.addEventListener(input, 'keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.addToHistory(input.value.trim());
                this.hideSearchHistory();
                input.blur();
            }
            if (e.key === 'Escape') {
                this.hideSearchHistory();
                input.blur();
            }
        });

        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', (e) => {
                e.stopPropagation();
                this.clearSearch();
            });
        }
    }

    // ==================== Rendering ====================

    renderCountryTabs() {
        const container = document.getElementById('amzf_country_tabs');
        if (!container) return;

        let html = `<button class="amzf_country_tab amzf_active" onclick="amzf_selectCountry('ALL')">
            <span class="amzf_country_flag"><i class="fas fa-globe"></i></span> 全部
        </button>`;

        amzf_countries.forEach(c => {
            html += `<button class="amzf_country_tab" onclick="amzf_selectCountry('${c.code}')">
                <span class="amzf_country_flag">${c.flag}</span> ${c.name}
            </button>`;
        });

        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
    }

    renderSearchHistory() {
        const container = document.getElementById('amzf_search_history');
        if (!container) return;

        let html = '';
        if (this.state.searchHistory.length > 0) {
            html += `
                <div class="amzf_history_header">
                    <span class="amzf_history_title"><i class="fas fa-history"></i> 搜索历史</span>
                    <button class="amzf_history_clear_all" onclick="amzf_clearAllHistory(); event.stopPropagation();">清空</button>
                </div>
            `;
            this.state.searchHistory.forEach((item, index) => {
                // Escaping for HTML attribute
                const safeItem = item.replace(/'/g, "\\'");
                html += `
                    <div class="amzf_history_item" onclick="amzf_selectHistoryItem('${safeItem}')">
                        <span class="amzf_history_item_icon"><i class="fas fa-search"></i></span>
                        <span class="amzf_history_item_text">${item}</span>
                        <span class="amzf_history_item_delete" onclick="amzf_deleteHistoryItem(${index}); event.stopPropagation();"><i class="fas fa-times"></i></span>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="amzf_history_empty">
                    <div class="amzf_history_empty_icon"><i class="fas fa-clipboard-list"></i></div>
                    <div>暂无搜索历史</div>
                </div>
            `;
        }

        html += `
            <div class="amzf_quick_tags">
                ${AMZF_QUICK_TAGS.map(tag => `
                    <span class="amzf_quick_tag" onclick="amzf_selectHistoryItem('${tag}')">${tag}</span>
                `).join('')}
            </div>
        `;
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
    }

    renderStats() {
        const filtered = this.getFilteredEvents();
        const container = document.getElementById('amzf_stats');
        if (!container) return;

        const holidays = filtered.filter(e => e.type === 'holiday').length;
        const shopping = filtered.filter(e => e.type === 'shopping').length;

        container.innerHTML = `
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_blue"><i class="fa-solid fa-timeline text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(filtered.length)}</div>
                    <div class="amzf_stat_label">营销节点</div>
                </div>
            </div>
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_green"><i class="fas fa-gifts text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(holidays)}</div>
                    <div class="amzf_stat_label">重要节日</div>
                </div>
            </div>
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_orange"><i class="fas fa-shopping-cart text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(shopping)}</div>
                    <div class="amzf_stat_label">电商大促</div>
                </div>
            </div>
        `;
    }

    renderContent() {
        const container = document.getElementById('amzf_main');
        if (!container) return;

        const filtered = this.getFilteredEvents();

        if (filtered.length === 0) {
            // ✅ 安全: 静态HTML模板，无用户输入
            container.innerHTML = `
                <div class="amzf_empty amzf_animate">
                    <div class="amzf_empty_icon"><i class="fas fa-search"></i></div>
                    <div class="amzf_empty_text">未找到匹配的活动，请尝试关键词如 "圣诞"、"Prime" 或 "德国"</div>
                </div>
            `;
            return;
        }

        if (this.state.currentView === 'country') {
            this.renderCountryView(filtered, container);
        } else {
            this.renderEventView(filtered, container);
        }
    }

    renderCountryView(events, container) {
        container.classList.add('amzf_list_entering');
        const byMonth = {};
        events.forEach(event => {
            if (!byMonth[event.month]) byMonth[event.month] = [];
            byMonth[event.month].push(event);
        });

        let html = '<div class="amzf_timeline">';
        const isSearchActive = this.state.searchTerm && this.state.searchTerm.length > 0;

        for (let m = 1; m <= 12; m++) {
            if (!byMonth[m]) continue;
            const monthEvents = byMonth[m];
            const sectionId = `amzf_group_month_${m}`;
            const isExpanded = isSearchActive || this.state.expandedSections.has(sectionId);

            html += `
                <div id="${sectionId}" class="amzf_month_section ${isExpanded ? 'amzf_expanded' : ''}" style="animation-delay: ${(m - 1) * 0.03}s">
                    <div class="amzf_month_header" onclick="amzf_toggleSection('${sectionId}')"> 
                        <div class="amzf_month_info">
                            <span class="amzf_month_name">${amzf_months[m - 1]}</span>
                            <span class="amzf_month_badge">${monthEvents.length} 个活动</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </div>
                    <div class="amzf_month_content">
                        <div class="amzf_events_grid">
                            ${monthEvents.map(e => this.renderEventCard(e)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        this.setTimeout(() => container.classList.remove('amzf_list_entering'), 500);
    }

    renderEventView(events, container) {
        container.classList.add('amzf_list_entering');
        const eventGroups = {};
        events.forEach(event => {
            let groupKey = event.nameEn.replace(/ (UK|IT|ES|FR|PL|EU)$/i, '').trim();
            if (!eventGroups[groupKey]) {
                eventGroups[groupKey] = { 
                    emoji: event.emoji, 
                    events: [],
                    name: event.name.replace(/\(.*?\)$/, '').trim(), // 提取中文名称（去除国家后缀）
                    nameEn: groupKey
                };
            }
            eventGroups[groupKey].events.push(event);
        });

        let html = '<div class="amzf_event_view">';
        const isSearchActive = this.state.searchTerm && this.state.searchTerm.length > 0;

        Object.keys(eventGroups).forEach((key, idx) => {
            const group = eventGroups[key];
            const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
            const sectionId = `amzf_group_event_${safeKey}`;
            const isExpanded = isSearchActive || this.state.expandedSections.has(sectionId);
            const displayName = `${group.name}(${group.nameEn})`;

            html += `
                <div id="${sectionId}" class="amzf_event_comparison ${isExpanded ? 'amzf_expanded' : ''}" style="animation-delay: ${idx * 0.03}s">
                    <div class="amzf_comparison_header" onclick="amzf_toggleSection('${sectionId}')">
                        <div class="amzf_comparison_title">
                            <span>${group.emoji}</span>
                            <span>${displayName}</span>
                            <span class="amzf_month_badge">${new Set(group.events.flatMap(e => e.countries)).size} 个站点</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </div>
                    <div class="amzf_comparison_content">
                        <div class="amzf_country_list">
                            ${group.events.map(e => this.renderCountryEvent(e)).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        // ✅ 安全: 静态HTML模板，无用户输入
        container.innerHTML = html;
        this.setTimeout(() => container.classList.remove('amzf_list_entering'), 500);
    }

    renderEventCard(event) {
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
                            <span class="amzf_event_title">${event.name}(${event.nameEn})</span>
                            <div style="font-size:0.8rem; color:#666; margin-top:2px;">${event.description}</div>
                        </div>
                    </div>
                    <span class="amzf_event_date"><i class="fas fa-calendar-alt"></i> ${event.date}</span>
                </div>
                <div class="amzf_event_countries">${countryBadges}</div>
                <div class="amzf_event_strategy">
                    <div class="amzf_strategy_title"><i class="fas fa-lightbulb text-yellow-500"></i> 电商切入策略</div>
                    <div class="amzf_strategy_content">${event.strategy}</div>
                    <div class="amzf_strategy_tags">
                        ${(event.tags || []).map(t => `<span class="amzf_tag">#${t}</span>`).join('')}
                    </div>
                </div> 
            </div>
        `;
    }

    renderCountryEvent(event) {
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
                    <strong><i class="fas fa-calendar-alt"></i> ${event.date}</strong>
                </div>
                <div class="amzf_country_strategy_brief">
                    <div style="margin-bottom:4px;font-weight:600;">${event.name}(${event.nameEn})</div>
                    <i class="fas fa-lightbulb text-yellow-500"></i> ${event.strategy}
                </div>
            </div>
        `;
    }
}

const instance = new MarketingCalendarModule();
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();