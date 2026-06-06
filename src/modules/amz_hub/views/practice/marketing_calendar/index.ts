// src/modules/amz_hub/views/practice/marketing_calendar/index.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 DI容器 + BaseModule
// 示例：使用 getService() 替代直接导入服务
// ================================================================

import { escapeHtml } from "@/common/utils/security";
import BaseModule from "../../../../../common/BaseModule";
import { SERVICE_NAMES } from "../../../../../common/di/ServiceRegistry";
import type { IStorageService } from "@/types/services";
import {
  amzf_countries,
  amzf_months,
  amzf_events,
} from "../../../constants/amz_hub_constants";
import { configCenter } from "../../../../../common/config/ConfigCenter";
import templateHTML from "./template.html?raw";
import type { MarketingEvent, CountryInfo } from "@/types/modules-business";
import "./styles.css";

const AMZF_HISTORY_KEY = "amzf_search_history";
const AMZF_MAX_HISTORY =
  configCenter.get<number>("history.maxSearchHistory") || 10;
const AMZF_QUICK_TAGS = [
  "圣诞",
  "Prime Day",
  "黑五",
  "复活节",
  "情人节",
  "母亲节",
]; // 快捷搜索标签

interface MarketingCalendarState {
  currentView: "country" | "event";
  selectedCountry: string;
  searchTerm: string;
  expandedSections: Set<string>;
  searchHistory: string[];
}

class MarketingCalendarModule extends BaseModule {
  private state: MarketingCalendarState;
  private debounceTimer: number | null = null;

  constructor() {
    super("amz_marketing_calendar");

    // State Initialization
    this.state = {
      currentView: "country",
      selectedCountry: "ALL",
      searchTerm: "",
      expandedSections: new Set(),
      searchHistory: [],
    };
  }

