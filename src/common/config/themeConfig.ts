/**
 * Appearance theme runtime (Layer A) + Color Mode (Layer M) — ThemeManager SSOT.
 *
 * A2 dual-layer model (see docs/THEME_SYSTEM_GUIDELINES.md §2.2) plus Phase 1 Mode axis:
 *   1. Semantic status colors (success / warning / error / info) — not Appearance
 *   2. Module ownership (menuConfig / wb-theme-* / ColorContext.infer) — not Appearance
 *   3. Appearance primary / focus (this file) — user-selectable presets
 *   4. Neutral surface / text / border (Color Mode light/dark/system)
 *
 * Runtime contract:
 * - Unique Appearance API: ThemeManager (no parallel themes.ts).
 * - Appearance persistence key: `app-theme` (StorageService).
 * - Color Mode persistence key: `app-color-mode` (StorageService).
 * - applyTheme writes only global primary-family (+ optional focus) CSS vars and
 *   `data-appearance` (= appearance id). Backward-compat: also writes `data-theme`
 *   with the same appearance id so older readers keep working.
 * - applyTheme MUST NOT call ColorContext.setModuleColor, rewrite module ownership,
 *   or overwrite `data-color-mode` / effective dark markers.
 * - applyColorMode owns `data-color-mode` and the effective dark marker (`.dark` class).
 *
 * System mode design:
 * - Preference stays explicit on `document.documentElement.dataset.colorMode`
 *   as `light | dark | system` (stored in `app-color-mode`).
 * - Effective surface mode is resolved to light|dark:
 *   - light/dark preference → itself
 *   - system → matchMedia('(prefers-color-scheme: dark)')
 * - Effective dark is applied by toggling the legacy `.dark` class on <html>
 *   so existing `.dark, [data-theme='dark']` CSS keeps working without a mass rewrite.
 * - Optional attribute `data-color-mode-resolved` mirrors the effective light|dark
 *   for attribute-based consumers; dual selectors in variables.css also match
 *   `[data-color-mode='dark']`.
 *
 * Debt D10: preview / types only promise primary-family + focus — not secondary
 * or status colors. Those live outside Appearance control.
 */

import type { ColorSchemeName } from '../constants/colorSchemes';
import { updateRuntimeCssRule } from '../utils/runtimeStyles';
import { StorageService } from '@/services/storageService';
import eventBus from '../EventBus';

/** User preference for surface color mode (Layer M). */
export type ColorMode = 'light' | 'dark' | 'system';

/** Resolved surface mode after system preference evaluation. */
export type ResolvedColorMode = 'light' | 'dark';

const APPEARANCE_STORAGE_KEY = 'app-theme';
const COLOR_MODE_STORAGE_KEY = 'app-color-mode';
const DEFAULT_COLOR_MODE: ColorMode = 'light';
const COLOR_MODES: readonly ColorMode[] = ['light', 'dark', 'system'];

/**
 * Colors actually controlled / previewed by Appearance (Layer A).
 * Matches getColorVars + optional customVars (`--color-focus-ring` on some presets).
 *
 * Does **not** include secondary, accent, or status colors — ThemeManager never
 * switches those (debt D10).
 */
export interface AppearanceThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryDarker: string;
  /**
   * Resolved focus ring. Only set by presets that include `--color-focus-ring`
   * in customVars (e.g. minimal); otherwise the current document value (or empty).
   */
  focusRing: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description?: string;
  colorScheme: ColorSchemeName;
  /** Optional CSS var overrides; Appearance-safe keys are primary* / focus-ring. */
  customVars?: Record<string, string>;
  darkMode?: boolean;
}

