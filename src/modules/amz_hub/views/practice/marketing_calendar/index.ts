// src/modules/amz_hub/views/practice/marketing_calendar/index.ts
// ================================================================
// 🎯 Phase 4: 已迁移使用 DI容器 + BaseModule
// 示例：使用 getService() 替代直接导入服务
// ================================================================

import { escapeHtml, setSafeHtml } from '@/common/utils/security';
import { updateRuntimeCssRule } from '@/common/utils/runtimeStyles';
import BaseModule from '@/common/BaseModule';
import { SERVICE_NAMES } from '@/common/di/ServiceRegistry';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import type { IStorageService } from '@/types/services';
import { AMZF_COUNTRIES, AMZF_MONTHS } from '../../../constants/amz_hub_constants';
import { configCenter } from '@/common/config/ConfigCenter';
import type { CountryInfo } from '@/types/modules-business';
import { toIsoDate } from '@/modules/amz_hub/data/marketingCalendar/dateRules';
import { resolveYear } from '@/modules/amz_hub/data/marketingCalendar/resolveYear';
import type {
  EventOccurrence,
  EventType,
  IsoDate,
  OpsTimeWindow,
} from '@/modules/amz_hub/data/marketingCalendar/types';
import { buildOpsViews } from './opsCalendarEngine';
import {
  getOccurrenceMonth,
  renderEncyclopedia,
  type EncyclopediaView,
} from './renderEncyclopedia';
import { renderOps } from './renderOps';
import { defaultUserState, type OpsMainTab } from './userState';
import './flag-icons.local.css';
import './styles.css';

const AMZF_HISTORY_KEY = 'amzf_search_history';
const AMZF_MAX_HISTORY = configCenter.get<number>('history.maxSearchHistory') || 10;
const AMZF_QUICK_TAGS = [
  '圣诞',
  'Prime Day',
  'Spring Deal Days',
  '德国',
  '3月',
  '电商大促',
  '黑五',
  '复活节',
  '情人节',
  '母亲节',
]; // 快捷搜索标签

const AMZF_EVENT_TYPE_META: Record<string, { label: string; icon: string }> = {
  holiday: { label: '节日礼赠', icon: 'fas fa-gift' },
  shopping: { label: '电商大促', icon: 'fas fa-cart-shopping' },
  cultural: { label: '文化场景', icon: 'fas fa-masks-theater' },
  financial: { label: '消费力窗口', icon: 'fas fa-coins' },
  season: { label: '季节需求', icon: 'fas fa-seedling' },
};

const AMZF_COUNTRY_SEARCH_ALIASES: Record<string, string[]> = {
  DE: ['德国', '德國', 'germany', 'deutschland', 'amazon.de'],
  FR: ['法国', '法國', 'france', 'amazon.fr'],
  IT: ['意大利', 'italy', 'italia', 'amazon.it'],
  ES: ['西班牙', 'spain', 'espana', 'españa', 'amazon.es'],
  NL: ['荷兰', '荷蘭', 'netherlands', 'holland', 'amazon.nl'],
  PL: ['波兰', '波蘭', 'poland', 'polska', 'amazon.pl'],
  GB: ['英国', '英國', 'uk', 'united kingdom', 'great britain', 'amazon.co.uk'],
  SE: ['瑞典', 'sweden', 'sverige', 'amazon.se'],
  BE: ['比利时', '比利時', 'belgium', 'belgie', 'belgië', 'amazon.com.be'],
  IE: ['爱尔兰', '愛爾蘭', 'ireland', 'amazon.ie'],
  TR: ['土耳其', 'turkey', 'turkiye', 'türkiye', 'amazon.com.tr'],
};

const AMZF_EVENT_TYPE_SEARCH_ALIASES: Record<string, string[]> = {
  holiday: ['节日', '节假日', '礼品', '礼赠', 'holiday'],
  shopping: [
    '电商',
    '大促',
    '促销',
    '购物',
    'deal',
    'deals',
    'sale',
    'sales',
    'shopping',
    '官方活动',
  ],
  cultural: ['文化', '场景', 'cultural'],
  financial: ['消费力', '工资', '奖金', 'financial', 'holiday money'],
  season: ['季节', '季节性', '返校', 'season', 'seasonal'],
};

