/**
 * 性能设置组件
 * 允许用户调整并行分析的性能参数
 */

import { StorageService } from '../../../../../../services/storageService';
import { getCacheStatsAsync, clearAnalysisCacheAsync } from '../services/parallelAnalysisService';
import { showToast } from '@common/ui/index';
const SETTINGS_KEY = 'ai_analysis_performance_settings';
const SETTINGS_VERSION = 2;

/**
 * 性能设置接口
 */
export interface PerformanceSettings {
  maxConcurrency: number; // 最大并发数 (1-8)
  enableCache: boolean; // 是否启用缓存
  failureStrategy: 'abort' | 'continue'; // 失败策略
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
  ReturnType<typeof createConcurrencyLabelGetters> &
  ReturnType<typeof createConcurrencyClassGetters> &
  ReturnType<typeof createStrategyGetters>;

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: PerformanceSettings = {
  maxConcurrency: 4,
  enableCache: true,
  failureStrategy: 'continue',
  settingsVersion: SETTINGS_VERSION
};

function normalizeSettings(settings: PerformanceSettings): PerformanceSettings {
  const maxConcurrency = Number.isFinite(settings.maxConcurrency)
    ? Math.max(1, Math.min(8, Math.floor(settings.maxConcurrency)))
    : DEFAULT_SETTINGS.maxConcurrency;

  return {
    ...settings,
    maxConcurrency,
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
      const mergedSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
      if (!savedSettings.settingsVersion && savedSettings.maxConcurrency === 4) {
        mergedSettings.maxConcurrency = DEFAULT_SETTINGS.maxConcurrency;
      }
      return normalizeSettings(mergedSettings);
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
  setMaxConcurrency(event: Event): void;
  setEnableCache(event: Event): void;
  setFailureStrategy(event: Event): void;
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
        // 验证并发数范围
        if (this.settings.maxConcurrency < 1) {
          this.settings.maxConcurrency = 1;
        } else if (this.settings.maxConcurrency > 8) {
          this.settings.maxConcurrency = 8;
        }

        savePerformanceSettings(this.settings);
        this.showSettings = false;

        // 显示成功提示
        showToast('性能设置已保存', { type: 'success' });
      } catch (error) {
        showToast('保存失败: ' + (error as Error).message, { type: 'error' });
      }
    },

    // 重置为默认值
    resetSettings() {
      this.settings = { ...DEFAULT_SETTINGS };
    },

    setMaxConcurrency(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = Number(target.value);
      this.settings = normalizeSettings({
        ...this.settings,
        maxConcurrency: Number.isFinite(value) ? value : this.settings.maxConcurrency
      });
      void this.updateCacheStats();
    },

    setEnableCache(event: Event) {
      const target = event.target as HTMLInputElement;
      this.settings = {
        ...this.settings,
        enableCache: target.checked
      };
    },

