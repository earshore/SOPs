import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_PRESETS, ThemeManager, type ThemeConfig } from './themeConfig';
import { ColorContext } from '../utils/ColorContext';
import { getRuntimeCssRuleText } from '../utils/runtimeStyles';
import { StorageService } from '../../services/storageService';
import eventBus from '../EventBus';

const mocks = vi.hoisted(() => ({
  setModuleColor: vi.fn(),
  storageGet: vi.fn(),
  storageSet: vi.fn(),
  emit: vi.fn(),
}));

vi.mock('../utils/ColorContext', () => ({
  ColorContext: {
    setModuleColor: mocks.setModuleColor,
  },
}));

vi.mock('../../services/storageService', () => ({
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

vi.mock('../EventBus', () => ({
  default: {
    emit: mocks.emit,
  },
}));

function resetThemeManager(): void {
  const manager = ThemeManager as unknown as {
    currentTheme: string;
    customThemes: Map<string, ThemeConfig>;
  };
  manager.currentTheme = 'default';
  manager.customThemes = new Map();
}

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
  resetThemeManager();
  mocks.setModuleColor.mockReset();
  mocks.storageGet.mockReset();
  mocks.storageSet.mockReset();
  mocks.emit.mockReset();
  delete (window as unknown as Record<string, unknown>).__CSS_PERF__;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).__CSS_PERF__;
});

describe('ThemeManager', () => {
  it('applies a preset theme and records the real source theme', () => {
    const cssPerf = {
      trackThemeSwitch: vi.fn(),
    };
    (window as unknown as Record<string, unknown>).__CSS_PERF__ = cssPerf;

    ThemeManager.applyTheme('ocean');

    expect(ColorContext.setModuleColor).toHaveBeenCalledWith('cyan');
    expect(document.documentElement.dataset.theme).toBe('ocean');
    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain(
      '--color-primary:var(--color-cyan-500)'
    );
    expect(StorageService.set).toHaveBeenCalledWith('app-theme', 'ocean');
    expect(cssPerf.trackThemeSwitch).toHaveBeenCalledWith('default', 'ocean');
    expect(eventBus.emit).toHaveBeenCalledWith('theme-changed', {
      themeId: 'ocean',
      theme: THEME_PRESETS.ocean,
    });

    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain(
      '--theme-transition-duration:200ms'
    );
    vi.advanceTimersByTime(200);
    expect(getRuntimeCssRuleText('theme-manager-vars')).not.toContain(
      '--theme-transition-duration'
    );
    expect(ThemeManager.getCurrentTheme()).toBe('ocean');
  });

  it('registers custom themes, restores persisted themes, and skips invalid saved themes', () => {
    const customTheme: ThemeConfig = {
      id: 'ops',
      name: 'Ops Theme',
      colorScheme: 'green',
      customVars: {
        '--surface-critical': '#f00',
      },
    };
    ThemeManager.registerTheme(customTheme);

    expect(ThemeManager.getTheme('ops')).toEqual(customTheme);
    expect(ThemeManager.getAllThemes()).toEqual(expect.arrayContaining([customTheme]));

    mocks.storageGet.mockReturnValueOnce('ops');
    ThemeManager.restoreTheme();

    expect(document.documentElement.dataset.theme).toBe('ops');
    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain('--surface-critical:#f00');

    mocks.storageSet.mockClear();
    mocks.storageGet.mockReturnValueOnce('missing');
    ThemeManager.restoreTheme();

    expect(StorageService.set).not.toHaveBeenCalled();
  });

  it('previews theme colors from CSS variables', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-orange-500', '#f97316');
    root.style.setProperty('--color-orange-100', '#ffedd5');
    root.style.setProperty('--color-orange-700', '#c2410c');
    root.style.setProperty('--color-secondary', '#64748b');
    root.style.setProperty('--color-accent', '#06b6d4');
    root.style.setProperty('--color-success', '#16a34a');
    root.style.setProperty('--color-warning', '#eab308');
    root.style.setProperty('--color-error', '#dc2626');
    root.style.setProperty('--color-info', '#2563eb');

    expect(ThemeManager.previewTheme('sunset')).toEqual({
      primary: '#f97316',
      primaryLight: '#ffedd5',
      primaryDark: '#c2410c',
      secondary: '#64748b',
      accent: '#06b6d4',
      success: '#16a34a',
      warning: '#eab308',
      error: '#dc2626',
      info: '#2563eb',
    });
    expect(ThemeManager.previewTheme('missing')).toBeNull();
  });

  it('logs and ignores unknown themes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    ThemeManager.applyTheme('missing');

    expect(errorSpy).toHaveBeenCalledWith('主题不存在: missing');
    expect(mocks.storageSet).not.toHaveBeenCalled();
  });
});