const AMZF_MONTH_SEARCH_ALIASES: string[][] = [
  ['一月', '1月', '01月', 'january', 'jan'],
  ['二月', '2月', '02月', 'february', 'feb'],
  ['三月', '3月', '03月', 'march', 'mar'],
  ['四月', '4月', '04月', 'april', 'apr'],
  ['五月', '5月', '05月', 'may'],
  ['六月', '6月', '06月', 'june', 'jun'],
  ['七月', '7月', '07月', 'july', 'jul'],
  ['八月', '8月', '08月', 'august', 'aug'],
  ['九月', '9月', '09月', 'september', 'sep'],
  ['十月', '10月', 'october', 'oct'],
  ['十一月', '11月', 'november', 'nov'],
  ['十二月', '12月', 'december', 'dec'],
];

interface MarketingCalendarState {
  currentView: EncyclopediaView;
  selectedCountry: string;
  searchTerm: string;
  expandedSections: Set<string>;
  searchHistory: string[];
  mainTab: OpsMainTab;
  timeWindow: OpsTimeWindow;
  selectedTypes: EventType[];
  showEnded: boolean;
  activeYear: number;
}

/** Test-only override for "today"; null = system clock. */
let todayOverrideForTests: IsoDate | null = null;

/** Optional test hook — prefer pure render/engine tests with fixed today. */
export function __setTodayForTests(iso: IsoDate | null): void {
  todayOverrideForTests = iso;
}

interface MarketingCalendarSearchElements {
  input: HTMLInputElement;
  clearBtn: HTMLElement | null;
  searchBox: HTMLElement | null;
  searchWrapper: Element | null;
  searchHistory: HTMLElement | null;
}

class MarketingCalendarModule extends BaseModule {
  private state: MarketingCalendarState;
  private debounceTimer: number | null = null;

  constructor() {
    super('amz_marketing_calendar');

    const systemYear = new Date().getFullYear();
    const defaults = defaultUserState(systemYear);

    // State Initialization (M1: in-memory defaults; search history still persisted)
    this.state = {
      currentView: 'country',
      selectedCountry: defaults.selectedCountry,
      searchTerm: '',
      expandedSections: new Set(),
      searchHistory: [],
      mainTab: defaults.mainTab,
      timeWindow: defaults.timeWindow,
      selectedTypes: [...defaults.selectedTypes],
      showEnded: defaults.showEnded,
      activeYear: defaults.activeYear,
    };
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/practice/marketing_calendar/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }

  async init(): Promise<void> {
    // Singleton module: reset in-memory UI state on each mount (M1 defaults)
    this.resetSessionState();
    this.loadSearchHistory();
    this.renderCountryTabs();
    this.syncMainTabUi();
    this.syncTimeChipUi();
    this.syncTypeChipUi();
    this.renderStats();
    this.refreshList();
    this.bindCalendarClickEvents();
    this.bindSearchEvents();
  }

  private resetSessionState(): void {
    const systemYear = new Date().getFullYear();
    const defaults = defaultUserState(systemYear);
    this.state.currentView = 'country';
    this.state.selectedCountry = defaults.selectedCountry;
    this.state.searchTerm = '';
    this.state.expandedSections = new Set();
    this.state.mainTab = defaults.mainTab;
    this.state.timeWindow = defaults.timeWindow;
    this.state.selectedTypes = [...defaults.selectedTypes];
    this.state.showEnded = defaults.showEnded;
    this.state.activeYear = defaults.activeYear;
  }

  /** Local civil today as IsoDate (overridable via __setTodayForTests). */
  private getTodayIso(): IsoDate {
    if (todayOverrideForTests) return todayOverrideForTests;
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  private refreshList(): void {
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    } else {
      this.renderContent();
      // Clear pending when viewing encyclopedia
      const pending = document.getElementById('amzf_pending_section');
      if (pending) setSafeHtml(pending, '');
    }
  }

