/**
 * 性能设置组件
 * 模块内只读摘要 + 深链打开系统设置；策略写入唯一入口为系统设置。
 */

import { showToast } from '@/common/ui/index';
import { openSettings } from '@/components/settings/systemSettings';
import {
  getRuntimeMasterAnalysisOptions,
  getRuntimeStrategySettings,
  MASTER_ANALYSIS_SCHEDULING_BY_EVIDENCE_DEPTH,
  saveRuntimeStrategySettings,
} from '@/services/runtimeStrategyService';

import {
  isSchedulingPreference,
  resolveAnalysisSchedule,
  type AnalysisSchedulePlan,
  type FailureStrategy,
  type SchedulingPreference,
  type ScheduleTier,
} from '../services/analysisScheduler';
import { getCacheStatsAsync, clearAnalysisCacheAsync } from '../services/parallelAnalysisService';
import { clearAnalysisSession } from '../utils/analysisSession';

const SETTINGS_VERSION = 3;

export type { AnalysisSchedulePlan, FailureStrategy, SchedulingPreference, ScheduleTier };
export { resolveAnalysisSchedule };

const SCHEDULE_OPTION_ACTIVE_CLASS: Record<SchedulingPreference, string> = {
  recommended:
    'border-[var(--module-accent)] bg-[var(--wash-indigo)] text-[var(--module-accent-text)] shadow-sm',
  reliability:
    'border-[var(--module-accent)] bg-[#eff6ff] text-[var(--module-accent-text)] shadow-sm',
  speed: 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm',
};

const INACTIVE_SCHEDULE_OPTION_CLASS =
  'border-slate-200 bg-white text-slate-600 hover:border-accent-100 hover:bg-accent-100/40';
const INACTIVE_SCHEDULE_TIER_CLASS = 'border-slate-200 bg-white text-slate-500';
const SCHEDULE_TIER_CONFIG: Record<ScheduleTier, { label: string; activeClass: string }> = {
  stable: {
    label: '稳定',
    activeClass:
      'border-[var(--module-accent-border)] bg-[#eff6ff] text-[var(--module-accent-text)] shadow-sm',
  },
  recommended: {
    label: '推荐',
    activeClass:
      'border-[var(--module-accent-border)] bg-[var(--wash-indigo)] text-[var(--module-accent-text)] shadow-sm',
  },
  extreme: {
    label: '极速',
    activeClass: 'border-purple-200 bg-purple-50 text-purple-700 shadow-sm',
  },
};

/**
 * 性能设置接口（只读消费；写入走系统设置 Runtime）
 */
export interface PerformanceSettings {
  schedulingPreference: SchedulingPreference;
  /** From runtime strategy: fast | balanced | deep */
  evidenceDepth: 'fast' | 'balanced' | 'deep';
  enableCache: boolean;
  maxConcurrency: number;
  failureStrategy: FailureStrategy;
  settingsVersion?: number;
}

interface PerformanceSettingsPanelContext {
  showSettings: boolean;
  settings: PerformanceSettings;
  cacheStats: { count: number; totalSize: number };
  updateCacheStats(): Promise<void>;
  refreshSettingsFromRuntime(): void;
}

type PanelMixin<T extends object> = T & ThisType<PerformanceSettingsPanelContext>;
type PerformanceSettingsPanel = PerformanceSettingsPanelContext &
  ReturnType<typeof createPerformanceSettingsActions> &
  ReturnType<typeof createScheduleGetters>;

const DEFAULT_SETTINGS: PerformanceSettings = {
  schedulingPreference: 'recommended',
  evidenceDepth: 'balanced',
  maxConcurrency: 4,
  enableCache: true,
  failureStrategy: 'continue',
  settingsVersion: SETTINGS_VERSION,
};

