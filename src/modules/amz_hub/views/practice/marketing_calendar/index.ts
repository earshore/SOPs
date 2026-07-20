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
import { AMZF_COPY } from '@/modules/amz_hub/data/marketingCalendar/copy';
import { toIsoDate } from '@/modules/amz_hub/data/marketingCalendar/dateRules';
import { resolveYear } from '@/modules/amz_hub/data/marketingCalendar/resolveYear';
import type {
  EventOccurrence,
  EventType,
  IsoDate,
  OpsTimeWindow,
} from '@/modules/amz_hub/data/marketingCalendar/types';
import { getOpenPhases } from '@/modules/amz_hub/data/marketingCalendar/prepRules';
import { buildOpsViews } from './opsCalendarEngine';
import {
  getOccurrenceMonth,
  renderEncyclopedia,
  type EncyclopediaView,
} from './renderEncyclopedia';
import { getOpsHorizonYears } from './activeYear';
import { renderOps } from './renderOps';
import {
  defaultUserState,
  eventChecklistKey,
  loadUserState,
  pageChecklistKey,
  RETURN_CONTEXT_KEY,
  saveUserState,
  type AmzfReturnContext,
  type OpsMainTab,
  type UserCalendarState,
} from './userState';
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
  yearPinned: boolean;
  watchedTemplateIds: string[];
  checklist: Record<string, boolean>;
  /** Ops cards with expanded checklist / strategy (session memory, not persisted). */
  expandedOccurrenceIds: Set<string>;
}

/** Test-only override for "today"; null = system clock. */
let todayOverrideForTests: IsoDate | null = null;