/**
 * 预设主题配置（Appearance presets only — Layer A）
 */
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认',
    description: '经典蓝强调色，适合通用商务工作台（色调，非浅/深主题）',
    colorScheme: 'blue',
  },
  minimal: {
    id: 'minimal',
    name: '极简素色',
    description: '工业中性强调色，低刺激；仅调整全局 primary/focus，不改变模块归属与 banner',
    colorScheme: 'slate',
    customVars: {
      '--color-primary': 'var(--color-slate-700)',
      '--color-primary-light': 'var(--color-slate-100)',
      '--color-primary-dark': 'var(--color-slate-800)',
      '--color-primary-darker': 'var(--color-slate-900)',
      '--color-focus-ring': 'var(--color-slate-700)',
    },
  },
  ocean: {
    id: 'ocean',
    name: '海洋',
    description: '青色强调色',
    colorScheme: 'cyan',
  },
  forest: {
    id: 'forest',
    name: '森林',
    description: '绿色强调色',
    colorScheme: 'green',
  },
  sunset: {
    id: 'sunset',
    name: '日落',
    description: '橙色强调色',
    colorScheme: 'orange',
  },
  purple: {
    id: 'purple',
    name: '紫罗兰',
    description: '紫色强调色',
    colorScheme: 'purple',
  },
  rose: {
    id: 'rose',
    name: '玫瑰',
    description: '玫红强调色',
    colorScheme: 'rose',
  },
};

/**
 * Theme runtime — Appearance presets (Layer A) + Color Mode (Layer M).
 * Does not own module colors or status colors.
 */
export class ThemeManager {
  private static currentTheme: string = 'default';
  private static currentColorMode: ColorMode = DEFAULT_COLOR_MODE;
  private static customThemes: Map<string, ThemeConfig> = new Map();
  private static systemColorSchemeMql: MediaQueryList | null = null;
  private static systemColorSchemeListener: ((event: MediaQueryListEvent) => void) | null = null;

