import { APP_EVENTS } from '@/common/constants/eventConstants';
import { DEFAULT_LLM_PROVIDER_ID, DEFAULT_NEW_API_ENDPOINT } from '@/common/config/llmProviders';
import { DEFAULT_REASONING_PREFS } from '@/services/modelCapability';
import { DEFAULT_SCRAPER_PROXY_TYPE } from '@/common/config/scraperProxies';
import { ErrorService } from '@/services/errorService';
import eventBus from '@/common/EventBus';
import { SettingsPanelData, AlpineWatchContext, SettingsPanelPart } from './panelTypes';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import { ThemeManager } from '@/common/config/themeConfig';
import { apiPathIdForFamily } from './domain/settingsLlmModel';
import { assembleSettingsTemplate } from './loader';
import settingsShellHtml from './systemSettings.html?raw';
import { appearanceSectionBehavior } from './sections/appearanceSection';
import {
  applySettingsDeepLink,
  expandSettingsFocusTarget,
  normalizeSettingsOpenOptions,
  resolveSettingsNavGroupFromSection,
  type SettingsOpenOptions,
} from '@/components/settings/domain/settingsDeepLink';
import {
  createEmptyToolTargetModels,
  toolStrategySectionBehavior,
} from './sections/toolStrategySection';
import { confirmSettingsAction, dataSectionBehavior } from './sections/dataSection';
import { diagnosticsSectionBehavior } from './sections/diagnosticsSection';
import {
  findFirstSettingsSearchMatch,
  findSettingsSearchMatches,
  SETTINGS_SEARCH_INDEX,
  toSettingsSearchHitViews,
  type SettingsSearchHitView,
} from '@/components/settings/domain/settingsSearch';
import { getDeveloperDiagnosticSettings } from '@/services/developerDiagnosticsService';
import { getRuntimeStrategySettings } from '@/services/runtimeStrategyService';
import { type SettingsDirtyPartition } from '@/components/settings/domain/settingsDirty';
import { isRuntimeRawInvalid } from '@/components/settings/domain/settingsHealth';
import { llmSectionBehavior } from './sections/llmSection';
import { llmSectionRichBehavior } from './sections/llmSectionRich';
import {
  measureSettingsNavMarkers,
  pickActiveSettingsNavGroup,
  pickActiveSettingsNavId,
} from '@/components/settings/domain/settingsNavScroll';
import { networkSectionBehavior } from './sections/networkSection';
import { showToast } from '@/common/ui';
import { createSafeFragment } from '@/common/utils/security';

// src/components/settings/systemSettings.ts
// ================================================================
// 🎯 Phase 3: Alpine.js Refactor (TypeScript版本) — TD-SET-01 拆分组装壳
// ================================================================

import './systemSettings.css';
// TD-SET-01 Phase 2: section styles ? import order mirrors the original cascade order.
import './sections/llmSection.css';
import './sections/appearanceSection.css';
import './sections/toolStrategySection.css';
import './sections/networkSection.css';
import './sections/dataSection.css';
import './sections/diagnosticsSection.css';

export type { RuntimePresetId } from '@/components/settings/domain/settingsPresets';
export type { SettingsRollbackPartition } from '@/components/settings/domain/settingsRollback';

export { updateModelStatus } from './domain/settingsModelStatus';

let alpineRetryCount = 0;

function registerSettingsWatchers(panel: SettingsPanelData & AlpineWatchContext): void {
  panel.$watch('llm.provider', (val: string) => panel.loadProviderConfig(val));
  panel.$watch('proxy.type', (val: string) => {
    panel.proxy.customUrl = panel.proxy.savedKeyMap[val] || '';
  });
}

function createSettingsState(): Pick<
  SettingsPanelData,
  | 'isOpen'
  | 'searchQuery'
  | 'searchHitId'
  | 'searchHits'
  | 'appearanceThemeId'
  | 'appearanceColorMode'
  | 'appearanceColorModeRev'
  | 'appearanceAnimationsEnabled'
  | 'appearanceAnimationSpeed'
  | 'appearanceRespectSystemPreference'
  | 'activeRuntimePresetId'
  | '_unsubscribers'
  | '_subscriptionsInitialized'
  | '_settingsBaseline'
  | '_runtimeHealthNormalized'
  | 'healthMessages'
  | 'externalChangeNotice'
  | 'externalChangeConflict'
  | 'llm'
  | 'proxy'
  | 'toolStrategy'
  | 'runtimeStrategy'
  | 'developerDiagnostics'
  | 'localData'
  | 'llmApiPathMenuOpen'
  | 'schedulePreferenceMenuOpen'
  | 'navOpenGroup'
  | 'activeNavTargetId'
  | '_navScrollUnbind'
  | '_navScrollPauseUntil'