/** Optional test hook — prefer pure render/engine tests with fixed today. */
export function setTodayForTests(iso: IsoDate | null): void {
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

    // State Initialization (M2: filters/watch/checklist/year restored in init via loadUserState)
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
      yearPinned: defaults.yearPinned,
      watchedTemplateIds: [...defaults.watchedTemplateIds],
      checklist: { ...defaults.checklist },
      expandedOccurrenceIds: new Set(),
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
    // Singleton module: load M2 user state (or defaults) on each mount
    this.loadSessionStateFromStorage();
    this.loadSearchHistory();
    this.renderCountryTabs();
    this.renderYearSwitch();
    this.syncMainTabUi();
    this.syncTimeChipUi();
    this.syncTypeChipUi();
    this.syncPageChecklistUi();
    this.renderStats();
    this.refreshList();
    this.bindCalendarClickEvents();
    this.bindPageChecklistChange();
    this.bindEventChecklistChange();
    this.bindSearchEvents();
    this.syncShowEndedUi();
    this.applyReturnContextAfterRender();
  }

  private bindPageChecklistChange(): void {
    const section = document.getElementById('amzf_page_checklist');
    if (!section) return;
    this.addEventListener(section, 'change', event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('[data-amzf-page-check]')) return;
      const id = target.dataset.amzfPageCheck;
      if (id) this.setPageChecklistItem(id, target.checked);
    });
  }

  private bindEventChecklistChange(): void {
    // Ops cards are re-rendered into #amzf_main; listen on document scoped to this module.
    this.addEventListener(document, 'change', event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('[data-amzf-event-check]')) return;
      if (!this.container?.contains(target)) return;
      const templateId = target.dataset.amzfTemplate || '';
      const year = Number(target.dataset.amzfYear);
      const phase = target.dataset.amzfPhase || '';
      if (templateId && phase && Number.isFinite(year)) {
        this.setEventChecklistItem(templateId, year, phase, target.checked);
      }
    });
  }

  /** Apply persisted v2 state; search term / expanded sections always reset. */
  private loadSessionStateFromStorage(): void {
    const systemYear = new Date().getFullYear();
    this.state.currentView = 'country';
    this.state.searchTerm = '';
    this.state.expandedSections = new Set();

    try {
      const storage = this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
      this.applyUserState(loadUserState(storage, systemYear));
    } catch {
      this.applyUserState(defaultUserState(systemYear));
    }
  }

  private applyUserState(s: UserCalendarState): void {
    this.state.selectedCountry = s.selectedCountry;
    this.state.mainTab = s.mainTab;
    this.state.timeWindow = s.timeWindow;
    this.state.selectedTypes = [...s.selectedTypes];
    this.state.showEnded = s.showEnded;
    this.state.activeYear = s.activeYear;
    this.state.yearPinned = s.yearPinned;
    this.state.watchedTemplateIds = [...s.watchedTemplateIds];
    this.state.checklist = { ...s.checklist };
  }

  private toUserCalendarState(): UserCalendarState {
    return {
      version: 2,
      activeYear: this.state.activeYear,
      yearPinned: this.state.yearPinned,
      selectedCountry: this.state.selectedCountry,
      selectedTypes: [...this.state.selectedTypes],
      timeWindow: this.state.timeWindow,
      mainTab: this.state.mainTab,
      watchedTemplateIds: [...this.state.watchedTemplateIds],
      checklist: { ...this.state.checklist },
      showEnded: this.state.showEnded,
      updatedAt: new Date().toISOString(),
    };
  }

  private persistUserState(): void {
    try {
      const storage = this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
      saveUserState(storage, this.toUserCalendarState());
    } catch {
      // Ops state persistence is optional when storage is unavailable.
    }
  }

  /** Local civil today as IsoDate (overridable via setTodayForTests). */
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

  /** Resolve occurrences for active year (+ horizon when unpinned system year in Oct–Dec). */
  private resolveActiveOccurrences(): EventOccurrence[] {
    const todayIso = this.getTodayIso();
    const todayDate = new Date(`${todayIso}T12:00:00`);
    const years = getOpsHorizonYears(todayDate, this.state.activeYear, this.state.yearPinned);
    const seen = new Set<string>();
    const out: EventOccurrence[] = [];
    for (const year of years) {
      for (const occ of resolveYear(year)) {
        if (seen.has(occ.occurrenceId)) continue;
        seen.add(occ.occurrenceId);
        out.push(occ);
      }
    }
    return out;
  }

  renderOpsWorkbench(): void {
    const main = document.getElementById('amzf_main');
    const pendingEl = document.getElementById('amzf_pending_section');
    if (!main) return;

    const today = this.getTodayIso();
    let occurrences = this.resolveActiveOccurrences();
    const watched = new Set(this.state.watchedTemplateIds);

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
    // Re-resolve full horizon so pending strip is not wiped by search narrowing
    const allYear = this.resolveActiveOccurrences();
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
      checklist: this.state.checklist,
      expandedOccurrenceIds: this.state.expandedOccurrenceIds,
    });

    this.renderSearchStatus(views.length);
    setSafeHtml(main, listHtml);
    if (pendingEl) setSafeHtml(pendingEl, pendingHtml);
    this.syncShowEndedUi();
  }

  switchMainTab(tab: OpsMainTab): void {
    this.state.mainTab = tab;
    this.persistUserState();
    this.syncMainTabUi();
    this.state.expandedSections.clear();
    this.refreshList();
  }

  setTimeWindow(window: OpsTimeWindow): void {
    this.state.timeWindow = window;
    this.persistUserState();
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
    this.persistUserState();
    this.syncTypeChipUi();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  setActiveYear(year: number): void {
    const y = Math.trunc(year);
    if (!Number.isFinite(y)) return;
    this.state.activeYear = y;
    this.state.yearPinned = true;
    this.persistUserState();
    this.renderYearSwitch();
    this.syncPageChecklistUi();
    this.renderStats();
    this.refreshList();
  }

  toggleWatch(templateId: string): void {
    if (!templateId) return;
    const set = new Set(this.state.watchedTemplateIds);
    if (set.has(templateId)) {
      set.delete(templateId);
    } else {
      set.add(templateId);
    }
    this.state.watchedTemplateIds = [...set];
    this.persistUserState();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
    this.renderStats();
  }

  setPageChecklistItem(id: string, checked: boolean): void {
    if (!id) return;
    const key = pageChecklistKey(this.state.activeYear, id);
    if (checked) {
      this.state.checklist[key] = true;
    } else {
      delete this.state.checklist[key];
    }
    this.persistUserState();
  }

  setEventChecklistItem(templateId: string, year: number, phase: string, checked: boolean): void {
    if (!templateId || !phase) return;
    const key = eventChecklistKey(templateId, year, phase);
    if (checked) {
      this.state.checklist[key] = true;
    } else {
      delete this.state.checklist[key];
    }
    this.persistUserState();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  expandOccurrence(occurrenceId: string): void {
    if (!occurrenceId) return;
    this.state.expandedOccurrenceIds.add(occurrenceId);
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  setShowEnded(show: boolean): void {
    this.state.showEnded = show;
    this.persistUserState();
    this.syncShowEndedUi();
    if (this.state.mainTab === 'ops') {
      this.renderOpsWorkbench();
    }
  }

  toggleShowEnded(): void {
    this.setShowEnded(!this.state.showEnded);
  }

  syncShowEndedUi(): void {
    const btn = document.getElementById('amzf_show_ended');
    if (!btn) return;
    btn.classList.toggle('amzf_active', this.state.showEnded);
    btn.textContent = this.state.showEnded
      ? AMZF_COPY['filter.hideEnded']
      : AMZF_COPY['filter.showEnded'];
  }

  resetFilters(): void {
    this.state.selectedCountry = 'ALL';
    this.state.selectedTypes = [];
    this.state.timeWindow = 'd60';
    this.state.showEnded = false;
    this.state.searchTerm = '';
    this.persistUserState();
    const input = document.getElementById('amzf_search') as HTMLInputElement | null;
    const clearBtn = document.getElementById('amzf_clear');
    if (input) input.value = '';
    clearBtn?.classList.remove('amzf_visible');
    this.syncTimeChipUi();
    this.syncTypeChipUi();
    this.syncShowEndedUi();
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

  /** Country + scored search over active year (and horizon when applicable). */
  getFilteredOccurrences(): EventOccurrence[] {
    let candidates = this.resolveActiveOccurrences().filter(
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
    this.persistUserState();

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
    this.persistUserState();
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
    this.noteOutboundReturnContext(target);
    if (this.handleOpsChromeClick(target)) return true;
    if (this.handleFilterClick(target)) return true;
    if (this.handleSearchChromeClick(target)) return true;
    return this.handleScrollSourceClick(target);
  }

  /** Remember card when leaving via switch-tab (does not consume the click). */
  private noteOutboundReturnContext(target: HTMLElement): void {
    const outboundCta = this.findCalendarTarget(
      target,
      '[data-action="switch-tab"][data-amzf-primary-cta], [data-action="switch-tab"][data-amzf-secondary-cta]'
    );
    if (outboundCta) this.captureReturnContextFromCard(outboundCta);
  }

  private handleOpsChromeClick(target: HTMLElement): boolean {
    if (this.findCalendarTarget(target, '#amzf_show_ended, [data-amzf-show-ended]')) {
      this.toggleShowEnded();
      return true;
    }
    const localCta = this.findCalendarTarget(target, '[data-amzf-local-cta]');
    if (localCta) {
      this.handleLocalCta(localCta);
      return true;
    }
    const mainTabBtn = this.findCalendarTarget(target, '[data-amzf-main-tab]');
    if (mainTabBtn) {
      const tab = (mainTabBtn.dataset.amzfMainTab || 'ops') as OpsMainTab;
      this.switchMainTab(tab === 'encyclopedia' ? 'encyclopedia' : 'ops');
      return true;
    }
    const yearChip = this.findCalendarTarget(target, '#amzf_year_switch [data-amzf-year]');
    if (yearChip) {
      const y = Number(yearChip.dataset.amzfYear);
      if (Number.isFinite(y)) this.setActiveYear(y);
      return true;
    }
    const watchBtn = this.findCalendarTarget(target, '[data-amzf-watch]');
    if (watchBtn?.dataset.amzfWatch) {
      this.toggleWatch(watchBtn.dataset.amzfWatch);
      return true;
    }
    return false;
  }

  private handleFilterClick(target: HTMLElement): boolean {
    const timeChip = this.findCalendarTarget(target, '[data-amzf-time-window]');
    if (timeChip) {
      const w = timeChip.dataset.amzfTimeWindow as OpsTimeWindow | undefined;
      if (w === 'month' || w === 'd30' || w === 'd60' || w === 'all') this.setTimeWindow(w);
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
    return false;
  }

  private handleSearchChromeClick(target: HTMLElement): boolean {
    const historyItem = this.findCalendarTarget(target, '[data-amzf-history-item]');
    if (historyItem?.dataset.amzfHistoryItem) {
      this.selectHistoryItem(historyItem.dataset.amzfHistoryItem);
      return true;
    }
    const quickTag = this.findCalendarTarget(target, '[data-amzf-quick-tag]');
    if (quickTag?.dataset.amzfQuickTag) {
      this.selectHistoryItem(quickTag.dataset.amzfQuickTag, true);
      return true;
    }
    const sectionToggle = this.findCalendarTarget(target, '[data-amzf-toggle-section]');
    if (sectionToggle?.dataset.amzfToggleSection) {
      this.toggleSection(sectionToggle.dataset.amzfToggleSection);
      return true;
    }
    return false;
  }

  private handleScrollSourceClick(target: HTMLElement): boolean {
    const scrollSource = this.findCalendarTarget(target, '[data-amzf-scroll-source]');
    if (!scrollSource) return false;
    const id = scrollSource.dataset.amzfScrollSource;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    return true;
  }

  private getStorageOrNull(): IStorageService | null {
    try {
      return this.getService<IStorageService>(SERVICE_NAMES.STORAGE);
    } catch {
      return null;
    }
  }

  private captureReturnContextFromCard(ctaEl: HTMLElement): void {
    const card = ctaEl.closest<HTMLElement>('[data-amzf-template]');
    const templateId = card?.dataset.amzfTemplate;
    if (!templateId) return;
    const yearRaw = card?.dataset.amzfYear;
    const year =
      yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : this.state.activeYear;
    const ctx: AmzfReturnContext = { templateId, year, tab: 'ops' };
    this.getStorageOrNull()?.set(RETURN_CONTEXT_KEY, ctx);
  }

  private cardYear(card: HTMLElement | null): number {
    const yearRaw = card?.dataset.amzfYear;
    return yearRaw && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : this.state.activeYear;
  }

  private handleLocalCta(btn: HTMLElement): void {
    const key = btn.dataset.amzfLocalCta || '';
    const card = btn.closest<HTMLElement>('[data-amzf-occurrence]');
    const occurrenceId = card?.dataset.amzfOccurrence || '';
    const templateId = card?.dataset.amzfTemplate || '';
    const year = this.cardYear(card);
    if (key === 'review' || key === 'reviewMark') {
      if (templateId) this.setEventChecklistItem(templateId, year, 'review', true);
    }
    if (occurrenceId) this.expandOccurrence(occurrenceId);
  }

  private parseReturnContext(raw: unknown): AmzfReturnContext | null {
    if (!raw || typeof raw !== 'object') return null;
    const parsed = raw as Partial<AmzfReturnContext>;
    if (typeof parsed.templateId !== 'string' || !parsed.templateId) return null;
    return {
      templateId: parsed.templateId,
      year:
        typeof parsed.year === 'number' && Number.isFinite(parsed.year)
          ? parsed.year
          : this.state.activeYear,
      tab: parsed.tab === 'encyclopedia' ? 'encyclopedia' : 'ops',
    };
  }

  /** After list render: scroll/highlight card from outbound CTA return context. */
  private applyReturnContextAfterRender(): void {
    const storage = this.getStorageOrNull();
    if (!storage) return;
    const ctx = this.parseReturnContext(storage.get(RETURN_CONTEXT_KEY, null));
    storage.set(RETURN_CONTEXT_KEY, null);
    if (!ctx) return;

    if (ctx.year !== this.state.activeYear) {
      this.state.activeYear = ctx.year;
      this.state.yearPinned = true;
      this.persistUserState();
      this.renderYearSwitch();
      this.syncPageChecklistUi();
    }
    const tab: OpsMainTab = ctx.tab === 'encyclopedia' ? 'encyclopedia' : 'ops';
    if (tab !== this.state.mainTab) {
      this.state.mainTab = tab;
      this.persistUserState();
      this.syncMainTabUi();
    }
    this.refreshList();
    this.highlightReturnCard(ctx.templateId);
  }

  private highlightReturnCard(templateId: string): void {
    requestAnimationFrame(() => {
      const cards = Array.from(
        this.container?.querySelectorAll<HTMLElement>('[data-amzf-template]') ?? []
      );
      const card = cards.find(el => el.dataset.amzfTemplate === templateId);
      if (!card) return;
      card.classList.add('amzf_return_highlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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

    const selected = this.state.selectedCountry;
    let html = `<button class="amzf_country_tab${selected === 'ALL' ? ' amzf_active' : ''}" data-amzf-country="ALL">
            <span class="amzf_country_flag"><i class="fas fa-globe"></i></span> 全部
        </button>`;

    (AMZF_COUNTRIES as CountryInfo[]).forEach(c => {
      const active = selected === c.code ? ' amzf_active' : '';
      html += `<button class="amzf_country_tab${active}" data-amzf-country="${escapeHtml(c.code)}">
                <span class="amzf_country_flag">${c.flag}</span> ${c.name}
            </button>`;
    });

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
  }

  renderYearSwitch(): void {
    const container = document.getElementById('amzf_year_switch');
    if (!container) return;

    const systemYear = new Date().getFullYear();
    const years = new Set([systemYear - 1, systemYear, systemYear + 1, this.state.activeYear]);
    const sorted = [...years].filter(y => Number.isFinite(y)).sort((a, b) => a - b);
    const yearLabel = AMZF_COPY['page.yearLabel'].replace('{year}', String(this.state.activeYear));

    const chips = sorted
      .map(y => {
        const active = y === this.state.activeYear ? ' amzf_active' : '';
        return `<button type="button" class="amzf_chip${active}" data-amzf-year="${y}">${y}</button>`;
      })
      .join('');

    setSafeHtml(container, `<span class="amzf_year_label">${escapeHtml(yearLabel)}</span>${chips}`);
  }

  syncPageChecklistUi(): void {
    const year = this.state.activeYear;
    const inputs =
      this.container?.querySelectorAll<HTMLInputElement>('[data-amzf-page-check]') ?? [];
    inputs.forEach(input => {
      const id = input.dataset.amzfPageCheck;
      if (!id) return;
      input.checked = this.state.checklist[pageChecklistKey(year, id)] === true;
    });
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

    const today = this.getTodayIso();
    const watchedSet = new Set(this.state.watchedTemplateIds);
    const watchedCount = filtered.filter(e => watchedSet.has(e.templateId)).length;
    const inventoryOpen = filtered.filter(
      e =>
        e.confidence !== 'pending_official' &&
        e.startDate &&
        getOpenPhases(e, today).includes('inventory')
    ).length;
    const pendingCount = this.resolveActiveOccurrences().filter(
      e =>
        (e.confidence === 'pending_official' || !e.startDate || !e.endDate) &&
        (e.priority === 'S' || e.amazonOfficial === true)
    ).length;
    const note = escapeHtml(AMZF_COPY['stats.doubleCountNote']);

    setSafeHtml(
      container,
      `
            <div class="amzf_stat_item" title="${note}">
                <div class="amzf_stat_icon amzf_blue"><i class="fa-solid fa-timeline text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(String(filtered.length))}</div>
                    <div class="amzf_stat_label">${escapeHtml(AMZF_COPY['stats.nodes'])}</div>
                </div>
            </div>
            <div class="amzf_stat_item" title="${note}">
                <div class="amzf_stat_icon amzf_green"><i class="fas fa-star text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(String(watchedCount))}</div>
                    <div class="amzf_stat_label">${escapeHtml(AMZF_COPY['stats.watched'])}</div>
                </div>
            </div>
            <div class="amzf_stat_item" title="${note}">
                <div class="amzf_stat_icon amzf_orange"><i class="fas fa-boxes-stacked text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(String(inventoryOpen))}</div>
                    <div class="amzf_stat_label">${escapeHtml(AMZF_COPY['stats.inventoryOpen'])}</div>
                </div>
            </div>
            <div class="amzf_stat_item" title="${note}">
                <div class="amzf_stat_icon amzf_blue"><i class="fas fa-bullhorn text-purple-500"></i></div>
                <div>
                    <div class="amzf_stat_value">${escapeHtml(String(pendingCount))}</div>
                    <div class="amzf_stat_label">${escapeHtml(AMZF_COPY['stats.pending'])}</div>
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
