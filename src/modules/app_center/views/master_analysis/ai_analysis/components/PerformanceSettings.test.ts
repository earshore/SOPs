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
      maxConcurrency: 6,
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
    expect(formatSchedulePreferenceHint('recommended', true)).toBe('并发6 · 缓存开 · 失败继续');
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
      focus: 'master-analysis-ai',
    });
  });

  it('UT-P1-03 savePerformanceSettings still writes runtime (non-UI API)', () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    savePerformanceSettings({
      schedulingPreference: 'speed',
      evidenceDepth: 'fast',
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
          evidenceDepth: 'fast',
          enableCache: true,
        }),
      })
    );
  });

  it('evidence depth selection writes only runtime strategy, never global LLM settings', () => {
    vi.mocked(StorageService.get).mockReturnValue(null);
    const panel = createPerformanceSettingsPanel();
    panel.setEvidenceDepth('fast');
    // 证据深度选择仅写 runtime 策略（masterAnalysis 专属），不得写入全局 LLM 配置
    expect(vi.mocked(StorageService.set)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(StorageService.set).mock.calls[0]?.[0]).toBe(
      STORAGE_KEYS.RUNTIME_STRATEGY_SETTINGS
    );
  });

  it('template exposes minimal clear-cache control and simple evidence-depth select', () => {
    const template = readFileSync(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
      'utf8'
    );
    expect(template).toContain('data-testid="ma-clear-analysis-cache"');
    expect(template).toContain('data-testid="ma-evidence-depth"');
    expect(template).toContain('data-testid="ma-primary-split"');
    expect(template).toContain('selectEvidenceDepth(');
    expect(template).toContain('ai-analysis-depth-control__select');
    expect(template).toContain('x-for="depthOption in evidenceDepthOptions"');
    expect(template).toContain(':value="depthOption.value"');
    expect(template).toContain('depthOption.label');
    expect(template).not.toContain('<option value="fast">');
    expect(template).not.toContain('openEvidenceDepthMenu()');
    expect(template).not.toContain('scheduleCloseEvidenceDepthMenu()');
    expect(template).not.toContain('evidenceDepthExpanded');
    expect(template).toContain('perfSettings.clearCache()');
    expect(template).toContain('fa-broom');
    expect(template).not.toContain('>清除缓存<');
    expect(template).not.toContain('分析设置');
    expect(template).not.toContain('perfSettings.toggleSettings()');
    expect(template).not.toContain('在系统设置中配置');
    expect(template).not.toContain('perfSettings.saveSettings()');
  });
});