  private syncMainTabUi(): void {
    const tabs = this.container?.querySelectorAll<HTMLElement>('[data-amzf-main-tab]') ?? [];
    tabs.forEach(tab => {
      const isActive = tab.dataset.amzfMainTab === this.state.mainTab;
      tab.classList.toggle('amzf_active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    this.container
      ?.querySelector('#amzf_time_chips')
      ?.classList.toggle('amzf_hidden', this.state.mainTab !== 'ops');
    this.container
      ?.querySelector('#amzf_type_chips')
      ?.classList.toggle('amzf_hidden', this.state.mainTab !== 'ops');
    this.container
      ?.querySelector('.amzf_filter_hint')
      ?.classList.toggle('amzf_hidden', this.state.mainTab !== 'ops');
    this.container
      ?.querySelector('#amzf_encyclopedia_view_toggle')
      ?.classList.toggle('amzf_hidden', this.state.mainTab !== 'encyclopedia');
  }

  private syncTimeChipUi(): void {
    const chips = this.container?.querySelectorAll<HTMLElement>('[data-amzf-time-window]') ?? [];
    chips.forEach(chip => {
      chip.classList.toggle('amzf_active', chip.dataset.amzfTimeWindow === this.state.timeWindow);
    });
  }

  private syncTypeChipUi(): void {
    const chips = this.container?.querySelectorAll<HTMLElement>('[data-amzf-type]') ?? [];
    const selected = this.state.selectedTypes;
    chips.forEach(chip => {
      const type = chip.dataset.amzfType ?? '';
      const isAll = type === '';
      const active = isAll ? selected.length === 0 : selected.includes(type as EventType);
      chip.classList.toggle('amzf_active', active);
    });
  }

  renderOpsWorkbench(): void {
    const main = document.getElementById('amzf_main');
    const pendingEl = document.getElementById('amzf_pending_section');
    if (!main) return;

    const year = this.state.activeYear;
    const today = this.getTodayIso();
    let occurrences = resolveYear(year);
    const watched = new Set<string>(); // M1: no watch persist yet

    // Scored search on occurrences; empty term = all. Pass '' into engine to avoid weak includes.
    const searchTerm = this.state.searchTerm.trim();
    if (searchTerm) {
      const terms = this.tokenizeSearchTerm(searchTerm);
      const scoredIds = new Set(
        occurrences
          .map(occ => ({ id: occ.occurrenceId, score: this.calculateScore(occ, terms) }))
          .filter(item => item.score > 0)
          .map(item => item.id)
      );
      occurrences = occurrences.filter(occ => scoredIds.has(occ.occurrenceId));
    }

    // Non-empty search is year-scoped so nodes stay findable outside the active time chip
    const timeWindow = searchTerm ? ('all' as OpsTimeWindow) : this.state.timeWindow;

    const views = buildOpsViews(
      occurrences,
      {
        selectedCountry: this.state.selectedCountry,
        selectedTypes: this.state.selectedTypes,
        timeWindow,
        showEnded: this.state.showEnded,
        searchTerm: '', // scoring already applied above
      },
      today,
      watched
    );

    // Sort ops search hits by score when searching (engine sorts by watch + startDate)
    if (searchTerm) {
      const terms = this.tokenizeSearchTerm(searchTerm);
      views.sort(
        (a, b) =>
          this.calculateScore(b.occurrence, terms) - this.calculateScore(a.occurrence, terms)
      );
    }

    // Pending: no exact dates (S-priority official big deals or any pending_official)
    // Re-resolve full year so pending strip is not wiped by search narrowing
    const allYear = resolveYear(year);
    const pending = allYear.filter(
      occ =>
        (occ.confidence === 'pending_official' || !occ.startDate || !occ.endDate) &&
        (occ.priority === 'S' || occ.amazonOfficial === true)
    );

    const filtersNarrowed =
      this.state.selectedCountry !== 'ALL' ||
      this.state.selectedTypes.length > 0 ||
      this.state.timeWindow !== 'd60' ||
      this.state.showEnded === true;

    const { listHtml, pendingHtml } = renderOps({
      views,
      pending,
      searchTerm: this.state.searchTerm,
      filtersNarrowed,
    });

    this.renderSearchStatus(views.length);
    setSafeHtml(main, listHtml);
    if (pendingEl) setSafeHtml(pendingEl, pendingHtml);
  }

  switchMainTab(tab: OpsMainTab): void {
    this.state.mainTab = tab;
    this.syncMainTabUi();
    this.state.expandedSections.clear();
    this.refreshList();
  }

  setTimeWindow(window: OpsTimeWindow): void {
    this.state.timeWindow = window;
    this.syncTimeChipUi();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  toggleTypeFilter(type: string): void {
    if (!type) {
      this.state.selectedTypes = [];
    } else {
      const t = type as EventType;
      const idx = this.state.selectedTypes.indexOf(t);
      if (idx >= 0) {
        this.state.selectedTypes = this.state.selectedTypes.filter(x => x !== t);
      } else {
        this.state.selectedTypes = [...this.state.selectedTypes, t];
      }
    }
    this.syncTypeChipUi();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  resetFilters(): void {
    this.state.selectedCountry = 'ALL';
    this.state.selectedTypes = [];
    this.state.timeWindow = 'd60';
    this.state.showEnded = false;
    this.state.searchTerm = '';
    const input = document.getElementById('amzf_search') as HTMLInputElement | null;
    const clearBtn = document.getElementById('amzf_clear');
    if (input) input.value = '';
    clearBtn?.classList.remove('amzf_visible');
    this.syncTimeChipUi();
    this.syncTypeChipUi();
    this.renderCountryTabs();
    this.renderStats();
    this.refreshList();
  }

  onUnmount(): void {
    // 清理：将下拉框从 body 移除
    const container = document.getElementById('amzf_search_history');
    if (container && container.parentElement === document.body) {
      container.remove();
    }

    todayOverrideForTests = null;
  }

  // ==================== Core Logic ====================

  loadSearchHistory(): void {
    try {
      // 🎯 使用 DI 容器获取 Storage 服务
      const storageService = this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
      const saved = storageService.get(AMZF_HISTORY_KEY, []) as string[];
      this.state.searchHistory = saved || [];
    } catch {
      this.state.searchHistory = [];
    }
  }

  saveSearchHistory(): void {
    try {
      // 🎯 使用 DI 容器获取 Storage 服务
      const storageService = this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
      storageService.set(AMZF_HISTORY_KEY, this.state.searchHistory);
    } catch {
      // Search history persistence is optional.
    }
  }

  addToHistory(term: string): void {
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

  private normalizeSearchText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[，,、;；|/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeSearchTerm(value: string): string[] {
    const normalized = this.normalizeSearchText(value);
    return normalized ? normalized.split(' ').filter(Boolean) : [];
  }

  private getCountrySearchText(codes: string[]): string {
    return codes
      .map(code => {
        const country = (AMZF_COUNTRIES as CountryInfo[]).find(item => item.code === code);
        return [code, country?.name, ...(AMZF_COUNTRY_SEARCH_ALIASES[code] ?? [])]
          .filter(Boolean)
          .join(' ');
      })
      .join(' ');
  }

  private getEventTypeSearchText(type: string): string {
    const meta = AMZF_EVENT_TYPE_META[type] ?? { label: '营销节点', icon: '' };
    return [type, meta.label, ...(AMZF_EVENT_TYPE_SEARCH_ALIASES[type] ?? [])].join(' ');
  }

  private getMonthSearchText(month: number): string {
    return [
      (AMZF_MONTHS as string[])[month - 1],
      ...(AMZF_MONTH_SEARCH_ALIASES[month - 1] ?? []),
    ].join(' ');
  }

  /** Weighted multi-field score for EventOccurrence; 0 = no match for some term. */
  calculateScore(occ: EventOccurrence, terms: string[]): number {
    let score = 0;
    const month = getOccurrenceMonth(occ);
    const searchFields = [
      { weight: 120, text: `${occ.name} ${occ.nameEn}` },
      { weight: 80, text: this.getCountrySearchText(occ.countries) },
      { weight: 70, text: (occ.tags || []).join(' ') },
      { weight: 55, text: occ.strategy },
      { weight: 45, text: this.getEventTypeSearchText(occ.type) },
      {
        weight: 35,
        text: `${occ.dateLabel} ${occ.startDate} ${this.getMonthSearchText(month)}`,
      },
      { weight: 20, text: occ.description },
      { weight: 15, text: occ.templateId },
    ].map(field => ({
      ...field,
      text: this.normalizeSearchText(field.text),
    }));

    for (const term of terms) {
      let termScore = 0;
      for (const field of searchFields) {
        if (field.text.includes(term)) {
          termScore += field.weight;
        }
      }
      if (termScore === 0) return 0;
      score += termScore;
    }
    return score;
  }

  /** Country + scored search over resolveYear(activeYear). */
  getFilteredOccurrences(): EventOccurrence[] {
    let candidates = resolveYear(this.state.activeYear).filter(
      occ =>
        this.state.selectedCountry === 'ALL' || occ.countries.includes(this.state.selectedCountry)
    );

    if (!this.state.searchTerm || this.state.searchTerm.trim() === '') {
      return candidates;
    }

    const terms = this.tokenizeSearchTerm(this.state.searchTerm);
    return candidates
      .map(occ => ({ occ, score: this.calculateScore(occ, terms) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.occ);
  }

  // ==================== Actions ====================

  selectCountry(code: string): void {
    this.state.selectedCountry = code;

    // Update Tabs UI via data attribute (stable vs text match)
    const tabs = this.container?.querySelectorAll<HTMLElement>('[data-amzf-country]') ?? [];
    tabs.forEach(tab => {
      tab.classList.toggle('amzf_active', tab.dataset.amzfCountry === code);
    });

    this.renderStats();
    this.refreshList();
  }

  switchView(view: string): void {
    this.state.currentView = view === 'event' ? 'event' : 'country';
    // Encyclopedia view toggle implies encyclopedia tab
    this.state.mainTab = 'encyclopedia';
    this.syncMainTabUi();
    document
      .getElementById('amzf_btn_country')
      ?.classList.toggle('amzf_active', this.state.currentView === 'country');
    document
      .getElementById('amzf_btn_event')
      ?.classList.toggle('amzf_active', this.state.currentView === 'event');

    this.state.expandedSections.clear();
    this.refreshList();
  }

  toggleSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('amzf_expanded');
      const trigger = document.querySelector(`[data-amzf-toggle-section="${id}"]`);
      trigger?.setAttribute(
        'aria-expanded',
        element.classList.contains('amzf_expanded').toString()
      );
    }
    if (this.state.expandedSections.has(id)) {
      this.state.expandedSections.delete(id);
    } else {
      this.state.expandedSections.add(id);
    }
  }

  clearSearch(): void {
    const input = document.getElementById('amzf_search') as HTMLInputElement;
    const clearBtn = document.getElementById('amzf_clear');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) clearBtn.classList.remove('amzf_visible');

    this.state.searchTerm = '';
    this.hideSearchHistory();
    this.renderStats();
    this.refreshList();
  }

  // ==================== Search History Actions ====================

  selectHistoryItem(term: string, saveToHistory = false): void {
    const input = document.getElementById('amzf_search') as HTMLInputElement;
    const clearBtn = document.getElementById('amzf_clear');

    if (input) {
      input.value = term;
      input.focus();
    }
    if (clearBtn) clearBtn.classList.add('amzf_visible');

    this.state.searchTerm = this.normalizeSearchText(term);
    if (saveToHistory) this.addToHistory(term);
    this.hideSearchHistory();
    this.renderStats();
    this.refreshList();
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
    const container = document.getElementById('amzf_search_history');
    const searchBox = document.querySelector('.amzf_search_box') as HTMLElement;

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
      let maxHeight = Math.max(120, Math.min(320, availableHeight));

      // 如果下方空间不足，尝试显示在上方
      if (maxHeight < 200 && searchRect.top > 220) {
        const topSpace = searchRect.top - 20;
        maxHeight = Math.min(320, topSpace);
        top = searchRect.top - maxHeight - 8;
      }

      container.classList.add('amzf_search_history--positioned');
      updateRuntimeCssRule(
        'amzf-search-history-position',
        '#amzf_search_history.amzf_search_history--positioned',
        {
          top: `${top}px`,
          left: `${left}px`,
          width: `${containerWidth}px`,
          'max-height': `${maxHeight}px`,
        }
      );

      // 使用requestAnimationFrame确保样式应用后再添加show类
      requestAnimationFrame(() => {
        container.classList.add('amzf_show');
        document.getElementById('amzf_search')?.setAttribute('aria-expanded', 'true');
      });
    }
  }

  hideSearchHistory(): void {
    const container = document.getElementById('amzf_search_history');
    if (container) {
      container.classList.remove('amzf_show');
      document.getElementById('amzf_search')?.setAttribute('aria-expanded', 'false');
    }
  }

  // ==================== Event Binding ====================

  private bindCalendarClickEvents(): void {
    this.addEventListener(document, 'click', event => this.handleCalendarClick(event));
  }

  private handleCalendarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (this.handleHistoryControlClick(target, event)) return;
    if (this.handleCalendarSelectionClick(target)) return;

    this.handleCalendarActionClick(target);
  }

  private findCalendarTarget(target: HTMLElement, selector: string): HTMLElement | null {
    const element = target.closest<HTMLElement>(selector);
    return element && this.isCalendarTarget(element) ? element : null;
  }

  private isCalendarTarget(element: HTMLElement): boolean {
    const historyContainer = document.getElementById('amzf_search_history');
    return Boolean(this.container?.contains(element) || historyContainer?.contains(element));
  }

  private handleHistoryControlClick(target: HTMLElement, event: Event): boolean {
    const deleteBtn = this.findCalendarTarget(target, '[data-amzf-delete-history-index]');
    if (deleteBtn) {
      event.stopPropagation();
      const index = Number(deleteBtn.dataset.amzfDeleteHistoryIndex);
      if (Number.isInteger(index)) this.deleteHistoryItem(index);
      return true;
    }

    const clearHistoryBtn = this.findCalendarTarget(target, '[data-amzf-clear-history]');
    if (clearHistoryBtn) {
      event.stopPropagation();
      this.clearAllHistory();
      return true;
    }

    return false;
  }

  private handleCalendarSelectionClick(target: HTMLElement): boolean {
    const mainTabBtn = this.findCalendarTarget(target, '[data-amzf-main-tab]');
    if (mainTabBtn) {
      const tab = (mainTabBtn.dataset.amzfMainTab || 'ops') as OpsMainTab;
      this.switchMainTab(tab === 'encyclopedia' ? 'encyclopedia' : 'ops');
      return true;
    }

    const timeChip = this.findCalendarTarget(target, '[data-amzf-time-window]');
    if (timeChip) {
      const w = timeChip.dataset.amzfTimeWindow as OpsTimeWindow | undefined;
      if (w === 'month' || w === 'd30' || w === 'd60' || w === 'all') {
        this.setTimeWindow(w);
      }
      return true;
    }

    const typeChip = this.findCalendarTarget(target, '[data-amzf-type]');
    if (typeChip) {
      this.toggleTypeFilter(typeChip.dataset.amzfType ?? '');
      return true;
    }

    const countryBtn = this.findCalendarTarget(target, '[data-amzf-country]');
    if (countryBtn) {
      this.selectCountry(countryBtn.dataset.amzfCountry || 'ALL');
      return true;
    }

    const historyItem = this.findCalendarTarget(target, '[data-amzf-history-item]');
    if (historyItem) {
      const term = historyItem.dataset.amzfHistoryItem;
      if (term) this.selectHistoryItem(term);
      return true;
    }

    const quickTag = this.findCalendarTarget(target, '[data-amzf-quick-tag]');
    if (quickTag) {
      const term = quickTag.dataset.amzfQuickTag;
      if (term) this.selectHistoryItem(term, true);
      return true;
    }

    const sectionToggle = this.findCalendarTarget(target, '[data-amzf-toggle-section]');
    if (sectionToggle) {
      const id = sectionToggle.dataset.amzfToggleSection;
      if (id) this.toggleSection(id);
      return true;
    }

    return false;
  }

  private handleCalendarActionClick(target: HTMLElement): void {
    const actionEl = this.findCalendarTarget(target, '[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    if (action === 'amzf_switchView') {
      this.switchView(actionEl.dataset.param || 'country');
    } else if (action === 'amzf_clearSearch') {
      this.clearSearch();
    } else if (action === 'amzf_resetFilters') {
      this.resetFilters();
    } else if (action === 'amzf_scrollPending') {
      document.getElementById('amzf_pending_section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  bindSearchEvents(): void {
    const elements = this.getSearchElements();
    if (!elements) return;

    this.bindSearchFocusEvents(elements);
    this.bindSearchDismissEvents(elements);
    this.bindSearchInputEvents(elements);
    this.bindSearchKeyboardEvents(elements.input);
    this.bindSearchClearEvent(elements.clearBtn);
    this.bindSearchWindowEvents(elements.searchHistory);
  }

  private getSearchElements(): MarketingCalendarSearchElements | null {
    const input = document.getElementById('amzf_search') as HTMLInputElement | null;
    if (!input) return null;

    return {
      input,
      clearBtn: document.getElementById('amzf_clear'),
      searchBox: document.getElementById('amzf_search_box'),
      searchWrapper: document.querySelector('.amzf_search_wrapper'),
      searchHistory: document.getElementById('amzf_search_history'),
    };
  }

  private bindSearchFocusEvents(elements: MarketingCalendarSearchElements): void {
    this.addEventListener(elements.input, 'focus', () => this.showSearchHistory());
    if (elements.searchBox) {
      this.addEventListener(elements.searchBox, 'click', () => elements.input.focus());
    }
  }

  private bindSearchDismissEvents(elements: MarketingCalendarSearchElements): void {
    this.addEventListener(document, 'click', e => {
      if (this.shouldHideSearchHistory(e.target, elements)) {
        this.hideSearchHistory();
      }
    });
  }

  private shouldHideSearchHistory(
    target: EventTarget | null,
    elements: MarketingCalendarSearchElements
  ): boolean {
    if (!elements.searchWrapper || !(target instanceof Node)) return false;
    return !elements.searchWrapper.contains(target) && !elements.searchHistory?.contains(target);
  }

  private bindSearchInputEvents(elements: MarketingCalendarSearchElements): void {
    this.addEventListener(elements.input, 'input', e => {
      const value = (e.target as HTMLInputElement).value;
      this.updateClearButtonVisibility(elements.clearBtn, value);
      this.scheduleSearchRender(value);
    });
  }

  private updateClearButtonVisibility(clearBtn: HTMLElement | null, value: string): void {
    clearBtn?.classList.toggle('amzf_visible', value.length > 0);
  }

  private scheduleSearchRender(value: string): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = this.setTimeout(() => {
      this.state.searchTerm = this.normalizeSearchText(value);
      this.renderStats();
      this.refreshList();
    }, 300);
  }

  private bindSearchKeyboardEvents(input: HTMLInputElement): void {
    this.addEventListener(input, 'keydown', e => {
      const keyEvent = e as KeyboardEvent;
      if (this.handleSearchEnter(keyEvent, input)) return;
      this.handleSearchEscape(keyEvent, input);
    });
  }

  private handleSearchEnter(event: KeyboardEvent, input: HTMLInputElement): boolean {
    if (event.key !== 'Enter' || !input.value.trim()) return false;

    event.preventDefault();
    this.selectHistoryItem(input.value.trim(), true);
    input.blur();
    return true;
  }

  private handleSearchEscape(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Escape') return;

    this.hideSearchHistory();
    input.blur();
  }

  private bindSearchClearEvent(clearBtn: HTMLElement | null): void {
    if (!clearBtn) return;

    this.addEventListener(clearBtn, 'click', e => {
      e.stopPropagation();
      this.clearSearch();
    });
  }

  private bindSearchWindowEvents(searchHistory: HTMLElement | null): void {
    this.addEventListener(window, 'resize', () => this.repositionSearchHistory(searchHistory));
    this.addEventListener(window, 'scroll', () => this.hideSearchHistory(), true);
  }

  private repositionSearchHistory(searchHistory: HTMLElement | null): void {
    if (searchHistory?.classList.contains('amzf_show')) {
      this.showSearchHistory();
    }
  }

  // ==================== Rendering ====================

  renderCountryTabs(): void {
    const container = document.getElementById('amzf_country_tabs');
    if (!container) return;

    let html = `<button class="amzf_country_tab amzf_active" data-amzf-country="ALL">
            <span class="amzf_country_flag"><i class="fas fa-globe"></i></span> 全部
        </button>`;

    (AMZF_COUNTRIES as CountryInfo[]).forEach(c => {
      html += `<button class="amzf_country_tab" data-amzf-country="${escapeHtml(c.code)}">
                <span class="amzf_country_flag">${c.flag}</span> ${c.name}
            </button>`;
    });

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
  }

  renderSearchHistory(): void {
    const container = document.getElementById('amzf_search_history');
    if (!container) return;

    let html = '';
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
                    <div class="amzf_history_row">
                        <button type="button" class="amzf_history_item" data-amzf-history-item="${safeItem}">
                            <span class="amzf_history_item_icon"><i class="fas fa-search"></i></span>
                            <span class="amzf_history_item_text">${safeItem}</span>
                        </button>
                        <button type="button" class="amzf_history_item_delete" data-amzf-delete-history-index="${index}" aria-label="删除搜索历史 ${safeItem}">
                            <i class="fas fa-times"></i>
                        </button>
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
                  tag => `
                    <button type="button" class="amzf_quick_tag" data-amzf-quick-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
                `
                ).join('')}
            </div>
        `;
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
  }

  renderSearchStatus(filteredCount: number): void {
    const container = document.getElementById('amzf_search_status');
    if (!container) return;

    const term = this.state.searchTerm.trim();
    if (!term) {
      container.classList.remove('amzf_visible');
      setSafeHtml(container, '');
      return;
    }

    const selectedCountry =
      this.state.selectedCountry === 'ALL'
        ? '全部站点'
        : (AMZF_COUNTRIES as CountryInfo[]).find(
            country => country.code === this.state.selectedCountry
          )?.name || this.state.selectedCountry;

    container.classList.add('amzf_visible');
    setSafeHtml(
      container,
      `
        <div class="amzf_search_status_text">
          <i class="fas fa-filter"></i>
          <span>当前搜索：<strong>${escapeHtml(term)}</strong></span>
          <span>${escapeHtml(selectedCountry)}</span>
          <span>${escapeHtml(filteredCount.toString())} 个节点</span>
        </div>
        <button type="button" class="amzf_search_status_clear" data-action="amzf_clearSearch">
          清除搜索
        </button>
      `
    );
  }

  renderStats(): void {
    const filtered = this.getFilteredOccurrences();
    const container = document.getElementById('amzf_stats');
    if (!container) return;

    const holidays = filtered.filter(e => e.type === 'holiday').length;
    const shopping = filtered.filter(e => e.type === 'shopping').length;

    // ✅ 安全: 统计值为本地计算数字，并通过escapeHtml转义后插入静态模板
    setSafeHtml(
      container,
      `
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
        `
    );
  }

  renderContent(): void {
    const container = document.getElementById('amzf_main');
    if (!container) return;

    const filtered = this.getFilteredOccurrences();
    this.renderSearchStatus(filtered.length);

    container.classList.add('amzf_list_entering');
    const html = renderEncyclopedia({
      occurrences: filtered,
      view: this.state.currentView,
      searchTerm: this.state.searchTerm,
      expandedSections: this.state.expandedSections,
      months: AMZF_MONTHS as string[],
      countries: AMZF_COUNTRIES as CountryInfo[],
    });
    setSafeHtml(container, html);
    this.setTimeout(() => container.classList.remove('amzf_list_entering'), 500);
  }
}

const instance = new MarketingCalendarModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