function inferSchedulingPreference(settings: Partial<PerformanceSettings>): SchedulingPreference {
  if (isSchedulingPreference(settings.schedulingPreference)) {
    return settings.schedulingPreference;
  }

  if (settings.failureStrategy === 'abort') {
    return 'reliability';
  }

  const legacyConcurrency = Number(settings.maxConcurrency);
  if (Number.isFinite(legacyConcurrency) && legacyConcurrency <= 2) {
    return 'reliability';
  }
  if (Number.isFinite(legacyConcurrency) && legacyConcurrency >= 7) {
    return 'speed';
  }

  return DEFAULT_SETTINGS.schedulingPreference;
}

function normalizeSettings(settings: Partial<PerformanceSettings>): PerformanceSettings {
  const schedulingPreference = inferSchedulingPreference(settings);
  const schedule = resolveAnalysisSchedule({ schedulingPreference });

  const depth = settings.evidenceDepth;
  const evidenceDepth =
    depth === 'fast' || depth === 'balanced' || depth === 'deep'
      ? depth
      : DEFAULT_SETTINGS.evidenceDepth;

  return {
    ...settings,
    schedulingPreference,
    evidenceDepth,
    enableCache: settings.enableCache ?? DEFAULT_SETTINGS.enableCache,
    maxConcurrency: schedule.maxConcurrency,
    failureStrategy: schedule.failureStrategy,
    settingsVersion: SETTINGS_VERSION,
  };
}

