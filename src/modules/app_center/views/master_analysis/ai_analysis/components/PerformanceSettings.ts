/**
 * 性能设置组件
 * 允许用户调整并行分析的性能参数
 */

import { StorageService } from '../../../../../../services/storageService';
import { getCacheStatsAsync, clearAnalysisCacheAsync } from '../services/parallelAnalysisService';
import {
  isSchedulingPreference,
  resolveAnalysisSchedule,
  type AnalysisSchedulePlan,
  type FailureStrategy,
  type SchedulingPreference,
  type ScheduleTier
} from '../services/analysisScheduler';
import { showToast } from '@common/ui/index';
const SETTINGS_KEY = 'ai_analysis_performance_settings';
const SETTINGS_VERSION = 3;

export type { AnalysisSchedulePlan, FailureStrategy, SchedulingPreference, ScheduleTier };
export { resolveAnalysisSchedule };

const SCHEDULE_OPTION_ACTIVE_CLASS: Record<SchedulingPreference, string> = {
  recommended: 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm',
  reliability: 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm',
  speed: 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm'
};

const INACTIVE_SCHEDULE_OPTION_CLASS = 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40';
const INACTIVE_SCHEDULE_TIER_CLASS = 'border-slate-200 bg-white text-slate-500';
const SCHEDULE_TIER_CONFIG: Record<ScheduleTier, { label: string; activeClass: string }> = {
  stable: { label: '稳定', activeClass: 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm' },
  recommended: { label: '推荐', activeClass: 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm' },
  extreme: { label: '极速', activeClass: 'border-purple-200 bg-purple-50 text-purple-700 shadow-sm' }
};

/**
 * 性能设置接口
 */
export interface PerformanceSettings {
  schedulingPreference: SchedulingPreference; // 用户调度偏好
  enableCache: boolean; // 是否启用缓存
  maxConcurrency: number; // 由调度算法派生的最大并发数
  failureStrategy: FailureStrategy; // 由调度算法派生的失败处理策略
  settingsVersion?: number;
}

interface PerformanceSettingsPanelContext {
  showSettings: boolean;
  settings: PerformanceSettings;
  cacheStats: { count: number; totalSize: number };
  updateCacheStats(): Promise<void>;
}

type PanelMixin<T extends object> = T & ThisType<PerformanceSettingsPanelContext>;
type PerformanceSettingsPanel =
  PerformanceSettingsPanelContext &
  ReturnType<typeof createPerformanceSettingsActions> &
  ReturnType<typeof createScheduleGetters>;

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: PerformanceSettings = {
  schedulingPreference: 'recommended',
  maxConcurrency: 4,
  enableCache: true,
  failureStrategy: 'continue',
  settingsVersion: SETTINGS_VERSION
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

  return {
    ...settings,
    schedulingPreference,
    enableCache: settings.enableCache ?? DEFAULT_SETTINGS.enableCache,
    maxConcurrency: schedule.maxConcurrency,
    failureStrategy: schedule.failureStrategy,
    settingsVersion: SETTINGS_VERSION
  };
}

/**
 * 获取性能设置
 */
export function getPerformanceSettings(): PerformanceSettings {
  try {
    const saved = StorageService.get(SETTINGS_KEY);
    if (saved && typeof saved === 'object') {
      const savedSettings = saved as Partial<PerformanceSettings>;
      return normalizeSettings(savedSettings);
    }
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存性能设置
 */
export function savePerformanceSettings(settings: PerformanceSettings): void {
  try {
    StorageService.set(SETTINGS_KEY, normalizeSettings(settings));
  } catch (error) {
    console.error('[性能设置] 保存失败:', error);
    throw error;
  }
}

function createPerformanceSettingsActions(): PanelMixin<{
  init(): void;
  updateCacheStats(): Promise<void>;
  toggleSettings(): void;
  saveSettings(): void;
  resetSettings(): void;
  setSchedulingPreference(event: Event): void;
  setEnableCache(event: Event): void;
  clearCache(): Promise<void>;
  formatSize(bytes: number): string;
}> {
  return {
    // 初始化
    init() {
      this.updateCacheStats();
    },

    // 更新缓存统计
    async updateCacheStats() {
      this.cacheStats = await getCacheStatsAsync();
    },

    // 切换设置面板
    toggleSettings() {
      this.showSettings = !this.showSettings;
      if (this.showSettings) {
        void this.updateCacheStats();
      }
    },

    // 保存设置
    saveSettings() {
      try {
        savePerformanceSettings(normalizeSettings(this.settings));
        this.showSettings = false;

        // 显示成功提示
        showToast('分析设置已保存', { type: 'success' });
      } catch (error) {
        showToast('保存失败: ' + (error as Error).message, { type: 'error' });
      }
    },

    // 重置为默认值
    resetSettings() {
      this.settings = { ...DEFAULT_SETTINGS };
    },

    setSchedulingPreference(event: Event) {
      const target = event.target as HTMLInputElement;
      const schedulingPreference = isSchedulingPreference(target.value)
        ? target.value
        : DEFAULT_SETTINGS.schedulingPreference;

      this.settings = normalizeSettings({
        ...this.settings,
        schedulingPreference
      });
    },

    setEnableCache(event: Event) {
      const target = event.target as HTMLInputElement;
      this.settings = {
        ...this.settings,
        enableCache: target.checked
      };
    },

    // 清除缓存
    async clearCache() {
      try {
        await clearAnalysisCacheAsync();
        await this.updateCacheStats();

        showToast('缓存已清除', { type: 'success' });
      } catch (error) {
        showToast('清除失败: ' + (error as Error).message, { type: 'error' });
      }
    },

    // 格式化文件大小
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
 * 创建性能设置面板
 */
export function createPerformanceSettingsPanel(): PerformanceSettingsPanel {
  const panel = {
    // 状态
    showSettings: false,
    settings: getPerformanceSettings(),
    cacheStats: { count: 0, totalSize: 0 },
  } as PerformanceSettingsPanel;

  applyPanelMixin(panel, createPerformanceSettingsActions());
  applyPanelMixin(panel, createScheduleGetters());

  return panel;
}
