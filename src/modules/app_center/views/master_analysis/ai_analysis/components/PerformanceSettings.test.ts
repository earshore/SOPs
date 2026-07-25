import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService, STORAGE_KEYS } from '@/services/storageService';
import {
  createPerformanceSettingsPanel,
  getPerformanceSettings,
  resolveAnalysisSchedule,
  savePerformanceSettings,
} from './PerformanceSettings';
import { formatSchedulePreferenceHint } from '../services/analysisScheduler';

const openSettingsMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    RUNTIME_STRATEGY_SETTINGS: 'runtime_strategy_settings',
  },
  StorageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../services/parallelAnalysisService', () => ({
  getCacheStatsAsync: vi.fn(() => Promise.resolve({ count: 2, totalSize: 2048 })),
  clearAnalysisCacheAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/common/ui/index', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/components/settings/systemSettings', () => ({
  openSettings: openSettingsMock,
}));

describe('PerformanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads scheduling preference from runtime strategy', () => {
    vi.mocked(StorageService.get).mockReturnValue({
      version: 2,
      masterAnalysis: {
        schedulingPreference: 'reliability',
        enableCache: true,
      },
    });
    expect(getPerformanceSettings()).toMatchObject({
      schedulingPreference: 'reliability',
      enableCache: true,
    });
  });

  it('resolveAnalysisSchedule maps preference tiers', () => {
    expect(resolveAnalysisSchedule({ schedulingPreference: 'recommended' })).toMatchObject({
      tier: 'recommended',
      maxConcurrency: 4,
      failureStrategy: 'continue',
    });
    expect(resolveAnalysisSchedule({ schedulingPreference: 'reliability' })).toMatchObject({
      tier: 'stable',
      maxConcurrency: 2,
      failureStrategy: 'abort',
    });
    expect(resolveAnalysisSchedule({ schedulingPreference: 'speed' }, 3)).toMatchObject({
      tier: 'extreme',
      maxConcurrency: 3,
      failureStrategy: 'continue',
    });
  });

  it('formatSchedulePreferenceHint matches page summary style', () => {
    expect(formatSchedulePreferenceHint('recommended', true)).toBe('并发4 · 缓存开 · 失败继续');
    expect(formatSchedulePreferenceHint('reliability', false)).toBe('并发2 · 缓存关 · 失败中止');
    expect(formatSchedulePreferenceHint('speed', true)).toBe('并发8 · 缓存开 · 失败继续');
  });

  it('clearCache refreshes cache stats', async () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();
    await panel.updateCacheStats();
    expect(panel.cacheStats).toEqual({ count: 2, totalSize: 2048 });
    await panel.clearCache();
    expect(panel.cacheStats).toEqual({ count: 2, totalSize: 2048 });
  });

  it('deep-links to system settings without density flag', () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();
    panel.openSystemSettings();
    expect(openSettingsMock).toHaveBeenCalledWith({
      sectionId: 'settings-section-tool-strategy',
      focus: 'master-analysis',
    });
  });

  it('UT-P1-03 savePerformanceSettings still writes runtime (non-UI API)', () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    savePerformanceSettings({
      schedulingPreference: 'speed',
      enableCache: true,
      maxConcurrency: 8,
      failureStrategy: 'continue',
      settingsVersion: 3,
    });
    expect(StorageService.set).toHaveBeenCalledWith(
      STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS,
      expect.objectContaining({
        version: 2,
        masterAnalysis: expect.objectContaining({
          schedulingPreference: 'speed',
          enableCache: true,
        }),
      })
    );
  });

  it('template exposes minimal clear-cache control and drops analysis-settings entry', () => {
    const template = readFileSync(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      'utf8'
    );
    expect(template).toContain('data-testid="ma-clear-analysis-cache"');
    expect(template).toContain('perfSettings.clearCache()');
    expect(template).toContain('清除缓存');
    expect(template).not.toContain('分析设置');
    expect(template).not.toContain('perfSettings.toggleSettings()');
    expect(template).not.toContain('在系统设置中配置');
    expect(template).not.toContain('perfSettings.saveSettings()');
  });
});