/** 只读：从 Runtime 读取当前策略 */
export function getPerformanceSettings(): PerformanceSettings {
  try {
    return normalizeSettings(getRuntimeMasterAnalysisOptions());
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 写入 Runtime（供系统设置 / 测试使用）。
 * 模块 UI 不再调用此函数保存策略。
 */
export function savePerformanceSettings(settings: PerformanceSettings): void {
  try {
    const normalized = normalizeSettings(settings);
    const runtimeSettings = getRuntimeStrategySettings();
    saveRuntimeStrategySettings({
      ...runtimeSettings,
      masterAnalysis: {
        ...runtimeSettings.masterAnalysis,
        schedulingPreference: normalized.schedulingPreference,
        evidenceDepth: normalized.evidenceDepth,
        enableCache: normalized.enableCache,
      },
    });
  } catch (error) {
    console.error('[性能设置] 保存失败:', error);
    throw error;
  }
}

function createPerformanceSettingsActions(): PanelMixin<{
  init(): void;
  updateCacheStats(): Promise<void>;
  toggleSettings(): void;
  openSystemSettings(): void;
  refreshSettingsFromRuntime(): void;
  setEvidenceDepth(depth: PerformanceSettings['evidenceDepth']): void;
  clearCache(): Promise<void>;
  formatSize(bytes: number): string;
}> {
  return {
    init() {
      this.updateCacheStats();
    },

    async updateCacheStats() {
      this.cacheStats = await getCacheStatsAsync();
    },

    /** Show read-only summary panel (no strategy editors). */
    toggleSettings() {
      this.showSettings = !this.showSettings;
      if (this.showSettings) {
        this.refreshSettingsFromRuntime();
        void this.updateCacheStats();
      }
    },

    refreshSettingsFromRuntime() {
      this.settings = getPerformanceSettings();
    },

    /** In-page quality/speed control without leaving the analysis workbench. */
    setEvidenceDepth(depth: PerformanceSettings['evidenceDepth']) {
      if (depth !== 'fast' && depth !== 'balanced' && depth !== 'deep') return;
      if (this.settings.evidenceDepth === depth) return;
      try {
        savePerformanceSettings({
          ...this.settings,
          evidenceDepth: depth,
          schedulingPreference: MASTER_ANALYSIS_SCHEDULING_BY_EVIDENCE_DEPTH[depth],
        });
        this.refreshSettingsFromRuntime();
        const label = depth === 'fast' ? '快速' : depth === 'deep' ? '深入' : '均衡';
        showToast(`证据深度已切换为「${label}」`, { type: 'success' });
      } catch (error) {
        showToast('切换失败: ' + (error as Error).message, { type: 'error' });
      }
    },

    /** Deep-link into system settings tool strategy → Master Analysis. */
    openSystemSettings() {
      this.showSettings = false;
      openSettings({
        sectionId: 'settings-section-tool-strategy',
        focus: 'master-analysis-ai',
      });
    },

    async clearCache() {
      try {
        await clearAnalysisCacheAsync();
        // 缓存与断点会话同源：清缓存后断点中的已命中结果已失效，一并清除避免下次误恢复
        clearAnalysisSession();
        await this.updateCacheStats();
        showToast('缓存已清除', { type: 'success' });
      } catch (error) {
        showToast('清除失败: ' + (error as Error).message, { type: 'error' });
      }
    },

    formatSize(bytes: number): string {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },
  };
}

function createScheduleGetters(): PanelMixin<{
  readonly schedulePreferenceLabel: string;
  readonly scheduleTierLabel: string;
  readonly scheduleTierBadgeClass: string;
  readonly scheduleGoalText: string;
  readonly scheduleDetailText: string;
  readonly scheduleFailureHandlingText: string;
  readonly scheduleIconClass: string;
  readonly scheduleRuntimeText: string;
  readonly speedLevelText: string;
  readonly reliabilityLevelText: string;
  getSchedulePreferenceClass(preference: SchedulingPreference): string;
  getScheduleTierClass(tier: ScheduleTier): string;
}> {
  return {
    get schedulePreferenceLabel(): string {
      return resolveAnalysisSchedule(this.settings).label;
    },

    get scheduleTierLabel(): string {
      return SCHEDULE_TIER_CONFIG[resolveAnalysisSchedule(this.settings).tier].label;
    },

    get scheduleTierBadgeClass(): string {
      return SCHEDULE_TIER_CONFIG[resolveAnalysisSchedule(this.settings).tier].activeClass;
    },

    get scheduleGoalText(): string {
      return resolveAnalysisSchedule(this.settings).goalText;
    },

    get scheduleDetailText(): string {
      return resolveAnalysisSchedule(this.settings).detailText;
    },

    get scheduleFailureHandlingText(): string {
      return resolveAnalysisSchedule(this.settings).failureHandlingText;
    },

    get scheduleIconClass(): string {
      return resolveAnalysisSchedule(this.settings).iconClass;
    },

    get scheduleRuntimeText(): string {
      const preference = this.settings.schedulingPreference;
      if (preference === 'reliability') return '稳态调度';
      if (preference === 'speed') return '动态提速';
      return '自动调度';
    },

    get speedLevelText(): string {
      return resolveAnalysisSchedule(this.settings).speedLevelText;
    },

    get reliabilityLevelText(): string {
      return resolveAnalysisSchedule(this.settings).reliabilityLevelText;
    },

    getSchedulePreferenceClass(preference: SchedulingPreference): string {
      return this.settings.schedulingPreference === preference
        ? SCHEDULE_OPTION_ACTIVE_CLASS[preference]
        : INACTIVE_SCHEDULE_OPTION_CLASS;
    },

    getScheduleTierClass(tier: ScheduleTier): string {
      return resolveAnalysisSchedule(this.settings).tier === tier
        ? SCHEDULE_TIER_CONFIG[tier].activeClass
        : INACTIVE_SCHEDULE_TIER_CLASS;
    },
  };
}

function applyPanelMixin(panel: object, mixin: object): void {
  Object.defineProperties(panel, Object.getOwnPropertyDescriptors(mixin));
}

/**
 * 创建性能设置面板（摘要 + 深链）
 */
export function createPerformanceSettingsPanel(): PerformanceSettingsPanel {
  const panel = {
    showSettings: false,
    settings: getPerformanceSettings(),
    cacheStats: { count: 0, totalSize: 0 },
  } as PerformanceSettingsPanel;

  applyPanelMixin(panel, createPerformanceSettingsActions());
  applyPanelMixin(panel, createScheduleGetters());

  return panel;
}
