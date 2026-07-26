import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_PRESETS,
  ThemeManager,
  type AppearanceThemeColors,
  type ThemeConfig,
} from './themeConfig';
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
    currentColorMode: string;
    customThemes: Map<string, ThemeConfig>;
    systemColorSchemeMql: MediaQueryList | null;
    systemColorSchemeListener: ((event: MediaQueryListEvent) => void) | null;
    teardownSystemColorModeListener: () => void;
  };
  manager.teardownSystemColorModeListener();
  manager.currentTheme = 'default';
  manager.currentColorMode = 'light';
  manager.customThemes = new Map();
  manager.systemColorSchemeMql = null;
  manager.systemColorSchemeListener = null;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-appearance');
  document.documentElement.removeAttribute('data-color-mode');
  document.documentElement.removeAttribute('data-color-mode-resolved');
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('style');
  resetThemeManager();
  mocks.setModuleColor.mockReset();
  mocks.storageGet.mockReset();
  mocks.storageSet.mockReset();
  mocks.emit.mockReset();
  mocks.storageGet.mockReturnValue(null);
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

    expect(ColorContext.setModuleColor).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.appearance).toBe('ocean');
    expect(document.documentElement.dataset.theme).toBe('ocean');
    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain(
      '--color-primary:var(--color-cyan-500)'
    );
    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain('[data-appearance="ocean"]');
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

  it('applies minimal with industrial slate customVars and does not touch ColorContext', () => {
    ThemeManager.applyTheme('minimal');

    expect(document.documentElement.dataset.appearance).toBe('minimal');
    expect(document.documentElement.dataset.theme).toBe('minimal');
    expect(ColorContext.setModuleColor).not.toHaveBeenCalled();
    const rule = getRuntimeCssRuleText('theme-manager-vars');
    expect(rule).toContain('--color-primary:var(--color-slate-700)');
    expect(rule).toContain('--color-primary-light:var(--color-slate-100)');
    expect(rule).toContain('--color-primary-dark:var(--color-slate-800)');
    expect(rule).toContain('--color-primary-darker:var(--color-slate-900)');
    expect(rule).toContain('--color-focus-ring:var(--color-slate-700)');
    expect(StorageService.set).toHaveBeenCalledWith('app-theme', 'minimal');
    expect(ThemeManager.getCurrentTheme()).toBe('minimal');
    expect(THEME_PRESETS.minimal?.colorScheme).toBe('slate');
  });

  it('lists appearance presets in exact enterprise order', () => {
    const ids = ThemeManager.getAllThemes().map(t => t.id);
    expect(ids).toEqual(['default', 'minimal', 'ocean', 'forest', 'sunset', 'purple', 'rose']);
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

    expect(document.documentElement.dataset.appearance).toBe('ops');
    expect(document.documentElement.dataset.theme).toBe('ops');
    expect(getRuntimeCssRuleText('theme-manager-vars')).toContain('--surface-critical:#f00');

    mocks.storageSet.mockClear();
    mocks.storageGet.mockReturnValueOnce('missing');
    ThemeManager.restoreTheme();

    expect(StorageService.set).not.toHaveBeenCalled();
  });

  it('previews only Appearance-controlled primary-family + focus colors', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-orange-500', '#f97316');
    root.style.setProperty('--color-orange-100', '#ffedd5');
    root.style.setProperty('--color-orange-700', '#c2410c');
    root.style.setProperty('--color-orange-900', '#7c2d12');
    root.style.setProperty('--color-focus-ring', '#2563eb');
    // Status / secondary tokens must not appear on the preview shape (D10)
    root.style.setProperty('--color-secondary', '#64748b');
    root.style.setProperty('--color-success', '#16a34a');

    const preview = ThemeManager.previewTheme('sunset');
    expect(preview).toEqual({
      primary: '#f97316',
      primaryLight: '#ffedd5',
      primaryDark: '#c2410c',
      primaryDarker: '#7c2d12',
      // sunset has no custom focus → current document focus-ring
      focusRing: '#2563eb',
    } satisfies AppearanceThemeColors);
    expect(preview).not.toHaveProperty('secondary');
    expect(preview).not.toHaveProperty('success');
    expect(preview).not.toHaveProperty('accent');
    expect(preview).not.toHaveProperty('warning');
    expect(preview).not.toHaveProperty('error');
    expect(preview).not.toHaveProperty('info');
    expect(ThemeManager.previewTheme('missing')).toBeNull();
  });

  it('previews default using blue scheme primary family (no focus override)', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-blue-500', '#3b82f6');
    root.style.setProperty('--color-blue-100', '#dbeafe');
    root.style.setProperty('--color-blue-700', '#1d4ed8');
    root.style.setProperty('--color-blue-900', '#1e3a8a');
    root.style.setProperty('--color-focus-ring', '#3b82f6');

    const preview = ThemeManager.previewTheme('default');
    expect(preview).toEqual({
      primary: '#3b82f6',
      primaryLight: '#dbeafe',
      primaryDark: '#1d4ed8',
      primaryDarker: '#1e3a8a',
      focusRing: '#3b82f6',
    } satisfies AppearanceThemeColors);
    expect(Object.keys(preview as AppearanceThemeColors).sort()).toEqual(
      ['focusRing', 'primary', 'primaryDark', 'primaryDarker', 'primaryLight'].sort()
    );
  });

  it('previews minimal using industrial customVars shades, not scheme-500', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-slate-700', '#334155');
    root.style.setProperty('--color-slate-100', '#f1f5f9');
    root.style.setProperty('--color-slate-800', '#1e293b');
    root.style.setProperty('--color-slate-900', '#0f172a');
    root.style.setProperty('--color-slate-500', '#64748b');
    root.style.setProperty('--color-focus-ring', '#2563eb');

    const preview = ThemeManager.previewTheme('minimal');
    expect(preview).not.toBeNull();
    expect(preview).toEqual({
      primary: '#334155',
      primaryLight: '#f1f5f9',
      primaryDark: '#1e293b',
      primaryDarker: '#0f172a',
      focusRing: '#334155',
    } satisfies AppearanceThemeColors);
    expect(preview?.primary).not.toBe('#64748b');
    // customVars override focus-ring away from document default blue
    expect(preview?.focusRing).not.toBe('#2563eb');
  });

  it('logs and ignores unknown themes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    ThemeManager.applyTheme('missing');

    expect(errorSpy).toHaveBeenCalledWith('色调预设不存在: missing');
    expect(mocks.storageSet).not.toHaveBeenCalled();
  });

  it('applyTheme does not change data-color-mode or wipe an existing dark mode', () => {
    ThemeManager.applyColorMode('dark');
    mocks.storageSet.mockClear();
    mocks.emit.mockClear();

    ThemeManager.applyTheme('minimal');

    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.dataset.colorModeResolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.appearance).toBe('minimal');
    // backward-compat appearance id on data-theme — never the dark marker
    expect(document.documentElement.dataset.theme).toBe('minimal');
    expect(document.documentElement.dataset.theme).not.toBe('dark');
    expect(StorageService.set).toHaveBeenCalledWith('app-theme', 'minimal');
    expect(StorageService.set).not.toHaveBeenCalledWith('app-color-mode', expect.anything());
  });

  it('applyColorMode persists app-color-mode and sets document markers', () => {
    ThemeManager.applyColorMode('dark');

    expect(StorageService.set).toHaveBeenCalledWith('app-color-mode', 'dark');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.dataset.colorModeResolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(ThemeManager.getCurrentColorMode()).toBe('dark');
    expect(ThemeManager.getResolvedColorMode()).toBe('dark');
    expect(eventBus.emit).toHaveBeenCalledWith('color-mode-changed', {
      mode: 'dark',
      resolved: 'dark',
    });

    mocks.storageSet.mockClear();
    ThemeManager.applyColorMode('light');

    expect(StorageService.set).toHaveBeenCalledWith('app-color-mode', 'light');
    expect(document.documentElement.dataset.colorMode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(ThemeManager.getResolvedColorMode()).toBe('light');
  });

  it('applyColorMode system resolves via prefers-color-scheme and keeps preference as system', () => {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', matchMedia);

    ThemeManager.applyColorMode('system');

    expect(StorageService.set).toHaveBeenCalledWith('app-color-mode', 'system');
    expect(document.documentElement.dataset.colorMode).toBe('system');
    expect(document.documentElement.dataset.colorModeResolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(ThemeManager.getCurrentColorMode()).toBe('system');
    expect(ThemeManager.getResolvedColorMode()).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('restoreTheme and restoreColorMode are independent', () => {
    mocks.storageGet.mockImplementation((key: string) => {
      if (key === 'app-theme') return 'ocean';
      if (key === 'app-color-mode') return 'dark';
      return null;
    });

    ThemeManager.restoreColorMode();
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.appearance).toBeUndefined();

    ThemeManager.restoreTheme();
    expect(document.documentElement.dataset.appearance).toBe('ocean');
    expect(document.documentElement.dataset.theme).toBe('ocean');
    // color mode untouched by appearance restore
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(ThemeManager.getCurrentTheme()).toBe('ocean');
    expect(ThemeManager.getCurrentColorMode()).toBe('dark');
  });

  it('migrates legacy data-theme=dark once into color mode', () => {
    document.documentElement.dataset.theme = 'dark';
    mocks.storageGet.mockReturnValue(null);

    ThemeManager.restoreColorMode();

    expect(StorageService.set).toHaveBeenCalledWith('app-color-mode', 'dark');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // legacy dark marker cleared so Appearance can own data-theme
    expect(document.documentElement.dataset.theme).toBeUndefined();

    mocks.storageSet.mockClear();
    ThemeManager.applyTheme('minimal');
    expect(document.documentElement.dataset.appearance).toBe('minimal');
    expect(document.documentElement.dataset.theme).toBe('minimal');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
  });
});