  async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
  }

  async init(): Promise<void> {
    this.loadSearchHistory();
    this.renderCountryTabs();
    this.renderStats();
    this.renderContent();
    this.bindCalendarClickEvents();
    this.bindSearchEvents();

    console.log("✅ Marketing Calendar Loaded");
  }

  onUnmount(): void {
    // 清理：将下拉框从 body 移除
    const container = document.getElementById("amzf_search_history");
    if (container && container.parentElement === document.body) {
      container.remove();
    }

    // 清理全局代理
    console.log("❌ Marketing Calendar Unmounted");
  }

  // ==================== Core Logic ====================

  loadSearchHistory(): void {
    try {
      // 🎯 使用 DI 容器获取 Storage 服务
      const storageService = this.getService<IStorageService>(
        SERVICE_NAMES.STORAGE,
      );
      const saved = storageService.get(AMZF_HISTORY_KEY, []) as string[];
      this.state.searchHistory = saved || [];
    } catch (e) {
      console.warn("Failed to load search history:", e);
      this.state.searchHistory = [];
    }
  }

  saveSearchHistory(): void {
    try {
      // 🎯 使用 DI 容器获取 Storage 服务
      const storageService = this.getService<IStorageService>(
        SERVICE_NAMES.STORAGE,
      );
      storageService.set(AMZF_HISTORY_KEY, this.state.searchHistory);
    } catch (e) {
      console.warn("Failed to save search history:", e);
    }
  }

  addToHistory(term: string): void {
    if (!term || term.trim().length < 2) return;
    const normalizedTerm = term.trim();

    // 去重并添加到头部
    this.state.searchHistory = this.state.searchHistory.filter(
      (item) => item.toLowerCase() !== normalizedTerm.toLowerCase(),
    );
    this.state.searchHistory.unshift(normalizedTerm);

    if (this.state.searchHistory.length > AMZF_MAX_HISTORY) {
      this.state.searchHistory = this.state.searchHistory.slice(
        0,
        AMZF_MAX_HISTORY,
      );
    }
    this.saveSearchHistory();
  }

  calculateScore(event: MarketingEvent, terms: string[]): number {
    let score = 0;
    const textFields = {
      title: (event.name + " " + event.nameEn).toLowerCase(),
      core: (event.strategy + " " + (event.tags || []).join(" ")).toLowerCase(),
      desc: (event.description + " " + event.date).toLowerCase(),
    };

    for (const term of terms) {
      let termMatched = false;
      if (textFields.title.includes(term)) {
        score += 100;
        termMatched = true;
      }
      if (textFields.core.includes(term)) {
        score += 50;
        termMatched = true;
      }
      if (textFields.desc.includes(term)) {
        score += 10;
        termMatched = true;
      }
      if (!termMatched) return 0;
    }
    return score;
  }

  getFilteredEvents(): MarketingEvent[] {
    let candidates = (amzf_events as unknown as MarketingEvent[]).filter(
      (event) =>
        this.state.selectedCountry === "ALL" ||
        event.countries.includes(this.state.selectedCountry),
    );

    if (!this.state.searchTerm || this.state.searchTerm.trim() === "") {
      return candidates;
    }

    const terms = this.state.searchTerm.trim().toLowerCase().split(/\s+/);
    return candidates
      .map((event) => ({ event, score: this.calculateScore(event, terms) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.event);
  }

  // ==================== Actions ====================

  selectCountry(code: string): void {
    this.state.selectedCountry = code;

    // Update Tabs UI
    const tabs = this.container!.querySelectorAll(".amzf_country_tab");
    tabs.forEach((tab) => {
      tab.classList.remove("amzf_active");
      const tabText =
        (tab as HTMLElement).innerText || (tab as HTMLElement).textContent;
      const targetName =
        code === "ALL"
          ? "全部"
          : (amzf_countries as CountryInfo[]).find((c) => c.code === code)
            ?.name;
      if (tabText && tabText.includes(targetName || "")) {
        tab.classList.add("amzf_active");
      }
    });

    this.renderStats();
    this.renderContent();
  }

  switchView(view: string): void {
    this.state.currentView = view as "country" | "event";
    document
      .getElementById("amzf_btn_country")
      ?.classList.toggle("amzf_active", view === "country");
    document
      .getElementById("amzf_btn_event")
      ?.classList.toggle("amzf_active", view === "event");

    this.state.expandedSections.clear();
    this.renderContent();
  }

  toggleSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle("amzf_expanded");
    }
    if (this.state.expandedSections.has(id)) {
      this.state.expandedSections.delete(id);
    } else {
      this.state.expandedSections.add(id);
    }
  }

  clearSearch(): void {
    const input = document.getElementById("amzf_search") as HTMLInputElement;
    const clearBtn = document.getElementById("amzf_clear");
    if (input) {
      input.value = "";
      input.focus();
    }
    if (clearBtn) clearBtn.classList.remove("amzf_visible");

    this.state.searchTerm = "";
    this.renderStats();
    this.renderContent();
  }

  // ==================== Search History Actions ====================

  selectHistoryItem(term: string): void {
    const input = document.getElementById("amzf_search") as HTMLInputElement;
    const clearBtn = document.getElementById("amzf_clear");

    if (input) {
      input.value = term;
      input.focus();
    }
    if (clearBtn) clearBtn.classList.add("amzf_visible");

    this.state.searchTerm = term.toLowerCase();
    this.hideSearchHistory();
    this.renderStats();
    this.renderContent();
  }

  deleteHistoryItem(index: number): void {
    this.state.searchHistory.splice(index, 1);
    this.saveSearchHistory();
    this.renderSearchHistory();
  }

  clearAllHistory(): void {
    this.state.searchHistory = [];
    this.saveSearchHistory();
    this.renderSearchHistory();
  }

  showSearchHistory(): void {
    const container = document.getElementById("amzf_search_history");
    const searchBox = document.querySelector(".amzf_search_box") as HTMLElement;

    if (container && searchBox) {
      this.renderSearchHistory();

      // ✅ 关键修复：将下拉框移到 body，避免父元素 transform 影响
      if (container.parentElement !== document.body) {
        document.body.appendChild(container);
      }

      // 动态计算下拉框位置
      const searchRect = searchBox.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 响应式宽度计算
      const containerWidth = Math.min(420, viewportWidth - 40);

      // 计算水平位置
      let left = searchRect.left;
      if (left + containerWidth > viewportWidth - 20) {
        left = Math.max(20, viewportWidth - containerWidth - 20);
      }

      // 计算垂直位置
      let top = searchRect.bottom + 8;
      const availableHeight = viewportHeight - top - 20;
      const maxHeight = Math.min(320, availableHeight);

      // 如果下方空间不足，尝试显示在上方
      if (maxHeight < 200 && searchRect.top > 220) {
        const topSpace = searchRect.top - 20;
        top = searchRect.top - Math.min(320, topSpace);
      }

      // 应用样式 - 先设置位置和尺寸，再显示
      container.style.position = "fixed";
      container.style.top = `${top}px`;
      container.style.left = `${left}px`;
      container.style.width = `${containerWidth}px`;
      container.style.zIndex = "99999";
      container.style.transform = "none"; // 强制重置transform

      // 使用requestAnimationFrame确保样式应用后再添加show类
      requestAnimationFrame(() => {
        container.style.maxHeight = `${maxHeight}px`;
        container.classList.add("amzf_show");
      });
    }
  }

  hideSearchHistory(): void {
    const container = document.getElementById("amzf_search_history");
    if (container) {
      container.classList.remove("amzf_show");
    }
  }

  // ==================== Event Binding ====================

  private bindCalendarClickEvents(): void {
    this.addEventListener(document, "click", (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const historyContainer = document.getElementById("amzf_search_history");
      const isInModule = (element: HTMLElement) =>
        Boolean(
          this.container?.contains(element) ||
            historyContainer?.contains(element),
        );

      const deleteBtn = target.closest<HTMLElement>(
        "[data-amzf-delete-history-index]",
      );
      if (deleteBtn && isInModule(deleteBtn)) {
        event.stopPropagation();
        const index = Number(deleteBtn.dataset.amzfDeleteHistoryIndex);
        if (Number.isInteger(index)) this.deleteHistoryItem(index);
        return;
      }

      const clearHistoryBtn = target.closest<HTMLElement>(
        "[data-amzf-clear-history]",
      );
      if (clearHistoryBtn && isInModule(clearHistoryBtn)) {
        event.stopPropagation();
        this.clearAllHistory();
        return;
      }

      const countryBtn = target.closest<HTMLElement>("[data-amzf-country]");
      if (countryBtn && isInModule(countryBtn)) {
        this.selectCountry(countryBtn.dataset.amzfCountry || "ALL");
        return;
      }

      const historyItem = target.closest<HTMLElement>(
        "[data-amzf-history-item]",
      );
      if (historyItem && isInModule(historyItem)) {
        const term = historyItem.dataset.amzfHistoryItem;
        if (term) this.selectHistoryItem(term);
        return;
      }

      const quickTag = target.closest<HTMLElement>("[data-amzf-quick-tag]");
      if (quickTag && isInModule(quickTag)) {
        const term = quickTag.dataset.amzfQuickTag;
        if (term) this.selectHistoryItem(term);
        return;
      }

      const sectionToggle = target.closest<HTMLElement>(
        "[data-amzf-toggle-section]",
      );
      if (sectionToggle && isInModule(sectionToggle)) {
        const id = sectionToggle.dataset.amzfToggleSection;
        if (id) this.toggleSection(id);
        return;
      }

      const actionEl = target.closest<HTMLElement>("[data-action]");
      if (!actionEl || !isInModule(actionEl)) return;

      const action = actionEl.dataset.action;
      if (action === "amzf_switchView") {
        this.switchView(actionEl.dataset.param || "country");
      } else if (action === "amzf_clearSearch") {
        this.clearSearch();
      }
    });
  }

  bindSearchEvents(): void {
    const input = document.getElementById("amzf_search") as HTMLInputElement;
    const clearBtn = document.getElementById("amzf_clear");
    const searchBox = document.getElementById("amzf_search_box");
    const searchWrapper = document.querySelector(".amzf_search_wrapper");
    const searchHistory = document.getElementById("amzf_search_history");

    if (!input) return;

    // BaseModule.addEventListener handles cleanup automatically
    this.addEventListener(input, "focus", () => this.showSearchHistory());

    if (searchBox) {
      this.addEventListener(searchBox, "click", () => input.focus());
    }

    this.addEventListener(document, "click", (e) => {
      if (searchWrapper && !searchWrapper.contains(e.target as Node)) {
        this.hideSearchHistory();
      }
    });

    this.addEventListener(input, "input", (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (clearBtn) {
        clearBtn.classList.toggle("amzf_visible", val.length > 0);
      }

      // 使用 BaseModule 的 setTimeout 实现自动清理的防抖
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = this.setTimeout(() => {
        this.state.searchTerm = val.toLowerCase();
        this.renderStats();
        this.renderContent();
      }, 300) as any;
    });

    this.addEventListener(input, "keydown", (e) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter" && input.value.trim()) {
        this.addToHistory(input.value.trim());
        this.hideSearchHistory();
        input.blur();
      }
      if (keyEvent.key === "Escape") {
        this.hideSearchHistory();
        input.blur();
      }
    });

    if (clearBtn) {
      this.addEventListener(clearBtn, "click", (e) => {
        e.stopPropagation();
        this.clearSearch();
      });
    }

    // 窗口大小变化时重新计算下拉框位置
    this.addEventListener(window, "resize", () => {
      if (searchHistory?.classList.contains("amzf_show")) {
        this.showSearchHistory();
      }
    });

    // 滚动时隐藏下拉框
    this.addEventListener(
      window,
      "scroll",
      () => {
        this.hideSearchHistory();
      },
      true,
    );
  }

  // ==================== Rendering ====================

  renderCountryTabs(): void {
    const container = document.getElementById("amzf_country_tabs");
    if (!container) return;

    let html = `<button class="amzf_country_tab amzf_active" data-amzf-country="ALL">
            <span class="amzf_country_flag"><i class="fas fa-globe"></i></span> 全部
        </button>`;

    (amzf_countries as CountryInfo[]).forEach((c) => {
      html += `<button class="amzf_country_tab" data-amzf-country="${escapeHtml(c.code)}">
                <span class="amzf_country_flag">${c.flag}</span> ${c.name}
            </button>`;
    });

    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
  }

  renderSearchHistory(): void {
    const container = document.getElementById("amzf_search_history");
    if (!container) return;

    let html = "";
    if (this.state.searchHistory.length > 0) {
      html += `
                <div class="amzf_history_header">
                    <span class="amzf_history_title"><i class="fas fa-history"></i> 搜索历史</span>
                    <button class="amzf_history_clear_all" data-amzf-clear-history>清空</button>
                </div>
            `;
      this.state.searchHistory.forEach((item, index) => {
        const safeItem = escapeHtml(item);
        html += `
                    <div class="amzf_history_item" data-amzf-history-item="${safeItem}">
                        <span class="amzf_history_item_icon"><i class="fas fa-search"></i></span>
                        <span class="amzf_history_item_text">${safeItem}</span>
                        <span class="amzf_history_item_delete" data-amzf-delete-history-index="${index}"><i class="fas fa-times"></i></span>
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
                ${AMZF_QUICK_TAGS.map(
      (tag) => `
                    <span class="amzf_quick_tag" data-amzf-quick-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>
                `,
    ).join("")}
            </div>
        `;
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
  }

  renderStats(): void {
    const filtered = this.getFilteredEvents();
    const container = document.getElementById("amzf_stats");
    if (!container) return;

    const holidays = filtered.filter((e) => e.type === "holiday").length;
    const shopping = filtered.filter((e) => e.type === "shopping").length;

    container.innerHTML = `
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_blue"><i class="fa-solid fa-timeline text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(filtered.length.toString())}</div>
                    <div class="amzf_stat_label">营销节点</div>
                </div>
            </div>
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_green"><i class="fas fa-gifts text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(holidays.toString())}</div>
                    <div class="amzf_stat_label">重要节日</div>
                </div>
            </div>
            <div class="amzf_stat_item">
                <div class="amzf_stat_icon amzf_orange"><i class="fas fa-shopping-cart text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(shopping.toString())}</div>
                    <div class="amzf_stat_label">电商大促</div>
                </div>
            </div>
        `;
  }

  renderContent(): void {
    const container = document.getElementById("amzf_main");
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

    if (this.state.currentView === "country") {
      this.renderCountryView(filtered, container);
    } else {
      this.renderEventView(filtered, container);
    }
  }

  renderCountryView(events: MarketingEvent[], container: HTMLElement): void {
    container.classList.add("amzf_list_entering");
    const byMonth: Record<number, MarketingEvent[]> = {};
    events.forEach((event) => {
      if (!byMonth[event.month]) byMonth[event.month] = [];
      byMonth[event.month]!.push(event);
    });

    let html = '<div class="amzf_timeline">';
    const isSearchActive =
      this.state.searchTerm && this.state.searchTerm.length > 0;

    for (let m = 1; m <= 12; m++) {
      if (!byMonth[m]) continue;
      const monthEvents = byMonth[m]!;
      const sectionId = `amzf_group_month_${m}`;
      const isExpanded =
        isSearchActive || this.state.expandedSections.has(sectionId);

      html += `
                <div id="${sectionId}" class="amzf_month_section ${isExpanded ? "amzf_expanded" : ""}" style="animation-delay: ${(m - 1) * 0.03}s">
                    <div class="amzf_month_header" data-amzf-toggle-section="${escapeHtml(sectionId)}">
                        <div class="amzf_month_info">
                            <span class="amzf_month_name">${(amzf_months as string[])[m - 1]}</span>
                            <span class="amzf_month_badge">${monthEvents.length} 个活动</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </div>
                    <div class="amzf_month_content">
                        <div class="amzf_events_grid">
                            ${monthEvents.map((e) => this.renderEventCard(e)).join("")}
                        </div>
                    </div>
                </div>
            `;
    }
    html += "</div>";
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    this.setTimeout(
      () => container.classList.remove("amzf_list_entering"),
      500,
    );
  }

  renderEventView(events: MarketingEvent[], container: HTMLElement): void {
    container.classList.add("amzf_list_entering");
    interface EventGroup {
      emoji: string;
      events: MarketingEvent[];
      name: string;
      nameEn: string;
    }
    const eventGroups: Record<string, EventGroup> = {};
    events.forEach((event) => {
      let groupKey = event.nameEn.replace(/ (UK|IT|ES|FR|PL|EU)$/i, "").trim();
      if (!eventGroups[groupKey]) {
        eventGroups[groupKey] = {
          emoji: event.emoji,
          events: [],
          name: event.name.replace(/\(.*?\)$/, "").trim(), // 提取中文名称（去除国家后缀）
          nameEn: groupKey,
        };
      }
      eventGroups[groupKey]!.events.push(event);
    });

    let html = '<div class="amzf_event_view">';
    const isSearchActive =
      this.state.searchTerm && this.state.searchTerm.length > 0;

    Object.keys(eventGroups).forEach((key, idx) => {
      const group = eventGroups[key]!;
      const safeKey = key.replace(/[^a-zA-Z0-9]/g, "_");
      const sectionId = `amzf_group_event_${safeKey}`;
      const isExpanded =
        isSearchActive || this.state.expandedSections.has(sectionId);
      const displayName = `${group.name}(${group.nameEn})`;

      html += `
                <div id="${sectionId}" class="amzf_event_comparison ${isExpanded ? "amzf_expanded" : ""}" style="animation-delay: ${idx * 0.03}s">
                    <div class="amzf_comparison_header" data-amzf-toggle-section="${escapeHtml(sectionId)}">
                        <div class="amzf_comparison_title">
                            <span>${group.emoji}</span>
                            <span>${displayName}</span>
                            <span class="amzf_month_badge">${new Set(group.events.flatMap((e) => e.countries)).size} 个站点</span>
                        </div>
                        <div class="amzf_month_toggle"><i class="fas fa-chevron-down"></i></div>
                    </div>
                    <div class="amzf_comparison_content">
                        <div class="amzf_country_list">
                            ${group.events.map((e) => this.renderCountryEvent(e)).join("")}
                        </div>
                    </div>
                </div>
            `;
    });
    html += "</div>";
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    this.setTimeout(
      () => container.classList.remove("amzf_list_entering"),
      500,
    );
  }

  renderEventCard(event: MarketingEvent): string {
    const typeClass = `amzf_type_${event.type}`;
    const countryBadges = event.countries
      .map((code: string) => {
        const c = (amzf_countries as CountryInfo[]).find(
          (x) => x.code === code,
        );
        return `<span class="amzf_country_badge" title="${c?.name}">${c?.flag}</span>`;
      })
      .join("");

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
                        ${(event.tags || []).map((t: string) => `<span class="amzf_tag">#${t}</span>`).join("")}
                    </div>
                </div>
            </div>
        `;
  }

  renderCountryEvent(event: MarketingEvent): string {
    const flags = event.countries
      .map((code: string) => {
        const c = (amzf_countries as CountryInfo[]).find(
          (x) => x.code === code,
        );
        return `<span title="${c?.name}">${c?.flag}</span>`;
      })
      .join(" ");

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
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