  /**
   * Apply an Appearance preset.
   * Writes primary-family (+ optional focus) CSS vars and data-appearance = appearance id.
   * Backward-compat: also writes data-theme = appearance id (never 'dark').
   * Does **not** call ColorContext.setModuleColor (A2 / Layer B remains ownership-only).
   * Does **not** change data-color-mode or the effective dark class.
   * Persistence: StorageService key `app-theme`.
   */
  static applyTheme(themeId: string, options: { animate?: boolean } = {}): void {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`色调预设不存在: ${themeId}`);
      return;
    }

    const { animate = true } = options;
    const previousTheme = this.currentTheme;
    const root = document.documentElement;

    // One-shot: if legacy code left data-theme='dark' as a color-mode marker,
    // migrate it before overwriting data-theme with the appearance id.
    this.migrateLegacyDarkThemeAttribute();

    // 更新CSS变量（primary 族 + customVars；不含状态色 / 模块色）
    const colorVars: Record<string, string> = this.getColorVars(theme.colorScheme);

    // 应用自定义变量
    if (theme.customVars) {
      Object.entries(theme.customVars).forEach(([key, value]) => {
        colorVars[key] = value;
      });
    }

    // Appearance axis only — do not touch data-color-mode
    root.dataset.appearance = themeId;
    // Backward-compatible write for older readers of data-theme
    root.dataset.theme = themeId;

    const themeSelector = getAppearanceSelector(themeId);
    updateRuntimeCssRule('theme-manager-vars', themeSelector, {
      ...colorVars,
      ...(animate ? { '--theme-transition-duration': '200ms' } : {}),
    });

    // 持久化 appearance only
    StorageService.set(APPEARANCE_STORAGE_KEY, themeId);
    this.currentTheme = themeId;

    // 移除过渡
    if (animate) {
      setTimeout(() => {
        updateRuntimeCssRule('theme-manager-vars', themeSelector, colorVars);
      }, 200);
    }

    // 性能监控
    const windowWithPerf = window as unknown as Record<string, unknown>;
    if (windowWithPerf.__CSS_PERF__) {
      const cssPerf = windowWithPerf.__CSS_PERF__ as {
        trackThemeSwitch: (from: string, to: string) => void;
      };
      cssPerf.trackThemeSwitch(previousTheme, themeId);
    }

    // 触发事件
    eventBus.emit('theme-changed', { themeId, theme });
  }

  /**
   * Apply color mode preference (Layer M).
   * Writes `data-color-mode`, syncs effective dark via `.dark` + `data-color-mode-resolved`.
   * Does **not** change appearance / app-theme / primary CSS vars.
   * Persistence: StorageService key `app-color-mode`.
   */
  static applyColorMode(mode: ColorMode): void {
    if (!isColorMode(mode)) {
      console.error(`主题选项无效: ${String(mode)}`);
      return;
    }

    this.currentColorMode = mode;
    StorageService.set(COLOR_MODE_STORAGE_KEY, mode);
    this.syncColorModeToDocument(mode);

    eventBus.emit('color-mode-changed', {
      mode,
      resolved: this.getResolvedColorMode(),
    });
  }

  /**
   * Primary-family CSS vars for a color scheme (Appearance write surface).
   * Status / secondary / accent tokens are intentionally omitted.
   */
  private static getColorVars(colorScheme: ColorSchemeName): Record<string, string> {
    return {
      '--color-primary': `var(--color-${colorScheme}-500)`,
      '--color-primary-light': `var(--color-${colorScheme}-100)`,
      '--color-primary-dark': `var(--color-${colorScheme}-700)`,
      '--color-primary-darker': `var(--color-${colorScheme}-900)`,
    };
  }

  /**
   * 注册自定义主题
   */
  static registerTheme(config: ThemeConfig): void {
    this.customThemes.set(config.id, config);
  }

  /**
   * 获取主题
   */
  static getTheme(themeId: string): ThemeConfig | undefined {
    return THEME_PRESETS[themeId] || this.customThemes.get(themeId);
  }

  /**
   * 获取所有主题
   */
  static getAllThemes(): ThemeConfig[] {
    return [...Object.values(THEME_PRESETS), ...Array.from(this.customThemes.values())];
  }

  /**
   * 获取当前主题
   */
  static getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Current color-mode preference (may be `system`).
   */
  static getCurrentColorMode(): ColorMode {
    return this.currentColorMode;
  }

  /**
   * Effective light|dark after resolving `system` against prefers-color-scheme.
   */
  static getResolvedColorMode(): ResolvedColorMode {
    if (this.currentColorMode === 'system') {
      return resolveSystemColorMode();
    }
    return this.currentColorMode;
  }

  /**
   * 从本地存储恢复主题（key: `app-theme`）
   * Does not restore or alter color mode.
   */
  static restoreTheme(): void {
    this.migrateLegacyDarkThemeAttribute();
    const savedTheme = StorageService.get<string>(APPEARANCE_STORAGE_KEY, null);
    if (savedTheme && this.getTheme(savedTheme)) {
      this.applyTheme(savedTheme, { animate: false });
    }
  }

  /**
   * Restore color mode from `app-color-mode` (default light).
   * Independent of restoreTheme / app-theme.
   * Also migrates legacy `data-theme="dark"` once when storage is empty.
   */
  static restoreColorMode(): void {
    this.migrateLegacyDarkThemeAttribute();
    const saved = StorageService.get<string>(COLOR_MODE_STORAGE_KEY, null);
    if (isColorMode(saved)) {
      this.currentColorMode = saved;
      this.syncColorModeToDocument(saved);
      return;
    }
    // Migration may already have set in-memory mode + DOM when storage is empty/unreadable.
    this.syncColorModeToDocument(this.currentColorMode);
  }

  /**
   * Preview Appearance colors without applying.
   * Uses the same getColorVars + customVars merge as applyTheme.
   * Returns only primary-family + focus (AppearanceThemeColors) — not status colors.
   */
  static previewTheme(themeId: string): AppearanceThemeColors | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;

    const root = document.documentElement;
    const style = getComputedStyle(root);
    const colorVars: Record<string, string> = {
      ...this.getColorVars(theme.colorScheme),
      ...(theme.customVars ?? {}),
    };

    const focusDeclaration = colorVars['--color-focus-ring'];
    const focusRing = focusDeclaration
      ? resolveCssColorToken(style, focusDeclaration)
      : style.getPropertyValue('--color-focus-ring').trim();

    return {
      primary: resolveCssColorToken(style, colorVars['--color-primary']),
      primaryLight: resolveCssColorToken(style, colorVars['--color-primary-light']),
      primaryDark: resolveCssColorToken(style, colorVars['--color-primary-dark']),
      primaryDarker: resolveCssColorToken(style, colorVars['--color-primary-darker']),
      focusRing,
    };
  }

  /**
   * If older code marked dark solely via data-theme='dark', migrate once to
   * data-color-mode / app-color-mode and clear the theme marker so Appearance
   * can own data-theme again.
   */
  private static migrateLegacyDarkThemeAttribute(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    if (root.dataset.theme !== 'dark') {
      return;
    }

    const savedMode = StorageService.get<string>(COLOR_MODE_STORAGE_KEY, null);
    if (!isColorMode(savedMode)) {
      StorageService.set(COLOR_MODE_STORAGE_KEY, 'dark');
      this.currentColorMode = 'dark';
      this.syncColorModeToDocument('dark');
    }

    // Free the shared slot for Appearance ids
    delete root.dataset.theme;
  }

  /**
   * Write preference + effective dark markers to the document root.
   * Preference: data-color-mode = light|dark|system
   * Effective: data-color-mode-resolved + classList 'dark'
   */
  private static syncColorModeToDocument(mode: ColorMode): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.dataset.colorMode = mode;

    const resolved: ResolvedColorMode = mode === 'system' ? resolveSystemColorMode() : mode;
    root.dataset.colorModeResolved = resolved;

    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Keep UA form controls / scrollbars aligned with effective mode (FOUC bootstrap does the same pre-paint).
    root.style.colorScheme = resolved;

    this.ensureSystemColorModeListener(mode === 'system');
  }

  private static ensureSystemColorModeListener(enabled: boolean): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    if (!enabled) {
      this.teardownSystemColorModeListener();
      return;
    }

    if (this.systemColorSchemeListener) {
      return;
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (this.currentColorMode === 'system') {
        this.syncColorModeToDocument('system');
        eventBus.emit('color-mode-changed', {
          mode: 'system',
          resolved: this.getResolvedColorMode(),
        });
      }
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', listener);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(listener);
    }

    this.systemColorSchemeMql = mql;
    this.systemColorSchemeListener = listener;
  }

  private static teardownSystemColorModeListener(): void {
    const mql = this.systemColorSchemeMql;
    const listener = this.systemColorSchemeListener;
    if (!mql || !listener) {
      this.systemColorSchemeMql = null;
      this.systemColorSchemeListener = null;
      return;
    }

    if (typeof mql.removeEventListener === 'function') {
      mql.removeEventListener('change', listener);
    } else if (typeof mql.removeListener === 'function') {
      mql.removeListener(listener);
    }

    this.systemColorSchemeMql = null;
    this.systemColorSchemeListener = null;
  }
}

/**
 * Resolve a theme color declaration to a concrete computed value.
 * Supports `var(--token)` references used by getColorVars / customVars.
 */
function resolveCssColorToken(style: CSSStyleDeclaration, declaration: string | undefined): string {
  if (!declaration) {
    return '';
  }
  const trimmed = declaration.trim();
  const varMatch = trimmed.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)$/);
  if (varMatch?.[1]) {
    return style.getPropertyValue(varMatch[1]).trim();
  }
  return trimmed;
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Runtime CSS selector for Appearance primary vars.
 * Dual attribute for transition: data-appearance (Phase 1) + data-theme (legacy readers).
 */
function getAppearanceSelector(themeId: string): string {
  const escaped = escapeAttrValue(themeId);
  return `:root[data-appearance="${escaped}"], :root[data-theme="${escaped}"]`;
}

function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (COLOR_MODES as readonly string[]).includes(value);
}

function resolveSystemColorMode(): ResolvedColorMode {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// 初始化时恢复外观与颜色模式（main.ts 也会在 boot 路径再调一次）
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.restoreColorMode();
    ThemeManager.restoreTheme();
  });
}