> {
  return {
    isOpen: false,

    searchQuery: '',
    searchHitId: '',
    searchHits: [] as SettingsSearchHitView[],
    navOpenGroup: null as string | null,
    activeNavTargetId: null as string | null,
    _navScrollUnbind: null as (() => void) | null,
    _navScrollPauseUntil: 0,

    appearanceThemeId: ThemeManager.getCurrentTheme(),
    appearanceColorMode: ThemeManager.getCurrentColorMode(),
    appearanceColorModeRev: 0,
    appearanceAnimationsEnabled: true,
    appearanceAnimationSpeed: 'normal',
    appearanceRespectSystemPreference: true,
    activeRuntimePresetId: null,

    // EventBus / window 订阅清理
    _unsubscribers: [],
    _subscriptionsInitialized: false,

    _settingsBaseline: null,

    _runtimeHealthNormalized: false,

    healthMessages: [] as string[],

    externalChangeNotice: false,
    externalChangeConflict: false,

    llmApiPathMenuOpen: false,
    schedulePreferenceMenuOpen: false,

    // LLM Config State
    llm: {
      provider: DEFAULT_LLM_PROVIDER_ID,
      endpoint: DEFAULT_NEW_API_ENDPOINT,
      apiKey: '',
      model: '',
      models: [],
      serviceTier: undefined,
      reasoningPrefs: { ...DEFAULT_REASONING_PREFS },
      // OpenAI family default: /responses (runtime falls back to chat/completions).
      apiPath: apiPathIdForFamily('openai'),
      showKey: false,
      isFetching: false,
      isTesting: false,
    },

    // Proxy Config State
    proxy: {
      type: DEFAULT_SCRAPER_PROXY_TYPE,
      customUrl: '',
      showKey: false,
      savedKeyMap: {},
      isTesting: false,
      testError: '',
      testMessage: '',
      status: '',
    },

    toolStrategy: {
      targetModels: createEmptyToolTargetModels(),
      isSaving: false,
    },

    runtimeStrategy: {
      settings: getRuntimeStrategySettings(),
      isSaving: false,
    },

    developerDiagnostics: getDeveloperDiagnosticSettings(),

    localData: {
      usage: null,
      isBusy: false,
      clearingBucketId: null,
      cleanupItemsExpanded: false,
      // Empty selection = full export; advanced UI can opt into partial buckets.
      selectedExportBuckets: [],
    },
  };
}

