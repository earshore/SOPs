/**
 * 性能设置组件
 * 允许用户调整并行分析的性能参数
 */

import { StorageService } from '../../../../../../services/storageService';
import { getCacheStatsAsync, clearAnalysisCacheAsync } from '../services/parallelAnalysisService';
import { showToast } from '@common/ui/index';
import { Logger } from '../../../../../../services/loggerService';

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

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: PerformanceSettings = {
  maxConcurrency: 8,
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
  } catch (error) {
    Logger.warn('[性能设置] 读取失败，使用默认值:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存性能设置
 */
export function savePerformanceSettings(settings: PerformanceSettings): void {
  try {
    StorageService.set(SETTINGS_KEY, normalizeSettings(settings));
    Logger.debug('[性能设置] 已保存:', settings);
  } catch (error) {
    Logger.error('[性能设置] 保存失败:', error);
    throw error;
  }
}

/**
 * 创建性能设置面板
 */
export function createPerformanceSettingsPanel() {
  return {
    // 状态
    showSettings: false,
    settings: getPerformanceSettings(),
    cacheStats: { count: 0, totalSize: 0 },

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

    // 获取并发数建议
    getConcurrencyHint(): string {
      const n = this.settings.maxConcurrency;
      if (n === 1) return '串行执行，最慢但最稳定';
      if (n === 2) return '2倍加速，适合网络不稳定时';
      if (n <= 4) return '推荐设置，平衡速度与稳定性';
      if (n <= 6) return '高速模式，需要良好的网络';
      return '极速模式，可能触发API限流';
    }
  };
}