    setFailureStrategy(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = target.value === 'abort' ? 'abort' : 'continue';
      this.settings = {
        ...this.settings,
        failureStrategy: value
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

function createConcurrencyLabelGetters(): PanelMixin<{
  readonly concurrencyTrackStyle: string;
  readonly slowLabelClass: string;
  readonly standardLabelClass: string;
  readonly fastLabelClass: string;
  readonly extremeLabelClass: string;
  readonly expectedSpeedText: string;
  readonly expectedDurationText: string;
}> {
  return {
    get concurrencyTrackStyle(): string {
      return `width: calc(${((this.settings.maxConcurrency - 1) / 7) * 100}%)`;
    },

    get slowLabelClass(): string {
      return this.settings.maxConcurrency <= 2 ? 'text-blue-600' : 'text-slate-400';
    },

    get standardLabelClass(): string {
      return this.settings.maxConcurrency >= 3 && this.settings.maxConcurrency <= 4 ? 'text-indigo-600' : 'text-slate-400';
    },

    get fastLabelClass(): string {
      return this.settings.maxConcurrency >= 5 && this.settings.maxConcurrency <= 6 ? 'text-purple-600' : 'text-slate-400';
    },

    get extremeLabelClass(): string {
      return this.settings.maxConcurrency >= 7 ? 'text-purple-700' : 'text-slate-400';
    },

    get expectedSpeedText(): string {
      return `${this.settings.maxConcurrency}x`;
    },

    get expectedDurationText(): string {
      return `${Math.round(120 / this.settings.maxConcurrency)}秒`;
    },
  };
}

function createConcurrencyClassGetters(): PanelMixin<{
  readonly concurrencyValueWrapClass: string;
  readonly concurrencyIconClass: string;
  readonly concurrencyTextClass: string;
  readonly concurrencyHintCardClass: string;
  readonly concurrencyHintTextClass: string;
}> {
  return {
    get concurrencyValueWrapClass(): string {
      const n = this.settings.maxConcurrency;
      if (n <= 2) return 'bg-blue-50 border-2 border-blue-200';
      if (n <= 4) return 'bg-indigo-50 border-2 border-indigo-200';
      if (n <= 6) return 'bg-purple-50 border-2 border-purple-200';
      return 'bg-purple-100 border-2 border-purple-300';
    },

    get concurrencyIconClass(): string {
      const n = this.settings.maxConcurrency;
      if (n <= 2) return 'fa-solid fa-hourglass-start text-blue-600';
      if (n <= 4) return 'fa-solid fa-gauge text-indigo-600';
      if (n <= 6) return 'fa-solid fa-bolt text-purple-600';
      return 'fa-solid fa-rocket text-purple-700';
    },

    get concurrencyTextClass(): string {
      const n = this.settings.maxConcurrency;
      if (n <= 2) return 'text-blue-600';
      if (n <= 4) return 'text-indigo-600';
      if (n <= 6) return 'text-purple-600';
      return 'text-purple-700';
    },

    get concurrencyHintCardClass(): string {
      const n = this.settings.maxConcurrency;
      if (n <= 2) return 'bg-blue-50 border-blue-200';
      if (n <= 4) return 'bg-indigo-50 border-indigo-200';
      if (n <= 6) return 'bg-purple-50 border-purple-200';
      return 'bg-purple-100 border-purple-300';
    },

    get concurrencyHintTextClass(): string {
      const n = this.settings.maxConcurrency;
      if (n <= 2) return 'text-blue-800';
      if (n <= 4) return 'text-indigo-800';
      if (n <= 6) return 'text-purple-800';
      return 'text-purple-900';
    },
  };
}

function createStrategyGetters(): PanelMixin<{
  readonly continueStrategyClass: string;
  readonly abortStrategyClass: string;
  getConcurrencyDotClass(index: number): string;
  getSpeedBarClass(index: number): string;
  getStabilityBarClass(index: number): string;
  getConcurrencyHint(): string;
}> {
  return {
    get continueStrategyClass(): string {
      return this.settings.failureStrategy === 'continue' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300';
    },

    get abortStrategyClass(): string {
      return this.settings.failureStrategy === 'abort' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300';
    },

    getConcurrencyDotClass(index: number): string {
      return index <= this.settings.maxConcurrency ? 'bg-white shadow-lg scale-110' : 'bg-slate-300';
    },

    getSpeedBarClass(index: number): string {
      return index <= this.settings.maxConcurrency ? 'bg-current opacity-100' : 'bg-current opacity-20';
    },

    getStabilityBarClass(index: number): string {
      return index <= (9 - this.settings.maxConcurrency) ? 'bg-current opacity-100' : 'bg-current opacity-20';
    },

    // 获取并发数建议
    getConcurrencyHint(): string {
      const n = this.settings.maxConcurrency;
      if (n === 1) return '串行执行，最慢但最稳定';
      if (n === 2) return '2倍加速，适合网络不稳定时';
      if (n <= 4) return '推荐设置，平衡速度与稳定性';
      if (n <= 6) return '高速模式，需要良好的网络';
      return '极速模式，可能触发API限流';
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
  applyPanelMixin(panel, createConcurrencyLabelGetters());
  applyPanelMixin(panel, createConcurrencyClassGetters());
  applyPanelMixin(panel, createStrategyGetters());

  return panel;
}