// Sections are composed via property descriptors so accessor members
// (e.g. currentProviderConfig) stay lazy ? object spread would invoke getters.
const settingsPanelBehavior: SettingsPanelPart = {};
for (const settingsPanelSection of [
  llmSectionBehavior,
  llmSectionRichBehavior,
  toolStrategySectionBehavior,
  networkSectionBehavior,
  dataSectionBehavior,
  appearanceSectionBehavior,
  diagnosticsSectionBehavior,
]) {
  Object.defineProperties(
    settingsPanelBehavior,
    Object.getOwnPropertyDescriptors(settingsPanelSection)
  );
}
const settingsPanelShell: SettingsPanelPart = {
  init() {
    this.loadRuntimeStrategy();
    this.loadAppearanceSettings();
    this.developerDiagnostics = getDeveloperDiagnosticSettings();
    void this.loadProxyConfig();
    this.loadProviderConfig(this.llm.provider);
    void this.refreshLocalDataUsage();

    // Subscriptions + $watch are once-per-instance (Alpine may re-enter init).
    if (this._subscriptionsInitialized) {
      return;
    }

    const unsubOpen = eventBus.on(APP_EVENTS.SETTINGS_OPEN, payload => {
      void this.open(
        normalizeSettingsOpenOptions(payload as SettingsOpenOptions | null | undefined)
      );
    });

    const unsubClose = eventBus.on(APP_EVENTS.SETTINGS_CLOSE, () => {
      void this.close();
    });

    const onStorage = (event: StorageEvent) => {
      this.handleStorageEvent(event);
    };
    window.addEventListener('storage', onStorage);

    // Keep the "跟随系统（当前为…）" hint live when the OS scheme flips.
    const unsubColorMode = eventBus.on('color-mode-changed', () => {
      this.appearanceColorMode = ThemeManager.getCurrentColorMode();
      this.appearanceColorModeRev += 1;
    });

    this._unsubscribers = [
      unsubOpen,
      unsubClose,
      unsubColorMode,
      () => window.removeEventListener('storage', onStorage),
    ];

    registerSettingsWatchers(this as SettingsPanelData & AlpineWatchContext);
    this._subscriptionsInitialized = true;
  },

  async open(options?: SettingsOpenOptions) {
    this.isOpen = true;
    this.searchQuery = '';
    this.searchHitId = '';
    this.searchHits = [];
    const rawRuntime = StorageService.get(STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS);
    this._runtimeHealthNormalized = isRuntimeRawInvalid(rawRuntime);
    this.loadRuntimeStrategy();
    this.loadAppearanceSettings();
    this.developerDiagnostics = getDeveloperDiagnosticSettings();
    await this.loadProviderConfig(this.llm.provider);
    await this.loadProxyConfig();
    this.refreshSettingsHealth();
    void this.refreshLocalDataUsage().then(() => {
      this.refreshSettingsHealth();
    });
    this.captureSettingsBaseline();

    const deepLink = normalizeSettingsOpenOptions(options);
    if (deepLink.sectionId || deepLink.focus) {
      // Defer until panel is painted so section nodes exist for scroll/focus.
      queueMicrotask(() => {
        const focusSectionId =
          deepLink.sectionId ||
          SETTINGS_SEARCH_INDEX.find(entry => entry.id === deepLink.focus)?.sectionId;
        const groupId = focusSectionId ? resolveSettingsNavGroupFromSection(focusSectionId) : null;
        if (groupId) {
          this.navOpenGroup = groupId;
        }

        // Prefer real focus targets for scroll/highlight; invalid focus still falls back to section.
        if (deepLink.focus) {
          const focusEl = expandSettingsFocusTarget(deepLink.focus);
          if (focusEl) {
            this.activeNavTargetId = deepLink.focus;
            this._navScrollPauseUntil = Date.now() + 800;
            requestAnimationFrame(() => {
              this.scrollToElementInPanel(focusEl);
            });
            return;
          }
        }

        if (deepLink.sectionId) {
          this.activeNavTargetId = deepLink.sectionId;
          this._navScrollPauseUntil = Date.now() + 800;
        }
        applySettingsDeepLink(deepLink, {
          scrollToSection: sectionId => this.scrollToSection(sectionId),
        });
      });
    }

    // Side-nav scroll-spy needs the painted panel; bind after open paint.
    queueMicrotask(() => {
      if (this.isOpen) {
        this.bindSettingsNavScrollSpy();
      }
    });
  },

  async close(): Promise<void> {
    if (!this.isOpen) return;
    // Shared confirm/choice modal owns Escape while its backdrop is mounted.
    // Do not match idle app-modals / page dialogs that stay in the DOM.
    if (document.querySelector('.app-confirm-modal-backdrop')) {
      return;
    }
    const dirty = this.dirtyPartitions;
    if (dirty.length > 0) {
      const partitionLabels: Record<SettingsDirtyPartition, string> = {
        llm: 'AI 模型与连接',
        toolStrategy: '工具策略',
        runtime: '运行时策略',
        proxy: '采集代理',
        appearance: '外观与体验',
      };
      const dirtyLabels = dirty.map(p => partitionLabels[p] || p).join('、');
      const ok = await confirmSettingsAction(
        '放弃未保存的更改？',
        `以下分区有未保存修改：${dirtyLabels}。关闭将丢失这些更改。`,
        '放弃更改'
      );
      if (!ok) return;
      // discard: reload authoritative state so baseline matches closed panel
      this.loadRuntimeStrategy();
      this.loadToolStrategyDefaults();
      await this.loadProviderConfig(this.llm.provider);
      await this.loadProxyConfig();
      this.captureSettingsBaseline();
    }
    this.unbindSettingsNavScrollSpy();
    this.activeNavTargetId = null;
    this.isOpen = false;
  },

  destroy() {
    this.unbindSettingsNavScrollSpy();
    this._unsubscribers?.forEach(unsub => unsub());
    this._unsubscribers = [];
    this._subscriptionsInitialized = false;
  },

  scrollToElementInPanel(el: HTMLElement): void {
    // Only scroll the settings content pane — never use scrollIntoView, which can
    // move outer ancestors and push the sticky footer up over the content.
    const scroller = el.closest('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = scroller.scrollTop + (elRect.top - scrollerRect.top) - 8;
    scroller.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth',
    });
  },

  scrollToSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    this.scrollToElementInPanel(section);
  },

  isNavGroupOpen(groupId: string): boolean {
    return this.navOpenGroup === groupId;
  },

  isNavTargetCurrent(targetId: string): boolean {
    return this.activeNavTargetId === targetId;
  },

  unbindSettingsNavScrollSpy(): void {
    this._navScrollUnbind?.();
    this._navScrollUnbind = null;
  },

  updateActiveNavFromScroll(): void {
    if (Date.now() < this._navScrollPauseUntil) {
      return;
    }
    const root =
      document.querySelector('.settings-panel-root') ??
      document.querySelector('[data-testid="settings-panel"]');
    const scroller = root?.querySelector('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }
    const items = measureSettingsNavMarkers(
      scroller,
      scroller.querySelectorAll('[data-settings-nav-id]')
    );
    if (!items.length) {
      return;
    }
    const activeId = pickActiveSettingsNavId(items, scroller.scrollTop, 48);
    this.activeNavTargetId = activeId;
    // Only expand group when we have a real hit — never force tool open from null.
    if (activeId) {
      const groupId = pickActiveSettingsNavGroup(items, activeId);
      if (groupId) {
        this.navOpenGroup = groupId;
      }
    }
  },

  bindSettingsNavScrollSpy(): void {
    this.unbindSettingsNavScrollSpy();
    const root =
      document.querySelector('.settings-panel-root') ??
      document.querySelector('[data-testid="settings-panel"]');
    const scroller = root?.querySelector('.settings-panel-scroll');
    if (!(scroller instanceof HTMLElement)) {
      return;
    }
    const onScroll = () => {
      this.updateActiveNavFromScroll();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    this._navScrollUnbind = () => {
      scroller.removeEventListener('scroll', onScroll);
    };
    requestAnimationFrame(() => {
      this.updateActiveNavFromScroll();
    });
  },

  toggleNavGroup(groupId: string, sectionId: string): void {
    // Scroll-spy may already open this group. Collapse only on re-click of same section.
    if (this.navOpenGroup === groupId && this.activeNavTargetId === sectionId) {
      this.navOpenGroup = null;
      return;
    }
    this.navOpenGroup = groupId;
    this.activeNavTargetId = sectionId;
    this._navScrollPauseUntil = Date.now() + 600;
    this.scrollToSection(sectionId);
  },

  navigateToNavTarget(targetId: string, groupId?: string): void {
    if (groupId) {
      this.navOpenGroup = groupId;
    }
    this.activeNavTargetId = targetId;
    // Pause spy briefly so click highlight is not overwritten mid-smooth-scroll.
    this._navScrollPauseUntil = Date.now() + 800;
    // Open collapsed details first so layout height is correct before scroll.
    const el = expandSettingsFocusTarget(targetId);
    if (!el) {
      this.scrollToSection(targetId);
      return;
    }
    // Defer scroll one frame so expanded details contribute to offset.
    requestAnimationFrame(() => {
      this.scrollToElementInPanel(el);
    });
  },

  onSettingsSearch(event?: Event): void {
    const value = event?.target instanceof HTMLInputElement ? event.target.value : this.searchQuery;
    this.searchQuery = value;
    const matches = findSettingsSearchMatches(value, SETTINGS_SEARCH_INDEX, 6);
    this.searchHits = toSettingsSearchHitViews(matches);
    const match = matches[0] ?? null;
    this.searchHitId = match?.id ?? '';
    if (!match) {
      return;
    }
    queueMicrotask(() => {
      this.scrollToSearchHit(match.id, match.sectionId);
    });
  },

  selectSettingsSearchHit(hitId: string, sectionId?: string): void {
    if (!hitId) return;
    this.searchHitId = hitId;
    this.scrollToSearchHit(hitId, sectionId);
  },

  scrollToSearchHit(hitId: string, sectionId?: string): void {
    const indexEntry =
      SETTINGS_SEARCH_INDEX.find(entry => entry.id === hitId) ||
      findFirstSettingsSearchMatch(this.searchQuery);
    const resolvedSectionId = sectionId || indexEntry?.sectionId || '';
    const groupId = resolvedSectionId
      ? resolveSettingsNavGroupFromSection(resolvedSectionId)
      : null;

    if (groupId) {
      this.navOpenGroup = groupId;
    }
    this.activeNavTargetId = hitId;
    this._navScrollPauseUntil = Date.now() + 800;

    const el = expandSettingsFocusTarget(hitId);
    if (!el) {
      if (resolvedSectionId) {
        this.scrollToSection(resolvedSectionId);
      }
      return;
    }

    requestAnimationFrame(() => {
      this.scrollToElementInPanel(el);
    });
  },

  // 打开性能监控面板
  async openPerformanceMonitor(): Promise<void> {
    try {
      const { performanceMonitor } = await import('@/common/devtools/PerformanceMonitor');

      // 确保面板已初始化
      if (!performanceMonitor.isInitialized()) {
        performanceMonitor.initialize();
      }

      performanceMonitor.show();
      showToast(
        '监控面板已打开（右上角），快捷键 Ctrl+Shift+P 切换显示。注意：仅在开发模式下可用',
        { type: 'success', duration: 5000 }
      );
    } catch (error) {
      ErrorService.handle(error as Error, {
        action: 'openPerformanceMonitor',
        module: 'settings',
        notify: false,
      });
      showToast('打开监控面板失败', { type: 'error' });
    }
  },

  // --- LLM Logic ---
};

Object.defineProperties(
  settingsPanelBehavior,
  Object.getOwnPropertyDescriptors(settingsPanelShell)
);

function attachSettingsBehavior(panel: SettingsPanelData): SettingsPanelData {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(settingsPanelBehavior));
  return panel;
}

const SettingsPanel = (): SettingsPanelData =>
  attachSettingsBehavior(createSettingsState() as SettingsPanelData);

// ==========================================
// Initialization & Exports
// ==========================================

/**
 * 初始化 Alpine.js 设置组件
 * 包含防御性检查和重试机制,确保在生产环境中正确注册
 */
export function initAlpineSettings(): void {
  // 防御性检查: 确保 Alpine.js 已加载
  if (typeof window.Alpine === 'undefined') {
    // 延迟重试,最多重试 10 次
    if (alpineRetryCount < 10) {
      alpineRetryCount += 1;
      setTimeout(initAlpineSettings, 100);
    }
    return;
  }

  // 确保 Alpine.data 方法可用
  if (typeof window.Alpine.data !== 'function') {
    return;
  }

  try {
    // 注册 settingsPanel 组件
    window.Alpine.data('settingsPanel', SettingsPanel);

    // TD-SET-01 Phase 2: inline section fragments before Alpine evaluates x-data.
    const panelRoot = document.querySelector<HTMLElement>('[data-testid="settings-panel"]');
    if (panelRoot) {
      const assembled = assembleSettingsTemplate(settingsShellHtml);
      if (!assembled.includes('<!--settings-slot:')) {
        // Trusted local template: safe-fragment parse + replaceWith (outerHTML is lint-restricted).
        panelRoot.replaceWith(createSafeFragment(assembled));
      }
    }
    // 清理重试计数器
    alpineRetryCount = 0;
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'initAlpineSettings',
      module: 'settings',
      notify: false,
    });
  }
}

// Legacy Bridge for ActionRegistry
export function openSettings(options?: SettingsOpenOptions): void {
  const deepLink = normalizeSettingsOpenOptions(options);
  eventBus.emit(APP_EVENTS.SETTINGS_OPEN, {
    ...deepLink,
    timestamp: Date.now(),
  });
}

export function closeSettings(): void {
  eventBus.emit(APP_EVENTS.SETTINGS_CLOSE, {
    saved: false,
    timestamp: Date.now(),
  });
}

/**
 * 打开性能监控面板
 */
export async function openPerformanceMonitor(): Promise<void> {
  try {
    const { performanceMonitor } = await import('@/common/devtools/PerformanceMonitor');
    performanceMonitor.show();
    showToast('监控面板已打开', { type: 'success' });
  } catch (error) {
    ErrorService.handle(error as Error, {
      action: 'openPerformanceMonitor',
      module: 'settings',
      notify: false,
    });
    showToast('打开监控面板失败', { type: 'error' });
  }
}
